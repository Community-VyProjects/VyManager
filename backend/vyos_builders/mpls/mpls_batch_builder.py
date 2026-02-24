"""
MPLS Batch Builder

Generates VyOS set/delete operations for the MPLS protocol and its
LDP (Label Distribution Protocol) sub-configuration.

Both VyOS 1.4 and 1.5 share identical MPLS/LDP template structure,
so all capabilities are available on both versions.

Multi-argument batch operations encode compound values as "arg1,arg2"
(comma-separated), matching the project's standard batch dispatch pattern.
"""

from typing import List, Dict, Any
from vyos_mappers import CommandMapperRegistry


class MplsBatchBuilder:
    def __init__(self, version: str):
        self.version = version
        self._operations: List[Dict[str, Any]] = []
        self.mappers = CommandMapperRegistry.get_all_mappers(version)
        self.m = self.mappers["mpls"]

    # -----------------------------------------------------------------------
    # Core helpers
    # -----------------------------------------------------------------------

    def add_set(self, path: List[str]) -> "MplsBatchBuilder":
        if path:
            self._operations.append({"op": "set", "path": path})
        return self

    def add_delete(self, path: List[str]) -> "MplsBatchBuilder":
        if path:
            self._operations.append({"op": "delete", "path": path})
        return self

    def get_operations(self) -> List[Dict[str, Any]]:
        return self._operations.copy()

    def is_empty(self) -> bool:
        return len(self._operations) == 0

    # -----------------------------------------------------------------------
    # Capabilities
    # -----------------------------------------------------------------------

    def get_capabilities(self) -> Dict[str, Any]:
        is_1_4 = "1.4" in self.version
        is_1_5 = not is_1_4

        return {
            "version": self.version,
            "features": {
                "mpls": {
                    "supported": True,
                    "description": "Multiprotocol Label Switching (MPLS)",
                },
                "ldp": {
                    "supported": True,
                    "description": "Label Distribution Protocol (LDP)",
                },
                "ldp_discovery": {
                    "supported": True,
                    "description": "LDP discovery parameters (hello/session timers, transport addresses)",
                },
                "ldp_allocation": {
                    "supported": True,
                    "description": "LDP FEC allocation filtering via access-lists",
                },
                "ldp_export": {
                    "supported": True,
                    "description": "LDP label export with explicit-null and export filters",
                },
                "ldp_import": {
                    "supported": True,
                    "description": "LDP label import filtering via access-lists",
                },
                "ldp_targeted_neighbor": {
                    "supported": True,
                    "description": "LDP targeted neighbor sessions (IPv4 and IPv6)",
                },
                "ldp_neighbors": {
                    "supported": True,
                    "description": "LDP neighbor-specific settings (password, holdtime, TTL security)",
                },
                "parameters": {
                    "supported": True,
                    "description": "MPLS parameters (maximum TTL, TTL propagation)",
                },
            },
            "version_info": {
                "is_1_4": is_1_4,
                "is_1_5": is_1_5,
            },
        }

    # -----------------------------------------------------------------------
    # Delete entire MPLS config
    # -----------------------------------------------------------------------

    def delete_mpls(self) -> "MplsBatchBuilder":
        return self.add_delete(self.m.get_mpls_path())

    # -----------------------------------------------------------------------
    # Global — MPLS-enabled interfaces (multi-value leaf)
    # -----------------------------------------------------------------------

    def set_interface(self, iface: str) -> "MplsBatchBuilder":
        """Enable MPLS on a global interface."""
        return self.add_set(self.m.get_interface_path(iface))

    def delete_interface(self, iface: str) -> "MplsBatchBuilder":
        """Disable MPLS on a global interface."""
        return self.add_delete(self.m.get_interface_path(iface))

    # -----------------------------------------------------------------------
    # Global — Parameters
    # -----------------------------------------------------------------------

    def set_parameters_maximum_ttl(self, val: str) -> "MplsBatchBuilder":
        return self.add_set(self.m.get_parameters_maximum_ttl_path(val))

    def delete_parameters_maximum_ttl(self) -> "MplsBatchBuilder":
        return self.add_delete(["protocols", "mpls", "parameters", "maximum-ttl"])

    def set_parameters_no_propagate_ttl(self) -> "MplsBatchBuilder":
        return self.add_set(self.m.get_parameters_no_propagate_ttl_path())

    def delete_parameters_no_propagate_ttl(self) -> "MplsBatchBuilder":
        return self.add_delete(self.m.get_parameters_no_propagate_ttl_path())

    def delete_parameters(self) -> "MplsBatchBuilder":
        return self.add_delete(self.m.get_parameters_path())

    # -----------------------------------------------------------------------
    # LDP — root / router-id
    # -----------------------------------------------------------------------

    def delete_ldp(self) -> "MplsBatchBuilder":
        return self.add_delete(self.m.get_ldp_path())

    def set_ldp_router_id(self, router_id: str) -> "MplsBatchBuilder":
        return self.add_set(self.m.get_ldp_router_id_path(router_id))

    def delete_ldp_router_id(self) -> "MplsBatchBuilder":
        return self.add_delete(["protocols", "mpls", "ldp", "router-id"])

    # -----------------------------------------------------------------------
    # LDP — Interfaces
    # -----------------------------------------------------------------------

    def set_ldp_interface(self, iface: str) -> "MplsBatchBuilder":
        """Add interface to LDP."""
        return self.add_set(self.m.get_ldp_interface_path(iface))

    def delete_ldp_interface(self, iface: str) -> "MplsBatchBuilder":
        """Remove interface from LDP."""
        return self.add_delete(self.m.get_ldp_interface_path(iface))

    def set_ldp_interface_disable_hello(self, iface: str) -> "MplsBatchBuilder":
        return self.add_set(self.m.get_ldp_interface_disable_hello_path(iface))

    def delete_ldp_interface_disable_hello(self, iface: str) -> "MplsBatchBuilder":
        return self.add_delete(self.m.get_ldp_interface_disable_hello_path(iface))

    # -----------------------------------------------------------------------
    # LDP — Neighbors
    # -----------------------------------------------------------------------

    def set_ldp_neighbor(self, address: str) -> "MplsBatchBuilder":
        """Create LDP neighbor entry."""
        return self.add_set(self.m.get_ldp_neighbor_path(address))

    def delete_ldp_neighbor(self, address: str) -> "MplsBatchBuilder":
        """Remove LDP neighbor entry."""
        return self.add_delete(self.m.get_ldp_neighbor_path(address))

    def set_ldp_neighbor_password(self, address: str, password: str) -> "MplsBatchBuilder":
        return self.add_set(self.m.get_ldp_neighbor_password_path(address, password))

    def delete_ldp_neighbor_password(self, address: str) -> "MplsBatchBuilder":
        return self.add_delete(["protocols", "mpls", "ldp", "neighbor", address, "password"])

    def set_ldp_neighbor_session_holdtime(self, address: str, val: str) -> "MplsBatchBuilder":
        return self.add_set(self.m.get_ldp_neighbor_session_holdtime_path(address, val))

    def delete_ldp_neighbor_session_holdtime(self, address: str) -> "MplsBatchBuilder":
        return self.add_delete(["protocols", "mpls", "ldp", "neighbor", address, "session-holdtime"])

    def set_ldp_neighbor_ttl_security(self, address: str, val: str) -> "MplsBatchBuilder":
        return self.add_set(self.m.get_ldp_neighbor_ttl_security_path(address, val))

    def delete_ldp_neighbor_ttl_security(self, address: str) -> "MplsBatchBuilder":
        return self.add_delete(["protocols", "mpls", "ldp", "neighbor", address, "ttl-security"])

    # -----------------------------------------------------------------------
    # LDP — Discovery
    # -----------------------------------------------------------------------

    def delete_ldp_discovery(self) -> "MplsBatchBuilder":
        return self.add_delete(self.m.get_ldp_discovery_path())

    def set_ldp_discovery_hello_ipv4_holdtime(self, val: str) -> "MplsBatchBuilder":
        return self.add_set(self.m.get_ldp_discovery_hello_ipv4_holdtime_path(val))

    def delete_ldp_discovery_hello_ipv4_holdtime(self) -> "MplsBatchBuilder":
        return self.add_delete(["protocols", "mpls", "ldp", "discovery", "hello-ipv4-holdtime"])

    def set_ldp_discovery_hello_ipv4_interval(self, val: str) -> "MplsBatchBuilder":
        return self.add_set(self.m.get_ldp_discovery_hello_ipv4_interval_path(val))

    def delete_ldp_discovery_hello_ipv4_interval(self) -> "MplsBatchBuilder":
        return self.add_delete(["protocols", "mpls", "ldp", "discovery", "hello-ipv4-interval"])

    def set_ldp_discovery_hello_ipv6_holdtime(self, val: str) -> "MplsBatchBuilder":
        return self.add_set(self.m.get_ldp_discovery_hello_ipv6_holdtime_path(val))

    def delete_ldp_discovery_hello_ipv6_holdtime(self) -> "MplsBatchBuilder":
        return self.add_delete(["protocols", "mpls", "ldp", "discovery", "hello-ipv6-holdtime"])

    def set_ldp_discovery_hello_ipv6_interval(self, val: str) -> "MplsBatchBuilder":
        return self.add_set(self.m.get_ldp_discovery_hello_ipv6_interval_path(val))

    def delete_ldp_discovery_hello_ipv6_interval(self) -> "MplsBatchBuilder":
        return self.add_delete(["protocols", "mpls", "ldp", "discovery", "hello-ipv6-interval"])

    def set_ldp_discovery_session_ipv4_holdtime(self, val: str) -> "MplsBatchBuilder":
        return self.add_set(self.m.get_ldp_discovery_session_ipv4_holdtime_path(val))

    def delete_ldp_discovery_session_ipv4_holdtime(self) -> "MplsBatchBuilder":
        return self.add_delete(["protocols", "mpls", "ldp", "discovery", "session-ipv4-holdtime"])

    def set_ldp_discovery_session_ipv6_holdtime(self, val: str) -> "MplsBatchBuilder":
        return self.add_set(self.m.get_ldp_discovery_session_ipv6_holdtime_path(val))

    def delete_ldp_discovery_session_ipv6_holdtime(self) -> "MplsBatchBuilder":
        return self.add_delete(["protocols", "mpls", "ldp", "discovery", "session-ipv6-holdtime"])

    def set_ldp_discovery_transport_ipv4_address(self, addr: str) -> "MplsBatchBuilder":
        return self.add_set(self.m.get_ldp_discovery_transport_ipv4_address_path(addr))

    def delete_ldp_discovery_transport_ipv4_address(self) -> "MplsBatchBuilder":
        return self.add_delete(["protocols", "mpls", "ldp", "discovery", "transport-ipv4-address"])

    def set_ldp_discovery_transport_ipv6_address(self, addr: str) -> "MplsBatchBuilder":
        return self.add_set(self.m.get_ldp_discovery_transport_ipv6_address_path(addr))

    def delete_ldp_discovery_transport_ipv6_address(self) -> "MplsBatchBuilder":
        return self.add_delete(["protocols", "mpls", "ldp", "discovery", "transport-ipv6-address"])

    # -----------------------------------------------------------------------
    # LDP — Allocation
    # -----------------------------------------------------------------------

    def delete_ldp_allocation(self) -> "MplsBatchBuilder":
        return self.add_delete(self.m.get_ldp_allocation_path())

    def set_ldp_allocation_ipv4_access_list(self, acl: str) -> "MplsBatchBuilder":
        return self.add_set(self.m.get_ldp_allocation_ipv4_access_list_path(acl))

    def delete_ldp_allocation_ipv4(self) -> "MplsBatchBuilder":
        return self.add_delete(self.m.get_ldp_allocation_ipv4_path())

    def set_ldp_allocation_ipv6_access_list(self, acl: str) -> "MplsBatchBuilder":
        return self.add_set(self.m.get_ldp_allocation_ipv6_access_list_path(acl))

    def delete_ldp_allocation_ipv6(self) -> "MplsBatchBuilder":
        return self.add_delete(self.m.get_ldp_allocation_ipv6_path())

    # -----------------------------------------------------------------------
    # LDP — Export
    # -----------------------------------------------------------------------

    def delete_ldp_export(self) -> "MplsBatchBuilder":
        return self.add_delete(self.m.get_ldp_export_path())

    def set_ldp_export_ipv4_explicit_null(self) -> "MplsBatchBuilder":
        return self.add_set(self.m.get_ldp_export_ipv4_explicit_null_path())

    def delete_ldp_export_ipv4_explicit_null(self) -> "MplsBatchBuilder":
        return self.add_delete(self.m.get_ldp_export_ipv4_explicit_null_path())

    def set_ldp_export_ipv4_filter_access_list(self, acl: str) -> "MplsBatchBuilder":
        return self.add_set(self.m.get_ldp_export_ipv4_filter_access_list_path(acl))

    def delete_ldp_export_ipv4_filter(self) -> "MplsBatchBuilder":
        return self.add_delete(self.m.get_ldp_export_ipv4_path())

    def set_ldp_export_ipv4_neighbor_access_list(self, acl: str) -> "MplsBatchBuilder":
        return self.add_set(self.m.get_ldp_export_ipv4_neighbor_access_list_path(acl))

    def set_ldp_export_ipv6_explicit_null(self) -> "MplsBatchBuilder":
        return self.add_set(self.m.get_ldp_export_ipv6_explicit_null_path())

    def delete_ldp_export_ipv6_explicit_null(self) -> "MplsBatchBuilder":
        return self.add_delete(self.m.get_ldp_export_ipv6_explicit_null_path())

    def set_ldp_export_ipv6_filter_access_list(self, acl: str) -> "MplsBatchBuilder":
        return self.add_set(self.m.get_ldp_export_ipv6_filter_access_list_path(acl))

    def delete_ldp_export_ipv6_filter(self) -> "MplsBatchBuilder":
        return self.add_delete(self.m.get_ldp_export_ipv6_path())

    def set_ldp_export_ipv6_neighbor_access_list(self, acl: str) -> "MplsBatchBuilder":
        return self.add_set(self.m.get_ldp_export_ipv6_neighbor_access_list_path(acl))

    # -----------------------------------------------------------------------
    # LDP — Import
    # -----------------------------------------------------------------------

    def delete_ldp_import(self) -> "MplsBatchBuilder":
        return self.add_delete(self.m.get_ldp_import_path())

    def set_ldp_import_ipv4_filter_access_list(self, acl: str) -> "MplsBatchBuilder":
        return self.add_set(self.m.get_ldp_import_ipv4_filter_access_list_path(acl))

    def delete_ldp_import_ipv4(self) -> "MplsBatchBuilder":
        return self.add_delete(self.m.get_ldp_import_ipv4_path())

    def set_ldp_import_ipv4_neighbor_access_list(self, acl: str) -> "MplsBatchBuilder":
        return self.add_set(self.m.get_ldp_import_ipv4_neighbor_access_list_path(acl))

    def set_ldp_import_ipv6_filter_access_list(self, acl: str) -> "MplsBatchBuilder":
        return self.add_set(self.m.get_ldp_import_ipv6_filter_access_list_path(acl))

    def delete_ldp_import_ipv6(self) -> "MplsBatchBuilder":
        return self.add_delete(self.m.get_ldp_import_ipv6_path())

    def set_ldp_import_ipv6_neighbor_access_list(self, acl: str) -> "MplsBatchBuilder":
        return self.add_set(self.m.get_ldp_import_ipv6_neighbor_access_list_path(acl))

    # -----------------------------------------------------------------------
    # LDP — Targeted Neighbors IPv4
    # -----------------------------------------------------------------------

    def set_ldp_targeted_neighbor_ipv4_enable(self) -> "MplsBatchBuilder":
        return self.add_set(self.m.get_ldp_targeted_neighbor_ipv4_enable_path())

    def delete_ldp_targeted_neighbor_ipv4_enable(self) -> "MplsBatchBuilder":
        return self.add_delete(self.m.get_ldp_targeted_neighbor_ipv4_enable_path())

    def set_ldp_targeted_neighbor_ipv4_address(self, addr: str) -> "MplsBatchBuilder":
        return self.add_set(self.m.get_ldp_targeted_neighbor_ipv4_address_path(addr))

    def delete_ldp_targeted_neighbor_ipv4_address(self, addr: str) -> "MplsBatchBuilder":
        return self.add_delete(self.m.get_ldp_targeted_neighbor_ipv4_address_path(addr))

    def set_ldp_targeted_neighbor_ipv4_hello_holdtime(self, val: str) -> "MplsBatchBuilder":
        return self.add_set(self.m.get_ldp_targeted_neighbor_ipv4_hello_holdtime_path(val))

    def delete_ldp_targeted_neighbor_ipv4_hello_holdtime(self) -> "MplsBatchBuilder":
        return self.add_delete(["protocols", "mpls", "ldp", "targeted-neighbor", "ipv4", "hello-holdtime"])

    def set_ldp_targeted_neighbor_ipv4_hello_interval(self, val: str) -> "MplsBatchBuilder":
        return self.add_set(self.m.get_ldp_targeted_neighbor_ipv4_hello_interval_path(val))

    def delete_ldp_targeted_neighbor_ipv4_hello_interval(self) -> "MplsBatchBuilder":
        return self.add_delete(["protocols", "mpls", "ldp", "targeted-neighbor", "ipv4", "hello-interval"])

    def delete_ldp_targeted_neighbor_ipv4(self) -> "MplsBatchBuilder":
        return self.add_delete(self.m.get_ldp_targeted_neighbor_ipv4_path())

    # -----------------------------------------------------------------------
    # LDP — Targeted Neighbors IPv6
    # -----------------------------------------------------------------------

    def set_ldp_targeted_neighbor_ipv6_enable(self) -> "MplsBatchBuilder":
        return self.add_set(self.m.get_ldp_targeted_neighbor_ipv6_enable_path())

    def delete_ldp_targeted_neighbor_ipv6_enable(self) -> "MplsBatchBuilder":
        return self.add_delete(self.m.get_ldp_targeted_neighbor_ipv6_enable_path())

    def set_ldp_targeted_neighbor_ipv6_address(self, addr: str) -> "MplsBatchBuilder":
        return self.add_set(self.m.get_ldp_targeted_neighbor_ipv6_address_path(addr))

    def delete_ldp_targeted_neighbor_ipv6_address(self, addr: str) -> "MplsBatchBuilder":
        return self.add_delete(self.m.get_ldp_targeted_neighbor_ipv6_address_path(addr))

    def set_ldp_targeted_neighbor_ipv6_hello_holdtime(self, val: str) -> "MplsBatchBuilder":
        return self.add_set(self.m.get_ldp_targeted_neighbor_ipv6_hello_holdtime_path(val))

    def delete_ldp_targeted_neighbor_ipv6_hello_holdtime(self) -> "MplsBatchBuilder":
        return self.add_delete(["protocols", "mpls", "ldp", "targeted-neighbor", "ipv6", "hello-holdtime"])

    def set_ldp_targeted_neighbor_ipv6_hello_interval(self, val: str) -> "MplsBatchBuilder":
        return self.add_set(self.m.get_ldp_targeted_neighbor_ipv6_hello_interval_path(val))

    def delete_ldp_targeted_neighbor_ipv6_hello_interval(self) -> "MplsBatchBuilder":
        return self.add_delete(["protocols", "mpls", "ldp", "targeted-neighbor", "ipv6", "hello-interval"])

    def delete_ldp_targeted_neighbor_ipv6(self) -> "MplsBatchBuilder":
        return self.add_delete(self.m.get_ldp_targeted_neighbor_ipv6_path())

    # -----------------------------------------------------------------------
    # LDP — Parameters
    # -----------------------------------------------------------------------

    def set_ldp_parameters_cisco_interop_tlv(self) -> "MplsBatchBuilder":
        return self.add_set(self.m.get_ldp_parameters_cisco_interop_tlv_path())

    def delete_ldp_parameters_cisco_interop_tlv(self) -> "MplsBatchBuilder":
        return self.add_delete(self.m.get_ldp_parameters_cisco_interop_tlv_path())

    def set_ldp_parameters_ordered_control(self) -> "MplsBatchBuilder":
        return self.add_set(self.m.get_ldp_parameters_ordered_control_path())

    def delete_ldp_parameters_ordered_control(self) -> "MplsBatchBuilder":
        return self.add_delete(self.m.get_ldp_parameters_ordered_control_path())

    def set_ldp_parameters_transport_prefer_ipv4(self) -> "MplsBatchBuilder":
        return self.add_set(self.m.get_ldp_parameters_transport_prefer_ipv4_path())

    def delete_ldp_parameters_transport_prefer_ipv4(self) -> "MplsBatchBuilder":
        return self.add_delete(self.m.get_ldp_parameters_transport_prefer_ipv4_path())

    def delete_ldp_parameters(self) -> "MplsBatchBuilder":
        return self.add_delete(self.m.get_ldp_parameters_path())
