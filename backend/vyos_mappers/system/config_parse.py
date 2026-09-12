"""Read-model for system config.

Mappers own VyOS tree shape. Routers call parse_config and do not rebuild
the tree. Version keys come from the mapper (MergedMapper), not from
hardcoded 1.4/1.5 branches here.
"""

from typing import Any, Dict, List, Optional


def _as_list(val: Any) -> List[Any]:
    if not val:
        return []
    if isinstance(val, list):
        return val
    if isinstance(val, dict):
        return list(val.keys())
    return [val]


def _int(val: Any) -> Optional[int]:
    return int(val) if val else None


def parse_config(mapper, full_config: Dict[str, Any]) -> Dict[str, Any]:
    """Normalise full VyOS config into the GET /vyos/system/config payload."""
    system_config = full_config.get("system", {}) or {}
    login_raw = system_config.get("login", {}) or {}
    max_ls_raw = login_raw.get("max-login-session")
    return {
        "hostname": system_config.get("host-name"),
        "domain_name": system_config.get("domain-name"),
        "domain_search": parse_domain_search(system_config),
        "name_servers": parse_name_servers(system_config),
        "time_zone": system_config.get("time-zone"),
        "performance": parse_performance(system_config, mapper.version),
        "login": parse_login(system_config),
        "max_login_session": _int(max_ls_raw),
        "login_radius": parse_login_radius(system_config),
        "login_tacacs": parse_login_tacacs(system_config),
        "syslog": parse_syslog(system_config, mapper),
        "syslog_marker": parse_syslog_marker(system_config, mapper),
        "conntrack": parse_conntrack(system_config),
        "conntrack_log": parse_conntrack_log(system_config),
        "conntrack_ignore": parse_conntrack_ignore(system_config),
        "conntrack_global_timeouts": parse_conntrack_global_timeouts(
            system_config, mapper
        ),
        "conntrack_timeout_custom": parse_conntrack_timeout_custom(system_config),
        "ip": parse_ip_settings(system_config),
        "ipv6": parse_ipv6_settings(system_config),
        "config_management": parse_config_management(system_config),
        "static_host_mapping": parse_static_host_mapping(system_config),
        "console_devices": parse_console(system_config),
        "sysctl_parameters": parse_sysctl(system_config),
        "watchdog": parse_watchdog(system_config),
        "wireless_country_code": (system_config.get("wireless") or {}).get(
            "country-code"
        ),
        "frr": parse_frr(system_config),
        "lcd": parse_lcd(system_config),
        "logs": parse_logs(system_config),
        "options": parse_options(system_config),
        "proxy": parse_proxy(system_config),
        "flow_accounting": parse_flow_accounting(system_config, mapper),
        "sflow": parse_sflow(full_config, mapper),
        "task_scheduler": parse_task_scheduler(system_config),
        "update_check": parse_update_check(system_config),
        "acceleration": parse_acceleration(system_config),
    }


def parse_syslog_facilities(raw: dict) -> List[Dict[str, str]]:
    facilities = []
    facility_raw = raw.get("facility", {}) if raw else {}
    if not isinstance(facility_raw, dict):
        return facilities
    for fac_name, fac_cfg in facility_raw.items():
        if fac_cfg is None:
            fac_cfg = {}
        level = fac_cfg.get("level") or "info"
        facilities.append({"facility": fac_name, "level": level})
    return facilities


