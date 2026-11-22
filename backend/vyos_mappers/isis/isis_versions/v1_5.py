"""IS-IS leaves only the VyOS 1.5 template tree has."""

from typing import FrozenSet, List, Tuple

from ..isis import BASE, IsisMapper


class IsisMapperV1_5(IsisMapper):
    """VyOS 1.5 IS-IS leaves.

    Path methods do not re-check the node: the builder already called
    ``require_node``.
    """

    def redistribute_ipv4_protocols(self) -> FrozenSet[str]:
        return super().redistribute_ipv4_protocols() | {"nhrp"}

    def lsp_refresh_interval_range(self) -> Tuple[int, int]:
        return (2, 65235)

    def domain_password_modes(self) -> List[str]:
        return ["md5"] + super().domain_password_modes()

    def srv6_node_msd_types(self) -> List[str]:
        return ["max-end-d", "max-end-pop", "max-h-encaps", "max-segs-left"]

    def lsp_timer_checks(self) -> bool:
        return True

    # -----------------------------------------------------------------------
    # Interface fast-reroute
    #   interface <IFACE> fast-reroute lfa <level> enable|exclude interface <IFACE>
    #   interface <IFACE> fast-reroute remote-lfa <level> maximum-metric <val>|tunnel mpls-ldp
    #   interface <IFACE> fast-reroute ti-lfa <level> [node-protection [link-fallback]]
    # -----------------------------------------------------------------------

    def _fast_reroute(self, iface: str) -> List[str]:
        return self._interface(iface) + ["fast-reroute"]

    def get_interface_lfa_level1_path(self, iface: str) -> List[str]:
        return self._fast_reroute(iface) + ["lfa", "level-1", "enable"]

    def get_interface_lfa_level1_exclude_path(self, iface: str, excl_iface: str) -> List[str]:
        return self._fast_reroute(iface) + ["lfa", "level-1", "exclude", "interface", excl_iface]

    def get_interface_lfa_level2_path(self, iface: str) -> List[str]:
        return self._fast_reroute(iface) + ["lfa", "level-2", "enable"]

    def get_interface_lfa_level2_exclude_path(self, iface: str, excl_iface: str) -> List[str]:
        return self._fast_reroute(iface) + ["lfa", "level-2", "exclude", "interface", excl_iface]

    def get_interface_remote_lfa_level1_path(self, iface: str) -> List[str]:
        return self._fast_reroute(iface) + ["remote-lfa", "level-1"]

    def get_interface_remote_lfa_level1_max_metric_path(self, iface: str, val: str) -> List[str]:
        return self.get_interface_remote_lfa_level1_path(iface) + ["maximum-metric", val]

    def get_interface_remote_lfa_level1_max_metric_delete_path(self, iface: str) -> List[str]:
        return self.get_interface_remote_lfa_level1_path(iface) + ["maximum-metric"]

    def get_interface_remote_lfa_level1_tunnel_mpls_ldp_path(self, iface: str) -> List[str]:
        return self.get_interface_remote_lfa_level1_path(iface) + ["tunnel", "mpls-ldp"]

    def get_interface_remote_lfa_level2_path(self, iface: str) -> List[str]:
        return self._fast_reroute(iface) + ["remote-lfa", "level-2"]

    def get_interface_remote_lfa_level2_max_metric_path(self, iface: str, val: str) -> List[str]:
        return self.get_interface_remote_lfa_level2_path(iface) + ["maximum-metric", val]

    def get_interface_remote_lfa_level2_max_metric_delete_path(self, iface: str) -> List[str]:
        return self.get_interface_remote_lfa_level2_path(iface) + ["maximum-metric"]

    def get_interface_remote_lfa_level2_tunnel_mpls_ldp_path(self, iface: str) -> List[str]:
        return self.get_interface_remote_lfa_level2_path(iface) + ["tunnel", "mpls-ldp"]

    def get_interface_ti_lfa_path(self, iface: str) -> List[str]:
        return self._fast_reroute(iface) + ["ti-lfa"]

    def get_interface_ti_lfa_level1_path(self, iface: str) -> List[str]:
        return self.get_interface_ti_lfa_path(iface) + ["level-1"]

    def get_interface_ti_lfa_level1_node_protection_path(self, iface: str) -> List[str]:
        return self.get_interface_ti_lfa_level1_path(iface) + ["node-protection"]

    def get_interface_ti_lfa_level1_link_fallback_path(self, iface: str) -> List[str]:
        return self.get_interface_ti_lfa_level1_node_protection_path(iface) + ["link-fallback"]

    def get_interface_ti_lfa_level2_path(self, iface: str) -> List[str]:
        return self.get_interface_ti_lfa_path(iface) + ["level-2"]

    def get_interface_ti_lfa_level2_node_protection_path(self, iface: str) -> List[str]:
        return self.get_interface_ti_lfa_level2_path(iface) + ["node-protection"]

    def get_interface_ti_lfa_level2_link_fallback_path(self, iface: str) -> List[str]:
        return self.get_interface_ti_lfa_level2_node_protection_path(iface) + ["link-fallback"]

    # -----------------------------------------------------------------------
    # Segment routing srv6
    #   segment-routing srv6 interface <IFACE>
    #   segment-routing srv6 locator <LOCATOR>
    #   segment-routing srv6 node-msd <max-end-d|max-end-pop|max-h-encaps|max-segs-left> <val>
    # -----------------------------------------------------------------------

    def get_sr_srv6_path(self) -> List[str]:
        return BASE + ["segment-routing", "srv6"]

    def get_sr_srv6_locator_path(self, locator: str) -> List[str]:
        return self.get_sr_srv6_path() + ["locator", locator]

    def get_sr_srv6_locator_delete_path(self) -> List[str]:
        return self.get_sr_srv6_path() + ["locator"]

    def get_sr_srv6_interface_path(self, iface: str) -> List[str]:
        return self.get_sr_srv6_path() + ["interface", iface]

    def get_sr_srv6_interface_delete_path(self) -> List[str]:
        return self.get_sr_srv6_path() + ["interface"]

    def get_sr_srv6_node_msd_path(self, msd_type: str, val: str) -> List[str]:
        return self.get_sr_srv6_node_msd_delete_path(msd_type) + [val]

    def get_sr_srv6_node_msd_delete_path(self, msd_type: str) -> List[str]:
        self._require_choice("node-msd", msd_type, self.srv6_node_msd_types())
        return self.get_sr_srv6_path() + ["node-msd", msd_type]

    # -----------------------------------------------------------------------
    # Traffic engineering export
    # -----------------------------------------------------------------------

    def get_te_export_path(self) -> List[str]:
        return self.get_te_path() + ["export"]
