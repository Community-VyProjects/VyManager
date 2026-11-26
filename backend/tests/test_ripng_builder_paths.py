"""Golden paths for every RIPng builder op.

Each path matches a protocols ripng node.def on the 1.4 and 1.5 labs (the
tree is identical on both).
"""

import inspect

import pytest

from vyos_builders.ripng.ripng_batch_builder import RANGES, RipNgBatchBuilder
from vyos_mappers import CommandMapperRegistry
from vyos_mappers.ripng import RipNgMapper

BASE = ["protocols", "ripng"]
P = "2001:db8::/32"
DL = ["distribute-list"]
DLI = DL + ["interface", "eth0"]
I = ["interface", "eth0"]

# method, args, op, path after protocols ripng
CASES = [
    # global settings
    ("set_default_information_originate", (), "set", ["default-information", "originate"]),
    ("delete_default_information_originate", (), "delete", ["default-information", "originate"]),
    ("set_default_metric", ("16",), "set", ["default-metric", "16"]),
    ("delete_default_metric", (), "delete", ["default-metric"]),
    ("set_route_map", ("RM-1.a+b",), "set", ["route-map", "RM-1.a+b"]),
    ("delete_route_map", (), "delete", ["route-map"]),
    # multi lists
    ("set_aggregate_address", (P,), "set", ["aggregate-address", P]),
    ("delete_aggregate_address", (P,), "delete", ["aggregate-address", P]),
    ("set_network", (P,), "set", ["network", P]),
    ("delete_network", (P,), "delete", ["network", P]),
    ("set_route", (P,), "set", ["route", P]),
    ("delete_route", (P,), "delete", ["route", P]),
    ("set_passive_interface", ("eth1",), "set", ["passive-interface", "eth1"]),
    ("delete_passive_interface", ("eth1",), "delete", ["passive-interface", "eth1"]),
    # distribute-list, global
    ("set_distribute_list_access_list_in", ("ACL6",), "set", DL + ["access-list", "in", "ACL6"]),
    ("delete_distribute_list_access_list_in", (), "delete", DL + ["access-list", "in"]),
    ("set_distribute_list_access_list_out", ("ACL6",), "set", DL + ["access-list", "out", "ACL6"]),
    ("delete_distribute_list_access_list_out", (), "delete", DL + ["access-list", "out"]),
    ("set_distribute_list_prefix_list_in", ("PL6",), "set", DL + ["prefix-list", "in", "PL6"]),
    ("delete_distribute_list_prefix_list_in", (), "delete", DL + ["prefix-list", "in"]),
    ("set_distribute_list_prefix_list_out", ("PL6",), "set", DL + ["prefix-list", "out", "PL6"]),
    ("delete_distribute_list_prefix_list_out", (), "delete", DL + ["prefix-list", "out"]),
    # distribute-list, per interface
    ("set_distribute_list_interface_access_list_in", ("eth0", "ACL6"), "set", DLI + ["access-list", "in", "ACL6"]),
    ("delete_distribute_list_interface_access_list_in", ("eth0",), "delete", DLI + ["access-list", "in"]),
    ("set_distribute_list_interface_access_list_out", ("eth0", "ACL6"), "set", DLI + ["access-list", "out", "ACL6"]),
    ("delete_distribute_list_interface_access_list_out", ("eth0",), "delete", DLI + ["access-list", "out"]),
    ("set_distribute_list_interface_prefix_list_in", ("eth0", "PL6"), "set", DLI + ["prefix-list", "in", "PL6"]),
    ("delete_distribute_list_interface_prefix_list_in", ("eth0",), "delete", DLI + ["prefix-list", "in"]),
    ("set_distribute_list_interface_prefix_list_out", ("eth0", "PL6"), "set", DLI + ["prefix-list", "out", "PL6"]),
    ("delete_distribute_list_interface_prefix_list_out", ("eth0",), "delete", DLI + ["prefix-list", "out"]),
    ("delete_distribute_list_interface", ("eth0",), "delete", DLI),
    # interfaces
    ("set_interface", ("eth0",), "set", I),
    ("delete_interface", ("eth0",), "delete", I),
    ("set_interface_split_horizon_disable", ("eth0",), "set", I + ["split-horizon", "disable"]),
    ("set_interface_split_horizon_poison_reverse", ("eth0",), "set", I + ["split-horizon", "poison-reverse"]),
    ("delete_interface_split_horizon", ("eth0",), "delete", I + ["split-horizon"]),
    # redistribute
    ("set_redistribute", ("connected",), "set", ["redistribute", "connected"]),
    ("delete_redistribute", ("connected",), "delete", ["redistribute", "connected"]),
    ("set_redistribute_metric", ("ospfv3", "1"), "set", ["redistribute", "ospfv3", "metric", "1"]),
    ("delete_redistribute_metric", ("ospfv3",), "delete", ["redistribute", "ospfv3", "metric"]),
    ("set_redistribute_route_map", ("babel", "RM"), "set", ["redistribute", "babel", "route-map", "RM"]),
    ("delete_redistribute_route_map", ("babel",), "delete", ["redistribute", "babel", "route-map"]),
    # timers
    ("set_timers_update", ("5",), "set", ["timers", "update", "5"]),
    ("delete_timers_update", (), "delete", ["timers", "update"]),
    ("set_timers_timeout", ("2147483647",), "set", ["timers", "timeout", "2147483647"]),
    ("delete_timers_timeout", (), "delete", ["timers", "timeout"]),
    ("set_timers_garbage_collection", ("120",), "set", ["timers", "garbage-collection", "120"]),
    ("delete_timers_garbage_collection", (), "delete", ["timers", "garbage-collection"]),
    ("delete_timers", (), "delete", ["timers"]),
    ("delete_ripng", (), "delete", []),
]


