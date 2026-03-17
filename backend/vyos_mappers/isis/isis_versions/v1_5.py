"""
IS-IS Mapper — VyOS 1.5 specific paths

VyOS 1.5 adds:
  - TI-LFA (Topology Independent LFA) per interface
  - Remote LFA per interface
  - SRv6 locator
  - Traffic Engineering export
"""

from typing import List

BASE = ["protocols", "isis"]


class IsisMapperV1_5:
    # -----------------------------------------------------------------------
    # TI-LFA (Topology Independent LFA)
    # -----------------------------------------------------------------------

    def get_interface_ti_lfa_path(self, iface: str) -> List[str]:
        return BASE + ["interface", iface, "fast-reroute", "ti-lfa"]

    def get_interface_ti_lfa_level1_path(self, iface: str) -> List[str]:
        return BASE + ["interface", iface, "fast-reroute", "ti-lfa", "level-1"]

    def get_interface_ti_lfa_level1_node_protection_path(self, iface: str) -> List[str]:
        return BASE + ["interface", iface, "fast-reroute", "ti-lfa", "level-1", "node-protection"]

    def get_interface_ti_lfa_level1_link_fallback_path(self, iface: str) -> List[str]:
        return BASE + ["interface", iface, "fast-reroute", "ti-lfa", "level-1", "node-protection", "link-fallback"]

    def get_interface_ti_lfa_level2_path(self, iface: str) -> List[str]:
        return BASE + ["interface", iface, "fast-reroute", "ti-lfa", "level-2"]

    def get_interface_ti_lfa_level2_node_protection_path(self, iface: str) -> List[str]:
        return BASE + ["interface", iface, "fast-reroute", "ti-lfa", "level-2", "node-protection"]

    def get_interface_ti_lfa_level2_link_fallback_path(self, iface: str) -> List[str]:
        return BASE + ["interface", iface, "fast-reroute", "ti-lfa", "level-2", "node-protection", "link-fallback"]

    # -----------------------------------------------------------------------
    # Remote LFA
    # -----------------------------------------------------------------------

    def get_interface_remote_lfa_level1_path(self, iface: str) -> List[str]:
        return BASE + ["interface", iface, "fast-reroute", "remote-lfa", "level-1"]

    def get_interface_remote_lfa_level1_max_metric_path(self, iface: str, val: str) -> List[str]:
        return BASE + ["interface", iface, "fast-reroute", "remote-lfa", "level-1", "maximum-metric", val]

    def get_interface_remote_lfa_level1_tunnel_mpls_ldp_path(self, iface: str) -> List[str]:
        return BASE + ["interface", iface, "fast-reroute", "remote-lfa", "level-1", "tunnel", "mpls-ldp"]

    def get_interface_remote_lfa_level2_path(self, iface: str) -> List[str]:
        return BASE + ["interface", iface, "fast-reroute", "remote-lfa", "level-2"]

    def get_interface_remote_lfa_level2_max_metric_path(self, iface: str, val: str) -> List[str]:
        return BASE + ["interface", iface, "fast-reroute", "remote-lfa", "level-2", "maximum-metric", val]

    def get_interface_remote_lfa_level2_tunnel_mpls_ldp_path(self, iface: str) -> List[str]:
        return BASE + ["interface", iface, "fast-reroute", "remote-lfa", "level-2", "tunnel", "mpls-ldp"]

    # -----------------------------------------------------------------------
    # SRv6
    # -----------------------------------------------------------------------

    def get_sr_srv6_locator_path(self, locator: str) -> List[str]:
        return BASE + ["segment-routing", "srv6", "locator", locator]

    def get_sr_srv6_path(self) -> List[str]:
        return BASE + ["segment-routing", "srv6"]

    # -----------------------------------------------------------------------
    # Traffic Engineering — export (1.5 only)
    # -----------------------------------------------------------------------

    def get_te_export_path(self) -> List[str]:
        return BASE + ["traffic-engineering", "export"]
