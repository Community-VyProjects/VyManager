"""
VRF Command Mapper

Handles command path generation for VRF (Virtual Routing and Forwarding) configuration.
The shared class names the trees only one version has; that version's
subclass in ``vrf_versions`` turns them on.
"""

from typing import Any, Dict, FrozenSet, List
from ..base import BaseFeatureMapper


class VrfMapper(BaseFeatureMapper):
    """Base mapper with common operations shared between VyOS 1.4 and 1.5."""

    # Feature trees below ``vrf name <vrf>`` only one version has, keyed by
    # the VRF builder's feature key. A tree not listed here (static, and the
    # other routing protocols) is on both labs.
    _VERSIONED_FEATURES: Dict[str, str] = {
        "failover": "protocols failover",
        "rpki": "protocols rpki",
        "dhcp": "service dhcp-server",
        "dhcpv6": "service dhcpv6-server",
    }

    # ========================================================================
    # Core
    # ========================================================================

    def versioned_nodes(self) -> FrozenSet[str]:
        """Version-only trees below ``vrf name <vrf>`` this device has.

        The version subclass lists its trees. Capabilities and the builder
        read this set instead of the version string.
        """
        return frozenset()

    def supports_feature(self, feature: str) -> bool:
        """Whether this device has the VRF tree of builder key ``feature``."""
        node = self._VERSIONED_FEATURES.get(feature)
        return node is None or node in self.versioned_nodes()

    def require_feature(self, feature: str) -> None:
        if not self.supports_feature(feature):
            node = self._VERSIONED_FEATURES[feature]
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
