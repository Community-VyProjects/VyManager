"""
VRF DHCPv6 Server Builder Mixin

Provides batch operations for DHCPv6 server configuration within VRF instances.
Mixed into VrfBatchBuilder to extend it with DHCPv6 server operations.
VyOS 1.5+ only.

All multi-value parameters are passed as comma-separated strings in the `value`
argument. The expected format is documented in each method's docstring.
"""


class VrfDhcpv6Mixin:
    """Mixin for VRF DHCPv6 server builder operations."""

    # ========================================================================
    # DHCPv6 Root
    # ========================================================================

    def set_vrf_dhcpv6(self, name: str) -> "VrfDhcpv6Mixin":
        """Enable DHCPv6 server for a VRF."""
        path = self.mappers["vrf_dhcpv6"].get_dhcpv6(name)
        return self.add_set(path)

    def delete_vrf_dhcpv6(self, name: str) -> "VrfDhcpv6Mixin":
        """Delete all DHCPv6 server configuration for a VRF."""
        path = self.mappers["vrf_dhcpv6"].get_dhcpv6(name)
        return self.add_delete(path)

    # ========================================================================
    # Global DHCPv6 Server Settings
    # ========================================================================

    def set_vrf_dhcpv6_disable(self, name: str) -> "VrfDhcpv6Mixin":
        """Disable DHCPv6 server for a VRF."""
        path = self.mappers["vrf_dhcpv6"].get_dhcpv6_disable(name)
        return self.add_set(path)

    def delete_vrf_dhcpv6_disable(self, name: str) -> "VrfDhcpv6Mixin":
        """Re-enable DHCPv6 server for a VRF."""
        path = self.mappers["vrf_dhcpv6"].get_dhcpv6_disable(name)
        return self.add_delete(path)

    def set_vrf_dhcpv6_disable_route_autoinstall(self, name: str) -> "VrfDhcpv6Mixin":
        """Disable route auto-install for DHCPv6."""
        path = self.mappers["vrf_dhcpv6"].get_dhcpv6_disable_route_autoinstall(name)
        return self.add_set(path)

    def delete_vrf_dhcpv6_disable_route_autoinstall(self, name: str) -> "VrfDhcpv6Mixin":
        """Re-enable route auto-install for DHCPv6."""
        path = self.mappers["vrf_dhcpv6"].get_dhcpv6_disable_route_autoinstall(name)
        return self.add_delete(path)

    def set_vrf_dhcpv6_global_parameters(self, name: str, value: str) -> "VrfDhcpv6Mixin":
        """Set DHCPv6 global parameters. Value is the raw parameter string."""
        path = self.mappers["vrf_dhcpv6"].get_dhcpv6_global_parameters(name, value)
        return self.add_set(path)

    def delete_vrf_dhcpv6_global_parameters(self, name: str) -> "VrfDhcpv6Mixin":
        """Delete DHCPv6 global parameters."""
        path = self.mappers["vrf_dhcpv6"].get_dhcpv6(name) + ["global-parameters"]
        return self.add_delete(path)

    def set_vrf_dhcpv6_listen_interface(self, name: str, value: str) -> "VrfDhcpv6Mixin":
        """Add a listen interface. Value is the interface name."""
        path = self.mappers["vrf_dhcpv6"].get_dhcpv6_listen_interface(name, value)
        return self.add_set(path)

    def delete_vrf_dhcpv6_listen_interface(self, name: str, value: str) -> "VrfDhcpv6Mixin":
        """Remove a listen interface. Value is the interface name."""
        path = self.mappers["vrf_dhcpv6"].get_dhcpv6_listen_interface(name, value)
        return self.add_delete(path)

    def set_vrf_dhcpv6_preference(self, name: str, value: str) -> "VrfDhcpv6Mixin":
        """Set DHCPv6 server preference. Value is the preference value."""
        path = self.mappers["vrf_dhcpv6"].get_dhcpv6_preference(name, value)
        return self.add_set(path)

    def delete_vrf_dhcpv6_preference(self, name: str) -> "VrfDhcpv6Mixin":
        """Delete DHCPv6 server preference."""
        path = self.mappers["vrf_dhcpv6"].get_dhcpv6(name) + ["preference"]
        return self.add_delete(path)

    # ========================================================================
    # Shared Network Name Operations
    # ========================================================================

    def set_vrf_dhcpv6_shared_network(self, name: str, value: str) -> "VrfDhcpv6Mixin":
        """Create a shared network. Value is the network name."""
        path = self.mappers["vrf_dhcpv6"].get_dhcpv6_shared_network(name, value)
        return self.add_set(path)

    def delete_vrf_dhcpv6_shared_network(self, name: str, value: str) -> "VrfDhcpv6Mixin":
        """Delete a shared network. Value is the network name."""
        path = self.mappers["vrf_dhcpv6"].get_dhcpv6_shared_network(name, value)
        return self.add_delete(path)

    def set_vrf_dhcpv6_shared_network_description(
        self, name: str, value: str
    ) -> "VrfDhcpv6Mixin":
        """Value format: 'network,description'."""
        parts = value.split(",", 1)
        if len(parts) == 2:
            path = self.mappers["vrf_dhcpv6"].get_dhcpv6_shared_network_description(
                name, parts[0], parts[1]
            )
            return self.add_set(path)
        return self

    def delete_vrf_dhcpv6_shared_network_description(
        self, name: str, value: str
    ) -> "VrfDhcpv6Mixin":
        """Value is the network name."""
        path = self.mappers["vrf_dhcpv6"].get_dhcpv6_shared_network(name, value) + ["description"]
        return self.add_delete(path)

    def set_vrf_dhcpv6_shared_network_disable(
        self, name: str, value: str
    ) -> "VrfDhcpv6Mixin":
        """Value is the network name."""
        path = self.mappers["vrf_dhcpv6"].get_dhcpv6_shared_network_disable(name, value)
        return self.add_set(path)

    def delete_vrf_dhcpv6_shared_network_disable(
        self, name: str, value: str
    ) -> "VrfDhcpv6Mixin":
        """Value is the network name."""
        path = self.mappers["vrf_dhcpv6"].get_dhcpv6_shared_network_disable(name, value)
        return self.add_delete(path)

    def set_vrf_dhcpv6_shared_network_interface(
        self, name: str, value: str
    ) -> "VrfDhcpv6Mixin":
        """Value format: 'network,interface'."""
        parts = value.split(",", 1)
        if len(parts) == 2:
            path = self.mappers["vrf_dhcpv6"].get_dhcpv6_shared_network_interface(
                name, parts[0], parts[1]
            )
            return self.add_set(path)
        return self

    def delete_vrf_dhcpv6_shared_network_interface(
        self, name: str, value: str
    ) -> "VrfDhcpv6Mixin":
        """Value format: 'network,interface'."""
        parts = value.split(",", 1)
        if len(parts) == 2:
            path = self.mappers["vrf_dhcpv6"].get_dhcpv6_shared_network_interface(
                name, parts[0], parts[1]
            )
            return self.add_delete(path)
        return self

    # --- Shared network option ---

    def set_vrf_dhcpv6_shared_network_option_name_server(
        self, name: str, value: str
    ) -> "VrfDhcpv6Mixin":
        """Value format: 'network,server_address'."""
        parts = value.split(",", 1)
        if len(parts) == 2:
            path = self.mappers["vrf_dhcpv6"].get_dhcpv6_shared_network_option_name_server(
                name, parts[0], parts[1]
            )
            return self.add_set(path)
        return self

    def delete_vrf_dhcpv6_shared_network_option_name_server(
        self, name: str, value: str
    ) -> "VrfDhcpv6Mixin":
        """Value format: 'network,server_address'."""
        parts = value.split(",", 1)
        if len(parts) == 2:
            path = self.mappers["vrf_dhcpv6"].get_dhcpv6_shared_network_option_name_server(
                name, parts[0], parts[1]
            )
            return self.add_delete(path)
        return self

    def set_vrf_dhcpv6_shared_network_option_domain_search(
        self, name: str, value: str
    ) -> "VrfDhcpv6Mixin":
        """Value format: 'network,domain'."""
        parts = value.split(",", 1)
        if len(parts) == 2:
            path = self.mappers["vrf_dhcpv6"].get_dhcpv6_shared_network_option_domain_search(
                name, parts[0], parts[1]
            )
            return self.add_set(path)
        return self

    def delete_vrf_dhcpv6_shared_network_option_domain_search(
        self, name: str, value: str
    ) -> "VrfDhcpv6Mixin":
        """Value format: 'network,domain'."""
        parts = value.split(",", 1)
        if len(parts) == 2:
            path = self.mappers["vrf_dhcpv6"].get_dhcpv6_shared_network_option_domain_search(
                name, parts[0], parts[1]
            )
            return self.add_delete(path)
        return self

    def set_vrf_dhcpv6_shared_network_option_nis_domain(
        self, name: str, value: str
    ) -> "VrfDhcpv6Mixin":
        """Value format: 'network,nis_domain'."""
        parts = value.split(",", 1)
        if len(parts) == 2:
            path = self.mappers["vrf_dhcpv6"].get_dhcpv6_shared_network_option_nis_domain(
                name, parts[0], parts[1]
            )
            return self.add_set(path)
        return self

    def delete_vrf_dhcpv6_shared_network_option_nis_domain(
        self, name: str, value: str
    ) -> "VrfDhcpv6Mixin":
        """Value is the network name."""
        path = self.mappers["vrf_dhcpv6"].get_dhcpv6_shared_network(name, value) + [
            "option", "nis-domain",
        ]
        return self.add_delete(path)

    def set_vrf_dhcpv6_shared_network_option_nis_server(
        self, name: str, value: str
    ) -> "VrfDhcpv6Mixin":
        """Value format: 'network,server_address'."""
        parts = value.split(",", 1)
        if len(parts) == 2:
            path = self.mappers["vrf_dhcpv6"].get_dhcpv6_shared_network_option_nis_server(
                name, parts[0], parts[1]
            )
            return self.add_set(path)
        return self

    def delete_vrf_dhcpv6_shared_network_option_nis_server(
        self, name: str, value: str
    ) -> "VrfDhcpv6Mixin":
        """Value format: 'network,server_address'."""
        parts = value.split(",", 1)
        if len(parts) == 2:
            path = self.mappers["vrf_dhcpv6"].get_dhcpv6_shared_network_option_nis_server(
                name, parts[0], parts[1]
            )
            return self.add_delete(path)
        return self

    def set_vrf_dhcpv6_shared_network_option_nisplus_domain(
        self, name: str, value: str
    ) -> "VrfDhcpv6Mixin":
        """Value format: 'network,nisplus_domain'."""
        parts = value.split(",", 1)
        if len(parts) == 2:
            path = self.mappers["vrf_dhcpv6"].get_dhcpv6_shared_network_option_nisplus_domain(
                name, parts[0], parts[1]
            )
            return self.add_set(path)
        return self

    def delete_vrf_dhcpv6_shared_network_option_nisplus_domain(
        self, name: str, value: str
    ) -> "VrfDhcpv6Mixin":
        """Value is the network name."""
        path = self.mappers["vrf_dhcpv6"].get_dhcpv6_shared_network(name, value) + [
            "option", "nisplus-domain",
        ]
        return self.add_delete(path)

    def set_vrf_dhcpv6_shared_network_option_nisplus_server(
        self, name: str, value: str
    ) -> "VrfDhcpv6Mixin":
        """Value format: 'network,server_address'."""
        parts = value.split(",", 1)
        if len(parts) == 2:
            path = self.mappers["vrf_dhcpv6"].get_dhcpv6_shared_network_option_nisplus_server(
                name, parts[0], parts[1]
            )
            return self.add_set(path)
        return self

    def delete_vrf_dhcpv6_shared_network_option_nisplus_server(
        self, name: str, value: str
    ) -> "VrfDhcpv6Mixin":
        """Value format: 'network,server_address'."""
        parts = value.split(",", 1)
        if len(parts) == 2:
            path = self.mappers["vrf_dhcpv6"].get_dhcpv6_shared_network_option_nisplus_server(
                name, parts[0], parts[1]
            )
            return self.add_delete(path)
        return self

    def set_vrf_dhcpv6_shared_network_option_sntp_server(
        self, name: str, value: str
    ) -> "VrfDhcpv6Mixin":
        """Value format: 'network,server_address'."""
        parts = value.split(",", 1)
        if len(parts) == 2:
            path = self.mappers["vrf_dhcpv6"].get_dhcpv6_shared_network_option_sntp_server(
                name, parts[0], parts[1]
            )
            return self.add_set(path)
        return self

    def delete_vrf_dhcpv6_shared_network_option_sntp_server(
        self, name: str, value: str
    ) -> "VrfDhcpv6Mixin":
        """Value format: 'network,server_address'."""
        parts = value.split(",", 1)
        if len(parts) == 2:
            path = self.mappers["vrf_dhcpv6"].get_dhcpv6_shared_network_option_sntp_server(
                name, parts[0], parts[1]
            )
            return self.add_delete(path)
        return self

    def set_vrf_dhcpv6_shared_network_option_sip_server(
        self, name: str, value: str
    ) -> "VrfDhcpv6Mixin":
        """Value format: 'network,server_address'."""
        parts = value.split(",", 1)
        if len(parts) == 2:
            path = self.mappers["vrf_dhcpv6"].get_dhcpv6_shared_network_option_sip_server(
                name, parts[0], parts[1]
            )
            return self.add_set(path)
        return self

    def delete_vrf_dhcpv6_shared_network_option_sip_server(
        self, name: str, value: str
    ) -> "VrfDhcpv6Mixin":
        """Value format: 'network,server_address'."""
        parts = value.split(",", 1)
        if len(parts) == 2:
            path = self.mappers["vrf_dhcpv6"].get_dhcpv6_shared_network_option_sip_server(
                name, parts[0], parts[1]
            )
            return self.add_delete(path)
        return self

    # ========================================================================
    # Subnet Operations
    # ========================================================================

    def set_vrf_dhcpv6_subnet(self, name: str, value: str) -> "VrfDhcpv6Mixin":
        """Value format: 'network,prefix'."""
        parts = value.split(",", 1)
        if len(parts) == 2:
            path = self.mappers["vrf_dhcpv6"].get_dhcpv6_subnet(name, parts[0], parts[1])
            return self.add_set(path)
        return self

    def delete_vrf_dhcpv6_subnet(self, name: str, value: str) -> "VrfDhcpv6Mixin":
        """Value format: 'network,prefix'."""
        parts = value.split(",", 1)
        if len(parts) == 2:
            path = self.mappers["vrf_dhcpv6"].get_dhcpv6_subnet(name, parts[0], parts[1])
            return self.add_delete(path)
        return self

    def set_vrf_dhcpv6_subnet_description(
        self, name: str, value: str
    ) -> "VrfDhcpv6Mixin":
        """Value format: 'network,prefix,description'."""
        parts = value.split(",", 2)
        if len(parts) == 3:
            path = self.mappers["vrf_dhcpv6"].get_dhcpv6_subnet_description(
                name, parts[0], parts[1], parts[2]
            )
            return self.add_set(path)
        return self

    def delete_vrf_dhcpv6_subnet_description(
        self, name: str, value: str
    ) -> "VrfDhcpv6Mixin":
        """Value format: 'network,prefix'."""
        parts = value.split(",", 1)
        if len(parts) == 2:
            path = self.mappers["vrf_dhcpv6"].get_dhcpv6_subnet(
                name, parts[0], parts[1]
            ) + ["description"]
            return self.add_delete(path)
        return self

    def set_vrf_dhcpv6_subnet_disable(
        self, name: str, value: str
    ) -> "VrfDhcpv6Mixin":
        """Value format: 'network,prefix'."""
        parts = value.split(",", 1)
        if len(parts) == 2:
            path = self.mappers["vrf_dhcpv6"].get_dhcpv6_subnet_disable(
                name, parts[0], parts[1]
            )
            return self.add_set(path)
        return self

    def delete_vrf_dhcpv6_subnet_disable(
        self, name: str, value: str
    ) -> "VrfDhcpv6Mixin":
        """Value format: 'network,prefix'."""
        parts = value.split(",", 1)
        if len(parts) == 2:
            path = self.mappers["vrf_dhcpv6"].get_dhcpv6_subnet_disable(
                name, parts[0], parts[1]
            )
            return self.add_delete(path)
        return self

    def set_vrf_dhcpv6_subnet_domain_search(
        self, name: str, value: str
    ) -> "VrfDhcpv6Mixin":
        """Value format: 'network,prefix,domain'."""
        parts = value.split(",", 2)
        if len(parts) == 3:
            path = self.mappers["vrf_dhcpv6"].get_dhcpv6_subnet_domain_search(
                name, parts[0], parts[1], parts[2]
            )
            return self.add_set(path)
        return self

    def delete_vrf_dhcpv6_subnet_domain_search(
        self, name: str, value: str
    ) -> "VrfDhcpv6Mixin":
        """Value format: 'network,prefix,domain'."""
        parts = value.split(",", 2)
        if len(parts) == 3:
            path = self.mappers["vrf_dhcpv6"].get_dhcpv6_subnet_domain_search(
                name, parts[0], parts[1], parts[2]
            )
            return self.add_delete(path)
        return self

    # --- Subnet lease-time ---

    def set_vrf_dhcpv6_subnet_lease_time_default(
        self, name: str, value: str
    ) -> "VrfDhcpv6Mixin":
        """Value format: 'network,prefix,seconds'."""
        parts = value.split(",", 2)
        if len(parts) == 3:
            path = self.mappers["vrf_dhcpv6"].get_dhcpv6_subnet_lease_time_default(
                name, parts[0], parts[1], parts[2]
            )
            return self.add_set(path)
        return self

    def delete_vrf_dhcpv6_subnet_lease_time_default(
        self, name: str, value: str
    ) -> "VrfDhcpv6Mixin":
        """Value format: 'network,prefix'."""
        parts = value.split(",", 1)
        if len(parts) == 2:
            path = self.mappers["vrf_dhcpv6"].get_dhcpv6_subnet(
                name, parts[0], parts[1]
            ) + ["lease-time", "default"]
            return self.add_delete(path)
        return self

    def set_vrf_dhcpv6_subnet_lease_time_maximum(
        self, name: str, value: str
    ) -> "VrfDhcpv6Mixin":
        """Value format: 'network,prefix,seconds'."""
        parts = value.split(",", 2)
        if len(parts) == 3:
            path = self.mappers["vrf_dhcpv6"].get_dhcpv6_subnet_lease_time_maximum(
                name, parts[0], parts[1], parts[2]
            )
            return self.add_set(path)
        return self

    def delete_vrf_dhcpv6_subnet_lease_time_maximum(
        self, name: str, value: str
    ) -> "VrfDhcpv6Mixin":
        """Value format: 'network,prefix'."""
        parts = value.split(",", 1)
        if len(parts) == 2:
            path = self.mappers["vrf_dhcpv6"].get_dhcpv6_subnet(
                name, parts[0], parts[1]
            ) + ["lease-time", "maximum"]
            return self.add_delete(path)
        return self

    def set_vrf_dhcpv6_subnet_lease_time_minimum(
        self, name: str, value: str
    ) -> "VrfDhcpv6Mixin":
        """Value format: 'network,prefix,seconds'."""
        parts = value.split(",", 2)
        if len(parts) == 3:
            path = self.mappers["vrf_dhcpv6"].get_dhcpv6_subnet_lease_time_minimum(
                name, parts[0], parts[1], parts[2]
            )
            return self.add_set(path)
        return self

    def delete_vrf_dhcpv6_subnet_lease_time_minimum(
        self, name: str, value: str
    ) -> "VrfDhcpv6Mixin":
        """Value format: 'network,prefix'."""
        parts = value.split(",", 1)
        if len(parts) == 2:
            path = self.mappers["vrf_dhcpv6"].get_dhcpv6_subnet(
                name, parts[0], parts[1]
            ) + ["lease-time", "minimum"]
            return self.add_delete(path)
        return self

    # --- Subnet name-server ---

    def set_vrf_dhcpv6_subnet_name_server(
        self, name: str, value: str
    ) -> "VrfDhcpv6Mixin":
        """Value format: 'network,prefix,server_address'."""
        parts = value.split(",", 2)
        if len(parts) == 3:
            path = self.mappers["vrf_dhcpv6"].get_dhcpv6_subnet_name_server(
                name, parts[0], parts[1], parts[2]
            )
            return self.add_set(path)
        return self

    def delete_vrf_dhcpv6_subnet_name_server(
        self, name: str, value: str
    ) -> "VrfDhcpv6Mixin":
        """Value format: 'network,prefix,server_address'."""
        parts = value.split(",", 2)
        if len(parts) == 3:
            path = self.mappers["vrf_dhcpv6"].get_dhcpv6_subnet_name_server(
                name, parts[0], parts[1], parts[2]
            )
            return self.add_delete(path)
        return self

    # --- Subnet NIS ---

    def set_vrf_dhcpv6_subnet_nis_domain(
        self, name: str, value: str
    ) -> "VrfDhcpv6Mixin":
        """Value format: 'network,prefix,nis_domain'."""
        parts = value.split(",", 2)
        if len(parts) == 3:
            path = self.mappers["vrf_dhcpv6"].get_dhcpv6_subnet_nis_domain(
                name, parts[0], parts[1], parts[2]
            )
            return self.add_set(path)
        return self

    def delete_vrf_dhcpv6_subnet_nis_domain(
        self, name: str, value: str
    ) -> "VrfDhcpv6Mixin":
        """Value format: 'network,prefix'."""
        parts = value.split(",", 1)
        if len(parts) == 2:
            path = self.mappers["vrf_dhcpv6"].get_dhcpv6_subnet(
                name, parts[0], parts[1]
            ) + ["nis-domain"]
            return self.add_delete(path)
        return self

    def set_vrf_dhcpv6_subnet_nis_server(
        self, name: str, value: str
    ) -> "VrfDhcpv6Mixin":
        """Value format: 'network,prefix,server_address'."""
        parts = value.split(",", 2)
        if len(parts) == 3:
            path = self.mappers["vrf_dhcpv6"].get_dhcpv6_subnet_nis_server(
                name, parts[0], parts[1], parts[2]
            )
            return self.add_set(path)
        return self

    def delete_vrf_dhcpv6_subnet_nis_server(
        self, name: str, value: str
    ) -> "VrfDhcpv6Mixin":
        """Value format: 'network,prefix,server_address'."""
        parts = value.split(",", 2)
        if len(parts) == 3:
            path = self.mappers["vrf_dhcpv6"].get_dhcpv6_subnet_nis_server(
                name, parts[0], parts[1], parts[2]
            )
            return self.add_delete(path)
        return self

    # --- Subnet NIS+ ---

    def set_vrf_dhcpv6_subnet_nisplus_domain(
        self, name: str, value: str
    ) -> "VrfDhcpv6Mixin":
        """Value format: 'network,prefix,nisplus_domain'."""
        parts = value.split(",", 2)
        if len(parts) == 3:
            path = self.mappers["vrf_dhcpv6"].get_dhcpv6_subnet_nisplus_domain(
                name, parts[0], parts[1], parts[2]
            )
            return self.add_set(path)
        return self

    def delete_vrf_dhcpv6_subnet_nisplus_domain(
        self, name: str, value: str
    ) -> "VrfDhcpv6Mixin":
        """Value format: 'network,prefix'."""
        parts = value.split(",", 1)
        if len(parts) == 2:
            path = self.mappers["vrf_dhcpv6"].get_dhcpv6_subnet(
                name, parts[0], parts[1]
            ) + ["nisplus-domain"]
            return self.add_delete(path)
        return self

    def set_vrf_dhcpv6_subnet_nisplus_server(
        self, name: str, value: str
    ) -> "VrfDhcpv6Mixin":
        """Value format: 'network,prefix,server_address'."""
        parts = value.split(",", 2)
        if len(parts) == 3:
            path = self.mappers["vrf_dhcpv6"].get_dhcpv6_subnet_nisplus_server(
                name, parts[0], parts[1], parts[2]
            )
            return self.add_set(path)
        return self

    def delete_vrf_dhcpv6_subnet_nisplus_server(
        self, name: str, value: str
    ) -> "VrfDhcpv6Mixin":
        """Value format: 'network,prefix,server_address'."""
        parts = value.split(",", 2)
        if len(parts) == 3:
            path = self.mappers["vrf_dhcpv6"].get_dhcpv6_subnet_nisplus_server(
                name, parts[0], parts[1], parts[2]
            )
            return self.add_delete(path)
        return self

    # --- Subnet option ---

    def set_vrf_dhcpv6_subnet_option_name_server(
        self, name: str, value: str
    ) -> "VrfDhcpv6Mixin":
        """Value format: 'network,prefix,server_address'."""
        parts = value.split(",", 2)
        if len(parts) == 3:
            path = self.mappers["vrf_dhcpv6"].get_dhcpv6_subnet_option_name_server(
                name, parts[0], parts[1], parts[2]
            )
            return self.add_set(path)
        return self

    def delete_vrf_dhcpv6_subnet_option_name_server(
        self, name: str, value: str
    ) -> "VrfDhcpv6Mixin":
        """Value format: 'network,prefix,server_address'."""
        parts = value.split(",", 2)
        if len(parts) == 3:
            path = self.mappers["vrf_dhcpv6"].get_dhcpv6_subnet_option_name_server(
                name, parts[0], parts[1], parts[2]
            )
            return self.add_delete(path)
        return self

    def set_vrf_dhcpv6_subnet_option_domain_search(
        self, name: str, value: str
    ) -> "VrfDhcpv6Mixin":
        """Value format: 'network,prefix,domain'."""
        parts = value.split(",", 2)
        if len(parts) == 3:
            path = self.mappers["vrf_dhcpv6"].get_dhcpv6_subnet_option_domain_search(
                name, parts[0], parts[1], parts[2]
            )
            return self.add_set(path)
        return self

    def delete_vrf_dhcpv6_subnet_option_domain_search(
        self, name: str, value: str
    ) -> "VrfDhcpv6Mixin":
        """Value format: 'network,prefix,domain'."""
        parts = value.split(",", 2)
        if len(parts) == 3:
            path = self.mappers["vrf_dhcpv6"].get_dhcpv6_subnet_option_domain_search(
                name, parts[0], parts[1], parts[2]
            )
            return self.add_delete(path)
        return self

    def set_vrf_dhcpv6_subnet_option_nis_domain(
        self, name: str, value: str
    ) -> "VrfDhcpv6Mixin":
        """Value format: 'network,prefix,nis_domain'."""
        parts = value.split(",", 2)
        if len(parts) == 3:
            path = self.mappers["vrf_dhcpv6"].get_dhcpv6_subnet_option_nis_domain(
                name, parts[0], parts[1], parts[2]
            )
            return self.add_set(path)
        return self

    def delete_vrf_dhcpv6_subnet_option_nis_domain(
        self, name: str, value: str
    ) -> "VrfDhcpv6Mixin":
        """Value format: 'network,prefix'."""
        parts = value.split(",", 1)
        if len(parts) == 2:
            path = self.mappers["vrf_dhcpv6"].get_dhcpv6_subnet(
                name, parts[0], parts[1]
            ) + ["option", "nis-domain"]
            return self.add_delete(path)
        return self

    def set_vrf_dhcpv6_subnet_option_nis_server(
        self, name: str, value: str
    ) -> "VrfDhcpv6Mixin":
        """Value format: 'network,prefix,server_address'."""
        parts = value.split(",", 2)
        if len(parts) == 3:
            path = self.mappers["vrf_dhcpv6"].get_dhcpv6_subnet_option_nis_server(
                name, parts[0], parts[1], parts[2]
            )
            return self.add_set(path)
        return self

    def delete_vrf_dhcpv6_subnet_option_nis_server(
        self, name: str, value: str
    ) -> "VrfDhcpv6Mixin":
        """Value format: 'network,prefix,server_address'."""
        parts = value.split(",", 2)
        if len(parts) == 3:
            path = self.mappers["vrf_dhcpv6"].get_dhcpv6_subnet_option_nis_server(
                name, parts[0], parts[1], parts[2]
            )
            return self.add_delete(path)
        return self

    def set_vrf_dhcpv6_subnet_option_nisplus_domain(
        self, name: str, value: str
    ) -> "VrfDhcpv6Mixin":
        """Value format: 'network,prefix,nisplus_domain'."""
        parts = value.split(",", 2)
        if len(parts) == 3:
            path = self.mappers["vrf_dhcpv6"].get_dhcpv6_subnet_option_nisplus_domain(
                name, parts[0], parts[1], parts[2]
            )
            return self.add_set(path)
        return self

    def delete_vrf_dhcpv6_subnet_option_nisplus_domain(
        self, name: str, value: str
    ) -> "VrfDhcpv6Mixin":
        """Value format: 'network,prefix'."""
        parts = value.split(",", 1)
        if len(parts) == 2:
            path = self.mappers["vrf_dhcpv6"].get_dhcpv6_subnet(
                name, parts[0], parts[1]
            ) + ["option", "nisplus-domain"]
            return self.add_delete(path)
        return self

    def set_vrf_dhcpv6_subnet_option_nisplus_server(
        self, name: str, value: str
    ) -> "VrfDhcpv6Mixin":
        """Value format: 'network,prefix,server_address'."""
        parts = value.split(",", 2)
        if len(parts) == 3:
            path = self.mappers["vrf_dhcpv6"].get_dhcpv6_subnet_option_nisplus_server(
                name, parts[0], parts[1], parts[2]
            )
            return self.add_set(path)
        return self

    def delete_vrf_dhcpv6_subnet_option_nisplus_server(
        self, name: str, value: str
    ) -> "VrfDhcpv6Mixin":
        """Value format: 'network,prefix,server_address'."""
        parts = value.split(",", 2)
        if len(parts) == 3:
            path = self.mappers["vrf_dhcpv6"].get_dhcpv6_subnet_option_nisplus_server(
                name, parts[0], parts[1], parts[2]
            )
            return self.add_delete(path)
        return self

    def set_vrf_dhcpv6_subnet_option_sntp_server(
        self, name: str, value: str
    ) -> "VrfDhcpv6Mixin":
        """Value format: 'network,prefix,server_address'."""
        parts = value.split(",", 2)
        if len(parts) == 3:
            path = self.mappers["vrf_dhcpv6"].get_dhcpv6_subnet_option_sntp_server(
                name, parts[0], parts[1], parts[2]
            )
            return self.add_set(path)
        return self

    def delete_vrf_dhcpv6_subnet_option_sntp_server(
        self, name: str, value: str
    ) -> "VrfDhcpv6Mixin":
        """Value format: 'network,prefix,server_address'."""
        parts = value.split(",", 2)
        if len(parts) == 3:
            path = self.mappers["vrf_dhcpv6"].get_dhcpv6_subnet_option_sntp_server(
                name, parts[0], parts[1], parts[2]
            )
            return self.add_delete(path)
        return self

    def set_vrf_dhcpv6_subnet_option_sip_server(
        self, name: str, value: str
    ) -> "VrfDhcpv6Mixin":
        """Value format: 'network,prefix,server_address'."""
        parts = value.split(",", 2)
        if len(parts) == 3:
            path = self.mappers["vrf_dhcpv6"].get_dhcpv6_subnet_option_sip_server(
                name, parts[0], parts[1], parts[2]
            )
            return self.add_set(path)
        return self

    def delete_vrf_dhcpv6_subnet_option_sip_server(
        self, name: str, value: str
    ) -> "VrfDhcpv6Mixin":
        """Value format: 'network,prefix,server_address'."""
        parts = value.split(",", 2)
        if len(parts) == 3:
            path = self.mappers["vrf_dhcpv6"].get_dhcpv6_subnet_option_sip_server(
                name, parts[0], parts[1], parts[2]
            )
            return self.add_delete(path)
        return self

    # --- Subnet SIP/SNTP (top-level, outside option) ---

    def set_vrf_dhcpv6_subnet_sip_server(
        self, name: str, value: str
    ) -> "VrfDhcpv6Mixin":
        """Value format: 'network,prefix,server_address'."""
        parts = value.split(",", 2)
        if len(parts) == 3:
            path = self.mappers["vrf_dhcpv6"].get_dhcpv6_subnet_sip_server(
                name, parts[0], parts[1], parts[2]
            )
            return self.add_set(path)
        return self

    def delete_vrf_dhcpv6_subnet_sip_server(
        self, name: str, value: str
    ) -> "VrfDhcpv6Mixin":
        """Value format: 'network,prefix,server_address'."""
        parts = value.split(",", 2)
        if len(parts) == 3:
            path = self.mappers["vrf_dhcpv6"].get_dhcpv6_subnet_sip_server(
                name, parts[0], parts[1], parts[2]
            )
            return self.add_delete(path)
        return self

    def set_vrf_dhcpv6_subnet_sntp_server(
        self, name: str, value: str
    ) -> "VrfDhcpv6Mixin":
        """Value format: 'network,prefix,server_address'."""
        parts = value.split(",", 2)
        if len(parts) == 3:
            path = self.mappers["vrf_dhcpv6"].get_dhcpv6_subnet_sntp_server(
                name, parts[0], parts[1], parts[2]
            )
            return self.add_set(path)
        return self

    def delete_vrf_dhcpv6_subnet_sntp_server(
        self, name: str, value: str
    ) -> "VrfDhcpv6Mixin":
        """Value format: 'network,prefix,server_address'."""
        parts = value.split(",", 2)
        if len(parts) == 3:
            path = self.mappers["vrf_dhcpv6"].get_dhcpv6_subnet_sntp_server(
                name, parts[0], parts[1], parts[2]
            )
            return self.add_delete(path)
        return self

    # ========================================================================
    # Prefix Delegation Operations
    # ========================================================================

    def set_vrf_dhcpv6_subnet_pd_prefix(
        self, name: str, value: str
    ) -> "VrfDhcpv6Mixin":
        """Value format: 'network,subnet,pd_prefix'."""
        parts = value.split(",", 2)
        if len(parts) == 3:
            path = self.mappers["vrf_dhcpv6"].get_dhcpv6_subnet_pd_prefix(
                name, parts[0], parts[1], parts[2]
            )
            return self.add_set(path)
        return self

    def delete_vrf_dhcpv6_subnet_pd_prefix(
        self, name: str, value: str
    ) -> "VrfDhcpv6Mixin":
        """Value format: 'network,subnet,pd_prefix'."""
        parts = value.split(",", 2)
        if len(parts) == 3:
            path = self.mappers["vrf_dhcpv6"].get_dhcpv6_subnet_pd_prefix(
                name, parts[0], parts[1], parts[2]
            )
            return self.add_delete(path)
        return self

    def set_vrf_dhcpv6_subnet_pd_prefix_delegated_length(
        self, name: str, value: str
    ) -> "VrfDhcpv6Mixin":
        """Value format: 'network,subnet,pd_prefix,delegated_length'."""
        parts = value.split(",", 3)
        if len(parts) == 4:
            path = self.mappers["vrf_dhcpv6"].get_dhcpv6_subnet_pd_prefix_delegated_length(
                name, parts[0], parts[1], parts[2], parts[3]
            )
            return self.add_set(path)
        return self

    def delete_vrf_dhcpv6_subnet_pd_prefix_delegated_length(
        self, name: str, value: str
    ) -> "VrfDhcpv6Mixin":
        """Value format: 'network,subnet,pd_prefix'."""
        parts = value.split(",", 2)
        if len(parts) == 3:
            path = self.mappers["vrf_dhcpv6"].get_dhcpv6_subnet_pd_prefix(
                name, parts[0], parts[1], parts[2]
            ) + ["delegated-length"]
            return self.add_delete(path)
        return self

    def set_vrf_dhcpv6_subnet_pd_prefix_excluded_prefix(
        self, name: str, value: str
    ) -> "VrfDhcpv6Mixin":
        """Value format: 'network,subnet,pd_prefix,excluded_prefix'."""
        parts = value.split(",", 3)
        if len(parts) == 4:
            path = self.mappers["vrf_dhcpv6"].get_dhcpv6_subnet_pd_prefix_excluded_prefix(
                name, parts[0], parts[1], parts[2], parts[3]
            )
            return self.add_set(path)
        return self

    def delete_vrf_dhcpv6_subnet_pd_prefix_excluded_prefix(
        self, name: str, value: str
    ) -> "VrfDhcpv6Mixin":
        """Value format: 'network,subnet,pd_prefix'."""
        parts = value.split(",", 2)
        if len(parts) == 3:
            path = self.mappers["vrf_dhcpv6"].get_dhcpv6_subnet_pd_prefix(
                name, parts[0], parts[1], parts[2]
            ) + ["excluded-prefix"]
            return self.add_delete(path)
        return self

    def set_vrf_dhcpv6_subnet_pd_prefix_excluded_prefix_length(
        self, name: str, value: str
    ) -> "VrfDhcpv6Mixin":
        """Value format: 'network,subnet,pd_prefix,excluded_prefix_length'."""
        parts = value.split(",", 3)
        if len(parts) == 4:
            path = self.mappers["vrf_dhcpv6"].get_dhcpv6_subnet_pd_prefix_excluded_prefix_length(
                name, parts[0], parts[1], parts[2], parts[3]
            )
            return self.add_set(path)
        return self

    def delete_vrf_dhcpv6_subnet_pd_prefix_excluded_prefix_length(
        self, name: str, value: str
    ) -> "VrfDhcpv6Mixin":
        """Value format: 'network,subnet,pd_prefix'."""
        parts = value.split(",", 2)
        if len(parts) == 3:
            path = self.mappers["vrf_dhcpv6"].get_dhcpv6_subnet_pd_prefix(
                name, parts[0], parts[1], parts[2]
            ) + ["excluded-prefix-length"]
            return self.add_delete(path)
        return self

    def set_vrf_dhcpv6_subnet_pd_prefix_prefix_length(
        self, name: str, value: str
    ) -> "VrfDhcpv6Mixin":
        """Value format: 'network,subnet,pd_prefix,prefix_length'."""
        parts = value.split(",", 3)
        if len(parts) == 4:
            path = self.mappers["vrf_dhcpv6"].get_dhcpv6_subnet_pd_prefix_prefix_length(
                name, parts[0], parts[1], parts[2], parts[3]
            )
            return self.add_set(path)
        return self

    def delete_vrf_dhcpv6_subnet_pd_prefix_prefix_length(
        self, name: str, value: str
    ) -> "VrfDhcpv6Mixin":
        """Value format: 'network,subnet,pd_prefix'."""
        parts = value.split(",", 2)
        if len(parts) == 3:
            path = self.mappers["vrf_dhcpv6"].get_dhcpv6_subnet_pd_prefix(
                name, parts[0], parts[1], parts[2]
            ) + ["prefix-length"]
            return self.add_delete(path)
        return self

    # ========================================================================
    # Range Operations
    # ========================================================================

    def set_vrf_dhcpv6_subnet_range(
        self, name: str, value: str
    ) -> "VrfDhcpv6Mixin":
        """Value format: 'network,prefix,range_name'."""
        parts = value.split(",", 2)
        if len(parts) == 3:
            path = self.mappers["vrf_dhcpv6"].get_dhcpv6_subnet_range(
                name, parts[0], parts[1], parts[2]
            )
            return self.add_set(path)
        return self

    def delete_vrf_dhcpv6_subnet_range(
        self, name: str, value: str
    ) -> "VrfDhcpv6Mixin":
        """Value format: 'network,prefix,range_name'."""
        parts = value.split(",", 2)
        if len(parts) == 3:
            path = self.mappers["vrf_dhcpv6"].get_dhcpv6_subnet_range(
                name, parts[0], parts[1], parts[2]
            )
            return self.add_delete(path)
        return self

    def set_vrf_dhcpv6_subnet_range_prefix(
        self, name: str, value: str
    ) -> "VrfDhcpv6Mixin":
        """Value format: 'network,subnet,range_name,prefix_value'."""
        parts = value.split(",", 3)
        if len(parts) == 4:
            path = self.mappers["vrf_dhcpv6"].get_dhcpv6_subnet_range_prefix(
                name, parts[0], parts[1], parts[2], parts[3]
            )
            return self.add_set(path)
        return self

    def delete_vrf_dhcpv6_subnet_range_prefix(
        self, name: str, value: str
    ) -> "VrfDhcpv6Mixin":
        """Value format: 'network,subnet,range_name'."""
        parts = value.split(",", 2)
        if len(parts) == 3:
            path = self.mappers["vrf_dhcpv6"].get_dhcpv6_subnet_range(
                name, parts[0], parts[1], parts[2]
            ) + ["prefix"]
            return self.add_delete(path)
        return self

    def set_vrf_dhcpv6_subnet_range_start(
        self, name: str, value: str
    ) -> "VrfDhcpv6Mixin":
        """Value format: 'network,subnet,range_name,start_address'."""
        parts = value.split(",", 3)
        if len(parts) == 4:
            path = self.mappers["vrf_dhcpv6"].get_dhcpv6_subnet_range_start(
                name, parts[0], parts[1], parts[2], parts[3]
            )
            return self.add_set(path)
        return self

    def delete_vrf_dhcpv6_subnet_range_start(
        self, name: str, value: str
    ) -> "VrfDhcpv6Mixin":
        """Value format: 'network,subnet,range_name'."""
        parts = value.split(",", 2)
        if len(parts) == 3:
            path = self.mappers["vrf_dhcpv6"].get_dhcpv6_subnet_range(
                name, parts[0], parts[1], parts[2]
            ) + ["start"]
            return self.add_delete(path)
        return self

    def set_vrf_dhcpv6_subnet_range_stop(
        self, name: str, value: str
    ) -> "VrfDhcpv6Mixin":
        """Value format: 'network,subnet,range_name,stop_address'."""
        parts = value.split(",", 3)
        if len(parts) == 4:
            path = self.mappers["vrf_dhcpv6"].get_dhcpv6_subnet_range_stop(
                name, parts[0], parts[1], parts[2], parts[3]
            )
            return self.add_set(path)
        return self

    def delete_vrf_dhcpv6_subnet_range_stop(
        self, name: str, value: str
    ) -> "VrfDhcpv6Mixin":
        """Value format: 'network,subnet,range_name'."""
        parts = value.split(",", 2)
        if len(parts) == 3:
            path = self.mappers["vrf_dhcpv6"].get_dhcpv6_subnet_range(
                name, parts[0], parts[1], parts[2]
            ) + ["stop"]
            return self.add_delete(path)
        return self

    # ========================================================================
    # Static Mapping Operations
    # ========================================================================

    def set_vrf_dhcpv6_subnet_static_mapping(
        self, name: str, value: str
    ) -> "VrfDhcpv6Mixin":
        """Value format: 'network,prefix,host'."""
        parts = value.split(",", 2)
        if len(parts) == 3:
            path = self.mappers["vrf_dhcpv6"].get_dhcpv6_subnet_static_mapping(
                name, parts[0], parts[1], parts[2]
            )
            return self.add_set(path)
        return self

    def delete_vrf_dhcpv6_subnet_static_mapping(
        self, name: str, value: str
    ) -> "VrfDhcpv6Mixin":
        """Value format: 'network,prefix,host'."""
        parts = value.split(",", 2)
        if len(parts) == 3:
            path = self.mappers["vrf_dhcpv6"].get_dhcpv6_subnet_static_mapping(
                name, parts[0], parts[1], parts[2]
            )
            return self.add_delete(path)
        return self

    def set_vrf_dhcpv6_subnet_static_mapping_description(
        self, name: str, value: str
    ) -> "VrfDhcpv6Mixin":
        """Value format: 'network,prefix,host,description'."""
        parts = value.split(",", 3)
        if len(parts) == 4:
            path = self.mappers["vrf_dhcpv6"].get_dhcpv6_subnet_static_mapping_description(
                name, parts[0], parts[1], parts[2], parts[3]
            )
            return self.add_set(path)
        return self

    def delete_vrf_dhcpv6_subnet_static_mapping_description(
        self, name: str, value: str
    ) -> "VrfDhcpv6Mixin":
        """Value format: 'network,prefix,host'."""
        parts = value.split(",", 2)
        if len(parts) == 3:
            path = self.mappers["vrf_dhcpv6"].get_dhcpv6_subnet_static_mapping(
                name, parts[0], parts[1], parts[2]
            ) + ["description"]
            return self.add_delete(path)
        return self

    def set_vrf_dhcpv6_subnet_static_mapping_disable(
        self, name: str, value: str
    ) -> "VrfDhcpv6Mixin":
        """Value format: 'network,prefix,host'."""
        parts = value.split(",", 2)
        if len(parts) == 3:
            path = self.mappers["vrf_dhcpv6"].get_dhcpv6_subnet_static_mapping_disable(
                name, parts[0], parts[1], parts[2]
            )
            return self.add_set(path)
        return self

    def delete_vrf_dhcpv6_subnet_static_mapping_disable(
        self, name: str, value: str
    ) -> "VrfDhcpv6Mixin":
        """Value format: 'network,prefix,host'."""
        parts = value.split(",", 2)
        if len(parts) == 3:
            path = self.mappers["vrf_dhcpv6"].get_dhcpv6_subnet_static_mapping_disable(
                name, parts[0], parts[1], parts[2]
            )
            return self.add_delete(path)
        return self

    def set_vrf_dhcpv6_subnet_static_mapping_identifier_duid(
        self, name: str, value: str
    ) -> "VrfDhcpv6Mixin":
        """Value format: 'network,prefix,host,duid'."""
        parts = value.split(",", 3)
        if len(parts) == 4:
            path = self.mappers["vrf_dhcpv6"].get_dhcpv6_subnet_static_mapping_identifier_duid(
                name, parts[0], parts[1], parts[2], parts[3]
            )
            return self.add_set(path)
        return self

    def delete_vrf_dhcpv6_subnet_static_mapping_identifier_duid(
        self, name: str, value: str
    ) -> "VrfDhcpv6Mixin":
        """Value format: 'network,prefix,host'."""
        parts = value.split(",", 2)
        if len(parts) == 3:
            path = self.mappers["vrf_dhcpv6"].get_dhcpv6_subnet_static_mapping(
                name, parts[0], parts[1], parts[2]
            ) + ["identifier", "duid"]
            return self.add_delete(path)
        return self

    def set_vrf_dhcpv6_subnet_static_mapping_ipv6_address(
        self, name: str, value: str
    ) -> "VrfDhcpv6Mixin":
        """Value format: 'network,prefix,host,ipv6_address'."""
        parts = value.split(",", 3)
        if len(parts) == 4:
            path = self.mappers["vrf_dhcpv6"].get_dhcpv6_subnet_static_mapping_ipv6_address(
                name, parts[0], parts[1], parts[2], parts[3]
            )
            return self.add_set(path)
        return self

    def delete_vrf_dhcpv6_subnet_static_mapping_ipv6_address(
        self, name: str, value: str
    ) -> "VrfDhcpv6Mixin":
        """Value format: 'network,prefix,host'."""
        parts = value.split(",", 2)
        if len(parts) == 3:
            path = self.mappers["vrf_dhcpv6"].get_dhcpv6_subnet_static_mapping(
                name, parts[0], parts[1], parts[2]
            ) + ["ipv6-address"]
            return self.add_delete(path)
        return self

    def set_vrf_dhcpv6_subnet_static_mapping_ipv6_prefix(
        self, name: str, value: str
    ) -> "VrfDhcpv6Mixin":
        """Value format: 'network,prefix,host,ipv6_prefix'."""
        parts = value.split(",", 3)
        if len(parts) == 4:
            path = self.mappers["vrf_dhcpv6"].get_dhcpv6_subnet_static_mapping_ipv6_prefix(
                name, parts[0], parts[1], parts[2], parts[3]
            )
            return self.add_set(path)
        return self

    def delete_vrf_dhcpv6_subnet_static_mapping_ipv6_prefix(
        self, name: str, value: str
    ) -> "VrfDhcpv6Mixin":
        """Value format: 'network,prefix,host'."""
        parts = value.split(",", 2)
        if len(parts) == 3:
            path = self.mappers["vrf_dhcpv6"].get_dhcpv6_subnet_static_mapping(
                name, parts[0], parts[1], parts[2]
            ) + ["ipv6-prefix"]
            return self.add_delete(path)
        return self

    # --- Static mapping option ---

    def set_vrf_dhcpv6_subnet_static_mapping_option_name_server(
        self, name: str, value: str
    ) -> "VrfDhcpv6Mixin":
        """Value format: 'network,prefix,host,server_address'."""
        parts = value.split(",", 3)
        if len(parts) == 4:
            path = self.mappers["vrf_dhcpv6"].get_dhcpv6_subnet_static_mapping_option_name_server(
                name, parts[0], parts[1], parts[2], parts[3]
            )
            return self.add_set(path)
        return self

    def delete_vrf_dhcpv6_subnet_static_mapping_option_name_server(
        self, name: str, value: str
    ) -> "VrfDhcpv6Mixin":
        """Value format: 'network,prefix,host,server_address'."""
        parts = value.split(",", 3)
        if len(parts) == 4:
            path = self.mappers["vrf_dhcpv6"].get_dhcpv6_subnet_static_mapping_option_name_server(
                name, parts[0], parts[1], parts[2], parts[3]
            )
            return self.add_delete(path)
        return self

    def set_vrf_dhcpv6_subnet_static_mapping_option_domain_search(
        self, name: str, value: str
    ) -> "VrfDhcpv6Mixin":
        """Value format: 'network,prefix,host,domain'."""
        parts = value.split(",", 3)
        if len(parts) == 4:
            path = self.mappers["vrf_dhcpv6"].get_dhcpv6_subnet_static_mapping_option_domain_search(
                name, parts[0], parts[1], parts[2], parts[3]
            )
            return self.add_set(path)
        return self

    def delete_vrf_dhcpv6_subnet_static_mapping_option_domain_search(
        self, name: str, value: str
    ) -> "VrfDhcpv6Mixin":
        """Value format: 'network,prefix,host,domain'."""
        parts = value.split(",", 3)
        if len(parts) == 4:
            path = self.mappers["vrf_dhcpv6"].get_dhcpv6_subnet_static_mapping_option_domain_search(
                name, parts[0], parts[1], parts[2], parts[3]
            )
            return self.add_delete(path)
        return self

    def set_vrf_dhcpv6_subnet_static_mapping_option_nis_domain(
        self, name: str, value: str
    ) -> "VrfDhcpv6Mixin":
        """Value format: 'network,prefix,host,nis_domain'."""
        parts = value.split(",", 3)
        if len(parts) == 4:
            path = self.mappers["vrf_dhcpv6"].get_dhcpv6_subnet_static_mapping_option_nis_domain(
                name, parts[0], parts[1], parts[2], parts[3]
            )
            return self.add_set(path)
        return self

    def delete_vrf_dhcpv6_subnet_static_mapping_option_nis_domain(
        self, name: str, value: str
    ) -> "VrfDhcpv6Mixin":
        """Value format: 'network,prefix,host'."""
        parts = value.split(",", 2)
        if len(parts) == 3:
            path = self.mappers["vrf_dhcpv6"].get_dhcpv6_subnet_static_mapping(
                name, parts[0], parts[1], parts[2]
            ) + ["option", "nis-domain"]
            return self.add_delete(path)
        return self

    def set_vrf_dhcpv6_subnet_static_mapping_option_nis_server(
        self, name: str, value: str
    ) -> "VrfDhcpv6Mixin":
        """Value format: 'network,prefix,host,server_address'."""
        parts = value.split(",", 3)
        if len(parts) == 4:
            path = self.mappers["vrf_dhcpv6"].get_dhcpv6_subnet_static_mapping_option_nis_server(
                name, parts[0], parts[1], parts[2], parts[3]
            )
            return self.add_set(path)
        return self

    def delete_vrf_dhcpv6_subnet_static_mapping_option_nis_server(
        self, name: str, value: str
    ) -> "VrfDhcpv6Mixin":
        """Value format: 'network,prefix,host,server_address'."""
        parts = value.split(",", 3)
        if len(parts) == 4:
            path = self.mappers["vrf_dhcpv6"].get_dhcpv6_subnet_static_mapping_option_nis_server(
                name, parts[0], parts[1], parts[2], parts[3]
            )
            return self.add_delete(path)
        return self

    def set_vrf_dhcpv6_subnet_static_mapping_option_nisplus_domain(
        self, name: str, value: str
    ) -> "VrfDhcpv6Mixin":
        """Value format: 'network,prefix,host,nisplus_domain'."""
        parts = value.split(",", 3)
        if len(parts) == 4:
            path = self.mappers["vrf_dhcpv6"].get_dhcpv6_subnet_static_mapping_option_nisplus_domain(
                name, parts[0], parts[1], parts[2], parts[3]
            )
            return self.add_set(path)
        return self

    def delete_vrf_dhcpv6_subnet_static_mapping_option_nisplus_domain(
        self, name: str, value: str
    ) -> "VrfDhcpv6Mixin":
        """Value format: 'network,prefix,host'."""
        parts = value.split(",", 2)
        if len(parts) == 3:
            path = self.mappers["vrf_dhcpv6"].get_dhcpv6_subnet_static_mapping(
                name, parts[0], parts[1], parts[2]
            ) + ["option", "nisplus-domain"]
            return self.add_delete(path)
        return self

    def set_vrf_dhcpv6_subnet_static_mapping_option_nisplus_server(
        self, name: str, value: str
    ) -> "VrfDhcpv6Mixin":
        """Value format: 'network,prefix,host,server_address'."""
        parts = value.split(",", 3)
        if len(parts) == 4:
            path = self.mappers["vrf_dhcpv6"].get_dhcpv6_subnet_static_mapping_option_nisplus_server(
                name, parts[0], parts[1], parts[2], parts[3]
            )
            return self.add_set(path)
        return self

    def delete_vrf_dhcpv6_subnet_static_mapping_option_nisplus_server(
        self, name: str, value: str
    ) -> "VrfDhcpv6Mixin":
        """Value format: 'network,prefix,host,server_address'."""
        parts = value.split(",", 3)
        if len(parts) == 4:
            path = self.mappers["vrf_dhcpv6"].get_dhcpv6_subnet_static_mapping_option_nisplus_server(
                name, parts[0], parts[1], parts[2], parts[3]
            )
            return self.add_delete(path)
        return self

    def set_vrf_dhcpv6_subnet_static_mapping_option_sntp_server(
        self, name: str, value: str
    ) -> "VrfDhcpv6Mixin":
        """Value format: 'network,prefix,host,server_address'."""
        parts = value.split(",", 3)
        if len(parts) == 4:
            path = self.mappers["vrf_dhcpv6"].get_dhcpv6_subnet_static_mapping_option_sntp_server(
                name, parts[0], parts[1], parts[2], parts[3]
            )
            return self.add_set(path)
        return self

    def delete_vrf_dhcpv6_subnet_static_mapping_option_sntp_server(
        self, name: str, value: str
    ) -> "VrfDhcpv6Mixin":
        """Value format: 'network,prefix,host,server_address'."""
        parts = value.split(",", 3)
        if len(parts) == 4:
            path = self.mappers["vrf_dhcpv6"].get_dhcpv6_subnet_static_mapping_option_sntp_server(
                name, parts[0], parts[1], parts[2], parts[3]
            )
            return self.add_delete(path)
        return self

    def set_vrf_dhcpv6_subnet_static_mapping_option_sip_server(
        self, name: str, value: str
    ) -> "VrfDhcpv6Mixin":
        """Value format: 'network,prefix,host,server_address'."""
        parts = value.split(",", 3)
        if len(parts) == 4:
            path = self.mappers["vrf_dhcpv6"].get_dhcpv6_subnet_static_mapping_option_sip_server(
                name, parts[0], parts[1], parts[2], parts[3]
            )
            return self.add_set(path)
        return self

    def delete_vrf_dhcpv6_subnet_static_mapping_option_sip_server(
        self, name: str, value: str
    ) -> "VrfDhcpv6Mixin":
        """Value format: 'network,prefix,host,server_address'."""
        parts = value.split(",", 3)
        if len(parts) == 4:
            path = self.mappers["vrf_dhcpv6"].get_dhcpv6_subnet_static_mapping_option_sip_server(
                name, parts[0], parts[1], parts[2], parts[3]
            )
            return self.add_delete(path)
        return self

    # ========================================================================
    # Vendor Option Operations
    # ========================================================================

    def set_vrf_dhcpv6_subnet_vendor_option_cisco_tftp_server(
        self, name: str, value: str
    ) -> "VrfDhcpv6Mixin":
        """Value format: 'network,prefix,server_address'."""
        parts = value.split(",", 2)
        if len(parts) == 3:
            path = self.mappers["vrf_dhcpv6"].get_dhcpv6_subnet_vendor_option_cisco_tftp_server(
                name, parts[0], parts[1], parts[2]
            )
            return self.add_set(path)
        return self

    def delete_vrf_dhcpv6_subnet_vendor_option_cisco_tftp_server(
        self, name: str, value: str
    ) -> "VrfDhcpv6Mixin":
        """Value format: 'network,prefix,server_address'."""
        parts = value.split(",", 2)
        if len(parts) == 3:
            path = self.mappers["vrf_dhcpv6"].get_dhcpv6_subnet_vendor_option_cisco_tftp_server(
                name, parts[0], parts[1], parts[2]
            )
            return self.add_delete(path)
        return self

    def set_vrf_dhcpv6_subnet_vendor_option_cisco_bootfile(
        self, name: str, value: str
    ) -> "VrfDhcpv6Mixin":
        """Value format: 'network,prefix,bootfile'."""
        parts = value.split(",", 2)
        if len(parts) == 3:
            path = self.mappers["vrf_dhcpv6"].get_dhcpv6_subnet_vendor_option_cisco_bootfile(
                name, parts[0], parts[1], parts[2]
            )
            return self.add_set(path)
        return self

    def delete_vrf_dhcpv6_subnet_vendor_option_cisco_bootfile(
        self, name: str, value: str
    ) -> "VrfDhcpv6Mixin":
        """Value format: 'network,prefix'."""
        parts = value.split(",", 1)
        if len(parts) == 2:
            path = self.mappers["vrf_dhcpv6"].get_dhcpv6_subnet(
                name, parts[0], parts[1]
            ) + ["vendor-option", "cisco", "bootfile"]
            return self.add_delete(path)
        return self

    # ========================================================================
    # Extended Coverage Operations
    # ========================================================================

    # --- Generic option setters ---
    def set_vrf_dhcpv6_shared_network_option(self, name: str, value: str) -> "VrfDhcpv6Mixin":
        """Value format: 'network,option,value'."""
        parts = value.split(",", 2)
        if len(parts) == 3:
            return self.add_set(self.mappers["vrf_dhcpv6"].get_dhcpv6_shared_network_option(name, parts[0], parts[1], parts[2]))
        return self

    def delete_vrf_dhcpv6_shared_network_option(self, name: str, value: str) -> "VrfDhcpv6Mixin":
        """Value format: 'network,option'."""
        parts = value.split(",", 1)
        if len(parts) == 2:
            return self.add_delete(self.mappers["vrf_dhcpv6"].get_dhcpv6_shared_network(name, parts[0]) + ["option", parts[1]])
        return self

    def set_vrf_dhcpv6_subnet_option(self, name: str, value: str) -> "VrfDhcpv6Mixin":
        """Value format: 'network,prefix,option,value'."""
        parts = value.split(",", 3)
        if len(parts) == 4:
            return self.add_set(self.mappers["vrf_dhcpv6"].get_dhcpv6_subnet_option(name, parts[0], parts[1], parts[2], parts[3]))
        return self

    def delete_vrf_dhcpv6_subnet_option(self, name: str, value: str) -> "VrfDhcpv6Mixin":
        """Value format: 'network,prefix,option'."""
        parts = value.split(",", 2)
        if len(parts) == 3:
            return self.add_delete(self.mappers["vrf_dhcpv6"].get_dhcpv6_subnet(name, parts[0], parts[1]) + ["option", parts[2]])
        return self

    def set_vrf_dhcpv6_subnet_range_option(self, name: str, value: str) -> "VrfDhcpv6Mixin":
        """Value format: 'network,prefix,range,option,value'."""
        parts = value.split(",", 4)
        if len(parts) == 5:
            return self.add_set(self.mappers["vrf_dhcpv6"].get_dhcpv6_subnet_range_option(name, parts[0], parts[1], parts[2], parts[3], parts[4]))
        return self

    def delete_vrf_dhcpv6_subnet_range_option(self, name: str, value: str) -> "VrfDhcpv6Mixin":
        """Value format: 'network,prefix,range,option'."""
        parts = value.split(",", 3)
        if len(parts) == 4:
            return self.add_delete(self.mappers["vrf_dhcpv6"].get_dhcpv6_subnet_range(name, parts[0], parts[1], parts[2]) + ["option", parts[3]])
        return self

    def set_vrf_dhcpv6_static_mapping_option(self, name: str, value: str) -> "VrfDhcpv6Mixin":
        """Value format: 'network,prefix,host,option,value'."""
        parts = value.split(",", 4)
        if len(parts) == 5:
            return self.add_set(self.mappers["vrf_dhcpv6"].get_dhcpv6_static_mapping_option(name, parts[0], parts[1], parts[2], parts[3], parts[4]))
        return self

    def delete_vrf_dhcpv6_static_mapping_option(self, name: str, value: str) -> "VrfDhcpv6Mixin":
        """Value format: 'network,prefix,host,option'."""
        parts = value.split(",", 3)
        if len(parts) == 4:
            return self.add_delete(self.mappers["vrf_dhcpv6"].get_dhcpv6_subnet_static_mapping(name, parts[0], parts[1], parts[2]) + ["option", parts[3]])
        return self

    # --- Option vendor-option cisco tftp-server per scope ---
    def set_vrf_dhcpv6_shared_network_option_vendor_cisco_tftp_server(self, name: str, value: str) -> "VrfDhcpv6Mixin":
        """Value format: 'network,tftp-server'."""
        parts = value.split(",", 1)
        if len(parts) == 2:
            return self.add_set(self.mappers["vrf_dhcpv6"].get_dhcpv6_shared_network_option_vendor_cisco_tftp_server(name, parts[0], parts[1]))
        return self

    def delete_vrf_dhcpv6_shared_network_option_vendor_cisco_tftp_server(self, name: str, value: str) -> "VrfDhcpv6Mixin":
        """Value is the network name."""
        return self.add_delete(self.mappers["vrf_dhcpv6"].get_dhcpv6_shared_network(name, value) + ["option", "vendor-option", "cisco", "tftp-server"])

    def set_vrf_dhcpv6_subnet_option_vendor_cisco_tftp_server(self, name: str, value: str) -> "VrfDhcpv6Mixin":
        """Value format: 'network,prefix,tftp-server'."""
        parts = value.split(",", 2)
        if len(parts) == 3:
            return self.add_set(self.mappers["vrf_dhcpv6"].get_dhcpv6_subnet_option_vendor_cisco_tftp_server(name, parts[0], parts[1], parts[2]))
        return self

    def delete_vrf_dhcpv6_subnet_option_vendor_cisco_tftp_server(self, name: str, value: str) -> "VrfDhcpv6Mixin":
        """Value format: 'network,prefix'."""
        parts = value.split(",", 1)
        if len(parts) == 2:
            return self.add_delete(self.mappers["vrf_dhcpv6"].get_dhcpv6_subnet(name, parts[0], parts[1]) + ["option", "vendor-option", "cisco", "tftp-server"])
        return self

    def set_vrf_dhcpv6_subnet_range_option_vendor_cisco_tftp_server(self, name: str, value: str) -> "VrfDhcpv6Mixin":
        """Value format: 'network,prefix,range,tftp-server'."""
        parts = value.split(",", 3)
        if len(parts) == 4:
            return self.add_set(self.mappers["vrf_dhcpv6"].get_dhcpv6_subnet_range_option_vendor_cisco_tftp_server(name, parts[0], parts[1], parts[2], parts[3]))
        return self

    def delete_vrf_dhcpv6_subnet_range_option_vendor_cisco_tftp_server(self, name: str, value: str) -> "VrfDhcpv6Mixin":
        """Value format: 'network,prefix,range'."""
        parts = value.split(",", 2)
        if len(parts) == 3:
            return self.add_delete(self.mappers["vrf_dhcpv6"].get_dhcpv6_subnet_range(name, parts[0], parts[1], parts[2]) + ["option", "vendor-option", "cisco", "tftp-server"])
        return self

    def set_vrf_dhcpv6_static_mapping_option_vendor_cisco_tftp_server(self, name: str, value: str) -> "VrfDhcpv6Mixin":
        """Value format: 'network,prefix,host,tftp-server'."""
        parts = value.split(",", 3)
        if len(parts) == 4:
            return self.add_set(self.mappers["vrf_dhcpv6"].get_dhcpv6_static_mapping_option_vendor_cisco_tftp_server(name, parts[0], parts[1], parts[2], parts[3]))
        return self

    def delete_vrf_dhcpv6_static_mapping_option_vendor_cisco_tftp_server(self, name: str, value: str) -> "VrfDhcpv6Mixin":
        """Value format: 'network,prefix,host'."""
        parts = value.split(",", 2)
        if len(parts) == 3:
            return self.add_delete(self.mappers["vrf_dhcpv6"].get_dhcpv6_subnet_static_mapping(name, parts[0], parts[1], parts[2]) + ["option", "vendor-option", "cisco", "tftp-server"])
        return self

    # --- Subnet interface / subnet-id; static-mapping duid / mac ---
    def set_vrf_dhcpv6_subnet_interface(self, name: str, value: str) -> "VrfDhcpv6Mixin":
        """Value format: 'network,prefix,interface'."""
        parts = value.split(",", 2)
        if len(parts) == 3:
            return self.add_set(self.mappers["vrf_dhcpv6"].get_dhcpv6_subnet_interface(name, parts[0], parts[1], parts[2]))
        return self

    def delete_vrf_dhcpv6_subnet_interface(self, name: str, value: str) -> "VrfDhcpv6Mixin":
        """Value format: 'network,prefix'."""
        parts = value.split(",", 1)
        if len(parts) == 2:
            return self.add_delete(self.mappers["vrf_dhcpv6"].get_dhcpv6_subnet(name, parts[0], parts[1]) + ["interface"])
        return self

    def set_vrf_dhcpv6_subnet_id(self, name: str, value: str) -> "VrfDhcpv6Mixin":
        """Value format: 'network,prefix,id'."""
        parts = value.split(",", 2)
        if len(parts) == 3:
            return self.add_set(self.mappers["vrf_dhcpv6"].get_dhcpv6_subnet_id(name, parts[0], parts[1], parts[2]))
        return self

    def delete_vrf_dhcpv6_subnet_id(self, name: str, value: str) -> "VrfDhcpv6Mixin":
        """Value format: 'network,prefix'."""
        parts = value.split(",", 1)
        if len(parts) == 2:
            return self.add_delete(self.mappers["vrf_dhcpv6"].get_dhcpv6_subnet(name, parts[0], parts[1]) + ["subnet-id"])
        return self

    def set_vrf_dhcpv6_subnet_static_mapping_duid(self, name: str, value: str) -> "VrfDhcpv6Mixin":
        """Value format: 'network,prefix,host,duid'."""
        parts = value.split(",", 3)
        if len(parts) == 4:
            return self.add_set(self.mappers["vrf_dhcpv6"].get_dhcpv6_subnet_static_mapping_duid(name, parts[0], parts[1], parts[2], parts[3]))
        return self

    def delete_vrf_dhcpv6_subnet_static_mapping_duid(self, name: str, value: str) -> "VrfDhcpv6Mixin":
        """Value format: 'network,prefix,host'."""
        parts = value.split(",", 2)
        if len(parts) == 3:
            return self.add_delete(self.mappers["vrf_dhcpv6"].get_dhcpv6_subnet_static_mapping(name, parts[0], parts[1], parts[2]) + ["duid"])
        return self

    def set_vrf_dhcpv6_subnet_static_mapping_mac(self, name: str, value: str) -> "VrfDhcpv6Mixin":
        """Value format: 'network,prefix,host,mac'."""
        parts = value.split(",", 3)
        if len(parts) == 4:
            return self.add_set(self.mappers["vrf_dhcpv6"].get_dhcpv6_subnet_static_mapping_mac(name, parts[0], parts[1], parts[2], parts[3]))
        return self

    def delete_vrf_dhcpv6_subnet_static_mapping_mac(self, name: str, value: str) -> "VrfDhcpv6Mixin":
        """Value format: 'network,prefix,host'."""
        parts = value.split(",", 2)
        if len(parts) == 3:
            return self.add_delete(self.mappers["vrf_dhcpv6"].get_dhcpv6_subnet_static_mapping(name, parts[0], parts[1], parts[2]) + ["mac"])
        return self
