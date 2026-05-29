"""
Salt Minion Service Batch Builder

Generates VyOS set/delete operations for the Salt Minion service.

Configuration lives under: service salt-minion

Structure:
  service salt-minion
    hash <algo>           # Single value: md5|sha1|sha224|sha256|sha384|sha512 (default: sha256)
    id <name>             # Single value — explicit minion ID (default: hostname)
    interval <minutes>    # Single value: 1-1440 — update interval (default: 60)
    master-key <url>      # Single value — URL for master signature verification
    master <host>         # Multi-value — Salt master hostname(s) or IP(s)
    source-interface <if> # Single value — interface used for connection

Version differences:
  1.4 and 1.5 share identical Salt Minion config paths — no version-specific overrides.
"""

from typing import List, Dict, Any
from vyos_mappers import CommandMapperRegistry


class SaltMinionBatchBuilder:
    def __init__(self, version: str):
        self.version = version
        self._operations: List[Dict[str, Any]] = []
        self.mappers = CommandMapperRegistry.get_all_mappers(version)
        self.m = self.mappers["salt_minion"]

    # -----------------------------------------------------------------------
    # Core helpers
    # -----------------------------------------------------------------------

    def add_set(self, path: List[str]) -> "SaltMinionBatchBuilder":
        if path:
            self._operations.append({"op": "set", "path": path})
        return self

    def add_delete(self, path: List[str]) -> "SaltMinionBatchBuilder":
        if path:
            self._operations.append({"op": "delete", "path": path})
        return self

    def get_operations(self) -> List[Dict[str, Any]]:
        return self._operations.copy()

    def is_empty(self) -> bool:
        return len(self._operations) == 0

    # -----------------------------------------------------------------------
    # Capabilities
    # -----------------------------------------------------------------------

    def get_capabilities(self) -> Dict[str, Any]:
        is_1_4 = "1.4" in self.version
        is_1_5 = not is_1_4

        return {
            "version": self.version,
            "features": {
                "salt_minion": {
                    "supported": True,
                    "description": "Salt Minion configuration management agent",
                },
                "hash": {
                    "supported": True,
                    "description": "Hash algorithm used when discovering files on master",
                    "values": ["md5", "sha1", "sha224", "sha256", "sha384", "sha512"],
                    "default": "sha256",
                },
                "id": {
                    "supported": True,
                    "description": "Explicit minion ID (defaults to hostname if unset)",
                },
                "interval": {
                    "supported": True,
                    "description": "Interval in minutes between state updates",
                    "range": {"min": 1, "max": 1440},
                    "default": 60,
                },
                "master_key": {
                    "supported": True,
                    "description": "URL with master signature for auth reply verification",
                },
                "master": {
                    "supported": True,
                    "description": "Salt master server hostname(s) or IP address(es)",
                    "multi_value": True,
                },
                "source_interface": {
                    "supported": True,
                    "description": "Network interface used to establish connection to master",
                },
            },
            "version_info": {
                "is_1_4": is_1_4,
                "is_1_5": is_1_5,
            },
        }

    # -----------------------------------------------------------------------
    # Global
    # -----------------------------------------------------------------------

    def delete_salt_minion(self) -> "SaltMinionBatchBuilder":
        """Delete the entire Salt Minion service configuration."""
        return self.add_delete(self.m.get_salt_minion_delete())

    # -----------------------------------------------------------------------
    # Hash
    # -----------------------------------------------------------------------

    def set_hash(self, value: str) -> "SaltMinionBatchBuilder":
        """Set the hash algorithm for file discovery (md5|sha1|sha224|sha256|sha384|sha512)."""
        return self.add_set(self.m.get_hash(value))

    def delete_hash(self) -> "SaltMinionBatchBuilder":
        """Remove the hash setting (reverts to default: sha256)."""
        return self.add_delete(self.m.get_hash_delete())

    # -----------------------------------------------------------------------
    # ID
    # -----------------------------------------------------------------------

    def set_id(self, value: str) -> "SaltMinionBatchBuilder":
        """Set the explicit minion ID."""
        return self.add_set(self.m.get_id(value))

    def delete_id(self) -> "SaltMinionBatchBuilder":
        """Remove the explicit minion ID (reverts to hostname)."""
        return self.add_delete(self.m.get_id_delete())

    # -----------------------------------------------------------------------
    # Interval
    # -----------------------------------------------------------------------

    def set_interval(self, value: str) -> "SaltMinionBatchBuilder":
        """Set the update interval in minutes (1-1440)."""
        return self.add_set(self.m.get_interval(value))

    def delete_interval(self) -> "SaltMinionBatchBuilder":
        """Remove the interval setting (reverts to default: 60)."""
        return self.add_delete(self.m.get_interval_delete())

    # -----------------------------------------------------------------------
    # Master-key
    # -----------------------------------------------------------------------

    def set_master_key(self, value: str) -> "SaltMinionBatchBuilder":
        """Set the URL for master signature verification."""
        return self.add_set(self.m.get_master_key(value))

    def delete_master_key(self) -> "SaltMinionBatchBuilder":
        """Remove the master key URL."""
        return self.add_delete(self.m.get_master_key_delete())

    # -----------------------------------------------------------------------
    # Master
    # -----------------------------------------------------------------------

    def set_master(self, address: str) -> "SaltMinionBatchBuilder":
        """Add a Salt master server (hostname or IP)."""
        return self.add_set(self.m.get_master(address))

    def delete_master(self, address: str) -> "SaltMinionBatchBuilder":
        """Remove a specific Salt master server."""
        return self.add_delete(self.m.get_master_delete(address))

    def delete_all_masters(self) -> "SaltMinionBatchBuilder":
        """Remove all Salt master server entries."""
        return self.add_delete(self.m.get_all_masters_delete())

    # -----------------------------------------------------------------------
    # Source-interface
    # -----------------------------------------------------------------------

    def set_source_interface(self, name: str) -> "SaltMinionBatchBuilder":
        """Set the interface used to establish connection to the master."""
        return self.add_set(self.m.get_source_interface(name))

    def delete_source_interface(self) -> "SaltMinionBatchBuilder":
        """Remove the source interface setting."""
        return self.add_delete(self.m.get_source_interface_delete())
