"""Read-model for container config.

Mappers own VyOS tree shape. Routers call parse_config and do not rebuild
the tree. The registry password, and the environment values of the appliance
stack containers, are returned as MASKED_SECRET, never in plaintext.
"""

from typing import Any, Dict, List

import appliance_mode

MASKED_SECRET = "***"


def _parse_multi(raw) -> List[str]:
    """Parse a multi-value field that may be a list, dict, or scalar."""
    if raw is None:
        return []
    if isinstance(raw, list):
        return raw
    if isinstance(raw, dict):
        return list(raw.keys())
    return [str(raw)]


def parse_config(_mapper, full_config: Dict[str, Any]) -> Dict[str, Any]:
    """Normalise full VyOS config into the GET /vyos/container/config payload."""
    configured = "container" in full_config
    container_raw = full_config.get("container") or {}
    if not isinstance(container_raw, dict):
        container_raw = {}

    containers = _parse_container_names(container_raw.get("name", {}))
    networks = _parse_container_networks(container_raw.get("network", {}))
    registries = _parse_container_registries(container_raw.get("registry", {}))
    return {
        "configured": configured,
        "containers": sorted(containers, key=lambda c: c["name"]),
        "networks": sorted(networks, key=lambda n: n["name"]),
        "registries": sorted(registries, key=lambda r: r["name"]),
    }


def _parse_container_names(names_raw: dict) -> List[Dict[str, Any]]:
    if not names_raw or not isinstance(names_raw, dict):
        return []
    result = []
    for name, cfg in names_raw.items():
        if cfg is None:
            cfg = {}
        result.append(_parse_container_instance(name, cfg))
    return result


def _parse_container_instance(name: str, cfg: dict) -> Dict[str, Any]:
    devices = []
    for dev_name, dev_cfg in (cfg.get("device") or {}).items():
        if dev_cfg is None:
            dev_cfg = {}
        devices.append(
            {
                "name": dev_name,
                "source": dev_cfg.get("source"),
                "destination": dev_cfg.get("destination"),
            }
        )

    # On the appliance the stack containers carry the app's own secrets in
    # their environment, and Containers refuses edits to them, so the values
    # never come back as a save.
    mask_env = appliance_mode.is_appliance() and appliance_mode.is_stack_container(name)
    environments = []
    for env_name, env_cfg in (cfg.get("environment") or {}).items():
        if env_cfg is None:
            env_cfg = {}
        value = env_cfg.get("value")
        if mask_env and value:
            value = MASKED_SECRET
        environments.append({"name": env_name, "value": value})

    labels = []
    for label_name, label_cfg in (cfg.get("label") or {}).items():
        if label_cfg is None:
            label_cfg = {}
        labels.append({"name": label_name, "value": label_cfg.get("value")})

    networks = []
    for net_name, net_cfg in (cfg.get("network") or {}).items():
        if net_cfg is None:
            net_cfg = {}
        networks.append(
            {
                "name": net_name,
                "addresses": _parse_multi(net_cfg.get("address")),
                "mac": net_cfg.get("mac"),
            }
        )

    health_check = None
    if "health-check" in cfg:
        hc_cfg = cfg.get("health-check") or {}
        health_check = {
            "command": hc_cfg.get("command"),
            "interval": hc_cfg.get("interval"),
            "retry": hc_cfg.get("retry"),
            "timeout": hc_cfg.get("timeout"),
        }

    ports = []
    for port_name, port_cfg in (cfg.get("port") or {}).items():
        if port_cfg is None:
            port_cfg = {}
        ports.append(
            {
                "name": port_name,
                "source": port_cfg.get("source"),
                "destination": port_cfg.get("destination"),
                "protocol": port_cfg.get("protocol"),
                "listen_addresses": _parse_multi(port_cfg.get("listen-address")),
            }
        )

    sysctl_params = []
    for param_name, param_cfg in (cfg.get("sysctl", {}).get("parameter") or {}).items():
        if param_cfg is None:
            param_cfg = {}
        sysctl_params.append(
            {"name": param_name, "value": param_cfg.get("value")}
        )

    tmpfs_mounts = []
    for tmpfs_name, tmpfs_cfg in (cfg.get("tmpfs") or {}).items():
        if tmpfs_cfg is None:
            tmpfs_cfg = {}
        tmpfs_mounts.append(
            {
                "name": tmpfs_name,
                "destination": tmpfs_cfg.get("destination"),
                "size": tmpfs_cfg.get("size"),
            }
        )

    volumes = []
    for vol_name, vol_cfg in (cfg.get("volume") or {}).items():
        if vol_cfg is None:
            vol_cfg = {}
        volumes.append(
            {
                "name": vol_name,
                "source": vol_cfg.get("source"),
                "destination": vol_cfg.get("destination"),
                "mode": vol_cfg.get("mode"),
                "propagation": vol_cfg.get("propagation"),
            }
        )

    return {
        "name": name,
        "image": cfg.get("image"),
        "description": cfg.get("description"),
        "disabled": "disable" in cfg,
        "allow_host_networks": "allow-host-networks" in cfg,
        "allow_host_cgroups": "allow-host-cgroups" in cfg,
        "allow_host_pid": "allow-host-pid" in cfg,
        "privileged": "privileged" in cfg,
        "arguments": cfg.get("arguments"),
        "command": cfg.get("command"),
        "entrypoint": cfg.get("entrypoint"),
        "cpu_quota": cfg.get("cpu-quota"),
        "memory": cfg.get("memory"),
        "shared_memory": cfg.get("shared-memory"),
        "uid": cfg.get("uid"),
        "gid": cfg.get("gid"),
        "host_name": cfg.get("host-name"),
        "log_driver": cfg.get("log-driver"),
        "restart": cfg.get("restart"),
        "stop_timeout": cfg.get("stop-timeout"),
        "health_check": health_check,
        "capabilities": _parse_multi(cfg.get("capability")),
        "name_servers": _parse_multi(cfg.get("name-server")),
        "devices": sorted(devices, key=lambda d: d["name"]),
        "environments": sorted(environments, key=lambda e: e["name"]),
        "labels": sorted(labels, key=lambda item: item["name"]),
        "networks": sorted(networks, key=lambda n: n["name"]),
        "ports": sorted(ports, key=lambda p: p["name"]),
        "sysctl_params": sorted(sysctl_params, key=lambda s: s["name"]),
        "tmpfs_mounts": sorted(tmpfs_mounts, key=lambda t: t["name"]),
        "volumes": sorted(volumes, key=lambda v: v["name"]),
    }


