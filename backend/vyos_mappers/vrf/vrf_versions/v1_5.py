"""VRF trees and leaves only the VyOS 1.5 template tree has."""

from typing import FrozenSet, List

from ..vrf import VrfMapper
from ..vrf_isis import VrfIsisMapper


class VrfMapperV1_5(VrfMapper):
    """VyOS 1.5 adds failover, RPKI and the DHCP servers under ``vrf name <vrf>``."""

    def versioned_nodes(self) -> FrozenSet[str]:
        return frozenset(self._VERSIONED_FEATURES.values())


class VrfIsisMapperV1_5(VrfIsisMapper):
    """VyOS 1.5 VRF IS-IS leaves.

    Path methods do not re-check the node: VRF dispatch already called
    ``require_node``.
    """

    def redistribute_ipv4_protocols(self) -> FrozenSet[str]:
        return super().redistribute_ipv4_protocols() | {"nhrp"}

    # ========================================================================
    # Interface Fast Reroute
    #   interface <IFACE> fast-reroute lfa <level> enable|exclude interface <IFACE>
    #   interface <IFACE> fast-reroute remote-lfa <level> maximum-metric <val>|tunnel mpls-ldp
    #   interface <IFACE> fast-reroute ti-lfa <level> [node-protection [link-fallback]]
    # ========================================================================

    def _iface_fr(self, name: str, iface: str) -> List[str]:
        return self._base(name) + ["interface", iface, "fast-reroute"]

    def get_isis_interface_fr_lfa_level_enable(self, name: str, iface: str, level: str) -> List[str]:
        return self._iface_fr(name, iface) + ["lfa", level, "enable"]

    def get_isis_interface_fr_lfa_level_exclude_interface(self, name: str, iface: str, level: str, exclude: str) -> List[str]:
        return self._iface_fr(name, iface) + ["lfa", level, "exclude", "interface", exclude]

    def get_isis_interface_fr_remote_lfa_level_maximum_metric(self, name: str, iface: str, level: str, value: str) -> List[str]:
        return self._iface_fr(name, iface) + ["remote-lfa", level, "maximum-metric", value]

    def get_isis_interface_fr_remote_lfa_level_tunnel_mpls_ldp(self, name: str, iface: str, level: str) -> List[str]:
        return self._iface_fr(name, iface) + ["remote-lfa", level, "tunnel", "mpls-ldp"]

    def get_isis_interface_fr_ti_lfa_level(self, name: str, iface: str, level: str) -> List[str]:
        return self._iface_fr(name, iface) + ["ti-lfa", level]

    def get_isis_interface_fr_ti_lfa_level_node_protection(self, name: str, iface: str, level: str) -> List[str]:
        return self._iface_fr(name, iface) + ["ti-lfa", level, "node-protection"]

    def get_isis_interface_fr_ti_lfa_level_node_protection_link_fallback(self, name: str, iface: str, level: str) -> List[str]:
        return self._iface_fr(name, iface) + ["ti-lfa", level, "node-protection", "link-fallback"]

    # ========================================================================
    # Segment Routing SRv6
    #   segment-routing srv6 interface <IFACE>
    #   segment-routing srv6 locator <LOCATOR>
    #   segment-routing srv6 node-msd <max-end-d|max-end-pop|max-h-encaps|max-segs-left> <val>
    # ========================================================================

    def get_isis_segment_routing_srv6_interface(self, name: str, value: str) -> List[str]:
        return self._base(name) + ["segment-routing", "srv6", "interface", value]

    def get_isis_segment_routing_srv6_locator(self, name: str, value: str) -> List[str]:
        return self._base(name) + ["segment-routing", "srv6", "locator", value]

    def get_isis_segment_routing_srv6_node_msd(self, name: str, msd_type: str, value: str) -> List[str]:
        return self._base(name) + ["segment-routing", "srv6", "node-msd", msd_type, value]

    # ========================================================================
    # Traffic Engineering export
    # ========================================================================

    def get_isis_traffic_engineering_export(self, name: str) -> List[str]:
        return self._base(name) + ["traffic-engineering", "export"]
