"""Service Monitoring Command Mapper.

Config tree: service monitoring
Sub-trees:
  telegraf          — both 1.4 and 1.5
  zabbix-agent      — both 1.4 and 1.5
  prometheus        — 1.5 only
  network-event     — 1.5 only
"""
from typing import List
from ..base import BaseFeatureMapper

BASE = ["service", "monitoring"]
TELEGRAF = BASE + ["telegraf"]
ZABBIX = BASE + ["zabbix-agent"]
PROMETHEUS = BASE + ["prometheus"]
NETWORK_EVENT = BASE + ["network-event"]


class ServiceMonitoringMapper(BaseFeatureMapper):
    def __init__(self, version: str):
        super().__init__(version)

    # =========================================================================
    # Global
    # =========================================================================

    def get_delete(self) -> List[str]:
        return BASE

    # =========================================================================
    # Telegraf — top-level
    # =========================================================================

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

    # -------------------------------------------------------------------------
    # Telegraf — InfluxDB output
    # -------------------------------------------------------------------------

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

    # -------------------------------------------------------------------------
    # Telegraf — Loki output
    # -------------------------------------------------------------------------

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

    def get_telegraf_loki_auth_username(self, username: str) -> List[str]:
        return TELEGRAF + ["loki", "authentication", "username", username]

    def get_telegraf_loki_auth_username_delete(self) -> List[str]:
        return TELEGRAF + ["loki", "authentication", "username"]

    def get_telegraf_loki_auth_password(self, password: str) -> List[str]:
        return TELEGRAF + ["loki", "authentication", "password", password]

    def get_telegraf_loki_auth_password_delete(self) -> List[str]:
        return TELEGRAF + ["loki", "authentication", "password"]

    # -------------------------------------------------------------------------
    # Telegraf — Splunk output
    # -------------------------------------------------------------------------

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

    # -------------------------------------------------------------------------
    # Telegraf — Azure Data Explorer output
    # -------------------------------------------------------------------------

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

    # -------------------------------------------------------------------------
    # Telegraf — Prometheus client output
    # -------------------------------------------------------------------------

    def get_telegraf_prometheus_client_delete(self) -> List[str]:
        return TELEGRAF + ["prometheus-client"]

    def get_telegraf_prometheus_client_port(self, port: str) -> List[str]:
        return TELEGRAF + ["prometheus-client", "port", port]

    def get_telegraf_prometheus_client_port_delete(self) -> List[str]:
        return TELEGRAF + ["prometheus-client", "port"]

    def get_telegraf_prometheus_client_listen_address(self, address: str) -> List[str]:
        return TELEGRAF + ["prometheus-client", "listen-address", address]

    def get_telegraf_prometheus_client_listen_address_delete(self, address: str) -> List[str]:
        return TELEGRAF + ["prometheus-client", "listen-address", address]

    def get_telegraf_prometheus_client_all_listen_addresses_delete(self) -> List[str]:
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

    # =========================================================================
    # Zabbix Agent
    # =========================================================================

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

    # Zabbix authentication
    def get_zabbix_auth_mode(self, mode: str) -> List[str]:
        return ZABBIX + ["authentication", "mode", mode]

    def get_zabbix_auth_mode_delete(self) -> List[str]:
        return ZABBIX + ["authentication", "mode"]

    def get_zabbix_auth_psk_id(self, psk_id: str) -> List[str]:
        return ZABBIX + ["authentication", "psk", "id", psk_id]

    def get_zabbix_auth_psk_id_delete(self) -> List[str]:
        return ZABBIX + ["authentication", "psk", "id"]

    def get_zabbix_auth_psk_secret(self, secret: str) -> List[str]:
        return ZABBIX + ["authentication", "psk", "secret", secret]

    def get_zabbix_auth_psk_secret_delete(self) -> List[str]:
        return ZABBIX + ["authentication", "psk", "secret"]

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

    # =========================================================================
    # Prometheus exporters (1.5 only)
    # =========================================================================

    def get_prometheus_delete(self) -> List[str]:
        return PROMETHEUS

    # Node exporter
    def get_prometheus_node_exporter_delete(self) -> List[str]:
        return PROMETHEUS + ["node-exporter"]

    def get_prometheus_node_exporter_port(self, port: str) -> List[str]:
        return PROMETHEUS + ["node-exporter", "port", port]

    def get_prometheus_node_exporter_port_delete(self) -> List[str]:
        return PROMETHEUS + ["node-exporter", "port"]

    def get_prometheus_node_exporter_listen_address(self, address: str) -> List[str]:
        return PROMETHEUS + ["node-exporter", "listen-address", address]

    def get_prometheus_node_exporter_listen_address_delete(self, address: str) -> List[str]:
        return PROMETHEUS + ["node-exporter", "listen-address", address]

    def get_prometheus_node_exporter_all_listen_addresses_delete(self) -> List[str]:
        return PROMETHEUS + ["node-exporter", "listen-address"]

    def get_prometheus_node_exporter_vrf(self, vrf: str) -> List[str]:
        return PROMETHEUS + ["node-exporter", "vrf", vrf]

    def get_prometheus_node_exporter_vrf_delete(self) -> List[str]:
        return PROMETHEUS + ["node-exporter", "vrf"]

    def get_prometheus_node_exporter_textfile_collector(self) -> List[str]:
        return PROMETHEUS + ["node-exporter", "collectors", "textfile"]

    # FRR exporter
    def get_prometheus_frr_exporter_delete(self) -> List[str]:
        return PROMETHEUS + ["frr-exporter"]

    def get_prometheus_frr_exporter_port(self, port: str) -> List[str]:
        return PROMETHEUS + ["frr-exporter", "port", port]

    def get_prometheus_frr_exporter_port_delete(self) -> List[str]:
        return PROMETHEUS + ["frr-exporter", "port"]

    def get_prometheus_frr_exporter_listen_address(self, address: str) -> List[str]:
        return PROMETHEUS + ["frr-exporter", "listen-address", address]

    def get_prometheus_frr_exporter_listen_address_delete(self, address: str) -> List[str]:
        return PROMETHEUS + ["frr-exporter", "listen-address", address]

    def get_prometheus_frr_exporter_all_listen_addresses_delete(self) -> List[str]:
        return PROMETHEUS + ["frr-exporter", "listen-address"]

    def get_prometheus_frr_exporter_vrf(self, vrf: str) -> List[str]:
        return PROMETHEUS + ["frr-exporter", "vrf", vrf]

    def get_prometheus_frr_exporter_vrf_delete(self) -> List[str]:
        return PROMETHEUS + ["frr-exporter", "vrf"]

    # Blackbox exporter — top-level
    def get_prometheus_blackbox_exporter_delete(self) -> List[str]:
        return PROMETHEUS + ["blackbox-exporter"]

    def get_prometheus_blackbox_exporter_port(self, port: str) -> List[str]:
        return PROMETHEUS + ["blackbox-exporter", "port", port]

    def get_prometheus_blackbox_exporter_port_delete(self) -> List[str]:
        return PROMETHEUS + ["blackbox-exporter", "port"]

    def get_prometheus_blackbox_exporter_listen_address(self, address: str) -> List[str]:
        return PROMETHEUS + ["blackbox-exporter", "listen-address", address]

    def get_prometheus_blackbox_exporter_listen_address_delete(self, address: str) -> List[str]:
        return PROMETHEUS + ["blackbox-exporter", "listen-address", address]

    def get_prometheus_blackbox_exporter_all_listen_addresses_delete(self) -> List[str]:
        return PROMETHEUS + ["blackbox-exporter", "listen-address"]

    def get_prometheus_blackbox_exporter_vrf(self, vrf: str) -> List[str]:
        return PROMETHEUS + ["blackbox-exporter", "vrf", vrf]

    def get_prometheus_blackbox_exporter_vrf_delete(self) -> List[str]:
        return PROMETHEUS + ["blackbox-exporter", "vrf"]

    # Blackbox exporter — ICMP module (tagged node)
    def get_prometheus_blackbox_icmp_module_delete(self, name: str) -> List[str]:
        return PROMETHEUS + ["blackbox-exporter", "modules", "icmp", name]

    def get_prometheus_blackbox_icmp_preferred_ip_protocol(self, name: str, protocol: str) -> List[str]:
        return PROMETHEUS + ["blackbox-exporter", "modules", "icmp", name, "preferred-ip-protocol", protocol]

    def get_prometheus_blackbox_icmp_preferred_ip_protocol_delete(self, name: str) -> List[str]:
        return PROMETHEUS + ["blackbox-exporter", "modules", "icmp", name, "preferred-ip-protocol"]

    def get_prometheus_blackbox_icmp_ip_protocol_fallback(self, name: str) -> List[str]:
        return PROMETHEUS + ["blackbox-exporter", "modules", "icmp", name, "ip-protocol-fallback"]

    def get_prometheus_blackbox_icmp_timeout(self, name: str, timeout: str) -> List[str]:
        return PROMETHEUS + ["blackbox-exporter", "modules", "icmp", name, "timeout", timeout]

    def get_prometheus_blackbox_icmp_timeout_delete(self, name: str) -> List[str]:
        return PROMETHEUS + ["blackbox-exporter", "modules", "icmp", name, "timeout"]

    # Blackbox exporter — DNS module (tagged node)
    def get_prometheus_blackbox_dns_module_delete(self, name: str) -> List[str]:
        return PROMETHEUS + ["blackbox-exporter", "modules", "dns", name]

    def get_prometheus_blackbox_dns_preferred_ip_protocol(self, name: str, protocol: str) -> List[str]:
        return PROMETHEUS + ["blackbox-exporter", "modules", "dns", name, "preferred-ip-protocol", protocol]

    def get_prometheus_blackbox_dns_preferred_ip_protocol_delete(self, name: str) -> List[str]:
        return PROMETHEUS + ["blackbox-exporter", "modules", "dns", name, "preferred-ip-protocol"]

    def get_prometheus_blackbox_dns_ip_protocol_fallback(self, name: str) -> List[str]:
        return PROMETHEUS + ["blackbox-exporter", "modules", "dns", name, "ip-protocol-fallback"]

    def get_prometheus_blackbox_dns_timeout(self, name: str, timeout: str) -> List[str]:
        return PROMETHEUS + ["blackbox-exporter", "modules", "dns", name, "timeout", timeout]

    def get_prometheus_blackbox_dns_timeout_delete(self, name: str) -> List[str]:
        return PROMETHEUS + ["blackbox-exporter", "modules", "dns", name, "timeout"]

    def get_prometheus_blackbox_dns_query_name(self, name: str, query_name: str) -> List[str]:
        return PROMETHEUS + ["blackbox-exporter", "modules", "dns", name, "query-name", query_name]

    def get_prometheus_blackbox_dns_query_name_delete(self, name: str) -> List[str]:
        return PROMETHEUS + ["blackbox-exporter", "modules", "dns", name, "query-name"]

    def get_prometheus_blackbox_dns_query_type(self, name: str, query_type: str) -> List[str]:
        return PROMETHEUS + ["blackbox-exporter", "modules", "dns", name, "query-type", query_type]

    def get_prometheus_blackbox_dns_query_type_delete(self, name: str) -> List[str]:
        return PROMETHEUS + ["blackbox-exporter", "modules", "dns", name, "query-type"]

    # =========================================================================
    # Network Event logger (1.5 only)
    # =========================================================================

    def get_network_event_delete(self) -> List[str]:
        return NETWORK_EVENT

    def get_network_event_log_level(self, level: str) -> List[str]:
        return NETWORK_EVENT + ["log-level", level]

    def get_network_event_log_level_delete(self) -> List[str]:
        return NETWORK_EVENT + ["log-level"]

    def get_network_event_queue_size(self, size: str) -> List[str]:
        return NETWORK_EVENT + ["queue-size", size]

    def get_network_event_queue_size_delete(self) -> List[str]:
        return NETWORK_EVENT + ["queue-size"]

    def get_network_event_event(self, event_type: str) -> List[str]:
        return NETWORK_EVENT + ["event", event_type]

    def get_network_event_all_events_delete(self) -> List[str]:
        return NETWORK_EVENT + ["event"]
