"""Read-model for PIM config.

Mappers own VyOS tree shape. Routers call parse_config and do not rebuild
the tree. PIM parse does not branch on version; both 1.4 and 1.5 use this
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


def _parse_igmp_joins(raw: Any) -> List[Dict[str, Any]]:
    # A bare `igmp join <group>` is listed with no source addresses.
    return [
        {"group": group, "source_addresses": _to_list(_dict(cfg).get("source-address"))}
        for group, cfg in _dict(raw).items()
    ]


def _parse_interface_igmp(iface: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    # A bare `igmp` node turns IGMP on for the interface; it is not unset.
    if not _present(iface, "igmp"):
        return None
    igmp = _dict(iface["igmp"])
    return {
        "disabled": _present(igmp, "disable"),
        "joins": _parse_igmp_joins(igmp.get("join")),
        "query_interval": _safe_int(igmp.get("query-interval")),
        "query_max_response_time": _safe_int(igmp.get("query-max-response-time")),
        "version": _safe_int(igmp.get("version")),
    }


def _parse_interfaces(raw: Any) -> List[Dict[str, Any]]:
    interfaces = []
    for name, cfg in _dict(raw).items():
        iface = _dict(cfg)
        interfaces.append(
            {
                "name": name,
                # A bare `bfd` node turns BFD on with no profile.
                "bfd": _present(iface, "bfd"),
                "bfd_profile": _text(_dict(iface.get("bfd")).get("profile")),
                "dr_priority": _safe_int(iface.get("dr-priority")),
                "hello": _safe_int(iface.get("hello")),
                "no_bsm": _present(iface, "no-bsm"),
                "no_unicast_bsm": _present(iface, "no-unicast-bsm"),
                "passive": _present(iface, "passive"),
                "source_address": _text(iface.get("source-address")),
                "igmp": _parse_interface_igmp(iface),
            }
        )
    return interfaces


def _parse_rp(pim: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    if not _present(pim, "rp"):
        return None
    rp = _dict(pim["rp"])
    return {
        "addresses": [
            {"address": address, "groups": _to_list(_dict(cfg).get("group"))}
            for address, cfg in _dict(rp.get("address")).items()
        ],
        "keep_alive_timer": _safe_int(rp.get("keep-alive-timer")),
    }


def _parse_spt_switchover(pim: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    if not _present(pim, "spt-switchover"):
        return None
    spt = _dict(pim["spt-switchover"])
    return {
        # A bare `infinity-and-beyond` is set with no prefix-list.
        "infinity_and_beyond": _present(spt, "infinity-and-beyond"),
        "prefix_list": _text(_dict(spt.get("infinity-and-beyond")).get("prefix-list")),
    }


def _empty() -> Dict[str, Any]:
    return {
        "configured": False,
        "ecmp": False,
        "ecmp_rebalance": False,
        "igmp_watermark_warning": None,
        "interfaces": [],
        "join_prune_interval": None,
        "keep_alive_timer": None,
        "no_v6_secondary": False,
        "packets": None,
        "register_accept_list_prefix_list": None,
        "register_suppress_time": None,
        "rp": None,
        "spt_switchover": None,
        "ssm_prefix_list": None,
    }


def parse_config(_mapper, full_config: Dict[str, Any]) -> Dict[str, Any]:
    """Normalise full VyOS config into the GET /vyos/pim/config payload."""
    protocols = _dict(_dict(full_config).get("protocols"))
    if "pim" not in protocols:
        return _empty()
    # A bare `protocols pim` node still exists and can be deleted.
    pim = _dict(protocols["pim"])
    ecmp = _present(pim, "ecmp")

    return {
        "configured": True,
        "ecmp": ecmp,
        "ecmp_rebalance": ecmp and _present(_dict(pim["ecmp"]), "rebalance"),
        "igmp_watermark_warning": _safe_int(_dict(pim.get("igmp")).get("watermark-warning")),
        "interfaces": _parse_interfaces(pim.get("interface")),
        "join_prune_interval": _safe_int(pim.get("join-prune-interval")),
        "keep_alive_timer": _safe_int(pim.get("keep-alive-timer")),
        "no_v6_secondary": _present(pim, "no-v6-secondary"),
        "packets": _safe_int(pim.get("packets")),
        "register_accept_list_prefix_list": _text(_dict(pim.get("register-accept-list")).get("prefix-list")),
        "register_suppress_time": _safe_int(pim.get("register-suppress-time")),
        "rp": _parse_rp(pim),
        "spt_switchover": _parse_spt_switchover(pim),
        "ssm_prefix_list": _text(_dict(pim.get("ssm")).get("prefix-list")),
    }