def _parse_container_networks(networks_raw: dict) -> List[Dict[str, Any]]:
    if not networks_raw or not isinstance(networks_raw, dict):
        return []
    result = []
    for net_name, cfg in networks_raw.items():
        if cfg is None:
            cfg = {}

        network_type = None
        macvlan_mode = None
        macvlan_parent = None
        type_cfg = cfg.get("type", {})
        if isinstance(type_cfg, dict):
            if "bridge" in type_cfg:
                network_type = "bridge"
            elif "macvlan" in type_cfg:
                network_type = "macvlan"
                mv_cfg = type_cfg.get("macvlan") or {}
                if isinstance(mv_cfg, dict):
                    macvlan_mode = mv_cfg.get("mode")
                    macvlan_parent = mv_cfg.get("parent")

        result.append(
            {
                "name": net_name,
                "description": cfg.get("description"),
                "gateways": _parse_multi(cfg.get("gateway")),
                "mtu": cfg.get("mtu"),
                "no_name_server": "no-name-server" in cfg,
                "prefixes": _parse_multi(cfg.get("prefix")),
                "network_type": network_type,
                "macvlan_mode": macvlan_mode,
                "macvlan_parent": macvlan_parent,
                "vrf": cfg.get("vrf"),
            }
        )
    return result


def _parse_container_registries(registries_raw: dict) -> List[Dict[str, Any]]:
    if not registries_raw or not isinstance(registries_raw, dict):
        return []
    result = []
    for reg_name, cfg in registries_raw.items():
        if cfg is None:
            cfg = {}

        auth = None
        if "authentication" in cfg:
            auth_raw = cfg.get("authentication") or {}
            auth = {
                "username": auth_raw.get("username"),
                "password": MASKED_SECRET if auth_raw.get("password") else None,
            }

        mirror = None
        if "mirror" in cfg:
            mirror_raw = cfg.get("mirror") or {}
            mirror = {
                "address": mirror_raw.get("address"),
                "host_name": mirror_raw.get("host-name"),
                "path": mirror_raw.get("path"),
                "port": mirror_raw.get("port"),
            }

        result.append(
            {
                "name": reg_name,
                "disabled": "disable" in cfg,
                "insecure": "insecure" in cfg,
                "authentication": auth,
                "mirror": mirror,
            }
        )
    return result
