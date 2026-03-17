"""VyOS 1.5-specific VRF mapper overrides."""

from typing import List


class VrfMapperV1_5:
    """VyOS 1.5-specific path overrides for VRF protocols."""

    # ========================================================================
    # Static Routes: BFD multi-hop uses source-address (flat leaf)
    # ========================================================================

    def get_static_route_next_hop_bfd_multi_hop_source(
        self, name: str, destination: str, next_hop: str, source: str
    ) -> List[str]:
        """BFD multi-hop in 1.5 uses source-address as flat leaf."""
        return [
            "vrf", "name", name, "protocols", "static", "route", destination,
            "next-hop", next_hop, "bfd", "multi-hop", "source-address", source,
        ]

    def get_static_route_next_hop_bfd_multi_hop_source_delete(
        self, name: str, destination: str, next_hop: str
    ) -> List[str]:
        return [
            "vrf", "name", name, "protocols", "static", "route", destination,
            "next-hop", next_hop, "bfd", "multi-hop", "source-address",
        ]

    def get_static_route6_next_hop_bfd_multi_hop_source(
        self, name: str, destination: str, next_hop: str, source: str
    ) -> List[str]:
        return [
            "vrf", "name", name, "protocols", "static", "route6", destination,
            "next-hop", next_hop, "bfd", "multi-hop", "source-address", source,
        ]

    def get_static_route6_next_hop_bfd_multi_hop_source_delete(
        self, name: str, destination: str, next_hop: str
    ) -> List[str]:
        return [
            "vrf", "name", name, "protocols", "static", "route6", destination,
            "next-hop", next_hop, "bfd", "multi-hop", "source-address",
        ]

    # ========================================================================
    # Static Routes: IPv4 next-hop segments supported in 1.5
    # ========================================================================

    def get_static_route_next_hop_segments(
        self, name: str, destination: str, next_hop: str, segments: str
    ) -> List[str]:
        return [
            "vrf", "name", name, "protocols", "static", "route", destination,
            "next-hop", next_hop, "segments", segments,
        ]

    # ========================================================================
    # OSPF: retransmit-window and nhrp redistribute (1.5 only)
    # ========================================================================

    def get_ospf_interface_retransmit_window(
        self, name: str, iface: str, value: str
    ) -> List[str]:
        return [
            "vrf", "name", name, "protocols", "ospf", "interface", iface,
            "retransmit-window", value,
        ]

    def get_ospf_area_virtual_link_retransmit_window(
        self, name: str, area: str, address: str, value: str
    ) -> List[str]:
        return [
            "vrf", "name", name, "protocols", "ospf", "area", area,
            "virtual-link", address, "retransmit-window", value,
        ]

    def get_ospf_redistribute_nhrp(self, name: str) -> List[str]:
        return [
            "vrf", "name", name, "protocols", "ospf", "redistribute", "nhrp",
        ]

    def get_ospf_redistribute_nhrp_metric(self, name: str, value: str) -> List[str]:
        return [
            "vrf", "name", name, "protocols", "ospf", "redistribute", "nhrp",
            "metric", value,
        ]

    def get_ospf_redistribute_nhrp_metric_type(self, name: str, value: str) -> List[str]:
        return [
            "vrf", "name", name, "protocols", "ospf", "redistribute", "nhrp",
            "metric-type", value,
        ]

    def get_ospf_redistribute_nhrp_route_map(self, name: str, value: str) -> List[str]:
        return [
            "vrf", "name", name, "protocols", "ospf", "redistribute", "nhrp",
            "route-map", value,
        ]

    # ========================================================================
    # ISIS: fast-reroute, nhrp, srv6 locator, traffic-engineering export (1.5 only)
    # ========================================================================

    def get_isis_interface_fast_reroute_lfa(self, name: str, iface: str) -> List[str]:
        return [
            "vrf", "name", name, "protocols", "isis", "interface", iface,
            "fast-reroute", "lfa",
        ]

    def get_isis_interface_fast_reroute_lfa_priority_limit(
        self, name: str, iface: str, level: str, value: str
    ) -> List[str]:
        return [
            "vrf", "name", name, "protocols", "isis", "interface", iface,
            "fast-reroute", "lfa", level, "priority-limit", value,
        ]

    def get_isis_interface_fast_reroute_lfa_tiebreaker(
        self, name: str, iface: str, level: str, tiebreaker: str, index: str
    ) -> List[str]:
        return [
            "vrf", "name", name, "protocols", "isis", "interface", iface,
            "fast-reroute", "lfa", level, "tiebreaker", tiebreaker, "index", index,
        ]

    def get_isis_interface_fast_reroute_lfa_exclude_interface(
        self, name: str, iface: str, level: str, exclude_iface: str
    ) -> List[str]:
        return [
            "vrf", "name", name, "protocols", "isis", "interface", iface,
            "fast-reroute", "lfa", level, "exclude-interface", exclude_iface,
        ]

    def get_isis_interface_fast_reroute_remote_lfa_enable(
        self, name: str, iface: str, level: str
    ) -> List[str]:
        return [
            "vrf", "name", name, "protocols", "isis", "interface", iface,
            "fast-reroute", "remote-lfa", level, "enable",
        ]

    def get_isis_interface_fast_reroute_remote_lfa_maximum_metric(
        self, name: str, iface: str, level: str, value: str
    ) -> List[str]:
        return [
            "vrf", "name", name, "protocols", "isis", "interface", iface,
            "fast-reroute", "remote-lfa", level, "maximum-metric", value,
        ]

    def get_isis_interface_fast_reroute_ti_lfa_enable(
        self, name: str, iface: str, level: str
    ) -> List[str]:
        return [
            "vrf", "name", name, "protocols", "isis", "interface", iface,
            "fast-reroute", "ti-lfa", level, "enable",
        ]

    def get_isis_interface_fast_reroute_ti_lfa_node_protection(
        self, name: str, iface: str, level: str
    ) -> List[str]:
        return [
            "vrf", "name", name, "protocols", "isis", "interface", iface,
            "fast-reroute", "ti-lfa", level, "node-protection",
        ]

    def get_isis_redistribute_ipv4_nhrp(self, name: str, level: str) -> List[str]:
        return [
            "vrf", "name", name, "protocols", "isis", "redistribute",
            "ipv4", "nhrp", level,
        ]

    def get_isis_redistribute_ipv4_nhrp_metric(
        self, name: str, level: str, value: str
    ) -> List[str]:
        return [
            "vrf", "name", name, "protocols", "isis", "redistribute",
            "ipv4", "nhrp", level, "metric", value,
        ]

    def get_isis_redistribute_ipv4_nhrp_route_map(
        self, name: str, level: str, value: str
    ) -> List[str]:
        return [
            "vrf", "name", name, "protocols", "isis", "redistribute",
            "ipv4", "nhrp", level, "route-map", value,
        ]

    def get_isis_segment_routing_srv6_locator(self, name: str, value: str) -> List[str]:
        return [
            "vrf", "name", name, "protocols", "isis", "segment-routing",
            "srv6", "locator", value,
        ]

    def get_isis_traffic_engineering_export(self, name: str, value: str) -> List[str]:
        return [
            "vrf", "name", name, "protocols", "isis", "traffic-engineering",
            "export", value,
        ]

    # ========================================================================
    # BGP: nhrp redistribute, table redistribute ipv6, bmp local-rib, solo (1.5 only)
    # ========================================================================

    def get_bgp_af_redistribute_nhrp(self, name: str, af: str) -> List[str]:
        return [
            "vrf", "name", name, "protocols", "bgp", "address-family", af,
            "redistribute", "nhrp",
        ]

    def get_bgp_af_redistribute_nhrp_route_map(
        self, name: str, af: str, value: str
    ) -> List[str]:
        return [
            "vrf", "name", name, "protocols", "bgp", "address-family", af,
            "redistribute", "nhrp", "route-map", value,
        ]

    def get_bgp_af_redistribute_nhrp_metric(
        self, name: str, af: str, value: str
    ) -> List[str]:
        return [
            "vrf", "name", name, "protocols", "bgp", "address-family", af,
            "redistribute", "nhrp", "metric", value,
        ]

    def get_bgp_ipv6_unicast_redistribute_table(
        self, name: str, table: str
    ) -> List[str]:
        return [
            "vrf", "name", name, "protocols", "bgp", "address-family",
            "ipv6-unicast", "redistribute", "table", table,
        ]

    def get_bgp_ipv6_unicast_redistribute_table_route_map(
        self, name: str, table: str, value: str
    ) -> List[str]:
        return [
            "vrf", "name", name, "protocols", "bgp", "address-family",
            "ipv6-unicast", "redistribute", "table", table, "route-map", value,
        ]

    def get_bgp_ipv6_unicast_redistribute_table_metric(
        self, name: str, table: str, value: str
    ) -> List[str]:
        return [
            "vrf", "name", name, "protocols", "bgp", "address-family",
            "ipv6-unicast", "redistribute", "table", table, "metric", value,
        ]

    def get_bgp_bmp_target_local_rib(self, name: str, target: str) -> List[str]:
        return [
            "vrf", "name", name, "protocols", "bgp", "bmp", "target", target,
            "local-rib",
        ]

    def get_bgp_peer_group_solo(self, name: str, peer_group: str) -> List[str]:
        return [
            "vrf", "name", name, "protocols", "bgp", "peer-group", peer_group,
            "solo",
        ]
