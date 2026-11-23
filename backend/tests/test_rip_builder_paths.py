"""RIP builder ops, mapper paths, and version wiring.

Paths follow ``protocols rip`` on the labs (VyOS 1.4 100.64.64.4, 1.5
100.64.64.5). The two trees match except ``redistribute nhrp``, which only
1.5 has, so that source is on the 1.5 subclass allowlist and the factory
returns the shared class on 1.4.
"""

import inspect
from pathlib import Path

import pytest

from vyos_builders.rip.rip_batch_builder import RipBatchBuilder
from vyos_mappers.rip.rip import RipMapper
from vyos_mappers.rip.rip_versions import get_rip_mapper
from vyos_mappers.rip.rip_versions.v1_5 import RipMapperV1_5

BASE = ["protocols", "rip"]
IF = BASE + ["interface", "eth0"]
VERSIONS_DIR = Path(__file__).resolve().parents[1] / "vyos_mappers" / "rip" / "rip_versions"

# (method, args, op, path) — leaves both labs have.
COMMON_CASES = [
    ("set_default_distance", ("100",), "set", BASE + ["default-distance", "100"]),
    ("delete_default_distance", (), "delete", BASE + ["default-distance"]),
    ("set_default_information_originate", (), "set", BASE + ["default-information", "originate"]),
    ("delete_default_information_originate", (), "delete", BASE + ["default-information", "originate"]),
    ("set_default_metric", ("3",), "set", BASE + ["default-metric", "3"]),
    ("delete_default_metric", (), "delete", BASE + ["default-metric"]),
    ("set_route_map", ("RM",), "set", BASE + ["route-map", "RM"]),
    ("delete_route_map", (), "delete", BASE + ["route-map"]),
    ("set_version", ("2",), "set", BASE + ["version", "2"]),
    ("delete_version", (), "delete", BASE + ["version"]),
    ("set_network", ("10.0.0.0/8",), "set", BASE + ["network", "10.0.0.0/8"]),
    ("delete_network", ("10.0.0.0/8",), "delete", BASE + ["network", "10.0.0.0/8"]),
    ("set_neighbor", ("192.0.2.1",), "set", BASE + ["neighbor", "192.0.2.1"]),
    ("delete_neighbor", ("192.0.2.1",), "delete", BASE + ["neighbor", "192.0.2.1"]),
    ("set_route", ("10.1.0.0/16",), "set", BASE + ["route", "10.1.0.0/16"]),
    ("delete_route", ("10.1.0.0/16",), "delete", BASE + ["route", "10.1.0.0/16"]),
    ("set_passive_interface", ("default",), "set", BASE + ["passive-interface", "default"]),
    ("delete_passive_interface", ("eth1",), "delete", BASE + ["passive-interface", "eth1"]),
    ("set_distribute_list_access_list_in", ("10",), "set", BASE + ["distribute-list", "access-list", "in", "10"]),
    ("delete_distribute_list_access_list_in", (), "delete", BASE + ["distribute-list", "access-list", "in"]),
    ("set_distribute_list_access_list_out", ("20",), "set", BASE + ["distribute-list", "access-list", "out", "20"]),
    ("delete_distribute_list_access_list_out", (), "delete", BASE + ["distribute-list", "access-list", "out"]),
    ("set_distribute_list_prefix_list_in", ("PL",), "set", BASE + ["distribute-list", "prefix-list", "in", "PL"]),
    ("delete_distribute_list_prefix_list_in", (), "delete", BASE + ["distribute-list", "prefix-list", "in"]),
    ("set_distribute_list_prefix_list_out", ("PL",), "set", BASE + ["distribute-list", "prefix-list", "out", "PL"]),
    ("delete_distribute_list_prefix_list_out", (), "delete", BASE + ["distribute-list", "prefix-list", "out"]),
    ("set_distribute_list_interface_access_list_in", ("eth0", "10"), "set",
     BASE + ["distribute-list", "interface", "eth0", "access-list", "in", "10"]),
    ("delete_distribute_list_interface_access_list_in", ("eth0",), "delete",
     BASE + ["distribute-list", "interface", "eth0", "access-list", "in"]),
    ("set_distribute_list_interface_access_list_out", ("eth0", "20"), "set",
     BASE + ["distribute-list", "interface", "eth0", "access-list", "out", "20"]),
    ("delete_distribute_list_interface_access_list_out", ("eth0",), "delete",
     BASE + ["distribute-list", "interface", "eth0", "access-list", "out"]),
    ("set_distribute_list_interface_prefix_list_in", ("eth0", "PL"), "set",
     BASE + ["distribute-list", "interface", "eth0", "prefix-list", "in", "PL"]),
    ("delete_distribute_list_interface_prefix_list_in", ("eth0",), "delete",
     BASE + ["distribute-list", "interface", "eth0", "prefix-list", "in"]),
    ("set_distribute_list_interface_prefix_list_out", ("eth0", "PL"), "set",
     BASE + ["distribute-list", "interface", "eth0", "prefix-list", "out", "PL"]),
    ("delete_distribute_list_interface_prefix_list_out", ("eth0",), "delete",
     BASE + ["distribute-list", "interface", "eth0", "prefix-list", "out"]),
    ("delete_distribute_list_interface", ("eth0",), "delete", BASE + ["distribute-list", "interface", "eth0"]),
    ("set_interface", ("eth0",), "set", IF),
    ("delete_interface", ("eth0",), "delete", IF),
    ("set_interface_authentication_md5_key", ("eth0", "1", "K,1"), "set",
     IF + ["authentication", "md5", "1", "password", "K,1"]),
    ("delete_interface_authentication_md5", ("eth0", "1"), "delete", IF + ["authentication", "md5", "1"]),
    ("set_interface_authentication_plaintext", ("eth0", "P1"), "set",
     IF + ["authentication", "plaintext-password", "P1"]),
    ("delete_interface_authentication_plaintext", ("eth0",), "delete",
     IF + ["authentication", "plaintext-password"]),
    ("delete_interface_authentication", ("eth0",), "delete", IF + ["authentication"]),
    ("set_interface_receive_version", ("eth0", "2"), "set", IF + ["receive", "version", "2"]),
    ("delete_interface_receive_version", ("eth0",), "delete", IF + ["receive", "version"]),
    ("set_interface_send_version", ("eth0", "1"), "set", IF + ["send", "version", "1"]),
    ("delete_interface_send_version", ("eth0",), "delete", IF + ["send", "version"]),
    ("set_interface_split_horizon_disable", ("eth0",), "set", IF + ["split-horizon", "disable"]),
    ("set_interface_split_horizon_poison_reverse", ("eth0",), "set", IF + ["split-horizon", "poison-reverse"]),
    ("delete_interface_split_horizon", ("eth0",), "delete", IF + ["split-horizon"]),
    ("set_network_distance", ("10.2.0.0/16",), "set", BASE + ["network-distance", "10.2.0.0/16"]),
    ("set_network_distance_value", ("10.2.0.0/16", "50"), "set",
     BASE + ["network-distance", "10.2.0.0/16", "distance", "50"]),
    ("set_network_distance_access_list", ("10.2.0.0/16", "10"), "set",
     BASE + ["network-distance", "10.2.0.0/16", "access-list", "10"]),
    ("delete_network_distance_access_list", ("10.2.0.0/16",), "delete",
     BASE + ["network-distance", "10.2.0.0/16", "access-list"]),
    ("delete_network_distance", ("10.2.0.0/16",), "delete", BASE + ["network-distance", "10.2.0.0/16"]),
    ("set_redistribute", ("connected",), "set", BASE + ["redistribute", "connected"]),
    ("set_redistribute_metric", ("ospf", "3"), "set", BASE + ["redistribute", "ospf", "metric", "3"]),
    ("delete_redistribute_metric", ("ospf",), "delete", BASE + ["redistribute", "ospf", "metric"]),
    ("set_redistribute_route_map", ("bgp", "RM"), "set", BASE + ["redistribute", "bgp", "route-map", "RM"]),
    ("delete_redistribute_route_map", ("bgp",), "delete", BASE + ["redistribute", "bgp", "route-map"]),
    ("delete_redistribute", ("static",), "delete", BASE + ["redistribute", "static"]),
    ("set_timers_update", ("30",), "set", BASE + ["timers", "update", "30"]),
    ("delete_timers_update", (), "delete", BASE + ["timers", "update"]),
    ("set_timers_timeout", ("180",), "set", BASE + ["timers", "timeout", "180"]),
    ("delete_timers_timeout", (), "delete", BASE + ["timers", "timeout"]),
    ("set_timers_garbage_collection", ("120",), "set", BASE + ["timers", "garbage-collection", "120"]),
    ("delete_timers_garbage_collection", (), "delete", BASE + ["timers", "garbage-collection"]),
    ("delete_timers", (), "delete", BASE + ["timers"]),
    ("delete_rip", (), "delete", BASE),
]

