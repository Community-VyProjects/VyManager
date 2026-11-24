"""Golden (method, args, op, expected_path) cases for PPPoEServerBatchBuilder.

Paths checked against the 1.4 and 1.5 lab templates; values are samples.
authentication any-login, interface vlan-mon and ppp-options
ipv6-peer-interface-id-secret exist only on 1.5. interface combined is a
valueless flag on both labs, and interface vpp-cp exists on neither.
"""

import inspect
from pathlib import Path

import pytest

from vyos_builders.pppoe_server.pppoe_server_batch_builder import PPPoEServerBatchBuilder
from vyos_mappers.pppoe_server.pppoe_server import PPPoEServerMapper
from vyos_mappers.pppoe_server.pppoe_server_versions import (
    PPPoEServerMapperV1_5,
    get_pppoe_server_mapper,
)


def _run(version, method, args, op, expected_path):
    builder = PPPoEServerBatchBuilder(version=version)
    getattr(builder, method)(*args)
    operations = builder.get_operations()
    assert [(item["op"], item["path"]) for item in operations] == [(op, expected_path)]


COMMON_CASES = [
    ('create_interface', ('eth0',), 'set', ['service', 'pppoe-server', 'interface', 'eth0']),
    ('create_ipv6_pool', ('P0',), 'set', ['service', 'pppoe-server', 'client-ipv6-pool', 'P0']),
    ('create_local_user', ('alice',), 'set', ['service', 'pppoe-server', 'authentication', 'local-users', 'username', 'alice']),
    ('create_pool', ('P0',), 'set', ['service', 'pppoe-server', 'client-ip-pool', 'P0']),
    ('delete_accept_any_service', ('G0',), 'delete', ['service', 'pppoe-server', 'accept-any-service']),
    ('delete_accept_blank_service', ('G0',), 'delete', ['service', 'pppoe-server', 'accept-blank-service']),
    ('delete_access_concentrator', ('G0',), 'delete', ['service', 'pppoe-server', 'access-concentrator']),
    ('delete_all_auth_protocols', ('G0',), 'delete', ['service', 'pppoe-server', 'authentication', 'protocols']),
    ('delete_all_pado_delays', ('G0',), 'delete', ['service', 'pppoe-server', 'pado-delay']),
    ('delete_auth_mode', ('G0',), 'delete', ['service', 'pppoe-server', 'authentication', 'mode']),
    ('delete_auth_protocol', ('G0', 'chap'), 'delete', ['service', 'pppoe-server', 'authentication', 'protocols', 'chap']),
    ('delete_default_ipv6_pool', ('G0',), 'delete', ['service', 'pppoe-server', 'default-ipv6-pool']),
    ('delete_default_pool', ('G0',), 'delete', ['service', 'pppoe-server', 'default-pool']),
    ('delete_description', ('G0',), 'delete', ['service', 'pppoe-server', 'description']),
    ('delete_gateway_address', ('G0',), 'delete', ['service', 'pppoe-server', 'gateway-address']),
    ('delete_interface', ('eth0',), 'delete', ['service', 'pppoe-server', 'interface', 'eth0']),
    ('delete_interface_all_vlans', ('eth0',), 'delete', ['service', 'pppoe-server', 'interface', 'eth0', 'vlan']),
    ('delete_interface_combined', ('eth0',), 'delete', ['service', 'pppoe-server', 'interface', 'eth0', 'combined']),
    ('delete_interface_vlan', ('eth0', '10'), 'delete', ['service', 'pppoe-server', 'interface', 'eth0', 'vlan', '10']),
    ('delete_ipv6_pool', ('P0',), 'delete', ['service', 'pppoe-server', 'client-ipv6-pool', 'P0']),
    ('delete_ipv6_pool_delegate', ('P0', '2001:db8::/48'), 'delete', ['service', 'pppoe-server', 'client-ipv6-pool', 'P0', 'delegate', '2001:db8::/48']),
    ('delete_ipv6_pool_prefix', ('P0', '2001:db8::/48'), 'delete', ['service', 'pppoe-server', 'client-ipv6-pool', 'P0', 'prefix', '2001:db8::/48']),
    ('delete_limits', ('G0',), 'delete', ['service', 'pppoe-server', 'limits']),
    ('delete_limits_burst', ('G0',), 'delete', ['service', 'pppoe-server', 'limits', 'burst']),
    ('delete_limits_connection_limit', ('G0',), 'delete', ['service', 'pppoe-server', 'limits', 'connection-limit']),
    ('delete_limits_timeout', ('G0',), 'delete', ['service', 'pppoe-server', 'limits', 'timeout']),
    ('delete_local_user', ('alice',), 'delete', ['service', 'pppoe-server', 'authentication', 'local-users', 'username', 'alice']),
    ('delete_local_user_disable', ('alice',), 'delete', ['service', 'pppoe-server', 'authentication', 'local-users', 'username', 'alice', 'disable']),
    ('delete_local_user_rate_limit', ('alice',), 'delete', ['service', 'pppoe-server', 'authentication', 'local-users', 'username', 'alice', 'rate-limit']),
    ('delete_local_user_rate_limit_download', ('alice',), 'delete', ['service', 'pppoe-server', 'authentication', 'local-users', 'username', 'alice', 'rate-limit', 'download']),
    ('delete_local_user_rate_limit_upload', ('alice',), 'delete', ['service', 'pppoe-server', 'authentication', 'local-users', 'username', 'alice', 'rate-limit', 'upload']),
    ('delete_local_user_static_ip', ('alice',), 'delete', ['service', 'pppoe-server', 'authentication', 'local-users', 'username', 'alice', 'static-ip']),
    ('delete_log_level', ('G0',), 'delete', ['service', 'pppoe-server', 'log', 'level']),
    ('delete_max_concurrent_sessions', ('G0',), 'delete', ['service', 'pppoe-server', 'max-concurrent-sessions']),
    ('delete_mtu', ('G0',), 'delete', ['service', 'pppoe-server', 'mtu']),
    ('delete_name_server', ('G0', '192.0.2.1'), 'delete', ['service', 'pppoe-server', 'name-server', '192.0.2.1']),
    ('delete_pado_delay', ('G0', '100'), 'delete', ['service', 'pppoe-server', 'pado-delay', '100']),
    ('delete_pado_delay_sessions', ('G0', '100'), 'delete', ['service', 'pppoe-server', 'pado-delay', '100', 'sessions']),
    ('delete_pool', ('P0',), 'delete', ['service', 'pppoe-server', 'client-ip-pool', 'P0']),
    ('delete_pool_next_pool', ('P0',), 'delete', ['service', 'pppoe-server', 'client-ip-pool', 'P0', 'next-pool']),
    ('delete_pool_range', ('P0', '10.0.0.0/24'), 'delete', ['service', 'pppoe-server', 'client-ip-pool', 'P0', 'range', '10.0.0.0/24']),
    ('delete_ppp_disable_ccp', ('G0',), 'delete', ['service', 'pppoe-server', 'ppp-options', 'disable-ccp']),
    ('delete_ppp_interface_cache', ('G0',), 'delete', ['service', 'pppoe-server', 'ppp-options', 'interface-cache']),
    ('delete_ppp_ipv4', ('G0',), 'delete', ['service', 'pppoe-server', 'ppp-options', 'ipv4']),
    ('delete_ppp_ipv6', ('G0',), 'delete', ['service', 'pppoe-server', 'ppp-options', 'ipv6']),
    ('delete_ppp_ipv6_accept_peer_interface_id', ('G0',), 'delete', ['service', 'pppoe-server', 'ppp-options', 'ipv6-accept-peer-interface-id']),
    ('delete_ppp_ipv6_interface_id', ('G0',), 'delete', ['service', 'pppoe-server', 'ppp-options', 'ipv6-interface-id']),
    ('delete_ppp_ipv6_peer_interface_id', ('G0',), 'delete', ['service', 'pppoe-server', 'ppp-options', 'ipv6-peer-interface-id']),
    ('delete_ppp_lcp_echo_failure', ('G0',), 'delete', ['service', 'pppoe-server', 'ppp-options', 'lcp-echo-failure']),
    ('delete_ppp_lcp_echo_interval', ('G0',), 'delete', ['service', 'pppoe-server', 'ppp-options', 'lcp-echo-interval']),
    ('delete_ppp_lcp_echo_timeout', ('G0',), 'delete', ['service', 'pppoe-server', 'ppp-options', 'lcp-echo-timeout']),
    ('delete_ppp_min_mtu', ('G0',), 'delete', ['service', 'pppoe-server', 'ppp-options', 'min-mtu']),
    ('delete_ppp_mppe', ('G0',), 'delete', ['service', 'pppoe-server', 'ppp-options', 'mppe']),
    ('delete_ppp_mru', ('G0',), 'delete', ['service', 'pppoe-server', 'ppp-options', 'mru']),
    ('delete_ppp_options', ('G0',), 'delete', ['service', 'pppoe-server', 'ppp-options']),
    ('delete_pppoe_server', ('G0',), 'delete', ['service', 'pppoe-server']),
    ('delete_radius_accounting_interim_interval', ('G0',), 'delete', ['service', 'pppoe-server', 'authentication', 'radius', 'accounting-interim-interval']),
    ('delete_radius_acct_interim_jitter', ('G0',), 'delete', ['service', 'pppoe-server', 'authentication', 'radius', 'acct-interim-jitter']),
    ('delete_radius_acct_timeout', ('G0',), 'delete', ['service', 'pppoe-server', 'authentication', 'radius', 'acct-timeout']),
    ('delete_radius_called_sid_format', ('G0',), 'delete', ['service', 'pppoe-server', 'authentication', 'radius', 'called-sid-format']),
    ('delete_radius_dynamic_author_key', ('G0',), 'delete', ['service', 'pppoe-server', 'authentication', 'radius', 'dynamic-author', 'key']),
    ('delete_radius_dynamic_author_port', ('G0',), 'delete', ['service', 'pppoe-server', 'authentication', 'radius', 'dynamic-author', 'port']),
    ('delete_radius_dynamic_author_server', ('G0',), 'delete', ['service', 'pppoe-server', 'authentication', 'radius', 'dynamic-author', 'server']),
    ('delete_radius_max_try', ('G0',), 'delete', ['service', 'pppoe-server', 'authentication', 'radius', 'max-try']),
    ('delete_radius_nas_identifier', ('G0',), 'delete', ['service', 'pppoe-server', 'authentication', 'radius', 'nas-identifier']),
    ('delete_radius_nas_ip_address', ('G0',), 'delete', ['service', 'pppoe-server', 'authentication', 'radius', 'nas-ip-address']),
    ('delete_radius_preallocate_vif', ('G0',), 'delete', ['service', 'pppoe-server', 'authentication', 'radius', 'preallocate-vif']),
    ('delete_radius_rate_limit', ('G0',), 'delete', ['service', 'pppoe-server', 'authentication', 'radius', 'rate-limit']),
    ('delete_radius_rate_limit_enable', ('G0',), 'delete', ['service', 'pppoe-server', 'authentication', 'radius', 'rate-limit', 'enable']),
    ('delete_radius_rate_limit_attribute', ('G0',), 'delete', ['service', 'pppoe-server', 'authentication', 'radius', 'rate-limit', 'attribute']),
    ('delete_radius_rate_limit_multiplier', ('G0',), 'delete', ['service', 'pppoe-server', 'authentication', 'radius', 'rate-limit', 'multiplier']),
    ('delete_radius_rate_limit_vendor', ('G0',), 'delete', ['service', 'pppoe-server', 'authentication', 'radius', 'rate-limit', 'vendor']),
    ('delete_radius_server', ('192.0.2.1',), 'delete', ['service', 'pppoe-server', 'authentication', 'radius', 'server', '192.0.2.1']),
    ('delete_radius_server_acct_port', ('192.0.2.1',), 'delete', ['service', 'pppoe-server', 'authentication', 'radius', 'server', '192.0.2.1', 'acct-port']),
    ('delete_radius_server_backup', ('192.0.2.1',), 'delete', ['service', 'pppoe-server', 'authentication', 'radius', 'server', '192.0.2.1', 'backup']),
    ('delete_radius_server_disable', ('192.0.2.1',), 'delete', ['service', 'pppoe-server', 'authentication', 'radius', 'server', '192.0.2.1', 'disable']),
    ('delete_radius_server_disable_accounting', ('192.0.2.1',), 'delete', ['service', 'pppoe-server', 'authentication', 'radius', 'server', '192.0.2.1', 'disable-accounting']),
    ('delete_radius_server_fail_time', ('192.0.2.1',), 'delete', ['service', 'pppoe-server', 'authentication', 'radius', 'server', '192.0.2.1', 'fail-time']),
    ('delete_radius_server_port', ('192.0.2.1',), 'delete', ['service', 'pppoe-server', 'authentication', 'radius', 'server', '192.0.2.1', 'port']),
    ('delete_radius_server_priority', ('192.0.2.1',), 'delete', ['service', 'pppoe-server', 'authentication', 'radius', 'server', '192.0.2.1', 'priority']),
    ('delete_radius_source_address', ('G0',), 'delete', ['service', 'pppoe-server', 'authentication', 'radius', 'source-address']),
    ('delete_radius_timeout', ('G0',), 'delete', ['service', 'pppoe-server', 'authentication', 'radius', 'timeout']),
    ('delete_extended_scripts', ('G0',), 'delete', ['service', 'pppoe-server', 'extended-scripts']),
    ('delete_script_on_change', ('G0',), 'delete', ['service', 'pppoe-server', 'extended-scripts', 'on-change']),
    ('delete_script_on_down', ('G0',), 'delete', ['service', 'pppoe-server', 'extended-scripts', 'on-down']),
    ('delete_script_on_pre_up', ('G0',), 'delete', ['service', 'pppoe-server', 'extended-scripts', 'on-pre-up']),
    ('delete_script_on_up', ('G0',), 'delete', ['service', 'pppoe-server', 'extended-scripts', 'on-up']),
    ('delete_service_name', ('G0', '5'), 'delete', ['service', 'pppoe-server', 'service-name', '5']),
    ('delete_session_control', ('G0',), 'delete', ['service', 'pppoe-server', 'session-control']),
    ('delete_shaper', ('G0',), 'delete', ['service', 'pppoe-server', 'shaper']),
    ('delete_shaper_fwmark', ('G0',), 'delete', ['service', 'pppoe-server', 'shaper', 'fwmark']),
    ('delete_snmp', ('G0',), 'delete', ['service', 'pppoe-server', 'snmp']),
    ('delete_snmp_master_agent', ('G0',), 'delete', ['service', 'pppoe-server', 'snmp', 'master-agent']),
    ('delete_thread_count', ('G0',), 'delete', ['service', 'pppoe-server', 'thread-count']),
    ('delete_wins_server', ('G0', '192.0.2.1'), 'delete', ['service', 'pppoe-server', 'wins-server', '192.0.2.1']),
    ('set_accept_any_service', ('G0',), 'set', ['service', 'pppoe-server', 'accept-any-service']),
    ('set_accept_blank_service', ('G0',), 'set', ['service', 'pppoe-server', 'accept-blank-service']),
    ('set_access_concentrator', ('G0', '5'), 'set', ['service', 'pppoe-server', 'access-concentrator', '5']),
    ('set_auth_mode', ('G0', 'local'), 'set', ['service', 'pppoe-server', 'authentication', 'mode', 'local']),
    ('set_auth_protocol', ('G0', 'chap'), 'set', ['service', 'pppoe-server', 'authentication', 'protocols', 'chap']),
    ('set_default_ipv6_pool', ('G0', 'P0'), 'set', ['service', 'pppoe-server', 'default-ipv6-pool', 'P0']),
    ('set_default_pool', ('G0', 'P0'), 'set', ['service', 'pppoe-server', 'default-pool', 'P0']),
    ('set_description', ('G0', '5'), 'set', ['service', 'pppoe-server', 'description', '5']),
    ('set_gateway_address', ('G0', '192.0.2.1'), 'set', ['service', 'pppoe-server', 'gateway-address', '192.0.2.1']),
    ('set_interface_combined', ('eth0',), 'set', ['service', 'pppoe-server', 'interface', 'eth0', 'combined']),
    ('set_interface_vlan', ('eth0', '10'), 'set', ['service', 'pppoe-server', 'interface', 'eth0', 'vlan', '10']),
    ('set_ipv6_pool_delegate', ('P0', '2001:db8::/48', '56'), 'set', ['service', 'pppoe-server', 'client-ipv6-pool', 'P0', 'delegate', '2001:db8::/48', 'delegation-prefix', '56']),
    ('set_ipv6_pool_prefix', ('P0', '2001:db8::/48'), 'set', ['service', 'pppoe-server', 'client-ipv6-pool', 'P0', 'prefix', '2001:db8::/48']),
    ('set_ipv6_pool_prefix_mask', ('P0', '2001:db8::/48', '64'), 'set', ['service', 'pppoe-server', 'client-ipv6-pool', 'P0', 'prefix', '2001:db8::/48', 'mask', '64']),
    ('delete_ipv6_pool_prefix_mask', ('P0', '2001:db8::/48'), 'delete', ['service', 'pppoe-server', 'client-ipv6-pool', 'P0', 'prefix', '2001:db8::/48', 'mask']),
    ('set_limits', ('G0',), 'set', ['service', 'pppoe-server', 'limits']),
    ('set_limits_burst', ('G0', '5'), 'set', ['service', 'pppoe-server', 'limits', 'burst', '5']),
    ('set_limits_connection_limit', ('G0', '5'), 'set', ['service', 'pppoe-server', 'limits', 'connection-limit', '5']),
    ('set_limits_timeout', ('G0', '5'), 'set', ['service', 'pppoe-server', 'limits', 'timeout', '5']),
    ('set_local_user_disable', ('alice',), 'set', ['service', 'pppoe-server', 'authentication', 'local-users', 'username', 'alice', 'disable']),
    ('set_local_user_password', ('alice', 'pw'), 'set', ['service', 'pppoe-server', 'authentication', 'local-users', 'username', 'alice', 'password', 'pw']),
    ('set_local_user_rate_limit_download', ('alice', '5'), 'set', ['service', 'pppoe-server', 'authentication', 'local-users', 'username', 'alice', 'rate-limit', 'download', '5']),
    ('set_local_user_rate_limit_upload', ('alice', '5'), 'set', ['service', 'pppoe-server', 'authentication', 'local-users', 'username', 'alice', 'rate-limit', 'upload', '5']),
    ('set_local_user_static_ip', ('alice', '10.0.0.5'), 'set', ['service', 'pppoe-server', 'authentication', 'local-users', 'username', 'alice', 'static-ip', '10.0.0.5']),
    ('set_log_level', ('G0', '3'), 'set', ['service', 'pppoe-server', 'log', 'level', '3']),
    ('set_max_concurrent_sessions', ('G0', '5'), 'set', ['service', 'pppoe-server', 'max-concurrent-sessions', '5']),
    ('set_mtu', ('G0', '5'), 'set', ['service', 'pppoe-server', 'mtu', '5']),
    ('set_name_server', ('G0', '192.0.2.1'), 'set', ['service', 'pppoe-server', 'name-server', '192.0.2.1']),
    ('set_pado_delay', ('G0', '100'), 'set', ['service', 'pppoe-server', 'pado-delay', '100']),
    ('set_pado_delay_sessions', ('G0', '100', '50'), 'set', ['service', 'pppoe-server', 'pado-delay', '100', 'sessions', '50']),
    ('set_pool_next_pool', ('P0', 'P1'), 'set', ['service', 'pppoe-server', 'client-ip-pool', 'P0', 'next-pool', 'P1']),
    ('set_pool_range', ('P0', '10.0.0.0/24'), 'set', ['service', 'pppoe-server', 'client-ip-pool', 'P0', 'range', '10.0.0.0/24']),
    ('set_ppp_disable_ccp', ('G0',), 'set', ['service', 'pppoe-server', 'ppp-options', 'disable-ccp']),
    ('set_ppp_interface_cache', ('G0', '5'), 'set', ['service', 'pppoe-server', 'ppp-options', 'interface-cache', '5']),
    ('set_ppp_ipv4', ('G0', '5'), 'set', ['service', 'pppoe-server', 'ppp-options', 'ipv4', '5']),
    ('set_ppp_ipv6', ('G0', '5'), 'set', ['service', 'pppoe-server', 'ppp-options', 'ipv6', '5']),
    ('set_ppp_ipv6_accept_peer_interface_id', ('G0',), 'set', ['service', 'pppoe-server', 'ppp-options', 'ipv6-accept-peer-interface-id']),
    ('set_ppp_ipv6_interface_id', ('G0', '5'), 'set', ['service', 'pppoe-server', 'ppp-options', 'ipv6-interface-id', '5']),
    ('set_ppp_ipv6_peer_interface_id', ('G0', '5'), 'set', ['service', 'pppoe-server', 'ppp-options', 'ipv6-peer-interface-id', '5']),
    ('set_ppp_lcp_echo_failure', ('G0', '5'), 'set', ['service', 'pppoe-server', 'ppp-options', 'lcp-echo-failure', '5']),
    ('set_ppp_lcp_echo_interval', ('G0', '5'), 'set', ['service', 'pppoe-server', 'ppp-options', 'lcp-echo-interval', '5']),
    ('set_ppp_lcp_echo_timeout', ('G0', '5'), 'set', ['service', 'pppoe-server', 'ppp-options', 'lcp-echo-timeout', '5']),
    ('set_ppp_min_mtu', ('G0', '5'), 'set', ['service', 'pppoe-server', 'ppp-options', 'min-mtu', '5']),
    ('set_ppp_mppe', ('G0', '5'), 'set', ['service', 'pppoe-server', 'ppp-options', 'mppe', '5']),
    ('set_ppp_mru', ('G0', '5'), 'set', ['service', 'pppoe-server', 'ppp-options', 'mru', '5']),
    ('set_radius_accounting_interim_interval', ('G0', '5'), 'set', ['service', 'pppoe-server', 'authentication', 'radius', 'accounting-interim-interval', '5']),
    ('set_radius_acct_interim_jitter', ('G0', '5'), 'set', ['service', 'pppoe-server', 'authentication', 'radius', 'acct-interim-jitter', '5']),
    ('set_radius_acct_timeout', ('G0', '5'), 'set', ['service', 'pppoe-server', 'authentication', 'radius', 'acct-timeout', '5']),
    ('set_radius_called_sid_format', ('G0', '5'), 'set', ['service', 'pppoe-server', 'authentication', 'radius', 'called-sid-format', '5']),
    ('set_radius_dynamic_author_key', ('G0', 'k'), 'set', ['service', 'pppoe-server', 'authentication', 'radius', 'dynamic-author', 'key', 'k']),
    ('set_radius_dynamic_author_port', ('G0', '1812'), 'set', ['service', 'pppoe-server', 'authentication', 'radius', 'dynamic-author', 'port', '1812']),
    ('set_radius_dynamic_author_server', ('G0', '192.0.2.1'), 'set', ['service', 'pppoe-server', 'authentication', 'radius', 'dynamic-author', 'server', '192.0.2.1']),
    ('set_radius_max_try', ('G0', '5'), 'set', ['service', 'pppoe-server', 'authentication', 'radius', 'max-try', '5']),
    ('set_radius_nas_identifier', ('G0', '5'), 'set', ['service', 'pppoe-server', 'authentication', 'radius', 'nas-identifier', '5']),
    ('set_radius_nas_ip_address', ('G0', '192.0.2.1'), 'set', ['service', 'pppoe-server', 'authentication', 'radius', 'nas-ip-address', '192.0.2.1']),
    ('set_radius_preallocate_vif', ('G0',), 'set', ['service', 'pppoe-server', 'authentication', 'radius', 'preallocate-vif']),
    ('set_radius_rate_limit_attribute', ('G0', '5'), 'set', ['service', 'pppoe-server', 'authentication', 'radius', 'rate-limit', 'attribute', '5']),
    ('set_radius_rate_limit_enable', ('G0',), 'set', ['service', 'pppoe-server', 'authentication', 'radius', 'rate-limit', 'enable']),
    ('set_radius_rate_limit_multiplier', ('G0', '5'), 'set', ['service', 'pppoe-server', 'authentication', 'radius', 'rate-limit', 'multiplier', '5']),
    ('set_radius_rate_limit_vendor', ('G0', '5'), 'set', ['service', 'pppoe-server', 'authentication', 'radius', 'rate-limit', 'vendor', '5']),
    ('set_radius_server', ('192.0.2.1',), 'set', ['service', 'pppoe-server', 'authentication', 'radius', 'server', '192.0.2.1']),
    ('set_radius_server_acct_port', ('192.0.2.1', '1812'), 'set', ['service', 'pppoe-server', 'authentication', 'radius', 'server', '192.0.2.1', 'acct-port', '1812']),
    ('set_radius_server_backup', ('192.0.2.1',), 'set', ['service', 'pppoe-server', 'authentication', 'radius', 'server', '192.0.2.1', 'backup']),
    ('set_radius_server_disable', ('192.0.2.1',), 'set', ['service', 'pppoe-server', 'authentication', 'radius', 'server', '192.0.2.1', 'disable']),
    ('set_radius_server_disable_accounting', ('192.0.2.1',), 'set', ['service', 'pppoe-server', 'authentication', 'radius', 'server', '192.0.2.1', 'disable-accounting']),
    ('set_radius_server_fail_time', ('192.0.2.1', '5'), 'set', ['service', 'pppoe-server', 'authentication', 'radius', 'server', '192.0.2.1', 'fail-time', '5']),
    ('set_radius_server_key', ('192.0.2.1', 'k'), 'set', ['service', 'pppoe-server', 'authentication', 'radius', 'server', '192.0.2.1', 'key', 'k']),
    ('set_radius_server_port', ('192.0.2.1', '1812'), 'set', ['service', 'pppoe-server', 'authentication', 'radius', 'server', '192.0.2.1', 'port', '1812']),
    ('set_radius_server_priority', ('192.0.2.1', '1'), 'set', ['service', 'pppoe-server', 'authentication', 'radius', 'server', '192.0.2.1', 'priority', '1']),
    ('set_radius_source_address', ('G0', '192.0.2.1'), 'set', ['service', 'pppoe-server', 'authentication', 'radius', 'source-address', '192.0.2.1']),
    ('set_radius_timeout', ('G0', '5'), 'set', ['service', 'pppoe-server', 'authentication', 'radius', 'timeout', '5']),
    ('set_extended_scripts', ('G0',), 'set', ['service', 'pppoe-server', 'extended-scripts']),
    ('set_script_on_change', ('G0', '/config/scripts/up.sh'), 'set', ['service', 'pppoe-server', 'extended-scripts', 'on-change', '/config/scripts/up.sh']),
    ('set_script_on_down', ('G0', '/config/scripts/up.sh'), 'set', ['service', 'pppoe-server', 'extended-scripts', 'on-down', '/config/scripts/up.sh']),
    ('set_script_on_pre_up', ('G0', '/config/scripts/up.sh'), 'set', ['service', 'pppoe-server', 'extended-scripts', 'on-pre-up', '/config/scripts/up.sh']),
    ('set_script_on_up', ('G0', '/config/scripts/up.sh'), 'set', ['service', 'pppoe-server', 'extended-scripts', 'on-up', '/config/scripts/up.sh']),
    ('set_service_name', ('G0', '5'), 'set', ['service', 'pppoe-server', 'service-name', '5']),
    ('set_session_control', ('G0', '5'), 'set', ['service', 'pppoe-server', 'session-control', '5']),
    ('set_shaper', ('G0',), 'set', ['service', 'pppoe-server', 'shaper']),
    ('set_shaper_fwmark', ('G0', '5'), 'set', ['service', 'pppoe-server', 'shaper', 'fwmark', '5']),
    ('set_snmp', ('G0',), 'set', ['service', 'pppoe-server', 'snmp']),
    ('set_snmp_master_agent', ('G0',), 'set', ['service', 'pppoe-server', 'snmp', 'master-agent']),
    ('set_thread_count', ('G0', '5'), 'set', ['service', 'pppoe-server', 'thread-count', '5']),
    ('set_wins_server', ('G0', '192.0.2.1'), 'set', ['service', 'pppoe-server', 'wins-server', '192.0.2.1']),
]


