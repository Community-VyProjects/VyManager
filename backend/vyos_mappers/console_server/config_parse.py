"""Read-model for console-server config.

Mappers own VyOS tree shape. Routers call parse_config and do not rebuild
the tree.
"""

import logging
from typing import Any, Dict, List

logger = logging.getLogger(__name__)


def parse_devices(raw) -> List[Dict[str, Any]]:
    if not raw or not isinstance(raw, dict):
        return []
    devices = []
    for device_name, device_cfg in raw.items():
        if device_cfg is None:
            device_cfg = {}
        ssh_raw = device_cfg.get("ssh")
        ssh = None
        if ssh_raw is not None:
            port = None
            if isinstance(ssh_raw, dict):
                port_raw = ssh_raw.get("port")
                if port_raw is not None:
                    try:
                        port = int(port_raw)
                    except (ValueError, TypeError):
                        logger.debug(
                            "Invalid ssh port '%s' for device '%s'",
                            port_raw,
                            device_name,
                        )
            ssh = {"port": port}
        devices.append(
            {
                "name": device_name,
                "alias": device_cfg.get("alias"),
                "data_bits": device_cfg.get("data-bits"),
                "description": device_cfg.get("description"),
                "parity": device_cfg.get("parity"),
                "speed": device_cfg.get("speed"),
                "ssh": ssh,
                "stop_bits": device_cfg.get("stop-bits"),
            }
        )
    return sorted(devices, key=lambda d: d["name"])


def parse_config(_mapper, full_config: Dict[str, Any]) -> Dict[str, Any]:
    """Normalise full VyOS config into the GET /vyos/console-server/config payload."""
    cs_raw = full_config.get("service", {}).get("console-server", {})
    if not cs_raw:
        return {"devices": []}

    return {"devices": parse_devices(cs_raw.get("device"))}
