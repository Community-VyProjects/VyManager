"""Golden (method, args, op, expected_path) cases for RouteBatchBuilder.

Sample values were committed on 1.4 (100.64.64.4) and 1.5 (100.64.64.5) for
both policy route and route6 (geoip and set vrf on 1.5 only), except the
`recent` rows (that match fails at apply on both labs) and the 1.4
`limit rate` row (any 1.4 rate fails at apply). icmp/ttl rows use route;
icmpv6/hop-limit rows use route6.
"""

import inspect

import pytest

from vyos_builders.route.route_batch_builder import RouteBatchBuilder


COMMON_CASES = [
    ('create_policy', ('route', 'PBR'), 'set', ['policy', 'route', 'PBR']),
    ('create_rule', ('route', 'PBR', '10'), 'set', ['policy', 'route', 'PBR', 'rule', '10']),
    ('delete_connection_mark', ('route', 'PBR', '10'), 'delete', ['policy', 'route', 'PBR', 'rule', '10', 'set', 'connection-mark']),
    ('delete_dscp', ('route', 'PBR', '10'), 'delete', ['policy', 'route', 'PBR', 'rule', '10', 'set', 'dscp']),
    ('delete_interface_policy', ('route', 'PBR', 'eth0'), 'delete', ['policy', 'route', 'PBR', 'interface', 'eth0']),
    ('delete_mark', ('route', 'PBR', '10'), 'delete', ['policy', 'route', 'PBR', 'rule', '10', 'set', 'mark']),
    ('delete_match_connection_mark', ('route', 'PBR', '10', '7'), 'delete', ['policy', 'route', 'PBR', 'rule', '10', 'connection-mark', '7']),
    ('delete_match_destination', ('route', 'PBR', '10'), 'delete', ['policy', 'route', 'PBR', 'rule', '10', 'destination']),
    ('delete_match_destination_address', ('route', 'PBR', '10'), 'delete', ['policy', 'route', 'PBR', 'rule', '10', 'destination', 'address']),
    ('delete_match_destination_group', ('route', 'PBR', '10'), 'delete', ['policy', 'route', 'PBR', 'rule', '10', 'destination', 'group']),
    ('delete_match_destination_group_address', ('route', 'PBR', '10'), 'delete', ['policy', 'route', 'PBR', 'rule', '10', 'destination', 'group', 'address-group']),
    ('delete_match_destination_group_domain', ('route', 'PBR', '10'), 'delete', ['policy', 'route', 'PBR', 'rule', '10', 'destination', 'group', 'domain-group']),
    ('delete_match_destination_group_mac', ('route', 'PBR', '10'), 'delete', ['policy', 'route', 'PBR', 'rule', '10', 'destination', 'group', 'mac-group']),
    ('delete_match_destination_group_network', ('route', 'PBR', '10'), 'delete', ['policy', 'route', 'PBR', 'rule', '10', 'destination', 'group', 'network-group']),
    ('delete_match_destination_group_port', ('route', 'PBR', '10'), 'delete', ['policy', 'route', 'PBR', 'rule', '10', 'destination', 'group', 'port-group']),
    ('delete_match_destination_port', ('route', 'PBR', '10'), 'delete', ['policy', 'route', 'PBR', 'rule', '10', 'destination', 'port']),
    ('delete_match_dscp', ('route', 'PBR', '10', '10'), 'delete', ['policy', 'route', 'PBR', 'rule', '10', 'dscp', '10']),
    ('delete_match_dscp_exclude', ('route', 'PBR', '10', '12'), 'delete', ['policy', 'route', 'PBR', 'rule', '10', 'dscp-exclude', '12']),
    ('delete_match_fragment', ('route', 'PBR', '10', 'match-frag'), 'delete', ['policy', 'route', 'PBR', 'rule', '10', 'fragment', 'match-frag']),
    ('delete_match_fragment_node', ('route', 'PBR', '10'), 'delete', ['policy', 'route', 'PBR', 'rule', '10', 'fragment']),
    ('delete_match_hop_limit', ('route6', 'PBR', '10', 'gt'), 'delete', ['policy', 'route6', 'PBR', 'rule', '10', 'hop-limit', 'gt']),
    ('delete_match_hop_limit_node', ('route6', 'PBR', '10'), 'delete', ['policy', 'route6', 'PBR', 'rule', '10', 'hop-limit']),
    ('delete_match_icmp', ('route', 'PBR', '10'), 'delete', ['policy', 'route', 'PBR', 'rule', '10', 'icmp']),
    ('delete_match_icmp_code', ('route', 'PBR', '10'), 'delete', ['policy', 'route', 'PBR', 'rule', '10', 'icmp', 'code']),
    ('delete_match_icmp_type', ('route', 'PBR', '10'), 'delete', ['policy', 'route', 'PBR', 'rule', '10', 'icmp', 'type']),
    ('delete_match_icmp_type_name', ('route', 'PBR', '10'), 'delete', ['policy', 'route', 'PBR', 'rule', '10', 'icmp', 'type-name']),
    ('delete_match_icmpv6', ('route6', 'PBR', '10'), 'delete', ['policy', 'route6', 'PBR', 'rule', '10', 'icmpv6']),
    ('delete_match_icmpv6_type', ('route6', 'PBR', '10'), 'delete', ['policy', 'route6', 'PBR', 'rule', '10', 'icmpv6', 'type']),
    ('delete_match_ipsec_node', ('route', 'PBR', '10'), 'delete', ['policy', 'route', 'PBR', 'rule', '10', 'ipsec']),
    ('delete_match_limit', ('route', 'PBR', '10'), 'delete', ['policy', 'route', 'PBR', 'rule', '10', 'limit']),
    ('delete_match_limit_burst', ('route', 'PBR', '10'), 'delete', ['policy', 'route', 'PBR', 'rule', '10', 'limit', 'burst']),
    ('delete_match_limit_rate', ('route', 'PBR', '10'), 'delete', ['policy', 'route', 'PBR', 'rule', '10', 'limit', 'rate']),
    ('delete_match_mark', ('route', 'PBR', '10'), 'delete', ['policy', 'route', 'PBR', 'rule', '10', 'mark']),
    ('delete_match_packet_length', ('route', 'PBR', '10', '300-400'), 'delete', ['policy', 'route', 'PBR', 'rule', '10', 'packet-length', '300-400']),
    ('delete_match_packet_length_exclude', ('route', 'PBR', '10', '200'), 'delete', ['policy', 'route', 'PBR', 'rule', '10', 'packet-length-exclude', '200']),
    ('delete_match_packet_type', ('route', 'PBR', '10'), 'delete', ['policy', 'route', 'PBR', 'rule', '10', 'packet-type']),
    ('delete_match_protocol', ('route', 'PBR', '10'), 'delete', ['policy', 'route', 'PBR', 'rule', '10', 'protocol']),
    ('delete_match_recent', ('route', 'PBR', '10'), 'delete', ['policy', 'route', 'PBR', 'rule', '10', 'recent']),
    ('delete_match_recent_count', ('route', 'PBR', '10'), 'delete', ['policy', 'route', 'PBR', 'rule', '10', 'recent', 'count']),
    ('delete_match_recent_time', ('route', 'PBR', '10'), 'delete', ['policy', 'route', 'PBR', 'rule', '10', 'recent', 'time']),
    ('delete_match_source', ('route', 'PBR', '10'), 'delete', ['policy', 'route', 'PBR', 'rule', '10', 'source']),
    ('delete_match_source_address', ('route', 'PBR', '10'), 'delete', ['policy', 'route', 'PBR', 'rule', '10', 'source', 'address']),
    ('delete_match_source_group', ('route', 'PBR', '10'), 'delete', ['policy', 'route', 'PBR', 'rule', '10', 'source', 'group']),
    ('delete_match_source_group_address', ('route', 'PBR', '10'), 'delete', ['policy', 'route', 'PBR', 'rule', '10', 'source', 'group', 'address-group']),
    ('delete_match_source_group_domain', ('route', 'PBR', '10'), 'delete', ['policy', 'route', 'PBR', 'rule', '10', 'source', 'group', 'domain-group']),
    ('delete_match_source_group_mac', ('route', 'PBR', '10'), 'delete', ['policy', 'route', 'PBR', 'rule', '10', 'source', 'group', 'mac-group']),
    ('delete_match_source_group_network', ('route', 'PBR', '10'), 'delete', ['policy', 'route', 'PBR', 'rule', '10', 'source', 'group', 'network-group']),
    ('delete_match_source_group_port', ('route', 'PBR', '10'), 'delete', ['policy', 'route', 'PBR', 'rule', '10', 'source', 'group', 'port-group']),
    ('delete_match_source_mac_address', ('route', 'PBR', '10'), 'delete', ['policy', 'route', 'PBR', 'rule', '10', 'source', 'mac-address']),
    ('delete_match_source_port', ('route', 'PBR', '10'), 'delete', ['policy', 'route', 'PBR', 'rule', '10', 'source', 'port']),
    ('delete_match_state', ('route', 'PBR', '10', 'established'), 'delete', ['policy', 'route', 'PBR', 'rule', '10', 'state', 'established']),
    ('delete_match_tcp', ('route', 'PBR', '10'), 'delete', ['policy', 'route', 'PBR', 'rule', '10', 'tcp']),
    ('delete_match_tcp_flag', ('route', 'PBR', '10', 'syn'), 'delete', ['policy', 'route', 'PBR', 'rule', '10', 'tcp', 'flags', 'syn']),
    ('delete_match_tcp_flag_not', ('route', 'PBR', '10', 'ack'), 'delete', ['policy', 'route', 'PBR', 'rule', '10', 'tcp', 'flags', 'not', 'ack']),
    ('delete_match_tcp_flags', ('route', 'PBR', '10'), 'delete', ['policy', 'route', 'PBR', 'rule', '10', 'tcp', 'flags']),
    ('delete_match_tcp_flags_not', ('route', 'PBR', '10'), 'delete', ['policy', 'route', 'PBR', 'rule', '10', 'tcp', 'flags', 'not']),
    ('delete_match_time', ('route', 'PBR', '10'), 'delete', ['policy', 'route', 'PBR', 'rule', '10', 'time']),
    ('delete_match_time_monthdays', ('route', 'PBR', '10'), 'delete', ['policy', 'route', 'PBR', 'rule', '10', 'time', 'monthdays']),
    ('delete_match_time_startdate', ('route', 'PBR', '10'), 'delete', ['policy', 'route', 'PBR', 'rule', '10', 'time', 'startdate']),
    ('delete_match_time_starttime', ('route', 'PBR', '10'), 'delete', ['policy', 'route', 'PBR', 'rule', '10', 'time', 'starttime']),
    ('delete_match_time_stopdate', ('route', 'PBR', '10'), 'delete', ['policy', 'route', 'PBR', 'rule', '10', 'time', 'stopdate']),
    ('delete_match_time_stoptime', ('route', 'PBR', '10'), 'delete', ['policy', 'route', 'PBR', 'rule', '10', 'time', 'stoptime']),
    ('delete_match_time_utc', ('route', 'PBR', '10'), 'delete', ['policy', 'route', 'PBR', 'rule', '10', 'time', 'utc']),
    ('delete_match_time_weekdays', ('route', 'PBR', '10'), 'delete', ['policy', 'route', 'PBR', 'rule', '10', 'time', 'weekdays']),
    ('delete_match_ttl', ('route', 'PBR', '10', 'gt'), 'delete', ['policy', 'route', 'PBR', 'rule', '10', 'ttl', 'gt']),
    ('delete_match_ttl_node', ('route', 'PBR', '10'), 'delete', ['policy', 'route', 'PBR', 'rule', '10', 'ttl']),
    ('delete_policy', ('route', 'PBR'), 'delete', ['policy', 'route', 'PBR']),
    ('delete_policy_default_log', ('route', 'PBR'), 'delete', ['policy', 'route', 'PBR', 'default-log']),
    ('delete_policy_description', ('route', 'PBR'), 'delete', ['policy', 'route', 'PBR', 'description']),
    ('delete_rule', ('route', 'PBR', '10'), 'delete', ['policy', 'route', 'PBR', 'rule', '10']),
    ('delete_rule_action', ('route', 'PBR', '10'), 'delete', ['policy', 'route', 'PBR', 'rule', '10', 'action']),
    ('delete_rule_description', ('route', 'PBR', '10'), 'delete', ['policy', 'route', 'PBR', 'rule', '10', 'description']),
    ('delete_rule_disable', ('route', 'PBR', '10'), 'delete', ['policy', 'route', 'PBR', 'rule', '10', 'disable']),
    ('delete_rule_log', ('route', 'PBR', '10'), 'delete', ['policy', 'route', 'PBR', 'rule', '10', 'log']),
    ('delete_set', ('route', 'PBR', '10'), 'delete', ['policy', 'route', 'PBR', 'rule', '10', 'set']),
    ('delete_table', ('route', 'PBR', '10'), 'delete', ['policy', 'route', 'PBR', 'rule', '10', 'set', 'table']),
    ('delete_tcp_mss', ('route', 'PBR', '10'), 'delete', ['policy', 'route', 'PBR', 'rule', '10', 'set', 'tcp-mss']),
    ('set_connection_mark', ('route', 'PBR', '10', '9'), 'set', ['policy', 'route', 'PBR', 'rule', '10', 'set', 'connection-mark', '9']),
    ('set_dscp', ('route', 'PBR', '10', '8'), 'set', ['policy', 'route', 'PBR', 'rule', '10', 'set', 'dscp', '8']),
    ('set_interface_policy', ('route', 'PBR', 'eth0'), 'set', ['policy', 'route', 'PBR', 'interface', 'eth0']),
    ('set_mark', ('route', 'PBR', '10', '11'), 'set', ['policy', 'route', 'PBR', 'rule', '10', 'set', 'mark', '11']),
    ('set_match_connection_mark', ('route', 'PBR', '10', '7'), 'set', ['policy', 'route', 'PBR', 'rule', '10', 'connection-mark', '7']),
    ('set_match_destination_address', ('route', 'PBR', '10', '198.51.100.0/24'), 'set', ['policy', 'route', 'PBR', 'rule', '10', 'destination', 'address', '198.51.100.0/24']),
    ('set_match_destination_group_address', ('route', 'PBR', '10', 'GADD'), 'set', ['policy', 'route', 'PBR', 'rule', '10', 'destination', 'group', 'address-group', 'GADD']),
    ('set_match_destination_group_domain', ('route', 'PBR', '10', 'GDOM'), 'set', ['policy', 'route', 'PBR', 'rule', '10', 'destination', 'group', 'domain-group', 'GDOM']),
    ('set_match_destination_group_mac', ('route', 'PBR', '10', 'GMAC'), 'set', ['policy', 'route', 'PBR', 'rule', '10', 'destination', 'group', 'mac-group', 'GMAC']),
    ('set_match_destination_group_network', ('route', 'PBR', '10', 'GNET'), 'set', ['policy', 'route', 'PBR', 'rule', '10', 'destination', 'group', 'network-group', 'GNET']),
    ('set_match_destination_group_port', ('route', 'PBR', '10', 'GPOR'), 'set', ['policy', 'route', 'PBR', 'rule', '10', 'destination', 'group', 'port-group', 'GPOR']),
    ('set_match_destination_port', ('route', 'PBR', '10', '443'), 'set', ['policy', 'route', 'PBR', 'rule', '10', 'destination', 'port', '443']),
    ('set_match_dscp', ('route', 'PBR', '10', '10'), 'set', ['policy', 'route', 'PBR', 'rule', '10', 'dscp', '10']),
    ('set_match_dscp_exclude', ('route', 'PBR', '10', '12'), 'set', ['policy', 'route', 'PBR', 'rule', '10', 'dscp-exclude', '12']),
    ('set_match_fragment', ('route', 'PBR', '10', 'match-frag'), 'set', ['policy', 'route', 'PBR', 'rule', '10', 'fragment', 'match-frag']),
    ('set_match_hop_limit', ('route6', 'PBR', '10', 'eq', '64'), 'set', ['policy', 'route6', 'PBR', 'rule', '10', 'hop-limit', 'eq', '64']),
    ('set_match_icmp_code', ('route', 'PBR', '10', '0'), 'set', ['policy', 'route', 'PBR', 'rule', '10', 'icmp', 'code', '0']),
    ('set_match_icmp_type', ('route', 'PBR', '10', '8'), 'set', ['policy', 'route', 'PBR', 'rule', '10', 'icmp', 'type', '8']),
    ('set_match_icmp_type_name', ('route', 'PBR', '10', 'echo-request'), 'set', ['policy', 'route', 'PBR', 'rule', '10', 'icmp', 'type-name', 'echo-request']),
    ('set_match_icmpv6_type', ('route6', 'PBR', '10', 'echo-request'), 'set', ['policy', 'route6', 'PBR', 'rule', '10', 'icmpv6', 'type', 'echo-request']),
    ('set_match_limit_burst', ('route', 'PBR', '10', '5'), 'set', ['policy', 'route', 'PBR', 'rule', '10', 'limit', 'burst', '5']),
    ('set_match_mark', ('route', 'PBR', '10', '5'), 'set', ['policy', 'route', 'PBR', 'rule', '10', 'mark', '5']),
    ('set_match_packet_length', ('route', 'PBR', '10', '300-400'), 'set', ['policy', 'route', 'PBR', 'rule', '10', 'packet-length', '300-400']),
    ('set_match_packet_length_exclude', ('route', 'PBR', '10', '200'), 'set', ['policy', 'route', 'PBR', 'rule', '10', 'packet-length-exclude', '200']),
    ('set_match_packet_type', ('route', 'PBR', '10', 'host'), 'set', ['policy', 'route', 'PBR', 'rule', '10', 'packet-type', 'host']),
    ('set_match_protocol', ('route', 'PBR', '10', 'tcp'), 'set', ['policy', 'route', 'PBR', 'rule', '10', 'protocol', 'tcp']),
    ('set_match_recent_count', ('route', 'PBR', '10', '3'), 'set', ['policy', 'route', 'PBR', 'rule', '10', 'recent', 'count', '3']),
    ('set_match_recent_time', ('route', 'PBR', '10', '60'), 'set', ['policy', 'route', 'PBR', 'rule', '10', 'recent', 'time', '60']),
    ('set_match_source_address', ('route', 'PBR', '10', '192.0.2.0/24'), 'set', ['policy', 'route', 'PBR', 'rule', '10', 'source', 'address', '192.0.2.0/24']),
    ('set_match_source_group_address', ('route', 'PBR', '10', 'GADD'), 'set', ['policy', 'route', 'PBR', 'rule', '10', 'source', 'group', 'address-group', 'GADD']),
    ('set_match_source_group_domain', ('route', 'PBR', '10', 'GDOM'), 'set', ['policy', 'route', 'PBR', 'rule', '10', 'source', 'group', 'domain-group', 'GDOM']),
    ('set_match_source_group_mac', ('route', 'PBR', '10', 'GMAC'), 'set', ['policy', 'route', 'PBR', 'rule', '10', 'source', 'group', 'mac-group', 'GMAC']),
    ('set_match_source_group_network', ('route', 'PBR', '10', 'GNET'), 'set', ['policy', 'route', 'PBR', 'rule', '10', 'source', 'group', 'network-group', 'GNET']),
    ('set_match_source_group_port', ('route', 'PBR', '10', 'GPOR'), 'set', ['policy', 'route', 'PBR', 'rule', '10', 'source', 'group', 'port-group', 'GPOR']),
    ('set_match_source_mac_address', ('route', 'PBR', '10', '00:11:22:33:44:55'), 'set', ['policy', 'route', 'PBR', 'rule', '10', 'source', 'mac-address', '00:11:22:33:44:55']),
    ('set_match_source_port', ('route', 'PBR', '10', '80'), 'set', ['policy', 'route', 'PBR', 'rule', '10', 'source', 'port', '80']),
    ('set_match_state', ('route', 'PBR', '10', 'established'), 'set', ['policy', 'route', 'PBR', 'rule', '10', 'state', 'established']),
    ('set_match_tcp_flag', ('route', 'PBR', '10', 'syn'), 'set', ['policy', 'route', 'PBR', 'rule', '10', 'tcp', 'flags', 'syn']),
    ('set_match_tcp_flag_not', ('route', 'PBR', '10', 'ack'), 'set', ['policy', 'route', 'PBR', 'rule', '10', 'tcp', 'flags', 'not', 'ack']),
    ('set_match_time_monthdays', ('route', 'PBR', '10', '1,15'), 'set', ['policy', 'route', 'PBR', 'rule', '10', 'time', 'monthdays', '1,15']),
    ('set_match_time_startdate', ('route', 'PBR', '10', '2026-01-01'), 'set', ['policy', 'route', 'PBR', 'rule', '10', 'time', 'startdate', '2026-01-01']),
    ('set_match_time_starttime', ('route', 'PBR', '10', '08:00:00'), 'set', ['policy', 'route', 'PBR', 'rule', '10', 'time', 'starttime', '08:00:00']),
    ('set_match_time_stopdate', ('route', 'PBR', '10', '2026-12-31'), 'set', ['policy', 'route', 'PBR', 'rule', '10', 'time', 'stopdate', '2026-12-31']),
    ('set_match_time_stoptime', ('route', 'PBR', '10', '18:00:00'), 'set', ['policy', 'route', 'PBR', 'rule', '10', 'time', 'stoptime', '18:00:00']),
    ('set_match_time_utc', ('route', 'PBR', '10'), 'set', ['policy', 'route', 'PBR', 'rule', '10', 'time', 'utc']),
    ('set_match_time_weekdays', ('route', 'PBR', '10', 'Monday,Tuesday'), 'set', ['policy', 'route', 'PBR', 'rule', '10', 'time', 'weekdays', 'Monday,Tuesday']),
    ('set_match_ttl', ('route', 'PBR', '10', 'eq', '64'), 'set', ['policy', 'route', 'PBR', 'rule', '10', 'ttl', 'eq', '64']),
    ('set_policy_default_log', ('route', 'PBR'), 'set', ['policy', 'route', 'PBR', 'default-log']),
    ('set_policy_description', ('route', 'PBR', 'PBR test'), 'set', ['policy', 'route', 'PBR', 'description', 'PBR test']),
    ('set_rule_action', ('route', 'PBR', '10', 'accept'), 'set', ['policy', 'route', 'PBR', 'rule', '10', 'action', 'accept']),
    ('set_rule_description', ('route', 'PBR', '10', 'r10 test'), 'set', ['policy', 'route', 'PBR', 'rule', '10', 'description', 'r10 test']),
    ('set_rule_disable', ('route', 'PBR', '10'), 'set', ['policy', 'route', 'PBR', 'rule', '10', 'disable']),
    ('set_rule_log', ('route', 'PBR', '10'), 'set', ['policy', 'route', 'PBR', 'rule', '10', 'log']),
    ('set_table', ('route', 'PBR', '10', '100'), 'set', ['policy', 'route', 'PBR', 'rule', '10', 'set', 'table', '100']),
    ('set_tcp_mss', ('route', 'PBR', '10', '1400'), 'set', ['policy', 'route', 'PBR', 'rule', '10', 'set', 'tcp-mss', '1400']),
]