def parse_syslog(system_config: dict, mapper) -> Dict[str, Any]:
    syslog_raw = system_config.get("syslog", {}) or {}
    local_key = mapper.get_syslog_local_config_key()
    remote_key = mapper.get_syslog_remote_config_key()

    local_raw = syslog_raw.get(local_key, {}) or {}
    local_facilities = parse_syslog_facilities(local_raw)
    preserve_fqdn = "preserve-fqdn" in local_raw or "preserve-fqdn" in syslog_raw

    remote_hosts = []
    remote_raw = syslog_raw.get(remote_key, {}) or {}
    if isinstance(remote_raw, dict):
        for host, host_cfg in remote_raw.items():
            if host_cfg is None:
                host_cfg = {}
            port_val = host_cfg.get("port")
            remote_hosts.append(
                {
                    "host": host,
                    "facilities": parse_syslog_facilities(host_cfg),
                    "port": int(port_val) if port_val else None,
                    "protocol": host_cfg.get("protocol"),
                }
            )

    console_facilities = []
    console_raw = syslog_raw.get("console", {}) or {}
    if console_raw:
        console_facilities = parse_syslog_facilities(console_raw)

    files = []
    file_raw = syslog_raw.get("file", {}) or {}
    if isinstance(file_raw, dict):
        for fname, fcfg in file_raw.items():
            if fcfg is None:
                fcfg = {}
            files.append(
                {
                    "filename": fname,
                    "facilities": parse_syslog_facilities(fcfg),
                }
            )

    users_syslog = []
    user_raw = syslog_raw.get("user", {}) or {}
    if isinstance(user_raw, dict):
        for uname, ucfg in user_raw.items():
            if ucfg is None:
                ucfg = {}
            users_syslog.append(
                {
                    "username": uname,
                    "facilities": parse_syslog_facilities(ucfg),
                }
            )

    return {
        "local_facilities": local_facilities,
        "preserve_fqdn": preserve_fqdn,
        "remote_hosts": remote_hosts,
        "console_facilities": console_facilities,
        "files": files,
        "users": users_syslog,
    }


def parse_login(system_config: dict) -> Dict[str, Any]:
    login_raw = system_config.get("login", {}) or {}
    users_raw = login_raw.get("user", {}) or {}
    users = []
    if isinstance(users_raw, dict):
        for username, user_cfg in users_raw.items():
            if user_cfg is None:
                user_cfg = {}
            auth = user_cfg.get("authentication", {}) or {}
            has_password = bool(
                auth.get("encrypted-password") or auth.get("plaintext-password")
            )
            keys_raw = auth.get("public-keys", {}) or {}
            ssh_keys = []
            if isinstance(keys_raw, dict):
                for key_name, key_cfg in keys_raw.items():
                    if key_cfg is None:
                        key_cfg = {}
                    ssh_keys.append(
                        {"key_name": key_name, "key_type": key_cfg.get("type")}
                    )
            users.append(
                {
                    "username": username,
                    "full_name": user_cfg.get("full-name"),
                    "has_password": has_password,
                    "ssh_keys": ssh_keys,
                }
            )

    timeout_raw = login_raw.get("timeout")
    banner_raw = login_raw.get("banner", {}) or {}
    op_groups_raw = login_raw.get("operator-group", {}) or {}
    operator_groups = (
        list(op_groups_raw.keys()) if isinstance(op_groups_raw, dict) else []
    )
    return {
        "users": users,
        "timeout": int(timeout_raw) if timeout_raw else None,
        "banners": {
            "pre_login": banner_raw.get("pre-login"),
            "post_login": banner_raw.get("post-login"),
        },
        "operator_groups": operator_groups,
    }


def parse_conntrack(system_config: dict) -> Dict[str, Any]:
    ct_raw = system_config.get("conntrack", {}) or {}
    modules_raw = ct_raw.get("modules", {}) or {}
    modules = list(modules_raw.keys()) if isinstance(modules_raw, dict) else []
    tcp_raw = ct_raw.get("tcp", {}) or {}
    tcp_half_open = tcp_raw.get("half-open-connections")
    tcp_max_retrans = tcp_raw.get("max-retrans")
    return {
        "modules": modules,
        "table_size": _int(ct_raw.get("table-size")),
        "hash_size": _int(ct_raw.get("hash-size")),
        "expect_table_size": _int(ct_raw.get("expect-table-size")),
        "tcp_loose": tcp_raw.get("loose"),
        "tcp_half_open_connections": int(tcp_half_open) if tcp_half_open else None,
        "tcp_max_retrans": int(tcp_max_retrans) if tcp_max_retrans else None,
    }


def parse_config_management(system_config: dict) -> Dict[str, Any]:
    cm_raw = system_config.get("config-management", {}) or {}
    revisions = cm_raw.get("commit-revisions")
    archive_raw = cm_raw.get("commit-archive", {}) or {}
    locations_raw = archive_raw.get("location", []) if isinstance(archive_raw, dict) else []
    if isinstance(locations_raw, str):
        locations_raw = [locations_raw]
    return {
        "commit_revisions": int(revisions) if revisions else None,
        "archive_locations": locations_raw if isinstance(locations_raw, list) else [],
    }


