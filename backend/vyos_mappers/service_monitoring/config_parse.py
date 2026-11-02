"""Read-model for service monitoring config.

Mappers own VyOS tree shape. Routers call parse_config and do not rebuild
the tree. Version keys come from the mapper (MergedMapper), not from
hardcoded 1.4/1.5 branches here.
"""

from typing import Any, Dict, List, Optional


def _str_val(raw: Any) -> Optional[str]:
    """Safely coerce a config value to string."""
    if raw is None:
        return None
    if isinstance(raw, dict):
        return next(iter(raw.keys()), None)
    return str(raw)


def _int_val(raw: Any) -> Optional[int]:
    value = _str_val(raw)
    if value is None:
        return None
    try:
        return int(value)
    except (ValueError, TypeError):
        return None


def _multi_list(raw: Any) -> List[str]:
    """Parse a VyOS multi-value node into a sorted list."""
    if raw is None:
        return []
    if isinstance(raw, list):
        return sorted(raw)
    if isinstance(raw, dict):
        return sorted(raw.keys())
    return [str(raw)]


def _empty() -> Dict[str, Any]:
    return {
        "telegraf": None,
        "zabbix_agent": None,
        "prometheus": None,
        "network_event": None,
    }


def _parse_telegraf_influxdb(raw: Any) -> Optional[Dict[str, Any]]:
    if not raw or not isinstance(raw, dict):
        return None
    auth_raw = raw.get("authentication", {}) or {}
    return {
        "url": _str_val(raw.get("url")),
        "port": _int_val(raw.get("port")),
        "bucket": _str_val(raw.get("bucket")),
        "authentication": {
            "token": _str_val(auth_raw.get("token")),
            "organization": _str_val(auth_raw.get("organization")),
        },
    }


def _parse_telegraf_loki(raw: Any) -> Optional[Dict[str, Any]]:
    if not raw or not isinstance(raw, dict):
        return None
    auth_raw = raw.get("authentication", {}) or {}
    return {
        "url": _str_val(raw.get("url")),
        "port": _int_val(raw.get("port")),
        "metric_name_label": _str_val(raw.get("metric-name-label")),
        "authentication": {
            "username": _str_val(auth_raw.get("username")),
            "password": _str_val(auth_raw.get("password")),
        },
    }


def _parse_telegraf_splunk(raw: Any) -> Optional[Dict[str, Any]]:
    if not raw or not isinstance(raw, dict):
        return None
    auth_raw = raw.get("authentication", {}) or {}
    return {
        "url": _str_val(raw.get("url")),
        "authentication": {
            "token": _str_val(auth_raw.get("token")),
            "insecure": "insecure" in auth_raw,
        },
    }


def _parse_telegraf_azure(raw: Any) -> Optional[Dict[str, Any]]:
    if not raw or not isinstance(raw, dict):
        return None
    auth_raw = raw.get("authentication", {}) or {}
    return {
        "url": _str_val(raw.get("url")),
        "database": _str_val(raw.get("database")),
        "table": _str_val(raw.get("table")),
        "group_metrics": _str_val(raw.get("group-metrics")),
        "authentication": {
            "client_id": _str_val(auth_raw.get("client-id")),
            "client_secret": _str_val(auth_raw.get("client-secret")),
            "tenant_id": _str_val(auth_raw.get("tenant-id")),
        },
    }


def _parse_telegraf_prometheus_client(raw: Any) -> Optional[Dict[str, Any]]:
    if not raw or not isinstance(raw, dict):
        return None
    auth_raw = raw.get("authentication", {}) or {}
    return {
        "port": _int_val(raw.get("port")),
        "listen_address": _str_val(raw.get("listen-address")),
        "metric_version": _int_val(raw.get("metric-version")),
        "allow_from": _multi_list(raw.get("allow-from")),
        "authentication": {
            "username": _str_val(auth_raw.get("username")),
            "password": _str_val(auth_raw.get("password")),
        },
    }


def _parse_telegraf(raw: Any) -> Optional[Dict[str, Any]]:
    if not raw or not isinstance(raw, dict):
        return None
    return {
        "sources": _multi_list(raw.get("source")),
        "vrf": _str_val(raw.get("vrf")),
        "influxdb": _parse_telegraf_influxdb(raw.get("influxdb")),
        "loki": _parse_telegraf_loki(raw.get("loki")),
        "splunk": _parse_telegraf_splunk(raw.get("splunk")),
        "azure_data_explorer": _parse_telegraf_azure(raw.get("azure-data-explorer")),
        "prometheus_client": _parse_telegraf_prometheus_client(
            raw.get("prometheus-client")
        ),
    }


