"""
VRF DHCPv6 Server Command Mapper

Handles command path generation for DHCPv6 server configuration within VRF instances.
VyOS 1.5+ only.

Config tree: vrf name <NAME> service dhcpv6-server
  disable
  disable-route-autoinstall
  global-parameters (raw params)
  listen-interface (list)
  preference (value)
  shared-network-name/<NET>/
    description
    disable
    interface (list)
    option/ (name-server, domain-search, nis-domain, nis-server,
             nisplus-domain, nisplus-server, sntp-server, sip-server)
    subnet/<PREFIX>/
      description
      disable
      domain-search (list)
      lease-time/ (default, maximum, minimum)
      name-server (list)
      nis-domain
      nis-server (list)
      nisplus-domain
      nisplus-server (list)
      option/ (same as shared-network-name options)
      prefix-delegation/
        prefix/<PREFIX>/ (delegated-length, excluded-prefix,
                          excluded-prefix-length, prefix-length)
      range/<RANGE_NAME>/ (prefix, start, stop)
      sip-server (list)
      sntp-server (list)
      static-mapping/<HOST>/
        description
        disable
        identifier/ (duid)
        ipv6-address
        ipv6-prefix
        option/ (same options)
      vendor-option/
        cisco/ (tftp-server, bootfile)
"""

from typing import List


