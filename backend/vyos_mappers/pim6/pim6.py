"""
PIMv6 Command Mapper

Handles command path generation for `protocols pim6` configuration.
PIMv6 has no version differences between VyOS 1.4 and 1.5.

Config tree:
  protocols pim6/
    interface/<IFACE>/
      dr-priority        (1-4294967295)
      hello              (1-180)
      mld/
        disable
        interval                     (1-65535)
        join/<GROUP (ipv6)>/
          source                     (multi, ipv6)
        last-member-query-count      (1-255)
        last-member-query-interval   (100-6553500 ms)
        max-response-time            (100-6553500 ms)
        version                      (1|2, default 2)
      no-bsm
      no-unicast-bsm
      passive
    join-prune-interval  (1-65535)
    keep-alive-timer     (1-65535)
    packets              (1-255)
    register-suppress-time (1-65535)
    rp/
      address/<ADDR (ipv6)>/
        group            (multi, ipv6net)
        prefix-list6     (single, txt)
      keep-alive-timer   (1-65535)
"""

from typing import List
from ..base import BaseFeatureMapper


class Pim6Mapper(BaseFeatureMapper):
    """Mapper for PIMv6 commands. Identical on VyOS 1.4 and 1.5."""

    def __init__(self, version: str):
        super().__init__(version)

    def _base(self) -> List[str]:
        return ["protocols", "pim6"]

    # ========================================================================
    # Global Paths
    # ========================================================================

    def get_pim6_path(self) -> List[str]:
        return self._base()

    def get_join_prune_interval(self, value: str) -> List[str]:
        return self._base() + ["join-prune-interval", value]

    def get_join_prune_interval_delete(self) -> List[str]:
        return self._base() + ["join-prune-interval"]

    def get_keep_alive_timer(self, value: str) -> List[str]:
        return self._base() + ["keep-alive-timer", value]

    def get_keep_alive_timer_delete(self) -> List[str]:
        return self._base() + ["keep-alive-timer"]

    def get_packets(self, value: str) -> List[str]:
        return self._base() + ["packets", value]

    def get_packets_delete(self) -> List[str]:
        return self._base() + ["packets"]

    def get_register_suppress_time(self, value: str) -> List[str]:
        return self._base() + ["register-suppress-time", value]

    def get_register_suppress_time_delete(self) -> List[str]:
        return self._base() + ["register-suppress-time"]

    # ========================================================================
    # RP (Rendezvous Point) Paths
    # ========================================================================

    def get_rp(self) -> List[str]:
        return self._base() + ["rp"]

    def get_rp_address(self, address: str) -> List[str]:
        return self._base() + ["rp", "address", address]

    def get_rp_address_delete(self, address: str) -> List[str]:
        return self._base() + ["rp", "address", address]

    def get_rp_address_group(self, address: str, group: str) -> List[str]:
        return self._base() + ["rp", "address", address, "group", group]

    def get_rp_address_group_delete(self, address: str, group: str) -> List[str]:
        return self._base() + ["rp", "address", address, "group", group]

    def get_rp_address_prefix_list6(self, address: str, value: str) -> List[str]:
        return self._base() + ["rp", "address", address, "prefix-list6", value]

    def get_rp_address_prefix_list6_delete(self, address: str) -> List[str]:
        return self._base() + ["rp", "address", address, "prefix-list6"]

    def get_rp_keep_alive_timer(self, value: str) -> List[str]:
        return self._base() + ["rp", "keep-alive-timer", value]

    def get_rp_keep_alive_timer_delete(self) -> List[str]:
        return self._base() + ["rp", "keep-alive-timer"]

    # ========================================================================
    # Interface Paths
    # ========================================================================

    def get_interface(self, iface: str) -> List[str]:
        return self._base() + ["interface", iface]

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

    # ========================================================================
    # Interface MLD Paths
    # ========================================================================

    def get_interface_mld(self, iface: str) -> List[str]:
        return self._base() + ["interface", iface, "mld"]

    def get_interface_mld_disable(self, iface: str) -> List[str]:
        return self._base() + ["interface", iface, "mld", "disable"]

    def get_interface_mld_interval(self, iface: str, value: str) -> List[str]:
        return self._base() + ["interface", iface, "mld", "interval", value]

    def get_interface_mld_interval_delete(self, iface: str) -> List[str]:
        return self._base() + ["interface", iface, "mld", "interval"]

    def get_interface_mld_last_member_query_count(self, iface: str, value: str) -> List[str]:
        return self._base() + ["interface", iface, "mld", "last-member-query-count", value]

    def get_interface_mld_last_member_query_count_delete(self, iface: str) -> List[str]:
        return self._base() + ["interface", iface, "mld", "last-member-query-count"]

    def get_interface_mld_last_member_query_interval(self, iface: str, value: str) -> List[str]:
        return self._base() + ["interface", iface, "mld", "last-member-query-interval", value]

    def get_interface_mld_last_member_query_interval_delete(self, iface: str) -> List[str]:
        return self._base() + ["interface", iface, "mld", "last-member-query-interval"]

    def get_interface_mld_max_response_time(self, iface: str, value: str) -> List[str]:
        return self._base() + ["interface", iface, "mld", "max-response-time", value]

    def get_interface_mld_max_response_time_delete(self, iface: str) -> List[str]:
        return self._base() + ["interface", iface, "mld", "max-response-time"]

    def get_interface_mld_version(self, iface: str, value: str) -> List[str]:
        return self._base() + ["interface", iface, "mld", "version", value]

    def get_interface_mld_version_delete(self, iface: str) -> List[str]:
        return self._base() + ["interface", iface, "mld", "version"]

    def get_interface_mld_join(self, iface: str, group: str) -> List[str]:
        return self._base() + ["interface", iface, "mld", "join", group]

    def get_interface_mld_join_source(self, iface: str, group: str, source: str) -> List[str]:
        return self._base() + ["interface", iface, "mld", "join", group, "source", source]

    def get_interface_mld_join_source_delete(self, iface: str, group: str, source: str) -> List[str]:
        return self._base() + ["interface", iface, "mld", "join", group, "source", source]
