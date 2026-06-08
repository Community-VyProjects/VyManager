"""
VRF OSPF Builder Mixin

Provides batch operations for OSPF configuration within VRF instances.
Mixed into VrfBatchBuilder to extend it with OSPF operations.

All methods take (self, name: str) or (self, name: str, value: str) where
name is always the VRF name and value is comma-separated for multi-part params.
"""


class VrfOspfMixin:
    """Mixin for VRF OSPF builder operations."""

    # ========================================================================
    # OSPF Root
    # ========================================================================

    def set_vrf_ospf(self, name: str) -> "VrfOspfMixin":
        """Enable OSPF for a VRF."""
        path = self.mappers["vrf_ospf"].get_ospf(name)
        return self.add_set(path)

    def delete_vrf_ospf(self, name: str) -> "VrfOspfMixin":
        """Delete entire OSPF config for a VRF."""
        path = self.mappers["vrf_ospf"].get_ospf(name)
        return self.add_delete(path)

    # ========================================================================
    # Area
    # ========================================================================

    def set_vrf_ospf_area(self, name: str, value: str) -> "VrfOspfMixin":
        """Value is the area ID."""
        path = self.mappers["vrf_ospf"].get_ospf_area(name, value)
        return self.add_set(path)

    def delete_vrf_ospf_area(self, name: str, value: str) -> "VrfOspfMixin":
        """Value is the area ID."""
        path = self.mappers["vrf_ospf"].get_ospf_area(name, value)
        return self.add_delete(path)

    def set_vrf_ospf_area_type(self, name: str, value: str) -> "VrfOspfMixin":
        """Value format: 'area,area_type' (normal/nssa/stub)."""
        parts = value.split(",", 1)
        if len(parts) == 2:
            path = self.mappers["vrf_ospf"].get_ospf_area_type(name, parts[0], parts[1])
            return self.add_set(path)
        return self

    def delete_vrf_ospf_area_type(self, name: str, value: str) -> "VrfOspfMixin":
        """Value format: 'area,area_type'."""
        parts = value.split(",", 1)
        if len(parts) == 2:
            path = self.mappers["vrf_ospf"].get_ospf_area_type(name, parts[0], parts[1])
            return self.add_delete(path)
        return self

    def set_vrf_ospf_area_type_nssa_default_cost(self, name: str, value: str) -> "VrfOspfMixin":
        """Value format: 'area,cost'."""
        parts = value.split(",", 1)
        if len(parts) == 2:
            path = self.mappers["vrf_ospf"].get_ospf_area_type_nssa_default_cost(name, parts[0], parts[1])
            return self.add_set(path)
        return self

    def delete_vrf_ospf_area_type_nssa_default_cost(self, name: str, value: str) -> "VrfOspfMixin":
        """Value is the area ID."""
        path = self.mappers["vrf_ospf"].get_ospf_area(name, value) + ["area-type", "nssa", "default-cost"]
        return self.add_delete(path)

    def set_vrf_ospf_area_type_nssa_no_summary(self, name: str, value: str) -> "VrfOspfMixin":
        """Value is the area ID."""
        path = self.mappers["vrf_ospf"].get_ospf_area_type_nssa_no_summary(name, value)
        return self.add_set(path)

    def delete_vrf_ospf_area_type_nssa_no_summary(self, name: str, value: str) -> "VrfOspfMixin":
        """Value is the area ID."""
        path = self.mappers["vrf_ospf"].get_ospf_area_type_nssa_no_summary(name, value)
        return self.add_delete(path)

    def set_vrf_ospf_area_type_nssa_translate(self, name: str, value: str) -> "VrfOspfMixin":
        """Value format: 'area,translate_value' (always/candidate/never)."""
        parts = value.split(",", 1)
        if len(parts) == 2:
            path = self.mappers["vrf_ospf"].get_ospf_area_type_nssa_translate(name, parts[0], parts[1])
            return self.add_set(path)
        return self

    def delete_vrf_ospf_area_type_nssa_translate(self, name: str, value: str) -> "VrfOspfMixin":
        """Value is the area ID."""
        path = self.mappers["vrf_ospf"].get_ospf_area(name, value) + ["area-type", "nssa", "translate"]
        return self.add_delete(path)

    def set_vrf_ospf_area_type_stub_default_cost(self, name: str, value: str) -> "VrfOspfMixin":
        """Value format: 'area,cost'."""
        parts = value.split(",", 1)
        if len(parts) == 2:
            path = self.mappers["vrf_ospf"].get_ospf_area_type_stub_default_cost(name, parts[0], parts[1])
            return self.add_set(path)
        return self

    def delete_vrf_ospf_area_type_stub_default_cost(self, name: str, value: str) -> "VrfOspfMixin":
        """Value is the area ID."""
        path = self.mappers["vrf_ospf"].get_ospf_area(name, value) + ["area-type", "stub", "default-cost"]
        return self.add_delete(path)

    def set_vrf_ospf_area_type_stub_no_summary(self, name: str, value: str) -> "VrfOspfMixin":
        """Value is the area ID."""
        path = self.mappers["vrf_ospf"].get_ospf_area_type_stub_no_summary(name, value)
        return self.add_set(path)

    def delete_vrf_ospf_area_type_stub_no_summary(self, name: str, value: str) -> "VrfOspfMixin":
        """Value is the area ID."""
        path = self.mappers["vrf_ospf"].get_ospf_area_type_stub_no_summary(name, value)
        return self.add_delete(path)

    # --- Area Authentication ---

    def set_vrf_ospf_area_authentication(self, name: str, value: str) -> "VrfOspfMixin":
        """Value format: 'area,auth_type' (plaintext-password/md5)."""
        parts = value.split(",", 1)
        if len(parts) == 2:
            path = self.mappers["vrf_ospf"].get_ospf_area_authentication(name, parts[0], parts[1])
            return self.add_set(path)
        return self

    def delete_vrf_ospf_area_authentication(self, name: str, value: str) -> "VrfOspfMixin":
        """Value is the area ID."""
        path = self.mappers["vrf_ospf"].get_ospf_area(name, value) + ["authentication"]
        return self.add_delete(path)

    # --- Area Range ---

    def set_vrf_ospf_area_range(self, name: str, value: str) -> "VrfOspfMixin":
        """Value format: 'area,network'."""
        parts = value.split(",", 1)
        if len(parts) == 2:
            path = self.mappers["vrf_ospf"].get_ospf_area_range(name, parts[0], parts[1])
            return self.add_set(path)
        return self

    def delete_vrf_ospf_area_range(self, name: str, value: str) -> "VrfOspfMixin":
        """Value format: 'area,network'."""
        parts = value.split(",", 1)
        if len(parts) == 2:
            path = self.mappers["vrf_ospf"].get_ospf_area_range(name, parts[0], parts[1])
            return self.add_delete(path)
        return self

    def set_vrf_ospf_area_range_cost(self, name: str, value: str) -> "VrfOspfMixin":
        """Value format: 'area,network,cost'."""
        parts = value.split(",", 2)
        if len(parts) == 3:
            path = self.mappers["vrf_ospf"].get_ospf_area_range_cost(name, parts[0], parts[1], parts[2])
            return self.add_set(path)
        return self

    def delete_vrf_ospf_area_range_cost(self, name: str, value: str) -> "VrfOspfMixin":
        """Value format: 'area,network'."""
        parts = value.split(",", 1)
        if len(parts) == 2:
            path = self.mappers["vrf_ospf"].get_ospf_area_range(name, parts[0], parts[1]) + ["cost"]
            return self.add_delete(path)
        return self

    def set_vrf_ospf_area_range_not_advertise(self, name: str, value: str) -> "VrfOspfMixin":
        """Value format: 'area,network'."""
        parts = value.split(",", 1)
        if len(parts) == 2:
            path = self.mappers["vrf_ospf"].get_ospf_area_range_not_advertise(name, parts[0], parts[1])
            return self.add_set(path)
        return self

    def delete_vrf_ospf_area_range_not_advertise(self, name: str, value: str) -> "VrfOspfMixin":
        """Value format: 'area,network'."""
        parts = value.split(",", 1)
        if len(parts) == 2:
            path = self.mappers["vrf_ospf"].get_ospf_area_range_not_advertise(name, parts[0], parts[1])
            return self.add_delete(path)
        return self

    def set_vrf_ospf_area_range_substitute(self, name: str, value: str) -> "VrfOspfMixin":
        """Value format: 'area,network,substitute_network'."""
        parts = value.split(",", 2)
        if len(parts) == 3:
            path = self.mappers["vrf_ospf"].get_ospf_area_range_substitute(name, parts[0], parts[1], parts[2])
            return self.add_set(path)
        return self

    def delete_vrf_ospf_area_range_substitute(self, name: str, value: str) -> "VrfOspfMixin":
        """Value format: 'area,network'."""
        parts = value.split(",", 1)
        if len(parts) == 2:
            path = self.mappers["vrf_ospf"].get_ospf_area_range(name, parts[0], parts[1]) + ["substitute"]
            return self.add_delete(path)
        return self

    # --- Area Shortcut ---

    def set_vrf_ospf_area_shortcut(self, name: str, value: str) -> "VrfOspfMixin":
        """Value format: 'area,shortcut_mode' (default/disable/enable)."""
        parts = value.split(",", 1)
        if len(parts) == 2:
            path = self.mappers["vrf_ospf"].get_ospf_area_shortcut(name, parts[0], parts[1])
            return self.add_set(path)
        return self

    def delete_vrf_ospf_area_shortcut(self, name: str, value: str) -> "VrfOspfMixin":
        """Value is the area ID."""
        path = self.mappers["vrf_ospf"].get_ospf_area(name, value) + ["shortcut"]
        return self.add_delete(path)

    # --- Area Virtual-Link ---

    def set_vrf_ospf_area_virtual_link(self, name: str, value: str) -> "VrfOspfMixin":
        """Value format: 'area,address'."""
        parts = value.split(",", 1)
        if len(parts) == 2:
            path = self.mappers["vrf_ospf"].get_ospf_area_virtual_link(name, parts[0], parts[1])
            return self.add_set(path)
        return self

    def delete_vrf_ospf_area_virtual_link(self, name: str, value: str) -> "VrfOspfMixin":
        """Value format: 'area,address'."""
        parts = value.split(",", 1)
        if len(parts) == 2:
            path = self.mappers["vrf_ospf"].get_ospf_area_virtual_link(name, parts[0], parts[1])
            return self.add_delete(path)
        return self

    def set_vrf_ospf_area_virtual_link_authentication(self, name: str, value: str) -> "VrfOspfMixin":
        """Value format: 'area,address'."""
        parts = value.split(",", 1)
        if len(parts) == 2:
            path = self.mappers["vrf_ospf"].get_ospf_area_virtual_link_authentication(name, parts[0], parts[1])
            return self.add_set(path)
        return self

    def delete_vrf_ospf_area_virtual_link_authentication(self, name: str, value: str) -> "VrfOspfMixin":
        """Value format: 'area,address'."""
        parts = value.split(",", 1)
        if len(parts) == 2:
            path = self.mappers["vrf_ospf"].get_ospf_area_virtual_link(name, parts[0], parts[1]) + ["authentication"]
            return self.add_delete(path)
        return self

    def set_vrf_ospf_area_virtual_link_authentication_md5_key_id(self, name: str, value: str) -> "VrfOspfMixin":
        """Value format: 'area,address,key_id'."""
        parts = value.split(",", 2)
        if len(parts) == 3:
            path = self.mappers["vrf_ospf"].get_ospf_area_virtual_link_authentication_md5_key_id(name, parts[0], parts[1], parts[2])
            return self.add_set(path)
        return self

    def delete_vrf_ospf_area_virtual_link_authentication_md5_key_id(self, name: str, value: str) -> "VrfOspfMixin":
        """Value format: 'area,address,key_id'."""
        parts = value.split(",", 2)
        if len(parts) == 3:
            path = self.mappers["vrf_ospf"].get_ospf_area_virtual_link_authentication_md5_key_id(name, parts[0], parts[1], parts[2])
            return self.add_delete(path)
        return self

    def set_vrf_ospf_area_virtual_link_authentication_md5_key_id_md5_key(self, name: str, value: str) -> "VrfOspfMixin":
        """Value format: 'area,address,key_id,md5_key'."""
        parts = value.split(",", 3)
        if len(parts) == 4:
            path = self.mappers["vrf_ospf"].get_ospf_area_virtual_link_authentication_md5_key_id_md5_key(name, parts[0], parts[1], parts[2], parts[3])
            return self.add_set(path)
        return self

    def delete_vrf_ospf_area_virtual_link_authentication_md5_key_id_md5_key(self, name: str, value: str) -> "VrfOspfMixin":
        """Value format: 'area,address,key_id'."""
        parts = value.split(",", 2)
        if len(parts) == 3:
            path = self.mappers["vrf_ospf"].get_ospf_area_virtual_link_authentication_md5_key_id(name, parts[0], parts[1], parts[2]) + ["md5-key"]
            return self.add_delete(path)
        return self

    def set_vrf_ospf_area_virtual_link_authentication_plaintext_password(self, name: str, value: str) -> "VrfOspfMixin":
        """Value format: 'area,address,password'."""
        parts = value.split(",", 2)
        if len(parts) == 3:
            path = self.mappers["vrf_ospf"].get_ospf_area_virtual_link_authentication_plaintext_password(name, parts[0], parts[1], parts[2])
            return self.add_set(path)
        return self

    def delete_vrf_ospf_area_virtual_link_authentication_plaintext_password(self, name: str, value: str) -> "VrfOspfMixin":
        """Value format: 'area,address'."""
        parts = value.split(",", 1)
        if len(parts) == 2:
            path = self.mappers["vrf_ospf"].get_ospf_area_virtual_link(name, parts[0], parts[1]) + ["authentication", "plaintext-password"]
            return self.add_delete(path)
        return self

    def set_vrf_ospf_area_virtual_link_dead_interval(self, name: str, value: str) -> "VrfOspfMixin":
        """Value format: 'area,address,interval'."""
        parts = value.split(",", 2)
        if len(parts) == 3:
            path = self.mappers["vrf_ospf"].get_ospf_area_virtual_link_dead_interval(name, parts[0], parts[1], parts[2])
            return self.add_set(path)
        return self

    def delete_vrf_ospf_area_virtual_link_dead_interval(self, name: str, value: str) -> "VrfOspfMixin":
        """Value format: 'area,address'."""
        parts = value.split(",", 1)
        if len(parts) == 2:
            path = self.mappers["vrf_ospf"].get_ospf_area_virtual_link(name, parts[0], parts[1]) + ["dead-interval"]
            return self.add_delete(path)
        return self

    def set_vrf_ospf_area_virtual_link_hello_interval(self, name: str, value: str) -> "VrfOspfMixin":
        """Value format: 'area,address,interval'."""
        parts = value.split(",", 2)
        if len(parts) == 3:
            path = self.mappers["vrf_ospf"].get_ospf_area_virtual_link_hello_interval(name, parts[0], parts[1], parts[2])
            return self.add_set(path)
        return self

    def delete_vrf_ospf_area_virtual_link_hello_interval(self, name: str, value: str) -> "VrfOspfMixin":
        """Value format: 'area,address'."""
        parts = value.split(",", 1)
        if len(parts) == 2:
            path = self.mappers["vrf_ospf"].get_ospf_area_virtual_link(name, parts[0], parts[1]) + ["hello-interval"]
            return self.add_delete(path)
        return self

    def set_vrf_ospf_area_virtual_link_retransmit_interval(self, name: str, value: str) -> "VrfOspfMixin":
        """Value format: 'area,address,interval'."""
        parts = value.split(",", 2)
        if len(parts) == 3:
            path = self.mappers["vrf_ospf"].get_ospf_area_virtual_link_retransmit_interval(name, parts[0], parts[1], parts[2])
            return self.add_set(path)
        return self

    def delete_vrf_ospf_area_virtual_link_retransmit_interval(self, name: str, value: str) -> "VrfOspfMixin":
        """Value format: 'area,address'."""
        parts = value.split(",", 1)
        if len(parts) == 2:
            path = self.mappers["vrf_ospf"].get_ospf_area_virtual_link(name, parts[0], parts[1]) + ["retransmit-interval"]
            return self.add_delete(path)
        return self

    def set_vrf_ospf_area_virtual_link_transmit_delay(self, name: str, value: str) -> "VrfOspfMixin":
        """Value format: 'area,address,delay'."""
        parts = value.split(",", 2)
        if len(parts) == 3:
            path = self.mappers["vrf_ospf"].get_ospf_area_virtual_link_transmit_delay(name, parts[0], parts[1], parts[2])
            return self.add_set(path)
        return self

    def delete_vrf_ospf_area_virtual_link_transmit_delay(self, name: str, value: str) -> "VrfOspfMixin":
        """Value format: 'area,address'."""
        parts = value.split(",", 1)
        if len(parts) == 2:
            path = self.mappers["vrf_ospf"].get_ospf_area_virtual_link(name, parts[0], parts[1]) + ["transmit-delay"]
            return self.add_delete(path)
        return self

    # ========================================================================
    # Auto-Cost
    # ========================================================================

    def set_vrf_ospf_auto_cost_reference_bandwidth(self, name: str, value: str) -> "VrfOspfMixin":
        """Value is the reference bandwidth."""
        path = self.mappers["vrf_ospf"].get_ospf_auto_cost_reference_bandwidth(name, value)
        return self.add_set(path)

    def delete_vrf_ospf_auto_cost_reference_bandwidth(self, name: str) -> "VrfOspfMixin":
        """Delete auto-cost reference bandwidth."""
        path = self.mappers["vrf_ospf"].get_ospf(name) + ["auto-cost", "reference-bandwidth"]
        return self.add_delete(path)

    # ========================================================================
    # Default Information
    # ========================================================================

    def set_vrf_ospf_default_information_originate(self, name: str) -> "VrfOspfMixin":
        """Enable default information originate."""
        path = self.mappers["vrf_ospf"].get_ospf_default_information_originate(name)
        return self.add_set(path)

    def delete_vrf_ospf_default_information_originate(self, name: str) -> "VrfOspfMixin":
        """Delete default information originate."""
        path = self.mappers["vrf_ospf"].get_ospf_default_information_originate(name)
        return self.add_delete(path)

    def set_vrf_ospf_default_information_originate_always(self, name: str) -> "VrfOspfMixin":
        """Enable default information originate always."""
        path = self.mappers["vrf_ospf"].get_ospf_default_information_originate_always(name)
        return self.add_set(path)

    def delete_vrf_ospf_default_information_originate_always(self, name: str) -> "VrfOspfMixin":
        """Delete default information originate always."""
        path = self.mappers["vrf_ospf"].get_ospf_default_information_originate_always(name)
        return self.add_delete(path)

    def set_vrf_ospf_default_information_originate_metric(self, name: str, value: str) -> "VrfOspfMixin":
        """Value is the metric."""
        path = self.mappers["vrf_ospf"].get_ospf_default_information_originate_metric(name, value)
        return self.add_set(path)

    def delete_vrf_ospf_default_information_originate_metric(self, name: str) -> "VrfOspfMixin":
        """Delete default information originate metric."""
        path = self.mappers["vrf_ospf"].get_ospf_default_information_originate(name) + ["metric"]
        return self.add_delete(path)

    def set_vrf_ospf_default_information_originate_metric_type(self, name: str, value: str) -> "VrfOspfMixin":
        """Value is the metric type (1 or 2)."""
        path = self.mappers["vrf_ospf"].get_ospf_default_information_originate_metric_type(name, value)
        return self.add_set(path)

    def delete_vrf_ospf_default_information_originate_metric_type(self, name: str) -> "VrfOspfMixin":
        """Delete default information originate metric type."""
        path = self.mappers["vrf_ospf"].get_ospf_default_information_originate(name) + ["metric-type"]
        return self.add_delete(path)

    def set_vrf_ospf_default_information_originate_route_map(self, name: str, value: str) -> "VrfOspfMixin":
        """Value is the route-map name."""
        path = self.mappers["vrf_ospf"].get_ospf_default_information_originate_route_map(name, value)
        return self.add_set(path)

    def delete_vrf_ospf_default_information_originate_route_map(self, name: str) -> "VrfOspfMixin":
        """Delete default information originate route-map."""
        path = self.mappers["vrf_ospf"].get_ospf_default_information_originate(name) + ["route-map"]
        return self.add_delete(path)

    # ========================================================================
    # Default Metric
    # ========================================================================

    def set_vrf_ospf_default_metric(self, name: str, value: str) -> "VrfOspfMixin":
        """Value is the default metric."""
        path = self.mappers["vrf_ospf"].get_ospf_default_metric(name, value)
        return self.add_set(path)

    def delete_vrf_ospf_default_metric(self, name: str) -> "VrfOspfMixin":
        """Delete default metric."""
        path = self.mappers["vrf_ospf"].get_ospf(name) + ["default-metric"]
        return self.add_delete(path)

    # ========================================================================
    # Distance
    # ========================================================================

    def set_vrf_ospf_distance_global(self, name: str, value: str) -> "VrfOspfMixin":
        """Value is the global distance."""
        path = self.mappers["vrf_ospf"].get_ospf_distance_global(name, value)
        return self.add_set(path)

    def delete_vrf_ospf_distance_global(self, name: str) -> "VrfOspfMixin":
        """Delete global distance."""
        path = self.mappers["vrf_ospf"].get_ospf(name) + ["distance", "global"]
        return self.add_delete(path)

    def set_vrf_ospf_distance_ospf_external(self, name: str, value: str) -> "VrfOspfMixin":
        """Value is the external distance."""
        path = self.mappers["vrf_ospf"].get_ospf_distance_ospf_external(name, value)
        return self.add_set(path)

    def delete_vrf_ospf_distance_ospf_external(self, name: str) -> "VrfOspfMixin":
        """Delete OSPF external distance."""
        path = self.mappers["vrf_ospf"].get_ospf(name) + ["distance", "ospf", "external"]
        return self.add_delete(path)

    def set_vrf_ospf_distance_ospf_inter_area(self, name: str, value: str) -> "VrfOspfMixin":
        """Value is the inter-area distance."""
        path = self.mappers["vrf_ospf"].get_ospf_distance_ospf_inter_area(name, value)
        return self.add_set(path)

    def delete_vrf_ospf_distance_ospf_inter_area(self, name: str) -> "VrfOspfMixin":
        """Delete OSPF inter-area distance."""
        path = self.mappers["vrf_ospf"].get_ospf(name) + ["distance", "ospf", "inter-area"]
        return self.add_delete(path)

    def set_vrf_ospf_distance_ospf_intra_area(self, name: str, value: str) -> "VrfOspfMixin":
        """Value is the intra-area distance."""
        path = self.mappers["vrf_ospf"].get_ospf_distance_ospf_intra_area(name, value)
        return self.add_set(path)

    def delete_vrf_ospf_distance_ospf_intra_area(self, name: str) -> "VrfOspfMixin":
        """Delete OSPF intra-area distance."""
        path = self.mappers["vrf_ospf"].get_ospf(name) + ["distance", "ospf", "intra-area"]
        return self.add_delete(path)

    # ========================================================================
    # Graceful Restart
    # ========================================================================

    def set_vrf_ospf_graceful_restart(self, name: str) -> "VrfOspfMixin":
        """Enable graceful restart."""
        path = self.mappers["vrf_ospf"].get_ospf_graceful_restart(name)
        return self.add_set(path)

    def delete_vrf_ospf_graceful_restart(self, name: str) -> "VrfOspfMixin":
        """Delete graceful restart."""
        path = self.mappers["vrf_ospf"].get_ospf_graceful_restart(name)
        return self.add_delete(path)

    def set_vrf_ospf_graceful_restart_helper_enable(self, name: str) -> "VrfOspfMixin":
        """Enable graceful restart helper."""
        path = self.mappers["vrf_ospf"].get_ospf_graceful_restart_helper_enable(name)
        return self.add_set(path)

    def delete_vrf_ospf_graceful_restart_helper_enable(self, name: str) -> "VrfOspfMixin":
        """Delete graceful restart helper enable."""
        path = self.mappers["vrf_ospf"].get_ospf_graceful_restart_helper_enable(name)
        return self.add_delete(path)

    def set_vrf_ospf_graceful_restart_helper_planned_only(self, name: str) -> "VrfOspfMixin":
        """Enable graceful restart helper planned-only."""
        path = self.mappers["vrf_ospf"].get_ospf_graceful_restart_helper_planned_only(name)
        return self.add_set(path)

    def delete_vrf_ospf_graceful_restart_helper_planned_only(self, name: str) -> "VrfOspfMixin":
        """Delete graceful restart helper planned-only."""
        path = self.mappers["vrf_ospf"].get_ospf_graceful_restart_helper_planned_only(name)
        return self.add_delete(path)

    def set_vrf_ospf_graceful_restart_helper_supported_grace_time(self, name: str, value: str) -> "VrfOspfMixin":
        """Value is the grace time."""
        path = self.mappers["vrf_ospf"].get_ospf_graceful_restart_helper_supported_grace_time(name, value)
        return self.add_set(path)

    def delete_vrf_ospf_graceful_restart_helper_supported_grace_time(self, name: str) -> "VrfOspfMixin":
        """Delete graceful restart helper supported grace time."""
        path = self.mappers["vrf_ospf"].get_ospf_graceful_restart(name) + ["helper", "supported-grace-time"]
        return self.add_delete(path)

    def set_vrf_ospf_graceful_restart_helper_lsa_check_disable(self, name: str) -> "VrfOspfMixin":
        """Enable graceful restart helper LSA check disable."""
        path = self.mappers["vrf_ospf"].get_ospf_graceful_restart_helper_lsa_check_disable(name)
        return self.add_set(path)

    def delete_vrf_ospf_graceful_restart_helper_lsa_check_disable(self, name: str) -> "VrfOspfMixin":
        """Delete graceful restart helper LSA check disable."""
        path = self.mappers["vrf_ospf"].get_ospf_graceful_restart_helper_lsa_check_disable(name)
        return self.add_delete(path)

    # ========================================================================
    # Interface
    # ========================================================================

    def set_vrf_ospf_interface(self, name: str, value: str) -> "VrfOspfMixin":
        """Value is the interface name."""
        path = self.mappers["vrf_ospf"].get_ospf_interface(name, value)
        return self.add_set(path)

    def delete_vrf_ospf_interface(self, name: str, value: str) -> "VrfOspfMixin":
        """Value is the interface name."""
        path = self.mappers["vrf_ospf"].get_ospf_interface(name, value)
        return self.add_delete(path)

    def set_vrf_ospf_interface_area(self, name: str, value: str) -> "VrfOspfMixin":
        """Value format: 'interface,area'."""
        parts = value.split(",", 1)
        if len(parts) == 2:
            path = self.mappers["vrf_ospf"].get_ospf_interface_area(name, parts[0], parts[1])
            return self.add_set(path)
        return self

    def delete_vrf_ospf_interface_area(self, name: str, value: str) -> "VrfOspfMixin":
        """Value is the interface name."""
        path = self.mappers["vrf_ospf"].get_ospf_interface(name, value) + ["area"]
        return self.add_delete(path)

    def set_vrf_ospf_interface_authentication_md5_key_id(self, name: str, value: str) -> "VrfOspfMixin":
        """Value format: 'interface,key_id'."""
        parts = value.split(",", 1)
        if len(parts) == 2:
            path = self.mappers["vrf_ospf"].get_ospf_interface_authentication_md5_key_id(name, parts[0], parts[1])
            return self.add_set(path)
        return self

    def delete_vrf_ospf_interface_authentication_md5_key_id(self, name: str, value: str) -> "VrfOspfMixin":
        """Value format: 'interface,key_id'."""
        parts = value.split(",", 1)
        if len(parts) == 2:
            path = self.mappers["vrf_ospf"].get_ospf_interface_authentication_md5_key_id(name, parts[0], parts[1])
            return self.add_delete(path)
        return self

    def set_vrf_ospf_interface_authentication_md5_key_id_md5_key(self, name: str, value: str) -> "VrfOspfMixin":
        """Value format: 'interface,key_id,md5_key'."""
        parts = value.split(",", 2)
        if len(parts) == 3:
            path = self.mappers["vrf_ospf"].get_ospf_interface_authentication_md5_key_id_md5_key(name, parts[0], parts[1], parts[2])
            return self.add_set(path)
        return self

    def delete_vrf_ospf_interface_authentication_md5_key_id_md5_key(self, name: str, value: str) -> "VrfOspfMixin":
        """Value format: 'interface,key_id'."""
        parts = value.split(",", 1)
        if len(parts) == 2:
            path = self.mappers["vrf_ospf"].get_ospf_interface_authentication_md5_key_id(name, parts[0], parts[1]) + ["md5-key"]
            return self.add_delete(path)
        return self

    def set_vrf_ospf_interface_authentication_plaintext_password(self, name: str, value: str) -> "VrfOspfMixin":
        """Value format: 'interface,password'."""
        parts = value.split(",", 1)
        if len(parts) == 2:
            path = self.mappers["vrf_ospf"].get_ospf_interface_authentication_plaintext_password(name, parts[0], parts[1])
            return self.add_set(path)
        return self

    def delete_vrf_ospf_interface_authentication_plaintext_password(self, name: str, value: str) -> "VrfOspfMixin":
        """Value is the interface name."""
        path = self.mappers["vrf_ospf"].get_ospf_interface(name, value) + ["authentication", "plaintext-password"]
        return self.add_delete(path)

    def set_vrf_ospf_interface_bandwidth(self, name: str, value: str) -> "VrfOspfMixin":
        """Value format: 'interface,bandwidth'."""
        parts = value.split(",", 1)
        if len(parts) == 2:
            path = self.mappers["vrf_ospf"].get_ospf_interface_bandwidth(name, parts[0], parts[1])
            return self.add_set(path)
        return self

    def delete_vrf_ospf_interface_bandwidth(self, name: str, value: str) -> "VrfOspfMixin":
        """Value is the interface name."""
        path = self.mappers["vrf_ospf"].get_ospf_interface(name, value) + ["bandwidth"]
        return self.add_delete(path)

    def set_vrf_ospf_interface_bfd(self, name: str, value: str) -> "VrfOspfMixin":
        """Value is the interface name."""
        path = self.mappers["vrf_ospf"].get_ospf_interface_bfd(name, value)
        return self.add_set(path)

    def delete_vrf_ospf_interface_bfd(self, name: str, value: str) -> "VrfOspfMixin":
        """Value is the interface name."""
        path = self.mappers["vrf_ospf"].get_ospf_interface_bfd(name, value)
        return self.add_delete(path)

    def set_vrf_ospf_interface_bfd_profile(self, name: str, value: str) -> "VrfOspfMixin":
        """Value format: 'interface,profile'."""
        parts = value.split(",", 1)
        if len(parts) == 2:
            path = self.mappers["vrf_ospf"].get_ospf_interface_bfd_profile(name, parts[0], parts[1])
            return self.add_set(path)
        return self

    def delete_vrf_ospf_interface_bfd_profile(self, name: str, value: str) -> "VrfOspfMixin":
        """Value is the interface name."""
        path = self.mappers["vrf_ospf"].get_ospf_interface(name, value) + ["bfd", "profile"]
        return self.add_delete(path)

    def set_vrf_ospf_interface_cost(self, name: str, value: str) -> "VrfOspfMixin":
        """Value format: 'interface,cost'."""
        parts = value.split(",", 1)
        if len(parts) == 2:
            path = self.mappers["vrf_ospf"].get_ospf_interface_cost(name, parts[0], parts[1])
            return self.add_set(path)
        return self

    def delete_vrf_ospf_interface_cost(self, name: str, value: str) -> "VrfOspfMixin":
        """Value is the interface name."""
        path = self.mappers["vrf_ospf"].get_ospf_interface(name, value) + ["cost"]
        return self.add_delete(path)

    def set_vrf_ospf_interface_dead_interval(self, name: str, value: str) -> "VrfOspfMixin":
        """Value format: 'interface,interval'."""
        parts = value.split(",", 1)
        if len(parts) == 2:
            path = self.mappers["vrf_ospf"].get_ospf_interface_dead_interval(name, parts[0], parts[1])
            return self.add_set(path)
        return self

    def delete_vrf_ospf_interface_dead_interval(self, name: str, value: str) -> "VrfOspfMixin":
        """Value is the interface name."""
        path = self.mappers["vrf_ospf"].get_ospf_interface(name, value) + ["dead-interval"]
        return self.add_delete(path)

    def set_vrf_ospf_interface_hello_interval(self, name: str, value: str) -> "VrfOspfMixin":
        """Value format: 'interface,interval'."""
        parts = value.split(",", 1)
        if len(parts) == 2:
            path = self.mappers["vrf_ospf"].get_ospf_interface_hello_interval(name, parts[0], parts[1])
            return self.add_set(path)
        return self

    def delete_vrf_ospf_interface_hello_interval(self, name: str, value: str) -> "VrfOspfMixin":
        """Value is the interface name."""
        path = self.mappers["vrf_ospf"].get_ospf_interface(name, value) + ["hello-interval"]
        return self.add_delete(path)

    def set_vrf_ospf_interface_hello_multiplier(self, name: str, value: str) -> "VrfOspfMixin":
        """Value format: 'interface,multiplier'."""
        parts = value.split(",", 1)
        if len(parts) == 2:
            path = self.mappers["vrf_ospf"].get_ospf_interface_hello_multiplier(name, parts[0], parts[1])
            return self.add_set(path)
        return self

    def delete_vrf_ospf_interface_hello_multiplier(self, name: str, value: str) -> "VrfOspfMixin":
        """Value is the interface name."""
        path = self.mappers["vrf_ospf"].get_ospf_interface(name, value) + ["hello-multiplier"]
        return self.add_delete(path)

    def set_vrf_ospf_interface_ldp_sync_disable(self, name: str, value: str) -> "VrfOspfMixin":
        """Value is the interface name."""
        path = self.mappers["vrf_ospf"].get_ospf_interface_ldp_sync_disable(name, value)
        return self.add_set(path)

    def delete_vrf_ospf_interface_ldp_sync_disable(self, name: str, value: str) -> "VrfOspfMixin":
        """Value is the interface name."""
        path = self.mappers["vrf_ospf"].get_ospf_interface_ldp_sync_disable(name, value)
        return self.add_delete(path)

    def set_vrf_ospf_interface_ldp_sync_holddown(self, name: str, value: str) -> "VrfOspfMixin":
        """Value format: 'interface,holddown'."""
        parts = value.split(",", 1)
        if len(parts) == 2:
            path = self.mappers["vrf_ospf"].get_ospf_interface_ldp_sync_holddown(name, parts[0], parts[1])
            return self.add_set(path)
        return self

    def delete_vrf_ospf_interface_ldp_sync_holddown(self, name: str, value: str) -> "VrfOspfMixin":
        """Value is the interface name."""
        path = self.mappers["vrf_ospf"].get_ospf_interface(name, value) + ["ldp-sync", "holddown"]
        return self.add_delete(path)

    def set_vrf_ospf_interface_mtu_ignore(self, name: str, value: str) -> "VrfOspfMixin":
        """Value is the interface name."""
        path = self.mappers["vrf_ospf"].get_ospf_interface_mtu_ignore(name, value)
        return self.add_set(path)

    def delete_vrf_ospf_interface_mtu_ignore(self, name: str, value: str) -> "VrfOspfMixin":
        """Value is the interface name."""
        path = self.mappers["vrf_ospf"].get_ospf_interface_mtu_ignore(name, value)
        return self.add_delete(path)

    def set_vrf_ospf_interface_network(self, name: str, value: str) -> "VrfOspfMixin":
        """Value format: 'interface,network_type' (broadcast/non-broadcast/point-to-multipoint/point-to-point)."""
        parts = value.split(",", 1)
        if len(parts) == 2:
            path = self.mappers["vrf_ospf"].get_ospf_interface_network(name, parts[0], parts[1])
            return self.add_set(path)
        return self

    def delete_vrf_ospf_interface_network(self, name: str, value: str) -> "VrfOspfMixin":
        """Value is the interface name."""
        path = self.mappers["vrf_ospf"].get_ospf_interface(name, value) + ["network"]
        return self.add_delete(path)

    def set_vrf_ospf_interface_passive(self, name: str, value: str) -> "VrfOspfMixin":
        """Value is the interface name."""
        path = self.mappers["vrf_ospf"].get_ospf_interface_passive(name, value)
        return self.add_set(path)

    def delete_vrf_ospf_interface_passive(self, name: str, value: str) -> "VrfOspfMixin":
        """Value is the interface name."""
        path = self.mappers["vrf_ospf"].get_ospf_interface_passive(name, value)
        return self.add_delete(path)

    def set_vrf_ospf_interface_passive_disable(self, name: str, value: str) -> "VrfOspfMixin":
        """Value is the interface name."""
        path = self.mappers["vrf_ospf"].get_ospf_interface_passive_disable(name, value)
        return self.add_set(path)

    def delete_vrf_ospf_interface_passive_disable(self, name: str, value: str) -> "VrfOspfMixin":
        """Value is the interface name."""
        path = self.mappers["vrf_ospf"].get_ospf_interface_passive_disable(name, value)
        return self.add_delete(path)

    def set_vrf_ospf_interface_priority(self, name: str, value: str) -> "VrfOspfMixin":
        """Value format: 'interface,priority'."""
        parts = value.split(",", 1)
        if len(parts) == 2:
            path = self.mappers["vrf_ospf"].get_ospf_interface_priority(name, parts[0], parts[1])
            return self.add_set(path)
        return self

    def delete_vrf_ospf_interface_priority(self, name: str, value: str) -> "VrfOspfMixin":
        """Value is the interface name."""
        path = self.mappers["vrf_ospf"].get_ospf_interface(name, value) + ["priority"]
        return self.add_delete(path)

    def set_vrf_ospf_interface_retransmit_interval(self, name: str, value: str) -> "VrfOspfMixin":
        """Value format: 'interface,interval'."""
        parts = value.split(",", 1)
        if len(parts) == 2:
            path = self.mappers["vrf_ospf"].get_ospf_interface_retransmit_interval(name, parts[0], parts[1])
            return self.add_set(path)
        return self

    def delete_vrf_ospf_interface_retransmit_interval(self, name: str, value: str) -> "VrfOspfMixin":
        """Value is the interface name."""
        path = self.mappers["vrf_ospf"].get_ospf_interface(name, value) + ["retransmit-interval"]
        return self.add_delete(path)

    def set_vrf_ospf_interface_transmit_delay(self, name: str, value: str) -> "VrfOspfMixin":
        """Value format: 'interface,delay'."""
        parts = value.split(",", 1)
        if len(parts) == 2:
            path = self.mappers["vrf_ospf"].get_ospf_interface_transmit_delay(name, parts[0], parts[1])
            return self.add_set(path)
        return self

    def delete_vrf_ospf_interface_transmit_delay(self, name: str, value: str) -> "VrfOspfMixin":
        """Value is the interface name."""
        path = self.mappers["vrf_ospf"].get_ospf_interface(name, value) + ["transmit-delay"]
        return self.add_delete(path)

    # ========================================================================
    # LDP Sync (Global)
    # ========================================================================

    def set_vrf_ospf_ldp_sync(self, name: str) -> "VrfOspfMixin":
        """Enable global LDP sync."""
        path = self.mappers["vrf_ospf"].get_ospf_ldp_sync(name)
        return self.add_set(path)

    def delete_vrf_ospf_ldp_sync(self, name: str) -> "VrfOspfMixin":
        """Delete global LDP sync."""
        path = self.mappers["vrf_ospf"].get_ospf_ldp_sync(name)
        return self.add_delete(path)

    # ========================================================================
    # Log Adjacency Changes
    # ========================================================================

    def set_vrf_ospf_log_adjacency_changes(self, name: str) -> "VrfOspfMixin":
        """Enable log adjacency changes."""
        path = self.mappers["vrf_ospf"].get_ospf_log_adjacency_changes(name)
        return self.add_set(path)

    def delete_vrf_ospf_log_adjacency_changes(self, name: str) -> "VrfOspfMixin":
        """Delete log adjacency changes."""
        path = self.mappers["vrf_ospf"].get_ospf_log_adjacency_changes(name)
        return self.add_delete(path)

    def set_vrf_ospf_log_adjacency_changes_detail(self, name: str) -> "VrfOspfMixin":
        """Enable log adjacency changes detail."""
        path = self.mappers["vrf_ospf"].get_ospf_log_adjacency_changes_detail(name)
        return self.add_set(path)

    def delete_vrf_ospf_log_adjacency_changes_detail(self, name: str) -> "VrfOspfMixin":
        """Delete log adjacency changes detail."""
        path = self.mappers["vrf_ospf"].get_ospf_log_adjacency_changes_detail(name)
        return self.add_delete(path)

    # ========================================================================
    # Max Metric
    # ========================================================================

    def set_vrf_ospf_max_metric_router_lsa_administrative(self, name: str) -> "VrfOspfMixin":
        """Enable max-metric router-lsa administrative."""
        path = self.mappers["vrf_ospf"].get_ospf_max_metric_router_lsa_administrative(name)
        return self.add_set(path)

    def delete_vrf_ospf_max_metric_router_lsa_administrative(self, name: str) -> "VrfOspfMixin":
        """Delete max-metric router-lsa administrative."""
        path = self.mappers["vrf_ospf"].get_ospf_max_metric_router_lsa_administrative(name)
        return self.add_delete(path)

    def set_vrf_ospf_max_metric_router_lsa_on_shutdown(self, name: str, value: str) -> "VrfOspfMixin":
        """Value is the shutdown timer."""
        path = self.mappers["vrf_ospf"].get_ospf_max_metric_router_lsa_on_shutdown(name, value)
        return self.add_set(path)

    def delete_vrf_ospf_max_metric_router_lsa_on_shutdown(self, name: str) -> "VrfOspfMixin":
        """Delete max-metric router-lsa on-shutdown."""
        path = self.mappers["vrf_ospf"].get_ospf(name) + ["max-metric", "router-lsa", "on-shutdown"]
        return self.add_delete(path)

    def set_vrf_ospf_max_metric_router_lsa_on_startup(self, name: str, value: str) -> "VrfOspfMixin":
        """Value is the startup timer."""
        path = self.mappers["vrf_ospf"].get_ospf_max_metric_router_lsa_on_startup(name, value)
        return self.add_set(path)

    def delete_vrf_ospf_max_metric_router_lsa_on_startup(self, name: str) -> "VrfOspfMixin":
        """Delete max-metric router-lsa on-startup."""
        path = self.mappers["vrf_ospf"].get_ospf(name) + ["max-metric", "router-lsa", "on-startup"]
        return self.add_delete(path)

    # ========================================================================
    # MPLS-TE
    # ========================================================================

    def set_vrf_ospf_mpls_te_enable(self, name: str) -> "VrfOspfMixin":
        """Enable MPLS-TE."""
        path = self.mappers["vrf_ospf"].get_ospf_mpls_te_enable(name)
        return self.add_set(path)

    def delete_vrf_ospf_mpls_te_enable(self, name: str) -> "VrfOspfMixin":
        """Delete MPLS-TE enable."""
        path = self.mappers["vrf_ospf"].get_ospf_mpls_te_enable(name)
        return self.add_delete(path)

    def set_vrf_ospf_mpls_te_router_address(self, name: str, value: str) -> "VrfOspfMixin":
        """Value is the router address."""
        path = self.mappers["vrf_ospf"].get_ospf_mpls_te_router_address(name, value)
        return self.add_set(path)

    def delete_vrf_ospf_mpls_te_router_address(self, name: str) -> "VrfOspfMixin":
        """Delete MPLS-TE router address."""
        path = self.mappers["vrf_ospf"].get_ospf(name) + ["mpls-te", "router-address"]
        return self.add_delete(path)

    # ========================================================================
    # Neighbor
    # ========================================================================

    def set_vrf_ospf_neighbor(self, name: str, value: str) -> "VrfOspfMixin":
        """Value is the neighbor address."""
        path = self.mappers["vrf_ospf"].get_ospf_neighbor(name, value)
        return self.add_set(path)

    def delete_vrf_ospf_neighbor(self, name: str, value: str) -> "VrfOspfMixin":
        """Value is the neighbor address."""
        path = self.mappers["vrf_ospf"].get_ospf_neighbor(name, value)
        return self.add_delete(path)

    def set_vrf_ospf_neighbor_priority(self, name: str, value: str) -> "VrfOspfMixin":
        """Value format: 'address,priority'."""
        parts = value.split(",", 1)
        if len(parts) == 2:
            path = self.mappers["vrf_ospf"].get_ospf_neighbor_priority(name, parts[0], parts[1])
            return self.add_set(path)
        return self

    def delete_vrf_ospf_neighbor_priority(self, name: str, value: str) -> "VrfOspfMixin":
        """Value is the neighbor address."""
        path = self.mappers["vrf_ospf"].get_ospf_neighbor(name, value) + ["priority"]
        return self.add_delete(path)

    def set_vrf_ospf_neighbor_poll_interval(self, name: str, value: str) -> "VrfOspfMixin":
        """Value format: 'address,interval'."""
        parts = value.split(",", 1)
        if len(parts) == 2:
            path = self.mappers["vrf_ospf"].get_ospf_neighbor_poll_interval(name, parts[0], parts[1])
            return self.add_set(path)
        return self

    def delete_vrf_ospf_neighbor_poll_interval(self, name: str, value: str) -> "VrfOspfMixin":
        """Value is the neighbor address."""
        path = self.mappers["vrf_ospf"].get_ospf_neighbor(name, value) + ["poll-interval"]
        return self.add_delete(path)

    # ========================================================================
    # Parameters
    # ========================================================================

    def set_vrf_ospf_parameters_abr_type(self, name: str, value: str) -> "VrfOspfMixin":
        """Value is the ABR type (cisco/ibm/shortcut/standard)."""
        path = self.mappers["vrf_ospf"].get_ospf_parameters_abr_type(name, value)
        return self.add_set(path)

    def delete_vrf_ospf_parameters_abr_type(self, name: str) -> "VrfOspfMixin":
        """Delete ABR type."""
        path = self.mappers["vrf_ospf"].get_ospf(name) + ["parameters", "abr-type"]
        return self.add_delete(path)

    def set_vrf_ospf_parameters_opaque_lsa(self, name: str) -> "VrfOspfMixin":
        """Enable opaque LSA."""
        path = self.mappers["vrf_ospf"].get_ospf_parameters_opaque_lsa(name)
        return self.add_set(path)

    def delete_vrf_ospf_parameters_opaque_lsa(self, name: str) -> "VrfOspfMixin":
        """Delete opaque LSA."""
        path = self.mappers["vrf_ospf"].get_ospf_parameters_opaque_lsa(name)
        return self.add_delete(path)

    def set_vrf_ospf_parameters_rfc1583_compatibility(self, name: str) -> "VrfOspfMixin":
        """Enable RFC1583 compatibility."""
        path = self.mappers["vrf_ospf"].get_ospf_parameters_rfc1583_compatibility(name)
        return self.add_set(path)

    def delete_vrf_ospf_parameters_rfc1583_compatibility(self, name: str) -> "VrfOspfMixin":
        """Delete RFC1583 compatibility."""
        path = self.mappers["vrf_ospf"].get_ospf_parameters_rfc1583_compatibility(name)
        return self.add_delete(path)

    def set_vrf_ospf_parameters_router_id(self, name: str, value: str) -> "VrfOspfMixin":
        """Value is the router ID."""
        path = self.mappers["vrf_ospf"].get_ospf_parameters_router_id(name, value)
        return self.add_set(path)

    def delete_vrf_ospf_parameters_router_id(self, name: str) -> "VrfOspfMixin":
        """Delete router ID."""
        path = self.mappers["vrf_ospf"].get_ospf(name) + ["parameters", "router-id"]
        return self.add_delete(path)

    # ========================================================================
    # Passive Interface
    # ========================================================================

    def set_vrf_ospf_passive_interface(self, name: str, value: str) -> "VrfOspfMixin":
        """Value is the interface name or 'default'."""
        path = self.mappers["vrf_ospf"].get_ospf_passive_interface(name, value)
        return self.add_set(path)

    def delete_vrf_ospf_passive_interface(self, name: str, value: str) -> "VrfOspfMixin":
        """Value is the interface name or 'default'."""
        path = self.mappers["vrf_ospf"].get_ospf_passive_interface(name, value)
        return self.add_delete(path)

    def set_vrf_ospf_passive_interface_default(self, name: str) -> "VrfOspfMixin":
        """Enable passive interface default."""
        path = self.mappers["vrf_ospf"].get_ospf_passive_interface_default(name)
        return self.add_set(path)

    def delete_vrf_ospf_passive_interface_default(self, name: str) -> "VrfOspfMixin":
        """Delete passive interface default."""
        path = self.mappers["vrf_ospf"].get_ospf_passive_interface_default(name)
        return self.add_delete(path)

    # ========================================================================
    # Redistribute
    # ========================================================================

    def set_vrf_ospf_redistribute(self, name: str, value: str) -> "VrfOspfMixin":
        """Value is the protocol (babel/bgp/connected/isis/kernel/rip/static)."""
        path = self.mappers["vrf_ospf"].get_ospf_redistribute(name, value)
        return self.add_set(path)

    def delete_vrf_ospf_redistribute(self, name: str, value: str) -> "VrfOspfMixin":
        """Value is the protocol."""
        path = self.mappers["vrf_ospf"].get_ospf_redistribute(name, value)
        return self.add_delete(path)

    def set_vrf_ospf_redistribute_metric(self, name: str, value: str) -> "VrfOspfMixin":
        """Value format: 'protocol,metric'."""
        parts = value.split(",", 1)
        if len(parts) == 2:
            path = self.mappers["vrf_ospf"].get_ospf_redistribute_metric(name, parts[0], parts[1])
            return self.add_set(path)
        return self

    def delete_vrf_ospf_redistribute_metric(self, name: str, value: str) -> "VrfOspfMixin":
        """Value is the protocol."""
        path = self.mappers["vrf_ospf"].get_ospf_redistribute(name, value) + ["metric"]
        return self.add_delete(path)

    def set_vrf_ospf_redistribute_metric_type(self, name: str, value: str) -> "VrfOspfMixin":
        """Value format: 'protocol,metric_type'."""
        parts = value.split(",", 1)
        if len(parts) == 2:
            path = self.mappers["vrf_ospf"].get_ospf_redistribute_metric_type(name, parts[0], parts[1])
            return self.add_set(path)
        return self

    def delete_vrf_ospf_redistribute_metric_type(self, name: str, value: str) -> "VrfOspfMixin":
        """Value is the protocol."""
        path = self.mappers["vrf_ospf"].get_ospf_redistribute(name, value) + ["metric-type"]
        return self.add_delete(path)

    def set_vrf_ospf_redistribute_route_map(self, name: str, value: str) -> "VrfOspfMixin":
        """Value format: 'protocol,route_map'."""
        parts = value.split(",", 1)
        if len(parts) == 2:
            path = self.mappers["vrf_ospf"].get_ospf_redistribute_route_map(name, parts[0], parts[1])
            return self.add_set(path)
        return self

    def delete_vrf_ospf_redistribute_route_map(self, name: str, value: str) -> "VrfOspfMixin":
        """Value is the protocol."""
        path = self.mappers["vrf_ospf"].get_ospf_redistribute(name, value) + ["route-map"]
        return self.add_delete(path)

    def set_vrf_ospf_redistribute_table(self, name: str, value: str) -> "VrfOspfMixin":
        """Value is the table number."""
        path = self.mappers["vrf_ospf"].get_ospf_redistribute_table(name, value)
        return self.add_set(path)

    def delete_vrf_ospf_redistribute_table(self, name: str, value: str) -> "VrfOspfMixin":
        """Value is the table number."""
        path = self.mappers["vrf_ospf"].get_ospf_redistribute_table(name, value)
        return self.add_delete(path)

    def set_vrf_ospf_redistribute_table_metric(self, name: str, value: str) -> "VrfOspfMixin":
        """Value format: 'table,metric'."""
        parts = value.split(",", 1)
        if len(parts) == 2:
            path = self.mappers["vrf_ospf"].get_ospf_redistribute_table_metric(name, parts[0], parts[1])
            return self.add_set(path)
        return self

    def delete_vrf_ospf_redistribute_table_metric(self, name: str, value: str) -> "VrfOspfMixin":
        """Value is the table number."""
        path = self.mappers["vrf_ospf"].get_ospf_redistribute_table(name, value) + ["metric"]
        return self.add_delete(path)

    def set_vrf_ospf_redistribute_table_metric_type(self, name: str, value: str) -> "VrfOspfMixin":
        """Value format: 'table,metric_type'."""
        parts = value.split(",", 1)
        if len(parts) == 2:
            path = self.mappers["vrf_ospf"].get_ospf_redistribute_table_metric_type(name, parts[0], parts[1])
            return self.add_set(path)
        return self

    def delete_vrf_ospf_redistribute_table_metric_type(self, name: str, value: str) -> "VrfOspfMixin":
        """Value is the table number."""
        path = self.mappers["vrf_ospf"].get_ospf_redistribute_table(name, value) + ["metric-type"]
        return self.add_delete(path)

    def set_vrf_ospf_redistribute_table_route_map(self, name: str, value: str) -> "VrfOspfMixin":
        """Value format: 'table,route_map'."""
        parts = value.split(",", 1)
        if len(parts) == 2:
            path = self.mappers["vrf_ospf"].get_ospf_redistribute_table_route_map(name, parts[0], parts[1])
            return self.add_set(path)
        return self

    def delete_vrf_ospf_redistribute_table_route_map(self, name: str, value: str) -> "VrfOspfMixin":
        """Value is the table number."""
        path = self.mappers["vrf_ospf"].get_ospf_redistribute_table(name, value) + ["route-map"]
        return self.add_delete(path)

    # ========================================================================
    # Refresh Timers
    # ========================================================================

    def set_vrf_ospf_refresh_timers(self, name: str, value: str) -> "VrfOspfMixin":
        """Value is the refresh timer value."""
        path = self.mappers["vrf_ospf"].get_ospf_refresh_timers(name, value)
        return self.add_set(path)

    def delete_vrf_ospf_refresh_timers(self, name: str) -> "VrfOspfMixin":
        """Delete refresh timers."""
        path = self.mappers["vrf_ospf"].get_ospf(name) + ["refresh", "timers"]
        return self.add_delete(path)

    # ========================================================================
    # Segment Routing
    # ========================================================================

    def set_vrf_ospf_segment_routing_global_block(self, name: str, value: str) -> "VrfOspfMixin":
        """Value format: 'low_label,high_label'."""
        parts = value.split(",", 1)
        if len(parts) == 2:
            path = self.mappers["vrf_ospf"].get_ospf_segment_routing_global_block(name, parts[0], parts[1])
            return self.add_set(path)
        return self

    def delete_vrf_ospf_segment_routing_global_block(self, name: str) -> "VrfOspfMixin":
        """Delete segment routing global block."""
        path = self.mappers["vrf_ospf"].get_ospf(name) + ["segment-routing", "global-block"]
        return self.add_delete(path)

    def set_vrf_ospf_segment_routing_local_block(self, name: str, value: str) -> "VrfOspfMixin":
        """Value format: 'low_label,high_label'."""
        parts = value.split(",", 1)
        if len(parts) == 2:
            path = self.mappers["vrf_ospf"].get_ospf_segment_routing_local_block(name, parts[0], parts[1])
            return self.add_set(path)
        return self

    def delete_vrf_ospf_segment_routing_local_block(self, name: str) -> "VrfOspfMixin":
        """Delete segment routing local block."""
        path = self.mappers["vrf_ospf"].get_ospf(name) + ["segment-routing", "local-block"]
        return self.add_delete(path)

    def set_vrf_ospf_segment_routing_maximum_label_depth(self, name: str, value: str) -> "VrfOspfMixin":
        """Value is the maximum label depth."""
        path = self.mappers["vrf_ospf"].get_ospf_segment_routing_maximum_label_depth(name, value)
        return self.add_set(path)

    def delete_vrf_ospf_segment_routing_maximum_label_depth(self, name: str) -> "VrfOspfMixin":
        """Delete segment routing maximum label depth."""
        path = self.mappers["vrf_ospf"].get_ospf(name) + ["segment-routing", "maximum-label-depth"]
        return self.add_delete(path)

    def set_vrf_ospf_segment_routing_prefix(self, name: str, value: str) -> "VrfOspfMixin":
        """Value is the prefix."""
        path = self.mappers["vrf_ospf"].get_ospf_segment_routing_prefix(name, value)
        return self.add_set(path)

    def delete_vrf_ospf_segment_routing_prefix(self, name: str, value: str) -> "VrfOspfMixin":
        """Value is the prefix."""
        path = self.mappers["vrf_ospf"].get_ospf_segment_routing_prefix(name, value)
        return self.add_delete(path)

    def set_vrf_ospf_segment_routing_prefix_index_value(self, name: str, value: str) -> "VrfOspfMixin":
        """Value format: 'prefix,index_value'."""
        parts = value.split(",", 1)
        if len(parts) == 2:
            path = self.mappers["vrf_ospf"].get_ospf_segment_routing_prefix_index_value(name, parts[0], parts[1])
            return self.add_set(path)
        return self

    def delete_vrf_ospf_segment_routing_prefix_index_value(self, name: str, value: str) -> "VrfOspfMixin":
        """Value is the prefix."""
        path = self.mappers["vrf_ospf"].get_ospf_segment_routing_prefix(name, value) + ["index", "value"]
        return self.add_delete(path)

    def set_vrf_ospf_segment_routing_prefix_index_explicit_null(self, name: str, value: str) -> "VrfOspfMixin":
        """Value is the prefix."""
        path = self.mappers["vrf_ospf"].get_ospf_segment_routing_prefix_index_explicit_null(name, value)
        return self.add_set(path)

    def delete_vrf_ospf_segment_routing_prefix_index_explicit_null(self, name: str, value: str) -> "VrfOspfMixin":
        """Value is the prefix."""
        path = self.mappers["vrf_ospf"].get_ospf_segment_routing_prefix_index_explicit_null(name, value)
        return self.add_delete(path)

    def set_vrf_ospf_segment_routing_prefix_index_no_php_flag(self, name: str, value: str) -> "VrfOspfMixin":
        """Value is the prefix."""
        path = self.mappers["vrf_ospf"].get_ospf_segment_routing_prefix_index_no_php_flag(name, value)
        return self.add_set(path)

    def delete_vrf_ospf_segment_routing_prefix_index_no_php_flag(self, name: str, value: str) -> "VrfOspfMixin":
        """Value is the prefix."""
        path = self.mappers["vrf_ospf"].get_ospf_segment_routing_prefix_index_no_php_flag(name, value)
        return self.add_delete(path)

    # ========================================================================
    # Timers
    # ========================================================================

    def set_vrf_ospf_timers_throttle_spf_delay(self, name: str, value: str) -> "VrfOspfMixin":
        """Value is the delay in milliseconds."""
        path = self.mappers["vrf_ospf"].get_ospf_timers_throttle_spf_delay(name, value)
        return self.add_set(path)

    def delete_vrf_ospf_timers_throttle_spf_delay(self, name: str) -> "VrfOspfMixin":
        """Delete SPF delay timer."""
        path = self.mappers["vrf_ospf"].get_ospf(name) + ["timers", "throttle", "spf", "delay"]
        return self.add_delete(path)

    def set_vrf_ospf_timers_throttle_spf_initial_holdtime(self, name: str, value: str) -> "VrfOspfMixin":
        """Value is the initial holdtime in milliseconds."""
        path = self.mappers["vrf_ospf"].get_ospf_timers_throttle_spf_initial_holdtime(name, value)
        return self.add_set(path)

    def delete_vrf_ospf_timers_throttle_spf_initial_holdtime(self, name: str) -> "VrfOspfMixin":
        """Delete SPF initial holdtime."""
        path = self.mappers["vrf_ospf"].get_ospf(name) + ["timers", "throttle", "spf", "initial-holdtime"]
        return self.add_delete(path)

    def set_vrf_ospf_timers_throttle_spf_max_holdtime(self, name: str, value: str) -> "VrfOspfMixin":
        """Value is the max holdtime in milliseconds."""
        path = self.mappers["vrf_ospf"].get_ospf_timers_throttle_spf_max_holdtime(name, value)
        return self.add_set(path)

    def delete_vrf_ospf_timers_throttle_spf_max_holdtime(self, name: str) -> "VrfOspfMixin":
        """Delete SPF max holdtime."""
        path = self.mappers["vrf_ospf"].get_ospf(name) + ["timers", "throttle", "spf", "max-holdtime"]
        return self.add_delete(path)

    # ========================================================================
    # Additional Coverage Operations
    # ========================================================================

    def set_vrf_ospf_access_list_export(self, name: str, value: str) -> "VrfOspfMixin":
        """Set access-list export. Value format: 'acl,protocol'."""
        parts = value.split(",", 1)
        if len(parts) == 2:
            return self.add_set(self.mappers["vrf_ospf"].get_ospf_access_list_export(name, parts[0], parts[1]))
        return self

    def delete_vrf_ospf_access_list_export(self, name: str, value: str) -> "VrfOspfMixin":
        """Delete access-list export. Value format: 'acl,protocol'."""
        parts = value.split(",", 1)
        if len(parts) == 2:
            return self.add_delete(self.mappers["vrf_ospf"].get_ospf_access_list_export(name, parts[0], parts[1]))
        return self

    def set_vrf_ospf_aggregation_timer(self, name: str, value: str) -> "VrfOspfMixin":
        """Set aggregation timer."""
        return self.add_set(self.mappers["vrf_ospf"].get_ospf_aggregation_timer(name, value))

    def delete_vrf_ospf_aggregation_timer(self, name: str) -> "VrfOspfMixin":
        """Delete aggregation timer."""
        return self.add_delete(self.mappers["vrf_ospf"].get_ospf(name) + ["aggregation", "timer"])

    def set_vrf_ospf_capability_opaque(self, name: str) -> "VrfOspfMixin":
        """Enable opaque LSA capability."""
        return self.add_set(self.mappers["vrf_ospf"].get_ospf_capability_opaque(name))

    def delete_vrf_ospf_capability_opaque(self, name: str) -> "VrfOspfMixin":
        """Disable opaque LSA capability."""
        return self.add_delete(self.mappers["vrf_ospf"].get_ospf_capability_opaque(name))

    def set_vrf_ospf_maximum_paths(self, name: str, value: str) -> "VrfOspfMixin":
        """Set maximum paths (ECMP)."""
        return self.add_set(self.mappers["vrf_ospf"].get_ospf_maximum_paths(name, value))

    def delete_vrf_ospf_maximum_paths(self, name: str) -> "VrfOspfMixin":
        """Delete maximum paths (ECMP)."""
        return self.add_delete(self.mappers["vrf_ospf"].get_ospf(name) + ["maximum-paths"])

    def set_vrf_ospf_ldp_sync_holddown(self, name: str, value: str) -> "VrfOspfMixin":
        """Set global LDP-IGP sync holddown."""
        return self.add_set(self.mappers["vrf_ospf"].get_ospf_ldp_sync_holddown(name, value))

    def delete_vrf_ospf_ldp_sync_holddown(self, name: str) -> "VrfOspfMixin":
        """Delete global LDP-IGP sync holddown."""
        return self.add_delete(self.mappers["vrf_ospf"].get_ospf_ldp_sync(name) + ["holddown"])

    def set_vrf_ospf_area_export_list(self, name: str, value: str) -> "VrfOspfMixin":
        """Set area export-list. Value format: 'area,acl'."""
        parts = value.split(",", 1)
        if len(parts) == 2:
            return self.add_set(self.mappers["vrf_ospf"].get_ospf_area_export_list(name, parts[0], parts[1]))
        return self

    def delete_vrf_ospf_area_export_list(self, name: str, value: str) -> "VrfOspfMixin":
        """Delete area export-list. Value is the area ID."""
        return self.add_delete(self.mappers["vrf_ospf"].get_ospf_area(name, value) + ["export-list"])

    def set_vrf_ospf_area_import_list(self, name: str, value: str) -> "VrfOspfMixin":
        """Set area import-list. Value format: 'area,acl'."""
        parts = value.split(",", 1)
        if len(parts) == 2:
            return self.add_set(self.mappers["vrf_ospf"].get_ospf_area_import_list(name, parts[0], parts[1]))
        return self

    def delete_vrf_ospf_area_import_list(self, name: str, value: str) -> "VrfOspfMixin":
        """Delete area import-list. Value is the area ID."""
        return self.add_delete(self.mappers["vrf_ospf"].get_ospf_area(name, value) + ["import-list"])

    def set_vrf_ospf_area_network(self, name: str, value: str) -> "VrfOspfMixin":
        """Add a network to an area. Value format: 'area,network'."""
        parts = value.split(",", 1)
        if len(parts) == 2:
            return self.add_set(self.mappers["vrf_ospf"].get_ospf_area_network(name, parts[0], parts[1]))
        return self

    def delete_vrf_ospf_area_network(self, name: str, value: str) -> "VrfOspfMixin":
        """Remove a network from an area. Value format: 'area,network'."""
        parts = value.split(",", 1)
        if len(parts) == 2:
            return self.add_delete(self.mappers["vrf_ospf"].get_ospf_area_network(name, parts[0], parts[1]))
        return self

    def set_vrf_ospf_area_virtual_link_authentication_null(self, name: str, value: str) -> "VrfOspfMixin":
        """Set virtual-link null authentication. Value format: 'area,address'."""
        parts = value.split(",", 1)
        if len(parts) == 2:
            return self.add_set(self.mappers["vrf_ospf"].get_ospf_area_virtual_link_authentication_null(name, parts[0], parts[1]))
        return self

    def delete_vrf_ospf_area_virtual_link_authentication_null(self, name: str, value: str) -> "VrfOspfMixin":
        """Delete virtual-link null authentication. Value format: 'area,address'."""
        parts = value.split(",", 1)
        if len(parts) == 2:
            return self.add_delete(self.mappers["vrf_ospf"].get_ospf_area_virtual_link_authentication_null(name, parts[0], parts[1]))
        return self

    def set_vrf_ospf_interface_authentication_null(self, name: str, value: str) -> "VrfOspfMixin":
        """Set interface null authentication. Value is the interface name."""
        return self.add_set(self.mappers["vrf_ospf"].get_ospf_interface_authentication_null(name, value))

    def delete_vrf_ospf_interface_authentication_null(self, name: str, value: str) -> "VrfOspfMixin":
        """Delete interface null authentication. Value is the interface name."""
        return self.add_delete(self.mappers["vrf_ospf"].get_ospf_interface_authentication_null(name, value))

    def delete_vrf_ospf_interface_authentication(self, name: str, value: str) -> "VrfOspfMixin":
        """Delete all interface authentication. Value is the interface name."""
        return self.add_delete(self.mappers["vrf_ospf"].get_ospf_interface(name, value) + ["authentication"])

    def set_vrf_ospf_interface_retransmit_window(self, name: str, value: str) -> "VrfOspfMixin":
        """Set interface retransmit-window. Value format: 'iface,window'."""
        parts = value.split(",", 1)
        if len(parts) == 2:
            return self.add_set(self.mappers["vrf_ospf"].get_ospf_interface_retransmit_window(name, parts[0], parts[1]))
        return self

    def delete_vrf_ospf_interface_retransmit_window(self, name: str, value: str) -> "VrfOspfMixin":
        """Delete interface retransmit-window. Value is the interface name."""
        return self.add_delete(self.mappers["vrf_ospf"].get_ospf_interface(name, value) + ["retransmit-window"])

    def set_vrf_ospf_area_virtual_link_retransmit_window(self, name: str, value: str) -> "VrfOspfMixin":
        """Set virtual-link retransmit-window. Value format: 'area,address,window'."""
        parts = value.split(",", 2)
        if len(parts) == 3:
            return self.add_set(self.mappers["vrf_ospf"].get_ospf_area_virtual_link_retransmit_window(name, parts[0], parts[1], parts[2]))
        return self

    def delete_vrf_ospf_area_virtual_link_retransmit_window(self, name: str, value: str) -> "VrfOspfMixin":
        """Delete virtual-link retransmit-window. Value format: 'area,address'."""
        parts = value.split(",", 1)
        if len(parts) == 2:
            return self.add_delete(self.mappers["vrf_ospf"].get_ospf_area_virtual_link(name, parts[0], parts[1]) + ["retransmit-window"])
        return self

    def set_vrf_ospf_graceful_restart_grace_period(self, name: str, value: str) -> "VrfOspfMixin":
        """Set graceful-restart grace-period."""
        return self.add_set(self.mappers["vrf_ospf"].get_ospf_graceful_restart_grace_period(name, value))

    def delete_vrf_ospf_graceful_restart_grace_period(self, name: str) -> "VrfOspfMixin":
        """Delete graceful-restart grace-period."""
        return self.add_delete(self.mappers["vrf_ospf"].get_ospf_graceful_restart(name) + ["grace-period"])

    def set_vrf_ospf_graceful_restart_helper_enable_router_id(self, name: str, value: str) -> "VrfOspfMixin":
        """Enable graceful-restart helper for a router-id. Value is the router-id."""
        return self.add_set(self.mappers["vrf_ospf"].get_ospf_graceful_restart_helper_enable_router_id(name, value))

    def delete_vrf_ospf_graceful_restart_helper_enable_router_id(self, name: str, value: str) -> "VrfOspfMixin":
        """Disable graceful-restart helper for a router-id. Value is the router-id."""
        return self.add_delete(self.mappers["vrf_ospf"].get_ospf_graceful_restart_helper_enable_router_id(name, value))

    def set_vrf_ospf_graceful_restart_helper_no_strict_lsa_checking(self, name: str) -> "VrfOspfMixin":
        """Enable graceful-restart helper no-strict-lsa-checking."""
        return self.add_set(self.mappers["vrf_ospf"].get_ospf_graceful_restart_helper_no_strict_lsa_checking(name))

    def delete_vrf_ospf_graceful_restart_helper_no_strict_lsa_checking(self, name: str) -> "VrfOspfMixin":
        """Disable graceful-restart helper no-strict-lsa-checking."""
        return self.add_delete(self.mappers["vrf_ospf"].get_ospf_graceful_restart_helper_no_strict_lsa_checking(name))

    def set_vrf_ospf_segment_routing_global_block_low(self, name: str, value: str) -> "VrfOspfMixin":
        """Set segment-routing global-block low label value."""
        return self.add_set(self.mappers["vrf_ospf"].get_ospf_segment_routing_global_block_low(name, value))

    def delete_vrf_ospf_segment_routing_global_block_low(self, name: str) -> "VrfOspfMixin":
        """Delete segment-routing global-block low label value."""
        return self.add_delete(self.mappers["vrf_ospf"].get_ospf(name) + ["segment-routing", "global-block", "low-label-value"])

    def set_vrf_ospf_segment_routing_global_block_high(self, name: str, value: str) -> "VrfOspfMixin":
        """Set segment-routing global-block high label value."""
        return self.add_set(self.mappers["vrf_ospf"].get_ospf_segment_routing_global_block_high(name, value))

    def delete_vrf_ospf_segment_routing_global_block_high(self, name: str) -> "VrfOspfMixin":
        """Delete segment-routing global-block high label value."""
        return self.add_delete(self.mappers["vrf_ospf"].get_ospf(name) + ["segment-routing", "global-block", "high-label-value"])

    def set_vrf_ospf_segment_routing_local_block_low(self, name: str, value: str) -> "VrfOspfMixin":
        """Set segment-routing local-block low label value."""
        return self.add_set(self.mappers["vrf_ospf"].get_ospf_segment_routing_local_block_low(name, value))

    def delete_vrf_ospf_segment_routing_local_block_low(self, name: str) -> "VrfOspfMixin":
        """Delete segment-routing local-block low label value."""
        return self.add_delete(self.mappers["vrf_ospf"].get_ospf(name) + ["segment-routing", "local-block", "low-label-value"])

    def set_vrf_ospf_segment_routing_local_block_high(self, name: str, value: str) -> "VrfOspfMixin":
        """Set segment-routing local-block high label value."""
        return self.add_set(self.mappers["vrf_ospf"].get_ospf_segment_routing_local_block_high(name, value))

    def delete_vrf_ospf_segment_routing_local_block_high(self, name: str) -> "VrfOspfMixin":
        """Delete segment-routing local-block high label value."""
        return self.add_delete(self.mappers["vrf_ospf"].get_ospf(name) + ["segment-routing", "local-block", "high-label-value"])

    def set_vrf_ospf_summary_address(self, name: str, value: str) -> "VrfOspfMixin":
        """Add a summary-address prefix. Value is the prefix."""
        return self.add_set(self.mappers["vrf_ospf"].get_ospf(name) + ["summary-address", value])

    def delete_vrf_ospf_summary_address(self, name: str, value: str) -> "VrfOspfMixin":
        """Delete a summary-address prefix. Value is the prefix."""
        return self.add_delete(self.mappers["vrf_ospf"].get_ospf(name) + ["summary-address", value])

    def set_vrf_ospf_summary_address_no_advertise(self, name: str, value: str) -> "VrfOspfMixin":
        """Set summary-address no-advertise. Value is the prefix."""
        return self.add_set(self.mappers["vrf_ospf"].get_ospf_summary_address_no_advertise(name, value))

    def delete_vrf_ospf_summary_address_no_advertise(self, name: str, value: str) -> "VrfOspfMixin":
        """Delete summary-address no-advertise. Value is the prefix."""
        return self.add_delete(self.mappers["vrf_ospf"].get_ospf_summary_address_no_advertise(name, value))

    def set_vrf_ospf_summary_address_tag(self, name: str, value: str) -> "VrfOspfMixin":
        """Set summary-address tag. Value format: 'prefix,tag'."""
        parts = value.split(",", 1)
        if len(parts) == 2:
            return self.add_set(self.mappers["vrf_ospf"].get_ospf_summary_address_tag(name, parts[0], parts[1]))
        return self

    def delete_vrf_ospf_summary_address_tag(self, name: str, value: str) -> "VrfOspfMixin":
        """Delete summary-address tag. Value is the prefix."""
        return self.add_delete(self.mappers["vrf_ospf"].get_ospf(name) + ["summary-address", value, "tag"])
