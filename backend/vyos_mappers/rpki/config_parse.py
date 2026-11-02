"""Read-model for RPKI config.

Mappers own VyOS tree shape. Routers call parse_config and do not rebuild
the tree. Version keys come from the mapper (MergedMapper), not from
hardcoded 1.4/1.5 branches here.
"""

from typing import Any, Dict, List, Optional


def _safe_int(value: Any) -> Optional[int]:
    if value is None:
        return None
    try:
        return int(value)
    except (ValueError, TypeError):
        return None


def parse_cache_servers(raw: Any) -> List[Dict[str, Any]]:
    if not raw:
        return []

    servers = []
    for address, cfg in raw.items():
        if cfg is None:
            cfg = {}

        ssh_raw = cfg.get("ssh", {}) or {}
        ssh = None
        if ssh_raw:
            ssh = {
                "key": ssh_raw.get("key"),
                "username": ssh_raw.get("username"),
            }

        servers.append(
            {
                "address": address,
                "port": _safe_int(cfg.get("port")),
                "preference": _safe_int(cfg.get("preference")),
                "source_address": cfg.get("source-address"),
                "ssh": ssh,
            }
        )

    return servers


def _empty() -> Dict[str, Any]:
    return {
        "cache_servers": [],
        "expire_interval": None,
        "polling_period": None,
        "retry_interval": None,
    }


def parse_config(_mapper, full_config: Dict[str, Any]) -> Dict[str, Any]:
    """Normalise full VyOS config into the GET /vyos/rpki/config payload."""
    rpki_raw = full_config.get("protocols", {}).get("rpki", {})

    if not rpki_raw:
        return _empty()

    return {
        "cache_servers": parse_cache_servers(rpki_raw.get("cache", {})),
        "expire_interval": _safe_int(rpki_raw.get("expire-interval")),
        "polling_period": _safe_int(rpki_raw.get("polling-period")),
        "retry_interval": _safe_int(rpki_raw.get("retry-interval")),
    }
