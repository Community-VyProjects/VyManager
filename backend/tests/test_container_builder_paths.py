"""Golden (method, args, op, path) cases for ContainerBatchBuilder.

Every set_/delete_ op on the builder has a row. COMMON_CASES are leaves both
labs have; V15_ONLY_CASES are leaves only the 1.5 lab has, so the 1.4 builder
raises ValueError for them (the batch router turns that into a 400).
"""

import inspect
import re

import pytest

from vyos_builders.container.container_batch_builder import ContainerBatchBuilder

ROLLING = "2026.09.23-0027-rolling"

COMMON_CASES = [
    ('delete_container_root', (), 'delete', ['container']),
    ('delete_name', ('web',), 'delete', ['container', 'name', 'web']),
    ('delete_name_allow_host_networks', ('web',), 'delete', ['container', 'name', 'web', 'allow-host-networks']),
    ('delete_name_allow_host_pid', ('web',), 'delete', ['container', 'name', 'web', 'allow-host-pid']),
    ('delete_name_arguments', ('web',), 'delete', ['container', 'name', 'web', 'arguments']),
    ('delete_name_capabilities', ('web',), 'delete', ['container', 'name', 'web', 'capability']),
    ('delete_name_capability', ('web', 'net-admin'), 'delete', ['container', 'name', 'web', 'capability', 'net-admin']),
    ('delete_name_command', ('web',), 'delete', ['container', 'name', 'web', 'command']),
    ('delete_name_cpu_quota', ('web',), 'delete', ['container', 'name', 'web', 'cpu-quota']),
    ('delete_name_description', ('web',), 'delete', ['container', 'name', 'web', 'description']),
    ('delete_name_device', ('web', 'dev0'), 'delete', ['container', 'name', 'web', 'device', 'dev0']),
    ('delete_name_device_destination', ('web', 'dev0'), 'delete', ['container', 'name', 'web', 'device', 'dev0', 'destination']),
    ('delete_name_device_source', ('web', 'dev0'), 'delete', ['container', 'name', 'web', 'device', 'dev0', 'source']),
    ('delete_name_disable', ('web',), 'delete', ['container', 'name', 'web', 'disable']),
    ('delete_name_entrypoint', ('web',), 'delete', ['container', 'name', 'web', 'entrypoint']),
    ('delete_name_environment', ('web', 'TZ'), 'delete', ['container', 'name', 'web', 'environment', 'TZ']),
    ('delete_name_environment_value', ('web', 'TZ'), 'delete', ['container', 'name', 'web', 'environment', 'TZ', 'value']),
    ('delete_name_environments', ('web',), 'delete', ['container', 'name', 'web', 'environment']),
    ('delete_name_gid', ('web',), 'delete', ['container', 'name', 'web', 'gid']),
    ('delete_name_host_name', ('web',), 'delete', ['container', 'name', 'web', 'host-name']),
    ('delete_name_image', ('web',), 'delete', ['container', 'name', 'web', 'image']),
    ('delete_name_label', ('web', 'app'), 'delete', ['container', 'name', 'web', 'label', 'app']),
    ('delete_name_label_value', ('web', 'app'), 'delete', ['container', 'name', 'web', 'label', 'app', 'value']),
    ('delete_name_labels', ('web',), 'delete', ['container', 'name', 'web', 'label']),
    ('delete_name_memory', ('web',), 'delete', ['container', 'name', 'web', 'memory']),
    ('delete_name_name_server', ('web', '192.0.2.10'), 'delete', ['container', 'name', 'web', 'name-server', '192.0.2.10']),
    ('delete_name_name_servers', ('web',), 'delete', ['container', 'name', 'web', 'name-server']),
    ('delete_name_network', ('web', 'lan'), 'delete', ['container', 'name', 'web', 'network', 'lan']),
    ('delete_name_network_address', ('web', 'lan', '192.0.2.10'), 'delete', ['container', 'name', 'web', 'network', 'lan', 'address', '192.0.2.10']),
    ('delete_name_network_addresses', ('web', 'lan'), 'delete', ['container', 'name', 'web', 'network', 'lan', 'address']),
    ('delete_name_port', ('web', 'http'), 'delete', ['container', 'name', 'web', 'port', 'http']),
    ('delete_name_port_destination', ('web', 'http'), 'delete', ['container', 'name', 'web', 'port', 'http', 'destination']),
    ('delete_name_port_listen_address', ('web', 'http', '192.0.2.10'), 'delete', ['container', 'name', 'web', 'port', 'http', 'listen-address', '192.0.2.10']),
    ('delete_name_port_listen_addresses', ('web', 'http'), 'delete', ['container', 'name', 'web', 'port', 'http', 'listen-address']),
    ('delete_name_port_protocol', ('web', 'http'), 'delete', ['container', 'name', 'web', 'port', 'http', 'protocol']),
    ('delete_name_port_source', ('web', 'http'), 'delete', ['container', 'name', 'web', 'port', 'http', 'source']),
    ('delete_name_privileged', ('web',), 'delete', ['container', 'name', 'web', 'privileged']),
    ('delete_name_restart', ('web',), 'delete', ['container', 'name', 'web', 'restart']),
    ('delete_name_shared_memory', ('web',), 'delete', ['container', 'name', 'web', 'shared-memory']),
    ('delete_name_sysctl', ('web',), 'delete', ['container', 'name', 'web', 'sysctl']),
    ('delete_name_sysctl_parameter', ('web', 'net.ipv4.ip_forward'), 'delete', ['container', 'name', 'web', 'sysctl', 'parameter', 'net.ipv4.ip_forward']),
    ('delete_name_sysctl_parameter_value', ('web', 'net.ipv4.ip_forward'), 'delete', ['container', 'name', 'web', 'sysctl', 'parameter', 'net.ipv4.ip_forward', 'value']),
    ('delete_name_uid', ('web',), 'delete', ['container', 'name', 'web', 'uid']),
    ('delete_name_volume', ('web', 'data'), 'delete', ['container', 'name', 'web', 'volume', 'data']),
    ('delete_name_volume_destination', ('web', 'data'), 'delete', ['container', 'name', 'web', 'volume', 'data', 'destination']),
    ('delete_name_volume_mode', ('web', 'data'), 'delete', ['container', 'name', 'web', 'volume', 'data', 'mode']),
    ('delete_name_volume_propagation', ('web', 'data'), 'delete', ['container', 'name', 'web', 'volume', 'data', 'propagation']),
    ('delete_name_volume_source', ('web', 'data'), 'delete', ['container', 'name', 'web', 'volume', 'data', 'source']),
    ('delete_network', ('lan',), 'delete', ['container', 'network', 'lan']),
    ('delete_network_description', ('lan',), 'delete', ['container', 'network', 'lan', 'description']),
    ('delete_network_no_name_server', ('lan',), 'delete', ['container', 'network', 'lan', 'no-name-server']),
    ('delete_network_prefix', ('lan', '192.0.2.0/24'), 'delete', ['container', 'network', 'lan', 'prefix', '192.0.2.0/24']),
    ('delete_network_prefixes', ('lan',), 'delete', ['container', 'network', 'lan', 'prefix']),
    ('delete_network_vrf', ('lan',), 'delete', ['container', 'network', 'lan', 'vrf']),
    ('delete_registry', ('ghcr.io',), 'delete', ['container', 'registry', 'ghcr.io']),
    ('delete_registry_auth', ('ghcr.io',), 'delete', ['container', 'registry', 'ghcr.io', 'authentication']),
    ('delete_registry_auth_password', ('ghcr.io',), 'delete', ['container', 'registry', 'ghcr.io', 'authentication', 'password']),
    ('delete_registry_auth_username', ('ghcr.io',), 'delete', ['container', 'registry', 'ghcr.io', 'authentication', 'username']),
    ('delete_registry_disable', ('ghcr.io',), 'delete', ['container', 'registry', 'ghcr.io', 'disable']),
    ('set_name', ('web',), 'set', ['container', 'name', 'web']),
    ('set_name_allow_host_networks', ('web',), 'set', ['container', 'name', 'web', 'allow-host-networks']),
    ('set_name_allow_host_pid', ('web',), 'set', ['container', 'name', 'web', 'allow-host-pid']),
    ('set_name_arguments', ('web', '--debug'), 'set', ['container', 'name', 'web', 'arguments', '--debug']),
    ('set_name_capability', ('web', 'net-admin'), 'set', ['container', 'name', 'web', 'capability', 'net-admin']),
    ('set_name_command', ('web', '/bin/sh'), 'set', ['container', 'name', 'web', 'command', '/bin/sh']),
    ('set_name_cpu_quota', ('web', '1.5'), 'set', ['container', 'name', 'web', 'cpu-quota', '1.5']),
    ('set_name_description', ('web', 'test'), 'set', ['container', 'name', 'web', 'description', 'test']),
    ('set_name_device', ('web', 'dev0'), 'set', ['container', 'name', 'web', 'device', 'dev0']),
    ('set_name_device_destination', ('web', 'dev0', '/dev/ttyS0'), 'set', ['container', 'name', 'web', 'device', 'dev0', 'destination', '/dev/ttyS0']),
    ('set_name_device_source', ('web', 'dev0', '/dev/ttyS0'), 'set', ['container', 'name', 'web', 'device', 'dev0', 'source', '/dev/ttyS0']),
    ('set_name_disable', ('web',), 'set', ['container', 'name', 'web', 'disable']),
    ('set_name_entrypoint', ('web', '/init'), 'set', ['container', 'name', 'web', 'entrypoint', '/init']),
    ('set_name_environment', ('web', 'TZ'), 'set', ['container', 'name', 'web', 'environment', 'TZ']),
    ('set_name_environment_value', ('web', 'TZ', 'UTC'), 'set', ['container', 'name', 'web', 'environment', 'TZ', 'value', 'UTC']),
    ('set_name_gid', ('web', '1000'), 'set', ['container', 'name', 'web', 'gid', '1000']),
    ('set_name_host_name', ('web', 'web1'), 'set', ['container', 'name', 'web', 'host-name', 'web1']),
    ('set_name_image', ('web', 'nginx:1.27'), 'set', ['container', 'name', 'web', 'image', 'nginx:1.27']),
    ('set_name_label', ('web', 'app'), 'set', ['container', 'name', 'web', 'label', 'app']),
    ('set_name_label_value', ('web', 'app', 'web'), 'set', ['container', 'name', 'web', 'label', 'app', 'value', 'web']),
    ('set_name_memory', ('web', '512'), 'set', ['container', 'name', 'web', 'memory', '512']),
    ('set_name_name_server', ('web', '192.0.2.10'), 'set', ['container', 'name', 'web', 'name-server', '192.0.2.10']),
    ('set_name_network', ('web', 'lan'), 'set', ['container', 'name', 'web', 'network', 'lan']),
    ('set_name_network_address', ('web', 'lan', '192.0.2.10'), 'set', ['container', 'name', 'web', 'network', 'lan', 'address', '192.0.2.10']),
    ('set_name_port', ('web', 'http'), 'set', ['container', 'name', 'web', 'port', 'http']),
    ('set_name_port_destination', ('web', 'http', '80'), 'set', ['container', 'name', 'web', 'port', 'http', 'destination', '80']),
    ('set_name_port_listen_address', ('web', 'http', '192.0.2.10'), 'set', ['container', 'name', 'web', 'port', 'http', 'listen-address', '192.0.2.10']),
    ('set_name_port_protocol', ('web', 'http', 'tcp'), 'set', ['container', 'name', 'web', 'port', 'http', 'protocol', 'tcp']),
    ('set_name_port_source', ('web', 'http', '8080'), 'set', ['container', 'name', 'web', 'port', 'http', 'source', '8080']),
    ('set_name_privileged', ('web',), 'set', ['container', 'name', 'web', 'privileged']),
    ('set_name_restart', ('web', 'always'), 'set', ['container', 'name', 'web', 'restart', 'always']),
    ('set_name_shared_memory', ('web', '64'), 'set', ['container', 'name', 'web', 'shared-memory', '64']),
    ('set_name_sysctl_parameter', ('web', 'net.ipv4.ip_forward'), 'set', ['container', 'name', 'web', 'sysctl', 'parameter', 'net.ipv4.ip_forward']),
    ('set_name_sysctl_parameter_value', ('web', 'net.ipv4.ip_forward', '1'), 'set', ['container', 'name', 'web', 'sysctl', 'parameter', 'net.ipv4.ip_forward', 'value', '1']),
    ('set_name_uid', ('web', '1000'), 'set', ['container', 'name', 'web', 'uid', '1000']),
    ('set_name_volume', ('web', 'data'), 'set', ['container', 'name', 'web', 'volume', 'data']),
    ('set_name_volume_destination', ('web', 'data', '/data'), 'set', ['container', 'name', 'web', 'volume', 'data', 'destination', '/data']),
    ('set_name_volume_mode', ('web', 'data', 'ro'), 'set', ['container', 'name', 'web', 'volume', 'data', 'mode', 'ro']),
    ('set_name_volume_propagation', ('web', 'data', 'rshared'), 'set', ['container', 'name', 'web', 'volume', 'data', 'propagation', 'rshared']),
    ('set_name_volume_source', ('web', 'data', '/config/containers/web/data'), 'set', ['container', 'name', 'web', 'volume', 'data', 'source', '/config/containers/web/data']),
    ('set_network', ('lan',), 'set', ['container', 'network', 'lan']),
    ('set_network_description', ('lan', 'test'), 'set', ['container', 'network', 'lan', 'description', 'test']),
    ('set_network_no_name_server', ('lan',), 'set', ['container', 'network', 'lan', 'no-name-server']),
    ('set_network_prefix', ('lan', '192.0.2.0/24'), 'set', ['container', 'network', 'lan', 'prefix', '192.0.2.0/24']),
    ('set_network_vrf', ('lan', 'blue'), 'set', ['container', 'network', 'lan', 'vrf', 'blue']),
    ('set_registry', ('ghcr.io',), 'set', ['container', 'registry', 'ghcr.io']),
    ('set_registry_auth_password', ('ghcr.io', 'pw'), 'set', ['container', 'registry', 'ghcr.io', 'authentication', 'password', 'pw']),
    ('set_registry_auth_username', ('ghcr.io', 'alice'), 'set', ['container', 'registry', 'ghcr.io', 'authentication', 'username', 'alice']),
    ('set_registry_disable', ('ghcr.io',), 'set', ['container', 'registry', 'ghcr.io', 'disable']),
]

