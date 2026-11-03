"""Read-model for SLA config.

Mappers own VyOS tree shape. Routers call parse_config and do not rebuild
the tree. Version keys come from the mapper (MergedMapper), not from
hardcoded 1.4/1.5 branches here.
"""

from typing import Any, Dict, Optional


def _parse_port(server_raw: dict) -> Optional[int]:
    """Parse an optional port value from a server config dict."""
    port_val = server_raw.get("port")
    if port_val is not None:
        try:
            return int(port_val)
        except (ValueError, TypeError):
            pass  # Unparseable port reads as unset.
    return None


def _disabled_server() -> Dict[str, Any]:
    return {"enabled": False, "port": None}


def _parse_owamp_server(sla_raw: dict) -> Dict[str, Any]:
    owamp_raw = sla_raw.get("owamp-server")
    if owamp_raw is None:
        return _disabled_server()
    if not isinstance(owamp_raw, dict):
        owamp_raw = {}
    return {"enabled": True, "port": _parse_port(owamp_raw)}


def _parse_twamp_server(sla_raw: dict) -> Dict[str, Any]:
    twamp_raw = sla_raw.get("twamp-server")
    if twamp_raw is None:
        return _disabled_server()
    if not isinstance(twamp_raw, dict):
        twamp_raw = {}
    return {"enabled": True, "port": _parse_port(twamp_raw)}


def _empty() -> Dict[str, Any]:
    return {
        "owamp_server": _disabled_server(),
        "twamp_server": _disabled_server(),
    }


def parse_config(_mapper, full_config: Dict[str, Any]) -> Dict[str, Any]:
    """Normalise full VyOS config into the GET /vyos/sla/config payload."""
    sla_raw = full_config.get("service", {}).get("sla", {})
    if not sla_raw:
        return _empty()

    return {
        "owamp_server": _parse_owamp_server(sla_raw),
        "twamp_server": _parse_twamp_server(sla_raw),
    }
