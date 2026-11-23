"""Read-model for high-availability config.

Mappers own VyOS tree shape. Routers call parse_config and do not rebuild
the tree. The VRRP authentication password is a secret and loads masked.
"""

from typing import Any, Dict, List, Optional

MASKED_SECRET = "***"


def _dict(value: Any) -> Dict[str, Any]:
    return value if isinstance(value, dict) else {}


def _multi(value: Any) -> List[str]:
    """A ``multi:`` leaf: one value comes back as a string, several as a list."""
    if value is None:
        return []
    if isinstance(value, list):
        return [str(v) for v in value]
    return [str(value)]


def _addresses(value: Any) -> List[Dict[str, Optional[str]]]:
    return [
        {"address": addr, "interface": _dict(cfg).get("interface")}
        for addr, cfg in _dict(value).items()
    ]


def _health_check(cfg: Dict[str, Any]) -> Dict[str, Optional[str]]:
    return {
        "failure_count": cfg.get("failure-count"),
        "interval": cfg.get("interval"),
        "ping": cfg.get("ping"),
        "script": cfg.get("script"),
        "timeout": cfg.get("timeout"),
    }


def _transition_script(cfg: Dict[str, Any]) -> Dict[str, Optional[str]]:
    return {
        "backup": cfg.get("backup"),
        "fault": cfg.get("fault"),
        "master": cfg.get("master"),
        "stop": cfg.get("stop"),
    }


def _garp(cfg: Dict[str, Any]) -> Dict[str, Optional[str]]:
    return {
        "interval": cfg.get("interval"),
        "master_delay": cfg.get("master-delay"),
        "master_refresh": cfg.get("master-refresh"),
        "master_refresh_repeat": cfg.get("master-refresh-repeat"),
        "master_repeat": cfg.get("master-repeat"),
    }


def _vrrp_group(name: str, cfg: Dict[str, Any]) -> Dict[str, Any]:
    auth = _dict(cfg.get("authentication"))
    track = _dict(cfg.get("track"))
    return {
        "name": name,
        "vrid": cfg.get("vrid"),
        "interface": cfg.get("interface"),
        "addresses": _addresses(cfg.get("address")),
        "excluded_addresses": _addresses(cfg.get("excluded-address")),
        "priority": cfg.get("priority"),
        "advertise_interval": cfg.get("advertise-interval"),
        "authentication": {
            "type": auth.get("type"),
            "password": MASKED_SECRET if auth.get("password") else None,
        } if "authentication" in cfg else None,
        "preempt_delay": cfg.get("preempt-delay"),
        "no_preempt": "no-preempt" in cfg,
        "peer_addresses": _multi(cfg.get("peer-address")),
        "hello_source_address": cfg.get("hello-source-address"),
        "rfc3768_compatibility": "rfc3768-compatibility" in cfg,
        "disabled": "disable" in cfg,
        "description": cfg.get("description"),
        "garp": _garp(_dict(cfg.get("garp"))),
        "health_check": _health_check(_dict(cfg.get("health-check"))),
        "track": {
            "interfaces": _multi(track.get("interface")),
            "exclude_vrrp_interface": "exclude-vrrp-interface" in track,
        },
        "transition_script": _transition_script(_dict(cfg.get("transition-script"))),
    }


def _vrrp_sync_group(name: str, cfg: Dict[str, Any]) -> Dict[str, Any]:
    return {
        "name": name,
        "members": _multi(cfg.get("member")),
        "health_check": _health_check(_dict(cfg.get("health-check"))),
        "transition_script": _transition_script(_dict(cfg.get("transition-script"))),
    }


def _virtual_server(name: str, cfg: Dict[str, Any]) -> Dict[str, Any]:
    real_servers = []
    for address, rs_cfg in _dict(cfg.get("real-server")).items():
        rs = _dict(rs_cfg)
        real_servers.append({
            "address": address,
            "port": rs.get("port"),
            "connection_timeout": rs.get("connection-timeout"),
            "health_check_script": _dict(rs.get("health-check")).get("script"),
        })
    return {
        "name": name,
        "address": cfg.get("address"),
        "algorithm": cfg.get("algorithm"),
        "delay_loop": cfg.get("delay-loop"),
        "forward_method": cfg.get("forward-method"),
        "fwmark": cfg.get("fwmark"),
        "persistence_timeout": cfg.get("persistence-timeout"),
        "port": cfg.get("port"),
        "protocol": cfg.get("protocol"),
        "real_servers": real_servers,
    }


def parse_config(_mapper: Any, full_config: Any) -> Dict[str, Any]:
    ha = _dict(_dict(full_config).get("high-availability"))
    vrrp = _dict(ha.get("vrrp"))
    global_params = _dict(vrrp.get("global-parameters"))
    return {
        "disabled": "disable" in ha,
        "vrrp": {
            "global_parameters": {
                "startup_delay": global_params.get("startup-delay"),
                "version": global_params.get("version"),
                "garp": _garp(_dict(global_params.get("garp"))),
            },
            "snmp": "snmp" in vrrp,
            "snmp_trap": "trap" in _dict(vrrp.get("snmp")),
            "groups": [
                _vrrp_group(name, _dict(cfg)) for name, cfg in _dict(vrrp.get("group")).items()
            ],
            "sync_groups": [
                _vrrp_sync_group(name, _dict(cfg)) for name, cfg in _dict(vrrp.get("sync-group")).items()
            ],
        },
        "virtual_servers": [
            _virtual_server(name, _dict(cfg)) for name, cfg in _dict(ha.get("virtual-server")).items()
        ],
    }
