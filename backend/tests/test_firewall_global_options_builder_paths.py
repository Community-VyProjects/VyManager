"""Golden (method, args, op, expected_path) cases for FirewallGlobalOptionsBatchBuilder.

Sample values are lab `allowed:`/`val_help` values; every path was committed
on 1.4 (100.64.64.4) and 1.5 (100.64.64.5).
"""

import inspect

import pytest

from vyos_builders.firewall_global_options.firewall_global_options_batch_builder import (
    FirewallGlobalOptionsBatchBuilder,
)


COMMON_CASES = [
    ('delete_all_ping', (), 'delete', ['firewall', 'global-options', 'all-ping']),
    ('delete_broadcast_ping', (), 'delete', ['firewall', 'global-options', 'broadcast-ping']),
    ('delete_directed_broadcast', (), 'delete', ['firewall', 'global-options', 'directed-broadcast']),
    ('delete_global_options', (), 'delete', ['firewall', 'global-options']),
    ('delete_ip_src_route', (), 'delete', ['firewall', 'global-options', 'ip-src-route']),
    ('delete_ipv6_receive_redirects', (), 'delete', ['firewall', 'global-options', 'ipv6-receive-redirects']),
    ('delete_ipv6_source_validation', (), 'delete', ['firewall', 'global-options', 'ipv6-source-validation']),
    ('delete_ipv6_src_route', (), 'delete', ['firewall', 'global-options', 'ipv6-src-route']),
    ('delete_log_martians', (), 'delete', ['firewall', 'global-options', 'log-martians']),
    ('delete_receive_redirects', (), 'delete', ['firewall', 'global-options', 'receive-redirects']),
    ('delete_resolver_cache', (), 'delete', ['firewall', 'global-options', 'resolver-cache']),
    ('delete_resolver_interval', (), 'delete', ['firewall', 'global-options', 'resolver-interval']),
    ('delete_send_redirects', (), 'delete', ['firewall', 'global-options', 'send-redirects']),
    ('delete_source_validation', (), 'delete', ['firewall', 'global-options', 'source-validation']),
    ('delete_state_policy', (), 'delete', ['firewall', 'global-options', 'state-policy']),
    ('delete_state_policy_established', (), 'delete', ['firewall', 'global-options', 'state-policy', 'established']),
    ('delete_state_policy_established_action', (), 'delete', ['firewall', 'global-options', 'state-policy', 'established', 'action']),
    ('delete_state_policy_established_log', (), 'delete', ['firewall', 'global-options', 'state-policy', 'established', 'log']),
    ('delete_state_policy_established_log_level', (), 'delete', ['firewall', 'global-options', 'state-policy', 'established', 'log-level']),
    ('delete_state_policy_invalid', (), 'delete', ['firewall', 'global-options', 'state-policy', 'invalid']),
    ('delete_state_policy_invalid_action', (), 'delete', ['firewall', 'global-options', 'state-policy', 'invalid', 'action']),
    ('delete_state_policy_invalid_log', (), 'delete', ['firewall', 'global-options', 'state-policy', 'invalid', 'log']),
    ('delete_state_policy_invalid_log_level', (), 'delete', ['firewall', 'global-options', 'state-policy', 'invalid', 'log-level']),
    ('delete_state_policy_related', (), 'delete', ['firewall', 'global-options', 'state-policy', 'related']),
    ('delete_state_policy_related_action', (), 'delete', ['firewall', 'global-options', 'state-policy', 'related', 'action']),
    ('delete_state_policy_related_log', (), 'delete', ['firewall', 'global-options', 'state-policy', 'related', 'log']),
    ('delete_state_policy_related_log_level', (), 'delete', ['firewall', 'global-options', 'state-policy', 'related', 'log-level']),
    ('delete_syn_cookies', (), 'delete', ['firewall', 'global-options', 'syn-cookies']),
    ('delete_twa_hazards_protection', (), 'delete', ['firewall', 'global-options', 'twa-hazards-protection']),
    ('set_all_ping', ('disable',), 'set', ['firewall', 'global-options', 'all-ping', 'disable']),
    ('set_broadcast_ping', ('enable',), 'set', ['firewall', 'global-options', 'broadcast-ping', 'enable']),
    ('set_directed_broadcast', ('disable',), 'set', ['firewall', 'global-options', 'directed-broadcast', 'disable']),
    ('set_ip_src_route', ('enable',), 'set', ['firewall', 'global-options', 'ip-src-route', 'enable']),
    ('set_ipv6_receive_redirects', ('enable',), 'set', ['firewall', 'global-options', 'ipv6-receive-redirects', 'enable']),
    ('set_ipv6_source_validation', ('loose',), 'set', ['firewall', 'global-options', 'ipv6-source-validation', 'loose']),
    ('set_ipv6_src_route', ('enable',), 'set', ['firewall', 'global-options', 'ipv6-src-route', 'enable']),
    ('set_log_martians', ('disable',), 'set', ['firewall', 'global-options', 'log-martians', 'disable']),
    ('set_receive_redirects', ('enable',), 'set', ['firewall', 'global-options', 'receive-redirects', 'enable']),
    ('set_resolver_cache', (), 'set', ['firewall', 'global-options', 'resolver-cache']),
    ('set_resolver_interval', ('60',), 'set', ['firewall', 'global-options', 'resolver-interval', '60']),
    ('set_send_redirects', ('disable',), 'set', ['firewall', 'global-options', 'send-redirects', 'disable']),
    ('set_source_validation', ('strict',), 'set', ['firewall', 'global-options', 'source-validation', 'strict']),
    ('set_state_policy_established_action', ('accept',), 'set', ['firewall', 'global-options', 'state-policy', 'established', 'action', 'accept']),
    ('set_state_policy_established_log', (), 'set', ['firewall', 'global-options', 'state-policy', 'established', 'log']),
    ('set_state_policy_established_log_level', ('info',), 'set', ['firewall', 'global-options', 'state-policy', 'established', 'log-level', 'info']),
    ('set_state_policy_invalid_action', ('drop',), 'set', ['firewall', 'global-options', 'state-policy', 'invalid', 'action', 'drop']),
    ('set_state_policy_invalid_log', (), 'set', ['firewall', 'global-options', 'state-policy', 'invalid', 'log']),
    ('set_state_policy_invalid_log_level', ('warn',), 'set', ['firewall', 'global-options', 'state-policy', 'invalid', 'log-level', 'warn']),
    ('set_state_policy_related_action', ('reject',), 'set', ['firewall', 'global-options', 'state-policy', 'related', 'action', 'reject']),
    ('set_state_policy_related_log', (), 'set', ['firewall', 'global-options', 'state-policy', 'related', 'log']),
    ('set_state_policy_related_log_level', ('debug',), 'set', ['firewall', 'global-options', 'state-policy', 'related', 'log-level', 'debug']),
    ('set_syn_cookies', ('disable',), 'set', ['firewall', 'global-options', 'syn-cookies', 'disable']),
    ('set_twa_hazards_protection', ('enable',), 'set', ['firewall', 'global-options', 'twa-hazards-protection', 'enable']),
]

