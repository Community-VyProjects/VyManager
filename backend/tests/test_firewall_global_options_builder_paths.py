"""Golden (method, args, op, expected_path) cases for FirewallGlobalOptionsBatchBuilder.

Paths checked with validateTmplPath on 1.4 (100.64.64.50) and 1.5 (100.64.64.5).
Generated for issue #711; edit the tables directly if the mapper changes.
"""

import pytest

from vyos_builders.firewall_global_options.firewall_global_options import (
    FirewallGlobalOptionsBatchBuilder,
)


COMMON_CASES = [
    ('delete_all_ping', (), 'delete', ['firewall', 'global-options', 'all-ping']),
    ('delete_broadcast_ping', (), 'delete', ['firewall', 'global-options', 'broadcast-ping']),
    ('delete_ip_src_route', (), 'delete', ['firewall', 'global-options', 'ip-src-route']),
    ('delete_ipv6_receive_redirects', (), 'delete', ['firewall', 'global-options', 'ipv6-receive-redirects']),
    ('delete_ipv6_src_route', (), 'delete', ['firewall', 'global-options', 'ipv6-src-route']),
    ('delete_log_martians', (), 'delete', ['firewall', 'global-options', 'log-martians']),
    ('delete_receive_redirects', (), 'delete', ['firewall', 'global-options', 'receive-redirects']),
    ('delete_resolver_cache', (), 'delete', ['firewall', 'global-options', 'resolver-cache']),
    ('delete_resolver_interval', (), 'delete', ['firewall', 'global-options', 'resolver-interval']),
    ('delete_send_redirects', (), 'delete', ['firewall', 'global-options', 'send-redirects']),
    ('delete_source_validation', (), 'delete', ['firewall', 'global-options', 'source-validation']),
    ('delete_state_policy_established_action', (), 'delete', ['firewall', 'global-options', 'state-policy', 'established', 'action']),
    ('delete_state_policy_established_log', (), 'delete', ['firewall', 'global-options', 'state-policy', 'established', 'log']),
    ('delete_state_policy_established_log_level', (), 'delete', ['firewall', 'global-options', 'state-policy', 'established', 'log-level']),
    ('delete_state_policy_invalid_action', (), 'delete', ['firewall', 'global-options', 'state-policy', 'invalid', 'action']),
    ('delete_state_policy_invalid_log', (), 'delete', ['firewall', 'global-options', 'state-policy', 'invalid', 'log']),
    ('delete_state_policy_invalid_log_level', (), 'delete', ['firewall', 'global-options', 'state-policy', 'invalid', 'log-level']),
    ('delete_state_policy_related_action', (), 'delete', ['firewall', 'global-options', 'state-policy', 'related', 'action']),
    ('delete_state_policy_related_log', (), 'delete', ['firewall', 'global-options', 'state-policy', 'related', 'log']),
    ('delete_state_policy_related_log_level', (), 'delete', ['firewall', 'global-options', 'state-policy', 'related', 'log-level']),
    ('delete_syn_cookies', (), 'delete', ['firewall', 'global-options', 'syn-cookies']),
    ('delete_twa_hazards_protection', (), 'delete', ['firewall', 'global-options', 'twa-hazards-protection']),
    ('set_all_ping', ('5',), 'set', ['firewall', 'global-options', 'all-ping', '5']),
    ('set_broadcast_ping', ('5',), 'set', ['firewall', 'global-options', 'broadcast-ping', '5']),
    ('set_ip_src_route', ('5',), 'set', ['firewall', 'global-options', 'ip-src-route', '5']),
    ('set_ipv6_receive_redirects', ('5',), 'set', ['firewall', 'global-options', 'ipv6-receive-redirects', '5']),
    ('set_ipv6_src_route', ('5',), 'set', ['firewall', 'global-options', 'ipv6-src-route', '5']),
    ('set_log_martians', ('5',), 'set', ['firewall', 'global-options', 'log-martians', '5']),
    ('set_receive_redirects', ('5',), 'set', ['firewall', 'global-options', 'receive-redirects', '5']),
    ('set_resolver_cache', (), 'set', ['firewall', 'global-options', 'resolver-cache']),
    ('set_resolver_interval', (30,), 'set', ['firewall', 'global-options', 'resolver-interval', '30']),
    ('set_send_redirects', ('5',), 'set', ['firewall', 'global-options', 'send-redirects', '5']),
    ('set_source_validation', ('5',), 'set', ['firewall', 'global-options', 'source-validation', '5']),
    ('set_state_policy_established_action', ('accept',), 'set', ['firewall', 'global-options', 'state-policy', 'established', 'action', 'accept']),
    ('set_state_policy_established_log', (), 'set', ['firewall', 'global-options', 'state-policy', 'established', 'log']),
    ('set_state_policy_established_log_level', ('info',), 'set', ['firewall', 'global-options', 'state-policy', 'established', 'log-level', 'info']),
    ('set_state_policy_invalid_action', ('accept',), 'set', ['firewall', 'global-options', 'state-policy', 'invalid', 'action', 'accept']),
    ('set_state_policy_invalid_log', (), 'set', ['firewall', 'global-options', 'state-policy', 'invalid', 'log']),
    ('set_state_policy_invalid_log_level', ('info',), 'set', ['firewall', 'global-options', 'state-policy', 'invalid', 'log-level', 'info']),
    ('set_state_policy_related_action', ('accept',), 'set', ['firewall', 'global-options', 'state-policy', 'related', 'action', 'accept']),
    ('set_state_policy_related_log', (), 'set', ['firewall', 'global-options', 'state-policy', 'related', 'log']),
    ('set_state_policy_related_log_level', ('info',), 'set', ['firewall', 'global-options', 'state-policy', 'related', 'log-level', 'info']),
    ('set_syn_cookies', ('5',), 'set', ['firewall', 'global-options', 'syn-cookies', '5']),
    ('set_twa_hazards_protection', ('5',), 'set', ['firewall', 'global-options', 'twa-hazards-protection', '5']),
]

