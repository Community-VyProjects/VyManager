"""Read-model for VRF config.

Mappers own VyOS tree shape. Routers call parse_config and do not rebuild
the tree. VRF static routes are read by the global static route walker and
the VRF DHCP server by the global DHCP server read model.
"""

from typing import Any, Dict, List, Optional, Tuple, cast

from vyos_mappers.base import CommandMapperRegistry
from vyos_mappers.dhcp_server.dhcp_server import DHCPServerMapper
from vyos_mappers.static_routes.config_parse import parse_routes
from vyos_mappers.static_routes.static_routes import StaticRoutesMapper

MASKED_SECRET = "***"

# Secret leaves in each raw sub-tree the response returns; "*" is a tag node.
_SECRET_PATHS: Dict[str, Tuple[Tuple[str, ...], ...]] = {
    "bgp": (
        ("neighbor", "*", "password"),
        ("peer-group", "*", "password"),
    ),
    "isis": (
        ("area-password", "md5"),
        ("area-password", "plaintext-password"),
        ("domain-password", "md5"),
        ("domain-password", "plaintext-password"),
        ("interface", "*", "password", "md5"),
        ("interface", "*", "password", "plaintext-password"),
    ),
    "ospf": (
        ("interface", "*", "authentication", "plaintext-password"),
        ("interface", "*", "authentication", "md5", "key-id", "*", "md5-key"),
        ("area", "*", "virtual-link", "*", "authentication", "plaintext-password"),
        ("area", "*", "virtual-link", "*", "authentication", "md5", "key-id", "*", "md5-key"),
    ),
    "dhcp-server": (
        ("dynamic-dns-update", "tsig-key", "*", "secret"),
    ),
}


def parse_config(mapper, full_config: Dict[str, Any]) -> Dict[str, Any]:
    """Normalise full VyOS config into the GET /vyos/vrf/config payload."""
    vrf_config = full_config.get("vrf", {})
    if not vrf_config:
        return {"bind_to_all": False, "instances": []}

    # The static route and DHCP server trees are the global ones; their
    # mappers pick the version form.
    static_mapper = cast(
        StaticRoutesMapper, CommandMapperRegistry.get_mapper("static_routes", mapper.version)
    )
    dhcp_mapper = cast(
        DHCPServerMapper, CommandMapperRegistry.get_mapper("dhcp_server", mapper.version)
    )
    return {
        "bind_to_all": "bind-to-all" in vrf_config,
        "instances": parse_vrf_instances(vrf_config.get("name", {}), static_mapper, dhcp_mapper),
    }


def _mask_path(node: Any, path: Tuple[str, ...]) -> Any:
    """Copy ``node`` with the leaf at ``path`` replaced by the mask."""
    if not isinstance(node, dict):
        return node
    head, rest = path[0], path[1:]
    keys = list(node) if head == "*" else [head] if head in node else []
    if not keys:
        return node
    out = dict(node)
    for key in keys:
        out[key] = _mask_path(node[key], rest) if rest else MASKED_SECRET
    return out


def masked_raw(feature: str, raw: Any) -> Any:
    """Return the raw sub-tree with every secret leaf of ``feature`` masked."""
    for path in _SECRET_PATHS[feature]:
        raw = _mask_path(raw, path)
    return raw


def parse_ip_settings(config: dict, family: str) -> Dict[str, Any]:
    """Parse IP or IPv6 settings from VRF config."""
    family_config = config.get(family, {})
    if not family_config:
        return {
            "disable_forwarding": False,
            "nht_no_resolve_via_default": False,
            "protocol_route_maps": [],
        }

    disable_forwarding = "disable-forwarding" in family_config
    nht_no_resolve = "no-resolve-via-default" in family_config.get("nht", {})

    protocol_route_maps = []
    protocol_config = family_config.get("protocol", {})
    for proto_name, proto_settings in protocol_config.items():
        if proto_settings and isinstance(proto_settings, dict):
            route_map = proto_settings.get("route-map")
            if route_map:
                protocol_route_maps.append(
                    {"protocol": proto_name, "route_map": route_map}
                )

    return {
        "disable_forwarding": disable_forwarding,
        "nht_no_resolve_via_default": nht_no_resolve,
        "protocol_route_maps": protocol_route_maps,
    }


