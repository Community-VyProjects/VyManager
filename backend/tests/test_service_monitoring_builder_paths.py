"""Service monitoring builder ops write the lab CLI paths on each version.

Every builder op has a row. Rows in V15_ONLY are prometheus, network-event,
telegraf frr-metrics and global-tag, and zabbix-agent authentication and vrf,
which the 1.4 lab does not have: on 1.4 those ops raise ValueError (the batch
router turns that into a 400).
"""

import inspect

import pytest

from vyos_builders.service_monitoring import ServiceMonitoringBatchBuilder
from vyos_mappers import CommandMapperRegistry
from vyos_mappers.service_monitoring import ServiceMonitoringMapper
from vyos_mappers.service_monitoring.service_monitoring_versions import (
    ServiceMonitoringMapperV1_5,
)

BASE = ["service", "monitoring"]

BOTH = [
    ('delete_service_monitoring', (), 'delete', []),
    ('delete_telegraf', (), 'delete', ['telegraf']),
    ('delete_telegraf_all_sources', (), 'delete', ['telegraf', 'source']),
    ('delete_telegraf_azure', (), 'delete', ['telegraf', 'azure-data-explorer']),
    ('delete_telegraf_azure_auth_client_id', (), 'delete', ['telegraf', 'azure-data-explorer', 'authentication', 'client-id']),
    ('delete_telegraf_azure_auth_client_secret', (), 'delete', ['telegraf', 'azure-data-explorer', 'authentication', 'client-secret']),
    ('delete_telegraf_azure_auth_tenant_id', (), 'delete', ['telegraf', 'azure-data-explorer', 'authentication', 'tenant-id']),
    ('delete_telegraf_azure_database', (), 'delete', ['telegraf', 'azure-data-explorer', 'database']),
    ('delete_telegraf_azure_group_metrics', (), 'delete', ['telegraf', 'azure-data-explorer', 'group-metrics']),
    ('delete_telegraf_azure_table', (), 'delete', ['telegraf', 'azure-data-explorer', 'table']),
    ('delete_telegraf_azure_url', (), 'delete', ['telegraf', 'azure-data-explorer', 'url']),
    ('delete_telegraf_influxdb', (), 'delete', ['telegraf', 'influxdb']),
    ('delete_telegraf_influxdb_auth_organization', (), 'delete', ['telegraf', 'influxdb', 'authentication', 'organization']),
    ('delete_telegraf_influxdb_auth_token', (), 'delete', ['telegraf', 'influxdb', 'authentication', 'token']),
    ('delete_telegraf_influxdb_bucket', (), 'delete', ['telegraf', 'influxdb', 'bucket']),
    ('delete_telegraf_influxdb_port', (), 'delete', ['telegraf', 'influxdb', 'port']),
    ('delete_telegraf_influxdb_url', (), 'delete', ['telegraf', 'influxdb', 'url']),
    ('delete_telegraf_loki', (), 'delete', ['telegraf', 'loki']),
    ('delete_telegraf_loki_auth', (), 'delete', ['telegraf', 'loki', 'authentication']),
    ('delete_telegraf_loki_auth_password', (), 'delete', ['telegraf', 'loki', 'authentication', 'password']),
    ('delete_telegraf_loki_auth_username', (), 'delete', ['telegraf', 'loki', 'authentication', 'username']),
    ('delete_telegraf_loki_metric_name_label', (), 'delete', ['telegraf', 'loki', 'metric-name-label']),
    ('delete_telegraf_loki_port', (), 'delete', ['telegraf', 'loki', 'port']),
    ('delete_telegraf_loki_url', (), 'delete', ['telegraf', 'loki', 'url']),
    ('delete_telegraf_prometheus_client', (), 'delete', ['telegraf', 'prometheus-client']),
    ('delete_telegraf_prometheus_client_all_allow_from', (), 'delete', ['telegraf', 'prometheus-client', 'allow-from']),
    ('delete_telegraf_prometheus_client_allow_from', ('192.0.2.0/24',), 'delete', ['telegraf', 'prometheus-client', 'allow-from', '192.0.2.0/24']),
    ('delete_telegraf_prometheus_client_auth_password', (), 'delete', ['telegraf', 'prometheus-client', 'authentication', 'password']),
    ('delete_telegraf_prometheus_client_auth_username', (), 'delete', ['telegraf', 'prometheus-client', 'authentication', 'username']),
    ('delete_telegraf_prometheus_client_listen_address', (), 'delete', ['telegraf', 'prometheus-client', 'listen-address']),
    ('delete_telegraf_prometheus_client_metric_version', (), 'delete', ['telegraf', 'prometheus-client', 'metric-version']),
    ('delete_telegraf_prometheus_client_port', (), 'delete', ['telegraf', 'prometheus-client', 'port']),
    ('delete_telegraf_source', ('network',), 'delete', ['telegraf', 'source', 'network']),
    ('delete_telegraf_splunk', (), 'delete', ['telegraf', 'splunk']),
    ('delete_telegraf_splunk_auth_insecure', (), 'delete', ['telegraf', 'splunk', 'authentication', 'insecure']),
    ('delete_telegraf_splunk_auth_token', (), 'delete', ['telegraf', 'splunk', 'authentication', 'token']),
    ('delete_telegraf_splunk_url', (), 'delete', ['telegraf', 'splunk', 'url']),
    ('delete_telegraf_vrf', (), 'delete', ['telegraf', 'vrf']),
    ('delete_zabbix', (), 'delete', ['zabbix-agent']),
    ('delete_zabbix_all_listen_addresses', (), 'delete', ['zabbix-agent', 'listen-address']),
    ('delete_zabbix_all_server_active', (), 'delete', ['zabbix-agent', 'server-active']),
    ('delete_zabbix_all_servers', (), 'delete', ['zabbix-agent', 'server']),
    ('delete_zabbix_directory', (), 'delete', ['zabbix-agent', 'directory']),
    ('delete_zabbix_host_name', (), 'delete', ['zabbix-agent', 'host-name']),
    ('delete_zabbix_limits_buffer_flush_interval', (), 'delete', ['zabbix-agent', 'limits', 'buffer-flush-interval']),
    ('delete_zabbix_limits_buffer_size', (), 'delete', ['zabbix-agent', 'limits', 'buffer-size']),
    ('delete_zabbix_listen_address', ('192.0.2.1',), 'delete', ['zabbix-agent', 'listen-address', '192.0.2.1']),
    ('delete_zabbix_log_debug_level', (), 'delete', ['zabbix-agent', 'log', 'debug-level']),
    ('delete_zabbix_log_remote_commands', (), 'delete', ['zabbix-agent', 'log', 'remote-commands']),
    ('delete_zabbix_log_size', (), 'delete', ['zabbix-agent', 'log', 'size']),
    ('delete_zabbix_port', (), 'delete', ['zabbix-agent', 'port']),
    ('delete_zabbix_server', ('192.0.2.9',), 'delete', ['zabbix-agent', 'server', '192.0.2.9']),
    ('delete_zabbix_server_active', ('192.0.2.1',), 'delete', ['zabbix-agent', 'server-active', '192.0.2.1']),
    ('delete_zabbix_server_active_port', ('192.0.2.1',), 'delete', ['zabbix-agent', 'server-active', '192.0.2.1', 'port']),
    ('delete_zabbix_timeout', (), 'delete', ['zabbix-agent', 'timeout']),
    ('set_telegraf_azure_auth_client_id', ('cid',), 'set', ['telegraf', 'azure-data-explorer', 'authentication', 'client-id', 'cid']),
    ('set_telegraf_azure_auth_client_secret', ('sec',), 'set', ['telegraf', 'azure-data-explorer', 'authentication', 'client-secret', 'sec']),
    ('set_telegraf_azure_auth_tenant_id', ('tid',), 'set', ['telegraf', 'azure-data-explorer', 'authentication', 'tenant-id', 'tid']),
    ('set_telegraf_azure_database', ('db1',), 'set', ['telegraf', 'azure-data-explorer', 'database', 'db1']),
    ('set_telegraf_azure_group_metrics', ('single-table',), 'set', ['telegraf', 'azure-data-explorer', 'group-metrics', 'single-table']),
    ('set_telegraf_azure_table', ('t1',), 'set', ['telegraf', 'azure-data-explorer', 'table', 't1']),
    ('set_telegraf_azure_url', ('https://h.example',), 'set', ['telegraf', 'azure-data-explorer', 'url', 'https://h.example']),
    ('set_telegraf_influxdb_auth_organization', ('ops',), 'set', ['telegraf', 'influxdb', 'authentication', 'organization', 'ops']),
    ('set_telegraf_influxdb_auth_token', ('T-tok',), 'set', ['telegraf', 'influxdb', 'authentication', 'token', 'T-tok']),
    ('set_telegraf_influxdb_bucket', ('b1',), 'set', ['telegraf', 'influxdb', 'bucket', 'b1']),
    ('set_telegraf_influxdb_port', ('9000',), 'set', ['telegraf', 'influxdb', 'port', '9000']),
    ('set_telegraf_influxdb_url', ('https://h.example',), 'set', ['telegraf', 'influxdb', 'url', 'https://h.example']),
    ('set_telegraf_loki_auth_password', ('p1',), 'set', ['telegraf', 'loki', 'authentication', 'password', 'p1']),
    ('set_telegraf_loki_auth_username', ('u1',), 'set', ['telegraf', 'loki', 'authentication', 'username', 'u1']),
    ('set_telegraf_loki_metric_name_label', ('name',), 'set', ['telegraf', 'loki', 'metric-name-label', 'name']),
    ('set_telegraf_loki_port', ('9000',), 'set', ['telegraf', 'loki', 'port', '9000']),
    ('set_telegraf_loki_url', ('https://h.example',), 'set', ['telegraf', 'loki', 'url', 'https://h.example']),
    ('set_telegraf_prometheus_client', (), 'set', ['telegraf', 'prometheus-client']),
    ('set_telegraf_prometheus_client_allow_from', ('192.0.2.0/24',), 'set', ['telegraf', 'prometheus-client', 'allow-from', '192.0.2.0/24']),
    ('set_telegraf_prometheus_client_auth_password', ('p1',), 'set', ['telegraf', 'prometheus-client', 'authentication', 'password', 'p1']),
    ('set_telegraf_prometheus_client_auth_username', ('u1',), 'set', ['telegraf', 'prometheus-client', 'authentication', 'username', 'u1']),
    ('set_telegraf_prometheus_client_listen_address', ('192.0.2.1',), 'set', ['telegraf', 'prometheus-client', 'listen-address', '192.0.2.1']),
    ('set_telegraf_prometheus_client_metric_version', ('2',), 'set', ['telegraf', 'prometheus-client', 'metric-version', '2']),
    ('set_telegraf_prometheus_client_port', ('9000',), 'set', ['telegraf', 'prometheus-client', 'port', '9000']),
    ('set_telegraf_source', ('network',), 'set', ['telegraf', 'source', 'network']),
    ('set_telegraf_splunk_auth_insecure', (), 'set', ['telegraf', 'splunk', 'authentication', 'insecure']),
    ('set_telegraf_splunk_auth_token', ('T-tok',), 'set', ['telegraf', 'splunk', 'authentication', 'token', 'T-tok']),
    ('set_telegraf_splunk_url', ('https://h.example',), 'set', ['telegraf', 'splunk', 'url', 'https://h.example']),
    ('set_telegraf_vrf', ('MGMT',), 'set', ['telegraf', 'vrf', 'MGMT']),
    ('set_zabbix_directory', ('/tmp/',), 'set', ['zabbix-agent', 'directory', '/tmp/']),
    ('set_zabbix_host_name', ('probe1',), 'set', ['zabbix-agent', 'host-name', 'probe1']),
    ('set_zabbix_limits_buffer_flush_interval', ('5',), 'set', ['zabbix-agent', 'limits', 'buffer-flush-interval', '5']),
    ('set_zabbix_limits_buffer_size', ('100',), 'set', ['zabbix-agent', 'limits', 'buffer-size', '100']),
    ('set_zabbix_listen_address', ('192.0.2.1',), 'set', ['zabbix-agent', 'listen-address', '192.0.2.1']),
    ('set_zabbix_log_debug_level', ('debug',), 'set', ['zabbix-agent', 'log', 'debug-level', 'debug']),
    ('set_zabbix_log_remote_commands', (), 'set', ['zabbix-agent', 'log', 'remote-commands']),
    ('set_zabbix_log_size', ('100',), 'set', ['zabbix-agent', 'log', 'size', '100']),
    ('set_zabbix_port', ('9000',), 'set', ['zabbix-agent', 'port', '9000']),
    ('set_zabbix_server', ('192.0.2.9',), 'set', ['zabbix-agent', 'server', '192.0.2.9']),
    ('set_zabbix_server_active', ('192.0.2.1',), 'set', ['zabbix-agent', 'server-active', '192.0.2.1']),
    ('set_zabbix_server_active_port', ('192.0.2.1', '9000'), 'set', ['zabbix-agent', 'server-active', '192.0.2.1', 'port', '9000']),
    ('set_zabbix_timeout', ('5',), 'set', ['zabbix-agent', 'timeout', '5']),
]

