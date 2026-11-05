"""Golden (method, args, op, expected_path) cases for BridgeFirewallBatchBuilder.

Paths checked with validateTmplPath on 1.4 (100.64.64.50) and 1.5 (100.64.64.5).
Generated for issue #711; edit the tables directly if the mapper changes.
"""

import pytest

from vyos_builders.firewall.bridge import BridgeFirewallBatchBuilder


COMMON_CASES = [
    ('delete_chain', ('forward',), 'delete', ['firewall', 'bridge', 'forward', 'filter']),
    ('delete_chain_default_action', ('forward',), 'delete', ['firewall', 'bridge', 'forward', 'filter', 'default-action']),
    ('delete_chain_description', ('forward',), 'delete', ['firewall', 'bridge', 'forward', 'filter', 'description']),
    ('delete_custom_chain', ('MYCHAIN',), 'delete', ['firewall', 'bridge', 'name', 'MYCHAIN']),
    ('delete_custom_chain_default_action', ('MYCHAIN',), 'delete', ['firewall', 'bridge', 'name', 'MYCHAIN', 'default-action']),
    ('delete_custom_chain_description', ('MYCHAIN',), 'delete', ['firewall', 'bridge', 'name', 'MYCHAIN', 'description']),
    ('delete_rule', ('forward', 10), 'delete', ['firewall', 'bridge', 'forward', 'filter', 'rule', '10']),
    ('delete_rule_action', ('forward', 10), 'delete', ['firewall', 'bridge', 'forward', 'filter', 'rule', '10', 'action']),
    ('delete_rule_destination', ('forward', 10), 'delete', ['firewall', 'bridge', 'forward', 'filter', 'rule', '10', 'destination']),
    ('delete_rule_destination_mac', ('forward', 10), 'delete', ['firewall', 'bridge', 'forward', 'filter', 'rule', '10', 'destination', 'mac-address']),
    ('delete_rule_disable', ('forward', 10), 'delete', ['firewall', 'bridge', 'forward', 'filter', 'rule', '10', 'disable']),
    ('delete_rule_inbound_interface', ('forward', 10), 'delete', ['firewall', 'bridge', 'forward', 'filter', 'rule', '10', 'inbound-interface']),
    ('delete_rule_inbound_interface_group', ('forward', 10), 'delete', ['firewall', 'bridge', 'forward', 'filter', 'rule', '10', 'inbound-interface', 'group']),
    ('delete_rule_jump_target', ('forward', 10), 'delete', ['firewall', 'bridge', 'forward', 'filter', 'rule', '10', 'jump-target']),
    ('delete_rule_log', ('forward', 10), 'delete', ['firewall', 'bridge', 'forward', 'filter', 'rule', '10', 'log']),
    ('delete_rule_log_options', ('forward', 10), 'delete', ['firewall', 'bridge', 'forward', 'filter', 'rule', '10', 'log-options']),
    ('delete_rule_outbound_interface', ('forward', 10), 'delete', ['firewall', 'bridge', 'forward', 'filter', 'rule', '10', 'outbound-interface']),
    ('delete_rule_outbound_interface_group', ('forward', 10), 'delete', ['firewall', 'bridge', 'forward', 'filter', 'rule', '10', 'outbound-interface', 'group']),
    ('delete_rule_source', ('forward', 10), 'delete', ['firewall', 'bridge', 'forward', 'filter', 'rule', '10', 'source']),
    ('delete_rule_source_mac', ('forward', 10), 'delete', ['firewall', 'bridge', 'forward', 'filter', 'rule', '10', 'source', 'mac-address']),
    ('delete_rule_vlan', ('forward', 10), 'delete', ['firewall', 'bridge', 'forward', 'filter', 'rule', '10', 'vlan']),
    ('delete_rule_vlan_id', ('forward', 10), 'delete', ['firewall', 'bridge', 'forward', 'filter', 'rule', '10', 'vlan', 'id']),
    ('delete_rule_vlan_priority', ('forward', 10), 'delete', ['firewall', 'bridge', 'forward', 'filter', 'rule', '10', 'vlan', 'priority']),
    ('set_chain', ('forward',), 'set', ['firewall', 'bridge', 'forward', 'filter']),
    ('set_chain_default_action', ('forward', 'accept'), 'set', ['firewall', 'bridge', 'forward', 'filter', 'default-action', 'accept']),
    ('set_chain_description', ('forward', 'd'), 'set', ['firewall', 'bridge', 'forward', 'filter', 'description', 'd']),
    ('set_custom_chain', ('MYCHAIN',), 'set', ['firewall', 'bridge', 'name', 'MYCHAIN']),
    ('set_custom_chain_default_action', ('MYCHAIN', 'accept'), 'set', ['firewall', 'bridge', 'name', 'MYCHAIN', 'default-action', 'accept']),
    ('set_custom_chain_description', ('MYCHAIN', 'd'), 'set', ['firewall', 'bridge', 'name', 'MYCHAIN', 'description', 'd']),
    ('set_rule', ('forward', 10), 'set', ['firewall', 'bridge', 'forward', 'filter', 'rule', '10']),
    ('set_rule_action', ('forward', 10, 'accept'), 'set', ['firewall', 'bridge', 'forward', 'filter', 'rule', '10', 'action', 'accept']),
    ('set_rule_destination_mac', ('forward', 10, '00:11:22:33:44:55'), 'set', ['firewall', 'bridge', 'forward', 'filter', 'rule', '10', 'destination', 'mac-address', '00:11:22:33:44:55']),
    ('set_rule_disable', ('forward', 10), 'set', ['firewall', 'bridge', 'forward', 'filter', 'rule', '10', 'disable']),
    ('set_rule_inbound_interface', ('forward', 10, 'eth1'), 'set', ['firewall', 'bridge', 'forward', 'filter', 'rule', '10', 'inbound-interface', 'name', 'eth1']),
    ('set_rule_inbound_interface_group', ('forward', 10, 'G1'), 'set', ['firewall', 'bridge', 'forward', 'filter', 'rule', '10', 'inbound-interface', 'group', 'G1']),
    ('set_rule_jump_target', ('forward', 10, '203.0.113.5'), 'set', ['firewall', 'bridge', 'forward', 'filter', 'rule', '10', 'jump-target', '203.0.113.5']),
    ('set_rule_log', ('forward', 10), 'set', ['firewall', 'bridge', 'forward', 'filter', 'rule', '10', 'log']),
    ('set_rule_log_options_group', ('forward', 10, 'G1'), 'set', ['firewall', 'bridge', 'forward', 'filter', 'rule', '10', 'log-options', 'group', 'G1']),
    ('set_rule_log_options_level', ('forward', 10, 'info'), 'set', ['firewall', 'bridge', 'forward', 'filter', 'rule', '10', 'log-options', 'level', 'info']),
    ('set_rule_outbound_interface', ('forward', 10, 'eth1'), 'set', ['firewall', 'bridge', 'forward', 'filter', 'rule', '10', 'outbound-interface', 'name', 'eth1']),
    ('set_rule_outbound_interface_group', ('forward', 10, 'G1'), 'set', ['firewall', 'bridge', 'forward', 'filter', 'rule', '10', 'outbound-interface', 'group', 'G1']),
    ('set_rule_queue', ('forward', 10, '0'), 'set', ['firewall', 'bridge', 'forward', 'filter', 'rule', '10', 'queue', '0']),
    ('set_rule_source_mac', ('forward', 10, '00:11:22:33:44:55'), 'set', ['firewall', 'bridge', 'forward', 'filter', 'rule', '10', 'source', 'mac-address', '00:11:22:33:44:55']),
    ('set_rule_vlan_id', ('forward', 10, '100'), 'set', ['firewall', 'bridge', 'forward', 'filter', 'rule', '10', 'vlan', 'id', '100']),
    ('set_rule_vlan_priority', ('forward', 10, '3'), 'set', ['firewall', 'bridge', 'forward', 'filter', 'rule', '10', 'vlan', 'priority', '3']),
]

