"""Read-model for DHCP relay config.

Mappers own VyOS tree shape. Routers call parse_config and do not rebuild
the tree. Version keys come from the mapper (MergedMapper), not from
hardcoded 1.4/1.5 branches here.
"""

import logging
from typing import Any, Dict, List

logger = logging.getLogger(__name__)


def _empty_options() -> Dict[str, Any]:
    return {
        "hop_count": None,
        "max_size": None,
        "relay_agents_packets": None,
    }


def _empty() -> Dict[str, Any]:
    return {
        "disabled": False,
        "interfaces": [],
        "listen_interfaces": [],
        "upstream_interfaces": [],
        "servers": [],
        "relay_options": _empty_options(),
    }


def parse_multi(value) -> List[str]:
    """Normalize a VyOS multi-value node to a sorted list of strings."""
    if value is None:
        return []
    if isinstance(value, list):
        return sorted(str(v) for v in value)
    if isinstance(value, dict):
        return sorted(value.keys())
    return [str(value)]


def parse_relay_options(opts) -> Dict[str, Any]:
    """Parse relay-options sub-tree."""
    if not opts:
        return _empty_options()

    hop_count = None
    raw_hop = opts.get("hop-count")
    if raw_hop is not None:
        try:
            hop_count = int(raw_hop)
        except (ValueError, TypeError):
            logger.debug("Non-integer hop-count value %r; ignoring", raw_hop)

    max_size = None
    raw_max = opts.get("max-size")
    if raw_max is not None:
        try:
            max_size = int(raw_max)
        except (ValueError, TypeError):
            logger.debug("Non-integer max-size value %r; ignoring", raw_max)

    return {
        "hop_count": hop_count,
        "max_size": max_size,
        "relay_agents_packets": opts.get("relay-agents-packets"),
    }


def parse_config(_mapper, full_config: Dict[str, Any]) -> Dict[str, Any]:
    """Normalise full VyOS config into the GET /vyos/dhcp-relay/config payload."""
    relay_raw = full_config.get("service", {}).get("dhcp-relay", {})
    if not relay_raw:
        return _empty()

    return {
        "disabled": "disable" in relay_raw,
        "interfaces": parse_multi(relay_raw.get("interface")),
        "listen_interfaces": parse_multi(relay_raw.get("listen-interface")),
        "upstream_interfaces": parse_multi(relay_raw.get("upstream-interface")),
        "servers": parse_multi(relay_raw.get("server")),
        "relay_options": parse_relay_options(relay_raw.get("relay-options", {})),
    }