def parse_static_config(
    protocols_config: dict, static_mapper: StaticRoutesMapper
) -> Optional[Dict[str, Any]]:
    """Static routes under ``vrf name <vrf> protocols static``.

    The tree is the global ``protocols static`` route tree, so the global
    walker reads it.
    """
    if "static" not in protocols_config:
        return None
    static_config = protocols_config.get("static")
    return {
        "routes": parse_routes(static_mapper, static_config, "ipv4"),
        "routes6": parse_routes(static_mapper, static_config, "ipv6"),
    }


def parse_rpki_config(protocols_config: dict) -> Optional[Dict[str, Any]]:
    """Parse RPKI configuration from VRF protocols.

    Presence is key membership: a bare ``protocols rpki`` parses as ``{}``
    and is still a node the screen can remove.
    """
    if "rpki" not in protocols_config:
        return None
    rpki_config = protocols_config.get("rpki") or {}

    caches = []
    for cache_name, cache_data in (rpki_config.get("cache", {}) or {}).items():
        if cache_data is None:
            cache_data = {}
        ssh = None
        ssh_data = cache_data.get("ssh", {})
        if ssh_data:
            ssh = {
                "key": ssh_data.get("key"),
                "username": ssh_data.get("username"),
            }
        caches.append(
            {
                "name": cache_name,
                "port": int(cache_data["port"]) if cache_data.get("port") else None,
                "preference": int(cache_data["preference"]) if cache_data.get("preference") else None,
                "source_address": cache_data.get("source-address"),
                "ssh": ssh,
            }
        )

    return {
        "caches": caches,
        "expire_interval": int(rpki_config["expire-interval"]) if rpki_config.get("expire-interval") else None,
        "polling_period": int(rpki_config["polling-period"]) if rpki_config.get("polling-period") else None,
        "retry_interval": int(rpki_config["retry-interval"]) if rpki_config.get("retry-interval") else None,
        "raw_config": rpki_config,
    }


def _parse_failover_check(check_config: dict) -> Optional[Dict[str, Any]]:
    """Parse failover check configuration."""
    if not check_config:
        return None

    targets = []
    for addr, target_data in (check_config.get("target", {}) or {}).items():
        if target_data is None:
            target_data = {}
        targets.append(
            {
                "address": addr,
                "interface": target_data.get("interface"),
                "vrf": target_data.get("vrf"),
            }
        )

    return {
        "policy": check_config.get("policy"),
        "port": int(check_config["port"]) if check_config.get("port") else None,
        "targets": targets,
        "timeout": int(check_config["timeout"]) if check_config.get("timeout") else None,
        "type": check_config.get("type"),
    }


def parse_failover_config(protocols_config: dict) -> Optional[Dict[str, Any]]:
    """Parse failover configuration from VRF protocols."""
    failover_config = protocols_config.get("failover", {})
    if not failover_config:
        return None

    routes = []
    for dest, dest_data in (failover_config.get("route", {}) or {}).items():
        if dest_data is None:
            dest_data = {}

        next_hops = []
        for nh_addr, nh_data in (dest_data.get("next-hop", {}) or {}).items():
            if nh_data is None:
                nh_data = {}
            next_hops.append(
                {
                    "address": nh_addr,
                    "check": _parse_failover_check(nh_data.get("check", {})),
                    "interface": nh_data.get("interface"),
                    "metric": int(nh_data["metric"]) if nh_data.get("metric") else None,
                    "onlink": "onlink" in nh_data,
                }
            )

        dhcp_interfaces = []
        for iface_name, iface_data in (dest_data.get("dhcp-interface", {}) or {}).items():
            if iface_data is None:
                iface_data = {}
            dhcp_interfaces.append(
                {
                    "name": iface_name,
                    "check": _parse_failover_check(iface_data.get("check", {})),
                    "interface": iface_data.get("interface"),
                    "metric": int(iface_data["metric"]) if iface_data.get("metric") else None,
                    "onlink": "onlink" in iface_data,
                }
            )

        routes.append(
            {
                "destination": dest,
                "next_hops": next_hops,
                "dhcp_interfaces": dhcp_interfaces,
            }
        )

    return {"routes": routes, "raw_config": failover_config}


def parse_ospf_summary(protocols_config: dict) -> Optional[Dict[str, Any]]:
    """Parse OSPF summary from VRF protocols."""
    ospf_config = protocols_config.get("ospf", {})
    if not ospf_config:
        return None

    router_id = None
    params = ospf_config.get("parameters", {})
    if isinstance(params, dict):
        router_id = params.get("router-id")

    areas = list(ospf_config.get("area", {}).keys()) if isinstance(ospf_config.get("area"), dict) else []
    interfaces = list(ospf_config.get("interface", {}).keys()) if isinstance(ospf_config.get("interface"), dict) else []
    redistribute = list(ospf_config.get("redistribute", {}).keys()) if isinstance(ospf_config.get("redistribute"), dict) else []

    return {
        "configured": True,
        "router_id": router_id,
        "areas": areas,
        "interfaces": interfaces,
        "redistribute": redistribute,
        "raw_config": masked_raw("ospf", ospf_config),
    }


