"""
Failover Routing Batch Builder

Provides all batch operations for failover route configuration.
Handles version-specific differences through the mapper layer.
"""

from typing import List, Dict, Any
from vyos_mappers import CommandMapperRegistry


class FailoverBatchBuilder:
    """Complete batch builder for failover routing operations."""

    def __init__(self, version: str):
        self.version = version
        self._operations: List[Dict[str, Any]] = []
        self.mappers = CommandMapperRegistry.get_all_mappers(version)
        self.mapper_key = "failover"

    # ========================================================================
    # Core Batch Operations
    # ========================================================================

    def add_set(self, path: List[str]) -> "FailoverBatchBuilder":
        if path:
            self._operations.append({"op": "set", "path": path})
        return self

    def add_delete(self, path: List[str]) -> "FailoverBatchBuilder":
        if path:
            self._operations.append({"op": "delete", "path": path})
        return self

    def get_operations(self) -> List[Dict[str, Any]]:
        return self._operations.copy()

    def is_empty(self) -> bool:
        return len(self._operations) == 0

    # ========================================================================
    # Route Operations
    # ========================================================================

    def set_route(self, destination: str) -> "FailoverBatchBuilder":
        path = self.mappers[self.mapper_key].get_route_path(destination)
        return self.add_set(path)

    def delete_route(self, destination: str) -> "FailoverBatchBuilder":
        path = self.mappers[self.mapper_key].get_route_path(destination)
        return self.add_delete(path)

    # ========================================================================
    # Next-Hop Operations
    # ========================================================================

    def set_next_hop(self, destination: str, next_hop: str) -> "FailoverBatchBuilder":
        path = self.mappers[self.mapper_key].get_next_hop_path(destination, next_hop)
        return self.add_set(path)

    def delete_next_hop(self, destination: str, next_hop: str) -> "FailoverBatchBuilder":
        path = self.mappers[self.mapper_key].get_next_hop_path(destination, next_hop)
        return self.add_delete(path)

    def set_next_hop_check_policy(self, destination: str, next_hop: str, value: str) -> "FailoverBatchBuilder":
        path = self.mappers[self.mapper_key].get_next_hop_check_policy(destination, next_hop, value)
        return self.add_set(path)

    def delete_next_hop_check_policy(self, destination: str, next_hop: str) -> "FailoverBatchBuilder":
        path = self.mappers[self.mapper_key].get_next_hop_check_policy_path(destination, next_hop)
        return self.add_delete(path)

    def set_next_hop_check_port(self, destination: str, next_hop: str, value: str) -> "FailoverBatchBuilder":
        path = self.mappers[self.mapper_key].get_next_hop_check_port(destination, next_hop, value)
        return self.add_set(path)

    def delete_next_hop_check_port(self, destination: str, next_hop: str) -> "FailoverBatchBuilder":
        path = self.mappers[self.mapper_key].get_next_hop_check_port_path(destination, next_hop)
        return self.add_delete(path)

    def set_next_hop_check_target(self, destination: str, next_hop: str, value: str) -> "FailoverBatchBuilder":
        path = self.mappers[self.mapper_key].get_next_hop_check_target(destination, next_hop, value)
        return self.add_set(path)

    def delete_next_hop_check_target(self, destination: str, next_hop: str, value: str) -> "FailoverBatchBuilder":
        """Delete a specific target. In 1.4 removes from multi-value list, in 1.5 removes tag node."""
        path = self.mappers[self.mapper_key].get_next_hop_check_target(destination, next_hop, value)
        return self.add_delete(path)

    def delete_next_hop_check_target_all(self, destination: str, next_hop: str) -> "FailoverBatchBuilder":
        """Delete all targets."""
        path = self.mappers[self.mapper_key].get_next_hop_check_target_path(destination, next_hop)
        return self.add_delete(path)

    def set_next_hop_check_target_interface(self, destination: str, next_hop: str, target: str, value: str) -> "FailoverBatchBuilder":
        """Set target interface (1.5 only)."""
        path = self.mappers[self.mapper_key].get_next_hop_check_target_interface(destination, next_hop, target, value)
        return self.add_set(path)

    def delete_next_hop_check_target_interface(self, destination: str, next_hop: str, target: str) -> "FailoverBatchBuilder":
        """Delete target interface (1.5 only)."""
        path = self.mappers[self.mapper_key].get_next_hop_check_target_interface_path(destination, next_hop, target)
        return self.add_delete(path)

    def set_next_hop_check_target_vrf(self, destination: str, next_hop: str, target: str, value: str) -> "FailoverBatchBuilder":
        """Set target VRF (1.5 only)."""
        path = self.mappers[self.mapper_key].get_next_hop_check_target_vrf(destination, next_hop, target, value)
        return self.add_set(path)

    def delete_next_hop_check_target_vrf(self, destination: str, next_hop: str, target: str) -> "FailoverBatchBuilder":
        """Delete target VRF (1.5 only)."""
        path = self.mappers[self.mapper_key].get_next_hop_check_target_vrf_path(destination, next_hop, target)
        return self.add_delete(path)

    def set_next_hop_check_timeout(self, destination: str, next_hop: str, value: str) -> "FailoverBatchBuilder":
        path = self.mappers[self.mapper_key].get_next_hop_check_timeout(destination, next_hop, value)
        return self.add_set(path)

    def delete_next_hop_check_timeout(self, destination: str, next_hop: str) -> "FailoverBatchBuilder":
        path = self.mappers[self.mapper_key].get_next_hop_check_timeout_path(destination, next_hop)
        return self.add_delete(path)

    def set_next_hop_check_type(self, destination: str, next_hop: str, value: str) -> "FailoverBatchBuilder":
        path = self.mappers[self.mapper_key].get_next_hop_check_type(destination, next_hop, value)
        return self.add_set(path)

    def delete_next_hop_check_type(self, destination: str, next_hop: str) -> "FailoverBatchBuilder":
        path = self.mappers[self.mapper_key].get_next_hop_check_type_path(destination, next_hop)
        return self.add_delete(path)

    def set_next_hop_interface(self, destination: str, next_hop: str, value: str) -> "FailoverBatchBuilder":
        path = self.mappers[self.mapper_key].get_next_hop_interface(destination, next_hop, value)
        return self.add_set(path)

    def delete_next_hop_interface(self, destination: str, next_hop: str) -> "FailoverBatchBuilder":
        path = self.mappers[self.mapper_key].get_next_hop_interface_path(destination, next_hop)
        return self.add_delete(path)

    def set_next_hop_metric(self, destination: str, next_hop: str, value: str) -> "FailoverBatchBuilder":
        path = self.mappers[self.mapper_key].get_next_hop_metric(destination, next_hop, value)
        return self.add_set(path)

    def delete_next_hop_metric(self, destination: str, next_hop: str) -> "FailoverBatchBuilder":
        path = self.mappers[self.mapper_key].get_next_hop_metric_path(destination, next_hop)
        return self.add_delete(path)

    def set_next_hop_onlink(self, destination: str, next_hop: str) -> "FailoverBatchBuilder":
        path = self.mappers[self.mapper_key].get_next_hop_onlink(destination, next_hop)
        return self.add_set(path)

    def delete_next_hop_onlink(self, destination: str, next_hop: str) -> "FailoverBatchBuilder":
        path = self.mappers[self.mapper_key].get_next_hop_onlink(destination, next_hop)
        return self.add_delete(path)

    # ========================================================================
    # DHCP-Interface Operations (1.5 only)
    # ========================================================================

    def set_dhcp_interface(self, destination: str, dhcp_interface: str) -> "FailoverBatchBuilder":
        path = self.mappers[self.mapper_key].get_dhcp_interface_path(destination, dhcp_interface)
        return self.add_set(path)

    def delete_dhcp_interface(self, destination: str, dhcp_interface: str) -> "FailoverBatchBuilder":
        path = self.mappers[self.mapper_key].get_dhcp_interface_path(destination, dhcp_interface)
        return self.add_delete(path)

    def set_dhcp_interface_check_policy(self, destination: str, dhcp_interface: str, value: str) -> "FailoverBatchBuilder":
        path = self.mappers[self.mapper_key].get_dhcp_interface_check_policy(destination, dhcp_interface, value)
        return self.add_set(path)

    def delete_dhcp_interface_check_policy(self, destination: str, dhcp_interface: str) -> "FailoverBatchBuilder":
        path = self.mappers[self.mapper_key].get_dhcp_interface_check_policy_path(destination, dhcp_interface)
        return self.add_delete(path)

    def set_dhcp_interface_check_port(self, destination: str, dhcp_interface: str, value: str) -> "FailoverBatchBuilder":
        path = self.mappers[self.mapper_key].get_dhcp_interface_check_port(destination, dhcp_interface, value)
        return self.add_set(path)

    def delete_dhcp_interface_check_port(self, destination: str, dhcp_interface: str) -> "FailoverBatchBuilder":
        path = self.mappers[self.mapper_key].get_dhcp_interface_check_port_path(destination, dhcp_interface)
        return self.add_delete(path)

    def set_dhcp_interface_check_target(self, destination: str, dhcp_interface: str, value: str) -> "FailoverBatchBuilder":
        path = self.mappers[self.mapper_key].get_dhcp_interface_check_target(destination, dhcp_interface, value)
        return self.add_set(path)

    def delete_dhcp_interface_check_target(self, destination: str, dhcp_interface: str, value: str) -> "FailoverBatchBuilder":
        path = self.mappers[self.mapper_key].get_dhcp_interface_check_target(destination, dhcp_interface, value)
        return self.add_delete(path)

    def delete_dhcp_interface_check_target_all(self, destination: str, dhcp_interface: str) -> "FailoverBatchBuilder":
        path = self.mappers[self.mapper_key].get_dhcp_interface_check_target_path(destination, dhcp_interface)
        return self.add_delete(path)

    def set_dhcp_interface_check_target_interface(self, destination: str, dhcp_interface: str, target: str, value: str) -> "FailoverBatchBuilder":
        path = self.mappers[self.mapper_key].get_dhcp_interface_check_target_interface(destination, dhcp_interface, target, value)
        return self.add_set(path)

    def delete_dhcp_interface_check_target_interface(self, destination: str, dhcp_interface: str, target: str) -> "FailoverBatchBuilder":
        path = self.mappers[self.mapper_key].get_dhcp_interface_check_target_interface_path(destination, dhcp_interface, target)
        return self.add_delete(path)

    def set_dhcp_interface_check_target_vrf(self, destination: str, dhcp_interface: str, target: str, value: str) -> "FailoverBatchBuilder":
        path = self.mappers[self.mapper_key].get_dhcp_interface_check_target_vrf(destination, dhcp_interface, target, value)
        return self.add_set(path)

    def delete_dhcp_interface_check_target_vrf(self, destination: str, dhcp_interface: str, target: str) -> "FailoverBatchBuilder":
        path = self.mappers[self.mapper_key].get_dhcp_interface_check_target_vrf_path(destination, dhcp_interface, target)
        return self.add_delete(path)

    def set_dhcp_interface_check_timeout(self, destination: str, dhcp_interface: str, value: str) -> "FailoverBatchBuilder":
        path = self.mappers[self.mapper_key].get_dhcp_interface_check_timeout(destination, dhcp_interface, value)
        return self.add_set(path)

    def delete_dhcp_interface_check_timeout(self, destination: str, dhcp_interface: str) -> "FailoverBatchBuilder":
        path = self.mappers[self.mapper_key].get_dhcp_interface_check_timeout_path(destination, dhcp_interface)
        return self.add_delete(path)

    def set_dhcp_interface_check_type(self, destination: str, dhcp_interface: str, value: str) -> "FailoverBatchBuilder":
        path = self.mappers[self.mapper_key].get_dhcp_interface_check_type(destination, dhcp_interface, value)
        return self.add_set(path)

    def delete_dhcp_interface_check_type(self, destination: str, dhcp_interface: str) -> "FailoverBatchBuilder":
        path = self.mappers[self.mapper_key].get_dhcp_interface_check_type_path(destination, dhcp_interface)
        return self.add_delete(path)

    def set_dhcp_interface_interface(self, destination: str, dhcp_interface: str, value: str) -> "FailoverBatchBuilder":
        path = self.mappers[self.mapper_key].get_dhcp_interface_interface(destination, dhcp_interface, value)
        return self.add_set(path)

    def delete_dhcp_interface_interface(self, destination: str, dhcp_interface: str) -> "FailoverBatchBuilder":
        path = self.mappers[self.mapper_key].get_dhcp_interface_interface_path(destination, dhcp_interface)
        return self.add_delete(path)

    def set_dhcp_interface_metric(self, destination: str, dhcp_interface: str, value: str) -> "FailoverBatchBuilder":
        path = self.mappers[self.mapper_key].get_dhcp_interface_metric(destination, dhcp_interface, value)
        return self.add_set(path)

    def delete_dhcp_interface_metric(self, destination: str, dhcp_interface: str) -> "FailoverBatchBuilder":
        path = self.mappers[self.mapper_key].get_dhcp_interface_metric_path(destination, dhcp_interface)
        return self.add_delete(path)

    def set_dhcp_interface_onlink(self, destination: str, dhcp_interface: str) -> "FailoverBatchBuilder":
        path = self.mappers[self.mapper_key].get_dhcp_interface_onlink(destination, dhcp_interface)
        return self.add_set(path)

    def delete_dhcp_interface_onlink(self, destination: str, dhcp_interface: str) -> "FailoverBatchBuilder":
        path = self.mappers[self.mapper_key].get_dhcp_interface_onlink(destination, dhcp_interface)
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
                "routes": {
                    "supported": True,
                    "description": "Failover route configuration",
                },
                "next_hop": {
                    "supported": True,
                    "description": "Next-hop failover with health checks",
                },
                "dhcp_interface": {
                    "supported": is_1_5,
                    "description": "DHCP interface failover (VyOS 1.5+)",
                },
                "check_target_properties": {
                    "supported": is_1_5,
                    "description": "Check target interface/VRF properties (VyOS 1.5+)",
                },
            },
            "version_info": {
                "is_1_4": is_1_4,
                "is_1_5": is_1_5,
            },
        }
