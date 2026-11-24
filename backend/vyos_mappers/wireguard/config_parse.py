"""Read-model for WireGuard config.

Mappers own VyOS tree shape. Routers call parse_config and do not rebuild
the tree.
"""

from typing import Any, Dict, List

MASKED_SECRET = "***"


def _as_list(value: Any) -> List[str]:
    """A multi leaf is a string when it holds one value."""
    if value is None:
        return []
    if isinstance(value, list):
        return value
    return [value]


def _parse_peer(name: str, raw: Dict[str, Any]) -> Dict[str, Any]:
    return {
        "name": name,
        "public_key": raw.get("public-key"),
        "preshared_key": MASKED_SECRET if raw.get("preshared-key") else None,
        "allowed_ips": _as_list(raw.get("allowed-ips")),
        "address": raw.get("address"),
        "port": raw.get("port"),
        "persistent_keepalive": raw.get("persistent-keepalive"),
        "description": raw.get("description"),
        "disabled": "disable" in raw,
        "host_name": raw.get("host-name"),
    }


def _parse_interface(name: str, raw: Dict[str, Any]) -> Dict[str, Any]:
    peers = [_parse_peer(peer, peer_raw or {}) for peer, peer_raw in (raw.get("peer") or {}).items()]
    return {
        "name": name,
        "description": raw.get("description"),
        "addresses": _as_list(raw.get("address")),
        "port": raw.get("port"),
        "private_key": MASKED_SECRET if raw.get("private-key") else None,
        "mtu": raw.get("mtu"),
        "fwmark": raw.get("fwmark"),
        "per_client_thread": "per-client-thread" in raw,
        "disabled": "disable" in raw,
        "mss_clamping": (raw.get("ip") or {}).get("adjust-mss") or None,
        "peers": peers,
        "peer_count": len(peers),
    }


def parse_config(_mapper: Any, full_config: Dict[str, Any]) -> Dict[str, Any]:
    """Return every ``interfaces wireguard`` entry with secrets masked."""
    raw_interfaces = (full_config.get("interfaces") or {}).get("wireguard") or {}
    interfaces = [_parse_interface(name, raw or {}) for name, raw in raw_interfaces.items()]
    return {"interfaces": interfaces, "total": len(interfaces)}