V14_CASES = [
    ('set_match_limit_rate', ('route', 'PBR', '10', '10'), 'set', ['policy', 'route', 'PBR', 'rule', '10', 'limit', 'rate', '10']),
    ('delete_match_ipsec', ('route', 'PBR', '10', 'match-ipsec'), 'delete', ['policy', 'route', 'PBR', 'rule', '10', 'ipsec', 'match-ipsec']),
    ('set_match_ipsec', ('route', 'PBR', '10', 'match-ipsec'), 'set', ['policy', 'route', 'PBR', 'rule', '10', 'ipsec', 'match-ipsec']),
]

V15_CASES = [
    ('set_match_limit_rate', ('route', 'PBR', '10', '10/minute'), 'set', ['policy', 'route', 'PBR', 'rule', '10', 'limit', 'rate', '10/minute']),
    ('delete_match_destination_geoip', ('route', 'PBR', '10'), 'delete', ['policy', 'route', 'PBR', 'rule', '10', 'destination', 'geoip']),
    ('delete_match_destination_geoip_asn', ('route', 'PBR', '10', '64501'), 'delete', ['policy', 'route', 'PBR', 'rule', '10', 'destination', 'geoip', 'asn', '64501']),
    ('delete_match_destination_geoip_country_code', ('route', 'PBR', '10', 'de'), 'delete', ['policy', 'route', 'PBR', 'rule', '10', 'destination', 'geoip', 'country-code', 'de']),
    ('delete_match_destination_geoip_inverse', ('route', 'PBR', '10'), 'delete', ['policy', 'route', 'PBR', 'rule', '10', 'destination', 'geoip', 'inverse-match']),
    ('delete_match_ipsec', ('route', 'PBR', '10', 'match-ipsec-in'), 'delete', ['policy', 'route', 'PBR', 'rule', '10', 'ipsec', 'match-ipsec-in']),
    ('delete_match_source_geoip', ('route', 'PBR', '10'), 'delete', ['policy', 'route', 'PBR', 'rule', '10', 'source', 'geoip']),
    ('delete_match_source_geoip_asn', ('route', 'PBR', '10', '64500'), 'delete', ['policy', 'route', 'PBR', 'rule', '10', 'source', 'geoip', 'asn', '64500']),
    ('delete_match_source_geoip_country_code', ('route', 'PBR', '10', 'us'), 'delete', ['policy', 'route', 'PBR', 'rule', '10', 'source', 'geoip', 'country-code', 'us']),
    ('delete_match_source_geoip_inverse', ('route', 'PBR', '10'), 'delete', ['policy', 'route', 'PBR', 'rule', '10', 'source', 'geoip', 'inverse-match']),
    ('delete_match_tcp_mss', ('route', 'PBR', '10'), 'delete', ['policy', 'route', 'PBR', 'rule', '10', 'tcp', 'mss']),
    ('delete_vrf', ('route', 'PBR', '10'), 'delete', ['policy', 'route', 'PBR', 'rule', '10', 'set', 'vrf']),
    ('set_match_destination_geoip_asn', ('route', 'PBR', '10', '64501'), 'set', ['policy', 'route', 'PBR', 'rule', '10', 'destination', 'geoip', 'asn', '64501']),
    ('set_match_destination_geoip_country_code', ('route', 'PBR', '10', 'de'), 'set', ['policy', 'route', 'PBR', 'rule', '10', 'destination', 'geoip', 'country-code', 'de']),
    ('set_match_destination_geoip_inverse', ('route', 'PBR', '10'), 'set', ['policy', 'route', 'PBR', 'rule', '10', 'destination', 'geoip', 'inverse-match']),
    ('set_match_ipsec', ('route', 'PBR', '10', 'match-ipsec-in'), 'set', ['policy', 'route', 'PBR', 'rule', '10', 'ipsec', 'match-ipsec-in']),
    ('set_match_source_geoip_asn', ('route', 'PBR', '10', '64500'), 'set', ['policy', 'route', 'PBR', 'rule', '10', 'source', 'geoip', 'asn', '64500']),
    ('set_match_source_geoip_country_code', ('route', 'PBR', '10', 'us'), 'set', ['policy', 'route', 'PBR', 'rule', '10', 'source', 'geoip', 'country-code', 'us']),
    ('set_match_source_geoip_inverse', ('route', 'PBR', '10'), 'set', ['policy', 'route', 'PBR', 'rule', '10', 'source', 'geoip', 'inverse-match']),
    ('set_match_tcp_mss', ('route', 'PBR', '10', '1400'), 'set', ['policy', 'route', 'PBR', 'rule', '10', 'tcp', 'mss', '1400']),
    ('set_vrf', ('route', 'PBR', '10', 'TVRF'), 'set', ['policy', 'route', 'PBR', 'rule', '10', 'set', 'vrf', 'TVRF']),
]


