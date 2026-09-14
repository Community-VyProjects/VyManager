"""Golden (method, args, op, expected_path) cases for LoopbackInterfaceBuilderMixin.

Paths checked with validateTmplPath on 1.4 (100.64.64.50) and 1.5 (100.64.64.5).
Generated for issue #721; edit the tables directly if the mapper changes.
"""

import pytest

from vyos_builders.interfaces.loopback import LoopbackInterfaceBuilderMixin


def _run(version, method, args, op, expected_path):
    builder = LoopbackInterfaceBuilderMixin(version=version)
    getattr(builder, method)(*args)
    operations = builder.get_operations()
    assert [(item["op"], item["path"]) for item in operations] == [(op, expected_path)]

COMMON_CASES = [
    ('delete_interface', ('lo',), 'delete', ['interfaces', 'loopback', 'lo']),
    ('delete_interface_address', ('lo', '192.0.2.1'), 'delete', ['interfaces', 'loopback', 'lo', 'address', '192.0.2.1']),
    ('delete_interface_description', ('lo',), 'delete', ['interfaces', 'loopback', 'lo', 'description']),
    ('delete_ip_source_validation', ('lo',), 'delete', ['interfaces', 'loopback', 'lo', 'ip', 'source-validation']),
    ('delete_mirror_egress', ('lo',), 'delete', ['interfaces', 'loopback', 'lo', 'mirror', 'egress']),
    ('delete_mirror_ingress', ('lo',), 'delete', ['interfaces', 'loopback', 'lo', 'mirror', 'ingress']),
    ('delete_redirect', ('lo',), 'delete', ['interfaces', 'loopback', 'lo', 'redirect']),
    ('set_interface_address', ('lo', '192.0.2.1'), 'set', ['interfaces', 'loopback', 'lo', 'address', '192.0.2.1']),
    ('set_interface_description', ('lo', 'lab'), 'set', ['interfaces', 'loopback', 'lo', 'description', 'lab']),
    ('set_ip_source_validation', ('lo', 'nat'), 'set', ['interfaces', 'loopback', 'lo', 'ip', 'source-validation', 'nat']),
    ('set_mirror_egress', ('lo', '5'), 'set', ['interfaces', 'loopback', 'lo', 'mirror', 'egress', '5']),
    ('set_mirror_ingress', ('lo', '5'), 'set', ['interfaces', 'loopback', 'lo', 'mirror', 'ingress', '5']),
    ('set_redirect', ('lo', '5'), 'set', ['interfaces', 'loopback', 'lo', 'redirect', '5']),
]


@pytest.mark.parametrize("method, args, op, expected_path", COMMON_CASES)
@pytest.mark.parametrize("version", ["1.4", "1.5"])
def test_loopback_common_paths(method, args, op, expected_path, version):
    _run(version, method, args, op, expected_path)
