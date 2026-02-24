"""
MPLS Mapper — Base paths (common to all VyOS versions)

All MPLS configuration lives under protocols/mpls.
Both VyOS 1.4 and 1.5 share the same MPLS template structure.
"""

from typing import List
from ..base import BaseFeatureMapper

BASE = ["protocols", "mpls"]
LDP = BASE + ["ldp"]


class MplsMapper(BaseFeatureMapper):
    def __init__(self, version: str):
        super().__init__(version)

    # -----------------------------------------------------------------------
    # Root — delete entire MPLS config
    # -----------------------------------------------------------------------

    def get_mpls_path(self) -> List[str]:
        return list(BASE)

    # -----------------------------------------------------------------------
    # Global — MPLS-enabled interfaces (multi-value leaf)
    # -----------------------------------------------------------------------

    def get_interface_path(self, iface: str) -> List[str]:
        return BASE + ["interface", iface]

    # -----------------------------------------------------------------------
    # Global — Parameters
    # -----------------------------------------------------------------------

    def get_parameters_path(self) -> List[str]:
        return BASE + ["parameters"]

    def get_parameters_maximum_ttl_path(self, val: str) -> List[str]:
        return BASE + ["parameters", "maximum-ttl", val]

    def get_parameters_no_propagate_ttl_path(self) -> List[str]:
        return BASE + ["parameters", "no-propagate-ttl"]

    # -----------------------------------------------------------------------
    # LDP — root
    # -----------------------------------------------------------------------

    def get_ldp_path(self) -> List[str]:
        return list(LDP)

    def get_ldp_router_id_path(self, router_id: str) -> List[str]:
        return LDP + ["router-id", router_id]

    # -----------------------------------------------------------------------
    # LDP — Interfaces
    # -----------------------------------------------------------------------

    def get_ldp_interface_path(self, iface: str) -> List[str]:
        return LDP + ["interface", iface]

    def get_ldp_interface_disable_hello_path(self, iface: str) -> List[str]:
        return LDP + ["interface", iface, "disable-establish-hello"]

    # -----------------------------------------------------------------------
    # LDP — Neighbors
    # -----------------------------------------------------------------------

    def get_ldp_neighbor_path(self, address: str) -> List[str]:
        return LDP + ["neighbor", address]

    def get_ldp_neighbor_password_path(self, address: str, password: str) -> List[str]:
        return LDP + ["neighbor", address, "password", password]

    def get_ldp_neighbor_session_holdtime_path(self, address: str, val: str) -> List[str]:
        return LDP + ["neighbor", address, "session-holdtime", val]

    def get_ldp_neighbor_ttl_security_path(self, address: str, val: str) -> List[str]:
        return LDP + ["neighbor", address, "ttl-security", val]

    # -----------------------------------------------------------------------
    # LDP — Discovery
    # -----------------------------------------------------------------------

    def get_ldp_discovery_path(self) -> List[str]:
        return LDP + ["discovery"]

    def get_ldp_discovery_hello_ipv4_holdtime_path(self, val: str) -> List[str]:
        return LDP + ["discovery", "hello-ipv4-holdtime", val]

    def get_ldp_discovery_hello_ipv4_interval_path(self, val: str) -> List[str]:
        return LDP + ["discovery", "hello-ipv4-interval", val]

    def get_ldp_discovery_hello_ipv6_holdtime_path(self, val: str) -> List[str]:
        return LDP + ["discovery", "hello-ipv6-holdtime", val]

    def get_ldp_discovery_hello_ipv6_interval_path(self, val: str) -> List[str]:
        return LDP + ["discovery", "hello-ipv6-interval", val]

    def get_ldp_discovery_session_ipv4_holdtime_path(self, val: str) -> List[str]:
        return LDP + ["discovery", "session-ipv4-holdtime", val]

    def get_ldp_discovery_session_ipv6_holdtime_path(self, val: str) -> List[str]:
        return LDP + ["discovery", "session-ipv6-holdtime", val]

    def get_ldp_discovery_transport_ipv4_address_path(self, addr: str) -> List[str]:
        return LDP + ["discovery", "transport-ipv4-address", addr]

    def get_ldp_discovery_transport_ipv6_address_path(self, addr: str) -> List[str]:
        return LDP + ["discovery", "transport-ipv6-address", addr]

    # -----------------------------------------------------------------------
    # LDP — Allocation
    # -----------------------------------------------------------------------

    def get_ldp_allocation_path(self) -> List[str]:
        return LDP + ["allocation"]

    def get_ldp_allocation_ipv4_access_list_path(self, acl: str) -> List[str]:
        return LDP + ["allocation", "ipv4", "access-list", acl]

    def get_ldp_allocation_ipv4_path(self) -> List[str]:
        return LDP + ["allocation", "ipv4"]

    def get_ldp_allocation_ipv6_access_list_path(self, acl: str) -> List[str]:
        return LDP + ["allocation", "ipv6", "access-list6", acl]

    def get_ldp_allocation_ipv6_path(self) -> List[str]:
        return LDP + ["allocation", "ipv6"]

    # -----------------------------------------------------------------------
    # LDP — Export
    # -----------------------------------------------------------------------

    def get_ldp_export_path(self) -> List[str]:
        return LDP + ["export"]

    def get_ldp_export_ipv4_explicit_null_path(self) -> List[str]:
        return LDP + ["export", "ipv4", "explicit-null"]

    def get_ldp_export_ipv4_filter_access_list_path(self, acl: str) -> List[str]:
        return LDP + ["export", "ipv4", "export-filter", "filter-access-list", acl]

    def get_ldp_export_ipv4_neighbor_access_list_path(self, acl: str) -> List[str]:
        return LDP + ["export", "ipv4", "export-filter", "neighbor-access-list", acl]

    def get_ldp_export_ipv4_path(self) -> List[str]:
        return LDP + ["export", "ipv4"]

    def get_ldp_export_ipv6_explicit_null_path(self) -> List[str]:
        return LDP + ["export", "ipv6", "explicit-null"]

    def get_ldp_export_ipv6_filter_access_list_path(self, acl: str) -> List[str]:
        return LDP + ["export", "ipv6", "export-filter", "filter-access-list6", acl]

    def get_ldp_export_ipv6_neighbor_access_list_path(self, acl: str) -> List[str]:
        return LDP + ["export", "ipv6", "export-filter", "neighbor-access-list6", acl]

    def get_ldp_export_ipv6_path(self) -> List[str]:
        return LDP + ["export", "ipv6"]

    # -----------------------------------------------------------------------
    # LDP — Import
    # -----------------------------------------------------------------------

    def get_ldp_import_path(self) -> List[str]:
        return LDP + ["import"]

    def get_ldp_import_ipv4_filter_access_list_path(self, acl: str) -> List[str]:
        return LDP + ["import", "ipv4", "import-filter", "filter-access-list", acl]

    def get_ldp_import_ipv4_neighbor_access_list_path(self, acl: str) -> List[str]:
        return LDP + ["import", "ipv4", "import-filter", "neighbor-access-list", acl]

    def get_ldp_import_ipv4_path(self) -> List[str]:
        return LDP + ["import", "ipv4"]

    def get_ldp_import_ipv6_filter_access_list_path(self, acl: str) -> List[str]:
        return LDP + ["import", "ipv6", "import-filter", "filter-access-list6", acl]

    def get_ldp_import_ipv6_neighbor_access_list_path(self, acl: str) -> List[str]:
        return LDP + ["import", "ipv6", "import-filter", "neighbor-access-list6", acl]

    def get_ldp_import_ipv6_path(self) -> List[str]:
        return LDP + ["import", "ipv6"]

    # -----------------------------------------------------------------------
    # LDP — Targeted Neighbors IPv4
    # -----------------------------------------------------------------------

    def get_ldp_targeted_neighbor_ipv4_path(self) -> List[str]:
        return LDP + ["targeted-neighbor", "ipv4"]

    def get_ldp_targeted_neighbor_ipv4_enable_path(self) -> List[str]:
        return LDP + ["targeted-neighbor", "ipv4", "enable"]

    def get_ldp_targeted_neighbor_ipv4_address_path(self, addr: str) -> List[str]:
        return LDP + ["targeted-neighbor", "ipv4", "address", addr]

    def get_ldp_targeted_neighbor_ipv4_hello_holdtime_path(self, val: str) -> List[str]:
        return LDP + ["targeted-neighbor", "ipv4", "hello-holdtime", val]

    def get_ldp_targeted_neighbor_ipv4_hello_interval_path(self, val: str) -> List[str]:
        return LDP + ["targeted-neighbor", "ipv4", "hello-interval", val]

    # -----------------------------------------------------------------------
    # LDP — Targeted Neighbors IPv6
    # -----------------------------------------------------------------------

    def get_ldp_targeted_neighbor_ipv6_path(self) -> List[str]:
        return LDP + ["targeted-neighbor", "ipv6"]

    def get_ldp_targeted_neighbor_ipv6_enable_path(self) -> List[str]:
        return LDP + ["targeted-neighbor", "ipv6", "enable"]

    def get_ldp_targeted_neighbor_ipv6_address_path(self, addr: str) -> List[str]:
        return LDP + ["targeted-neighbor", "ipv6", "address", addr]

    def get_ldp_targeted_neighbor_ipv6_hello_holdtime_path(self, val: str) -> List[str]:
        return LDP + ["targeted-neighbor", "ipv6", "hello-holdtime", val]

    def get_ldp_targeted_neighbor_ipv6_hello_interval_path(self, val: str) -> List[str]:
        return LDP + ["targeted-neighbor", "ipv6", "hello-interval", val]

    # -----------------------------------------------------------------------
    # LDP — Parameters
    # -----------------------------------------------------------------------

    def get_ldp_parameters_path(self) -> List[str]:
        return LDP + ["parameters"]

    def get_ldp_parameters_cisco_interop_tlv_path(self) -> List[str]:
        return LDP + ["parameters", "cisco-interop-tlv"]

    def get_ldp_parameters_ordered_control_path(self) -> List[str]:
        return LDP + ["parameters", "ordered-control"]

    def get_ldp_parameters_transport_prefer_ipv4_path(self) -> List[str]:
        return LDP + ["parameters", "transport-prefer-ipv4"]
