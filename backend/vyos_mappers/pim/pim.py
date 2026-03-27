"""
PIM Command Mapper

Handles command path generation for protocols pim configuration.
PIM has no version differences between VyOS 1.4 and 1.5.

Config tree:
  protocols pim/
    ecmp
    ecmp rebalance
    igmp/
      watermark-warning  (1-65535)
    interface/<IFACE>/
      bfd
      bfd profile        (txt)
      dr-priority        (1-4294967295)
      hello              (1-180)
      igmp/
        disable
        join/<GROUP>/
          source-address (multi, ipv4)
        query-interval           (1-1800)
        query-max-response-time  (10-250)
        version                  (2|3)
      no-bsm
      no-unicast-bsm
      passive
      source-address     (ipv4)
    join-prune-interval  (1-65535)
    keep-alive-timer     (1-65535)
    no-v6-secondary
    packets              (1-255)
    register-accept-list/
      prefix-list        (txt)
    register-suppress-time (1-65535)
    rp/
      address/<IP>/
        group            (multi, ipv4net)
      keep-alive-timer   (1-65535)
    spt-switchover/
      infinity-and-beyond
      infinity-and-beyond prefix-list (txt)
    ssm/
      prefix-list        (txt)
"""

from typing import List
from ..base import BaseFeatureMapper


