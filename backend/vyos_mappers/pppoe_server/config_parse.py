"""Read-model for PPPoE server config.

Mappers own VyOS tree shape. Routers call parse_config and do not rebuild
the tree. Secrets come back as ``***`` when set.
"""

from typing import Any, Dict, List


def _dict(value: Any) -> Dict[str, Any]:
    return value if isinstance(value, dict) else {}


def _normalize_to_list(value: Any) -> List[str]:
    if value is None:
        return []
    if isinstance(value, list):
        return value
    return [value]


def _parse_pado_delays(cfg: Dict[str, Any]) -> List[Dict[str, Any]]:
    return [
        {"delay": delay, "sessions": _dict(delay_cfg).get("sessions")}
        for delay, delay_cfg in cfg.items()
    ]


def _parse_ppp_options(cfg: Dict[str, Any]) -> Dict[str, Any]:
    return {
        "ipv4": cfg.get("ipv4"),
        "ipv6": cfg.get("ipv6"),
        "mppe": cfg.get("mppe"),
        "disable_ccp": "disable-ccp" in cfg,
        "interface_cache": cfg.get("interface-cache"),
        "ipv6_interface_id": cfg.get("ipv6-interface-id"),
        "ipv6_peer_interface_id": cfg.get("ipv6-peer-interface-id"),
        # 1.5 only; absent (None) on 1.4.
        "ipv6_peer_interface_id_secret": "***" if cfg.get("ipv6-peer-interface-id-secret") else None,
        "ipv6_accept_peer_interface_id": "ipv6-accept-peer-interface-id" in cfg,
        "lcp_echo_failure": cfg.get("lcp-echo-failure"),
        "lcp_echo_interval": cfg.get("lcp-echo-interval"),
        "lcp_echo_timeout": cfg.get("lcp-echo-timeout"),
        "min_mtu": cfg.get("min-mtu"),
        "mru": cfg.get("mru"),
    }


def _parse_radius(cfg: Dict[str, Any]) -> Dict[str, Any]:
    servers = []
    for addr, srv_cfg in _dict(cfg.get("server")).items():
        srv_cfg = _dict(srv_cfg)
        servers.append({
            "address": addr,
            "key": "***" if srv_cfg.get("key") else None,
            "port": srv_cfg.get("port"),
            "acct_port": srv_cfg.get("acct-port"),
            "priority": srv_cfg.get("priority"),
            "fail_time": srv_cfg.get("fail-time"),
            "disabled": "disable" in srv_cfg,
            "backup": "backup" in srv_cfg,
            "disable_accounting": "disable-accounting" in srv_cfg,
        })

    dae = _dict(cfg.get("dynamic-author"))
    rate_limit = _dict(cfg.get("rate-limit"))

    return {
        "servers": servers,
        "source_address": cfg.get("source-address"),
        "timeout": cfg.get("timeout"),
        "max_try": cfg.get("max-try"),
        "nas_identifier": cfg.get("nas-identifier"),
        "nas_ip_address": cfg.get("nas-ip-address"),
        "accounting_interim_interval": cfg.get("accounting-interim-interval"),
        "acct_interim_jitter": cfg.get("acct-interim-jitter"),
        "acct_timeout": cfg.get("acct-timeout"),
        "preallocate_vif": "preallocate-vif" in cfg,
        "called_sid_format": cfg.get("called-sid-format"),
        "dynamic_author": {
            "server": dae.get("server"),
            "port": dae.get("port"),
            "key": "***" if dae.get("key") else None,
        },
        "rate_limit": {
            "enable": "enable" in rate_limit,
            "attribute": rate_limit.get("attribute"),
            "vendor": rate_limit.get("vendor"),
            "multiplier": rate_limit.get("multiplier"),
        },
    }


def _parse_authentication(cfg: Dict[str, Any]) -> Dict[str, Any]:
    local_users = []
    for username, user_cfg in _dict(_dict(cfg.get("local-users")).get("username")).items():
        user_cfg = _dict(user_cfg)
        rate_limit = _dict(user_cfg.get("rate-limit"))
        local_users.append({
            "username": username,
            "password": "***" if user_cfg.get("password") else None,
            "disabled": "disable" in user_cfg,
            "static_ip": user_cfg.get("static-ip"),
            "rate_limit": {
                "download": rate_limit.get("download"),
                "upload": rate_limit.get("upload"),
            },
        })

    return {
        "mode": cfg.get("mode"),
        "protocols": _normalize_to_list(cfg.get("protocols")),
        "any_login": "any-login" in cfg,
        "local_users": local_users,
        "radius": _parse_radius(_dict(cfg.get("radius"))),
    }


