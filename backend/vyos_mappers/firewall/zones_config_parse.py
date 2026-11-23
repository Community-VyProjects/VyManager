"""Read-model for firewall zone config.

Mappers own the VyOS tree. Routers call parse_config and do not walk it.
"""

from typing import Any, Dict, List, Optional


def _names(value: Any) -> List[str]:
    """A multi leaf: one value is a string, several are a list."""
    if isinstance(value, str):
        return [value] if value else []
    if isinstance(value, list):
        return [str(item) for item in value if item]
    if isinstance(value, dict):
        return list(value.keys())
    return []


def _text(value: Any) -> Optional[str]:
    return value if isinstance(value, str) else None


def _dict(value: Any) -> Dict[str, Any]:
    return value if isinstance(value, dict) else {}


def _rulesets(node: Dict[str, Any]) -> Dict[str, Optional[str]]:
    """The IPv4 and IPv6 ruleset names under a firewall node."""
    return {
        "firewall_name": _text(node.get("name")),
        "firewall_ipv6_name": _text(node.get("ipv6-name")),
    }


def _zone(mapper, name: str, data: Dict[str, Any]) -> Dict[str, Any]:
    """One zone. Interface and default-firewall shape come from the mapper allowlist."""
    nodes = mapper.supported_zone_nodes()

    if "member-interface" in nodes:
        member = _dict(data.get("member"))
        interfaces = _names(member.get("interface"))
        vrfs = _names(member.get("vrf"))
    else:
        # 1.4 assigns interfaces (and VRFs) on the zone itself.
        interfaces = _names(data.get("interface"))
        vrfs = []

    from_zones = [
        {"from_zone": from_zone, **_rulesets(_dict(_dict(from_cfg).get("firewall")))}
        for from_zone, from_cfg in _dict(data.get("from")).items()
    ]

    intra_zone_filtering: Optional[Dict[str, Any]] = None
    if "intra-zone-filtering" in data:
        intra = _dict(data.get("intra-zone-filtering"))
        intra_zone_filtering = {
            "action": _text(intra.get("action")),
            **_rulesets(_dict(intra.get("firewall"))),
        }

    default_firewall: Optional[Dict[str, Any]] = None
    if "default-firewall" in nodes and "default-firewall" in data:
        default_fw = _dict(data.get("default-firewall"))
        default_firewall = {
            "name": _text(default_fw.get("name")),
            "ipv6_name": _text(default_fw.get("ipv6-name")),
        }

    return {
        "name": name,
        "description": _text(data.get("description")),
        "default_action": _text(data.get("default-action")),
        "default_log": "default-log" in data,
        "local_zone": "local-zone" in data,
        "interfaces": interfaces,
        "vrfs": vrfs,
        "default_firewall": default_firewall,
        "from_zones": from_zones,
        "intra_zone_filtering": intra_zone_filtering,
    }


def parse_config(mapper, full_config: Dict[str, Any]) -> Dict[str, Any]:
    """Return {"zones": [...], "total": n} for the zones response."""
    firewall = _dict((full_config or {}).get("firewall"))
    zones = [
        _zone(mapper, name, data)
        for name, data in _dict(firewall.get("zone")).items()
        if isinstance(data, dict)
    ]
    return {"zones": zones, "total": len(zones)}
