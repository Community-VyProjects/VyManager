"""Golden (method, args, expected_path) cases for DHCPBatchBuilder.

Paths checked with validateTmplPath on 1.4 (100.64.64.50) and 1.5 (100.64.64.5).
host-decl-name is 1.4-only and is covered in test_dhcp_version_gates.py.
"""

import pytest

from vyos_builders.dhcp.dhcp import DHCPBatchBuilder

BASE = ["service", "dhcp-server"]
LAN = BASE + ["shared-network-name", "LAN"]

CASES = [
    ("set_global_disable", (), "set", BASE + ["disable"]),
    ("delete_global_disable", (), "delete", BASE + ["disable"]),
    ("set_listen_address", ("192.0.2.1",), "set", BASE + ["listen-address", "192.0.2.1"]),
    ("delete_listen_address", ("192.0.2.1",), "delete", BASE + ["listen-address", "192.0.2.1"]),
    ("set_hostfile_update", (), "set", BASE + ["hostfile-update"]),
    ("delete_hostfile_update", (), "delete", BASE + ["hostfile-update"]),
    ("set_shared_network", ("LAN",), "set", LAN),
    ("delete_shared_network", ("LAN",), "delete", LAN),
]


@pytest.mark.parametrize("method, args, op, expected_path", CASES)
@pytest.mark.parametrize("version", ["1.4", "1.5"])
def test_dhcp_builder_paths(method, args, op, expected_path, version):
    builder = DHCPBatchBuilder(version=version)
    getattr(builder, method)(*args)
    operations = builder.get_operations()
    assert [(item["op"], item["path"]) for item in operations] == [(op, expected_path)]