@pytest.mark.parametrize("method, args, op, expected_path", COMMON_CASES)
@pytest.mark.parametrize("version", ["1.4", "1.5"])
def test_pppoe_server_common_paths(method, args, op, expected_path, version):
    _run(version, method, args, op, expected_path)


V15_ONLY_CASES = [
    ('delete_auth_any_login', ('G0',), 'delete', ['service', 'pppoe-server', 'authentication', 'any-login']),
    ('delete_interface_vlan_mon', ('eth0',), 'delete', ['service', 'pppoe-server', 'interface', 'eth0', 'vlan-mon']),
    ('delete_ppp_ipv6_peer_interface_id_secret', ('G0',), 'delete', ['service', 'pppoe-server', 'ppp-options', 'ipv6-peer-interface-id-secret']),
    ('set_auth_any_login', ('G0',), 'set', ['service', 'pppoe-server', 'authentication', 'any-login']),
    ('set_interface_vlan_mon', ('eth0',), 'set', ['service', 'pppoe-server', 'interface', 'eth0', 'vlan-mon']),
    ('set_ppp_ipv6_peer_interface_id_secret', ('G0', '5'), 'set', ['service', 'pppoe-server', 'ppp-options', 'ipv6-peer-interface-id-secret', '5']),
]


@pytest.mark.parametrize("method, args, op, expected_path", V15_ONLY_CASES)
@pytest.mark.parametrize("version", ["1.5", "2026.09.23-0027-rolling"])
def test_pppoe_server_v1_5_only_paths(method, args, op, expected_path, version):
    _run(version, method, args, op, expected_path)