def _parse_client_ip_pools(cfg: Dict[str, Any]) -> List[Dict[str, Any]]:
    pools = []
    for name, pool_cfg in cfg.items():
        pool_cfg = _dict(pool_cfg)
        pools.append({
            "name": name,
            "ranges": _normalize_to_list(pool_cfg.get("range")),
            "next_pool": pool_cfg.get("next-pool"),
        })
    return pools


def _parse_client_ipv6_pools(cfg: Dict[str, Any]) -> List[Dict[str, Any]]:
    pools = []
    for name, pool_cfg in cfg.items():
        pool_cfg = _dict(pool_cfg)
        prefixes = [
            {"prefix": prefix, "mask": _dict(pfx_cfg).get("mask")}
            for prefix, pfx_cfg in _dict(pool_cfg.get("prefix")).items()
        ]
        delegates = [
            {"prefix": prefix, "delegation_prefix": _dict(del_cfg).get("delegation-prefix")}
            for prefix, del_cfg in _dict(pool_cfg.get("delegate")).items()
        ]
        pools.append({"name": name, "prefixes": prefixes, "delegates": delegates})
    return pools


def _parse_interfaces(cfg: Dict[str, Any]) -> List[Dict[str, Any]]:
    interfaces = []
    for iface, iface_cfg in cfg.items():
        iface_cfg = _dict(iface_cfg)
        interfaces.append({
            "interface": iface,
            "vlans": _normalize_to_list(iface_cfg.get("vlan")),
            "vlan_mon": "vlan-mon" in iface_cfg,
            "combined": "combined" in iface_cfg,
        })
    return interfaces


def parse_config(_mapper: Any, full_config: Dict[str, Any]) -> Dict[str, Any]:
    """Return the PPPoE server read-model; unconfigured has the same shape."""
    service = _dict(_dict(full_config).get("service"))
    # A bare ``service pppoe-server {}`` parses as {} but still exists.
    configured = "pppoe-server" in service
    cfg = _dict(service.get("pppoe-server"))

    log = _dict(cfg.get("log"))
    shaper = _dict(cfg.get("shaper"))
    snmp = _dict(cfg.get("snmp"))
    scripts = _dict(cfg.get("extended-scripts"))
    limits = _dict(cfg.get("limits"))
    auth = _parse_authentication(_dict(cfg.get("authentication")))
    client_ip_pools = _parse_client_ip_pools(_dict(cfg.get("client-ip-pool")))
    client_ipv6_pools = _parse_client_ipv6_pools(_dict(cfg.get("client-ipv6-pool")))
    interfaces = _parse_interfaces(_dict(cfg.get("interface")))

    return {
        "configured": configured,
        "description": cfg.get("description"),
        "access_concentrator": cfg.get("access-concentrator"),
        "service_names": _normalize_to_list(cfg.get("service-name")),
        "gateway_address": cfg.get("gateway-address"),
        "name_servers": _normalize_to_list(cfg.get("name-server")),
        "wins_servers": _normalize_to_list(cfg.get("wins-server")),
        "mtu": cfg.get("mtu"),
        "max_concurrent_sessions": cfg.get("max-concurrent-sessions"),
        "thread_count": cfg.get("thread-count"),
        "default_pool": cfg.get("default-pool"),
        "default_ipv6_pool": cfg.get("default-ipv6-pool"),
        "session_control": cfg.get("session-control"),
        "accept_any_service": "accept-any-service" in cfg,
        "accept_blank_service": "accept-blank-service" in cfg,
        "pado_delays": _parse_pado_delays(_dict(cfg.get("pado-delay"))),
        "log": {"level": log.get("level")},
        "shaper": {"fwmark": shaper.get("fwmark")},
        "snmp": {"master_agent": "master-agent" in snmp},
        "extended_scripts": {
            "on_change": scripts.get("on-change"),
            "on_down": scripts.get("on-down"),
            "on_pre_up": scripts.get("on-pre-up"),
            "on_up": scripts.get("on-up"),
        },
        "limits": {
            "burst": limits.get("burst"),
            "connection_limit": limits.get("connection-limit"),
            "timeout": limits.get("timeout"),
        },
        "ppp_options": _parse_ppp_options(_dict(cfg.get("ppp-options"))),
        "authentication": auth,
        "client_ip_pools": client_ip_pools,
        "client_ipv6_pools": client_ipv6_pools,
        "interfaces": interfaces,
        "totals": {
            "local_users": len(auth["local_users"]),
            "radius_servers": len(auth["radius"]["servers"]),
            "client_ip_pools": len(client_ip_pools),
            "client_ipv6_pools": len(client_ipv6_pools),
            "interfaces": len(interfaces),
        },
    }
