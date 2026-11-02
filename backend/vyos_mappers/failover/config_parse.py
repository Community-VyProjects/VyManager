"""Read-model for failover config.

Mappers own VyOS tree shape. Routers call parse_config and do not rebuild
the tree. Version branches use mapper.version, matching the old router
check: ``"1.5" in version or "latest" in version``.
"""

from typing import Any, Dict, List


def _is_1_5(mapper) -> bool:
    version = mapper.version
    return "1.5" in version or "latest" in version


def _empty_check() -> Dict[str, Any]:
    return {
        "policy": None,
        "port": None,
        "targets": [],
        "timeout": None,
        "type": None,
    }


def parse_check_targets(check_config: dict, is_1_5: bool) -> List[Dict[str, Any]]:
    """Parse health check targets from config."""
    target_raw = check_config.get("target", {})
    if not target_raw:
        return []

    targets = []

    if is_1_5:
        # 1.5: target is a tag node dict {addr: {interface: ..., vrf: ...}}
        if isinstance(target_raw, dict):
            for addr, props in target_raw.items():
                if props is None:
                    props = {}
                targets.append(
                    {
                        "address": addr,
                        "interface": props.get("interface") if isinstance(props, dict) else None,
                        "vrf": props.get("vrf") if isinstance(props, dict) else None,
                    }
                )
        elif isinstance(target_raw, list):
            for addr in target_raw:
                targets.append({"address": addr, "interface": None, "vrf": None})
    else:
        # 1.4: target is a multi-value (list of IPs or single string)
        if isinstance(target_raw, list):
            for addr in target_raw:
                targets.append({"address": addr, "interface": None, "vrf": None})
        elif isinstance(target_raw, str):
            targets.append({"address": target_raw, "interface": None, "vrf": None})

    return targets


def parse_check(check_config: dict, is_1_5: bool) -> Dict[str, Any]:
    """Parse health check configuration."""
    if not check_config:
        return _empty_check()

    return {
        "policy": check_config.get("policy"),
        "port": int(check_config["port"]) if check_config.get("port") else None,
        "targets": parse_check_targets(check_config, is_1_5),
        "timeout": int(check_config["timeout"]) if check_config.get("timeout") else None,
        "type": check_config.get("type"),
    }


def parse_next_hops(route_config: dict, is_1_5: bool) -> List[Dict[str, Any]]:
    """Parse next-hop configurations for a route."""
    next_hops_raw = route_config.get("next-hop", {})
    if not next_hops_raw:
        return []

    next_hops = []
    for nh_addr, nh_config in next_hops_raw.items():
        if nh_config is None:
            nh_config = {}

        next_hops.append(
            {
                "address": nh_addr,
                "check": parse_check(nh_config.get("check", {}), is_1_5),
                "interface": nh_config.get("interface"),
                "metric": int(nh_config["metric"]) if nh_config.get("metric") else None,
                "onlink": "onlink" in nh_config,
            }
        )

    return next_hops


def parse_dhcp_interfaces(route_config: dict, is_1_5: bool) -> List[Dict[str, Any]]:
    """Parse DHCP interface configurations for a route (1.5 only)."""
    if not is_1_5:
        return []

    dhcp_raw = route_config.get("dhcp-interface", {})
    if not dhcp_raw:
        return []

    dhcp_interfaces = []
    for iface_name, iface_config in dhcp_raw.items():
        if iface_config is None:
            iface_config = {}

        dhcp_interfaces.append(
            {
                "name": iface_name,
                "check": parse_check(iface_config.get("check", {}), is_1_5),
                "interface": iface_config.get("interface"),
                "metric": int(iface_config["metric"]) if iface_config.get("metric") else None,
                "onlink": "onlink" in iface_config,
            }
        )

    return dhcp_interfaces


def parse_routes(routes_raw: dict, is_1_5: bool) -> List[Dict[str, Any]]:
    """Parse failover route configurations."""
    routes = []

    for dest, route_config in routes_raw.items():
        if route_config is None:
            route_config = {}

        routes.append(
            {
                "destination": dest,
                "next_hops": parse_next_hops(route_config, is_1_5),
                "dhcp_interfaces": parse_dhcp_interfaces(route_config, is_1_5),
            }
        )

    return routes


def parse_config(mapper, full_config: Dict[str, Any]) -> Dict[str, Any]:
    """Normalise full VyOS config into the GET /vyos/failover/config payload."""
    is_1_5 = _is_1_5(mapper)
    failover_config = full_config.get("protocols", {}).get("failover", {})

    if not failover_config:
        return {"routes": []}

    return {"routes": parse_routes(failover_config.get("route", {}), is_1_5)}