V15_ONLY_CASES = [
    ('delete_rule_description', ('forward', 10), 'delete', ['firewall', 'bridge', 'forward', 'filter', 'rule', '10', 'description']),
    ('delete_rule_destination_address', ('forward', 10), 'delete', ['firewall', 'bridge', 'forward', 'filter', 'rule', '10', 'destination', 'address']),
    ('delete_rule_destination_port', ('forward', 10), 'delete', ['firewall', 'bridge', 'forward', 'filter', 'rule', '10', 'destination', 'port']),
    ('delete_rule_ethernet_type', ('forward', 10), 'delete', ['firewall', 'bridge', 'forward', 'filter', 'rule', '10', 'ethernet-type']),
    ('delete_rule_limit', ('forward', 10), 'delete', ['firewall', 'bridge', 'forward', 'filter', 'rule', '10', 'limit']),
    ('delete_rule_mark', ('forward', 10), 'delete', ['firewall', 'bridge', 'forward', 'filter', 'rule', '10', 'mark']),
    ('delete_rule_protocol', ('forward', 10), 'delete', ['firewall', 'bridge', 'forward', 'filter', 'rule', '10', 'protocol']),
    ('delete_rule_set', ('forward', 10), 'delete', ['firewall', 'bridge', 'forward', 'filter', 'rule', '10', 'set']),
    ('delete_rule_set_dscp', ('forward', 10), 'delete', ['firewall', 'bridge', 'forward', 'filter', 'rule', '10', 'set', 'dscp']),
    ('delete_rule_set_mark', ('forward', 10), 'delete', ['firewall', 'bridge', 'forward', 'filter', 'rule', '10', 'set', 'mark']),
    ('delete_rule_source_address', ('forward', 10), 'delete', ['firewall', 'bridge', 'forward', 'filter', 'rule', '10', 'source', 'address']),
    ('delete_rule_source_port', ('forward', 10), 'delete', ['firewall', 'bridge', 'forward', 'filter', 'rule', '10', 'source', 'port']),
    ('delete_rule_time', ('forward', 10), 'delete', ['firewall', 'bridge', 'forward', 'filter', 'rule', '10', 'time']),
    ('set_rule_connection_mark', ('forward', 10, '0x10'), 'set', ['firewall', 'bridge', 'forward', 'filter', 'rule', '10', 'connection-mark', '0x10']),
    ('set_rule_description', ('forward', 10, 'd'), 'set', ['firewall', 'bridge', 'forward', 'filter', 'rule', '10', 'description', 'd']),
    ('set_rule_destination_address', ('forward', 10, '203.0.113.10'), 'set', ['firewall', 'bridge', 'forward', 'filter', 'rule', '10', 'destination', 'address', '203.0.113.10']),
    ('set_rule_destination_group_mac', ('forward', 10, 'G1'), 'set', ['firewall', 'bridge', 'forward', 'filter', 'rule', '10', 'destination', 'group', 'mac-group', 'G1']),
    ('set_rule_destination_group_port', ('forward', 10, 'G1'), 'set', ['firewall', 'bridge', 'forward', 'filter', 'rule', '10', 'destination', 'group', 'port-group', 'G1']),
    ('set_rule_destination_port', ('forward', 10, '443'), 'set', ['firewall', 'bridge', 'forward', 'filter', 'rule', '10', 'destination', 'port', '443']),
    ('set_rule_dscp', ('forward', 10, '10'), 'set', ['firewall', 'bridge', 'forward', 'filter', 'rule', '10', 'dscp', '10']),
    ('set_rule_dscp_exclude', ('forward', 10, '10'), 'set', ['firewall', 'bridge', 'forward', 'filter', 'rule', '10', 'dscp-exclude', '10']),
    ('set_rule_ethernet_type', ('forward', 10, '0x0800'), 'set', ['firewall', 'bridge', 'forward', 'filter', 'rule', '10', 'ethernet-type', '0x0800']),
    ('set_rule_fragment_match_frag', ('forward', 10), 'set', ['firewall', 'bridge', 'forward', 'filter', 'rule', '10', 'fragment', 'match-frag']),
    ('set_rule_fragment_match_non_frag', ('forward', 10), 'set', ['firewall', 'bridge', 'forward', 'filter', 'rule', '10', 'fragment', 'match-non-frag']),
    ('set_rule_hop_limit_eq', ('forward', 10, '5'), 'set', ['firewall', 'bridge', 'forward', 'filter', 'rule', '10', 'hop-limit', 'eq', '5']),
    ('set_rule_hop_limit_gt', ('forward', 10, '5'), 'set', ['firewall', 'bridge', 'forward', 'filter', 'rule', '10', 'hop-limit', 'gt', '5']),
    ('set_rule_hop_limit_lt', ('forward', 10, '5'), 'set', ['firewall', 'bridge', 'forward', 'filter', 'rule', '10', 'hop-limit', 'lt', '5']),
    ('set_rule_icmp_code', ('forward', 10, '0'), 'set', ['firewall', 'bridge', 'forward', 'filter', 'rule', '10', 'icmp', 'code', '0']),
    ('set_rule_icmp_type', ('forward', 10, '8'), 'set', ['firewall', 'bridge', 'forward', 'filter', 'rule', '10', 'icmp', 'type', '8']),
    ('set_rule_icmp_type_name', ('forward', 10, 'echo-request'), 'set', ['firewall', 'bridge', 'forward', 'filter', 'rule', '10', 'icmp', 'type-name', 'echo-request']),
    ('set_rule_icmpv6_code', ('forward', 10, '0'), 'set', ['firewall', 'bridge', 'forward', 'filter', 'rule', '10', 'icmpv6', 'code', '0']),
    ('set_rule_icmpv6_type', ('forward', 10, '8'), 'set', ['firewall', 'bridge', 'forward', 'filter', 'rule', '10', 'icmpv6', 'type', '8']),
    ('set_rule_icmpv6_type_name', ('forward', 10, 'echo-request'), 'set', ['firewall', 'bridge', 'forward', 'filter', 'rule', '10', 'icmpv6', 'type-name', 'echo-request']),
    ('set_rule_ipsec_match_ipsec_in', ('forward', 10), 'set', ['firewall', 'bridge', 'forward', 'filter', 'rule', '10', 'ipsec', 'match-ipsec-in']),
    ('set_rule_ipsec_match_ipsec_out', ('forward', 10), 'set', ['firewall', 'bridge', 'forward', 'filter', 'rule', '10', 'ipsec', 'match-ipsec-out']),
    ('set_rule_ipsec_match_none_in', ('forward', 10), 'set', ['firewall', 'bridge', 'forward', 'filter', 'rule', '10', 'ipsec', 'match-none-in']),
    ('set_rule_ipsec_match_none_out', ('forward', 10), 'set', ['firewall', 'bridge', 'forward', 'filter', 'rule', '10', 'ipsec', 'match-none-out']),
    ('set_rule_limit_burst', ('forward', 10, '5'), 'set', ['firewall', 'bridge', 'forward', 'filter', 'rule', '10', 'limit', 'burst', '5']),
    ('set_rule_limit_rate', ('forward', 10, '10/second'), 'set', ['firewall', 'bridge', 'forward', 'filter', 'rule', '10', 'limit', 'rate', '10/second']),
    ('set_rule_mark', ('forward', 10, '0x10'), 'set', ['firewall', 'bridge', 'forward', 'filter', 'rule', '10', 'mark', '0x10']),
    ('set_rule_packet_length', ('forward', 10, '100'), 'set', ['firewall', 'bridge', 'forward', 'filter', 'rule', '10', 'packet-length', '100']),
    ('set_rule_packet_type', ('forward', 10, 'broadcast'), 'set', ['firewall', 'bridge', 'forward', 'filter', 'rule', '10', 'packet-type', 'broadcast']),
    ('set_rule_protocol', ('forward', 10, 'tcp'), 'set', ['firewall', 'bridge', 'forward', 'filter', 'rule', '10', 'protocol', 'tcp']),
    ('set_rule_set_connection_mark', ('forward', 10, '0x10'), 'set', ['firewall', 'bridge', 'forward', 'filter', 'rule', '10', 'set', 'connection-mark', '0x10']),
    ('set_rule_set_dscp', ('forward', 10, '10'), 'set', ['firewall', 'bridge', 'forward', 'filter', 'rule', '10', 'set', 'dscp', '10']),
    ('set_rule_set_hop_limit', ('forward', 10, '10'), 'set', ['firewall', 'bridge', 'forward', 'filter', 'rule', '10', 'set', 'hop-limit', '10']),
    ('set_rule_set_mark', ('forward', 10, '0x10'), 'set', ['firewall', 'bridge', 'forward', 'filter', 'rule', '10', 'set', 'mark', '0x10']),
    ('set_rule_set_tcp_mss', ('forward', 10, '1400'), 'set', ['firewall', 'bridge', 'forward', 'filter', 'rule', '10', 'set', 'tcp-mss', '1400']),
    ('set_rule_set_ttl', ('forward', 10, '64'), 'set', ['firewall', 'bridge', 'forward', 'filter', 'rule', '10', 'set', 'ttl', '64']),
    ('set_rule_source_address', ('forward', 10, '203.0.113.10'), 'set', ['firewall', 'bridge', 'forward', 'filter', 'rule', '10', 'source', 'address', '203.0.113.10']),
    ('set_rule_source_group_mac', ('forward', 10, 'G1'), 'set', ['firewall', 'bridge', 'forward', 'filter', 'rule', '10', 'source', 'group', 'mac-group', 'G1']),
    ('set_rule_source_group_port', ('forward', 10, 'G1'), 'set', ['firewall', 'bridge', 'forward', 'filter', 'rule', '10', 'source', 'group', 'port-group', 'G1']),
    ('set_rule_source_port', ('forward', 10, '443'), 'set', ['firewall', 'bridge', 'forward', 'filter', 'rule', '10', 'source', 'port', '443']),
    ('set_rule_tcp_flags', ('forward', 10, 'syn'), 'set', ['firewall', 'bridge', 'forward', 'filter', 'rule', '10', 'tcp', 'flags', 'syn']),
    ('set_rule_tcp_flags_not', ('forward', 10, 'syn'), 'set', ['firewall', 'bridge', 'forward', 'filter', 'rule', '10', 'tcp', 'flags', 'not', 'syn']),
    ('set_rule_tcp_mss', ('forward', 10, '1400'), 'set', ['firewall', 'bridge', 'forward', 'filter', 'rule', '10', 'tcp', 'mss', '1400']),
    ('set_rule_time_startdate', ('forward', 10, '2025-01-01'), 'set', ['firewall', 'bridge', 'forward', 'filter', 'rule', '10', 'time', 'startdate', '2025-01-01']),
    ('set_rule_time_starttime', ('forward', 10, '10:00:00'), 'set', ['firewall', 'bridge', 'forward', 'filter', 'rule', '10', 'time', 'starttime', '10:00:00']),
    ('set_rule_time_stopdate', ('forward', 10, '2025-01-01'), 'set', ['firewall', 'bridge', 'forward', 'filter', 'rule', '10', 'time', 'stopdate', '2025-01-01']),
    ('set_rule_time_stoptime', ('forward', 10, '10:00:00'), 'set', ['firewall', 'bridge', 'forward', 'filter', 'rule', '10', 'time', 'stoptime', '10:00:00']),
    ('set_rule_time_weekdays', ('forward', 10, 'Mon'), 'set', ['firewall', 'bridge', 'forward', 'filter', 'rule', '10', 'time', 'weekdays', 'Mon']),
    ('set_rule_ttl_eq', ('forward', 10, '5'), 'set', ['firewall', 'bridge', 'forward', 'filter', 'rule', '10', 'ttl', 'eq', '5']),
    ('set_rule_ttl_gt', ('forward', 10, '5'), 'set', ['firewall', 'bridge', 'forward', 'filter', 'rule', '10', 'ttl', 'gt', '5']),
    ('set_rule_ttl_lt', ('forward', 10, '5'), 'set', ['firewall', 'bridge', 'forward', 'filter', 'rule', '10', 'ttl', 'lt', '5']),
    ('set_rule_vlan_ethernet_type', ('forward', 10, '0x0800'), 'set', ['firewall', 'bridge', 'forward', 'filter', 'rule', '10', 'vlan', 'ethernet-type', '0x0800']),
]


