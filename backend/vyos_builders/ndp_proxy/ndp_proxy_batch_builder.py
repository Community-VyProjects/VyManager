"""
NDP Proxy Batch Builder

Provides all batch operations for NDP proxy configuration.
No version differences between VyOS 1.4 and 1.5.

Config tree:
  service ndp-proxy/
    route-refresh          (10000-120000 ms, default 30000)
    interface/<IFACE>/
      disable
      enable-router-bit
      timeout              (500-120000 ms, default 500)
      ttl                  (10000-120000 ms, default 30000)
      prefix/<PREFIX>/
        disable
        mode               (static|auto|interface)
        interface          (iface name, required for interface mode)
"""

from typing import List, Dict, Any
from vyos_mappers import CommandMapperRegistry


class NdpProxyBatchBuilder:
    """Complete batch builder for NDP proxy operations."""

    def __init__(self, version: str):
        self.version = version
        self._operations: List[Dict[str, Any]] = []
        self.mappers = CommandMapperRegistry.get_all_mappers(version)
        self.m = self.mappers["ndp_proxy"]

    # ========================================================================
    # Core Batch Operations
    # ========================================================================

    def add_set(self, path: List[str]) -> "NdpProxyBatchBuilder":
        if path:
            self._operations.append({"op": "set", "path": path})
        return self

    def add_delete(self, path: List[str]) -> "NdpProxyBatchBuilder":
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

    def set_route_refresh(self, value: str) -> "NdpProxyBatchBuilder":
        return self.add_set(self.m.get_route_refresh(value))

    def delete_route_refresh(self) -> "NdpProxyBatchBuilder":
        return self.add_delete(self.m.get_route_refresh_path())

    # ========================================================================
    # Interface Operations
    # ========================================================================

    def set_interface(self, interface: str) -> "NdpProxyBatchBuilder":
        return self.add_set(self.m.get_interface_path(interface))

    def delete_interface(self, interface: str) -> "NdpProxyBatchBuilder":
        return self.add_delete(self.m.get_interface_path(interface))

    def set_interface_disable(self, interface: str) -> "NdpProxyBatchBuilder":
        return self.add_set(self.m.get_interface_disable(interface))

    def delete_interface_disable(self, interface: str) -> "NdpProxyBatchBuilder":
        return self.add_delete(self.m.get_interface_disable(interface))

    def set_interface_enable_router_bit(self, interface: str) -> "NdpProxyBatchBuilder":
        return self.add_set(self.m.get_interface_enable_router_bit(interface))

    def delete_interface_enable_router_bit(self, interface: str) -> "NdpProxyBatchBuilder":
        return self.add_delete(self.m.get_interface_enable_router_bit(interface))

    def set_interface_timeout(self, interface: str, value: str) -> "NdpProxyBatchBuilder":
        return self.add_set(self.m.get_interface_timeout(interface, value))

    def delete_interface_timeout(self, interface: str) -> "NdpProxyBatchBuilder":
        return self.add_delete(self.m.get_interface_timeout_path(interface))

    def set_interface_ttl(self, interface: str, value: str) -> "NdpProxyBatchBuilder":
        return self.add_set(self.m.get_interface_ttl(interface, value))

    def delete_interface_ttl(self, interface: str) -> "NdpProxyBatchBuilder":
        return self.add_delete(self.m.get_interface_ttl_path(interface))

    # ========================================================================
    # Prefix Operations
    # ========================================================================

    def set_prefix(self, interface: str, prefix: str) -> "NdpProxyBatchBuilder":
        return self.add_set(self.m.get_prefix_path(interface, prefix))

    def delete_prefix(self, interface: str, prefix: str) -> "NdpProxyBatchBuilder":
        return self.add_delete(self.m.get_prefix_path(interface, prefix))

    def set_prefix_disable(self, interface: str, prefix: str) -> "NdpProxyBatchBuilder":
        return self.add_set(self.m.get_prefix_disable(interface, prefix))

    def delete_prefix_disable(self, interface: str, prefix: str) -> "NdpProxyBatchBuilder":
        return self.add_delete(self.m.get_prefix_disable(interface, prefix))

    def set_prefix_mode(self, interface: str, prefix: str, value: str) -> "NdpProxyBatchBuilder":
        return self.add_set(self.m.get_prefix_mode(interface, prefix, value))

    def delete_prefix_mode(self, interface: str, prefix: str) -> "NdpProxyBatchBuilder":
        return self.add_delete(self.m.get_prefix_mode_path(interface, prefix))

    def set_prefix_interface(self, interface: str, prefix: str, value: str) -> "NdpProxyBatchBuilder":
        return self.add_set(self.m.get_prefix_interface(interface, prefix, value))

    def delete_prefix_interface(self, interface: str, prefix: str) -> "NdpProxyBatchBuilder":
        return self.add_delete(self.m.get_prefix_interface_path(interface, prefix))

    # ========================================================================
    # Capabilities
    # ========================================================================

    def get_capabilities(self) -> Dict[str, Any]:
        is_1_4 = "1.4" in self.version
        is_1_5 = not is_1_4

        return {
            "version": self.version,
            "features": {
                "ndp_proxy": {"supported": True, "description": "NDP Proxy configuration"},
                "route_refresh": {"supported": True, "description": "IPv6 route refresh interval (10000-120000 ms)"},
                "interface": {"supported": True, "description": "Listener interface configuration"},
                "interface_disable": {"supported": True, "description": "Disable an interface instance"},
                "interface_enable_router_bit": {"supported": True, "description": "Enable router bit in Neighbor Advertisement messages"},
                "interface_timeout": {"supported": True, "description": "NA response timeout (500-120000 ms)"},
                "interface_ttl": {"supported": True, "description": "Proxy entry cache TTL (10000-120000 ms)"},
                "prefix": {"supported": True, "description": "IPv6 prefix/address for NDP proxy"},
                "prefix_disable": {"supported": True, "description": "Disable a prefix instance"},
                "prefix_mode": {"supported": True, "description": "Proxy mode: static, auto, or interface"},
                "prefix_interface": {"supported": True, "description": "Forwarding interface (required for interface mode)"},
            },
            "version_info": {
                "is_1_4": is_1_4,
                "is_1_5": is_1_5,
            },
        }
