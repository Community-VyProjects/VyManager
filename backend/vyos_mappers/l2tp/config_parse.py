"""Read-model for L2TP remote-access config.

Mappers own VyOS tree shape. The router returns this dict unchanged as the
config response. Secrets come back as ``***`` when set.
"""

from typing import Any, Dict, List, Optional

MASKED_SECRET = "***"


def _as_list(value: Any) -> List[str]:
    """A ``multi:`` leaf: one value is a string, several are a list."""
    if value is None:
        return []
    if isinstance(value, list):
        return [str(v) for v in value]
    return [str(value)]


def _mask(value: Any) -> Optional[str]:
    return MASKED_SECRET if value else None


def _local_users(auth: Dict[str, Any]) -> List[Dict[str, Any]]:
    users = []
    for username, user in (auth.get("local-users", {}).get("username", {}) or {}).items():
        user = user or {}
        rate_limit = user.get("rate-limit", {}) or {}
        users.append({
            "username": username,
            "password": _mask(user.get("password")),
            "disabled": "disable" in user,
            "static_ip": user.get("static-ip"),
            "rate_limit": {
                "download": rate_limit.get("download"),
                "upload": rate_limit.get("upload"),
            },
        })
    return users


def _radius(radius: Dict[str, Any]) -> Dict[str, Any]:
    servers = []
    for address, server in (radius.get("server", {}) or {}).items():
        server = server or {}
        servers.append({
            "address": address,
            "key": _mask(server.get("key")),
            "port": server.get("port"),
            "acct_port": server.get("acct-port"),
            "priority": server.get("priority"),
            "fail_time": server.get("fail-time"),
            "disabled": "disable" in server,
            "backup": "backup" in server,
            "disable_accounting": "disable-accounting" in server,
        })
    dae = radius.get("dynamic-author", {}) or {}
    rate_limit = radius.get("rate-limit", {}) or {}
    return {
        "servers": servers,
        "source_address": radius.get("source-address"),
        "timeout": radius.get("timeout"),
        "max_try": radius.get("max-try"),
        "nas_identifier": radius.get("nas-identifier"),
        "nas_ip_address": radius.get("nas-ip-address"),
        "preallocate_vif": "preallocate-vif" in radius,
        "accounting_interim_interval": radius.get("accounting-interim-interval"),
        "acct_interim_jitter": radius.get("acct-interim-jitter"),
        "acct_timeout": radius.get("acct-timeout"),
        "dynamic_author": {
            "server": dae.get("server"),
            "port": dae.get("port"),
            "key": _mask(dae.get("key")),
        },
        "rate_limit": {
            "enable": "enable" in rate_limit,
            "attribute": rate_limit.get("attribute"),
            "vendor": rate_limit.get("vendor"),
            "multiplier": rate_limit.get("multiplier"),
        },
    }


def _ipsec_settings(ipsec: Dict[str, Any]) -> Dict[str, Any]:
    auth = ipsec.get("authentication", {}) or {}
    x509 = auth.get("x509", {}) or {}
    return {
        "authentication": {
            "mode": auth.get("mode"),
            "pre_shared_secret": _mask(auth.get("pre-shared-secret")),
            "x509": {
                "ca_certificate": x509.get("ca-certificate"),
                "certificate": x509.get("certificate"),
                "passphrase": _mask(x509.get("passphrase")),
            },
        },
        "ike_group": ipsec.get("ike-group"),
        "esp_group": ipsec.get("esp-group"),
        "ike_lifetime": ipsec.get("ike-lifetime"),
        "lifetime": ipsec.get("lifetime"),
    }


def _client_ip_pools(pools: Dict[str, Any]) -> List[Dict[str, Any]]:
    return [
        {
            "name": name,
            "range": (pool or {}).get("range"),
            "next_pool": (pool or {}).get("next-pool"),
        }
        for name, pool in (pools or {}).items()
    ]


def _client_ipv6_pools(pools: Dict[str, Any]) -> List[Dict[str, Any]]:
    result = []
    for name, pool in (pools or {}).items():
        pool = pool or {}
        prefixes = {
            prefix: {"prefix": prefix, "mask": (entry or {}).get("mask")}
            for prefix, entry in (pool.get("prefix", {}) or {}).items()
        }
        delegates = {
            prefix: {"prefix": prefix, "delegation_prefix": (entry or {}).get("delegation-prefix")}
            for prefix, entry in (pool.get("delegate", {}) or {}).items()
        }
        result.append({"name": name, "prefixes": prefixes, "delegates": delegates})
    return result


