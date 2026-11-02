"""Read-model for MPLS config.

Mappers own VyOS tree shape. Routers call parse_config and do not rebuild
the tree. Empty protocols.mpls is not enabled.
"""

from typing import Any, Dict, List, Optional


def _safe_int(val) -> Optional[int]:
    if val is None:
        return None
    try:
        return int(val)
    except (ValueError, TypeError):
        return None


def _to_list(val) -> List[str]:
    if val is None:
        return []
    if isinstance(val, list):
        return val
    if isinstance(val, dict):
        return list(val.keys())
    return [str(val)]


def parse_global_interfaces(raw: dict) -> List[str]:
    """Parse the multi-value 'interface' leaf under protocols/mpls."""
    iface_raw = raw.get("interface", {})
    if isinstance(iface_raw, dict):
        return sorted(iface_raw.keys())
    return sorted(_to_list(iface_raw))


def parse_parameters(raw: dict) -> Dict[str, Any]:
    if not raw:
        return {"maximum_ttl": None, "no_propagate_ttl": False}
    return {
        "maximum_ttl": _safe_int(raw.get("maximum-ttl")),
        "no_propagate_ttl": "no-propagate-ttl" in raw,
    }


def parse_ldp_interfaces(raw: dict) -> List[Dict[str, Any]]:
    """Parse LDP interfaces (tag node with optional disable-establish-hello)."""
    if not raw:
        return []
    interfaces = []
    for iface_name, cfg in raw.items():
        if cfg is None:
            cfg = {}
        interfaces.append(
            {
                "name": iface_name,
                "disable_establish_hello": "disable-establish-hello" in cfg,
            }
        )
    return sorted(interfaces, key=lambda x: x["name"])


def parse_ldp_neighbors(raw: dict) -> List[Dict[str, Any]]:
    """Parse LDP neighbors (tag node keyed by IPv4 address)."""
    if not raw:
        return []
    neighbors = []
    for addr, cfg in raw.items():
        if cfg is None:
            cfg = {}
        neighbors.append(
            {
                "address": addr,
                "password": cfg.get("password"),
                "session_holdtime": _safe_int(cfg.get("session-holdtime")),
                "ttl_security": (
                    str(cfg.get("ttl-security"))
                    if cfg.get("ttl-security") is not None
                    else None
                ),
            }
        )
    return sorted(neighbors, key=lambda x: x["address"])


def parse_ldp_discovery(raw: dict) -> Dict[str, Any]:
    if not raw:
        return {
            "hello_ipv4_holdtime": None,
            "hello_ipv4_interval": None,
            "hello_ipv6_holdtime": None,
            "hello_ipv6_interval": None,
            "session_ipv4_holdtime": None,
            "session_ipv6_holdtime": None,
            "transport_ipv4_address": None,
            "transport_ipv6_address": None,
        }
    return {
        "hello_ipv4_holdtime": _safe_int(raw.get("hello-ipv4-holdtime")),
        "hello_ipv4_interval": _safe_int(raw.get("hello-ipv4-interval")),
        "hello_ipv6_holdtime": _safe_int(raw.get("hello-ipv6-holdtime")),
        "hello_ipv6_interval": _safe_int(raw.get("hello-ipv6-interval")),
        "session_ipv4_holdtime": _safe_int(raw.get("session-ipv4-holdtime")),
        "session_ipv6_holdtime": _safe_int(raw.get("session-ipv6-holdtime")),
        "transport_ipv4_address": raw.get("transport-ipv4-address"),
        "transport_ipv6_address": raw.get("transport-ipv6-address"),
    }


def parse_ldp_allocation(raw: dict) -> Dict[str, Any]:
    if not raw:
        return {"ipv4_access_list": None, "ipv6_access_list": None}
    ipv4_raw = raw.get("ipv4", {}) or {}
    ipv6_raw = raw.get("ipv6", {}) or {}
    return {
        "ipv4_access_list": ipv4_raw.get("access-list"),
        "ipv6_access_list": ipv6_raw.get("access-list6"),
    }


def parse_ldp_export_filter(raw: dict, acl_key: str, neighbor_key: str) -> Dict[str, Any]:
    ef_raw = raw.get("export-filter", {}) or {}
    return {
        "filter_access_list": ef_raw.get(acl_key),
        "neighbor_access_list": ef_raw.get(neighbor_key),
    }


def parse_ldp_export(raw: dict) -> Dict[str, Any]:
    if not raw:
        return {
            "ipv4_explicit_null": False,
            "ipv4_export_filter": {
                "filter_access_list": None,
                "neighbor_access_list": None,
            },
            "ipv6_explicit_null": False,
            "ipv6_export_filter": {
                "filter_access_list": None,
                "neighbor_access_list": None,
            },
        }
    ipv4_raw = raw.get("ipv4", {}) or {}
    ipv6_raw = raw.get("ipv6", {}) or {}
    return {
        "ipv4_explicit_null": "explicit-null" in ipv4_raw,
        "ipv4_export_filter": parse_ldp_export_filter(
            ipv4_raw, "filter-access-list", "neighbor-access-list"
        ),
        "ipv6_explicit_null": "explicit-null" in ipv6_raw,
        "ipv6_export_filter": parse_ldp_export_filter(
            ipv6_raw, "filter-access-list6", "neighbor-access-list6"
        ),
    }