class VrfDhcpv6Mapper:
    """Mapper for VRF DHCPv6 server paths. VyOS 1.5+ only."""

    def _base(self, name: str) -> List[str]:
        return ["vrf", "name", name, "service", "dhcpv6-server"]

    # ========================================================================
    # DHCPv6 Root
    # ========================================================================

    def get_dhcpv6(self, name: str) -> List[str]:
        return self._base(name)

    # ========================================================================
    # Global DHCPv6 Server Settings
    # ========================================================================

    def get_dhcpv6_disable(self, name: str) -> List[str]:
        return self._base(name) + ["disable"]

    def get_dhcpv6_disable_route_autoinstall(self, name: str) -> List[str]:
        return self._base(name) + ["disable-route-autoinstall"]

    def get_dhcpv6_global_parameters(self, name: str, value: str) -> List[str]:
        return self._base(name) + ["global-parameters", value]

    def get_dhcpv6_listen_interface(self, name: str, iface: str) -> List[str]:
        return self._base(name) + ["listen-interface", iface]

    def get_dhcpv6_preference(self, name: str, value: str) -> List[str]:
        return self._base(name) + ["preference", value]

    # ========================================================================
    # Shared Network Name Paths
    # ========================================================================

    def get_dhcpv6_shared_network(self, name: str, network: str) -> List[str]:
        return self._base(name) + ["shared-network-name", network]

    def get_dhcpv6_shared_network_description(
        self, name: str, network: str, value: str
    ) -> List[str]:
        return self._base(name) + ["shared-network-name", network, "description", value]

    def get_dhcpv6_shared_network_disable(self, name: str, network: str) -> List[str]:
        return self._base(name) + ["shared-network-name", network, "disable"]

    def get_dhcpv6_shared_network_interface(
        self, name: str, network: str, iface: str
    ) -> List[str]:
        return self._base(name) + ["shared-network-name", network, "interface", iface]

    # --- Shared network option ---

    def get_dhcpv6_shared_network_option_name_server(
        self, name: str, network: str, value: str
    ) -> List[str]:
        return self._base(name) + [
            "shared-network-name", network, "option", "name-server", value,
        ]

    def get_dhcpv6_shared_network_option_domain_search(
        self, name: str, network: str, value: str
    ) -> List[str]:
        return self._base(name) + [
            "shared-network-name", network, "option", "domain-search", value,
        ]

    def get_dhcpv6_shared_network_option_nis_domain(
        self, name: str, network: str, value: str
    ) -> List[str]:
        return self._base(name) + [
            "shared-network-name", network, "option", "nis-domain", value,
        ]

    def get_dhcpv6_shared_network_option_nis_server(
        self, name: str, network: str, value: str
    ) -> List[str]:
        return self._base(name) + [
            "shared-network-name", network, "option", "nis-server", value,
        ]

    def get_dhcpv6_shared_network_option_nisplus_domain(
        self, name: str, network: str, value: str
    ) -> List[str]:
        return self._base(name) + [
            "shared-network-name", network, "option", "nisplus-domain", value,
        ]

    def get_dhcpv6_shared_network_option_nisplus_server(
        self, name: str, network: str, value: str
    ) -> List[str]:
        return self._base(name) + [
            "shared-network-name", network, "option", "nisplus-server", value,
        ]

    def get_dhcpv6_shared_network_option_sntp_server(
        self, name: str, network: str, value: str
    ) -> List[str]:
        return self._base(name) + [
            "shared-network-name", network, "option", "sntp-server", value,
        ]

    def get_dhcpv6_shared_network_option_sip_server(
        self, name: str, network: str, value: str
    ) -> List[str]:
        return self._base(name) + [
            "shared-network-name", network, "option", "sip-server", value,
        ]

    # ========================================================================
    # Subnet Paths
    # ========================================================================

    def get_dhcpv6_subnet(self, name: str, network: str, prefix: str) -> List[str]:
        return self._base(name) + ["shared-network-name", network, "subnet", prefix]

    def get_dhcpv6_subnet_description(
        self, name: str, network: str, prefix: str, value: str
    ) -> List[str]:
        return self._base(name) + [
            "shared-network-name", network, "subnet", prefix, "description", value,
        ]

    def get_dhcpv6_subnet_disable(
        self, name: str, network: str, prefix: str
    ) -> List[str]:
        return self._base(name) + [
            "shared-network-name", network, "subnet", prefix, "disable",
        ]

    def get_dhcpv6_subnet_domain_search(
        self, name: str, network: str, prefix: str, value: str
    ) -> List[str]:
        return self._base(name) + [
            "shared-network-name", network, "subnet", prefix, "domain-search", value,
        ]

    # --- Subnet lease-time ---

    def get_dhcpv6_subnet_lease_time_default(
        self, name: str, network: str, prefix: str, value: str
    ) -> List[str]:
        return self._base(name) + [
            "shared-network-name", network, "subnet", prefix,
            "lease-time", "default", value,
        ]

    def get_dhcpv6_subnet_lease_time_maximum(
        self, name: str, network: str, prefix: str, value: str
    ) -> List[str]:
        return self._base(name) + [
            "shared-network-name", network, "subnet", prefix,
            "lease-time", "maximum", value,
        ]

    def get_dhcpv6_subnet_lease_time_minimum(
        self, name: str, network: str, prefix: str, value: str
    ) -> List[str]:
        return self._base(name) + [
            "shared-network-name", network, "subnet", prefix,
            "lease-time", "minimum", value,
        ]

    # --- Subnet name-server ---

    def get_dhcpv6_subnet_name_server(
        self, name: str, network: str, prefix: str, value: str
    ) -> List[str]:
        return self._base(name) + [
            "shared-network-name", network, "subnet", prefix, "name-server", value,
        ]

    # --- Subnet NIS ---

    def get_dhcpv6_subnet_nis_domain(
        self, name: str, network: str, prefix: str, value: str
    ) -> List[str]:
        return self._base(name) + [
            "shared-network-name", network, "subnet", prefix, "nis-domain", value,
        ]

    def get_dhcpv6_subnet_nis_server(
        self, name: str, network: str, prefix: str, value: str
    ) -> List[str]:
        return self._base(name) + [
            "shared-network-name", network, "subnet", prefix, "nis-server", value,
        ]

    # --- Subnet NIS+ ---

    def get_dhcpv6_subnet_nisplus_domain(
        self, name: str, network: str, prefix: str, value: str
    ) -> List[str]:
        return self._base(name) + [
            "shared-network-name", network, "subnet", prefix, "nisplus-domain", value,
        ]

    def get_dhcpv6_subnet_nisplus_server(
        self, name: str, network: str, prefix: str, value: str
    ) -> List[str]:
        return self._base(name) + [
            "shared-network-name", network, "subnet", prefix, "nisplus-server", value,
        ]

    # --- Subnet option ---

    def get_dhcpv6_subnet_option_name_server(
        self, name: str, network: str, prefix: str, value: str
    ) -> List[str]:
        return self._base(name) + [
            "shared-network-name", network, "subnet", prefix,
            "option", "name-server", value,
        ]

    def get_dhcpv6_subnet_option_domain_search(
        self, name: str, network: str, prefix: str, value: str
    ) -> List[str]:
        return self._base(name) + [
            "shared-network-name", network, "subnet", prefix,
            "option", "domain-search", value,
        ]

    def get_dhcpv6_subnet_option_nis_domain(
        self, name: str, network: str, prefix: str, value: str
    ) -> List[str]:
        return self._base(name) + [
            "shared-network-name", network, "subnet", prefix,
            "option", "nis-domain", value,
        ]

    def get_dhcpv6_subnet_option_nis_server(
        self, name: str, network: str, prefix: str, value: str
    ) -> List[str]:
        return self._base(name) + [
            "shared-network-name", network, "subnet", prefix,
            "option", "nis-server", value,
        ]

    def get_dhcpv6_subnet_option_nisplus_domain(
        self, name: str, network: str, prefix: str, value: str
    ) -> List[str]:
        return self._base(name) + [
            "shared-network-name", network, "subnet", prefix,
            "option", "nisplus-domain", value,
        ]

    def get_dhcpv6_subnet_option_nisplus_server(
        self, name: str, network: str, prefix: str, value: str
    ) -> List[str]:
        return self._base(name) + [
            "shared-network-name", network, "subnet", prefix,
            "option", "nisplus-server", value,
        ]

    def get_dhcpv6_subnet_option_sntp_server(
        self, name: str, network: str, prefix: str, value: str
    ) -> List[str]:
        return self._base(name) + [
            "shared-network-name", network, "subnet", prefix,
            "option", "sntp-server", value,
        ]

    def get_dhcpv6_subnet_option_sip_server(
        self, name: str, network: str, prefix: str, value: str
    ) -> List[str]:
        return self._base(name) + [
            "shared-network-name", network, "subnet", prefix,
            "option", "sip-server", value,
        ]

    # --- Subnet SIP/SNTP (top-level, outside option) ---

    def get_dhcpv6_subnet_sip_server(
        self, name: str, network: str, prefix: str, value: str
    ) -> List[str]:
        return self._base(name) + [
            "shared-network-name", network, "subnet", prefix, "sip-server", value,
        ]

    def get_dhcpv6_subnet_sntp_server(
        self, name: str, network: str, prefix: str, value: str
    ) -> List[str]:
        return self._base(name) + [
            "shared-network-name", network, "subnet", prefix, "sntp-server", value,
        ]

    # ========================================================================
    # Prefix Delegation Paths
    # ========================================================================

    def get_dhcpv6_subnet_pd_prefix(
        self, name: str, network: str, subnet: str, pd_prefix: str
    ) -> List[str]:
        return self._base(name) + [
            "shared-network-name", network, "subnet", subnet,
            "prefix-delegation", "prefix", pd_prefix,
        ]

    def get_dhcpv6_subnet_pd_prefix_delegated_length(
        self, name: str, network: str, subnet: str, pd_prefix: str, value: str
    ) -> List[str]:
        return self._base(name) + [
            "shared-network-name", network, "subnet", subnet,
            "prefix-delegation", "prefix", pd_prefix, "delegated-length", value,
        ]

    def get_dhcpv6_subnet_pd_prefix_excluded_prefix(
        self, name: str, network: str, subnet: str, pd_prefix: str, value: str
    ) -> List[str]:
        return self._base(name) + [
            "shared-network-name", network, "subnet", subnet,
            "prefix-delegation", "prefix", pd_prefix, "excluded-prefix", value,
        ]

    def get_dhcpv6_subnet_pd_prefix_excluded_prefix_length(
        self, name: str, network: str, subnet: str, pd_prefix: str, value: str
    ) -> List[str]:
        return self._base(name) + [
            "shared-network-name", network, "subnet", subnet,
            "prefix-delegation", "prefix", pd_prefix, "excluded-prefix-length", value,
        ]

    def get_dhcpv6_subnet_pd_prefix_prefix_length(
        self, name: str, network: str, subnet: str, pd_prefix: str, value: str
    ) -> List[str]:
        return self._base(name) + [
            "shared-network-name", network, "subnet", subnet,
            "prefix-delegation", "prefix", pd_prefix, "prefix-length", value,
        ]

    # ========================================================================
    # Range Paths
    # ========================================================================

    def get_dhcpv6_subnet_range(
        self, name: str, network: str, prefix: str, range_name: str
    ) -> List[str]:
        return self._base(name) + [
            "shared-network-name", network, "subnet", prefix, "range", range_name,
        ]

    def get_dhcpv6_subnet_range_prefix(
        self, name: str, network: str, prefix: str, range_name: str, value: str
    ) -> List[str]:
        return self._base(name) + [
            "shared-network-name", network, "subnet", prefix,
            "range", range_name, "prefix", value,
        ]

    def get_dhcpv6_subnet_range_start(
        self, name: str, network: str, prefix: str, range_name: str, value: str
    ) -> List[str]:
        return self._base(name) + [
            "shared-network-name", network, "subnet", prefix,
            "range", range_name, "start", value,
        ]

    def get_dhcpv6_subnet_range_stop(
        self, name: str, network: str, prefix: str, range_name: str, value: str
    ) -> List[str]:
        return self._base(name) + [
            "shared-network-name", network, "subnet", prefix,
            "range", range_name, "stop", value,
        ]

    # ========================================================================
    # Static Mapping Paths
    # ========================================================================

    def get_dhcpv6_subnet_static_mapping(
        self, name: str, network: str, prefix: str, host: str
    ) -> List[str]:
        return self._base(name) + [
            "shared-network-name", network, "subnet", prefix,
            "static-mapping", host,
        ]

    def get_dhcpv6_subnet_static_mapping_description(
        self, name: str, network: str, prefix: str, host: str, value: str
    ) -> List[str]:
        return self._base(name) + [
            "shared-network-name", network, "subnet", prefix,
            "static-mapping", host, "description", value,
        ]

    def get_dhcpv6_subnet_static_mapping_disable(
        self, name: str, network: str, prefix: str, host: str
    ) -> List[str]:
        return self._base(name) + [
            "shared-network-name", network, "subnet", prefix,
            "static-mapping", host, "disable",
        ]

    def get_dhcpv6_subnet_static_mapping_identifier_duid(
        self, name: str, network: str, prefix: str, host: str, value: str
    ) -> List[str]:
        return self._base(name) + [
            "shared-network-name", network, "subnet", prefix,
            "static-mapping", host, "identifier", "duid", value,
        ]

    def get_dhcpv6_subnet_static_mapping_ipv6_address(
        self, name: str, network: str, prefix: str, host: str, value: str
    ) -> List[str]:
        return self._base(name) + [
            "shared-network-name", network, "subnet", prefix,
            "static-mapping", host, "ipv6-address", value,
        ]

    def get_dhcpv6_subnet_static_mapping_ipv6_prefix(
        self, name: str, network: str, prefix: str, host: str, value: str
    ) -> List[str]:
        return self._base(name) + [
            "shared-network-name", network, "subnet", prefix,
            "static-mapping", host, "ipv6-prefix", value,
        ]

    # --- Static mapping option ---

    def get_dhcpv6_subnet_static_mapping_option_name_server(
        self, name: str, network: str, prefix: str, host: str, value: str
    ) -> List[str]:
        return self._base(name) + [
            "shared-network-name", network, "subnet", prefix,
            "static-mapping", host, "option", "name-server", value,
        ]

    def get_dhcpv6_subnet_static_mapping_option_domain_search(
        self, name: str, network: str, prefix: str, host: str, value: str
    ) -> List[str]:
        return self._base(name) + [
            "shared-network-name", network, "subnet", prefix,
            "static-mapping", host, "option", "domain-search", value,
        ]

    def get_dhcpv6_subnet_static_mapping_option_nis_domain(
        self, name: str, network: str, prefix: str, host: str, value: str
    ) -> List[str]:
        return self._base(name) + [
            "shared-network-name", network, "subnet", prefix,
            "static-mapping", host, "option", "nis-domain", value,
        ]

    def get_dhcpv6_subnet_static_mapping_option_nis_server(
        self, name: str, network: str, prefix: str, host: str, value: str
    ) -> List[str]:
        return self._base(name) + [
            "shared-network-name", network, "subnet", prefix,
            "static-mapping", host, "option", "nis-server", value,
        ]

    def get_dhcpv6_subnet_static_mapping_option_nisplus_domain(
        self, name: str, network: str, prefix: str, host: str, value: str
    ) -> List[str]:
        return self._base(name) + [
            "shared-network-name", network, "subnet", prefix,
            "static-mapping", host, "option", "nisplus-domain", value,
        ]

    def get_dhcpv6_subnet_static_mapping_option_nisplus_server(
        self, name: str, network: str, prefix: str, host: str, value: str
    ) -> List[str]:
        return self._base(name) + [
            "shared-network-name", network, "subnet", prefix,
            "static-mapping", host, "option", "nisplus-server", value,
        ]

    def get_dhcpv6_subnet_static_mapping_option_sntp_server(
        self, name: str, network: str, prefix: str, host: str, value: str
    ) -> List[str]:
        return self._base(name) + [
            "shared-network-name", network, "subnet", prefix,
            "static-mapping", host, "option", "sntp-server", value,
        ]

    def get_dhcpv6_subnet_static_mapping_option_sip_server(
        self, name: str, network: str, prefix: str, host: str, value: str
    ) -> List[str]:
        return self._base(name) + [
            "shared-network-name", network, "subnet", prefix,
            "static-mapping", host, "option", "sip-server", value,
        ]

    # ========================================================================
    # Vendor Option Paths
    # ========================================================================

    def get_dhcpv6_subnet_vendor_option_cisco_tftp_server(
        self, name: str, network: str, prefix: str, value: str
    ) -> List[str]:
        return self._base(name) + [
            "shared-network-name", network, "subnet", prefix,
            "vendor-option", "cisco", "tftp-server", value,
        ]

    def get_dhcpv6_subnet_vendor_option_cisco_bootfile(
        self, name: str, network: str, prefix: str, value: str
    ) -> List[str]:
        return self._base(name) + [
            "shared-network-name", network, "subnet", prefix,
            "vendor-option", "cisco", "bootfile", value,
        ]

    # ========================================================================
    # Extended coverage — scope helpers
    # ========================================================================

    def _sn(self, name: str, network: str) -> List[str]:
        return self._base(name) + ["shared-network-name", network]

    def _subnet(self, name: str, network: str, prefix: str) -> List[str]:
        return self._sn(name, network) + ["subnet", prefix]

    def _range(self, name: str, network: str, prefix: str, rng: str) -> List[str]:
        return self._subnet(name, network, prefix) + ["range", rng]

    def _sm(self, name: str, network: str, prefix: str, host: str) -> List[str]:
        return self._subnet(name, network, prefix) + ["static-mapping", host]

    # ========================================================================
    # Generic option setters (cover captive-portal, capwap-controller,
    # info-refresh-time, and the range scope which has no option methods)
    # ========================================================================

    def get_dhcpv6_shared_network_option(self, name: str, network: str, opt: str, value: str) -> List[str]:
        return self._sn(name, network) + ["option", opt, value]

    def get_dhcpv6_subnet_option(self, name: str, network: str, prefix: str, opt: str, value: str) -> List[str]:
        return self._subnet(name, network, prefix) + ["option", opt, value]

    def get_dhcpv6_subnet_range_option(self, name: str, network: str, prefix: str, rng: str, opt: str, value: str) -> List[str]:
        return self._range(name, network, prefix, rng) + ["option", opt, value]

    def get_dhcpv6_static_mapping_option(self, name: str, network: str, prefix: str, host: str, opt: str, value: str) -> List[str]:
        return self._sm(name, network, prefix, host) + ["option", opt, value]

    # Option vendor-option cisco tftp-server (nested under option) per scope
    def get_dhcpv6_shared_network_option_vendor_cisco_tftp_server(self, name: str, network: str, value: str) -> List[str]:
        return self._sn(name, network) + ["option", "vendor-option", "cisco", "tftp-server", value]

    def get_dhcpv6_subnet_option_vendor_cisco_tftp_server(self, name: str, network: str, prefix: str, value: str) -> List[str]:
        return self._subnet(name, network, prefix) + ["option", "vendor-option", "cisco", "tftp-server", value]

    def get_dhcpv6_subnet_range_option_vendor_cisco_tftp_server(self, name: str, network: str, prefix: str, rng: str, value: str) -> List[str]:
        return self._range(name, network, prefix, rng) + ["option", "vendor-option", "cisco", "tftp-server", value]

    def get_dhcpv6_static_mapping_option_vendor_cisco_tftp_server(self, name: str, network: str, prefix: str, host: str, value: str) -> List[str]:
        return self._sm(name, network, prefix, host) + ["option", "vendor-option", "cisco", "tftp-server", value]

    # ========================================================================
    # Subnet interface / subnet-id; static-mapping duid / mac (direct)
    # ========================================================================

    def get_dhcpv6_subnet_interface(self, name: str, network: str, prefix: str, value: str) -> List[str]:
        return self._subnet(name, network, prefix) + ["interface", value]

    def get_dhcpv6_subnet_id(self, name: str, network: str, prefix: str, value: str) -> List[str]:
        return self._subnet(name, network, prefix) + ["subnet-id", value]

    def get_dhcpv6_subnet_static_mapping_duid(self, name: str, network: str, prefix: str, host: str, value: str) -> List[str]:
        return self._sm(name, network, prefix, host) + ["duid", value]

    def get_dhcpv6_subnet_static_mapping_mac(self, name: str, network: str, prefix: str, host: str, value: str) -> List[str]:
        return self._sm(name, network, prefix, host) + ["mac", value]
