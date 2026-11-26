"""Traffic Engineering command mapper.

``protocols traffic-engineering`` exists only on VyOS 1.5. This shared class
is the 1.4 mapper: it has no path methods and reports no Traffic Engineering
node. The paths live on
``traffic_engineering_versions.v1_5.TrafficEngineeringMapperV1_5``. The
builder calls ``require_node`` before it reads a path, so 1.4 gets a
``ValueError``.
"""

from __future__ import annotations

from typing import Any, Dict, FrozenSet, Tuple

from ..base import BaseFeatureMapper

TRAFFIC_ENGINEERING_NODE = "protocols traffic-engineering"


class TrafficEngineeringMapper(BaseFeatureMapper):
    # Version-only CLI node -> every path method under it (on the subclass).
    _VERSIONED_NODES: Dict[str, Tuple[str, ...]] = {
        TRAFFIC_ENGINEERING_NODE: (
            "get_te_delete",
            "get_admin_group",
            "get_admin_group_delete",
            "get_admin_group_bit_position",
            "get_admin_group_bit_position_delete",
            "get_interface",
            "get_interface_delete",
            "get_interface_admin_group",
            "get_interface_admin_group_delete",
            "get_interface_max_bandwidth",
            "get_interface_max_bandwidth_delete",
            "get_interface_max_reservable_bandwidth",
            "get_interface_max_reservable_bandwidth_delete",
            "get_interface_metric",
            "get_interface_metric_delete",
        ),
    }

    # ------------------------------------------------------------------
    # Version allowlist
    # ------------------------------------------------------------------

    def versioned_nodes(self) -> FrozenSet[str]:
        """Traffic Engineering nodes only some VyOS versions have.

        A node counts when every path method below it is on this mapper.
        Capabilities, the config route and the builder read this set instead
        of the version string.
        """
        return frozenset(
            node
            for node, methods in self._VERSIONED_NODES.items()
            if all(callable(getattr(self, method, None)) for method in methods)
        )

    def require_node(self, node: str) -> None:
        if node not in self.versioned_nodes():
            raise ValueError("Traffic Engineering is not supported on this device")

    # ------------------------------------------------------------------
    # Value ranges
    # ------------------------------------------------------------------

    def value_ranges(self) -> Dict[str, Dict[str, int]]:
        """Numeric leaf bounds. The leaves do not exist on 1.4."""
        return {}

    # ------------------------------------------------------------------
    # Config read
    # ------------------------------------------------------------------

    def parse_config(self, full_config: Dict[str, Any]) -> Dict[str, Any]:
        from .config_parse import parse_config as parse_traffic_engineering_config

        return parse_traffic_engineering_config(self, full_config)
