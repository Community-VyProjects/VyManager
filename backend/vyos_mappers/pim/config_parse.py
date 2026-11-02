"""Read-model for PIM config.

Mappers own VyOS tree shape. Routers call parse_config and do not rebuild
the tree. No version differences between VyOS 1.4 and 1.5.
"""

from typing import Any, Dict, List, Optional


def _deep_get(data: Any, *keys: str):
    """Safely traverse nested dicts."""
    for key in keys:
        if not isinstance(data, dict):
            return None
        data = data.get(key)
        if data is None:
            return None
    return data


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


def _has_nested(data: dict, *keys: str) -> bool:
    """Check if nested key path exists (for flag-style nodes like ecmp.rebalance)."""
    for key in keys:
        if not isinstance(data, dict):
            return False
        val = data.get(key)
        if val is None and key not in data:
            return False
        data = val if val is not None else {}
    return True


def _parse_igmp_joins(joins_raw: dict) -> List[Dict[str, Any]]:
    """Parse IGMP join group configurations."""
    if not joins_raw or not isinstance(joins_raw, dict):
        return []

    joins = []
    for group_addr, join_config in joins_raw.items():
        if join_config is None:
            join_config = {}
        joins.append(
            {
                "group": group_addr,
                "source_addresses": _ensure_list(
                    join_config.get("source-address") if isinstance(join_config, dict) else None
                ),
            }
        )
    return joins


def _parse_interfaces(interfaces_raw: dict) -> List[Dict[str, Any]]:
    """Parse PIM interface configurations."""
    if not interfaces_raw:
        return []

    interfaces = []
    for iface_name, iface_config in interfaces_raw.items():
        if iface_config is None:
            iface_config = {}

        igmp_config = iface_config.get("igmp")
        igmp = None
        if igmp_config is not None:
            if not isinstance(igmp_config, dict):
                igmp_config = {}
            igmp = {
                "disabled": "disable" in igmp_config,
                "joins": _parse_igmp_joins(igmp_config.get("join", {})),
                "query_interval": _safe_int(igmp_config.get("query-interval")),
                "query_max_response_time": _safe_int(igmp_config.get("query-max-response-time")),
                "version": _safe_int(igmp_config.get("version")),
            }

        bfd_config = iface_config.get("bfd")
        has_bfd = bfd_config is not None
        bfd_profile = None
        if isinstance(bfd_config, dict):
            bfd_profile = bfd_config.get("profile")

        interfaces.append(
            {
                "name": iface_name,
                "bfd": has_bfd,
                "bfd_profile": bfd_profile,
                "dr_priority": _safe_int(iface_config.get("dr-priority")),
                "hello": _safe_int(iface_config.get("hello")),
                "no_bsm": "no-bsm" in iface_config,
                "no_unicast_bsm": "no-unicast-bsm" in iface_config,
                "passive": "passive" in iface_config,
                "source_address": iface_config.get("source-address"),
                "igmp": igmp,
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
            if addr_config is None:
                addr_config = {}
            addresses.append(
                {
                    "address": addr,
                    "groups": _ensure_list(
                        addr_config.get("group") if isinstance(addr_config, dict) else None
                    ),
                }
            )

    return {
        "addresses": addresses,
        "keep_alive_timer": _safe_int(rp_raw.get("keep-alive-timer")),
    }


def _parse_spt_switchover(spt_raw) -> Optional[Dict[str, Any]]:
    """Parse SPT switchover configuration."""
    if not spt_raw or not isinstance(spt_raw, dict):
        return None

    infinity_config = spt_raw.get("infinity-and-beyond")
    has_infinity = infinity_config is not None or "infinity-and-beyond" in spt_raw
    prefix_list = None
    if isinstance(infinity_config, dict):
        prefix_list = infinity_config.get("prefix-list")

    return {
        "infinity_and_beyond": has_infinity,
        "prefix_list": prefix_list,
    }


def _empty_config() -> Dict[str, Any]:
    return {
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
    pim_config = full_config.get("protocols", {}).get("pim", {})

    if not pim_config:
        return _empty_config()

    return {
        "ecmp": "ecmp" in pim_config
        and (
            pim_config["ecmp"] is None
            or isinstance(pim_config.get("ecmp"), dict)
            or pim_config.get("ecmp") == {}
        ),
        "ecmp_rebalance": _has_nested(pim_config, "ecmp", "rebalance"),
        "igmp_watermark_warning": _safe_int(_deep_get(pim_config, "igmp", "watermark-warning")),
        "interfaces": _parse_interfaces(pim_config.get("interface", {})),
        "join_prune_interval": _safe_int(pim_config.get("join-prune-interval")),
        "keep_alive_timer": _safe_int(pim_config.get("keep-alive-timer")),
        "no_v6_secondary": "no-v6-secondary" in pim_config,
        "packets": _safe_int(pim_config.get("packets")),
        "register_accept_list_prefix_list": _deep_get(
            pim_config, "register-accept-list", "prefix-list"
        ),
        "register_suppress_time": _safe_int(pim_config.get("register-suppress-time")),
        "rp": _parse_rp(pim_config.get("rp")),
        "spt_switchover": _parse_spt_switchover(pim_config.get("spt-switchover")),
        "ssm_prefix_list": _deep_get(pim_config, "ssm", "prefix-list"),
    }
