import time
import json
import functools
from typing import Dict, Any, Optional, Callable, Tuple, Union, TypeVar, cast
from datetime import datetime, timedelta

T = TypeVar('T')

class Cache:
    """
    A simple in-memory cache with TTL support.
    """
    _instance = None
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(Cache, cls).__new__(cls)
            cls._instance._init()
        return cls._instance
    
    def _init(self):
        self._cache: Dict[str, Tuple[Any, float]] = {}
        self._hit_count = 0
        self._miss_count = 0
        self._creation_time = time.time()
    
    def get(self, key: str) -> Optional[Any]:
        """
        Get a value from the cache.
        
        Args:
            key: Cache key
            
        Returns:
            Cached value or None if not found or expired
        """
        if key not in self._cache:
            self._miss_count += 1
            return None
        
        value, expiry = self._cache[key]
        
        # Check if the value has expired
        if expiry < time.time():
            self._miss_count += 1
            del self._cache[key]
            return None
        
        self._hit_count += 1
        return value
    
    def set(self, key: str, value: Any, ttl: int = 60) -> None:
        """
        Set a value in the cache.
        
        Args:
            key: Cache key
            value: Value to cache
            ttl: Time to live in seconds (default: 60)
        """
        expiry = time.time() + ttl
        self._cache[key] = (value, expiry)
    
    def delete(self, key: str) -> bool:
        """
        Delete a value from the cache.
        
        Args:
            key: Cache key
            
        Returns:
            True if the key was deleted, False otherwise
        """
        if key in self._cache:
            del self._cache[key]
            return True
        return False
    
    def clear(self) -> None:
        """Clear all cached values."""
        self._cache.clear()
    
    def delete_pattern(self, pattern: str) -> int:
        """
        Delete all keys matching a pattern.
        
        Args:
            pattern: Pattern to match
            
        Returns:
            Number of keys deleted
        """
        keys_to_delete = [k for k in self._cache.keys() if pattern in k]
        for key in keys_to_delete:
            del self._cache[key]
        return len(keys_to_delete)
    
    def stats(self) -> Dict[str, Any]:
        """
        Get cache statistics.
        
        Returns:
            Dictionary with cache statistics
        """
        total_requests = self._hit_count + self._miss_count
        hit_rate = self._hit_count / total_requests if total_requests > 0 else 0
        
        return {
            "items": len(self._cache),
            "hits": self._hit_count,
            "misses": self._miss_count,
            "hit_rate": hit_rate,
            "uptime": time.time() - self._creation_time
        }

# Create a singleton cache instance
cache = Cache()

def cached(ttl: int = 60, key_prefix: str = "") -> Callable[[Callable[..., T]], Callable[..., T]]:
    """
    Decorator for caching function results.
    
    Args:
        ttl: Time to live in seconds (default: 60)
        key_prefix: Prefix for the cache key (default: "")
        
    Returns:
        Decorated function
    """
    def decorator(func: Callable[..., T]) -> Callable[..., T]:
        @functools.wraps(func)
        async def async_wrapper(*args: Any, **kwargs: Any) -> T:
            # Create a unique key based on the function name, args, and kwargs
            key_parts = [key_prefix or func.__name__]
            
            # Add positional arguments to the key
            if args:
                key_parts.append("_".join(str(arg) for arg in args))
            
            # Add keyword arguments to the key (sorted to ensure consistent order)
            if kwargs:
                key_parts.append("_".join(f"{k}={v}" for k, v in sorted(kwargs.items())))
            
            # Create the final key
            cache_key = ":".join(key_parts)
            
            # Try to get the value from the cache
            cached_value = cache.get(cache_key)
            if cached_value is not None:
                return cached_value
            
            # Call the function and cache the result
            result = await func(*args, **kwargs)
            cache.set(cache_key, result, ttl)
            return result
        
        @functools.wraps(func)
        def sync_wrapper(*args: Any, **kwargs: Any) -> T:
            # Create a unique key based on the function name, args, and kwargs
            key_parts = [key_prefix or func.__name__]
            
            # Add positional arguments to the key
            if args:
                key_parts.append("_".join(str(arg) for arg in args))
            
            # Add keyword arguments to the key (sorted to ensure consistent order)
            if kwargs:
                key_parts.append("_".join(f"{k}={v}" for k, v in sorted(kwargs.items())))
            
            # Create the final key
            cache_key = ":".join(key_parts)
            
            # Try to get the value from the cache
            cached_value = cache.get(cache_key)
            if cached_value is not None:
                return cached_value
            
            # Call the function and cache the result
            result = func(*args, **kwargs)
            cache.set(cache_key, result, ttl)
            return result
        
        # Return the appropriate wrapper based on whether the function is async or not
        if asyncio.iscoroutinefunction(func):
            return cast(Callable[..., T], async_wrapper)
        else:
            return cast(Callable[..., T], sync_wrapper)
    
    return decorator

def invalidate_cache(pattern: str = "") -> None:
    """
    Invalidate cache entries matching a pattern.
    
    Args:
        pattern: Pattern to match (default: "" which matches all keys)
    """
    if pattern:
        cache.delete_pattern(pattern)
    else:
        cache.clear()

import asyncio 