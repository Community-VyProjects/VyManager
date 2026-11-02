"""Read-model for OSPFv3 config.

Mappers own VyOS tree shape. Routers call parse_config and do not rebuild
the tree. Functions return plain dicts, lists, or None. OSPFv3 parse does
not branch on version; both 1.4 and 1.5 use this tree.
"""

from typing import Any, Dict, List, Optional


def _deep_get(d: Any, *keys):
    """Safely traverse nested dicts."""
    for key in keys:
        if not isinstance(d, dict):
            return None
        d = d.get(key)
        if d is None:
            return None
    return d


def _safe_int(value) -> Optional[int]:
    """Safely convert to int."""
    if value is None:
        return None
    try:
        return int(value)
    except (ValueError, TypeError):
        return None


def _to_list(value) -> List[str]:
    """Convert VyOS config value to list (handles string or list)."""
    if value is None:
        return []
    if isinstance(value, list):
        return value
    if isinstance(value, str):
        return [value]
    return []


def parse_config(_mapper, full_config: Dict[str, Any]) -> Dict[str, Any]:
    """Normalise full VyOS config into the GET /vyos/ospfv3/config payload."""
    ospfv3_config = full_config.get("protocols", {}).get("ospfv3", {})
    if not ospfv3_config:
        return {}

    areas = parse_areas(ospfv3_config.get("area", {}))
    interfaces = parse_interfaces(ospfv3_config.get("interface", {}))

    # Interface-based area assignment (`set protocols ospfv3 interface <name> area <id>`)
    # does not create a `protocols ospfv3 area <id>` node. Surface those areas so
    # they still appear in the Areas tab even with no explicit area block.
    known_area_ids = {area["area_id"] for area in areas}
    for iface in interfaces:
        if iface.get("area") and iface["area"] not in known_area_ids:
            areas.append({"area_id": iface["area"]})
            known_area_ids.add(iface["area"])

    log_adj = ospfv3_config.get("log-adjacency-changes")
    return {
        "parameters": parse_parameters(ospfv3_config.get("parameters", {})),
        "areas": areas,
        "interfaces": interfaces,
        "redistribute": parse_redistribute(ospfv3_config.get("redistribute", {})),
        "default_information": parse_default_information(
            ospfv3_config.get("default-information", {})
        ),
        "distance": parse_distance(ospfv3_config),
        "graceful_restart": parse_graceful_restart(
            ospfv3_config.get("graceful-restart", {})
        ),
        "auto_cost_reference_bandwidth": _safe_int(
            _deep_get(ospfv3_config, "auto-cost", "reference-bandwidth")
        ),
        "log_adjacency_changes": (
            "log-adjacency-changes" in ospfv3_config if ospfv3_config else None
        ),
        "log_adjacency_changes_detail": (
            "detail" in (ospfv3_config.get("log-adjacency-changes", {}) or {})
            if isinstance(log_adj, dict)
            else False
        ),
    }


def parse_parameters(raw: dict) -> Dict[str, Any]:
    if not raw:
        return {}
    return {
        "router_id": raw.get("router-id"),
    }


def parse_areas(raw: dict) -> List[Dict[str, Any]]:
    if not raw:
        return []

    areas = []
    for area_id, config in raw.items():
        if config is None:
            config = {}

        # Parse area type
        area_type_raw = config.get("area-type", {}) or {}
        area_type = None
        area_type_no_summary = False
        area_type_default_cost = None
        nssa_default_information_originate = False

        if "stub" in area_type_raw:
            area_type = "stub"
            stub_config = area_type_raw.get("stub", {}) or {}
            if isinstance(stub_config, dict):
                area_type_no_summary = "no-summary" in stub_config
                area_type_default_cost = _safe_int(stub_config.get("default-cost"))
        elif "nssa" in area_type_raw:
            area_type = "nssa"
            nssa_config = area_type_raw.get("nssa", {}) or {}
            if isinstance(nssa_config, dict):
                area_type_no_summary = "no-summary" in nssa_config
                area_type_default_cost = _safe_int(nssa_config.get("default-cost"))
                nssa_default_information_originate = (
                    "default-information-originate" in nssa_config
                )
        elif "normal" in area_type_raw:
            area_type = "normal"

        # Parse ranges
        ranges = []
        for prefix, range_config in (config.get("range", {}) or {}).items():
            if range_config is None:
                range_config = {}
            ranges.append(
                {
                    "prefix": prefix,
                    "advertise": "advertise" in range_config,
                    "not_advertise": "not-advertise" in range_config,
                }
            )

        areas.append(
            {
                "area_id": area_id,
                "area_type": area_type,
                "area_type_no_summary": area_type_no_summary,
                "area_type_default_cost": area_type_default_cost,
                "nssa_default_information_originate": nssa_default_information_originate,
                "ranges": ranges,
                "export_list": config.get("export-list"),
                "import_list": config.get("import-list"),
            }
        )

    return areas


