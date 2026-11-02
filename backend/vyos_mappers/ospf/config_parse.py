"""Read-model for OSPF config.

Mappers own VyOS tree shape. Routers call parse_config and do not rebuild
the tree. Functions return plain dicts, lists, or None.
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
    """Normalise full VyOS config into the GET /vyos/ospf/config payload."""
    ospf_config = full_config.get("protocols", {}).get("ospf", {})
    if not ospf_config:
        return {}

    areas = parse_areas(ospf_config.get("area", {}))
    interfaces = parse_interfaces(ospf_config.get("interface", {}))

    # Interface-based area assignment (`set protocols ospf interface <name> area <id>`)
    # does not create a `protocols ospf area <id>` node. Surface those areas so
    # they still appear in the Areas tab even with no explicit area block.
    known_area_ids = {area["area_id"] for area in areas}
    for iface in interfaces:
        if iface.get("area") and iface["area"] not in known_area_ids:
            areas.append({"area_id": iface["area"]})
            known_area_ids.add(iface["area"])

    log_adj = ospf_config.get("log-adjacency-changes")
    passive = ospf_config.get("passive-interface")
    capability = ospf_config.get("capability")
    return {
        "parameters": parse_parameters(ospf_config.get("parameters", {})),
        "areas": areas,
        "interfaces": interfaces,
        "redistribute": parse_redistribute(ospf_config.get("redistribute", {})),
        "default_information": parse_default_information(
            ospf_config.get("default-information", {})
        ),
        "distance": parse_distance(ospf_config),
        "timers_throttle_spf": parse_timers_throttle_spf(ospf_config),
        "max_metric_router_lsa": parse_max_metric(ospf_config),
        "graceful_restart": parse_graceful_restart(ospf_config.get("graceful-restart", {})),
        "neighbors": parse_neighbors(ospf_config.get("neighbor", {})),
        "mpls_te": parse_mpls_te(ospf_config.get("mpls-te", {})),
        "summary_addresses": parse_summary_addresses(ospf_config.get("summary-address", {})),
        "segment_routing": parse_segment_routing(ospf_config.get("segment-routing", {})),
        "auto_cost_reference_bandwidth": _safe_int(
            _deep_get(ospf_config, "auto-cost", "reference-bandwidth")
        ),
        "log_adjacency_changes": (
            "log-adjacency-changes" in ospf_config if ospf_config else None
        ),
        "log_adjacency_changes_detail": (
            "detail" in (ospf_config.get("log-adjacency-changes", {}) or {})
            if isinstance(log_adj, dict)
            else False
        ),
        "passive_interface_default": (
            "default" in (ospf_config.get("passive-interface", {}) or {})
            if isinstance(passive, dict)
            else False
        ),
        "maximum_paths": _safe_int(ospf_config.get("maximum-paths")),
        "ldp_sync_holddown": _safe_int(_deep_get(ospf_config, "ldp-sync", "holddown")),
        "refresh_timers": _safe_int(_deep_get(ospf_config, "refresh", "timers")),
        "aggregation_timer": _safe_int(_deep_get(ospf_config, "aggregation", "timer")),
        "capability_opaque": (
            "opaque" in (ospf_config.get("capability", {}) or {})
            if isinstance(capability, dict)
            else False
        ),
    }


def parse_parameters(raw: dict) -> Dict[str, Any]:
    if not raw:
        return {}
    return {
        "router_id": raw.get("router-id"),
        "abr_type": raw.get("abr-type"),
        "opaque_lsa": "opaque-lsa" in raw,
        "rfc1583_compatibility": "rfc1583-compatibility" in raw,
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
        elif "normal" in area_type_raw:
            area_type = "normal"

        # Parse networks
        networks_raw = config.get("network", {}) or {}
        networks = (
            list(networks_raw.keys())
            if isinstance(networks_raw, dict)
            else _to_list(networks_raw)
        )

        # Parse ranges
        ranges = []
        for prefix, range_config in (config.get("range", {}) or {}).items():
            if range_config is None:
                range_config = {}
            ranges.append(
                {
                    "prefix": prefix,
                    "cost": _safe_int(range_config.get("cost")),
                    "not_advertise": "not-advertise" in range_config,
                    "substitute": range_config.get("substitute"),
                }
            )

        # Parse virtual-links
        virtual_links = []
        for addr, vl_config in (config.get("virtual-link", {}) or {}).items():
            if vl_config is None:
                vl_config = {}
            virtual_links.append(
                {
                    "address": addr,
                    "dead_interval": _safe_int(vl_config.get("dead-interval")),
                    "hello_interval": _safe_int(vl_config.get("hello-interval")),
                    "retransmit_interval": _safe_int(vl_config.get("retransmit-interval")),
                    "retransmit_window": _safe_int(vl_config.get("retransmit-window")),
                    "transmit_delay": _safe_int(vl_config.get("transmit-delay")),
                }
            )

        areas.append(
            {
                "area_id": area_id,
                "area_type": area_type,
                "area_type_no_summary": area_type_no_summary,
                "area_type_default_cost": area_type_default_cost,
                "networks": networks,
                "ranges": ranges,
                "authentication": config.get("authentication"),
                "shortcut": config.get("shortcut"),
                "export_list": config.get("export-list"),
                "import_list": config.get("import-list"),
                "virtual_links": virtual_links,
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

        # Parse authentication
        auth_raw = config.get("authentication", {}) or {}
        md5_raw = _deep_get(auth_raw, "md5", "key-id") or {}
        md5_key_ids = {}
        if isinstance(md5_raw, dict):
            for key_id, key_config in md5_raw.items():
                if isinstance(key_config, dict):
                    md5_key_ids[str(key_id)] = key_config.get("md5-key", "")

        # Passive can be a flag or have a "disable" sub-key
        passive_raw = config.get("passive")
        passive = None
        passive_disable = False
        if passive_raw is not None:
            if isinstance(passive_raw, dict):
                passive_disable = "disable" in passive_raw
                passive = not passive_disable
            else:
                passive = True

        ldp_raw = config.get("ldp-sync")
        ldp_sync_disable = isinstance(ldp_raw, dict) and "disable" in ldp_raw
        ldp_sync_holddown = (
            _safe_int(ldp_raw.get("holddown")) if isinstance(ldp_raw, dict) else None
        )

        interfaces.append(
            {
                "name": iface_name,
                "area": config.get("area"),
                "cost": _safe_int(config.get("cost")),
                "priority": _safe_int(config.get("priority")),
                "hello_interval": _safe_int(config.get("hello-interval")),
                "dead_interval": _safe_int(config.get("dead-interval")),
                "retransmit_interval": _safe_int(config.get("retransmit-interval")),
                "retransmit_window": _safe_int(config.get("retransmit-window")),
                "transmit_delay": _safe_int(config.get("transmit-delay")),
                "network": config.get("network"),
                "passive": passive,
                "passive_disable": passive_disable,
                "bfd": "bfd" in config,
                "mtu_ignore": "mtu-ignore" in config,
                "bandwidth": _safe_int(config.get("bandwidth")),
                "hello_multiplier": _safe_int(config.get("hello-multiplier")),
                "authentication": {
                    "md5_key_ids": md5_key_ids,
                    "plaintext_password": (
                        auth_raw.get("plaintext-password")
                        if isinstance(auth_raw, dict)
                        else None
                    ),
                },
                "ldp_sync": "ldp-sync" in config,
                "ldp_sync_disable": ldp_sync_disable,
                "ldp_sync_holddown": ldp_sync_holddown,
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

        if protocol == "table":
            for table_id, table_config in (config if isinstance(config, dict) else {}).items():
                if table_config is None:
                    table_config = {}
                redistribute.append(
                    {
                        "protocol": "table",
                        "metric": (
                            table_config.get("metric")
                            if isinstance(table_config, dict)
                            else None
                        ),
                        "metric_type": (
                            table_config.get("metric-type")
                            if isinstance(table_config, dict)
                            else None
                        ),
                        "route_map": (
                            table_config.get("route-map")
                            if isinstance(table_config, dict)
                            else None
                        ),
                        "table": str(table_id),
                    }
                )
        else:
            redistribute.append(
                {
                    "protocol": protocol,
                    "metric": config.get("metric") if isinstance(config, dict) else None,
                    "metric_type": (
                        config.get("metric-type") if isinstance(config, dict) else None
                    ),
                    "route_map": (
                        config.get("route-map") if isinstance(config, dict) else None
                    ),
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


def parse_distance(ospf_config: dict) -> Dict[str, Any]:
    distance_raw = ospf_config.get("distance", {}) or {}
    if not distance_raw:
        return {}

    ospf_distance = distance_raw.get("ospf", {}) or {}
    return {
        "global_value": _safe_int(distance_raw.get("global")),
        "ospf": {
            "external": _safe_int(ospf_distance.get("external")),
            "inter_area": _safe_int(ospf_distance.get("inter-area")),
            "intra_area": _safe_int(ospf_distance.get("intra-area")),
        },
    }


def parse_timers_throttle_spf(ospf_config: dict) -> Dict[str, Any]:
    spf_raw = _deep_get(ospf_config, "timers", "throttle", "spf") or {}
    if not spf_raw:
        return {}
    return {
        "delay": _safe_int(spf_raw.get("delay")),
        "initial_holdtime": _safe_int(spf_raw.get("initial-holdtime")),
        "max_holdtime": _safe_int(spf_raw.get("max-holdtime")),
    }


def parse_max_metric(ospf_config: dict) -> Dict[str, Any]:
    router_lsa = _deep_get(ospf_config, "max-metric", "router-lsa") or {}
    if not router_lsa:
        return {}
    return {
        "administrative": "administrative" in router_lsa,
        "on_shutdown": _safe_int(router_lsa.get("on-shutdown")),
        "on_startup": _safe_int(router_lsa.get("on-startup")),
    }


def _helper_router_ids(enable_raw) -> List[str]:
    if not isinstance(enable_raw, dict):
        return []
    rid_raw = enable_raw.get("router-id")
    if isinstance(rid_raw, dict):
        return [str(k) for k in rid_raw.keys()]
    return _to_list(rid_raw)


def parse_graceful_restart(raw: dict) -> Dict[str, Any]:
    if not raw:
        return {}

    helper_raw = raw.get("helper", {}) or {}
    enable_raw = helper_raw.get("enable")
    return {
        "enabled": bool(raw),
        "grace_period": _safe_int(raw.get("grace-period")),
        "helper": {
            "enable": "enable" in helper_raw,
            "router_ids": _helper_router_ids(enable_raw),
            "no_strict_lsa_checking": "no-strict-lsa-checking" in helper_raw,
            "planned_only": "planned-only" in helper_raw,
            "supported_grace_time": _safe_int(helper_raw.get("supported-grace-time")),
        },
    }


def parse_neighbors(raw: dict) -> List[Dict[str, Any]]:
    if not raw:
        return []

    neighbors = []
    for addr, config in raw.items():
        if config is None:
            config = {}
        neighbors.append(
            {
                "address": addr,
                "poll_interval": _safe_int(config.get("poll-interval")),
                "priority": _safe_int(config.get("priority")),
            }
        )

    return neighbors


def parse_mpls_te(raw: dict) -> Dict[str, Any]:
    if not raw:
        return {}
    return {
        "enable": "enable" in raw,
        "router_address": raw.get("router-address"),
    }


def parse_summary_addresses(raw: dict) -> List[Dict[str, Any]]:
    if not raw:
        return []

    addresses = []
    for prefix, config in raw.items():
        if config is None:
            config = {}
        addresses.append(
            {
                "prefix": prefix,
                "no_advertise": "no-advertise" in config,
                "tag": _safe_int(config.get("tag")),
            }
        )
    return addresses


def parse_segment_routing(raw: dict) -> Dict[str, Any]:
    if not raw:
        return {}

    global_block = raw.get("global-block", {}) or {}
    local_block = raw.get("local-block", {}) or {}

    return {
        "global_block_low": _safe_int(global_block.get("low-label-value")),
        "global_block_high": _safe_int(global_block.get("high-label-value")),
        "local_block_low": _safe_int(local_block.get("low-label-value")),
        "local_block_high": _safe_int(local_block.get("high-label-value")),
        "maximum_label_depth": _safe_int(raw.get("maximum-label-depth")),
    }
