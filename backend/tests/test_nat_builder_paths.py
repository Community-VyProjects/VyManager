"""Golden (method, args, op, expected_path) cases for NATBatchBuilder.

Every path checked with validateTmplPath on 1.4 (100.64.64.50) and 1.5
(100.64.64.5), and every set value accepted by configure-mode set on both
(then discarded). CGNAT and FQDN matches exist only on 1.5; their 1.4
rejection is covered by test_nat_cgnat_version_gate.py and
test_nat_fqdn_version_gate.py. Generated for issue #980; edit the tables
directly if the mapper changes.
"""

import pytest

from tests.dispatchable_ops import dispatchable_ops
from vyos_builders.nat.nat import NATBatchBuilder


def _run(version, method, args, op, expected_path):
    builder = NATBatchBuilder(version=version)
    getattr(builder, method)(*args)
    operations = builder.get_operations()
    assert [(item["op"], item["path"]) for item in operations] == [(op, expected_path)]


COMMON_CASES = [
    ('delete_destination_rule', (10,), 'delete', ['nat', 'destination', 'rule', '10']),
    ('delete_destination_rule_description', (10,), 'delete', ['nat', 'destination', 'rule', '10', 'description']),
    ('delete_destination_rule_destination_address', (10,), 'delete', ['nat', 'destination', 'rule', '10', 'destination', 'address']),
    ('delete_destination_rule_destination_group', (10, 'address-group'), 'delete', ['nat', 'destination', 'rule', '10', 'destination', 'group', 'address-group']),
    ('delete_destination_rule_destination_port', (10,), 'delete', ['nat', 'destination', 'rule', '10', 'destination', 'port']),
    ('delete_destination_rule_disable', (10,), 'delete', ['nat', 'destination', 'rule', '10', 'disable']),
    ('delete_destination_rule_exclude', (10,), 'delete', ['nat', 'destination', 'rule', '10', 'exclude']),
    ('delete_destination_rule_inbound_interface_group', (10,), 'delete', ['nat', 'destination', 'rule', '10', 'inbound-interface', 'group']),
    ('delete_destination_rule_inbound_interface_name', (10,), 'delete', ['nat', 'destination', 'rule', '10', 'inbound-interface', 'name']),
    ('delete_destination_rule_load_balance_backend', (10, '192.0.2.10'), 'delete', ['nat', 'destination', 'rule', '10', 'load-balance', 'backend', '192.0.2.10']),
    ('delete_destination_rule_load_balance_backend_weight', (10, '192.0.2.10'), 'delete', ['nat', 'destination', 'rule', '10', 'load-balance', 'backend', '192.0.2.10', 'weight']),
    ('delete_destination_rule_load_balance_hash', (10,), 'delete', ['nat', 'destination', 'rule', '10', 'load-balance', 'hash']),
    ('delete_destination_rule_log', (10,), 'delete', ['nat', 'destination', 'rule', '10', 'log']),
    ('delete_destination_rule_packet_type', (10,), 'delete', ['nat', 'destination', 'rule', '10', 'packet-type']),
    ('delete_destination_rule_protocol', (10,), 'delete', ['nat', 'destination', 'rule', '10', 'protocol']),
    ('delete_destination_rule_source_address', (10,), 'delete', ['nat', 'destination', 'rule', '10', 'source', 'address']),
    ('delete_destination_rule_source_group', (10, 'address-group'), 'delete', ['nat', 'destination', 'rule', '10', 'source', 'group', 'address-group']),
    ('delete_destination_rule_source_port', (10,), 'delete', ['nat', 'destination', 'rule', '10', 'source', 'port']),
    ('delete_destination_rule_translation_address', (10,), 'delete', ['nat', 'destination', 'rule', '10', 'translation', 'address']),
    ('delete_destination_rule_translation_options_address_mapping', (10,), 'delete', ['nat', 'destination', 'rule', '10', 'translation', 'options', 'address-mapping']),
    ('delete_destination_rule_translation_options_port_mapping', (10,), 'delete', ['nat', 'destination', 'rule', '10', 'translation', 'options', 'port-mapping']),
    ('delete_destination_rule_translation_port', (10,), 'delete', ['nat', 'destination', 'rule', '10', 'translation', 'port']),
    ('delete_destination_rule_translation_redirect_port', (10,), 'delete', ['nat', 'destination', 'rule', '10', 'translation', 'redirect', 'port']),
    ('delete_source_rule', (10,), 'delete', ['nat', 'source', 'rule', '10']),
    ('delete_source_rule_description', (10,), 'delete', ['nat', 'source', 'rule', '10', 'description']),
    ('delete_source_rule_destination_address', (10,), 'delete', ['nat', 'source', 'rule', '10', 'destination', 'address']),
    ('delete_source_rule_destination_group', (10, 'address-group'), 'delete', ['nat', 'source', 'rule', '10', 'destination', 'group', 'address-group']),
    ('delete_source_rule_destination_port', (10,), 'delete', ['nat', 'source', 'rule', '10', 'destination', 'port']),
    ('delete_source_rule_disable', (10,), 'delete', ['nat', 'source', 'rule', '10', 'disable']),
    ('delete_source_rule_exclude', (10,), 'delete', ['nat', 'source', 'rule', '10', 'exclude']),
    ('delete_source_rule_load_balance_backend', (10, '192.0.2.10'), 'delete', ['nat', 'source', 'rule', '10', 'load-balance', 'backend', '192.0.2.10']),
    ('delete_source_rule_load_balance_backend_weight', (10, '192.0.2.10'), 'delete', ['nat', 'source', 'rule', '10', 'load-balance', 'backend', '192.0.2.10', 'weight']),
    ('delete_source_rule_load_balance_hash', (10,), 'delete', ['nat', 'source', 'rule', '10', 'load-balance', 'hash']),
    ('delete_source_rule_log', (10,), 'delete', ['nat', 'source', 'rule', '10', 'log']),
    ('delete_source_rule_outbound_interface_group', (10,), 'delete', ['nat', 'source', 'rule', '10', 'outbound-interface', 'group']),
    ('delete_source_rule_outbound_interface_name', (10,), 'delete', ['nat', 'source', 'rule', '10', 'outbound-interface', 'name']),
    ('delete_source_rule_packet_type', (10,), 'delete', ['nat', 'source', 'rule', '10', 'packet-type']),
    ('delete_source_rule_protocol', (10,), 'delete', ['nat', 'source', 'rule', '10', 'protocol']),
    ('delete_source_rule_source_address', (10,), 'delete', ['nat', 'source', 'rule', '10', 'source', 'address']),
    ('delete_source_rule_source_group', (10, 'address-group'), 'delete', ['nat', 'source', 'rule', '10', 'source', 'group', 'address-group']),
    ('delete_source_rule_source_port', (10,), 'delete', ['nat', 'source', 'rule', '10', 'source', 'port']),
    ('delete_source_rule_translation_address', (10,), 'delete', ['nat', 'source', 'rule', '10', 'translation', 'address']),
    ('delete_source_rule_translation_options_address_mapping', (10,), 'delete', ['nat', 'source', 'rule', '10', 'translation', 'options', 'address-mapping']),
    ('delete_source_rule_translation_options_port_mapping', (10,), 'delete', ['nat', 'source', 'rule', '10', 'translation', 'options', 'port-mapping']),
    ('delete_source_rule_translation_port', (10,), 'delete', ['nat', 'source', 'rule', '10', 'translation', 'port']),
    ('delete_static_rule', (10,), 'delete', ['nat', 'static', 'rule', '10']),
    ('delete_static_rule_description', (10,), 'delete', ['nat', 'static', 'rule', '10', 'description']),
    ('delete_static_rule_destination_address', (10,), 'delete', ['nat', 'static', 'rule', '10', 'destination', 'address']),
    ('delete_static_rule_inbound_interface', (10,), 'delete', ['nat', 'static', 'rule', '10', 'inbound-interface']),
    ('delete_static_rule_log', (10,), 'delete', ['nat', 'static', 'rule', '10', 'log']),
    ('delete_static_rule_translation_address', (10,), 'delete', ['nat', 'static', 'rule', '10', 'translation', 'address']),
    ('set_destination_rule', (10,), 'set', ['nat', 'destination', 'rule', '10']),
    ('set_destination_rule_description', (10, 'test'), 'set', ['nat', 'destination', 'rule', '10', 'description', 'test']),
    ('set_destination_rule_destination_address', (10, '192.0.2.1'), 'set', ['nat', 'destination', 'rule', '10', 'destination', 'address', '192.0.2.1']),
    ('set_destination_rule_destination_group', (10, 'address-group', 'GRP1'), 'set', ['nat', 'destination', 'rule', '10', 'destination', 'group', 'address-group', 'GRP1']),
    ('set_destination_rule_destination_port', (10, '80'), 'set', ['nat', 'destination', 'rule', '10', 'destination', 'port', '80']),
    ('set_destination_rule_disable', (10,), 'set', ['nat', 'destination', 'rule', '10', 'disable']),
    ('set_destination_rule_exclude', (10,), 'set', ['nat', 'destination', 'rule', '10', 'exclude']),
    ('set_destination_rule_inbound_interface_group', (10, 'IFGRP1'), 'set', ['nat', 'destination', 'rule', '10', 'inbound-interface', 'group', 'IFGRP1']),
    ('set_destination_rule_inbound_interface_name', (10, 'eth1'), 'set', ['nat', 'destination', 'rule', '10', 'inbound-interface', 'name', 'eth1']),
    ('set_destination_rule_load_balance_backend', (10, '192.0.2.10'), 'set', ['nat', 'destination', 'rule', '10', 'load-balance', 'backend', '192.0.2.10']),
    ('set_destination_rule_load_balance_backend_weight', (10, '192.0.2.10', '50'), 'set', ['nat', 'destination', 'rule', '10', 'load-balance', 'backend', '192.0.2.10', 'weight', '50']),
    ('set_destination_rule_load_balance_hash', (10, 'source-address'), 'set', ['nat', 'destination', 'rule', '10', 'load-balance', 'hash', 'source-address']),
    ('set_destination_rule_log', (10,), 'set', ['nat', 'destination', 'rule', '10', 'log']),
    ('set_destination_rule_packet_type', (10, 'host'), 'set', ['nat', 'destination', 'rule', '10', 'packet-type', 'host']),
    ('set_destination_rule_protocol', (10, 'tcp'), 'set', ['nat', 'destination', 'rule', '10', 'protocol', 'tcp']),
    ('set_destination_rule_source_address', (10, '192.0.2.1'), 'set', ['nat', 'destination', 'rule', '10', 'source', 'address', '192.0.2.1']),
    ('set_destination_rule_source_group', (10, 'address-group', 'GRP1'), 'set', ['nat', 'destination', 'rule', '10', 'source', 'group', 'address-group', 'GRP1']),
    ('set_destination_rule_source_port', (10, '80'), 'set', ['nat', 'destination', 'rule', '10', 'source', 'port', '80']),
    ('set_destination_rule_translation_address', (10, '192.0.2.1'), 'set', ['nat', 'destination', 'rule', '10', 'translation', 'address', '192.0.2.1']),
    ('set_destination_rule_translation_options_address_mapping', (10, 'random'), 'set', ['nat', 'destination', 'rule', '10', 'translation', 'options', 'address-mapping', 'random']),
    ('set_destination_rule_translation_options_port_mapping', (10, 'random'), 'set', ['nat', 'destination', 'rule', '10', 'translation', 'options', 'port-mapping', 'random']),
    ('set_destination_rule_translation_port', (10, '80'), 'set', ['nat', 'destination', 'rule', '10', 'translation', 'port', '80']),
    ('set_destination_rule_translation_redirect_port', (10, '80'), 'set', ['nat', 'destination', 'rule', '10', 'translation', 'redirect', 'port', '80']),
    ('set_source_rule', (10,), 'set', ['nat', 'source', 'rule', '10']),
    ('set_source_rule_description', (10, 'test'), 'set', ['nat', 'source', 'rule', '10', 'description', 'test']),
    ('set_source_rule_destination_address', (10, '192.0.2.1'), 'set', ['nat', 'source', 'rule', '10', 'destination', 'address', '192.0.2.1']),
    ('set_source_rule_destination_group', (10, 'address-group', 'GRP1'), 'set', ['nat', 'source', 'rule', '10', 'destination', 'group', 'address-group', 'GRP1']),
    ('set_source_rule_destination_port', (10, '80'), 'set', ['nat', 'source', 'rule', '10', 'destination', 'port', '80']),
    ('set_source_rule_disable', (10,), 'set', ['nat', 'source', 'rule', '10', 'disable']),
    ('set_source_rule_exclude', (10,), 'set', ['nat', 'source', 'rule', '10', 'exclude']),
    ('set_source_rule_load_balance_backend', (10, '192.0.2.10'), 'set', ['nat', 'source', 'rule', '10', 'load-balance', 'backend', '192.0.2.10']),
    ('set_source_rule_load_balance_backend_weight', (10, '192.0.2.10', '50'), 'set', ['nat', 'source', 'rule', '10', 'load-balance', 'backend', '192.0.2.10', 'weight', '50']),
    ('set_source_rule_load_balance_hash', (10, 'source-address'), 'set', ['nat', 'source', 'rule', '10', 'load-balance', 'hash', 'source-address']),
    ('set_source_rule_log', (10,), 'set', ['nat', 'source', 'rule', '10', 'log']),
    ('set_source_rule_outbound_interface_group', (10, 'IFGRP1'), 'set', ['nat', 'source', 'rule', '10', 'outbound-interface', 'group', 'IFGRP1']),
    ('set_source_rule_outbound_interface_name', (10, 'eth1'), 'set', ['nat', 'source', 'rule', '10', 'outbound-interface', 'name', 'eth1']),
    ('set_source_rule_packet_type', (10, 'host'), 'set', ['nat', 'source', 'rule', '10', 'packet-type', 'host']),
    ('set_source_rule_protocol', (10, 'tcp'), 'set', ['nat', 'source', 'rule', '10', 'protocol', 'tcp']),
    ('set_source_rule_source_address', (10, '192.0.2.1'), 'set', ['nat', 'source', 'rule', '10', 'source', 'address', '192.0.2.1']),
    ('set_source_rule_source_group', (10, 'address-group', 'GRP1'), 'set', ['nat', 'source', 'rule', '10', 'source', 'group', 'address-group', 'GRP1']),
    ('set_source_rule_source_port', (10, '80'), 'set', ['nat', 'source', 'rule', '10', 'source', 'port', '80']),
    ('set_source_rule_translation_address', (10, '192.0.2.1'), 'set', ['nat', 'source', 'rule', '10', 'translation', 'address', '192.0.2.1']),
    ('set_source_rule_translation_options_address_mapping', (10, 'random'), 'set', ['nat', 'source', 'rule', '10', 'translation', 'options', 'address-mapping', 'random']),
    ('set_source_rule_translation_options_port_mapping', (10, 'random'), 'set', ['nat', 'source', 'rule', '10', 'translation', 'options', 'port-mapping', 'random']),
    ('set_source_rule_translation_port', (10, '80'), 'set', ['nat', 'source', 'rule', '10', 'translation', 'port', '80']),
    ('set_static_rule', (10,), 'set', ['nat', 'static', 'rule', '10']),
    ('set_static_rule_description', (10, 'test'), 'set', ['nat', 'static', 'rule', '10', 'description', 'test']),
    ('set_static_rule_destination_address', (10, '192.0.2.1'), 'set', ['nat', 'static', 'rule', '10', 'destination', 'address', '192.0.2.1']),
    ('set_static_rule_inbound_interface', (10, 'eth1'), 'set', ['nat', 'static', 'rule', '10', 'inbound-interface', 'eth1']),
    ('set_static_rule_log', (10,), 'set', ['nat', 'static', 'rule', '10', 'log']),
    ('set_static_rule_translation_address', (10, '192.0.2.1'), 'set', ['nat', 'static', 'rule', '10', 'translation', 'address', '192.0.2.1']),
]