V15_ONLY = [
    ('delete_network_event', (), 'delete', ['network-event']),
    ('delete_network_event_all_events', (), 'delete', ['network-event', 'event']),
    ('delete_network_event_event', ('link',), 'delete', ['network-event', 'event', 'link']),
    ('delete_network_event_log_level', (), 'delete', ['network-event', 'log-level']),
    ('delete_network_event_queue_size', (), 'delete', ['network-event', 'queue-size']),
    ('delete_prometheus', (), 'delete', ['prometheus']),
    ('delete_prometheus_blackbox_dns_ip_protocol_fallback', ('probe1',), 'delete', ['prometheus', 'blackbox-exporter', 'modules', 'dns', 'name', 'probe1', 'ip-protocol-fallback']),
    ('delete_prometheus_blackbox_dns_module', ('probe1',), 'delete', ['prometheus', 'blackbox-exporter', 'modules', 'dns', 'name', 'probe1']),
    ('delete_prometheus_blackbox_dns_preferred_ip_protocol', ('probe1',), 'delete', ['prometheus', 'blackbox-exporter', 'modules', 'dns', 'name', 'probe1', 'preferred-ip-protocol']),
    ('delete_prometheus_blackbox_dns_query_name', ('probe1',), 'delete', ['prometheus', 'blackbox-exporter', 'modules', 'dns', 'name', 'probe1', 'query-name']),
    ('delete_prometheus_blackbox_dns_query_type', ('probe1',), 'delete', ['prometheus', 'blackbox-exporter', 'modules', 'dns', 'name', 'probe1', 'query-type']),
    ('delete_prometheus_blackbox_dns_timeout', ('probe1',), 'delete', ['prometheus', 'blackbox-exporter', 'modules', 'dns', 'name', 'probe1', 'timeout']),
    ('delete_prometheus_blackbox_exporter', (), 'delete', ['prometheus', 'blackbox-exporter']),
    ('delete_prometheus_blackbox_exporter_all_listen_addresses', (), 'delete', ['prometheus', 'blackbox-exporter', 'listen-address']),
    ('delete_prometheus_blackbox_exporter_listen_address', ('192.0.2.1',), 'delete', ['prometheus', 'blackbox-exporter', 'listen-address', '192.0.2.1']),
    ('delete_prometheus_blackbox_exporter_port', (), 'delete', ['prometheus', 'blackbox-exporter', 'port']),
    ('delete_prometheus_blackbox_exporter_vrf', (), 'delete', ['prometheus', 'blackbox-exporter', 'vrf']),
    ('delete_prometheus_blackbox_icmp_ip_protocol_fallback', ('probe1',), 'delete', ['prometheus', 'blackbox-exporter', 'modules', 'icmp', 'name', 'probe1', 'ip-protocol-fallback']),
    ('delete_prometheus_blackbox_icmp_module', ('probe1',), 'delete', ['prometheus', 'blackbox-exporter', 'modules', 'icmp', 'name', 'probe1']),
    ('delete_prometheus_blackbox_icmp_preferred_ip_protocol', ('probe1',), 'delete', ['prometheus', 'blackbox-exporter', 'modules', 'icmp', 'name', 'probe1', 'preferred-ip-protocol']),
    ('delete_prometheus_blackbox_icmp_timeout', ('probe1',), 'delete', ['prometheus', 'blackbox-exporter', 'modules', 'icmp', 'name', 'probe1', 'timeout']),
    ('delete_prometheus_frr_exporter', (), 'delete', ['prometheus', 'frr-exporter']),
    ('delete_prometheus_frr_exporter_all_listen_addresses', (), 'delete', ['prometheus', 'frr-exporter', 'listen-address']),
    ('delete_prometheus_frr_exporter_listen_address', ('192.0.2.1',), 'delete', ['prometheus', 'frr-exporter', 'listen-address', '192.0.2.1']),
    ('delete_prometheus_frr_exporter_port', (), 'delete', ['prometheus', 'frr-exporter', 'port']),
    ('delete_prometheus_frr_exporter_vrf', (), 'delete', ['prometheus', 'frr-exporter', 'vrf']),
    ('delete_prometheus_node_exporter', (), 'delete', ['prometheus', 'node-exporter']),
    ('delete_prometheus_node_exporter_all_listen_addresses', (), 'delete', ['prometheus', 'node-exporter', 'listen-address']),
    ('delete_prometheus_node_exporter_listen_address', ('192.0.2.1',), 'delete', ['prometheus', 'node-exporter', 'listen-address', '192.0.2.1']),
    ('delete_prometheus_node_exporter_port', (), 'delete', ['prometheus', 'node-exporter', 'port']),
    ('delete_prometheus_node_exporter_textfile_collector', (), 'delete', ['prometheus', 'node-exporter', 'collectors', 'textfile']),
    ('delete_prometheus_node_exporter_vrf', (), 'delete', ['prometheus', 'node-exporter', 'vrf']),
    ('delete_zabbix_auth', (), 'delete', ['zabbix-agent', 'authentication']),
    ('delete_zabbix_auth_mode', (), 'delete', ['zabbix-agent', 'authentication', 'mode']),
    ('delete_zabbix_auth_psk_id', (), 'delete', ['zabbix-agent', 'authentication', 'psk', 'id']),
    ('delete_zabbix_auth_psk_secret', (), 'delete', ['zabbix-agent', 'authentication', 'psk', 'secret']),
    ('set_network_event_event', ('link',), 'set', ['network-event', 'event', 'link']),
    ('set_network_event_log_level', ('debug',), 'set', ['network-event', 'log-level', 'debug']),
    ('set_network_event_queue_size', ('100',), 'set', ['network-event', 'queue-size', '100']),
    ('set_prometheus_blackbox_dns_ip_protocol_fallback', ('probe1',), 'set', ['prometheus', 'blackbox-exporter', 'modules', 'dns', 'name', 'probe1', 'ip-protocol-fallback']),
    ('set_prometheus_blackbox_dns_preferred_ip_protocol', ('probe1', 'ipv4'), 'set', ['prometheus', 'blackbox-exporter', 'modules', 'dns', 'name', 'probe1', 'preferred-ip-protocol', 'ipv4']),
    ('set_prometheus_blackbox_dns_query_name', ('probe1', 'example.com'), 'set', ['prometheus', 'blackbox-exporter', 'modules', 'dns', 'name', 'probe1', 'query-name', 'example.com']),
    ('set_prometheus_blackbox_dns_query_type', ('probe1', 'A'), 'set', ['prometheus', 'blackbox-exporter', 'modules', 'dns', 'name', 'probe1', 'query-type', 'A']),
    ('set_prometheus_blackbox_dns_timeout', ('probe1', '5'), 'set', ['prometheus', 'blackbox-exporter', 'modules', 'dns', 'name', 'probe1', 'timeout', '5']),
    ('set_prometheus_blackbox_exporter_listen_address', ('192.0.2.1',), 'set', ['prometheus', 'blackbox-exporter', 'listen-address', '192.0.2.1']),
    ('set_prometheus_blackbox_exporter_port', ('9000',), 'set', ['prometheus', 'blackbox-exporter', 'port', '9000']),
    ('set_prometheus_blackbox_exporter_vrf', ('MGMT',), 'set', ['prometheus', 'blackbox-exporter', 'vrf', 'MGMT']),
    ('set_prometheus_blackbox_icmp_ip_protocol_fallback', ('probe1',), 'set', ['prometheus', 'blackbox-exporter', 'modules', 'icmp', 'name', 'probe1', 'ip-protocol-fallback']),
    ('set_prometheus_blackbox_icmp_preferred_ip_protocol', ('probe1', 'ipv4'), 'set', ['prometheus', 'blackbox-exporter', 'modules', 'icmp', 'name', 'probe1', 'preferred-ip-protocol', 'ipv4']),
    ('set_prometheus_blackbox_icmp_timeout', ('probe1', '5'), 'set', ['prometheus', 'blackbox-exporter', 'modules', 'icmp', 'name', 'probe1', 'timeout', '5']),
    ('set_prometheus_frr_exporter_listen_address', ('192.0.2.1',), 'set', ['prometheus', 'frr-exporter', 'listen-address', '192.0.2.1']),
    ('set_prometheus_frr_exporter_port', ('9000',), 'set', ['prometheus', 'frr-exporter', 'port', '9000']),
    ('set_prometheus_frr_exporter_vrf', ('MGMT',), 'set', ['prometheus', 'frr-exporter', 'vrf', 'MGMT']),
    ('set_prometheus_node_exporter_listen_address', ('192.0.2.1',), 'set', ['prometheus', 'node-exporter', 'listen-address', '192.0.2.1']),
    ('set_prometheus_node_exporter_port', ('9000',), 'set', ['prometheus', 'node-exporter', 'port', '9000']),
    ('set_prometheus_node_exporter_textfile_collector', (), 'set', ['prometheus', 'node-exporter', 'collectors', 'textfile']),
    ('set_prometheus_node_exporter_vrf', ('MGMT',), 'set', ['prometheus', 'node-exporter', 'vrf', 'MGMT']),
    ('set_zabbix_auth_mode', ('pre-shared-secret',), 'set', ['zabbix-agent', 'authentication', 'mode', 'pre-shared-secret']),
    ('set_zabbix_auth_psk_id', ('id1',), 'set', ['zabbix-agent', 'authentication', 'psk', 'id', 'id1']),
    ('set_zabbix_auth_psk_secret', ('sec',), 'set', ['zabbix-agent', 'authentication', 'psk', 'secret', 'sec']),
    ('delete_prometheus_frr_exporter_all_ospf_instances', (), 'delete', ['prometheus', 'frr-exporter', 'collector', 'ospf-instance']),
    ('delete_prometheus_frr_exporter_bgp_option', ('peer-group',), 'delete', ['prometheus', 'frr-exporter', 'collector', 'bgp', 'peer-group']),
    ('delete_prometheus_frr_exporter_bgp_peer_description', (), 'delete', ['prometheus', 'frr-exporter', 'collector', 'bgp', 'peer-description']),
    ('delete_prometheus_frr_exporter_collector', ('pim',), 'delete', ['prometheus', 'frr-exporter', 'collector', 'pim']),
    ('delete_prometheus_frr_exporter_ospf_instance', ('2',), 'delete', ['prometheus', 'frr-exporter', 'collector', 'ospf-instance', '2']),
    ('delete_telegraf_all_global_tags', (), 'delete', ['telegraf', 'global-tag']),
    ('delete_telegraf_frr_metrics', (), 'delete', ['telegraf', 'frr-metrics']),
    ('delete_telegraf_global_tag', ('site',), 'delete', ['telegraf', 'global-tag', 'site']),
    ('delete_zabbix_vrf', (), 'delete', ['zabbix-agent', 'vrf']),
    ('set_network_event', (), 'set', ['network-event']),
    ('set_prometheus_blackbox_exporter', (), 'set', ['prometheus', 'blackbox-exporter']),
    ('set_prometheus_blackbox_icmp_module', ('probe1',), 'set', ['prometheus', 'blackbox-exporter', 'modules', 'icmp', 'name', 'probe1']),
    ('set_prometheus_frr_exporter', (), 'set', ['prometheus', 'frr-exporter']),
    ('set_prometheus_frr_exporter_bgp_option', ('accept-filtered-prefixes',), 'set', ['prometheus', 'frr-exporter', 'collector', 'bgp', 'accept-filtered-prefixes']),
    ('set_prometheus_frr_exporter_bgp_peer_description', ('plain-text',), 'set', ['prometheus', 'frr-exporter', 'collector', 'bgp', 'peer-description', 'plain-text']),
    ('set_prometheus_frr_exporter_collector', ('bgp-l2-vpn',), 'set', ['prometheus', 'frr-exporter', 'collector', 'bgp-l2-vpn']),
    ('set_prometheus_frr_exporter_ospf_instance', ('2',), 'set', ['prometheus', 'frr-exporter', 'collector', 'ospf-instance', '2']),
    ('set_prometheus_node_exporter', (), 'set', ['prometheus', 'node-exporter']),
    ('set_telegraf_frr_metrics', (), 'set', ['telegraf', 'frr-metrics']),
    ('set_telegraf_global_tag', ('site', 'dc1,rack 4'), 'set', ['telegraf', 'global-tag', 'site', 'value', 'dc1,rack 4']),
    ('set_zabbix_vrf', ('MGMT',), 'set', ['zabbix-agent', 'vrf', 'MGMT']),
]


