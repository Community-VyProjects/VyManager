"""
VRF RPKI Builder Mixin

Provides batch operations for RPKI (Resource Public Key Infrastructure)
configuration within VRF instances. Only the VRF mapper's version subclass
has ``vrf name <vrf> protocols rpki``; every op checks that tree first.
Mixed into VrfBatchBuilder to extend it with RPKI operations.
"""

from typing import Dict, List, Tuple, cast

from vyos_builders.base import BatchBuilder
from vyos_mappers.base import BaseFeatureMapper
from vyos_mappers.vrf.vrf import VrfMapper


class VrfRpkiMixin(BatchBuilder):
    """Mixin for VRF RPKI builder operations."""

    mappers: Dict[str, BaseFeatureMapper]

    # ========================================================================
    # Core
    # ========================================================================

    def _rpki_path(self, method: str, *args: str) -> List[str]:
        """Path from the VRF mapper's RPKI ``method`` once the tree is supported."""
        vrf_mapper = cast(VrfMapper, self.mappers["vrf"])
        vrf_mapper.require_feature("rpki")
        return getattr(vrf_mapper, method)(*args)

    @staticmethod
    def _cache_value(value: str) -> Tuple[str, str]:
        """Split a ``cache_name,value`` pair; a short or empty part is rejected."""
        parts = value.split(",", 1)
        if len(parts) != 2 or not all(parts):
            raise ValueError("RPKI cache value must be 'cache,value'")
        return parts[0], parts[1]

    # ========================================================================
    # RPKI Root
    # ========================================================================

    def set_vrf_rpki(self, name: str) -> "VrfRpkiMixin":
        """Enable RPKI for a VRF."""
        path = self._rpki_path("get_rpki", name)
        return self.add_set(path)

    def delete_vrf_rpki(self, name: str) -> "VrfRpkiMixin":
        """Delete all RPKI configuration for a VRF."""
        path = self._rpki_path("get_rpki", name)
        return self.add_delete(path)

    # ========================================================================
    # Global RPKI Settings
    # ========================================================================

    def set_vrf_rpki_expire_interval(self, name: str, value: str) -> "VrfRpkiMixin":
        """Set RPKI expire interval. Value is the interval in seconds."""
        path = self._rpki_path("get_rpki_expire_interval", name, value)
        return self.add_set(path)

    def delete_vrf_rpki_expire_interval(self, name: str) -> "VrfRpkiMixin":
        """Delete RPKI expire interval."""
        path = self._rpki_path("get_rpki", name) + ["expire-interval"]
        return self.add_delete(path)

    def set_vrf_rpki_polling_period(self, name: str, value: str) -> "VrfRpkiMixin":
        """Set RPKI polling period. Value is the period in seconds."""
        path = self._rpki_path("get_rpki_polling_period", name, value)
        return self.add_set(path)

    def delete_vrf_rpki_polling_period(self, name: str) -> "VrfRpkiMixin":
        """Delete RPKI polling period."""
        path = self._rpki_path("get_rpki", name) + ["polling-period"]
        return self.add_delete(path)

    def set_vrf_rpki_retry_interval(self, name: str, value: str) -> "VrfRpkiMixin":
        """Set RPKI retry interval. Value is the interval in seconds."""
        path = self._rpki_path("get_rpki_retry_interval", name, value)
        return self.add_set(path)

    def delete_vrf_rpki_retry_interval(self, name: str) -> "VrfRpkiMixin":
        """Delete RPKI retry interval."""
        path = self._rpki_path("get_rpki", name) + ["retry-interval"]
        return self.add_delete(path)

    # ========================================================================
    # Cache Operations
    # ========================================================================

    def set_vrf_rpki_cache(self, name: str, value: str) -> "VrfRpkiMixin":
        """Create/enable an RPKI cache. Value is the cache name."""
        path = self._rpki_path("get_rpki_cache", name, value)
        return self.add_set(path)

    def delete_vrf_rpki_cache(self, name: str, value: str) -> "VrfRpkiMixin":
        """Delete an RPKI cache. Value is the cache name."""
        path = self._rpki_path("get_rpki_cache", name, value)
        return self.add_delete(path)

    def set_vrf_rpki_cache_port(self, name: str, value: str) -> "VrfRpkiMixin":
        """Set RPKI cache port. Value format: 'cache_name,port'."""
        cache, port = self._cache_value(value)
        path = self._rpki_path("get_rpki_cache_port", name, cache, port)
        return self.add_set(path)

    def delete_vrf_rpki_cache_port(self, name: str, value: str) -> "VrfRpkiMixin":
        """Delete RPKI cache port. Value is the cache name."""
        path = self._rpki_path("get_rpki_cache", name, value) + ["port"]
        return self.add_delete(path)

    def set_vrf_rpki_cache_preference(self, name: str, value: str) -> "VrfRpkiMixin":
        """Set RPKI cache preference. Value format: 'cache_name,preference'."""
        cache, preference = self._cache_value(value)
        path = self._rpki_path("get_rpki_cache_preference", name, cache, preference)
        return self.add_set(path)

    def delete_vrf_rpki_cache_preference(self, name: str, value: str) -> "VrfRpkiMixin":
        """Delete RPKI cache preference. Value is the cache name."""
        path = self._rpki_path("get_rpki_cache", name, value) + ["preference"]
        return self.add_delete(path)

    def set_vrf_rpki_cache_source_address(self, name: str, value: str) -> "VrfRpkiMixin":
        """Set RPKI cache source address. Value format: 'cache_name,source_address'."""
        cache, address = self._cache_value(value)
        path = self._rpki_path("get_rpki_cache_source_address", name, cache, address)
        return self.add_set(path)

    def delete_vrf_rpki_cache_source_address(self, name: str, value: str) -> "VrfRpkiMixin":
        """Delete RPKI cache source address. Value is the cache name."""
        path = self._rpki_path("get_rpki_cache", name, value) + ["source-address"]
        return self.add_delete(path)

    # ========================================================================
    # Cache SSH Operations
    # ========================================================================

    def delete_vrf_rpki_cache_ssh(self, name: str, value: str) -> "VrfRpkiMixin":
        """Delete a cache's SSH transport. Value is the cache name.

        The lab requires ``key`` and ``username`` together, so clearing SSH
        deletes the parent rather than both leaves.
        """
        path = self._rpki_path("get_rpki_cache_ssh", name, value)
        return self.add_delete(path)

    def set_vrf_rpki_cache_ssh_key(self, name: str, value: str) -> "VrfRpkiMixin":
        """Set RPKI cache SSH key. Value format: 'cache_name,key_name'."""
        cache, key = self._cache_value(value)
        path = self._rpki_path("get_rpki_cache_ssh_key", name, cache, key)
        return self.add_set(path)

    def delete_vrf_rpki_cache_ssh_key(self, name: str, value: str) -> "VrfRpkiMixin":
        """Delete RPKI cache SSH key. Value is the cache name."""
        path = self._rpki_path("get_rpki_cache_ssh", name, value) + ["key"]
        return self.add_delete(path)

    def set_vrf_rpki_cache_ssh_username(self, name: str, value: str) -> "VrfRpkiMixin":
        """Set RPKI cache SSH username. Value format: 'cache_name,username'."""
        cache, username = self._cache_value(value)
        path = self._rpki_path("get_rpki_cache_ssh_username", name, cache, username)
        return self.add_set(path)

    def delete_vrf_rpki_cache_ssh_username(self, name: str, value: str) -> "VrfRpkiMixin":
        """Delete RPKI cache SSH username. Value is the cache name."""
        path = self._rpki_path("get_rpki_cache_ssh", name, value) + ["username"]
        return self.add_delete(path)
