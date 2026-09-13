"""Golden (method, args, op, expected_path) cases for FlowtablesBatchBuilder.

Paths checked with validateTmplPath on 1.4 (100.64.64.50) and 1.5 (100.64.64.5).
Generated for issue #711; edit the tables directly if the mapper changes.
"""

import pytest

from vyos_builders.firewall.flowtables import FlowtablesBatchBuilder


COMMON_CASES = [
    ('delete_flowtable', ('FT1',), 'delete', ['firewall', 'flowtable', 'FT1']),
    ('delete_flowtable_description', ('FT1',), 'delete', ['firewall', 'flowtable', 'FT1', 'description']),
    ('delete_flowtable_interface', ('FT1', 'eth1'), 'delete', ['firewall', 'flowtable', 'FT1', 'interface', 'eth1']),
    ('delete_flowtable_offload', ('FT1',), 'delete', ['firewall', 'flowtable', 'FT1', 'offload']),
    ('set_flowtable', ('FT1',), 'set', ['firewall', 'flowtable', 'FT1']),
    ('set_flowtable_description', ('FT1', 'd'), 'set', ['firewall', 'flowtable', 'FT1', 'description', 'd']),
    ('set_flowtable_interface', ('FT1', 'eth1'), 'set', ['firewall', 'flowtable', 'FT1', 'interface', 'eth1']),
    ('set_flowtable_offload', ('FT1', 'software'), 'set', ['firewall', 'flowtable', 'FT1', 'offload', 'software']),
]


def _run(version, method, args, op, expected_path):
    builder = FlowtablesBatchBuilder(version=version)
    getattr(builder, method)(*args)
    operations = builder.get_operations()
    assert [(item["op"], item["path"]) for item in operations] == [(op, expected_path)]


@pytest.mark.parametrize("method, args, op, expected_path", COMMON_CASES)
@pytest.mark.parametrize("version", ["1.4", "1.5"])
def test_flowtables_common_paths(method, args, op, expected_path, version):
    _run(version, method, args, op, expected_path)

