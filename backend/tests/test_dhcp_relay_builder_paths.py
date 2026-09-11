"""Golden (method, args, expected_path) cases for DHCPRelayBatchBuilder.

Paths checked with validateTmplPath on 1.4 (100.64.64.50) and 1.5 (100.64.64.5).
"""

import pytest

from vyos_builders.dhcp_relay.dhcp_relay_batch_builder import DHCPRelayBatchBuilder

BASE = ["service", "dhcp-relay"]

CASES = [
    ("set_disable", (), "set", BASE + ["disable"]),
    ("delete_disable", (), "delete", BASE + ["disable"]),
    ("delete_dhcp_relay", (), "delete", BASE),
    ("set_interface", ("eth0",), "set", BASE + ["interface", "eth0"]),
    ("delete_interface", ("eth0",), "delete", BASE + ["interface", "eth0"]),
    ("delete_interfaces", (), "delete", BASE + ["interface"]),
    ("set_listen_interface", ("eth0",), "set", BASE + ["listen-interface", "eth0"]),
    ("delete_listen_interface", ("eth0",), "delete", BASE + ["listen-interface", "eth0"]),
    ("delete_listen_interfaces", (), "delete", BASE + ["listen-interface"]),
    ("set_upstream_interface", ("eth0",), "set", BASE + ["upstream-interface", "eth0"]),
    ("delete_upstream_interface", ("eth0",), "delete", BASE + ["upstream-interface", "eth0"]),
    ("delete_upstream_interfaces", (), "delete", BASE + ["upstream-interface"]),
    ("set_server", ("192.0.2.1",), "set", BASE + ["server", "192.0.2.1"]),
    ("delete_server", ("192.0.2.1",), "delete", BASE + ["server", "192.0.2.1"]),
    ("delete_servers", (), "delete", BASE + ["server"]),
    ("set_hop_count", ("10",), "set", BASE + ["relay-options", "hop-count", "10"]),
    ("delete_hop_count", (), "delete", BASE + ["relay-options", "hop-count"]),
    ("set_max_size", ("576",), "set", BASE + ["relay-options", "max-size", "576"]),
    ("delete_max_size", (), "delete", BASE + ["relay-options", "max-size"]),
    ("set_relay_agents_packets", ("forward",), "set", BASE + ["relay-options", "relay-agents-packets", "forward"]),
    ("delete_relay_agents_packets", (), "delete", BASE + ["relay-options", "relay-agents-packets"]),
]


@pytest.mark.parametrize("method, args, op, expected_path", CASES)
@pytest.mark.parametrize("version", ["1.4", "1.5"])
def test_dhcp_relay_builder_paths(method, args, op, expected_path, version):
    builder = DHCPRelayBatchBuilder(version=version)
    getattr(builder, method)(*args)
    operations = builder.get_operations()
    assert [(item["op"], item["path"]) for item in operations] == [(op, expected_path)]
