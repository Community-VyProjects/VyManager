"""Read-model for IS-IS config.

Mappers own VyOS tree shape. Routers call parse_config and do not rebuild
the tree. TI-LFA, remote LFA, and SRv6 locator are 1.5-only nodes; the
router parser reads them on every version, so the result does not differ
by mapper.version.
"""

from typing import Any, Dict, List, Optional, Tuple


def _safe_int(val) -> Optional[int]:
    if val is None:
        return None
    try:
        return int(val)
    except (ValueError, TypeError):
        return None


def _to_list(val) -> List[str]:
    if val is None:
        return []
    if isinstance(val, list):
        return val
    if isinstance(val, dict):
        return list(val.keys())
    return [str(val)]


def parse_global(raw: dict) -> Dict[str, Any]:
    spf_delay_raw = raw.get("spf-delay-ietf", {}) or {}

    area_pwd = raw.get("area-password", {}) or {}
    area_md5 = area_pwd.get("md5") if isinstance(area_pwd, dict) else None
    area_plain = area_pwd.get("plaintext-password") if isinstance(area_pwd, dict) else None

    domain_pwd = raw.get("domain-password", {}) or {}
    domain_md5 = domain_pwd.get("md5") if isinstance(domain_pwd, dict) else None
    domain_plain = domain_pwd.get("plaintext-password") if isinstance(domain_pwd, dict) else None

    net_raw = raw.get("net", {})
    net = list(net_raw.keys()) if isinstance(net_raw, dict) else _to_list(net_raw)

    topology_raw = raw.get("topology")
    topology = None
    if topology_raw is not None:
        if isinstance(topology_raw, dict):
            topology = list(topology_raw.keys())[0] if topology_raw else None
        elif isinstance(topology_raw, str):
            topology = topology_raw

    return {
        "net": net,
        "level": raw.get("level"),
        "metric_style": raw.get("metric-style"),
        "dynamic_hostname": "dynamic-hostname" in raw,
        "purge_originator": "purge-originator" in raw,
        "advertise_passive_only": "advertise-passive-only" in raw,
        "advertise_high_metrics": "advertise-high-metrics" in raw,
        "set_attached_bit": "set-attached-bit" in raw,
        "set_overload_bit": "set-overload-bit" in raw,
        "log_adjacency_changes": "log-adjacency-changes" in raw,
        "topology": topology,
        "lsp_mtu": _safe_int(raw.get("lsp-mtu")),
        "lsp_gen_interval": _safe_int(raw.get("lsp-gen-interval")),
        "lsp_refresh_interval": _safe_int(raw.get("lsp-refresh-interval")),
        "max_lsp_lifetime": _safe_int(raw.get("max-lsp-lifetime")),
        "spf_interval": _safe_int(raw.get("spf-interval")),
        "area_password_md5": area_md5,
        "area_password_plaintext": area_plain,
        "domain_password_md5": domain_md5,
        "domain_password_plaintext": domain_plain,
        "ldp_sync_holddown": _safe_int((raw.get("ldp-sync", {}) or {}).get("holddown")),
        "spf_delay_ietf": {
            "init_delay": _safe_int(spf_delay_raw.get("init-delay")),
            "short_delay": _safe_int(spf_delay_raw.get("short-delay")),
            "long_delay": _safe_int(spf_delay_raw.get("long-delay")),
            "holddown": _safe_int(spf_delay_raw.get("holddown")),
            "time_to_learn": _safe_int(spf_delay_raw.get("time-to-learn")),
        },
    }


def _parse_lfa_level(level_raw) -> Tuple[bool, List[str]]:
    if not isinstance(level_raw, dict):
        return False, []
    enabled = "enable" in level_raw
    excl_raw = (level_raw.get("exclude", {}) or {}).get("interface", {}) or {}
    excl = list(excl_raw.keys()) if isinstance(excl_raw, dict) else _to_list(excl_raw)
    return enabled, excl


def _parse_rlfa_level(lraw) -> Tuple[bool, Optional[int], bool]:
    if not isinstance(lraw, dict):
        return False, None, False
    enabled = True
    max_metric = _safe_int(lraw.get("maximum-metric"))
    tunnel_ldp = isinstance(lraw.get("tunnel"), dict) and "mpls-ldp" in lraw["tunnel"]
    return enabled, max_metric, tunnel_ldp


