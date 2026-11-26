"""Golden (method, args, expected_path) cases for BroadcastRelayBatchBuilder."""

import inspect

import pytest

from vyos_builders.broadcast_relay.broadcast_relay_batch_builder import (
    BroadcastRelayBatchBuilder,
)
from vyos_mappers.broadcast_relay import BroadcastRelayMapper


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


def test_every_builder_op_has_a_golden_row():
    ops = {
        name
        for name, _ in inspect.getmembers(BroadcastRelayBatchBuilder, inspect.isfunction)
        if name.startswith(("set_", "delete_", "create_"))
    }
    assert ops == {case[0] for case in CASES}


@pytest.mark.parametrize("version", ["1.4", "1.5", "2026.09.23-0027-rolling"])
def test_builder_reads_the_shared_mapper(version):
    assert type(BroadcastRelayBatchBuilder(version=version).m) is BroadcastRelayMapper


@pytest.mark.parametrize("version", ["1.4", "1.5", "2026.09.23-0027-rolling"])
def test_capabilities_carry_ranges_and_no_version_info(version):
    """Both labs share the tree, so capabilities carry no version_info."""
    caps = BroadcastRelayBatchBuilder(version=version).get_capabilities()
    assert "version_info" not in caps
    features = caps["features"]
    assert (features["instance_id_range"]["min"], features["instance_id_range"]["max"]) == (1, 99)
    assert (features["port"]["min"], features["port"]["max"]) == (1, 65535)