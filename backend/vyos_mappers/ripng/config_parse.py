"""Read-model for RIPng config.

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


def _to_list(value: Any) -> List[str]:
    if value is None:
        return []
    if isinstance(value, list):
        return value
    if isinstance(value, str):
        return [value]
    if isinstance(value, dict):
        return list(value.keys())
    return []


def _empty_global_filters() -> Dict[str, Optional[str]]:
    return {
        "access_list_in": None,
        "access_list_out": None,
        "prefix_list_in": None,
        "prefix_list_out": None,
    }


def _empty_distribute_list() -> Dict[str, Any]:
    return {
        "global_filters": _empty_global_filters(),
        "interface_filters": [],
    }


def _empty_timers() -> Dict[str, Optional[int]]:
    return {"update": None, "timeout": None, "garbage_collection": None}


def _empty() -> Dict[str, Any]:
    return {
        "default_information_originate": False,
        "default_metric": None,
        "route_map": None,
        "aggregate_addresses": [],
        "networks": [],
        "routes": [],
        "passive_interfaces": [],
        "distribute_list": _empty_distribute_list(),
        "interfaces": [],
        "redistribute": [],
        "timers": _empty_timers(),
    }


def parse_distribute_list(raw: dict) -> Dict[str, Any]:
    if not raw:
        return _empty_distribute_list()

    acl_raw = raw.get("access-list", {}) or {}
    pl_raw = raw.get("prefix-list", {}) or {}

    global_filters = {
        "access_list_in": acl_raw.get("in") if isinstance(acl_raw, dict) else None,
        "access_list_out": acl_raw.get("out") if isinstance(acl_raw, dict) else None,
        "prefix_list_in": pl_raw.get("in") if isinstance(pl_raw, dict) else None,
        "prefix_list_out": pl_raw.get("out") if isinstance(pl_raw, dict) else None,
    }

    iface_filters = []
    for iface, iface_raw in (raw.get("interface", {}) or {}).items():
        if iface_raw is None:
            iface_raw = {}
        iface_acl = iface_raw.get("access-list", {}) or {}
        iface_pl = iface_raw.get("prefix-list", {}) or {}
        iface_filters.append(
            {
                "interface": iface,
                "access_list_in": iface_acl.get("in") if isinstance(iface_acl, dict) else None,
                "access_list_out": iface_acl.get("out") if isinstance(iface_acl, dict) else None,
                "prefix_list_in": iface_pl.get("in") if isinstance(iface_pl, dict) else None,
                "prefix_list_out": iface_pl.get("out") if isinstance(iface_pl, dict) else None,
            }
        )

    return {"global_filters": global_filters, "interface_filters": iface_filters}


def parse_interfaces(raw: dict) -> List[Dict[str, Any]]:
    if not raw:
        return []

    interfaces = []
    for iface_name, cfg in raw.items():
        if cfg is None:
            cfg = {}

        split_horizon_raw = cfg.get("split-horizon", {}) or {}
        split_horizon = None
        if "poison-reverse" in split_horizon_raw:
            split_horizon = "poison-reverse"
        elif "disable" in split_horizon_raw:
            split_horizon = "disable"

        interfaces.append(
            {
                "name": iface_name,
                "split_horizon": split_horizon,
            }
        )

    return interfaces


def parse_redistribute(raw: dict) -> List[Dict[str, Any]]:
    if not raw:
        return []

    entries = []
    for protocol, cfg in raw.items():
        if cfg is None:
            cfg = {}
        entries.append(
            {
                "protocol": protocol,
                "metric": _safe_int(cfg.get("metric")),
                "route_map": cfg.get("route-map"),
            }
        )
    return entries


def parse_timers(raw: dict) -> Dict[str, Optional[int]]:
    if not raw:
        return _empty_timers()
    return {
        "update": _safe_int(raw.get("update")),
        "timeout": _safe_int(raw.get("timeout")),
        "garbage_collection": _safe_int(raw.get("garbage-collection")),
    }


def parse_config(_mapper, full_config: Dict[str, Any]) -> Dict[str, Any]:
    """Normalise full VyOS config into the GET /vyos/ripng/config payload."""
    ripng_raw = full_config.get("protocols", {}).get("ripng", {})
    if not ripng_raw:
        return _empty()

    return {
        "default_information_originate": "originate" in (ripng_raw.get("default-information") or {}),
        "default_metric": _safe_int(ripng_raw.get("default-metric")),
        "route_map": ripng_raw.get("route-map"),
        "aggregate_addresses": _to_list(ripng_raw.get("aggregate-address")),
        "networks": _to_list(ripng_raw.get("network")),
        "routes": _to_list(ripng_raw.get("route")),
        "passive_interfaces": _to_list(ripng_raw.get("passive-interface")),
        "distribute_list": parse_distribute_list(ripng_raw.get("distribute-list", {})),
        "interfaces": parse_interfaces(ripng_raw.get("interface", {})),
        "redistribute": parse_redistribute(ripng_raw.get("redistribute", {})),
        "timers": parse_timers(ripng_raw.get("timers", {})),
    }
