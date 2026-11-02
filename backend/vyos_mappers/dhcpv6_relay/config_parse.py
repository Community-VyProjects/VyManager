"""Read-model for DHCPv6 relay config.

Mappers own VyOS tree shape. Routers call parse_config and do not rebuild
the tree. Version keys come from the mapper (MergedMapper), not from
hardcoded 1.4/1.5 branches here.
"""

import logging
from typing import Any, Dict, List

logger = logging.getLogger(__name__)


def _empty() -> Dict[str, Any]:
    return {
        "disabled": False,
        "max_hop_count": None,
        "use_interface_id_option": False,
        "listen_interfaces": [],
        "upstream_interfaces": [],
    }


def parse_listen_interfaces(raw) -> List[Dict[str, Any]]:
    """Parse listen-interface tagged node into listen-interface dicts."""
    if not raw or not isinstance(raw, dict):
        return []
    result = []
    for iface, iface_data in sorted(raw.items()):
        address = None
        if isinstance(iface_data, dict):
            addr_raw = iface_data.get("address")
            if addr_raw is not None:
                address = str(addr_raw)
        result.append({"interface": iface, "address": address})
    return result


def parse_upstream_interfaces(raw) -> List[Dict[str, Any]]:
    """Parse upstream-interface tagged node into upstream-interface dicts."""
    if not raw or not isinstance(raw, dict):
        return []
    result = []
    for iface, iface_data in sorted(raw.items()):
        addresses: List[str] = []
        if isinstance(iface_data, dict):
            addr_raw = iface_data.get("address")
            if addr_raw is None:
                addresses = []
            elif isinstance(addr_raw, list):
                addresses = sorted(str(a) for a in addr_raw)
            elif isinstance(addr_raw, dict):
                addresses = sorted(addr_raw.keys())
            else:
                addresses = [str(addr_raw)]
        result.append({"interface": iface, "addresses": addresses})
    return result


def parse_config(_mapper, full_config: Dict[str, Any]) -> Dict[str, Any]:
    """Normalise full VyOS config into the GET /vyos/dhcpv6-relay/config payload."""
    relay_raw = full_config.get("service", {}).get("dhcpv6-relay", {})
    if not relay_raw:
        return _empty()

    max_hop_count = None
    raw_hop = relay_raw.get("max-hop-count")
    if raw_hop is not None:
        try:
            max_hop_count = int(raw_hop)
        except (ValueError, TypeError):
            logger.debug("Non-integer max-hop-count value %r; ignoring", raw_hop)

    return {
        "disabled": "disable" in relay_raw,
        "max_hop_count": max_hop_count,
        "use_interface_id_option": "use-interface-id-option" in relay_raw,
        "listen_interfaces": parse_listen_interfaces(
            relay_raw.get("listen-interface", {})
        ),
        "upstream_interfaces": parse_upstream_interfaces(
            relay_raw.get("upstream-interface", {})
        ),
    }