def _run(version, method, args, op, expected_path):
    builder = BridgeFirewallBatchBuilder(version=version)
    getattr(builder, method)(*args)
    operations = builder.get_operations()
    assert [(item["op"], item["path"]) for item in operations] == [(op, expected_path)]


@pytest.mark.parametrize("method, args, op, expected_path", COMMON_CASES)
@pytest.mark.parametrize("version", ["1.4", "1.5"])
def test_bridge_common_paths(method, args, op, expected_path, version):
    _run(version, method, args, op, expected_path)


@pytest.mark.parametrize("method, args, op, expected_path", V15_ONLY_CASES)
def test_bridge_v1_5_only_paths(method, args, op, expected_path):
    _run("1.5", method, args, op, expected_path)


# Builder methods whose paths do not exist on either build yet (#1059).
# 1.4 has no group or set subtree at all, so they must still raise there.
UNPINNED_CASES = [
    ('set_rule_source_group_address', ('forward', 10, 'G1')),
    ('set_rule_source_group_network', ('forward', 10, 'G1')),
    ('set_rule_destination_group_address', ('forward', 10, 'G1')),
    ('set_rule_destination_group_network', ('forward', 10, 'G1')),
    ('set_rule_set_vlan_priority', ('forward', 10, '3')),
    ('delete_rule_set_vlan_priority', ('forward', 10)),
]

