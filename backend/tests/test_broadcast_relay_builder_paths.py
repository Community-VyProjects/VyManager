"""Golden (method, args, expected_path) cases for BroadcastRelayBatchBuilder."""

import pytest

from vyos_builders.broadcast_relay.broadcast_relay_batch_builder import (
    BroadcastRelayBatchBuilder,
)


RELAY_ID = "10"
BASE = ["service", "broadcast-relay"]
INSTANCE = BASE + ["id", RELAY_ID]

CASES = [
    ("set_global_disable", (), "set", BASE + ["disable"]),
    ("delete_global_disable", (), "delete", BASE + ["disable"]),
    ("delete_broadcast_relay", (), "delete", BASE),
    ("set_instance", (RELAY_ID,), "set", INSTANCE),
    ("delete_instance", (RELAY_ID,), "delete", INSTANCE),
    ("set_instance_address", (RELAY_ID, "192.0.2.1"), "set", INSTANCE + ["address", "192.0.2.1"]),
    ("delete_instance_address", (RELAY_ID,), "delete", INSTANCE + ["address"]),
    ("set_instance_description", (RELAY_ID, "lab relay"), "set", INSTANCE + ["description", "lab relay"]),
    ("delete_instance_description", (RELAY_ID,), "delete", INSTANCE + ["description"]),
    ("set_instance_disable", (RELAY_ID,), "set", INSTANCE + ["disable"]),
    ("delete_instance_disable", (RELAY_ID,), "delete", INSTANCE + ["disable"]),
    ("set_instance_interface", (RELAY_ID, "eth0"), "set", INSTANCE + ["interface", "eth0"]),
    ("delete_instance_interface", (RELAY_ID, "eth0"), "delete", INSTANCE + ["interface", "eth0"]),
    ("delete_instance_interfaces", (RELAY_ID,), "delete", INSTANCE + ["interface"]),
    ("set_instance_port", (RELAY_ID, "5000"), "set", INSTANCE + ["port", "5000"]),
    ("delete_instance_port", (RELAY_ID,), "delete", INSTANCE + ["port"]),
]


@pytest.mark.parametrize("method, args, op, expected_path", CASES)
@pytest.mark.parametrize("version", ["1.4", "1.5"])
def test_broadcast_relay_builder_paths(method, args, op, expected_path, version):
    builder = BroadcastRelayBatchBuilder(version=version)
    getattr(builder, method)(*args)
    operations = builder.get_operations()
    assert [(item["op"], item["path"]) for item in operations] == [(op, expected_path)]