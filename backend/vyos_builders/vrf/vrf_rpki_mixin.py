"""
VRF RPKI Builder Mixin

Provides batch operations for RPKI (Resource Public Key Infrastructure)
configuration within VRF instances. VyOS 1.5+ only.
Mixed into VrfBatchBuilder to extend it with RPKI operations.
"""


class VrfRpkiMixin:
    """Mixin for VRF RPKI builder operations."""

    # ========================================================================
    # RPKI Root
    # ========================================================================

    def set_vrf_rpki(self, name: str) -> "VrfRpkiMixin":
        """Enable RPKI for a VRF."""
        path = self.mappers["vrf_rpki"].get_rpki(name)
        return self.add_set(path)

    def delete_vrf_rpki(self, name: str) -> "VrfRpkiMixin":
        """Delete all RPKI configuration for a VRF."""
        path = self.mappers["vrf_rpki"].get_rpki(name)
        return self.add_delete(path)

    # ========================================================================
    # Global RPKI Settings
    # ========================================================================

    def set_vrf_rpki_expire_interval(self, name: str, value: str) -> "VrfRpkiMixin":
        """Set RPKI expire interval. Value is the interval in seconds."""
        path = self.mappers["vrf_rpki"].get_rpki_expire_interval(name, value)
        return self.add_set(path)

    def delete_vrf_rpki_expire_interval(self, name: str) -> "VrfRpkiMixin":
        """Delete RPKI expire interval."""
        path = self.mappers["vrf_rpki"].get_rpki(name) + ["expire-interval"]
        return self.add_delete(path)

    def set_vrf_rpki_polling_period(self, name: str, value: str) -> "VrfRpkiMixin":
        """Set RPKI polling period. Value is the period in seconds."""
        path = self.mappers["vrf_rpki"].get_rpki_polling_period(name, value)
        return self.add_set(path)

    def delete_vrf_rpki_polling_period(self, name: str) -> "VrfRpkiMixin":
        """Delete RPKI polling period."""
        path = self.mappers["vrf_rpki"].get_rpki(name) + ["polling-period"]
        return self.add_delete(path)

    def set_vrf_rpki_retry_interval(self, name: str, value: str) -> "VrfRpkiMixin":
        """Set RPKI retry interval. Value is the interval in seconds."""
        path = self.mappers["vrf_rpki"].get_rpki_retry_interval(name, value)
        return self.add_set(path)

    def delete_vrf_rpki_retry_interval(self, name: str) -> "VrfRpkiMixin":
        """Delete RPKI retry interval."""
        path = self.mappers["vrf_rpki"].get_rpki(name) + ["retry-interval"]
        return self.add_delete(path)

    # ========================================================================
    # Cache Operations
    # ========================================================================

    def set_vrf_rpki_cache(self, name: str, value: str) -> "VrfRpkiMixin":
        """Create/enable an RPKI cache. Value is the cache name."""
        path = self.mappers["vrf_rpki"].get_rpki_cache(name, value)
        return self.add_set(path)

    def delete_vrf_rpki_cache(self, name: str, value: str) -> "VrfRpkiMixin":
        """Delete an RPKI cache. Value is the cache name."""
        path = self.mappers["vrf_rpki"].get_rpki_cache(name, value)
        return self.add_delete(path)

    def set_vrf_rpki_cache_port(self, name: str, value: str) -> "VrfRpkiMixin":
        """Set RPKI cache port. Value format: 'cache_name,port'."""
        parts = value.split(",", 1)
        if len(parts) == 2:
            path = self.mappers["vrf_rpki"].get_rpki_cache_port(name, parts[0], parts[1])
            return self.add_set(path)
        return self

    def delete_vrf_rpki_cache_port(self, name: str, value: str) -> "VrfRpkiMixin":
        """Delete RPKI cache port. Value is the cache name."""
        path = self.mappers["vrf_rpki"].get_rpki_cache(name, value) + ["port"]
        return self.add_delete(path)

    def set_vrf_rpki_cache_preference(self, name: str, value: str) -> "VrfRpkiMixin":
        """Set RPKI cache preference. Value format: 'cache_name,preference'."""
        parts = value.split(",", 1)
        if len(parts) == 2:
            path = self.mappers["vrf_rpki"].get_rpki_cache_preference(name, parts[0], parts[1])
            return self.add_set(path)
        return self

    def delete_vrf_rpki_cache_preference(self, name: str, value: str) -> "VrfRpkiMixin":
        """Delete RPKI cache preference. Value is the cache name."""
        path = self.mappers["vrf_rpki"].get_rpki_cache(name, value) + ["preference"]
        return self.add_delete(path)

    def set_vrf_rpki_cache_source_address(self, name: str, value: str) -> "VrfRpkiMixin":
        """Set RPKI cache source address. Value format: 'cache_name,source_address'."""
        parts = value.split(",", 1)
        if len(parts) == 2:
            path = self.mappers["vrf_rpki"].get_rpki_cache_source_address(name, parts[0], parts[1])
            return self.add_set(path)
        return self

    def delete_vrf_rpki_cache_source_address(self, name: str, value: str) -> "VrfRpkiMixin":
        """Delete RPKI cache source address. Value is the cache name."""
        path = self.mappers["vrf_rpki"].get_rpki_cache(name, value) + ["source-address"]
        return self.add_delete(path)

    # ========================================================================
    # Cache SSH Operations
    # ========================================================================

    def set_vrf_rpki_cache_ssh_key(self, name: str, value: str) -> "VrfRpkiMixin":
        """Set RPKI cache SSH key. Value format: 'cache_name,key_path'."""
        parts = value.split(",", 1)
        if len(parts) == 2:
            path = self.mappers["vrf_rpki"].get_rpki_cache_ssh_key(name, parts[0], parts[1])
            return self.add_set(path)
        return self

    def delete_vrf_rpki_cache_ssh_key(self, name: str, value: str) -> "VrfRpkiMixin":
        """Delete RPKI cache SSH key. Value is the cache name."""
        path = self.mappers["vrf_rpki"].get_rpki_cache(name, value) + ["ssh", "key"]
        return self.add_delete(path)

    def set_vrf_rpki_cache_ssh_username(self, name: str, value: str) -> "VrfRpkiMixin":
        """Set RPKI cache SSH username. Value format: 'cache_name,username'."""
        parts = value.split(",", 1)
        if len(parts) == 2:
            path = self.mappers["vrf_rpki"].get_rpki_cache_ssh_username(name, parts[0], parts[1])
            return self.add_set(path)
        return self

    def delete_vrf_rpki_cache_ssh_username(self, name: str, value: str) -> "VrfRpkiMixin":
        """Delete RPKI cache SSH username. Value is the cache name."""
        path = self.mappers["vrf_rpki"].get_rpki_cache(name, value) + ["ssh", "username"]
        return self.add_delete(path)