ARGS = {method: args for method, args, *_ in COMMON_CASES + V15_ONLY_CASES}

# Capability flag -> builder methods that emit the paths it advertises.
FEATURE_METHODS = {
    'rule_description': ['set_rule_description', 'delete_rule_description'],
    'ethernet_type_matching': ['set_rule_ethernet_type', 'delete_rule_ethernet_type', 'set_rule_vlan_ethernet_type'],
    'packet_modifications': [
        'set_rule_set_dscp', 'set_rule_set_mark', 'set_rule_set_connection_mark', 'set_rule_set_ttl',
        'set_rule_set_hop_limit', 'set_rule_set_tcp_mss', 'delete_rule_set', 'delete_rule_set_dscp',
        'delete_rule_set_mark',
    ],
    'protocol_matching': ['set_rule_protocol', 'delete_rule_protocol'],
    'ip_matching': [
        'set_rule_source_address', 'delete_rule_source_address',
        'set_rule_destination_address', 'delete_rule_destination_address',
    ],
    'port_matching': [
        'set_rule_source_port', 'delete_rule_source_port',
        'set_rule_destination_port', 'delete_rule_destination_port',
    ],
    'firewall_groups': [
        'set_rule_source_group_mac', 'set_rule_source_group_port',
        'set_rule_destination_group_mac', 'set_rule_destination_group_port',
    ],
    'icmp_matching': [
        'set_rule_icmp_type', 'set_rule_icmp_code', 'set_rule_icmp_type_name',
        'set_rule_icmpv6_type', 'set_rule_icmpv6_code', 'set_rule_icmpv6_type_name',
    ],
    'tcp_flags': ['set_rule_tcp_flags', 'set_rule_tcp_flags_not', 'set_rule_tcp_mss'],
    'rate_limiting': ['set_rule_limit_rate', 'set_rule_limit_burst', 'delete_rule_limit'],
    'time_based': [
        'set_rule_time_startdate', 'set_rule_time_stopdate', 'set_rule_time_starttime',
        'set_rule_time_stoptime', 'set_rule_time_weekdays', 'delete_rule_time',
    ],
    'mark_matching': ['set_rule_mark', 'delete_rule_mark', 'set_rule_connection_mark'],
    'dscp_matching': ['set_rule_dscp', 'set_rule_dscp_exclude'],
    'fragment_matching': ['set_rule_fragment_match_frag', 'set_rule_fragment_match_non_frag'],
    'ipsec_matching': [
        'set_rule_ipsec_match_ipsec_in', 'set_rule_ipsec_match_ipsec_out',
        'set_rule_ipsec_match_none_in', 'set_rule_ipsec_match_none_out',
    ],
    'ttl_matching': [
        'set_rule_ttl_eq', 'set_rule_ttl_gt', 'set_rule_ttl_lt',
        'set_rule_hop_limit_eq', 'set_rule_hop_limit_gt', 'set_rule_hop_limit_lt',
    ],
    'packet_type': ['set_rule_packet_type'],
    'log_options': ['set_rule_log_options_level', 'set_rule_log_options_group', 'delete_rule_log_options'],
}

