"""
VRF DHCP Server Command Mapper

Handles command path generation for DHCP server configuration within VRF instances.
VyOS 1.5+ only. In VyOS 1.5, DHCP server options use the 'option' prefix for most
settings (default-router, name-server, domain-name, etc.).

Config tree: vrf name <NAME> service dhcp-server
  disable
  dynamic-dns-update/{enable, dns-server, domain-name}
  global-parameters (array)
  high-availability/{mode, name, remote, source-address, status}
  listen-address (list)
  listen-interface (list)
  shared-network-name/<NET>/
    authoritative
    description
    disable
    domain-name
    domain-search (list)
    name-server (list)
    ntp-server (list)
    option/{bootfile-name, bootfile-server, bootfile-size, client-prefix-length,
            default-router, domain-name, domain-search, ip-forwarding, name-server,
            ntp-server, pop-server, smtp-server, static-route, tftp-server-name,
            time-offset, time-server, time-zone, wins-server, wpad-url, vendor-option}
    ping-check
    subnet/<PREFIX>/
      default-router
      description
      disable
      domain-name
      domain-search (list)
      exclude (list)
      lease/{default, max, min}
      name-server (list)
      ntp-server (list)
      option/{same as shared-network-name options}
      range/<RANGE_NAME>/{start, stop}
      static-mapping/<HOST>/
        description
        disable
        ip-address
        mac-address
        option/{same options}
"""

from typing import List


