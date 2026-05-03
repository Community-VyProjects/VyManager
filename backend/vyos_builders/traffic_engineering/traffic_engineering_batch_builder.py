"""Traffic Engineering Protocol Batch Builder.

Provides all batch operations for Traffic Engineering configuration.
Covers: admin group management and per-interface TE parameter settings.

Note: Traffic Engineering is only supported on VyOS 1.5+.
"""

from typing import List, Dict, Any
from vyos_mappers import CommandMapperRegistry


class TrafficEngineeringBatchBuilder:
    """Complete batch builder for Traffic Engineering protocol operations."""

    def __init__(self, version: str):
        self.version = version
        self._operations: List[Dict[str, Any]] = []
        self.mappers = CommandMapperRegistry.get_all_mappers(version)
        self.mapper_key = "traffic_engineering"

    # ========================================================================
    # Core Batch Operations
    # ========================================================================

    def add_set(self, path: List[str]) -> "TrafficEngineeringBatchBuilder":
        if path:
            self._operations.append({"op": "set", "path": path})
        return self

    def add_delete(self, path: List[str]) -> "TrafficEngineeringBatchBuilder":
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
        supported = not is_v14

        return {
            "version": self.version,
            "version_info": {
                "is_1_4": is_v14,
                "is_1_5": is_v15,
            },
            "features": {
                "traffic_engineering": {
                    "supported": supported,
                    "description": "Traffic Engineering link parameters for MPLS-TE and RSVP-TE",
                },
                "admin_groups": {
                    "supported": supported,
                    "description": "Named administrative groups with bit-position mapping (0-31)",
                },
                "interface_params": {
                    "supported": supported,
                    "description": "Per-interface TE parameters: admin-group, max-bandwidth, max-reservable-bandwidth, metric",
                },
            },
        }

    # ========================================================================
    # Admin Groups
    # ========================================================================

    def set_admin_group(self, name: str) -> "TrafficEngineeringBatchBuilder":
        return self.add_set(self.m.get_admin_group(name))

    def delete_admin_group(self, name: str) -> "TrafficEngineeringBatchBuilder":
        return self.add_delete(self.m.get_admin_group_delete(name))

    def set_admin_group_bit_position(self, name: str, bit: str) -> "TrafficEngineeringBatchBuilder":
        return self.add_set(self.m.get_admin_group_bit_position(name, bit))

    def delete_admin_group_bit_position(self, name: str) -> "TrafficEngineeringBatchBuilder":
        return self.add_delete(self.m.get_admin_group_bit_position_delete(name))

    # ========================================================================
    # Interfaces
    # ========================================================================

    def set_interface(self, iface: str) -> "TrafficEngineeringBatchBuilder":
        return self.add_set(self.m.get_interface(iface))

    def delete_interface(self, iface: str) -> "TrafficEngineeringBatchBuilder":
        return self.add_delete(self.m.get_interface_delete(iface))

    def set_interface_admin_group(self, iface: str, group: str) -> "TrafficEngineeringBatchBuilder":
        return self.add_set(self.m.get_interface_admin_group(iface, group))

    def delete_interface_admin_group(self, iface: str, group: str) -> "TrafficEngineeringBatchBuilder":
        return self.add_delete(self.m.get_interface_admin_group_delete(iface, group))

    def set_interface_max_bandwidth(self, iface: str, value: str) -> "TrafficEngineeringBatchBuilder":
        return self.add_set(self.m.get_interface_max_bandwidth(iface, value))

    def delete_interface_max_bandwidth(self, iface: str) -> "TrafficEngineeringBatchBuilder":
        return self.add_delete(self.m.get_interface_max_bandwidth_delete(iface))

    def set_interface_max_reservable_bandwidth(self, iface: str, value: str) -> "TrafficEngineeringBatchBuilder":
        return self.add_set(self.m.get_interface_max_reservable_bandwidth(iface, value))

    def delete_interface_max_reservable_bandwidth(self, iface: str) -> "TrafficEngineeringBatchBuilder":
        return self.add_delete(self.m.get_interface_max_reservable_bandwidth_delete(iface))

    def set_interface_metric(self, iface: str, value: str) -> "TrafficEngineeringBatchBuilder":
        return self.add_set(self.m.get_interface_metric(iface, value))

    def delete_interface_metric(self, iface: str) -> "TrafficEngineeringBatchBuilder":
        return self.add_delete(self.m.get_interface_metric_delete(iface))

    # ========================================================================
    # Delete entire Traffic Engineering config
    # ========================================================================

    def delete_traffic_engineering(self) -> "TrafficEngineeringBatchBuilder":
        return self.add_delete(self.m.get_te_delete())
