"""Read-model for SNMP config.

Mappers own VyOS tree shape. Routers call parse_config and do not rebuild
the tree. Version keys come from the mapper (MergedMapper), not from
hardcoded 1.4/1.5 branches here.
"""

from typing import Any, Dict, List, Optional


def _parse_multi_value(raw: Any) -> List[str]:
    """Parse a VyOS multi-value node into a sorted list of strings."""
    if raw is None:
        return []
    if isinstance(raw, list):
        return sorted(str(v) for v in raw)
    if isinstance(raw, dict):
        return sorted(raw.keys())
    return [str(raw)]


def _parse_listen_addresses(snmp_raw: dict) -> List[Dict[str, Any]]:
    listen_raw = snmp_raw.get("listen-address", {})
    if not isinstance(listen_raw, dict):
        return []
    result = []
    for address, cfg in listen_raw.items():
        cfg = cfg or {}
        result.append({"address": address, "port": cfg.get("port")})
    result.sort(key=lambda item: item["address"])
    return result


def _parse_communities(snmp_raw: dict) -> List[Dict[str, Any]]:
    comm_raw = snmp_raw.get("community", {})
    if not isinstance(comm_raw, dict):
        return []
    result = []
    for name, cfg in comm_raw.items():
        cfg = cfg or {}
        result.append(
            {
                "name": name,
                "authorization": cfg.get("authorization"),
                "clients": _parse_multi_value(cfg.get("client")),
                "networks": _parse_multi_value(cfg.get("network")),
            }
        )
    result.sort(key=lambda item: item["name"])
    return result


def _parse_script_extensions(snmp_raw: dict) -> List[Dict[str, Any]]:
    extensions = snmp_raw.get("script-extensions") or {}
    if not isinstance(extensions, dict):
        extensions = {}
    ext_raw = extensions.get("extension-name", {})
    if not isinstance(ext_raw, dict):
        return []
    result = []
    for name, cfg in ext_raw.items():
        cfg = cfg or {}
        result.append({"name": name, "script": cfg.get("script")})
    result.sort(key=lambda item: item["name"])
    return result


def _parse_trap_targets(snmp_raw: dict) -> List[Dict[str, Any]]:
    trap_raw = snmp_raw.get("trap-target", {})
    if not isinstance(trap_raw, dict):
        return []
    result = []
    for address, cfg in trap_raw.items():
        cfg = cfg or {}
        result.append(
            {
                "address": address,
                "community": cfg.get("community"),
                "port": cfg.get("port"),
            }
        )
    result.sort(key=lambda item: item["address"])
    return result


def _parse_auth(cfg: dict) -> Optional[Dict[str, Any]]:
    auth_raw = cfg.get("auth")
    if not isinstance(auth_raw, dict):
        return None
    return {
        "type": auth_raw.get("type"),
        "plaintext_password": auth_raw.get("plaintext-password"),
        "encrypted_password": auth_raw.get("encrypted-password"),
    }


def _parse_privacy(cfg: dict) -> Optional[Dict[str, Any]]:
    priv_raw = cfg.get("privacy")
    if not isinstance(priv_raw, dict):
        return None
    return {
        "type": priv_raw.get("type"),
        "plaintext_password": priv_raw.get("plaintext-password"),
        "encrypted_password": priv_raw.get("encrypted-password"),
    }


def _empty_v3() -> Dict[str, Any]:
    return {
        "engineid": None,
        "groups": [],
        "users": [],
        "views": [],
        "trap_targets": [],
    }


def _parse_v3(v3_raw: Any) -> Dict[str, Any]:
    if not isinstance(v3_raw, dict) or not v3_raw:
        return _empty_v3()

    groups = []
    for name, cfg in (v3_raw.get("group", {}) or {}).items():
        cfg = cfg or {}
        groups.append(
            {
                "name": name,
                "mode": cfg.get("mode"),
                "seclevel": cfg.get("seclevel"),
                "view": cfg.get("view"),
            }
        )
    groups.sort(key=lambda item: item["name"])

    users = []
    for name, cfg in (v3_raw.get("user", {}) or {}).items():
        cfg = cfg or {}
        users.append(
            {
                "name": name,
                "group": cfg.get("group"),
                "mode": cfg.get("mode"),
                "auth": _parse_auth(cfg),
                "privacy": _parse_privacy(cfg),
            }
        )
    users.sort(key=lambda item: item["name"])

    views = []
    for name, cfg in (v3_raw.get("view", {}) or {}).items():
        cfg = cfg or {}
        oids = []
        for oid, oid_cfg in (cfg.get("oid", {}) or {}).items():
            oid_cfg = oid_cfg or {}
            oids.append(
                {
                    "oid": oid,
                    "mask": oid_cfg.get("mask"),
                    "exclude": _parse_multi_value(oid_cfg.get("exclude")),
                }
            )
        oids.sort(key=lambda item: item["oid"])
        views.append({"name": name, "oids": oids})
    views.sort(key=lambda item: item["name"])

    trap_targets = []
    for address, cfg in (v3_raw.get("trap-target", {}) or {}).items():
        cfg = cfg or {}
        trap_targets.append(
            {
                "address": address,
                "user": cfg.get("user"),
                "type": cfg.get("type"),
                "protocol": cfg.get("protocol"),
                "port": cfg.get("port"),
                "auth": _parse_auth(cfg),
                "privacy": _parse_privacy(cfg),
            }
        )
    trap_targets.sort(key=lambda item: item["address"])

    return {
        "engineid": v3_raw.get("engineid"),
        "groups": groups,
        "users": users,
        "views": views,
        "trap_targets": trap_targets,
    }


def _empty() -> Dict[str, Any]:
    return {
        "contact": None,
        "description": None,
        "location": None,
        "protocol": None,
        "trap_source": None,
        "vrf": None,
        "smux_peers": [],
        "oid_enable": [],
        "listen_addresses": [],
        "communities": [],
        "mib_interfaces": [],
        "mib_interface_max": None,
        "script_extensions": [],
        "trap_targets": [],
        "v3": _empty_v3(),
    }


def parse_config(_mapper, full_config: Dict[str, Any]) -> Dict[str, Any]:
    """Normalise full VyOS config into the GET /vyos/snmp/config payload."""
    snmp_raw = (full_config.get("service") or {}).get("snmp")
    if not snmp_raw or not isinstance(snmp_raw, dict):
        return _empty()

    mib_value = snmp_raw.get("mib")
    mib_raw: Dict[str, Any] = mib_value if isinstance(mib_value, dict) else {}
    return {
        "contact": snmp_raw.get("contact"),
        "description": snmp_raw.get("description"),
        "location": snmp_raw.get("location"),
        "protocol": snmp_raw.get("protocol"),
        "trap_source": snmp_raw.get("trap-source"),
        "vrf": snmp_raw.get("vrf"),
        "smux_peers": _parse_multi_value(snmp_raw.get("smux-peer")),
        "oid_enable": _parse_multi_value(snmp_raw.get("oid-enable")),
        "listen_addresses": _parse_listen_addresses(snmp_raw),
        "communities": _parse_communities(snmp_raw),
        "mib_interfaces": _parse_multi_value(mib_raw.get("interface")),
        "mib_interface_max": mib_raw.get("interface-max"),
        "script_extensions": _parse_script_extensions(snmp_raw),
        "trap_targets": _parse_trap_targets(snmp_raw),
        "v3": _parse_v3(snmp_raw.get("v3", {})),
    }
