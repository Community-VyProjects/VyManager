"""
Redis Cache Service

Provides caching functionality using Redis for improved performance.
Supports async operations and automatic serialization/deserialization.
"""

import os
import json
from typing import Optional, Any, TypeVar, Callable
from datetime import timedelta
import redis.asyncio as redis
from functools import wraps

T = TypeVar('T')


class CacheService:
    """
    Async Redis cache service for caching application data.

    Usage:
        cache = CacheService()
        await cache.connect()

        # Simple get/set
        await cache.set("key", {"data": "value"}, ttl=300)
        data = await cache.get("key")

        # With prefix for namespacing
        await cache.set("user_sites", sites, ttl=300, prefix="user:123")

    Environment variables:
        REDIS_URL: Redis connection URL (default: redis://localhost:6379/0)
        CACHE_ENABLED: Enable/disable caching (default: true)
    """

    # Default TTLs in seconds
    DEFAULT_TTL = 300  # 5 minutes
    SITES_TTL = 300  # 5 minutes for sites list
    INSTANCES_TTL = 300  # 5 minutes for instances list
    CONFIG_TTL = 60  # 1 minute for VyOS config (changes frequently)
    SESSION_TTL = 1800  # 30 minutes for session data

    def __init__(self, redis_url: Optional[str] = None):
        """
        Initialize the cache service.

        Args:
            redis_url: Redis connection URL. If not provided, reads from REDIS_URL env var.
        """
        self._redis_url = redis_url or os.getenv("REDIS_URL", "redis://localhost:6379/0")
        self._client: Optional[redis.Redis] = None
        self._enabled = os.getenv("CACHE_ENABLED", "true").lower() in ("true", "1", "yes")

    @property
    def is_connected(self) -> bool:
        """Check if Redis is connected."""
        return self._client is not None

    @property
    def is_enabled(self) -> bool:
        """Check if caching is enabled."""
        return self._enabled and self._client is not None

    async def connect(self) -> bool:
        """
        Connect to Redis.

        Returns:
            True if connection successful, False otherwise.
        """
        if not self._enabled:
            print("[Cache] Caching disabled via CACHE_ENABLED=false")
            return False

        try:
            self._client = redis.from_url(
                self._redis_url,
                encoding="utf-8",
                decode_responses=True,
            )
            # Test connection
            await self._client.ping()
            print(f"[Cache] Connected to Redis at {self._redis_url}")
            return True
        except Exception as e:
            print(f"[Cache] Failed to connect to Redis: {e}")
            print("[Cache] Caching will be disabled")
            self._client = None
            return False

    async def disconnect(self):
        """Disconnect from Redis."""
        if self._client:
            await self._client.close()
            self._client = None
            print("[Cache] Disconnected from Redis")

    async def get(self, key: str, prefix: Optional[str] = None) -> Optional[Any]:
        """
        Get a value from cache.

        Args:
            key: Cache key
            prefix: Optional prefix for namespacing

        Returns:
            Cached value or None if not found
        """
        if not self.is_enabled:
            return None

        full_key = f"{prefix}:{key}" if prefix else key

        try:
            data = await self._client.get(full_key)
            if data:
                return json.loads(data)
            return None
        except Exception as e:
            print(f"[Cache] Get error for {full_key}: {e}")
            return None

    async def set(
        self,
        key: str,
        value: Any,
        ttl: int = DEFAULT_TTL,
        prefix: Optional[str] = None
    ) -> bool:
        """
        Set a value in cache.

        Args:
            key: Cache key
            value: Value to cache (will be JSON serialized)
            ttl: Time to live in seconds
            prefix: Optional prefix for namespacing

        Returns:
            True if successful, False otherwise
        """
        if not self.is_enabled:
            return False

        full_key = f"{prefix}:{key}" if prefix else key

        try:
            serialized = json.dumps(value, default=str)
            await self._client.setex(full_key, ttl, serialized)
            return True
        except Exception as e:
            print(f"[Cache] Set error for {full_key}: {e}")
            return False

    async def delete(self, key: str, prefix: Optional[str] = None) -> bool:
        """
        Delete a value from cache.

        Args:
            key: Cache key
            prefix: Optional prefix for namespacing

        Returns:
            True if successful, False otherwise
        """
        if not self.is_enabled:
            return False

        full_key = f"{prefix}:{key}" if prefix else key

        try:
            await self._client.delete(full_key)
            return True
        except Exception as e:
            print(f"[Cache] Delete error for {full_key}: {e}")
            return False

    async def delete_pattern(self, pattern: str) -> int:
        """
        Delete all keys matching a pattern.

        Args:
            pattern: Redis key pattern (e.g., "user:123:*")

        Returns:
            Number of keys deleted
        """
        if not self.is_enabled:
            return 0

        try:
            keys = []
            async for key in self._client.scan_iter(match=pattern):
                keys.append(key)

            if keys:
                deleted = await self._client.delete(*keys)
                return deleted
            return 0
        except Exception as e:
            print(f"[Cache] Delete pattern error for {pattern}: {e}")
            return 0

    async def invalidate_user_cache(self, user_id: str):
        """
        Invalidate all cache entries for a user.

        Args:
            user_id: User ID to invalidate cache for
        """
        await self.delete_pattern(f"user:{user_id}:*")

    async def invalidate_instance_cache(self, instance_id: str):
        """
        Invalidate cache entries for an instance.

        Args:
            instance_id: Instance ID to invalidate cache for
        """
        await self.delete_pattern(f"instance:{instance_id}:*")
        await self.delete_pattern(f"*:instance:{instance_id}")

    async def invalidate_site_cache(self, site_id: str):
        """
        Invalidate cache entries for a site.

        Args:
            site_id: Site ID to invalidate cache for
        """
        await self.delete_pattern(f"site:{site_id}:*")
        await self.delete_pattern(f"*:site:{site_id}")

    # Convenience methods for specific cache types

    async def get_user_sites(self, user_id: str) -> Optional[list]:
        """Get cached sites list for a user."""
        return await self.get("sites", prefix=f"user:{user_id}")

    async def set_user_sites(self, user_id: str, sites: list) -> bool:
        """Cache sites list for a user."""
        return await self.set("sites", sites, ttl=self.SITES_TTL, prefix=f"user:{user_id}")

    async def get_site_instances(self, user_id: str, site_id: str) -> Optional[list]:
        """Get cached instances list for a site."""
        return await self.get(f"site:{site_id}:instances", prefix=f"user:{user_id}")

    async def set_site_instances(self, user_id: str, site_id: str, instances: list) -> bool:
        """Cache instances list for a site."""
        return await self.set(
            f"site:{site_id}:instances",
            instances,
            ttl=self.INSTANCES_TTL,
            prefix=f"user:{user_id}"
        )

    async def get_vyos_config(self, instance_id: str) -> Optional[dict]:
        """Get cached VyOS config for an instance."""
        return await self.get("config", prefix=f"instance:{instance_id}")

    async def set_vyos_config(self, instance_id: str, config: dict) -> bool:
        """Cache VyOS config for an instance."""
        return await self.set("config", config, ttl=self.CONFIG_TTL, prefix=f"instance:{instance_id}")


# Global singleton instance
cache_service = CacheService()


async def get_cache() -> CacheService:
    """Get the cache service instance."""
    return cache_service
