"""Golden paths for every PIMv6 builder op.

Each path matches a protocols pim6 node.def on the 1.4 and 1.5 labs (the
tree is identical on both).
"""

import inspect

import pytest

from vyos_builders.pim6.pim6_batch_builder import RANGES, Pim6BatchBuilder

BASE = ["protocols", "pim6"]
I = ["interface", "eth0"]
G = "ff0e::1:3"
S = "2001:db8::10"
RP = "2001:db8::50"
NET = "ff0e::/16"

# method, args, op, path after protocols pim6
CASES = [
    # global
    ("set_join_prune_interval", ("65535",), "set", ["join-prune-interval", "65535"]),
    ("delete_join_prune_interval", (), "delete", ["join-prune-interval"]),
    ("set_keep_alive_timer", ("1",), "set", ["keep-alive-timer", "1"]),
    ("delete_keep_alive_timer", (), "delete", ["keep-alive-timer"]),
    ("set_packets", ("255",), "set", ["packets", "255"]),
    ("delete_packets", (), "delete", ["packets"]),
    ("set_register_suppress_time", ("60",), "set", ["register-suppress-time", "60"]),
    ("delete_register_suppress_time", (), "delete", ["register-suppress-time"]),
    # rp
    ("delete_rp", (), "delete", ["rp"]),
    ("set_rp_address", (RP,), "set", ["rp", "address", RP]),
    ("delete_rp_address", (RP,), "delete", ["rp", "address", RP]),
    ("set_rp_address_group", (RP, NET), "set", ["rp", "address", RP, "group", NET]),
    ("delete_rp_address_group", (RP, NET), "delete", ["rp", "address", RP, "group", NET]),
    ("set_rp_address_prefix_list6", (RP, "RP-PL6"), "set", ["rp", "address", RP, "prefix-list6", "RP-PL6"]),
    ("delete_rp_address_prefix_list6", (RP,), "delete", ["rp", "address", RP, "prefix-list6"]),
    ("set_rp_keep_alive_timer", ("180",), "set", ["rp", "keep-alive-timer", "180"]),
    ("delete_rp_keep_alive_timer", (), "delete", ["rp", "keep-alive-timer"]),
    # interface
    ("set_interface", ("eth0",), "set", I),
    ("delete_interface", ("eth0",), "delete", I),
    ("set_interface_dr_priority", ("eth0", "4294967295"), "set", I + ["dr-priority", "4294967295"]),
    ("delete_interface_dr_priority", ("eth0",), "delete", I + ["dr-priority"]),
    ("set_interface_hello", ("eth0", "180"), "set", I + ["hello", "180"]),
    ("delete_interface_hello", ("eth0",), "delete", I + ["hello"]),
    ("set_interface_no_bsm", ("eth0",), "set", I + ["no-bsm"]),
    ("delete_interface_no_bsm", ("eth0",), "delete", I + ["no-bsm"]),
    ("set_interface_no_unicast_bsm", ("eth0",), "set", I + ["no-unicast-bsm"]),
    ("delete_interface_no_unicast_bsm", ("eth0",), "delete", I + ["no-unicast-bsm"]),
    ("set_interface_passive", ("eth0",), "set", I + ["passive"]),
    ("delete_interface_passive", ("eth0",), "delete", I + ["passive"]),
    # interface mld
    ("set_interface_mld", ("eth0",), "set", I + ["mld"]),
    ("delete_interface_mld", ("eth0",), "delete", I + ["mld"]),
    ("set_interface_mld_disable", ("eth0",), "set", I + ["mld", "disable"]),
    ("delete_interface_mld_disable", ("eth0",), "delete", I + ["mld", "disable"]),
    ("set_interface_mld_interval", ("eth0", "65535"), "set", I + ["mld", "interval", "65535"]),
    ("delete_interface_mld_interval", ("eth0",), "delete", I + ["mld", "interval"]),
    ("set_interface_mld_last_member_query_count", ("eth0", "255"), "set",
     I + ["mld", "last-member-query-count", "255"]),
    ("delete_interface_mld_last_member_query_count", ("eth0",), "delete", I + ["mld", "last-member-query-count"]),
    ("set_interface_mld_last_member_query_interval", ("eth0", "100"), "set",
     I + ["mld", "last-member-query-interval", "100"]),
    ("delete_interface_mld_last_member_query_interval", ("eth0",), "delete",
     I + ["mld", "last-member-query-interval"]),
    ("set_interface_mld_max_response_time", ("eth0", "6553500"), "set",
     I + ["mld", "max-response-time", "6553500"]),
    ("delete_interface_mld_max_response_time", ("eth0",), "delete", I + ["mld", "max-response-time"]),
    ("set_interface_mld_version", ("eth0", "1"), "set", I + ["mld", "version", "1"]),
    ("delete_interface_mld_version", ("eth0",), "delete", I + ["mld", "version"]),
    ("set_interface_mld_join", ("eth0", G), "set", I + ["mld", "join", G]),
    ("delete_interface_mld_join", ("eth0", G), "delete", I + ["mld", "join", G]),
    ("set_interface_mld_join_source", ("eth0", G, S), "set", I + ["mld", "join", G, "source", S]),
    ("delete_interface_mld_join_source", ("eth0", G, S), "delete", I + ["mld", "join", G, "source", S]),
    ("delete_pim6", (), "delete", []),
]


