"""
PIMv6 Batch Builder

Provides all batch operations for PIMv6 (Protocol Independent Multicast for IPv6)
configuration.

No version differences between VyOS 1.4 and 1.5.
"""

from typing import List, Dict, Any
from vyos_mappers import CommandMapperRegistry

_INTERNAL_BUILDER_METHODS = frozenset({
    "add_set", "add_delete", "get_operations", "is_empty",
    "get_capabilities",
})


class Pim6BatchBuilder:
    """Complete batch builder for PIMv6 operations."""

    def __init__(self, version: str):
        self.version = version
        self._operations: List[Dict[str, Any]] = []
        self.mappers = CommandMapperRegistry.get_all_mappers(version)
        self.mapper_key = "pim6"

    # ========================================================================
    # Core Batch Operations
    # ========================================================================

    def add_set(self, path: List[str]) -> "Pim6BatchBuilder":
        if path:
            self._operations.append({"op": "set", "path": path})
        return self

    def add_delete(self, path: List[str]) -> "Pim6BatchBuilder":
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

    def set_join_prune_interval(self, value: str) -> "Pim6BatchBuilder":
        return self.add_set(self.m.get_join_prune_interval(value))

    def delete_join_prune_interval(self) -> "Pim6BatchBuilder":
        return self.add_delete(self.m.get_join_prune_interval_delete())

    def set_keep_alive_timer(self, value: str) -> "Pim6BatchBuilder":
        return self.add_set(self.m.get_keep_alive_timer(value))

    def delete_keep_alive_timer(self) -> "Pim6BatchBuilder":
        return self.add_delete(self.m.get_keep_alive_timer_delete())

    def set_packets(self, value: str) -> "Pim6BatchBuilder":
        return self.add_set(self.m.get_packets(value))

    def delete_packets(self) -> "Pim6BatchBuilder":
        return self.add_delete(self.m.get_packets_delete())

    def set_register_suppress_time(self, value: str) -> "Pim6BatchBuilder":
        return self.add_set(self.m.get_register_suppress_time(value))

    def delete_register_suppress_time(self) -> "Pim6BatchBuilder":
        return self.add_delete(self.m.get_register_suppress_time_delete())

    # ========================================================================
    # RP (Rendezvous Point) Operations
    # ========================================================================

    def set_rp_address(self, address: str) -> "Pim6BatchBuilder":
        return self.add_set(self.m.get_rp_address(address))

    def delete_rp_address(self, address: str) -> "Pim6BatchBuilder":
        return self.add_delete(self.m.get_rp_address_delete(address))

    def set_rp_address_group(self, address: str, group: str) -> "Pim6BatchBuilder":
        return self.add_set(self.m.get_rp_address_group(address, group))

    def delete_rp_address_group(self, address: str, group: str) -> "Pim6BatchBuilder":
        return self.add_delete(self.m.get_rp_address_group_delete(address, group))

    def set_rp_address_prefix_list6(self, address: str, value: str) -> "Pim6BatchBuilder":
        return self.add_set(self.m.get_rp_address_prefix_list6(address, value))

    def delete_rp_address_prefix_list6(self, address: str) -> "Pim6BatchBuilder":
        return self.add_delete(self.m.get_rp_address_prefix_list6_delete(address))

    def set_rp_keep_alive_timer(self, value: str) -> "Pim6BatchBuilder":
        return self.add_set(self.m.get_rp_keep_alive_timer(value))

    def delete_rp_keep_alive_timer(self) -> "Pim6BatchBuilder":
        return self.add_delete(self.m.get_rp_keep_alive_timer_delete())

    # ========================================================================
    # Interface Operations
    # ========================================================================

    def set_interface(self, iface: str) -> "Pim6BatchBuilder":
        return self.add_set(self.m.get_interface(iface))

    def delete_interface(self, iface: str) -> "Pim6BatchBuilder":
        return self.add_delete(self.m.get_interface(iface))

    def set_interface_dr_priority(self, iface: str, value: str) -> "Pim6BatchBuilder":
        return self.add_set(self.m.get_interface_dr_priority(iface, value))

    def delete_interface_dr_priority(self, iface: str) -> "Pim6BatchBuilder":
        return self.add_delete(self.m.get_interface_dr_priority_delete(iface))

    def set_interface_hello(self, iface: str, value: str) -> "Pim6BatchBuilder":
        return self.add_set(self.m.get_interface_hello(iface, value))

    def delete_interface_hello(self, iface: str) -> "Pim6BatchBuilder":
        return self.add_delete(self.m.get_interface_hello_delete(iface))

    def set_interface_no_bsm(self, iface: str) -> "Pim6BatchBuilder":
        return self.add_set(self.m.get_interface_no_bsm(iface))

    def delete_interface_no_bsm(self, iface: str) -> "Pim6BatchBuilder":
        return self.add_delete(self.m.get_interface_no_bsm(iface))

    def set_interface_no_unicast_bsm(self, iface: str) -> "Pim6BatchBuilder":
        return self.add_set(self.m.get_interface_no_unicast_bsm(iface))

    def delete_interface_no_unicast_bsm(self, iface: str) -> "Pim6BatchBuilder":
        return self.add_delete(self.m.get_interface_no_unicast_bsm(iface))

    def set_interface_passive(self, iface: str) -> "Pim6BatchBuilder":
        return self.add_set(self.m.get_interface_passive(iface))

    def delete_interface_passive(self, iface: str) -> "Pim6BatchBuilder":
        return self.add_delete(self.m.get_interface_passive(iface))

    # ========================================================================
    # Interface MLD Operations
    # ========================================================================

    def set_interface_mld(self, iface: str) -> "Pim6BatchBuilder":
        return self.add_set(self.m.get_interface_mld(iface))

    def delete_interface_mld(self, iface: str) -> "Pim6BatchBuilder":
        return self.add_delete(self.m.get_interface_mld(iface))

    def set_interface_mld_disable(self, iface: str) -> "Pim6BatchBuilder":
        return self.add_set(self.m.get_interface_mld_disable(iface))

    def delete_interface_mld_disable(self, iface: str) -> "Pim6BatchBuilder":
        return self.add_delete(self.m.get_interface_mld_disable(iface))

    def set_interface_mld_interval(self, iface: str, value: str) -> "Pim6BatchBuilder":
        return self.add_set(self.m.get_interface_mld_interval(iface, value))

    def delete_interface_mld_interval(self, iface: str) -> "Pim6BatchBuilder":
        return self.add_delete(self.m.get_interface_mld_interval_delete(iface))

    def set_interface_mld_last_member_query_count(self, iface: str, value: str) -> "Pim6BatchBuilder":
        return self.add_set(self.m.get_interface_mld_last_member_query_count(iface, value))

    def delete_interface_mld_last_member_query_count(self, iface: str) -> "Pim6BatchBuilder":
        return self.add_delete(self.m.get_interface_mld_last_member_query_count_delete(iface))

    def set_interface_mld_last_member_query_interval(self, iface: str, value: str) -> "Pim6BatchBuilder":
        return self.add_set(self.m.get_interface_mld_last_member_query_interval(iface, value))

    def delete_interface_mld_last_member_query_interval(self, iface: str) -> "Pim6BatchBuilder":
        return self.add_delete(self.m.get_interface_mld_last_member_query_interval_delete(iface))

    def set_interface_mld_max_response_time(self, iface: str, value: str) -> "Pim6BatchBuilder":
        return self.add_set(self.m.get_interface_mld_max_response_time(iface, value))

    def delete_interface_mld_max_response_time(self, iface: str) -> "Pim6BatchBuilder":
        return self.add_delete(self.m.get_interface_mld_max_response_time_delete(iface))

    def set_interface_mld_version(self, iface: str, value: str) -> "Pim6BatchBuilder":
        return self.add_set(self.m.get_interface_mld_version(iface, value))

    def delete_interface_mld_version(self, iface: str) -> "Pim6BatchBuilder":
        return self.add_delete(self.m.get_interface_mld_version_delete(iface))

    def set_interface_mld_join(self, iface: str, group: str) -> "Pim6BatchBuilder":
        return self.add_set(self.m.get_interface_mld_join(iface, group))

    def delete_interface_mld_join(self, iface: str, group: str) -> "Pim6BatchBuilder":
        return self.add_delete(self.m.get_interface_mld_join(iface, group))

    def set_interface_mld_join_source(self, iface: str, value: str) -> "Pim6BatchBuilder":
        """Value is encoded as 'group,source' (comma-separated)."""
        parts = value.split(",", 1)
        group = parts[0]
        source = parts[1]
        return self.add_set(self.m.get_interface_mld_join_source(iface, group, source))

    def delete_interface_mld_join_source(self, iface: str, value: str) -> "Pim6BatchBuilder":
        """Value is encoded as 'group,source' (comma-separated)."""
        parts = value.split(",", 1)
        group = parts[0]
        source = parts[1]
        return self.add_delete(self.m.get_interface_mld_join_source_delete(iface, group, source))

    # ========================================================================
    # Delete Entire PIMv6
    # ========================================================================

    def delete_pim6(self) -> "Pim6BatchBuilder":
        return self.add_delete(self.m.get_pim6_path())

    # ========================================================================
    # Capabilities
    # ========================================================================

    def get_capabilities(self) -> Dict[str, Any]:
        is_1_5 = "1.5" in self.version or "latest" in self.version
        is_1_4 = "1.4" in self.version

        return {
            "version": self.version,
            "features": {
                "pim6": {"supported": True, "description": "Protocol Independent Multicast for IPv6 (PIMv6)"},
                "interface": {"supported": True, "description": "PIMv6 interface configuration"},
                "interface_mld": {"supported": True, "description": "MLD (Multicast Listener Discovery) per-interface settings"},
                "mld_join": {"supported": True, "description": "MLD join multicast group with optional source(s)"},
                "join_prune_interval": {"supported": True, "description": "Join/prune send interval (1-65535s)"},
                "keep_alive_timer": {"supported": True, "description": "Keep alive timer (1-65535s)"},
                "packets": {"supported": True, "description": "Packets to process at once (1-255)"},
                "register_suppress_time": {"supported": True, "description": "Register suppress timer (1-65535s)"},
                "rp": {"supported": True, "description": "Rendezvous Point configuration"},
                "rp_prefix_list6": {"supported": True, "description": "RP selection by IPv6 prefix-list"},
            },
            "version_info": {
                "is_1_4": is_1_4,
                "is_1_5": is_1_5,
            },
        }
