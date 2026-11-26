"""Golden paths for every PIM builder op.

Each path matches a protocols pim node.def on the 1.4 and 1.5 labs (the tree
is identical on both).
"""

import inspect

import pytest

from vyos_builders.pim.pim_batch_builder import RANGES, PimBatchBuilder

BASE = ["protocols", "pim"]
I = ["interface", "eth0"]
G = "239.1.1.1"
S = "192.0.2.10"
RP = "192.0.2.50"
NET = "224.0.0.0/4"

# method, args, op, path after protocols pim
CASES = [
    # global
    ("set_ecmp", (), "set", ["ecmp"]),
    ("delete_ecmp", (), "delete", ["ecmp"]),
    ("set_ecmp_rebalance", (), "set", ["ecmp", "rebalance"]),
    ("delete_ecmp_rebalance", (), "delete", ["ecmp", "rebalance"]),
    ("set_join_prune_interval", ("65535",), "set", ["join-prune-interval", "65535"]),
    ("delete_join_prune_interval", (), "delete", ["join-prune-interval"]),
    ("set_keep_alive_timer", ("1",), "set", ["keep-alive-timer", "1"]),
    ("delete_keep_alive_timer", (), "delete", ["keep-alive-timer"]),
    ("set_no_v6_secondary", (), "set", ["no-v6-secondary"]),
    ("delete_no_v6_secondary", (), "delete", ["no-v6-secondary"]),
    ("set_packets", ("255",), "set", ["packets", "255"]),
    ("delete_packets", (), "delete", ["packets"]),
    ("set_register_suppress_time", ("60",), "set", ["register-suppress-time", "60"]),
    ("delete_register_suppress_time", (), "delete", ["register-suppress-time"]),
    ("set_igmp_watermark_warning", ("65535",), "set", ["igmp", "watermark-warning", "65535"]),
    ("delete_igmp_watermark_warning", (), "delete", ["igmp", "watermark-warning"]),
    ("set_register_accept_list_prefix_list", ("REG-PL",), "set", ["register-accept-list", "prefix-list", "REG-PL"]),
    ("delete_register_accept_list_prefix_list", (), "delete", ["register-accept-list", "prefix-list"]),
    # rp
    ("delete_rp", (), "delete", ["rp"]),
    ("set_rp_address", (RP,), "set", ["rp", "address", RP]),
    ("delete_rp_address", (RP,), "delete", ["rp", "address", RP]),
    ("set_rp_address_group", (RP, NET), "set", ["rp", "address", RP, "group", NET]),
    ("delete_rp_address_group", (RP, NET), "delete", ["rp", "address", RP, "group", NET]),
    ("set_rp_keep_alive_timer", ("180",), "set", ["rp", "keep-alive-timer", "180"]),
    ("delete_rp_keep_alive_timer", (), "delete", ["rp", "keep-alive-timer"]),
    # spt-switchover, ssm
    ("set_spt_switchover_infinity", (), "set", ["spt-switchover", "infinity-and-beyond"]),
    ("delete_spt_switchover", (), "delete", ["spt-switchover"]),
    ("set_spt_switchover_infinity_prefix_list", ("SPT_PL",), "set",
     ["spt-switchover", "infinity-and-beyond", "prefix-list", "SPT_PL"]),
    ("delete_spt_switchover_infinity_prefix_list", (), "delete", ["spt-switchover", "infinity-and-beyond", "prefix-list"]),
    ("set_ssm_prefix_list", ("SSM",), "set", ["ssm", "prefix-list", "SSM"]),
    ("delete_ssm_prefix_list", (), "delete", ["ssm", "prefix-list"]),
    # interface
    ("set_interface", ("eth0",), "set", I),
    ("delete_interface", ("eth0",), "delete", I),
    ("set_interface_bfd", ("eth0",), "set", I + ["bfd"]),
    ("delete_interface_bfd", ("eth0",), "delete", I + ["bfd"]),
    ("set_interface_bfd_profile", ("eth0", "fast"), "set", I + ["bfd", "profile", "fast"]),
    ("delete_interface_bfd_profile", ("eth0",), "delete", I + ["bfd", "profile"]),
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
    ("set_interface_source_address", ("eth0", "192.0.2.1"), "set", I + ["source-address", "192.0.2.1"]),
    ("delete_interface_source_address", ("eth0",), "delete", I + ["source-address"]),
    # interface igmp
    ("set_interface_igmp", ("eth0",), "set", I + ["igmp"]),
    ("delete_interface_igmp", ("eth0",), "delete", I + ["igmp"]),
    ("set_interface_igmp_disable", ("eth0",), "set", I + ["igmp", "disable"]),
    ("delete_interface_igmp_disable", ("eth0",), "delete", I + ["igmp", "disable"]),
    ("set_interface_igmp_join", ("eth0", G), "set", I + ["igmp", "join", G]),
    ("delete_interface_igmp_join", ("eth0", G), "delete", I + ["igmp", "join", G]),
    ("set_interface_igmp_join_source", ("eth0", G, S), "set", I + ["igmp", "join", G, "source-address", S]),
    ("delete_interface_igmp_join_source", ("eth0", G, S), "delete", I + ["igmp", "join", G, "source-address", S]),
    ("set_interface_igmp_query_interval", ("eth0", "1800"), "set", I + ["igmp", "query-interval", "1800"]),
    ("delete_interface_igmp_query_interval", ("eth0",), "delete", I + ["igmp", "query-interval"]),
    ("set_interface_igmp_query_max_response_time", ("eth0", "10"), "set", I + ["igmp", "query-max-response-time", "10"]),
    ("delete_interface_igmp_query_max_response_time", ("eth0",), "delete", I + ["igmp", "query-max-response-time"]),
    ("set_interface_igmp_version", ("eth0", "2"), "set", I + ["igmp", "version", "2"]),
    ("delete_interface_igmp_version", ("eth0",), "delete", I + ["igmp", "version"]),
    ("delete_pim", (), "delete", []),
]