def parse_static_host_mapping(system_config: dict) -> List[Dict[str, Any]]:
    shm_raw = system_config.get("static-host-mapping", {}) or {}
    hosts_raw = shm_raw.get("host-name", {}) if isinstance(shm_raw, dict) else {}
    entries = []
    if isinstance(hosts_raw, dict):
        for hostname, host_cfg in hosts_raw.items():
            if host_cfg is None:
                host_cfg = {}
            inet = host_cfg.get("inet") or []
            if isinstance(inet, str):
                inet = [inet]
            aliases_raw = host_cfg.get("alias", [])
            if isinstance(aliases_raw, str):
                aliases_raw = [aliases_raw]
            entries.append(
                {
                    "hostname": hostname,
                    "inet": inet,
                    "aliases": aliases_raw if isinstance(aliases_raw, list) else [],
                }
            )
    return entries


def parse_console(system_config: dict) -> List[Dict[str, Any]]:
    console_raw = system_config.get("console", {}) or {}
    devices_raw = console_raw.get("device", {}) or {}
    devices = []
    if isinstance(devices_raw, dict):
        for dev_name, dev_cfg in devices_raw.items():
            if dev_cfg is None:
                dev_cfg = {}
            devices.append(
                {
                    "device": dev_name,
                    "speed": dev_cfg.get("speed"),
                    "powersave": "powersave" in dev_cfg,
                }
            )
    return devices


def parse_sysctl(system_config: dict) -> List[Dict[str, str]]:
    sysctl_raw = system_config.get("sysctl", {}) or {}
    params_raw = sysctl_raw.get("parameter", {}) or {}
    params = []
    if isinstance(params_raw, dict):
        for pname, pcfg in params_raw.items():
            if pcfg is None:
                pcfg = {}
            val = pcfg.get("value")
            if val is not None:
                params.append({"parameter": pname, "value": str(val)})
    return params


def parse_watchdog(system_config: dict) -> Optional[Dict[str, Any]]:
    wd_raw = system_config.get("watchdog", {})
    if not wd_raw:
        return None
    timeout = wd_raw.get("timeout")
    reboot_timeout = wd_raw.get("reboot-timeout")
    if timeout is None and reboot_timeout is None:
        return None
    return {
        "timeout": int(timeout) if timeout else None,
        "reboot_timeout": int(reboot_timeout) if reboot_timeout else None,
    }


def parse_name_servers(system_config: dict) -> List[str]:
    ns_val = system_config.get("name-server")
    if not ns_val:
        return []
    if isinstance(ns_val, list):
        return ns_val
    return [ns_val]


def parse_domain_search(system_config: dict) -> List[str]:
    ds_raw = system_config.get("domain-search", {}) or {}
    if isinstance(ds_raw, dict):
        domains_raw = ds_raw.get("domain", [])
        if isinstance(domains_raw, list):
            return domains_raw
        if isinstance(domains_raw, str):
            return [domains_raw]
    return []


def parse_performance(system_config: dict, version: str) -> Optional[str]:
    from .performance_versions import get_system_performance_mapper

    perf_mapper = get_system_performance_mapper(version)
    option = system_config.get("option") or {}
    return perf_mapper.parse_performance(option)


def parse_syslog_marker(system_config: dict, mapper) -> Optional[Dict[str, Any]]:
    syslog_raw = system_config.get("syslog", {}) or {}
    local_key = mapper.get_syslog_local_config_key()
    if local_key == "global":
        marker_raw = (syslog_raw.get("global", {}) or {}).get("marker", {}) or {}
    else:
        marker_raw = syslog_raw.get("marker", {}) or {}
    if not marker_raw:
        return None
    interval = marker_raw.get("interval")
    disabled = "disable" in marker_raw
    if interval is None and not disabled:
        return None
    return {
        "interval": int(interval) if interval else None,
        "disabled": disabled,
    }


