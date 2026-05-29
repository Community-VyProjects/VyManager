"""
Router Advertisement Batch Builder

VyOS 1.5 adds:
  - captive-portal per interface
  - base-interface per RA prefix (DHCPv6-PD support)
"""

from typing import List, Dict, Any
from vyos_mappers import CommandMapperRegistry


class RouterAdvertBatchBuilder:
    def __init__(self, version: str):
        self.version = version
        self._operations: List[Dict[str, Any]] = []
        self.mappers = CommandMapperRegistry.get_all_mappers(version)
        self.m = self.mappers["router_advert"]

    # ========================================================================
    # Core helpers
    # ========================================================================

    def add_set(self, path: List[str]) -> "RouterAdvertBatchBuilder":
        if path:
            self._operations.append({"op": "set", "path": path})
        return self

    def add_delete(self, path: List[str]) -> "RouterAdvertBatchBuilder":
        if path:
            self._operations.append({"op": "delete", "path": path})
        return self

    def get_operations(self) -> List[Dict[str, Any]]:
        return self._operations.copy()

    def is_empty(self) -> bool:
        return len(self._operations) == 0

    # ========================================================================
    # Interface lifecycle
    # ========================================================================

    def set_interface(self, interface: str) -> "RouterAdvertBatchBuilder":
        return self.add_set(self.m.get_interface_path(interface))

    def delete_interface(self, interface: str) -> "RouterAdvertBatchBuilder":
        return self.add_delete(self.m.get_interface_path(interface))

    # ========================================================================
    # Interface-level attribute operations
    # ========================================================================

    def set_interface_auto_ignore(self, interface: str, prefix: str) -> "RouterAdvertBatchBuilder":
        return self.add_set(self.m.get_interface_auto_ignore(interface, prefix))

    def delete_interface_auto_ignore(self, interface: str, prefix: str) -> "RouterAdvertBatchBuilder":
        return self.add_delete(self.m.get_interface_auto_ignore(interface, prefix))

    def set_interface_captive_portal(self, interface: str, value: str) -> "RouterAdvertBatchBuilder":
        return self.add_set(self.m.get_interface_captive_portal(interface, value))

    def delete_interface_captive_portal(self, interface: str) -> "RouterAdvertBatchBuilder":
        return self.add_delete(self.m.get_interface_captive_portal_path(interface))

    def set_interface_default_lifetime(self, interface: str, value: str) -> "RouterAdvertBatchBuilder":
        return self.add_set(self.m.get_interface_default_lifetime(interface, value))

    def delete_interface_default_lifetime(self, interface: str) -> "RouterAdvertBatchBuilder":
        return self.add_delete(self.m.get_interface_default_lifetime_path(interface))

    def set_interface_default_preference(self, interface: str, value: str) -> "RouterAdvertBatchBuilder":
        return self.add_set(self.m.get_interface_default_preference(interface, value))

    def delete_interface_default_preference(self, interface: str) -> "RouterAdvertBatchBuilder":
        return self.add_delete(self.m.get_interface_default_preference_path(interface))

    def set_interface_dnssl(self, interface: str, domain: str) -> "RouterAdvertBatchBuilder":
        return self.add_set(self.m.get_interface_dnssl(interface, domain))

    def delete_interface_dnssl(self, interface: str, domain: str) -> "RouterAdvertBatchBuilder":
        return self.add_delete(self.m.get_interface_dnssl(interface, domain))

    def set_interface_hop_limit(self, interface: str, value: str) -> "RouterAdvertBatchBuilder":
        return self.add_set(self.m.get_interface_hop_limit(interface, value))

    def delete_interface_hop_limit(self, interface: str) -> "RouterAdvertBatchBuilder":
        return self.add_delete(self.m.get_interface_hop_limit_path(interface))

    def set_interface_interval_max(self, interface: str, value: str) -> "RouterAdvertBatchBuilder":
        return self.add_set(self.m.get_interface_interval_max(interface, value))

    def delete_interface_interval_max(self, interface: str) -> "RouterAdvertBatchBuilder":
        return self.add_delete(self.m.get_interface_interval_max_path(interface))

    def set_interface_interval_min(self, interface: str, value: str) -> "RouterAdvertBatchBuilder":
        return self.add_set(self.m.get_interface_interval_min(interface, value))

    def delete_interface_interval_min(self, interface: str) -> "RouterAdvertBatchBuilder":
        return self.add_delete(self.m.get_interface_interval_min_path(interface))

    def set_interface_link_mtu(self, interface: str, value: str) -> "RouterAdvertBatchBuilder":
        return self.add_set(self.m.get_interface_link_mtu(interface, value))

    def delete_interface_link_mtu(self, interface: str) -> "RouterAdvertBatchBuilder":
        return self.add_delete(self.m.get_interface_link_mtu_path(interface))

    def set_interface_managed_flag(self, interface: str) -> "RouterAdvertBatchBuilder":
        return self.add_set(self.m.get_interface_managed_flag(interface))

    def delete_interface_managed_flag(self, interface: str) -> "RouterAdvertBatchBuilder":
        return self.add_delete(self.m.get_interface_managed_flag(interface))

    def set_interface_name_server(self, interface: str, address: str) -> "RouterAdvertBatchBuilder":
        return self.add_set(self.m.get_interface_name_server(interface, address))

    def delete_interface_name_server(self, interface: str, address: str) -> "RouterAdvertBatchBuilder":
        return self.add_delete(self.m.get_interface_name_server(interface, address))

    def set_interface_name_server_lifetime(self, interface: str, value: str) -> "RouterAdvertBatchBuilder":
        return self.add_set(self.m.get_interface_name_server_lifetime(interface, value))

    def delete_interface_name_server_lifetime(self, interface: str) -> "RouterAdvertBatchBuilder":
        return self.add_delete(self.m.get_interface_name_server_lifetime_path(interface))

    def set_interface_no_send_advert(self, interface: str) -> "RouterAdvertBatchBuilder":
        return self.add_set(self.m.get_interface_no_send_advert(interface))

    def delete_interface_no_send_advert(self, interface: str) -> "RouterAdvertBatchBuilder":
        return self.add_delete(self.m.get_interface_no_send_advert(interface))

    def set_interface_no_send_interval(self, interface: str) -> "RouterAdvertBatchBuilder":
        return self.add_set(self.m.get_interface_no_send_interval(interface))

    def delete_interface_no_send_interval(self, interface: str) -> "RouterAdvertBatchBuilder":
        return self.add_delete(self.m.get_interface_no_send_interval(interface))

    def set_interface_other_config_flag(self, interface: str) -> "RouterAdvertBatchBuilder":
        return self.add_set(self.m.get_interface_other_config_flag(interface))

    def delete_interface_other_config_flag(self, interface: str) -> "RouterAdvertBatchBuilder":
        return self.add_delete(self.m.get_interface_other_config_flag(interface))

    def set_interface_reachable_time(self, interface: str, value: str) -> "RouterAdvertBatchBuilder":
        return self.add_set(self.m.get_interface_reachable_time(interface, value))

    def delete_interface_reachable_time(self, interface: str) -> "RouterAdvertBatchBuilder":
        return self.add_delete(self.m.get_interface_reachable_time_path(interface))

    def set_interface_retrans_timer(self, interface: str, value: str) -> "RouterAdvertBatchBuilder":
        return self.add_set(self.m.get_interface_retrans_timer(interface, value))

    def delete_interface_retrans_timer(self, interface: str) -> "RouterAdvertBatchBuilder":
        return self.add_delete(self.m.get_interface_retrans_timer_path(interface))

    def set_interface_source_address(self, interface: str, address: str) -> "RouterAdvertBatchBuilder":
        return self.add_set(self.m.get_interface_source_address(interface, address))

    def delete_interface_source_address(self, interface: str, address: str) -> "RouterAdvertBatchBuilder":
        return self.add_delete(self.m.get_interface_source_address(interface, address))

    # ========================================================================
    # RA prefix operations
    # ========================================================================

    def set_prefix(self, interface: str, prefix: str) -> "RouterAdvertBatchBuilder":
        return self.add_set(self.m.get_prefix_path(interface, prefix))

    def delete_prefix(self, interface: str, prefix: str) -> "RouterAdvertBatchBuilder":
        return self.add_delete(self.m.get_prefix_path(interface, prefix))

    def set_prefix_base_interface(self, interface: str, prefix: str, value: str) -> "RouterAdvertBatchBuilder":
        return self.add_set(self.m.get_prefix_base_interface(interface, prefix, value))

    def delete_prefix_base_interface(self, interface: str, prefix: str) -> "RouterAdvertBatchBuilder":
        return self.add_delete(self.m.get_prefix_base_interface_path(interface, prefix))

    def set_prefix_decrement_lifetime(self, interface: str, prefix: str) -> "RouterAdvertBatchBuilder":
        return self.add_set(self.m.get_prefix_decrement_lifetime(interface, prefix))

    def delete_prefix_decrement_lifetime(self, interface: str, prefix: str) -> "RouterAdvertBatchBuilder":
        return self.add_delete(self.m.get_prefix_decrement_lifetime(interface, prefix))

    def set_prefix_deprecate_prefix(self, interface: str, prefix: str) -> "RouterAdvertBatchBuilder":
        return self.add_set(self.m.get_prefix_deprecate_prefix(interface, prefix))

    def delete_prefix_deprecate_prefix(self, interface: str, prefix: str) -> "RouterAdvertBatchBuilder":
        return self.add_delete(self.m.get_prefix_deprecate_prefix(interface, prefix))

    def set_prefix_no_autonomous_flag(self, interface: str, prefix: str) -> "RouterAdvertBatchBuilder":
        return self.add_set(self.m.get_prefix_no_autonomous_flag(interface, prefix))

    def delete_prefix_no_autonomous_flag(self, interface: str, prefix: str) -> "RouterAdvertBatchBuilder":
        return self.add_delete(self.m.get_prefix_no_autonomous_flag(interface, prefix))

    def set_prefix_no_on_link_flag(self, interface: str, prefix: str) -> "RouterAdvertBatchBuilder":
        return self.add_set(self.m.get_prefix_no_on_link_flag(interface, prefix))

    def delete_prefix_no_on_link_flag(self, interface: str, prefix: str) -> "RouterAdvertBatchBuilder":
        return self.add_delete(self.m.get_prefix_no_on_link_flag(interface, prefix))

    def set_prefix_preferred_lifetime(self, interface: str, prefix: str, value: str) -> "RouterAdvertBatchBuilder":
        return self.add_set(self.m.get_prefix_preferred_lifetime(interface, prefix, value))

    def delete_prefix_preferred_lifetime(self, interface: str, prefix: str) -> "RouterAdvertBatchBuilder":
        return self.add_delete(self.m.get_prefix_preferred_lifetime_path(interface, prefix))

    def set_prefix_valid_lifetime(self, interface: str, prefix: str, value: str) -> "RouterAdvertBatchBuilder":
        return self.add_set(self.m.get_prefix_valid_lifetime(interface, prefix, value))

    def delete_prefix_valid_lifetime(self, interface: str, prefix: str) -> "RouterAdvertBatchBuilder":
        return self.add_delete(self.m.get_prefix_valid_lifetime_path(interface, prefix))

    # ========================================================================
    # NAT64 prefix operations
    # ========================================================================

    def set_nat64prefix(self, interface: str, nat64prefix: str) -> "RouterAdvertBatchBuilder":
        return self.add_set(self.m.get_nat64prefix_path(interface, nat64prefix))

    def delete_nat64prefix(self, interface: str, nat64prefix: str) -> "RouterAdvertBatchBuilder":
        return self.add_delete(self.m.get_nat64prefix_path(interface, nat64prefix))

    def set_nat64prefix_valid_lifetime(self, interface: str, nat64prefix: str, value: str) -> "RouterAdvertBatchBuilder":
        return self.add_set(self.m.get_nat64prefix_valid_lifetime(interface, nat64prefix, value))

    def delete_nat64prefix_valid_lifetime(self, interface: str, nat64prefix: str) -> "RouterAdvertBatchBuilder":
        return self.add_delete(self.m.get_nat64prefix_valid_lifetime_path(interface, nat64prefix))

    # ========================================================================
    # Route operations
    # ========================================================================

    def set_route(self, interface: str, route: str) -> "RouterAdvertBatchBuilder":
        return self.add_set(self.m.get_route_path(interface, route))

    def delete_route(self, interface: str, route: str) -> "RouterAdvertBatchBuilder":
        return self.add_delete(self.m.get_route_path(interface, route))

    def set_route_no_remove_route(self, interface: str, route: str) -> "RouterAdvertBatchBuilder":
        return self.add_set(self.m.get_route_no_remove_route(interface, route))

    def delete_route_no_remove_route(self, interface: str, route: str) -> "RouterAdvertBatchBuilder":
        return self.add_delete(self.m.get_route_no_remove_route(interface, route))

    def set_route_preference(self, interface: str, route: str, value: str) -> "RouterAdvertBatchBuilder":
        return self.add_set(self.m.get_route_preference(interface, route, value))

    def delete_route_preference(self, interface: str, route: str) -> "RouterAdvertBatchBuilder":
        return self.add_delete(self.m.get_route_preference_path(interface, route))

    def set_route_valid_lifetime(self, interface: str, route: str, value: str) -> "RouterAdvertBatchBuilder":
        return self.add_set(self.m.get_route_valid_lifetime(interface, route, value))

    def delete_route_valid_lifetime(self, interface: str, route: str) -> "RouterAdvertBatchBuilder":
        return self.add_delete(self.m.get_route_valid_lifetime_path(interface, route))

    # ========================================================================
    # Capabilities
    # ========================================================================

    def get_capabilities(self) -> Dict[str, Any]:
        is_1_4 = "1.4" in self.version
        is_1_5 = not is_1_4

        return {
            "version": self.version,
            "features": {
                "interface": {"supported": True, "description": "RA listener interface"},
                "auto_ignore": {"supported": True, "description": "IPv6 prefixes excluded from RAs (use with ::/64 wildcard)"},
                "captive_portal": {"supported": is_1_5, "description": "Captive portal API endpoint (1.5+)"},
                "default_lifetime": {"supported": True, "description": "Default router lifetime (0 or 4-9000 seconds)"},
                "default_preference": {"supported": True, "description": "Default router preference (low/medium/high)"},
                "dnssl": {"supported": True, "description": "DNS search list domains"},
                "hop_limit": {"supported": True, "description": "IP hop count for outgoing packets (0-255)"},
                "interval_max": {"supported": True, "description": "Maximum RA interval (4-1800 seconds)"},
                "interval_min": {"supported": True, "description": "Minimum RA interval (3-1350 seconds)"},
                "link_mtu": {"supported": True, "description": "Link MTU in RAs (1280-9000)"},
                "managed_flag": {"supported": True, "description": "M-flag: hosts use DHCPv6 for address autoconfiguration"},
                "name_server": {"supported": True, "description": "RDNSS IPv6 addresses"},
                "name_server_lifetime": {"supported": True, "description": "RDNSS entry lifetime (0 or 1-7200 seconds)"},
                "nat64prefix": {"supported": True, "description": "NAT64 prefix advertised in RAs"},
                "nat64prefix_valid_lifetime": {"supported": True, "description": "NAT64 prefix valid lifetime (4-65528 seconds or infinity)"},
                "no_send_advert": {"supported": True, "description": "Suppress sending router advertisements"},
                "no_send_interval": {"supported": True, "description": "Suppress Advertisement Interval option in RAs"},
                "other_config_flag": {"supported": True, "description": "O-flag: hosts use DHCPv6 for other configuration"},
                "prefix": {"supported": True, "description": "IPv6 prefix advertised in RAs"},
                "prefix_base_interface": {"supported": is_1_5, "description": "Combine prefix with address of interface (DHCPv6-PD, 1.5+)"},
                "prefix_decrement_lifetime": {"supported": True, "description": "Decrement prefix lifetime since last RA (use with DHCPv6-PD)"},
                "prefix_deprecate_prefix": {"supported": True, "description": "Deprecate prefix on shutdown"},
                "prefix_no_autonomous_flag": {"supported": True, "description": "Prefix not usable for SLAAC"},
                "prefix_no_on_link_flag": {"supported": True, "description": "Prefix not usable for on-link determination"},
                "prefix_preferred_lifetime": {"supported": True, "description": "Prefix preferred lifetime (seconds or infinity)"},
                "prefix_valid_lifetime": {"supported": True, "description": "Prefix valid lifetime (seconds or infinity)"},
                "reachable_time": {"supported": True, "description": "Neighbor reachability time in RAs (0 or 1-3600000 ms)"},
                "retrans_timer": {"supported": True, "description": "NS retransmission interval (0 or 1-4294967295 ms)"},
                "route": {"supported": True, "description": "IPv6 route advertised in RAs"},
                "route_no_remove_route": {"supported": True, "description": "Do not withdraw route with zero lifetime on shutdown"},
                "route_preference": {"supported": True, "description": "Advertised route preference (low/medium/high)"},
                "route_valid_lifetime": {"supported": True, "description": "Route valid lifetime (seconds or infinity)"},
                "source_address": {"supported": True, "description": "Source IPv6 addresses for RAs (useful with VRRP)"},
            },
            "version_info": {
                "is_1_4": is_1_4,
                "is_1_5": is_1_5,
            },
        }
