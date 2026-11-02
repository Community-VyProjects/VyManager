"""Read-model for TFTP server config.

Mappers own VyOS tree shape. Routers call parse_config and do not rebuild
the tree. Version keys come from the mapper (MergedMapper), not from
hardcoded 1.4/1.5 branches here.
"""

from typing import Any, Dict, List


def _parse_listen_addresses(tftp_raw: dict) -> List[Dict[str, Any]]:
    listen_raw = tftp_raw.get("listen-address", {})
    if not isinstance(listen_raw, dict):
        return []
    result = []
    for address, cfg in listen_raw.items():
        cfg = cfg or {}
        result.append({"address": address, "vrf": cfg.get("vrf")})
    result.sort(key=lambda a: a["address"])
    return result


def _empty() -> Dict[str, Any]:
    return {
        "directory": None,
        "allow_upload": False,
        "port": None,
        "listen_addresses": [],
    }


def parse_config(_mapper, full_config: Dict[str, Any]) -> Dict[str, Any]:
    """Normalise full VyOS config into the GET /vyos/tftp-server/config payload."""
    tftp_raw = full_config.get("service", {}).get("tftp-server", {})
    if not tftp_raw or not isinstance(tftp_raw, dict):
        return _empty()

    return {
        "directory": tftp_raw.get("directory"),
        "allow_upload": "allow-upload" in tftp_raw,
        "port": tftp_raw.get("port"),
        "listen_addresses": _parse_listen_addresses(tftp_raw),
    }
