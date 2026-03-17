"""
IS-IS Mapper — VyOS 1.4 specific paths

VyOS 1.4 does NOT support:
  - TI-LFA (interface fast-reroute ti-lfa)
  - Remote LFA (interface fast-reroute remote-lfa)
  - SRv6 locator (segment-routing srv6)
  - Traffic Engineering export

All v1.5-only methods return [] so builder.add_set([]) becomes a no-op.
"""

from typing import List


class IsisMapperV1_4:
    # TI-LFA — not supported
    def get_interface_ti_lfa_path(self, iface: str) -> List[str]:
        return []

    def get_interface_ti_lfa_level1_path(self, iface: str) -> List[str]:
        return []

    def get_interface_ti_lfa_level1_node_protection_path(self, iface: str) -> List[str]:
        return []

    def get_interface_ti_lfa_level1_link_fallback_path(self, iface: str) -> List[str]:
        return []

    def get_interface_ti_lfa_level2_path(self, iface: str) -> List[str]:
        return []

    def get_interface_ti_lfa_level2_node_protection_path(self, iface: str) -> List[str]:
        return []

    def get_interface_ti_lfa_level2_link_fallback_path(self, iface: str) -> List[str]:
        return []

    # Remote LFA — not supported
    def get_interface_remote_lfa_level1_path(self, iface: str) -> List[str]:
        return []

    def get_interface_remote_lfa_level1_max_metric_path(self, iface: str, val: str) -> List[str]:
        return []

    def get_interface_remote_lfa_level1_tunnel_mpls_ldp_path(self, iface: str) -> List[str]:
        return []

    def get_interface_remote_lfa_level2_path(self, iface: str) -> List[str]:
        return []

    def get_interface_remote_lfa_level2_max_metric_path(self, iface: str, val: str) -> List[str]:
        return []

    def get_interface_remote_lfa_level2_tunnel_mpls_ldp_path(self, iface: str) -> List[str]:
        return []

    # SRv6 — not supported
    def get_sr_srv6_locator_path(self, locator: str) -> List[str]:
        return []

    def get_sr_srv6_path(self) -> List[str]:
        return []

    # TE export — not supported
    def get_te_export_path(self) -> List[str]:
        return []