def _parse_zabbix(raw: Any) -> Optional[Dict[str, Any]]:
    if not raw or not isinstance(raw, dict):
        return None

    auth_raw = raw.get("authentication", {}) or {}
    psk_raw = auth_raw.get("psk", {}) or {}
    limits_raw = raw.get("limits", {}) or {}
    log_raw = raw.get("log", {}) or {}

    servers_active = []
    sa_raw = raw.get("server-active", {})
    if sa_raw and isinstance(sa_raw, dict):
        for addr, sa_cfg in sa_raw.items():
            port = None
            if sa_cfg and isinstance(sa_cfg, dict):
                port = _int_val(sa_cfg.get("port"))
            servers_active.append({"address": addr, "port": port})
    servers_active.sort(key=lambda item: item["address"])

    return {
        "host_name": _str_val(raw.get("host-name")),
        "port": _int_val(raw.get("port")),
        "listen_addresses": _multi_list(raw.get("listen-address")),
        "directory": _str_val(raw.get("directory")),
        "timeout": _int_val(raw.get("timeout")),
        "servers": _multi_list(raw.get("server")),
        "servers_active": servers_active,
        "authentication": {
            "mode": _str_val(auth_raw.get("mode")),
            "psk_id": _str_val(psk_raw.get("id")),
            "psk_secret": _str_val(psk_raw.get("secret")),
        },
        "limits": {
            "buffer_flush_interval": _int_val(limits_raw.get("buffer-flush-interval")),
            "buffer_size": _int_val(limits_raw.get("buffer-size")),
        },
        "log": {
            "debug_level": _str_val(log_raw.get("debug-level")),
            "size": _int_val(log_raw.get("size")),
            "remote_commands": "remote-commands" in log_raw,
        },
    }


def _parse_prometheus_base_exporter(raw: Any) -> Optional[Dict[str, Any]]:
    if not raw or not isinstance(raw, dict):
        return None
    return {
        "port": _int_val(raw.get("port")),
        "listen_addresses": _multi_list(raw.get("listen-address")),
        "vrf": _str_val(raw.get("vrf")),
    }


def _parse_prometheus_node_exporter(raw: Any) -> Optional[Dict[str, Any]]:
    if not raw or not isinstance(raw, dict):
        return None
    collectors_raw = raw.get("collectors", {}) or {}
    parsed = _parse_prometheus_base_exporter(raw)
    if parsed is None:
        return None
    parsed["textfile_collector"] = "textfile" in collectors_raw
    return parsed


def _parse_prometheus_blackbox(raw: Any) -> Optional[Dict[str, Any]]:
    if not raw or not isinstance(raw, dict):
        return None

    modules_raw = raw.get("modules", {}) or {}

    icmp_modules = []
    icmp_raw = modules_raw.get("icmp", {})
    if icmp_raw and isinstance(icmp_raw, dict):
        for name, cfg in icmp_raw.items():
            cfg = cfg or {}
            icmp_modules.append(
                {
                    "name": name,
                    "preferred_ip_protocol": _str_val(cfg.get("preferred-ip-protocol")),
                    "ip_protocol_fallback": "ip-protocol-fallback" in cfg,
                    "timeout": _int_val(cfg.get("timeout")),
                }
            )
    icmp_modules.sort(key=lambda item: item["name"])

    dns_modules = []
    dns_raw = modules_raw.get("dns", {})
    if dns_raw and isinstance(dns_raw, dict):
        for name, cfg in dns_raw.items():
            cfg = cfg or {}
            dns_modules.append(
                {
                    "name": name,
                    "preferred_ip_protocol": _str_val(cfg.get("preferred-ip-protocol")),
                    "ip_protocol_fallback": "ip-protocol-fallback" in cfg,
                    "timeout": _int_val(cfg.get("timeout")),
                    "query_name": _str_val(cfg.get("query-name")),
                    "query_type": _str_val(cfg.get("query-type")),
                }
            )
    dns_modules.sort(key=lambda item: item["name"])

    parsed = _parse_prometheus_base_exporter(raw)
    if parsed is None:
        return None
    parsed["icmp_modules"] = icmp_modules
    parsed["dns_modules"] = dns_modules
    return parsed


def _parse_prometheus(raw: Any) -> Optional[Dict[str, Any]]:
    if not raw or not isinstance(raw, dict):
        return None
    return {
        "node_exporter": _parse_prometheus_node_exporter(raw.get("node-exporter")),
        "frr_exporter": _parse_prometheus_base_exporter(raw.get("frr-exporter")),
        "blackbox_exporter": _parse_prometheus_blackbox(raw.get("blackbox-exporter")),
    }


def _parse_network_event(raw: Any) -> Optional[Dict[str, Any]]:
    if not raw or not isinstance(raw, dict):
        return None

    events_raw = raw.get("event", {})
    if isinstance(events_raw, dict):
        events = sorted(events_raw.keys())
    else:
        events = []

    return {
        "log_level": _str_val(raw.get("log-level")),
        "queue_size": _int_val(raw.get("queue-size")),
        "events": events,
    }


def parse_config(_mapper, full_config: Dict[str, Any]) -> Dict[str, Any]:
    """Normalise full VyOS config into the GET /vyos/service-monitoring/config payload."""
    monitoring_raw = (full_config.get("service") or {}).get("monitoring")
    if not monitoring_raw or not isinstance(monitoring_raw, dict):
        return _empty()

    return {
        "telegraf": _parse_telegraf(monitoring_raw.get("telegraf")),
        "zabbix_agent": _parse_zabbix(monitoring_raw.get("zabbix-agent")),
        "prometheus": _parse_prometheus(monitoring_raw.get("prometheus")),
        "network_event": _parse_network_event(monitoring_raw.get("network-event")),
    }
