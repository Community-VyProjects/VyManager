"""
PIM Batch Builder

Provides all batch operations for PIM (Protocol Independent Multicast) configuration.
No version differences between VyOS 1.4 and 1.5.
"""

from typing import List, Dict, Any
from vyos_mappers import CommandMapperRegistry

_INTERNAL_BUILDER_METHODS = frozenset({
    "add_set", "add_delete", "get_operations", "is_empty",
    "get_capabilities",
})


class PimBatchBuilder:
    """Complete batch builder for PIM operations."""

    def __init__(self, version: str):
        self.version = version
        self._operations: List[Dict[str, Any]] = []
        self.mappers = CommandMapperRegistry.get_all_mappers(version)
        self.mapper_key = "pim"

    # ========================================================================
    # Core Batch Operations
    # ========================================================================

    def add_set(self, path: List[str]) -> "PimBatchBuilder":
        if path:
            self._operations.append({"op": "set", "path": path})
        return self

    def add_delete(self, path: List[str]) -> "PimBatchBuilder":
        if path:
            self._operations.append({"op": "delete", "path": path})
        return self

    def get_operations(self) -> List[Dict[str, Any]]:
        return self._operations.copy()

    def is_empty(self) -> bool:
        return len(self._operations) == 0

    @property
    def m(self):
        return self.mappers[self.mapper_key]

    # ========================================================================
    # Global Operations
    # ========================================================================

    def set_ecmp(self) -> "PimBatchBuilder":
        return self.add_set(self.m.get_ecmp())

    def delete_ecmp(self) -> "PimBatchBuilder":
        return self.add_delete(self.m.get_ecmp())

    def set_ecmp_rebalance(self) -> "PimBatchBuilder":
        return self.add_set(self.m.get_ecmp_rebalance())

    def delete_ecmp_rebalance(self) -> "PimBatchBuilder":
        return self.add_delete(self.m.get_ecmp_rebalance())

    def set_join_prune_interval(self, value: str) -> "PimBatchBuilder":
        return self.add_set(self.m.get_join_prune_interval(value))

    def delete_join_prune_interval(self) -> "PimBatchBuilder":
        return self.add_delete(self.m.get_join_prune_interval_delete())

    def set_keep_alive_timer(self, value: str) -> "PimBatchBuilder":
        return self.add_set(self.m.get_keep_alive_timer(value))

    def delete_keep_alive_timer(self) -> "PimBatchBuilder":
        return self.add_delete(self.m.get_keep_alive_timer_delete())

    def set_no_v6_secondary(self) -> "PimBatchBuilder":
        return self.add_set(self.m.get_no_v6_secondary())

    def delete_no_v6_secondary(self) -> "PimBatchBuilder":
        return self.add_delete(self.m.get_no_v6_secondary())

    def set_packets(self, value: str) -> "PimBatchBuilder":
        return self.add_set(self.m.get_packets(value))

    def delete_packets(self) -> "PimBatchBuilder":
        return self.add_delete(self.m.get_packets_delete())

    def set_register_suppress_time(self, value: str) -> "PimBatchBuilder":
        return self.add_set(self.m.get_register_suppress_time(value))

    def delete_register_suppress_time(self) -> "PimBatchBuilder":
        return self.add_delete(self.m.get_register_suppress_time_delete())

    # ========================================================================
    # IGMP Global Operations
    # ========================================================================

    def set_igmp_watermark_warning(self, value: str) -> "PimBatchBuilder":
        return self.add_set(self.m.get_igmp_watermark_warning(value))

    def delete_igmp_watermark_warning(self) -> "PimBatchBuilder":
        return self.add_delete(self.m.get_igmp_watermark_warning_delete())

    # ========================================================================
    # Register Accept List Operations
    # ========================================================================

    def set_register_accept_list_prefix_list(self, value: str) -> "PimBatchBuilder":
        return self.add_set(self.m.get_register_accept_list_prefix_list(value))

    def delete_register_accept_list_prefix_list(self) -> "PimBatchBuilder":
        return self.add_delete(self.m.get_register_accept_list_prefix_list_delete())

    # ========================================================================
    # RP (Rendezvous Point) Operations
    # ========================================================================

    def set_rp_address(self, address: str) -> "PimBatchBuilder":
        return self.add_set(self.m.get_rp_address(address))

    def delete_rp_address(self, address: str) -> "PimBatchBuilder":
        return self.add_delete(self.m.get_rp_address_delete(address))

    def set_rp_address_group(self, address: str, group: str) -> "PimBatchBuilder":
        return self.add_set(self.m.get_rp_address_group(address, group))

    def delete_rp_address_group(self, address: str, group: str) -> "PimBatchBuilder":
        return self.add_delete(self.m.get_rp_address_group_delete(address, group))

    def set_rp_keep_alive_timer(self, value: str) -> "PimBatchBuilder":
        return self.add_set(self.m.get_rp_keep_alive_timer(value))

    def delete_rp_keep_alive_timer(self) -> "PimBatchBuilder":
        return self.add_delete(self.m.get_rp_keep_alive_timer_delete())

    # ========================================================================
    # SPT Switchover Operations
    # ========================================================================

    def set_spt_switchover_infinity(self) -> "PimBatchBuilder":
        return self.add_set(self.m.get_spt_switchover_infinity())

    def delete_spt_switchover(self) -> "PimBatchBuilder":
        return self.add_delete(self.m.get_spt_switchover_delete())

    def set_spt_switchover_infinity_prefix_list(self, value: str) -> "PimBatchBuilder":
        return self.add_set(self.m.get_spt_switchover_infinity_prefix_list(value))

    def delete_spt_switchover_infinity_prefix_list(self) -> "PimBatchBuilder":
        return self.add_delete(self.m.get_spt_switchover_infinity_prefix_list_delete())

    # ========================================================================
    # SSM Operations
    # ========================================================================

    def set_ssm_prefix_list(self, value: str) -> "PimBatchBuilder":
        return self.add_set(self.m.get_ssm_prefix_list(value))

    def delete_ssm_prefix_list(self) -> "PimBatchBuilder":
        return self.add_delete(self.m.get_ssm_prefix_list_delete())

    # ========================================================================
    # Interface Operations
    # ========================================================================

    def set_interface(self, iface: str) -> "PimBatchBuilder":
        return self.add_set(self.m.get_interface(iface))

    def delete_interface(self, iface: str) -> "PimBatchBuilder":
        return self.add_delete(self.m.get_interface(iface))

    def set_interface_bfd(self, iface: str) -> "PimBatchBuilder":
        return self.add_set(self.m.get_interface_bfd(iface))

    def delete_interface_bfd(self, iface: str) -> "PimBatchBuilder":
        return self.add_delete(self.m.get_interface_bfd(iface))

    def set_interface_bfd_profile(self, iface: str, value: str) -> "PimBatchBuilder":
        return self.add_set(self.m.get_interface_bfd_profile(iface, value))

    def delete_interface_bfd_profile(self, iface: str) -> "PimBatchBuilder":
        return self.add_delete(self.m.get_interface_bfd_profile_delete(iface))

    def set_interface_dr_priority(self, iface: str, value: str) -> "PimBatchBuilder":
        return self.add_set(self.m.get_interface_dr_priority(iface, value))

    def delete_interface_dr_priority(self, iface: str) -> "PimBatchBuilder":
        return self.add_delete(self.m.get_interface_dr_priority_delete(iface))

    def set_interface_hello(self, iface: str, value: str) -> "PimBatchBuilder":
        return self.add_set(self.m.get_interface_hello(iface, value))

    def delete_interface_hello(self, iface: str) -> "PimBatchBuilder":
        return self.add_delete(self.m.get_interface_hello_delete(iface))

    def set_interface_no_bsm(self, iface: str) -> "PimBatchBuilder":
        return self.add_set(self.m.get_interface_no_bsm(iface))

    def delete_interface_no_bsm(self, iface: str) -> "PimBatchBuilder":
        return self.add_delete(self.m.get_interface_no_bsm(iface))

    def set_interface_no_unicast_bsm(self, iface: str) -> "PimBatchBuilder":
        return self.add_set(self.m.get_interface_no_unicast_bsm(iface))

    def delete_interface_no_unicast_bsm(self, iface: str) -> "PimBatchBuilder":
        return self.add_delete(self.m.get_interface_no_unicast_bsm(iface))

    def set_interface_passive(self, iface: str) -> "PimBatchBuilder":
        return self.add_set(self.m.get_interface_passive(iface))

    def delete_interface_passive(self, iface: str) -> "PimBatchBuilder":
        return self.add_delete(self.m.get_interface_passive(iface))

    def set_interface_source_address(self, iface: str, value: str) -> "PimBatchBuilder":
        return self.add_set(self.m.get_interface_source_address(iface, value))

    def delete_interface_source_address(self, iface: str) -> "PimBatchBuilder":
        return self.add_delete(self.m.get_interface_source_address_delete(iface))

    # ========================================================================
    # Interface IGMP Operations
    # ========================================================================

    def set_interface_igmp(self, iface: str) -> "PimBatchBuilder":
        return self.add_set(self.m.get_interface_igmp(iface))

    def set_interface_igmp_disable(self, iface: str) -> "PimBatchBuilder":
        return self.add_set(self.m.get_interface_igmp_disable(iface))

    def delete_interface_igmp_disable(self, iface: str) -> "PimBatchBuilder":
        return self.add_delete(self.m.get_interface_igmp_disable(iface))

    def set_interface_igmp_join(self, iface: str, group: str) -> "PimBatchBuilder":
        return self.add_set(self.m.get_interface_igmp_join(iface, group))

    def delete_interface_igmp_join(self, iface: str, group: str) -> "PimBatchBuilder":
        return self.add_delete(self.m.get_interface_igmp_join(iface, group))

    def set_interface_igmp_join_source(self, iface: str, value: str) -> "PimBatchBuilder":
        parts = value.split(",")
        group = parts[0]
        source = parts[1]
        return self.add_set(self.m.get_interface_igmp_join_source(iface, group, source))

    def delete_interface_igmp_join_source(self, iface: str, value: str) -> "PimBatchBuilder":
        parts = value.split(",")
        group = parts[0]
        source = parts[1]
        return self.add_delete(self.m.get_interface_igmp_join_source_delete(iface, group, source))

    def set_interface_igmp_query_interval(self, iface: str, value: str) -> "PimBatchBuilder":
        return self.add_set(self.m.get_interface_igmp_query_interval(iface, value))

    def delete_interface_igmp_query_interval(self, iface: str) -> "PimBatchBuilder":
        return self.add_delete(self.m.get_interface_igmp_query_interval_delete(iface))

    def set_interface_igmp_query_max_response_time(self, iface: str, value: str) -> "PimBatchBuilder":
        return self.add_set(self.m.get_interface_igmp_query_max_response_time(iface, value))

    def delete_interface_igmp_query_max_response_time(self, iface: str) -> "PimBatchBuilder":
        return self.add_delete(self.m.get_interface_igmp_query_max_response_time_delete(iface))

    def set_interface_igmp_version(self, iface: str, value: str) -> "PimBatchBuilder":
        return self.add_set(self.m.get_interface_igmp_version(iface, value))

    def delete_interface_igmp_version(self, iface: str) -> "PimBatchBuilder":
        return self.add_delete(self.m.get_interface_igmp_version_delete(iface))

    # ========================================================================
    # Delete Entire PIM
    # ========================================================================

    def delete_pim(self) -> "PimBatchBuilder":
        return self.add_delete(self.m.get_pim_path())

    # ========================================================================
    # Capabilities
    # ========================================================================

    def get_capabilities(self) -> Dict[str, Any]:
        is_1_5 = "1.5" in self.version or "latest" in self.version
        is_1_4 = "1.4" in self.version

        return {
            "version": self.version,
            "features": {
                "pim": {"supported": True, "description": "Protocol Independent Multicast (PIM)"},
                "ecmp": {"supported": True, "description": "PIM ECMP"},
                "ecmp_rebalance": {"supported": True, "description": "PIM ECMP Rebalance"},
                "igmp": {"supported": True, "description": "IGMP options (watermark warning)"},
                "interface": {"supported": True, "description": "PIM interface configuration"},
                "interface_bfd": {"supported": True, "description": "BFD on PIM interfaces"},
                "interface_igmp": {"supported": True, "description": "IGMP per-interface settings"},
                "join_prune_interval": {"supported": True, "description": "Join/prune send interval (1-65535s)"},
                "keep_alive_timer": {"supported": True, "description": "Keep alive timer (1-65535s)"},
                "no_v6_secondary": {"supported": True, "description": "Disable IPv6 secondary address in hello packets"},
                "packets": {"supported": True, "description": "Packets to process at once (1-255)"},
                "register_accept_list": {"supported": True, "description": "Register accept list with prefix-list"},
                "register_suppress_time": {"supported": True, "description": "Register suppress timer (1-65535s)"},
                "rp": {"supported": True, "description": "Rendezvous Point configuration"},
                "spt_switchover": {"supported": True, "description": "SPT switchover settings"},
                "ssm": {"supported": True, "description": "Source-Specific Multicast"},
            },
            "version_info": {
                "is_1_4": is_1_4,
                "is_1_5": is_1_5,
            },
        }