def _public_ops():
    return sorted(
        name for name, _ in inspect.getmembers(Pim6BatchBuilder, inspect.isfunction)
        if name.startswith(("set_", "delete_", "create_"))
    )


@pytest.mark.parametrize("version", ["1.4", "1.5", "2026.09.23-0027-rolling"])
@pytest.mark.parametrize("method,args,op,path", CASES, ids=[c[0] for c in CASES])
def test_op_path(version, method, args, op, path):
    builder = Pim6BatchBuilder(version)
    getattr(builder, method)(*args)
    assert builder.get_operations() == [{"op": op, "path": BASE + path}]


def test_every_op_has_a_golden_path():
    assert sorted(c[0] for c in CASES) == _public_ops()


@pytest.mark.parametrize("method,args", [
    ("set_join_prune_interval", ("0",)),
    ("set_join_prune_interval", ("65536",)),
    ("set_keep_alive_timer", ("1.5",)),
    ("set_register_suppress_time", ("-1",)),
    ("set_rp_keep_alive_timer", ("65536",)),
    ("set_packets", ("256",)),
    ("set_packets", ("0x3",)),
    ("set_packets", ("\u0663",)),
    ("set_interface_dr_priority", ("eth0", "4294967296")),
    ("set_interface_dr_priority", ("eth0", "0")),
    ("set_interface_hello", ("eth0", "181")),
    ("set_interface_hello", ("eth0", "\uff13\uff10")),
    ("set_interface_mld_interval", ("eth0", "0")),
    ("set_interface_mld_interval", ("eth0", "65536")),
    ("set_interface_mld_last_member_query_count", ("eth0", "256")),
    ("set_interface_mld_last_member_query_interval", ("eth0", "99")),
    ("set_interface_mld_last_member_query_interval", ("eth0", "6553501")),
    ("set_interface_mld_max_response_time", ("eth0", "99")),
    ("set_interface_mld_max_response_time", ("eth0", "6553501")),
    ("set_interface_mld_version", ("eth0", "0")),
    ("set_interface_mld_version", ("eth0", "3")),
    # addresses and prefixes
    ("set_rp_address", ("192.0.2.1",)),
    ("set_rp_address", ("2001:db8::g",)),
    ("set_rp_address", ("fe80::1%eth0",)),
    ("delete_rp_address", ("not-an-ip",)),
    ("set_rp_address_group", (RP, "ff0e::1/16")),
    ("set_rp_address_group", (RP, "ff0e::")),
    ("set_rp_address_group", (RP, "ff0e::/129")),
    ("set_rp_address_group", (RP, "ff0e::/016")),
    ("set_rp_address_group", (RP, "224.0.0.0/4")),
    ("set_rp_address_group", (RP, "2001:db8::/32")),
    ("set_rp_address_group", (RP, "::/0")),
    ("set_rp_address_group", (RP, "fe00::/7")),
    ("delete_rp_address_group", ("x", NET)),
    ("set_rp_address_prefix_list6", ("x", "PL")),
    ("delete_rp_address_prefix_list6", ("192.0.2.1",)),
    ("set_interface_mld_join", ("eth0", "2001:db8::1")),
    ("set_interface_mld_join", ("eth0", "ff0e::/16")),
    ("delete_interface_mld_join", ("eth0", "fe80::1")),
    ("set_interface_mld_join_source", ("eth0", "2001:db8::1", S)),
    ("set_interface_mld_join_source", ("eth0", G, "192.0.2.1")),
    ("delete_interface_mld_join_source", ("eth0", G, "bad")),
    # names
    ("set_interface", ("eth0.1.2.3",)),
    ("set_interface", ("eth0x1",)),
    ("set_interface", ("eth 0",)),
    ("set_interface", ("foo0",)),
    ("set_interface", ("",)),
    ("delete_interface_mld", ("eth0,x",)),
    ("set_rp_address_prefix_list6", (RP, "PL.1")),
    ("set_rp_address_prefix_list6", (RP, "PL 1")),
    ("set_rp_address_prefix_list6", (RP, "")),
])
def test_bad_value_raises_before_any_op(method, args):
    builder = Pim6BatchBuilder("1.5")
    with pytest.raises(ValueError):
        getattr(builder, method)(*args)
    assert builder.get_operations() == []


