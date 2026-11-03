"""Read-model for VRF config.

Mappers own VyOS tree shape. Routers call parse_config and do not rebuild
the tree. BFD multi-hop source is read from both the 1.5 flat
``source-address`` leaf and the 1.4 ``source/<tag>`` node. The historical
parser tried both regardless of version; do not drop either read.
"""

from typing import Any, Dict, List, Optional


def parse_config(_mapper, full_config: Dict[str, Any]) -> Dict[str, Any]:
    """Normalise full VyOS config into the GET /vyos/vrf/config payload.

    BFD multi-hop source is not selected by version: both the 1.5
    source-address leaf and the 1.4 source/<tag> node are read.
    """
    vrf_config = full_config.get("vrf", {})
    if not vrf_config:
        return {"bind_to_all": False, "instances": []}

    return {
        "bind_to_all": "bind-to-all" in vrf_config,
        "instances": parse_vrf_instances(vrf_config.get("name", {})),
    }


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


def _parse_bfd(nh_config: dict) -> Optional[Dict[str, Any]]:
    """Parse BFD config from a next-hop.

    VyOS 1.5 stores multi-hop source as ``source-address``. VyOS 1.4 stores
    it as ``source/<tag>``. Both reads are preserved.
    """
    bfd_config = nh_config.get("bfd", {})
    if not bfd_config:
        return None

    profile = bfd_config.get("profile")
    multi_hop = bfd_config.get("multi-hop", {})

    # VyOS 1.5: source-address (flat leaf)
    multi_hop_source = multi_hop.get("source-address")

    # VyOS 1.4: source/<tag>/profile (tagged node)
    if not multi_hop_source:
        source_config = multi_hop.get("source", {})
        if isinstance(source_config, dict):
            for addr in source_config:
                multi_hop_source = addr
                break

    if not profile and not multi_hop_source:
        return None

    return {"profile": profile, "multi_hop_source": multi_hop_source}


def _parse_static_routes(route_config: dict, route_type: str = "route") -> List[Dict[str, Any]]:
    """Parse static routes (route or route6) from VRF config."""
    routes = []
    raw = route_config.get(route_type, {})
    if not isinstance(raw, dict):
        return routes

    for dest, dest_config in raw.items():
        if dest_config is None:
            dest_config = {}

        next_hops = []
        for nh_addr, nh_config in (dest_config.get("next-hop", {}) or {}).items():
            if nh_config is None:
                nh_config = {}
            next_hops.append(
                {
                    "address": nh_addr,
                    "disable": "disable" in nh_config,
                    "distance": int(nh_config["distance"]) if nh_config.get("distance") else None,
                    "interface": nh_config.get("interface"),
                    "vrf": nh_config.get("vrf"),
                    "bfd": _parse_bfd(nh_config),
                    "segments": nh_config.get("segments"),
                }
            )

        interfaces = []
        for iface_name, iface_config in (dest_config.get("interface", {}) or {}).items():
            if iface_config is None:
                iface_config = {}
            interfaces.append(
                {
                    "name": iface_name,
                    "disable": "disable" in iface_config,
                    "distance": int(iface_config["distance"]) if iface_config.get("distance") else None,
                    "vrf": iface_config.get("vrf"),
                    "segments": iface_config.get("segments"),
                }
            )

        blackhole = None
        bh = dest_config.get("blackhole")
        if bh is not None:
            if isinstance(bh, dict):
                blackhole = {
                    "distance": int(bh["distance"]) if bh.get("distance") else None,
                    "tag": int(bh["tag"]) if bh.get("tag") else None,
                }
            else:
                blackhole = {"distance": None, "tag": None}

        reject = None
        rj = dest_config.get("reject")
        if rj is not None:
            if isinstance(rj, dict):
                reject = {
                    "distance": int(rj["distance"]) if rj.get("distance") else None,
                    "tag": int(rj["tag"]) if rj.get("tag") else None,
                }
            else:
                reject = {"distance": None, "tag": None}

        routes.append(
            {
                "destination": dest,
                "description": dest_config.get("description"),
                "dhcp_interface": dest_config.get("dhcp-interface"),
                "next_hops": next_hops,
                "interfaces": interfaces,
                "blackhole": blackhole,
                "reject": reject,
            }
        )

    return routes


def parse_static_config(protocols_config: dict) -> Optional[Dict[str, Any]]:
    """Parse static route configuration from VRF protocols."""
    static_config = protocols_config.get("static", {})
    if not static_config:
        return None

    routes = _parse_static_routes(static_config, "route")
    routes6 = _parse_static_routes(static_config, "route6")

    if not routes and not routes6:
        return {"routes": [], "routes6": []}

    return {"routes": routes, "routes6": routes6}


def parse_rpki_config(protocols_config: dict) -> Optional[Dict[str, Any]]:
    """Parse RPKI configuration from VRF protocols."""
    rpki_config = protocols_config.get("rpki", {})
    if not rpki_config:
        return None

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
        "raw_config": ospf_config,
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
        "raw_config": isis_config,
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
        "raw_config": bgp_config,
    }


def parse_dhcp_config(service_config: dict) -> Optional[Dict[str, Any]]:
    """Parse DHCP server configuration from VRF service."""
    dhcp_config = service_config.get("dhcp-server", {})
    if not dhcp_config:
        return None

    shared_networks = []
    for net_name, net_data in (dhcp_config.get("shared-network-name", {}) or {}).items():
        if net_data is None:
            net_data = {}

        subnets = []
        for prefix, subnet_data in (net_data.get("subnet", {}) or {}).items():
            if subnet_data is None:
                subnet_data = {}
            subnets.append(
                {
                    "prefix": prefix,
                    "default_router": subnet_data.get("default-router") or (subnet_data.get("option", {}) or {}).get("default-router"),
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
        "disabled": "disable" in dhcp_config,
        "shared_networks": shared_networks,
        "raw_config": dhcp_config,
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


def parse_vrf_instances(names_raw: dict) -> List[Dict[str, Any]]:
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

        static = parse_static_config(protocols_config) if isinstance(protocols_config, dict) else None
        rpki = parse_rpki_config(protocols_config) if isinstance(protocols_config, dict) else None
        failover = parse_failover_config(protocols_config) if isinstance(protocols_config, dict) else None
        ospf = parse_ospf_summary(protocols_config) if isinstance(protocols_config, dict) else None
        ospfv3 = parse_ospfv3_summary(protocols_config) if isinstance(protocols_config, dict) else None
        isis = parse_isis_summary(protocols_config) if isinstance(protocols_config, dict) else None
        bgp = parse_bgp_summary(protocols_config) if isinstance(protocols_config, dict) else None

        dhcp = parse_dhcp_config(service_config) if isinstance(service_config, dict) else None
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