def _public_ops():
    return sorted(
        name for name, _ in inspect.getmembers(RipNgBatchBuilder, inspect.isfunction)
        if name.startswith(("set_", "delete_", "create_"))
    )


@pytest.mark.parametrize("version", ["1.4", "1.5", "2026.09.23-0027-rolling"])
@pytest.mark.parametrize("method,args,op,path", CASES, ids=[c[0] for c in CASES])
def test_op_path(version, method, args, op, path):
    builder = RipNgBatchBuilder(version)
    getattr(builder, method)(*args)
    assert builder.get_operations() == [{"op": op, "path": BASE + path}]


def test_every_op_has_a_golden_path():
    assert sorted(c[0] for c in CASES) == _public_ops()


@pytest.mark.parametrize("protocol", ["babel", "bgp", "connected", "kernel", "ospfv3", "static"])
def test_every_lab_redistribute_source_has_metric_and_route_map_deletes(protocol):
    builder = RipNgBatchBuilder("1.5")
    builder.delete_redistribute_metric(protocol).delete_redistribute_route_map(protocol)
    assert builder.get_operations() == [
        {"op": "delete", "path": BASE + ["redistribute", protocol, "metric"]},
        {"op": "delete", "path": BASE + ["redistribute", protocol, "route-map"]},
    ]


@pytest.mark.parametrize("method,args", [
    ("set_default_metric", ("0",)),
    ("set_default_metric", ("17",)),
    ("set_default_metric", ("one",)),
    ("set_default_metric", ("1.5",)),
    ("set_default_metric", ("-1",)),
    ("set_redistribute_metric", ("bgp", "0")),
    ("set_redistribute_metric", ("bgp", "17")),
    ("set_timers_update", ("4",)),
    ("set_timers_timeout", ("2147483648",)),
    ("set_timers_garbage_collection", ("30s",)),
    ("set_network", ("2001:db8::1/48",)),
    ("set_network", ("2001:db8::",)),
    ("set_network", ("10.0.0.0/8",)),
    ("delete_network", ("2001:db8::1/48",)),
    ("set_aggregate_address", ("2001:db8::1/48",)),
    ("delete_aggregate_address", ("not-a-prefix",)),
    ("set_route", ("2001:db8::1/64",)),
    ("delete_route", ("192.0.2.0/24",)),
    ("set_route_map", (".RM",)),
    ("set_route_map", ("RM 1",)),
    ("set_route_map", ("",)),
    ("set_redistribute_route_map", ("bgp", "RM/1")),
    ("set_distribute_list_access_list_in", ("ACL 6",)),
    ("set_distribute_list_prefix_list_out", ("",)),
    ("set_distribute_list_interface_access_list_out", ("eth0", "a,b")),
    ("set_distribute_list_interface_prefix_list_in", ("eth0", "P L")),
    ("set_redistribute", ("ospf",)),
    ("set_redistribute", ("ripng",)),
    ("delete_redistribute", ("rip",)),
    ("delete_redistribute_metric", ("isis",)),
    ("delete_redistribute_route_map", ("nhrp",)),
])
def test_bad_value_raises_before_any_op(method, args):
    builder = RipNgBatchBuilder("1.5")
    with pytest.raises(ValueError):
        getattr(builder, method)(*args)
    assert builder.get_operations() == []


@pytest.mark.parametrize("method,args", [
    ("set_distribute_list_prefix_list_in", ("PL.6",)),
    ("set_distribute_list_prefix_list_out", ("PL+6",)),
    ("set_distribute_list_interface_prefix_list_in", ("eth0", "PL.6")),
    ("set_distribute_list_interface_prefix_list_out", ("eth0", "P+L")),
    ("set_distribute_list_prefix_list_in", ("PL 6",)),
])
def test_prefix_list_name_follows_the_policy_prefix_list6_validator(method, args):
    builder = RipNgBatchBuilder("1.5")
    with pytest.raises(ValueError, match="prefix-list name"):
        getattr(builder, method)(*args)
    assert builder.get_operations() == []


