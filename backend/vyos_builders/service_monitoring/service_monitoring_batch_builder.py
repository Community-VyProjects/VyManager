"""
Service Monitoring Batch Builder

Generates VyOS set/delete operations for the service monitoring tree.

Config tree: service monitoring

Sub-sections:
  telegraf          — metric collector (both 1.4 and 1.5)
    influxdb        — InfluxDB v2 output
    loki            — Grafana Loki output
    splunk          — Splunk HEC output
    azure-data-explorer — Azure ADX output
    prometheus-client   — Prometheus scrape endpoint
    source          — multi-value input filter
    vrf             — VRF binding
  zabbix-agent      — Zabbix monitoring agent (both 1.4 and 1.5)
  prometheus        — Prometheus exporters (1.5 only)
    node-exporter   — system/HW metrics
    frr-exporter    — FRR/routing metrics
    blackbox-exporter — ICMP/DNS probes
  network-event     — kernel netlink event logger (1.5 only)
"""

from typing import List, Dict, Any
from vyos_mappers import CommandMapperRegistry


class ServiceMonitoringBatchBuilder:
    def __init__(self, version: str):
        self.version = version
        self._operations: List[Dict[str, Any]] = []
        self.mappers = CommandMapperRegistry.get_all_mappers(version)
        self.m = self.mappers["service_monitoring"]

    # -----------------------------------------------------------------------
    # Core helpers
    # -----------------------------------------------------------------------

    def add_set(self, path: List[str]) -> "ServiceMonitoringBatchBuilder":
        if path:
            self._operations.append({"op": "set", "path": path})
        return self

    def add_delete(self, path: List[str]) -> "ServiceMonitoringBatchBuilder":
        if path:
            self._operations.append({"op": "delete", "path": path})
        return self

    def get_operations(self) -> List[Dict[str, Any]]:
        return self._operations.copy()

    def is_empty(self) -> bool:
        return len(self._operations) == 0

    # -----------------------------------------------------------------------
    # Capabilities
    # -----------------------------------------------------------------------

    def get_capabilities(self) -> Dict[str, Any]:
        is_1_4 = "1.4" in self.version
        is_1_5 = not is_1_4

        return {
            "version": self.version,
            "features": {
                "telegraf": {
                    "supported": True,
                    "description": "Telegraf metric collector",
                    "outputs": {
                        "influxdb": {
                            "supported": True,
                            "description": "InfluxDB v2 output",
                            "default_port": 8086,
                        },
                        "loki": {
                            "supported": True,
                            "description": "Grafana Loki output",
                            "default_port": 3100,
                        },
                        "splunk": {
                            "supported": True,
                            "description": "Splunk HEC output",
                        },
                        "azure_data_explorer": {
                            "supported": True,
                            "description": "Azure Data Explorer output",
                            "group_metrics_values": ["single-table", "table-per-metric"],
                        },
                        "prometheus_client": {
                            "supported": True,
                            "description": "Prometheus scrape endpoint",
                            "default_port": 9273,
                            "metric_version_values": [1, 2],
                        },
                    },
                    "source_values": [
                        "all",
                        "hardware-utilization",
                        "logs",
                        "network",
                        "system",
                        "telegraf",
                    ],
                    "vrf": {"supported": True},
                },
                "zabbix_agent": {
                    "supported": True,
                    "description": "Zabbix monitoring agent",
                    "default_port": 10050,
                    "auth_modes": ["pre-shared-secret"],
                    "log_debug_levels": [
                        "basic",
                        "critical",
                        "error",
                        "warning",
                        "debug",
                        "extended-debug",
                    ],
                    "limits": {
                        "buffer_flush_interval": {"min": 1, "max": 3600, "default": 5},
                        "buffer_size": {"min": 2, "max": 65535, "default": 100},
                    },
                    "timeout": {"min": 1, "max": 30, "default": 3},
                },
                "prometheus": {
                    "supported": is_1_5,
                    "description": "Prometheus exporters (1.5 only)",
                    "exporters": {
                        "node_exporter": {
                            "description": "Hardware and OS metrics",
                            "default_port": 9100,
                        },
                        "frr_exporter": {
                            "description": "FRR routing daemon metrics",
                            "default_port": 9342,
                        },
                        "blackbox_exporter": {
                            "description": "ICMP and DNS probe results",
                            "default_port": 9115,
                            "module_types": ["icmp", "dns"],
                            "preferred_ip_protocol_values": ["ipv4", "ipv6"],
                            "dns_query_types": ["ANY", "A", "AAAA"],
                        },
                    },
                },
                "network_event": {
                    "supported": is_1_5,
                    "description": "Kernel netlink event logger (1.5 only)",
                    "log_level_values": ["info", "debug"],
                    "event_types": ["addr", "link", "neigh", "route", "rule"],
                    "queue_size": {"min": 100, "max": 2147483647},
                },
            },
            "version_info": {
                "is_1_4": is_1_4,
                "is_1_5": is_1_5,
            },
        }

    # -----------------------------------------------------------------------
    # Global
    # -----------------------------------------------------------------------

    def delete_service_monitoring(self) -> "ServiceMonitoringBatchBuilder":
        """Delete the entire service monitoring configuration."""
        return self.add_delete(self.m.get_delete())

    # -----------------------------------------------------------------------
    # Telegraf — top-level
    # -----------------------------------------------------------------------

    def delete_telegraf(self) -> "ServiceMonitoringBatchBuilder":
        return self.add_delete(self.m.get_telegraf_delete())

    def set_telegraf_source(self, source: str) -> "ServiceMonitoringBatchBuilder":
        return self.add_set(self.m.get_telegraf_source(source))

    def delete_telegraf_source(self, source: str) -> "ServiceMonitoringBatchBuilder":
        return self.add_delete(self.m.get_telegraf_source_delete(source))

    def delete_telegraf_all_sources(self) -> "ServiceMonitoringBatchBuilder":
        return self.add_delete(self.m.get_telegraf_all_sources_delete())

    def set_telegraf_vrf(self, vrf: str) -> "ServiceMonitoringBatchBuilder":
        return self.add_set(self.m.get_telegraf_vrf(vrf))

    def delete_telegraf_vrf(self) -> "ServiceMonitoringBatchBuilder":
        return self.add_delete(self.m.get_telegraf_vrf_delete())

    # -----------------------------------------------------------------------
    # Telegraf — InfluxDB
    # -----------------------------------------------------------------------

    def delete_telegraf_influxdb(self) -> "ServiceMonitoringBatchBuilder":
        return self.add_delete(self.m.get_telegraf_influxdb_delete())

    def set_telegraf_influxdb_url(self, url: str) -> "ServiceMonitoringBatchBuilder":
        return self.add_set(self.m.get_telegraf_influxdb_url(url))

    def delete_telegraf_influxdb_url(self) -> "ServiceMonitoringBatchBuilder":
        return self.add_delete(self.m.get_telegraf_influxdb_url_delete())

    def set_telegraf_influxdb_port(self, port: str) -> "ServiceMonitoringBatchBuilder":
        return self.add_set(self.m.get_telegraf_influxdb_port(port))

    def delete_telegraf_influxdb_port(self) -> "ServiceMonitoringBatchBuilder":
        return self.add_delete(self.m.get_telegraf_influxdb_port_delete())

    def set_telegraf_influxdb_bucket(self, bucket: str) -> "ServiceMonitoringBatchBuilder":
        return self.add_set(self.m.get_telegraf_influxdb_bucket(bucket))

    def delete_telegraf_influxdb_bucket(self) -> "ServiceMonitoringBatchBuilder":
        return self.add_delete(self.m.get_telegraf_influxdb_bucket_delete())

    def set_telegraf_influxdb_auth_token(self, token: str) -> "ServiceMonitoringBatchBuilder":
        return self.add_set(self.m.get_telegraf_influxdb_auth_token(token))

    def delete_telegraf_influxdb_auth_token(self) -> "ServiceMonitoringBatchBuilder":
        return self.add_delete(self.m.get_telegraf_influxdb_auth_token_delete())

    def set_telegraf_influxdb_auth_organization(self, org: str) -> "ServiceMonitoringBatchBuilder":
        return self.add_set(self.m.get_telegraf_influxdb_auth_organization(org))

    def delete_telegraf_influxdb_auth_organization(self) -> "ServiceMonitoringBatchBuilder":
        return self.add_delete(self.m.get_telegraf_influxdb_auth_organization_delete())

    # -----------------------------------------------------------------------
    # Telegraf — Loki
    # -----------------------------------------------------------------------

    def delete_telegraf_loki(self) -> "ServiceMonitoringBatchBuilder":
        return self.add_delete(self.m.get_telegraf_loki_delete())

    def set_telegraf_loki_url(self, url: str) -> "ServiceMonitoringBatchBuilder":
        return self.add_set(self.m.get_telegraf_loki_url(url))

    def delete_telegraf_loki_url(self) -> "ServiceMonitoringBatchBuilder":
        return self.add_delete(self.m.get_telegraf_loki_url_delete())

    def set_telegraf_loki_port(self, port: str) -> "ServiceMonitoringBatchBuilder":
        return self.add_set(self.m.get_telegraf_loki_port(port))

    def delete_telegraf_loki_port(self) -> "ServiceMonitoringBatchBuilder":
        return self.add_delete(self.m.get_telegraf_loki_port_delete())

    def set_telegraf_loki_metric_name_label(self, label: str) -> "ServiceMonitoringBatchBuilder":
        return self.add_set(self.m.get_telegraf_loki_metric_name_label(label))

    def delete_telegraf_loki_metric_name_label(self) -> "ServiceMonitoringBatchBuilder":
        return self.add_delete(self.m.get_telegraf_loki_metric_name_label_delete())

    def set_telegraf_loki_auth_username(self, username: str) -> "ServiceMonitoringBatchBuilder":
        return self.add_set(self.m.get_telegraf_loki_auth_username(username))

    def delete_telegraf_loki_auth_username(self) -> "ServiceMonitoringBatchBuilder":
        return self.add_delete(self.m.get_telegraf_loki_auth_username_delete())

    def set_telegraf_loki_auth_password(self, password: str) -> "ServiceMonitoringBatchBuilder":
        return self.add_set(self.m.get_telegraf_loki_auth_password(password))

    def delete_telegraf_loki_auth_password(self) -> "ServiceMonitoringBatchBuilder":
        return self.add_delete(self.m.get_telegraf_loki_auth_password_delete())

    # -----------------------------------------------------------------------
    # Telegraf — Splunk
    # -----------------------------------------------------------------------

    def delete_telegraf_splunk(self) -> "ServiceMonitoringBatchBuilder":
        return self.add_delete(self.m.get_telegraf_splunk_delete())

    def set_telegraf_splunk_url(self, url: str) -> "ServiceMonitoringBatchBuilder":
        return self.add_set(self.m.get_telegraf_splunk_url(url))

    def delete_telegraf_splunk_url(self) -> "ServiceMonitoringBatchBuilder":
        return self.add_delete(self.m.get_telegraf_splunk_url_delete())

    def set_telegraf_splunk_auth_token(self, token: str) -> "ServiceMonitoringBatchBuilder":
        return self.add_set(self.m.get_telegraf_splunk_auth_token(token))

    def delete_telegraf_splunk_auth_token(self) -> "ServiceMonitoringBatchBuilder":
        return self.add_delete(self.m.get_telegraf_splunk_auth_token_delete())

    def set_telegraf_splunk_auth_insecure(self) -> "ServiceMonitoringBatchBuilder":
        return self.add_set(self.m.get_telegraf_splunk_auth_insecure())

    def delete_telegraf_splunk_auth_insecure(self) -> "ServiceMonitoringBatchBuilder":
        return self.add_delete(self.m.get_telegraf_splunk_auth_insecure())

    # -----------------------------------------------------------------------
    # Telegraf — Azure Data Explorer
    # -----------------------------------------------------------------------

    def delete_telegraf_azure(self) -> "ServiceMonitoringBatchBuilder":
        return self.add_delete(self.m.get_telegraf_azure_delete())

    def set_telegraf_azure_url(self, url: str) -> "ServiceMonitoringBatchBuilder":
        return self.add_set(self.m.get_telegraf_azure_url(url))

    def delete_telegraf_azure_url(self) -> "ServiceMonitoringBatchBuilder":
        return self.add_delete(self.m.get_telegraf_azure_url_delete())

    def set_telegraf_azure_database(self, database: str) -> "ServiceMonitoringBatchBuilder":
        return self.add_set(self.m.get_telegraf_azure_database(database))

    def delete_telegraf_azure_database(self) -> "ServiceMonitoringBatchBuilder":
        return self.add_delete(self.m.get_telegraf_azure_database_delete())

    def set_telegraf_azure_table(self, table: str) -> "ServiceMonitoringBatchBuilder":
        return self.add_set(self.m.get_telegraf_azure_table(table))

    def delete_telegraf_azure_table(self) -> "ServiceMonitoringBatchBuilder":
        return self.add_delete(self.m.get_telegraf_azure_table_delete())

    def set_telegraf_azure_group_metrics(self, value: str) -> "ServiceMonitoringBatchBuilder":
        return self.add_set(self.m.get_telegraf_azure_group_metrics(value))

    def delete_telegraf_azure_group_metrics(self) -> "ServiceMonitoringBatchBuilder":
        return self.add_delete(self.m.get_telegraf_azure_group_metrics_delete())

    def set_telegraf_azure_auth_client_id(self, client_id: str) -> "ServiceMonitoringBatchBuilder":
        return self.add_set(self.m.get_telegraf_azure_auth_client_id(client_id))

    def delete_telegraf_azure_auth_client_id(self) -> "ServiceMonitoringBatchBuilder":
        return self.add_delete(self.m.get_telegraf_azure_auth_client_id_delete())

    def set_telegraf_azure_auth_client_secret(self, secret: str) -> "ServiceMonitoringBatchBuilder":
        return self.add_set(self.m.get_telegraf_azure_auth_client_secret(secret))

    def delete_telegraf_azure_auth_client_secret(self) -> "ServiceMonitoringBatchBuilder":
        return self.add_delete(self.m.get_telegraf_azure_auth_client_secret_delete())

    def set_telegraf_azure_auth_tenant_id(self, tenant_id: str) -> "ServiceMonitoringBatchBuilder":
        return self.add_set(self.m.get_telegraf_azure_auth_tenant_id(tenant_id))

    def delete_telegraf_azure_auth_tenant_id(self) -> "ServiceMonitoringBatchBuilder":
        return self.add_delete(self.m.get_telegraf_azure_auth_tenant_id_delete())

    # -----------------------------------------------------------------------
    # Telegraf — Prometheus client
    # -----------------------------------------------------------------------

    def delete_telegraf_prometheus_client(self) -> "ServiceMonitoringBatchBuilder":
        return self.add_delete(self.m.get_telegraf_prometheus_client_delete())

    def set_telegraf_prometheus_client_port(self, port: str) -> "ServiceMonitoringBatchBuilder":
        return self.add_set(self.m.get_telegraf_prometheus_client_port(port))

    def delete_telegraf_prometheus_client_port(self) -> "ServiceMonitoringBatchBuilder":
        return self.add_delete(self.m.get_telegraf_prometheus_client_port_delete())

    def set_telegraf_prometheus_client_listen_address(self, address: str) -> "ServiceMonitoringBatchBuilder":
        return self.add_set(self.m.get_telegraf_prometheus_client_listen_address(address))

    def delete_telegraf_prometheus_client_listen_address(self, address: str) -> "ServiceMonitoringBatchBuilder":
        return self.add_delete(self.m.get_telegraf_prometheus_client_listen_address_delete(address))

    def delete_telegraf_prometheus_client_all_listen_addresses(self) -> "ServiceMonitoringBatchBuilder":
        return self.add_delete(self.m.get_telegraf_prometheus_client_all_listen_addresses_delete())

    def set_telegraf_prometheus_client_metric_version(self, version: str) -> "ServiceMonitoringBatchBuilder":
        return self.add_set(self.m.get_telegraf_prometheus_client_metric_version(version))

    def delete_telegraf_prometheus_client_metric_version(self) -> "ServiceMonitoringBatchBuilder":
        return self.add_delete(self.m.get_telegraf_prometheus_client_metric_version_delete())

    def set_telegraf_prometheus_client_allow_from(self, network: str) -> "ServiceMonitoringBatchBuilder":
        return self.add_set(self.m.get_telegraf_prometheus_client_allow_from(network))

    def delete_telegraf_prometheus_client_allow_from(self, network: str) -> "ServiceMonitoringBatchBuilder":
        return self.add_delete(self.m.get_telegraf_prometheus_client_allow_from_delete(network))

    def delete_telegraf_prometheus_client_all_allow_from(self) -> "ServiceMonitoringBatchBuilder":
        return self.add_delete(self.m.get_telegraf_prometheus_client_all_allow_from_delete())

    def set_telegraf_prometheus_client_auth_username(self, username: str) -> "ServiceMonitoringBatchBuilder":
        return self.add_set(self.m.get_telegraf_prometheus_client_auth_username(username))

    def delete_telegraf_prometheus_client_auth_username(self) -> "ServiceMonitoringBatchBuilder":
        return self.add_delete(self.m.get_telegraf_prometheus_client_auth_username_delete())

    def set_telegraf_prometheus_client_auth_password(self, password: str) -> "ServiceMonitoringBatchBuilder":
        return self.add_set(self.m.get_telegraf_prometheus_client_auth_password(password))

    def delete_telegraf_prometheus_client_auth_password(self) -> "ServiceMonitoringBatchBuilder":
        return self.add_delete(self.m.get_telegraf_prometheus_client_auth_password_delete())

    # -----------------------------------------------------------------------
    # Zabbix Agent
    # -----------------------------------------------------------------------

    def delete_zabbix(self) -> "ServiceMonitoringBatchBuilder":
        return self.add_delete(self.m.get_zabbix_delete())

    def set_zabbix_host_name(self, name: str) -> "ServiceMonitoringBatchBuilder":
        return self.add_set(self.m.get_zabbix_host_name(name))

    def delete_zabbix_host_name(self) -> "ServiceMonitoringBatchBuilder":
        return self.add_delete(self.m.get_zabbix_host_name_delete())

    def set_zabbix_port(self, port: str) -> "ServiceMonitoringBatchBuilder":
        return self.add_set(self.m.get_zabbix_port(port))

    def delete_zabbix_port(self) -> "ServiceMonitoringBatchBuilder":
        return self.add_delete(self.m.get_zabbix_port_delete())

    def set_zabbix_listen_address(self, address: str) -> "ServiceMonitoringBatchBuilder":
        return self.add_set(self.m.get_zabbix_listen_address(address))

    def delete_zabbix_listen_address(self, address: str) -> "ServiceMonitoringBatchBuilder":
        return self.add_delete(self.m.get_zabbix_listen_address_delete(address))

    def delete_zabbix_all_listen_addresses(self) -> "ServiceMonitoringBatchBuilder":
        return self.add_delete(self.m.get_zabbix_all_listen_addresses_delete())

    def set_zabbix_directory(self, directory: str) -> "ServiceMonitoringBatchBuilder":
        return self.add_set(self.m.get_zabbix_directory(directory))

    def delete_zabbix_directory(self) -> "ServiceMonitoringBatchBuilder":
        return self.add_delete(self.m.get_zabbix_directory_delete())

    def set_zabbix_timeout(self, timeout: str) -> "ServiceMonitoringBatchBuilder":
        return self.add_set(self.m.get_zabbix_timeout(timeout))

    def delete_zabbix_timeout(self) -> "ServiceMonitoringBatchBuilder":
        return self.add_delete(self.m.get_zabbix_timeout_delete())

    def set_zabbix_server(self, server: str) -> "ServiceMonitoringBatchBuilder":
        return self.add_set(self.m.get_zabbix_server(server))

    def delete_zabbix_server(self, server: str) -> "ServiceMonitoringBatchBuilder":
        return self.add_delete(self.m.get_zabbix_server_delete(server))

    def delete_zabbix_all_servers(self) -> "ServiceMonitoringBatchBuilder":
        return self.add_delete(self.m.get_zabbix_all_servers_delete())

    def set_zabbix_server_active(self, address: str) -> "ServiceMonitoringBatchBuilder":
        return self.add_set(self.m.get_zabbix_server_active(address))

    def delete_zabbix_server_active(self, address: str) -> "ServiceMonitoringBatchBuilder":
        return self.add_delete(self.m.get_zabbix_server_active_delete(address))

    def delete_zabbix_all_server_active(self) -> "ServiceMonitoringBatchBuilder":
        return self.add_delete(self.m.get_zabbix_all_server_active_delete())

    def set_zabbix_server_active_port(self, address: str, port: str) -> "ServiceMonitoringBatchBuilder":
        return self.add_set(self.m.get_zabbix_server_active_port(address, port))

    def delete_zabbix_server_active_port(self, address: str) -> "ServiceMonitoringBatchBuilder":
        return self.add_delete(self.m.get_zabbix_server_active_port_delete(address))

    def set_zabbix_auth_mode(self, mode: str) -> "ServiceMonitoringBatchBuilder":
        return self.add_set(self.m.get_zabbix_auth_mode(mode))

    def delete_zabbix_auth_mode(self) -> "ServiceMonitoringBatchBuilder":
        return self.add_delete(self.m.get_zabbix_auth_mode_delete())

    def set_zabbix_auth_psk_id(self, psk_id: str) -> "ServiceMonitoringBatchBuilder":
        return self.add_set(self.m.get_zabbix_auth_psk_id(psk_id))

    def delete_zabbix_auth_psk_id(self) -> "ServiceMonitoringBatchBuilder":
        return self.add_delete(self.m.get_zabbix_auth_psk_id_delete())

    def set_zabbix_auth_psk_secret(self, secret: str) -> "ServiceMonitoringBatchBuilder":
        return self.add_set(self.m.get_zabbix_auth_psk_secret(secret))

    def delete_zabbix_auth_psk_secret(self) -> "ServiceMonitoringBatchBuilder":
        return self.add_delete(self.m.get_zabbix_auth_psk_secret_delete())

    def set_zabbix_limits_buffer_flush_interval(self, seconds: str) -> "ServiceMonitoringBatchBuilder":
        return self.add_set(self.m.get_zabbix_limits_buffer_flush_interval(seconds))

    def delete_zabbix_limits_buffer_flush_interval(self) -> "ServiceMonitoringBatchBuilder":
        return self.add_delete(self.m.get_zabbix_limits_buffer_flush_interval_delete())

    def set_zabbix_limits_buffer_size(self, size: str) -> "ServiceMonitoringBatchBuilder":
        return self.add_set(self.m.get_zabbix_limits_buffer_size(size))

    def delete_zabbix_limits_buffer_size(self) -> "ServiceMonitoringBatchBuilder":
        return self.add_delete(self.m.get_zabbix_limits_buffer_size_delete())

    def set_zabbix_log_debug_level(self, level: str) -> "ServiceMonitoringBatchBuilder":
        return self.add_set(self.m.get_zabbix_log_debug_level(level))

    def delete_zabbix_log_debug_level(self) -> "ServiceMonitoringBatchBuilder":
        return self.add_delete(self.m.get_zabbix_log_debug_level_delete())

    def set_zabbix_log_size(self, size: str) -> "ServiceMonitoringBatchBuilder":
        return self.add_set(self.m.get_zabbix_log_size(size))

    def delete_zabbix_log_size(self) -> "ServiceMonitoringBatchBuilder":
        return self.add_delete(self.m.get_zabbix_log_size_delete())

    def set_zabbix_log_remote_commands(self) -> "ServiceMonitoringBatchBuilder":
        return self.add_set(self.m.get_zabbix_log_remote_commands())

    def delete_zabbix_log_remote_commands(self) -> "ServiceMonitoringBatchBuilder":
        return self.add_delete(self.m.get_zabbix_log_remote_commands())

    # -----------------------------------------------------------------------
    # Prometheus exporters (1.5 only)
    # -----------------------------------------------------------------------

    def delete_prometheus(self) -> "ServiceMonitoringBatchBuilder":
        return self.add_delete(self.m.get_prometheus_delete())

    # Node exporter
    def delete_prometheus_node_exporter(self) -> "ServiceMonitoringBatchBuilder":
        return self.add_delete(self.m.get_prometheus_node_exporter_delete())

    def set_prometheus_node_exporter_port(self, port: str) -> "ServiceMonitoringBatchBuilder":
        return self.add_set(self.m.get_prometheus_node_exporter_port(port))

    def delete_prometheus_node_exporter_port(self) -> "ServiceMonitoringBatchBuilder":
        return self.add_delete(self.m.get_prometheus_node_exporter_port_delete())

    def set_prometheus_node_exporter_listen_address(self, address: str) -> "ServiceMonitoringBatchBuilder":
        return self.add_set(self.m.get_prometheus_node_exporter_listen_address(address))

    def delete_prometheus_node_exporter_listen_address(self, address: str) -> "ServiceMonitoringBatchBuilder":
        return self.add_delete(self.m.get_prometheus_node_exporter_listen_address_delete(address))

    def delete_prometheus_node_exporter_all_listen_addresses(self) -> "ServiceMonitoringBatchBuilder":
        return self.add_delete(self.m.get_prometheus_node_exporter_all_listen_addresses_delete())

    def set_prometheus_node_exporter_vrf(self, vrf: str) -> "ServiceMonitoringBatchBuilder":
        return self.add_set(self.m.get_prometheus_node_exporter_vrf(vrf))

    def delete_prometheus_node_exporter_vrf(self) -> "ServiceMonitoringBatchBuilder":
        return self.add_delete(self.m.get_prometheus_node_exporter_vrf_delete())

    def set_prometheus_node_exporter_textfile_collector(self) -> "ServiceMonitoringBatchBuilder":
        return self.add_set(self.m.get_prometheus_node_exporter_textfile_collector())

    def delete_prometheus_node_exporter_textfile_collector(self) -> "ServiceMonitoringBatchBuilder":
        return self.add_delete(self.m.get_prometheus_node_exporter_textfile_collector())

    # FRR exporter
    def delete_prometheus_frr_exporter(self) -> "ServiceMonitoringBatchBuilder":
        return self.add_delete(self.m.get_prometheus_frr_exporter_delete())

    def set_prometheus_frr_exporter_port(self, port: str) -> "ServiceMonitoringBatchBuilder":
        return self.add_set(self.m.get_prometheus_frr_exporter_port(port))

    def delete_prometheus_frr_exporter_port(self) -> "ServiceMonitoringBatchBuilder":
        return self.add_delete(self.m.get_prometheus_frr_exporter_port_delete())

    def set_prometheus_frr_exporter_listen_address(self, address: str) -> "ServiceMonitoringBatchBuilder":
        return self.add_set(self.m.get_prometheus_frr_exporter_listen_address(address))

    def delete_prometheus_frr_exporter_listen_address(self, address: str) -> "ServiceMonitoringBatchBuilder":
        return self.add_delete(self.m.get_prometheus_frr_exporter_listen_address_delete(address))

    def delete_prometheus_frr_exporter_all_listen_addresses(self) -> "ServiceMonitoringBatchBuilder":
        return self.add_delete(self.m.get_prometheus_frr_exporter_all_listen_addresses_delete())

    def set_prometheus_frr_exporter_vrf(self, vrf: str) -> "ServiceMonitoringBatchBuilder":
        return self.add_set(self.m.get_prometheus_frr_exporter_vrf(vrf))

    def delete_prometheus_frr_exporter_vrf(self) -> "ServiceMonitoringBatchBuilder":
        return self.add_delete(self.m.get_prometheus_frr_exporter_vrf_delete())

    # Blackbox exporter — top-level
    def delete_prometheus_blackbox_exporter(self) -> "ServiceMonitoringBatchBuilder":
        return self.add_delete(self.m.get_prometheus_blackbox_exporter_delete())

    def set_prometheus_blackbox_exporter_port(self, port: str) -> "ServiceMonitoringBatchBuilder":
        return self.add_set(self.m.get_prometheus_blackbox_exporter_port(port))

    def delete_prometheus_blackbox_exporter_port(self) -> "ServiceMonitoringBatchBuilder":
        return self.add_delete(self.m.get_prometheus_blackbox_exporter_port_delete())

    def set_prometheus_blackbox_exporter_listen_address(self, address: str) -> "ServiceMonitoringBatchBuilder":
        return self.add_set(self.m.get_prometheus_blackbox_exporter_listen_address(address))

    def delete_prometheus_blackbox_exporter_listen_address(self, address: str) -> "ServiceMonitoringBatchBuilder":
        return self.add_delete(self.m.get_prometheus_blackbox_exporter_listen_address_delete(address))

    def delete_prometheus_blackbox_exporter_all_listen_addresses(self) -> "ServiceMonitoringBatchBuilder":
        return self.add_delete(self.m.get_prometheus_blackbox_exporter_all_listen_addresses_delete())

    def set_prometheus_blackbox_exporter_vrf(self, vrf: str) -> "ServiceMonitoringBatchBuilder":
        return self.add_set(self.m.get_prometheus_blackbox_exporter_vrf(vrf))

    def delete_prometheus_blackbox_exporter_vrf(self) -> "ServiceMonitoringBatchBuilder":
        return self.add_delete(self.m.get_prometheus_blackbox_exporter_vrf_delete())

    # Blackbox — ICMP module
    def delete_prometheus_blackbox_icmp_module(self, name: str) -> "ServiceMonitoringBatchBuilder":
        return self.add_delete(self.m.get_prometheus_blackbox_icmp_module_delete(name))

    def set_prometheus_blackbox_icmp_preferred_ip_protocol(self, name: str, protocol: str) -> "ServiceMonitoringBatchBuilder":
        return self.add_set(self.m.get_prometheus_blackbox_icmp_preferred_ip_protocol(name, protocol))

    def delete_prometheus_blackbox_icmp_preferred_ip_protocol(self, name: str) -> "ServiceMonitoringBatchBuilder":
        return self.add_delete(self.m.get_prometheus_blackbox_icmp_preferred_ip_protocol_delete(name))

    def set_prometheus_blackbox_icmp_ip_protocol_fallback(self, name: str) -> "ServiceMonitoringBatchBuilder":
        return self.add_set(self.m.get_prometheus_blackbox_icmp_ip_protocol_fallback(name))

    def delete_prometheus_blackbox_icmp_ip_protocol_fallback(self, name: str) -> "ServiceMonitoringBatchBuilder":
        return self.add_delete(self.m.get_prometheus_blackbox_icmp_ip_protocol_fallback(name))

    def set_prometheus_blackbox_icmp_timeout(self, name: str, timeout: str) -> "ServiceMonitoringBatchBuilder":
        return self.add_set(self.m.get_prometheus_blackbox_icmp_timeout(name, timeout))

    def delete_prometheus_blackbox_icmp_timeout(self, name: str) -> "ServiceMonitoringBatchBuilder":
        return self.add_delete(self.m.get_prometheus_blackbox_icmp_timeout_delete(name))

    # Blackbox — DNS module
    def delete_prometheus_blackbox_dns_module(self, name: str) -> "ServiceMonitoringBatchBuilder":
        return self.add_delete(self.m.get_prometheus_blackbox_dns_module_delete(name))

    def set_prometheus_blackbox_dns_preferred_ip_protocol(self, name: str, protocol: str) -> "ServiceMonitoringBatchBuilder":
        return self.add_set(self.m.get_prometheus_blackbox_dns_preferred_ip_protocol(name, protocol))

    def delete_prometheus_blackbox_dns_preferred_ip_protocol(self, name: str) -> "ServiceMonitoringBatchBuilder":
        return self.add_delete(self.m.get_prometheus_blackbox_dns_preferred_ip_protocol_delete(name))

    def set_prometheus_blackbox_dns_ip_protocol_fallback(self, name: str) -> "ServiceMonitoringBatchBuilder":
        return self.add_set(self.m.get_prometheus_blackbox_dns_ip_protocol_fallback(name))

    def delete_prometheus_blackbox_dns_ip_protocol_fallback(self, name: str) -> "ServiceMonitoringBatchBuilder":
        return self.add_delete(self.m.get_prometheus_blackbox_dns_ip_protocol_fallback(name))

    def set_prometheus_blackbox_dns_timeout(self, name: str, timeout: str) -> "ServiceMonitoringBatchBuilder":
        return self.add_set(self.m.get_prometheus_blackbox_dns_timeout(name, timeout))

    def delete_prometheus_blackbox_dns_timeout(self, name: str) -> "ServiceMonitoringBatchBuilder":
        return self.add_delete(self.m.get_prometheus_blackbox_dns_timeout_delete(name))

    def set_prometheus_blackbox_dns_query_name(self, name: str, query_name: str) -> "ServiceMonitoringBatchBuilder":
        return self.add_set(self.m.get_prometheus_blackbox_dns_query_name(name, query_name))

    def delete_prometheus_blackbox_dns_query_name(self, name: str) -> "ServiceMonitoringBatchBuilder":
        return self.add_delete(self.m.get_prometheus_blackbox_dns_query_name_delete(name))

    def set_prometheus_blackbox_dns_query_type(self, name: str, query_type: str) -> "ServiceMonitoringBatchBuilder":
        return self.add_set(self.m.get_prometheus_blackbox_dns_query_type(name, query_type))

    def delete_prometheus_blackbox_dns_query_type(self, name: str) -> "ServiceMonitoringBatchBuilder":
        return self.add_delete(self.m.get_prometheus_blackbox_dns_query_type_delete(name))

    # -----------------------------------------------------------------------
    # Network Event logger (1.5 only)
    # -----------------------------------------------------------------------

    def delete_network_event(self) -> "ServiceMonitoringBatchBuilder":
        return self.add_delete(self.m.get_network_event_delete())

    def set_network_event_log_level(self, level: str) -> "ServiceMonitoringBatchBuilder":
        return self.add_set(self.m.get_network_event_log_level(level))

    def delete_network_event_log_level(self) -> "ServiceMonitoringBatchBuilder":
        return self.add_delete(self.m.get_network_event_log_level_delete())

    def set_network_event_queue_size(self, size: str) -> "ServiceMonitoringBatchBuilder":
        return self.add_set(self.m.get_network_event_queue_size(size))

    def delete_network_event_queue_size(self) -> "ServiceMonitoringBatchBuilder":
        return self.add_delete(self.m.get_network_event_queue_size_delete())

    def set_network_event_event(self, event_type: str) -> "ServiceMonitoringBatchBuilder":
        """Enable a network event type (addr, link, neigh, route, rule)."""
        return self.add_set(self.m.get_network_event_event(event_type))

    def delete_network_event_event(self, event_type: str) -> "ServiceMonitoringBatchBuilder":
        """Disable a specific network event type."""
        return self.add_delete(self.m.get_network_event_event(event_type))

    def delete_network_event_all_events(self) -> "ServiceMonitoringBatchBuilder":
        return self.add_delete(self.m.get_network_event_all_events_delete())