CRITERIA_METHODS = {
    'source_mac': ['set_rule_source_mac', 'delete_rule_source_mac'],
    'destination_mac': ['set_rule_destination_mac', 'delete_rule_destination_mac'],
    'vlan_id': ['set_rule_vlan_id', 'delete_rule_vlan_id'],
    'vlan_priority': ['set_rule_vlan_priority', 'delete_rule_vlan_priority'],
    'inbound_interface': ['set_rule_inbound_interface', 'set_rule_inbound_interface_group'],
    'outbound_interface': ['set_rule_outbound_interface', 'set_rule_outbound_interface_group'],
    'ethernet_type': ['set_rule_ethernet_type'],
    'protocol': ['set_rule_protocol'],
    'source_address': ['set_rule_source_address'],
    'destination_address': ['set_rule_destination_address'],
    'source_port': ['set_rule_source_port'],
    'destination_port': ['set_rule_destination_port'],
    'icmp': ['set_rule_icmp_type', 'set_rule_icmp_code'],
    'tcp_flags': ['set_rule_tcp_flags'],
    'limit': ['set_rule_limit_rate'],
    'time': ['set_rule_time_starttime'],
}


def _emits(version, method, args):
    builder = BridgeFirewallBatchBuilder(version=version)
    try:
        getattr(builder, method)(*args)
    except ValueError as exc:
        assert "not supported" in str(exc)
        assert builder.get_operations() == []
        return False
    return True


