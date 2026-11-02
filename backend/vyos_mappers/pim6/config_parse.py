"""Read-model for PIMv6 config.

Mappers own VyOS tree shape. Routers call parse_config and do not rebuild
the tree. No version differences between VyOS 1.4 and 1.5.
"""

from typing import Any, Dict, List, Optional


def _safe_int(value) -> Optional[int]:
    """Convert value to int safely."""
    if value is None:
        return None
    try:
        return int(value)
    except (ValueError, TypeError):
        return None


def _ensure_list(value) -> List[str]:
    """Convert VyOS config value to a list."""
    if value is None:
        return []
    if isinstance(value, list):
        return value
    if isinstance(value, str):
        return [value]
    return []


def _parse_mld_joins(joins_raw) -> List[Dict[str, Any]]:
    """Parse MLD join group configurations."""
    if not joins_raw or not isinstance(joins_raw, dict):
        return []

    joins = []
    for group_addr, join_config in joins_raw.items():
        sources: List[str] = []
        if isinstance(join_config, dict):
            sources = _ensure_list(join_config.get("source"))
        joins.append({"group": group_addr, "sources": sources})
    return joins


def _parse_interfaces(interfaces_raw: dict) -> List[Dict[str, Any]]:
    """Parse PIMv6 interface configurations."""
    if not interfaces_raw or not isinstance(interfaces_raw, dict):
        return []

    interfaces = []
    for iface_name, iface_config in interfaces_raw.items():
        if iface_config is None:
            iface_config = {}
        if not isinstance(iface_config, dict):
            iface_config = {}

        mld_config = iface_config.get("mld")
        mld = None
        if mld_config is not None:
            if not isinstance(mld_config, dict):
                mld_config = {}
            mld = {
                "disabled": "disable" in mld_config,
                "interval": _safe_int(mld_config.get("interval")),
                "last_member_query_count": _safe_int(mld_config.get("last-member-query-count")),
                "last_member_query_interval": _safe_int(
                    mld_config.get("last-member-query-interval")
                ),
                "max_response_time": _safe_int(mld_config.get("max-response-time")),
                "version": _safe_int(mld_config.get("version")),
                "joins": _parse_mld_joins(mld_config.get("join", {})),
            }

        interfaces.append(
            {
                "name": iface_name,
                "dr_priority": _safe_int(iface_config.get("dr-priority")),
                "hello": _safe_int(iface_config.get("hello")),
                "no_bsm": "no-bsm" in iface_config,
                "no_unicast_bsm": "no-unicast-bsm" in iface_config,
                "passive": "passive" in iface_config,
                "mld": mld,
            }
        )

    return interfaces


def _parse_rp(rp_raw) -> Optional[Dict[str, Any]]:
    """Parse RP configuration."""
    if not rp_raw or not isinstance(rp_raw, dict):
        return None

    addresses = []
    address_raw = rp_raw.get("address", {})
    if isinstance(address_raw, dict):
        for addr, addr_config in address_raw.items():
            groups: List[str] = []
            prefix_list6: Optional[str] = None
            if isinstance(addr_config, dict):
                groups = _ensure_list(addr_config.get("group"))
                prefix_list6 = addr_config.get("prefix-list6")
            addresses.append(
                {
                    "address": addr,
                    "groups": groups,
                    "prefix_list6": prefix_list6,
                }
            )

    return {
        "addresses": addresses,
        "keep_alive_timer": _safe_int(rp_raw.get("keep-alive-timer")),
    }


def parse_config(_mapper, full_config: Dict[str, Any]) -> Dict[str, Any]:
    """Normalise full VyOS config into the GET /vyos/pim6/config payload."""
    pim6_config = full_config.get("protocols", {}).get("pim6", {})

    if not pim6_config:
        return {
            "interfaces": [],
            "join_prune_interval": None,
            "keep_alive_timer": None,
            "packets": None,
            "register_suppress_time": None,
            "rp": None,
        }

    return {
        "interfaces": _parse_interfaces(pim6_config.get("interface", {})),
        "join_prune_interval": _safe_int(pim6_config.get("join-prune-interval")),
        "keep_alive_timer": _safe_int(pim6_config.get("keep-alive-timer")),
        "packets": _safe_int(pim6_config.get("packets")),
        "register_suppress_time": _safe_int(pim6_config.get("register-suppress-time")),
        "rp": _parse_rp(pim6_config.get("rp")),
    }
