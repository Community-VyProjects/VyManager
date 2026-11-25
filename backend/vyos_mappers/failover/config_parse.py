"""Read-model for failover config.

Mappers own VyOS tree shape. Routers call parse_config and do not rebuild
the tree. The parse reads the shape the device returned, not the version
string: ``check target`` is a ``multi:`` list (or one string) on 1.4 and a
tag dict with ``interface``/``vrf`` children on 1.5, and ``dhcp-interface``
appears only on a device that has it.
"""

from typing import Any, Dict, List


def _empty_check() -> Dict[str, Any]:
    return {
        "policy": None,
        "port": None,
        "targets": [],
        "timeout": None,
        "type": None,
    }


def parse_check_targets(check_config: dict) -> List[Dict[str, Any]]:
    """Parse health check targets from config."""
    target_raw = check_config.get("target")
    if not target_raw:
        return []

    if isinstance(target_raw, dict):
        targets = []
        for addr, props in target_raw.items():
            props = props if isinstance(props, dict) else {}
            targets.append(
                {
                    "address": addr,
                    "interface": props.get("interface"),
                    "vrf": props.get("vrf"),
                }
            )
        return targets

    addresses = target_raw if isinstance(target_raw, list) else [target_raw]
    return [{"address": addr, "interface": None, "vrf": None} for addr in addresses]


def parse_check(check_config: dict) -> Dict[str, Any]:
    """Parse health check configuration."""
    if not check_config:
        return _empty_check()

    return {
        "policy": check_config.get("policy"),
        "port": int(check_config["port"]) if check_config.get("port") else None,
        "targets": parse_check_targets(check_config),
        "timeout": int(check_config["timeout"]) if check_config.get("timeout") else None,
        "type": check_config.get("type"),
    }


def _parse_gateway(config: dict) -> Dict[str, Any]:
    """Leaves a next-hop and a dhcp-interface share."""
    return {
        "check": parse_check(config.get("check") or {}),
        "interface": config.get("interface"),
        "metric": int(config["metric"]) if config.get("metric") else None,
        "onlink": "onlink" in config,
    }


def parse_next_hops(route_config: dict) -> List[Dict[str, Any]]:
    """Parse next-hop configurations for a route."""
    return [
        {"address": addr, **_parse_gateway(config or {})}
        for addr, config in (route_config.get("next-hop") or {}).items()
    ]


def parse_dhcp_interfaces(route_config: dict) -> List[Dict[str, Any]]:
    """Parse DHCP interface configurations for a route."""
    return [
        {"name": name, **_parse_gateway(config or {})}
        for name, config in (route_config.get("dhcp-interface") or {}).items()
    ]


def parse_routes(routes_raw: dict) -> List[Dict[str, Any]]:
    """Parse failover route configurations."""
    return [
        {
            "destination": dest,
            "next_hops": parse_next_hops(route_config or {}),
            "dhcp_interfaces": parse_dhcp_interfaces(route_config or {}),
        }
        for dest, route_config in routes_raw.items()
    ]


def parse_config(_mapper, full_config: Dict[str, Any]) -> Dict[str, Any]:
    """Normalise full VyOS config into the GET /vyos/failover/config payload."""
    failover_config = (full_config.get("protocols") or {}).get("failover") or {}
    return {"routes": parse_routes(failover_config.get("route") or {})}
