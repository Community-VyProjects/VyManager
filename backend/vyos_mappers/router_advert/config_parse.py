"""Read-model for router advertisement config.

Mappers own VyOS tree shape. Routers call parse_config and do not rebuild
the tree.
"""

from typing import Any, Dict, List, Optional


def _to_list(val: Any) -> List[str]:
    if val is None:
        return []
    if isinstance(val, list):
        return val
    return [val]


def _optional_int(value: Any) -> Optional[int]:
    if value is None:
        return None
    return int(value)


def _parse_prefixes(raw: Any) -> List[Dict[str, Any]]:
    if not raw:
        return []
    result = []
    for prefix_str, cfg in raw.items():
        if cfg is None:
            cfg = {}
        result.append(
            {
                "prefix": prefix_str,
                "base_interface": cfg.get("base-interface"),
                "decrement_lifetime": "decrement-lifetime" in cfg,
                "deprecate_prefix": "deprecate-prefix" in cfg,
                "no_autonomous_flag": "no-autonomous-flag" in cfg,
                "no_on_link_flag": "no-on-link-flag" in cfg,
                "preferred_lifetime": cfg.get("preferred-lifetime"),
                "valid_lifetime": cfg.get("valid-lifetime"),
            }
        )
    return result


def _parse_nat64prefixes(raw: Any) -> List[Dict[str, Any]]:
    if not raw:
        return []
    result = []
    for prefix_str, cfg in raw.items():
        if cfg is None:
            cfg = {}
        result.append(
            {
                "prefix": prefix_str,
                "valid_lifetime": cfg.get("valid-lifetime"),
            }
        )
    return result


def _parse_routes(raw: Any) -> List[Dict[str, Any]]:
    if not raw:
        return []
    result = []
    for route_str, cfg in raw.items():
        if cfg is None:
            cfg = {}
        result.append(
            {
                "route": route_str,
                "no_remove_route": "no-remove-route" in cfg,
                "route_preference": cfg.get("route-preference"),
                "valid_lifetime": cfg.get("valid-lifetime"),
            }
        )
    return result


def _parse_interfaces(raw: Any) -> List[Dict[str, Any]]:
    if not raw:
        return []
    result = []
    for iface_name, cfg in raw.items():
        if cfg is None:
            cfg = {}

        interval = cfg.get("interval") or {}
        result.append(
            {
                "name": iface_name,
                "auto_ignore": _to_list(cfg.get("auto-ignore")),
                "captive_portal": cfg.get("captive-portal"),
                "default_lifetime": cfg.get("default-lifetime"),
                "default_preference": cfg.get("default-preference"),
                "dnssl": _to_list(cfg.get("dnssl")),
                "hop_limit": _optional_int(cfg.get("hop-limit")),
                "interval_max": _optional_int(interval.get("max")),
                "interval_min": _optional_int(interval.get("min")),
                "link_mtu": _optional_int(cfg.get("link-mtu")),
                "managed_flag": "managed-flag" in cfg,
                "name_server": _to_list(cfg.get("name-server")),
                "name_server_lifetime": _optional_int(cfg.get("name-server-lifetime")),
                "nat64_prefixes": _parse_nat64prefixes(cfg.get("nat64prefix", {})),
                "no_send_advert": "no-send-advert" in cfg,
                "no_send_interval": "no-send-interval" in cfg,
                "other_config_flag": "other-config-flag" in cfg,
                "prefixes": _parse_prefixes(cfg.get("prefix", {})),
                "reachable_time": _optional_int(cfg.get("reachable-time")),
                "retrans_timer": _optional_int(cfg.get("retrans-timer")),
                "routes": _parse_routes(cfg.get("route", {})),
                "source_address": _to_list(cfg.get("source-address")),
            }
        )
    return result


def _empty() -> Dict[str, Any]:
    return {"interfaces": []}


def parse_config(_mapper, full_config: Dict[str, Any]) -> Dict[str, Any]:
    """Normalise full VyOS config into the GET /vyos/router-advert/config payload."""
    ra_config = full_config.get("service", {}).get("router-advert", {})
    if not ra_config:
        return _empty()
    return {"interfaces": _parse_interfaces(ra_config.get("interface", {}))}