V15_ONLY_CASES = [
    ('delete_apply_to_bridged_traffic', (), 'delete', ['firewall', 'global-options', 'apply-to-bridged-traffic']),
    ('delete_apply_to_bridged_traffic_accept_invalid', (), 'delete', ['firewall', 'global-options', 'apply-to-bridged-traffic', 'accept-invalid']),
    ('delete_apply_to_bridged_traffic_accept_invalid_ethernet_type', ('802.1q',), 'delete', ['firewall', 'global-options', 'apply-to-bridged-traffic', 'accept-invalid', 'ethernet-type', '802.1q']),
    ('delete_apply_to_bridged_traffic_ipv4', (), 'delete', ['firewall', 'global-options', 'apply-to-bridged-traffic', 'ipv4']),
    ('delete_apply_to_bridged_traffic_ipv6', (), 'delete', ['firewall', 'global-options', 'apply-to-bridged-traffic', 'ipv6']),
    ('delete_geoip', (), 'delete', ['firewall', 'global-options', 'geoip']),
    ('delete_geoip_maxmind_account_id', (), 'delete', ['firewall', 'global-options', 'geoip', 'maxmind-account-id']),
    ('delete_geoip_maxmind_license_key', (), 'delete', ['firewall', 'global-options', 'geoip', 'maxmind-license-key']),
    ('delete_geoip_maxmind_lite', (), 'delete', ['firewall', 'global-options', 'geoip', 'maxmind-lite']),
    ('delete_geoip_provider', (), 'delete', ['firewall', 'global-options', 'geoip', 'provider']),
    ('delete_geoip_source_address', (), 'delete', ['firewall', 'global-options', 'geoip', 'source-address']),
    ('delete_geoip_vrf', (), 'delete', ['firewall', 'global-options', 'geoip', 'vrf']),
    ('delete_state_policy_offload', (), 'delete', ['firewall', 'global-options', 'state-policy', 'offload']),
    ('delete_timeout', (), 'delete', ['firewall', 'global-options', 'timeout']),
    ('delete_timeout_icmp', (), 'delete', ['firewall', 'global-options', 'timeout', 'icmp']),
    ('delete_timeout_other', (), 'delete', ['firewall', 'global-options', 'timeout', 'other']),
    ('delete_timeout_tcp', (), 'delete', ['firewall', 'global-options', 'timeout', 'tcp']),
    ('delete_timeout_tcp_close', (), 'delete', ['firewall', 'global-options', 'timeout', 'tcp', 'close']),
    ('delete_timeout_tcp_close_wait', (), 'delete', ['firewall', 'global-options', 'timeout', 'tcp', 'close-wait']),
    ('delete_timeout_tcp_established', (), 'delete', ['firewall', 'global-options', 'timeout', 'tcp', 'established']),
    ('delete_timeout_tcp_fin_wait', (), 'delete', ['firewall', 'global-options', 'timeout', 'tcp', 'fin-wait']),
    ('delete_timeout_tcp_last_ack', (), 'delete', ['firewall', 'global-options', 'timeout', 'tcp', 'last-ack']),
    ('delete_timeout_tcp_syn_recv', (), 'delete', ['firewall', 'global-options', 'timeout', 'tcp', 'syn-recv']),
    ('delete_timeout_tcp_syn_sent', (), 'delete', ['firewall', 'global-options', 'timeout', 'tcp', 'syn-sent']),
    ('delete_timeout_tcp_time_wait', (), 'delete', ['firewall', 'global-options', 'timeout', 'tcp', 'time-wait']),
    ('delete_timeout_udp', (), 'delete', ['firewall', 'global-options', 'timeout', 'udp']),
    ('delete_timeout_udp_other', (), 'delete', ['firewall', 'global-options', 'timeout', 'udp', 'other']),
    ('delete_timeout_udp_stream', (), 'delete', ['firewall', 'global-options', 'timeout', 'udp', 'stream']),
    ('set_apply_to_bridged_traffic_accept_invalid_ethernet_type', ('802.1q',), 'set', ['firewall', 'global-options', 'apply-to-bridged-traffic', 'accept-invalid', 'ethernet-type', '802.1q']),
    ('set_apply_to_bridged_traffic_ipv4', (), 'set', ['firewall', 'global-options', 'apply-to-bridged-traffic', 'ipv4']),
    ('set_apply_to_bridged_traffic_ipv6', (), 'set', ['firewall', 'global-options', 'apply-to-bridged-traffic', 'ipv6']),
    ('set_geoip_maxmind_account_id', ('123456',), 'set', ['firewall', 'global-options', 'geoip', 'maxmind-account-id', '123456']),
    ('set_geoip_maxmind_license_key', ('T-KEY',), 'set', ['firewall', 'global-options', 'geoip', 'maxmind-license-key', 'T-KEY']),
    ('set_geoip_maxmind_lite', (), 'set', ['firewall', 'global-options', 'geoip', 'maxmind-lite']),
    ('set_geoip_provider', ('maxmind',), 'set', ['firewall', 'global-options', 'geoip', 'provider', 'maxmind']),
    ('set_geoip_source_address', ('192.0.2.1',), 'set', ['firewall', 'global-options', 'geoip', 'source-address', '192.0.2.1']),
    ('set_geoip_vrf', ('RED',), 'set', ['firewall', 'global-options', 'geoip', 'vrf', 'RED']),
    ('set_state_policy_offload_target', ('FT1',), 'set', ['firewall', 'global-options', 'state-policy', 'offload', 'offload-target', 'FT1']),
    ('set_timeout_icmp', ('300',), 'set', ['firewall', 'global-options', 'timeout', 'icmp', '300']),
    ('set_timeout_other', ('300',), 'set', ['firewall', 'global-options', 'timeout', 'other', '300']),
    ('set_timeout_tcp_close', ('300',), 'set', ['firewall', 'global-options', 'timeout', 'tcp', 'close', '300']),
    ('set_timeout_tcp_close_wait', ('300',), 'set', ['firewall', 'global-options', 'timeout', 'tcp', 'close-wait', '300']),
    ('set_timeout_tcp_established', ('300',), 'set', ['firewall', 'global-options', 'timeout', 'tcp', 'established', '300']),
    ('set_timeout_tcp_fin_wait', ('300',), 'set', ['firewall', 'global-options', 'timeout', 'tcp', 'fin-wait', '300']),
    ('set_timeout_tcp_last_ack', ('300',), 'set', ['firewall', 'global-options', 'timeout', 'tcp', 'last-ack', '300']),
    ('set_timeout_tcp_syn_recv', ('300',), 'set', ['firewall', 'global-options', 'timeout', 'tcp', 'syn-recv', '300']),
    ('set_timeout_tcp_syn_sent', ('300',), 'set', ['firewall', 'global-options', 'timeout', 'tcp', 'syn-sent', '300']),
    ('set_timeout_tcp_time_wait', ('300',), 'set', ['firewall', 'global-options', 'timeout', 'tcp', 'time-wait', '300']),
    ('set_timeout_udp_other', ('300',), 'set', ['firewall', 'global-options', 'timeout', 'udp', 'other', '300']),
    ('set_timeout_udp_stream', ('300',), 'set', ['firewall', 'global-options', 'timeout', 'udp', 'stream', '300']),
]