# ``redistribute nhrp`` exists only on the 1.5 lab.
V15_ONLY_CASES = [
    ("set_redistribute", ("nhrp",), "set", BASE + ["redistribute", "nhrp"]),
    ("set_redistribute_metric", ("nhrp", "5"), "set", BASE + ["redistribute", "nhrp", "metric", "5"]),
    ("delete_redistribute_metric", ("nhrp",), "delete", BASE + ["redistribute", "nhrp", "metric"]),
    ("set_redistribute_route_map", ("nhrp", "RM"), "set", BASE + ["redistribute", "nhrp", "route-map", "RM"]),
    ("delete_redistribute_route_map", ("nhrp",), "delete", BASE + ["redistribute", "nhrp", "route-map"]),
    ("delete_redistribute", ("nhrp",), "delete", BASE + ["redistribute", "nhrp"]),
]

LAB_REDISTRIBUTE_1_4 = ["babel", "bgp", "connected", "isis", "kernel", "ospf", "static"]


def _ops(version, method, args):
    builder = RipBatchBuilder(version)
    getattr(builder, method)(*args)
    return builder.get_operations()


@pytest.mark.parametrize("version", ["1.4", "1.5", "2026.09.23-0027-rolling"])
@pytest.mark.parametrize(
    "method, args, op, path", COMMON_CASES, ids=[f"{row[0]}:{','.join(row[1])}" for row in COMMON_CASES]
)
def test_common_paths(version, method, args, op, path):
    assert _ops(version, method, args) == [{"op": op, "path": path}]


