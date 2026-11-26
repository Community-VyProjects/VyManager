"""Traffic Engineering batch builder.

Assembles set/delete ops under ``protocols traffic-engineering``. The node
exists only on VyOS 1.5: every op calls ``require_node`` on the mapper first,
so 1.4 raises ``ValueError``. Two-argument ops encode their args as
``arg1,arg2``.
"""

from typing import Any, Dict, List, cast

from vyos_builders.base import BatchBuilder
from vyos_mappers import CommandMapperRegistry
from vyos_mappers.traffic_engineering.traffic_engineering import (
    TRAFFIC_ENGINEERING_NODE,
    TrafficEngineeringMapper,
)

TE = TRAFFIC_ENGINEERING_NODE


class TrafficEngineeringBatchBuilder(BatchBuilder):
    def __init__(self, version: str):
        super().__init__(version)
        self.m = cast(
            TrafficEngineeringMapper,
            CommandMapperRegistry.get_mapper("traffic_engineering", version),
        )

    def _versioned_path(self, node: str, method: str, *args: Any) -> List[str]:
        """Path for a node only one VyOS version has; ValueError elsewhere."""
        self.m.require_node(node)
        return getattr(self.m, method)(*args)

    # -----------------------------------------------------------------------
    # Capabilities
    # -----------------------------------------------------------------------

    def get_capabilities(self) -> Dict[str, Any]:
        """Feature flags and value bounds, read from the mapper."""
        supported = TE in self.m.versioned_nodes()
        return {
            "version": self.version,
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
            # Lab val_help bounds; empty where the node does not exist.
            "ranges": self.m.value_ranges(),
        }

    # -----------------------------------------------------------------------
    # Whole tree
    # -----------------------------------------------------------------------

    def delete_traffic_engineering(self) -> "TrafficEngineeringBatchBuilder":
        """Delete ``protocols traffic-engineering``."""
        return self.add_delete(self._versioned_path(TE, "get_te_delete"))

    # -----------------------------------------------------------------------
    # Admin groups
    # -----------------------------------------------------------------------

    def set_admin_group(self, name: str) -> "TrafficEngineeringBatchBuilder":
        return self.add_set(self._versioned_path(TE, "get_admin_group", name))

    def delete_admin_group(self, name: str) -> "TrafficEngineeringBatchBuilder":
        return self.add_delete(self._versioned_path(TE, "get_admin_group_delete", name))

    def set_admin_group_bit_position(self, name: str, bit: str) -> "TrafficEngineeringBatchBuilder":
        return self.add_set(self._versioned_path(TE, "get_admin_group_bit_position", name, bit))

    def delete_admin_group_bit_position(self, name: str) -> "TrafficEngineeringBatchBuilder":
        """The lab requires bit-position on every group; a group delete removes it."""
        return self.add_delete(
            self._versioned_path(TE, "get_admin_group_bit_position_delete", name)
        )

    # -----------------------------------------------------------------------
    # Interfaces
    # -----------------------------------------------------------------------

    def set_interface(self, iface: str) -> "TrafficEngineeringBatchBuilder":
        return self.add_set(self._versioned_path(TE, "get_interface", iface))

    def delete_interface(self, iface: str) -> "TrafficEngineeringBatchBuilder":
        return self.add_delete(self._versioned_path(TE, "get_interface_delete", iface))

    def set_interface_admin_group(self, iface: str, group: str) -> "TrafficEngineeringBatchBuilder":
        return self.add_set(self._versioned_path(TE, "get_interface_admin_group", iface, group))

    def delete_interface_admin_group(self, iface: str, group: str) -> "TrafficEngineeringBatchBuilder":
        return self.add_delete(
            self._versioned_path(TE, "get_interface_admin_group_delete", iface, group)
        )

    def set_interface_max_bandwidth(self, iface: str, value: str) -> "TrafficEngineeringBatchBuilder":
        return self.add_set(self._versioned_path(TE, "get_interface_max_bandwidth", iface, value))

    def delete_interface_max_bandwidth(self, iface: str) -> "TrafficEngineeringBatchBuilder":
        return self.add_delete(
            self._versioned_path(TE, "get_interface_max_bandwidth_delete", iface)
        )

    def set_interface_max_reservable_bandwidth(
        self, iface: str, value: str
    ) -> "TrafficEngineeringBatchBuilder":
        return self.add_set(
            self._versioned_path(TE, "get_interface_max_reservable_bandwidth", iface, value)
        )

    def delete_interface_max_reservable_bandwidth(self, iface: str) -> "TrafficEngineeringBatchBuilder":
        return self.add_delete(
            self._versioned_path(TE, "get_interface_max_reservable_bandwidth_delete", iface)
        )

    def set_interface_metric(self, iface: str, value: str) -> "TrafficEngineeringBatchBuilder":
        return self.add_set(self._versioned_path(TE, "get_interface_metric", iface, value))

    def delete_interface_metric(self, iface: str) -> "TrafficEngineeringBatchBuilder":
        return self.add_delete(self._versioned_path(TE, "get_interface_metric_delete", iface))