V15_ONLY_CASES = [
    ('delete_name_allow_host_cgroups', ('web',), 'delete', ['container', 'name', 'web', 'allow-host-cgroups']),
    ('delete_name_health_check', ('web',), 'delete', ['container', 'name', 'web', 'health-check']),
    ('delete_name_health_check_command', ('web',), 'delete', ['container', 'name', 'web', 'health-check', 'command']),
    ('delete_name_health_check_interval', ('web',), 'delete', ['container', 'name', 'web', 'health-check', 'interval']),
    ('delete_name_health_check_retry', ('web',), 'delete', ['container', 'name', 'web', 'health-check', 'retry']),
    ('delete_name_health_check_timeout', ('web',), 'delete', ['container', 'name', 'web', 'health-check', 'timeout']),
    ('delete_name_log_driver', ('web',), 'delete', ['container', 'name', 'web', 'log-driver']),
    ('delete_name_network_mac', ('web', 'lan'), 'delete', ['container', 'name', 'web', 'network', 'lan', 'mac']),
    ('delete_name_stop_timeout', ('web',), 'delete', ['container', 'name', 'web', 'stop-timeout']),
    ('delete_name_tmpfs', ('web', 'cache'), 'delete', ['container', 'name', 'web', 'tmpfs', 'cache']),
    ('delete_name_tmpfs_destination', ('web', 'cache'), 'delete', ['container', 'name', 'web', 'tmpfs', 'cache', 'destination']),
    ('delete_name_tmpfs_size', ('web', 'cache'), 'delete', ['container', 'name', 'web', 'tmpfs', 'cache', 'size']),
    ('delete_network_gateway', ('lan', '192.0.2.1'), 'delete', ['container', 'network', 'lan', 'gateway', '192.0.2.1']),
    ('delete_network_gateways', ('lan',), 'delete', ['container', 'network', 'lan', 'gateway']),
    ('delete_network_mtu', ('lan',), 'delete', ['container', 'network', 'lan', 'mtu']),
    ('delete_network_type', ('lan',), 'delete', ['container', 'network', 'lan', 'type']),
    ('delete_network_type_macvlan_mode', ('lan',), 'delete', ['container', 'network', 'lan', 'type', 'macvlan', 'mode']),
    ('delete_network_type_macvlan_parent', ('lan',), 'delete', ['container', 'network', 'lan', 'type', 'macvlan', 'parent']),
    ('delete_registry_insecure', ('ghcr.io',), 'delete', ['container', 'registry', 'ghcr.io', 'insecure']),
    ('delete_registry_mirror', ('ghcr.io',), 'delete', ['container', 'registry', 'ghcr.io', 'mirror']),
    ('delete_registry_mirror_address', ('ghcr.io',), 'delete', ['container', 'registry', 'ghcr.io', 'mirror', 'address']),
    ('delete_registry_mirror_host_name', ('ghcr.io',), 'delete', ['container', 'registry', 'ghcr.io', 'mirror', 'host-name']),
    ('delete_registry_mirror_path', ('ghcr.io',), 'delete', ['container', 'registry', 'ghcr.io', 'mirror', 'path']),
    ('delete_registry_mirror_port', ('ghcr.io',), 'delete', ['container', 'registry', 'ghcr.io', 'mirror', 'port']),
    ('set_name_allow_host_cgroups', ('web',), 'set', ['container', 'name', 'web', 'allow-host-cgroups']),
    ('set_name_health_check_command', ('web', '/bin/sh'), 'set', ['container', 'name', 'web', 'health-check', 'command', '/bin/sh']),
    ('set_name_health_check_interval', ('web', '30'), 'set', ['container', 'name', 'web', 'health-check', 'interval', '30']),
    ('set_name_health_check_retry', ('web', '3'), 'set', ['container', 'name', 'web', 'health-check', 'retry', '3']),
    ('set_name_health_check_timeout', ('web', '10'), 'set', ['container', 'name', 'web', 'health-check', 'timeout', '10']),
    ('set_name_log_driver', ('web', 'journald'), 'set', ['container', 'name', 'web', 'log-driver', 'journald']),
    ('set_name_network_mac', ('web', 'lan', '00:53:00:00:00:01'), 'set', ['container', 'name', 'web', 'network', 'lan', 'mac', '00:53:00:00:00:01']),
    ('set_name_stop_timeout', ('web', '30'), 'set', ['container', 'name', 'web', 'stop-timeout', '30']),
    ('set_name_tmpfs', ('web', 'cache'), 'set', ['container', 'name', 'web', 'tmpfs', 'cache']),
    ('set_name_tmpfs_destination', ('web', 'cache', '/cache'), 'set', ['container', 'name', 'web', 'tmpfs', 'cache', 'destination', '/cache']),
    ('set_name_tmpfs_size', ('web', 'cache', '64'), 'set', ['container', 'name', 'web', 'tmpfs', 'cache', 'size', '64']),
    ('set_network_gateway', ('lan', '192.0.2.1'), 'set', ['container', 'network', 'lan', 'gateway', '192.0.2.1']),
    ('set_network_mtu', ('lan', '1500'), 'set', ['container', 'network', 'lan', 'mtu', '1500']),
    ('set_network_type_bridge', ('lan',), 'set', ['container', 'network', 'lan', 'type', 'bridge']),
    ('set_network_type_macvlan', ('lan',), 'set', ['container', 'network', 'lan', 'type', 'macvlan']),
    ('set_network_type_macvlan_mode', ('lan', 'bridge'), 'set', ['container', 'network', 'lan', 'type', 'macvlan', 'mode', 'bridge']),
    ('set_network_type_macvlan_parent', ('lan', 'eth0'), 'set', ['container', 'network', 'lan', 'type', 'macvlan', 'parent', 'eth0']),
    ('set_registry_insecure', ('ghcr.io',), 'set', ['container', 'registry', 'ghcr.io', 'insecure']),
    ('set_registry_mirror', ('ghcr.io',), 'set', ['container', 'registry', 'ghcr.io', 'mirror']),
    ('set_registry_mirror_address', ('ghcr.io', '192.0.2.10'), 'set', ['container', 'registry', 'ghcr.io', 'mirror', 'address', '192.0.2.10']),
    ('set_registry_mirror_host_name', ('ghcr.io', 'mirror.example.com'), 'set', ['container', 'registry', 'ghcr.io', 'mirror', 'host-name', 'mirror.example.com']),
    ('set_registry_mirror_path', ('ghcr.io', '/v2'), 'set', ['container', 'registry', 'ghcr.io', 'mirror', 'path', '/v2']),
    ('set_registry_mirror_port', ('ghcr.io', '5000'), 'set', ['container', 'registry', 'ghcr.io', 'mirror', 'port', '5000']),
]


