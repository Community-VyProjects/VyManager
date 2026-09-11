"""Golden (method, args, expected_path) cases for DHCPBatchBuilder.

Paths checked with validateTmplPath on 1.4 (100.64.64.50) and 1.5 (100.64.64.5).
Every version-agnostic valueless set_* leaf has a matching delete_*.
host-decl-name, subnet disable, and enable-failover are version-gated
in test_dhcp_version_gates.py.
"""

import pytest

from vyos_builders.dhcp.dhcp import DHCPBatchBuilder

BASE = ["service", "dhcp-server"]
LAN = BASE + ["shared-network-name", "LAN"]
SUB = LAN + ["subnet", "192.168.1.0/24"]
MAP = SUB + ["static-mapping", "host1"]

CASES = [
    ("set_global_disable", (), "set", BASE + ["disable"]),
    ("delete_global_disable", (), "delete", BASE + ["disable"]),
    ("set_listen_address", ("192.0.2.1",), "set", BASE + ["listen-address", "192.0.2.1"]),
    ("delete_listen_address", ("192.0.2.1",), "delete", BASE + ["listen-address", "192.0.2.1"]),
    ("set_hostfile_update", (), "set", BASE + ["hostfile-update"]),
    ("delete_hostfile_update", (), "delete", BASE + ["hostfile-update"]),
    ("set_shared_network", ("LAN",), "set", LAN),
    ("delete_shared_network", ("LAN",), "delete", LAN),
    ("set_shared_network_authoritative", ("LAN",), "set", LAN + ["authoritative"]),
    ("delete_shared_network_authoritative", ("LAN",), "delete", LAN + ["authoritative"]),
    ("set_shared_network_disable", ("LAN",), "set", LAN + ["disable"]),
    ("delete_shared_network_disable", ("LAN",), "delete", LAN + ["disable"]),
    ("set_shared_network_ping_check", ("LAN",), "set", LAN + ["ping-check"]),
    ("delete_shared_network_ping_check", ("LAN",), "delete", LAN + ["ping-check"]),
    ("set_subnet", ("LAN", "192.168.1.0/24"), "set", SUB),
    ("delete_subnet", ("LAN", "192.168.1.0/24"), "delete", SUB),
    ("set_subnet_ping_check", ("LAN", "192.168.1.0/24"), "set", SUB + ["ping-check"]),
    ("delete_subnet_ping_check", ("LAN", "192.168.1.0/24"), "delete", SUB + ["ping-check"]),
    ("set_static_mapping_disable", ("LAN", "192.168.1.0/24", "host1"), "set", MAP + ["disable"]),
    ("delete_static_mapping_disable", ("LAN", "192.168.1.0/24", "host1"), "delete", MAP + ["disable"]),
]


@pytest.mark.parametrize("method, args, op, expected_path", CASES)
@pytest.mark.parametrize("version", ["1.4", "1.5"])
def test_dhcp_builder_paths(method, args, op, expected_path, version):
    builder = DHCPBatchBuilder(version=version)
    getattr(builder, method)(*args)
    operations = builder.get_operations()
    assert [(item["op"], item["path"]) for item in operations] == [(op, expected_path)]