V15_ONLY_CASES = [
    ('delete_apply_to_bridged_traffic_ipv4', (), 'delete', ['firewall', 'global-options', 'apply-to-bridged-traffic', 'ipv4']),
    ('delete_apply_to_bridged_traffic_ipv6', (), 'delete', ['firewall', 'global-options', 'apply-to-bridged-traffic', 'ipv6']),
    ('delete_timeout_icmp', (), 'delete', ['firewall', 'global-options', 'timeout', 'icmp']),
    ('delete_timeout_other', (), 'delete', ['firewall', 'global-options', 'timeout', 'other']),
    ('delete_timeout_tcp_close', (), 'delete', ['firewall', 'global-options', 'timeout', 'tcp', 'close']),
    ('delete_timeout_tcp_close_wait', (), 'delete', ['firewall', 'global-options', 'timeout', 'tcp', 'close-wait']),
    ('delete_timeout_tcp_established', (), 'delete', ['firewall', 'global-options', 'timeout', 'tcp', 'established']),
    ('delete_timeout_tcp_fin_wait', (), 'delete', ['firewall', 'global-options', 'timeout', 'tcp', 'fin-wait']),
    ('delete_timeout_tcp_last_ack', (), 'delete', ['firewall', 'global-options', 'timeout', 'tcp', 'last-ack']),
    ('delete_timeout_tcp_syn_recv', (), 'delete', ['firewall', 'global-options', 'timeout', 'tcp', 'syn-recv']),
    ('delete_timeout_tcp_syn_sent', (), 'delete', ['firewall', 'global-options', 'timeout', 'tcp', 'syn-sent']),
    ('delete_timeout_tcp_time_wait', (), 'delete', ['firewall', 'global-options', 'timeout', 'tcp', 'time-wait']),
    ('delete_timeout_udp_other', (), 'delete', ['firewall', 'global-options', 'timeout', 'udp', 'other']),
    ('delete_timeout_udp_stream', (), 'delete', ['firewall', 'global-options', 'timeout', 'udp', 'stream']),
    ('set_apply_to_bridged_traffic_ipv4', (), 'set', ['firewall', 'global-options', 'apply-to-bridged-traffic', 'ipv4']),
    ('set_apply_to_bridged_traffic_ipv6', (), 'set', ['firewall', 'global-options', 'apply-to-bridged-traffic', 'ipv6']),
    ('set_timeout_icmp', (30,), 'set', ['firewall', 'global-options', 'timeout', 'icmp', '30']),
    ('set_timeout_other', (30,), 'set', ['firewall', 'global-options', 'timeout', 'other', '30']),
    ('set_timeout_tcp_close', (30,), 'set', ['firewall', 'global-options', 'timeout', 'tcp', 'close', '30']),
    ('set_timeout_tcp_close_wait', (30,), 'set', ['firewall', 'global-options', 'timeout', 'tcp', 'close-wait', '30']),
    ('set_timeout_tcp_established', (30,), 'set', ['firewall', 'global-options', 'timeout', 'tcp', 'established', '30']),
    ('set_timeout_tcp_fin_wait', (30,), 'set', ['firewall', 'global-options', 'timeout', 'tcp', 'fin-wait', '30']),
    ('set_timeout_tcp_last_ack', (30,), 'set', ['firewall', 'global-options', 'timeout', 'tcp', 'last-ack', '30']),
    ('set_timeout_tcp_syn_recv', (30,), 'set', ['firewall', 'global-options', 'timeout', 'tcp', 'syn-recv', '30']),
    ('set_timeout_tcp_syn_sent', (30,), 'set', ['firewall', 'global-options', 'timeout', 'tcp', 'syn-sent', '30']),
    ('set_timeout_tcp_time_wait', (30,), 'set', ['firewall', 'global-options', 'timeout', 'tcp', 'time-wait', '30']),
    ('set_timeout_udp_other', (30,), 'set', ['firewall', 'global-options', 'timeout', 'udp', 'other', '30']),
    ('set_timeout_udp_stream', (30,), 'set', ['firewall', 'global-options', 'timeout', 'udp', 'stream', '30']),
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


@pytest.mark.parametrize("version", ["1.4", "1.5"])
def test_global_options_advertises_dns_resolver(version):
    builder = FirewallGlobalOptionsBatchBuilder(version=version)
    caps = builder.get_capabilities()
    assert caps["features"]["dns_resolver"]["supported"] is True
