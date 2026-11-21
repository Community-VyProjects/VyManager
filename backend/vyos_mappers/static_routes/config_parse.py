"""Read-model for ``protocols static``.

Mappers own the VyOS tree shape. The router calls ``parse_config`` and
returns the result unchanged. The route walker is shared with the VRF parse,
which reads the same tree under ``vrf name <vrf> protocols static``.

Multicast routes and the BFD multi-hop source are read from whichever form
the device holds: ``mroute`` / ``source-address`` (1.5) or ``multicast`` /
``source <addr> profile`` (1.4).
"""

from typing import Any, Dict, List, Optional


def _dict(value: Any) -> Dict[str, Any]:
    return value if isinstance(value, dict) else {}


def _int(value: Any) -> Optional[int]:
    if value is None:
        return None
    try:
        return int(value)
    except (TypeError, ValueError):
        return None


def _names(value: Any) -> List[str]:
    """A multi leaf loads as a string (one value), a list, or a dict of keys."""
    if isinstance(value, str):
        return [value]
    if isinstance(value, list):
        return [str(v) for v in value]
    if isinstance(value, dict):
        return list(value)
    return []


def _next_hop(address: str, raw: Any) -> Dict[str, Any]:
    cfg = _dict(raw)
    bfd = _dict(cfg.get("bfd"))
    multi_hop = _dict(bfd.get("multi-hop"))
    source = multi_hop.get("source-address")
    source_profile = None
    tagged = _dict(multi_hop.get("source"))
    if source is None and tagged:
        source = next(iter(tagged))
        source_profile = _dict(tagged[source]).get("profile")
    return {
        "address": address,
        "distance": _int(cfg.get("distance")),
        "disable": "disable" in cfg,
        "vrf": cfg.get("vrf"),
        "interface": cfg.get("interface"),
        "bfd_enable": "bfd" in cfg,
        "bfd_profile": bfd.get("profile"),
        "bfd_multi_hop": "multi-hop" in bfd,
        "bfd_multi_hop_source": source,
        "bfd_multi_hop_source_profile": source_profile,
        "segments": cfg.get("segments"),
    }


def _interface(name: str, raw: Any) -> Dict[str, Any]:
    cfg = _dict(raw)
    return {
        "interface": name,
        "distance": _int(cfg.get("distance")),
        "disable": "disable" in cfg,
        "vrf": cfg.get("vrf"),
        "segments": cfg.get("segments"),
    }


def parse_route(destination: str, raw: Any, route_type: str) -> Dict[str, Any]:
    cfg = _dict(raw)
    blackhole = _dict(cfg.get("blackhole"))
    reject = _dict(cfg.get("reject"))
    return {
        "destination": destination,
        "description": cfg.get("description"),
        "next_hops": [_next_hop(a, c) for a, c in _dict(cfg.get("next-hop")).items()],
        "interfaces": [_interface(n, c) for n, c in _dict(cfg.get("interface")).items()],
        "blackhole": "blackhole" in cfg,
        "blackhole_distance": _int(blackhole.get("distance")),
        "blackhole_tag": _int(blackhole.get("tag")),
        "reject": "reject" in cfg,
        "reject_distance": _int(reject.get("distance")),
        "reject_tag": _int(reject.get("tag")),
        "dhcp_interfaces": _names(cfg.get("dhcp-interface")),
        "route_type": route_type,
    }


def parse_routes(scope: Any, route_type: str) -> List[Dict[str, Any]]:
    """Routes of one family below ``scope`` (``protocols static``, a table, or a VRF)."""
    node = "route" if route_type == "ipv4" else "route6"
    return [parse_route(d, c, route_type) for d, c in _dict(_dict(scope).get(node)).items()]


def _mroute_targets(raw: Any, key: str) -> List[Dict[str, Any]]:
    return [
        {key: name, "distance": _int(_dict(cfg).get("distance")), "disable": "disable" in _dict(cfg)}
        for name, cfg in _dict(raw).items()
    ]


def _mroutes(static: Dict[str, Any]) -> List[Dict[str, Any]]:
    """One row per prefix. ``*_configured`` tells the screen which node holds
    the list, so a delete only names nodes the device has."""
    rows: Dict[str, Dict[str, Any]] = {}

    def row(prefix: str) -> Dict[str, Any]:
        return rows.setdefault(prefix, {
            "prefix": prefix,
            "next_hops": [],
            "interfaces": [],
            "next_hops_configured": False,
            "interfaces_configured": False,
        })

    for prefix, raw in _dict(static.get("mroute")).items():
        cfg = _dict(raw)
        entry = row(prefix)
        entry["next_hops_configured"] = "next-hop" in cfg
        entry["interfaces_configured"] = "interface" in cfg
        entry["next_hops"] = _mroute_targets(cfg.get("next-hop"), "address")
        entry["interfaces"] = _mroute_targets(cfg.get("interface"), "interface")

    multicast = _dict(static.get("multicast"))
    for prefix, raw in _dict(multicast.get("route")).items():
        entry = row(prefix)
        entry["next_hops_configured"] = True
        entry["next_hops"] = _mroute_targets(_dict(raw).get("next-hop"), "address")
    for prefix, raw in _dict(multicast.get("interface-route")).items():
        entry = row(prefix)
        entry["interfaces_configured"] = True
        entry["interfaces"] = _mroute_targets(_dict(raw).get("next-hop-interface"), "interface")
    return list(rows.values())


def parse_config(_mapper: Any, full_config: Any) -> Dict[str, Any]:
    protocols = _dict(_dict(full_config).get("protocols"))
    static = _dict(protocols.get("static"))
    arp = _dict(_dict(static.get("arp")).get("interface"))
    proxy = _dict(static.get("neighbor-proxy"))
    return {
        "ipv4_routes": parse_routes(static, "ipv4"),
        "ipv6_routes": parse_routes(static, "ipv6"),
        "routing_tables": [
            {
                "table_id": int(table_id),
                "description": _dict(cfg).get("description"),
                "ipv4_routes": parse_routes(cfg, "ipv4"),
                "ipv6_routes": parse_routes(cfg, "ipv6"),
            }
            for table_id, cfg in _dict(static.get("table")).items()
        ],
        "route_map": static.get("route-map"),
        "arp_interfaces": [
            {
                "interface": iface,
                "entries": [
                    {
                        "ip_address": address,
                        "mac_address": _dict(entry).get("mac", ""),
                        "description": _dict(entry).get("description"),
                    }
                    for address, entry in _dict(_dict(cfg).get("address")).items()
                ],
            }
            for iface, cfg in arp.items()
        ],
        "multicast_routes": _mroutes(static),
        "neighbor_proxy": {
            "arp_entries": [
                {"ip_address": a, "interfaces": _names(_dict(c).get("interface"))}
                for a, c in _dict(proxy.get("arp")).items()
            ],
            "nd_entries": [
                {"ipv6_address": a, "interfaces": _names(_dict(c).get("interface"))}
                for a, c in _dict(proxy.get("nd")).items()
            ],
        },
    }