def parse_login_radius(system_config: dict) -> Optional[Dict[str, Any]]:
    login_raw = system_config.get("login", {}) or {}
    radius_raw = login_raw.get("radius", {}) or {}
    if not radius_raw:
        return None
    servers = []
    for server_ip, server_cfg in (radius_raw.get("server", {}) or {}).items():
        if server_cfg is None:
            server_cfg = {}
        servers.append(
            {
                "server": server_ip,
                "port": int(server_cfg["port"]) if server_cfg.get("port") else None,
                "timeout": int(server_cfg["timeout"]) if server_cfg.get("timeout") else None,
            }
        )
    source_address = radius_raw.get("source-address")
    if isinstance(source_address, list):
        source_address = source_address[0] if source_address else None
    timeout = radius_raw.get("timeout")
    return {
        "servers": servers,
        "source_address": source_address,
        "timeout": int(timeout) if timeout else None,
    }


def parse_login_tacacs(system_config: dict) -> Optional[Dict[str, Any]]:
    login_raw = system_config.get("login", {}) or {}
    tacacs_raw = login_raw.get("tacacs", {}) or {}
    if not tacacs_raw:
        return None
    servers = []
    for server_ip, server_cfg in (tacacs_raw.get("server", {}) or {}).items():
        if server_cfg is None:
            server_cfg = {}
        servers.append(
            {
                "server": server_ip,
                "port": int(server_cfg["port"]) if server_cfg.get("port") else None,
                "timeout": int(server_cfg["timeout"]) if server_cfg.get("timeout") else None,
            }
        )
    source_address = tacacs_raw.get("source-address")
    timeout = tacacs_raw.get("timeout")
    return {
        "servers": servers,
        "source_address": source_address,
        "timeout": int(timeout) if timeout else None,
    }


def parse_conntrack_log(system_config: dict) -> Optional[Dict[str, Any]]:
    ct_raw = system_config.get("conntrack", {}) or {}
    log_raw = ct_raw.get("log", {}) or {}
    if not log_raw:
        return None
    entries = []
    for event, protocols_raw in log_raw.items():
        if protocols_raw is None:
            entries.append({"event": event, "protocol": "all"})
        elif isinstance(protocols_raw, dict):
            for protocol in protocols_raw:
                entries.append({"event": event, "protocol": protocol})
        else:
            entries.append({"event": event, "protocol": "all"})
    if not entries:
        return None
    return {"entries": entries}


def parse_conntrack_ignore(system_config: dict) -> List[Dict[str, Any]]:
    ct_raw = system_config.get("conntrack", {}) or {}
    ignore_raw = ct_raw.get("ignore", {}) or {}
    rules = []
    for ip_version in ("ipv4", "ipv6"):
        rules_raw = (ignore_raw.get(ip_version, {}) or {}).get("rule", {}) or {}
        if isinstance(rules_raw, dict):
            for rule_id_str, rule_cfg in sorted(
                rules_raw.items(), key=lambda x: int(x[0])
            ):
                if rule_cfg is None:
                    rule_cfg = {}
                src_raw = rule_cfg.get("source", {}) or {}
                dst_raw = rule_cfg.get("destination", {}) or {}
                rules.append(
                    {
                        "rule_id": int(rule_id_str),
                        "ip_version": ip_version,
                        "protocol": rule_cfg.get("protocol"),
                        "source_address": src_raw.get("address"),
                        "source_port": str(src_raw["port"]) if src_raw.get("port") else None,
                        "destination_address": dst_raw.get("address"),
                        "destination_port": (
                            str(dst_raw["port"]) if dst_raw.get("port") else None
                        ),
                        "inbound_interface": rule_cfg.get("inbound-interface"),
                    }
                )
    return rules


