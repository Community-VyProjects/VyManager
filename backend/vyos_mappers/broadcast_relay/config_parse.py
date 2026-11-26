"""Read-model for broadcast-relay config.

Mappers own VyOS tree shape. Routers call parse_config and do not rebuild
the tree.
"""

import logging
from typing import Any, Dict, List

logger = logging.getLogger(__name__)


def _empty() -> Dict[str, Any]:
    return {
        "configured": False,
        "globally_disabled": False,
        "instances": [],
    }


def parse_instance(relay_id: str, cfg: dict) -> Dict[str, Any]:
    """Parse a single broadcast relay instance from raw VyOS config."""
    interfaces_raw = cfg.get("interface")
    if interfaces_raw is None:
        interfaces: List[Any] = []
    elif isinstance(interfaces_raw, list):
        interfaces = interfaces_raw
    elif isinstance(interfaces_raw, dict):
        interfaces = list(interfaces_raw.keys())
    else:
        interfaces = [str(interfaces_raw)]

    port_raw = cfg.get("port")
    port = None
    if port_raw is not None:
        try:
            port = int(port_raw)
        except (ValueError, TypeError):
            logger.debug(
                "Instance %s has non-integer port value %r; leaving port unset",
                relay_id,
                port_raw,
            )

    return {
        "id": relay_id,
        "address": cfg.get("address"),
        "description": cfg.get("description"),
        "disabled": "disable" in cfg,
        "interfaces": sorted(interfaces),
        "port": port,
    }


def parse_config(_mapper, full_config: Dict[str, Any]) -> Dict[str, Any]:
    """Normalise full VyOS config into the GET /vyos/broadcast-relay/config payload.

    ``configured`` is key membership: a bare ``service broadcast-relay`` commits
    on both labs and stays after its last instance is deleted, parsing as ``{}``.
    """
    service = full_config.get("service") or {}
    if "broadcast-relay" not in service:
        return _empty()
    br_raw = service["broadcast-relay"] or {}

    globally_disabled = "disable" in br_raw

    instances_raw = br_raw.get("id", {})
    instances = []
    if instances_raw and isinstance(instances_raw, dict):
        for relay_id, inst_cfg in instances_raw.items():
            if inst_cfg is None:
                inst_cfg = {}
            instances.append(parse_instance(relay_id, inst_cfg))

    instances.sort(key=lambda i: int(i["id"]))

    return {
        "configured": True,
        "globally_disabled": globally_disabled,
        "instances": instances,
    }