@pytest.mark.parametrize("name", ["PL-6", "pl_6", "-PL", "_x", "123"])
def test_prefix_list_name_accepts_the_lab_pattern(name):
    builder = RipNgBatchBuilder("1.4")
    builder.set_distribute_list_prefix_list_in(name)
    builder.set_distribute_list_interface_prefix_list_out("eth0", name)
    assert builder.get_operations() == [
        {"op": "set", "path": BASE + ["distribute-list", "prefix-list", "in", name]},
        {"op": "set", "path": BASE + ["distribute-list", "interface", "eth0", "prefix-list", "out", name]},
    ]


@pytest.mark.parametrize("name", ["ACL.6", "ACL+6", "acl_6-x"])
def test_access_list_name_keeps_dot_and_plus(name):
    builder = RipNgBatchBuilder("1.5")
    builder.set_distribute_list_access_list_out(name)
    builder.set_distribute_list_interface_access_list_in("eth0", name)
    assert builder.get_operations() == [
        {"op": "set", "path": BASE + ["distribute-list", "access-list", "out", name]},
        {"op": "set", "path": BASE + ["distribute-list", "interface", "eth0", "access-list", "in", name]},
    ]


@pytest.mark.parametrize("prefix", ["2001:db8::/48", "::/0", "2001:db8:0:1::/64"])
def test_prefix_without_host_bits_is_accepted(prefix):
    builder = RipNgBatchBuilder("1.5").set_network(prefix)
    assert builder.get_operations() == [{"op": "set", "path": BASE + ["network", prefix]}]


def test_prefix_with_host_bits_names_the_problem():
    with pytest.raises(ValueError, match="host bits"):
        RipNgBatchBuilder("1.4").set_aggregate_address("2001:db8::1/48")


def test_capabilities_do_not_branch_on_version():
    caps = {v: RipNgBatchBuilder(v).get_capabilities() for v in ("1.4", "1.5", "2026.09.23-0027-rolling")}
    for caps_v in caps.values():
        caps_v.pop("version")
    assert caps["1.4"] == caps["1.5"] == caps["2026.09.23-0027-rolling"]
    c = caps["1.5"]
    assert "version_info" not in c
    assert c["features"]["redistribute"]["protocols"] == [
        "babel", "bgp", "connected", "kernel", "ospfv3", "static",
    ]
    assert c["ranges"] is RANGES


def test_ranges_match_the_lab():
    assert RANGES == {
        "metric": {"min": 1, "max": 16},
        "timer": {"min": 5, "max": 2147483647},
    }


def test_registry_returns_the_shared_mapper():
    for version in ("1.4", "1.5", "2026.09.23-0027-rolling"):
        assert type(CommandMapperRegistry.get_mapper("ripng", version)) is RipNgMapper


def test_mapper_has_no_versions_package_or_pass_through_init():
    import importlib.util

    assert importlib.util.find_spec("vyos_mappers.ripng.ripng_versions") is None
    assert "__init__" not in RipNgMapper.__dict__
    assert "parse_config" in RipNgMapper.__dict__


@pytest.mark.parametrize("method,args", [
    ("set_default_metric", ("\u0663",)),
    ("set_default_metric", ("\uff13",)),
    ("set_redistribute_metric", ("bgp", "\u0661")),
    ("set_timers_update", ("\uff13\uff10",)),
    ("set_timers_garbage_collection", ("\u0661\u0662\u0660",)),
])
def test_unicode_digits_are_rejected(method, args):
    builder = RipNgBatchBuilder("1.5")
    with pytest.raises(ValueError):
        getattr(builder, method)(*args)
    assert builder.get_operations() == []


@pytest.mark.parametrize("method", ["set_network", "delete_network", "set_aggregate_address", "set_route"])
@pytest.mark.parametrize("prefix", ["fe80::%eth0/64", "2001:db8::%1/32", "2001:db8::/032", "::/00", "2001:db8::/\uff13\uff12"])
def test_prefix_with_zone_or_padded_length_is_rejected(method, prefix):
    builder = RipNgBatchBuilder("1.5")
    with pytest.raises(ValueError, match="IPv6 prefix"):
        getattr(builder, method)(prefix)
    assert builder.get_operations() == []


@pytest.mark.parametrize("name", ["acl:6", "acl/6", "ACL.6", "acl#1"])
def test_access_list_name_is_free_text(name):
    builder = RipNgBatchBuilder("1.5")
    builder.set_distribute_list_access_list_in(name)
    builder.set_distribute_list_interface_access_list_out("eth0", name)
    assert builder.get_operations() == [
        {"op": "set", "path": BASE + ["distribute-list", "access-list", "in", name]},
        {"op": "set", "path": BASE + ["distribute-list", "interface", "eth0", "access-list", "out", name]},
    ]


@pytest.mark.parametrize("name", ["", " ", "a b", "a\tb", "a,b"])
def test_access_list_name_rejects_blank_whitespace_and_comma(name):
    builder = RipNgBatchBuilder("1.5")
    with pytest.raises(ValueError, match="access-list name"):
        builder.set_distribute_list_access_list_out(name)
    assert builder.get_operations() == []
