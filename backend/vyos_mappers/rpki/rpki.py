"""RPKI Protocol Command Mapper.

One class holds the ``protocols rpki`` commands both VyOS versions have.
Cache ``source-address`` exists only on 1.5; its paths live on
``rpki_versions.v1_5.RpkiMapperV1_5``.

Config tree (both versions):
  protocols rpki/
    cache/<ADDR>/
      port
      preference
      ssh/{key, username}
    expire-interval
    polling-period
    retry-interval
"""

from typing import Any, Dict, FrozenSet, List, Tuple

from ..base import BaseFeatureMapper


class RpkiMapper(BaseFeatureMapper):
    """RPKI paths shared by VyOS 1.4 and 1.5."""

    # Version-only cache leaf -> every path method for it (on the subclass).
    _VERSIONED_CACHE_NODES: Dict[str, Tuple[str, ...]] = {
        "source-address": (
            "get_cache_source_address",
            "get_cache_source_address_delete",
        ),
    }

    def _rpki(self) -> List[str]:
        return ["protocols", "rpki"]

    # ========================================================================
    # Version allowlist
    # ========================================================================

    def versioned_cache_nodes(self) -> FrozenSet[str]:
        """Cache leaves only some VyOS versions have.

        A leaf counts when every path method for it is on this mapper.
        Capabilities and the builder read this set instead of the version
        string.
        """
        return frozenset(
            node
            for node, methods in self._VERSIONED_CACHE_NODES.items()
            if all(callable(getattr(self, method, None)) for method in methods)
        )

    def require_cache_node(self, node: str) -> None:
        if node not in self.versioned_cache_nodes():
            raise ValueError(f"rpki cache {node} is not supported on this device")

    # ========================================================================
    # Config read
    # ========================================================================

    def parse_config(self, full_config: Dict[str, Any]) -> Dict[str, Any]:
        from .config_parse import parse_config as parse_rpki_config

        return parse_rpki_config(self, full_config)

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