def _run(version, method, args, op, expected_path):
    builder = FirewallGlobalOptionsBatchBuilder(version=version)
    getattr(builder, method)(*args)
    operations = builder.get_operations()
    assert [(item["op"], item["path"]) for item in operations] == [(op, expected_path)]


@pytest.mark.parametrize("method, args, op, expected_path", COMMON_CASES)
@pytest.mark.parametrize("version", ["1.4", "1.5"])
def test_global_options_common_paths(method, args, op, expected_path, version):
    _run(version, method, args, op, expected_path)


@pytest.mark.parametrize("method, args, op, expected_path", V15_ONLY_CASES)
def test_global_options_v1_5_only_paths(method, args, op, expected_path):
    _run("1.5", method, args, op, expected_path)


@pytest.mark.parametrize("method, args, _op, _path", V15_ONLY_CASES)
def test_global_options_v1_4_rejects_version_only_ops(method, args, _op, _path):
    """A 1.5-only op on 1.4 must raise, not return and leave the batch short."""
    builder = FirewallGlobalOptionsBatchBuilder(version="1.4")
    builder.set_all_ping("enable")
    with pytest.raises(ValueError, match="not supported on this device"):
        getattr(builder, method)(*args)
    paths = [item["path"] for item in builder.get_operations()]
    assert paths == [["firewall", "global-options", "all-ping", "enable"]]


def test_every_builder_op_has_a_golden_row():
    builder = FirewallGlobalOptionsBatchBuilder(version="1.5")
    ops = {
        name
        for name, _ in inspect.getmembers(builder, inspect.ismethod)
        if name.startswith(("set_", "delete_", "create_"))
    }
    covered = {row[0] for row in COMMON_CASES + V15_ONLY_CASES}
    assert ops == covered


def test_every_builder_op_takes_at_most_one_value():
    """The batch router passes the op value whole (call_comma_batch_op)."""
    builder = FirewallGlobalOptionsBatchBuilder(version="1.5")
    for name, method in inspect.getmembers(builder, inspect.ismethod):
        if name.startswith(("set_", "delete_", "create_")):
            assert len(inspect.signature(method).parameters) <= 1, name
