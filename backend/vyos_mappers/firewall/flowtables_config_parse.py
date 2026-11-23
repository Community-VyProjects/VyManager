"""Read-model for firewall flowtable config.

Mappers own the VyOS tree. Routers call parse_config and do not walk it.
"""

from typing import Any, Dict, List, Optional


def _names(value: Any) -> List[str]:
    """A multi leaf: one value is a string, several are a list."""
    if isinstance(value, str):
        return [value]
    if isinstance(value, list):
        return [item for item in value if isinstance(item, str)]
    return []


def _text(value: Any) -> Optional[str]:
    return value if isinstance(value, str) else None


def parse_config(_mapper, full_config: Dict[str, Any]) -> Dict[str, Any]:
    """Return {"flowtables": [...], "total": n} for the flowtables response."""
    firewall = (full_config or {}).get("firewall")
    tables = firewall.get("flowtable") if isinstance(firewall, dict) else None
    flowtables = []
    if isinstance(tables, dict):
        for name, data in tables.items():
            if not isinstance(data, dict):
                continue
            flowtables.append({
                "name": name,
                "description": _text(data.get("description")),
                "interfaces": _names(data.get("interface")),
                "offload": _text(data.get("offload")),
            })
    return {"flowtables": flowtables, "total": len(flowtables)}
