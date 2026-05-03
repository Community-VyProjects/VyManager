"""RPKI Protocol Batch Builder.

Provides all batch operations for RPKI (Resource Public Key Infrastructure)
configuration. Covers: cache server management and global interval settings.
"""

from typing import List, Dict, Any
from vyos_mappers import CommandMapperRegistry


class RpkiBatchBuilder:
    """Complete batch builder for RPKI protocol operations."""

    def __init__(self, version: str):
        self.version = version
        self._operations: List[Dict[str, Any]] = []
        self.mappers = CommandMapperRegistry.get_all_mappers(version)
        self.mapper_key = "rpki"

    # ========================================================================
    # Core Batch Operations
    # ========================================================================

    def add_set(self, path: List[str]) -> "RpkiBatchBuilder":
        if path:
            self._operations.append({"op": "set", "path": path})
        return self

    def add_delete(self, path: List[str]) -> "RpkiBatchBuilder":
        if path:
            self._operations.append({"op": "delete", "path": path})
        return self

    def get_operations(self) -> List[Dict[str, Any]]:
        return self._operations.copy()

    def is_empty(self) -> bool:
        return len(self._operations) == 0

    @property
    def m(self):
        return self.mappers[self.mapper_key]

    # ========================================================================
    # Capabilities
    # ========================================================================

    def get_capabilities(self) -> Dict[str, Any]:
        is_v14 = "1.4" in self.version
        is_v15 = "1.5" in self.version or "latest" in self.version
        return {
            "version": self.version,
            "version_info": {
                "is_1_4": is_v14,
                "is_1_5": is_v15,
            },
            "features": {
                "cache_servers": {
                    "supported": True,
                    "description": "RPKI cache server management (TCP and SSH transport)",
                },
                "expire_interval": {
                    "supported": True,
                    "description": "Interval before expiring cache data (600-172800s, default 7200)",
                },
                "polling_period": {
                    "supported": True,
                    "description": "Cache polling interval (1-86400s, default 300)",
                },
                "retry_interval": {
                    "supported": True,
                    "description": "Retry interval to reconnect to cache server (1-7200s, default 600)",
                },
                "ssh_transport": {
                    "supported": True,
                    "description": "SSH transport for cache server connections using PKI keys",
                },
            },
        }

    # ========================================================================
    # Cache Servers
    # ========================================================================

    def set_cache(self, address: str) -> "RpkiBatchBuilder":
        return self.add_set(self.m.get_cache(address))

    def delete_cache(self, address: str) -> "RpkiBatchBuilder":
        return self.add_delete(self.m.get_cache_delete(address))

    def set_cache_port(self, address: str, port: str) -> "RpkiBatchBuilder":
        return self.add_set(self.m.get_cache_port(address, port))

    def delete_cache_port(self, address: str) -> "RpkiBatchBuilder":
        return self.add_delete(self.m.get_cache_port_delete(address))

    def set_cache_preference(self, address: str, preference: str) -> "RpkiBatchBuilder":
        return self.add_set(self.m.get_cache_preference(address, preference))

    def delete_cache_preference(self, address: str) -> "RpkiBatchBuilder":
        return self.add_delete(self.m.get_cache_preference_delete(address))

    def set_cache_source_address(self, address: str, source: str) -> "RpkiBatchBuilder":
        return self.add_set(self.m.get_cache_source_address(address, source))

    def delete_cache_source_address(self, address: str) -> "RpkiBatchBuilder":
        return self.add_delete(self.m.get_cache_source_address_delete(address))

    def set_cache_ssh_key(self, address: str, key: str) -> "RpkiBatchBuilder":
        return self.add_set(self.m.get_cache_ssh_key(address, key))

    def delete_cache_ssh_key(self, address: str) -> "RpkiBatchBuilder":
        return self.add_delete(self.m.get_cache_ssh_key_delete(address))

    def set_cache_ssh_username(self, address: str, username: str) -> "RpkiBatchBuilder":
        return self.add_set(self.m.get_cache_ssh_username(address, username))

    def delete_cache_ssh_username(self, address: str) -> "RpkiBatchBuilder":
        return self.add_delete(self.m.get_cache_ssh_username_delete(address))

    def delete_cache_ssh(self, address: str) -> "RpkiBatchBuilder":
        return self.add_delete(self.m.get_cache_ssh_delete(address))

    # ========================================================================
    # Global Intervals
    # ========================================================================

    def set_expire_interval(self, value: str) -> "RpkiBatchBuilder":
        return self.add_set(self.m.get_expire_interval(value))

    def delete_expire_interval(self) -> "RpkiBatchBuilder":
        return self.add_delete(self.m.get_expire_interval_delete())

    def set_polling_period(self, value: str) -> "RpkiBatchBuilder":
        return self.add_set(self.m.get_polling_period(value))

    def delete_polling_period(self) -> "RpkiBatchBuilder":
        return self.add_delete(self.m.get_polling_period_delete())

    def set_retry_interval(self, value: str) -> "RpkiBatchBuilder":
        return self.add_set(self.m.get_retry_interval(value))

    def delete_retry_interval(self) -> "RpkiBatchBuilder":
        return self.add_delete(self.m.get_retry_interval_delete())

    # ========================================================================
    # Delete entire RPKI
    # ========================================================================

    def delete_rpki(self) -> "RpkiBatchBuilder":
        return self.add_delete(self.m.get_rpki_delete())