def parse_one_interface(name: str, cfg: dict) -> Dict[str, Any]:
    pwd_raw = cfg.get("password", {}) or {}
    pwd_md5 = pwd_raw.get("md5") if isinstance(pwd_raw, dict) else None
    pwd_plain = pwd_raw.get("plaintext-password") if isinstance(pwd_raw, dict) else None

    bfd_raw = cfg.get("bfd")
    bfd_enabled = bfd_raw is not None
    bfd_profile = None
    if isinstance(bfd_raw, dict):
        bfd_profile = bfd_raw.get("profile")

    ldp_raw = cfg.get("ldp-sync", {}) or {}
    ldp_holddown = _safe_int(ldp_raw.get("holddown")) if isinstance(ldp_raw, dict) else None
    ldp_disable = "disable" in ldp_raw if isinstance(ldp_raw, dict) else False

    frr_raw = cfg.get("fast-reroute", {}) or {}
    lfa_raw = (frr_raw.get("lfa", {}) or {}) if isinstance(frr_raw, dict) else {}

    lfa_l1_en, lfa_l1_excl = _parse_lfa_level(lfa_raw.get("level-1"))
    lfa_l2_en, lfa_l2_excl = _parse_lfa_level(lfa_raw.get("level-2"))

    # TI-LFA (v1.5+)
    ti_lfa_raw = frr_raw.get("ti-lfa", {}) or {} if isinstance(frr_raw, dict) else {}
    ti_lfa = {
        "enabled": bool(ti_lfa_raw),
        "level1_enabled": "level-1" in ti_lfa_raw,
        "level1_node_protection": isinstance(ti_lfa_raw.get("level-1"), dict)
        and "node-protection" in ti_lfa_raw.get("level-1", {}),
        "level1_link_fallback": isinstance(ti_lfa_raw.get("level-1"), dict)
        and isinstance(ti_lfa_raw["level-1"].get("node-protection"), dict)
        and "link-fallback" in ti_lfa_raw["level-1"]["node-protection"],
        "level2_enabled": "level-2" in ti_lfa_raw,
        "level2_node_protection": isinstance(ti_lfa_raw.get("level-2"), dict)
        and "node-protection" in ti_lfa_raw.get("level-2", {}),
        "level2_link_fallback": isinstance(ti_lfa_raw.get("level-2"), dict)
        and isinstance(ti_lfa_raw["level-2"].get("node-protection"), dict)
        and "link-fallback" in ti_lfa_raw["level-2"]["node-protection"],
    }

    # Remote LFA (v1.5+)
    rlfa_raw = frr_raw.get("remote-lfa", {}) or {} if isinstance(frr_raw, dict) else {}
    rl1_en, rl1_mm, rl1_ldp = _parse_rlfa_level(rlfa_raw.get("level-1"))
    rl2_en, rl2_mm, rl2_ldp = _parse_rlfa_level(rlfa_raw.get("level-2"))

    return {
        "name": name,
        "circuit_type": cfg.get("circuit-type"),
        "metric": _safe_int(cfg.get("metric")),
        "hello_interval": _safe_int(cfg.get("hello-interval")),
        "hello_multiplier": _safe_int(cfg.get("hello-multiplier")),
        "hello_padding": "hello-padding" in cfg,
        "passive": "passive" in cfg,
        "point_to_point": isinstance(cfg.get("network"), dict)
        and "point-to-point" in cfg["network"],
        "priority": _safe_int(cfg.get("priority")),
        "psnp_interval": _safe_int(cfg.get("psnp-interval")),
        "no_three_way_handshake": "no-three-way-handshake" in cfg,
        "password_md5": pwd_md5,
        "password_plaintext": pwd_plain,
        "bfd": bfd_enabled,
        "bfd_profile": bfd_profile,
        "ldp_sync_holddown": ldp_holddown,
        "ldp_sync_disable": ldp_disable,
        "lfa": {
            "level1_enabled": lfa_l1_en,
            "level1_exclude_interfaces": lfa_l1_excl,
            "level2_enabled": lfa_l2_en,
            "level2_exclude_interfaces": lfa_l2_excl,
        },
        "ti_lfa": ti_lfa,
        "remote_lfa": {
            "level1_enabled": rl1_en,
            "level1_max_metric": rl1_mm,
            "level1_tunnel_mpls_ldp": rl1_ldp,
            "level2_enabled": rl2_en,
            "level2_max_metric": rl2_mm,
            "level2_tunnel_mpls_ldp": rl2_ldp,
        },
    }


