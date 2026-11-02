"""Read-model for traffic-engineering config.

Mappers own VyOS tree shape. Routers call parse_config and do not rebuild
the tree. The 1.4 branch uses mapper.version, matching the old router check.
"""

from typing import Any, Dict, List, Optional


def _safe_int(value: Any) -> Optional[int]:
    if value is None:
        return None
    try:
        return int(value)
    except (ValueError, TypeError):
        return None


def parse_admin_groups(raw: dict) -> List[Dict[str, Any]]:
    if not raw:
        return []

    groups = []
    for name, cfg in raw.items():
        if cfg is None:
            cfg = {}
        groups.append(
            {
                "name": name,
                "bit_position": _safe_int(cfg.get("bit-position")),
            }
        )
    return groups


def parse_interfaces(raw: dict) -> List[Dict[str, Any]]:
    if not raw:
        return []

    interfaces = []
    for iface_name, cfg in raw.items():
        if cfg is None:
            cfg = {}

        # admin-group is multi-value: may be a list or a single string
        raw_groups = cfg.get("admin-group", [])
        if isinstance(raw_groups, str):
            admin_groups = [raw_groups]
        elif isinstance(raw_groups, list):
            admin_groups = raw_groups
        else:
            admin_groups = list(raw_groups) if raw_groups else []

        interfaces.append(
            {
                "name": iface_name,
                "admin_groups": admin_groups,
                "max_bandwidth": _safe_int(cfg.get("max-bandwidth")),
                "max_reservable_bandwidth": _safe_int(cfg.get("max-reservable-bandwidth")),
                "metric": _safe_int(cfg.get("metric")),
            }
        )
    return interfaces


def _empty() -> Dict[str, Any]:
    return {"admin_groups": [], "interfaces": []}


def parse_config(mapper, full_config: Dict[str, Any]) -> Dict[str, Any]:
    """Normalise full VyOS config into the GET /vyos/traffic-engineering/config payload."""
    if "1.4" in mapper.version:
        return _empty()

    te_raw = full_config.get("protocols", {}).get("traffic-engineering", {})
    if not te_raw:
        return _empty()

    return {
        "admin_groups": parse_admin_groups(te_raw.get("admin-group", {})),
        "interfaces": parse_interfaces(te_raw.get("interface", {})),
    }
