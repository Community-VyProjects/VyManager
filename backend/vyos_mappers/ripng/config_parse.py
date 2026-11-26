"""Read-model for RIPng config.

Mappers own VyOS tree shape. Routers call parse_config and do not rebuild
the tree. RIPng parse does not branch on version; both 1.4 and 1.5 use this
tree. Valueless nodes are read by key membership: a bare node parses as {}
(or None), which is falsy but present.
"""

from typing import Any, Dict, List, Optional


def _dict(value: Any) -> Dict[str, Any]:
    return value if isinstance(value, dict) else {}


def _safe_int(value: Any) -> Optional[int]:
    if value is None:
        return None
    try:
        return int(value)
    except (ValueError, TypeError):
        return None


def _text(value: Any) -> Optional[str]:
    return value if isinstance(value, str) and value else None


def _to_list(value: Any) -> List[str]:
    if value is None:
        return []
    if isinstance(value, list):
        return [v for v in value if isinstance(v, str)]
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
        "configured": False,
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


def _list_filters(raw: Any) -> Dict[str, Optional[str]]:
    node = _dict(raw)
    acl = _dict(node.get("access-list"))
    pl = _dict(node.get("prefix-list"))
    return {
        "access_list_in": _text(acl.get("in")),
        "access_list_out": _text(acl.get("out")),
        "prefix_list_in": _text(pl.get("in")),
        "prefix_list_out": _text(pl.get("out")),
    }


def parse_distribute_list(raw: Any) -> Dict[str, Any]:
    node = _dict(raw)
    if not node:
        return _empty_distribute_list()

    # A bare `distribute-list interface <if>` is still listed so it can be
    # edited or deleted; every list on it reads None.
    iface_filters = [
        {"interface": iface, **_list_filters(iface_raw)}
        for iface, iface_raw in _dict(node.get("interface")).items()
    ]
    return {"global_filters": _list_filters(node), "interface_filters": iface_filters}


def parse_interfaces(raw: Any) -> List[Dict[str, Any]]:
    interfaces = []
    for iface_name, cfg in _dict(raw).items():
        split_horizon_raw = _dict(_dict(cfg).get("split-horizon"))
        split_horizon = None
        if "poison-reverse" in split_horizon_raw:
            split_horizon = "poison-reverse"
        elif "disable" in split_horizon_raw:
            split_horizon = "disable"
        interfaces.append({"name": iface_name, "split_horizon": split_horizon})
    return interfaces


def parse_redistribute(raw: Any) -> List[Dict[str, Any]]:
    entries = []
    for protocol, cfg in _dict(raw).items():
        node = _dict(cfg)
        entries.append(
            {
                "protocol": protocol,
                "metric": _safe_int(node.get("metric")),
                "route_map": _text(node.get("route-map")),
            }
        )
    return entries


def parse_timers(raw: Any) -> Dict[str, Optional[int]]:
    node = _dict(raw)
    return {
        "update": _safe_int(node.get("update")),
        "timeout": _safe_int(node.get("timeout")),
        "garbage_collection": _safe_int(node.get("garbage-collection")),
    }


def parse_config(_mapper, full_config: Dict[str, Any]) -> Dict[str, Any]:
    """Normalise full VyOS config into the GET /vyos/ripng/config payload."""
    protocols = _dict(_dict(full_config).get("protocols"))
    if "ripng" not in protocols:
        return _empty()
    # A bare `protocols ripng` node still exists and can be deleted.
    ripng_raw = _dict(protocols["ripng"])

    return {
        "configured": True,
        "default_information_originate": "originate" in _dict(ripng_raw.get("default-information")),
        "default_metric": _safe_int(ripng_raw.get("default-metric")),
        "route_map": _text(ripng_raw.get("route-map")),
        "aggregate_addresses": _to_list(ripng_raw.get("aggregate-address")),
        "networks": _to_list(ripng_raw.get("network")),
        "routes": _to_list(ripng_raw.get("route")),
        "passive_interfaces": _to_list(ripng_raw.get("passive-interface")),
        "distribute_list": parse_distribute_list(ripng_raw.get("distribute-list")),
        "interfaces": parse_interfaces(ripng_raw.get("interface")),
        "redistribute": parse_redistribute(ripng_raw.get("redistribute")),
        "timers": parse_timers(ripng_raw.get("timers")),
    }