@pytest.mark.parametrize("method, args, _op, _expected_path", V15_ONLY_CASES)
def test_pppoe_server_v1_5_only_ops_raise_on_1_4(method, args, _op, _expected_path):
    builder = PPPoEServerBatchBuilder(version="1.4.3")
    with pytest.raises(ValueError, match="is not supported on this device"):
        getattr(builder, method)(*args)
    assert builder.get_operations() == []


def test_every_builder_op_has_a_golden_row():
    names = {
        name
        for name, _ in inspect.getmembers(PPPoEServerBatchBuilder, inspect.isfunction)
        if name.startswith(("set_", "delete_", "create_"))
    }
    covered = {row[0] for row in COMMON_CASES + V15_ONLY_CASES}
    assert names - covered == set()
    assert covered - names == set()


def test_1_4_mapper_has_no_1_5_paths():
    assert type(get_pppoe_server_mapper("1.4.3")) is PPPoEServerMapper
    assert type(get_pppoe_server_mapper("2026.09.23-0027-rolling")) is PPPoEServerMapperV1_5
    assert PPPoEServerMapper("1.4").versioned_nodes() == frozenset()
    assert PPPoEServerMapperV1_5("1.5").versioned_nodes() == {
        "any_login", "vlan_mon", "ipv6_peer_interface_id_secret",
    }
    for method in (
        "get_auth_any_login",
        "get_interface_vlan_mon",
        "get_ppp_ipv6_peer_interface_id_secret",
        "get_ppp_ipv6_peer_interface_id_secret_delete",
    ):
        assert not hasattr(PPPoEServerMapper, method)