def parse_conntrack_global_timeouts(
    system_config: dict, mapper
) -> Optional[Dict[str, Any]]:
    if not mapper.supports_conntrack_global_timeouts():
        return None
    ct_raw = system_config.get("conntrack", {}) or {}
    timeout_raw = ct_raw.get("timeout", {}) or {}
    icmp = timeout_raw.get("icmp")
    other = timeout_raw.get("other")
    tcp_raw = timeout_raw.get("tcp", {}) or {}
    udp_raw = timeout_raw.get("udp", {}) or {}
    if not any([icmp, other, tcp_raw, udp_raw]):
        return None
    return {
        "icmp": int(icmp) if icmp else None,
        "other": int(other) if other else None,
        "tcp": {
            "close": int(tcp_raw["close"]) if tcp_raw.get("close") else None,
            "close_wait": int(tcp_raw["close-wait"]) if tcp_raw.get("close-wait") else None,
            "established": (
                int(tcp_raw["established"]) if tcp_raw.get("established") else None
            ),
            "fin_wait": int(tcp_raw["fin-wait"]) if tcp_raw.get("fin-wait") else None,
            "last_ack": int(tcp_raw["last-ack"]) if tcp_raw.get("last-ack") else None,
            "syn_recv": int(tcp_raw["syn-recv"]) if tcp_raw.get("syn-recv") else None,
            "syn_sent": int(tcp_raw["syn-sent"]) if tcp_raw.get("syn-sent") else None,
            "time_wait": int(tcp_raw["time-wait"]) if tcp_raw.get("time-wait") else None,
        },
        "udp": {
            "other": int(udp_raw["other"]) if udp_raw.get("other") else None,
            "stream": int(udp_raw["stream"]) if udp_raw.get("stream") else None,
        },
    }


def parse_conntrack_timeout_custom(system_config: dict) -> List[Dict[str, Any]]:
    ct_raw = system_config.get("conntrack", {}) or {}
    timeout_raw = ct_raw.get("timeout", {}) or {}
    custom_raw = timeout_raw.get("custom", {}) or {}
    rules = []
    for ip_version in ("ipv4", "ipv6"):
        rules_raw = (custom_raw.get(ip_version, {}) or {}).get("rule", {}) or {}
        if isinstance(rules_raw, dict):
            for rule_id_str, rule_cfg in sorted(
                rules_raw.items(), key=lambda x: int(x[0])
            ):
                if rule_cfg is None:
                    rule_cfg = {}
                protocol_raw = rule_cfg.get("protocol", {}) or {}
                tcp_raw = protocol_raw.get("tcp", {}) or {}
                udp_raw = protocol_raw.get("udp", {}) or {}
                src_raw = rule_cfg.get("source", {}) or {}
                dst_raw = rule_cfg.get("destination", {}) or {}
                protocol = next(iter(protocol_raw)) if protocol_raw else None
                tcp = (
                    {
                        "close": int(tcp_raw["close"]) if tcp_raw.get("close") else None,
                        "close_wait": (
                            int(tcp_raw["close-wait"]) if tcp_raw.get("close-wait") else None
                        ),
                        "established": (
                            int(tcp_raw["established"])
                            if tcp_raw.get("established")
                            else None
                        ),
                        "fin_wait": (
                            int(tcp_raw["fin-wait"]) if tcp_raw.get("fin-wait") else None
                        ),
                        "last_ack": (
                            int(tcp_raw["last-ack"]) if tcp_raw.get("last-ack") else None
                        ),
                        "syn_recv": (
                            int(tcp_raw["syn-recv"]) if tcp_raw.get("syn-recv") else None
                        ),
                        "syn_sent": (
                            int(tcp_raw["syn-sent"]) if tcp_raw.get("syn-sent") else None
                        ),
                        "time_wait": (
                            int(tcp_raw["time-wait"]) if tcp_raw.get("time-wait") else None
                        ),
                    }
                    if tcp_raw
                    else None
                )
                udp = (
                    {
                        "other": int(udp_raw["other"]) if udp_raw.get("other") else None,
                        "stream": int(udp_raw["stream"]) if udp_raw.get("stream") else None,
                    }
                    if udp_raw
                    else None
                )
                rules.append(
                    {
                        "rule_id": int(rule_id_str),
                        "ip_version": ip_version,
                        "protocol": protocol,
                        "source_address": src_raw.get("address"),
                        "destination_address": dst_raw.get("address"),
                        "tcp": tcp,
                        "udp": udp,
                    }
                )
    return rules


def parse_ip_settings(system_config: dict) -> Optional[Dict[str, Any]]:
    ip_raw = system_config.get("ip", {}) or {}
    if not ip_raw:
        return None
    arp_raw = ip_raw.get("arp", {}) or {}
    multipath_raw = ip_raw.get("multipath", {}) or {}
    nht_raw = ip_raw.get("nht", {}) or {}
    table_size = arp_raw.get("ndp-table-size") or arp_raw.get("table-size")
    return {
        "arp_ndp_table_size": int(table_size) if table_size else None,
        "disable_forwarding": "disable-forwarding" in ip_raw,
        "multipath_ignore_unreachable": "ignore-unreachable-nexthops" in multipath_raw,
        "multipath_layer4_hashing": "layer4-hashing" in multipath_raw,
        "nht_no_resolve_via_default": "no-resolve-via-default" in nht_raw,
    }


