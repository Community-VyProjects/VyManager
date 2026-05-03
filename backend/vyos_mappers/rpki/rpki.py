"""RPKI Protocol Command Mapper."""
from typing import List
from ..base import BaseFeatureMapper


class RpkiMapper(BaseFeatureMapper):
    """Base mapper for RPKI (Resource Public Key Infrastructure) configuration paths."""

    def __init__(self, version: str):
        super().__init__(version)

    def _rpki(self) -> List[str]:
        return ["protocols", "rpki"]

    # ========================================================================
    # Cache servers
    # ========================================================================

    def get_cache(self, address: str) -> List[str]:
        return self._rpki() + ["cache", address]

    def get_cache_delete(self, address: str) -> List[str]:
        return self._rpki() + ["cache", address]

    def get_cache_port(self, address: str, port: str) -> List[str]:
        return self._rpki() + ["cache", address, "port", port]

    def get_cache_port_delete(self, address: str) -> List[str]:
        return self._rpki() + ["cache", address, "port"]

    def get_cache_preference(self, address: str, preference: str) -> List[str]:
        return self._rpki() + ["cache", address, "preference", preference]

    def get_cache_preference_delete(self, address: str) -> List[str]:
        return self._rpki() + ["cache", address, "preference"]

    def get_cache_source_address(self, address: str, source: str) -> List[str]:
        return self._rpki() + ["cache", address, "source-address", source]

    def get_cache_source_address_delete(self, address: str) -> List[str]:
        return self._rpki() + ["cache", address, "source-address"]

    def get_cache_ssh_key(self, address: str, key: str) -> List[str]:
        return self._rpki() + ["cache", address, "ssh", "key", key]

    def get_cache_ssh_key_delete(self, address: str) -> List[str]:
        return self._rpki() + ["cache", address, "ssh", "key"]

    def get_cache_ssh_username(self, address: str, username: str) -> List[str]:
        return self._rpki() + ["cache", address, "ssh", "username", username]

    def get_cache_ssh_username_delete(self, address: str) -> List[str]:
        return self._rpki() + ["cache", address, "ssh", "username"]

    def get_cache_ssh_delete(self, address: str) -> List[str]:
        return self._rpki() + ["cache", address, "ssh"]

    # ========================================================================
    # Global timers / intervals
    # ========================================================================

    def get_expire_interval(self, value: str) -> List[str]:
        return self._rpki() + ["expire-interval", value]

    def get_expire_interval_delete(self) -> List[str]:
        return self._rpki() + ["expire-interval"]

    def get_polling_period(self, value: str) -> List[str]:
        return self._rpki() + ["polling-period", value]

    def get_polling_period_delete(self) -> List[str]:
        return self._rpki() + ["polling-period"]

    def get_retry_interval(self, value: str) -> List[str]:
        return self._rpki() + ["retry-interval", value]

    def get_retry_interval_delete(self) -> List[str]:
        return self._rpki() + ["retry-interval"]

    # ========================================================================
    # Delete entire RPKI
    # ========================================================================

    def get_rpki_delete(self) -> List[str]:
        return self._rpki()
