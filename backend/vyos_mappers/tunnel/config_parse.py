"""Read-model for tunnel interface config.

Mappers own VyOS tree shape. Routers call parse_config and do not rebuild
the tree. Tunnel commands are identical between VyOS 1.4 and 1.5.
"""

from typing import Any, Dict, List


def _ensure_list(value: Any) -> List[str]:
    """Convert VyOS config value to a list."""
    if value is None:
        return []
    if isinstance(value, list):
        return value
    if isinstance(value, str):
        return [value]
    return []


def _parse_tunnel_interface(name: str, data: dict) -> Dict[str, Any]:
    """Parse a single tunnel interface configuration."""
    ip_data = data.get("ip", {}) or {}
    ipv6_data = data.get("ipv6", {}) or {}
    ipv6_addr_data = ipv6_data.get("address", {}) or {}
    mirror_data = data.get("mirror", {}) or {}
    params_data = data.get("parameters", {}) or {}
    erspan_data = params_data.get("erspan", {}) or {}
    params_ip_data = params_data.get("ip", {}) or {}
    params_ipv6_data = params_data.get("ipv6", {}) or {}

    return {
        "name": name,
        "sixrd_prefix": data.get("6rd-prefix"),
        "sixrd_relay_prefix": data.get("6rd-relay-prefix"),
        "addresses": _ensure_list(data.get("address")),
        "description": data.get("description"),
        "disabled": "disable" in data,
        "disable_link_detect": "disable-link-detect" in data,
        "enable_multicast": "enable-multicast" in data,
        "encapsulation": data.get("encapsulation"),
        "ip": {
            "adjust_mss": ip_data.get("adjust-mss"),
            "arp_cache_timeout": ip_data.get("arp-cache-timeout"),
            "disable_arp_filter": "disable-arp-filter" in ip_data,
            "disable_forwarding": "disable-forwarding" in ip_data,
            "enable_arp_accept": "enable-arp-accept" in ip_data,
            "enable_arp_announce": "enable-arp-announce" in ip_data,
            "enable_arp_ignore": "enable-arp-ignore" in ip_data,
            "enable_directed_broadcast": "enable-directed-broadcast" in ip_data,
            "enable_proxy_arp": "enable-proxy-arp" in ip_data,
            "proxy_arp_pvlan": "proxy-arp-pvlan" in ip_data,
            "source_validation": ip_data.get("source-validation"),
        },
        "ipv6": {
            "accept_dad": ipv6_data.get("accept-dad"),
            "address": {
                "autoconf": "autoconf" in ipv6_addr_data,
                "eui64": _ensure_list(ipv6_addr_data.get("eui64")),
                "no_default_link_local": "no-default-link-local" in ipv6_addr_data,
            },
            "adjust_mss": ipv6_data.get("adjust-mss"),
            "base_reachable_time": ipv6_data.get("base-reachable-time"),
            "disable_forwarding": "disable-forwarding" in ipv6_data,
            "dup_addr_detect_transmits": ipv6_data.get("dup-addr-detect-transmits"),
            "source_validation": ipv6_data.get("source-validation"),
        },
        "mirror": {
            "egress": mirror_data.get("egress"),
            "ingress": mirror_data.get("ingress"),
        },
        "mtu": data.get("mtu"),
        "parameters": {
            "erspan": {
                "direction": erspan_data.get("direction"),
                "hw_id": erspan_data.get("hw-id"),
                "index": erspan_data.get("index"),
                "version": erspan_data.get("version"),
            },
            "ip": {
                "ignore_df": "ignore-df" in params_ip_data,
                "key": params_ip_data.get("key"),
                "no_pmtu_discovery": "no-pmtu-discovery" in params_ip_data,
                "tos": params_ip_data.get("tos"),
                "ttl": params_ip_data.get("ttl"),
            },
            "ipv6": {
                "encaplimit": params_ipv6_data.get("encaplimit"),
                "flowlabel": params_ipv6_data.get("flowlabel"),
                "hoplimit": params_ipv6_data.get("hoplimit"),
                "tclass": params_ipv6_data.get("tclass"),
            },
        },
        "redirect": data.get("redirect"),
        "remote": data.get("remote"),
        "source_address": data.get("source-address"),
        "source_interface": data.get("source-interface"),
        "vrf": data.get("vrf"),
    }


def parse_config(_mapper, full_config: Dict[str, Any]) -> Dict[str, Any]:
    """Normalise full VyOS config into the GET /vyos/tunnel/config payload."""
    tunnel_config = full_config.get("interfaces", {}).get("tunnel", {})

    if not tunnel_config:
        return {"interfaces": [], "total": 0}

    interfaces = []
    for iface_name, iface_data in tunnel_config.items():
        if iface_data is None:
            iface_data = {}
        interfaces.append(_parse_tunnel_interface(iface_name, iface_data))

    return {"interfaces": interfaces, "total": len(interfaces)}
