"""Golden (method, args, op, expected_path) cases for MplsBatchBuilder.

Every path checked with validateTmplPath on 1.4 (100.64.64.50) and 1.5
(100.64.64.5), and every set value accepted by configure-mode set on both
(then discarded). Generated for issue #980; edit the table directly if the
mapper changes.
"""

import pytest

from tests.dispatchable_ops import dispatchable_ops
from vyos_builders.mpls.mpls_batch_builder import MplsBatchBuilder


def _run(version, method, args, op, expected_path):
    builder = MplsBatchBuilder(version=version)
    getattr(builder, method)(*args)
    operations = builder.get_operations()
    assert [(item["op"], item["path"]) for item in operations] == [(op, expected_path)]


COMMON_CASES = [
    ('delete_interface', ('eth1',), 'delete', ['protocols', 'mpls', 'interface', 'eth1']),
    ('delete_ldp', (), 'delete', ['protocols', 'mpls', 'ldp']),
    ('delete_ldp_allocation', (), 'delete', ['protocols', 'mpls', 'ldp', 'allocation']),
    ('delete_ldp_allocation_ipv4', (), 'delete', ['protocols', 'mpls', 'ldp', 'allocation', 'ipv4']),
    ('delete_ldp_allocation_ipv6', (), 'delete', ['protocols', 'mpls', 'ldp', 'allocation', 'ipv6']),
    ('delete_ldp_discovery', (), 'delete', ['protocols', 'mpls', 'ldp', 'discovery']),
    ('delete_ldp_discovery_hello_ipv4_holdtime', (), 'delete', ['protocols', 'mpls', 'ldp', 'discovery', 'hello-ipv4-holdtime']),
    ('delete_ldp_discovery_hello_ipv4_interval', (), 'delete', ['protocols', 'mpls', 'ldp', 'discovery', 'hello-ipv4-interval']),
    ('delete_ldp_discovery_hello_ipv6_holdtime', (), 'delete', ['protocols', 'mpls', 'ldp', 'discovery', 'hello-ipv6-holdtime']),
    ('delete_ldp_discovery_hello_ipv6_interval', (), 'delete', ['protocols', 'mpls', 'ldp', 'discovery', 'hello-ipv6-interval']),
    ('delete_ldp_discovery_session_ipv4_holdtime', (), 'delete', ['protocols', 'mpls', 'ldp', 'discovery', 'session-ipv4-holdtime']),
    ('delete_ldp_discovery_session_ipv6_holdtime', (), 'delete', ['protocols', 'mpls', 'ldp', 'discovery', 'session-ipv6-holdtime']),
    ('delete_ldp_discovery_transport_ipv4_address', (), 'delete', ['protocols', 'mpls', 'ldp', 'discovery', 'transport-ipv4-address']),
    ('delete_ldp_discovery_transport_ipv6_address', (), 'delete', ['protocols', 'mpls', 'ldp', 'discovery', 'transport-ipv6-address']),
    ('delete_ldp_export', (), 'delete', ['protocols', 'mpls', 'ldp', 'export']),
    ('delete_ldp_export_ipv4_explicit_null', (), 'delete', ['protocols', 'mpls', 'ldp', 'export', 'ipv4', 'explicit-null']),
    ('delete_ldp_export_ipv4_filter', (), 'delete', ['protocols', 'mpls', 'ldp', 'export', 'ipv4']),
    ('delete_ldp_export_ipv6_explicit_null', (), 'delete', ['protocols', 'mpls', 'ldp', 'export', 'ipv6', 'explicit-null']),
    ('delete_ldp_export_ipv6_filter', (), 'delete', ['protocols', 'mpls', 'ldp', 'export', 'ipv6']),
    ('delete_ldp_import', (), 'delete', ['protocols', 'mpls', 'ldp', 'import']),
    ('delete_ldp_import_ipv4', (), 'delete', ['protocols', 'mpls', 'ldp', 'import', 'ipv4']),
    ('delete_ldp_import_ipv6', (), 'delete', ['protocols', 'mpls', 'ldp', 'import', 'ipv6']),
    ('delete_ldp_interface', ('eth1',), 'delete', ['protocols', 'mpls', 'ldp', 'interface', 'eth1']),
    ('delete_ldp_interface_disable_hello', ('eth1',), 'delete', ['protocols', 'mpls', 'ldp', 'interface', 'eth1', 'disable-establish-hello']),
    ('delete_ldp_neighbor', ('192.0.2.1',), 'delete', ['protocols', 'mpls', 'ldp', 'neighbor', '192.0.2.1']),
    ('delete_ldp_neighbor_password', ('192.0.2.1',), 'delete', ['protocols', 'mpls', 'ldp', 'neighbor', '192.0.2.1', 'password']),
    ('delete_ldp_neighbor_session_holdtime', ('192.0.2.1',), 'delete', ['protocols', 'mpls', 'ldp', 'neighbor', '192.0.2.1', 'session-holdtime']),
    ('delete_ldp_neighbor_ttl_security', ('192.0.2.1',), 'delete', ['protocols', 'mpls', 'ldp', 'neighbor', '192.0.2.1', 'ttl-security']),
    ('delete_ldp_parameters', (), 'delete', ['protocols', 'mpls', 'ldp', 'parameters']),
    ('delete_ldp_parameters_cisco_interop_tlv', (), 'delete', ['protocols', 'mpls', 'ldp', 'parameters', 'cisco-interop-tlv']),
    ('delete_ldp_parameters_ordered_control', (), 'delete', ['protocols', 'mpls', 'ldp', 'parameters', 'ordered-control']),
    ('delete_ldp_parameters_transport_prefer_ipv4', (), 'delete', ['protocols', 'mpls', 'ldp', 'parameters', 'transport-prefer-ipv4']),
    ('delete_ldp_router_id', (), 'delete', ['protocols', 'mpls', 'ldp', 'router-id']),
    ('delete_ldp_targeted_neighbor_ipv4', (), 'delete', ['protocols', 'mpls', 'ldp', 'targeted-neighbor', 'ipv4']),
    ('delete_ldp_targeted_neighbor_ipv4_address', ('192.0.2.1',), 'delete', ['protocols', 'mpls', 'ldp', 'targeted-neighbor', 'ipv4', 'address', '192.0.2.1']),
    ('delete_ldp_targeted_neighbor_ipv4_enable', (), 'delete', ['protocols', 'mpls', 'ldp', 'targeted-neighbor', 'ipv4', 'enable']),
    ('delete_ldp_targeted_neighbor_ipv4_hello_holdtime', (), 'delete', ['protocols', 'mpls', 'ldp', 'targeted-neighbor', 'ipv4', 'hello-holdtime']),
    ('delete_ldp_targeted_neighbor_ipv4_hello_interval', (), 'delete', ['protocols', 'mpls', 'ldp', 'targeted-neighbor', 'ipv4', 'hello-interval']),
    ('delete_ldp_targeted_neighbor_ipv6', (), 'delete', ['protocols', 'mpls', 'ldp', 'targeted-neighbor', 'ipv6']),
    ('delete_ldp_targeted_neighbor_ipv6_address', ('2001:db8::1',), 'delete', ['protocols', 'mpls', 'ldp', 'targeted-neighbor', 'ipv6', 'address', '2001:db8::1']),
    ('delete_ldp_targeted_neighbor_ipv6_enable', (), 'delete', ['protocols', 'mpls', 'ldp', 'targeted-neighbor', 'ipv6', 'enable']),
    ('delete_ldp_targeted_neighbor_ipv6_hello_holdtime', (), 'delete', ['protocols', 'mpls', 'ldp', 'targeted-neighbor', 'ipv6', 'hello-holdtime']),
    ('delete_ldp_targeted_neighbor_ipv6_hello_interval', (), 'delete', ['protocols', 'mpls', 'ldp', 'targeted-neighbor', 'ipv6', 'hello-interval']),
    ('delete_mpls', (), 'delete', ['protocols', 'mpls']),
    ('delete_parameters', (), 'delete', ['protocols', 'mpls', 'parameters']),
    ('delete_parameters_maximum_ttl', (), 'delete', ['protocols', 'mpls', 'parameters', 'maximum-ttl']),
    ('delete_parameters_no_propagate_ttl', (), 'delete', ['protocols', 'mpls', 'parameters', 'no-propagate-ttl']),
    ('set_interface', ('eth1',), 'set', ['protocols', 'mpls', 'interface', 'eth1']),
    ('set_ldp_allocation_ipv4_access_list', ('10',), 'set', ['protocols', 'mpls', 'ldp', 'allocation', 'ipv4', 'access-list', '10']),
    ('set_ldp_allocation_ipv6_access_list', ('10',), 'set', ['protocols', 'mpls', 'ldp', 'allocation', 'ipv6', 'access-list6', '10']),
    ('set_ldp_discovery_hello_ipv4_holdtime', ('30',), 'set', ['protocols', 'mpls', 'ldp', 'discovery', 'hello-ipv4-holdtime', '30']),
    ('set_ldp_discovery_hello_ipv4_interval', ('30',), 'set', ['protocols', 'mpls', 'ldp', 'discovery', 'hello-ipv4-interval', '30']),
    ('set_ldp_discovery_hello_ipv6_holdtime', ('30',), 'set', ['protocols', 'mpls', 'ldp', 'discovery', 'hello-ipv6-holdtime', '30']),
    ('set_ldp_discovery_hello_ipv6_interval', ('30',), 'set', ['protocols', 'mpls', 'ldp', 'discovery', 'hello-ipv6-interval', '30']),
    ('set_ldp_discovery_session_ipv4_holdtime', ('30',), 'set', ['protocols', 'mpls', 'ldp', 'discovery', 'session-ipv4-holdtime', '30']),
    ('set_ldp_discovery_session_ipv6_holdtime', ('30',), 'set', ['protocols', 'mpls', 'ldp', 'discovery', 'session-ipv6-holdtime', '30']),
    ('set_ldp_discovery_transport_ipv4_address', ('192.0.2.1',), 'set', ['protocols', 'mpls', 'ldp', 'discovery', 'transport-ipv4-address', '192.0.2.1']),
    ('set_ldp_discovery_transport_ipv6_address', ('2001:db8::1',), 'set', ['protocols', 'mpls', 'ldp', 'discovery', 'transport-ipv6-address', '2001:db8::1']),
    ('set_ldp_export_ipv4_explicit_null', (), 'set', ['protocols', 'mpls', 'ldp', 'export', 'ipv4', 'explicit-null']),
    ('set_ldp_export_ipv4_filter_access_list', ('10',), 'set', ['protocols', 'mpls', 'ldp', 'export', 'ipv4', 'export-filter', 'filter-access-list', '10']),
    ('set_ldp_export_ipv4_neighbor_access_list', ('10',), 'set', ['protocols', 'mpls', 'ldp', 'export', 'ipv4', 'export-filter', 'neighbor-access-list', '10']),
    ('set_ldp_export_ipv6_explicit_null', (), 'set', ['protocols', 'mpls', 'ldp', 'export', 'ipv6', 'explicit-null']),
    ('set_ldp_export_ipv6_filter_access_list', ('10',), 'set', ['protocols', 'mpls', 'ldp', 'export', 'ipv6', 'export-filter', 'filter-access-list6', '10']),
    ('set_ldp_export_ipv6_neighbor_access_list', ('10',), 'set', ['protocols', 'mpls', 'ldp', 'export', 'ipv6', 'export-filter', 'neighbor-access-list6', '10']),
    ('set_ldp_import_ipv4_filter_access_list', ('10',), 'set', ['protocols', 'mpls', 'ldp', 'import', 'ipv4', 'import-filter', 'filter-access-list', '10']),
    ('set_ldp_import_ipv4_neighbor_access_list', ('10',), 'set', ['protocols', 'mpls', 'ldp', 'import', 'ipv4', 'import-filter', 'neighbor-access-list', '10']),
    ('set_ldp_import_ipv6_filter_access_list', ('10',), 'set', ['protocols', 'mpls', 'ldp', 'import', 'ipv6', 'import-filter', 'filter-access-list6', '10']),
    ('set_ldp_import_ipv6_neighbor_access_list', ('10',), 'set', ['protocols', 'mpls', 'ldp', 'import', 'ipv6', 'import-filter', 'neighbor-access-list6', '10']),
    ('set_ldp_interface', ('eth1',), 'set', ['protocols', 'mpls', 'ldp', 'interface', 'eth1']),
    ('set_ldp_interface_disable_hello', ('eth1',), 'set', ['protocols', 'mpls', 'ldp', 'interface', 'eth1', 'disable-establish-hello']),
    ('set_ldp_neighbor', ('192.0.2.1',), 'set', ['protocols', 'mpls', 'ldp', 'neighbor', '192.0.2.1']),
    ('set_ldp_neighbor_password', ('192.0.2.1', 'secret'), 'set', ['protocols', 'mpls', 'ldp', 'neighbor', '192.0.2.1', 'password', 'secret']),
    ('set_ldp_neighbor_session_holdtime', ('192.0.2.1', '30'), 'set', ['protocols', 'mpls', 'ldp', 'neighbor', '192.0.2.1', 'session-holdtime', '30']),
    ('set_ldp_neighbor_ttl_security', ('192.0.2.1', '30'), 'set', ['protocols', 'mpls', 'ldp', 'neighbor', '192.0.2.1', 'ttl-security', '30']),
    ('set_ldp_parameters_cisco_interop_tlv', (), 'set', ['protocols', 'mpls', 'ldp', 'parameters', 'cisco-interop-tlv']),
    ('set_ldp_parameters_ordered_control', (), 'set', ['protocols', 'mpls', 'ldp', 'parameters', 'ordered-control']),
    ('set_ldp_parameters_transport_prefer_ipv4', (), 'set', ['protocols', 'mpls', 'ldp', 'parameters', 'transport-prefer-ipv4']),
    ('set_ldp_router_id', ('192.0.2.254',), 'set', ['protocols', 'mpls', 'ldp', 'router-id', '192.0.2.254']),
    ('set_ldp_targeted_neighbor_ipv4_address', ('192.0.2.1',), 'set', ['protocols', 'mpls', 'ldp', 'targeted-neighbor', 'ipv4', 'address', '192.0.2.1']),
    ('set_ldp_targeted_neighbor_ipv4_enable', (), 'set', ['protocols', 'mpls', 'ldp', 'targeted-neighbor', 'ipv4', 'enable']),
    ('set_ldp_targeted_neighbor_ipv4_hello_holdtime', ('30',), 'set', ['protocols', 'mpls', 'ldp', 'targeted-neighbor', 'ipv4', 'hello-holdtime', '30']),
    ('set_ldp_targeted_neighbor_ipv4_hello_interval', ('30',), 'set', ['protocols', 'mpls', 'ldp', 'targeted-neighbor', 'ipv4', 'hello-interval', '30']),
    ('set_ldp_targeted_neighbor_ipv6_address', ('2001:db8::1',), 'set', ['protocols', 'mpls', 'ldp', 'targeted-neighbor', 'ipv6', 'address', '2001:db8::1']),
    ('set_ldp_targeted_neighbor_ipv6_enable', (), 'set', ['protocols', 'mpls', 'ldp', 'targeted-neighbor', 'ipv6', 'enable']),
    ('set_ldp_targeted_neighbor_ipv6_hello_holdtime', ('30',), 'set', ['protocols', 'mpls', 'ldp', 'targeted-neighbor', 'ipv6', 'hello-holdtime', '30']),
    ('set_ldp_targeted_neighbor_ipv6_hello_interval', ('30',), 'set', ['protocols', 'mpls', 'ldp', 'targeted-neighbor', 'ipv6', 'hello-interval', '30']),
    ('set_parameters_maximum_ttl', ('30',), 'set', ['protocols', 'mpls', 'parameters', 'maximum-ttl', '30']),
    ('set_parameters_no_propagate_ttl', (), 'set', ['protocols', 'mpls', 'parameters', 'no-propagate-ttl']),
]


@pytest.mark.parametrize("method, args, op, expected_path", COMMON_CASES)
@pytest.mark.parametrize("version", ["1.4", "1.5"])
def test_mpls_common_paths(method, args, op, expected_path, version):
    _run(version, method, args, op, expected_path)


def test_every_mpls_op_has_a_golden_case():
    names = [case[0] for case in COMMON_CASES]
    assert len(names) == len(set(names))
    assert set(names) == dispatchable_ops(MplsBatchBuilder(version="1.5"))
