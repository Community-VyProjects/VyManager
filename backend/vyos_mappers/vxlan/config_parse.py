"""Read-model for VXLAN interface config.

Mappers own VyOS tree shape. Routers call parse_config and do not rebuild
the tree. The old parser did not branch on version; 1.5-only leaves are
read when present.
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


def _parse_vlan_to_vni(vlan_to_vni_data: dict) -> List[Dict[str, Any]]:
    """Parse VLAN-to-VNI mappings."""
    if not vlan_to_vni_data:
        return []

    entries = []
    for vlan_id, mapping in vlan_to_vni_data.items():
        if mapping is None:
            mapping = {}
        entries.append(
            {
                "vlan_id": str(vlan_id),
                "vni": mapping.get("vni"),
                "description": mapping.get("description"),
            }
        )
    return entries


def _parse_vxlan_interface(name: str, data: dict) -> Dict[str, Any]:
    """Parse a single VXLAN interface configuration."""
    ip_data = data.get("ip", {}) or {}
    ipv6_data = data.get("ipv6", {}) or {}
    ipv6_addr_data = ipv6_data.get("address", {}) or {}
    mirror_data = data.get("mirror", {}) or {}
    params_data = data.get("parameters", {}) or {}
    params_ip_data = params_data.get("ip", {}) or {}
    params_ipv6_data = params_data.get("ipv6", {}) or {}

    return {
        "name": name,
        "addresses": _ensure_list(data.get("address")),
        "description": data.get("description"),
        "disabled": "disable" in data,
        "gpe": "gpe" in data,
        "group": data.get("group"),
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
                "interface_identifier": ipv6_addr_data.get("interface-identifier"),
                "no_default_link_local": "no-default-link-local" in ipv6_addr_data,
            },
            "adjust_mss": ipv6_data.get("adjust-mss"),
            "base_reachable_time": ipv6_data.get("base-reachable-time"),
            "disable_forwarding": "disable-forwarding" in ipv6_data,
            "dup_addr_detect_transmits": ipv6_data.get("dup-addr-detect-transmits"),
            "source_validation": ipv6_data.get("source-validation"),
        },
        "mac": data.get("mac"),
        "mirror": {
            "egress": mirror_data.get("egress"),
            "ingress": mirror_data.get("ingress"),
        },
        "mtu": data.get("mtu"),
        "parameters": {
            "external": "external" in params_data,
            "ip": {
                "df": params_ip_data.get("df"),
                "tos": params_ip_data.get("tos"),
                "ttl": params_ip_data.get("ttl"),
            },
            "ipv6": {
                "flowlabel": params_ipv6_data.get("flowlabel"),
            },
            "neighbor_suppress": "neighbor-suppress" in params_data,
            "nolearning": "nolearning" in params_data,
            "vni_filter": "vni-filter" in params_data,
        },
        "port": data.get("port"),
        "redirect": data.get("redirect"),
        "remotes": _ensure_list(data.get("remote")),
        "source_address": data.get("source-address"),
        "source_interface": data.get("source-interface"),
        "vlan_to_vni": _parse_vlan_to_vni(data.get("vlan-to-vni", {})),
        "vni": data.get("vni"),
        "vrf": data.get("vrf"),
    }


def parse_config(_mapper, full_config: Dict[str, Any]) -> Dict[str, Any]:
    """Normalise full VyOS config into the GET /vyos/vxlan/config payload."""
    vxlan_config = full_config.get("interfaces", {}).get("vxlan", {})

    if not vxlan_config:
        return {"interfaces": [], "total": 0}

    interfaces = []
    for iface_name, iface_data in vxlan_config.items():
        if iface_data is None:
            iface_data = {}
        interfaces.append(_parse_vxlan_interface(iface_name, iface_data))

    return {"interfaces": interfaces, "total": len(interfaces)}