@pytest.mark.parametrize("method, args, op, expected_path", COMMON_CASES)
@pytest.mark.parametrize("version", ["1.4", "1.4.3", "1.5", ROLLING])
def test_common_paths(method, args, op, expected_path, version):
    builder = ContainerBatchBuilder(version=version)
    getattr(builder, method)(*args)
    assert [(item["op"], item["path"]) for item in builder.get_operations()] == [(op, expected_path)]


@pytest.mark.parametrize("method, args, op, expected_path", V15_ONLY_CASES)
@pytest.mark.parametrize("version", ["1.5", ROLLING])
def test_v15_only_paths(method, args, op, expected_path, version):
    builder = ContainerBatchBuilder(version=version)
    getattr(builder, method)(*args)
    assert [(item["op"], item["path"]) for item in builder.get_operations()] == [(op, expected_path)]


@pytest.mark.parametrize("method, args, op, expected_path", V15_ONLY_CASES)
@pytest.mark.parametrize("version", ["1.4", "1.4.3"])
def test_v15_only_ops_raise_on_14(method, args, op, expected_path, version):
    builder = ContainerBatchBuilder(version=version)
    with pytest.raises(ValueError, match="is not supported on this device"):
        getattr(builder, method)(*args)
    assert builder.get_operations() == []


def test_every_builder_op_has_a_golden_row():
    ops = {
        name
        for name, _ in inspect.getmembers(ContainerBatchBuilder, inspect.isfunction)
        if re.match(r"(set|delete|create)_", name)
    }
    rows = [row[0] for row in COMMON_CASES + V15_ONLY_CASES]
    assert len(rows) == len(set(rows))
    assert ops == set(rows)
