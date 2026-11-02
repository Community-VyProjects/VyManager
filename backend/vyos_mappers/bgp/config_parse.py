"""Read-model for BGP config.

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


def parse_config(mapper, full_config: Dict[str, Any]) -> Dict[str, Any]:
    """Normalise full VyOS config into the GET /vyos/bgp/config payload."""
    bgp_config = full_config.get("protocols", {}).get("bgp", {})
    if not bgp_config:
        return {}

    srv6 = bgp_config.get("srv6")
    return {
        "system_as": bgp_config.get("system-as"),
        "timers": parse_timers(bgp_config.get("timers", {})),
        "parameters": parse_parameters(bgp_config.get("parameters", {})),
        "neighbors": parse_neighbors(bgp_config.get("neighbor", {})),
        "peer_groups": parse_peer_groups(bgp_config.get("peer-group", {})),
        "address_families": parse_address_families(
            bgp_config.get("address-family", {}), mapper
        ),
        "listen": parse_listen(bgp_config.get("listen", {})),
        "srv6_locator": srv6.get("locator") if srv6 else None,
        "sid_vpn_per_vrf_export": _deep_get(
            bgp_config, "sid", "vpn", "per-vrf", "export"
        ),
    }


def parse_timers(raw: dict) -> Dict[str, Any]:
    if not raw:
        return {}
    return {
        "keepalive": _safe_int(raw.get("keepalive")),
        "holdtime": _safe_int(raw.get("holdtime")),
    }


def parse_parameters(raw: dict) -> Dict[str, Any]:
    if not raw:
        return {}

    bestpath_raw = raw.get("bestpath", {}) or {}
    as_path_raw = bestpath_raw.get("as-path", {}) or {}
    # as-path can be a dict of flags or a list
    if isinstance(as_path_raw, dict):
        as_path_confed = "confed" in as_path_raw
        as_path_ignore = "ignore" in as_path_raw
        as_path_multipath_relax = "multipath-relax" in as_path_raw
    elif isinstance(as_path_raw, list):
        as_path_confed = "confed" in as_path_raw
        as_path_ignore = "ignore" in as_path_raw
        as_path_multipath_relax = "multipath-relax" in as_path_raw
    else:
        as_path_confed = as_path_ignore = as_path_multipath_relax = False

    med_raw = bestpath_raw.get("med")
    med_list = _to_list(med_raw) if med_raw else None

    dampening_raw = raw.get("dampening", {}) or {}
    confederation_raw = raw.get("confederation", {}) or {}
    distance_raw = (
        raw.get("distance", {}).get("global", {}) if raw.get("distance") else {}
    )
    tcp_raw = raw.get("tcp-keepalive", {}) or {}
    gr_raw = raw.get("graceful-restart", {}) or {}

    confederation_peers = confederation_raw.get("peers")
    if confederation_peers is not None:
        confederation_peers = _to_list(confederation_peers)

    return {
        "router_id": raw.get("router-id"),
        "cluster_id": raw.get("cluster-id"),
        "default_local_pref": _safe_int(_deep_get(raw, "default", "local-pref")),
        "minimum_holdtime": _safe_int(raw.get("minimum-holdtime")),
        "labeled_unicast": raw.get("labeled-unicast"),
        "log_neighbor_changes": "log-neighbor-changes" in raw,
        "always_compare_med": "always-compare-med" in raw,
        "deterministic_med": "deterministic-med" in raw,
        "ebgp_requires_policy": "ebgp-requires-policy" in raw,
        "graceful_shutdown": "graceful-shutdown" in raw,
        "no_client_to_client_reflection": "no-client-to-client-reflection" in raw,
        "no_fast_external_failover": "no-fast-external-failover" in raw,
        "allow_martian_nexthop": "allow-martian-nexthop" in raw,
        "disable_ebgp_connected_route_check": "disable-ebgp-connected-route-check" in raw,
        "fast_convergence": "fast-convergence" in raw,
        "network_import_check": "network-import-check" in raw,
        "reject_as_sets": "reject-as-sets" in raw,
        "route_reflector_allow_outbound_policy": (
            "route-reflector-allow-outbound-policy" in raw
        ),
        "suppress_fib_pending": "suppress-fib-pending" in raw,
        "shutdown": "shutdown" in raw,
        "no_hard_administrative_reset": "no-hard-administrative-reset" in raw,
        "no_suppress_duplicates": "no-suppress-duplicates" in raw,
        "no_ipv6_auto_ra": "no-ipv6-auto-ra" in raw,
        "bestpath": {
            "as_path_confed": as_path_confed,
            "as_path_ignore": as_path_ignore,
            "as_path_multipath_relax": as_path_multipath_relax,
            "bandwidth": bestpath_raw.get("bandwidth"),
            "compare_routerid": "compare-routerid" in bestpath_raw,
            "med": med_list,
            "peer_type_multipath_relax": "multipath-relax"
            in (bestpath_raw.get("peer-type", {}) or {}),
        },
        "dampening": {
            "half_life": _safe_int(dampening_raw.get("half-life")),
            "re_use": _safe_int(dampening_raw.get("re-use")),
            "start_suppress_time": _safe_int(dampening_raw.get("start-suppress-time")),
            "max_suppress_time": _safe_int(dampening_raw.get("max-suppress-time")),
        },
        "confederation": {
            "identifier": _safe_int(confederation_raw.get("identifier")),
            "peers": confederation_peers,
        },
        "distance_global": {
            "external": _safe_int(distance_raw.get("external")) if distance_raw else None,
            "internal": _safe_int(distance_raw.get("internal")) if distance_raw else None,
            "local": _safe_int(distance_raw.get("local")) if distance_raw else None,
        },
        "graceful_restart_stalepath_time": (
            _safe_int(gr_raw.get("stalepath-time")) if gr_raw else None
        ),
        "conditional_advertisement_timer": _safe_int(
            _deep_get(raw, "conditional-advertisement", "timer")
        ),
        "tcp_keepalive": {
            "idle": _safe_int(tcp_raw.get("idle")),
            "interval": _safe_int(tcp_raw.get("interval")),
            "probes": _safe_int(tcp_raw.get("probes")),
        },
    }


def parse_neighbor_af_config(af_raw: dict) -> Dict[str, Any]:
    """Parse per-AFI neighbor/peer-group address-family config."""
    if not af_raw:
        return {}

    rm = af_raw.get("route-map", {}) or {}
    pl = af_raw.get("prefix-list", {}) or {}
    fl = af_raw.get("filter-list", {}) or {}
    dl = af_raw.get("distribute-list", {}) or {}
    au = af_raw.get("attribute-unchanged", {}) or {}
    dsc = af_raw.get("disable-send-community", {}) or {}
    do = af_raw.get("default-originate", {}) or {}
    rpa = af_raw.get("remove-private-as", {}) or {}
    ns = af_raw.get("nexthop-self", {}) or {}

    # default-originate is either a flag (empty dict) or has route-map
    do_enabled = "default-originate" in af_raw
    do_route_map = do.get("route-map") if isinstance(do, dict) else None

    return {
        "route_map_export": rm.get("export"),
        "route_map_import": rm.get("import"),
        "prefix_list_export": pl.get("export"),
        "prefix_list_import": pl.get("import"),
        "filter_list_export": fl.get("export"),
        "filter_list_import": fl.get("import"),
        "distribute_list_export": (
            dl.get("export")
            if isinstance(dl.get("export"), str)
            else (_safe_int(dl.get("export")) if dl.get("export") else None)
        ),
        "distribute_list_import": (
            dl.get("import")
            if isinstance(dl.get("import"), str)
            else (_safe_int(dl.get("import")) if dl.get("import") else None)
        ),
        "soft_reconfiguration_inbound": "inbound"
        in (af_raw.get("soft-reconfiguration", {}) or {}),
        "route_reflector_client": "route-reflector-client" in af_raw,
        "route_server_client": "route-server-client" in af_raw,
        "nexthop_self": "nexthop-self" in af_raw,
        "nexthop_self_force": "force" in ns if isinstance(ns, dict) else False,
        "addpath_tx_all": "addpath-tx-all" in af_raw,
        "addpath_tx_per_as": "addpath-tx-per-as" in af_raw,
        "allowas_in_number": _safe_int(_deep_get(af_raw, "allowas-in", "number")),
        "as_override": "as-override" in af_raw,
        "attribute_unchanged_as_path": "as-path" in au if isinstance(au, dict) else False,
        "attribute_unchanged_med": "med" in au if isinstance(au, dict) else False,
        "attribute_unchanged_next_hop": (
            "next-hop" in au if isinstance(au, dict) else False
        ),
        "default_originate": do_enabled,
        "default_originate_route_map": do_route_map,
        "maximum_prefix": _safe_int(af_raw.get("maximum-prefix")),
        "maximum_prefix_out": _safe_int(af_raw.get("maximum-prefix-out")),
        "remove_private_as": "remove-private-as" in af_raw,
        "remove_private_as_all": "all" in rpa if isinstance(rpa, dict) else False,
        "disable_send_community_extended": (
            "extended" in dsc if isinstance(dsc, dict) else False
        ),
        "disable_send_community_standard": (
            "standard" in dsc if isinstance(dsc, dict) else False
        ),
        "weight": _safe_int(af_raw.get("weight")),
        "unsuppress_map": af_raw.get("unsuppress-map"),
    }


def parse_neighbor_address_families(neighbor_config: dict) -> Dict[str, Dict[str, Any]]:
    """Parse all address-families for a neighbor or peer-group."""
    af_raw = neighbor_config.get("address-family", {})
    if not af_raw:
        return {}

    result = {}
    for afi, afi_config in af_raw.items():
        if afi_config is None:
            afi_config = {}
        result[afi] = parse_neighbor_af_config(afi_config)
    return result


def parse_neighbors(raw: dict) -> List[Dict[str, Any]]:
    """Parse BGP neighbor configurations."""
    neighbors = []

    for addr, config in raw.items():
        if config is None:
            config = {}

        bfd_raw = config.get("bfd", {}) or {}
        cap_raw = config.get("capability", {}) or {}
        timers_raw = config.get("timers", {}) or {}
        local_as_raw = config.get("local-as", {}) or {}
        local_role_raw = config.get("local-role", {}) or {}

        # local-as is a tag node: {"65000": {"no-prepend": {"replace-as": {}}}}
        local_as_asn = None
        local_as_no_prepend = False
        if local_as_raw:
            for asn, asn_config in local_as_raw.items():
                local_as_asn = str(asn)
                if isinstance(asn_config, dict):
                    local_as_no_prepend = "replace-as" in (
                        asn_config.get("no-prepend", {}) or {}
                    )
                break

        # local-role is a tag node: {"customer": {"strict": {}}} or just "customer"
        local_role_value = None
        local_role_strict = False
        if local_role_raw:
            if isinstance(local_role_raw, str):
                local_role_value = local_role_raw
            elif isinstance(local_role_raw, dict):
                for role, role_config in local_role_raw.items():
                    local_role_value = role
                    if isinstance(role_config, dict):
                        local_role_strict = "strict" in role_config
                    break

        neighbors.append(
            {
                "address": addr,
                "remote_as": config.get("remote-as"),
                "description": config.get("description"),
                "peer_group": config.get("peer-group"),
                "update_source": config.get("update-source"),
                "password": config.get("password"),
                "port": _safe_int(config.get("port")),
                "shutdown": "shutdown" in config,
                "passive": "passive" in config,
                "solo": "solo" in config,
                "enforce_first_as": "enforce-first-as" in config,
                "override_capability": "override-capability" in config,
                "strict_capability_match": "strict-capability-match" in config,
                "disable_capability_negotiation": "disable-capability-negotiation" in config,
                "disable_connected_check": "disable-connected-check" in config,
                "ebgp_multihop": _safe_int(config.get("ebgp-multihop")),
                "advertisement_interval": _safe_int(config.get("advertisement-interval")),
                "graceful_restart": config.get("graceful-restart"),
                "local_as": {
                    "asn": local_as_asn,
                    "no_prepend_replace_as": local_as_no_prepend,
                },
                "local_role": local_role_value,
                "local_role_strict": local_role_strict,
                "bfd": {
                    "enabled": bool(bfd_raw) or "bfd" in config,
                    "check_control_plane_failure": (
                        "check-control-plane-failure" in bfd_raw
                        if isinstance(bfd_raw, dict)
                        else False
                    ),
                    "profile": bfd_raw.get("profile") if isinstance(bfd_raw, dict) else None,
                },
                "capability": {
                    "dynamic": (
                        "dynamic" in cap_raw if isinstance(cap_raw, dict) else False
                    ),
                    "extended_nexthop": (
                        "extended-nexthop" in cap_raw
                        if isinstance(cap_raw, dict)
                        else False
                    ),
                    "software_version": (
                        "software-version" in cap_raw
                        if isinstance(cap_raw, dict)
                        else False
                    ),
                },
                "timers": {
                    "connect": _safe_int(timers_raw.get("connect")),
                    "keepalive": _safe_int(timers_raw.get("keepalive")),
                    "holdtime": _safe_int(timers_raw.get("holdtime")),
                },
                "ttl_security_hops": _safe_int(_deep_get(config, "ttl-security", "hops")),
                "address_families": parse_neighbor_address_families(config),
            }
        )

    return neighbors


def parse_peer_groups(raw: dict) -> List[Dict[str, Any]]:
    """Parse BGP peer-group configurations."""
    peer_groups = []

    for name, config in raw.items():
        if config is None:
            config = {}

        bfd_raw = config.get("bfd", {}) or {}
        cap_raw = config.get("capability", {}) or {}
        local_as_raw = config.get("local-as", {}) or {}
        local_role_raw = config.get("local-role", {}) or {}

        local_as_asn = None
        local_as_no_prepend = False
        if local_as_raw:
            for asn, asn_config in local_as_raw.items():
                local_as_asn = str(asn)
                if isinstance(asn_config, dict):
                    local_as_no_prepend = "replace-as" in (
                        asn_config.get("no-prepend", {}) or {}
                    )
                break

        local_role_value = None
        local_role_strict = False
        if local_role_raw:
            if isinstance(local_role_raw, str):
                local_role_value = local_role_raw
            elif isinstance(local_role_raw, dict):
                for role, role_config in local_role_raw.items():
                    local_role_value = role
                    if isinstance(role_config, dict):
                        local_role_strict = "strict" in role_config
                    break

        peer_groups.append(
            {
                "name": name,
                "remote_as": config.get("remote-as"),
                "description": config.get("description"),
                "update_source": config.get("update-source"),
                "password": config.get("password"),
                "shutdown": "shutdown" in config,
                "passive": "passive" in config,
                "override_capability": "override-capability" in config,
                "disable_capability_negotiation": "disable-capability-negotiation" in config,
                "disable_connected_check": "disable-connected-check" in config,
                "ebgp_multihop": _safe_int(config.get("ebgp-multihop")),
                "graceful_restart": config.get("graceful-restart"),
                "local_as": {
                    "asn": local_as_asn,
                    "no_prepend_replace_as": local_as_no_prepend,
                },
                "local_role": local_role_value,
                "local_role_strict": local_role_strict,
                "bfd": {
                    "enabled": bool(bfd_raw) or "bfd" in config,
                    "check_control_plane_failure": (
                        "check-control-plane-failure" in bfd_raw
                        if isinstance(bfd_raw, dict)
                        else False
                    ),
                    "profile": bfd_raw.get("profile") if isinstance(bfd_raw, dict) else None,
                },
                "capability": {
                    "dynamic": (
                        "dynamic" in cap_raw if isinstance(cap_raw, dict) else False
                    ),
                    "extended_nexthop": (
                        "extended-nexthop" in cap_raw
                        if isinstance(cap_raw, dict)
                        else False
                    ),
                    "software_version": (
                        "software-version" in cap_raw
                        if isinstance(cap_raw, dict)
                        else False
                    ),
                },
                "ttl_security_hops": _safe_int(_deep_get(config, "ttl-security", "hops")),
                "address_families": parse_neighbor_address_families(config),
            }
        )

    return peer_groups


def parse_address_families(raw: dict, mapper) -> List[Dict[str, Any]]:
    """Parse global address-family configurations."""
    families = []
    evpn_flag_names = mapper.l2vpn_evpn_control_flags()

    for afi, afi_config in raw.items():
        if afi_config is None:
            afi_config = {}

        networks = []
        for prefix, net_config in (afi_config.get("network", {}) or {}).items():
            if net_config is None:
                net_config = {}
            networks.append(
                {
                    "prefix": prefix,
                    "route_map": net_config.get("route-map"),
                    "backdoor": "backdoor" in net_config,
                    "path_limit": _safe_int(net_config.get("path-limit")),
                    "label": net_config.get("label"),
                    "rd": net_config.get("rd"),
                }
            )

        aggregates = []
        for prefix, agg_config in (afi_config.get("aggregate-address", {}) or {}).items():
            if agg_config is None:
                agg_config = {}
            aggregates.append(
                {
                    "prefix": prefix,
                    "as_set": "as-set" in agg_config,
                    "summary_only": "summary-only" in agg_config,
                    "route_map": agg_config.get("route-map"),
                }
            )

        redistribute = []
        for protocol, redist_config in (afi_config.get("redistribute", {}) or {}).items():
            if redist_config is None:
                redist_config = {}
            if protocol == "table":
                # table is a tag node
                for table_id, table_config in (
                    redist_config if isinstance(redist_config, dict) else {}
                ).items():
                    if table_config is None:
                        table_config = {}
                    redistribute.append(
                        {
                            "protocol": "table",
                            "metric": table_config.get("metric"),
                            "route_map": table_config.get("route-map"),
                            "table": str(table_id),
                        }
                    )
            else:
                redistribute.append(
                    {
                        "protocol": protocol,
                        "metric": (
                            redist_config.get("metric")
                            if isinstance(redist_config, dict)
                            else None
                        ),
                        "route_map": (
                            redist_config.get("route-map")
                            if isinstance(redist_config, dict)
                            else None
                        ),
                    }
                )

        max_paths = afi_config.get("maximum-paths", {}) or {}
        evpn_flags = []
        if afi == "l2vpn-evpn":
            evpn_flags = [flag for flag in evpn_flag_names if flag in afi_config]

        families.append(
            {
                "afi": afi,
                "networks": networks,
                "aggregate_addresses": aggregates,
                "redistribute": redistribute,
                "maximum_paths_ebgp": _safe_int(max_paths.get("ebgp")),
                "maximum_paths_ibgp": _safe_int(max_paths.get("ibgp")),
                "evpn_flags": evpn_flags,
            }
        )

    return families


def parse_listen(raw: dict) -> Dict[str, Any]:
    """Parse BGP listen (dynamic neighbors) configuration."""
    if not raw:
        return {}

    ranges = []
    for prefix, range_config in (raw.get("range", {}) or {}).items():
        if range_config is None:
            range_config = {}
        ranges.append(
            {
                "prefix": prefix,
                "peer_group": range_config.get("peer-group"),
            }
        )

    return {
        "limit": _safe_int(raw.get("limit")),
        "ranges": ranges,
    }
