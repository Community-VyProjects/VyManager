"""VRF feature trees only the VyOS 1.5 template tree has."""

from typing import FrozenSet, List

from ..vrf import VrfMapper


class VrfMapperV1_5(VrfMapper):
    """VyOS 1.5 adds failover, RPKI and the DHCP servers under ``vrf name <vrf>``."""

    def versioned_nodes(self) -> FrozenSet[str]:
        return frozenset(self._VERSIONED_FEATURES.values())

    # ========================================================================
    # RPKI (vrf name <vrf> protocols rpki)
    # ========================================================================

    def get_rpki(self, name: str) -> List[str]:
        return self.get_vrf_path(name) + ["protocols", "rpki"]

    def get_rpki_expire_interval(self, name: str, value: str) -> List[str]:
        return self.get_rpki(name) + ["expire-interval", value]

    def get_rpki_polling_period(self, name: str, value: str) -> List[str]:
        return self.get_rpki(name) + ["polling-period", value]

    def get_rpki_retry_interval(self, name: str, value: str) -> List[str]:
        return self.get_rpki(name) + ["retry-interval", value]

    def get_rpki_cache(self, name: str, cache_name: str) -> List[str]:
        return self.get_rpki(name) + ["cache", cache_name]

    def get_rpki_cache_port(self, name: str, cache_name: str, value: str) -> List[str]:
        return self.get_rpki_cache(name, cache_name) + ["port", value]

    def get_rpki_cache_preference(self, name: str, cache_name: str, value: str) -> List[str]:
        return self.get_rpki_cache(name, cache_name) + ["preference", value]

    def get_rpki_cache_source_address(self, name: str, cache_name: str, value: str) -> List[str]:
        return self.get_rpki_cache(name, cache_name) + ["source-address", value]

    def get_rpki_cache_ssh(self, name: str, cache_name: str) -> List[str]:
        return self.get_rpki_cache(name, cache_name) + ["ssh"]

    def get_rpki_cache_ssh_key(self, name: str, cache_name: str, value: str) -> List[str]:
        return self.get_rpki_cache_ssh(name, cache_name) + ["key", value]

    def get_rpki_cache_ssh_username(self, name: str, cache_name: str, value: str) -> List[str]:
        return self.get_rpki_cache_ssh(name, cache_name) + ["username", value]