def _ppp_options(ppp: Dict[str, Any]) -> Dict[str, Any]:
    return {
        "disable_ccp": "disable-ccp" in ppp,
        "interface_cache": ppp.get("interface-cache"),
        "ipv4": ppp.get("ipv4"),
        "ipv6": ppp.get("ipv6"),
        "ipv6_interface_id": ppp.get("ipv6-interface-id"),
        "ipv6_peer_interface_id": ppp.get("ipv6-peer-interface-id"),
        "ipv6_peer_interface_id_secret": _mask(ppp.get("ipv6-peer-interface-id-secret")),
        "ipv6_accept_peer_interface_id": "ipv6-accept-peer-interface-id" in ppp,
        "mppe": ppp.get("mppe"),
        "lcp_echo_failure": ppp.get("lcp-echo-failure"),
        "lcp_echo_interval": ppp.get("lcp-echo-interval"),
        "lcp_echo_timeout": ppp.get("lcp-echo-timeout"),
        "min_mtu": ppp.get("min-mtu"),
        "mru": ppp.get("mru"),
    }


def parse_config(_mapper: Any, full_config: Dict[str, Any]) -> Dict[str, Any]:
    vpn = (full_config or {}).get("vpn", {}) or {}
    ra = (vpn.get("l2tp", {}) or {}).get("remote-access", {}) or {}

    auth = ra.get("authentication", {}) or {}
    local_users = _local_users(auth)
    radius = _radius(auth.get("radius", {}) or {})
    client_ip_pools = _client_ip_pools(ra.get("client-ip-pool", {}))
    client_ipv6_pools = _client_ipv6_pools(ra.get("client-ipv6-pool", {}))
    lns = ra.get("lns", {}) or {}
    limits = ra.get("limits", {}) or {}
    scripts = ra.get("extended-scripts", {}) or {}

    return {
        "configured": "l2tp" in vpn,
        "description": ra.get("description"),
        "outside_address": ra.get("outside-address"),
        "gateway_address": ra.get("gateway-address"),
        "mtu": ra.get("mtu"),
        "name_servers": _as_list(ra.get("name-server")),
        "wins_servers": _as_list(ra.get("wins-server")),
        "default_pool": ra.get("default-pool"),
        "default_ipv6_pool": ra.get("default-ipv6-pool"),
        "max_concurrent_sessions": ra.get("max-concurrent-sessions"),
        "thread_count": ra.get("thread-count"),
        "authentication": {
            "mode": auth.get("mode"),
            "protocols": _as_list(auth.get("protocols")),
            "local_users": local_users,
            "radius": radius,
        },
        "ipsec_settings": _ipsec_settings(ra.get("ipsec-settings", {}) or {}),
        "client_ip_pools": client_ip_pools,
        "client_ipv6_pools": client_ipv6_pools,
        "ppp_options": _ppp_options(ra.get("ppp-options", {}) or {}),
        "lns": {
            "host_name": lns.get("host-name"),
            "shared_secret": _mask(lns.get("shared-secret")),
        },
        "limits": {
            "connection_limit": limits.get("connection-limit"),
            "burst": limits.get("burst"),
            "timeout": limits.get("timeout"),
        },
        "log": {"level": (ra.get("log", {}) or {}).get("level")},
        "extended_scripts": {
            "on_change": scripts.get("on-change"),
            "on_down": scripts.get("on-down"),
            "on_pre_up": scripts.get("on-pre-up"),
            "on_up": scripts.get("on-up"),
        },
        "shaper": {"fwmark": (ra.get("shaper", {}) or {}).get("fwmark")},
        "snmp": {"master_agent": "master-agent" in (ra.get("snmp", {}) or {})},
        "totals": {
            "local_users": len(local_users),
            "radius_servers": len(radius["servers"]),
            "client_ip_pools": len(client_ip_pools),
            "client_ipv6_pools": len(client_ipv6_pools),
        },
    }
