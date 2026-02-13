"""
IGMP Proxy Batch Builder

Provides all batch operations for IGMP proxy configuration.
No version differences between VyOS 1.4 and 1.5.
"""

from typing import List, Dict, Any
from vyos_mappers import CommandMapperRegistry


class IgmpProxyBatchBuilder:
    """Complete batch builder for IGMP proxy operations."""

    def __init__(self, version: str):
        self.version = version
        self._operations: List[Dict[str, Any]] = []
        self.mappers = CommandMapperRegistry.get_all_mappers(version)
        self.mapper_key = "igmp_proxy"

    # ========================================================================
    # Core Batch Operations
    # ========================================================================

    def add_set(self, path: List[str]) -> "IgmpProxyBatchBuilder":
        if path:
            self._operations.append({"op": "set", "path": path})
        return self

    def add_delete(self, path: List[str]) -> "IgmpProxyBatchBuilder":
        if path:
            self._operations.append({"op": "delete", "path": path})
        return self

    def get_operations(self) -> List[Dict[str, Any]]:
        return self._operations.copy()

    def is_empty(self) -> bool:
        return len(self._operations) == 0

    # ========================================================================
    # Global Operations
    # ========================================================================

    def set_disable(self) -> "IgmpProxyBatchBuilder":
        path = self.mappers[self.mapper_key].get_disable_path()
        return self.add_set(path)

    def delete_disable(self) -> "IgmpProxyBatchBuilder":
        path = self.mappers[self.mapper_key].get_disable_path()
        return self.add_delete(path)

    def set_disable_quickleave(self) -> "IgmpProxyBatchBuilder":
        path = self.mappers[self.mapper_key].get_disable_quickleave_path()
        return self.add_set(path)

    def delete_disable_quickleave(self) -> "IgmpProxyBatchBuilder":
        path = self.mappers[self.mapper_key].get_disable_quickleave_path()
        return self.add_delete(path)

    # ========================================================================
    # Interface Operations
    # ========================================================================

    def set_interface(self, interface: str) -> "IgmpProxyBatchBuilder":
        path = self.mappers[self.mapper_key].get_interface_path(interface)
        return self.add_set(path)

    def delete_interface(self, interface: str) -> "IgmpProxyBatchBuilder":
        path = self.mappers[self.mapper_key].get_interface_path(interface)
        return self.add_delete(path)

    def set_interface_role(self, interface: str, value: str) -> "IgmpProxyBatchBuilder":
        path = self.mappers[self.mapper_key].get_interface_role(interface, value)
        return self.add_set(path)

    def delete_interface_role(self, interface: str) -> "IgmpProxyBatchBuilder":
        path = self.mappers[self.mapper_key].get_interface_role_path(interface)
        return self.add_delete(path)

    def set_interface_threshold(self, interface: str, value: str) -> "IgmpProxyBatchBuilder":
        path = self.mappers[self.mapper_key].get_interface_threshold(interface, value)
        return self.add_set(path)

    def delete_interface_threshold(self, interface: str) -> "IgmpProxyBatchBuilder":
        path = self.mappers[self.mapper_key].get_interface_threshold_path(interface)
        return self.add_delete(path)

    def set_interface_alt_subnet(self, interface: str, value: str) -> "IgmpProxyBatchBuilder":
        path = self.mappers[self.mapper_key].get_interface_alt_subnet(interface, value)
        return self.add_set(path)

    def delete_interface_alt_subnet(self, interface: str, value: str) -> "IgmpProxyBatchBuilder":
        path = self.mappers[self.mapper_key].get_interface_alt_subnet(interface, value)
        return self.add_delete(path)

    def delete_interface_all_alt_subnets(self, interface: str) -> "IgmpProxyBatchBuilder":
        path = self.mappers[self.mapper_key].get_interface_alt_subnet_path(interface)
        return self.add_delete(path)

    def set_interface_whitelist(self, interface: str, value: str) -> "IgmpProxyBatchBuilder":
        path = self.mappers[self.mapper_key].get_interface_whitelist(interface, value)
        return self.add_set(path)

    def delete_interface_whitelist(self, interface: str, value: str) -> "IgmpProxyBatchBuilder":
        path = self.mappers[self.mapper_key].get_interface_whitelist(interface, value)
        return self.add_delete(path)

    def delete_interface_all_whitelists(self, interface: str) -> "IgmpProxyBatchBuilder":
        path = self.mappers[self.mapper_key].get_interface_whitelist_path(interface)
        return self.add_delete(path)

    # ========================================================================
    # Capabilities
    # ========================================================================

    def get_capabilities(self) -> Dict[str, Any]:
        is_1_5 = "1.5" in self.version or "latest" in self.version
        is_1_4 = "1.4" in self.version

        return {
            "version": self.version,
            "features": {
                "igmp_proxy": {"supported": True, "description": "IGMP Proxy configuration"},
                "disable": {"supported": True, "description": "Disable IGMP proxy"},
                "disable_quickleave": {"supported": True, "description": "Disable quickleave optimization"},
                "interface": {"supported": True, "description": "Interface configuration"},
                "role": {"supported": True, "description": "Interface role (upstream/downstream/disabled)"},
                "threshold": {"supported": True, "description": "TTL threshold (1-255)"},
                "alt_subnet": {"supported": True, "description": "Alternate source subnets"},
                "whitelist": {"supported": True, "description": "Multicast group whitelist"},
            },
            "version_info": {
                "is_1_4": is_1_4,
                "is_1_5": is_1_5,
            },
        }
