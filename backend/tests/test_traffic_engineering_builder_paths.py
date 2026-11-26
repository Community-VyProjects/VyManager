"""Golden paths and version gates for Traffic Engineering."""

import inspect
import re
from pathlib import Path

import pytest

from vyos_builders.traffic_engineering import TrafficEngineeringBatchBuilder
from vyos_mappers import CommandMapperRegistry
from vyos_mappers.traffic_engineering import TrafficEngineeringMapper, traffic_engineering_versions
from vyos_mappers.traffic_engineering.traffic_engineering import TRAFFIC_ENGINEERING_NODE
from vyos_mappers.traffic_engineering.traffic_engineering_versions import (
    TrafficEngineeringMapperV1_5,
)


BASE = ["protocols", "traffic-engineering"]
IFACE = BASE + ["interface", "eth0"]

CASES = [
    ("delete_traffic_engineering", (), "delete", BASE),
    ("set_admin_group", ("gold",), "set", BASE + ["admin-group", "gold"]),
    ("delete_admin_group", ("gold",), "delete", BASE + ["admin-group", "gold"]),
    (
        "set_admin_group_bit_position",
        ("gold", "31"),
        "set",
        BASE + ["admin-group", "gold", "bit-position", "31"],
    ),
    (
        "delete_admin_group_bit_position",
        ("gold",),
        "delete",
        BASE + ["admin-group", "gold", "bit-position"],
    ),
    ("set_interface", ("eth0",), "set", IFACE),
    ("delete_interface", ("eth0.10",), "delete", BASE + ["interface", "eth0.10"]),
    ("set_interface_admin_group", ("eth0", "gold"), "set", IFACE + ["admin-group", "gold"]),
    (
        "delete_interface_admin_group",
        ("eth0", "silver-1"),
        "delete",
        IFACE + ["admin-group", "silver-1"],
    ),
    ("set_interface_max_bandwidth", ("eth0", "1000"), "set", IFACE + ["max-bandwidth", "1000"]),
    ("delete_interface_max_bandwidth", ("eth0",), "delete", IFACE + ["max-bandwidth"]),
    (
        "set_interface_max_reservable_bandwidth",
        ("eth0", "4294967295"),
        "set",
        IFACE + ["max-reservable-bandwidth", "4294967295"],
    ),
    (
        "delete_interface_max_reservable_bandwidth",
        ("eth0",),
        "delete",
        IFACE + ["max-reservable-bandwidth"],
    ),
    ("set_interface_metric", ("lo", "1"), "set", BASE + ["interface", "lo", "metric", "1"]),
    ("delete_interface_metric", ("eth0",), "delete", IFACE + ["metric"]),
]


@pytest.mark.parametrize("version", ["1.5", "2026.09.23-0027-rolling"])
@pytest.mark.parametrize("method, args, op, path", CASES, ids=[case[0] for case in CASES])
def test_1_5_paths(version, method, args, op, path):
    builder = TrafficEngineeringBatchBuilder(version=version)
    getattr(builder, method)(*args)
    assert builder.get_operations() == [{"op": op, "path": path}]


@pytest.mark.parametrize("version", ["1.4", "1.4.3"])
@pytest.mark.parametrize("method, args, op, path", CASES, ids=[case[0] for case in CASES])
def test_1_4_rejects_every_op(version, method, args, op, path):
    builder = TrafficEngineeringBatchBuilder(version=version)
    with pytest.raises(ValueError, match="^Traffic Engineering is not supported on this device$"):
        getattr(builder, method)(*args)
    assert builder.get_operations() == []


@pytest.mark.parametrize(
    "method, args, detail",
    [
        ("set_admin_group", ("a_b",), "Admin group names must be letters, digits, and hyphens"),
        ("set_admin_group", ("",), "Admin group names must be letters, digits, and hyphens"),
        ("set_admin_group", ("gold\n",), "Admin group names must be letters, digits, and hyphens"),
        ("set_admin_group_bit_position", ("gold", "32"), "Bit position must be 0-31"),
        ("set_admin_group_bit_position", ("gold", "+1"), "Bit position must be 0-31"),
        ("set_admin_group_bit_position", ("gold", "١"), "Bit position must be 0-31"),
        ("set_admin_group_bit_position", ("gold", ""), "Bit position must be 0-31"),
        ("set_interface", ("eth",), "Invalid interface name"),
        ("set_interface", ("eth0 ",), "Invalid interface name"),
        ("set_interface_admin_group", ("eth0", "a,b"), "Admin group names must be letters, digits, and hyphens"),
        ("set_interface_max_bandwidth", ("eth0", "0"), "Max bandwidth must be 1-4294967295"),
        ("set_interface_max_bandwidth", ("eth0", "4294967296"), "Max bandwidth must be 1-4294967295"),
        (
            "set_interface_max_reservable_bandwidth",
            ("eth0", "1.5"),
            "Max reservable bandwidth must be 1-4294967295",
        ),
        ("set_interface_metric", ("eth0", "-1"), "Metric must be 1-4294967295"),
    ],
)
def test_rejects_values_the_device_rejects(method, args, detail):
    builder = TrafficEngineeringBatchBuilder(version="1.5")
    with pytest.raises(ValueError, match=f"^{re.escape(detail)}$"):
        getattr(builder, method)(*args)
    assert builder.get_operations() == []