def _run(version, method, args):
    builder = RouteBatchBuilder(version)
    getattr(builder, method)(*args)
    return builder.get_operations()[-1]


@pytest.mark.parametrize("version", ["1.4.3", "2026.09.23-0027-rolling"])
@pytest.mark.parametrize("method,args,op,path", COMMON_CASES, ids=[row[0] for row in COMMON_CASES])
def test_common_paths(version, method, args, op, path):
    result = _run(version, method, args)
    assert result["op"] == op
    assert result["path"] == path


@pytest.mark.parametrize("method,args,op,path", V14_CASES, ids=[row[0] for row in V14_CASES])
def test_v1_4_paths(method, args, op, path):
    result = _run("1.4.3", method, args)
    assert (result["op"], result["path"]) == (op, path)


@pytest.mark.parametrize("method,args,op,path", V15_CASES, ids=[row[0] for row in V15_CASES])
def test_v1_5_paths(method, args, op, path):
    result = _run("2026.09.23-0027-rolling", method, args)
    assert (result["op"], result["path"]) == (op, path)


# Rows whose op exists on 1.4 with another value shape (ipsec leaves, limit rate)
# are not 1.5-only.
V15_ONLY = [row for row in V15_CASES if row[0] not in {r[0] for r in V14_CASES}]


