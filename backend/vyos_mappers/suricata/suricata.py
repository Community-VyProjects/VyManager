"""Suricata command mapper.

``service suricata`` exists only on VyOS 1.5. This shared class is the 1.4
mapper: it has no path methods and reports no Suricata node. The paths live
on ``suricata_versions.v1_5.SuricataMapperV1_5``. The builder calls
``require_node`` before it reads a path, so 1.4 gets a ``ValueError``.
"""

from __future__ import annotations

from typing import Any, Dict, FrozenSet, List, Tuple

from ..base import BaseFeatureMapper

SURICATA_NODE = "service suricata"


class SuricataMapper(BaseFeatureMapper):
    # Version-only CLI node -> every path method under it (on the subclass).
    _VERSIONED_NODES: Dict[str, Tuple[str, ...]] = {
        SURICATA_NODE: (
            "get_suricata_delete",
            "get_interface",
            "get_interface_delete",
            "get_address_group",
            "get_address_group_delete",
            "get_address",
            "get_address_delete",
            "get_address_group_ref",
            "get_address_group_ref_delete",
            "get_port_group",
            "get_port_group_delete",
            "get_port",
            "get_port_delete",
            "get_port_group_ref",
            "get_port_group_ref_delete",
            "get_log_delete",
            "get_log_eve_filename",
            "get_log_eve_filetype",
            "get_log_eve_type",
            "get_log_eve_type_delete",
        ),
    }

    # ------------------------------------------------------------------
    # Version allowlist
    # ------------------------------------------------------------------

    def versioned_nodes(self) -> FrozenSet[str]:
        """Suricata nodes only some VyOS versions have.

        A node counts when every path method below it is on this mapper.
        Capabilities and the builder read this set instead of the version
        string.
        """
        return frozenset(
            node
            for node, methods in self._VERSIONED_NODES.items()
            if all(callable(getattr(self, method, None)) for method in methods)
        )

    def require_node(self, node: str) -> None:
        if node not in self.versioned_nodes():
            raise ValueError("Suricata is not supported on this device")

    # ------------------------------------------------------------------
    # Value lists
    # ------------------------------------------------------------------

    def eve_filetype_values(self) -> List[str]:
        """``log eve filetype`` values. The leaf does not exist on 1.4."""
        return []

    def eve_type_values(self) -> List[str]:
        """``log eve type`` values. The leaf does not exist on 1.4."""
        return []

    # ------------------------------------------------------------------
    # Config read
    # ------------------------------------------------------------------

    def parse_config(self, full_config: Dict[str, Any]) -> Dict[str, Any]:
        from .config_parse import parse_config as parse_suricata_config

        return parse_suricata_config(self, full_config)
