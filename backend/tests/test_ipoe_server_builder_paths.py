"""Golden (method, args, op, expected_path) cases for IPoEServerBatchBuilder.

Paths checked with validateTmplPath on 1.4 (100.64.64.50) and 1.5 (100.64.64.5).
Generated for issue #720; edit the tables directly if the mapper changes.
"""

import pytest

from vyos_builders.ipoe_server.ipoe_server_batch_builder import IPoEServerBatchBuilder


def _run(version, method, args, op, expected_path):
    builder = IPoEServerBatchBuilder(version=version)
    getattr(builder, method)(*args)
    operations = builder.get_operations()
    assert [(item["op"], item["path"]) for item in operations] == [(op, expected_path)]

COMMON_CASES = [
    ('delete_all_gateway_addresses', ('G0',), 'delete', ['service', 'ipoe-server', 'gateway-address']),
    ('delete_auth_interface', ('eth0',), 'delete', ['service', 'ipoe-server', 'authentication', 'interface', 'eth0']),
    ('delete_auth_interface_mac', ('eth0', '00:11:22:33:44:55'), 'delete', ['service', 'ipoe-server', 'authentication', 'interface', 'eth0', 'mac', '00:11:22:33:44:55']),
    ('delete_auth_mac_ip_address', ('eth0', '00:11:22:33:44:55'), 'delete', ['service', 'ipoe-server', 'authentication', 'interface', 'eth0', 'mac', '00:11:22:33:44:55', 'ip-address']),
    ('delete_auth_mac_rate_limit_download', ('eth0', '00:11:22:33:44:55'), 'delete', ['service', 'ipoe-server', 'authentication', 'interface', 'eth0', 'mac', '00:11:22:33:44:55', 'rate-limit', 'download']),
    ('delete_auth_mac_rate_limit_upload', ('eth0', '00:11:22:33:44:55'), 'delete', ['service', 'ipoe-server', 'authentication', 'interface', 'eth0', 'mac', '00:11:22:33:44:55', 'rate-limit', 'upload']),
    ('delete_auth_mac_vlan', ('eth0', '00:11:22:33:44:55'), 'delete', ['service', 'ipoe-server', 'authentication', 'interface', 'eth0', 'mac', '00:11:22:33:44:55', 'vlan']),
    ('delete_auth_mode', ('G0',), 'delete', ['service', 'ipoe-server', 'authentication', 'mode']),
    ('delete_default_ipv6_pool', ('G0',), 'delete', ['service', 'ipoe-server', 'default-ipv6-pool']),
    ('delete_default_pool', ('G0',), 'delete', ['service', 'ipoe-server', 'default-pool']),
    ('delete_description', ('G0',), 'delete', ['service', 'ipoe-server', 'description']),
    ('delete_gateway_address', ('G0', '192.0.2.1'), 'delete', ['service', 'ipoe-server', 'gateway-address', '192.0.2.1']),
    ('delete_interface', ('eth0',), 'delete', ['service', 'ipoe-server', 'interface', 'eth0']),
    ('delete_interface_all_vlans', ('eth0',), 'delete', ['service', 'ipoe-server', 'interface', 'eth0', 'vlan']),
    ('delete_interface_client_subnet', ('eth0',), 'delete', ['service', 'ipoe-server', 'interface', 'eth0', 'client-subnet']),
    ('delete_interface_external_dhcp', ('eth0',), 'delete', ['service', 'ipoe-server', 'interface', 'eth0', 'external-dhcp']),
    ('delete_interface_external_dhcp_giaddr', ('eth0',), 'delete', ['service', 'ipoe-server', 'interface', 'eth0', 'external-dhcp', 'giaddr']),
    ('delete_interface_external_dhcp_relay', ('eth0',), 'delete', ['service', 'ipoe-server', 'interface', 'eth0', 'external-dhcp', 'dhcp-relay']),
    ('delete_interface_lua_username', ('eth0',), 'delete', ['service', 'ipoe-server', 'interface', 'eth0', 'lua-username']),
    ('delete_interface_mode', ('eth0',), 'delete', ['service', 'ipoe-server', 'interface', 'eth0', 'mode']),
    ('delete_interface_network', ('eth0',), 'delete', ['service', 'ipoe-server', 'interface', 'eth0', 'network']),
    ('delete_interface_start_session', ('eth0',), 'delete', ['service', 'ipoe-server', 'interface', 'eth0', 'start-session']),
    ('delete_interface_vlan', ('eth0', '10'), 'delete', ['service', 'ipoe-server', 'interface', 'eth0', 'vlan', '10']),
    ('delete_ipoe_server', ('G0',), 'delete', ['service', 'ipoe-server']),
    ('delete_ipv6_pool', ('G0',), 'delete', ['service', 'ipoe-server', 'client-ipv6-pool', 'G0']),
    ('delete_ipv6_pool_delegate', ('G0', '2001:db8::/32'), 'delete', ['service', 'ipoe-server', 'client-ipv6-pool', 'G0', 'delegate', '2001:db8::/32']),
    ('delete_ipv6_pool_prefix', ('G0', '2001:db8::/32'), 'delete', ['service', 'ipoe-server', 'client-ipv6-pool', 'G0', 'prefix', '2001:db8::/32']),
    ('delete_limits', ('G0',), 'delete', ['service', 'ipoe-server', 'limits']),
    ('delete_limits_burst', ('G0',), 'delete', ['service', 'ipoe-server', 'limits', 'burst']),
    ('delete_limits_connection_limit', ('G0',), 'delete', ['service', 'ipoe-server', 'limits', 'connection-limit']),
    ('delete_limits_timeout', ('G0',), 'delete', ['service', 'ipoe-server', 'limits', 'timeout']),
    ('delete_log_level', ('G0',), 'delete', ['service', 'ipoe-server', 'log', 'level']),
    ('delete_lua_file', ('G0',), 'delete', ['service', 'ipoe-server', 'lua-file']),
    ('delete_max_concurrent_sessions', ('G0',), 'delete', ['service', 'ipoe-server', 'max-concurrent-sessions']),
    ('delete_name_server', ('G0', '192.0.2.1'), 'delete', ['service', 'ipoe-server', 'name-server', '192.0.2.1']),
    ('delete_pool', ('G0',), 'delete', ['service', 'ipoe-server', 'client-ip-pool', 'G0']),
    ('delete_pool_next_pool', ('G0',), 'delete', ['service', 'ipoe-server', 'client-ip-pool', 'G0', 'next-pool']),
    ('delete_pool_range', ('G0', '10.0.0.0/8'), 'delete', ['service', 'ipoe-server', 'client-ip-pool', 'G0', 'range', '10.0.0.0/8']),
    ('delete_radius_accounting_interim_interval', ('G0',), 'delete', ['service', 'ipoe-server', 'authentication', 'radius', 'accounting-interim-interval']),
    ('delete_radius_acct_interim_jitter', ('G0',), 'delete', ['service', 'ipoe-server', 'authentication', 'radius', 'acct-interim-jitter']),
    ('delete_radius_acct_timeout', ('G0',), 'delete', ['service', 'ipoe-server', 'authentication', 'radius', 'acct-timeout']),
    ('delete_radius_dynamic_author_key', ('G0',), 'delete', ['service', 'ipoe-server', 'authentication', 'radius', 'dynamic-author', 'key']),
    ('delete_radius_dynamic_author_port', ('G0',), 'delete', ['service', 'ipoe-server', 'authentication', 'radius', 'dynamic-author', 'port']),
    ('delete_radius_dynamic_author_server', ('G0',), 'delete', ['service', 'ipoe-server', 'authentication', 'radius', 'dynamic-author', 'server']),
    ('delete_radius_max_try', ('G0',), 'delete', ['service', 'ipoe-server', 'authentication', 'radius', 'max-try']),
    ('delete_radius_nas_identifier', ('G0',), 'delete', ['service', 'ipoe-server', 'authentication', 'radius', 'nas-identifier']),
    ('delete_radius_nas_ip_address', ('G0',), 'delete', ['service', 'ipoe-server', 'authentication', 'radius', 'nas-ip-address']),
    ('delete_radius_preallocate_vif', ('G0',), 'delete', ['service', 'ipoe-server', 'authentication', 'radius', 'preallocate-vif']),
    ('delete_radius_rate_limit', ('G0',), 'delete', ['service', 'ipoe-server', 'authentication', 'radius', 'rate-limit']),
    ('delete_radius_rate_limit_attribute', ('G0',), 'delete', ['service', 'ipoe-server', 'authentication', 'radius', 'rate-limit', 'attribute']),
    ('delete_radius_rate_limit_multiplier', ('G0',), 'delete', ['service', 'ipoe-server', 'authentication', 'radius', 'rate-limit', 'multiplier']),
    ('delete_radius_rate_limit_vendor', ('G0',), 'delete', ['service', 'ipoe-server', 'authentication', 'radius', 'rate-limit', 'vendor']),
    ('delete_radius_server', ('192.0.2.1',), 'delete', ['service', 'ipoe-server', 'authentication', 'radius', 'server', '192.0.2.1']),
    ('delete_radius_server_acct_port', ('192.0.2.1',), 'delete', ['service', 'ipoe-server', 'authentication', 'radius', 'server', '192.0.2.1', 'acct-port']),
    ('delete_radius_server_backup', ('192.0.2.1',), 'delete', ['service', 'ipoe-server', 'authentication', 'radius', 'server', '192.0.2.1', 'backup']),
    ('delete_radius_server_disable', ('192.0.2.1',), 'delete', ['service', 'ipoe-server', 'authentication', 'radius', 'server', '192.0.2.1', 'disable']),
    ('delete_radius_server_disable_accounting', ('192.0.2.1',), 'delete', ['service', 'ipoe-server', 'authentication', 'radius', 'server', '192.0.2.1', 'disable-accounting']),
    ('delete_radius_server_fail_time', ('192.0.2.1',), 'delete', ['service', 'ipoe-server', 'authentication', 'radius', 'server', '192.0.2.1', 'fail-time']),
    ('delete_radius_server_port', ('192.0.2.1',), 'delete', ['service', 'ipoe-server', 'authentication', 'radius', 'server', '192.0.2.1', 'port']),
    ('delete_radius_server_priority', ('192.0.2.1',), 'delete', ['service', 'ipoe-server', 'authentication', 'radius', 'server', '192.0.2.1', 'priority']),
    ('delete_radius_source_address', ('G0',), 'delete', ['service', 'ipoe-server', 'authentication', 'radius', 'source-address']),
    ('delete_radius_timeout', ('G0',), 'delete', ['service', 'ipoe-server', 'authentication', 'radius', 'timeout']),
    ('delete_script_on_change', ('G0',), 'delete', ['service', 'ipoe-server', 'extended-scripts', 'on-change']),
    ('delete_script_on_down', ('G0',), 'delete', ['service', 'ipoe-server', 'extended-scripts', 'on-down']),
    ('delete_script_on_pre_up', ('G0',), 'delete', ['service', 'ipoe-server', 'extended-scripts', 'on-pre-up']),
    ('delete_script_on_up', ('G0',), 'delete', ['service', 'ipoe-server', 'extended-scripts', 'on-up']),
    ('delete_shaper', ('G0',), 'delete', ['service', 'ipoe-server', 'shaper']),
    ('delete_shaper_fwmark', ('G0',), 'delete', ['service', 'ipoe-server', 'shaper', 'fwmark']),
    ('delete_snmp', ('G0',), 'delete', ['service', 'ipoe-server', 'snmp']),
    ('delete_thread_count', ('G0',), 'delete', ['service', 'ipoe-server', 'thread-count']),
    ('set_auth_interface_mac', ('eth0', '00:11:22:33:44:55'), 'set', ['service', 'ipoe-server', 'authentication', 'interface', 'eth0', 'mac', '00:11:22:33:44:55']),
    ('set_auth_mac_ip_address', ('eth0', '00:11:22:33:44:55|192.0.2.10'), 'set', ['service', 'ipoe-server', 'authentication', 'interface', 'eth0', 'mac', '00:11:22:33:44:55', 'ip-address', '192.0.2.10']),
    ('set_auth_mac_rate_limit_download', ('eth0', '00:11:22:33:44:55|5'), 'set', ['service', 'ipoe-server', 'authentication', 'interface', 'eth0', 'mac', '00:11:22:33:44:55', 'rate-limit', 'download', '5']),
    ('set_auth_mac_rate_limit_upload', ('eth0', '00:11:22:33:44:55|5'), 'set', ['service', 'ipoe-server', 'authentication', 'interface', 'eth0', 'mac', '00:11:22:33:44:55', 'rate-limit', 'upload', '5']),
    ('set_auth_mac_vlan', ('eth0', '00:11:22:33:44:55|10'), 'set', ['service', 'ipoe-server', 'authentication', 'interface', 'eth0', 'mac', '00:11:22:33:44:55', 'vlan', '10']),
    ('set_auth_mode', ('G0', 'nat'), 'set', ['service', 'ipoe-server', 'authentication', 'mode', 'nat']),
    ('set_default_ipv6_pool', ('G0', 'G0'), 'set', ['service', 'ipoe-server', 'default-ipv6-pool', 'G0']),
    ('set_default_pool', ('G0', 'G0'), 'set', ['service', 'ipoe-server', 'default-pool', 'G0']),
    ('set_description', ('G0', '5'), 'set', ['service', 'ipoe-server', 'description', '5']),
    ('set_gateway_address', ('G0', '192.0.2.1'), 'set', ['service', 'ipoe-server', 'gateway-address', '192.0.2.1']),
    ('set_interface_client_subnet', ('eth0', '10.0.0.0/8'), 'set', ['service', 'ipoe-server', 'interface', 'eth0', 'client-subnet', '10.0.0.0/8']),
    ('set_interface_external_dhcp_giaddr', ('eth0', '192.0.2.1'), 'set', ['service', 'ipoe-server', 'interface', 'eth0', 'external-dhcp', 'giaddr', '192.0.2.1']),
    ('set_interface_external_dhcp_relay', ('eth0', '192.0.2.1'), 'set', ['service', 'ipoe-server', 'interface', 'eth0', 'external-dhcp', 'dhcp-relay', '192.0.2.1']),
    ('set_interface_lua_username', ('eth0', 'username'), 'set', ['service', 'ipoe-server', 'interface', 'eth0', 'lua-username', 'username']),
    ('set_interface_mode', ('eth0', 'nat'), 'set', ['service', 'ipoe-server', 'interface', 'eth0', 'mode', 'nat']),
    ('set_interface_network', ('eth0', '10.0.0.0/8'), 'set', ['service', 'ipoe-server', 'interface', 'eth0', 'network', '10.0.0.0/8']),
    ('set_interface_start_session', ('eth0', '5'), 'set', ['service', 'ipoe-server', 'interface', 'eth0', 'start-session', '5']),
    ('set_interface_vlan', ('eth0', '10'), 'set', ['service', 'ipoe-server', 'interface', 'eth0', 'vlan', '10']),
    ('set_ipv6_pool_delegate', ('G0', '2001:db8::/32|64'), 'set', ['service', 'ipoe-server', 'client-ipv6-pool', 'G0', 'delegate', '2001:db8::/32', 'delegation-prefix', '64']),
    ('set_ipv6_pool_prefix', ('G0', '2001:db8::/32|64'), 'set', ['service', 'ipoe-server', 'client-ipv6-pool', 'G0', 'prefix', '2001:db8::/32', 'mask', '64']),
    ('set_limits_burst', ('G0', '5'), 'set', ['service', 'ipoe-server', 'limits', 'burst', '5']),
    ('set_limits_connection_limit', ('G0', '5'), 'set', ['service', 'ipoe-server', 'limits', 'connection-limit', '5']),
    ('set_limits_timeout', ('G0', '5'), 'set', ['service', 'ipoe-server', 'limits', 'timeout', '5']),
    ('set_log_level', ('G0', '1'), 'set', ['service', 'ipoe-server', 'log', 'level', '1']),
    ('set_lua_file', ('G0', '5'), 'set', ['service', 'ipoe-server', 'lua-file', '5']),
    ('set_max_concurrent_sessions', ('G0', '5'), 'set', ['service', 'ipoe-server', 'max-concurrent-sessions', '5']),
    ('set_name_server', ('G0', '192.0.2.1'), 'set', ['service', 'ipoe-server', 'name-server', '192.0.2.1']),
    ('set_pool_next_pool', ('G0', '5'), 'set', ['service', 'ipoe-server', 'client-ip-pool', 'G0', 'next-pool', '5']),
    ('set_pool_range', ('G0', '10.0.0.0/8'), 'set', ['service', 'ipoe-server', 'client-ip-pool', 'G0', 'range', '10.0.0.0/8']),
    ('set_radius_accounting_interim_interval', ('G0', '5'), 'set', ['service', 'ipoe-server', 'authentication', 'radius', 'accounting-interim-interval', '5']),
    ('set_radius_acct_interim_jitter', ('G0', '5'), 'set', ['service', 'ipoe-server', 'authentication', 'radius', 'acct-interim-jitter', '5']),
    ('set_radius_acct_timeout', ('G0', '5'), 'set', ['service', 'ipoe-server', 'authentication', 'radius', 'acct-timeout', '5']),
    ('set_radius_dynamic_author_key', ('G0', 'secret'), 'set', ['service', 'ipoe-server', 'authentication', 'radius', 'dynamic-author', 'key', 'secret']),
    ('set_radius_dynamic_author_port', ('G0', '8080'), 'set', ['service', 'ipoe-server', 'authentication', 'radius', 'dynamic-author', 'port', '8080']),
    ('set_radius_dynamic_author_server', ('G0', '192.0.2.1'), 'set', ['service', 'ipoe-server', 'authentication', 'radius', 'dynamic-author', 'server', '192.0.2.1']),
    ('set_radius_max_try', ('G0', '5'), 'set', ['service', 'ipoe-server', 'authentication', 'radius', 'max-try', '5']),
    ('set_radius_nas_identifier', ('G0', '5'), 'set', ['service', 'ipoe-server', 'authentication', 'radius', 'nas-identifier', '5']),
    ('set_radius_nas_ip_address', ('G0', '192.0.2.1'), 'set', ['service', 'ipoe-server', 'authentication', 'radius', 'nas-ip-address', '192.0.2.1']),
    ('set_radius_preallocate_vif', ('G0',), 'set', ['service', 'ipoe-server', 'authentication', 'radius', 'preallocate-vif']),
    ('set_radius_rate_limit_attribute', ('G0', '5'), 'set', ['service', 'ipoe-server', 'authentication', 'radius', 'rate-limit', 'attribute', '5']),
    ('set_radius_rate_limit_enable', ('G0',), 'set', ['service', 'ipoe-server', 'authentication', 'radius', 'rate-limit', 'enable']),
    ('set_radius_rate_limit_multiplier', ('G0', '5'), 'set', ['service', 'ipoe-server', 'authentication', 'radius', 'rate-limit', 'multiplier', '5']),
    ('set_radius_rate_limit_vendor', ('G0', '5'), 'set', ['service', 'ipoe-server', 'authentication', 'radius', 'rate-limit', 'vendor', '5']),
    ('set_radius_server', ('192.0.2.1',), 'set', ['service', 'ipoe-server', 'authentication', 'radius', 'server', '192.0.2.1']),
    ('set_radius_server_acct_port', ('192.0.2.1', '8080'), 'set', ['service', 'ipoe-server', 'authentication', 'radius', 'server', '192.0.2.1', 'acct-port', '8080']),
    ('set_radius_server_backup', ('192.0.2.1',), 'set', ['service', 'ipoe-server', 'authentication', 'radius', 'server', '192.0.2.1', 'backup']),
    ('set_radius_server_disable', ('192.0.2.1',), 'set', ['service', 'ipoe-server', 'authentication', 'radius', 'server', '192.0.2.1', 'disable']),
    ('set_radius_server_disable_accounting', ('192.0.2.1',), 'set', ['service', 'ipoe-server', 'authentication', 'radius', 'server', '192.0.2.1', 'disable-accounting']),
    ('set_radius_server_fail_time', ('192.0.2.1', '192.0.2.1|5'), 'set', ['service', 'ipoe-server', 'authentication', 'radius', 'server', '192.0.2.1', 'fail-time', '192.0.2.1|5']),
    ('set_radius_server_key', ('192.0.2.1', 'secret'), 'set', ['service', 'ipoe-server', 'authentication', 'radius', 'server', '192.0.2.1', 'key', 'secret']),
    ('set_radius_server_port', ('192.0.2.1', '8080'), 'set', ['service', 'ipoe-server', 'authentication', 'radius', 'server', '192.0.2.1', 'port', '8080']),
    ('set_radius_server_priority', ('192.0.2.1', '5'), 'set', ['service', 'ipoe-server', 'authentication', 'radius', 'server', '192.0.2.1', 'priority', '5']),
    ('set_radius_source_address', ('G0', '192.0.2.1'), 'set', ['service', 'ipoe-server', 'authentication', 'radius', 'source-address', '192.0.2.1']),
    ('set_radius_timeout', ('G0', '5'), 'set', ['service', 'ipoe-server', 'authentication', 'radius', 'timeout', '5']),
    ('set_script_on_change', ('G0', '/config/scripts/x.sh'), 'set', ['service', 'ipoe-server', 'extended-scripts', 'on-change', '/config/scripts/x.sh']),
    ('set_script_on_down', ('G0', '/config/scripts/x.sh'), 'set', ['service', 'ipoe-server', 'extended-scripts', 'on-down', '/config/scripts/x.sh']),
    ('set_script_on_pre_up', ('G0', '/config/scripts/x.sh'), 'set', ['service', 'ipoe-server', 'extended-scripts', 'on-pre-up', '/config/scripts/x.sh']),
    ('set_script_on_up', ('G0', '/config/scripts/x.sh'), 'set', ['service', 'ipoe-server', 'extended-scripts', 'on-up', '/config/scripts/x.sh']),
    ('set_shaper_fwmark', ('G0', '5'), 'set', ['service', 'ipoe-server', 'shaper', 'fwmark', '5']),
    ('set_snmp_master_agent', ('G0',), 'set', ['service', 'ipoe-server', 'snmp', 'master-agent']),
    ('set_thread_count', ('G0', '5'), 'set', ['service', 'ipoe-server', 'thread-count', '5']),
]


@pytest.mark.parametrize("method, args, op, expected_path", COMMON_CASES)
@pytest.mark.parametrize("version", ["1.4", "1.5"])
def test_ipoe_server_common_paths(method, args, op, expected_path, version):
    _run(version, method, args, op, expected_path)

V15_ONLY_CASES = [
    ('delete_interface_vlan_mon', ('eth0',), 'delete', ['service', 'ipoe-server', 'interface', 'eth0', 'vlan-mon']),
    ('set_interface_vlan_mon', ('eth0',), 'set', ['service', 'ipoe-server', 'interface', 'eth0', 'vlan-mon']),
]


@pytest.mark.parametrize("method, args, op, expected_path", V15_ONLY_CASES)
def test_ipoe_server_v1_5_only_paths(method, args, op, expected_path):
    _run("1.5", method, args, op, expected_path)