class VrfDhcpMapper:
    """Mapper for VRF DHCP server paths. VyOS 1.5+ only."""

    def _base(self, name: str) -> List[str]:
        return ["vrf", "name", name, "service", "dhcp-server"]

    # ========================================================================
    # DHCP Server Root
    # ========================================================================

    def get_dhcp(self, name: str) -> List[str]:
        return self._base(name)

    def get_dhcp_disable(self, name: str) -> List[str]:
        return self._base(name) + ["disable"]

    # ========================================================================
    # Dynamic DNS Update
    # ========================================================================

    def get_dhcp_dynamic_dns_update_enable(self, name: str) -> List[str]:
        return self._base(name) + ["dynamic-dns-update", "enable"]

    def get_dhcp_dynamic_dns_update_dns_server(self, name: str, value: str) -> List[str]:
        return self._base(name) + ["dynamic-dns-update", "dns-server", value]

    def get_dhcp_dynamic_dns_update_domain_name(self, name: str, value: str) -> List[str]:
        return self._base(name) + ["dynamic-dns-update", "domain-name", value]

    # ========================================================================
    # Global Parameters
    # ========================================================================

    def get_dhcp_global_parameters(self, name: str, value: str) -> List[str]:
        return self._base(name) + ["global-parameters", value]

    # ========================================================================
    # High Availability
    # ========================================================================

    def get_dhcp_ha(self, name: str) -> List[str]:
        return self._base(name) + ["high-availability"]

    def get_dhcp_ha_mode(self, name: str, value: str) -> List[str]:
        return self._base(name) + ["high-availability", "mode", value]

    def get_dhcp_ha_name(self, name: str, value: str) -> List[str]:
        return self._base(name) + ["high-availability", "name", value]

    def get_dhcp_ha_remote(self, name: str, value: str) -> List[str]:
        return self._base(name) + ["high-availability", "remote", value]

    def get_dhcp_ha_source_address(self, name: str, value: str) -> List[str]:
        return self._base(name) + ["high-availability", "source-address", value]

    def get_dhcp_ha_status(self, name: str, value: str) -> List[str]:
        return self._base(name) + ["high-availability", "status", value]

    # ========================================================================
    # Listen Address / Interface
    # ========================================================================

    def get_dhcp_listen_address(self, name: str, value: str) -> List[str]:
        return self._base(name) + ["listen-address", value]

    def get_dhcp_listen_interface(self, name: str, value: str) -> List[str]:
        return self._base(name) + ["listen-interface", value]

    # ========================================================================
    # Shared Network
    # ========================================================================

    def get_dhcp_shared_network(self, name: str, network: str) -> List[str]:
        return self._base(name) + ["shared-network-name", network]

    def get_dhcp_shared_network_authoritative(self, name: str, network: str) -> List[str]:
        return self._base(name) + ["shared-network-name", network, "authoritative"]

    def get_dhcp_shared_network_description(self, name: str, network: str, value: str) -> List[str]:
        return self._base(name) + ["shared-network-name", network, "description", value]

    def get_dhcp_shared_network_disable(self, name: str, network: str) -> List[str]:
        return self._base(name) + ["shared-network-name", network, "disable"]

    def get_dhcp_shared_network_domain_name(self, name: str, network: str, value: str) -> List[str]:
        return self._base(name) + ["shared-network-name", network, "domain-name", value]

    def get_dhcp_shared_network_domain_search(self, name: str, network: str, value: str) -> List[str]:
        return self._base(name) + ["shared-network-name", network, "domain-search", value]

    def get_dhcp_shared_network_name_server(self, name: str, network: str, value: str) -> List[str]:
        return self._base(name) + ["shared-network-name", network, "name-server", value]

    def get_dhcp_shared_network_ntp_server(self, name: str, network: str, value: str) -> List[str]:
        return self._base(name) + ["shared-network-name", network, "ntp-server", value]

    def get_dhcp_shared_network_ping_check(self, name: str, network: str) -> List[str]:
        return self._base(name) + ["shared-network-name", network, "ping-check"]

    # ========================================================================
    # Shared Network Options
    # ========================================================================

    def get_dhcp_shared_network_option_bootfile_name(self, name: str, network: str, value: str) -> List[str]:
        return self._base(name) + ["shared-network-name", network, "option", "bootfile-name", value]

    def get_dhcp_shared_network_option_bootfile_server(self, name: str, network: str, value: str) -> List[str]:
        return self._base(name) + ["shared-network-name", network, "option", "bootfile-server", value]

    def get_dhcp_shared_network_option_bootfile_size(self, name: str, network: str, value: str) -> List[str]:
        return self._base(name) + ["shared-network-name", network, "option", "bootfile-size", value]

    def get_dhcp_shared_network_option_client_prefix_length(self, name: str, network: str, value: str) -> List[str]:
        return self._base(name) + ["shared-network-name", network, "option", "client-prefix-length", value]

    def get_dhcp_shared_network_option_default_router(self, name: str, network: str, value: str) -> List[str]:
        return self._base(name) + ["shared-network-name", network, "option", "default-router", value]

    def get_dhcp_shared_network_option_domain_name(self, name: str, network: str, value: str) -> List[str]:
        return self._base(name) + ["shared-network-name", network, "option", "domain-name", value]

    def get_dhcp_shared_network_option_domain_search(self, name: str, network: str, value: str) -> List[str]:
        return self._base(name) + ["shared-network-name", network, "option", "domain-search", value]

    def get_dhcp_shared_network_option_ip_forwarding(self, name: str, network: str) -> List[str]:
        return self._base(name) + ["shared-network-name", network, "option", "ip-forwarding"]

    def get_dhcp_shared_network_option_name_server(self, name: str, network: str, value: str) -> List[str]:
        return self._base(name) + ["shared-network-name", network, "option", "name-server", value]

    def get_dhcp_shared_network_option_ntp_server(self, name: str, network: str, value: str) -> List[str]:
        return self._base(name) + ["shared-network-name", network, "option", "ntp-server", value]

    def get_dhcp_shared_network_option_pop_server(self, name: str, network: str, value: str) -> List[str]:
        return self._base(name) + ["shared-network-name", network, "option", "pop-server", value]

    def get_dhcp_shared_network_option_smtp_server(self, name: str, network: str, value: str) -> List[str]:
        return self._base(name) + ["shared-network-name", network, "option", "smtp-server", value]

    def get_dhcp_shared_network_option_static_route(self, name: str, network: str, value: str) -> List[str]:
        return self._base(name) + ["shared-network-name", network, "option", "static-route", value]

    def get_dhcp_shared_network_option_tftp_server_name(self, name: str, network: str, value: str) -> List[str]:
        return self._base(name) + ["shared-network-name", network, "option", "tftp-server-name", value]

    def get_dhcp_shared_network_option_time_offset(self, name: str, network: str, value: str) -> List[str]:
        return self._base(name) + ["shared-network-name", network, "option", "time-offset", value]

    def get_dhcp_shared_network_option_time_server(self, name: str, network: str, value: str) -> List[str]:
        return self._base(name) + ["shared-network-name", network, "option", "time-server", value]

    def get_dhcp_shared_network_option_time_zone(self, name: str, network: str, value: str) -> List[str]:
        return self._base(name) + ["shared-network-name", network, "option", "time-zone", value]

    def get_dhcp_shared_network_option_wins_server(self, name: str, network: str, value: str) -> List[str]:
        return self._base(name) + ["shared-network-name", network, "option", "wins-server", value]

    def get_dhcp_shared_network_option_wpad_url(self, name: str, network: str, value: str) -> List[str]:
        return self._base(name) + ["shared-network-name", network, "option", "wpad-url", value]

    def get_dhcp_shared_network_option_vendor_option(self, name: str, network: str) -> List[str]:
        return self._base(name) + ["shared-network-name", network, "option", "vendor-option"]

    # ========================================================================
    # Subnet
    # ========================================================================

    def get_dhcp_subnet(self, name: str, network: str, prefix: str) -> List[str]:
        return self._base(name) + ["shared-network-name", network, "subnet", prefix]

    def get_dhcp_subnet_default_router(self, name: str, network: str, prefix: str, value: str) -> List[str]:
        return self._base(name) + ["shared-network-name", network, "subnet", prefix, "default-router", value]

    def get_dhcp_subnet_description(self, name: str, network: str, prefix: str, value: str) -> List[str]:
        return self._base(name) + ["shared-network-name", network, "subnet", prefix, "description", value]

    def get_dhcp_subnet_disable(self, name: str, network: str, prefix: str) -> List[str]:
        return self._base(name) + ["shared-network-name", network, "subnet", prefix, "disable"]

    def get_dhcp_subnet_domain_name(self, name: str, network: str, prefix: str, value: str) -> List[str]:
        return self._base(name) + ["shared-network-name", network, "subnet", prefix, "domain-name", value]

    def get_dhcp_subnet_domain_search(self, name: str, network: str, prefix: str, value: str) -> List[str]:
        return self._base(name) + ["shared-network-name", network, "subnet", prefix, "domain-search", value]

    def get_dhcp_subnet_exclude(self, name: str, network: str, prefix: str, value: str) -> List[str]:
        return self._base(name) + ["shared-network-name", network, "subnet", prefix, "exclude", value]

    def get_dhcp_subnet_name_server(self, name: str, network: str, prefix: str, value: str) -> List[str]:
        return self._base(name) + ["shared-network-name", network, "subnet", prefix, "name-server", value]

    def get_dhcp_subnet_ntp_server(self, name: str, network: str, prefix: str, value: str) -> List[str]:
        return self._base(name) + ["shared-network-name", network, "subnet", prefix, "ntp-server", value]

    # ========================================================================
    # Subnet Lease
    # ========================================================================

    def get_dhcp_subnet_lease_default(self, name: str, network: str, prefix: str, value: str) -> List[str]:
        return self._base(name) + ["shared-network-name", network, "subnet", prefix, "lease", "default", value]

    def get_dhcp_subnet_lease_max(self, name: str, network: str, prefix: str, value: str) -> List[str]:
        return self._base(name) + ["shared-network-name", network, "subnet", prefix, "lease", "max", value]

    def get_dhcp_subnet_lease_min(self, name: str, network: str, prefix: str, value: str) -> List[str]:
        return self._base(name) + ["shared-network-name", network, "subnet", prefix, "lease", "min", value]

    # ========================================================================
    # Subnet Options
    # ========================================================================

    def get_dhcp_subnet_option_bootfile_name(self, name: str, network: str, prefix: str, value: str) -> List[str]:
        return self._base(name) + ["shared-network-name", network, "subnet", prefix, "option", "bootfile-name", value]

    def get_dhcp_subnet_option_bootfile_server(self, name: str, network: str, prefix: str, value: str) -> List[str]:
        return self._base(name) + ["shared-network-name", network, "subnet", prefix, "option", "bootfile-server", value]

    def get_dhcp_subnet_option_bootfile_size(self, name: str, network: str, prefix: str, value: str) -> List[str]:
        return self._base(name) + ["shared-network-name", network, "subnet", prefix, "option", "bootfile-size", value]

    def get_dhcp_subnet_option_client_prefix_length(self, name: str, network: str, prefix: str, value: str) -> List[str]:
        return self._base(name) + ["shared-network-name", network, "subnet", prefix, "option", "client-prefix-length", value]

    def get_dhcp_subnet_option_default_router(self, name: str, network: str, prefix: str, value: str) -> List[str]:
        return self._base(name) + ["shared-network-name", network, "subnet", prefix, "option", "default-router", value]

    def get_dhcp_subnet_option_domain_name(self, name: str, network: str, prefix: str, value: str) -> List[str]:
        return self._base(name) + ["shared-network-name", network, "subnet", prefix, "option", "domain-name", value]

    def get_dhcp_subnet_option_domain_search(self, name: str, network: str, prefix: str, value: str) -> List[str]:
        return self._base(name) + ["shared-network-name", network, "subnet", prefix, "option", "domain-search", value]

    def get_dhcp_subnet_option_ip_forwarding(self, name: str, network: str, prefix: str) -> List[str]:
        return self._base(name) + ["shared-network-name", network, "subnet", prefix, "option", "ip-forwarding"]

    def get_dhcp_subnet_option_name_server(self, name: str, network: str, prefix: str, value: str) -> List[str]:
        return self._base(name) + ["shared-network-name", network, "subnet", prefix, "option", "name-server", value]

    def get_dhcp_subnet_option_ntp_server(self, name: str, network: str, prefix: str, value: str) -> List[str]:
        return self._base(name) + ["shared-network-name", network, "subnet", prefix, "option", "ntp-server", value]

    def get_dhcp_subnet_option_pop_server(self, name: str, network: str, prefix: str, value: str) -> List[str]:
        return self._base(name) + ["shared-network-name", network, "subnet", prefix, "option", "pop-server", value]

    def get_dhcp_subnet_option_smtp_server(self, name: str, network: str, prefix: str, value: str) -> List[str]:
        return self._base(name) + ["shared-network-name", network, "subnet", prefix, "option", "smtp-server", value]

    def get_dhcp_subnet_option_static_route(self, name: str, network: str, prefix: str, value: str) -> List[str]:
        return self._base(name) + ["shared-network-name", network, "subnet", prefix, "option", "static-route", value]

    def get_dhcp_subnet_option_tftp_server_name(self, name: str, network: str, prefix: str, value: str) -> List[str]:
        return self._base(name) + ["shared-network-name", network, "subnet", prefix, "option", "tftp-server-name", value]

    def get_dhcp_subnet_option_time_offset(self, name: str, network: str, prefix: str, value: str) -> List[str]:
        return self._base(name) + ["shared-network-name", network, "subnet", prefix, "option", "time-offset", value]

    def get_dhcp_subnet_option_time_server(self, name: str, network: str, prefix: str, value: str) -> List[str]:
        return self._base(name) + ["shared-network-name", network, "subnet", prefix, "option", "time-server", value]

    def get_dhcp_subnet_option_time_zone(self, name: str, network: str, prefix: str, value: str) -> List[str]:
        return self._base(name) + ["shared-network-name", network, "subnet", prefix, "option", "time-zone", value]

    def get_dhcp_subnet_option_wins_server(self, name: str, network: str, prefix: str, value: str) -> List[str]:
        return self._base(name) + ["shared-network-name", network, "subnet", prefix, "option", "wins-server", value]

    def get_dhcp_subnet_option_wpad_url(self, name: str, network: str, prefix: str, value: str) -> List[str]:
        return self._base(name) + ["shared-network-name", network, "subnet", prefix, "option", "wpad-url", value]

    def get_dhcp_subnet_option_vendor_option(self, name: str, network: str, prefix: str) -> List[str]:
        return self._base(name) + ["shared-network-name", network, "subnet", prefix, "option", "vendor-option"]

    # ========================================================================
    # Subnet Range
    # ========================================================================

    def get_dhcp_subnet_range(self, name: str, network: str, prefix: str, range_name: str) -> List[str]:
        return self._base(name) + ["shared-network-name", network, "subnet", prefix, "range", range_name]

    def get_dhcp_subnet_range_start(self, name: str, network: str, prefix: str, range_name: str, value: str) -> List[str]:
        return self._base(name) + ["shared-network-name", network, "subnet", prefix, "range", range_name, "start", value]

    def get_dhcp_subnet_range_stop(self, name: str, network: str, prefix: str, range_name: str, value: str) -> List[str]:
        return self._base(name) + ["shared-network-name", network, "subnet", prefix, "range", range_name, "stop", value]

    # ========================================================================
    # Static Mapping
    # ========================================================================

    def get_dhcp_static_mapping(self, name: str, network: str, prefix: str, host: str) -> List[str]:
        return self._base(name) + ["shared-network-name", network, "subnet", prefix, "static-mapping", host]

    def get_dhcp_static_mapping_description(self, name: str, network: str, prefix: str, host: str, value: str) -> List[str]:
        return self._base(name) + ["shared-network-name", network, "subnet", prefix, "static-mapping", host, "description", value]

    def get_dhcp_static_mapping_disable(self, name: str, network: str, prefix: str, host: str) -> List[str]:
        return self._base(name) + ["shared-network-name", network, "subnet", prefix, "static-mapping", host, "disable"]

    def get_dhcp_static_mapping_ip_address(self, name: str, network: str, prefix: str, host: str, value: str) -> List[str]:
        return self._base(name) + ["shared-network-name", network, "subnet", prefix, "static-mapping", host, "ip-address", value]

    def get_dhcp_static_mapping_mac_address(self, name: str, network: str, prefix: str, host: str, value: str) -> List[str]:
        return self._base(name) + ["shared-network-name", network, "subnet", prefix, "static-mapping", host, "mac", value]

    # ========================================================================
    # Static Mapping Options
    # ========================================================================

    def get_dhcp_static_mapping_option_bootfile_name(self, name: str, network: str, prefix: str, host: str, value: str) -> List[str]:
        return self._base(name) + ["shared-network-name", network, "subnet", prefix, "static-mapping", host, "option", "bootfile-name", value]

    def get_dhcp_static_mapping_option_bootfile_server(self, name: str, network: str, prefix: str, host: str, value: str) -> List[str]:
        return self._base(name) + ["shared-network-name", network, "subnet", prefix, "static-mapping", host, "option", "bootfile-server", value]

    def get_dhcp_static_mapping_option_bootfile_size(self, name: str, network: str, prefix: str, host: str, value: str) -> List[str]:
        return self._base(name) + ["shared-network-name", network, "subnet", prefix, "static-mapping", host, "option", "bootfile-size", value]

    def get_dhcp_static_mapping_option_client_prefix_length(self, name: str, network: str, prefix: str, host: str, value: str) -> List[str]:
        return self._base(name) + ["shared-network-name", network, "subnet", prefix, "static-mapping", host, "option", "client-prefix-length", value]

    def get_dhcp_static_mapping_option_default_router(self, name: str, network: str, prefix: str, host: str, value: str) -> List[str]:
        return self._base(name) + ["shared-network-name", network, "subnet", prefix, "static-mapping", host, "option", "default-router", value]

    def get_dhcp_static_mapping_option_domain_name(self, name: str, network: str, prefix: str, host: str, value: str) -> List[str]:
        return self._base(name) + ["shared-network-name", network, "subnet", prefix, "static-mapping", host, "option", "domain-name", value]

    def get_dhcp_static_mapping_option_domain_search(self, name: str, network: str, prefix: str, host: str, value: str) -> List[str]:
        return self._base(name) + ["shared-network-name", network, "subnet", prefix, "static-mapping", host, "option", "domain-search", value]

    def get_dhcp_static_mapping_option_ip_forwarding(self, name: str, network: str, prefix: str, host: str) -> List[str]:
        return self._base(name) + ["shared-network-name", network, "subnet", prefix, "static-mapping", host, "option", "ip-forwarding"]

    def get_dhcp_static_mapping_option_name_server(self, name: str, network: str, prefix: str, host: str, value: str) -> List[str]:
        return self._base(name) + ["shared-network-name", network, "subnet", prefix, "static-mapping", host, "option", "name-server", value]

    def get_dhcp_static_mapping_option_ntp_server(self, name: str, network: str, prefix: str, host: str, value: str) -> List[str]:
        return self._base(name) + ["shared-network-name", network, "subnet", prefix, "static-mapping", host, "option", "ntp-server", value]

    def get_dhcp_static_mapping_option_pop_server(self, name: str, network: str, prefix: str, host: str, value: str) -> List[str]:
        return self._base(name) + ["shared-network-name", network, "subnet", prefix, "static-mapping", host, "option", "pop-server", value]

    def get_dhcp_static_mapping_option_smtp_server(self, name: str, network: str, prefix: str, host: str, value: str) -> List[str]:
        return self._base(name) + ["shared-network-name", network, "subnet", prefix, "static-mapping", host, "option", "smtp-server", value]

    def get_dhcp_static_mapping_option_static_route(self, name: str, network: str, prefix: str, host: str, value: str) -> List[str]:
        return self._base(name) + ["shared-network-name", network, "subnet", prefix, "static-mapping", host, "option", "static-route", value]

    def get_dhcp_static_mapping_option_tftp_server_name(self, name: str, network: str, prefix: str, host: str, value: str) -> List[str]:
        return self._base(name) + ["shared-network-name", network, "subnet", prefix, "static-mapping", host, "option", "tftp-server-name", value]

    def get_dhcp_static_mapping_option_time_offset(self, name: str, network: str, prefix: str, host: str, value: str) -> List[str]:
        return self._base(name) + ["shared-network-name", network, "subnet", prefix, "static-mapping", host, "option", "time-offset", value]

    def get_dhcp_static_mapping_option_time_server(self, name: str, network: str, prefix: str, host: str, value: str) -> List[str]:
        return self._base(name) + ["shared-network-name", network, "subnet", prefix, "static-mapping", host, "option", "time-server", value]

    def get_dhcp_static_mapping_option_time_zone(self, name: str, network: str, prefix: str, host: str, value: str) -> List[str]:
        return self._base(name) + ["shared-network-name", network, "subnet", prefix, "static-mapping", host, "option", "time-zone", value]

    def get_dhcp_static_mapping_option_wins_server(self, name: str, network: str, prefix: str, host: str, value: str) -> List[str]:
        return self._base(name) + ["shared-network-name", network, "subnet", prefix, "static-mapping", host, "option", "wins-server", value]

    def get_dhcp_static_mapping_option_wpad_url(self, name: str, network: str, prefix: str, host: str, value: str) -> List[str]:
        return self._base(name) + ["shared-network-name", network, "subnet", prefix, "static-mapping", host, "option", "wpad-url", value]

    def get_dhcp_static_mapping_option_vendor_option(self, name: str, network: str, prefix: str, host: str) -> List[str]:
        return self._base(name) + ["shared-network-name", network, "subnet", prefix, "static-mapping", host, "option", "vendor-option"]
