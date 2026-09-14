"""Golden (method, args, op, expected_path) cases for InputInterfaceBuilderMixin.

Paths checked with validateTmplPath on 1.4 (100.64.64.50) and 1.5 (100.64.64.5).
Generated for issue #721; edit the tables directly if the mapper changes.
"""

import pytest

from vyos_builders.interfaces.input import InputInterfaceBuilderMixin


def _run(version, method, args, op, expected_path):
    builder = InputInterfaceBuilderMixin(version=version)
    getattr(builder, method)(*args)
    operations = builder.get_operations()
    assert [(item["op"], item["path"]) for item in operations] == [(op, expected_path)]

COMMON_CASES = [
    ('delete_interface', ('ifb0',), 'delete', ['interfaces', 'input', 'ifb0']),
    ('delete_interface_description', ('ifb0',), 'delete', ['interfaces', 'input', 'ifb0', 'description']),
    ('delete_interface_disable', ('ifb0',), 'delete', ['interfaces', 'input', 'ifb0', 'disable']),
    ('delete_redirect', ('ifb0',), 'delete', ['interfaces', 'input', 'ifb0', 'redirect']),
    ('set_interface_description', ('ifb0', 'lab'), 'set', ['interfaces', 'input', 'ifb0', 'description', 'lab']),
    ('set_interface_disable', ('ifb0',), 'set', ['interfaces', 'input', 'ifb0', 'disable']),
    ('set_redirect', ('ifb0', '5'), 'set', ['interfaces', 'input', 'ifb0', 'redirect', '5']),
]


@pytest.mark.parametrize("method, args, op, expected_path", COMMON_CASES)
@pytest.mark.parametrize("version", ["1.4", "1.5"])
def test_input_common_paths(method, args, op, expected_path, version):
    _run(version, method, args, op, expected_path)