def parse_interfaces(raw: dict) -> List[Dict[str, Any]]:
    if not raw:
        return []
    interfaces = []
    for iface_name, cfg in raw.items():
        if cfg is None:
            cfg = {}
        interfaces.append(parse_one_interface(iface_name, cfg))
    return sorted(interfaces, key=lambda x: x["name"])


def parse_redistribute(raw: dict) -> List[Dict[str, Any]]:
    """Parse redistribute/{af}/{protocol}/{level} entries."""
    if not raw:
        return []
    entries = []
    for protocol, levels in raw.items():
        if not isinstance(levels, dict):
            continue
        for level, level_cfg in levels.items():
            if level_cfg is None:
                level_cfg = {}
            entries.append(
                {
                    "protocol": protocol,
                    "level": level,
                    "metric": _safe_int(level_cfg.get("metric")),
                    "route_map": level_cfg.get("route-map"),
                }
            )
    return sorted(entries, key=lambda x: (x["protocol"], x["level"]))


def parse_default_info(raw: dict) -> List[Dict[str, Any]]:
    """Parse default-information/originate/ipv4/{level} entries."""
    if not raw:
        return []
    entries = []
    for level, cfg in raw.items():
        if cfg is None:
            cfg = {}
        entries.append(
            {
                "level": level,
                "always": "always" in cfg,
                "metric": _safe_int(cfg.get("metric")),
                "route_map": cfg.get("route-map"),
            }
        )
    return sorted(entries, key=lambda x: x["level"])


def parse_segment_routing(raw: dict) -> Dict[str, Any]:
    if not raw:
        return {
            "global_block_low": None,
            "global_block_high": None,
            "local_block_low": None,
            "local_block_high": None,
            "maximum_label_depth": None,
            "prefixes": [],
            "srv6_locator": None,
        }

    gb = raw.get("global-block", {}) or {}
    lb = raw.get("local-block", {}) or {}

    # SRv6 locator (v1.5+)
    srv6_locator = None
    srv6_raw = raw.get("srv6", {}) or {}
    if isinstance(srv6_raw, dict):
        locator_raw = srv6_raw.get("locator", {})
        if isinstance(locator_raw, dict) and locator_raw:
            srv6_locator = list(locator_raw.keys())[0]
        elif isinstance(locator_raw, str):
            srv6_locator = locator_raw

    prefixes = []
    for prefix, pcfg in (raw.get("prefix", {}) or {}).items():
        if pcfg is None:
            pcfg = {}
        index_raw = pcfg.get("index", {}) or {}
        absolute_raw = pcfg.get("absolute", {}) or {}
        prefixes.append(
            {
                "prefix": prefix,
                "index_value": _safe_int(index_raw.get("value")),
                "index_explicit_null": "explicit-null" in index_raw,
                "index_no_php": "no-php-flag" in index_raw,
                "absolute_value": _safe_int(absolute_raw.get("value")),
                "absolute_explicit_null": "explicit-null" in absolute_raw,
                "absolute_no_php": "no-php-flag" in absolute_raw,
            }
        )

    return {
        "global_block_low": _safe_int(gb.get("low-label-value")),
        "global_block_high": _safe_int(gb.get("high-label-value")),
        "local_block_low": _safe_int(lb.get("low-label-value")),
        "local_block_high": _safe_int(lb.get("high-label-value")),
        "maximum_label_depth": _safe_int(raw.get("maximum-label-depth")),
        "prefixes": sorted(prefixes, key=lambda x: x["prefix"]),
        "srv6_locator": srv6_locator,
    }


def parse_traffic_engineering(raw: dict) -> Dict[str, Any]:
    if not raw:
        return {"enabled": False, "address": None, "export": False}
    return {
        "enabled": "enable" in raw,
        "address": raw.get("address"),
        "export": "export" in raw,
    }


