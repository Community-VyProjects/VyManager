"""Read-model for conntrack-sync config.

Mappers own VyOS tree shape. Routers call parse_config and do not rebuild
the tree.
"""

import logging
from typing import Any, Dict, List, Optional

logger = logging.getLogger(__name__)


def _parse_multi(value: Any) -> List[str]:
    """Normalize a VyOS multi-value field to a list of strings."""
    if value is None:
        return []
    if isinstance(value, list):
        return value
    if isinstance(value, dict):
        return list(value.keys())
    return [str(value)]


def _parse_int(value: Any) -> Optional[int]:
    if value is None:
        return None
    try:
        return int(value)
    except (ValueError, TypeError):
        return None


def parse_failover(raw: Any) -> Optional[Dict[str, Any]]:
    if not raw:
        return None
    vrrp_raw = raw.get("vrrp")
    if vrrp_raw is None:
        return {"vrrp": None}
    sync_group = vrrp_raw.get("sync-group") if isinstance(vrrp_raw, dict) else None
    return {"vrrp": {"sync_group": sync_group}}


def parse_interfaces(raw: Any) -> List[Dict[str, Any]]:
    if not raw or not isinstance(raw, dict):
        return []
    interfaces = []
    for iface_name, iface_cfg in raw.items():
        if iface_cfg is None:
            iface_cfg = {}
        port_raw = iface_cfg.get("port")
        port = None
        if port_raw is not None:
            try:
                port = int(port_raw)
            except (ValueError, TypeError):
                logger.debug(
                    "Invalid conntrack-sync interface port '%s' for interface '%s'; defaulting to None",
                    port_raw,
                    iface_name,
                )
        interfaces.append(
            {
                "name": iface_name,
                "peer": iface_cfg.get("peer"),
                "port": port,
            }
        )
    return sorted(interfaces, key=lambda i: i["name"])


def _empty() -> Dict[str, Any]:
    return {
        "accept_protocols": [],
        "disable_external_cache": False,
        "disable_syslog": False,
        "event_listen_queue_size": None,
        "expect_sync": [],
        "failover_mechanism": None,
        "ignore_addresses": [],
        "interfaces": [],
        "listen_addresses": [],
        "mcast_group": None,
        "startup_resync": False,
        "sync_queue_size": None,
    }


def parse_config(_mapper, full_config: Dict[str, Any]) -> Dict[str, Any]:
    """Normalise full VyOS config into the GET /vyos/conntrack-sync/config payload."""
    cs_raw = full_config.get("service", {}).get("conntrack-sync", {})
    if not cs_raw:
        return _empty()

    return {
        "accept_protocols": _parse_multi(cs_raw.get("accept-protocol")),
        "disable_external_cache": "disable-external-cache" in cs_raw,
        "disable_syslog": "disable-syslog" in cs_raw,
        "event_listen_queue_size": _parse_int(cs_raw.get("event-listen-queue-size")),
        "expect_sync": _parse_multi(cs_raw.get("expect-sync")),
        "failover_mechanism": parse_failover(cs_raw.get("failover-mechanism")),
        "ignore_addresses": sorted(_parse_multi(cs_raw.get("ignore-address"))),
        "interfaces": parse_interfaces(cs_raw.get("interface")),
        "listen_addresses": sorted(_parse_multi(cs_raw.get("listen-address"))),
        "mcast_group": cs_raw.get("mcast-group"),
        "startup_resync": "startup-resync" in cs_raw,
        "sync_queue_size": _parse_int(cs_raw.get("sync-queue-size")),
    }
