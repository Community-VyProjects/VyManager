"""Read-model for dynamic DNS config.

Mappers own VyOS tree shape. Routers call parse_config and do not rebuild
the tree.
"""

from typing import Any, Dict, List, Optional


def _parse_int(value: Any) -> Optional[int]:
    if value is None:
        return None
    try:
        return int(value)
    except (ValueError, TypeError):
        return None


def _parse_multi(value: Any) -> List[str]:
    if value is None:
        return []
    if isinstance(value, list):
        return sorted(str(v) for v in value)
    if isinstance(value, dict):
        return sorted(value.keys())
    return [str(value)]


def _empty() -> Dict[str, Any]:
    return {"interval": None, "vrf": None, "entries": []}


def _parse_name_entries(raw: Any) -> List[Dict[str, Any]]:
    if not raw or not isinstance(raw, dict):
        return []
    result = []
    for name, attrs in sorted(raw.items()):
        if not isinstance(attrs, dict):
            attrs = {}

        addr_raw = attrs.get("address", {}) or {}
        web_raw = addr_raw.get("web", {}) or {}
        result.append(
            {
                "name": name,
                "protocol": attrs.get("protocol"),
                "server": attrs.get("server"),
                "username": attrs.get("username"),
                "password": attrs.get("password"),
                "hostnames": _parse_multi(attrs.get("host-name")),
                "ip_version": attrs.get("ip-version"),
                "address": {
                    "interface": addr_raw.get("interface"),
                    "web_url": web_raw.get("url"),
                    "web_skip": web_raw.get("skip"),
                },
                "description": attrs.get("description"),
                "ttl": _parse_int(attrs.get("ttl")),
                "key": attrs.get("key"),
                "expiry_time": _parse_int(attrs.get("expiry-time")),
                "wait_time": _parse_int(attrs.get("wait-time")),
                "zone": attrs.get("zone"),
            }
        )
    return result


def parse_config(_mapper, full_config: Dict[str, Any]) -> Dict[str, Any]:
    """Normalise full VyOS config into the GET /vyos/dns-dynamic/config payload."""
    dyn = full_config.get("service", {}).get("dns", {}).get("dynamic", {})
    if not dyn:
        return _empty()

    return {
        "interval": _parse_int(dyn.get("interval")),
        "vrf": dyn.get("vrf"),
        "entries": _parse_name_entries(dyn.get("name", {})),
    }
