"""Read-model for PIMv6 config.

Mappers own VyOS tree shape. Routers call parse_config and do not rebuild
the tree. PIMv6 parse does not branch on version; both 1.4 and 1.5 use this
tree. Valueless nodes are read by key membership: a bare node parses as {}
(or None), which is falsy but present.
"""

from typing import Any, Dict, List, Optional


def _dict(value: Any) -> Dict[str, Any]:
    return value if isinstance(value, dict) else {}


def _present(node: Dict[str, Any], key: str) -> bool:
    """A valueless node: present as {} or None. A string value is not the node."""
    return key in node and (node[key] is None or isinstance(node[key], dict))


def _safe_int(value: Any) -> Optional[int]:
    if value is None:
        return None
    try:
        return int(value)
    except (ValueError, TypeError):
        return None


def _text(value: Any) -> Optional[str]:
    return value if isinstance(value, str) and value else None


def _to_list(value: Any) -> List[str]:
    if value is None:
        return []
    if isinstance(value, list):
        return [v for v in value if isinstance(v, str)]
    if isinstance(value, str):
        return [value]
    return []


def _parse_mld_joins(raw: Any) -> List[Dict[str, Any]]:
    # A bare `mld join <group>` is listed with no sources.
    return [
        {"group": group, "sources": _to_list(_dict(cfg).get("source"))}
        for group, cfg in _dict(raw).items()
    ]


def _parse_interface_mld(iface: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    # A bare `mld` node turns MLD on for the interface; it is not unset.
    if not _present(iface, "mld"):
        return None
    mld = _dict(iface["mld"])
    return {
        "disabled": _present(mld, "disable"),
        "interval": _safe_int(mld.get("interval")),
        "last_member_query_count": _safe_int(mld.get("last-member-query-count")),
        "last_member_query_interval": _safe_int(mld.get("last-member-query-interval")),
        "max_response_time": _safe_int(mld.get("max-response-time")),
        "version": _safe_int(mld.get("version")),
        "joins": _parse_mld_joins(mld.get("join")),
    }


def _parse_interfaces(raw: Any) -> List[Dict[str, Any]]:
    interfaces = []
    for name, cfg in _dict(raw).items():
        iface = _dict(cfg)
        interfaces.append(
            {
                "name": name,
                "dr_priority": _safe_int(iface.get("dr-priority")),
                "hello": _safe_int(iface.get("hello")),
                "no_bsm": _present(iface, "no-bsm"),
                "no_unicast_bsm": _present(iface, "no-unicast-bsm"),
                "passive": _present(iface, "passive"),
                "mld": _parse_interface_mld(iface),
            }
        )
    return interfaces


def _parse_rp(pim6: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    if not _present(pim6, "rp"):
        return None
    rp = _dict(pim6["rp"])
    return {
        "addresses": [
            {
                "address": address,
                "groups": _to_list(_dict(cfg).get("group")),
                "prefix_list6": _text(_dict(cfg).get("prefix-list6")),
            }
            for address, cfg in _dict(rp.get("address")).items()
        ],
        "keep_alive_timer": _safe_int(rp.get("keep-alive-timer")),
    }


def _empty() -> Dict[str, Any]:
    return {
        "configured": False,
        "interfaces": [],
        "join_prune_interval": None,
        "keep_alive_timer": None,
        "packets": None,
        "register_suppress_time": None,
        "rp": None,
    }


def parse_config(_mapper, full_config: Dict[str, Any]) -> Dict[str, Any]:
    """Normalise full VyOS config into the GET /vyos/pim6/config payload."""
    protocols = _dict(_dict(full_config).get("protocols"))
    if "pim6" not in protocols:
        return _empty()
    # A bare `protocols pim6` node still exists and can be deleted.
    pim6 = _dict(protocols["pim6"])

    return {
        "configured": True,
        "interfaces": _parse_interfaces(pim6.get("interface")),
        "join_prune_interval": _safe_int(pim6.get("join-prune-interval")),
        "keep_alive_timer": _safe_int(pim6.get("keep-alive-timer")),
        "packets": _safe_int(pim6.get("packets")),
        "register_suppress_time": _safe_int(pim6.get("register-suppress-time")),
        "rp": _parse_rp(pim6),
    }
