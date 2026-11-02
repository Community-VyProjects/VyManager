"""Read-model for Babel config.

Mappers own VyOS tree shape. Routers call parse_config and do not rebuild
the tree.
"""

from typing import Any, Dict, List, Optional


def _empty_filter() -> Dict[str, Optional[str]]:
    return {
        "access_list_in": None,
        "access_list_out": None,
        "prefix_list_in": None,
        "prefix_list_out": None,
    }


def _empty_parameters() -> Dict[str, Any]:
    return {
        "diversity": False,
        "diversity_factor": None,
        "resend_delay": None,
        "smoothing_half_life": None,
    }


def _empty_redistribute() -> Dict[str, List[str]]:
    return {"ipv4": [], "ipv6": []}


def _empty_distribute_list() -> Dict[str, Any]:
    return {
        "ipv4": _empty_filter(),
        "ipv6": _empty_filter(),
        "ipv4_interfaces": [],
        "ipv6_interfaces": [],
    }


def _empty() -> Dict[str, Any]:
    return {
        "interfaces": [],
        "parameters": _empty_parameters(),
        "redistribute": _empty_redistribute(),
        "distribute_list": _empty_distribute_list(),
    }


def parse_interfaces(interfaces_raw: dict) -> List[Dict[str, Any]]:
    """Parse Babel interface configuration."""
    interfaces = []

    for iface_name, iface_config in interfaces_raw.items():
        if iface_config is None:
            iface_config = {}

        interfaces.append(
            {
                "name": iface_name,
                "type": iface_config.get("type"),
                "channel": iface_config.get("channel"),
                "hello_interval": int(iface_config["hello-interval"]) if iface_config.get("hello-interval") else None,
                "update_interval": int(iface_config["update-interval"]) if iface_config.get("update-interval") else None,
                "rxcost": int(iface_config["rxcost"]) if iface_config.get("rxcost") else None,
                "split_horizon": iface_config.get("split-horizon"),
                "enable_timestamps": "enable-timestamps" in iface_config,
                "max_rtt_penalty": int(iface_config["max-rtt-penalty"]) if iface_config.get("max-rtt-penalty") else None,
                "rtt_decay": int(iface_config["rtt-decay"]) if iface_config.get("rtt-decay") else None,
                "rtt_min": int(iface_config["rtt-min"]) if iface_config.get("rtt-min") else None,
                "rtt_max": int(iface_config["rtt-max"]) if iface_config.get("rtt-max") else None,
            }
        )

    return interfaces


def parse_parameters(params_raw: dict) -> Dict[str, Any]:
    """Parse Babel global parameters."""
    if not params_raw:
        return _empty_parameters()

    return {
        "diversity": "diversity" in params_raw,
        "diversity_factor": int(params_raw["diversity-factor"]) if params_raw.get("diversity-factor") else None,
        "resend_delay": int(params_raw["resend-delay"]) if params_raw.get("resend-delay") else None,
        "smoothing_half_life": int(params_raw["smoothing-half-life"]) if params_raw.get("smoothing-half-life") else None,
    }


def parse_redistribute(redistribute_raw: dict) -> Dict[str, List[str]]:
    """Parse Babel redistribution settings."""
    if not redistribute_raw:
        return _empty_redistribute()

    ipv4_protocols = list(redistribute_raw.get("ipv4", {}).keys())
    ipv6_protocols = list(redistribute_raw.get("ipv6", {}).keys())

    return {
        "ipv4": ipv4_protocols,
        "ipv6": ipv6_protocols,
    }


def _parse_global_filter(af_raw: dict) -> Dict[str, Optional[str]]:
    """Parse global (non-interface) distribute-list filter."""
    if not af_raw:
        return _empty_filter()

    acl_raw = af_raw.get("access-list", {})
    pfx_raw = af_raw.get("prefix-list", {})

    return {
        "access_list_in": acl_raw.get("in") if isinstance(acl_raw, dict) else None,
        "access_list_out": acl_raw.get("out") if isinstance(acl_raw, dict) else None,
        "prefix_list_in": pfx_raw.get("in") if isinstance(pfx_raw, dict) else None,
        "prefix_list_out": pfx_raw.get("out") if isinstance(pfx_raw, dict) else None,
    }


def _parse_interface_filters(iface_raw: dict) -> List[Dict[str, Any]]:
    """Parse per-interface distribute-list filters."""
    filters = []

    if not iface_raw:
        return filters

    for iface_name, iface_config in iface_raw.items():
        if iface_config is None:
            iface_config = {}

        acl_raw = iface_config.get("access-list", {})
        pfx_raw = iface_config.get("prefix-list", {})

        if not acl_raw:
            acl_raw = {}
        if not pfx_raw:
            pfx_raw = {}

        filters.append(
            {
                "interface": iface_name,
                "access_list_in": acl_raw.get("in") if isinstance(acl_raw, dict) else None,
                "access_list_out": acl_raw.get("out") if isinstance(acl_raw, dict) else None,
                "prefix_list_in": pfx_raw.get("in") if isinstance(pfx_raw, dict) else None,
                "prefix_list_out": pfx_raw.get("out") if isinstance(pfx_raw, dict) else None,
            }
        )

    return filters


def parse_distribute_list(dist_list_raw: dict) -> Dict[str, Any]:
    """Parse Babel distribute list configuration."""
    if not dist_list_raw:
        return _empty_distribute_list()

    ipv4_raw = dist_list_raw.get("ipv4", {})
    ipv6_raw = dist_list_raw.get("ipv6", {})

    return {
        "ipv4": _parse_global_filter(ipv4_raw),
        "ipv6": _parse_global_filter(ipv6_raw),
        "ipv4_interfaces": _parse_interface_filters(ipv4_raw.get("interface", {})),
        "ipv6_interfaces": _parse_interface_filters(ipv6_raw.get("interface", {})),
    }


def parse_config(_mapper, full_config: Dict[str, Any]) -> Dict[str, Any]:
    """Normalise full VyOS config into the GET /vyos/babel/config payload."""
    babel_config = full_config.get("protocols", {}).get("babel", {})
    if not babel_config:
        return _empty()

    return {
        "interfaces": parse_interfaces(babel_config.get("interface", {})),
        "parameters": parse_parameters(babel_config.get("parameters", {})),
        "redistribute": parse_redistribute(babel_config.get("redistribute", {})),
        "distribute_list": parse_distribute_list(babel_config.get("distribute-list", {})),
    }
