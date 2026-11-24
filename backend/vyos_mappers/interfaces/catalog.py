"""Op-mode show commands behind the interface pickers, counters and diagnostics.

Commands both lab op trees have live on this class. A command only one
version has lives on that version's subclass in ``catalog_versions``.
"""
from typing import Dict, FrozenSet, List

from ..base import BaseFeatureMapper


class InterfaceCatalogMapper(BaseFeatureMapper):
    """Shared mapper for ``show interfaces ...`` on every VyOS version."""

    # Op paths only one version has, keyed by the path below
    # ``show interfaces``, mapped to the path method the version subclass
    # defines for that command.
    _VERSIONED_NODES: Dict[str, str] = {
        "kernel json": "get_kernel_json_show_path",
    }

    # ==================== Core ====================

    def versioned_nodes(self) -> FrozenSet[str]:
        """Version-only commands this device has.

        Each one is a path method on the version subclass. The router reads
        this set instead of the version string.
        """
        return frozenset(
            node
            for node, method in self._VERSIONED_NODES.items()
            if callable(getattr(self, method, None))
        )

    def versioned_path(self, node: str) -> List[str]:
        """Op path of a version-only command; ``ValueError`` when absent."""
        if node not in self.versioned_nodes():
            raise ValueError(f"show interfaces {node} is not supported on this device")
        return getattr(self, self._VERSIONED_NODES[node])()

    # ==================== Shared commands ====================

    def get_counters_show_path(self) -> List[str]:
        """Op path of ``show interfaces counters``."""
        return ["interfaces", "counters"]

    def get_ethernet_show_path(self) -> List[str]:
        """Op path of ``show interfaces ethernet``."""
        return ["interfaces", "ethernet"]

    def get_ethernet_transceiver_show_path(self, interface: str) -> List[str]:
        """Op path of ``show interfaces ethernet <interface> transceiver``."""
        return ["interfaces", "ethernet", interface, "transceiver"]
