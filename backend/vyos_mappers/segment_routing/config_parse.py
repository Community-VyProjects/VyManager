"""Read-model for segment-routing config.

Mappers own VyOS tree shape. Routers call parse_config and do not rebuild
the tree.
"""

from typing import Any, Dict, List, Optional


def _safe_int(value: Any) -> Optional[int]:
    if value is None:
        return None
    try:
        return int(value)
    except (ValueError, TypeError):
        return None


def parse_locators(raw: dict) -> List[Dict[str, Any]]:
    if not raw:
        return []

    locators = []
    for name, cfg in raw.items():
        if cfg is None:
            cfg = {}

        locators.append(
            {
                "name": name,
                "prefix": cfg.get("prefix"),
                "block_len": _safe_int(cfg.get("block-len")),
                "node_len": _safe_int(cfg.get("node-len")),
                "func_bits": _safe_int(cfg.get("func-bits")),
                "behavior_usid": "behavior-usid" in cfg,
            }
        )

    return locators


def parse_interfaces(raw: dict) -> List[Dict[str, Any]]:
    if not raw:
        return []

    interfaces = []
    for name, cfg in raw.items():
        if cfg is None:
            cfg = {}

        srv6 = cfg.get("srv6", {}) or {}
        interfaces.append(
            {
                "name": name,
                "hmac": srv6.get("hmac"),
            }
        )

    return interfaces


def parse_config(_mapper, full_config: Dict[str, Any]) -> Dict[str, Any]:
    """Normalise full VyOS config into the GET /vyos/segment-routing/config payload."""
    sr_raw = full_config.get("protocols", {}).get("segment-routing", {})
    if not sr_raw:
        return {"locators": [], "interfaces": []}

    return {
        "locators": parse_locators(sr_raw.get("srv6", {}).get("locator", {})),
        "interfaces": parse_interfaces(sr_raw.get("interface", {})),
    }