class PimMapper(BaseFeatureMapper):
    """Mapper for PIM commands. Identical on VyOS 1.4 and 1.5."""

    def __init__(self, version: str):
        super().__init__(version)

    def _base(self) -> List[str]:
        return ["protocols", "pim"]

    # ========================================================================
    # Global Paths
    # ========================================================================

    def get_pim_path(self) -> List[str]:
        return self._base()

    def get_ecmp(self) -> List[str]:
        return self._base() + ["ecmp"]

    def get_ecmp_rebalance(self) -> List[str]:
        return self._base() + ["ecmp", "rebalance"]

    def get_join_prune_interval(self, value: str) -> List[str]:
        return self._base() + ["join-prune-interval", value]

    def get_join_prune_interval_delete(self) -> List[str]:
        return self._base() + ["join-prune-interval"]

    def get_keep_alive_timer(self, value: str) -> List[str]:
        return self._base() + ["keep-alive-timer", value]

    def get_keep_alive_timer_delete(self) -> List[str]:
        return self._base() + ["keep-alive-timer"]

    def get_no_v6_secondary(self) -> List[str]:
        return self._base() + ["no-v6-secondary"]

    def get_packets(self, value: str) -> List[str]:
        return self._base() + ["packets", value]

    def get_packets_delete(self) -> List[str]:
        return self._base() + ["packets"]

    def get_register_suppress_time(self, value: str) -> List[str]:
        return self._base() + ["register-suppress-time", value]

    def get_register_suppress_time_delete(self) -> List[str]:
        return self._base() + ["register-suppress-time"]

    # ========================================================================
    # IGMP Global Paths
    # ========================================================================

    def get_igmp_watermark_warning(self, value: str) -> List[str]:
        return self._base() + ["igmp", "watermark-warning", value]

    def get_igmp_watermark_warning_delete(self) -> List[str]:
        return self._base() + ["igmp", "watermark-warning"]

    # ========================================================================
    # Register Accept List Paths
    # ========================================================================

    def get_register_accept_list(self) -> List[str]:
        return self._base() + ["register-accept-list"]

    def get_register_accept_list_prefix_list(self, value: str) -> List[str]:
        return self._base() + ["register-accept-list", "prefix-list", value]

    def get_register_accept_list_prefix_list_delete(self) -> List[str]:
        return self._base() + ["register-accept-list", "prefix-list"]

    # ========================================================================
    # RP (Rendezvous Point) Paths
    # ========================================================================

    def get_rp_address(self, address: str) -> List[str]:
        return self._base() + ["rp", "address", address]

    def get_rp_address_delete(self, address: str) -> List[str]:
        return self._base() + ["rp", "address", address]

    def get_rp_address_group(self, address: str, group: str) -> List[str]:
        return self._base() + ["rp", "address", address, "group", group]

    def get_rp_address_group_delete(self, address: str, group: str) -> List[str]:
        return self._base() + ["rp", "address", address, "group", group]

    def get_rp_keep_alive_timer(self, value: str) -> List[str]:
        return self._base() + ["rp", "keep-alive-timer", value]

    def get_rp_keep_alive_timer_delete(self) -> List[str]:
        return self._base() + ["rp", "keep-alive-timer"]

    # ========================================================================
    # SPT Switchover Paths
    # ========================================================================

    def get_spt_switchover_infinity(self) -> List[str]:
        return self._base() + ["spt-switchover", "infinity-and-beyond"]

    def get_spt_switchover_infinity_prefix_list(self, value: str) -> List[str]:
        return self._base() + ["spt-switchover", "infinity-and-beyond", "prefix-list", value]

    def get_spt_switchover_infinity_prefix_list_delete(self) -> List[str]:
        return self._base() + ["spt-switchover", "infinity-and-beyond", "prefix-list"]

    def get_spt_switchover_delete(self) -> List[str]:
        return self._base() + ["spt-switchover"]

    # ========================================================================
    # SSM Paths
    # ========================================================================

    def get_ssm_prefix_list(self, value: str) -> List[str]:
        return self._base() + ["ssm", "prefix-list", value]

    def get_ssm_prefix_list_delete(self) -> List[str]:
        return self._base() + ["ssm", "prefix-list"]

    # ========================================================================
    # Interface Paths
    # ========================================================================

    def get_interface(self, iface: str) -> List[str]:
        return self._base() + ["interface", iface]

    def get_interface_bfd(self, iface: str) -> List[str]:
        return self._base() + ["interface", iface, "bfd"]

    def get_interface_bfd_profile(self, iface: str, value: str) -> List[str]:
        return self._base() + ["interface", iface, "bfd", "profile", value]

    def get_interface_bfd_profile_delete(self, iface: str) -> List[str]:
        return self._base() + ["interface", iface, "bfd", "profile"]

    def get_interface_dr_priority(self, iface: str, value: str) -> List[str]:
        return self._base() + ["interface", iface, "dr-priority", value]

    def get_interface_dr_priority_delete(self, iface: str) -> List[str]:
        return self._base() + ["interface", iface, "dr-priority"]

    def get_interface_hello(self, iface: str, value: str) -> List[str]:
        return self._base() + ["interface", iface, "hello", value]

    def get_interface_hello_delete(self, iface: str) -> List[str]:
        return self._base() + ["interface", iface, "hello"]

    def get_interface_no_bsm(self, iface: str) -> List[str]:
        return self._base() + ["interface", iface, "no-bsm"]

    def get_interface_no_unicast_bsm(self, iface: str) -> List[str]:
        return self._base() + ["interface", iface, "no-unicast-bsm"]

    def get_interface_passive(self, iface: str) -> List[str]:
        return self._base() + ["interface", iface, "passive"]

    def get_interface_source_address(self, iface: str, value: str) -> List[str]:
        return self._base() + ["interface", iface, "source-address", value]

    def get_interface_source_address_delete(self, iface: str) -> List[str]:
        return self._base() + ["interface", iface, "source-address"]

    # ========================================================================
    # Interface IGMP Paths
    # ========================================================================

    def get_interface_igmp(self, iface: str) -> List[str]:
        return self._base() + ["interface", iface, "igmp"]

    def get_interface_igmp_disable(self, iface: str) -> List[str]:
        return self._base() + ["interface", iface, "igmp", "disable"]

    def get_interface_igmp_join(self, iface: str, group: str) -> List[str]:
        return self._base() + ["interface", iface, "igmp", "join", group]

    def get_interface_igmp_join_source(self, iface: str, group: str, source: str) -> List[str]:
        return self._base() + ["interface", iface, "igmp", "join", group, "source-address", source]

    def get_interface_igmp_join_source_delete(self, iface: str, group: str, source: str) -> List[str]:
        return self._base() + ["interface", iface, "igmp", "join", group, "source-address", source]

    def get_interface_igmp_query_interval(self, iface: str, value: str) -> List[str]:
        return self._base() + ["interface", iface, "igmp", "query-interval", value]

    def get_interface_igmp_query_interval_delete(self, iface: str) -> List[str]:
        return self._base() + ["interface", iface, "igmp", "query-interval"]

    def get_interface_igmp_query_max_response_time(self, iface: str, value: str) -> List[str]:
        return self._base() + ["interface", iface, "igmp", "query-max-response-time", value]

    def get_interface_igmp_query_max_response_time_delete(self, iface: str) -> List[str]:
        return self._base() + ["interface", iface, "igmp", "query-max-response-time"]

    def get_interface_igmp_version(self, iface: str, value: str) -> List[str]:
        return self._base() + ["interface", iface, "igmp", "version", value]

    def get_interface_igmp_version_delete(self, iface: str) -> List[str]:
        return self._base() + ["interface", iface, "igmp", "version"]
