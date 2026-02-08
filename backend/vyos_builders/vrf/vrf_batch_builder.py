"""
VRF Batch Builder

Provides all batch operations for VRF (Virtual Routing and Forwarding) configuration.
Handles version-specific differences through the mapper layer.
"""

from typing import List, Dict, Any
from vyos_mappers import CommandMapperRegistry


class VrfBatchBuilder:
    """Complete batch builder for VRF operations."""

    def __init__(self, version: str):
        self.version = version
        self._operations: List[Dict[str, Any]] = []
        self.mappers = CommandMapperRegistry.get_all_mappers(version)
        self.mapper_key = "vrf"

    # ========================================================================
    # Core Batch Operations
    # ========================================================================

    def add_set(self, path: List[str]) -> "VrfBatchBuilder":
        if path:
            self._operations.append({"op": "set", "path": path})
        return self

    def add_delete(self, path: List[str]) -> "VrfBatchBuilder":
        if path:
            self._operations.append({"op": "delete", "path": path})
        return self

    def get_operations(self) -> List[Dict[str, Any]]:
        return self._operations.copy()

    def is_empty(self) -> bool:
        return len(self._operations) == 0

    # ========================================================================
    # Global VRF Operations
    # ========================================================================

    def set_bind_to_all(self) -> "VrfBatchBuilder":
        path = self.mappers[self.mapper_key].get_bind_to_all()
        return self.add_set(path)

    def delete_bind_to_all(self) -> "VrfBatchBuilder":
        path = self.mappers[self.mapper_key].get_bind_to_all()
        return self.add_delete(path)

    # ========================================================================
    # VRF Instance Operations
    # ========================================================================

    def set_vrf(self, name: str) -> "VrfBatchBuilder":
        path = self.mappers[self.mapper_key].get_vrf_path(name)
        return self.add_set(path)

    def delete_vrf(self, name: str) -> "VrfBatchBuilder":
        path = self.mappers[self.mapper_key].get_vrf_path(name)
        return self.add_delete(path)

    def set_vrf_description(self, name: str, value: str) -> "VrfBatchBuilder":
        path = self.mappers[self.mapper_key].get_vrf_description(name, value)
        return self.add_set(path)

    def delete_vrf_description(self, name: str) -> "VrfBatchBuilder":
        path = self.mappers[self.mapper_key].get_vrf_path(name) + ["description"]
        return self.add_delete(path)

    def set_vrf_disable(self, name: str) -> "VrfBatchBuilder":
        path = self.mappers[self.mapper_key].get_vrf_disable(name)
        return self.add_set(path)

    def delete_vrf_disable(self, name: str) -> "VrfBatchBuilder":
        path = self.mappers[self.mapper_key].get_vrf_disable(name)
        return self.add_delete(path)

    def set_vrf_table(self, name: str, value: str) -> "VrfBatchBuilder":
        path = self.mappers[self.mapper_key].get_vrf_table(name, value)
        return self.add_set(path)

    def delete_vrf_table(self, name: str) -> "VrfBatchBuilder":
        path = self.mappers[self.mapper_key].get_vrf_path(name) + ["table"]
        return self.add_delete(path)

    def set_vrf_vni(self, name: str, value: str) -> "VrfBatchBuilder":
        path = self.mappers[self.mapper_key].get_vrf_vni(name, value)
        return self.add_set(path)

    def delete_vrf_vni(self, name: str) -> "VrfBatchBuilder":
        path = self.mappers[self.mapper_key].get_vrf_path(name) + ["vni"]
        return self.add_delete(path)

    # ========================================================================
    # IP Settings
    # ========================================================================

    def set_vrf_ip_disable_forwarding(self, name: str) -> "VrfBatchBuilder":
        path = self.mappers[self.mapper_key].get_vrf_ip_disable_forwarding(name)
        return self.add_set(path)

    def delete_vrf_ip_disable_forwarding(self, name: str) -> "VrfBatchBuilder":
        path = self.mappers[self.mapper_key].get_vrf_ip_disable_forwarding(name)
        return self.add_delete(path)

    def set_vrf_ip_nht_no_resolve_via_default(self, name: str) -> "VrfBatchBuilder":
        path = self.mappers[self.mapper_key].get_vrf_ip_nht_no_resolve_via_default(name)
        return self.add_set(path)

    def delete_vrf_ip_nht_no_resolve_via_default(self, name: str) -> "VrfBatchBuilder":
        path = self.mappers[self.mapper_key].get_vrf_ip_nht_no_resolve_via_default(name)
        return self.add_delete(path)

    def set_vrf_ip_protocol_route_map(self, name: str, value: str) -> "VrfBatchBuilder":
        """Set IP protocol route-map. Value format: 'protocol,route-map-name'."""
        parts = value.split(",", 1)
        if len(parts) == 2:
            path = self.mappers[self.mapper_key].get_vrf_ip_protocol_route_map(name, parts[0], parts[1])
            return self.add_set(path)
        return self

    def delete_vrf_ip_protocol_route_map(self, name: str, value: str) -> "VrfBatchBuilder":
        """Delete IP protocol route-map. Value is the protocol name."""
        path = self.mappers[self.mapper_key].get_vrf_path(name) + ["ip", "protocol", value, "route-map"]
        return self.add_delete(path)

    # ========================================================================
    # IPv6 Settings
    # ========================================================================

    def set_vrf_ipv6_disable_forwarding(self, name: str) -> "VrfBatchBuilder":
        path = self.mappers[self.mapper_key].get_vrf_ipv6_disable_forwarding(name)
        return self.add_set(path)

    def delete_vrf_ipv6_disable_forwarding(self, name: str) -> "VrfBatchBuilder":
        path = self.mappers[self.mapper_key].get_vrf_ipv6_disable_forwarding(name)
        return self.add_delete(path)

    def set_vrf_ipv6_nht_no_resolve_via_default(self, name: str) -> "VrfBatchBuilder":
        path = self.mappers[self.mapper_key].get_vrf_ipv6_nht_no_resolve_via_default(name)
        return self.add_set(path)

    def delete_vrf_ipv6_nht_no_resolve_via_default(self, name: str) -> "VrfBatchBuilder":
        path = self.mappers[self.mapper_key].get_vrf_ipv6_nht_no_resolve_via_default(name)
        return self.add_delete(path)

    def set_vrf_ipv6_protocol_route_map(self, name: str, value: str) -> "VrfBatchBuilder":
        """Set IPv6 protocol route-map. Value format: 'protocol,route-map-name'."""
        parts = value.split(",", 1)
        if len(parts) == 2:
            path = self.mappers[self.mapper_key].get_vrf_ipv6_protocol_route_map(name, parts[0], parts[1])
            return self.add_set(path)
        return self

    def delete_vrf_ipv6_protocol_route_map(self, name: str, value: str) -> "VrfBatchBuilder":
        """Delete IPv6 protocol route-map. Value is the protocol name."""
        path = self.mappers[self.mapper_key].get_vrf_path(name) + ["ipv6", "protocol", value, "route-map"]
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
                "vrf_instances": {
                    "supported": True,
                    "description": "VRF instance management (create, delete, configure)",
                },
                "bind_to_all": {
                    "supported": True,
                    "description": "Bind services to all VRFs",
                },
                "vni": {
                    "supported": True,
                    "description": "VXLAN Network Identifier assignment",
                },
                "ip_settings": {
                    "supported": True,
                    "description": "IPv4 forwarding and NHT settings per VRF",
                },
                "ipv6_settings": {
                    "supported": True,
                    "description": "IPv6 forwarding and NHT settings per VRF",
                },
                "protocol_route_maps": {
                    "supported": True,
                    "description": "Per-protocol route-map assignment in VRF",
                },
                "vrf_protocols": {
                    "supported": False,
                    "description": "Full protocol configuration within VRF (BGP, OSPF, etc.) - future feature",
                },
                "vrf_services": {
                    "supported": False,
                    "description": "Service configuration within VRF (DHCP, DHCPv6) - VyOS 1.5+ only, future feature",
                },
            },
            "version_info": {
                "is_1_4": is_1_4,
                "is_1_5": is_1_5,
            },
        }