@pytest.mark.parametrize("method,args,op,path", V15_ONLY, ids=[row[0] for row in V15_ONLY])
def test_v1_5_only_rejected_on_v1_4(method, args, op, path):
    with pytest.raises(ValueError):
        getattr(RouteBatchBuilder("1.4.3"), method)(*args)


def test_every_builder_op_has_a_golden_row():
    covered = {row[0] for row in COMMON_CASES + V14_CASES + V15_CASES}
    ops = {
        name
        for name, _ in inspect.getmembers(RouteBatchBuilder("1.5"), inspect.ismethod)
        if name.startswith(("set_", "delete_", "create_"))
    }
    assert ops - covered == set()


@pytest.mark.parametrize(
    "method,args",
    [
        ("set_match_icmp_type", ("route6", "PBR", "10", "8")),
        ("set_match_ttl", ("route6", "PBR", "10", "eq", "64")),
        ("set_match_icmpv6_type", ("route", "PBR", "10", "echo-request")),
        ("set_match_hop_limit", ("route", "PBR", "10", "eq", "64")),
        ("set_match_tcp_flag", ("route", "PBR", "10", "bogus")),
        ("set_match_fragment", ("route", "PBR", "10", "bogus")),
        ("set_match_ttl", ("route", "PBR", "10", "ne", "64")),
        ("create_policy", ("route4", "PBR")),
    ],
)
def test_wrong_family_or_value_is_value_error(method, args):
    with pytest.raises(ValueError):
        getattr(RouteBatchBuilder("1.5"), method)(*args)


