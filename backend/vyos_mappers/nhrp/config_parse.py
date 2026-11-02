"""Read-model for NHRP config.

Mappers own VyOS tree shape. Routers call parse_config and do not rebuild
the tree. Version keys come from the mapper (MergedMapper).
"""

from typing import Any, Dict, List


def _is_1_4(mapper) -> bool:
    return "1.4" in mapper.version


def _to_list(val) -> List[str]:
    """Normalize a value to a list of strings."""
    if val is None:
        return []
    if isinstance(val, list):
        return val
    if isinstance(val, dict):
        return list(val.keys())
    return [str(val)]


def parse_config(mapper, full_config: Dict[str, Any]) -> Dict[str, Any]:
    """Normalise full VyOS config into the GET /vyos/nhrp/config payload."""
    nhrp_raw = full_config.get("protocols", {}).get("nhrp", {})
    if not nhrp_raw:
        return {"enabled": False, "tunnels": []}

    tunnels_raw = nhrp_raw.get("tunnel", {})
    if not tunnels_raw:
        return {"enabled": True, "tunnels": []}

    is_1_4 = _is_1_4(mapper)
    tunnels = []
    for tun_name, tun_cfg in tunnels_raw.items():
        if tun_cfg is None:
            tun_cfg = {}
        tunnels.append(_parse_tunnel(tun_name, tun_cfg, is_1_4))

    return {
        "enabled": True,
        "tunnels": sorted(tunnels, key=lambda t: t["name"]),
    }


def _parse_tunnel(name: str, cfg: dict, is_1_4: bool) -> Dict[str, Any]:
    """Parse a single NHRP tunnel configuration."""
    if is_1_4:
        auth = cfg.get("cisco-authentication")
    else:
        auth = cfg.get("authentication")

    if is_1_4:
        ht = cfg.get("holding-time")
    else:
        ht = cfg.get("holdtime")

    if is_1_4:
        maps = _parse_maps_v1_4(cfg.get("map", {}))
        dynamic_maps = _parse_dynamic_maps(cfg.get("dynamic-map", {}))
        nhs_entries: List[Dict[str, Any]] = []
    else:
        maps = _parse_maps_v1_5(cfg.get("map", {}))
        dynamic_maps = []
        nhs_entries = _parse_nhs(cfg.get("nhs", {}))

    mtu = None
    network_id = None
    registration_no_unique = False
    if not is_1_4:
        mtu_raw = cfg.get("mtu")
        mtu = str(mtu_raw) if mtu_raw is not None else None
        nid = cfg.get("network-id")
        network_id = str(nid) if nid is not None else None
        registration_no_unique = "registration-no-unique" in cfg

    non_caching = False
    shortcut_destination = False
    shortcut_targets: List[Dict[str, Any]] = []
    if is_1_4:
        non_caching = "non-caching" in cfg
        shortcut_destination = "shortcut-destination" in cfg
        shortcut_targets = _parse_shortcut_targets(cfg.get("shortcut-target", {}))

    return {
        "name": name,
        "authentication": str(auth) if auth is not None else None,
        "holding_time": str(ht) if ht is not None else None,
        "maps": maps,
        "dynamic_maps": dynamic_maps,
        "nhs_entries": nhs_entries,
        "multicast": _to_list(cfg.get("multicast")),
        "mtu": mtu,
        "network_id": network_id,
        "redirect": "redirect" in cfg,
        "registration_no_unique": registration_no_unique,
        "shortcut": "shortcut" in cfg,
        "non_caching": non_caching,
        "shortcut_destination": shortcut_destination,
        "shortcut_targets": shortcut_targets,
    }


def _parse_maps_v1_4(raw: dict) -> List[Dict[str, Any]]:
    """Parse VyOS 1.4 map entries: map {ip} nbma-address/cisco/register."""
    if not raw or not isinstance(raw, dict):
        return []
    maps = []
    for tunnel_ip, map_cfg in raw.items():
        if map_cfg is None:
            map_cfg = {}
        maps.append(
            {
                "tunnel_ip": tunnel_ip,
                "nbma_address": map_cfg.get("nbma-address") if isinstance(map_cfg, dict) else None,
                "cisco": "cisco" in map_cfg if isinstance(map_cfg, dict) else False,
                "register_flag": "register" in map_cfg if isinstance(map_cfg, dict) else False,
            }
        )
    return sorted(maps, key=lambda m: m["tunnel_ip"])


def _parse_maps_v1_5(raw: dict) -> List[Dict[str, Any]]:
    """Parse VyOS 1.5 map entries: map tunnel-ip {ip} nbma {ip|local}."""
    if not raw or not isinstance(raw, dict):
        return []
    tunnel_ip_raw = raw.get("tunnel-ip", {})
    if not tunnel_ip_raw or not isinstance(tunnel_ip_raw, dict):
        return []
    maps = []
    for tunnel_ip, map_cfg in tunnel_ip_raw.items():
        if map_cfg is None:
            map_cfg = {}
        maps.append(
            {
                "tunnel_ip": tunnel_ip,
                "nbma_address": map_cfg.get("nbma") if isinstance(map_cfg, dict) else None,
                "cisco": False,
                "register_flag": False,
            }
        )
    return sorted(maps, key=lambda m: m["tunnel_ip"])


def _parse_dynamic_maps(raw: dict) -> List[Dict[str, Any]]:
    """Parse VyOS 1.4 dynamic-map entries."""
    if not raw or not isinstance(raw, dict):
        return []
    entries = []
    for network, dm_cfg in raw.items():
        if dm_cfg is None:
            dm_cfg = {}
        entries.append(
            {
                "network": network,
                "nbma_domain_name": dm_cfg.get("nbma-domain-name") if isinstance(dm_cfg, dict) else None,
            }
        )
    return sorted(entries, key=lambda e: e["network"])


def _parse_nhs(raw: dict) -> List[Dict[str, Any]]:
    """Parse VyOS 1.5 NHS entries: nhs tunnel-ip {ip|dynamic} nbma {ip}."""
    if not raw or not isinstance(raw, dict):
        return []
    tunnel_ip_raw = raw.get("tunnel-ip", {})
    if not tunnel_ip_raw or not isinstance(tunnel_ip_raw, dict):
        return []
    entries = []
    for tunnel_ip, nhs_cfg in tunnel_ip_raw.items():
        if nhs_cfg is None:
            nhs_cfg = {}
        nbma_raw = nhs_cfg.get("nbma", {}) if isinstance(nhs_cfg, dict) else {}
        entries.append(
            {
                "tunnel_ip": tunnel_ip,
                "nbma_addresses": sorted(_to_list(nbma_raw)),
            }
        )
    return sorted(entries, key=lambda e: e["tunnel_ip"])


def _parse_shortcut_targets(raw: dict) -> List[Dict[str, Any]]:
    """Parse VyOS 1.4 shortcut-target entries."""
    if not raw or not isinstance(raw, dict):
        return []
    entries = []
    for target, st_cfg in raw.items():
        if st_cfg is None:
            st_cfg = {}
        ht = st_cfg.get("holding-time") if isinstance(st_cfg, dict) else None
        entries.append(
            {
                "target": target,
                "holding_time": str(ht) if ht is not None else None,
            }
        )
    return sorted(entries, key=lambda e: e["target"])
