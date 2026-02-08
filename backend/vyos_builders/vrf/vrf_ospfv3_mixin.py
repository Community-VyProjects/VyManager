"""
VRF OSPFv3 Builder Mixin

Provides batch operations for OSPFv3 configuration within VRF instances.
Mixed into VrfBatchBuilder to extend it with OSPFv3 operations.
No version differences between VyOS 1.4 and 1.5.
"""


class VrfOspfv3Mixin:
    """Mixin for VRF OSPFv3 builder operations."""

    # ========================================================================
    # OSPFv3 Root
    # ========================================================================

    def set_vrf_ospfv3(self, name: str) -> "VrfOspfv3Mixin":
        """Enable OSPFv3 for a VRF."""
        path = self.mappers["vrf_ospfv3"].get_ospfv3(name)
        return self.add_set(path)

    def delete_vrf_ospfv3(self, name: str) -> "VrfOspfv3Mixin":
        """Delete all OSPFv3 configuration for a VRF."""
        path = self.mappers["vrf_ospfv3"].get_ospfv3(name)
        return self.add_delete(path)

    # ========================================================================
    # Area Operations
    # ========================================================================

    def set_vrf_ospfv3_area(self, name: str, value: str) -> "VrfOspfv3Mixin":
        """Create an OSPFv3 area. Value is the area ID."""
        path = self.mappers["vrf_ospfv3"].get_ospfv3_area(name, value)
        return self.add_set(path)

    def delete_vrf_ospfv3_area(self, name: str, value: str) -> "VrfOspfv3Mixin":
        """Delete an OSPFv3 area. Value is the area ID."""
        path = self.mappers["vrf_ospfv3"].get_ospfv3_area(name, value)
        return self.add_delete(path)

    # --- Area Range ---

    def set_vrf_ospfv3_area_range(self, name: str, value: str) -> "VrfOspfv3Mixin":
        """Create an area range. Value format: 'area,prefix'."""
        parts = value.split(",", 1)
        if len(parts) == 2:
            path = self.mappers["vrf_ospfv3"].get_ospfv3_area_range(name, parts[0], parts[1])
            return self.add_set(path)
        return self

    def delete_vrf_ospfv3_area_range(self, name: str, value: str) -> "VrfOspfv3Mixin":
        """Delete an area range. Value format: 'area,prefix'."""
        parts = value.split(",", 1)
        if len(parts) == 2:
            path = self.mappers["vrf_ospfv3"].get_ospfv3_area_range(name, parts[0], parts[1])
            return self.add_delete(path)
        return self

    def set_vrf_ospfv3_area_range_advertise(self, name: str, value: str) -> "VrfOspfv3Mixin":
        """Set area range advertise. Value format: 'area,prefix'."""
        parts = value.split(",", 1)
        if len(parts) == 2:
            path = self.mappers["vrf_ospfv3"].get_ospfv3_area_range_advertise(name, parts[0], parts[1])
            return self.add_set(path)
        return self

    def delete_vrf_ospfv3_area_range_advertise(self, name: str, value: str) -> "VrfOspfv3Mixin":
        """Delete area range advertise. Value format: 'area,prefix'."""
        parts = value.split(",", 1)
        if len(parts) == 2:
            path = self.mappers["vrf_ospfv3"].get_ospfv3_area_range(name, parts[0], parts[1]) + ["advertise"]
            return self.add_delete(path)
        return self

    def set_vrf_ospfv3_area_range_not_advertise(self, name: str, value: str) -> "VrfOspfv3Mixin":
        """Set area range not-advertise. Value format: 'area,prefix'."""
        parts = value.split(",", 1)
        if len(parts) == 2:
            path = self.mappers["vrf_ospfv3"].get_ospfv3_area_range_not_advertise(name, parts[0], parts[1])
            return self.add_set(path)
        return self

    def delete_vrf_ospfv3_area_range_not_advertise(self, name: str, value: str) -> "VrfOspfv3Mixin":
        """Delete area range not-advertise. Value format: 'area,prefix'."""
        parts = value.split(",", 1)
        if len(parts) == 2:
            path = self.mappers["vrf_ospfv3"].get_ospfv3_area_range(name, parts[0], parts[1]) + ["not-advertise"]
            return self.add_delete(path)
        return self

    def set_vrf_ospfv3_area_range_cost(self, name: str, value: str) -> "VrfOspfv3Mixin":
        """Set area range cost. Value format: 'area,prefix,cost'."""
        parts = value.split(",", 2)
        if len(parts) == 3:
            path = self.mappers["vrf_ospfv3"].get_ospfv3_area_range_cost(name, parts[0], parts[1], parts[2])
            return self.add_set(path)
        return self

    def delete_vrf_ospfv3_area_range_cost(self, name: str, value: str) -> "VrfOspfv3Mixin":
        """Delete area range cost. Value format: 'area,prefix'."""
        parts = value.split(",", 1)
        if len(parts) == 2:
            path = self.mappers["vrf_ospfv3"].get_ospfv3_area_range(name, parts[0], parts[1]) + ["cost"]
            return self.add_delete(path)
        return self

    # --- Area Export/Import Lists ---

    def set_vrf_ospfv3_area_export_list(self, name: str, value: str) -> "VrfOspfv3Mixin":
        """Set area export-list. Value format: 'area,list_name'."""
        parts = value.split(",", 1)
        if len(parts) == 2:
            path = self.mappers["vrf_ospfv3"].get_ospfv3_area_export_list(name, parts[0], parts[1])
            return self.add_set(path)
        return self

    def delete_vrf_ospfv3_area_export_list(self, name: str, value: str) -> "VrfOspfv3Mixin":
        """Delete area export-list. Value is the area ID."""
        path = self.mappers["vrf_ospfv3"].get_ospfv3_area(name, value) + ["export-list"]
        return self.add_delete(path)

    def set_vrf_ospfv3_area_import_list(self, name: str, value: str) -> "VrfOspfv3Mixin":
        """Set area import-list. Value format: 'area,list_name'."""
        parts = value.split(",", 1)
        if len(parts) == 2:
            path = self.mappers["vrf_ospfv3"].get_ospfv3_area_import_list(name, parts[0], parts[1])
            return self.add_set(path)
        return self

    def delete_vrf_ospfv3_area_import_list(self, name: str, value: str) -> "VrfOspfv3Mixin":
        """Delete area import-list. Value is the area ID."""
        path = self.mappers["vrf_ospfv3"].get_ospfv3_area(name, value) + ["import-list"]
        return self.add_delete(path)

    # --- Area Type: Stub ---

    def set_vrf_ospfv3_area_type_stub(self, name: str, value: str) -> "VrfOspfv3Mixin":
        """Set area type to stub. Value is the area ID."""
        path = self.mappers["vrf_ospfv3"].get_ospfv3_area_area_type_stub(name, value)
        return self.add_set(path)

    def delete_vrf_ospfv3_area_type_stub(self, name: str, value: str) -> "VrfOspfv3Mixin":
        """Delete area type stub. Value is the area ID."""
        path = self.mappers["vrf_ospfv3"].get_ospfv3_area_area_type_stub(name, value)
        return self.add_delete(path)

    def set_vrf_ospfv3_area_type_stub_default_cost(self, name: str, value: str) -> "VrfOspfv3Mixin":
        """Set stub area default cost. Value format: 'area,cost'."""
        parts = value.split(",", 1)
        if len(parts) == 2:
            path = self.mappers["vrf_ospfv3"].get_ospfv3_area_area_type_stub_default_cost(name, parts[0], parts[1])
            return self.add_set(path)
        return self

    def delete_vrf_ospfv3_area_type_stub_default_cost(self, name: str, value: str) -> "VrfOspfv3Mixin":
        """Delete stub area default cost. Value is the area ID."""
        path = self.mappers["vrf_ospfv3"].get_ospfv3_area_area_type_stub(name, value) + ["default-cost"]
        return self.add_delete(path)

    def set_vrf_ospfv3_area_type_stub_no_summary(self, name: str, value: str) -> "VrfOspfv3Mixin":
        """Set stub area no-summary. Value is the area ID."""
        path = self.mappers["vrf_ospfv3"].get_ospfv3_area_area_type_stub_no_summary(name, value)
        return self.add_set(path)

    def delete_vrf_ospfv3_area_type_stub_no_summary(self, name: str, value: str) -> "VrfOspfv3Mixin":
        """Delete stub area no-summary. Value is the area ID."""
        path = self.mappers["vrf_ospfv3"].get_ospfv3_area_area_type_stub_no_summary(name, value)
        return self.add_delete(path)

    # --- Area Type: NSSA ---

    def set_vrf_ospfv3_area_type_nssa(self, name: str, value: str) -> "VrfOspfv3Mixin":
        """Set area type to NSSA. Value is the area ID."""
        path = self.mappers["vrf_ospfv3"].get_ospfv3_area_area_type_nssa(name, value)
        return self.add_set(path)

    def delete_vrf_ospfv3_area_type_nssa(self, name: str, value: str) -> "VrfOspfv3Mixin":
        """Delete area type NSSA. Value is the area ID."""
        path = self.mappers["vrf_ospfv3"].get_ospfv3_area_area_type_nssa(name, value)
        return self.add_delete(path)

    def set_vrf_ospfv3_area_type_nssa_default_cost(self, name: str, value: str) -> "VrfOspfv3Mixin":
        """Set NSSA area default cost. Value format: 'area,cost'."""
        parts = value.split(",", 1)
        if len(parts) == 2:
            path = self.mappers["vrf_ospfv3"].get_ospfv3_area_area_type_nssa_default_cost(name, parts[0], parts[1])
            return self.add_set(path)
        return self

    def delete_vrf_ospfv3_area_type_nssa_default_cost(self, name: str, value: str) -> "VrfOspfv3Mixin":
        """Delete NSSA area default cost. Value is the area ID."""
        path = self.mappers["vrf_ospfv3"].get_ospfv3_area_area_type_nssa(name, value) + ["default-cost"]
        return self.add_delete(path)

    def set_vrf_ospfv3_area_type_nssa_no_summary(self, name: str, value: str) -> "VrfOspfv3Mixin":
        """Set NSSA area no-summary. Value is the area ID."""
        path = self.mappers["vrf_ospfv3"].get_ospfv3_area_area_type_nssa_no_summary(name, value)
        return self.add_set(path)

    def delete_vrf_ospfv3_area_type_nssa_no_summary(self, name: str, value: str) -> "VrfOspfv3Mixin":
        """Delete NSSA area no-summary. Value is the area ID."""
        path = self.mappers["vrf_ospfv3"].get_ospfv3_area_area_type_nssa_no_summary(name, value)
        return self.add_delete(path)

    # ========================================================================
    # Auto-Cost
    # ========================================================================

    def set_vrf_ospfv3_auto_cost_reference_bandwidth(self, name: str, value: str) -> "VrfOspfv3Mixin":
        """Set auto-cost reference bandwidth. Value is the bandwidth."""
        path = self.mappers["vrf_ospfv3"].get_ospfv3_auto_cost_reference_bandwidth(name, value)
        return self.add_set(path)

    def delete_vrf_ospfv3_auto_cost_reference_bandwidth(self, name: str) -> "VrfOspfv3Mixin":
        """Delete auto-cost reference bandwidth."""
        path = self.mappers["vrf_ospfv3"].get_ospfv3(name) + ["auto-cost", "reference-bandwidth"]
        return self.add_delete(path)

    # ========================================================================
    # Default Information Originate
    # ========================================================================

    def set_vrf_ospfv3_default_information_originate(self, name: str) -> "VrfOspfv3Mixin":
        """Enable default-information originate."""
        path = self.mappers["vrf_ospfv3"].get_ospfv3_default_information_originate(name)
        return self.add_set(path)

    def delete_vrf_ospfv3_default_information_originate(self, name: str) -> "VrfOspfv3Mixin":
        """Delete default-information originate."""
        path = self.mappers["vrf_ospfv3"].get_ospfv3_default_information_originate(name)
        return self.add_delete(path)

    def set_vrf_ospfv3_default_information_originate_always(self, name: str) -> "VrfOspfv3Mixin":
        """Set default-information originate always."""
        path = self.mappers["vrf_ospfv3"].get_ospfv3_default_information_originate_always(name)
        return self.add_set(path)

    def delete_vrf_ospfv3_default_information_originate_always(self, name: str) -> "VrfOspfv3Mixin":
        """Delete default-information originate always."""
        path = self.mappers["vrf_ospfv3"].get_ospfv3_default_information_originate_always(name)
        return self.add_delete(path)

    def set_vrf_ospfv3_default_information_originate_metric(self, name: str, value: str) -> "VrfOspfv3Mixin":
        """Set default-information originate metric. Value is the metric."""
        path = self.mappers["vrf_ospfv3"].get_ospfv3_default_information_originate_metric(name, value)
        return self.add_set(path)

    def delete_vrf_ospfv3_default_information_originate_metric(self, name: str) -> "VrfOspfv3Mixin":
        """Delete default-information originate metric."""
        path = self.mappers["vrf_ospfv3"].get_ospfv3_default_information_originate(name) + ["metric"]
        return self.add_delete(path)

    def set_vrf_ospfv3_default_information_originate_metric_type(self, name: str, value: str) -> "VrfOspfv3Mixin":
        """Set default-information originate metric-type. Value is the type (1 or 2)."""
        path = self.mappers["vrf_ospfv3"].get_ospfv3_default_information_originate_metric_type(name, value)
        return self.add_set(path)

    def delete_vrf_ospfv3_default_information_originate_metric_type(self, name: str) -> "VrfOspfv3Mixin":
        """Delete default-information originate metric-type."""
        path = self.mappers["vrf_ospfv3"].get_ospfv3_default_information_originate(name) + ["metric-type"]
        return self.add_delete(path)

    def set_vrf_ospfv3_default_information_originate_route_map(self, name: str, value: str) -> "VrfOspfv3Mixin":
        """Set default-information originate route-map. Value is the route-map name."""
        path = self.mappers["vrf_ospfv3"].get_ospfv3_default_information_originate_route_map(name, value)
        return self.add_set(path)

    def delete_vrf_ospfv3_default_information_originate_route_map(self, name: str) -> "VrfOspfv3Mixin":
        """Delete default-information originate route-map."""
        path = self.mappers["vrf_ospfv3"].get_ospfv3_default_information_originate(name) + ["route-map"]
        return self.add_delete(path)

    # ========================================================================
    # Distance
    # ========================================================================

    def set_vrf_ospfv3_distance_global(self, name: str, value: str) -> "VrfOspfv3Mixin":
        """Set global distance. Value is the distance."""
        path = self.mappers["vrf_ospfv3"].get_ospfv3_distance_global(name, value)
        return self.add_set(path)

    def delete_vrf_ospfv3_distance_global(self, name: str) -> "VrfOspfv3Mixin":
        """Delete global distance."""
        path = self.mappers["vrf_ospfv3"].get_ospfv3(name) + ["distance", "global"]
        return self.add_delete(path)

    def set_vrf_ospfv3_distance_ospfv3_external(self, name: str, value: str) -> "VrfOspfv3Mixin":
        """Set OSPFv3 external distance. Value is the distance."""
        path = self.mappers["vrf_ospfv3"].get_ospfv3_distance_ospfv3_external(name, value)
        return self.add_set(path)

    def delete_vrf_ospfv3_distance_ospfv3_external(self, name: str) -> "VrfOspfv3Mixin":
        """Delete OSPFv3 external distance."""
        path = self.mappers["vrf_ospfv3"].get_ospfv3(name) + ["distance", "ospfv3", "external"]
        return self.add_delete(path)

    def set_vrf_ospfv3_distance_ospfv3_inter_area(self, name: str, value: str) -> "VrfOspfv3Mixin":
        """Set OSPFv3 inter-area distance. Value is the distance."""
        path = self.mappers["vrf_ospfv3"].get_ospfv3_distance_ospfv3_inter_area(name, value)
        return self.add_set(path)

    def delete_vrf_ospfv3_distance_ospfv3_inter_area(self, name: str) -> "VrfOspfv3Mixin":
        """Delete OSPFv3 inter-area distance."""
        path = self.mappers["vrf_ospfv3"].get_ospfv3(name) + ["distance", "ospfv3", "inter-area"]
        return self.add_delete(path)

    def set_vrf_ospfv3_distance_ospfv3_intra_area(self, name: str, value: str) -> "VrfOspfv3Mixin":
        """Set OSPFv3 intra-area distance. Value is the distance."""
        path = self.mappers["vrf_ospfv3"].get_ospfv3_distance_ospfv3_intra_area(name, value)
        return self.add_set(path)

    def delete_vrf_ospfv3_distance_ospfv3_intra_area(self, name: str) -> "VrfOspfv3Mixin":
        """Delete OSPFv3 intra-area distance."""
        path = self.mappers["vrf_ospfv3"].get_ospfv3(name) + ["distance", "ospfv3", "intra-area"]
        return self.add_delete(path)

    # ========================================================================
    # Graceful Restart
    # ========================================================================

    def set_vrf_ospfv3_graceful_restart(self, name: str) -> "VrfOspfv3Mixin":
        """Enable graceful restart."""
        path = self.mappers["vrf_ospfv3"].get_ospfv3_graceful_restart(name)
        return self.add_set(path)

    def delete_vrf_ospfv3_graceful_restart(self, name: str) -> "VrfOspfv3Mixin":
        """Delete graceful restart configuration."""
        path = self.mappers["vrf_ospfv3"].get_ospfv3_graceful_restart(name)
        return self.add_delete(path)

    def set_vrf_ospfv3_graceful_restart_helper_enable(self, name: str) -> "VrfOspfv3Mixin":
        """Enable graceful restart helper."""
        path = self.mappers["vrf_ospfv3"].get_ospfv3_graceful_restart_helper_enable(name)
        return self.add_set(path)

    def delete_vrf_ospfv3_graceful_restart_helper_enable(self, name: str) -> "VrfOspfv3Mixin":
        """Delete graceful restart helper enable."""
        path = self.mappers["vrf_ospfv3"].get_ospfv3_graceful_restart_helper_enable(name)
        return self.add_delete(path)

    def set_vrf_ospfv3_graceful_restart_helper_planned_only(self, name: str) -> "VrfOspfv3Mixin":
        """Set graceful restart helper planned-only."""
        path = self.mappers["vrf_ospfv3"].get_ospfv3_graceful_restart_helper_planned_only(name)
        return self.add_set(path)

    def delete_vrf_ospfv3_graceful_restart_helper_planned_only(self, name: str) -> "VrfOspfv3Mixin":
        """Delete graceful restart helper planned-only."""
        path = self.mappers["vrf_ospfv3"].get_ospfv3_graceful_restart_helper_planned_only(name)
        return self.add_delete(path)

    def set_vrf_ospfv3_graceful_restart_helper_supported_grace_time(self, name: str, value: str) -> "VrfOspfv3Mixin":
        """Set graceful restart helper supported-grace-time. Value is the time in seconds."""
        path = self.mappers["vrf_ospfv3"].get_ospfv3_graceful_restart_helper_supported_grace_time(name, value)
        return self.add_set(path)

    def delete_vrf_ospfv3_graceful_restart_helper_supported_grace_time(self, name: str) -> "VrfOspfv3Mixin":
        """Delete graceful restart helper supported-grace-time."""
        path = self.mappers["vrf_ospfv3"].get_ospfv3(name) + ["graceful-restart", "helper", "supported-grace-time"]
        return self.add_delete(path)

    def set_vrf_ospfv3_graceful_restart_helper_lsa_check_disable(self, name: str) -> "VrfOspfv3Mixin":
        """Set graceful restart helper lsa-check-disable."""
        path = self.mappers["vrf_ospfv3"].get_ospfv3_graceful_restart_helper_lsa_check_disable(name)
        return self.add_set(path)

    def delete_vrf_ospfv3_graceful_restart_helper_lsa_check_disable(self, name: str) -> "VrfOspfv3Mixin":
        """Delete graceful restart helper lsa-check-disable."""
        path = self.mappers["vrf_ospfv3"].get_ospfv3_graceful_restart_helper_lsa_check_disable(name)
        return self.add_delete(path)

    # ========================================================================
    # Interface Operations
    # ========================================================================

    def set_vrf_ospfv3_interface(self, name: str, value: str) -> "VrfOspfv3Mixin":
        """Create an OSPFv3 interface. Value is the interface name."""
        path = self.mappers["vrf_ospfv3"].get_ospfv3_interface(name, value)
        return self.add_set(path)

    def delete_vrf_ospfv3_interface(self, name: str, value: str) -> "VrfOspfv3Mixin":
        """Delete an OSPFv3 interface. Value is the interface name."""
        path = self.mappers["vrf_ospfv3"].get_ospfv3_interface(name, value)
        return self.add_delete(path)

    def set_vrf_ospfv3_interface_area(self, name: str, value: str) -> "VrfOspfv3Mixin":
        """Set interface area. Value format: 'iface,area'."""
        parts = value.split(",", 1)
        if len(parts) == 2:
            path = self.mappers["vrf_ospfv3"].get_ospfv3_interface_area(name, parts[0], parts[1])
            return self.add_set(path)
        return self

    def delete_vrf_ospfv3_interface_area(self, name: str, value: str) -> "VrfOspfv3Mixin":
        """Delete interface area. Value is the interface name."""
        path = self.mappers["vrf_ospfv3"].get_ospfv3_interface(name, value) + ["area"]
        return self.add_delete(path)

    def set_vrf_ospfv3_interface_bfd(self, name: str, value: str) -> "VrfOspfv3Mixin":
        """Enable BFD on interface. Value is the interface name."""
        path = self.mappers["vrf_ospfv3"].get_ospfv3_interface_bfd(name, value)
        return self.add_set(path)

    def delete_vrf_ospfv3_interface_bfd(self, name: str, value: str) -> "VrfOspfv3Mixin":
        """Delete BFD on interface. Value is the interface name."""
        path = self.mappers["vrf_ospfv3"].get_ospfv3_interface_bfd(name, value)
        return self.add_delete(path)

    def set_vrf_ospfv3_interface_bfd_profile(self, name: str, value: str) -> "VrfOspfv3Mixin":
        """Set BFD profile on interface. Value format: 'iface,profile'."""
        parts = value.split(",", 1)
        if len(parts) == 2:
            path = self.mappers["vrf_ospfv3"].get_ospfv3_interface_bfd_profile(name, parts[0], parts[1])
            return self.add_set(path)
        return self

    def delete_vrf_ospfv3_interface_bfd_profile(self, name: str, value: str) -> "VrfOspfv3Mixin":
        """Delete BFD profile on interface. Value is the interface name."""
        path = self.mappers["vrf_ospfv3"].get_ospfv3_interface(name, value) + ["bfd", "profile"]
        return self.add_delete(path)

    def set_vrf_ospfv3_interface_cost(self, name: str, value: str) -> "VrfOspfv3Mixin":
        """Set interface cost. Value format: 'iface,cost'."""
        parts = value.split(",", 1)
        if len(parts) == 2:
            path = self.mappers["vrf_ospfv3"].get_ospfv3_interface_cost(name, parts[0], parts[1])
            return self.add_set(path)
        return self

    def delete_vrf_ospfv3_interface_cost(self, name: str, value: str) -> "VrfOspfv3Mixin":
        """Delete interface cost. Value is the interface name."""
        path = self.mappers["vrf_ospfv3"].get_ospfv3_interface(name, value) + ["cost"]
        return self.add_delete(path)

    def set_vrf_ospfv3_interface_dead_interval(self, name: str, value: str) -> "VrfOspfv3Mixin":
        """Set interface dead-interval. Value format: 'iface,interval'."""
        parts = value.split(",", 1)
        if len(parts) == 2:
            path = self.mappers["vrf_ospfv3"].get_ospfv3_interface_dead_interval(name, parts[0], parts[1])
            return self.add_set(path)
        return self

    def delete_vrf_ospfv3_interface_dead_interval(self, name: str, value: str) -> "VrfOspfv3Mixin":
        """Delete interface dead-interval. Value is the interface name."""
        path = self.mappers["vrf_ospfv3"].get_ospfv3_interface(name, value) + ["dead-interval"]
        return self.add_delete(path)

    def set_vrf_ospfv3_interface_hello_interval(self, name: str, value: str) -> "VrfOspfv3Mixin":
        """Set interface hello-interval. Value format: 'iface,interval'."""
        parts = value.split(",", 1)
        if len(parts) == 2:
            path = self.mappers["vrf_ospfv3"].get_ospfv3_interface_hello_interval(name, parts[0], parts[1])
            return self.add_set(path)
        return self

    def delete_vrf_ospfv3_interface_hello_interval(self, name: str, value: str) -> "VrfOspfv3Mixin":
        """Delete interface hello-interval. Value is the interface name."""
        path = self.mappers["vrf_ospfv3"].get_ospfv3_interface(name, value) + ["hello-interval"]
        return self.add_delete(path)

    def set_vrf_ospfv3_interface_ifmtu(self, name: str, value: str) -> "VrfOspfv3Mixin":
        """Set interface ifmtu. Value format: 'iface,mtu'."""
        parts = value.split(",", 1)
        if len(parts) == 2:
            path = self.mappers["vrf_ospfv3"].get_ospfv3_interface_ifmtu(name, parts[0], parts[1])
            return self.add_set(path)
        return self

    def delete_vrf_ospfv3_interface_ifmtu(self, name: str, value: str) -> "VrfOspfv3Mixin":
        """Delete interface ifmtu. Value is the interface name."""
        path = self.mappers["vrf_ospfv3"].get_ospfv3_interface(name, value) + ["ifmtu"]
        return self.add_delete(path)

    def set_vrf_ospfv3_interface_instance_id(self, name: str, value: str) -> "VrfOspfv3Mixin":
        """Set interface instance-id. Value format: 'iface,id'."""
        parts = value.split(",", 1)
        if len(parts) == 2:
            path = self.mappers["vrf_ospfv3"].get_ospfv3_interface_instance_id(name, parts[0], parts[1])
            return self.add_set(path)
        return self

    def delete_vrf_ospfv3_interface_instance_id(self, name: str, value: str) -> "VrfOspfv3Mixin":
        """Delete interface instance-id. Value is the interface name."""
        path = self.mappers["vrf_ospfv3"].get_ospfv3_interface(name, value) + ["instance-id"]
        return self.add_delete(path)

    def set_vrf_ospfv3_interface_mtu_ignore(self, name: str, value: str) -> "VrfOspfv3Mixin":
        """Set interface mtu-ignore. Value is the interface name."""
        path = self.mappers["vrf_ospfv3"].get_ospfv3_interface_mtu_ignore(name, value)
        return self.add_set(path)

    def delete_vrf_ospfv3_interface_mtu_ignore(self, name: str, value: str) -> "VrfOspfv3Mixin":
        """Delete interface mtu-ignore. Value is the interface name."""
        path = self.mappers["vrf_ospfv3"].get_ospfv3_interface_mtu_ignore(name, value)
        return self.add_delete(path)

    def set_vrf_ospfv3_interface_network(self, name: str, value: str) -> "VrfOspfv3Mixin":
        """Set interface network type. Value format: 'iface,network_type'."""
        parts = value.split(",", 1)
        if len(parts) == 2:
            path = self.mappers["vrf_ospfv3"].get_ospfv3_interface_network(name, parts[0], parts[1])
            return self.add_set(path)
        return self

    def delete_vrf_ospfv3_interface_network(self, name: str, value: str) -> "VrfOspfv3Mixin":
        """Delete interface network type. Value is the interface name."""
        path = self.mappers["vrf_ospfv3"].get_ospfv3_interface(name, value) + ["network"]
        return self.add_delete(path)

    def set_vrf_ospfv3_interface_passive(self, name: str, value: str) -> "VrfOspfv3Mixin":
        """Set interface passive. Value is the interface name."""
        path = self.mappers["vrf_ospfv3"].get_ospfv3_interface_passive(name, value)
        return self.add_set(path)

    def delete_vrf_ospfv3_interface_passive(self, name: str, value: str) -> "VrfOspfv3Mixin":
        """Delete interface passive. Value is the interface name."""
        path = self.mappers["vrf_ospfv3"].get_ospfv3_interface_passive(name, value)
        return self.add_delete(path)

    def set_vrf_ospfv3_interface_priority(self, name: str, value: str) -> "VrfOspfv3Mixin":
        """Set interface priority. Value format: 'iface,priority'."""
        parts = value.split(",", 1)
        if len(parts) == 2:
            path = self.mappers["vrf_ospfv3"].get_ospfv3_interface_priority(name, parts[0], parts[1])
            return self.add_set(path)
        return self

    def delete_vrf_ospfv3_interface_priority(self, name: str, value: str) -> "VrfOspfv3Mixin":
        """Delete interface priority. Value is the interface name."""
        path = self.mappers["vrf_ospfv3"].get_ospfv3_interface(name, value) + ["priority"]
        return self.add_delete(path)

    def set_vrf_ospfv3_interface_retransmit_interval(self, name: str, value: str) -> "VrfOspfv3Mixin":
        """Set interface retransmit-interval. Value format: 'iface,interval'."""
        parts = value.split(",", 1)
        if len(parts) == 2:
            path = self.mappers["vrf_ospfv3"].get_ospfv3_interface_retransmit_interval(name, parts[0], parts[1])
            return self.add_set(path)
        return self

    def delete_vrf_ospfv3_interface_retransmit_interval(self, name: str, value: str) -> "VrfOspfv3Mixin":
        """Delete interface retransmit-interval. Value is the interface name."""
        path = self.mappers["vrf_ospfv3"].get_ospfv3_interface(name, value) + ["retransmit-interval"]
        return self.add_delete(path)

    def set_vrf_ospfv3_interface_transmit_delay(self, name: str, value: str) -> "VrfOspfv3Mixin":
        """Set interface transmit-delay. Value format: 'iface,delay'."""
        parts = value.split(",", 1)
        if len(parts) == 2:
            path = self.mappers["vrf_ospfv3"].get_ospfv3_interface_transmit_delay(name, parts[0], parts[1])
            return self.add_set(path)
        return self

    def delete_vrf_ospfv3_interface_transmit_delay(self, name: str, value: str) -> "VrfOspfv3Mixin":
        """Delete interface transmit-delay. Value is the interface name."""
        path = self.mappers["vrf_ospfv3"].get_ospfv3_interface(name, value) + ["transmit-delay"]
        return self.add_delete(path)

    # ========================================================================
    # Log Adjacency Changes
    # ========================================================================

    def set_vrf_ospfv3_log_adjacency_changes(self, name: str) -> "VrfOspfv3Mixin":
        """Enable log-adjacency-changes."""
        path = self.mappers["vrf_ospfv3"].get_ospfv3_log_adjacency_changes(name)
        return self.add_set(path)

    def delete_vrf_ospfv3_log_adjacency_changes(self, name: str) -> "VrfOspfv3Mixin":
        """Delete log-adjacency-changes."""
        path = self.mappers["vrf_ospfv3"].get_ospfv3_log_adjacency_changes(name)
        return self.add_delete(path)

    def set_vrf_ospfv3_log_adjacency_changes_detail(self, name: str) -> "VrfOspfv3Mixin":
        """Enable log-adjacency-changes detail."""
        path = self.mappers["vrf_ospfv3"].get_ospfv3_log_adjacency_changes_detail(name)
        return self.add_set(path)

    def delete_vrf_ospfv3_log_adjacency_changes_detail(self, name: str) -> "VrfOspfv3Mixin":
        """Delete log-adjacency-changes detail."""
        path = self.mappers["vrf_ospfv3"].get_ospfv3_log_adjacency_changes_detail(name)
        return self.add_delete(path)

    # ========================================================================
    # Parameters
    # ========================================================================

    def set_vrf_ospfv3_parameters_router_id(self, name: str, value: str) -> "VrfOspfv3Mixin":
        """Set router-id. Value is the router ID."""
        path = self.mappers["vrf_ospfv3"].get_ospfv3_parameters_router_id(name, value)
        return self.add_set(path)

    def delete_vrf_ospfv3_parameters_router_id(self, name: str) -> "VrfOspfv3Mixin":
        """Delete router-id."""
        path = self.mappers["vrf_ospfv3"].get_ospfv3(name) + ["parameters", "router-id"]
        return self.add_delete(path)

    # ========================================================================
    # Redistribute
    # ========================================================================

    def set_vrf_ospfv3_redistribute(self, name: str, value: str) -> "VrfOspfv3Mixin":
        """Enable redistribution for a protocol. Value is the protocol name."""
        path = self.mappers["vrf_ospfv3"].get_ospfv3_redistribute(name, value)
        return self.add_set(path)

    def delete_vrf_ospfv3_redistribute(self, name: str, value: str) -> "VrfOspfv3Mixin":
        """Delete redistribution for a protocol. Value is the protocol name."""
        path = self.mappers["vrf_ospfv3"].get_ospfv3_redistribute(name, value)
        return self.add_delete(path)

    def set_vrf_ospfv3_redistribute_route_map(self, name: str, value: str) -> "VrfOspfv3Mixin":
        """Set redistribute route-map. Value format: 'protocol,route_map'."""
        parts = value.split(",", 1)
        if len(parts) == 2:
            path = self.mappers["vrf_ospfv3"].get_ospfv3_redistribute_route_map(name, parts[0], parts[1])
            return self.add_set(path)
        return self

    def delete_vrf_ospfv3_redistribute_route_map(self, name: str, value: str) -> "VrfOspfv3Mixin":
        """Delete redistribute route-map. Value is the protocol name."""
        path = self.mappers["vrf_ospfv3"].get_ospfv3_redistribute(name, value) + ["route-map"]
        return self.add_delete(path)

    # ========================================================================
    # Timers
    # ========================================================================

    def set_vrf_ospfv3_timers_throttle_spf_delay(self, name: str, value: str) -> "VrfOspfv3Mixin":
        """Set SPF delay timer. Value is the delay in milliseconds."""
        path = self.mappers["vrf_ospfv3"].get_ospfv3_timers_throttle_spf_delay(name, value)
        return self.add_set(path)

    def delete_vrf_ospfv3_timers_throttle_spf_delay(self, name: str) -> "VrfOspfv3Mixin":
        """Delete SPF delay timer."""
        path = self.mappers["vrf_ospfv3"].get_ospfv3(name) + ["timers", "throttle", "spf", "delay"]
        return self.add_delete(path)

    def set_vrf_ospfv3_timers_throttle_spf_initial_holdtime(self, name: str, value: str) -> "VrfOspfv3Mixin":
        """Set SPF initial-holdtime timer. Value is the time in milliseconds."""
        path = self.mappers["vrf_ospfv3"].get_ospfv3_timers_throttle_spf_initial_holdtime(name, value)
        return self.add_set(path)

    def delete_vrf_ospfv3_timers_throttle_spf_initial_holdtime(self, name: str) -> "VrfOspfv3Mixin":
        """Delete SPF initial-holdtime timer."""
        path = self.mappers["vrf_ospfv3"].get_ospfv3(name) + ["timers", "throttle", "spf", "initial-holdtime"]
        return self.add_delete(path)

    def set_vrf_ospfv3_timers_throttle_spf_max_holdtime(self, name: str, value: str) -> "VrfOspfv3Mixin":
        """Set SPF max-holdtime timer. Value is the time in milliseconds."""
        path = self.mappers["vrf_ospfv3"].get_ospfv3_timers_throttle_spf_max_holdtime(name, value)
        return self.add_set(path)

    def delete_vrf_ospfv3_timers_throttle_spf_max_holdtime(self, name: str) -> "VrfOspfv3Mixin":
        """Delete SPF max-holdtime timer."""
        path = self.mappers["vrf_ospfv3"].get_ospfv3(name) + ["timers", "throttle", "spf", "max-holdtime"]
        return self.add_delete(path)