@pytest.mark.parametrize(
    "op,value",
    [
        ("set_prometheus_frr_exporter_collector", "bgp"),
        ("set_prometheus_frr_exporter_collector", "ospf-instance"),
        ("delete_prometheus_frr_exporter_collector", "junk"),
        ("set_prometheus_frr_exporter_bgp_option", "peer-description"),
        ("delete_prometheus_frr_exporter_bgp_option", "junk"),
        ("set_prometheus_frr_exporter_bgp_peer_description", "xml"),
    ],
)
def test_frr_collector_values_come_from_the_lab_list(op, value):
    """A collector or bgp option outside the lab's child nodes is a ValueError (400), not a path."""
    with pytest.raises(ValueError, match="Unknown frr-exporter"):
        _run("1.5", op, (value,))


def _run(version, op, args):
    builder = ServiceMonitoringBatchBuilder(version)
    getattr(builder, op)(*args)
    return builder.get_operations()


@pytest.mark.parametrize("version", ["1.4", "1.5", "1.5-rolling-202611"])
@pytest.mark.parametrize("op,args,kind,path", BOTH, ids=[row[0] for row in BOTH])
def test_shared_op_paths(version, op, args, kind, path):
    assert _run(version, op, args) == [{"op": kind, "path": BASE + path}]


