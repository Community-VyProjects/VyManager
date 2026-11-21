"""
VRF Command Mapper

Handles command path generation for VRF (Virtual Routing and Forwarding) configuration.
Trees only one version has are listed on that version's subclass in
``vrf_versions``.
"""

from typing import Any, Dict, FrozenSet, List
from ..base import BaseFeatureMapper


class VrfMapper(BaseFeatureMapper):
    """Base mapper with common operations shared between VyOS 1.4 and 1.5."""

    # Global feature trees the VRF builder reuses under ``vrf name <vrf>``
    # through the global feature builders, as the CLI path below the VRF.
    # Both labs have these. A version subclass adds the trees only its lab
    # has.
    FEATURE_NODES: FrozenSet[str] = frozenset({"protocols static"})

    # ========================================================================
    # Core
    # ========================================================================

    def feature_nodes(self) -> FrozenSet[str]:
        """Global feature trees under ``vrf name <vrf>`` this device has.

        Capabilities and the builder read this set instead of the version
        string.
        """
        return self.FEATURE_NODES

    def require_feature(self, node: str) -> None:
        if node not in self.feature_nodes():
            raise ValueError(f"vrf {node} is not supported on this device")

    def parse_config(self, full_config: Any) -> Dict[str, Any]:
        from .config_parse import parse_config as parse_vrf_config

        return parse_vrf_config(self, full_config)

    # ========================================================================
    # Global VRF Paths
    # ========================================================================

    def get_bind_to_all(self) -> List[str]:
        return ["vrf", "bind-to-all"]

    # ========================================================================
    # VRF Instance Paths
    # ========================================================================

    def get_vrf_path(self, name: str) -> List[str]:
        return ["vrf", "name", name]

    def get_vrf_description(self, name: str, value: str) -> List[str]:
        return ["vrf", "name", name, "description", value]

    def get_vrf_disable(self, name: str) -> List[str]:
        return ["vrf", "name", name, "disable"]

    def get_vrf_table(self, name: str, value: str) -> List[str]:
        return ["vrf", "name", name, "table", value]

    def get_vrf_vni(self, name: str, value: str) -> List[str]:
        return ["vrf", "name", name, "vni", value]

    # ========================================================================
    # IP Settings
    # ========================================================================

    def get_vrf_ip_disable_forwarding(self, name: str) -> List[str]:
        return ["vrf", "name", name, "ip", "disable-forwarding"]

    def get_vrf_ip_nht_no_resolve_via_default(self, name: str) -> List[str]:
        return ["vrf", "name", name, "ip", "nht", "no-resolve-via-default"]

    def get_vrf_ip_protocol_route_map(self, name: str, protocol: str, route_map: str) -> List[str]:
        return ["vrf", "name", name, "ip", "protocol", protocol, "route-map", route_map]

    # ========================================================================
    # IPv6 Settings
    # ========================================================================

    def get_vrf_ipv6_disable_forwarding(self, name: str) -> List[str]:
        return ["vrf", "name", name, "ipv6", "disable-forwarding"]

    def get_vrf_ipv6_nht_no_resolve_via_default(self, name: str) -> List[str]:
        return ["vrf", "name", name, "ipv6", "nht", "no-resolve-via-default"]

    def get_vrf_ipv6_protocol_route_map(self, name: str, protocol: str, route_map: str) -> List[str]:
        return ["vrf", "name", name, "ipv6", "protocol", protocol, "route-map", route_map]