@pytest.mark.parametrize("iface", [
    "eth0", "eth0.10", "eth0.100.10", "bond0.5.6", "br1", "bond0", "wg0", "dum0", "lo", "pod-web_1", "vtun3", "vpptap0",
])
def test_lab_interface_names_are_accepted(iface):
    builder = Pim6BatchBuilder("1.4").set_interface(iface)
    assert builder.get_operations() == [{"op": "set", "path": BASE + ["interface", iface]}]


@pytest.mark.parametrize("prefix", ["ff00::/8", "ff0e::/16", "ff3e::/32", "ff0e::1:3/128"])
def test_multicast_prefix_without_host_bits_is_accepted(prefix):
    builder = Pim6BatchBuilder("1.5").set_rp_address_group(RP, prefix)
    assert builder.get_operations() == [{"op": "set", "path": BASE + ["rp", "address", RP, "group", prefix]}]


@pytest.mark.parametrize("group", ["ff0e::1/16", "2001:db8::/32"])
def test_bad_rp_group_names_the_problem(group):
    with pytest.raises(ValueError, match="multicast prefix inside ff00::/8 with no host bits"):
        Pim6BatchBuilder("1.4").set_rp_address_group(RP, group)


@pytest.mark.parametrize("group", ["ff02::1", "ff0e::1:3", "ff3e::8000:1"])
def test_multicast_join_group_is_accepted(group):
    builder = Pim6BatchBuilder("1.5").set_interface_mld_join("eth0", group)
    assert builder.get_operations() == [{"op": "set", "path": BASE + I + ["mld", "join", group]}]


def test_unicast_join_group_names_the_problem():
    with pytest.raises(ValueError, match="multicast address inside ff00::/8"):
        Pim6BatchBuilder("1.4").set_interface_mld_join("eth0", "2001:db8::1")


def test_mapper_has_no_duplicate_delete_paths():
    from vyos_mappers.pim6.pim6 import Pim6Mapper

    for name in ("get_rp_address_delete", "get_rp_address_group_delete", "get_interface_mld_join_source_delete"):
        assert not hasattr(Pim6Mapper, name), name


def test_capabilities_do_not_branch_on_version():
    caps = {v: Pim6BatchBuilder(v).get_capabilities() for v in ("1.4", "1.5", "2026.09.23-0027-rolling")}
    for caps_v in caps.values():
        caps_v.pop("version")
    assert caps["1.4"] == caps["1.5"] == caps["2026.09.23-0027-rolling"]
    assert "version_info" not in caps["1.5"]
    assert caps["1.5"]["ranges"] is RANGES


def test_ranges_match_the_lab():
    assert RANGES == {
        "timer": {"min": 1, "max": 65535},
        "packets": {"min": 1, "max": 255},
        "dr_priority": {"min": 1, "max": 4294967295},
        "hello": {"min": 1, "max": 180},
        "mld_interval": {"min": 1, "max": 65535},
        "last_member_query_count": {"min": 1, "max": 255},
        "last_member_query_interval": {"min": 100, "max": 6553500},
        "max_response_time": {"min": 100, "max": 6553500},
        "mld_version": {"min": 1, "max": 2},
    }


def test_builder_ops_take_named_parameters_for_comma_dispatch():
    # The router splits a value on commas into exactly these parameters.
    builder = Pim6BatchBuilder("1.5")
    assert list(inspect.signature(builder.set_interface_mld_join_source).parameters) == ["iface", "group", "source"]
    assert list(inspect.signature(builder.delete_interface_mld_join_source).parameters) == ["iface", "group", "source"]
    assert list(inspect.signature(builder.set_rp_address_group).parameters) == ["address", "group"]
    assert list(inspect.signature(builder.set_rp_address_prefix_list6).parameters) == ["address", "value"]
    assert list(inspect.signature(builder.delete_rp_address_prefix_list6).parameters) == ["address"]