def test_every_builder_path_method_is_pinned_once():
    names = [c[0] for c in COMMON_CASES + V15_ONLY_CASES] + [c[0] for c in UNPINNED_CASES]
    assert len(names) == len(set(names))
    methods = {
        m for m in dir(BridgeFirewallBatchBuilder)
        if m.startswith(("set_", "delete_")) and callable(getattr(BridgeFirewallBatchBuilder, m))
    }
    assert methods == set(names)


@pytest.mark.parametrize(
    "method, args",
    [(c[0], c[1]) for c in V15_ONLY_CASES] + UNPINNED_CASES,
)
def test_bridge_v1_5_only_paths_rejected_on_v1_4(method, args):
    assert _emits("1.4", method, args) is False


@pytest.mark.parametrize("version", ["1.4", "1.5"])
@pytest.mark.parametrize("section, table", [("features", FEATURE_METHODS), ("matching_criteria", CRITERIA_METHODS)])
def test_bridge_capability_flags_match_mapper_paths(version, section, table):
    caps = BridgeFirewallBatchBuilder(version=version).get_capabilities()[section]
    for flag, methods in table.items():
        supported = caps[flag]["supported"]
        for method in methods:
            assert _emits(version, method, ARGS[method]) is supported, (version, flag, method)


def test_bridge_capability_flags_follow_the_device_tree():
    caps14 = BridgeFirewallBatchBuilder(version="1.4").get_capabilities()["features"]
    caps15 = BridgeFirewallBatchBuilder(version="1.5").get_capabilities()["features"]
    # 1.4 has log-options under a bridge rule; it has no rule description.
    assert caps14["log_options"]["supported"] is True
    assert caps14["rule_description"]["supported"] is False
    assert all(flag["supported"] for flag in caps15.values())


