"""
VRF RPKI Command Mapper

Handles command path generation for RPKI (Resource Public Key Infrastructure)
configuration within VRF instances. VyOS 1.5+ only.

Config tree: vrf name <NAME> protocols rpki
  cache/<CACHE_NAME>/ (port, preference, source-address, ssh/{key, username})
  expire-interval
  polling-period
  retry-interval
"""

from typing import List


class VrfRpkiMapper:
    """Mapper for VRF RPKI paths. VyOS 1.5+ only."""

    def _base(self, name: str) -> List[str]:
        return ["vrf", "name", name, "protocols", "rpki"]

    # ========================================================================
    # RPKI Root
    # ========================================================================

    def get_rpki(self, name: str) -> List[str]:
        return self._base(name)

    # ========================================================================
    # Global RPKI Settings
    # ========================================================================

    def get_rpki_expire_interval(self, name: str, value: str) -> List[str]:
        return self._base(name) + ["expire-interval", value]

    def get_rpki_polling_period(self, name: str, value: str) -> List[str]:
        return self._base(name) + ["polling-period", value]

    def get_rpki_retry_interval(self, name: str, value: str) -> List[str]:
        return self._base(name) + ["retry-interval", value]

    # ========================================================================
    # Cache Paths
    # ========================================================================

    def get_rpki_cache(self, name: str, cache_name: str) -> List[str]:
        return self._base(name) + ["cache", cache_name]

    def get_rpki_cache_port(self, name: str, cache_name: str, value: str) -> List[str]:
        return self._base(name) + ["cache", cache_name, "port", value]

    def get_rpki_cache_preference(self, name: str, cache_name: str, value: str) -> List[str]:
        return self._base(name) + ["cache", cache_name, "preference", value]

    def get_rpki_cache_source_address(self, name: str, cache_name: str, value: str) -> List[str]:
        return self._base(name) + ["cache", cache_name, "source-address", value]

    # ========================================================================
    # Cache SSH Paths
    # ========================================================================

    def get_rpki_cache_ssh_key(self, name: str, cache_name: str, value: str) -> List[str]:
        return self._base(name) + ["cache", cache_name, "ssh", "key", value]

    def get_rpki_cache_ssh_username(self, name: str, cache_name: str, value: str) -> List[str]:
        return self._base(name) + ["cache", cache_name, "ssh", "username", value]
