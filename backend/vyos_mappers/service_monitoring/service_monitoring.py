"""Service monitoring command mapper.

Config tree: service monitoring. The shared class holds the commands both labs
have (telegraf, zabbix-agent). The 1.5 subclass adds prometheus, network-event
and zabbix-agent authentication.
"""

from typing import Any, Dict, FrozenSet, List

from ..base import BaseFeatureMapper

BASE = ["service", "monitoring"]
TELEGRAF = BASE + ["telegraf"]
ZABBIX = BASE + ["zabbix-agent"]
PROMETHEUS = BASE + ["prometheus"]
NETWORK_EVENT = BASE + ["network-event"]


class ServiceMonitoringMapper(BaseFeatureMapper):
    """Shared service monitoring commands. 1.5-only path methods live on the subclass."""

    # telegraf source allowed values (both labs).
    _SOURCES = ("all", "hardware-utilization", "logs", "network", "system", "telegraf")

    # telegraf azure-data-explorer group-metrics allowed values (both labs).
    _GROUP_METRICS = ("single-table", "table-per-metric")

    # telegraf prometheus-client metric-version: numeric --range 1-2 (both labs).
    _METRIC_VERSIONS = (1, 2)

    # zabbix-agent log debug-level allowed values (both labs).
    _DEBUG_LEVELS = ("basic", "critical", "error", "warning", "debug", "extended-debug")

    # Nodes only 1.5 has, mapped to a path method the subclass defines.
    _VERSIONED_NODES = {
        "prometheus": "get_prometheus_delete",
        "network-event": "get_network_event_delete",
        "zabbix-agent authentication": "get_zabbix_auth_delete",
    }

    # ========================================================================
    # Core
    # ========================================================================

    def versioned_nodes(self) -> FrozenSet[str]:
        return frozenset(
            node
            for node, method in self._VERSIONED_NODES.items()
            if callable(getattr(self, method, None))
        )

    def require_node(self, node: str) -> None:
        if node not in self.versioned_nodes():
            raise ValueError(f"service monitoring {node} is not supported on this device")

    def parse_config(self, full_config: Any) -> Dict[str, Any]:
        from .config_parse import parse_config as parse_service_monitoring_config

        return parse_service_monitoring_config(self, full_config)

    def source_values(self) -> List[str]:
        return list(self._SOURCES)

    def group_metrics_values(self) -> List[str]:
        return list(self._GROUP_METRICS)

    def metric_version_values(self) -> List[int]:
        return list(self._METRIC_VERSIONS)

    def debug_level_values(self) -> List[str]:
        return list(self._DEBUG_LEVELS)

    def zabbix_auth_modes(self) -> List[str]:
        """zabbix-agent authentication mode values; the node is 1.5-only."""
        return []

    def preferred_ip_protocol_values(self) -> List[str]:
        """blackbox-exporter preferred-ip-protocol values; prometheus is 1.5-only."""
        return []

    def dns_query_types(self) -> List[str]:
        """blackbox-exporter dns query-type values; prometheus is 1.5-only."""
        return []

    def network_event_log_levels(self) -> List[str]:
        """network-event log-level values; network-event is 1.5-only."""
        return []

    def network_event_types(self) -> List[str]:
        """network-event event child nodes; network-event is 1.5-only."""
        return []

    # ========================================================================
    # Global
    # ========================================================================

    def get_delete(self) -> List[str]:
        return BASE

    # ========================================================================
    # Telegraf — top-level
    # ========================================================================

    def get_telegraf_delete(self) -> List[str]:
        return TELEGRAF

    def get_telegraf_source(self, source: str) -> List[str]:
        return TELEGRAF + ["source", source]

    def get_telegraf_source_delete(self, source: str) -> List[str]:
        return TELEGRAF + ["source", source]

    def get_telegraf_all_sources_delete(self) -> List[str]:
        return TELEGRAF + ["source"]

    def get_telegraf_vrf(self, vrf: str) -> List[str]:
        return TELEGRAF + ["vrf", vrf]

    def get_telegraf_vrf_delete(self) -> List[str]:
        return TELEGRAF + ["vrf"]

    # ------------------------------------------------------------------------
    # Telegraf — InfluxDB output
    # ------------------------------------------------------------------------

    def get_telegraf_influxdb_delete(self) -> List[str]:
        return TELEGRAF + ["influxdb"]

    def get_telegraf_influxdb_url(self, url: str) -> List[str]:
        return TELEGRAF + ["influxdb", "url", url]

    def get_telegraf_influxdb_url_delete(self) -> List[str]:
        return TELEGRAF + ["influxdb", "url"]

    def get_telegraf_influxdb_port(self, port: str) -> List[str]:
        return TELEGRAF + ["influxdb", "port", port]

    def get_telegraf_influxdb_port_delete(self) -> List[str]:
        return TELEGRAF + ["influxdb", "port"]

    def get_telegraf_influxdb_bucket(self, bucket: str) -> List[str]:
        return TELEGRAF + ["influxdb", "bucket", bucket]

    def get_telegraf_influxdb_bucket_delete(self) -> List[str]:
        return TELEGRAF + ["influxdb", "bucket"]

    def get_telegraf_influxdb_auth_token(self, token: str) -> List[str]:
        return TELEGRAF + ["influxdb", "authentication", "token", token]

    def get_telegraf_influxdb_auth_token_delete(self) -> List[str]:
        return TELEGRAF + ["influxdb", "authentication", "token"]

    def get_telegraf_influxdb_auth_organization(self, org: str) -> List[str]:
        return TELEGRAF + ["influxdb", "authentication", "organization", org]

    def get_telegraf_influxdb_auth_organization_delete(self) -> List[str]:
        return TELEGRAF + ["influxdb", "authentication", "organization"]

    # ------------------------------------------------------------------------
    # Telegraf — Loki output
    # ------------------------------------------------------------------------

    def get_telegraf_loki_delete(self) -> List[str]:
        return TELEGRAF + ["loki"]

    def get_telegraf_loki_url(self, url: str) -> List[str]:
        return TELEGRAF + ["loki", "url", url]

    def get_telegraf_loki_url_delete(self) -> List[str]:
        return TELEGRAF + ["loki", "url"]

    def get_telegraf_loki_port(self, port: str) -> List[str]:
        return TELEGRAF + ["loki", "port", port]

    def get_telegraf_loki_port_delete(self) -> List[str]:
        return TELEGRAF + ["loki", "port"]

    def get_telegraf_loki_metric_name_label(self, label: str) -> List[str]:
        return TELEGRAF + ["loki", "metric-name-label", label]

    def get_telegraf_loki_metric_name_label_delete(self) -> List[str]:
        return TELEGRAF + ["loki", "metric-name-label"]

    def get_telegraf_loki_auth_delete(self) -> List[str]:
        return TELEGRAF + ["loki", "authentication"]

    def get_telegraf_loki_auth_username(self, username: str) -> List[str]:
        return TELEGRAF + ["loki", "authentication", "username", username]

    def get_telegraf_loki_auth_username_delete(self) -> List[str]:
        return TELEGRAF + ["loki", "authentication", "username"]

    def get_telegraf_loki_auth_password(self, password: str) -> List[str]:
        return TELEGRAF + ["loki", "authentication", "password", password]

    def get_telegraf_loki_auth_password_delete(self) -> List[str]:
        return TELEGRAF + ["loki", "authentication", "password"]

    # ------------------------------------------------------------------------
    # Telegraf — Splunk output
    # ------------------------------------------------------------------------

    def get_telegraf_splunk_delete(self) -> List[str]:
        return TELEGRAF + ["splunk"]

    def get_telegraf_splunk_url(self, url: str) -> List[str]:
        return TELEGRAF + ["splunk", "url", url]

    def get_telegraf_splunk_url_delete(self) -> List[str]:
        return TELEGRAF + ["splunk", "url"]

    def get_telegraf_splunk_auth_token(self, token: str) -> List[str]:
        return TELEGRAF + ["splunk", "authentication", "token", token]

    def get_telegraf_splunk_auth_token_delete(self) -> List[str]:
        return TELEGRAF + ["splunk", "authentication", "token"]

    def get_telegraf_splunk_auth_insecure(self) -> List[str]:
        return TELEGRAF + ["splunk", "authentication", "insecure"]

    # ------------------------------------------------------------------------
    # Telegraf — Azure Data Explorer output
    # ------------------------------------------------------------------------

    def get_telegraf_azure_delete(self) -> List[str]:
        return TELEGRAF + ["azure-data-explorer"]

    def get_telegraf_azure_url(self, url: str) -> List[str]:
        return TELEGRAF + ["azure-data-explorer", "url", url]

    def get_telegraf_azure_url_delete(self) -> List[str]:
        return TELEGRAF + ["azure-data-explorer", "url"]

    def get_telegraf_azure_database(self, database: str) -> List[str]:
        return TELEGRAF + ["azure-data-explorer", "database", database]

    def get_telegraf_azure_database_delete(self) -> List[str]:
        return TELEGRAF + ["azure-data-explorer", "database"]

    def get_telegraf_azure_table(self, table: str) -> List[str]:
        return TELEGRAF + ["azure-data-explorer", "table", table]

    def get_telegraf_azure_table_delete(self) -> List[str]:
        return TELEGRAF + ["azure-data-explorer", "table"]

    def get_telegraf_azure_group_metrics(self, value: str) -> List[str]:
        return TELEGRAF + ["azure-data-explorer", "group-metrics", value]

    def get_telegraf_azure_group_metrics_delete(self) -> List[str]:
        return TELEGRAF + ["azure-data-explorer", "group-metrics"]

    def get_telegraf_azure_auth_client_id(self, client_id: str) -> List[str]:
        return TELEGRAF + ["azure-data-explorer", "authentication", "client-id", client_id]

    def get_telegraf_azure_auth_client_id_delete(self) -> List[str]:
        return TELEGRAF + ["azure-data-explorer", "authentication", "client-id"]

    def get_telegraf_azure_auth_client_secret(self, secret: str) -> List[str]:
        return TELEGRAF + ["azure-data-explorer", "authentication", "client-secret", secret]

    def get_telegraf_azure_auth_client_secret_delete(self) -> List[str]:
        return TELEGRAF + ["azure-data-explorer", "authentication", "client-secret"]

    def get_telegraf_azure_auth_tenant_id(self, tenant_id: str) -> List[str]:
        return TELEGRAF + ["azure-data-explorer", "authentication", "tenant-id", tenant_id]

    def get_telegraf_azure_auth_tenant_id_delete(self) -> List[str]:
        return TELEGRAF + ["azure-data-explorer", "authentication", "tenant-id"]

    # ------------------------------------------------------------------------
    # Telegraf — Prometheus client output
    # ------------------------------------------------------------------------

    def get_telegraf_prometheus_client_delete(self) -> List[str]:
        return TELEGRAF + ["prometheus-client"]

    def get_telegraf_prometheus_client_port(self, port: str) -> List[str]:
        return TELEGRAF + ["prometheus-client", "port", port]

    def get_telegraf_prometheus_client_port_delete(self) -> List[str]:
        return TELEGRAF + ["prometheus-client", "port"]

    def get_telegraf_prometheus_client_listen_address(self, address: str) -> List[str]:
        return TELEGRAF + ["prometheus-client", "listen-address", address]

    def get_telegraf_prometheus_client_listen_address_delete(self) -> List[str]:
        return TELEGRAF + ["prometheus-client", "listen-address"]

    def get_telegraf_prometheus_client_metric_version(self, version: str) -> List[str]:
        return TELEGRAF + ["prometheus-client", "metric-version", version]

    def get_telegraf_prometheus_client_metric_version_delete(self) -> List[str]:
        return TELEGRAF + ["prometheus-client", "metric-version"]

    def get_telegraf_prometheus_client_allow_from(self, network: str) -> List[str]:
        return TELEGRAF + ["prometheus-client", "allow-from", network]

    def get_telegraf_prometheus_client_allow_from_delete(self, network: str) -> List[str]:
        return TELEGRAF + ["prometheus-client", "allow-from", network]

    def get_telegraf_prometheus_client_all_allow_from_delete(self) -> List[str]:
        return TELEGRAF + ["prometheus-client", "allow-from"]

    def get_telegraf_prometheus_client_auth_username(self, username: str) -> List[str]:
        return TELEGRAF + ["prometheus-client", "authentication", "username", username]

    def get_telegraf_prometheus_client_auth_username_delete(self) -> List[str]:
        return TELEGRAF + ["prometheus-client", "authentication", "username"]

    def get_telegraf_prometheus_client_auth_password(self, password: str) -> List[str]:
        return TELEGRAF + ["prometheus-client", "authentication", "password", password]

    def get_telegraf_prometheus_client_auth_password_delete(self) -> List[str]:
        return TELEGRAF + ["prometheus-client", "authentication", "password"]

    # ========================================================================
    # Zabbix Agent
    # ========================================================================

    def get_zabbix_delete(self) -> List[str]:
        return ZABBIX

    def get_zabbix_host_name(self, name: str) -> List[str]:
        return ZABBIX + ["host-name", name]

    def get_zabbix_host_name_delete(self) -> List[str]:
        return ZABBIX + ["host-name"]

    def get_zabbix_port(self, port: str) -> List[str]:
        return ZABBIX + ["port", port]

    def get_zabbix_port_delete(self) -> List[str]:
        return ZABBIX + ["port"]

    def get_zabbix_listen_address(self, address: str) -> List[str]:
        return ZABBIX + ["listen-address", address]

    def get_zabbix_listen_address_delete(self, address: str) -> List[str]:
        return ZABBIX + ["listen-address", address]

    def get_zabbix_all_listen_addresses_delete(self) -> List[str]:
        return ZABBIX + ["listen-address"]

    def get_zabbix_directory(self, directory: str) -> List[str]:
        return ZABBIX + ["directory", directory]

    def get_zabbix_directory_delete(self) -> List[str]:
        return ZABBIX + ["directory"]

    def get_zabbix_timeout(self, timeout: str) -> List[str]:
        return ZABBIX + ["timeout", timeout]

    def get_zabbix_timeout_delete(self) -> List[str]:
        return ZABBIX + ["timeout"]

    def get_zabbix_server(self, server: str) -> List[str]:
        return ZABBIX + ["server", server]

    def get_zabbix_server_delete(self, server: str) -> List[str]:
        return ZABBIX + ["server", server]

    def get_zabbix_all_servers_delete(self) -> List[str]:
        return ZABBIX + ["server"]

    # Zabbix server-active (tagged: server address → optional port)
    def get_zabbix_server_active(self, address: str) -> List[str]:
        return ZABBIX + ["server-active", address]

    def get_zabbix_server_active_delete(self, address: str) -> List[str]:
        return ZABBIX + ["server-active", address]

    def get_zabbix_all_server_active_delete(self) -> List[str]:
        return ZABBIX + ["server-active"]

    def get_zabbix_server_active_port(self, address: str, port: str) -> List[str]:
        return ZABBIX + ["server-active", address, "port", port]

    def get_zabbix_server_active_port_delete(self, address: str) -> List[str]:
        return ZABBIX + ["server-active", address, "port"]

    # Zabbix limits
    def get_zabbix_limits_buffer_flush_interval(self, seconds: str) -> List[str]:
        return ZABBIX + ["limits", "buffer-flush-interval", seconds]

    def get_zabbix_limits_buffer_flush_interval_delete(self) -> List[str]:
        return ZABBIX + ["limits", "buffer-flush-interval"]

    def get_zabbix_limits_buffer_size(self, size: str) -> List[str]:
        return ZABBIX + ["limits", "buffer-size", size]

    def get_zabbix_limits_buffer_size_delete(self) -> List[str]:
        return ZABBIX + ["limits", "buffer-size"]

    # Zabbix log
    def get_zabbix_log_debug_level(self, level: str) -> List[str]:
        return ZABBIX + ["log", "debug-level", level]

    def get_zabbix_log_debug_level_delete(self) -> List[str]:
        return ZABBIX + ["log", "debug-level"]

    def get_zabbix_log_size(self, size: str) -> List[str]:
        return ZABBIX + ["log", "size", size]

    def get_zabbix_log_size_delete(self) -> List[str]:
        return ZABBIX + ["log", "size"]

    def get_zabbix_log_remote_commands(self) -> List[str]:
        return ZABBIX + ["log", "remote-commands"]
