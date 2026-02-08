"""
VRF ISIS Builder Mixin

Provides batch operations for IS-IS (Intermediate System to Intermediate System)
routing protocol configuration within VRF instances.
Mixed into VrfBatchBuilder to extend it with ISIS operations.
"""


class VrfIsisMixin:
    """Mixin for VRF ISIS builder operations."""

    # ========================================================================
    # ISIS Root
    # ========================================================================

    def set_vrf_isis(self, name: str) -> "VrfIsisMixin":
        """Enable ISIS for a VRF."""
        path = self.mappers["vrf_isis"].get_isis(name)
        return self.add_set(path)

    def delete_vrf_isis(self, name: str) -> "VrfIsisMixin":
        """Delete all ISIS configuration for a VRF."""
        path = self.mappers["vrf_isis"].get_isis(name)
        return self.add_delete(path)

    # ========================================================================
    # Global Flags
    # ========================================================================

    def set_vrf_isis_advertise_high_metrics(self, name: str) -> "VrfIsisMixin":
        """Enable advertising high metrics."""
        path = self.mappers["vrf_isis"].get_isis_advertise_high_metrics(name)
        return self.add_set(path)

    def delete_vrf_isis_advertise_high_metrics(self, name: str) -> "VrfIsisMixin":
        """Disable advertising high metrics."""
        path = self.mappers["vrf_isis"].get_isis_advertise_high_metrics(name)
        return self.add_delete(path)

    def set_vrf_isis_advertise_passive_only(self, name: str) -> "VrfIsisMixin":
        """Enable advertising passive-only."""
        path = self.mappers["vrf_isis"].get_isis_advertise_passive_only(name)
        return self.add_set(path)

    def delete_vrf_isis_advertise_passive_only(self, name: str) -> "VrfIsisMixin":
        """Disable advertising passive-only."""
        path = self.mappers["vrf_isis"].get_isis_advertise_passive_only(name)
        return self.add_delete(path)

    def set_vrf_isis_dynamic_hostname(self, name: str) -> "VrfIsisMixin":
        """Enable dynamic hostname."""
        path = self.mappers["vrf_isis"].get_isis_dynamic_hostname(name)
        return self.add_set(path)

    def delete_vrf_isis_dynamic_hostname(self, name: str) -> "VrfIsisMixin":
        """Disable dynamic hostname."""
        path = self.mappers["vrf_isis"].get_isis_dynamic_hostname(name)
        return self.add_delete(path)

    def set_vrf_isis_log_adjacency_changes(self, name: str) -> "VrfIsisMixin":
        """Enable logging of adjacency changes."""
        path = self.mappers["vrf_isis"].get_isis_log_adjacency_changes(name)
        return self.add_set(path)

    def delete_vrf_isis_log_adjacency_changes(self, name: str) -> "VrfIsisMixin":
        """Disable logging of adjacency changes."""
        path = self.mappers["vrf_isis"].get_isis_log_adjacency_changes(name)
        return self.add_delete(path)

    def set_vrf_isis_set_attached_bit(self, name: str) -> "VrfIsisMixin":
        """Enable set-attached-bit."""
        path = self.mappers["vrf_isis"].get_isis_set_attached_bit(name)
        return self.add_set(path)

    def delete_vrf_isis_set_attached_bit(self, name: str) -> "VrfIsisMixin":
        """Disable set-attached-bit."""
        path = self.mappers["vrf_isis"].get_isis_set_attached_bit(name)
        return self.add_delete(path)

    def set_vrf_isis_set_overload_bit(self, name: str) -> "VrfIsisMixin":
        """Enable set-overload-bit."""
        path = self.mappers["vrf_isis"].get_isis_set_overload_bit(name)
        return self.add_set(path)

    def delete_vrf_isis_set_overload_bit(self, name: str) -> "VrfIsisMixin":
        """Disable set-overload-bit."""
        path = self.mappers["vrf_isis"].get_isis_set_overload_bit(name)
        return self.add_delete(path)

    def set_vrf_isis_ldp_sync(self, name: str) -> "VrfIsisMixin":
        """Enable LDP sync."""
        path = self.mappers["vrf_isis"].get_isis_ldp_sync(name)
        return self.add_set(path)

    def delete_vrf_isis_ldp_sync(self, name: str) -> "VrfIsisMixin":
        """Disable LDP sync."""
        path = self.mappers["vrf_isis"].get_isis_ldp_sync(name)
        return self.add_delete(path)

    # ========================================================================
    # Global Value Settings
    # ========================================================================

    def set_vrf_isis_lsp_mtu(self, name: str, value: str) -> "VrfIsisMixin":
        """Set LSP MTU. Value is the MTU size."""
        path = self.mappers["vrf_isis"].get_isis_lsp_mtu(name, value)
        return self.add_set(path)

    def delete_vrf_isis_lsp_mtu(self, name: str) -> "VrfIsisMixin":
        """Delete LSP MTU."""
        path = self.mappers["vrf_isis"].get_isis(name) + ["lsp-mtu"]
        return self.add_delete(path)

    def set_vrf_isis_lsp_refresh_interval(self, name: str, value: str) -> "VrfIsisMixin":
        """Set LSP refresh interval. Value is the interval in seconds."""
        path = self.mappers["vrf_isis"].get_isis_lsp_refresh_interval(name, value)
        return self.add_set(path)

    def delete_vrf_isis_lsp_refresh_interval(self, name: str) -> "VrfIsisMixin":
        """Delete LSP refresh interval."""
        path = self.mappers["vrf_isis"].get_isis(name) + ["lsp-refresh-interval"]
        return self.add_delete(path)

    def set_vrf_isis_metric_style(self, name: str, value: str) -> "VrfIsisMixin":
        """Set metric style. Value: narrow, transition, or wide."""
        path = self.mappers["vrf_isis"].get_isis_metric_style(name, value)
        return self.add_set(path)

    def delete_vrf_isis_metric_style(self, name: str) -> "VrfIsisMixin":
        """Delete metric style."""
        path = self.mappers["vrf_isis"].get_isis(name) + ["metric-style"]
        return self.add_delete(path)

    def set_vrf_isis_net(self, name: str, value: str) -> "VrfIsisMixin":
        """Set NET address. Value is the NET address."""
        path = self.mappers["vrf_isis"].get_isis_net(name, value)
        return self.add_set(path)

    def delete_vrf_isis_net(self, name: str, value: str) -> "VrfIsisMixin":
        """Delete NET address. Value is the NET address to remove."""
        path = self.mappers["vrf_isis"].get_isis_net(name, value)
        return self.add_delete(path)

    def set_vrf_isis_spf_interval(self, name: str, value: str) -> "VrfIsisMixin":
        """Set SPF interval. Value is the interval in seconds."""
        path = self.mappers["vrf_isis"].get_isis_spf_interval(name, value)
        return self.add_set(path)

    def delete_vrf_isis_spf_interval(self, name: str) -> "VrfIsisMixin":
        """Delete SPF interval."""
        path = self.mappers["vrf_isis"].get_isis(name) + ["spf-interval"]
        return self.add_delete(path)

    def set_vrf_isis_set_overload_bit_on_startup(self, name: str, value: str) -> "VrfIsisMixin":
        """Set overload bit on startup delay. Value is the delay in seconds."""
        path = self.mappers["vrf_isis"].get_isis_set_overload_bit_on_startup(name, value)
        return self.add_set(path)

    def delete_vrf_isis_set_overload_bit_on_startup(self, name: str) -> "VrfIsisMixin":
        """Delete overload bit on startup delay."""
        path = self.mappers["vrf_isis"].get_isis(name) + ["set-overload-bit", "on-startup"]
        return self.add_delete(path)

    # ========================================================================
    # Area Password
    # ========================================================================

    def set_vrf_isis_area_password_md5(self, name: str, value: str) -> "VrfIsisMixin":
        """Set area password using MD5. Value is the password."""
        path = self.mappers["vrf_isis"].get_isis_area_password_md5(name, value)
        return self.add_set(path)

    def delete_vrf_isis_area_password_md5(self, name: str) -> "VrfIsisMixin":
        """Delete area MD5 password."""
        path = self.mappers["vrf_isis"].get_isis(name) + ["area-password", "md5"]
        return self.add_delete(path)

    def set_vrf_isis_area_password_plaintext_password(self, name: str, value: str) -> "VrfIsisMixin":
        """Set area password using plaintext. Value is the password."""
        path = self.mappers["vrf_isis"].get_isis_area_password_plaintext_password(name, value)
        return self.add_set(path)

    def delete_vrf_isis_area_password_plaintext_password(self, name: str) -> "VrfIsisMixin":
        """Delete area plaintext password."""
        path = self.mappers["vrf_isis"].get_isis(name) + ["area-password", "plaintext-password"]
        return self.add_delete(path)

    def set_vrf_isis_area_password_authenticate_snp(self, name: str, value: str) -> "VrfIsisMixin":
        """Set area password authenticate-snp. Value: send-only or validate."""
        path = self.mappers["vrf_isis"].get_isis_area_password_authenticate_snp(name, value)
        return self.add_set(path)

    def delete_vrf_isis_area_password_authenticate_snp(self, name: str) -> "VrfIsisMixin":
        """Delete area password authenticate-snp."""
        path = self.mappers["vrf_isis"].get_isis(name) + ["area-password", "authenticate-snp"]
        return self.add_delete(path)

    # ========================================================================
    # Domain Password
    # ========================================================================

    def set_vrf_isis_domain_password_md5(self, name: str, value: str) -> "VrfIsisMixin":
        """Set domain password using MD5. Value is the password."""
        path = self.mappers["vrf_isis"].get_isis_domain_password_md5(name, value)
        return self.add_set(path)

    def delete_vrf_isis_domain_password_md5(self, name: str) -> "VrfIsisMixin":
        """Delete domain MD5 password."""
        path = self.mappers["vrf_isis"].get_isis(name) + ["domain-password", "md5"]
        return self.add_delete(path)

    def set_vrf_isis_domain_password_plaintext_password(self, name: str, value: str) -> "VrfIsisMixin":
        """Set domain password using plaintext. Value is the password."""
        path = self.mappers["vrf_isis"].get_isis_domain_password_plaintext_password(name, value)
        return self.add_set(path)

    def delete_vrf_isis_domain_password_plaintext_password(self, name: str) -> "VrfIsisMixin":
        """Delete domain plaintext password."""
        path = self.mappers["vrf_isis"].get_isis(name) + ["domain-password", "plaintext-password"]
        return self.add_delete(path)

    def set_vrf_isis_domain_password_authenticate_snp(self, name: str, value: str) -> "VrfIsisMixin":
        """Set domain password authenticate-snp. Value: send-only or validate."""
        path = self.mappers["vrf_isis"].get_isis_domain_password_authenticate_snp(name, value)
        return self.add_set(path)

    def delete_vrf_isis_domain_password_authenticate_snp(self, name: str) -> "VrfIsisMixin":
        """Delete domain password authenticate-snp."""
        path = self.mappers["vrf_isis"].get_isis(name) + ["domain-password", "authenticate-snp"]
        return self.add_delete(path)

    # ========================================================================
    # Default Information Originate
    # ========================================================================

    def set_vrf_isis_default_information_originate(self, name: str, value: str) -> "VrfIsisMixin":
        """Enable default-information originate. Value format: 'af,level'."""
        parts = value.split(",", 1)
        if len(parts) == 2:
            path = self.mappers["vrf_isis"].get_isis_default_information_originate(name, parts[0], parts[1])
            return self.add_set(path)
        return self

    def delete_vrf_isis_default_information_originate(self, name: str, value: str) -> "VrfIsisMixin":
        """Delete default-information originate. Value format: 'af,level'."""
        parts = value.split(",", 1)
        if len(parts) == 2:
            path = self.mappers["vrf_isis"].get_isis_default_information_originate(name, parts[0], parts[1])
            return self.add_delete(path)
        return self

    def set_vrf_isis_default_information_originate_always(self, name: str, value: str) -> "VrfIsisMixin":
        """Set default-information originate always. Value format: 'af,level'."""
        parts = value.split(",", 1)
        if len(parts) == 2:
            path = self.mappers["vrf_isis"].get_isis_default_information_originate_always(name, parts[0], parts[1])
            return self.add_set(path)
        return self

    def delete_vrf_isis_default_information_originate_always(self, name: str, value: str) -> "VrfIsisMixin":
        """Delete default-information originate always. Value format: 'af,level'."""
        parts = value.split(",", 1)
        if len(parts) == 2:
            path = self.mappers["vrf_isis"].get_isis_default_information_originate_always(name, parts[0], parts[1])
            return self.add_delete(path)
        return self

    def set_vrf_isis_default_information_originate_metric(self, name: str, value: str) -> "VrfIsisMixin":
        """Set default-information originate metric. Value format: 'af,level,metric'."""
        parts = value.split(",", 2)
        if len(parts) == 3:
            path = self.mappers["vrf_isis"].get_isis_default_information_originate_metric(name, parts[0], parts[1], parts[2])
            return self.add_set(path)
        return self

    def delete_vrf_isis_default_information_originate_metric(self, name: str, value: str) -> "VrfIsisMixin":
        """Delete default-information originate metric. Value format: 'af,level'."""
        parts = value.split(",", 1)
        if len(parts) == 2:
            path = self.mappers["vrf_isis"].get_isis_default_information_originate(name, parts[0], parts[1]) + ["metric"]
            return self.add_delete(path)
        return self

    def set_vrf_isis_default_information_originate_route_map(self, name: str, value: str) -> "VrfIsisMixin":
        """Set default-information originate route-map. Value format: 'af,level,route_map'."""
        parts = value.split(",", 2)
        if len(parts) == 3:
            path = self.mappers["vrf_isis"].get_isis_default_information_originate_route_map(name, parts[0], parts[1], parts[2])
            return self.add_set(path)
        return self

    def delete_vrf_isis_default_information_originate_route_map(self, name: str, value: str) -> "VrfIsisMixin":
        """Delete default-information originate route-map. Value format: 'af,level'."""
        parts = value.split(",", 1)
        if len(parts) == 2:
            path = self.mappers["vrf_isis"].get_isis_default_information_originate(name, parts[0], parts[1]) + ["route-map"]
            return self.add_delete(path)
        return self

    # ========================================================================
    # Interface Operations
    # ========================================================================

    def set_vrf_isis_interface(self, name: str, value: str) -> "VrfIsisMixin":
        """Add an interface to ISIS. Value is the interface name."""
        path = self.mappers["vrf_isis"].get_isis_interface(name, value)
        return self.add_set(path)

    def delete_vrf_isis_interface(self, name: str, value: str) -> "VrfIsisMixin":
        """Remove an interface from ISIS. Value is the interface name."""
        path = self.mappers["vrf_isis"].get_isis_interface(name, value)
        return self.add_delete(path)

    def set_vrf_isis_interface_bfd(self, name: str, value: str) -> "VrfIsisMixin":
        """Enable BFD on an ISIS interface. Value is the interface name."""
        path = self.mappers["vrf_isis"].get_isis_interface_bfd(name, value)
        return self.add_set(path)

    def delete_vrf_isis_interface_bfd(self, name: str, value: str) -> "VrfIsisMixin":
        """Disable BFD on an ISIS interface. Value is the interface name."""
        path = self.mappers["vrf_isis"].get_isis_interface_bfd(name, value)
        return self.add_delete(path)

    def set_vrf_isis_interface_bfd_profile(self, name: str, value: str) -> "VrfIsisMixin":
        """Set BFD profile on an ISIS interface. Value format: 'iface,profile'."""
        parts = value.split(",", 1)
        if len(parts) == 2:
            path = self.mappers["vrf_isis"].get_isis_interface_bfd_profile(name, parts[0], parts[1])
            return self.add_set(path)
        return self

    def delete_vrf_isis_interface_bfd_profile(self, name: str, value: str) -> "VrfIsisMixin":
        """Delete BFD profile on an ISIS interface. Value is the interface name."""
        path = self.mappers["vrf_isis"].get_isis_interface(name, value) + ["bfd-profile"]
        return self.add_delete(path)

    def set_vrf_isis_interface_circuit_type(self, name: str, value: str) -> "VrfIsisMixin":
        """Set circuit type on an ISIS interface. Value format: 'iface,circuit_type'."""
        parts = value.split(",", 1)
        if len(parts) == 2:
            path = self.mappers["vrf_isis"].get_isis_interface_circuit_type(name, parts[0], parts[1])
            return self.add_set(path)
        return self

    def delete_vrf_isis_interface_circuit_type(self, name: str, value: str) -> "VrfIsisMixin":
        """Delete circuit type on an ISIS interface. Value is the interface name."""
        path = self.mappers["vrf_isis"].get_isis_interface(name, value) + ["circuit-type"]
        return self.add_delete(path)

    def set_vrf_isis_interface_hello_interval(self, name: str, value: str) -> "VrfIsisMixin":
        """Set hello interval on an ISIS interface. Value format: 'iface,interval'."""
        parts = value.split(",", 1)
        if len(parts) == 2:
            path = self.mappers["vrf_isis"].get_isis_interface_hello_interval(name, parts[0], parts[1])
            return self.add_set(path)
        return self

    def delete_vrf_isis_interface_hello_interval(self, name: str, value: str) -> "VrfIsisMixin":
        """Delete hello interval on an ISIS interface. Value is the interface name."""
        path = self.mappers["vrf_isis"].get_isis_interface(name, value) + ["hello-interval"]
        return self.add_delete(path)

    def set_vrf_isis_interface_hello_multiplier(self, name: str, value: str) -> "VrfIsisMixin":
        """Set hello multiplier on an ISIS interface. Value format: 'iface,multiplier'."""
        parts = value.split(",", 1)
        if len(parts) == 2:
            path = self.mappers["vrf_isis"].get_isis_interface_hello_multiplier(name, parts[0], parts[1])
            return self.add_set(path)
        return self

    def delete_vrf_isis_interface_hello_multiplier(self, name: str, value: str) -> "VrfIsisMixin":
        """Delete hello multiplier on an ISIS interface. Value is the interface name."""
        path = self.mappers["vrf_isis"].get_isis_interface(name, value) + ["hello-multiplier"]
        return self.add_delete(path)

    def set_vrf_isis_interface_hello_padding(self, name: str, value: str) -> "VrfIsisMixin":
        """Enable hello padding on an ISIS interface. Value is the interface name."""
        path = self.mappers["vrf_isis"].get_isis_interface_hello_padding(name, value)
        return self.add_set(path)

    def delete_vrf_isis_interface_hello_padding(self, name: str, value: str) -> "VrfIsisMixin":
        """Disable hello padding on an ISIS interface. Value is the interface name."""
        path = self.mappers["vrf_isis"].get_isis_interface_hello_padding(name, value)
        return self.add_delete(path)

    def set_vrf_isis_interface_ldp_sync(self, name: str, value: str) -> "VrfIsisMixin":
        """Enable LDP sync on an ISIS interface. Value is the interface name."""
        path = self.mappers["vrf_isis"].get_isis_interface_ldp_sync(name, value)
        return self.add_set(path)

    def delete_vrf_isis_interface_ldp_sync(self, name: str, value: str) -> "VrfIsisMixin":
        """Disable LDP sync on an ISIS interface. Value is the interface name."""
        path = self.mappers["vrf_isis"].get_isis_interface_ldp_sync(name, value)
        return self.add_delete(path)

    def set_vrf_isis_interface_ldp_sync_holddown(self, name: str, value: str) -> "VrfIsisMixin":
        """Set LDP sync holddown on an ISIS interface. Value format: 'iface,holddown'."""
        parts = value.split(",", 1)
        if len(parts) == 2:
            path = self.mappers["vrf_isis"].get_isis_interface_ldp_sync_holddown(name, parts[0], parts[1])
            return self.add_set(path)
        return self

    def delete_vrf_isis_interface_ldp_sync_holddown(self, name: str, value: str) -> "VrfIsisMixin":
        """Delete LDP sync holddown on an ISIS interface. Value is the interface name."""
        path = self.mappers["vrf_isis"].get_isis_interface(name, value) + ["ldp-sync", "holddown"]
        return self.add_delete(path)

    def set_vrf_isis_interface_metric(self, name: str, value: str) -> "VrfIsisMixin":
        """Set metric on an ISIS interface. Value format: 'iface,metric'."""
        parts = value.split(",", 1)
        if len(parts) == 2:
            path = self.mappers["vrf_isis"].get_isis_interface_metric(name, parts[0], parts[1])
            return self.add_set(path)
        return self

    def delete_vrf_isis_interface_metric(self, name: str, value: str) -> "VrfIsisMixin":
        """Delete metric on an ISIS interface. Value is the interface name."""
        path = self.mappers["vrf_isis"].get_isis_interface(name, value) + ["metric"]
        return self.add_delete(path)

    def set_vrf_isis_interface_network(self, name: str, value: str) -> "VrfIsisMixin":
        """Set network type on an ISIS interface. Value format: 'iface,network_type'."""
        parts = value.split(",", 1)
        if len(parts) == 2:
            path = self.mappers["vrf_isis"].get_isis_interface_network(name, parts[0], parts[1])
            return self.add_set(path)
        return self

    def delete_vrf_isis_interface_network(self, name: str, value: str) -> "VrfIsisMixin":
        """Delete network type on an ISIS interface. Value is the interface name."""
        path = self.mappers["vrf_isis"].get_isis_interface(name, value) + ["network"]
        return self.add_delete(path)

    def set_vrf_isis_interface_no_three_way_handshake(self, name: str, value: str) -> "VrfIsisMixin":
        """Enable no-three-way-handshake on an ISIS interface. Value is the interface name."""
        path = self.mappers["vrf_isis"].get_isis_interface_no_three_way_handshake(name, value)
        return self.add_set(path)

    def delete_vrf_isis_interface_no_three_way_handshake(self, name: str, value: str) -> "VrfIsisMixin":
        """Disable no-three-way-handshake on an ISIS interface. Value is the interface name."""
        path = self.mappers["vrf_isis"].get_isis_interface_no_three_way_handshake(name, value)
        return self.add_delete(path)

    def set_vrf_isis_interface_passive(self, name: str, value: str) -> "VrfIsisMixin":
        """Set interface as passive. Value is the interface name."""
        path = self.mappers["vrf_isis"].get_isis_interface_passive(name, value)
        return self.add_set(path)

    def delete_vrf_isis_interface_passive(self, name: str, value: str) -> "VrfIsisMixin":
        """Remove passive from interface. Value is the interface name."""
        path = self.mappers["vrf_isis"].get_isis_interface_passive(name, value)
        return self.add_delete(path)

    def set_vrf_isis_interface_password_md5(self, name: str, value: str) -> "VrfIsisMixin":
        """Set MD5 password on an ISIS interface. Value format: 'iface,password'."""
        parts = value.split(",", 1)
        if len(parts) == 2:
            path = self.mappers["vrf_isis"].get_isis_interface_password_md5(name, parts[0], parts[1])
            return self.add_set(path)
        return self

    def delete_vrf_isis_interface_password_md5(self, name: str, value: str) -> "VrfIsisMixin":
        """Delete MD5 password on an ISIS interface. Value is the interface name."""
        path = self.mappers["vrf_isis"].get_isis_interface(name, value) + ["password", "md5"]
        return self.add_delete(path)

    def set_vrf_isis_interface_password_plaintext_password(self, name: str, value: str) -> "VrfIsisMixin":
        """Set plaintext password on an ISIS interface. Value format: 'iface,password'."""
        parts = value.split(",", 1)
        if len(parts) == 2:
            path = self.mappers["vrf_isis"].get_isis_interface_password_plaintext_password(name, parts[0], parts[1])
            return self.add_set(path)
        return self

    def delete_vrf_isis_interface_password_plaintext_password(self, name: str, value: str) -> "VrfIsisMixin":
        """Delete plaintext password on an ISIS interface. Value is the interface name."""
        path = self.mappers["vrf_isis"].get_isis_interface(name, value) + ["password", "plaintext-password"]
        return self.add_delete(path)

    def set_vrf_isis_interface_priority(self, name: str, value: str) -> "VrfIsisMixin":
        """Set priority on an ISIS interface. Value format: 'iface,priority'."""
        parts = value.split(",", 1)
        if len(parts) == 2:
            path = self.mappers["vrf_isis"].get_isis_interface_priority(name, parts[0], parts[1])
            return self.add_set(path)
        return self

    def delete_vrf_isis_interface_priority(self, name: str, value: str) -> "VrfIsisMixin":
        """Delete priority on an ISIS interface. Value is the interface name."""
        path = self.mappers["vrf_isis"].get_isis_interface(name, value) + ["priority"]
        return self.add_delete(path)

    def set_vrf_isis_interface_psnp_interval(self, name: str, value: str) -> "VrfIsisMixin":
        """Set PSNP interval on an ISIS interface. Value format: 'iface,interval'."""
        parts = value.split(",", 1)
        if len(parts) == 2:
            path = self.mappers["vrf_isis"].get_isis_interface_psnp_interval(name, parts[0], parts[1])
            return self.add_set(path)
        return self

    def delete_vrf_isis_interface_psnp_interval(self, name: str, value: str) -> "VrfIsisMixin":
        """Delete PSNP interval on an ISIS interface. Value is the interface name."""
        path = self.mappers["vrf_isis"].get_isis_interface(name, value) + ["psnp-interval"]
        return self.add_delete(path)

    # ========================================================================
    # Level Operations
    # ========================================================================

    def set_vrf_isis_level_lsp_gen_interval(self, name: str, value: str) -> "VrfIsisMixin":
        """Set LSP gen interval for a level. Value format: 'level,interval'."""
        parts = value.split(",", 1)
        if len(parts) == 2:
            path = self.mappers["vrf_isis"].get_isis_level_lsp_gen_interval(name, parts[0], parts[1])
            return self.add_set(path)
        return self

    def delete_vrf_isis_level_lsp_gen_interval(self, name: str, value: str) -> "VrfIsisMixin":
        """Delete LSP gen interval for a level. Value is the level (all, 1, or 2)."""
        path = self.mappers["vrf_isis"].get_isis_level(name, value) + ["lsp-gen-interval"]
        return self.add_delete(path)

    def set_vrf_isis_level_max_lsp_lifetime(self, name: str, value: str) -> "VrfIsisMixin":
        """Set max LSP lifetime for a level. Value format: 'level,lifetime'."""
        parts = value.split(",", 1)
        if len(parts) == 2:
            path = self.mappers["vrf_isis"].get_isis_level_max_lsp_lifetime(name, parts[0], parts[1])
            return self.add_set(path)
        return self

    def delete_vrf_isis_level_max_lsp_lifetime(self, name: str, value: str) -> "VrfIsisMixin":
        """Delete max LSP lifetime for a level. Value is the level (all, 1, or 2)."""
        path = self.mappers["vrf_isis"].get_isis_level(name, value) + ["max-lsp-lifetime"]
        return self.add_delete(path)

    def set_vrf_isis_level_spf_interval(self, name: str, value: str) -> "VrfIsisMixin":
        """Set SPF interval for a level. Value format: 'level,interval'."""
        parts = value.split(",", 1)
        if len(parts) == 2:
            path = self.mappers["vrf_isis"].get_isis_level_spf_interval(name, parts[0], parts[1])
            return self.add_set(path)
        return self

    def delete_vrf_isis_level_spf_interval(self, name: str, value: str) -> "VrfIsisMixin":
        """Delete SPF interval for a level. Value is the level (all, 1, or 2)."""
        path = self.mappers["vrf_isis"].get_isis_level(name, value) + ["spf-interval"]
        return self.add_delete(path)

    def set_vrf_isis_level_purge_originator(self, name: str, value: str) -> "VrfIsisMixin":
        """Enable purge originator for a level. Value is the level (all, 1, or 2)."""
        path = self.mappers["vrf_isis"].get_isis_level_purge_originator(name, value)
        return self.add_set(path)

    def delete_vrf_isis_level_purge_originator(self, name: str, value: str) -> "VrfIsisMixin":
        """Disable purge originator for a level. Value is the level (all, 1, or 2)."""
        path = self.mappers["vrf_isis"].get_isis_level_purge_originator(name, value)
        return self.add_delete(path)

    # ========================================================================
    # Redistribute Operations
    # ========================================================================

    def set_vrf_isis_redistribute(self, name: str, value: str) -> "VrfIsisMixin":
        """Enable redistribution. Value format: 'af,protocol'."""
        parts = value.split(",", 1)
        if len(parts) == 2:
            path = self.mappers["vrf_isis"].get_isis_redistribute(name, parts[0], parts[1])
            return self.add_set(path)
        return self

    def delete_vrf_isis_redistribute(self, name: str, value: str) -> "VrfIsisMixin":
        """Delete redistribution. Value format: 'af,protocol'."""
        parts = value.split(",", 1)
        if len(parts) == 2:
            path = self.mappers["vrf_isis"].get_isis_redistribute(name, parts[0], parts[1])
            return self.add_delete(path)
        return self

    def set_vrf_isis_redistribute_level(self, name: str, value: str) -> "VrfIsisMixin":
        """Set redistribution level. Value format: 'af,protocol,level'."""
        parts = value.split(",", 2)
        if len(parts) == 3:
            path = self.mappers["vrf_isis"].get_isis_redistribute_level(name, parts[0], parts[1], parts[2])
            return self.add_set(path)
        return self

    def delete_vrf_isis_redistribute_level(self, name: str, value: str) -> "VrfIsisMixin":
        """Delete redistribution level. Value format: 'af,protocol,level'."""
        parts = value.split(",", 2)
        if len(parts) == 3:
            path = self.mappers["vrf_isis"].get_isis_redistribute_level(name, parts[0], parts[1], parts[2])
            return self.add_delete(path)
        return self

    def set_vrf_isis_redistribute_metric(self, name: str, value: str) -> "VrfIsisMixin":
        """Set redistribution metric. Value format: 'af,protocol,metric'."""
        parts = value.split(",", 2)
        if len(parts) == 3:
            path = self.mappers["vrf_isis"].get_isis_redistribute_metric(name, parts[0], parts[1], parts[2])
            return self.add_set(path)
        return self

    def delete_vrf_isis_redistribute_metric(self, name: str, value: str) -> "VrfIsisMixin":
        """Delete redistribution metric. Value format: 'af,protocol'."""
        parts = value.split(",", 1)
        if len(parts) == 2:
            path = self.mappers["vrf_isis"].get_isis_redistribute(name, parts[0], parts[1]) + ["metric"]
            return self.add_delete(path)
        return self

    def set_vrf_isis_redistribute_route_map(self, name: str, value: str) -> "VrfIsisMixin":
        """Set redistribution route-map. Value format: 'af,protocol,route_map'."""
        parts = value.split(",", 2)
        if len(parts) == 3:
            path = self.mappers["vrf_isis"].get_isis_redistribute_route_map(name, parts[0], parts[1], parts[2])
            return self.add_set(path)
        return self

    def delete_vrf_isis_redistribute_route_map(self, name: str, value: str) -> "VrfIsisMixin":
        """Delete redistribution route-map. Value format: 'af,protocol'."""
        parts = value.split(",", 1)
        if len(parts) == 2:
            path = self.mappers["vrf_isis"].get_isis_redistribute(name, parts[0], parts[1]) + ["route-map"]
            return self.add_delete(path)
        return self

    # ========================================================================
    # Segment Routing Operations
    # ========================================================================

    def set_vrf_isis_segment_routing_global_block(self, name: str, value: str) -> "VrfIsisMixin":
        """Set segment-routing global block. Value format: 'low,high'."""
        parts = value.split(",", 1)
        if len(parts) == 2:
            path_low = self.mappers["vrf_isis"].get_isis_segment_routing_global_block_low(name, parts[0])
            path_high = self.mappers["vrf_isis"].get_isis_segment_routing_global_block_high(name, parts[1])
            self.add_set(path_low)
            return self.add_set(path_high)
        return self

    def delete_vrf_isis_segment_routing_global_block(self, name: str) -> "VrfIsisMixin":
        """Delete segment-routing global block."""
        path = self.mappers["vrf_isis"].get_isis(name) + ["segment-routing", "global-block"]
        return self.add_delete(path)

    def set_vrf_isis_segment_routing_local_block(self, name: str, value: str) -> "VrfIsisMixin":
        """Set segment-routing local block. Value format: 'low,high'."""
        parts = value.split(",", 1)
        if len(parts) == 2:
            path_low = self.mappers["vrf_isis"].get_isis_segment_routing_local_block_low(name, parts[0])
            path_high = self.mappers["vrf_isis"].get_isis_segment_routing_local_block_high(name, parts[1])
            self.add_set(path_low)
            return self.add_set(path_high)
        return self

    def delete_vrf_isis_segment_routing_local_block(self, name: str) -> "VrfIsisMixin":
        """Delete segment-routing local block."""
        path = self.mappers["vrf_isis"].get_isis(name) + ["segment-routing", "local-block"]
        return self.add_delete(path)

    def set_vrf_isis_segment_routing_maximum_label_depth(self, name: str, value: str) -> "VrfIsisMixin":
        """Set segment-routing maximum label depth. Value is the depth."""
        path = self.mappers["vrf_isis"].get_isis_segment_routing_maximum_label_depth(name, value)
        return self.add_set(path)

    def delete_vrf_isis_segment_routing_maximum_label_depth(self, name: str) -> "VrfIsisMixin":
        """Delete segment-routing maximum label depth."""
        path = self.mappers["vrf_isis"].get_isis(name) + ["segment-routing", "maximum-label-depth"]
        return self.add_delete(path)

    def set_vrf_isis_segment_routing_prefix_index_value(self, name: str, value: str) -> "VrfIsisMixin":
        """Set segment-routing prefix index value. Value format: 'prefix,index_value'."""
        parts = value.split(",", 1)
        if len(parts) == 2:
            path = self.mappers["vrf_isis"].get_isis_segment_routing_prefix_index_value(name, parts[0], parts[1])
            return self.add_set(path)
        return self

    def delete_vrf_isis_segment_routing_prefix_index_value(self, name: str, value: str) -> "VrfIsisMixin":
        """Delete segment-routing prefix index value. Value is the prefix."""
        path = self.mappers["vrf_isis"].get_isis(name) + ["segment-routing", "prefix", value, "index", "value"]
        return self.add_delete(path)

    def set_vrf_isis_segment_routing_prefix_index_explicit_null(self, name: str, value: str) -> "VrfIsisMixin":
        """Enable explicit-null on a segment-routing prefix index. Value is the prefix."""
        path = self.mappers["vrf_isis"].get_isis_segment_routing_prefix_index_explicit_null(name, value)
        return self.add_set(path)

    def delete_vrf_isis_segment_routing_prefix_index_explicit_null(self, name: str, value: str) -> "VrfIsisMixin":
        """Disable explicit-null on a segment-routing prefix index. Value is the prefix."""
        path = self.mappers["vrf_isis"].get_isis_segment_routing_prefix_index_explicit_null(name, value)
        return self.add_delete(path)

    def set_vrf_isis_segment_routing_prefix_index_no_php_flag(self, name: str, value: str) -> "VrfIsisMixin":
        """Enable no-php-flag on a segment-routing prefix index. Value is the prefix."""
        path = self.mappers["vrf_isis"].get_isis_segment_routing_prefix_index_no_php_flag(name, value)
        return self.add_set(path)

    def delete_vrf_isis_segment_routing_prefix_index_no_php_flag(self, name: str, value: str) -> "VrfIsisMixin":
        """Disable no-php-flag on a segment-routing prefix index. Value is the prefix."""
        path = self.mappers["vrf_isis"].get_isis_segment_routing_prefix_index_no_php_flag(name, value)
        return self.add_delete(path)

    def set_vrf_isis_segment_routing_prefix_absolute_value(self, name: str, value: str) -> "VrfIsisMixin":
        """Set segment-routing prefix absolute value. Value format: 'prefix,absolute_value'."""
        parts = value.split(",", 1)
        if len(parts) == 2:
            path = self.mappers["vrf_isis"].get_isis_segment_routing_prefix_absolute_value(name, parts[0], parts[1])
            return self.add_set(path)
        return self

    def delete_vrf_isis_segment_routing_prefix_absolute_value(self, name: str, value: str) -> "VrfIsisMixin":
        """Delete segment-routing prefix absolute value. Value is the prefix."""
        path = self.mappers["vrf_isis"].get_isis(name) + ["segment-routing", "prefix", value, "absolute", "value"]
        return self.add_delete(path)

    def set_vrf_isis_segment_routing_prefix_absolute_explicit_null(self, name: str, value: str) -> "VrfIsisMixin":
        """Enable explicit-null on a segment-routing prefix absolute. Value is the prefix."""
        path = self.mappers["vrf_isis"].get_isis_segment_routing_prefix_absolute_explicit_null(name, value)
        return self.add_set(path)

    def delete_vrf_isis_segment_routing_prefix_absolute_explicit_null(self, name: str, value: str) -> "VrfIsisMixin":
        """Disable explicit-null on a segment-routing prefix absolute. Value is the prefix."""
        path = self.mappers["vrf_isis"].get_isis_segment_routing_prefix_absolute_explicit_null(name, value)
        return self.add_delete(path)

    def set_vrf_isis_segment_routing_prefix_absolute_no_php_flag(self, name: str, value: str) -> "VrfIsisMixin":
        """Enable no-php-flag on a segment-routing prefix absolute. Value is the prefix."""
        path = self.mappers["vrf_isis"].get_isis_segment_routing_prefix_absolute_no_php_flag(name, value)
        return self.add_set(path)

    def delete_vrf_isis_segment_routing_prefix_absolute_no_php_flag(self, name: str, value: str) -> "VrfIsisMixin":
        """Disable no-php-flag on a segment-routing prefix absolute. Value is the prefix."""
        path = self.mappers["vrf_isis"].get_isis_segment_routing_prefix_absolute_no_php_flag(name, value)
        return self.add_delete(path)

    # ========================================================================
    # SPF Delay IETF Operations
    # ========================================================================

    def set_vrf_isis_spf_delay_ietf_init_delay(self, name: str, value: str) -> "VrfIsisMixin":
        """Set SPF delay IETF init-delay. Value is the delay in ms."""
        path = self.mappers["vrf_isis"].get_isis_spf_delay_ietf_init_delay(name, value)
        return self.add_set(path)

    def delete_vrf_isis_spf_delay_ietf_init_delay(self, name: str) -> "VrfIsisMixin":
        """Delete SPF delay IETF init-delay."""
        path = self.mappers["vrf_isis"].get_isis(name) + ["spf-delay-ietf", "init-delay"]
        return self.add_delete(path)

    def set_vrf_isis_spf_delay_ietf_long_delay(self, name: str, value: str) -> "VrfIsisMixin":
        """Set SPF delay IETF long-delay. Value is the delay in ms."""
        path = self.mappers["vrf_isis"].get_isis_spf_delay_ietf_long_delay(name, value)
        return self.add_set(path)

    def delete_vrf_isis_spf_delay_ietf_long_delay(self, name: str) -> "VrfIsisMixin":
        """Delete SPF delay IETF long-delay."""
        path = self.mappers["vrf_isis"].get_isis(name) + ["spf-delay-ietf", "long-delay"]
        return self.add_delete(path)

    def set_vrf_isis_spf_delay_ietf_short_delay(self, name: str, value: str) -> "VrfIsisMixin":
        """Set SPF delay IETF short-delay. Value is the delay in ms."""
        path = self.mappers["vrf_isis"].get_isis_spf_delay_ietf_short_delay(name, value)
        return self.add_set(path)

    def delete_vrf_isis_spf_delay_ietf_short_delay(self, name: str) -> "VrfIsisMixin":
        """Delete SPF delay IETF short-delay."""
        path = self.mappers["vrf_isis"].get_isis(name) + ["spf-delay-ietf", "short-delay"]
        return self.add_delete(path)

    def set_vrf_isis_spf_delay_ietf_holddown(self, name: str, value: str) -> "VrfIsisMixin":
        """Set SPF delay IETF holddown. Value is the holddown in ms."""
        path = self.mappers["vrf_isis"].get_isis_spf_delay_ietf_holddown(name, value)
        return self.add_set(path)

    def delete_vrf_isis_spf_delay_ietf_holddown(self, name: str) -> "VrfIsisMixin":
        """Delete SPF delay IETF holddown."""
        path = self.mappers["vrf_isis"].get_isis(name) + ["spf-delay-ietf", "holddown"]
        return self.add_delete(path)

    def set_vrf_isis_spf_delay_ietf_time_to_learn(self, name: str, value: str) -> "VrfIsisMixin":
        """Set SPF delay IETF time-to-learn. Value is the time in ms."""
        path = self.mappers["vrf_isis"].get_isis_spf_delay_ietf_time_to_learn(name, value)
        return self.add_set(path)

    def delete_vrf_isis_spf_delay_ietf_time_to_learn(self, name: str) -> "VrfIsisMixin":
        """Delete SPF delay IETF time-to-learn."""
        path = self.mappers["vrf_isis"].get_isis(name) + ["spf-delay-ietf", "time-to-learn"]
        return self.add_delete(path)

    # ========================================================================
    # Topology Operations
    # ========================================================================

    def set_vrf_isis_topology(self, name: str, value: str) -> "VrfIsisMixin":
        """Set topology. Value: ipv4-multicast, ipv4-mgmt, or ipv6-unicast."""
        path = self.mappers["vrf_isis"].get_isis_topology(name, value)
        return self.add_set(path)

    def delete_vrf_isis_topology(self, name: str, value: str) -> "VrfIsisMixin":
        """Delete topology. Value: ipv4-multicast, ipv4-mgmt, or ipv6-unicast."""
        path = self.mappers["vrf_isis"].get_isis_topology(name, value)
        return self.add_delete(path)

    # ========================================================================
    # Traffic Engineering Operations
    # ========================================================================

    def set_vrf_isis_traffic_engineering_enable(self, name: str) -> "VrfIsisMixin":
        """Enable traffic engineering."""
        path = self.mappers["vrf_isis"].get_isis_traffic_engineering_enable(name)
        return self.add_set(path)

    def delete_vrf_isis_traffic_engineering_enable(self, name: str) -> "VrfIsisMixin":
        """Disable traffic engineering."""
        path = self.mappers["vrf_isis"].get_isis_traffic_engineering_enable(name)
        return self.add_delete(path)

    def set_vrf_isis_traffic_engineering_inter_area(self, name: str) -> "VrfIsisMixin":
        """Enable traffic engineering inter-area."""
        path = self.mappers["vrf_isis"].get_isis_traffic_engineering_inter_area(name)
        return self.add_set(path)

    def delete_vrf_isis_traffic_engineering_inter_area(self, name: str) -> "VrfIsisMixin":
        """Disable traffic engineering inter-area."""
        path = self.mappers["vrf_isis"].get_isis_traffic_engineering_inter_area(name)
        return self.add_delete(path)

    def set_vrf_isis_traffic_engineering_address_family(self, name: str, value: str) -> "VrfIsisMixin":
        """Set traffic engineering address family. Value: ipv4 or ipv6."""
        path = self.mappers["vrf_isis"].get_isis_traffic_engineering_address_family(name, value)
        return self.add_set(path)

    def delete_vrf_isis_traffic_engineering_address_family(self, name: str, value: str) -> "VrfIsisMixin":
        """Delete traffic engineering address family. Value: ipv4 or ipv6."""
        path = self.mappers["vrf_isis"].get_isis_traffic_engineering_address_family(name, value)
        return self.add_delete(path)