def _public_ops():
    return sorted(
        name for name, _ in inspect.getmembers(PimBatchBuilder, inspect.isfunction)
        if name.startswith(("set_", "delete_", "create_"))
    )


@pytest.mark.parametrize("version", ["1.4", "1.5", "2026.09.23-0027-rolling"])
@pytest.mark.parametrize("method,args,op,path", CASES, ids=[c[0] for c in CASES])
def test_op_path(version, method, args, op, path):
    builder = PimBatchBuilder(version)
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
    ("set_igmp_watermark_warning", ("0",)),
    ("set_interface_dr_priority", ("eth0", "4294967296")),
    ("set_interface_dr_priority", ("eth0", "0")),
    ("set_interface_hello", ("eth0", "181")),
    ("set_interface_igmp_query_interval", ("eth0", "1801")),
    ("set_interface_igmp_query_max_response_time", ("eth0", "9")),
    ("set_interface_igmp_query_max_response_time", ("eth0", "251")),
    ("set_interface_igmp_version", ("eth0", "1")),
    ("set_interface_igmp_version", ("eth0", "4")),
    ("set_packets", ("\u0663",)),
    ("set_interface_hello", ("eth0", "\uff13\uff10")),
    # addresses and prefixes
    ("set_rp_address", ("192.0.2.256",)),
    ("set_rp_address", ("2001:db8::1",)),
    ("delete_rp_address", ("not-an-ip",)),
    ("set_rp_address_group", (RP, "224.1.1.1/16")),
    ("set_rp_address_group", (RP, "224.0.0.0")),
    ("set_rp_address_group", (RP, "224.0.0.0/33")),
    ("set_rp_address_group", (RP, "224.0.0.0/04")),
    ("set_rp_address_group", (RP, "ff00::/8")),
    ("set_rp_address_group", (RP, "224.0.0.1/4")),
    ("set_rp_address_group", (RP, "10.0.0.0/8")),
    ("set_rp_address_group", (RP, "0.0.0.0/0")),
    ("set_rp_address_group", (RP, "224.0.0.0/3")),
    ("set_rp_address_group", (RP, "240.0.0.0/4")),
    ("delete_rp_address_group", ("x", NET)),
    ("set_interface_source_address", ("eth0", "192.0.2.0/24")),
    ("set_interface_igmp_join", ("eth0", "239.1.1")),
    ("set_interface_igmp_join_source", ("eth0", G, "2001:db8::1")),
    ("delete_interface_igmp_join_source", ("eth0", "bad", S)),
    # names
    ("set_interface", ("eth 0",)),
    ("set_interface", ("foo0",)),
    ("set_interface", ("",)),
    ("delete_interface_bfd", ("eth0,x",)),
    ("set_register_accept_list_prefix_list", ("PL.1",)),
    ("set_ssm_prefix_list", ("PL 1",)),
    ("set_spt_switchover_infinity_prefix_list", ("PL+1",)),
    ("set_interface_bfd_profile", ("eth0", "a b")),
    ("set_interface_bfd_profile", ("eth0", "a,b")),
    ("set_interface_bfd_profile", ("eth0", "")),
])
def test_bad_value_raises_before_any_op(method, args):
    builder = PimBatchBuilder("1.5")
    with pytest.raises(ValueError):
        getattr(builder, method)(*args)
    assert builder.get_operations() == []