BASE_CHAINS = ["forward", "input", "output", "prerouting"]


@pytest.mark.parametrize("version", ["1.4", "1.5"])
@pytest.mark.parametrize("chain", BASE_CHAINS)
def test_bridge_chain_flags_match_mapper_paths(version, chain):
    caps = BridgeFirewallBatchBuilder(version=version).get_capabilities()
    supported = caps["features"][f"{chain}_chain"]["supported"]
    assert (chain in caps["supported_chains"]) is supported
    for method, args in [
        ("set_chain", (chain,)),
        ("set_chain_default_action", (chain, "accept")),
        ("set_rule", (chain, 10)),
        ("set_rule_action", (chain, 10, "accept")),
    ]:
        assert _emits(version, method, args) is supported, (method, chain)
    assert supported is (version == "1.5" or chain == "forward")


@pytest.mark.parametrize("version", ["1.4", "1.5"])
def test_bridge_custom_chains_on_both_versions(version):
    assert _emits(version, "set_rule_action", ("MYCHAIN", 10, "drop")) is True


ALL_ACTIONS = ["accept", "continue", "jump", "return", "drop", "queue", "notrack", "reject"]


@pytest.mark.parametrize("version", ["1.4", "1.5"])
@pytest.mark.parametrize("action", ALL_ACTIONS)
def test_bridge_rule_actions_match_mapper(version, action):
    caps = BridgeFirewallBatchBuilder(version=version).get_capabilities()
    supported = action in caps["supported_actions"]
    assert _emits(version, "set_rule_action", ("forward", 10, action)) is supported
    assert caps["features"]["notrack_action"]["supported"] is ("notrack" in caps["supported_actions"])
    # rule action node.def: 1.4 takes accept|continue|jump|return|drop|queue.
    assert supported is (version == "1.5" or action not in ("notrack", "reject"))