def parse_frr_global(raw: dict) -> Dict[str, Any]:
    if not raw:
        return {
            "lfa_load_sharing_disable_level1": False,
            "lfa_load_sharing_disable_level2": False,
            "lfa_priority_limit": [],
            "lfa_tiebreaker": [],
            "lfa_remote_prefix_list": [],
        }
    lfa_raw = raw.get("lfa", {}) or {}
    local_raw = (lfa_raw.get("local", {}) or {}) if isinstance(lfa_raw, dict) else {}
    ls_raw = (local_raw.get("load-sharing", {}) or {}) if isinstance(local_raw, dict) else {}
    disable_raw = (ls_raw.get("disable", {}) or {}) if isinstance(ls_raw, dict) else {}
    pl_raw = (local_raw.get("priority-limit", {}) or {}) if isinstance(local_raw, dict) else {}
    tb_raw = (local_raw.get("tiebreaker", {}) or {}) if isinstance(local_raw, dict) else {}
    remote_raw = (lfa_raw.get("remote", {}) or {}) if isinstance(lfa_raw, dict) else {}
    pl_list_raw = (remote_raw.get("prefix-list", {}) or {}) if isinstance(remote_raw, dict) else {}

    priority_limit: List[Dict[str, str]] = []
    if isinstance(pl_raw, dict):
        for priority, levels in pl_raw.items():
            if not isinstance(levels, dict):
                continue
            for level in levels:
                priority_limit.append({"priority": priority, "level": level})

    tiebreaker: List[Dict[str, str]] = []
    if isinstance(tb_raw, dict):
        for tb_type, type_cfg in tb_raw.items():
            index_map = (type_cfg or {}).get("index", {}) if isinstance(type_cfg, dict) else {}
            if not isinstance(index_map, dict):
                continue
            for index, levels in index_map.items():
                if not isinstance(levels, dict):
                    continue
                for level in levels:
                    tiebreaker.append(
                        {"tb_type": tb_type, "index": str(index), "level": level}
                    )

    remote_pl: List[Dict[str, str]] = []
    if isinstance(pl_list_raw, dict):
        for prefix_list, levels in pl_list_raw.items():
            if not isinstance(levels, dict):
                continue
            for level in levels:
                remote_pl.append({"prefix_list": prefix_list, "level": level})

    return {
        "lfa_load_sharing_disable_level1": (
            "level-1" in disable_raw if isinstance(disable_raw, dict) else False
        ),
        "lfa_load_sharing_disable_level2": (
            "level-2" in disable_raw if isinstance(disable_raw, dict) else False
        ),
        "lfa_priority_limit": sorted(priority_limit, key=lambda x: (x["priority"], x["level"])),
        "lfa_tiebreaker": sorted(
            tiebreaker, key=lambda x: (x["tb_type"], x["index"], x["level"])
        ),
        "lfa_remote_prefix_list": sorted(
            remote_pl, key=lambda x: (x["prefix_list"], x["level"])
        ),
    }


def _empty_isis() -> Dict[str, Any]:
    return {
        "enabled": False,
        "global_config": {},
        "interfaces": [],
        "redistribute_ipv4": [],
        "redistribute_ipv6": [],
        "default_info_ipv4": [],
        "default_info_ipv6": [],
        "segment_routing": {},
        "traffic_engineering": {},
        "fast_reroute": {},
    }


def parse_config(_mapper, full_config: Dict[str, Any]) -> Dict[str, Any]:
    """Normalise full VyOS config into the GET /vyos/isis/config payload."""
    isis_raw = full_config.get("protocols", {}).get("isis", {})
    if not isis_raw:
        return _empty_isis()

    return {
        "enabled": True,
        "global_config": parse_global(isis_raw),
        "interfaces": parse_interfaces(isis_raw.get("interface", {})),
        "redistribute_ipv4": parse_redistribute(
            isis_raw.get("redistribute", {}).get("ipv4", {})
        ),
        "redistribute_ipv6": parse_redistribute(
            isis_raw.get("redistribute", {}).get("ipv6", {})
        ),
        "default_info_ipv4": parse_default_info(
            isis_raw.get("default-information", {}).get("originate", {}).get("ipv4", {})
        ),
        "default_info_ipv6": parse_default_info(
            isis_raw.get("default-information", {}).get("originate", {}).get("ipv6", {})
        ),
        "segment_routing": parse_segment_routing(isis_raw.get("segment-routing", {})),
        "traffic_engineering": parse_traffic_engineering(
            isis_raw.get("traffic-engineering", {})
        ),
        "fast_reroute": parse_frr_global(isis_raw.get("fast-reroute", {})),
    }