def parse_ospfv3_summary(protocols_config: dict) -> Optional[Dict[str, Any]]:
    """Parse OSPFv3 summary from VRF protocols."""
    ospfv3_config = protocols_config.get("ospfv3", {})
    if not ospfv3_config:
        return None

    router_id = None
    params = ospfv3_config.get("parameters", {})
    if isinstance(params, dict):
        router_id = params.get("router-id")

    areas = list(ospfv3_config.get("area", {}).keys()) if isinstance(ospfv3_config.get("area"), dict) else []
    interfaces = list(ospfv3_config.get("interface", {}).keys()) if isinstance(ospfv3_config.get("interface"), dict) else []
    redistribute = list(ospfv3_config.get("redistribute", {}).keys()) if isinstance(ospfv3_config.get("redistribute"), dict) else []

    return {
        "configured": True,
        "router_id": router_id,
        "areas": areas,
        "interfaces": interfaces,
        "redistribute": redistribute,
        "raw_config": ospfv3_config,
    }


def parse_isis_summary(protocols_config: dict) -> Optional[Dict[str, Any]]:
    """Parse IS-IS summary from VRF protocols."""
    isis_config = protocols_config.get("isis", {})
    if not isis_config:
        return None

    net = isis_config.get("net")
    interfaces = list(isis_config.get("interface", {}).keys()) if isinstance(isis_config.get("interface"), dict) else []

    redistribute_ipv4 = []
    redistribute_ipv6 = []
    redist = isis_config.get("redistribute", {})
    if isinstance(redist, dict):
        ipv4_redist = redist.get("ipv4", {})
        if isinstance(ipv4_redist, dict):
            redistribute_ipv4 = list(ipv4_redist.keys())
        ipv6_redist = redist.get("ipv6", {})
        if isinstance(ipv6_redist, dict):
            redistribute_ipv6 = list(ipv6_redist.keys())

    return {
        "configured": True,
        "net": net,
        "interfaces": interfaces,
        "redistribute_ipv4": redistribute_ipv4,
        "redistribute_ipv6": redistribute_ipv6,
        "raw_config": masked_raw("isis", isis_config),
    }


def parse_bgp_summary(protocols_config: dict) -> Optional[Dict[str, Any]]:
    """Parse BGP summary from VRF protocols."""
    bgp_config = protocols_config.get("bgp", {})
    if not bgp_config:
        return None

    system_as = None
    as_val = bgp_config.get("system-as")
    if as_val:
        try:
            system_as = int(as_val)
        except (ValueError, TypeError):
            pass  # Unparseable system-as reads as unset.

    router_id = None
    params = bgp_config.get("parameters", {})
    if isinstance(params, dict):
        router_id = params.get("router-id")

    neighbors = list(bgp_config.get("neighbor", {}).keys()) if isinstance(bgp_config.get("neighbor"), dict) else []
    peer_groups = list(bgp_config.get("peer-group", {}).keys()) if isinstance(bgp_config.get("peer-group"), dict) else []

    address_families = []
    af_config = bgp_config.get("address-family", {})
    if isinstance(af_config, dict):
        for afi, af_data in af_config.items():
            if af_data and isinstance(af_data, dict):
                networks = []
                network_config = af_data.get("network", {})
                if isinstance(network_config, dict):
                    for prefix, net_data in network_config.items():
                        if net_data is None:
                            net_data = {}
                        networks.append(
                            {
                                "prefix": prefix,
                                "route_map": net_data.get("route-map"),
                                "backdoor": "backdoor" in net_data,
                            }
                        )
                address_families.append({"afi": afi, "networks": networks})

    return {
        "configured": True,
        "system_as": system_as,
        "router_id": router_id,
        "neighbors": neighbors,
        "peer_groups": peer_groups,
        "address_families": address_families,
        "raw_config": masked_raw("bgp", bgp_config),
    }


