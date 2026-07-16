"""
IS-IS Mapper — VyOS 1.4 specific paths

VyOS 1.4 does NOT support:
  - TI-LFA (interface fast-reroute ti-lfa)
  - Remote LFA (interface fast-reroute remote-lfa)
  - SRv6 locator (segment-routing srv6)
  - Traffic Engineering export

All v1.5-only methods raise ValueError: silently dropping the operation
returned success while applying nothing (a false-positive the audit
flagged); the router surfaces the error as a 400.
"""

from typing import List

_V15_ONLY = "This IS-IS option requires VyOS 1.5+. Current device is running v1.4"


class IsisMapperV1_4:
    # TI-LFA — not supported
    def get_interface_ti_lfa_path(self, iface: str) -> List[str]:
        raise ValueError(_V15_ONLY)

    def get_interface_ti_lfa_level1_path(self, iface: str) -> List[str]:
        raise ValueError(_V15_ONLY)

    def get_interface_ti_lfa_level1_node_protection_path(self, iface: str) -> List[str]:
        raise ValueError(_V15_ONLY)

    def get_interface_ti_lfa_level1_link_fallback_path(self, iface: str) -> List[str]:
        raise ValueError(_V15_ONLY)

    def get_interface_ti_lfa_level2_path(self, iface: str) -> List[str]:
        raise ValueError(_V15_ONLY)

    def get_interface_ti_lfa_level2_node_protection_path(self, iface: str) -> List[str]:
        raise ValueError(_V15_ONLY)

    def get_interface_ti_lfa_level2_link_fallback_path(self, iface: str) -> List[str]:
        raise ValueError(_V15_ONLY)

    # Remote LFA — not supported
    def get_interface_remote_lfa_level1_path(self, iface: str) -> List[str]:
        raise ValueError(_V15_ONLY)

    def get_interface_remote_lfa_level1_max_metric_path(self, iface: str, val: str) -> List[str]:
        raise ValueError(_V15_ONLY)

    def get_interface_remote_lfa_level1_tunnel_mpls_ldp_path(self, iface: str) -> List[str]:
        raise ValueError(_V15_ONLY)

    def get_interface_remote_lfa_level2_path(self, iface: str) -> List[str]:
        raise ValueError(_V15_ONLY)

    def get_interface_remote_lfa_level2_max_metric_path(self, iface: str, val: str) -> List[str]:
        raise ValueError(_V15_ONLY)

    def get_interface_remote_lfa_level2_tunnel_mpls_ldp_path(self, iface: str) -> List[str]:
        raise ValueError(_V15_ONLY)

    # SRv6 — not supported
    def get_sr_srv6_locator_path(self, locator: str) -> List[str]:
        raise ValueError(_V15_ONLY)

    def get_sr_srv6_path(self) -> List[str]:
        raise ValueError(_V15_ONLY)

    # TE export — not supported
    def get_te_export_path(self) -> List[str]:
        raise ValueError(_V15_ONLY)
