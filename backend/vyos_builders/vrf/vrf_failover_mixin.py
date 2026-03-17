"""
VRF Failover Builder Mixin

Provides batch operations for failover route configuration within VRF instances.
Mixed into VrfBatchBuilder to extend it with failover operations.
Failover is VyOS 1.5-only.

All multi-value parameters are passed as comma-separated strings in the `value`
argument. The expected format is documented in each method's docstring.
"""


class VrfFailoverMixin:
    """Mixin for VRF failover route builder operations."""

    # ========================================================================
    # Failover Route Operations
    # ========================================================================

    def set_vrf_failover_route(self, name: str, value: str) -> "VrfFailoverMixin":
        """Create a failover route. Value is the destination prefix."""
        path = self.mappers["vrf_failover"].get_failover_route(name, value)
        return self.add_set(path)

    def delete_vrf_failover_route(self, name: str, value: str) -> "VrfFailoverMixin":
        """Delete a failover route. Value is the destination prefix."""
        path = self.mappers["vrf_failover"].get_failover_route(name, value)
        return self.add_delete(path)

    # ========================================================================
    # DHCP-Interface Operations
    # ========================================================================

    def set_vrf_failover_route_dhcp_interface(self, name: str, value: str) -> "VrfFailoverMixin":
        """Value format: 'destination,interface'."""
        parts = value.split(",", 1)
        if len(parts) == 2:
            path = self.mappers["vrf_failover"].get_failover_route_dhcp_interface(
                name, parts[0], parts[1]
            )
            return self.add_set(path)
        return self

    def delete_vrf_failover_route_dhcp_interface(self, name: str, value: str) -> "VrfFailoverMixin":
        """Value format: 'destination,interface'."""
        parts = value.split(",", 1)
        if len(parts) == 2:
            path = self.mappers["vrf_failover"].get_failover_route_dhcp_interface(
                name, parts[0], parts[1]
            )
            return self.add_delete(path)
        return self

    # --- DHCP-Interface: check settings ---

    def set_vrf_failover_route_dhcp_interface_check_policy(
        self, name: str, value: str
    ) -> "VrfFailoverMixin":
        """Value format: 'destination,interface,policy'."""
        parts = value.split(",", 2)
        if len(parts) == 3:
            path = self.mappers["vrf_failover"].get_failover_route_dhcp_interface_check_policy(
                name, parts[0], parts[1], parts[2]
            )
            return self.add_set(path)
        return self

    def delete_vrf_failover_route_dhcp_interface_check_policy(
        self, name: str, value: str
    ) -> "VrfFailoverMixin":
        """Value format: 'destination,interface'."""
        parts = value.split(",", 1)
        if len(parts) == 2:
            path = self.mappers["vrf_failover"].get_failover_route_dhcp_interface(
                name, parts[0], parts[1]
            ) + ["check", "policy"]
            return self.add_delete(path)
        return self

    def set_vrf_failover_route_dhcp_interface_check_port(
        self, name: str, value: str
    ) -> "VrfFailoverMixin":
        """Value format: 'destination,interface,port'."""
        parts = value.split(",", 2)
        if len(parts) == 3:
            path = self.mappers["vrf_failover"].get_failover_route_dhcp_interface_check_port(
                name, parts[0], parts[1], parts[2]
            )
            return self.add_set(path)
        return self

    def delete_vrf_failover_route_dhcp_interface_check_port(
        self, name: str, value: str
    ) -> "VrfFailoverMixin":
        """Value format: 'destination,interface'."""
        parts = value.split(",", 1)
        if len(parts) == 2:
            path = self.mappers["vrf_failover"].get_failover_route_dhcp_interface(
                name, parts[0], parts[1]
            ) + ["check", "port"]
            return self.add_delete(path)
        return self

    def set_vrf_failover_route_dhcp_interface_check_target(
        self, name: str, value: str
    ) -> "VrfFailoverMixin":
        """Value format: 'destination,interface,target_address'."""
        parts = value.split(",", 2)
        if len(parts) == 3:
            path = self.mappers["vrf_failover"].get_failover_route_dhcp_interface_check_target(
                name, parts[0], parts[1], parts[2]
            )
            return self.add_set(path)
        return self

    def delete_vrf_failover_route_dhcp_interface_check_target(
        self, name: str, value: str
    ) -> "VrfFailoverMixin":
        """Value format: 'destination,interface,target_address'."""
        parts = value.split(",", 2)
        if len(parts) == 3:
            path = self.mappers["vrf_failover"].get_failover_route_dhcp_interface_check_target(
                name, parts[0], parts[1], parts[2]
            )
            return self.add_delete(path)
        return self

    def set_vrf_failover_route_dhcp_interface_check_target_interface(
        self, name: str, value: str
    ) -> "VrfFailoverMixin":
        """Value format: 'destination,interface,target_address,target_interface'."""
        parts = value.split(",", 3)
        if len(parts) == 4:
            path = self.mappers["vrf_failover"].get_failover_route_dhcp_interface_check_target_interface(
                name, parts[0], parts[1], parts[2], parts[3]
            )
            return self.add_set(path)
        return self

    def delete_vrf_failover_route_dhcp_interface_check_target_interface(
        self, name: str, value: str
    ) -> "VrfFailoverMixin":
        """Value format: 'destination,interface,target_address'."""
        parts = value.split(",", 2)
        if len(parts) == 3:
            path = self.mappers["vrf_failover"].get_failover_route_dhcp_interface_check_target(
                name, parts[0], parts[1], parts[2]
            ) + ["interface"]
            return self.add_delete(path)
        return self

    def set_vrf_failover_route_dhcp_interface_check_target_vrf(
        self, name: str, value: str
    ) -> "VrfFailoverMixin":
        """Value format: 'destination,interface,target_address,vrf_name'."""
        parts = value.split(",", 3)
        if len(parts) == 4:
            path = self.mappers["vrf_failover"].get_failover_route_dhcp_interface_check_target_vrf(
                name, parts[0], parts[1], parts[2], parts[3]
            )
            return self.add_set(path)
        return self

    def delete_vrf_failover_route_dhcp_interface_check_target_vrf(
        self, name: str, value: str
    ) -> "VrfFailoverMixin":
        """Value format: 'destination,interface,target_address'."""
        parts = value.split(",", 2)
        if len(parts) == 3:
            path = self.mappers["vrf_failover"].get_failover_route_dhcp_interface_check_target(
                name, parts[0], parts[1], parts[2]
            ) + ["vrf"]
            return self.add_delete(path)
        return self

    def set_vrf_failover_route_dhcp_interface_check_timeout(
        self, name: str, value: str
    ) -> "VrfFailoverMixin":
        """Value format: 'destination,interface,timeout'."""
        parts = value.split(",", 2)
        if len(parts) == 3:
            path = self.mappers["vrf_failover"].get_failover_route_dhcp_interface_check_timeout(
                name, parts[0], parts[1], parts[2]
            )
            return self.add_set(path)
        return self

    def delete_vrf_failover_route_dhcp_interface_check_timeout(
        self, name: str, value: str
    ) -> "VrfFailoverMixin":
        """Value format: 'destination,interface'."""
        parts = value.split(",", 1)
        if len(parts) == 2:
            path = self.mappers["vrf_failover"].get_failover_route_dhcp_interface(
                name, parts[0], parts[1]
            ) + ["check", "timeout"]
            return self.add_delete(path)
        return self

    def set_vrf_failover_route_dhcp_interface_check_type(
        self, name: str, value: str
    ) -> "VrfFailoverMixin":
        """Value format: 'destination,interface,type'."""
        parts = value.split(",", 2)
        if len(parts) == 3:
            path = self.mappers["vrf_failover"].get_failover_route_dhcp_interface_check_type(
                name, parts[0], parts[1], parts[2]
            )
            return self.add_set(path)
        return self

    def delete_vrf_failover_route_dhcp_interface_check_type(
        self, name: str, value: str
    ) -> "VrfFailoverMixin":
        """Value format: 'destination,interface'."""
        parts = value.split(",", 1)
        if len(parts) == 2:
            path = self.mappers["vrf_failover"].get_failover_route_dhcp_interface(
                name, parts[0], parts[1]
            ) + ["check", "type"]
            return self.add_delete(path)
        return self

    # --- DHCP-Interface: direct settings ---

    def set_vrf_failover_route_dhcp_interface_interface(
        self, name: str, value: str
    ) -> "VrfFailoverMixin":
        """Value format: 'destination,dhcp_interface,bound_interface'."""
        parts = value.split(",", 2)
        if len(parts) == 3:
            path = self.mappers["vrf_failover"].get_failover_route_dhcp_interface_interface(
                name, parts[0], parts[1], parts[2]
            )
            return self.add_set(path)
        return self

    def delete_vrf_failover_route_dhcp_interface_interface(
        self, name: str, value: str
    ) -> "VrfFailoverMixin":
        """Value format: 'destination,dhcp_interface'."""
        parts = value.split(",", 1)
        if len(parts) == 2:
            path = self.mappers["vrf_failover"].get_failover_route_dhcp_interface(
                name, parts[0], parts[1]
            ) + ["interface"]
            return self.add_delete(path)
        return self

    def set_vrf_failover_route_dhcp_interface_metric(
        self, name: str, value: str
    ) -> "VrfFailoverMixin":
        """Value format: 'destination,interface,metric'."""
        parts = value.split(",", 2)
        if len(parts) == 3:
            path = self.mappers["vrf_failover"].get_failover_route_dhcp_interface_metric(
                name, parts[0], parts[1], parts[2]
            )
            return self.add_set(path)
        return self

    def delete_vrf_failover_route_dhcp_interface_metric(
        self, name: str, value: str
    ) -> "VrfFailoverMixin":
        """Value format: 'destination,interface'."""
        parts = value.split(",", 1)
        if len(parts) == 2:
            path = self.mappers["vrf_failover"].get_failover_route_dhcp_interface(
                name, parts[0], parts[1]
            ) + ["metric"]
            return self.add_delete(path)
        return self

    def set_vrf_failover_route_dhcp_interface_onlink(
        self, name: str, value: str
    ) -> "VrfFailoverMixin":
        """Value format: 'destination,interface'."""
        parts = value.split(",", 1)
        if len(parts) == 2:
            path = self.mappers["vrf_failover"].get_failover_route_dhcp_interface_onlink(
                name, parts[0], parts[1]
            )
            return self.add_set(path)
        return self

    def delete_vrf_failover_route_dhcp_interface_onlink(
        self, name: str, value: str
    ) -> "VrfFailoverMixin":
        """Value format: 'destination,interface'."""
        parts = value.split(",", 1)
        if len(parts) == 2:
            path = self.mappers["vrf_failover"].get_failover_route_dhcp_interface_onlink(
                name, parts[0], parts[1]
            )
            return self.add_delete(path)
        return self

    # ========================================================================
    # Next-Hop Operations
    # ========================================================================

    def set_vrf_failover_route_next_hop(self, name: str, value: str) -> "VrfFailoverMixin":
        """Value format: 'destination,next_hop'."""
        parts = value.split(",", 1)
        if len(parts) == 2:
            path = self.mappers["vrf_failover"].get_failover_route_next_hop(
                name, parts[0], parts[1]
            )
            return self.add_set(path)
        return self

    def delete_vrf_failover_route_next_hop(self, name: str, value: str) -> "VrfFailoverMixin":
        """Value format: 'destination,next_hop'."""
        parts = value.split(",", 1)
        if len(parts) == 2:
            path = self.mappers["vrf_failover"].get_failover_route_next_hop(
                name, parts[0], parts[1]
            )
            return self.add_delete(path)
        return self

    # --- Next-Hop: check settings ---

    def set_vrf_failover_route_next_hop_check_policy(
        self, name: str, value: str
    ) -> "VrfFailoverMixin":
        """Value format: 'destination,next_hop,policy'."""
        parts = value.split(",", 2)
        if len(parts) == 3:
            path = self.mappers["vrf_failover"].get_failover_route_next_hop_check_policy(
                name, parts[0], parts[1], parts[2]
            )
            return self.add_set(path)
        return self

    def delete_vrf_failover_route_next_hop_check_policy(
        self, name: str, value: str
    ) -> "VrfFailoverMixin":
        """Value format: 'destination,next_hop'."""
        parts = value.split(",", 1)
        if len(parts) == 2:
            path = self.mappers["vrf_failover"].get_failover_route_next_hop(
                name, parts[0], parts[1]
            ) + ["check", "policy"]
            return self.add_delete(path)
        return self

    def set_vrf_failover_route_next_hop_check_port(
        self, name: str, value: str
    ) -> "VrfFailoverMixin":
        """Value format: 'destination,next_hop,port'."""
        parts = value.split(",", 2)
        if len(parts) == 3:
            path = self.mappers["vrf_failover"].get_failover_route_next_hop_check_port(
                name, parts[0], parts[1], parts[2]
            )
            return self.add_set(path)
        return self

    def delete_vrf_failover_route_next_hop_check_port(
        self, name: str, value: str
    ) -> "VrfFailoverMixin":
        """Value format: 'destination,next_hop'."""
        parts = value.split(",", 1)
        if len(parts) == 2:
            path = self.mappers["vrf_failover"].get_failover_route_next_hop(
                name, parts[0], parts[1]
            ) + ["check", "port"]
            return self.add_delete(path)
        return self

    def set_vrf_failover_route_next_hop_check_target(
        self, name: str, value: str
    ) -> "VrfFailoverMixin":
        """Value format: 'destination,next_hop,target_address'."""
        parts = value.split(",", 2)
        if len(parts) == 3:
            path = self.mappers["vrf_failover"].get_failover_route_next_hop_check_target(
                name, parts[0], parts[1], parts[2]
            )
            return self.add_set(path)
        return self

    def delete_vrf_failover_route_next_hop_check_target(
        self, name: str, value: str
    ) -> "VrfFailoverMixin":
        """Value format: 'destination,next_hop,target_address'."""
        parts = value.split(",", 2)
        if len(parts) == 3:
            path = self.mappers["vrf_failover"].get_failover_route_next_hop_check_target(
                name, parts[0], parts[1], parts[2]
            )
            return self.add_delete(path)
        return self

    def set_vrf_failover_route_next_hop_check_target_interface(
        self, name: str, value: str
    ) -> "VrfFailoverMixin":
        """Value format: 'destination,next_hop,target_address,target_interface'."""
        parts = value.split(",", 3)
        if len(parts) == 4:
            path = self.mappers["vrf_failover"].get_failover_route_next_hop_check_target_interface(
                name, parts[0], parts[1], parts[2], parts[3]
            )
            return self.add_set(path)
        return self

    def delete_vrf_failover_route_next_hop_check_target_interface(
        self, name: str, value: str
    ) -> "VrfFailoverMixin":
        """Value format: 'destination,next_hop,target_address'."""
        parts = value.split(",", 2)
        if len(parts) == 3:
            path = self.mappers["vrf_failover"].get_failover_route_next_hop_check_target(
                name, parts[0], parts[1], parts[2]
            ) + ["interface"]
            return self.add_delete(path)
        return self

    def set_vrf_failover_route_next_hop_check_target_vrf(
        self, name: str, value: str
    ) -> "VrfFailoverMixin":
        """Value format: 'destination,next_hop,target_address,vrf_name'."""
        parts = value.split(",", 3)
        if len(parts) == 4:
            path = self.mappers["vrf_failover"].get_failover_route_next_hop_check_target_vrf(
                name, parts[0], parts[1], parts[2], parts[3]
            )
            return self.add_set(path)
        return self

    def delete_vrf_failover_route_next_hop_check_target_vrf(
        self, name: str, value: str
    ) -> "VrfFailoverMixin":
        """Value format: 'destination,next_hop,target_address'."""
        parts = value.split(",", 2)
        if len(parts) == 3:
            path = self.mappers["vrf_failover"].get_failover_route_next_hop_check_target(
                name, parts[0], parts[1], parts[2]
            ) + ["vrf"]
            return self.add_delete(path)
        return self

    def set_vrf_failover_route_next_hop_check_timeout(
        self, name: str, value: str
    ) -> "VrfFailoverMixin":
        """Value format: 'destination,next_hop,timeout'."""
        parts = value.split(",", 2)
        if len(parts) == 3:
            path = self.mappers["vrf_failover"].get_failover_route_next_hop_check_timeout(
                name, parts[0], parts[1], parts[2]
            )
            return self.add_set(path)
        return self

    def delete_vrf_failover_route_next_hop_check_timeout(
        self, name: str, value: str
    ) -> "VrfFailoverMixin":
        """Value format: 'destination,next_hop'."""
        parts = value.split(",", 1)
        if len(parts) == 2:
            path = self.mappers["vrf_failover"].get_failover_route_next_hop(
                name, parts[0], parts[1]
            ) + ["check", "timeout"]
            return self.add_delete(path)
        return self

    def set_vrf_failover_route_next_hop_check_type(
        self, name: str, value: str
    ) -> "VrfFailoverMixin":
        """Value format: 'destination,next_hop,type'."""
        parts = value.split(",", 2)
        if len(parts) == 3:
            path = self.mappers["vrf_failover"].get_failover_route_next_hop_check_type(
                name, parts[0], parts[1], parts[2]
            )
            return self.add_set(path)
        return self

    def delete_vrf_failover_route_next_hop_check_type(
        self, name: str, value: str
    ) -> "VrfFailoverMixin":
        """Value format: 'destination,next_hop'."""
        parts = value.split(",", 1)
        if len(parts) == 2:
            path = self.mappers["vrf_failover"].get_failover_route_next_hop(
                name, parts[0], parts[1]
            ) + ["check", "type"]
            return self.add_delete(path)
        return self

    # --- Next-Hop: direct settings ---

    def set_vrf_failover_route_next_hop_interface(
        self, name: str, value: str
    ) -> "VrfFailoverMixin":
        """Value format: 'destination,next_hop,interface'."""
        parts = value.split(",", 2)
        if len(parts) == 3:
            path = self.mappers["vrf_failover"].get_failover_route_next_hop_interface(
                name, parts[0], parts[1], parts[2]
            )
            return self.add_set(path)
        return self

    def delete_vrf_failover_route_next_hop_interface(
        self, name: str, value: str
    ) -> "VrfFailoverMixin":
        """Value format: 'destination,next_hop'."""
        parts = value.split(",", 1)
        if len(parts) == 2:
            path = self.mappers["vrf_failover"].get_failover_route_next_hop(
                name, parts[0], parts[1]
            ) + ["interface"]
            return self.add_delete(path)
        return self

    def set_vrf_failover_route_next_hop_metric(
        self, name: str, value: str
    ) -> "VrfFailoverMixin":
        """Value format: 'destination,next_hop,metric'."""
        parts = value.split(",", 2)
        if len(parts) == 3:
            path = self.mappers["vrf_failover"].get_failover_route_next_hop_metric(
                name, parts[0], parts[1], parts[2]
            )
            return self.add_set(path)
        return self

    def delete_vrf_failover_route_next_hop_metric(
        self, name: str, value: str
    ) -> "VrfFailoverMixin":
        """Value format: 'destination,next_hop'."""
        parts = value.split(",", 1)
        if len(parts) == 2:
            path = self.mappers["vrf_failover"].get_failover_route_next_hop(
                name, parts[0], parts[1]
            ) + ["metric"]
            return self.add_delete(path)
        return self

    def set_vrf_failover_route_next_hop_onlink(
        self, name: str, value: str
    ) -> "VrfFailoverMixin":
        """Value format: 'destination,next_hop'."""
        parts = value.split(",", 1)
        if len(parts) == 2:
            path = self.mappers["vrf_failover"].get_failover_route_next_hop_onlink(
                name, parts[0], parts[1]
            )
            return self.add_set(path)
        return self

    def delete_vrf_failover_route_next_hop_onlink(
        self, name: str, value: str
    ) -> "VrfFailoverMixin":
        """Value format: 'destination,next_hop'."""
        parts = value.split(",", 1)
        if len(parts) == 2:
            path = self.mappers["vrf_failover"].get_failover_route_next_hop_onlink(
                name, parts[0], parts[1]
            )
            return self.add_delete(path)
        return self

    # ========================================================================
    # Delete entire failover config
    # ========================================================================

    def delete_vrf_failover(self, name: str) -> "VrfFailoverMixin":
        """Delete all failover routes for a VRF."""
        path = self.mappers["vrf_failover"]._base(name)
        return self.add_delete(path)
