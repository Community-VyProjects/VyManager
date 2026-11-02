"""Read-model for NTP config.

Mappers own VyOS tree shape. Routers call parse_config and do not rebuild
the tree. Version keys come from the mapper (MergedMapper), not from
hardcoded 1.4/1.5 branches here.
"""

from typing import Any, Dict, List


def _parse_multi_value(raw: Any) -> List[str]:
    """Parse a VyOS multi-value node into a sorted list of strings."""
    if raw is None:
        return []
    if isinstance(raw, list):
        return sorted(str(v) for v in raw)
    if isinstance(raw, dict):
        return sorted(raw.keys())
    return [str(raw)]


def _parse_allow_clients(ntp_raw: dict) -> List[str]:
    allow_raw = ntp_raw.get("allow-client", {})
    if not allow_raw:
        return []
    return _parse_multi_value(allow_raw.get("address"))


def _parse_servers(ntp_raw: dict) -> List[Dict[str, Any]]:
    servers_raw = ntp_raw.get("server", {})
    if not servers_raw or not isinstance(servers_raw, dict):
        return []

    servers = []
    for server_name, server_cfg in servers_raw.items():
        if server_cfg is None:
            server_cfg = {}
        servers.append(
            {
                "name": server_name,
                "noselect": "noselect" in server_cfg,
                "nts": "nts" in server_cfg,
                "pool": "pool" in server_cfg,
                "prefer": "prefer" in server_cfg,
            }
        )

    servers.sort(key=lambda s: s["name"])
    return servers


def _parse_timestamp_interfaces(ntp_raw: dict) -> List[Dict[str, Any]]:
    """Parse service ntp timestamp interface receive-filter when present."""
    timestamp_raw = ntp_raw.get("timestamp", {})
    if not isinstance(timestamp_raw, dict):
        return []
    iface_raw = timestamp_raw.get("interface", {})
    if not isinstance(iface_raw, dict):
        return []

    result = []
    for iface_name, iface_cfg in iface_raw.items():
        if not isinstance(iface_cfg, dict):
            continue
        receive_filter = iface_cfg.get("receive-filter")
        if receive_filter is None:
            continue
        result.append(
            {
                "interface": iface_name,
                "receive_filter": receive_filter,
            }
        )

    result.sort(key=lambda t: t["interface"])
    return result


def _empty() -> Dict[str, Any]:
    return {
        "allow_clients": [],
        "interfaces": [],
        "leap_second": None,
        "listen_addresses": [],
        "servers": [],
        "timestamp_interfaces": [],
        "vrf": None,
    }


def parse_config(_mapper, full_config: Dict[str, Any]) -> Dict[str, Any]:
    """Normalise full VyOS config into the GET /vyos/ntp/config payload."""
    ntp_raw = full_config.get("service", {}).get("ntp", {})
    if not ntp_raw:
        return _empty()

    return {
        "allow_clients": _parse_allow_clients(ntp_raw),
        "interfaces": _parse_multi_value(ntp_raw.get("interface")),
        "leap_second": ntp_raw.get("leap-second"),
        "listen_addresses": _parse_multi_value(ntp_raw.get("listen-address")),
        "servers": _parse_servers(ntp_raw),
        "timestamp_interfaces": _parse_timestamp_interfaces(ntp_raw),
        "vrf": ntp_raw.get("vrf"),
    }
