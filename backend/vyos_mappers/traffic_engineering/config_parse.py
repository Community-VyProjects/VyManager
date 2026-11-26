"""Read-model for traffic-engineering config.

Mappers own VyOS tree shape. Routers call parse_config and do not rebuild
the tree. ``configured`` is key membership of ``protocols traffic-engineering``:
a bare node commits and parses as ``{}``.
"""

from typing import Any, Dict, List, Optional


def _safe_int(value: Any) -> Optional[int]:
    if value is None:
        return None
    try:
        return int(value)
    except (ValueError, TypeError):
        return None


def _multi(raw: Any) -> List[str]:
    """A ``multi:`` leaf: one value is a string, several are a list."""
    if raw is None:
        return []
    if isinstance(raw, list):
        return [str(item) for item in raw if item is not None and str(item) != ""]
    if isinstance(raw, dict):
        return [str(key) for key in raw.keys() if str(key) != ""]
    text = str(raw)
    return [text] if text else []


def _admin_groups(raw: Any) -> List[Dict[str, Any]]:
    if not isinstance(raw, dict):
        return []
    groups = []
    for name, cfg in raw.items():
        cfg = cfg if isinstance(cfg, dict) else {}
        groups.append({"name": name, "bit_position": _safe_int(cfg.get("bit-position"))})
    return groups


def _interfaces(raw: Any) -> List[Dict[str, Any]]:
    if not isinstance(raw, dict):
        return []
    interfaces = []
    for name, cfg in raw.items():
        cfg = cfg if isinstance(cfg, dict) else {}
        interfaces.append(
            {
                "name": name,
                "admin_groups": _multi(cfg.get("admin-group")),
                "max_bandwidth": _safe_int(cfg.get("max-bandwidth")),
                "max_reservable_bandwidth": _safe_int(cfg.get("max-reservable-bandwidth")),
                "metric": _safe_int(cfg.get("metric")),
            }
        )
    return interfaces


def parse_config(_mapper, full_config: Dict[str, Any]) -> Dict[str, Any]:
    """Normalise full VyOS config into the GET /vyos/traffic-engineering/config payload."""
    protocols = full_config.get("protocols") or {}
    configured = isinstance(protocols, dict) and "traffic-engineering" in protocols
    raw = protocols.get("traffic-engineering") if configured else None
    raw = raw if isinstance(raw, dict) else {}
    return {
        "configured": configured,
        "admin_groups": _admin_groups(raw.get("admin-group")),
        "interfaces": _interfaces(raw.get("interface")),
    }