@pytest.mark.parametrize("method, args, op, expected_path", COMMON_CASES)
@pytest.mark.parametrize("version", ["1.4", "1.5"])
def test_nat_common_paths(method, args, op, expected_path, version):
    _run(version, method, args, op, expected_path)


V15_ONLY_CASES = [
    ('delete_cgnat_log_allocation', (), 'delete', ['nat', 'cgnat', 'log-allocation']),
    ('delete_cgnat_pool_external', ('POOL1',), 'delete', ['nat', 'cgnat', 'pool', 'external', 'POOL1']),
    ('delete_cgnat_pool_external_per_user_limit_port', ('POOL1',), 'delete', ['nat', 'cgnat', 'pool', 'external', 'POOL1', 'per-user-limit', 'port']),
    ('delete_cgnat_pool_external_port_range', ('POOL1',), 'delete', ['nat', 'cgnat', 'pool', 'external', 'POOL1', 'external-port-range']),
    ('delete_cgnat_pool_external_range', ('POOL1', '192.0.2.0/24'), 'delete', ['nat', 'cgnat', 'pool', 'external', 'POOL1', 'range', '192.0.2.0/24']),
    ('delete_cgnat_pool_external_range_seq', ('POOL1', '192.0.2.0/24'), 'delete', ['nat', 'cgnat', 'pool', 'external', 'POOL1', 'range', '192.0.2.0/24', 'seq']),
    ('delete_cgnat_pool_internal', ('POOL1',), 'delete', ['nat', 'cgnat', 'pool', 'internal', 'POOL1']),
    ('delete_cgnat_pool_internal_range', ('POOL1', '192.0.2.0/24'), 'delete', ['nat', 'cgnat', 'pool', 'internal', 'POOL1', 'range', '192.0.2.0/24']),
    ('delete_cgnat_rule', (10,), 'delete', ['nat', 'cgnat', 'rule', '10']),
    ('delete_cgnat_rule_source_pool', (10,), 'delete', ['nat', 'cgnat', 'rule', '10', 'source', 'pool']),
    ('delete_cgnat_rule_translation_pool', (10,), 'delete', ['nat', 'cgnat', 'rule', '10', 'translation', 'pool']),
    ('delete_destination_rule_destination_fqdn', (10,), 'delete', ['nat', 'destination', 'rule', '10', 'destination', 'fqdn']),
    ('delete_destination_rule_source_fqdn', (10,), 'delete', ['nat', 'destination', 'rule', '10', 'source', 'fqdn']),
    ('delete_source_rule_destination_fqdn', (10,), 'delete', ['nat', 'source', 'rule', '10', 'destination', 'fqdn']),
    ('delete_source_rule_source_fqdn', (10,), 'delete', ['nat', 'source', 'rule', '10', 'source', 'fqdn']),
    ('set_cgnat_log_allocation', (), 'set', ['nat', 'cgnat', 'log-allocation']),
    ('set_cgnat_pool_external', ('POOL1',), 'set', ['nat', 'cgnat', 'pool', 'external', 'POOL1']),
    ('set_cgnat_pool_external_per_user_limit_port', ('POOL1', '80'), 'set', ['nat', 'cgnat', 'pool', 'external', 'POOL1', 'per-user-limit', 'port', '80']),
    ('set_cgnat_pool_external_port_range', ('POOL1', '1024-65535'), 'set', ['nat', 'cgnat', 'pool', 'external', 'POOL1', 'external-port-range', '1024-65535']),
    ('set_cgnat_pool_external_range', ('POOL1', '192.0.2.0/24'), 'set', ['nat', 'cgnat', 'pool', 'external', 'POOL1', 'range', '192.0.2.0/24']),
    ('set_cgnat_pool_external_range_seq', ('POOL1', '192.0.2.0/24', '10'), 'set', ['nat', 'cgnat', 'pool', 'external', 'POOL1', 'range', '192.0.2.0/24', 'seq', '10']),
    ('set_cgnat_pool_internal', ('POOL1',), 'set', ['nat', 'cgnat', 'pool', 'internal', 'POOL1']),
    ('set_cgnat_pool_internal_range', ('POOL1', '192.0.2.0/24'), 'set', ['nat', 'cgnat', 'pool', 'internal', 'POOL1', 'range', '192.0.2.0/24']),
    ('set_cgnat_rule', (10,), 'set', ['nat', 'cgnat', 'rule', '10']),
    ('set_cgnat_rule_source_pool', (10, 'POOL1'), 'set', ['nat', 'cgnat', 'rule', '10', 'source', 'pool', 'POOL1']),
    ('set_cgnat_rule_translation_pool', (10, 'POOL1'), 'set', ['nat', 'cgnat', 'rule', '10', 'translation', 'pool', 'POOL1']),
    ('set_destination_rule_destination_fqdn', (10, 'host.example.com'), 'set', ['nat', 'destination', 'rule', '10', 'destination', 'fqdn', 'host.example.com']),
    ('set_destination_rule_source_fqdn', (10, 'host.example.com'), 'set', ['nat', 'destination', 'rule', '10', 'source', 'fqdn', 'host.example.com']),
    ('set_source_rule_destination_fqdn', (10, 'host.example.com'), 'set', ['nat', 'source', 'rule', '10', 'destination', 'fqdn', 'host.example.com']),
    ('set_source_rule_source_fqdn', (10, 'host.example.com'), 'set', ['nat', 'source', 'rule', '10', 'source', 'fqdn', 'host.example.com']),
]


@pytest.mark.parametrize("method, args, op, expected_path", V15_ONLY_CASES)
def test_nat_v1_5_only_paths(method, args, op, expected_path):
    _run("1.5", method, args, op, expected_path)


def test_every_nat_op_has_a_golden_case():
    names = [case[0] for case in COMMON_CASES + V15_ONLY_CASES]
    assert len(names) == len(set(names))
    assert set(names) == dispatchable_ops(NATBatchBuilder(version="1.5"))