def parse_ipv6_settings(system_config: dict) -> Optional[Dict[str, Any]]:
    ipv6_raw = system_config.get("ipv6", {}) or {}
    if not ipv6_raw:
        return None
    multipath_raw = ipv6_raw.get("multipath", {}) or {}
    nht_raw = ipv6_raw.get("nht", {}) or {}
    neighbor_raw = ipv6_raw.get("neighbor", {}) or {}
    return {
        "disable_forwarding": "disable-forwarding" in ipv6_raw,
        "multipath_layer4_hashing": "layer4-hashing" in multipath_raw,
        "nht_no_resolve_via_default": "no-resolve-via-default" in nht_raw,
        "strict_dad": "strict-dad" in ipv6_raw,
        "neighbor_table_size": (
            int(neighbor_raw["table-size"]) if neighbor_raw.get("table-size") else None
        ),
    }


def parse_lcd(system_config: dict) -> Optional[Dict[str, Any]]:
    lcd_raw = system_config.get("lcd", {}) or {}
    if not lcd_raw:
        return None
    return {
        "device": lcd_raw.get("device"),
        "address": lcd_raw.get("address"),
        "model": lcd_raw.get("model"),
    }


def parse_logrotate_entry(raw: dict) -> Optional[Dict[str, Any]]:
    if not raw:
        return None
    max_size = raw.get("max-size")
    rotate = raw.get("rotate")
    if max_size is None and rotate is None:
        return None
    return {
        "max_size": int(max_size) if max_size else None,
        "rotate_count": int(rotate) if rotate else None,
    }


def parse_logs(system_config: dict) -> Optional[Dict[str, Any]]:
    logs_raw = system_config.get("logs", {}) or {}
    if not logs_raw:
        return None
    logrotate_raw = logs_raw.get("logrotate", {}) or {}
    atop = parse_logrotate_entry(logrotate_raw.get("atop", {}) or {})
    messages = parse_logrotate_entry(logrotate_raw.get("messages", {}) or {})
    if atop is None and messages is None:
        return None
    return {"atop": atop, "messages": messages}