def parse_dhcp_config(
    service_config: dict, dhcp_mapper: DHCPServerMapper
) -> Optional[Dict[str, Any]]:
    """Summarise ``vrf name <vrf> service dhcp-server``.

    The tree is the global ``service dhcp-server`` tree, so the global read
    model parses it.
    """
    if "dhcp-server" not in service_config:
        return None
    parsed = dhcp_mapper.parse_config({"service": service_config})
    return {
        "configured": True,
        "disabled": parsed["global_config"]["disable"],
        "shared_networks": [
            {
                "name": network["name"],
                "description": network["description"],
                "disabled": network["disable"],
                "subnets": [
                    {
                        "prefix": subnet["subnet"],
                        "default_router": subnet["default_router"],
                        "ranges": len(subnet["ranges"]),
                        "static_mappings": len(subnet["static_mappings"]),
                    }
                    for subnet in network["subnets"]
                ],
            }
            for network in parsed["shared_networks"]
        ],
        "raw_config": masked_raw("dhcp-server", service_config["dhcp-server"] or {}),
    }


def parse_dhcpv6_config(service_config: dict) -> Optional[Dict[str, Any]]:
    """Parse DHCPv6 server configuration from VRF service."""
    dhcpv6_config = service_config.get("dhcpv6-server", {})
    if not dhcpv6_config:
        return None

    shared_networks = []
    for net_name, net_data in (dhcpv6_config.get("shared-network-name", {}) or {}).items():
        if net_data is None:
            net_data = {}

        subnets = []
        for prefix, subnet_data in (net_data.get("subnet", {}) or {}).items():
            if subnet_data is None:
                subnet_data = {}
            subnets.append(
                {
                    "prefix": prefix,
                    "ranges": len(subnet_data.get("range", {})) if isinstance(subnet_data.get("range"), dict) else 0,
                    "static_mappings": len(subnet_data.get("static-mapping", {})) if isinstance(subnet_data.get("static-mapping"), dict) else 0,
                }
            )

        shared_networks.append(
            {
                "name": net_name,
                "description": net_data.get("description"),
                "disabled": "disable" in net_data,
                "subnets": subnets,
            }
        )

    return {
        "configured": True,
        "disabled": "disable" in dhcpv6_config,
        "shared_networks": shared_networks,
        "raw_config": dhcpv6_config,
    }


def parse_vrf_instances(
    names_raw: dict, static_mapper: StaticRoutesMapper, dhcp_mapper: DHCPServerMapper
) -> List[Dict[str, Any]]:
    """Parse VRF instance configurations."""
    instances = []

    for vrf_name, vrf_config in names_raw.items():
        if vrf_config is None:
            vrf_config = {}

        protocols = []
        protocols_config = vrf_config.get("protocols", {})
        if isinstance(protocols_config, dict):
            protocols = list(protocols_config.keys())

        services = []
        service_config = vrf_config.get("service", {})
        if isinstance(service_config, dict):
            services = list(service_config.keys())

        static = parse_static_config(protocols_config, static_mapper) if isinstance(protocols_config, dict) else None
        rpki = parse_rpki_config(protocols_config) if isinstance(protocols_config, dict) else None
        failover = parse_failover_config(protocols_config) if isinstance(protocols_config, dict) else None
        ospf = parse_ospf_summary(protocols_config) if isinstance(protocols_config, dict) else None
        ospfv3 = parse_ospfv3_summary(protocols_config) if isinstance(protocols_config, dict) else None
        isis = parse_isis_summary(protocols_config) if isinstance(protocols_config, dict) else None
        bgp = parse_bgp_summary(protocols_config) if isinstance(protocols_config, dict) else None

        dhcp = parse_dhcp_config(service_config, dhcp_mapper) if isinstance(service_config, dict) else None
        dhcpv6 = parse_dhcpv6_config(service_config) if isinstance(service_config, dict) else None

        instances.append(
            {
                "name": vrf_name,
                "description": vrf_config.get("description"),
                "disabled": "disable" in vrf_config,
                "table": int(vrf_config["table"]) if vrf_config.get("table") else None,
                "vni": int(vrf_config["vni"]) if vrf_config.get("vni") else None,
                "ip": parse_ip_settings(vrf_config, "ip"),
                "ipv6": parse_ip_settings(vrf_config, "ipv6"),
                "protocols": protocols,
                "services": services,
                "static": static,
                "rpki": rpki,
                "failover": failover,
                "ospf": ospf,
                "ospfv3": ospfv3,
                "isis": isis,
                "bgp": bgp,
                "dhcp": dhcp,
                "dhcpv6": dhcpv6,
            }
        )

    return instances