def parse_ldp_import_filter(raw: dict, acl_key: str, neighbor_key: str) -> Dict[str, Any]:
    if_raw = raw.get("import-filter", {}) or {}
    return {
        "filter_access_list": if_raw.get(acl_key),
        "neighbor_access_list": if_raw.get(neighbor_key),
    }


def parse_ldp_import(raw: dict) -> Dict[str, Any]:
    if not raw:
        return {
            "ipv4_import_filter": {
                "filter_access_list": None,
                "neighbor_access_list": None,
            },
            "ipv6_import_filter": {
                "filter_access_list": None,
                "neighbor_access_list": None,
            },
        }
    ipv4_raw = raw.get("ipv4", {}) or {}
    ipv6_raw = raw.get("ipv6", {}) or {}
    return {
        "ipv4_import_filter": parse_ldp_import_filter(
            ipv4_raw, "filter-access-list", "neighbor-access-list"
        ),
        "ipv6_import_filter": parse_ldp_import_filter(
            ipv6_raw, "filter-access-list6", "neighbor-access-list6"
        ),
    }


def _targeted_addresses(raw: dict) -> List[str]:
    addr_raw = raw.get("address", {})
    addresses = list(addr_raw.keys()) if isinstance(addr_raw, dict) else _to_list(addr_raw)
    return sorted(addresses)


def parse_ldp_targeted_ipv4(raw: dict) -> Dict[str, Any]:
    if not raw:
        return {
            "enable": False,
            "addresses": [],
            "hello_holdtime": None,
            "hello_interval": None,
        }
    return {
        "enable": "enable" in raw,
        "addresses": _targeted_addresses(raw),
        "hello_holdtime": _safe_int(raw.get("hello-holdtime")),
        "hello_interval": _safe_int(raw.get("hello-interval")),
    }


def parse_ldp_targeted_ipv6(raw: dict) -> Dict[str, Any]:
    if not raw:
        return {
            "enable": False,
            "addresses": [],
            "hello_holdtime": None,
            "hello_interval": None,
        }
    return {
        "enable": "enable" in raw,
        "addresses": _targeted_addresses(raw),
        "hello_holdtime": _safe_int(raw.get("hello-holdtime")),
        "hello_interval": _safe_int(raw.get("hello-interval")),
    }


def parse_ldp_parameters(raw: dict) -> Dict[str, Any]:
    if not raw:
        return {
            "cisco_interop_tlv": False,
            "ordered_control": False,
            "transport_prefer_ipv4": False,
        }
    return {
        "cisco_interop_tlv": "cisco-interop-tlv" in raw,
        "ordered_control": "ordered-control" in raw,
        "transport_prefer_ipv4": "transport-prefer-ipv4" in raw,
    }


def parse_ldp(raw: dict) -> Dict[str, Any]:
    if not raw:
        return {
            "router_id": None,
            "interfaces": [],
            "neighbors": [],
            "discovery": parse_ldp_discovery({}),
            "allocation": parse_ldp_allocation({}),
            "export": parse_ldp_export({}),
            "ldp_import": parse_ldp_import({}),
            "targeted_neighbor_ipv4": parse_ldp_targeted_ipv4({}),
            "targeted_neighbor_ipv6": parse_ldp_targeted_ipv6({}),
            "parameters": parse_ldp_parameters({}),
        }
    return {
        "router_id": raw.get("router-id"),
        "interfaces": parse_ldp_interfaces(raw.get("interface", {})),
        "neighbors": parse_ldp_neighbors(raw.get("neighbor", {})),
        "discovery": parse_ldp_discovery(raw.get("discovery", {}) or {}),
        "allocation": parse_ldp_allocation(raw.get("allocation", {}) or {}),
        "export": parse_ldp_export(raw.get("export", {}) or {}),
        "ldp_import": parse_ldp_import(raw.get("import", {}) or {}),
        "targeted_neighbor_ipv4": parse_ldp_targeted_ipv4(
            (raw.get("targeted-neighbor", {}) or {}).get("ipv4", {}) or {}
        ),
        "targeted_neighbor_ipv6": parse_ldp_targeted_ipv6(
            (raw.get("targeted-neighbor", {}) or {}).get("ipv6", {}) or {}
        ),
        "parameters": parse_ldp_parameters(raw.get("parameters", {}) or {}),
    }


def _empty_mpls() -> Dict[str, Any]:
    return {
        "enabled": False,
        "interfaces": [],
        "parameters": parse_parameters({}),
        "ldp": None,
    }


def parse_config(_mapper, full_config: Dict[str, Any]) -> Dict[str, Any]:
    """Normalise full VyOS config into the GET /vyos/mpls/config payload."""
    mpls_raw = full_config.get("protocols", {}).get("mpls", {})
    if not mpls_raw:
        return _empty_mpls()
    return {
        "enabled": True,
        "interfaces": parse_global_interfaces(mpls_raw),
        "parameters": parse_parameters(mpls_raw.get("parameters", {}) or {}),
        "ldp": parse_ldp(mpls_raw.get("ldp", {})) if mpls_raw.get("ldp") else None,
    }