@pytest.mark.parametrize(
    "method, args, op, path", V15_ONLY_CASES, ids=[f"{row[0]}:{','.join(row[1])}" for row in V15_ONLY_CASES]
)
def test_v1_5_only_paths(method, args, op, path):
    assert _ops("1.5", method, args) == [{"op": op, "path": path}]


@pytest.mark.parametrize(
    "method, args", [(row[0], row[1]) for row in V15_ONLY_CASES], ids=[row[0] for row in V15_ONLY_CASES]
)
def test_v1_5_only_paths_raise_on_1_4(method, args):
    with pytest.raises(ValueError, match="redistribute nhrp is not supported on this device"):
        _ops("1.4.3", method, args)


def test_every_builder_op_has_a_golden_row():
    ops = {
        name
        for name, _ in inspect.getmembers(RipBatchBuilder, inspect.isfunction)
        if name.startswith(("set_", "delete_", "create_"))
    }
    covered = {row[0] for row in COMMON_CASES + V15_ONLY_CASES}
    assert ops - covered == set()
    assert covered - ops == set()


def test_every_builder_op_takes_at_most_three_values():
    """The batch router comma-splits a value onto the builder parameters."""
    for name, func in inspect.getmembers(RipBatchBuilder, inspect.isfunction):
        if name.startswith(("set_", "delete_")):
            assert len(inspect.signature(func).parameters) - 1 <= 3, name


def test_factory_returns_shared_on_1_4_and_subclass_otherwise():
    assert type(get_rip_mapper("1.4")) is RipMapper
    assert type(get_rip_mapper("1.4.3")) is RipMapper
    assert type(get_rip_mapper("1.5")) is RipMapperV1_5
    assert type(get_rip_mapper("2026.09.23-0027-rolling")) is RipMapperV1_5
    assert type(get_rip_mapper("latest")) is RipMapperV1_5


def test_versions_package_is_a_subclass_factory():
    names = sorted(p.name for p in VERSIONS_DIR.glob("*.py"))
    assert names == ["__init__.py", "v1_5.py"]
    factory = (VERSIONS_DIR / "__init__.py").read_text()
    assert "__getattr__" not in factory
    assert "MergedMapper" not in factory


def test_mapper_classes_have_no_init_override():
    assert "__init__" not in RipMapper.__dict__
    assert "__init__" not in RipMapperV1_5.__dict__


def test_redistribute_allowlist_matches_the_labs():
    assert sorted(RipMapper("1.5").redistribute_protocols()) == LAB_REDISTRIBUTE_1_4
    assert sorted(RipMapperV1_5("1.4").redistribute_protocols()) == sorted(LAB_REDISTRIBUTE_1_4 + ["nhrp"])


@pytest.mark.parametrize("version, expected", [
    ("1.4.3", LAB_REDISTRIBUTE_1_4),
    ("1.5", sorted(LAB_REDISTRIBUTE_1_4 + ["nhrp"])),
])
def test_capabilities_read_the_mapper_allowlist(version, expected):
    caps = RipBatchBuilder(version).get_capabilities()
    assert caps["features"]["redistribute"]["protocols"] == expected
    assert "version_info" not in caps


def test_capabilities_follow_the_mapper_not_the_version(monkeypatch):
    monkeypatch.setattr(RipMapper, "redistribute_protocols", lambda self: frozenset({"bgp", "nhrp"}))
    caps = RipBatchBuilder("1.4").get_capabilities()
    assert caps["features"]["redistribute"]["protocols"] == ["bgp", "nhrp"]


def test_unknown_redistribute_source_is_rejected_on_both_versions():
    for version in ("1.4", "1.5"):
        with pytest.raises(ValueError, match="redistribute rip is not supported on this device"):
            _ops(version, "set_redistribute", ("rip",))
