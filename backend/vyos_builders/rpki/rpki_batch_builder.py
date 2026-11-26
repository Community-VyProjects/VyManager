"""RPKI Protocol Batch Builder.

Provides all batch operations for RPKI (Resource Public Key Infrastructure)
configuration. Covers: cache server management and global interval settings.
The mapper allowlist (versioned_cache_nodes) decides which version-only cache
leaves this device has; a 1.5-only op raises ValueError on 1.4.
"""

import ipaddress
import re
from typing import Any, Dict, List, cast

from vyos_mappers import CommandMapperRegistry
from vyos_mappers.rpki.rpki import RpkiMapper
from vyos_builders.base import BatchBuilder

# Lab syntax bounds (protocols rpki, identical on 1.4 and 1.5).
RANGES: Dict[str, Dict[str, int]] = {
    "expire_interval": {"min": 600, "max": 172800},
    "polling_period": {"min": 1, "max": 86400},
    "retry_interval": {"min": 1, "max": 7200},
    "port": {"min": 1, "max": 65535},
    "preference": {"min": 1, "max": 255},
}

# Lab defaults from the node.def help text (applied when the leaf is unset).
DEFAULTS: Dict[str, int] = {
    "expire_interval": 7200,
    "polling_period": 300,
    "retry_interval": 600,
}

# ASCII: a Unicode digit is not a number the lab takes.
_DECIMAL = re.compile(r"[0-9]{1,10}", re.ASCII)
# cache <ADDR> takes ip-address or fqdn; the lab fqdn validator is this regex.
_FQDN = re.compile(r"[A-Za-z0-9][-.A-Za-z0-9]*", re.ASCII)
# ssh username: the lab regex is [[:ascii:]]{1,128}.
_USERNAME = re.compile(r"[\x00-\x7f]{1,128}", re.ASCII)


def _number(key: str, value: str) -> str:
    """value when it is a decimal inside RANGES[key], else ValueError."""
    bounds = RANGES[key]
    text = str(value)
    if not _DECIMAL.fullmatch(text) or not bounds["min"] <= int(text) <= bounds["max"]:
        raise ValueError(f"rpki {key} must be a number from {bounds['min']} to {bounds['max']}")
    return text


def _cache_address(address: str) -> str:
    """address when the lab cache tag (ip-address or fqdn) takes it, else ValueError.

    The lab ip-address check refuses a zone index and a dotted IPv4 tail in an
    IPv6 address; an IPv4 address passes the fqdn regex.
    """
    text = str(address)
    if ":" in text:
        try:
            ipaddress.IPv6Address(text)
            valid = "%" not in text and "." not in text
        except ValueError:
            valid = False
    else:
        valid = bool(_FQDN.fullmatch(text))
    if not valid:
        raise ValueError("rpki cache address must be an IP address or a hostname")
    return text


def _ipv4(value: str) -> str:
    text = str(value)
    try:
        ipaddress.IPv4Address(text)
    except ValueError:
        raise ValueError("rpki cache source-address must be an IPv4 address") from None
    return text


