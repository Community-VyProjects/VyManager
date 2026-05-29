"""
Router Advertisement (RA) Command Mapper

Config tree:
  service router-advert
    interface <iface>
      auto-ignore <prefix>          (multi)
      captive-portal <url>          (1.5 only)
      default-lifetime <0|4-9000>
      default-preference <low|medium|high>
      dnssl <domain>                (multi)
      hop-limit <0-255>
      interval
        max <4-1800>
        min <3-1350>
      link-mtu <1280-9000>
      managed-flag
      name-server <ipv6>            (multi)
      name-server-lifetime <0|1-7200>
      nat64prefix <prefix>
        valid-lifetime <4-65528|infinity>
      no-send-advert
      no-send-interval
      other-config-flag
      prefix <prefix>
        base-interface <iface>      (1.5 only)
        decrement-lifetime
        deprecate-prefix
        no-autonomous-flag
        no-on-link-flag
        preferred-lifetime <u32|infinity>
        valid-lifetime <u32|infinity>
      reachable-time <0|1-3600000>
      retrans-timer <0|1-4294967295>
      route <route>
        no-remove-route
        route-preference <low|medium|high>
        valid-lifetime <u32|infinity>
      source-address <ipv6>         (multi)
"""

from typing import List
from ..base import BaseFeatureMapper

BASE = ["service", "router-advert"]


