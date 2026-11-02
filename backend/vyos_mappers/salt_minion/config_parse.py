"""Read-model for Salt Minion config.

Mappers own VyOS tree shape. Routers call parse_config and do not rebuild
the tree. Version keys come from the mapper (MergedMapper), not from
hardcoded 1.4/1.5 branches here.
"""

from typing import Any, Dict, List, Optional


def _parse_int(value: Any) -> Optional[int]:
    if value is None:
        return None
    try:
        return int(value)
    except (ValueError, TypeError):
        return None


def _parse_masters(sm_raw: dict) -> List[str]:
    master = sm_raw.get("master")
    if master is None:
        return []
    if isinstance(master, list):
        return sorted(str(v) for v in master)
    if isinstance(master, dict):
        return sorted(master.keys())
    return [str(master)]


def _empty() -> Dict[str, Any]:
    return {
        "hash": None,
        "id": None,
        "interval": None,
        "master_key": None,
        "masters": [],
        "source_interface": None,
    }


def parse_config(_mapper, full_config: Dict[str, Any]) -> Dict[str, Any]:
    """Normalise full VyOS config into the GET /vyos/salt-minion/config payload."""
    sm_raw = full_config.get("service", {}).get("salt-minion", {})
    if not sm_raw:
        return _empty()

    return {
        "hash": sm_raw.get("hash"),
        "id": sm_raw.get("id"),
        "interval": _parse_int(sm_raw.get("interval")),
        "master_key": sm_raw.get("master-key"),
        "masters": _parse_masters(sm_raw),
        "source_interface": sm_raw.get("source-interface"),
    }
