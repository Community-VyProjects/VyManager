"""Golden (method, args, op, expected_path) cases for HighAvailabilityBatchBuilder.

Paths checked with validateTmplPath on 1.4 (100.64.64.50) and 1.5 (100.64.64.5).
Generated for issue #719; edit the tables directly if the mapper changes.
"""

import pytest

from vyos_builders.high_availability.high_availability import HighAvailabilityBatchBuilder


def _run(version, method, args, op, expected_path):
    builder = HighAvailabilityBatchBuilder(version=version)
    getattr(builder, method)(*args)
    operations = builder.get_operations()
    assert [(item["op"], item["path"]) for item in operations] == [(op, expected_path)]

COMMON_CASES = [
    ('delete_ha_disable', ('G0',), 'delete', ['high-availability', 'disable']),
    ('delete_virtual_server', ('G0',), 'delete', ['high-availability', 'virtual-server', 'G0']),
    ('delete_virtual_server_algorithm', ('G0',), 'delete', ['high-availability', 'virtual-server', 'G0', 'algorithm']),
    ('delete_virtual_server_delay_loop', ('G0',), 'delete', ['high-availability', 'virtual-server', 'G0', 'delay-loop']),
    ('delete_virtual_server_forward_method', ('G0',), 'delete', ['high-availability', 'virtual-server', 'G0', 'forward-method']),
    ('delete_virtual_server_fwmark', ('G0',), 'delete', ['high-availability', 'virtual-server', 'G0', 'fwmark']),
    ('delete_virtual_server_persistence_timeout', ('G0',), 'delete', ['high-availability', 'virtual-server', 'G0', 'persistence-timeout']),
    ('delete_virtual_server_port', ('G0',), 'delete', ['high-availability', 'virtual-server', 'G0', 'port']),
    ('delete_virtual_server_protocol', ('G0',), 'delete', ['high-availability', 'virtual-server', 'G0', 'protocol']),
    ('delete_virtual_server_real_server', ('G0', '192.0.2.1'), 'delete', ['high-availability', 'virtual-server', 'G0', 'real-server', '192.0.2.1']),
    ('delete_vrrp_global_garp_interval', ('G0',), 'delete', ['high-availability', 'vrrp', 'global-parameters', 'garp', 'interval']),
    ('delete_vrrp_global_garp_master_delay', ('G0',), 'delete', ['high-availability', 'vrrp', 'global-parameters', 'garp', 'master-delay']),
    ('delete_vrrp_global_garp_master_refresh', ('G0',), 'delete', ['high-availability', 'vrrp', 'global-parameters', 'garp', 'master-refresh']),
    ('delete_vrrp_global_garp_master_refresh_repeat', ('G0',), 'delete', ['high-availability', 'vrrp', 'global-parameters', 'garp', 'master-refresh-repeat']),
    ('delete_vrrp_global_garp_master_repeat', ('G0',), 'delete', ['high-availability', 'vrrp', 'global-parameters', 'garp', 'master-repeat']),
    ('delete_vrrp_global_startup_delay', ('G0',), 'delete', ['high-availability', 'vrrp', 'global-parameters', 'startup-delay']),
    ('delete_vrrp_global_version', ('G0',), 'delete', ['high-availability', 'vrrp', 'global-parameters', 'version']),
    ('delete_vrrp_group', ('G0',), 'delete', ['high-availability', 'vrrp', 'group', 'G0']),
    ('delete_vrrp_group_address', ('G0', '192.0.2.1'), 'delete', ['high-availability', 'vrrp', 'group', 'G0', 'address', '192.0.2.1']),
    ('delete_vrrp_group_address_interface', ('G0', '192.0.2.1'), 'delete', ['high-availability', 'vrrp', 'group', 'G0', 'address', '192.0.2.1', 'interface']),
    ('delete_vrrp_group_auth', ('G0',), 'delete', ['high-availability', 'vrrp', 'group', 'G0', 'authentication']),
    ('delete_vrrp_group_description', ('G0',), 'delete', ['high-availability', 'vrrp', 'group', 'G0', 'description']),
    ('delete_vrrp_group_disable', ('G0',), 'delete', ['high-availability', 'vrrp', 'group', 'G0', 'disable']),
    ('delete_vrrp_group_excluded_address', ('G0', '192.0.2.1'), 'delete', ['high-availability', 'vrrp', 'group', 'G0', 'excluded-address', '192.0.2.1']),
    ('delete_vrrp_group_garp', ('G0',), 'delete', ['high-availability', 'vrrp', 'group', 'G0', 'garp']),
    ('delete_vrrp_group_health_check', ('G0',), 'delete', ['high-availability', 'vrrp', 'group', 'G0', 'health-check']),
    ('delete_vrrp_group_hello_source_address', ('G0',), 'delete', ['high-availability', 'vrrp', 'group', 'G0', 'hello-source-address']),
    ('delete_vrrp_group_no_preempt', ('G0',), 'delete', ['high-availability', 'vrrp', 'group', 'G0', 'no-preempt']),
    ('delete_vrrp_group_peer_address', ('G0', 'G0'), 'delete', ['high-availability', 'vrrp', 'group', 'G0', 'peer-address', 'G0']),
    ('delete_vrrp_group_preempt_delay', ('G0',), 'delete', ['high-availability', 'vrrp', 'group', 'G0', 'preempt-delay']),
    ('delete_vrrp_group_rfc3768_compatibility', ('G0',), 'delete', ['high-availability', 'vrrp', 'group', 'G0', 'rfc3768-compatibility']),
    ('delete_vrrp_group_track', ('G0',), 'delete', ['high-availability', 'vrrp', 'group', 'G0', 'track']),
    ('delete_vrrp_group_track_exclude_vrrp_interface', ('G0',), 'delete', ['high-availability', 'vrrp', 'group', 'G0', 'track', 'exclude-vrrp-interface']),
    ('delete_vrrp_group_track_interface', ('G0', 'eth0'), 'delete', ['high-availability', 'vrrp', 'group', 'G0', 'track', 'interface', 'eth0']),
    ('delete_vrrp_group_transition_script', ('G0',), 'delete', ['high-availability', 'vrrp', 'group', 'G0', 'transition-script']),
    ('delete_vrrp_snmp', ('G0',), 'delete', ['high-availability', 'vrrp', 'snmp']),
    ('delete_vrrp_sync_group', ('G0',), 'delete', ['high-availability', 'vrrp', 'sync-group', 'G0']),
    ('delete_vrrp_sync_group_health_check', ('G0',), 'delete', ['high-availability', 'vrrp', 'sync-group', 'G0', 'health-check']),
    ('delete_vrrp_sync_group_member', ('G0', 'G0'), 'delete', ['high-availability', 'vrrp', 'sync-group', 'G0', 'member', 'G0']),
    ('delete_vrrp_sync_group_transition_script', ('G0',), 'delete', ['high-availability', 'vrrp', 'sync-group', 'G0', 'transition-script']),
    ('set_ha_disable', ('G0',), 'set', ['high-availability', 'disable']),
    ('set_virtual_server_address', ('G0', '192.0.2.1'), 'set', ['high-availability', 'virtual-server', 'G0', 'address', '192.0.2.1']),
    ('set_virtual_server_algorithm', ('G0', 'round-robin'), 'set', ['high-availability', 'virtual-server', 'G0', 'algorithm', 'round-robin']),
    ('set_virtual_server_delay_loop', ('G0', '5'), 'set', ['high-availability', 'virtual-server', 'G0', 'delay-loop', '5']),
    ('set_virtual_server_forward_method', ('G0', 'nat'), 'set', ['high-availability', 'virtual-server', 'G0', 'forward-method', 'nat']),
    ('set_virtual_server_fwmark', ('G0', '5'), 'set', ['high-availability', 'virtual-server', 'G0', 'fwmark', '5']),
    ('set_virtual_server_persistence_timeout', ('G0', '5'), 'set', ['high-availability', 'virtual-server', 'G0', 'persistence-timeout', '5']),
    ('set_virtual_server_port', ('G0', '8080'), 'set', ['high-availability', 'virtual-server', 'G0', 'port', '8080']),
    ('set_virtual_server_protocol', ('G0', 'tcp'), 'set', ['high-availability', 'virtual-server', 'G0', 'protocol', 'tcp']),
    ('set_virtual_server_real_server', ('G0', '192.0.2.1'), 'set', ['high-availability', 'virtual-server', 'G0', 'real-server', '192.0.2.1']),
    ('set_virtual_server_real_server_connection_timeout', ('G0', '192.0.2.10|5'), 'set', ['high-availability', 'virtual-server', 'G0', 'real-server', '192.0.2.10', 'connection-timeout', '5']),
    ('set_virtual_server_real_server_health_check_script', ('G0', '192.0.2.10|/config/scripts/x.sh'), 'set', ['high-availability', 'virtual-server', 'G0', 'real-server', '192.0.2.10', 'health-check', 'script', '/config/scripts/x.sh']),
    ('set_virtual_server_real_server_port', ('G0', '192.0.2.10|8080'), 'set', ['high-availability', 'virtual-server', 'G0', 'real-server', '192.0.2.10', 'port', '8080']),
    ('set_vrrp_global_garp_interval', ('G0', '5'), 'set', ['high-availability', 'vrrp', 'global-parameters', 'garp', 'interval', '5']),
    ('set_vrrp_global_garp_master_delay', ('G0', '5'), 'set', ['high-availability', 'vrrp', 'global-parameters', 'garp', 'master-delay', '5']),
    ('set_vrrp_global_garp_master_refresh', ('G0', '5'), 'set', ['high-availability', 'vrrp', 'global-parameters', 'garp', 'master-refresh', '5']),
    ('set_vrrp_global_garp_master_refresh_repeat', ('G0', '5'), 'set', ['high-availability', 'vrrp', 'global-parameters', 'garp', 'master-refresh-repeat', '5']),
    ('set_vrrp_global_garp_master_repeat', ('G0', '5'), 'set', ['high-availability', 'vrrp', 'global-parameters', 'garp', 'master-repeat', '5']),
    ('set_vrrp_global_startup_delay', ('G0', '5'), 'set', ['high-availability', 'vrrp', 'global-parameters', 'startup-delay', '5']),
    ('set_vrrp_global_version', ('G0', '5'), 'set', ['high-availability', 'vrrp', 'global-parameters', 'version', '5']),
    ('set_vrrp_group_address', ('G0', '192.0.2.1'), 'set', ['high-availability', 'vrrp', 'group', 'G0', 'address', '192.0.2.1']),
    ('set_vrrp_group_address_interface', ('G0', '192.0.2.1|eth0'), 'set', ['high-availability', 'vrrp', 'group', 'G0', 'address', '192.0.2.1', 'interface', 'eth0']),
    ('set_vrrp_group_advertise_interval', ('G0', '5'), 'set', ['high-availability', 'vrrp', 'group', 'G0', 'advertise-interval', '5']),
    ('set_vrrp_group_auth_password', ('G0', 'secret'), 'set', ['high-availability', 'vrrp', 'group', 'G0', 'authentication', 'password', 'secret']),
    ('set_vrrp_group_auth_type', ('G0', 'plaintext'), 'set', ['high-availability', 'vrrp', 'group', 'G0', 'authentication', 'type', 'plaintext']),
    ('set_vrrp_group_description', ('G0', 'lab'), 'set', ['high-availability', 'vrrp', 'group', 'G0', 'description', 'lab']),
    ('set_vrrp_group_disable', ('G0',), 'set', ['high-availability', 'vrrp', 'group', 'G0', 'disable']),
    ('set_vrrp_group_excluded_address', ('G0', '192.0.2.1'), 'set', ['high-availability', 'vrrp', 'group', 'G0', 'excluded-address', '192.0.2.1']),
    ('set_vrrp_group_excluded_address_interface', ('G0', '192.0.2.1|eth0'), 'set', ['high-availability', 'vrrp', 'group', 'G0', 'excluded-address', '192.0.2.1', 'interface', 'eth0']),
    ('set_vrrp_group_garp_interval', ('G0', '5'), 'set', ['high-availability', 'vrrp', 'group', 'G0', 'garp', 'interval', '5']),
    ('set_vrrp_group_garp_master_delay', ('G0', '5'), 'set', ['high-availability', 'vrrp', 'group', 'G0', 'garp', 'master-delay', '5']),
    ('set_vrrp_group_garp_master_refresh', ('G0', '5'), 'set', ['high-availability', 'vrrp', 'group', 'G0', 'garp', 'master-refresh', '5']),
    ('set_vrrp_group_garp_master_refresh_repeat', ('G0', '5'), 'set', ['high-availability', 'vrrp', 'group', 'G0', 'garp', 'master-refresh-repeat', '5']),
    ('set_vrrp_group_garp_master_repeat', ('G0', '5'), 'set', ['high-availability', 'vrrp', 'group', 'G0', 'garp', 'master-repeat', '5']),
    ('set_vrrp_group_health_check_failure_count', ('G0', '5'), 'set', ['high-availability', 'vrrp', 'group', 'G0', 'health-check', 'failure-count', '5']),
    ('set_vrrp_group_health_check_interval', ('G0', '5'), 'set', ['high-availability', 'vrrp', 'group', 'G0', 'health-check', 'interval', '5']),
    ('set_vrrp_group_health_check_ping', ('G0', '5'), 'set', ['high-availability', 'vrrp', 'group', 'G0', 'health-check', 'ping', '5']),
    ('set_vrrp_group_health_check_script', ('G0', '5'), 'set', ['high-availability', 'vrrp', 'group', 'G0', 'health-check', 'script', '5']),
    ('set_vrrp_group_hello_source_address', ('G0', '192.0.2.1'), 'set', ['high-availability', 'vrrp', 'group', 'G0', 'hello-source-address', '192.0.2.1']),
    ('set_vrrp_group_interface', ('G0', 'eth0'), 'set', ['high-availability', 'vrrp', 'group', 'G0', 'interface', 'eth0']),
    ('set_vrrp_group_no_preempt', ('G0',), 'set', ['high-availability', 'vrrp', 'group', 'G0', 'no-preempt']),
    ('set_vrrp_group_peer_address', ('G0', 'G0'), 'set', ['high-availability', 'vrrp', 'group', 'G0', 'peer-address', 'G0']),
    ('set_vrrp_group_preempt_delay', ('G0', '5'), 'set', ['high-availability', 'vrrp', 'group', 'G0', 'preempt-delay', '5']),
    ('set_vrrp_group_priority', ('G0', '5'), 'set', ['high-availability', 'vrrp', 'group', 'G0', 'priority', '5']),
    ('set_vrrp_group_rfc3768_compatibility', ('G0',), 'set', ['high-availability', 'vrrp', 'group', 'G0', 'rfc3768-compatibility']),
    ('set_vrrp_group_track_exclude_vrrp_interface', ('G0',), 'set', ['high-availability', 'vrrp', 'group', 'G0', 'track', 'exclude-vrrp-interface']),
    ('set_vrrp_group_track_interface', ('G0', 'eth0'), 'set', ['high-availability', 'vrrp', 'group', 'G0', 'track', 'interface', 'eth0']),
    ('set_vrrp_group_transition_script_backup', ('G0', '/config/scripts/x.sh'), 'set', ['high-availability', 'vrrp', 'group', 'G0', 'transition-script', 'backup', '/config/scripts/x.sh']),
    ('set_vrrp_group_transition_script_fault', ('G0', '/config/scripts/x.sh'), 'set', ['high-availability', 'vrrp', 'group', 'G0', 'transition-script', 'fault', '/config/scripts/x.sh']),
    ('set_vrrp_group_transition_script_master', ('G0', '/config/scripts/x.sh'), 'set', ['high-availability', 'vrrp', 'group', 'G0', 'transition-script', 'master', '/config/scripts/x.sh']),
    ('set_vrrp_group_transition_script_stop', ('G0', '/config/scripts/x.sh'), 'set', ['high-availability', 'vrrp', 'group', 'G0', 'transition-script', 'stop', '/config/scripts/x.sh']),
    ('set_vrrp_group_vrid', ('G0', '10'), 'set', ['high-availability', 'vrrp', 'group', 'G0', 'vrid', '10']),
    ('set_vrrp_snmp', ('G0',), 'set', ['high-availability', 'vrrp', 'snmp']),
    ('set_vrrp_sync_group_health_check_failure_count', ('G0', '5'), 'set', ['high-availability', 'vrrp', 'sync-group', 'G0', 'health-check', 'failure-count', '5']),
    ('set_vrrp_sync_group_health_check_interval', ('G0', '5'), 'set', ['high-availability', 'vrrp', 'sync-group', 'G0', 'health-check', 'interval', '5']),
    ('set_vrrp_sync_group_health_check_ping', ('G0', '5'), 'set', ['high-availability', 'vrrp', 'sync-group', 'G0', 'health-check', 'ping', '5']),
    ('set_vrrp_sync_group_health_check_script', ('G0', '5'), 'set', ['high-availability', 'vrrp', 'sync-group', 'G0', 'health-check', 'script', '5']),
    ('set_vrrp_sync_group_member', ('G0', 'G0'), 'set', ['high-availability', 'vrrp', 'sync-group', 'G0', 'member', 'G0']),
    ('set_vrrp_sync_group_transition_script_backup', ('G0', '/config/scripts/x.sh'), 'set', ['high-availability', 'vrrp', 'sync-group', 'G0', 'transition-script', 'backup', '/config/scripts/x.sh']),
    ('set_vrrp_sync_group_transition_script_fault', ('G0', '/config/scripts/x.sh'), 'set', ['high-availability', 'vrrp', 'sync-group', 'G0', 'transition-script', 'fault', '/config/scripts/x.sh']),
    ('set_vrrp_sync_group_transition_script_master', ('G0', '/config/scripts/x.sh'), 'set', ['high-availability', 'vrrp', 'sync-group', 'G0', 'transition-script', 'master', '/config/scripts/x.sh']),
    ('set_vrrp_sync_group_transition_script_stop', ('G0', '/config/scripts/x.sh'), 'set', ['high-availability', 'vrrp', 'sync-group', 'G0', 'transition-script', 'stop', '/config/scripts/x.sh']),
]


@pytest.mark.parametrize("method, args, op, expected_path", COMMON_CASES)
@pytest.mark.parametrize("version", ["1.4", "1.5"])
def test_high_availability_common_paths(method, args, op, expected_path, version):
    _run(version, method, args, op, expected_path)