@pytest.mark.parametrize("op,args,kind,path", V15_ONLY, ids=[row[0] for row in V15_ONLY])
def test_v15_op_paths(op, args, kind, path):
    assert _run("1.5", op, args) == [{"op": kind, "path": BASE + path}]


@pytest.mark.parametrize("op,args,kind,path", V15_ONLY, ids=[row[0] for row in V15_ONLY])
def test_v15_ops_raise_on_1_4(op, args, kind, path):
    with pytest.raises(ValueError, match="is not supported on this device"):
        _run("1.4", op, args)


def test_every_builder_op_has_a_row():
    ops = {
        name
        for name, _ in inspect.getmembers(ServiceMonitoringBatchBuilder, inspect.isfunction)
        if name.startswith(("set_", "delete_", "create_"))
    }
    rows = [row[0] for row in BOTH + V15_ONLY]
    assert len(rows) == len(set(rows))
    assert ops == set(rows)


def test_factory_returns_the_shared_class_on_1_4_only():
    assert type(CommandMapperRegistry.get_mapper("service_monitoring", "1.4")) is ServiceMonitoringMapper
    for version in ("1.5", "1.5-rolling-202611", "latest"):
        mapper = CommandMapperRegistry.get_mapper("service_monitoring", version)
        assert type(mapper) is ServiceMonitoringMapperV1_5