class RouterAdvertMapper(BaseFeatureMapper):
    def __init__(self, version: str):
        super().__init__(version)

    # ========================================================================
    # Interface paths
    # ========================================================================

    def get_interface_path(self, interface: str) -> List[str]:
        return BASE + ["interface", interface]

    def get_interface_auto_ignore(self, interface: str, prefix: str) -> List[str]:
        return BASE + ["interface", interface, "auto-ignore", prefix]

    def get_interface_captive_portal(self, interface: str, value: str) -> List[str]:
        return BASE + ["interface", interface, "captive-portal", value]

    def get_interface_captive_portal_path(self, interface: str) -> List[str]:
        return BASE + ["interface", interface, "captive-portal"]

    def get_interface_default_lifetime(self, interface: str, value: str) -> List[str]:
        return BASE + ["interface", interface, "default-lifetime", value]

    def get_interface_default_lifetime_path(self, interface: str) -> List[str]:
        return BASE + ["interface", interface, "default-lifetime"]

    def get_interface_default_preference(self, interface: str, value: str) -> List[str]:
        return BASE + ["interface", interface, "default-preference", value]

    def get_interface_default_preference_path(self, interface: str) -> List[str]:
        return BASE + ["interface", interface, "default-preference"]

    def get_interface_dnssl(self, interface: str, domain: str) -> List[str]:
        return BASE + ["interface", interface, "dnssl", domain]

    def get_interface_hop_limit(self, interface: str, value: str) -> List[str]:
        return BASE + ["interface", interface, "hop-limit", value]

    def get_interface_hop_limit_path(self, interface: str) -> List[str]:
        return BASE + ["interface", interface, "hop-limit"]

    def get_interface_interval_max(self, interface: str, value: str) -> List[str]:
        return BASE + ["interface", interface, "interval", "max", value]

    def get_interface_interval_max_path(self, interface: str) -> List[str]:
        return BASE + ["interface", interface, "interval", "max"]

    def get_interface_interval_min(self, interface: str, value: str) -> List[str]:
        return BASE + ["interface", interface, "interval", "min", value]

    def get_interface_interval_min_path(self, interface: str) -> List[str]:
        return BASE + ["interface", interface, "interval", "min"]

    def get_interface_link_mtu(self, interface: str, value: str) -> List[str]:
        return BASE + ["interface", interface, "link-mtu", value]

    def get_interface_link_mtu_path(self, interface: str) -> List[str]:
        return BASE + ["interface", interface, "link-mtu"]

    def get_interface_managed_flag(self, interface: str) -> List[str]:
        return BASE + ["interface", interface, "managed-flag"]

    def get_interface_name_server(self, interface: str, address: str) -> List[str]:
        return BASE + ["interface", interface, "name-server", address]

    def get_interface_name_server_lifetime(self, interface: str, value: str) -> List[str]:
        return BASE + ["interface", interface, "name-server-lifetime", value]

    def get_interface_name_server_lifetime_path(self, interface: str) -> List[str]:
        return BASE + ["interface", interface, "name-server-lifetime"]

    def get_interface_no_send_advert(self, interface: str) -> List[str]:
        return BASE + ["interface", interface, "no-send-advert"]

    def get_interface_no_send_interval(self, interface: str) -> List[str]:
        return BASE + ["interface", interface, "no-send-interval"]

    def get_interface_other_config_flag(self, interface: str) -> List[str]:
        return BASE + ["interface", interface, "other-config-flag"]

    def get_interface_reachable_time(self, interface: str, value: str) -> List[str]:
        return BASE + ["interface", interface, "reachable-time", value]

    def get_interface_reachable_time_path(self, interface: str) -> List[str]:
        return BASE + ["interface", interface, "reachable-time"]

    def get_interface_retrans_timer(self, interface: str, value: str) -> List[str]:
        return BASE + ["interface", interface, "retrans-timer", value]

    def get_interface_retrans_timer_path(self, interface: str) -> List[str]:
        return BASE + ["interface", interface, "retrans-timer"]

    def get_interface_source_address(self, interface: str, address: str) -> List[str]:
        return BASE + ["interface", interface, "source-address", address]

    # ========================================================================
    # RA prefix paths
    # ========================================================================

    def get_prefix_path(self, interface: str, prefix: str) -> List[str]:
        return BASE + ["interface", interface, "prefix", prefix]

    def get_prefix_base_interface(self, interface: str, prefix: str, value: str) -> List[str]:
        return BASE + ["interface", interface, "prefix", prefix, "base-interface", value]

    def get_prefix_base_interface_path(self, interface: str, prefix: str) -> List[str]:
        return BASE + ["interface", interface, "prefix", prefix, "base-interface"]

    def get_prefix_decrement_lifetime(self, interface: str, prefix: str) -> List[str]:
        return BASE + ["interface", interface, "prefix", prefix, "decrement-lifetime"]

    def get_prefix_deprecate_prefix(self, interface: str, prefix: str) -> List[str]:
        return BASE + ["interface", interface, "prefix", prefix, "deprecate-prefix"]

    def get_prefix_no_autonomous_flag(self, interface: str, prefix: str) -> List[str]:
        return BASE + ["interface", interface, "prefix", prefix, "no-autonomous-flag"]

    def get_prefix_no_on_link_flag(self, interface: str, prefix: str) -> List[str]:
        return BASE + ["interface", interface, "prefix", prefix, "no-on-link-flag"]

    def get_prefix_preferred_lifetime(self, interface: str, prefix: str, value: str) -> List[str]:
        return BASE + ["interface", interface, "prefix", prefix, "preferred-lifetime", value]

    def get_prefix_preferred_lifetime_path(self, interface: str, prefix: str) -> List[str]:
        return BASE + ["interface", interface, "prefix", prefix, "preferred-lifetime"]

    def get_prefix_valid_lifetime(self, interface: str, prefix: str, value: str) -> List[str]:
        return BASE + ["interface", interface, "prefix", prefix, "valid-lifetime", value]

    def get_prefix_valid_lifetime_path(self, interface: str, prefix: str) -> List[str]:
        return BASE + ["interface", interface, "prefix", prefix, "valid-lifetime"]

    # ========================================================================
    # NAT64 prefix paths
    # ========================================================================

    def get_nat64prefix_path(self, interface: str, nat64prefix: str) -> List[str]:
        return BASE + ["interface", interface, "nat64prefix", nat64prefix]

    def get_nat64prefix_valid_lifetime(self, interface: str, nat64prefix: str, value: str) -> List[str]:
        return BASE + ["interface", interface, "nat64prefix", nat64prefix, "valid-lifetime", value]

    def get_nat64prefix_valid_lifetime_path(self, interface: str, nat64prefix: str) -> List[str]:
        return BASE + ["interface", interface, "nat64prefix", nat64prefix, "valid-lifetime"]

    # ========================================================================
    # Route paths
    # ========================================================================

    def get_route_path(self, interface: str, route: str) -> List[str]:
        return BASE + ["interface", interface, "route", route]

    def get_route_no_remove_route(self, interface: str, route: str) -> List[str]:
        return BASE + ["interface", interface, "route", route, "no-remove-route"]

    def get_route_preference(self, interface: str, route: str, value: str) -> List[str]:
        return BASE + ["interface", interface, "route", route, "route-preference", value]

    def get_route_preference_path(self, interface: str, route: str) -> List[str]:
        return BASE + ["interface", interface, "route", route, "route-preference"]

    def get_route_valid_lifetime(self, interface: str, route: str, value: str) -> List[str]:
        return BASE + ["interface", interface, "route", route, "valid-lifetime", value]

    def get_route_valid_lifetime_path(self, interface: str, route: str) -> List[str]:
        return BASE + ["interface", interface, "route", route, "valid-lifetime"]
