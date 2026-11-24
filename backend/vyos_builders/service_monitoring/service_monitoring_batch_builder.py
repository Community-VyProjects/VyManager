"""Service monitoring batch builder.

Config tree: service monitoring. telegraf and zabbix-agent exist on both labs.
prometheus, network-event, telegraf frr-metrics and global-tag, and zabbix-agent
authentication and vrf exist only on 1.5; those ops go through the mapper's
version gate and raise ValueError elsewhere.
"""

from typing import Any, Dict, List, cast

from vyos_mappers import CommandMapperRegistry
from vyos_mappers.service_monitoring import ServiceMonitoringMapper
from vyos_builders.base import BatchBuilder

PROMETHEUS = "prometheus"
NETWORK_EVENT = "network-event"
FRR_METRICS = "telegraf frr-metrics"
GLOBAL_TAG = "telegraf global-tag"
ZABBIX_AUTH = "zabbix-agent authentication"
ZABBIX_VRF = "zabbix-agent vrf"


class ServiceMonitoringBatchBuilder(BatchBuilder):
    def __init__(self, version: str):
        super().__init__(version)
        self.m = cast(
            ServiceMonitoringMapper,
            CommandMapperRegistry.get_mapper("service_monitoring", version),
        )

    # =========================================================================
    # Core
    # =========================================================================

    def _versioned_path(self, node: str, method: str, *args: Any) -> List[str]:
        """Path for a node only one VyOS version has; ValueError elsewhere."""
        self.m.require_node(node)
        return getattr(self.m, method)(*args)

    # =========================================================================
    # Capabilities
    # =========================================================================

    def get_capabilities(self) -> Dict[str, Any]:
        nodes = self.m.versioned_nodes()
        return {
            "features": {
                "telegraf": {
                    "supported": True,
                    "outputs": {
                        "influxdb": {"supported": True, "default_port": 8086},
                        "loki": {"supported": True, "default_port": 3100},
                        "splunk": {"supported": True},
                        "azure_data_explorer": {
                            "supported": True,
                            "group_metrics_values": self.m.group_metrics_values(),
                        },
                        "prometheus_client": {
                            "supported": True,
                            "default_port": 9273,
                            "metric_version_values": self.m.metric_version_values(),
                        },
                    },
                    "source_values": self.m.source_values(),
                    "vrf": {"supported": True},
                    "frr_metrics": {"supported": FRR_METRICS in nodes},
                    "global_tag": {"supported": GLOBAL_TAG in nodes},
                },
                "zabbix_agent": {
                    "supported": True,
                    "default_port": 10050,
                    "auth_modes": self.m.zabbix_auth_modes(),
                    "vrf": {"supported": ZABBIX_VRF in nodes},
                    "log_debug_levels": self.m.debug_level_values(),
                    "limits": {
                        "buffer_flush_interval": {"min": 1, "max": 3600, "default": 5},
                        "buffer_size": {"min": 2, "max": 65535, "default": 100},
                    },
                    "timeout": {"min": 1, "max": 30, "default": 3},
                },
                "prometheus": {
                    "supported": PROMETHEUS in nodes,
                    "exporters": {
                        "node_exporter": {"default_port": 9100},
                        "frr_exporter": {
                            "default_port": 9342,
                            "collectors": self.m.frr_exporter_collectors(),
                            "bgp_options": self.m.frr_exporter_bgp_options(),
                            "peer_description_values": self.m.frr_exporter_peer_description_values(),
                        },
                        "blackbox_exporter": {
                            "default_port": 9115,
                            "preferred_ip_protocol_values": self.m.preferred_ip_protocol_values(),
                            "dns_query_types": self.m.dns_query_types(),
                        },
                    },
                },
                "network_event": {
                    "supported": NETWORK_EVENT in nodes,
                    "log_level_values": self.m.network_event_log_levels(),
                    "event_types": self.m.network_event_types(),
                    "queue_size": {"min": 100, "max": 2147483647},
                },
            },
        }

    # =========================================================================
    # Global
    # =========================================================================

    def delete_service_monitoring(self) -> "ServiceMonitoringBatchBuilder":
        """Delete the entire service monitoring configuration."""
        return self.add_delete(self.m.get_delete())

    # =========================================================================
    # Telegraf — top-level
    # =========================================================================

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

    def set_telegraf_frr_metrics(self) -> "ServiceMonitoringBatchBuilder":
        """Relay frr-exporter metrics; verify needs prometheus frr-exporter in the same VRF."""
        return self.add_set(self._versioned_path(FRR_METRICS, "get_telegraf_frr_metrics"))

    def delete_telegraf_frr_metrics(self) -> "ServiceMonitoringBatchBuilder":
        return self.add_delete(self._versioned_path(FRR_METRICS, "get_telegraf_frr_metrics"))

    def set_telegraf_global_tag(self, tag: str, value: str) -> "ServiceMonitoringBatchBuilder":
        return self.add_set(self._versioned_path(GLOBAL_TAG, "get_telegraf_global_tag", tag, value))

    def delete_telegraf_global_tag(self, tag: str) -> "ServiceMonitoringBatchBuilder":
        return self.add_delete(self._versioned_path(GLOBAL_TAG, "get_telegraf_global_tag_delete", tag))

    def delete_telegraf_all_global_tags(self) -> "ServiceMonitoringBatchBuilder":
        return self.add_delete(self._versioned_path(GLOBAL_TAG, "get_telegraf_all_global_tags_delete"))

    # -------------------------------------------------------------------------
    # Telegraf — InfluxDB
    # -------------------------------------------------------------------------

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

    # -------------------------------------------------------------------------
    # Telegraf — Loki
    # -------------------------------------------------------------------------

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

    def delete_telegraf_loki_auth(self) -> "ServiceMonitoringBatchBuilder":
        """Clear Loki authentication; verify needs username and password together."""
        return self.add_delete(self.m.get_telegraf_loki_auth_delete())

    def set_telegraf_loki_auth_username(self, username: str) -> "ServiceMonitoringBatchBuilder":
        return self.add_set(self.m.get_telegraf_loki_auth_username(username))

    def delete_telegraf_loki_auth_username(self) -> "ServiceMonitoringBatchBuilder":
        return self.add_delete(self.m.get_telegraf_loki_auth_username_delete())

    def set_telegraf_loki_auth_password(self, password: str) -> "ServiceMonitoringBatchBuilder":
        return self.add_set(self.m.get_telegraf_loki_auth_password(password))

    def delete_telegraf_loki_auth_password(self) -> "ServiceMonitoringBatchBuilder":
        return self.add_delete(self.m.get_telegraf_loki_auth_password_delete())

    # -------------------------------------------------------------------------
    # Telegraf — Splunk
    # -------------------------------------------------------------------------

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

    # -------------------------------------------------------------------------
    # Telegraf — Azure Data Explorer
    # -------------------------------------------------------------------------

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

    # -------------------------------------------------------------------------
    # Telegraf — Prometheus client
    # -------------------------------------------------------------------------

    def set_telegraf_prometheus_client(self) -> "ServiceMonitoringBatchBuilder":
        """Enable the prometheus-client output with its defaults (the node commits bare)."""
        return self.add_set(self.m.get_telegraf_prometheus_client())

    def delete_telegraf_prometheus_client(self) -> "ServiceMonitoringBatchBuilder":
        return self.add_delete(self.m.get_telegraf_prometheus_client())

    def set_telegraf_prometheus_client_port(self, port: str) -> "ServiceMonitoringBatchBuilder":
        return self.add_set(self.m.get_telegraf_prometheus_client_port(port))

    def delete_telegraf_prometheus_client_port(self) -> "ServiceMonitoringBatchBuilder":
        return self.add_delete(self.m.get_telegraf_prometheus_client_port_delete())

    def set_telegraf_prometheus_client_listen_address(self, address: str) -> "ServiceMonitoringBatchBuilder":
        return self.add_set(self.m.get_telegraf_prometheus_client_listen_address(address))

    def delete_telegraf_prometheus_client_listen_address(self) -> "ServiceMonitoringBatchBuilder":
        return self.add_delete(self.m.get_telegraf_prometheus_client_listen_address_delete())

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

    # =========================================================================
    # Zabbix Agent
    # =========================================================================

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

    def set_zabbix_vrf(self, vrf: str) -> "ServiceMonitoringBatchBuilder":
        return self.add_set(self._versioned_path(ZABBIX_VRF, "get_zabbix_vrf", vrf))

    def delete_zabbix_vrf(self) -> "ServiceMonitoringBatchBuilder":
        return self.add_delete(self._versioned_path(ZABBIX_VRF, "get_zabbix_vrf_delete"))

    def delete_zabbix_auth(self) -> "ServiceMonitoringBatchBuilder":
        """Clear zabbix-agent authentication (mode and PSK)."""
        return self.add_delete(self._versioned_path(ZABBIX_AUTH, "get_zabbix_auth_delete"))

    def set_zabbix_auth_mode(self, mode: str) -> "ServiceMonitoringBatchBuilder":
        return self.add_set(self._versioned_path(ZABBIX_AUTH, "get_zabbix_auth_mode", mode))

    def delete_zabbix_auth_mode(self) -> "ServiceMonitoringBatchBuilder":
        return self.add_delete(self._versioned_path(ZABBIX_AUTH, "get_zabbix_auth_mode_delete"))

    def set_zabbix_auth_psk_id(self, psk_id: str) -> "ServiceMonitoringBatchBuilder":
        return self.add_set(self._versioned_path(ZABBIX_AUTH, "get_zabbix_auth_psk_id", psk_id))

    def delete_zabbix_auth_psk_id(self) -> "ServiceMonitoringBatchBuilder":
        return self.add_delete(self._versioned_path(ZABBIX_AUTH, "get_zabbix_auth_psk_id_delete"))

    def set_zabbix_auth_psk_secret(self, secret: str) -> "ServiceMonitoringBatchBuilder":
        return self.add_set(self._versioned_path(ZABBIX_AUTH, "get_zabbix_auth_psk_secret", secret))

    def delete_zabbix_auth_psk_secret(self) -> "ServiceMonitoringBatchBuilder":
        return self.add_delete(self._versioned_path(ZABBIX_AUTH, "get_zabbix_auth_psk_secret_delete"))

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

    # =========================================================================
    # Prometheus exporters (1.5 only)
    # =========================================================================

    def delete_prometheus(self) -> "ServiceMonitoringBatchBuilder":
        return self.add_delete(self._versioned_path(PROMETHEUS, "get_prometheus_delete"))

    # Node exporter
    def set_prometheus_node_exporter(self) -> "ServiceMonitoringBatchBuilder":
        """Enable node-exporter with its defaults (the node commits bare)."""
        return self.add_set(self._versioned_path(PROMETHEUS, "get_prometheus_node_exporter"))

    def delete_prometheus_node_exporter(self) -> "ServiceMonitoringBatchBuilder":
        return self.add_delete(self._versioned_path(PROMETHEUS, "get_prometheus_node_exporter"))

    def set_prometheus_node_exporter_port(self, port: str) -> "ServiceMonitoringBatchBuilder":
        return self.add_set(self._versioned_path(PROMETHEUS, "get_prometheus_node_exporter_port", port))

    def delete_prometheus_node_exporter_port(self) -> "ServiceMonitoringBatchBuilder":
        return self.add_delete(self._versioned_path(PROMETHEUS, "get_prometheus_node_exporter_port_delete"))

    def set_prometheus_node_exporter_listen_address(self, address: str) -> "ServiceMonitoringBatchBuilder":
        return self.add_set(self._versioned_path(PROMETHEUS, "get_prometheus_node_exporter_listen_address", address))

    def delete_prometheus_node_exporter_listen_address(self, address: str) -> "ServiceMonitoringBatchBuilder":
        return self.add_delete(self._versioned_path(PROMETHEUS, "get_prometheus_node_exporter_listen_address", address))

    def delete_prometheus_node_exporter_all_listen_addresses(self) -> "ServiceMonitoringBatchBuilder":
        return self.add_delete(self._versioned_path(PROMETHEUS, "get_prometheus_node_exporter_all_listen_addresses_delete"))

    def set_prometheus_node_exporter_vrf(self, vrf: str) -> "ServiceMonitoringBatchBuilder":
        return self.add_set(self._versioned_path(PROMETHEUS, "get_prometheus_node_exporter_vrf", vrf))

    def delete_prometheus_node_exporter_vrf(self) -> "ServiceMonitoringBatchBuilder":
        return self.add_delete(self._versioned_path(PROMETHEUS, "get_prometheus_node_exporter_vrf_delete"))

    def set_prometheus_node_exporter_textfile_collector(self) -> "ServiceMonitoringBatchBuilder":
        return self.add_set(self._versioned_path(PROMETHEUS, "get_prometheus_node_exporter_textfile_collector"))

    def delete_prometheus_node_exporter_textfile_collector(self) -> "ServiceMonitoringBatchBuilder":
        return self.add_delete(self._versioned_path(PROMETHEUS, "get_prometheus_node_exporter_textfile_collector"))

    # FRR exporter
    def set_prometheus_frr_exporter(self) -> "ServiceMonitoringBatchBuilder":
        """Enable frr-exporter with its defaults (the node commits bare)."""
        return self.add_set(self._versioned_path(PROMETHEUS, "get_prometheus_frr_exporter"))

    def delete_prometheus_frr_exporter(self) -> "ServiceMonitoringBatchBuilder":
        return self.add_delete(self._versioned_path(PROMETHEUS, "get_prometheus_frr_exporter"))

    def set_prometheus_frr_exporter_port(self, port: str) -> "ServiceMonitoringBatchBuilder":
        return self.add_set(self._versioned_path(PROMETHEUS, "get_prometheus_frr_exporter_port", port))

    def delete_prometheus_frr_exporter_port(self) -> "ServiceMonitoringBatchBuilder":
        return self.add_delete(self._versioned_path(PROMETHEUS, "get_prometheus_frr_exporter_port_delete"))

    def set_prometheus_frr_exporter_listen_address(self, address: str) -> "ServiceMonitoringBatchBuilder":
        return self.add_set(self._versioned_path(PROMETHEUS, "get_prometheus_frr_exporter_listen_address", address))

    def delete_prometheus_frr_exporter_listen_address(self, address: str) -> "ServiceMonitoringBatchBuilder":
        return self.add_delete(self._versioned_path(PROMETHEUS, "get_prometheus_frr_exporter_listen_address", address))

    def delete_prometheus_frr_exporter_all_listen_addresses(self) -> "ServiceMonitoringBatchBuilder":
        return self.add_delete(self._versioned_path(PROMETHEUS, "get_prometheus_frr_exporter_all_listen_addresses_delete"))

    def set_prometheus_frr_exporter_vrf(self, vrf: str) -> "ServiceMonitoringBatchBuilder":
        return self.add_set(self._versioned_path(PROMETHEUS, "get_prometheus_frr_exporter_vrf", vrf))

    def delete_prometheus_frr_exporter_vrf(self) -> "ServiceMonitoringBatchBuilder":
        return self.add_delete(self._versioned_path(PROMETHEUS, "get_prometheus_frr_exporter_vrf_delete"))

    # FRR exporter — collectors
    def set_prometheus_frr_exporter_collector(self, collector: str) -> "ServiceMonitoringBatchBuilder":
        return self.add_set(self._versioned_path(PROMETHEUS, "get_prometheus_frr_exporter_collector", collector))

    def delete_prometheus_frr_exporter_collector(self, collector: str) -> "ServiceMonitoringBatchBuilder":
        return self.add_delete(self._versioned_path(PROMETHEUS, "get_prometheus_frr_exporter_collector", collector))

    def set_prometheus_frr_exporter_bgp_option(self, option: str) -> "ServiceMonitoringBatchBuilder":
        return self.add_set(self._versioned_path(PROMETHEUS, "get_prometheus_frr_exporter_bgp_option", option))

    def delete_prometheus_frr_exporter_bgp_option(self, option: str) -> "ServiceMonitoringBatchBuilder":
        return self.add_delete(self._versioned_path(PROMETHEUS, "get_prometheus_frr_exporter_bgp_option", option))

    def set_prometheus_frr_exporter_bgp_peer_description(self, value: str) -> "ServiceMonitoringBatchBuilder":
        return self.add_set(self._versioned_path(
            PROMETHEUS, "get_prometheus_frr_exporter_bgp_peer_description", value,
        ))

    def delete_prometheus_frr_exporter_bgp_peer_description(self) -> "ServiceMonitoringBatchBuilder":
        return self.add_delete(self._versioned_path(
            PROMETHEUS, "get_prometheus_frr_exporter_bgp_peer_description_delete",
        ))

    def set_prometheus_frr_exporter_ospf_instance(self, instance: str) -> "ServiceMonitoringBatchBuilder":
        return self.add_set(self._versioned_path(PROMETHEUS, "get_prometheus_frr_exporter_ospf_instance", instance))

    def delete_prometheus_frr_exporter_ospf_instance(self, instance: str) -> "ServiceMonitoringBatchBuilder":
        return self.add_delete(self._versioned_path(PROMETHEUS, "get_prometheus_frr_exporter_ospf_instance", instance))

    def delete_prometheus_frr_exporter_all_ospf_instances(self) -> "ServiceMonitoringBatchBuilder":
        return self.add_delete(self._versioned_path(
            PROMETHEUS, "get_prometheus_frr_exporter_all_ospf_instances_delete",
        ))

    # Blackbox exporter
    def set_prometheus_blackbox_exporter(self) -> "ServiceMonitoringBatchBuilder":
        """Enable blackbox-exporter with its defaults (the node commits bare)."""
        return self.add_set(self._versioned_path(PROMETHEUS, "get_prometheus_blackbox_exporter"))

    def delete_prometheus_blackbox_exporter(self) -> "ServiceMonitoringBatchBuilder":
        return self.add_delete(self._versioned_path(PROMETHEUS, "get_prometheus_blackbox_exporter"))

    def set_prometheus_blackbox_exporter_port(self, port: str) -> "ServiceMonitoringBatchBuilder":
        return self.add_set(self._versioned_path(PROMETHEUS, "get_prometheus_blackbox_exporter_port", port))

    def delete_prometheus_blackbox_exporter_port(self) -> "ServiceMonitoringBatchBuilder":
        return self.add_delete(self._versioned_path(PROMETHEUS, "get_prometheus_blackbox_exporter_port_delete"))

    def set_prometheus_blackbox_exporter_listen_address(self, address: str) -> "ServiceMonitoringBatchBuilder":
        return self.add_set(self._versioned_path(PROMETHEUS, "get_prometheus_blackbox_exporter_listen_address", address))

    def delete_prometheus_blackbox_exporter_listen_address(self, address: str) -> "ServiceMonitoringBatchBuilder":
        return self.add_delete(self._versioned_path(PROMETHEUS, "get_prometheus_blackbox_exporter_listen_address", address))

    def delete_prometheus_blackbox_exporter_all_listen_addresses(self) -> "ServiceMonitoringBatchBuilder":
        return self.add_delete(self._versioned_path(PROMETHEUS, "get_prometheus_blackbox_exporter_all_listen_addresses_delete"))

    def set_prometheus_blackbox_exporter_vrf(self, vrf: str) -> "ServiceMonitoringBatchBuilder":
        return self.add_set(self._versioned_path(PROMETHEUS, "get_prometheus_blackbox_exporter_vrf", vrf))

    def delete_prometheus_blackbox_exporter_vrf(self) -> "ServiceMonitoringBatchBuilder":
        return self.add_delete(self._versioned_path(PROMETHEUS, "get_prometheus_blackbox_exporter_vrf_delete"))

    # Blackbox — ICMP module
    def set_prometheus_blackbox_icmp_module(self, name: str) -> "ServiceMonitoringBatchBuilder":
        """Create an ICMP module with its defaults (the tag commits bare)."""
        return self.add_set(self._versioned_path(PROMETHEUS, "get_prometheus_blackbox_module", "icmp", name))

    def delete_prometheus_blackbox_icmp_module(self, name: str) -> "ServiceMonitoringBatchBuilder":
        return self.add_delete(self._versioned_path(PROMETHEUS, "get_prometheus_blackbox_module", "icmp", name))

    def set_prometheus_blackbox_icmp_preferred_ip_protocol(self, name: str, protocol: str) -> "ServiceMonitoringBatchBuilder":
        return self.add_set(self._versioned_path(
            PROMETHEUS, "get_prometheus_blackbox_module_preferred_ip_protocol", "icmp", name, protocol,
        ))

    def delete_prometheus_blackbox_icmp_preferred_ip_protocol(self, name: str) -> "ServiceMonitoringBatchBuilder":
        return self.add_delete(self._versioned_path(
            PROMETHEUS, "get_prometheus_blackbox_module_preferred_ip_protocol_delete", "icmp", name,
        ))

    def set_prometheus_blackbox_icmp_ip_protocol_fallback(self, name: str) -> "ServiceMonitoringBatchBuilder":
        return self.add_set(self._versioned_path(
            PROMETHEUS, "get_prometheus_blackbox_module_ip_protocol_fallback", "icmp", name,
        ))

    def delete_prometheus_blackbox_icmp_ip_protocol_fallback(self, name: str) -> "ServiceMonitoringBatchBuilder":
        return self.add_delete(self._versioned_path(
            PROMETHEUS, "get_prometheus_blackbox_module_ip_protocol_fallback", "icmp", name,
        ))

    def set_prometheus_blackbox_icmp_timeout(self, name: str, timeout: str) -> "ServiceMonitoringBatchBuilder":
        return self.add_set(self._versioned_path(
            PROMETHEUS, "get_prometheus_blackbox_module_timeout", "icmp", name, timeout,
        ))

    def delete_prometheus_blackbox_icmp_timeout(self, name: str) -> "ServiceMonitoringBatchBuilder":
        return self.add_delete(self._versioned_path(
            PROMETHEUS, "get_prometheus_blackbox_module_timeout_delete", "icmp", name,
        ))

    # Blackbox — DNS module
    def delete_prometheus_blackbox_dns_module(self, name: str) -> "ServiceMonitoringBatchBuilder":
        return self.add_delete(self._versioned_path(PROMETHEUS, "get_prometheus_blackbox_module", "dns", name))

    def set_prometheus_blackbox_dns_preferred_ip_protocol(self, name: str, protocol: str) -> "ServiceMonitoringBatchBuilder":
        return self.add_set(self._versioned_path(
            PROMETHEUS, "get_prometheus_blackbox_module_preferred_ip_protocol", "dns", name, protocol,
        ))

    def delete_prometheus_blackbox_dns_preferred_ip_protocol(self, name: str) -> "ServiceMonitoringBatchBuilder":
        return self.add_delete(self._versioned_path(
            PROMETHEUS, "get_prometheus_blackbox_module_preferred_ip_protocol_delete", "dns", name,
        ))

    def set_prometheus_blackbox_dns_ip_protocol_fallback(self, name: str) -> "ServiceMonitoringBatchBuilder":
        return self.add_set(self._versioned_path(
            PROMETHEUS, "get_prometheus_blackbox_module_ip_protocol_fallback", "dns", name,
        ))

    def delete_prometheus_blackbox_dns_ip_protocol_fallback(self, name: str) -> "ServiceMonitoringBatchBuilder":
        return self.add_delete(self._versioned_path(
            PROMETHEUS, "get_prometheus_blackbox_module_ip_protocol_fallback", "dns", name,
        ))

    def set_prometheus_blackbox_dns_timeout(self, name: str, timeout: str) -> "ServiceMonitoringBatchBuilder":
        return self.add_set(self._versioned_path(
            PROMETHEUS, "get_prometheus_blackbox_module_timeout", "dns", name, timeout,
        ))

    def delete_prometheus_blackbox_dns_timeout(self, name: str) -> "ServiceMonitoringBatchBuilder":
        return self.add_delete(self._versioned_path(
            PROMETHEUS, "get_prometheus_blackbox_module_timeout_delete", "dns", name,
        ))

    def set_prometheus_blackbox_dns_query_name(self, name: str, query_name: str) -> "ServiceMonitoringBatchBuilder":
        return self.add_set(self._versioned_path(
            PROMETHEUS, "get_prometheus_blackbox_dns_query_name", name, query_name,
        ))

    def delete_prometheus_blackbox_dns_query_name(self, name: str) -> "ServiceMonitoringBatchBuilder":
        return self.add_delete(self._versioned_path(
            PROMETHEUS, "get_prometheus_blackbox_dns_query_name_delete", name,
        ))

    def set_prometheus_blackbox_dns_query_type(self, name: str, query_type: str) -> "ServiceMonitoringBatchBuilder":
        return self.add_set(self._versioned_path(
            PROMETHEUS, "get_prometheus_blackbox_dns_query_type", name, query_type,
        ))

    def delete_prometheus_blackbox_dns_query_type(self, name: str) -> "ServiceMonitoringBatchBuilder":
        return self.add_delete(self._versioned_path(
            PROMETHEUS, "get_prometheus_blackbox_dns_query_type_delete", name,
        ))

    # =========================================================================
    # Network Event logger (1.5 only)
    # =========================================================================

    def set_network_event(self) -> "ServiceMonitoringBatchBuilder":
        """Enable the network event logger with its defaults (the node commits bare)."""
        return self.add_set(self._versioned_path(NETWORK_EVENT, "get_network_event"))

    def delete_network_event(self) -> "ServiceMonitoringBatchBuilder":
        return self.add_delete(self._versioned_path(NETWORK_EVENT, "get_network_event"))

    def set_network_event_log_level(self, level: str) -> "ServiceMonitoringBatchBuilder":
        return self.add_set(self._versioned_path(NETWORK_EVENT, "get_network_event_log_level", level))

    def delete_network_event_log_level(self) -> "ServiceMonitoringBatchBuilder":
        return self.add_delete(self._versioned_path(NETWORK_EVENT, "get_network_event_log_level_delete"))

    def set_network_event_queue_size(self, size: str) -> "ServiceMonitoringBatchBuilder":
        return self.add_set(self._versioned_path(NETWORK_EVENT, "get_network_event_queue_size", size))

    def delete_network_event_queue_size(self) -> "ServiceMonitoringBatchBuilder":
        return self.add_delete(self._versioned_path(NETWORK_EVENT, "get_network_event_queue_size_delete"))

    def set_network_event_event(self, event_type: str) -> "ServiceMonitoringBatchBuilder":
        return self.add_set(self._versioned_path(NETWORK_EVENT, "get_network_event_event", event_type))

    def delete_network_event_event(self, event_type: str) -> "ServiceMonitoringBatchBuilder":
        return self.add_delete(self._versioned_path(NETWORK_EVENT, "get_network_event_event", event_type))

    def delete_network_event_all_events(self) -> "ServiceMonitoringBatchBuilder":
        return self.add_delete(self._versioned_path(NETWORK_EVENT, "get_network_event_all_events_delete"))