def test_v15_paths_are_not_on_the_shared_class():
    for method in ServiceMonitoringMapper._VERSIONED_NODES.values():
        assert not hasattr(ServiceMonitoringMapper, method)
        assert callable(getattr(ServiceMonitoringMapperV1_5, method))


def test_capabilities_follow_the_mapper(monkeypatch):
    """Support comes from the mapper allowlist, not from the version string."""
    caps = ServiceMonitoringBatchBuilder("1.4").get_capabilities()["features"]
    assert caps["prometheus"]["supported"] is False
    assert caps["network_event"]["supported"] is False
    assert caps["zabbix_agent"]["auth_modes"] == []
    assert caps["network_event"]["event_types"] == []
    assert caps["telegraf"]["frr_metrics"]["supported"] is False
    assert caps["telegraf"]["global_tag"]["supported"] is False
    assert caps["zabbix_agent"]["vrf"]["supported"] is False
    assert caps["prometheus"]["exporters"]["frr_exporter"]["collectors"] == []
    caps = ServiceMonitoringBatchBuilder("1.5").get_capabilities()["features"]
    assert caps["prometheus"]["supported"] is True
    assert caps["network_event"]["supported"] is True
    assert caps["zabbix_agent"]["auth_modes"] == ["pre-shared-secret"]
    assert caps["prometheus"]["exporters"]["blackbox_exporter"]["preferred_ip_protocol_values"] == ["ipv4", "ipv6"]
    assert caps["telegraf"]["frr_metrics"]["supported"] is True
    assert caps["telegraf"]["global_tag"]["supported"] is True
    assert caps["zabbix_agent"]["vrf"]["supported"] is True
    frr = caps["prometheus"]["exporters"]["frr_exporter"]
    assert frr["collectors"] == ["bgp-l2-vpn", "detailed-routes", "pim"]
    assert frr["bgp_options"] == [
        "accept-filtered-prefixes", "advertised-prefixes", "peer-group", "peer-hostname", "peer-type",
    ]
    assert frr["peer_description_values"] == ["json", "plain-text"]

    monkeypatch.setattr(
        CommandMapperRegistry,
        "get_mapper",
        lambda _feature, version: ServiceMonitoringMapperV1_5(version),
    )
    caps = ServiceMonitoringBatchBuilder("1.4").get_capabilities()["features"]
    assert caps["prometheus"]["supported"] is True
    assert caps["zabbix_agent"]["auth_modes"] == ["pre-shared-secret"]
    assert caps["zabbix_agent"]["vrf"]["supported"] is True
    assert caps["telegraf"]["frr_metrics"]["supported"] is True
    assert "version_info" not in ServiceMonitoringBatchBuilder("1.4").get_capabilities()


def test_shared_lists_match_the_lab():
    caps = ServiceMonitoringBatchBuilder("1.4").get_capabilities()["features"]
    assert caps["telegraf"]["source_values"] == [
        "all", "hardware-utilization", "logs", "network", "system", "telegraf",
    ]
    assert caps["telegraf"]["outputs"]["azure_data_explorer"]["group_metrics_values"] == [
        "single-table", "table-per-metric",
    ]
    assert caps["telegraf"]["outputs"]["prometheus_client"]["metric_version_values"] == [1, 2]
    assert caps["zabbix_agent"]["log_debug_levels"] == [
        "basic", "critical", "error", "warning", "debug", "extended-debug",
    ]