@pytest.mark.parametrize(
    "method, args",
    [
        # The lab numeric validator takes leading zeros; the interface regex
        # has an unescaped dot before the VLAN id.
        ("set_admin_group_bit_position", ("gold", "07")),
        ("set_interface_metric", ("eth0", "0001")),
        ("set_interface", ("pod-web_1",)),
        ("set_interface", ("eth0x10",)),
        ("set_admin_group", ("Gold-1",)),
    ],
)
def test_accepts_what_the_device_accepts(method, args):
    builder = TrafficEngineeringBatchBuilder(version="1.5")
    getattr(builder, method)(*args)
    assert len(builder.get_operations()) == 1


@pytest.mark.parametrize(
    "version, cls",
    [
        ("1.4", TrafficEngineeringMapper),
        ("1.4.3", TrafficEngineeringMapper),
        ("1.5", TrafficEngineeringMapperV1_5),
        ("2026.09.23-0027-rolling", TrafficEngineeringMapperV1_5),
    ],
)
def test_factory_returns_the_class_for_the_device(version, cls):
    mapper = CommandMapperRegistry.get_mapper("traffic_engineering", version)
    assert type(mapper) is cls


def test_shared_class_has_no_traffic_engineering_paths():
    shared = TrafficEngineeringMapper("1.4")
    assert shared.versioned_nodes() == frozenset()
    for methods in TrafficEngineeringMapper._VERSIONED_NODES.values():
        for method in methods:
            assert not hasattr(shared, method), method
            assert callable(getattr(TrafficEngineeringMapperV1_5, method)), method
    assert TrafficEngineeringMapperV1_5("1.5").versioned_nodes() == frozenset(
        {TRAFFIC_ENGINEERING_NODE}
    )


def test_no_empty_1_4_version_file():
    package = Path(traffic_engineering_versions.__file__).parent
    assert not (package / "v1_4.py").exists()


def test_mapper_keeps_no_init_override():
    assert "__init__" not in vars(TrafficEngineeringMapper)
    assert "__init__" not in vars(TrafficEngineeringMapperV1_5)


@pytest.mark.parametrize("version, supported", [("1.4.3", False), ("2026.09.23-0027-rolling", True)])
def test_capabilities_follow_the_mapper(version, supported):
    caps = TrafficEngineeringBatchBuilder(version=version).get_capabilities()
    assert "version_info" not in caps
    assert {name: flag["supported"] for name, flag in caps["features"].items()} == {
        "traffic_engineering": supported,
        "admin_groups": supported,
        "interface_params": supported,
    }
    if supported:
        assert caps["ranges"] == {
            "bit_position": {"min": 0, "max": 31},
            "max_bandwidth": {"min": 1, "max": 4294967295},
            "max_reservable_bandwidth": {"min": 1, "max": 4294967295},
            "metric": {"min": 1, "max": 4294967295},
        }
    else:
        assert caps["ranges"] == {}


def test_capabilities_and_ops_follow_the_mapper_not_the_version(monkeypatch):
    # A 1.5 mapper missing one path method under the node no longer reports it.
    monkeypatch.delattr(TrafficEngineeringMapperV1_5, "get_interface_metric_delete")
    builder = TrafficEngineeringBatchBuilder(version="1.5")
    caps = builder.get_capabilities()
    assert caps["features"]["traffic_engineering"]["supported"] is False
    with pytest.raises(ValueError, match="not supported"):
        builder.set_admin_group("gold")
    assert builder.get_operations() == []


def test_capabilities_on_1_4_follow_a_mapper_with_the_paths(monkeypatch):
    monkeypatch.setattr(
        "vyos_mappers.traffic_engineering.traffic_engineering_versions.TrafficEngineeringMapper",
        TrafficEngineeringMapperV1_5,
    )
    builder = TrafficEngineeringBatchBuilder(version="1.4")
    assert builder.get_capabilities()["features"]["traffic_engineering"]["supported"] is True
    builder.set_admin_group("gold")
    assert builder.get_operations()[0]["path"] == BASE + ["admin-group", "gold"]


def test_every_builder_op_has_a_golden_row():
    ops = {
        name
        for name, _ in inspect.getmembers(TrafficEngineeringBatchBuilder, inspect.isfunction)
        if name.startswith(("set_", "delete_", "create_"))
    }
    assert ops == {case[0] for case in CASES}