@pytest.mark.parametrize("iface", ["eth0", "eth0.10", "br1", "bond0", "wg0", "dum0", "lo", "pod-web_1", "vtun3"])
def test_lab_interface_names_are_accepted(iface):
    builder = PimBatchBuilder("1.4").set_interface(iface)
    assert builder.get_operations() == [{"op": "set", "path": BASE + ["interface", iface]}]


@pytest.mark.parametrize("prefix", ["224.0.0.0/4", "239.1.1.0/24", "232.1.1.1/32", "239.255.255.255/32"])
def test_multicast_prefix_without_host_bits_is_accepted(prefix):
    builder = PimBatchBuilder("1.5").set_rp_address_group(RP, prefix)
    assert builder.get_operations() == [{"op": "set", "path": BASE + ["rp", "address", RP, "group", prefix]}]


@pytest.mark.parametrize("group", ["239.1.1.1/8", "10.0.0.0/8"])
def test_bad_rp_group_names_the_problem(group):
    with pytest.raises(ValueError, match="multicast prefix inside 224.0.0.0/4 with no host bits"):
        PimBatchBuilder("1.4").set_rp_address_group(RP, group)


def test_igmp_join_takes_a_unicast_group():
    # Lab: igmp join accepts a unicast address on both versions.
    builder = PimBatchBuilder("1.5").set_interface_igmp_join_source("eth0", "192.0.2.1", S)
    assert builder.get_operations() == [
        {"op": "set", "path": BASE + I + ["igmp", "join", "192.0.2.1", "source-address", S]}]


def test_capabilities_do_not_branch_on_version():
    caps = {v: PimBatchBuilder(v).get_capabilities() for v in ("1.4", "1.5", "2026.09.23-0027-rolling")}
    for caps_v in caps.values():
        caps_v.pop("version")
    assert caps["1.4"] == caps["1.5"] == caps["2026.09.23-0027-rolling"]
    assert "version_info" not in caps["1.5"]
    assert caps["1.5"]["ranges"] is RANGES


def test_ranges_match_the_lab():
    assert RANGES == {
        "timer": {"min": 1, "max": 65535},
        "packets": {"min": 1, "max": 255},
        "watermark_warning": {"min": 1, "max": 65535},
        "dr_priority": {"min": 1, "max": 4294967295},
        "hello": {"min": 1, "max": 180},
        "query_interval": {"min": 1, "max": 1800},
        "query_max_response_time": {"min": 10, "max": 250},
        "igmp_version": {"min": 2, "max": 3},
    }


def test_builder_ops_take_named_parameters_for_comma_dispatch():
    # The router splits a value on commas into exactly these parameters.
    builder = PimBatchBuilder("1.5")
    assert list(inspect.signature(builder.set_interface_igmp_join_source).parameters) == ["iface", "group", "source"]
    assert list(inspect.signature(builder.set_rp_address_group).parameters) == ["address", "group"]
