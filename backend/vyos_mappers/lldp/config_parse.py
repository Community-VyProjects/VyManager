"""Read-model for LLDP config.

Mappers own VyOS tree shape. Routers call parse_config and do not rebuild
the tree. Version keys come from the mapper (MergedMapper), not from
hardcoded 1.4/1.5 branches here.
"""

from typing import Any, Dict, List, Optional


def _empty_legacy() -> Dict[str, bool]:
    return {"cdp": False, "edp": False, "fdp": False, "sonmp": False}


def _parse_management_addresses(lldp_raw: dict) -> List[str]:
    addr_raw = lldp_raw.get("management-address")
    if addr_raw is None:
        return []
    if isinstance(addr_raw, list):
        return sorted(addr_raw)
    if isinstance(addr_raw, dict):
        return sorted(addr_raw.keys())
    return [str(addr_raw)]


def _parse_legacy_protocols(lldp_raw: dict) -> Dict[str, bool]:
    proto_raw = lldp_raw.get("legacy-protocols", {})
    if not proto_raw or not isinstance(proto_raw, dict):
        return _empty_legacy()
    return {
        "cdp": "cdp" in proto_raw,
        "edp": "edp" in proto_raw,
        "fdp": "fdp" in proto_raw,
        "sonmp": "sonmp" in proto_raw,
    }


def _parse_location(loc_raw: Any) -> Optional[Dict[str, Any]]:
    if not loc_raw or not isinstance(loc_raw, dict):
        return None

    coord_raw = loc_raw.get("coordinate-based")
    coord = None
    if coord_raw and isinstance(coord_raw, dict):
        coord = {
            "altitude": coord_raw.get("altitude"),
            "datum": coord_raw.get("datum"),
            "latitude": coord_raw.get("latitude"),
            "longitude": coord_raw.get("longitude"),
        }

    elin_raw = loc_raw.get("elin")
    elin = None
    if elin_raw is not None:
        if isinstance(elin_raw, dict):
            elin = next(iter(elin_raw.keys()), None)
        else:
            elin = str(elin_raw)

    if coord is None and elin is None:
        return None

    return {"coordinate_based": coord, "elin": elin}


def _parse_interface(name: str, cfg: dict) -> Dict[str, Any]:
    # Normalize the disable presence flag and the mode node into one mode.
    if "mode" in cfg:
        mode = cfg["mode"]
    elif "disable" in cfg:
        mode = "disable"
    else:
        mode = "rx-tx"

    return {
        "name": name,
        "mode": mode,
        "disabled": mode == "disable",
        "location": _parse_location(cfg.get("location")),
    }


def _parse_interfaces(lldp_raw: dict) -> List[Dict[str, Any]]:
    ifaces_raw = lldp_raw.get("interface", {})
    if not ifaces_raw or not isinstance(ifaces_raw, dict):
        return []

    interfaces = []
    for iface_name, iface_cfg in ifaces_raw.items():
        if iface_cfg is None:
            iface_cfg = {}
        interfaces.append(_parse_interface(iface_name, iface_cfg))

    interfaces.sort(key=lambda i: i["name"])
    return interfaces


def _empty() -> Dict[str, Any]:
    return {
        "management_addresses": [],
        "snmp_enabled": False,
        "legacy_protocols": _empty_legacy(),
        "interfaces": [],
    }


def parse_config(_mapper, full_config: Dict[str, Any]) -> Dict[str, Any]:
    """Normalise full VyOS config into the GET /vyos/lldp/config payload."""
    lldp_raw = full_config.get("service", {}).get("lldp", {})
    if not lldp_raw:
        return _empty()

    return {
        "management_addresses": _parse_management_addresses(lldp_raw),
        "snmp_enabled": "snmp" in lldp_raw,
        "legacy_protocols": _parse_legacy_protocols(lldp_raw),
        "interfaces": _parse_interfaces(lldp_raw),
    }
