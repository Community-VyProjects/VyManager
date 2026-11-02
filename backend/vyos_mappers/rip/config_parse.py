"""Read-model for RIP config.

Mappers own VyOS tree shape. Routers call parse_config and do not rebuild
the tree.
"""

from typing import Any, Dict, List, Optional


def _safe_int(value) -> Optional[int]:
    if value is None:
        return None
    try:
        return int(value)
    except (ValueError, TypeError):
        return None


def _to_list(value) -> List[str]:
    if value is None:
        return []
    if isinstance(value, list):
        return value
    if isinstance(value, str):
        return [value]
    if isinstance(value, dict):
        return list(value.keys())
    return []


def _empty_distribute_list() -> Dict[str, Any]:
    return {
        "global_filters": {
            "access_list_in": None,
            "access_list_out": None,
            "prefix_list_in": None,
            "prefix_list_out": None,
        },
        "interface_filters": [],
    }


def _parse_distribute_list(raw: dict) -> Dict[str, Any]:
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


def _parse_interfaces(raw: dict) -> List[Dict[str, Any]]:
    if not raw:
        return []

    interfaces = []
    for iface_name, cfg in raw.items():
        if cfg is None:
            cfg = {}

        auth_raw = cfg.get("authentication", {}) or {}
        md5_raw = auth_raw.get("md5", {}) or {}
        plaintext = auth_raw.get("plaintext-password")

        md5_keys = []
        for key_id, key_cfg in md5_raw.items():
            if key_cfg is None:
                key_cfg = {}
            md5_keys.append(
                {
                    "key_id": str(key_id),
                    "password": key_cfg.get("password", "") if isinstance(key_cfg, dict) else "",
                }
            )

        auth_type = None
        if md5_keys:
            auth_type = "md5"
        elif plaintext:
            auth_type = "plaintext"

        split_horizon_raw = cfg.get("split-horizon", {}) or {}
        split_horizon = None
        if "poison-reverse" in split_horizon_raw:
            split_horizon = "poison-reverse"
        elif "disable" in split_horizon_raw:
            split_horizon = "disable"

        interfaces.append(
            {
                "name": iface_name,
                "authentication_type": auth_type,
                "md5_keys": md5_keys,
                "plaintext_password": plaintext,
                "receive_version": (cfg.get("receive", {}) or {}).get("version"),
                "send_version": (cfg.get("send", {}) or {}).get("version"),
                "split_horizon": split_horizon,
            }
        )

    return interfaces


def _parse_network_distances(raw: dict) -> List[Dict[str, Any]]:
    if not raw:
        return []

    entries = []
    for prefix, cfg in raw.items():
        if cfg is None:
            cfg = {}
        entries.append(
            {
                "prefix": prefix,
                "distance": _safe_int(cfg.get("distance")),
                "access_list": cfg.get("access-list"),
            }
        )
    return entries


def _parse_redistribute(raw: dict) -> List[Dict[str, Any]]:
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


def _parse_timers(raw: dict) -> Dict[str, Any]:
    if not raw:
        return {"update": None, "timeout": None, "garbage_collection": None}
    return {
        "update": _safe_int(raw.get("update")),
        "timeout": _safe_int(raw.get("timeout")),
        "garbage_collection": _safe_int(raw.get("garbage-collection")),
    }


def parse_config(_mapper, full_config: Dict[str, Any]) -> Dict[str, Any]:
    """Normalise full VyOS config into the GET /vyos/rip/config payload."""
    rip_raw = full_config.get("protocols", {}).get("rip", {})

    if not rip_raw:
        return {
            "default_distance": None,
            "default_information_originate": False,
            "default_metric": None,
            "route_map": None,
            "version": None,
            "networks": [],
            "neighbors": [],
            "routes": [],
            "passive_interfaces": [],
            "distribute_list": _parse_distribute_list({}),
            "interfaces": [],
            "network_distances": [],
            "redistribute": [],
            "timers": _parse_timers({}),
        }

    return {
        "default_distance": _safe_int(rip_raw.get("default-distance")),
        "default_information_originate": "originate"
        in (rip_raw.get("default-information") or {}),
        "default_metric": _safe_int(rip_raw.get("default-metric")),
        "route_map": rip_raw.get("route-map"),
        "version": rip_raw.get("version"),
        "networks": _to_list(rip_raw.get("network")),
        "neighbors": _to_list(rip_raw.get("neighbor")),
        "routes": _to_list(rip_raw.get("route")),
        "passive_interfaces": _to_list(rip_raw.get("passive-interface")),
        "distribute_list": _parse_distribute_list(rip_raw.get("distribute-list", {})),
        "interfaces": _parse_interfaces(rip_raw.get("interface", {})),
        "network_distances": _parse_network_distances(rip_raw.get("network-distance", {})),
        "redistribute": _parse_redistribute(rip_raw.get("redistribute", {})),
        "timers": _parse_timers(rip_raw.get("timers", {})),
    }
