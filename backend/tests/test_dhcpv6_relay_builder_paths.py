"""Golden (method, args, expected_path) cases for DHCPv6RelayBatchBuilder.

Paths checked with validateTmplPath on 1.4 (100.64.64.50) and 1.5 (100.64.64.5).
Every valueless set_* leaf has a matching delete_*.
"""

import pytest

from vyos_builders.dhcpv6_relay.dhcpv6_relay_batch_builder import (
    DHCPv6RelayBatchBuilder,
)

BASE = ["service", "dhcpv6-relay"]
LISTEN = BASE + ["listen-interface", "eth0"]
UPSTREAM = BASE + ["upstream-interface", "eth1"]

CASES = [
    ("set_disable", (), "set", BASE + ["disable"]),
    ("delete_disable", (), "delete", BASE + ["disable"]),
    ("delete_dhcpv6_relay", (), "delete", BASE),
    ("set_use_interface_id_option", (), "set", BASE + ["use-interface-id-option"]),
    ("delete_use_interface_id_option", (), "delete", BASE + ["use-interface-id-option"]),
    ("set_max_hop_count", ("10",), "set", BASE + ["max-hop-count", "10"]),
    ("delete_max_hop_count", (), "delete", BASE + ["max-hop-count"]),
    ("set_listen_interface", ("eth0",), "set", LISTEN),
    ("delete_listen_interface", ("eth0",), "delete", LISTEN),
    ("delete_listen_interfaces", (), "delete", BASE + ["listen-interface"]),
    ("set_listen_interface_address", ("eth0", "2001:db8::1"), "set", LISTEN + ["address", "2001:db8::1"]),
    ("delete_listen_interface_address", ("eth0",), "delete", LISTEN + ["address"]),
    ("set_upstream_interface", ("eth1",), "set", UPSTREAM),
    ("delete_upstream_interface", ("eth1",), "delete", UPSTREAM),
    ("delete_upstream_interfaces", (), "delete", BASE + ["upstream-interface"]),
    ("set_upstream_interface_address", ("eth1", "2001:db8::2"), "set", UPSTREAM + ["address", "2001:db8::2"]),
    ("delete_upstream_interface_address", ("eth1", "2001:db8::2"), "delete", UPSTREAM + ["address", "2001:db8::2"]),
    ("delete_upstream_interface_addresses", ("eth1",), "delete", UPSTREAM + ["address"]),
]


@pytest.mark.parametrize("method, args, op, expected_path", CASES)
@pytest.mark.parametrize("version", ["1.4", "1.5"])
def test_dhcpv6_relay_builder_paths(method, args, op, expected_path, version):
    builder = DHCPv6RelayBatchBuilder(version=version)
    getattr(builder, method)(*args)
    operations = builder.get_operations()
    assert [(item["op"], item["path"]) for item in operations] == [(op, expected_path)]
