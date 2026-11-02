"""Read-model for NDP proxy config.

Mappers own VyOS tree shape. Routers call parse_config and do not rebuild
the tree. Version keys come from the mapper (MergedMapper), not from
hardcoded 1.4/1.5 branches here.
"""

from typing import Any, Dict, List


def parse_prefixes(prefixes_raw) -> List[Dict[str, Any]]:
    if not prefixes_raw:
        return []

    prefixes = []
    for prefix_val, prefix_cfg in prefixes_raw.items():
        if prefix_cfg is None:
            prefix_cfg = {}
        prefixes.append(
            {
                "prefix": prefix_val,
                "disabled": "disable" in prefix_cfg,
                "mode": prefix_cfg.get("mode"),
                "interface": prefix_cfg.get("interface"),
            }
        )
    return prefixes


def parse_interfaces(interfaces_raw) -> List[Dict[str, Any]]:
    if not interfaces_raw:
        return []

    interfaces = []
    for iface_name, iface_cfg in interfaces_raw.items():
        if iface_cfg is None:
            iface_cfg = {}

        timeout_raw = iface_cfg.get("timeout")
        ttl_raw = iface_cfg.get("ttl")

        interfaces.append(
            {
                "name": iface_name,
                "disabled": "disable" in iface_cfg,
                "enable_router_bit": "enable-router-bit" in iface_cfg,
                "timeout": int(timeout_raw) if timeout_raw is not None else None,
                "ttl": int(ttl_raw) if ttl_raw is not None else None,
                "prefixes": parse_prefixes(iface_cfg.get("prefix", {})),
            }
        )
    return interfaces


def parse_config(_mapper, full_config: Dict[str, Any]) -> Dict[str, Any]:
    """Normalise full VyOS config into the GET /vyos/ndp-proxy/config payload."""
    ndp_config = full_config.get("service", {}).get("ndp-proxy", {})

    if not ndp_config:
        return {
            "route_refresh": None,
            "interfaces": [],
        }

    route_refresh_raw = ndp_config.get("route-refresh")
    route_refresh = int(route_refresh_raw) if route_refresh_raw is not None else None

    return {
        "route_refresh": route_refresh,
        "interfaces": parse_interfaces(ndp_config.get("interface", {})),
    }
