"""Read-model for firewall group config.

Mappers own the VyOS tree. Routers call parse_config and do not walk it.
"""

from typing import Any, Dict, List

# (response key, CLI group type node, member leaf, has include)
_GROUP_SECTIONS = (
    ("address_groups", "address-group", "address", True),
    ("ipv6_address_groups", "ipv6-address-group", "address", True),
    ("network_groups", "network-group", "network", True),
    ("ipv6_network_groups", "ipv6-network-group", "network", True),
    ("port_groups", "port-group", "port", True),
    ("interface_groups", "interface-group", "interface", True),
    ("mac_groups", "mac-group", "mac-address", True),
    ("domain_groups", "domain-group", "address", False),
    ("remote_groups", "remote-group", "url", False),
)


def _dict(value: Any) -> dict:
    return value if isinstance(value, dict) else {}


def _names(value: Any) -> List[str]:
    """A multi leaf: one value is a string, several are a list."""
    if isinstance(value, str):
        return [value]
    if isinstance(value, list):
        return [str(item) for item in value]
    if isinstance(value, dict):
        return list(value.keys())
    return []


def _parse_group(name: str, group_type: str, data: Any, member_leaf: str, has_include: bool) -> Dict[str, Any]:
    data = _dict(data)
    return {
        "name": name,
        "type": group_type,
        "description": data.get("description"),
        "members": _names(data.get(member_leaf)),
        "included_groups": _names(data.get("include")) if has_include else [],
    }


def parse_config(_mapper, full_config: Dict[str, Any]) -> Dict[str, Any]:
    """Every firewall group, by type, in the router response's field names."""
    groups = _dict(_dict(_dict(full_config).get("firewall")).get("group"))
    result: Dict[str, Any] = {}
    by_type: Dict[str, int] = {}
    for key, node, member_leaf, has_include in _GROUP_SECTIONS:
        rows = [
            _parse_group(name, node, data, member_leaf, has_include)
            for name, data in _dict(groups.get(node)).items()
        ]
        result[key] = rows
        by_type[node] = len(rows)
    result["total"] = sum(by_type.values())
    result["by_type"] = by_type
    return result
