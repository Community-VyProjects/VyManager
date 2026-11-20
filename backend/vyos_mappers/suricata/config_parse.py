"""Read-model for Suricata config.

Mappers own VyOS tree shape. Routers call parse_config and do not rebuild
the tree.
"""

from typing import Any, Dict, List


def _multi(raw: Any) -> List[str]:
    if raw is None:
        return []
    if isinstance(raw, list):
        return [str(item) for item in raw if item is not None and str(item) != ""]
    if isinstance(raw, dict):
        return [str(key) for key in raw.keys() if str(key) != ""]
    if isinstance(raw, str):
        return [raw] if raw else []
    return [str(raw)]


def _members(raw: Any) -> List[Dict[str, Any]]:
    members = []
    for token in _multi(raw):
        exclude = token.startswith("!")
        value = token[1:] if exclude else token
        if not value:
            continue
        members.append({"value": value, "exclude": exclude})
    members.sort(key=lambda item: (item["value"], item["exclude"]))
    return members


def _parse_groups(raw: Any, member_key: str) -> List[Dict[str, Any]]:
    if not isinstance(raw, dict):
        return []
    groups = []
    for name, cfg in raw.items():
        if not name:
            continue
        node = cfg if isinstance(cfg, dict) else {}
        groups.append(
            {
                "name": str(name),
                "members": _members(node.get(member_key)),
                "groups": _members(node.get("group")),
            }
        )
    groups.sort(key=lambda item: item["name"])
    return groups


def parse_config(_mapper, full_config: Dict[str, Any]) -> Dict[str, Any]:
    """Normalise full VyOS config into the GET /vyos/suricata/config payload."""
    service = full_config.get("service") if isinstance(full_config, dict) else None
    suricata = service.get("suricata") if isinstance(service, dict) else None
    if not isinstance(suricata, dict) or not suricata:
        return {"configured": False}

    log_raw = suricata.get("log")
    eve: Dict[str, Any] = {}
    eve_present = False
    if isinstance(log_raw, dict) and "eve" in log_raw:
        eve_present = True
        eve_raw = log_raw.get("eve")
        if isinstance(eve_raw, dict):
            eve = eve_raw

    types_set = "type" in eve
    filename = eve.get("filename")
    filetype = eve.get("filetype")
    return {
        "configured": True,
        "interfaces": sorted(_multi(suricata.get("interface"))),
        "address_groups": _parse_groups(suricata.get("address-group"), "address"),
        "port_groups": _parse_groups(suricata.get("port-group"), "port"),
        "log": {
            "enabled": eve_present,
            "filename": str(filename) if filename else None,
            "filetype": str(filetype) if filetype else None,
            "types": sorted(_multi(eve.get("type"))) if types_set else [],
            "types_set": types_set,
        },
    }
