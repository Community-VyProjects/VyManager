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