def test_bridge_batch_rejects_missing_nodes_on_v1_4(monkeypatch):
    """A 1.4 rule description or a 1.5-only base chain is a 400 and never commits."""
    from types import SimpleNamespace

    from fastapi import FastAPI
    from fastapi.testclient import TestClient

    executed = []

    async def allow(*_args, **_kwargs):
        return None

    class Service:
        def get_version(self):
            return "1.4"

        def execute_batch(self, batch):
            executed.append(batch)
            return SimpleNamespace(status=200, result="", error=None)

    monkeypatch.setattr("routers.firewall.bridge.require_write_permission", allow)
    monkeypatch.setattr(
        "routers.firewall.bridge.get_session_vyos_service",
        lambda _req: Service(),
    )

    from routers.firewall.bridge import router

    app = FastAPI()
    app.include_router(router)
    client = TestClient(app)

    for body in (
        {"chain": "forward", "rule_number": 10,
         "operations": [{"op": "set_rule"}, {"op": "set_rule_description", "value": "d"}]},
        {"chain": "input", "rule_number": 10,
         "operations": [{"op": "set_rule"}, {"op": "set_rule_action", "value": "accept"}]},
        {"chain": "prerouting", "operations": [{"op": "delete_chain"}]},
    ):
        response = client.post("/vyos/firewall/bridge/batch", json=body)
        assert response.status_code == 400, response.text
        assert "not supported on this device" in response.json()["detail"]
    assert executed == []


def test_bridge_config_reads_the_mapper_chain_list(monkeypatch):
    """GET /config parses exactly the base chains the mapper says exist."""
    from fastapi import FastAPI
    from fastapi.testclient import TestClient

    async def allow(*_args, **_kwargs):
        return None

    bridge = {
        chain: {"filter": {"rule": {"10": {"action": "accept"}}}} for chain in BASE_CHAINS
    }

    class Service:
        def get_full_config(self, refresh=False):
            return {"firewall": {"bridge": bridge}}

        def get_version(self):
            return version

    monkeypatch.setattr("routers.firewall.bridge.require_read_permission", allow)
    monkeypatch.setattr(
        "routers.firewall.bridge.get_session_vyos_service",
        lambda _req: Service(),
    )

    from routers.firewall.bridge import router

    app = FastAPI()
    app.include_router(router)
    client = TestClient(app)

    for version, expected in (("1.4", ["forward"]), ("1.5", BASE_CHAINS)):
        response = client.get("/vyos/firewall/bridge/config")
        assert response.status_code == 200, response.text
        assert [c["name"] for c in response.json()["chains"]] == expected


def test_bridge_batch_and_reorder_reject_ethernet_type_on_v1_4(monkeypatch):
    """1.4 ethernet-type must 400 on batch and reorder, and must not commit."""
    from types import SimpleNamespace

    from fastapi import FastAPI
    from fastapi.testclient import TestClient

    executed = []

    async def allow(*_args, **_kwargs):
        return None

    class Service:
        def get_version(self):
            return "1.4"

        def execute_batch(self, batch):
            executed.append(batch)
            return SimpleNamespace(status=200, result="", error=None)

    monkeypatch.setattr("routers.firewall.bridge.require_write_permission", allow)
    monkeypatch.setattr(
        "routers.firewall.bridge.get_session_vyos_service",
        lambda _req: Service(),
    )

    from routers.firewall.bridge import router

    app = FastAPI()
    app.include_router(router)
    client = TestClient(app)

    batch = client.post(
        "/vyos/firewall/bridge/batch",
        json={
            "chain": "forward",
            "rule_number": 10,
            "operations": [{"op": "set_rule_ethernet_type", "value": "0x0800"}],
        },
    )
    assert batch.status_code == 400, batch.text
    assert "not supported" in batch.json()["detail"]

    reorder = client.post(
        "/vyos/firewall/bridge/reorder",
        json={
            "chain": "forward",
            "rules": [{
                "old_number": 10,
                "new_number": 20,
                "rule_data": {"rule_number": 10, "ethernet_type": "0x0800"},
            }],
        },
    )
    assert reorder.status_code == 400, reorder.text
    assert "not supported" in reorder.json()["detail"]

    vlan = client.post(
        "/vyos/firewall/bridge/reorder",
        json={
            "chain": "forward",
            "rules": [{
                "old_number": 10,
                "new_number": 20,
                "rule_data": {"rule_number": 10, "vlan_ethernet_type": "0x0800"},
            }],
        },
    )
    assert vlan.status_code == 400, vlan.text
    assert "not supported" in vlan.json()["detail"]
    assert executed == []