class RpkiBatchBuilder(BatchBuilder):
    """Complete batch builder for RPKI protocol operations."""

    def __init__(self, version: str):
        super().__init__(version)
        self.mapper_key = "rpki"
        self.mappers = {self.mapper_key: CommandMapperRegistry.get_mapper(self.mapper_key, version)}

    @property
    def m(self) -> RpkiMapper:
        # Read mappers[mapper_key] on every call: VRF swaps that entry for a
        # PathPrefixMapper after construction.
        return cast(RpkiMapper, self.mappers[self.mapper_key])

    def _versioned_path(self, node: str, method: str, *args: Any) -> List[str]:
        """Path for a cache leaf only one VyOS version has; ValueError elsewhere."""
        mapper = self.m
        mapper.require_cache_node(node)
        return getattr(mapper, method)(*args)

    # ========================================================================
    # Capabilities
    # ========================================================================

    def get_capabilities(self) -> Dict[str, Any]:
        return {
            "version": self.version,
            "features": {
                "cache_servers": {
                    "supported": True,
                    "description": "RPKI cache server management (TCP and SSH transport)",
                },
                "expire_interval": {
                    "supported": True,
                    "description": "Interval before expiring cache data",
                },
                "polling_period": {
                    "supported": True,
                    "description": "Cache polling interval",
                },
                "retry_interval": {
                    "supported": True,
                    "description": "Retry interval to reconnect to cache server",
                },
                "cache_source_address": {
                    "supported": "source-address" in self.m.versioned_cache_nodes(),
                    "description": "Source address for cache server connections",
                },
                "ssh_transport": {
                    "supported": True,
                    "description": "SSH transport for cache server connections using PKI keys",
                },
            },
            "ranges": RANGES,
            "defaults": DEFAULTS,
        }

    # ========================================================================
    # Cache Servers
    # ========================================================================

    def set_cache(self, address: str) -> "RpkiBatchBuilder":
        return self.add_set(self.m.get_cache(_cache_address(address)))

    def delete_cache(self, address: str) -> "RpkiBatchBuilder":
        return self.add_delete(self.m.get_cache_delete(_cache_address(address)))

    def set_cache_port(self, address: str, port: str) -> "RpkiBatchBuilder":
        return self.add_set(self.m.get_cache_port(_cache_address(address), _number("port", port)))

    def delete_cache_port(self, address: str) -> "RpkiBatchBuilder":
        return self.add_delete(self.m.get_cache_port_delete(_cache_address(address)))

    def set_cache_preference(self, address: str, preference: str) -> "RpkiBatchBuilder":
        path = self.m.get_cache_preference(_cache_address(address), _number("preference", preference))
        return self.add_set(path)

    def delete_cache_preference(self, address: str) -> "RpkiBatchBuilder":
        return self.add_delete(self.m.get_cache_preference_delete(_cache_address(address)))

    def set_cache_source_address(self, address: str, source: str) -> "RpkiBatchBuilder":
        path = self._versioned_path(
            "source-address", "get_cache_source_address", _cache_address(address), _ipv4(source)
        )
        return self.add_set(path)

    def delete_cache_source_address(self, address: str) -> "RpkiBatchBuilder":
        path = self._versioned_path("source-address", "get_cache_source_address_delete", _cache_address(address))
        return self.add_delete(path)

    def set_cache_ssh_key(self, address: str, key: str) -> "RpkiBatchBuilder":
        return self.add_set(self.m.get_cache_ssh_key(_cache_address(address), key))

    def delete_cache_ssh_key(self, address: str) -> "RpkiBatchBuilder":
        return self.add_delete(self.m.get_cache_ssh_key_delete(_cache_address(address)))

    def set_cache_ssh_username(self, address: str, username: str) -> "RpkiBatchBuilder":
        if not _USERNAME.fullmatch(str(username)):
            raise ValueError("rpki cache ssh username must be 1 to 128 ASCII characters")
        return self.add_set(self.m.get_cache_ssh_username(_cache_address(address), username))

    def delete_cache_ssh_username(self, address: str) -> "RpkiBatchBuilder":
        return self.add_delete(self.m.get_cache_ssh_username_delete(_cache_address(address)))

    def delete_cache_ssh(self, address: str) -> "RpkiBatchBuilder":
        return self.add_delete(self.m.get_cache_ssh_delete(_cache_address(address)))

    # ========================================================================
    # Global Intervals
    # ========================================================================

    def set_expire_interval(self, value: str) -> "RpkiBatchBuilder":
        return self.add_set(self.m.get_expire_interval(_number("expire_interval", value)))

    def delete_expire_interval(self) -> "RpkiBatchBuilder":
        return self.add_delete(self.m.get_expire_interval_delete())

    def set_polling_period(self, value: str) -> "RpkiBatchBuilder":
        return self.add_set(self.m.get_polling_period(_number("polling_period", value)))

    def delete_polling_period(self) -> "RpkiBatchBuilder":
        return self.add_delete(self.m.get_polling_period_delete())

    def set_retry_interval(self, value: str) -> "RpkiBatchBuilder":
        return self.add_set(self.m.get_retry_interval(_number("retry_interval", value)))

    def delete_retry_interval(self) -> "RpkiBatchBuilder":
        return self.add_delete(self.m.get_retry_interval_delete())

    # ========================================================================
    # Delete entire RPKI
    # ========================================================================

    def delete_rpki(self) -> "RpkiBatchBuilder":
        return self.add_delete(self.m.get_rpki_delete())
