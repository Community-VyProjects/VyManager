"""
VRF Static Routes Builder Mixin

Provides batch operations for static route configuration within VRF instances.
Mixed into VrfBatchBuilder to extend it with static route operations.
"""


class VrfStaticMixin:
    """Mixin for VRF static route builder operations."""

    # ========================================================================
    # IPv4 Route Operations
    # ========================================================================

    def set_vrf_static_route(self, name: str, value: str) -> "VrfStaticMixin":
        path = self.mappers["vrf_static"].get_static_route(name, value)
        return self.add_set(path)

    def delete_vrf_static_route(self, name: str, value: str) -> "VrfStaticMixin":
        path = self.mappers["vrf_static"].get_static_route(name, value)
        return self.add_delete(path)

    def set_vrf_static_route_description(self, name: str, value: str) -> "VrfStaticMixin":
        """Value format: 'destination,description'."""
        parts = value.split(",", 1)
        if len(parts) == 2:
            path = self.mappers["vrf_static"].get_static_route_description(name, parts[0], parts[1])
            return self.add_set(path)
        return self

    def delete_vrf_static_route_description(self, name: str, value: str) -> "VrfStaticMixin":
        """Value is the destination."""
        path = self.mappers["vrf_static"].get_static_route(name, value) + ["description"]
        return self.add_delete(path)

    def set_vrf_static_route_dhcp_interface(self, name: str, value: str) -> "VrfStaticMixin":
        """Value format: 'destination,interface'."""
        parts = value.split(",", 1)
        if len(parts) == 2:
            path = self.mappers["vrf_static"].get_static_route_dhcp_interface(name, parts[0], parts[1])
            return self.add_set(path)
        return self

    def delete_vrf_static_route_dhcp_interface(self, name: str, value: str) -> "VrfStaticMixin":
        """Value is the destination."""
        path = self.mappers["vrf_static"].get_static_route(name, value) + ["dhcp-interface"]
        return self.add_delete(path)

    # --- Next-hop ---

    def set_vrf_static_route_next_hop(self, name: str, value: str) -> "VrfStaticMixin":
        """Value format: 'destination,next_hop'."""
        parts = value.split(",", 1)
        if len(parts) == 2:
            path = self.mappers["vrf_static"].get_static_route_next_hop(name, parts[0], parts[1])
            return self.add_set(path)
        return self

    def delete_vrf_static_route_next_hop(self, name: str, value: str) -> "VrfStaticMixin":
        """Value format: 'destination,next_hop'."""
        parts = value.split(",", 1)
        if len(parts) == 2:
            path = self.mappers["vrf_static"].get_static_route_next_hop(name, parts[0], parts[1])
            return self.add_delete(path)
        return self

    def set_vrf_static_route_next_hop_disable(self, name: str, value: str) -> "VrfStaticMixin":
        """Value format: 'destination,next_hop'."""
        parts = value.split(",", 1)
        if len(parts) == 2:
            path = self.mappers["vrf_static"].get_static_route_next_hop_disable(name, parts[0], parts[1])
            return self.add_set(path)
        return self

    def delete_vrf_static_route_next_hop_disable(self, name: str, value: str) -> "VrfStaticMixin":
        """Value format: 'destination,next_hop'."""
        parts = value.split(",", 1)
        if len(parts) == 2:
            path = self.mappers["vrf_static"].get_static_route_next_hop_disable(name, parts[0], parts[1])
            return self.add_delete(path)
        return self

    def set_vrf_static_route_next_hop_distance(self, name: str, value: str) -> "VrfStaticMixin":
        """Value format: 'destination,next_hop,distance'."""
        parts = value.split(",", 2)
        if len(parts) == 3:
            path = self.mappers["vrf_static"].get_static_route_next_hop_distance(name, parts[0], parts[1], parts[2])
            return self.add_set(path)
        return self

    def delete_vrf_static_route_next_hop_distance(self, name: str, value: str) -> "VrfStaticMixin":
        """Value format: 'destination,next_hop'."""
        parts = value.split(",", 1)
        if len(parts) == 2:
            path = self.mappers["vrf_static"].get_static_route_next_hop(name, parts[0], parts[1]) + ["distance"]
            return self.add_delete(path)
        return self

    def set_vrf_static_route_next_hop_interface(self, name: str, value: str) -> "VrfStaticMixin":
        """Value format: 'destination,next_hop,interface'."""
        parts = value.split(",", 2)
        if len(parts) == 3:
            path = self.mappers["vrf_static"].get_static_route_next_hop_interface(name, parts[0], parts[1], parts[2])
            return self.add_set(path)
        return self

    def delete_vrf_static_route_next_hop_interface(self, name: str, value: str) -> "VrfStaticMixin":
        """Value format: 'destination,next_hop'."""
        parts = value.split(",", 1)
        if len(parts) == 2:
            path = self.mappers["vrf_static"].get_static_route_next_hop(name, parts[0], parts[1]) + ["interface"]
            return self.add_delete(path)
        return self

    def set_vrf_static_route_next_hop_vrf(self, name: str, value: str) -> "VrfStaticMixin":
        """Value format: 'destination,next_hop,vrf'."""
        parts = value.split(",", 2)
        if len(parts) == 3:
            path = self.mappers["vrf_static"].get_static_route_next_hop_vrf(name, parts[0], parts[1], parts[2])
            return self.add_set(path)
        return self

    def delete_vrf_static_route_next_hop_vrf(self, name: str, value: str) -> "VrfStaticMixin":
        """Value format: 'destination,next_hop'."""
        parts = value.split(",", 1)
        if len(parts) == 2:
            path = self.mappers["vrf_static"].get_static_route_next_hop(name, parts[0], parts[1]) + ["vrf"]
            return self.add_delete(path)
        return self

    def set_vrf_static_route_next_hop_bfd_profile(self, name: str, value: str) -> "VrfStaticMixin":
        """Value format: 'destination,next_hop,profile'."""
        parts = value.split(",", 2)
        if len(parts) == 3:
            path = self.mappers["vrf_static"].get_static_route_next_hop_bfd_profile(name, parts[0], parts[1], parts[2])
            return self.add_set(path)
        return self

    def delete_vrf_static_route_next_hop_bfd_profile(self, name: str, value: str) -> "VrfStaticMixin":
        """Value format: 'destination,next_hop'."""
        parts = value.split(",", 1)
        if len(parts) == 2:
            path = self.mappers["vrf_static"].get_static_route_next_hop(name, parts[0], parts[1]) + ["bfd", "profile"]
            return self.add_delete(path)
        return self

    def set_vrf_static_route_next_hop_bfd_multi_hop_source(self, name: str, value: str) -> "VrfStaticMixin":
        """Value format: 'destination,next_hop,source'. Version-aware via mapper."""
        parts = value.split(",", 2)
        if len(parts) == 3:
            path = self.mappers["vrf_static"].get_static_route_next_hop_bfd_multi_hop_source(name, parts[0], parts[1], parts[2])
            return self.add_set(path)
        return self

    def delete_vrf_static_route_next_hop_bfd_multi_hop_source(self, name: str, value: str) -> "VrfStaticMixin":
        """Value format: 'destination,next_hop'. Version-aware via mapper."""
        parts = value.split(",", 1)
        if len(parts) == 2:
            path = self.mappers["vrf_static"].get_static_route_next_hop_bfd_multi_hop_source_delete(name, parts[0], parts[1])
            return self.add_delete(path)
        return self

    def set_vrf_static_route_next_hop_segments(self, name: str, value: str) -> "VrfStaticMixin":
        """Value format: 'destination,next_hop,segments'. VyOS 1.5 only for IPv4."""
        parts = value.split(",", 2)
        if len(parts) == 3:
            path = self.mappers["vrf_static"].get_static_route_next_hop_segments(name, parts[0], parts[1], parts[2])
            return self.add_set(path)
        return self

    def delete_vrf_static_route_next_hop_segments(self, name: str, value: str) -> "VrfStaticMixin":
        """Value format: 'destination,next_hop'."""
        parts = value.split(",", 1)
        if len(parts) == 2:
            path = self.mappers["vrf_static"].get_static_route_next_hop(name, parts[0], parts[1]) + ["segments"]
            return self.add_delete(path)
        return self

    # --- Interface route ---

    def set_vrf_static_route_interface(self, name: str, value: str) -> "VrfStaticMixin":
        """Value format: 'destination,interface'."""
        parts = value.split(",", 1)
        if len(parts) == 2:
            path = self.mappers["vrf_static"].get_static_route_interface(name, parts[0], parts[1])
            return self.add_set(path)
        return self

    def delete_vrf_static_route_interface(self, name: str, value: str) -> "VrfStaticMixin":
        """Value format: 'destination,interface'."""
        parts = value.split(",", 1)
        if len(parts) == 2:
            path = self.mappers["vrf_static"].get_static_route_interface(name, parts[0], parts[1])
            return self.add_delete(path)
        return self

    def set_vrf_static_route_interface_disable(self, name: str, value: str) -> "VrfStaticMixin":
        """Value format: 'destination,interface'."""
        parts = value.split(",", 1)
        if len(parts) == 2:
            path = self.mappers["vrf_static"].get_static_route_interface_disable(name, parts[0], parts[1])
            return self.add_set(path)
        return self

    def delete_vrf_static_route_interface_disable(self, name: str, value: str) -> "VrfStaticMixin":
        """Value format: 'destination,interface'."""
        parts = value.split(",", 1)
        if len(parts) == 2:
            path = self.mappers["vrf_static"].get_static_route_interface_disable(name, parts[0], parts[1])
            return self.add_delete(path)
        return self

    def set_vrf_static_route_interface_distance(self, name: str, value: str) -> "VrfStaticMixin":
        """Value format: 'destination,interface,distance'."""
        parts = value.split(",", 2)
        if len(parts) == 3:
            path = self.mappers["vrf_static"].get_static_route_interface_distance(name, parts[0], parts[1], parts[2])
            return self.add_set(path)
        return self

    def delete_vrf_static_route_interface_distance(self, name: str, value: str) -> "VrfStaticMixin":
        """Value format: 'destination,interface'."""
        parts = value.split(",", 1)
        if len(parts) == 2:
            path = self.mappers["vrf_static"].get_static_route_interface(name, parts[0], parts[1]) + ["distance"]
            return self.add_delete(path)
        return self

    def set_vrf_static_route_interface_vrf(self, name: str, value: str) -> "VrfStaticMixin":
        """Value format: 'destination,interface,vrf'."""
        parts = value.split(",", 2)
        if len(parts) == 3:
            path = self.mappers["vrf_static"].get_static_route_interface_vrf(name, parts[0], parts[1], parts[2])
            return self.add_set(path)
        return self

    def delete_vrf_static_route_interface_vrf(self, name: str, value: str) -> "VrfStaticMixin":
        """Value format: 'destination,interface'."""
        parts = value.split(",", 1)
        if len(parts) == 2:
            path = self.mappers["vrf_static"].get_static_route_interface(name, parts[0], parts[1]) + ["vrf"]
            return self.add_delete(path)
        return self

    def set_vrf_static_route_interface_segments(self, name: str, value: str) -> "VrfStaticMixin":
        """Value format: 'destination,interface,segments'."""
        parts = value.split(",", 2)
        if len(parts) == 3:
            path = self.mappers["vrf_static"].get_static_route_interface_segments(name, parts[0], parts[1], parts[2])
            return self.add_set(path)
        return self

    def delete_vrf_static_route_interface_segments(self, name: str, value: str) -> "VrfStaticMixin":
        """Value format: 'destination,interface'."""
        parts = value.split(",", 1)
        if len(parts) == 2:
            path = self.mappers["vrf_static"].get_static_route_interface(name, parts[0], parts[1]) + ["segments"]
            return self.add_delete(path)
        return self

    # --- Blackhole ---

    def set_vrf_static_route_blackhole(self, name: str, value: str) -> "VrfStaticMixin":
        path = self.mappers["vrf_static"].get_static_route_blackhole(name, value)
        return self.add_set(path)

    def delete_vrf_static_route_blackhole(self, name: str, value: str) -> "VrfStaticMixin":
        path = self.mappers["vrf_static"].get_static_route_blackhole(name, value)
        return self.add_delete(path)

    def set_vrf_static_route_blackhole_distance(self, name: str, value: str) -> "VrfStaticMixin":
        """Value format: 'destination,distance'."""
        parts = value.split(",", 1)
        if len(parts) == 2:
            path = self.mappers["vrf_static"].get_static_route_blackhole_distance(name, parts[0], parts[1])
            return self.add_set(path)
        return self

    def delete_vrf_static_route_blackhole_distance(self, name: str, value: str) -> "VrfStaticMixin":
        path = self.mappers["vrf_static"].get_static_route_blackhole(name, value) + ["distance"]
        return self.add_delete(path)

    def set_vrf_static_route_blackhole_tag(self, name: str, value: str) -> "VrfStaticMixin":
        """Value format: 'destination,tag'."""
        parts = value.split(",", 1)
        if len(parts) == 2:
            path = self.mappers["vrf_static"].get_static_route_blackhole_tag(name, parts[0], parts[1])
            return self.add_set(path)
        return self

    def delete_vrf_static_route_blackhole_tag(self, name: str, value: str) -> "VrfStaticMixin":
        path = self.mappers["vrf_static"].get_static_route_blackhole(name, value) + ["tag"]
        return self.add_delete(path)

    # --- Reject ---

    def set_vrf_static_route_reject(self, name: str, value: str) -> "VrfStaticMixin":
        path = self.mappers["vrf_static"].get_static_route_reject(name, value)
        return self.add_set(path)

    def delete_vrf_static_route_reject(self, name: str, value: str) -> "VrfStaticMixin":
        path = self.mappers["vrf_static"].get_static_route_reject(name, value)
        return self.add_delete(path)

    def set_vrf_static_route_reject_distance(self, name: str, value: str) -> "VrfStaticMixin":
        """Value format: 'destination,distance'."""
        parts = value.split(",", 1)
        if len(parts) == 2:
            path = self.mappers["vrf_static"].get_static_route_reject_distance(name, parts[0], parts[1])
            return self.add_set(path)
        return self

    def delete_vrf_static_route_reject_distance(self, name: str, value: str) -> "VrfStaticMixin":
        path = self.mappers["vrf_static"].get_static_route_reject(name, value) + ["distance"]
        return self.add_delete(path)

    def set_vrf_static_route_reject_tag(self, name: str, value: str) -> "VrfStaticMixin":
        """Value format: 'destination,tag'."""
        parts = value.split(",", 1)
        if len(parts) == 2:
            path = self.mappers["vrf_static"].get_static_route_reject_tag(name, parts[0], parts[1])
            return self.add_set(path)
        return self

    def delete_vrf_static_route_reject_tag(self, name: str, value: str) -> "VrfStaticMixin":
        path = self.mappers["vrf_static"].get_static_route_reject(name, value) + ["tag"]
        return self.add_delete(path)

    # ========================================================================
    # IPv6 Route Operations
    # ========================================================================

    def set_vrf_static_route6(self, name: str, value: str) -> "VrfStaticMixin":
        path = self.mappers["vrf_static"].get_static_route6(name, value)
        return self.add_set(path)

    def delete_vrf_static_route6(self, name: str, value: str) -> "VrfStaticMixin":
        path = self.mappers["vrf_static"].get_static_route6(name, value)
        return self.add_delete(path)

    def set_vrf_static_route6_description(self, name: str, value: str) -> "VrfStaticMixin":
        """Value format: 'destination,description'."""
        parts = value.split(",", 1)
        if len(parts) == 2:
            path = self.mappers["vrf_static"].get_static_route6_description(name, parts[0], parts[1])
            return self.add_set(path)
        return self

    def delete_vrf_static_route6_description(self, name: str, value: str) -> "VrfStaticMixin":
        path = self.mappers["vrf_static"].get_static_route6(name, value) + ["description"]
        return self.add_delete(path)

    # --- Next-hop ---

    def set_vrf_static_route6_next_hop(self, name: str, value: str) -> "VrfStaticMixin":
        """Value format: 'destination,next_hop'."""
        parts = value.split(",", 1)
        if len(parts) == 2:
            path = self.mappers["vrf_static"].get_static_route6_next_hop(name, parts[0], parts[1])
            return self.add_set(path)
        return self

    def delete_vrf_static_route6_next_hop(self, name: str, value: str) -> "VrfStaticMixin":
        """Value format: 'destination,next_hop'."""
        parts = value.split(",", 1)
        if len(parts) == 2:
            path = self.mappers["vrf_static"].get_static_route6_next_hop(name, parts[0], parts[1])
            return self.add_delete(path)
        return self

    def set_vrf_static_route6_next_hop_disable(self, name: str, value: str) -> "VrfStaticMixin":
        """Value format: 'destination,next_hop'."""
        parts = value.split(",", 1)
        if len(parts) == 2:
            path = self.mappers["vrf_static"].get_static_route6_next_hop_disable(name, parts[0], parts[1])
            return self.add_set(path)
        return self

    def delete_vrf_static_route6_next_hop_disable(self, name: str, value: str) -> "VrfStaticMixin":
        """Value format: 'destination,next_hop'."""
        parts = value.split(",", 1)
        if len(parts) == 2:
            path = self.mappers["vrf_static"].get_static_route6_next_hop_disable(name, parts[0], parts[1])
            return self.add_delete(path)
        return self

    def set_vrf_static_route6_next_hop_distance(self, name: str, value: str) -> "VrfStaticMixin":
        """Value format: 'destination,next_hop,distance'."""
        parts = value.split(",", 2)
        if len(parts) == 3:
            path = self.mappers["vrf_static"].get_static_route6_next_hop_distance(name, parts[0], parts[1], parts[2])
            return self.add_set(path)
        return self

    def delete_vrf_static_route6_next_hop_distance(self, name: str, value: str) -> "VrfStaticMixin":
        """Value format: 'destination,next_hop'."""
        parts = value.split(",", 1)
        if len(parts) == 2:
            path = self.mappers["vrf_static"].get_static_route6_next_hop(name, parts[0], parts[1]) + ["distance"]
            return self.add_delete(path)
        return self

    def set_vrf_static_route6_next_hop_interface(self, name: str, value: str) -> "VrfStaticMixin":
        """Value format: 'destination,next_hop,interface'."""
        parts = value.split(",", 2)
        if len(parts) == 3:
            path = self.mappers["vrf_static"].get_static_route6_next_hop_interface(name, parts[0], parts[1], parts[2])
            return self.add_set(path)
        return self

    def delete_vrf_static_route6_next_hop_interface(self, name: str, value: str) -> "VrfStaticMixin":
        """Value format: 'destination,next_hop'."""
        parts = value.split(",", 1)
        if len(parts) == 2:
            path = self.mappers["vrf_static"].get_static_route6_next_hop(name, parts[0], parts[1]) + ["interface"]
            return self.add_delete(path)
        return self

    def set_vrf_static_route6_next_hop_vrf(self, name: str, value: str) -> "VrfStaticMixin":
        """Value format: 'destination,next_hop,vrf'."""
        parts = value.split(",", 2)
        if len(parts) == 3:
            path = self.mappers["vrf_static"].get_static_route6_next_hop_vrf(name, parts[0], parts[1], parts[2])
            return self.add_set(path)
        return self

    def delete_vrf_static_route6_next_hop_vrf(self, name: str, value: str) -> "VrfStaticMixin":
        """Value format: 'destination,next_hop'."""
        parts = value.split(",", 1)
        if len(parts) == 2:
            path = self.mappers["vrf_static"].get_static_route6_next_hop(name, parts[0], parts[1]) + ["vrf"]
            return self.add_delete(path)
        return self

    def set_vrf_static_route6_next_hop_bfd_profile(self, name: str, value: str) -> "VrfStaticMixin":
        """Value format: 'destination,next_hop,profile'."""
        parts = value.split(",", 2)
        if len(parts) == 3:
            path = self.mappers["vrf_static"].get_static_route6_next_hop_bfd_profile(name, parts[0], parts[1], parts[2])
            return self.add_set(path)
        return self

    def delete_vrf_static_route6_next_hop_bfd_profile(self, name: str, value: str) -> "VrfStaticMixin":
        """Value format: 'destination,next_hop'."""
        parts = value.split(",", 1)
        if len(parts) == 2:
            path = self.mappers["vrf_static"].get_static_route6_next_hop(name, parts[0], parts[1]) + ["bfd", "profile"]
            return self.add_delete(path)
        return self

    def set_vrf_static_route6_next_hop_bfd_multi_hop_source(self, name: str, value: str) -> "VrfStaticMixin":
        """Value format: 'destination,next_hop,source'. Version-aware via mapper."""
        parts = value.split(",", 2)
        if len(parts) == 3:
            path = self.mappers["vrf_static"].get_static_route6_next_hop_bfd_multi_hop_source(name, parts[0], parts[1], parts[2])
            return self.add_set(path)
        return self

    def delete_vrf_static_route6_next_hop_bfd_multi_hop_source(self, name: str, value: str) -> "VrfStaticMixin":
        """Value format: 'destination,next_hop'. Version-aware via mapper."""
        parts = value.split(",", 1)
        if len(parts) == 2:
            path = self.mappers["vrf_static"].get_static_route6_next_hop_bfd_multi_hop_source_delete(name, parts[0], parts[1])
            return self.add_delete(path)
        return self

    def set_vrf_static_route6_next_hop_segments(self, name: str, value: str) -> "VrfStaticMixin":
        """Value format: 'destination,next_hop,segments'."""
        parts = value.split(",", 2)
        if len(parts) == 3:
            path = self.mappers["vrf_static"].get_static_route6_next_hop_segments(name, parts[0], parts[1], parts[2])
            return self.add_set(path)
        return self

    def delete_vrf_static_route6_next_hop_segments(self, name: str, value: str) -> "VrfStaticMixin":
        """Value format: 'destination,next_hop'."""
        parts = value.split(",", 1)
        if len(parts) == 2:
            path = self.mappers["vrf_static"].get_static_route6_next_hop(name, parts[0], parts[1]) + ["segments"]
            return self.add_delete(path)
        return self

    # --- Interface route ---

    def set_vrf_static_route6_interface(self, name: str, value: str) -> "VrfStaticMixin":
        """Value format: 'destination,interface'."""
        parts = value.split(",", 1)
        if len(parts) == 2:
            path = self.mappers["vrf_static"].get_static_route6_interface(name, parts[0], parts[1])
            return self.add_set(path)
        return self

    def delete_vrf_static_route6_interface(self, name: str, value: str) -> "VrfStaticMixin":
        """Value format: 'destination,interface'."""
        parts = value.split(",", 1)
        if len(parts) == 2:
            path = self.mappers["vrf_static"].get_static_route6_interface(name, parts[0], parts[1])
            return self.add_delete(path)
        return self

    def set_vrf_static_route6_interface_disable(self, name: str, value: str) -> "VrfStaticMixin":
        """Value format: 'destination,interface'."""
        parts = value.split(",", 1)
        if len(parts) == 2:
            path = self.mappers["vrf_static"].get_static_route6_interface_disable(name, parts[0], parts[1])
            return self.add_set(path)
        return self

    def delete_vrf_static_route6_interface_disable(self, name: str, value: str) -> "VrfStaticMixin":
        """Value format: 'destination,interface'."""
        parts = value.split(",", 1)
        if len(parts) == 2:
            path = self.mappers["vrf_static"].get_static_route6_interface_disable(name, parts[0], parts[1])
            return self.add_delete(path)
        return self

    def set_vrf_static_route6_interface_distance(self, name: str, value: str) -> "VrfStaticMixin":
        """Value format: 'destination,interface,distance'."""
        parts = value.split(",", 2)
        if len(parts) == 3:
            path = self.mappers["vrf_static"].get_static_route6_interface_distance(name, parts[0], parts[1], parts[2])
            return self.add_set(path)
        return self

    def delete_vrf_static_route6_interface_distance(self, name: str, value: str) -> "VrfStaticMixin":
        """Value format: 'destination,interface'."""
        parts = value.split(",", 1)
        if len(parts) == 2:
            path = self.mappers["vrf_static"].get_static_route6_interface(name, parts[0], parts[1]) + ["distance"]
            return self.add_delete(path)
        return self

    def set_vrf_static_route6_interface_vrf(self, name: str, value: str) -> "VrfStaticMixin":
        """Value format: 'destination,interface,vrf'."""
        parts = value.split(",", 2)
        if len(parts) == 3:
            path = self.mappers["vrf_static"].get_static_route6_interface_vrf(name, parts[0], parts[1], parts[2])
            return self.add_set(path)
        return self

    def delete_vrf_static_route6_interface_vrf(self, name: str, value: str) -> "VrfStaticMixin":
        """Value format: 'destination,interface'."""
        parts = value.split(",", 1)
        if len(parts) == 2:
            path = self.mappers["vrf_static"].get_static_route6_interface(name, parts[0], parts[1]) + ["vrf"]
            return self.add_delete(path)
        return self

    def set_vrf_static_route6_interface_segments(self, name: str, value: str) -> "VrfStaticMixin":
        """Value format: 'destination,interface,segments'."""
        parts = value.split(",", 2)
        if len(parts) == 3:
            path = self.mappers["vrf_static"].get_static_route6_interface_segments(name, parts[0], parts[1], parts[2])
            return self.add_set(path)
        return self

    def delete_vrf_static_route6_interface_segments(self, name: str, value: str) -> "VrfStaticMixin":
        """Value format: 'destination,interface'."""
        parts = value.split(",", 1)
        if len(parts) == 2:
            path = self.mappers["vrf_static"].get_static_route6_interface(name, parts[0], parts[1]) + ["segments"]
            return self.add_delete(path)
        return self

    # --- Blackhole ---

    def set_vrf_static_route6_blackhole(self, name: str, value: str) -> "VrfStaticMixin":
        path = self.mappers["vrf_static"].get_static_route6_blackhole(name, value)
        return self.add_set(path)

    def delete_vrf_static_route6_blackhole(self, name: str, value: str) -> "VrfStaticMixin":
        path = self.mappers["vrf_static"].get_static_route6_blackhole(name, value)
        return self.add_delete(path)

    def set_vrf_static_route6_blackhole_distance(self, name: str, value: str) -> "VrfStaticMixin":
        """Value format: 'destination,distance'."""
        parts = value.split(",", 1)
        if len(parts) == 2:
            path = self.mappers["vrf_static"].get_static_route6_blackhole_distance(name, parts[0], parts[1])
            return self.add_set(path)
        return self

    def delete_vrf_static_route6_blackhole_distance(self, name: str, value: str) -> "VrfStaticMixin":
        path = self.mappers["vrf_static"].get_static_route6_blackhole(name, value) + ["distance"]
        return self.add_delete(path)

    def set_vrf_static_route6_blackhole_tag(self, name: str, value: str) -> "VrfStaticMixin":
        """Value format: 'destination,tag'."""
        parts = value.split(",", 1)
        if len(parts) == 2:
            path = self.mappers["vrf_static"].get_static_route6_blackhole_tag(name, parts[0], parts[1])
            return self.add_set(path)
        return self

    def delete_vrf_static_route6_blackhole_tag(self, name: str, value: str) -> "VrfStaticMixin":
        path = self.mappers["vrf_static"].get_static_route6_blackhole(name, value) + ["tag"]
        return self.add_delete(path)

    # --- Reject ---

    def set_vrf_static_route6_reject(self, name: str, value: str) -> "VrfStaticMixin":
        path = self.mappers["vrf_static"].get_static_route6_reject(name, value)
        return self.add_set(path)

    def delete_vrf_static_route6_reject(self, name: str, value: str) -> "VrfStaticMixin":
        path = self.mappers["vrf_static"].get_static_route6_reject(name, value)
        return self.add_delete(path)

    def set_vrf_static_route6_reject_distance(self, name: str, value: str) -> "VrfStaticMixin":
        """Value format: 'destination,distance'."""
        parts = value.split(",", 1)
        if len(parts) == 2:
            path = self.mappers["vrf_static"].get_static_route6_reject_distance(name, parts[0], parts[1])
            return self.add_set(path)
        return self

    def delete_vrf_static_route6_reject_distance(self, name: str, value: str) -> "VrfStaticMixin":
        path = self.mappers["vrf_static"].get_static_route6_reject(name, value) + ["distance"]
        return self.add_delete(path)

    def set_vrf_static_route6_reject_tag(self, name: str, value: str) -> "VrfStaticMixin":
        """Value format: 'destination,tag'."""
        parts = value.split(",", 1)
        if len(parts) == 2:
            path = self.mappers["vrf_static"].get_static_route6_reject_tag(name, parts[0], parts[1])
            return self.add_set(path)
        return self

    def delete_vrf_static_route6_reject_tag(self, name: str, value: str) -> "VrfStaticMixin":
        path = self.mappers["vrf_static"].get_static_route6_reject(name, value) + ["tag"]
        return self.add_delete(path)

    # ========================================================================
    # Delete entire static config
    # ========================================================================

    def delete_vrf_static(self, name: str) -> "VrfStaticMixin":
        """Delete all static routes for a VRF."""
        path = self.mappers["vrf_static"]._base(name)
        return self.add_delete(path)
