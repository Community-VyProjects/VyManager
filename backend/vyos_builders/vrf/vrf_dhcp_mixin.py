"""
VRF DHCP Server Builder Mixin

Provides batch operations for DHCP server configuration within VRF instances.
VyOS 1.5+ only. Mixed into VrfBatchBuilder to extend it with DHCP server operations.

Name parameter is always the VRF name. Value is comma-separated for multi-part params.
"""


class VrfDhcpMixin:
    """Mixin for VRF DHCP server builder operations."""

    # ========================================================================
    # DHCP Server Root
    # ========================================================================

    def set_vrf_dhcp(self, name: str) -> "VrfDhcpMixin":
        """Enable DHCP server for a VRF."""
        path = self.mappers["vrf_dhcp"].get_dhcp(name)
        return self.add_set(path)

    def delete_vrf_dhcp(self, name: str) -> "VrfDhcpMixin":
        """Delete all DHCP server configuration for a VRF."""
        path = self.mappers["vrf_dhcp"].get_dhcp(name)
        return self.add_delete(path)

    def set_vrf_dhcp_disable(self, name: str) -> "VrfDhcpMixin":
        """Disable DHCP server for a VRF."""
        path = self.mappers["vrf_dhcp"].get_dhcp_disable(name)
        return self.add_set(path)

    def delete_vrf_dhcp_disable(self, name: str) -> "VrfDhcpMixin":
        """Re-enable DHCP server for a VRF."""
        path = self.mappers["vrf_dhcp"].get_dhcp_disable(name)
        return self.add_delete(path)

    # ========================================================================
    # Dynamic DNS Update
    # ========================================================================

    def set_vrf_dhcp_dynamic_dns_update_enable(self, name: str) -> "VrfDhcpMixin":
        """Enable dynamic DNS updates."""
        path = self.mappers["vrf_dhcp"].get_dhcp_dynamic_dns_update_enable(name)
        return self.add_set(path)

    def delete_vrf_dhcp_dynamic_dns_update_enable(self, name: str) -> "VrfDhcpMixin":
        """Disable dynamic DNS updates."""
        path = self.mappers["vrf_dhcp"].get_dhcp_dynamic_dns_update_enable(name)
        return self.add_delete(path)

    def set_vrf_dhcp_dynamic_dns_update_dns_server(self, name: str, value: str) -> "VrfDhcpMixin":
        """Set dynamic DNS update server. Value is the DNS server address."""
        path = self.mappers["vrf_dhcp"].get_dhcp_dynamic_dns_update_dns_server(name, value)
        return self.add_set(path)

    def delete_vrf_dhcp_dynamic_dns_update_dns_server(self, name: str) -> "VrfDhcpMixin":
        """Delete dynamic DNS update server."""
        path = self.mappers["vrf_dhcp"].get_dhcp(name) + ["dynamic-dns-update", "dns-server"]
        return self.add_delete(path)

    def set_vrf_dhcp_dynamic_dns_update_domain_name(self, name: str, value: str) -> "VrfDhcpMixin":
        """Set dynamic DNS update domain name. Value is the domain name."""
        path = self.mappers["vrf_dhcp"].get_dhcp_dynamic_dns_update_domain_name(name, value)
        return self.add_set(path)

    def delete_vrf_dhcp_dynamic_dns_update_domain_name(self, name: str) -> "VrfDhcpMixin":
        """Delete dynamic DNS update domain name."""
        path = self.mappers["vrf_dhcp"].get_dhcp(name) + ["dynamic-dns-update", "domain-name"]
        return self.add_delete(path)

    # ========================================================================
    # Global Parameters
    # ========================================================================

    def set_vrf_dhcp_global_parameters(self, name: str, value: str) -> "VrfDhcpMixin":
        """Add a global parameter. Value is the raw parameter string."""
        path = self.mappers["vrf_dhcp"].get_dhcp_global_parameters(name, value)
        return self.add_set(path)

    def delete_vrf_dhcp_global_parameters(self, name: str, value: str) -> "VrfDhcpMixin":
        """Delete a global parameter. Value is the raw parameter string."""
        path = self.mappers["vrf_dhcp"].get_dhcp_global_parameters(name, value)
        return self.add_delete(path)

    # ========================================================================
    # High Availability
    # ========================================================================

    def set_vrf_dhcp_ha_mode(self, name: str, value: str) -> "VrfDhcpMixin":
        """Set HA mode. Value is the mode (active-active, active-passive)."""
        path = self.mappers["vrf_dhcp"].get_dhcp_ha_mode(name, value)
        return self.add_set(path)

    def delete_vrf_dhcp_ha_mode(self, name: str) -> "VrfDhcpMixin":
        """Delete HA mode."""
        path = self.mappers["vrf_dhcp"].get_dhcp_ha(name) + ["mode"]
        return self.add_delete(path)

    def set_vrf_dhcp_ha_name(self, name: str, value: str) -> "VrfDhcpMixin":
        """Set HA name. Value is the HA peer name."""
        path = self.mappers["vrf_dhcp"].get_dhcp_ha_name(name, value)
        return self.add_set(path)

    def delete_vrf_dhcp_ha_name(self, name: str) -> "VrfDhcpMixin":
        """Delete HA name."""
        path = self.mappers["vrf_dhcp"].get_dhcp_ha(name) + ["name"]
        return self.add_delete(path)

    def set_vrf_dhcp_ha_remote(self, name: str, value: str) -> "VrfDhcpMixin":
        """Set HA remote address. Value is the remote IP."""
        path = self.mappers["vrf_dhcp"].get_dhcp_ha_remote(name, value)
        return self.add_set(path)

    def delete_vrf_dhcp_ha_remote(self, name: str) -> "VrfDhcpMixin":
        """Delete HA remote address."""
        path = self.mappers["vrf_dhcp"].get_dhcp_ha(name) + ["remote"]
        return self.add_delete(path)

    def set_vrf_dhcp_ha_source_address(self, name: str, value: str) -> "VrfDhcpMixin":
        """Set HA source address. Value is the source IP."""
        path = self.mappers["vrf_dhcp"].get_dhcp_ha_source_address(name, value)
        return self.add_set(path)

    def delete_vrf_dhcp_ha_source_address(self, name: str) -> "VrfDhcpMixin":
        """Delete HA source address."""
        path = self.mappers["vrf_dhcp"].get_dhcp_ha(name) + ["source-address"]
        return self.add_delete(path)

    def set_vrf_dhcp_ha_status(self, name: str, value: str) -> "VrfDhcpMixin":
        """Set HA status. Value is the status (primary, secondary)."""
        path = self.mappers["vrf_dhcp"].get_dhcp_ha_status(name, value)
        return self.add_set(path)

    def delete_vrf_dhcp_ha_status(self, name: str) -> "VrfDhcpMixin":
        """Delete HA status."""
        path = self.mappers["vrf_dhcp"].get_dhcp_ha(name) + ["status"]
        return self.add_delete(path)

    # ========================================================================
    # Listen Address / Interface
    # ========================================================================

    def set_vrf_dhcp_listen_address(self, name: str, value: str) -> "VrfDhcpMixin":
        """Add a listen address. Value is the IP address."""
        path = self.mappers["vrf_dhcp"].get_dhcp_listen_address(name, value)
        return self.add_set(path)

    def delete_vrf_dhcp_listen_address(self, name: str, value: str) -> "VrfDhcpMixin":
        """Delete a listen address. Value is the IP address."""
        path = self.mappers["vrf_dhcp"].get_dhcp_listen_address(name, value)
        return self.add_delete(path)

    def set_vrf_dhcp_listen_interface(self, name: str, value: str) -> "VrfDhcpMixin":
        """Add a listen interface. Value is the interface name."""
        path = self.mappers["vrf_dhcp"].get_dhcp_listen_interface(name, value)
        return self.add_set(path)

    def delete_vrf_dhcp_listen_interface(self, name: str, value: str) -> "VrfDhcpMixin":
        """Delete a listen interface. Value is the interface name."""
        path = self.mappers["vrf_dhcp"].get_dhcp_listen_interface(name, value)
        return self.add_delete(path)

    # ========================================================================
    # Shared Network
    # ========================================================================

    def set_vrf_dhcp_shared_network(self, name: str, value: str) -> "VrfDhcpMixin":
        """Create a shared network. Value is the network name."""
        path = self.mappers["vrf_dhcp"].get_dhcp_shared_network(name, value)
        return self.add_set(path)

    def delete_vrf_dhcp_shared_network(self, name: str, value: str) -> "VrfDhcpMixin":
        """Delete a shared network. Value is the network name."""
        path = self.mappers["vrf_dhcp"].get_dhcp_shared_network(name, value)
        return self.add_delete(path)

    def set_vrf_dhcp_shared_network_authoritative(self, name: str, value: str) -> "VrfDhcpMixin":
        """Set shared network authoritative. Value is the network name."""
        path = self.mappers["vrf_dhcp"].get_dhcp_shared_network_authoritative(name, value)
        return self.add_set(path)

    def delete_vrf_dhcp_shared_network_authoritative(self, name: str, value: str) -> "VrfDhcpMixin":
        """Delete shared network authoritative. Value is the network name."""
        path = self.mappers["vrf_dhcp"].get_dhcp_shared_network_authoritative(name, value)
        return self.add_delete(path)

    def set_vrf_dhcp_shared_network_description(self, name: str, value: str) -> "VrfDhcpMixin":
        """Set shared network description. Value format: 'network,description'."""
        parts = value.split(",", 1)
        if len(parts) == 2:
            path = self.mappers["vrf_dhcp"].get_dhcp_shared_network_description(name, parts[0], parts[1])
            return self.add_set(path)
        return self

    def delete_vrf_dhcp_shared_network_description(self, name: str, value: str) -> "VrfDhcpMixin":
        """Delete shared network description. Value is the network name."""
        path = self.mappers["vrf_dhcp"].get_dhcp_shared_network(name, value) + ["description"]
        return self.add_delete(path)

    def set_vrf_dhcp_shared_network_disable(self, name: str, value: str) -> "VrfDhcpMixin":
        """Disable shared network. Value is the network name."""
        path = self.mappers["vrf_dhcp"].get_dhcp_shared_network_disable(name, value)
        return self.add_set(path)

    def delete_vrf_dhcp_shared_network_disable(self, name: str, value: str) -> "VrfDhcpMixin":
        """Re-enable shared network. Value is the network name."""
        path = self.mappers["vrf_dhcp"].get_dhcp_shared_network_disable(name, value)
        return self.add_delete(path)

    def set_vrf_dhcp_shared_network_domain_name(self, name: str, value: str) -> "VrfDhcpMixin":
        """Set shared network domain name. Value format: 'network,domain_name'."""
        parts = value.split(",", 1)
        if len(parts) == 2:
            path = self.mappers["vrf_dhcp"].get_dhcp_shared_network_domain_name(name, parts[0], parts[1])
            return self.add_set(path)
        return self

    def delete_vrf_dhcp_shared_network_domain_name(self, name: str, value: str) -> "VrfDhcpMixin":
        """Delete shared network domain name. Value is the network name."""
        path = self.mappers["vrf_dhcp"].get_dhcp_shared_network(name, value) + ["domain-name"]
        return self.add_delete(path)

    def set_vrf_dhcp_shared_network_domain_search(self, name: str, value: str) -> "VrfDhcpMixin":
        """Add shared network domain-search. Value format: 'network,domain'."""
        parts = value.split(",", 1)
        if len(parts) == 2:
            path = self.mappers["vrf_dhcp"].get_dhcp_shared_network_domain_search(name, parts[0], parts[1])
            return self.add_set(path)
        return self

    def delete_vrf_dhcp_shared_network_domain_search(self, name: str, value: str) -> "VrfDhcpMixin":
        """Delete shared network domain-search. Value format: 'network,domain'."""
        parts = value.split(",", 1)
        if len(parts) == 2:
            path = self.mappers["vrf_dhcp"].get_dhcp_shared_network_domain_search(name, parts[0], parts[1])
            return self.add_delete(path)
        return self

    def set_vrf_dhcp_shared_network_name_server(self, name: str, value: str) -> "VrfDhcpMixin":
        """Add shared network name-server. Value format: 'network,server'."""
        parts = value.split(",", 1)
        if len(parts) == 2:
            path = self.mappers["vrf_dhcp"].get_dhcp_shared_network_name_server(name, parts[0], parts[1])
            return self.add_set(path)
        return self

    def delete_vrf_dhcp_shared_network_name_server(self, name: str, value: str) -> "VrfDhcpMixin":
        """Delete shared network name-server. Value format: 'network,server'."""
        parts = value.split(",", 1)
        if len(parts) == 2:
            path = self.mappers["vrf_dhcp"].get_dhcp_shared_network_name_server(name, parts[0], parts[1])
            return self.add_delete(path)
        return self

    def set_vrf_dhcp_shared_network_ntp_server(self, name: str, value: str) -> "VrfDhcpMixin":
        """Add shared network ntp-server. Value format: 'network,server'."""
        parts = value.split(",", 1)
        if len(parts) == 2:
            path = self.mappers["vrf_dhcp"].get_dhcp_shared_network_ntp_server(name, parts[0], parts[1])
            return self.add_set(path)
        return self

    def delete_vrf_dhcp_shared_network_ntp_server(self, name: str, value: str) -> "VrfDhcpMixin":
        """Delete shared network ntp-server. Value format: 'network,server'."""
        parts = value.split(",", 1)
        if len(parts) == 2:
            path = self.mappers["vrf_dhcp"].get_dhcp_shared_network_ntp_server(name, parts[0], parts[1])
            return self.add_delete(path)
        return self

    def set_vrf_dhcp_shared_network_ping_check(self, name: str, value: str) -> "VrfDhcpMixin":
        """Enable shared network ping-check. Value is the network name."""
        path = self.mappers["vrf_dhcp"].get_dhcp_shared_network_ping_check(name, value)
        return self.add_set(path)

    def delete_vrf_dhcp_shared_network_ping_check(self, name: str, value: str) -> "VrfDhcpMixin":
        """Disable shared network ping-check. Value is the network name."""
        path = self.mappers["vrf_dhcp"].get_dhcp_shared_network_ping_check(name, value)
        return self.add_delete(path)

    # ========================================================================
    # Shared Network Options
    # ========================================================================

    def set_vrf_dhcp_shared_network_option_bootfile_name(self, name: str, value: str) -> "VrfDhcpMixin":
        """Set shared network option bootfile-name. Value format: 'network,bootfile'."""
        parts = value.split(",", 1)
        if len(parts) == 2:
            path = self.mappers["vrf_dhcp"].get_dhcp_shared_network_option_bootfile_name(name, parts[0], parts[1])
            return self.add_set(path)
        return self

    def delete_vrf_dhcp_shared_network_option_bootfile_name(self, name: str, value: str) -> "VrfDhcpMixin":
        """Delete shared network option bootfile-name. Value is the network name."""
        path = self.mappers["vrf_dhcp"].get_dhcp_shared_network(name, value) + ["option", "bootfile-name"]
        return self.add_delete(path)

    def set_vrf_dhcp_shared_network_option_bootfile_server(self, name: str, value: str) -> "VrfDhcpMixin":
        """Set shared network option bootfile-server. Value format: 'network,server'."""
        parts = value.split(",", 1)
        if len(parts) == 2:
            path = self.mappers["vrf_dhcp"].get_dhcp_shared_network_option_bootfile_server(name, parts[0], parts[1])
            return self.add_set(path)
        return self

    def delete_vrf_dhcp_shared_network_option_bootfile_server(self, name: str, value: str) -> "VrfDhcpMixin":
        """Delete shared network option bootfile-server. Value is the network name."""
        path = self.mappers["vrf_dhcp"].get_dhcp_shared_network(name, value) + ["option", "bootfile-server"]
        return self.add_delete(path)

    def set_vrf_dhcp_shared_network_option_bootfile_size(self, name: str, value: str) -> "VrfDhcpMixin":
        """Set shared network option bootfile-size. Value format: 'network,size'."""
        parts = value.split(",", 1)
        if len(parts) == 2:
            path = self.mappers["vrf_dhcp"].get_dhcp_shared_network_option_bootfile_size(name, parts[0], parts[1])
            return self.add_set(path)
        return self

    def delete_vrf_dhcp_shared_network_option_bootfile_size(self, name: str, value: str) -> "VrfDhcpMixin":
        """Delete shared network option bootfile-size. Value is the network name."""
        path = self.mappers["vrf_dhcp"].get_dhcp_shared_network(name, value) + ["option", "bootfile-size"]
        return self.add_delete(path)

    def set_vrf_dhcp_shared_network_option_client_prefix_length(self, name: str, value: str) -> "VrfDhcpMixin":
        """Set shared network option client-prefix-length. Value format: 'network,length'."""
        parts = value.split(",", 1)
        if len(parts) == 2:
            path = self.mappers["vrf_dhcp"].get_dhcp_shared_network_option_client_prefix_length(name, parts[0], parts[1])
            return self.add_set(path)
        return self

    def delete_vrf_dhcp_shared_network_option_client_prefix_length(self, name: str, value: str) -> "VrfDhcpMixin":
        """Delete shared network option client-prefix-length. Value is the network name."""
        path = self.mappers["vrf_dhcp"].get_dhcp_shared_network(name, value) + ["option", "client-prefix-length"]
        return self.add_delete(path)

    def set_vrf_dhcp_shared_network_option_default_router(self, name: str, value: str) -> "VrfDhcpMixin":
        """Set shared network option default-router. Value format: 'network,router'."""
        parts = value.split(",", 1)
        if len(parts) == 2:
            path = self.mappers["vrf_dhcp"].get_dhcp_shared_network_option_default_router(name, parts[0], parts[1])
            return self.add_set(path)
        return self

    def delete_vrf_dhcp_shared_network_option_default_router(self, name: str, value: str) -> "VrfDhcpMixin":
        """Delete shared network option default-router. Value is the network name."""
        path = self.mappers["vrf_dhcp"].get_dhcp_shared_network(name, value) + ["option", "default-router"]
        return self.add_delete(path)

    def set_vrf_dhcp_shared_network_option_domain_name(self, name: str, value: str) -> "VrfDhcpMixin":
        """Set shared network option domain-name. Value format: 'network,domain'."""
        parts = value.split(",", 1)
        if len(parts) == 2:
            path = self.mappers["vrf_dhcp"].get_dhcp_shared_network_option_domain_name(name, parts[0], parts[1])
            return self.add_set(path)
        return self

    def delete_vrf_dhcp_shared_network_option_domain_name(self, name: str, value: str) -> "VrfDhcpMixin":
        """Delete shared network option domain-name. Value is the network name."""
        path = self.mappers["vrf_dhcp"].get_dhcp_shared_network(name, value) + ["option", "domain-name"]
        return self.add_delete(path)

    def set_vrf_dhcp_shared_network_option_domain_search(self, name: str, value: str) -> "VrfDhcpMixin":
        """Set shared network option domain-search. Value format: 'network,domain'."""
        parts = value.split(",", 1)
        if len(parts) == 2:
            path = self.mappers["vrf_dhcp"].get_dhcp_shared_network_option_domain_search(name, parts[0], parts[1])
            return self.add_set(path)
        return self

    def delete_vrf_dhcp_shared_network_option_domain_search(self, name: str, value: str) -> "VrfDhcpMixin":
        """Delete shared network option domain-search. Value format: 'network,domain'."""
        parts = value.split(",", 1)
        if len(parts) == 2:
            path = self.mappers["vrf_dhcp"].get_dhcp_shared_network_option_domain_search(name, parts[0], parts[1])
            return self.add_delete(path)
        return self

    def set_vrf_dhcp_shared_network_option_ip_forwarding(self, name: str, value: str) -> "VrfDhcpMixin":
        """Enable shared network option ip-forwarding. Value is the network name."""
        path = self.mappers["vrf_dhcp"].get_dhcp_shared_network_option_ip_forwarding(name, value)
        return self.add_set(path)

    def delete_vrf_dhcp_shared_network_option_ip_forwarding(self, name: str, value: str) -> "VrfDhcpMixin":
        """Disable shared network option ip-forwarding. Value is the network name."""
        path = self.mappers["vrf_dhcp"].get_dhcp_shared_network_option_ip_forwarding(name, value)
        return self.add_delete(path)

    def set_vrf_dhcp_shared_network_option_name_server(self, name: str, value: str) -> "VrfDhcpMixin":
        """Set shared network option name-server. Value format: 'network,server'."""
        parts = value.split(",", 1)
        if len(parts) == 2:
            path = self.mappers["vrf_dhcp"].get_dhcp_shared_network_option_name_server(name, parts[0], parts[1])
            return self.add_set(path)
        return self

    def delete_vrf_dhcp_shared_network_option_name_server(self, name: str, value: str) -> "VrfDhcpMixin":
        """Delete shared network option name-server. Value format: 'network,server'."""
        parts = value.split(",", 1)
        if len(parts) == 2:
            path = self.mappers["vrf_dhcp"].get_dhcp_shared_network_option_name_server(name, parts[0], parts[1])
            return self.add_delete(path)
        return self

    def set_vrf_dhcp_shared_network_option_ntp_server(self, name: str, value: str) -> "VrfDhcpMixin":
        """Set shared network option ntp-server. Value format: 'network,server'."""
        parts = value.split(",", 1)
        if len(parts) == 2:
            path = self.mappers["vrf_dhcp"].get_dhcp_shared_network_option_ntp_server(name, parts[0], parts[1])
            return self.add_set(path)
        return self

    def delete_vrf_dhcp_shared_network_option_ntp_server(self, name: str, value: str) -> "VrfDhcpMixin":
        """Delete shared network option ntp-server. Value format: 'network,server'."""
        parts = value.split(",", 1)
        if len(parts) == 2:
            path = self.mappers["vrf_dhcp"].get_dhcp_shared_network_option_ntp_server(name, parts[0], parts[1])
            return self.add_delete(path)
        return self

    def set_vrf_dhcp_shared_network_option_pop_server(self, name: str, value: str) -> "VrfDhcpMixin":
        """Set shared network option pop-server. Value format: 'network,server'."""
        parts = value.split(",", 1)
        if len(parts) == 2:
            path = self.mappers["vrf_dhcp"].get_dhcp_shared_network_option_pop_server(name, parts[0], parts[1])
            return self.add_set(path)
        return self

    def delete_vrf_dhcp_shared_network_option_pop_server(self, name: str, value: str) -> "VrfDhcpMixin":
        """Delete shared network option pop-server. Value format: 'network,server'."""
        parts = value.split(",", 1)
        if len(parts) == 2:
            path = self.mappers["vrf_dhcp"].get_dhcp_shared_network_option_pop_server(name, parts[0], parts[1])
            return self.add_delete(path)
        return self

    def set_vrf_dhcp_shared_network_option_smtp_server(self, name: str, value: str) -> "VrfDhcpMixin":
        """Set shared network option smtp-server. Value format: 'network,server'."""
        parts = value.split(",", 1)
        if len(parts) == 2:
            path = self.mappers["vrf_dhcp"].get_dhcp_shared_network_option_smtp_server(name, parts[0], parts[1])
            return self.add_set(path)
        return self

    def delete_vrf_dhcp_shared_network_option_smtp_server(self, name: str, value: str) -> "VrfDhcpMixin":
        """Delete shared network option smtp-server. Value format: 'network,server'."""
        parts = value.split(",", 1)
        if len(parts) == 2:
            path = self.mappers["vrf_dhcp"].get_dhcp_shared_network_option_smtp_server(name, parts[0], parts[1])
            return self.add_delete(path)
        return self

    def set_vrf_dhcp_shared_network_option_static_route(self, name: str, value: str) -> "VrfDhcpMixin":
        """Set shared network option static-route. Value format: 'network,route'."""
        parts = value.split(",", 1)
        if len(parts) == 2:
            path = self.mappers["vrf_dhcp"].get_dhcp_shared_network_option_static_route(name, parts[0], parts[1])
            return self.add_set(path)
        return self

    def delete_vrf_dhcp_shared_network_option_static_route(self, name: str, value: str) -> "VrfDhcpMixin":
        """Delete shared network option static-route. Value is the network name."""
        path = self.mappers["vrf_dhcp"].get_dhcp_shared_network(name, value) + ["option", "static-route"]
        return self.add_delete(path)

    def set_vrf_dhcp_shared_network_option_tftp_server_name(self, name: str, value: str) -> "VrfDhcpMixin":
        """Set shared network option tftp-server-name. Value format: 'network,server'."""
        parts = value.split(",", 1)
        if len(parts) == 2:
            path = self.mappers["vrf_dhcp"].get_dhcp_shared_network_option_tftp_server_name(name, parts[0], parts[1])
            return self.add_set(path)
        return self

    def delete_vrf_dhcp_shared_network_option_tftp_server_name(self, name: str, value: str) -> "VrfDhcpMixin":
        """Delete shared network option tftp-server-name. Value is the network name."""
        path = self.mappers["vrf_dhcp"].get_dhcp_shared_network(name, value) + ["option", "tftp-server-name"]
        return self.add_delete(path)

    def set_vrf_dhcp_shared_network_option_time_offset(self, name: str, value: str) -> "VrfDhcpMixin":
        """Set shared network option time-offset. Value format: 'network,offset'."""
        parts = value.split(",", 1)
        if len(parts) == 2:
            path = self.mappers["vrf_dhcp"].get_dhcp_shared_network_option_time_offset(name, parts[0], parts[1])
            return self.add_set(path)
        return self

    def delete_vrf_dhcp_shared_network_option_time_offset(self, name: str, value: str) -> "VrfDhcpMixin":
        """Delete shared network option time-offset. Value is the network name."""
        path = self.mappers["vrf_dhcp"].get_dhcp_shared_network(name, value) + ["option", "time-offset"]
        return self.add_delete(path)

    def set_vrf_dhcp_shared_network_option_time_server(self, name: str, value: str) -> "VrfDhcpMixin":
        """Set shared network option time-server. Value format: 'network,server'."""
        parts = value.split(",", 1)
        if len(parts) == 2:
            path = self.mappers["vrf_dhcp"].get_dhcp_shared_network_option_time_server(name, parts[0], parts[1])
            return self.add_set(path)
        return self

    def delete_vrf_dhcp_shared_network_option_time_server(self, name: str, value: str) -> "VrfDhcpMixin":
        """Delete shared network option time-server. Value format: 'network,server'."""
        parts = value.split(",", 1)
        if len(parts) == 2:
            path = self.mappers["vrf_dhcp"].get_dhcp_shared_network_option_time_server(name, parts[0], parts[1])
            return self.add_delete(path)
        return self

    def set_vrf_dhcp_shared_network_option_time_zone(self, name: str, value: str) -> "VrfDhcpMixin":
        """Set shared network option time-zone. Value format: 'network,timezone'."""
        parts = value.split(",", 1)
        if len(parts) == 2:
            path = self.mappers["vrf_dhcp"].get_dhcp_shared_network_option_time_zone(name, parts[0], parts[1])
            return self.add_set(path)
        return self

    def delete_vrf_dhcp_shared_network_option_time_zone(self, name: str, value: str) -> "VrfDhcpMixin":
        """Delete shared network option time-zone. Value is the network name."""
        path = self.mappers["vrf_dhcp"].get_dhcp_shared_network(name, value) + ["option", "time-zone"]
        return self.add_delete(path)

    def set_vrf_dhcp_shared_network_option_wins_server(self, name: str, value: str) -> "VrfDhcpMixin":
        """Set shared network option wins-server. Value format: 'network,server'."""
        parts = value.split(",", 1)
        if len(parts) == 2:
            path = self.mappers["vrf_dhcp"].get_dhcp_shared_network_option_wins_server(name, parts[0], parts[1])
            return self.add_set(path)
        return self

    def delete_vrf_dhcp_shared_network_option_wins_server(self, name: str, value: str) -> "VrfDhcpMixin":
        """Delete shared network option wins-server. Value format: 'network,server'."""
        parts = value.split(",", 1)
        if len(parts) == 2:
            path = self.mappers["vrf_dhcp"].get_dhcp_shared_network_option_wins_server(name, parts[0], parts[1])
            return self.add_delete(path)
        return self

    def set_vrf_dhcp_shared_network_option_wpad_url(self, name: str, value: str) -> "VrfDhcpMixin":
        """Set shared network option wpad-url. Value format: 'network,url'."""
        parts = value.split(",", 1)
        if len(parts) == 2:
            path = self.mappers["vrf_dhcp"].get_dhcp_shared_network_option_wpad_url(name, parts[0], parts[1])
            return self.add_set(path)
        return self

    def delete_vrf_dhcp_shared_network_option_wpad_url(self, name: str, value: str) -> "VrfDhcpMixin":
        """Delete shared network option wpad-url. Value is the network name."""
        path = self.mappers["vrf_dhcp"].get_dhcp_shared_network(name, value) + ["option", "wpad-url"]
        return self.add_delete(path)

    def set_vrf_dhcp_shared_network_option_vendor_option(self, name: str, value: str) -> "VrfDhcpMixin":
        """Enable shared network option vendor-option. Value is the network name."""
        path = self.mappers["vrf_dhcp"].get_dhcp_shared_network_option_vendor_option(name, value)
        return self.add_set(path)

    def delete_vrf_dhcp_shared_network_option_vendor_option(self, name: str, value: str) -> "VrfDhcpMixin":
        """Disable shared network option vendor-option. Value is the network name."""
        path = self.mappers["vrf_dhcp"].get_dhcp_shared_network_option_vendor_option(name, value)
        return self.add_delete(path)

    # ========================================================================
    # Subnet
    # ========================================================================

    def set_vrf_dhcp_subnet(self, name: str, value: str) -> "VrfDhcpMixin":
        """Create a subnet. Value format: 'network,prefix'."""
        parts = value.split(",", 1)
        if len(parts) == 2:
            path = self.mappers["vrf_dhcp"].get_dhcp_subnet(name, parts[0], parts[1])
            return self.add_set(path)
        return self

    def delete_vrf_dhcp_subnet(self, name: str, value: str) -> "VrfDhcpMixin":
        """Delete a subnet. Value format: 'network,prefix'."""
        parts = value.split(",", 1)
        if len(parts) == 2:
            path = self.mappers["vrf_dhcp"].get_dhcp_subnet(name, parts[0], parts[1])
            return self.add_delete(path)
        return self

    def set_vrf_dhcp_subnet_default_router(self, name: str, value: str) -> "VrfDhcpMixin":
        """Set subnet default-router. Value format: 'network,prefix,router'."""
        parts = value.split(",", 2)
        if len(parts) == 3:
            path = self.mappers["vrf_dhcp"].get_dhcp_subnet_default_router(name, parts[0], parts[1], parts[2])
            return self.add_set(path)
        return self

    def delete_vrf_dhcp_subnet_default_router(self, name: str, value: str) -> "VrfDhcpMixin":
        """Delete subnet default-router. Value format: 'network,prefix'."""
        parts = value.split(",", 1)
        if len(parts) == 2:
            path = self.mappers["vrf_dhcp"].get_dhcp_subnet(name, parts[0], parts[1]) + ["default-router"]
            return self.add_delete(path)
        return self

    def set_vrf_dhcp_subnet_description(self, name: str, value: str) -> "VrfDhcpMixin":
        """Set subnet description. Value format: 'network,prefix,description'."""
        parts = value.split(",", 2)
        if len(parts) == 3:
            path = self.mappers["vrf_dhcp"].get_dhcp_subnet_description(name, parts[0], parts[1], parts[2])
            return self.add_set(path)
        return self

    def delete_vrf_dhcp_subnet_description(self, name: str, value: str) -> "VrfDhcpMixin":
        """Delete subnet description. Value format: 'network,prefix'."""
        parts = value.split(",", 1)
        if len(parts) == 2:
            path = self.mappers["vrf_dhcp"].get_dhcp_subnet(name, parts[0], parts[1]) + ["description"]
            return self.add_delete(path)
        return self

    def set_vrf_dhcp_subnet_disable(self, name: str, value: str) -> "VrfDhcpMixin":
        """Disable a subnet. Value format: 'network,prefix'."""
        parts = value.split(",", 1)
        if len(parts) == 2:
            path = self.mappers["vrf_dhcp"].get_dhcp_subnet_disable(name, parts[0], parts[1])
            return self.add_set(path)
        return self

    def delete_vrf_dhcp_subnet_disable(self, name: str, value: str) -> "VrfDhcpMixin":
        """Re-enable a subnet. Value format: 'network,prefix'."""
        parts = value.split(",", 1)
        if len(parts) == 2:
            path = self.mappers["vrf_dhcp"].get_dhcp_subnet_disable(name, parts[0], parts[1])
            return self.add_delete(path)
        return self

    def set_vrf_dhcp_subnet_domain_name(self, name: str, value: str) -> "VrfDhcpMixin":
        """Set subnet domain-name. Value format: 'network,prefix,domain'."""
        parts = value.split(",", 2)
        if len(parts) == 3:
            path = self.mappers["vrf_dhcp"].get_dhcp_subnet_domain_name(name, parts[0], parts[1], parts[2])
            return self.add_set(path)
        return self

    def delete_vrf_dhcp_subnet_domain_name(self, name: str, value: str) -> "VrfDhcpMixin":
        """Delete subnet domain-name. Value format: 'network,prefix'."""
        parts = value.split(",", 1)
        if len(parts) == 2:
            path = self.mappers["vrf_dhcp"].get_dhcp_subnet(name, parts[0], parts[1]) + ["domain-name"]
            return self.add_delete(path)
        return self

    def set_vrf_dhcp_subnet_domain_search(self, name: str, value: str) -> "VrfDhcpMixin":
        """Add subnet domain-search. Value format: 'network,prefix,domain'."""
        parts = value.split(",", 2)
        if len(parts) == 3:
            path = self.mappers["vrf_dhcp"].get_dhcp_subnet_domain_search(name, parts[0], parts[1], parts[2])
            return self.add_set(path)
        return self

    def delete_vrf_dhcp_subnet_domain_search(self, name: str, value: str) -> "VrfDhcpMixin":
        """Delete subnet domain-search. Value format: 'network,prefix,domain'."""
        parts = value.split(",", 2)
        if len(parts) == 3:
            path = self.mappers["vrf_dhcp"].get_dhcp_subnet_domain_search(name, parts[0], parts[1], parts[2])
            return self.add_delete(path)
        return self

    def set_vrf_dhcp_subnet_exclude(self, name: str, value: str) -> "VrfDhcpMixin":
        """Add subnet exclude address. Value format: 'network,prefix,address'."""
        parts = value.split(",", 2)
        if len(parts) == 3:
            path = self.mappers["vrf_dhcp"].get_dhcp_subnet_exclude(name, parts[0], parts[1], parts[2])
            return self.add_set(path)
        return self

    def delete_vrf_dhcp_subnet_exclude(self, name: str, value: str) -> "VrfDhcpMixin":
        """Delete subnet exclude address. Value format: 'network,prefix,address'."""
        parts = value.split(",", 2)
        if len(parts) == 3:
            path = self.mappers["vrf_dhcp"].get_dhcp_subnet_exclude(name, parts[0], parts[1], parts[2])
            return self.add_delete(path)
        return self

    def set_vrf_dhcp_subnet_name_server(self, name: str, value: str) -> "VrfDhcpMixin":
        """Add subnet name-server. Value format: 'network,prefix,server'."""
        parts = value.split(",", 2)
        if len(parts) == 3:
            path = self.mappers["vrf_dhcp"].get_dhcp_subnet_name_server(name, parts[0], parts[1], parts[2])
            return self.add_set(path)
        return self

    def delete_vrf_dhcp_subnet_name_server(self, name: str, value: str) -> "VrfDhcpMixin":
        """Delete subnet name-server. Value format: 'network,prefix,server'."""
        parts = value.split(",", 2)
        if len(parts) == 3:
            path = self.mappers["vrf_dhcp"].get_dhcp_subnet_name_server(name, parts[0], parts[1], parts[2])
            return self.add_delete(path)
        return self

    def set_vrf_dhcp_subnet_ntp_server(self, name: str, value: str) -> "VrfDhcpMixin":
        """Add subnet ntp-server. Value format: 'network,prefix,server'."""
        parts = value.split(",", 2)
        if len(parts) == 3:
            path = self.mappers["vrf_dhcp"].get_dhcp_subnet_ntp_server(name, parts[0], parts[1], parts[2])
            return self.add_set(path)
        return self

    def delete_vrf_dhcp_subnet_ntp_server(self, name: str, value: str) -> "VrfDhcpMixin":
        """Delete subnet ntp-server. Value format: 'network,prefix,server'."""
        parts = value.split(",", 2)
        if len(parts) == 3:
            path = self.mappers["vrf_dhcp"].get_dhcp_subnet_ntp_server(name, parts[0], parts[1], parts[2])
            return self.add_delete(path)
        return self

    # ========================================================================
    # Subnet Lease
    # ========================================================================

    def set_vrf_dhcp_subnet_lease_default(self, name: str, value: str) -> "VrfDhcpMixin":
        """Set subnet default lease time. Value format: 'network,prefix,seconds'."""
        parts = value.split(",", 2)
        if len(parts) == 3:
            path = self.mappers["vrf_dhcp"].get_dhcp_subnet_lease_default(name, parts[0], parts[1], parts[2])
            return self.add_set(path)
        return self

    def delete_vrf_dhcp_subnet_lease_default(self, name: str, value: str) -> "VrfDhcpMixin":
        """Delete subnet default lease time. Value format: 'network,prefix'."""
        parts = value.split(",", 1)
        if len(parts) == 2:
            path = self.mappers["vrf_dhcp"].get_dhcp_subnet(name, parts[0], parts[1]) + ["lease", "default"]
            return self.add_delete(path)
        return self

    def set_vrf_dhcp_subnet_lease_max(self, name: str, value: str) -> "VrfDhcpMixin":
        """Set subnet max lease time. Value format: 'network,prefix,seconds'."""
        parts = value.split(",", 2)
        if len(parts) == 3:
            path = self.mappers["vrf_dhcp"].get_dhcp_subnet_lease_max(name, parts[0], parts[1], parts[2])
            return self.add_set(path)
        return self

    def delete_vrf_dhcp_subnet_lease_max(self, name: str, value: str) -> "VrfDhcpMixin":
        """Delete subnet max lease time. Value format: 'network,prefix'."""
        parts = value.split(",", 1)
        if len(parts) == 2:
            path = self.mappers["vrf_dhcp"].get_dhcp_subnet(name, parts[0], parts[1]) + ["lease", "max"]
            return self.add_delete(path)
        return self

    def set_vrf_dhcp_subnet_lease_min(self, name: str, value: str) -> "VrfDhcpMixin":
        """Set subnet min lease time. Value format: 'network,prefix,seconds'."""
        parts = value.split(",", 2)
        if len(parts) == 3:
            path = self.mappers["vrf_dhcp"].get_dhcp_subnet_lease_min(name, parts[0], parts[1], parts[2])
            return self.add_set(path)
        return self

    def delete_vrf_dhcp_subnet_lease_min(self, name: str, value: str) -> "VrfDhcpMixin":
        """Delete subnet min lease time. Value format: 'network,prefix'."""
        parts = value.split(",", 1)
        if len(parts) == 2:
            path = self.mappers["vrf_dhcp"].get_dhcp_subnet(name, parts[0], parts[1]) + ["lease", "min"]
            return self.add_delete(path)
        return self

    # ========================================================================
    # Subnet Options
    # ========================================================================

    def set_vrf_dhcp_subnet_option_bootfile_name(self, name: str, value: str) -> "VrfDhcpMixin":
        """Set subnet option bootfile-name. Value format: 'network,prefix,bootfile'."""
        parts = value.split(",", 2)
        if len(parts) == 3:
            path = self.mappers["vrf_dhcp"].get_dhcp_subnet_option_bootfile_name(name, parts[0], parts[1], parts[2])
            return self.add_set(path)
        return self

    def delete_vrf_dhcp_subnet_option_bootfile_name(self, name: str, value: str) -> "VrfDhcpMixin":
        """Delete subnet option bootfile-name. Value format: 'network,prefix'."""
        parts = value.split(",", 1)
        if len(parts) == 2:
            path = self.mappers["vrf_dhcp"].get_dhcp_subnet(name, parts[0], parts[1]) + ["option", "bootfile-name"]
            return self.add_delete(path)
        return self

    def set_vrf_dhcp_subnet_option_bootfile_server(self, name: str, value: str) -> "VrfDhcpMixin":
        """Set subnet option bootfile-server. Value format: 'network,prefix,server'."""
        parts = value.split(",", 2)
        if len(parts) == 3:
            path = self.mappers["vrf_dhcp"].get_dhcp_subnet_option_bootfile_server(name, parts[0], parts[1], parts[2])
            return self.add_set(path)
        return self

    def delete_vrf_dhcp_subnet_option_bootfile_server(self, name: str, value: str) -> "VrfDhcpMixin":
        """Delete subnet option bootfile-server. Value format: 'network,prefix'."""
        parts = value.split(",", 1)
        if len(parts) == 2:
            path = self.mappers["vrf_dhcp"].get_dhcp_subnet(name, parts[0], parts[1]) + ["option", "bootfile-server"]
            return self.add_delete(path)
        return self

    def set_vrf_dhcp_subnet_option_bootfile_size(self, name: str, value: str) -> "VrfDhcpMixin":
        """Set subnet option bootfile-size. Value format: 'network,prefix,size'."""
        parts = value.split(",", 2)
        if len(parts) == 3:
            path = self.mappers["vrf_dhcp"].get_dhcp_subnet_option_bootfile_size(name, parts[0], parts[1], parts[2])
            return self.add_set(path)
        return self

    def delete_vrf_dhcp_subnet_option_bootfile_size(self, name: str, value: str) -> "VrfDhcpMixin":
        """Delete subnet option bootfile-size. Value format: 'network,prefix'."""
        parts = value.split(",", 1)
        if len(parts) == 2:
            path = self.mappers["vrf_dhcp"].get_dhcp_subnet(name, parts[0], parts[1]) + ["option", "bootfile-size"]
            return self.add_delete(path)
        return self

    def set_vrf_dhcp_subnet_option_client_prefix_length(self, name: str, value: str) -> "VrfDhcpMixin":
        """Set subnet option client-prefix-length. Value format: 'network,prefix,length'."""
        parts = value.split(",", 2)
        if len(parts) == 3:
            path = self.mappers["vrf_dhcp"].get_dhcp_subnet_option_client_prefix_length(name, parts[0], parts[1], parts[2])
            return self.add_set(path)
        return self

    def delete_vrf_dhcp_subnet_option_client_prefix_length(self, name: str, value: str) -> "VrfDhcpMixin":
        """Delete subnet option client-prefix-length. Value format: 'network,prefix'."""
        parts = value.split(",", 1)
        if len(parts) == 2:
            path = self.mappers["vrf_dhcp"].get_dhcp_subnet(name, parts[0], parts[1]) + ["option", "client-prefix-length"]
            return self.add_delete(path)
        return self

    def set_vrf_dhcp_subnet_option_default_router(self, name: str, value: str) -> "VrfDhcpMixin":
        """Set subnet option default-router. Value format: 'network,prefix,router'."""
        parts = value.split(",", 2)
        if len(parts) == 3:
            path = self.mappers["vrf_dhcp"].get_dhcp_subnet_option_default_router(name, parts[0], parts[1], parts[2])
            return self.add_set(path)
        return self

    def delete_vrf_dhcp_subnet_option_default_router(self, name: str, value: str) -> "VrfDhcpMixin":
        """Delete subnet option default-router. Value format: 'network,prefix'."""
        parts = value.split(",", 1)
        if len(parts) == 2:
            path = self.mappers["vrf_dhcp"].get_dhcp_subnet(name, parts[0], parts[1]) + ["option", "default-router"]
            return self.add_delete(path)
        return self

    def set_vrf_dhcp_subnet_option_domain_name(self, name: str, value: str) -> "VrfDhcpMixin":
        """Set subnet option domain-name. Value format: 'network,prefix,domain'."""
        parts = value.split(",", 2)
        if len(parts) == 3:
            path = self.mappers["vrf_dhcp"].get_dhcp_subnet_option_domain_name(name, parts[0], parts[1], parts[2])
            return self.add_set(path)
        return self

    def delete_vrf_dhcp_subnet_option_domain_name(self, name: str, value: str) -> "VrfDhcpMixin":
        """Delete subnet option domain-name. Value format: 'network,prefix'."""
        parts = value.split(",", 1)
        if len(parts) == 2:
            path = self.mappers["vrf_dhcp"].get_dhcp_subnet(name, parts[0], parts[1]) + ["option", "domain-name"]
            return self.add_delete(path)
        return self

    def set_vrf_dhcp_subnet_option_domain_search(self, name: str, value: str) -> "VrfDhcpMixin":
        """Set subnet option domain-search. Value format: 'network,prefix,domain'."""
        parts = value.split(",", 2)
        if len(parts) == 3:
            path = self.mappers["vrf_dhcp"].get_dhcp_subnet_option_domain_search(name, parts[0], parts[1], parts[2])
            return self.add_set(path)
        return self

    def delete_vrf_dhcp_subnet_option_domain_search(self, name: str, value: str) -> "VrfDhcpMixin":
        """Delete subnet option domain-search. Value format: 'network,prefix,domain'."""
        parts = value.split(",", 2)
        if len(parts) == 3:
            path = self.mappers["vrf_dhcp"].get_dhcp_subnet_option_domain_search(name, parts[0], parts[1], parts[2])
            return self.add_delete(path)
        return self

    def set_vrf_dhcp_subnet_option_ip_forwarding(self, name: str, value: str) -> "VrfDhcpMixin":
        """Enable subnet option ip-forwarding. Value format: 'network,prefix'."""
        parts = value.split(",", 1)
        if len(parts) == 2:
            path = self.mappers["vrf_dhcp"].get_dhcp_subnet_option_ip_forwarding(name, parts[0], parts[1])
            return self.add_set(path)
        return self

    def delete_vrf_dhcp_subnet_option_ip_forwarding(self, name: str, value: str) -> "VrfDhcpMixin":
        """Disable subnet option ip-forwarding. Value format: 'network,prefix'."""
        parts = value.split(",", 1)
        if len(parts) == 2:
            path = self.mappers["vrf_dhcp"].get_dhcp_subnet_option_ip_forwarding(name, parts[0], parts[1])
            return self.add_delete(path)
        return self

    def set_vrf_dhcp_subnet_option_name_server(self, name: str, value: str) -> "VrfDhcpMixin":
        """Set subnet option name-server. Value format: 'network,prefix,server'."""
        parts = value.split(",", 2)
        if len(parts) == 3:
            path = self.mappers["vrf_dhcp"].get_dhcp_subnet_option_name_server(name, parts[0], parts[1], parts[2])
            return self.add_set(path)
        return self

    def delete_vrf_dhcp_subnet_option_name_server(self, name: str, value: str) -> "VrfDhcpMixin":
        """Delete subnet option name-server. Value format: 'network,prefix,server'."""
        parts = value.split(",", 2)
        if len(parts) == 3:
            path = self.mappers["vrf_dhcp"].get_dhcp_subnet_option_name_server(name, parts[0], parts[1], parts[2])
            return self.add_delete(path)
        return self

    def set_vrf_dhcp_subnet_option_ntp_server(self, name: str, value: str) -> "VrfDhcpMixin":
        """Set subnet option ntp-server. Value format: 'network,prefix,server'."""
        parts = value.split(",", 2)
        if len(parts) == 3:
            path = self.mappers["vrf_dhcp"].get_dhcp_subnet_option_ntp_server(name, parts[0], parts[1], parts[2])
            return self.add_set(path)
        return self

    def delete_vrf_dhcp_subnet_option_ntp_server(self, name: str, value: str) -> "VrfDhcpMixin":
        """Delete subnet option ntp-server. Value format: 'network,prefix,server'."""
        parts = value.split(",", 2)
        if len(parts) == 3:
            path = self.mappers["vrf_dhcp"].get_dhcp_subnet_option_ntp_server(name, parts[0], parts[1], parts[2])
            return self.add_delete(path)
        return self

    def set_vrf_dhcp_subnet_option_pop_server(self, name: str, value: str) -> "VrfDhcpMixin":
        """Set subnet option pop-server. Value format: 'network,prefix,server'."""
        parts = value.split(",", 2)
        if len(parts) == 3:
            path = self.mappers["vrf_dhcp"].get_dhcp_subnet_option_pop_server(name, parts[0], parts[1], parts[2])
            return self.add_set(path)
        return self

    def delete_vrf_dhcp_subnet_option_pop_server(self, name: str, value: str) -> "VrfDhcpMixin":
        """Delete subnet option pop-server. Value format: 'network,prefix,server'."""
        parts = value.split(",", 2)
        if len(parts) == 3:
            path = self.mappers["vrf_dhcp"].get_dhcp_subnet_option_pop_server(name, parts[0], parts[1], parts[2])
            return self.add_delete(path)
        return self

    def set_vrf_dhcp_subnet_option_smtp_server(self, name: str, value: str) -> "VrfDhcpMixin":
        """Set subnet option smtp-server. Value format: 'network,prefix,server'."""
        parts = value.split(",", 2)
        if len(parts) == 3:
            path = self.mappers["vrf_dhcp"].get_dhcp_subnet_option_smtp_server(name, parts[0], parts[1], parts[2])
            return self.add_set(path)
        return self

    def delete_vrf_dhcp_subnet_option_smtp_server(self, name: str, value: str) -> "VrfDhcpMixin":
        """Delete subnet option smtp-server. Value format: 'network,prefix,server'."""
        parts = value.split(",", 2)
        if len(parts) == 3:
            path = self.mappers["vrf_dhcp"].get_dhcp_subnet_option_smtp_server(name, parts[0], parts[1], parts[2])
            return self.add_delete(path)
        return self

    def set_vrf_dhcp_subnet_option_static_route(self, name: str, value: str) -> "VrfDhcpMixin":
        """Set subnet option static-route. Value format: 'network,prefix,route'."""
        parts = value.split(",", 2)
        if len(parts) == 3:
            path = self.mappers["vrf_dhcp"].get_dhcp_subnet_option_static_route(name, parts[0], parts[1], parts[2])
            return self.add_set(path)
        return self

    def delete_vrf_dhcp_subnet_option_static_route(self, name: str, value: str) -> "VrfDhcpMixin":
        """Delete subnet option static-route. Value format: 'network,prefix'."""
        parts = value.split(",", 1)
        if len(parts) == 2:
            path = self.mappers["vrf_dhcp"].get_dhcp_subnet(name, parts[0], parts[1]) + ["option", "static-route"]
            return self.add_delete(path)
        return self

    def set_vrf_dhcp_subnet_option_tftp_server_name(self, name: str, value: str) -> "VrfDhcpMixin":
        """Set subnet option tftp-server-name. Value format: 'network,prefix,server'."""
        parts = value.split(",", 2)
        if len(parts) == 3:
            path = self.mappers["vrf_dhcp"].get_dhcp_subnet_option_tftp_server_name(name, parts[0], parts[1], parts[2])
            return self.add_set(path)
        return self

    def delete_vrf_dhcp_subnet_option_tftp_server_name(self, name: str, value: str) -> "VrfDhcpMixin":
        """Delete subnet option tftp-server-name. Value format: 'network,prefix'."""
        parts = value.split(",", 1)
        if len(parts) == 2:
            path = self.mappers["vrf_dhcp"].get_dhcp_subnet(name, parts[0], parts[1]) + ["option", "tftp-server-name"]
            return self.add_delete(path)
        return self

    def set_vrf_dhcp_subnet_option_time_offset(self, name: str, value: str) -> "VrfDhcpMixin":
        """Set subnet option time-offset. Value format: 'network,prefix,offset'."""
        parts = value.split(",", 2)
        if len(parts) == 3:
            path = self.mappers["vrf_dhcp"].get_dhcp_subnet_option_time_offset(name, parts[0], parts[1], parts[2])
            return self.add_set(path)
        return self

    def delete_vrf_dhcp_subnet_option_time_offset(self, name: str, value: str) -> "VrfDhcpMixin":
        """Delete subnet option time-offset. Value format: 'network,prefix'."""
        parts = value.split(",", 1)
        if len(parts) == 2:
            path = self.mappers["vrf_dhcp"].get_dhcp_subnet(name, parts[0], parts[1]) + ["option", "time-offset"]
            return self.add_delete(path)
        return self

    def set_vrf_dhcp_subnet_option_time_server(self, name: str, value: str) -> "VrfDhcpMixin":
        """Set subnet option time-server. Value format: 'network,prefix,server'."""
        parts = value.split(",", 2)
        if len(parts) == 3:
            path = self.mappers["vrf_dhcp"].get_dhcp_subnet_option_time_server(name, parts[0], parts[1], parts[2])
            return self.add_set(path)
        return self

    def delete_vrf_dhcp_subnet_option_time_server(self, name: str, value: str) -> "VrfDhcpMixin":
        """Delete subnet option time-server. Value format: 'network,prefix,server'."""
        parts = value.split(",", 2)
        if len(parts) == 3:
            path = self.mappers["vrf_dhcp"].get_dhcp_subnet_option_time_server(name, parts[0], parts[1], parts[2])
            return self.add_delete(path)
        return self

    def set_vrf_dhcp_subnet_option_time_zone(self, name: str, value: str) -> "VrfDhcpMixin":
        """Set subnet option time-zone. Value format: 'network,prefix,timezone'."""
        parts = value.split(",", 2)
        if len(parts) == 3:
            path = self.mappers["vrf_dhcp"].get_dhcp_subnet_option_time_zone(name, parts[0], parts[1], parts[2])
            return self.add_set(path)
        return self

    def delete_vrf_dhcp_subnet_option_time_zone(self, name: str, value: str) -> "VrfDhcpMixin":
        """Delete subnet option time-zone. Value format: 'network,prefix'."""
        parts = value.split(",", 1)
        if len(parts) == 2:
            path = self.mappers["vrf_dhcp"].get_dhcp_subnet(name, parts[0], parts[1]) + ["option", "time-zone"]
            return self.add_delete(path)
        return self

    def set_vrf_dhcp_subnet_option_wins_server(self, name: str, value: str) -> "VrfDhcpMixin":
        """Set subnet option wins-server. Value format: 'network,prefix,server'."""
        parts = value.split(",", 2)
        if len(parts) == 3:
            path = self.mappers["vrf_dhcp"].get_dhcp_subnet_option_wins_server(name, parts[0], parts[1], parts[2])
            return self.add_set(path)
        return self

    def delete_vrf_dhcp_subnet_option_wins_server(self, name: str, value: str) -> "VrfDhcpMixin":
        """Delete subnet option wins-server. Value format: 'network,prefix,server'."""
        parts = value.split(",", 2)
        if len(parts) == 3:
            path = self.mappers["vrf_dhcp"].get_dhcp_subnet_option_wins_server(name, parts[0], parts[1], parts[2])
            return self.add_delete(path)
        return self

    def set_vrf_dhcp_subnet_option_wpad_url(self, name: str, value: str) -> "VrfDhcpMixin":
        """Set subnet option wpad-url. Value format: 'network,prefix,url'."""
        parts = value.split(",", 2)
        if len(parts) == 3:
            path = self.mappers["vrf_dhcp"].get_dhcp_subnet_option_wpad_url(name, parts[0], parts[1], parts[2])
            return self.add_set(path)
        return self

    def delete_vrf_dhcp_subnet_option_wpad_url(self, name: str, value: str) -> "VrfDhcpMixin":
        """Delete subnet option wpad-url. Value format: 'network,prefix'."""
        parts = value.split(",", 1)
        if len(parts) == 2:
            path = self.mappers["vrf_dhcp"].get_dhcp_subnet(name, parts[0], parts[1]) + ["option", "wpad-url"]
            return self.add_delete(path)
        return self

    def set_vrf_dhcp_subnet_option_vendor_option(self, name: str, value: str) -> "VrfDhcpMixin":
        """Enable subnet option vendor-option. Value format: 'network,prefix'."""
        parts = value.split(",", 1)
        if len(parts) == 2:
            path = self.mappers["vrf_dhcp"].get_dhcp_subnet_option_vendor_option(name, parts[0], parts[1])
            return self.add_set(path)
        return self

    def delete_vrf_dhcp_subnet_option_vendor_option(self, name: str, value: str) -> "VrfDhcpMixin":
        """Disable subnet option vendor-option. Value format: 'network,prefix'."""
        parts = value.split(",", 1)
        if len(parts) == 2:
            path = self.mappers["vrf_dhcp"].get_dhcp_subnet_option_vendor_option(name, parts[0], parts[1])
            return self.add_delete(path)
        return self

    # ========================================================================
    # Subnet Range
    # ========================================================================

    def set_vrf_dhcp_subnet_range(self, name: str, value: str) -> "VrfDhcpMixin":
        """Create a subnet range. Value format: 'network,prefix,range_name'."""
        parts = value.split(",", 2)
        if len(parts) == 3:
            path = self.mappers["vrf_dhcp"].get_dhcp_subnet_range(name, parts[0], parts[1], parts[2])
            return self.add_set(path)
        return self

    def delete_vrf_dhcp_subnet_range(self, name: str, value: str) -> "VrfDhcpMixin":
        """Delete a subnet range. Value format: 'network,prefix,range_name'."""
        parts = value.split(",", 2)
        if len(parts) == 3:
            path = self.mappers["vrf_dhcp"].get_dhcp_subnet_range(name, parts[0], parts[1], parts[2])
            return self.add_delete(path)
        return self

    def set_vrf_dhcp_subnet_range_start(self, name: str, value: str) -> "VrfDhcpMixin":
        """Set subnet range start address. Value format: 'network,prefix,range_name,start'."""
        parts = value.split(",", 3)
        if len(parts) == 4:
            path = self.mappers["vrf_dhcp"].get_dhcp_subnet_range_start(name, parts[0], parts[1], parts[2], parts[3])
            return self.add_set(path)
        return self

    def delete_vrf_dhcp_subnet_range_start(self, name: str, value: str) -> "VrfDhcpMixin":
        """Delete subnet range start address. Value format: 'network,prefix,range_name'."""
        parts = value.split(",", 2)
        if len(parts) == 3:
            path = self.mappers["vrf_dhcp"].get_dhcp_subnet_range(name, parts[0], parts[1], parts[2]) + ["start"]
            return self.add_delete(path)
        return self

    def set_vrf_dhcp_subnet_range_stop(self, name: str, value: str) -> "VrfDhcpMixin":
        """Set subnet range stop address. Value format: 'network,prefix,range_name,stop'."""
        parts = value.split(",", 3)
        if len(parts) == 4:
            path = self.mappers["vrf_dhcp"].get_dhcp_subnet_range_stop(name, parts[0], parts[1], parts[2], parts[3])
            return self.add_set(path)
        return self

    def delete_vrf_dhcp_subnet_range_stop(self, name: str, value: str) -> "VrfDhcpMixin":
        """Delete subnet range stop address. Value format: 'network,prefix,range_name'."""
        parts = value.split(",", 2)
        if len(parts) == 3:
            path = self.mappers["vrf_dhcp"].get_dhcp_subnet_range(name, parts[0], parts[1], parts[2]) + ["stop"]
            return self.add_delete(path)
        return self

    # ========================================================================
    # Static Mapping
    # ========================================================================

    def set_vrf_dhcp_static_mapping(self, name: str, value: str) -> "VrfDhcpMixin":
        """Create a static mapping. Value format: 'network,prefix,host'."""
        parts = value.split(",", 2)
        if len(parts) == 3:
            path = self.mappers["vrf_dhcp"].get_dhcp_static_mapping(name, parts[0], parts[1], parts[2])
            return self.add_set(path)
        return self

    def delete_vrf_dhcp_static_mapping(self, name: str, value: str) -> "VrfDhcpMixin":
        """Delete a static mapping. Value format: 'network,prefix,host'."""
        parts = value.split(",", 2)
        if len(parts) == 3:
            path = self.mappers["vrf_dhcp"].get_dhcp_static_mapping(name, parts[0], parts[1], parts[2])
            return self.add_delete(path)
        return self

    def set_vrf_dhcp_static_mapping_description(self, name: str, value: str) -> "VrfDhcpMixin":
        """Set static mapping description. Value format: 'network,prefix,host,description'."""
        parts = value.split(",", 3)
        if len(parts) == 4:
            path = self.mappers["vrf_dhcp"].get_dhcp_static_mapping_description(name, parts[0], parts[1], parts[2], parts[3])
            return self.add_set(path)
        return self

    def delete_vrf_dhcp_static_mapping_description(self, name: str, value: str) -> "VrfDhcpMixin":
        """Delete static mapping description. Value format: 'network,prefix,host'."""
        parts = value.split(",", 2)
        if len(parts) == 3:
            path = self.mappers["vrf_dhcp"].get_dhcp_static_mapping(name, parts[0], parts[1], parts[2]) + ["description"]
            return self.add_delete(path)
        return self

    def set_vrf_dhcp_static_mapping_disable(self, name: str, value: str) -> "VrfDhcpMixin":
        """Disable a static mapping. Value format: 'network,prefix,host'."""
        parts = value.split(",", 2)
        if len(parts) == 3:
            path = self.mappers["vrf_dhcp"].get_dhcp_static_mapping_disable(name, parts[0], parts[1], parts[2])
            return self.add_set(path)
        return self

    def delete_vrf_dhcp_static_mapping_disable(self, name: str, value: str) -> "VrfDhcpMixin":
        """Re-enable a static mapping. Value format: 'network,prefix,host'."""
        parts = value.split(",", 2)
        if len(parts) == 3:
            path = self.mappers["vrf_dhcp"].get_dhcp_static_mapping_disable(name, parts[0], parts[1], parts[2])
            return self.add_delete(path)
        return self

    def set_vrf_dhcp_static_mapping_ip_address(self, name: str, value: str) -> "VrfDhcpMixin":
        """Set static mapping IP address. Value format: 'network,prefix,host,ip'."""
        parts = value.split(",", 3)
        if len(parts) == 4:
            path = self.mappers["vrf_dhcp"].get_dhcp_static_mapping_ip_address(name, parts[0], parts[1], parts[2], parts[3])
            return self.add_set(path)
        return self

    def delete_vrf_dhcp_static_mapping_ip_address(self, name: str, value: str) -> "VrfDhcpMixin":
        """Delete static mapping IP address. Value format: 'network,prefix,host'."""
        parts = value.split(",", 2)
        if len(parts) == 3:
            path = self.mappers["vrf_dhcp"].get_dhcp_static_mapping(name, parts[0], parts[1], parts[2]) + ["ip-address"]
            return self.add_delete(path)
        return self

    def set_vrf_dhcp_static_mapping_mac_address(self, name: str, value: str) -> "VrfDhcpMixin":
        """Set static mapping MAC address. Value format: 'network,prefix,host,mac'."""
        parts = value.split(",", 3)
        if len(parts) == 4:
            path = self.mappers["vrf_dhcp"].get_dhcp_static_mapping_mac_address(name, parts[0], parts[1], parts[2], parts[3])
            return self.add_set(path)
        return self

    def delete_vrf_dhcp_static_mapping_mac_address(self, name: str, value: str) -> "VrfDhcpMixin":
        """Delete static mapping MAC address. Value format: 'network,prefix,host'."""
        parts = value.split(",", 2)
        if len(parts) == 3:
            path = self.mappers["vrf_dhcp"].get_dhcp_static_mapping(name, parts[0], parts[1], parts[2]) + ["mac"]
            return self.add_delete(path)
        return self

    # ========================================================================
    # Static Mapping Options
    # ========================================================================

    def set_vrf_dhcp_static_mapping_option_bootfile_name(self, name: str, value: str) -> "VrfDhcpMixin":
        """Set static mapping option bootfile-name. Value format: 'network,prefix,host,bootfile'."""
        parts = value.split(",", 3)
        if len(parts) == 4:
            path = self.mappers["vrf_dhcp"].get_dhcp_static_mapping_option_bootfile_name(name, parts[0], parts[1], parts[2], parts[3])
            return self.add_set(path)
        return self

    def delete_vrf_dhcp_static_mapping_option_bootfile_name(self, name: str, value: str) -> "VrfDhcpMixin":
        """Delete static mapping option bootfile-name. Value format: 'network,prefix,host'."""
        parts = value.split(",", 2)
        if len(parts) == 3:
            path = self.mappers["vrf_dhcp"].get_dhcp_static_mapping(name, parts[0], parts[1], parts[2]) + ["option", "bootfile-name"]
            return self.add_delete(path)
        return self

    def set_vrf_dhcp_static_mapping_option_bootfile_server(self, name: str, value: str) -> "VrfDhcpMixin":
        """Set static mapping option bootfile-server. Value format: 'network,prefix,host,server'."""
        parts = value.split(",", 3)
        if len(parts) == 4:
            path = self.mappers["vrf_dhcp"].get_dhcp_static_mapping_option_bootfile_server(name, parts[0], parts[1], parts[2], parts[3])
            return self.add_set(path)
        return self

    def delete_vrf_dhcp_static_mapping_option_bootfile_server(self, name: str, value: str) -> "VrfDhcpMixin":
        """Delete static mapping option bootfile-server. Value format: 'network,prefix,host'."""
        parts = value.split(",", 2)
        if len(parts) == 3:
            path = self.mappers["vrf_dhcp"].get_dhcp_static_mapping(name, parts[0], parts[1], parts[2]) + ["option", "bootfile-server"]
            return self.add_delete(path)
        return self

    def set_vrf_dhcp_static_mapping_option_bootfile_size(self, name: str, value: str) -> "VrfDhcpMixin":
        """Set static mapping option bootfile-size. Value format: 'network,prefix,host,size'."""
        parts = value.split(",", 3)
        if len(parts) == 4:
            path = self.mappers["vrf_dhcp"].get_dhcp_static_mapping_option_bootfile_size(name, parts[0], parts[1], parts[2], parts[3])
            return self.add_set(path)
        return self

    def delete_vrf_dhcp_static_mapping_option_bootfile_size(self, name: str, value: str) -> "VrfDhcpMixin":
        """Delete static mapping option bootfile-size. Value format: 'network,prefix,host'."""
        parts = value.split(",", 2)
        if len(parts) == 3:
            path = self.mappers["vrf_dhcp"].get_dhcp_static_mapping(name, parts[0], parts[1], parts[2]) + ["option", "bootfile-size"]
            return self.add_delete(path)
        return self

    def set_vrf_dhcp_static_mapping_option_client_prefix_length(self, name: str, value: str) -> "VrfDhcpMixin":
        """Set static mapping option client-prefix-length. Value format: 'network,prefix,host,length'."""
        parts = value.split(",", 3)
        if len(parts) == 4:
            path = self.mappers["vrf_dhcp"].get_dhcp_static_mapping_option_client_prefix_length(name, parts[0], parts[1], parts[2], parts[3])
            return self.add_set(path)
        return self

    def delete_vrf_dhcp_static_mapping_option_client_prefix_length(self, name: str, value: str) -> "VrfDhcpMixin":
        """Delete static mapping option client-prefix-length. Value format: 'network,prefix,host'."""
        parts = value.split(",", 2)
        if len(parts) == 3:
            path = self.mappers["vrf_dhcp"].get_dhcp_static_mapping(name, parts[0], parts[1], parts[2]) + ["option", "client-prefix-length"]
            return self.add_delete(path)
        return self

    def set_vrf_dhcp_static_mapping_option_default_router(self, name: str, value: str) -> "VrfDhcpMixin":
        """Set static mapping option default-router. Value format: 'network,prefix,host,router'."""
        parts = value.split(",", 3)
        if len(parts) == 4:
            path = self.mappers["vrf_dhcp"].get_dhcp_static_mapping_option_default_router(name, parts[0], parts[1], parts[2], parts[3])
            return self.add_set(path)
        return self

    def delete_vrf_dhcp_static_mapping_option_default_router(self, name: str, value: str) -> "VrfDhcpMixin":
        """Delete static mapping option default-router. Value format: 'network,prefix,host'."""
        parts = value.split(",", 2)
        if len(parts) == 3:
            path = self.mappers["vrf_dhcp"].get_dhcp_static_mapping(name, parts[0], parts[1], parts[2]) + ["option", "default-router"]
            return self.add_delete(path)
        return self

    def set_vrf_dhcp_static_mapping_option_domain_name(self, name: str, value: str) -> "VrfDhcpMixin":
        """Set static mapping option domain-name. Value format: 'network,prefix,host,domain'."""
        parts = value.split(",", 3)
        if len(parts) == 4:
            path = self.mappers["vrf_dhcp"].get_dhcp_static_mapping_option_domain_name(name, parts[0], parts[1], parts[2], parts[3])
            return self.add_set(path)
        return self

    def delete_vrf_dhcp_static_mapping_option_domain_name(self, name: str, value: str) -> "VrfDhcpMixin":
        """Delete static mapping option domain-name. Value format: 'network,prefix,host'."""
        parts = value.split(",", 2)
        if len(parts) == 3:
            path = self.mappers["vrf_dhcp"].get_dhcp_static_mapping(name, parts[0], parts[1], parts[2]) + ["option", "domain-name"]
            return self.add_delete(path)
        return self

    def set_vrf_dhcp_static_mapping_option_domain_search(self, name: str, value: str) -> "VrfDhcpMixin":
        """Set static mapping option domain-search. Value format: 'network,prefix,host,domain'."""
        parts = value.split(",", 3)
        if len(parts) == 4:
            path = self.mappers["vrf_dhcp"].get_dhcp_static_mapping_option_domain_search(name, parts[0], parts[1], parts[2], parts[3])
            return self.add_set(path)
        return self

    def delete_vrf_dhcp_static_mapping_option_domain_search(self, name: str, value: str) -> "VrfDhcpMixin":
        """Delete static mapping option domain-search. Value format: 'network,prefix,host,domain'."""
        parts = value.split(",", 3)
        if len(parts) == 4:
            path = self.mappers["vrf_dhcp"].get_dhcp_static_mapping_option_domain_search(name, parts[0], parts[1], parts[2], parts[3])
            return self.add_delete(path)
        return self

    def set_vrf_dhcp_static_mapping_option_ip_forwarding(self, name: str, value: str) -> "VrfDhcpMixin":
        """Enable static mapping option ip-forwarding. Value format: 'network,prefix,host'."""
        parts = value.split(",", 2)
        if len(parts) == 3:
            path = self.mappers["vrf_dhcp"].get_dhcp_static_mapping_option_ip_forwarding(name, parts[0], parts[1], parts[2])
            return self.add_set(path)
        return self

    def delete_vrf_dhcp_static_mapping_option_ip_forwarding(self, name: str, value: str) -> "VrfDhcpMixin":
        """Disable static mapping option ip-forwarding. Value format: 'network,prefix,host'."""
        parts = value.split(",", 2)
        if len(parts) == 3:
            path = self.mappers["vrf_dhcp"].get_dhcp_static_mapping_option_ip_forwarding(name, parts[0], parts[1], parts[2])
            return self.add_delete(path)
        return self

    def set_vrf_dhcp_static_mapping_option_name_server(self, name: str, value: str) -> "VrfDhcpMixin":
        """Set static mapping option name-server. Value format: 'network,prefix,host,server'."""
        parts = value.split(",", 3)
        if len(parts) == 4:
            path = self.mappers["vrf_dhcp"].get_dhcp_static_mapping_option_name_server(name, parts[0], parts[1], parts[2], parts[3])
            return self.add_set(path)
        return self

    def delete_vrf_dhcp_static_mapping_option_name_server(self, name: str, value: str) -> "VrfDhcpMixin":
        """Delete static mapping option name-server. Value format: 'network,prefix,host,server'."""
        parts = value.split(",", 3)
        if len(parts) == 4:
            path = self.mappers["vrf_dhcp"].get_dhcp_static_mapping_option_name_server(name, parts[0], parts[1], parts[2], parts[3])
            return self.add_delete(path)
        return self

    def set_vrf_dhcp_static_mapping_option_ntp_server(self, name: str, value: str) -> "VrfDhcpMixin":
        """Set static mapping option ntp-server. Value format: 'network,prefix,host,server'."""
        parts = value.split(",", 3)
        if len(parts) == 4:
            path = self.mappers["vrf_dhcp"].get_dhcp_static_mapping_option_ntp_server(name, parts[0], parts[1], parts[2], parts[3])
            return self.add_set(path)
        return self

    def delete_vrf_dhcp_static_mapping_option_ntp_server(self, name: str, value: str) -> "VrfDhcpMixin":
        """Delete static mapping option ntp-server. Value format: 'network,prefix,host,server'."""
        parts = value.split(",", 3)
        if len(parts) == 4:
            path = self.mappers["vrf_dhcp"].get_dhcp_static_mapping_option_ntp_server(name, parts[0], parts[1], parts[2], parts[3])
            return self.add_delete(path)
        return self

    def set_vrf_dhcp_static_mapping_option_pop_server(self, name: str, value: str) -> "VrfDhcpMixin":
        """Set static mapping option pop-server. Value format: 'network,prefix,host,server'."""
        parts = value.split(",", 3)
        if len(parts) == 4:
            path = self.mappers["vrf_dhcp"].get_dhcp_static_mapping_option_pop_server(name, parts[0], parts[1], parts[2], parts[3])
            return self.add_set(path)
        return self

    def delete_vrf_dhcp_static_mapping_option_pop_server(self, name: str, value: str) -> "VrfDhcpMixin":
        """Delete static mapping option pop-server. Value format: 'network,prefix,host,server'."""
        parts = value.split(",", 3)
        if len(parts) == 4:
            path = self.mappers["vrf_dhcp"].get_dhcp_static_mapping_option_pop_server(name, parts[0], parts[1], parts[2], parts[3])
            return self.add_delete(path)
        return self

    def set_vrf_dhcp_static_mapping_option_smtp_server(self, name: str, value: str) -> "VrfDhcpMixin":
        """Set static mapping option smtp-server. Value format: 'network,prefix,host,server'."""
        parts = value.split(",", 3)
        if len(parts) == 4:
            path = self.mappers["vrf_dhcp"].get_dhcp_static_mapping_option_smtp_server(name, parts[0], parts[1], parts[2], parts[3])
            return self.add_set(path)
        return self

    def delete_vrf_dhcp_static_mapping_option_smtp_server(self, name: str, value: str) -> "VrfDhcpMixin":
        """Delete static mapping option smtp-server. Value format: 'network,prefix,host,server'."""
        parts = value.split(",", 3)
        if len(parts) == 4:
            path = self.mappers["vrf_dhcp"].get_dhcp_static_mapping_option_smtp_server(name, parts[0], parts[1], parts[2], parts[3])
            return self.add_delete(path)
        return self

    def set_vrf_dhcp_static_mapping_option_static_route(self, name: str, value: str) -> "VrfDhcpMixin":
        """Set static mapping option static-route. Value format: 'network,prefix,host,route'."""
        parts = value.split(",", 3)
        if len(parts) == 4:
            path = self.mappers["vrf_dhcp"].get_dhcp_static_mapping_option_static_route(name, parts[0], parts[1], parts[2], parts[3])
            return self.add_set(path)
        return self

    def delete_vrf_dhcp_static_mapping_option_static_route(self, name: str, value: str) -> "VrfDhcpMixin":
        """Delete static mapping option static-route. Value format: 'network,prefix,host'."""
        parts = value.split(",", 2)
        if len(parts) == 3:
            path = self.mappers["vrf_dhcp"].get_dhcp_static_mapping(name, parts[0], parts[1], parts[2]) + ["option", "static-route"]
            return self.add_delete(path)
        return self

    def set_vrf_dhcp_static_mapping_option_tftp_server_name(self, name: str, value: str) -> "VrfDhcpMixin":
        """Set static mapping option tftp-server-name. Value format: 'network,prefix,host,server'."""
        parts = value.split(",", 3)
        if len(parts) == 4:
            path = self.mappers["vrf_dhcp"].get_dhcp_static_mapping_option_tftp_server_name(name, parts[0], parts[1], parts[2], parts[3])
            return self.add_set(path)
        return self

    def delete_vrf_dhcp_static_mapping_option_tftp_server_name(self, name: str, value: str) -> "VrfDhcpMixin":
        """Delete static mapping option tftp-server-name. Value format: 'network,prefix,host'."""
        parts = value.split(",", 2)
        if len(parts) == 3:
            path = self.mappers["vrf_dhcp"].get_dhcp_static_mapping(name, parts[0], parts[1], parts[2]) + ["option", "tftp-server-name"]
            return self.add_delete(path)
        return self

    def set_vrf_dhcp_static_mapping_option_time_offset(self, name: str, value: str) -> "VrfDhcpMixin":
        """Set static mapping option time-offset. Value format: 'network,prefix,host,offset'."""
        parts = value.split(",", 3)
        if len(parts) == 4:
            path = self.mappers["vrf_dhcp"].get_dhcp_static_mapping_option_time_offset(name, parts[0], parts[1], parts[2], parts[3])
            return self.add_set(path)
        return self

    def delete_vrf_dhcp_static_mapping_option_time_offset(self, name: str, value: str) -> "VrfDhcpMixin":
        """Delete static mapping option time-offset. Value format: 'network,prefix,host'."""
        parts = value.split(",", 2)
        if len(parts) == 3:
            path = self.mappers["vrf_dhcp"].get_dhcp_static_mapping(name, parts[0], parts[1], parts[2]) + ["option", "time-offset"]
            return self.add_delete(path)
        return self

    def set_vrf_dhcp_static_mapping_option_time_server(self, name: str, value: str) -> "VrfDhcpMixin":
        """Set static mapping option time-server. Value format: 'network,prefix,host,server'."""
        parts = value.split(",", 3)
        if len(parts) == 4:
            path = self.mappers["vrf_dhcp"].get_dhcp_static_mapping_option_time_server(name, parts[0], parts[1], parts[2], parts[3])
            return self.add_set(path)
        return self

    def delete_vrf_dhcp_static_mapping_option_time_server(self, name: str, value: str) -> "VrfDhcpMixin":
        """Delete static mapping option time-server. Value format: 'network,prefix,host,server'."""
        parts = value.split(",", 3)
        if len(parts) == 4:
            path = self.mappers["vrf_dhcp"].get_dhcp_static_mapping_option_time_server(name, parts[0], parts[1], parts[2], parts[3])
            return self.add_delete(path)
        return self

    def set_vrf_dhcp_static_mapping_option_time_zone(self, name: str, value: str) -> "VrfDhcpMixin":
        """Set static mapping option time-zone. Value format: 'network,prefix,host,timezone'."""
        parts = value.split(",", 3)
        if len(parts) == 4:
            path = self.mappers["vrf_dhcp"].get_dhcp_static_mapping_option_time_zone(name, parts[0], parts[1], parts[2], parts[3])
            return self.add_set(path)
        return self

    def delete_vrf_dhcp_static_mapping_option_time_zone(self, name: str, value: str) -> "VrfDhcpMixin":
        """Delete static mapping option time-zone. Value format: 'network,prefix,host'."""
        parts = value.split(",", 2)
        if len(parts) == 3:
            path = self.mappers["vrf_dhcp"].get_dhcp_static_mapping(name, parts[0], parts[1], parts[2]) + ["option", "time-zone"]
            return self.add_delete(path)
        return self

    def set_vrf_dhcp_static_mapping_option_wins_server(self, name: str, value: str) -> "VrfDhcpMixin":
        """Set static mapping option wins-server. Value format: 'network,prefix,host,server'."""
        parts = value.split(",", 3)
        if len(parts) == 4:
            path = self.mappers["vrf_dhcp"].get_dhcp_static_mapping_option_wins_server(name, parts[0], parts[1], parts[2], parts[3])
            return self.add_set(path)
        return self

    def delete_vrf_dhcp_static_mapping_option_wins_server(self, name: str, value: str) -> "VrfDhcpMixin":
        """Delete static mapping option wins-server. Value format: 'network,prefix,host,server'."""
        parts = value.split(",", 3)
        if len(parts) == 4:
            path = self.mappers["vrf_dhcp"].get_dhcp_static_mapping_option_wins_server(name, parts[0], parts[1], parts[2], parts[3])
            return self.add_delete(path)
        return self

    def set_vrf_dhcp_static_mapping_option_wpad_url(self, name: str, value: str) -> "VrfDhcpMixin":
        """Set static mapping option wpad-url. Value format: 'network,prefix,host,url'."""
        parts = value.split(",", 3)
        if len(parts) == 4:
            path = self.mappers["vrf_dhcp"].get_dhcp_static_mapping_option_wpad_url(name, parts[0], parts[1], parts[2], parts[3])
            return self.add_set(path)
        return self

    def delete_vrf_dhcp_static_mapping_option_wpad_url(self, name: str, value: str) -> "VrfDhcpMixin":
        """Delete static mapping option wpad-url. Value format: 'network,prefix,host'."""
        parts = value.split(",", 2)
        if len(parts) == 3:
            path = self.mappers["vrf_dhcp"].get_dhcp_static_mapping(name, parts[0], parts[1], parts[2]) + ["option", "wpad-url"]
            return self.add_delete(path)
        return self

    def set_vrf_dhcp_static_mapping_option_vendor_option(self, name: str, value: str) -> "VrfDhcpMixin":
        """Enable static mapping option vendor-option. Value format: 'network,prefix,host'."""
        parts = value.split(",", 2)
        if len(parts) == 3:
            path = self.mappers["vrf_dhcp"].get_dhcp_static_mapping_option_vendor_option(name, parts[0], parts[1], parts[2])
            return self.add_set(path)
        return self

    def delete_vrf_dhcp_static_mapping_option_vendor_option(self, name: str, value: str) -> "VrfDhcpMixin":
        """Disable static mapping option vendor-option. Value format: 'network,prefix,host'."""
        parts = value.split(",", 2)
        if len(parts) == 3:
            path = self.mappers["vrf_dhcp"].get_dhcp_static_mapping_option_vendor_option(name, parts[0], parts[1], parts[2])
            return self.add_delete(path)
        return self

    # ========================================================================
    # Extended Coverage Operations
    # ========================================================================

    # --- Root extras ---
    def set_vrf_dhcp_hostfile_update(self, name: str) -> "VrfDhcpMixin":
        """Enable hostfile-update."""
        return self.add_set(self.mappers["vrf_dhcp"].get_dhcp_hostfile_update(name))

    def delete_vrf_dhcp_hostfile_update(self, name: str) -> "VrfDhcpMixin":
        """Disable hostfile-update."""
        return self.add_delete(self.mappers["vrf_dhcp"].get_dhcp_hostfile_update(name))

    def set_vrf_dhcp_ha_ca_certificate(self, name: str, value: str) -> "VrfDhcpMixin":
        """Set high-availability ca-certificate."""
        return self.add_set(self.mappers["vrf_dhcp"].get_dhcp_ha_ca_certificate(name, value))

    def delete_vrf_dhcp_ha_ca_certificate(self, name: str) -> "VrfDhcpMixin":
        """Delete high-availability ca-certificate."""
        return self.add_delete(self.mappers["vrf_dhcp"].get_dhcp(name) + ["high-availability", "ca-certificate"])

    def set_vrf_dhcp_ha_certificate(self, name: str, value: str) -> "VrfDhcpMixin":
        """Set high-availability certificate."""
        return self.add_set(self.mappers["vrf_dhcp"].get_dhcp_ha_certificate(name, value))

    def delete_vrf_dhcp_ha_certificate(self, name: str) -> "VrfDhcpMixin":
        """Delete high-availability certificate."""
        return self.add_delete(self.mappers["vrf_dhcp"].get_dhcp(name) + ["high-availability", "certificate"])

    # --- Client class ---
    def set_vrf_dhcp_client_class(self, name: str, value: str) -> "VrfDhcpMixin":
        """Add a client-class. Value is the class name."""
        return self.add_set(self.mappers["vrf_dhcp"].get_dhcp_client_class(name, value))

    def delete_vrf_dhcp_client_class(self, name: str, value: str) -> "VrfDhcpMixin":
        """Delete a client-class. Value is the class name."""
        return self.add_delete(self.mappers["vrf_dhcp"].get_dhcp_client_class(name, value))

    def set_vrf_dhcp_client_class_disable(self, name: str, value: str) -> "VrfDhcpMixin":
        """Disable a client-class. Value is the class name."""
        return self.add_set(self.mappers["vrf_dhcp"].get_dhcp_client_class_disable(name, value))

    def delete_vrf_dhcp_client_class_disable(self, name: str, value: str) -> "VrfDhcpMixin":
        """Re-enable a client-class. Value is the class name."""
        return self.add_delete(self.mappers["vrf_dhcp"].get_dhcp_client_class_disable(name, value))

    def set_vrf_dhcp_client_class_relay_agent_information_circuit_id(self, name: str, value: str) -> "VrfDhcpMixin":
        """Value format: 'class,circuit-id'."""
        parts = value.split(",", 1)
        if len(parts) == 2:
            return self.add_set(self.mappers["vrf_dhcp"].get_dhcp_client_class_relay_agent_information_circuit_id(name, parts[0], parts[1]))
        return self

    def delete_vrf_dhcp_client_class_relay_agent_information_circuit_id(self, name: str, value: str) -> "VrfDhcpMixin":
        """Value is the class name."""
        return self.add_delete(self.mappers["vrf_dhcp"].get_dhcp_client_class(name, value) + ["relay-agent-information", "circuit-id"])

    def set_vrf_dhcp_client_class_relay_agent_information_remote_id(self, name: str, value: str) -> "VrfDhcpMixin":
        """Value format: 'class,remote-id'."""
        parts = value.split(",", 1)
        if len(parts) == 2:
            return self.add_set(self.mappers["vrf_dhcp"].get_dhcp_client_class_relay_agent_information_remote_id(name, parts[0], parts[1]))
        return self

    def delete_vrf_dhcp_client_class_relay_agent_information_remote_id(self, name: str, value: str) -> "VrfDhcpMixin":
        """Value is the class name."""
        return self.add_delete(self.mappers["vrf_dhcp"].get_dhcp_client_class(name, value) + ["relay-agent-information", "remote-id"])

    # --- Dynamic DNS update: flat fields (generic) at each scope ---
    def set_vrf_dhcp_ddns_field(self, name: str, value: str) -> "VrfDhcpMixin":
        """Value format: 'field,value'."""
        parts = value.split(",", 1)
        if len(parts) == 2:
            return self.add_set(self.mappers["vrf_dhcp"].get_dhcp_ddns_field(name, parts[0], parts[1]))
        return self

    def delete_vrf_dhcp_ddns_field(self, name: str, value: str) -> "VrfDhcpMixin":
        """Value is the field name."""
        return self.add_delete(self.mappers["vrf_dhcp"].get_dhcp(name) + ["dynamic-dns-update", value])

    def set_vrf_dhcp_shared_network_ddns_field(self, name: str, value: str) -> "VrfDhcpMixin":
        """Value format: 'network,field,value'."""
        parts = value.split(",", 2)
        if len(parts) == 3:
            return self.add_set(self.mappers["vrf_dhcp"].get_dhcp_shared_network_ddns_field(name, parts[0], parts[1], parts[2]))
        return self

    def delete_vrf_dhcp_shared_network_ddns_field(self, name: str, value: str) -> "VrfDhcpMixin":
        """Value format: 'network,field'."""
        parts = value.split(",", 1)
        if len(parts) == 2:
            return self.add_delete(self.mappers["vrf_dhcp"].get_dhcp_shared_network(name, parts[0]) + ["dynamic-dns-update", parts[1]])
        return self

    def set_vrf_dhcp_subnet_ddns_field(self, name: str, value: str) -> "VrfDhcpMixin":
        """Value format: 'network,prefix,field,value'."""
        parts = value.split(",", 3)
        if len(parts) == 4:
            return self.add_set(self.mappers["vrf_dhcp"].get_dhcp_subnet_ddns_field(name, parts[0], parts[1], parts[2], parts[3]))
        return self

    def delete_vrf_dhcp_subnet_ddns_field(self, name: str, value: str) -> "VrfDhcpMixin":
        """Value format: 'network,prefix,field'."""
        parts = value.split(",", 2)
        if len(parts) == 3:
            return self.add_delete(self.mappers["vrf_dhcp"].get_dhcp_subnet(name, parts[0], parts[1]) + ["dynamic-dns-update", parts[2]])
        return self

    # --- Dynamic DNS update: global nested (forward/reverse domain, tsig-key) ---
    def set_vrf_dhcp_ddns_domain_dns_server_address(self, name: str, value: str) -> "VrfDhcpMixin":
        """Value format: 'direction,domain,server,address'. direction: forward-domain|reverse-domain."""
        parts = value.split(",", 3)
        if len(parts) == 4:
            return self.add_set(self.mappers["vrf_dhcp"].get_dhcp_ddns_domain_dns_server_address(name, parts[0], parts[1], parts[2], parts[3]))
        return self

    def delete_vrf_dhcp_ddns_domain_dns_server_address(self, name: str, value: str) -> "VrfDhcpMixin":
        """Value format: 'direction,domain,server'."""
        parts = value.split(",", 2)
        if len(parts) == 3:
            path = self.mappers["vrf_dhcp"].get_dhcp(name) + ["dynamic-dns-update", parts[0], parts[1], "dns-server", parts[2], "address"]
            return self.add_delete(path)
        return self

    def set_vrf_dhcp_ddns_domain_dns_server_port(self, name: str, value: str) -> "VrfDhcpMixin":
        """Value format: 'direction,domain,server,port'."""
        parts = value.split(",", 3)
        if len(parts) == 4:
            return self.add_set(self.mappers["vrf_dhcp"].get_dhcp_ddns_domain_dns_server_port(name, parts[0], parts[1], parts[2], parts[3]))
        return self

    def delete_vrf_dhcp_ddns_domain_dns_server_port(self, name: str, value: str) -> "VrfDhcpMixin":
        """Value format: 'direction,domain,server'."""
        parts = value.split(",", 2)
        if len(parts) == 3:
            path = self.mappers["vrf_dhcp"].get_dhcp(name) + ["dynamic-dns-update", parts[0], parts[1], "dns-server", parts[2], "port"]
            return self.add_delete(path)
        return self

    def set_vrf_dhcp_ddns_domain_key_name(self, name: str, value: str) -> "VrfDhcpMixin":
        """Value format: 'direction,domain,key-name'."""
        parts = value.split(",", 2)
        if len(parts) == 3:
            return self.add_set(self.mappers["vrf_dhcp"].get_dhcp_ddns_domain_key_name(name, parts[0], parts[1], parts[2]))
        return self

    def delete_vrf_dhcp_ddns_domain_key_name(self, name: str, value: str) -> "VrfDhcpMixin":
        """Value format: 'direction,domain'."""
        parts = value.split(",", 1)
        if len(parts) == 2:
            path = self.mappers["vrf_dhcp"].get_dhcp(name) + ["dynamic-dns-update", parts[0], parts[1], "key-name"]
            return self.add_delete(path)
        return self

    def set_vrf_dhcp_ddns_tsig_key_algorithm(self, name: str, value: str) -> "VrfDhcpMixin":
        """Value format: 'key,algorithm'."""
        parts = value.split(",", 1)
        if len(parts) == 2:
            return self.add_set(self.mappers["vrf_dhcp"].get_dhcp_ddns_tsig_key_algorithm(name, parts[0], parts[1]))
        return self

    def delete_vrf_dhcp_ddns_tsig_key_algorithm(self, name: str, value: str) -> "VrfDhcpMixin":
        """Value is the key name."""
        return self.add_delete(self.mappers["vrf_dhcp"].get_dhcp(name) + ["dynamic-dns-update", "tsig-key", value, "algorithm"])

    def set_vrf_dhcp_ddns_tsig_key_secret(self, name: str, value: str) -> "VrfDhcpMixin":
        """Value format: 'key,secret'."""
        parts = value.split(",", 1)
        if len(parts) == 2:
            return self.add_set(self.mappers["vrf_dhcp"].get_dhcp_ddns_tsig_key_secret(name, parts[0], parts[1]))
        return self

    def delete_vrf_dhcp_ddns_tsig_key_secret(self, name: str, value: str) -> "VrfDhcpMixin":
        """Value is the key name."""
        return self.add_delete(self.mappers["vrf_dhcp"].get_dhcp(name) + ["dynamic-dns-update", "tsig-key", value, "secret"])

    # --- Generic option setters (cover all value options + the range scope) ---
    def set_vrf_dhcp_shared_network_option(self, name: str, value: str) -> "VrfDhcpMixin":
        """Value format: 'network,option,value'."""
        parts = value.split(",", 2)
        if len(parts) == 3:
            return self.add_set(self.mappers["vrf_dhcp"].get_dhcp_shared_network_option(name, parts[0], parts[1], parts[2]))
        return self

    def delete_vrf_dhcp_shared_network_option(self, name: str, value: str) -> "VrfDhcpMixin":
        """Value format: 'network,option'."""
        parts = value.split(",", 1)
        if len(parts) == 2:
            return self.add_delete(self.mappers["vrf_dhcp"].get_dhcp_shared_network(name, parts[0]) + ["option", parts[1]])
        return self

    def set_vrf_dhcp_subnet_option(self, name: str, value: str) -> "VrfDhcpMixin":
        """Value format: 'network,prefix,option,value'."""
        parts = value.split(",", 3)
        if len(parts) == 4:
            return self.add_set(self.mappers["vrf_dhcp"].get_dhcp_subnet_option(name, parts[0], parts[1], parts[2], parts[3]))
        return self

    def delete_vrf_dhcp_subnet_option(self, name: str, value: str) -> "VrfDhcpMixin":
        """Value format: 'network,prefix,option'."""
        parts = value.split(",", 2)
        if len(parts) == 3:
            return self.add_delete(self.mappers["vrf_dhcp"].get_dhcp_subnet(name, parts[0], parts[1]) + ["option", parts[2]])
        return self

    def set_vrf_dhcp_subnet_range_option(self, name: str, value: str) -> "VrfDhcpMixin":
        """Value format: 'network,prefix,range,option,value'."""
        parts = value.split(",", 4)
        if len(parts) == 5:
            return self.add_set(self.mappers["vrf_dhcp"].get_dhcp_subnet_range_option(name, parts[0], parts[1], parts[2], parts[3], parts[4]))
        return self

    def delete_vrf_dhcp_subnet_range_option(self, name: str, value: str) -> "VrfDhcpMixin":
        """Value format: 'network,prefix,range,option'."""
        parts = value.split(",", 3)
        if len(parts) == 4:
            return self.add_delete(self.mappers["vrf_dhcp"].get_dhcp_subnet_range(name, parts[0], parts[1], parts[2]) + ["option", parts[3]])
        return self

    def set_vrf_dhcp_static_mapping_option(self, name: str, value: str) -> "VrfDhcpMixin":
        """Value format: 'network,prefix,host,option,value'."""
        parts = value.split(",", 4)
        if len(parts) == 5:
            return self.add_set(self.mappers["vrf_dhcp"].get_dhcp_static_mapping_option(name, parts[0], parts[1], parts[2], parts[3], parts[4]))
        return self

    def delete_vrf_dhcp_static_mapping_option(self, name: str, value: str) -> "VrfDhcpMixin":
        """Value format: 'network,prefix,host,option'."""
        parts = value.split(",", 3)
        if len(parts) == 4:
            return self.add_delete(self.mappers["vrf_dhcp"].get_dhcp_static_mapping(name, parts[0], parts[1], parts[2]) + ["option", parts[3]])
        return self

    # --- Option static-route next-hop per scope ---
    def set_vrf_dhcp_shared_network_option_static_route_next_hop(self, name: str, value: str) -> "VrfDhcpMixin":
        """Value format: 'network,route,next-hop'."""
        parts = value.split(",", 2)
        if len(parts) == 3:
            return self.add_set(self.mappers["vrf_dhcp"].get_dhcp_shared_network_option_static_route_next_hop(name, parts[0], parts[1], parts[2]))
        return self

    def delete_vrf_dhcp_shared_network_option_static_route_next_hop(self, name: str, value: str) -> "VrfDhcpMixin":
        """Value format: 'network,route'."""
        parts = value.split(",", 1)
        if len(parts) == 2:
            return self.add_delete(self.mappers["vrf_dhcp"].get_dhcp_shared_network(name, parts[0]) + ["option", "static-route", parts[1]])
        return self

    def set_vrf_dhcp_subnet_option_static_route_next_hop(self, name: str, value: str) -> "VrfDhcpMixin":
        """Value format: 'network,prefix,route,next-hop'."""
        parts = value.split(",", 3)
        if len(parts) == 4:
            return self.add_set(self.mappers["vrf_dhcp"].get_dhcp_subnet_option_static_route_next_hop(name, parts[0], parts[1], parts[2], parts[3]))
        return self

    def delete_vrf_dhcp_subnet_option_static_route_next_hop(self, name: str, value: str) -> "VrfDhcpMixin":
        """Value format: 'network,prefix,route'."""
        parts = value.split(",", 2)
        if len(parts) == 3:
            return self.add_delete(self.mappers["vrf_dhcp"].get_dhcp_subnet(name, parts[0], parts[1]) + ["option", "static-route", parts[2]])
        return self

    def set_vrf_dhcp_subnet_range_option_static_route_next_hop(self, name: str, value: str) -> "VrfDhcpMixin":
        """Value format: 'network,prefix,range,route,next-hop'."""
        parts = value.split(",", 4)
        if len(parts) == 5:
            return self.add_set(self.mappers["vrf_dhcp"].get_dhcp_subnet_range_option_static_route_next_hop(name, parts[0], parts[1], parts[2], parts[3], parts[4]))
        return self

    def delete_vrf_dhcp_subnet_range_option_static_route_next_hop(self, name: str, value: str) -> "VrfDhcpMixin":
        """Value format: 'network,prefix,range,route'."""
        parts = value.split(",", 3)
        if len(parts) == 4:
            return self.add_delete(self.mappers["vrf_dhcp"].get_dhcp_subnet_range(name, parts[0], parts[1], parts[2]) + ["option", "static-route", parts[3]])
        return self

    def set_vrf_dhcp_static_mapping_option_static_route_next_hop(self, name: str, value: str) -> "VrfDhcpMixin":
        """Value format: 'network,prefix,host,route,next-hop'."""
        parts = value.split(",", 4)
        if len(parts) == 5:
            return self.add_set(self.mappers["vrf_dhcp"].get_dhcp_static_mapping_option_static_route_next_hop(name, parts[0], parts[1], parts[2], parts[3], parts[4]))
        return self

    def delete_vrf_dhcp_static_mapping_option_static_route_next_hop(self, name: str, value: str) -> "VrfDhcpMixin":
        """Value format: 'network,prefix,host,route'."""
        parts = value.split(",", 3)
        if len(parts) == 4:
            return self.add_delete(self.mappers["vrf_dhcp"].get_dhcp_static_mapping(name, parts[0], parts[1], parts[2]) + ["option", "static-route", parts[3]])
        return self

    # --- Option vendor-option ubiquiti unifi-controller per scope ---
    def set_vrf_dhcp_shared_network_option_unifi_controller(self, name: str, value: str) -> "VrfDhcpMixin":
        """Value format: 'network,address'."""
        parts = value.split(",", 1)
        if len(parts) == 2:
            return self.add_set(self.mappers["vrf_dhcp"].get_dhcp_shared_network_option_unifi_controller(name, parts[0], parts[1]))
        return self

    def delete_vrf_dhcp_shared_network_option_unifi_controller(self, name: str, value: str) -> "VrfDhcpMixin":
        """Value is the network name."""
        return self.add_delete(self.mappers["vrf_dhcp"].get_dhcp_shared_network(name, value) + ["option", "vendor-option", "ubiquiti", "unifi-controller"])

    def set_vrf_dhcp_subnet_option_unifi_controller(self, name: str, value: str) -> "VrfDhcpMixin":
        """Value format: 'network,prefix,address'."""
        parts = value.split(",", 2)
        if len(parts) == 3:
            return self.add_set(self.mappers["vrf_dhcp"].get_dhcp_subnet_option_unifi_controller(name, parts[0], parts[1], parts[2]))
        return self

    def delete_vrf_dhcp_subnet_option_unifi_controller(self, name: str, value: str) -> "VrfDhcpMixin":
        """Value format: 'network,prefix'."""
        parts = value.split(",", 1)
        if len(parts) == 2:
            return self.add_delete(self.mappers["vrf_dhcp"].get_dhcp_subnet(name, parts[0], parts[1]) + ["option", "vendor-option", "ubiquiti", "unifi-controller"])
        return self

    def set_vrf_dhcp_subnet_range_option_unifi_controller(self, name: str, value: str) -> "VrfDhcpMixin":
        """Value format: 'network,prefix,range,address'."""
        parts = value.split(",", 3)
        if len(parts) == 4:
            return self.add_set(self.mappers["vrf_dhcp"].get_dhcp_subnet_range_option_unifi_controller(name, parts[0], parts[1], parts[2], parts[3]))
        return self

    def delete_vrf_dhcp_subnet_range_option_unifi_controller(self, name: str, value: str) -> "VrfDhcpMixin":
        """Value format: 'network,prefix,range'."""
        parts = value.split(",", 2)
        if len(parts) == 3:
            return self.add_delete(self.mappers["vrf_dhcp"].get_dhcp_subnet_range(name, parts[0], parts[1], parts[2]) + ["option", "vendor-option", "ubiquiti", "unifi-controller"])
        return self

    def set_vrf_dhcp_static_mapping_option_unifi_controller(self, name: str, value: str) -> "VrfDhcpMixin":
        """Value format: 'network,prefix,host,address'."""
        parts = value.split(",", 3)
        if len(parts) == 4:
            return self.add_set(self.mappers["vrf_dhcp"].get_dhcp_static_mapping_option_unifi_controller(name, parts[0], parts[1], parts[2], parts[3]))
        return self

    def delete_vrf_dhcp_static_mapping_option_unifi_controller(self, name: str, value: str) -> "VrfDhcpMixin":
        """Value format: 'network,prefix,host'."""
        parts = value.split(",", 2)
        if len(parts) == 3:
            return self.add_delete(self.mappers["vrf_dhcp"].get_dhcp_static_mapping(name, parts[0], parts[1], parts[2]) + ["option", "vendor-option", "ubiquiti", "unifi-controller"])
        return self

    # --- Subnet extras / range client-class / static-mapping duid ---
    def set_vrf_dhcp_subnet_client_class(self, name: str, value: str) -> "VrfDhcpMixin":
        """Value format: 'network,prefix,class'."""
        parts = value.split(",", 2)
        if len(parts) == 3:
            return self.add_set(self.mappers["vrf_dhcp"].get_dhcp_subnet_client_class(name, parts[0], parts[1], parts[2]))
        return self

    def delete_vrf_dhcp_subnet_client_class(self, name: str, value: str) -> "VrfDhcpMixin":
        """Value format: 'network,prefix,class'."""
        parts = value.split(",", 2)
        if len(parts) == 3:
            return self.add_delete(self.mappers["vrf_dhcp"].get_dhcp_subnet_client_class(name, parts[0], parts[1], parts[2]))
        return self

    def set_vrf_dhcp_subnet_ignore_client_id(self, name: str, value: str) -> "VrfDhcpMixin":
        """Value format: 'network,prefix'."""
        parts = value.split(",", 1)
        if len(parts) == 2:
            return self.add_set(self.mappers["vrf_dhcp"].get_dhcp_subnet_ignore_client_id(name, parts[0], parts[1]))
        return self

    def delete_vrf_dhcp_subnet_ignore_client_id(self, name: str, value: str) -> "VrfDhcpMixin":
        """Value format: 'network,prefix'."""
        parts = value.split(",", 1)
        if len(parts) == 2:
            return self.add_delete(self.mappers["vrf_dhcp"].get_dhcp_subnet_ignore_client_id(name, parts[0], parts[1]))
        return self

    def set_vrf_dhcp_subnet_ping_check(self, name: str, value: str) -> "VrfDhcpMixin":
        """Value format: 'network,prefix'."""
        parts = value.split(",", 1)
        if len(parts) == 2:
            return self.add_set(self.mappers["vrf_dhcp"].get_dhcp_subnet_ping_check(name, parts[0], parts[1]))
        return self

    def delete_vrf_dhcp_subnet_ping_check(self, name: str, value: str) -> "VrfDhcpMixin":
        """Value format: 'network,prefix'."""
        parts = value.split(",", 1)
        if len(parts) == 2:
            return self.add_delete(self.mappers["vrf_dhcp"].get_dhcp_subnet_ping_check(name, parts[0], parts[1]))
        return self

    def set_vrf_dhcp_subnet_id(self, name: str, value: str) -> "VrfDhcpMixin":
        """Value format: 'network,prefix,id'."""
        parts = value.split(",", 2)
        if len(parts) == 3:
            return self.add_set(self.mappers["vrf_dhcp"].get_dhcp_subnet_id(name, parts[0], parts[1], parts[2]))
        return self

    def delete_vrf_dhcp_subnet_id(self, name: str, value: str) -> "VrfDhcpMixin":
        """Value format: 'network,prefix'."""
        parts = value.split(",", 1)
        if len(parts) == 2:
            return self.add_delete(self.mappers["vrf_dhcp"].get_dhcp_subnet(name, parts[0], parts[1]) + ["subnet-id"])
        return self

    def set_vrf_dhcp_subnet_range_client_class(self, name: str, value: str) -> "VrfDhcpMixin":
        """Value format: 'network,prefix,range,class'."""
        parts = value.split(",", 3)
        if len(parts) == 4:
            return self.add_set(self.mappers["vrf_dhcp"].get_dhcp_subnet_range_client_class(name, parts[0], parts[1], parts[2], parts[3]))
        return self

    def delete_vrf_dhcp_subnet_range_client_class(self, name: str, value: str) -> "VrfDhcpMixin":
        """Value format: 'network,prefix,range,class'."""
        parts = value.split(",", 3)
        if len(parts) == 4:
            return self.add_delete(self.mappers["vrf_dhcp"].get_dhcp_subnet_range_client_class(name, parts[0], parts[1], parts[2], parts[3]))
        return self

    def set_vrf_dhcp_static_mapping_duid(self, name: str, value: str) -> "VrfDhcpMixin":
        """Value format: 'network,prefix,host,duid'."""
        parts = value.split(",", 3)
        if len(parts) == 4:
            return self.add_set(self.mappers["vrf_dhcp"].get_dhcp_static_mapping_duid(name, parts[0], parts[1], parts[2], parts[3]))
        return self

    def delete_vrf_dhcp_static_mapping_duid(self, name: str, value: str) -> "VrfDhcpMixin":
        """Value format: 'network,prefix,host'."""
        parts = value.split(",", 2)
        if len(parts) == 3:
            return self.add_delete(self.mappers["vrf_dhcp"].get_dhcp_static_mapping(name, parts[0], parts[1], parts[2]) + ["duid"])
        return self
