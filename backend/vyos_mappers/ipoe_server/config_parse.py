"""Read-model for IPoE server config.

Mappers own VyOS tree shape. Routers call parse_config and do not rebuild
the tree.
"""

from typing import Any, Dict, List


def _list(value: Any) -> List[str]:
    if value is None:
        return []
    if isinstance(value, list):
        return value
    return [value]


def _node(value: Any) -> Dict[str, Any]:
    return value if isinstance(value, dict) else {}


def _auth_interfaces(cfg: Dict[str, Any]) -> List[Dict[str, Any]]:
    interfaces = []
    for iface, iface_cfg in cfg.items():
        macs = []
        for mac, mac_cfg in _node(_node(iface_cfg).get("mac")).items():
            mac_cfg = _node(mac_cfg)
            rate_limit = _node(mac_cfg.get("rate-limit"))
            macs.append({
                "mac": mac,
                "ip_address": mac_cfg.get("ip-address"),
                "vlan": mac_cfg.get("vlan"),
                "rate_limit": {
                    "download": rate_limit.get("download"),
                    "upload": rate_limit.get("upload"),
                },
            })
        interfaces.append({"interface": iface, "macs": macs})
    return interfaces


def _radius(cfg: Dict[str, Any]) -> Dict[str, Any]:
    servers = []
    for addr, srv_cfg in _node(cfg.get("server")).items():
        srv_cfg = _node(srv_cfg)
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

    dae = _node(cfg.get("dynamic-author"))
    rate_limit = _node(cfg.get("rate-limit"))

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


def _client_ip_pools(cfg: Dict[str, Any]) -> List[Dict[str, Any]]:
    return [
        {
            "name": name,
            "ranges": _list(_node(pool_cfg).get("range")),
            "next_pool": _node(pool_cfg).get("next-pool"),
        }
        for name, pool_cfg in cfg.items()
    ]


def _client_ipv6_pools(cfg: Dict[str, Any]) -> List[Dict[str, Any]]:
    pools = []
    for name, pool_cfg in cfg.items():
        pool_cfg = _node(pool_cfg)
        pools.append({
            "name": name,
            "prefixes": [
                {"prefix": prefix, "mask": _node(pfx_cfg).get("mask")}
                for prefix, pfx_cfg in _node(pool_cfg.get("prefix")).items()
            ],
            "delegates": [
                {"prefix": prefix, "delegation_prefix": _node(del_cfg).get("delegation-prefix")}
                for prefix, del_cfg in _node(pool_cfg.get("delegate")).items()
            ],
        })
    return pools


def _interfaces(cfg: Dict[str, Any]) -> List[Dict[str, Any]]:
    interfaces = []
    for iface, iface_cfg in cfg.items():
        iface_cfg = _node(iface_cfg)
        ext_dhcp = _node(iface_cfg.get("external-dhcp"))
        interfaces.append({
            "interface": iface,
            "mode": iface_cfg.get("mode"),
            "network": iface_cfg.get("network"),
            "start_session": iface_cfg.get("start-session"),
            "client_subnet": iface_cfg.get("client-subnet"),
            "vlans": _list(iface_cfg.get("vlan")),
            "vlan_mon": "vlan-mon" in iface_cfg,
            "lua_username": iface_cfg.get("lua-username"),
            "external_dhcp": {
                "dhcp_relay": ext_dhcp.get("dhcp-relay"),
                "giaddr": ext_dhcp.get("giaddr"),
            } if ext_dhcp else None,
        })
    return interfaces


def parse_config(_mapper: Any, full_config: Dict[str, Any]) -> Dict[str, Any]:
    """Normalize ``service ipoe-server`` into the shape the screen reads."""
    service = _node(full_config.get("service"))
    configured = "ipoe-server" in service
    cfg = _node(service.get("ipoe-server"))

    log = _node(cfg.get("log"))
    shaper = _node(cfg.get("shaper"))
    scripts = _node(cfg.get("extended-scripts"))
    limits = _node(cfg.get("limits"))
    auth = _node(cfg.get("authentication"))

    auth_interfaces = _auth_interfaces(_node(auth.get("interface")))
    radius = _radius(_node(auth.get("radius")))
    client_ip_pools = _client_ip_pools(_node(cfg.get("client-ip-pool")))
    client_ipv6_pools = _client_ipv6_pools(_node(cfg.get("client-ipv6-pool")))
    interfaces = _interfaces(_node(cfg.get("interface")))

    return {
        "configured": configured,
        "description": cfg.get("description"),
        "default_pool": cfg.get("default-pool"),
        "default_ipv6_pool": cfg.get("default-ipv6-pool"),
        "gateway_addresses": _list(cfg.get("gateway-address")),
        "name_servers": _list(cfg.get("name-server")),
        "max_concurrent_sessions": cfg.get("max-concurrent-sessions"),
        "thread_count": cfg.get("thread-count"),
        "lua_file": cfg.get("lua-file"),
        "log": {"level": log.get("level")},
        "shaper": {"fwmark": shaper.get("fwmark")},
        "snmp": {"master_agent": "master-agent" in _node(cfg.get("snmp"))},
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
        "authentication": {
            "mode": auth.get("mode"),
            "interfaces": auth_interfaces,
            "radius": radius,
        },
        "client_ip_pools": client_ip_pools,
        "client_ipv6_pools": client_ipv6_pools,
        "interfaces": interfaces,
        "totals": {
            "auth_interfaces": len(auth_interfaces),
            "radius_servers": len(radius["servers"]),
            "client_ip_pools": len(client_ip_pools),
            "client_ipv6_pools": len(client_ipv6_pools),
            "interfaces": len(interfaces),
        },
    }