def parse_interfaces(raw: dict) -> List[Dict[str, Any]]:
    if not raw:
        return []

    interfaces = []
    for iface_name, config in raw.items():
        if config is None:
            config = {}

        # Parse BFD
        bfd_raw = config.get("bfd")
        bfd = False
        bfd_profile = None
        if bfd_raw is not None:
            bfd = True
            if isinstance(bfd_raw, dict):
                bfd_profile = bfd_raw.get("profile")

        interfaces.append(
            {
                "name": iface_name,
                "area": config.get("area"),
                "cost": _safe_int(config.get("cost")),
                "priority": _safe_int(config.get("priority")),
                "hello_interval": _safe_int(config.get("hello-interval")),
                "dead_interval": _safe_int(config.get("dead-interval")),
                "retransmit_interval": _safe_int(config.get("retransmit-interval")),
                "transmit_delay": _safe_int(config.get("transmit-delay")),
                "network": config.get("network"),
                "passive": "passive" in config,
                "bfd": bfd,
                "bfd_profile": bfd_profile,
                "mtu_ignore": "mtu-ignore" in config,
                "ifmtu": _safe_int(config.get("ifmtu")),
                "instance_id": _safe_int(config.get("instance-id")),
            }
        )

    return interfaces


def parse_redistribute(raw: dict) -> List[Dict[str, Any]]:
    if not raw:
        return []

    redistribute = []
    for protocol, config in raw.items():
        if config is None:
            config = {}

        redistribute.append(
            {
                "protocol": protocol,
                "metric": config.get("metric") if isinstance(config, dict) else None,
                "metric_type": (
                    config.get("metric-type") if isinstance(config, dict) else None
                ),
                "route_map": config.get("route-map") if isinstance(config, dict) else None,
            }
        )

    return redistribute


def parse_default_information(raw: dict) -> Dict[str, Any]:
    if not raw:
        return {}

    originate = raw.get("originate", {})
    if not originate:
        return {}

    if not isinstance(originate, dict):
        return {"enabled": True}

    return {
        "enabled": True,
        "always": "always" in originate,
        "metric": _safe_int(originate.get("metric")),
        "metric_type": _safe_int(originate.get("metric-type")),
        "route_map": originate.get("route-map"),
    }


def parse_distance(ospfv3_config: dict) -> Dict[str, Any]:
    distance_raw = ospfv3_config.get("distance", {}) or {}
    if not distance_raw:
        return {}

    ospfv3_distance = distance_raw.get("ospfv3", {}) or {}
    return {
        "global_value": _safe_int(distance_raw.get("global")),
        "ospfv3": {
            "external": _safe_int(ospfv3_distance.get("external")),
            "inter_area": _safe_int(ospfv3_distance.get("inter-area")),
            "intra_area": _safe_int(ospfv3_distance.get("intra-area")),
        },
    }


def parse_graceful_restart(raw: dict) -> Dict[str, Any]:
    if not raw:
        return {}

    helper_raw = raw.get("helper", {}) or {}

    # Parse helper enable - can be a flag or have router-id values
    enable_raw = helper_raw.get("enable", {})
    helper_enable = False
    router_ids = []
    if enable_raw is not None:
        helper_enable = True
        if isinstance(enable_raw, dict):
            rid_raw = enable_raw.get("router-id")
            if isinstance(rid_raw, dict):
                router_ids = [str(k) for k in rid_raw.keys()]
            else:
                router_ids = _to_list(rid_raw)

    return {
        "enabled": bool(raw),
        "grace_period": _safe_int(raw.get("grace-period")),
        "helper": {
            "enable": helper_enable,
            "router_ids": router_ids,
            "lsa_check_disable": "lsa-check-disable" in helper_raw,
            "planned_only": "planned-only" in helper_raw,
            "supported_grace_time": _safe_int(helper_raw.get("supported-grace-time")),
        },
    }