def parse_options(system_config: dict) -> Optional[Dict[str, Any]]:
    option_raw = system_config.get("option", {}) or {}
    if not option_raw:
        return None
    keyboard_layout = option_raw.get("keyboard-layout")
    time_format = option_raw.get("time-format")
    ctrl_alt_delete = option_raw.get("ctrl-alt-delete")
    startup_beep = "startup-beep" in option_raw
    disable_usb_autosuspend = "disable-usb-autosuspend" in option_raw
    reboot_on_panic = "reboot-on-panic" in option_raw
    root_partition_auto_resize = "root-partition-auto-resize" in option_raw
    reboot_on_upgrade = "reboot-on-upgrade-failure" in option_raw
    rl_raw = option_raw.get("resource-limits", {}) or {}
    resource_limits = (
        {
            "max_map_count": (
                int(rl_raw["max-map-count"]) if rl_raw.get("max-map-count") else None
            ),
            "shmmax": int(rl_raw["shmmax"]) if rl_raw.get("shmmax") else None,
        }
        if rl_raw
        else None
    )
    kernel_raw = option_raw.get("kernel", {}) or {}
    kernel = None
    if kernel_raw:
        cpu_raw = kernel_raw.get("cpu", {}) or {}
        mem_raw = kernel_raw.get("memory", {}) or {}
        cpu = (
            {
                "disable_nmi_watchdog": "disable-nmi-watchdog" in cpu_raw,
                "isolate_cpus": cpu_raw.get("isolate-cpus"),
                "nohz_full": cpu_raw.get("nohz-full"),
                "rcu_no_cbs": cpu_raw.get("rcu-no-cbs"),
            }
            if cpu_raw
            else None
        )
        mem = (
            {
                "default_hugepage_size": mem_raw.get("default-hugepage-size"),
                "disable_numa_balancing": "disable-numa-balancing" in mem_raw,
                "hugepage_size": mem_raw.get("hugepage-size"),
            }
            if mem_raw
            else None
        )
        kernel = {
            "disable_hpet": "disable-hpet" in kernel_raw,
            "disable_mce": "disable-mce" in kernel_raw,
            "disable_softlockup": "disable-softlockup" in kernel_raw,
            "cpu": cpu,
            "memory": mem,
        }
    http_raw = option_raw.get("http-client", {}) or {}
    http_client = (
        {
            "source_address": http_raw.get("source-address"),
            "source_interface": http_raw.get("source-interface"),
        }
        if http_raw
        else None
    )
    ssh_raw = option_raw.get("ssh-client", {}) or {}
    ssh_client = (
        {
            "source_address": ssh_raw.get("source-address"),
            "source_interface": ssh_raw.get("source-interface"),
        }
        if ssh_raw
        else None
    )
    if not any(
        [
            keyboard_layout,
            time_format,
            ctrl_alt_delete,
            startup_beep,
            disable_usb_autosuspend,
            reboot_on_panic,
            root_partition_auto_resize,
            reboot_on_upgrade,
            resource_limits,
            kernel,
            http_client,
            ssh_client,
        ]
    ):
        return None
    return {
        "keyboard_layout": keyboard_layout,
        "time_format": time_format,
        "ctrl_alt_delete": ctrl_alt_delete,
        "startup_beep": startup_beep,
        "disable_usb_autosuspend": disable_usb_autosuspend,
        "reboot_on_panic": reboot_on_panic,
        "root_partition_auto_resize": root_partition_auto_resize,
        "reboot_on_upgrade_failure": reboot_on_upgrade,
        "resource_limits": resource_limits,
        "kernel": kernel,
        "http_client": http_client,
        "ssh_client": ssh_client,
    }


def parse_proxy(system_config: dict) -> Optional[Dict[str, Any]]:
    proxy_raw = system_config.get("proxy", {}) or {}
    if not proxy_raw:
        return None
    no_proxy = proxy_raw.get("no-proxy", [])
    if isinstance(no_proxy, str):
        no_proxy = [no_proxy]
    port = proxy_raw.get("port")
    return {
        "url": proxy_raw.get("url"),
        "port": int(port) if port else None,
        "username": proxy_raw.get("username"),
        "no_proxy": no_proxy if isinstance(no_proxy, list) else [],
    }


def parse_sflow_raw(sflow_raw: dict) -> Dict[str, Any]:
    servers = []
    for server_ip, server_cfg in (sflow_raw.get("server", {}) or {}).items():
        if server_cfg is None:
            server_cfg = {}
        servers.append(
            {
                "server": server_ip,
                "port": int(server_cfg["port"]) if server_cfg.get("port") else None,
                "source_address": server_cfg.get("source-address"),
            }
        )
    sampling_rate = sflow_raw.get("sampling-rate")
    return {
        "agent_address": sflow_raw.get("agent-address"),
        "sampling_rate": int(sampling_rate) if sampling_rate else None,
        "servers": servers,
    }