@pytest.mark.parametrize("version,leaf", [("1.4.3", "match-ipsec-in"), ("1.5", "match-ipsec")])
def test_ipsec_leaf_of_the_other_version_is_value_error(version, leaf):
    with pytest.raises(ValueError):
        RouteBatchBuilder(version).set_match_ipsec("route", "PBR", "10", leaf)


def test_restore_rule_recreates_every_leaf_of_a_subtree():
    tree = {
        "action": "accept",
        "log": {},
        "source": {"address": "2001:db8:1::/64", "geoip": {"country-code": ["us", "de"]}},
        "tcp": {"flags": {"syn": {}, "not": {"ack": {}}}},
        "packet-length": ["300-400", "100"],
        "set": {"table": "100"},
    }
    builder = RouteBatchBuilder("1.5")
    builder.restore_rule("route6", "PBR", "20", tree)
    base = ["policy", "route6", "PBR", "rule", "20"]
    assert [(op["op"], op["path"]) for op in builder.get_operations()] == [
        ("set", base),
        ("set", base + ["action", "accept"]),
        ("set", base + ["log"]),
        ("set", base + ["source", "address", "2001:db8:1::/64"]),
        ("set", base + ["source", "geoip", "country-code", "us"]),
        ("set", base + ["source", "geoip", "country-code", "de"]),
        ("set", base + ["tcp", "flags", "syn"]),
        ("set", base + ["tcp", "flags", "not", "ack"]),
        ("set", base + ["packet-length", "300-400"]),
        ("set", base + ["packet-length", "100"]),
        ("set", base + ["set", "table", "100"]),
    ]
