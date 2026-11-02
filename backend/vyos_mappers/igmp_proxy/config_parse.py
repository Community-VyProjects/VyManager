"""Read-model for IGMP proxy config.

Mappers own VyOS tree shape. Routers call parse_config and do not rebuild
the tree. IGMP proxy has no 1.4/1.5 config-tree split.
"""

from typing import Any, Dict, List


def _ensure_list(value: Any) -> List[str]:
    """Convert VyOS config value to a list. Single values come as strings, multiple as lists."""
    if value is None:
        return []
    if isinstance(value, list):
        return value
    if isinstance(value, str):
        return [value]
    return []


def parse_interfaces(interfaces_raw) -> List[Dict[str, Any]]:
    """Parse IGMP proxy interface configurations."""
    if not interfaces_raw:
        return []

    interfaces = []
    for iface_name, iface_config in interfaces_raw.items():
        if iface_config is None:
            iface_config = {}

        interfaces.append(
            {
                "name": iface_name,
                "role": iface_config.get("role"),
                "threshold": int(iface_config["threshold"])
                if iface_config.get("threshold")
                else None,
                "alt_subnets": _ensure_list(iface_config.get("alt-subnet")),
                "whitelists": _ensure_list(iface_config.get("whitelist")),
            }
        )

    return interfaces


def parse_config(_mapper, full_config: Dict[str, Any]) -> Dict[str, Any]:
    """Normalise full VyOS config into the GET /vyos/igmp-proxy/config payload."""
    igmp_config = full_config.get("protocols", {}).get("igmp-proxy", {})

    if not igmp_config:
        return {
            "disabled": False,
            "disable_quickleave": False,
            "interfaces": [],
        }

    return {
        "disabled": "disable" in igmp_config,
        "disable_quickleave": "disable-quickleave" in igmp_config,
        "interfaces": parse_interfaces(igmp_config.get("interface", {})),
    }