def parse_flow_accounting(system_config: dict, mapper) -> Optional[Dict[str, Any]]:
    fa_raw = system_config.get("flow-accounting", {}) or {}
    if not fa_raw:
        return None
    iface_key = mapper.get_flow_accounting_interface_config_key()
    if iface_key == "root":
        iface_raw = fa_raw.get("interface", [])
    else:
        iface_raw = (fa_raw.get("netflow", {}) or {}).get("interface", [])
    interfaces = _as_list(iface_raw)
    netflow_raw = fa_raw.get("netflow", {}) or {}
    netflow = None
    if netflow_raw:
        servers = []
        for server_ip, server_cfg in (netflow_raw.get("server", {}) or {}).items():
            if server_cfg is None:
                server_cfg = {}
            servers.append(
                {
                    "server": server_ip,
                    "port": int(server_cfg["port"]) if server_cfg.get("port") else None,
                    "source_address": server_cfg.get("source-address"),
                }
            )
        timeout_raw = netflow_raw.get("timeout", {}) or {}
        timeouts = (
            {
                "expiry_interval": (
                    int(timeout_raw["expiry-interval"])
                    if timeout_raw.get("expiry-interval")
                    else None
                ),
                "flow_generic": (
                    int(timeout_raw["flow-generic"])
                    if timeout_raw.get("flow-generic")
                    else None
                ),
                "icmp": int(timeout_raw["icmp"]) if timeout_raw.get("icmp") else None,
                "max_active_life": (
                    int(timeout_raw["max-active-life"])
                    if timeout_raw.get("max-active-life")
                    else None
                ),
                "tcp_fin": int(timeout_raw["tcp-fin"]) if timeout_raw.get("tcp-fin") else None,
                "tcp_generic": (
                    int(timeout_raw["tcp-generic"])
                    if timeout_raw.get("tcp-generic")
                    else None
                ),
                "udp": int(timeout_raw["udp"]) if timeout_raw.get("udp") else None,
            }
            if timeout_raw
            else None
        )
        netflow = {
            "engine_id": int(netflow_raw["engine-id"]) if netflow_raw.get("engine-id") else None,
            "max_flows": int(netflow_raw["max-flows"]) if netflow_raw.get("max-flows") else None,
            "sampling_rate": (
                int(netflow_raw["sampling-rate"])
                if netflow_raw.get("sampling-rate")
                else None
            ),
            "source_address": netflow_raw.get("source-address"),
            "version": netflow_raw.get("version"),
            "servers": servers,
            "timeouts": timeouts,
        }
    sflow = None
    if iface_key == "root":
        sflow_raw = fa_raw.get("sflow", {}) or {}
        if sflow_raw:
            sflow = parse_sflow_raw(sflow_raw)
    return {"interfaces": interfaces, "netflow": netflow, "sflow": sflow}


def parse_sflow(full_config: dict, mapper) -> Optional[Dict[str, Any]]:
    if mapper.get_sflow_config_root() != "sflow":
        return None
    sflow_raw = full_config.get("sflow", {}) or {}
    if not sflow_raw:
        return None
    return parse_sflow_raw(sflow_raw)


def parse_task_scheduler(system_config: dict) -> List[Dict[str, Any]]:
    ts_raw = system_config.get("task-scheduler", {}) or {}
    tasks_raw = ts_raw.get("task", {}) or {}
    tasks = []
    if isinstance(tasks_raw, dict):
        for task_name, task_cfg in tasks_raw.items():
            if task_cfg is None:
                task_cfg = {}
            exe_raw = task_cfg.get("executable", {}) or {}
            tasks.append(
                {
                    "name": task_name,
                    "crontab_spec": task_cfg.get("crontab-spec"),
                    "interval": task_cfg.get("interval"),
                    "executable_path": exe_raw.get("path"),
                    "executable_arguments": exe_raw.get("arguments"),
                }
            )
    return tasks


def parse_update_check(system_config: dict) -> Optional[Dict[str, Any]]:
    uc_raw = system_config.get("update-check", {}) or {}
    if not uc_raw:
        return None
    return {
        "url": uc_raw.get("url"),
        "auto_install": "auto-install-packages" in uc_raw,
    }


def parse_frr(system_config: dict) -> Optional[Dict[str, Any]]:
    frr_raw = system_config.get("frr", {}) or {}
    if not frr_raw:
        return None
    bmp_raw = frr_raw.get("bmp", {}) or {}
    bmp = None
    if bmp_raw:
        targets = []
        for target_name, target_cfg in (bmp_raw.get("target", {}) or {}).items():
            if target_cfg is None:
                target_cfg = {}
            targets.append(
                {
                    "name": target_name,
                    "address": target_cfg.get("address"),
                    "port": int(target_cfg["port"]) if target_cfg.get("port") else None,
                }
            )
        bmp = {"targets": targets}
    return {"profile": frr_raw.get("profile"), "bmp": bmp}


def parse_acceleration(system_config: dict) -> Optional[Dict[str, Any]]:
    acc_raw = system_config.get("acceleration", {}) or {}
    if not acc_raw:
        return None
    qat_raw = acc_raw.get("qat", {}) or {}
    devices = _as_list(qat_raw.get("dev", []))
    return {"qat_devices": devices}