def test_no_vpp_cp_path():
    for cls in (PPPoEServerMapper, PPPoEServerMapperV1_5, PPPoEServerBatchBuilder):
        assert not [name for name in dir(cls) if "vpp" in name]


def test_versions_package_has_no_1_4_file():
    files = {p.name for p in Path(inspect.getfile(get_pppoe_server_mapper)).parent.glob("*.py")}
    assert files == {"__init__.py", "v1_5.py"}


@pytest.mark.parametrize("version,expected", [
    ("1.4.3", False),
    ("1.5", True),
    ("2026.09.23-0027-rolling", True),
])
def test_capabilities_read_the_allowlist(version, expected):
    caps = PPPoEServerBatchBuilder(version=version).get_capabilities()
    for flag in ("auth_any_login", "vlan_mon", "ipv6_peer_interface_id_secret"):
        assert caps["features"][flag] is expected
    assert "version_info" not in caps
    assert "vpp_cp" not in caps["features"]


def test_capabilities_flags_ignore_the_version_string(monkeypatch):
    """A 1.4 string with the 1.5 mapper reports 1.5 flags: the allowlist decides."""
    monkeypatch.setattr(
        "vyos_mappers.CommandMapperRegistry.get_mapper",
        lambda _key, version: PPPoEServerMapperV1_5(version),
    )
    caps = PPPoEServerBatchBuilder(version="1.4.3").get_capabilities()
    assert caps["features"]["vlan_mon"] is True
