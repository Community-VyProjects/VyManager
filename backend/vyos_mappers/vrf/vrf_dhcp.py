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

    # ========================================================================
    # Scope base helpers (for extended coverage)
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
    # Root extras: hostfile-update, HA certificates
    # ========================================================================

    def get_dhcp_hostfile_update(self, name: str) -> List[str]:
        return self._base(name) + ["hostfile-update"]

    def get_dhcp_ha_ca_certificate(self, name: str, value: str) -> List[str]:
        return self._base(name) + ["high-availability", "ca-certificate", value]

    def get_dhcp_ha_certificate(self, name: str, value: str) -> List[str]:
        return self._base(name) + ["high-availability", "certificate", value]

    # ========================================================================
    # Client Class
    # ========================================================================

    def get_dhcp_client_class(self, name: str, client_class: str) -> List[str]:
        return self._base(name) + ["client-class", client_class]

    def get_dhcp_client_class_disable(self, name: str, client_class: str) -> List[str]:
        return self._base(name) + ["client-class", client_class, "disable"]

    def get_dhcp_client_class_relay_agent_information_circuit_id(self, name: str, client_class: str, value: str) -> List[str]:
        return self._base(name) + ["client-class", client_class, "relay-agent-information", "circuit-id", value]

    def get_dhcp_client_class_relay_agent_information_remote_id(self, name: str, client_class: str, value: str) -> List[str]:
        return self._base(name) + ["client-class", client_class, "relay-agent-information", "remote-id", value]

    # ========================================================================
    # Dynamic DNS Update — flat fields (generic) at each scope
    #   fields: conflict-resolution, generated-prefix, hostname-char-replacement,
    #   hostname-char-set, override-client-update, override-no-update,
    #   qualifying-suffix, replace-client-name, send-updates, ttl-percent, update-on-renew
    # ========================================================================

    def get_dhcp_ddns_field(self, name: str, field: str, value: str) -> List[str]:
        return self._base(name) + ["dynamic-dns-update", field, value]

    def get_dhcp_shared_network_ddns_field(self, name: str, network: str, field: str, value: str) -> List[str]:
        return self._sn(name, network) + ["dynamic-dns-update", field, value]

    def get_dhcp_subnet_ddns_field(self, name: str, network: str, prefix: str, field: str, value: str) -> List[str]:
        return self._subnet(name, network, prefix) + ["dynamic-dns-update", field, value]

    # Dynamic DNS Update — global nested (forward/reverse domain, tsig-key)
    def get_dhcp_ddns_domain_dns_server_address(self, name: str, direction: str, domain: str, server: str, value: str) -> List[str]:
        return self._base(name) + ["dynamic-dns-update", direction, domain, "dns-server", server, "address", value]

    def get_dhcp_ddns_domain_dns_server_port(self, name: str, direction: str, domain: str, server: str, value: str) -> List[str]:
        return self._base(name) + ["dynamic-dns-update", direction, domain, "dns-server", server, "port", value]

    def get_dhcp_ddns_domain_key_name(self, name: str, direction: str, domain: str, value: str) -> List[str]:
        return self._base(name) + ["dynamic-dns-update", direction, domain, "key-name", value]

    def get_dhcp_ddns_tsig_key_algorithm(self, name: str, key: str, value: str) -> List[str]:
        return self._base(name) + ["dynamic-dns-update", "tsig-key", key, "algorithm", value]

    def get_dhcp_ddns_tsig_key_secret(self, name: str, key: str, value: str) -> List[str]:
        return self._base(name) + ["dynamic-dns-update", "tsig-key", key, "secret", value]

    # ========================================================================
    # Generic option setters (cover all value options incl. ones without
    # an explicit method, and the range scope which has none)
    # ========================================================================

    def get_dhcp_shared_network_option(self, name: str, network: str, opt: str, value: str) -> List[str]:
        return self._sn(name, network) + ["option", opt, value]

    def get_dhcp_subnet_option(self, name: str, network: str, prefix: str, opt: str, value: str) -> List[str]:
        return self._subnet(name, network, prefix) + ["option", opt, value]

    def get_dhcp_subnet_range_option(self, name: str, network: str, prefix: str, rng: str, opt: str, value: str) -> List[str]:
        return self._range(name, network, prefix, rng) + ["option", opt, value]

    def get_dhcp_static_mapping_option(self, name: str, network: str, prefix: str, host: str, opt: str, value: str) -> List[str]:
        return self._sm(name, network, prefix, host) + ["option", opt, value]

    # Option static-route next-hop (nested) per scope
    def get_dhcp_shared_network_option_static_route_next_hop(self, name: str, network: str, route: str, value: str) -> List[str]:
        return self._sn(name, network) + ["option", "static-route", route, "next-hop", value]

    def get_dhcp_subnet_option_static_route_next_hop(self, name: str, network: str, prefix: str, route: str, value: str) -> List[str]:
        return self._subnet(name, network, prefix) + ["option", "static-route", route, "next-hop", value]

    def get_dhcp_subnet_range_option_static_route_next_hop(self, name: str, network: str, prefix: str, rng: str, route: str, value: str) -> List[str]:
        return self._range(name, network, prefix, rng) + ["option", "static-route", route, "next-hop", value]

    def get_dhcp_static_mapping_option_static_route_next_hop(self, name: str, network: str, prefix: str, host: str, route: str, value: str) -> List[str]:
        return self._sm(name, network, prefix, host) + ["option", "static-route", route, "next-hop", value]

    # Option vendor-option ubiquiti unifi-controller per scope
    def get_dhcp_shared_network_option_unifi_controller(self, name: str, network: str, value: str) -> List[str]:
        return self._sn(name, network) + ["option", "vendor-option", "ubiquiti", "unifi-controller", value]

    def get_dhcp_subnet_option_unifi_controller(self, name: str, network: str, prefix: str, value: str) -> List[str]:
        return self._subnet(name, network, prefix) + ["option", "vendor-option", "ubiquiti", "unifi-controller", value]

    def get_dhcp_subnet_range_option_unifi_controller(self, name: str, network: str, prefix: str, rng: str, value: str) -> List[str]:
        return self._range(name, network, prefix, rng) + ["option", "vendor-option", "ubiquiti", "unifi-controller", value]

    def get_dhcp_static_mapping_option_unifi_controller(self, name: str, network: str, prefix: str, host: str, value: str) -> List[str]:
        return self._sm(name, network, prefix, host) + ["option", "vendor-option", "ubiquiti", "unifi-controller", value]

    # ========================================================================
    # Subnet extras / range client-class / static-mapping duid
    # ========================================================================

    def get_dhcp_subnet_client_class(self, name: str, network: str, prefix: str, value: str) -> List[str]:
        return self._subnet(name, network, prefix) + ["client-class", value]

    def get_dhcp_subnet_ignore_client_id(self, name: str, network: str, prefix: str) -> List[str]:
        return self._subnet(name, network, prefix) + ["ignore-client-id"]

    def get_dhcp_subnet_ping_check(self, name: str, network: str, prefix: str) -> List[str]:
        return self._subnet(name, network, prefix) + ["ping-check"]

    def get_dhcp_subnet_id(self, name: str, network: str, prefix: str, value: str) -> List[str]:
        return self._subnet(name, network, prefix) + ["subnet-id", value]

    def get_dhcp_subnet_range_client_class(self, name: str, network: str, prefix: str, rng: str, value: str) -> List[str]:
        return self._range(name, network, prefix, rng) + ["client-class", value]

    def get_dhcp_static_mapping_duid(self, name: str, network: str, prefix: str, host: str, value: str) -> List[str]:
        return self._sm(name, network, prefix, host) + ["duid", value]
