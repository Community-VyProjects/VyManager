"""Golden paths for every access-list builder op, and the builder value checks.

Each path matches a ``policy access-list`` / ``policy access-list6`` node.def
on the 1.4 and 1.5 labs (the trees are identical on both).
"""

import inspect

import pytest

from vyos_builders.access_list.access_list_batch_builder import (
    DESCRIPTION_MAX_LENGTH,
    RANGES,
    AccessListBatchBuilder,
)

VERSIONS = ("1.4", "1.5", "2026.09.23-0027-rolling")
V4 = ["policy", "access-list", "100"]
V6 = ["policy", "access-list6", "ACL6"]
R4 = V4 + ["rule", "10"]
R6 = V6 + ["rule", "10"]
S4 = R4 + ["source"]
D4 = R4 + ["destination"]
S6 = R6 + ["source"]

# method, args, op, path (ipv4)
CASES = [
    ("create_access_list", ("ipv4", "100"), "set", V4),
    ("delete_access_list", ("ipv4", "100"), "delete", V4),
    ("set_access_list_description", ("ipv4", "100", "corp lists"), "set", V4 + ["description", "corp lists"]),
    ("delete_access_list_description", ("ipv4", "100"), "delete", V4 + ["description"]),
    ("create_rule", ("ipv4", "100", "10"), "set", R4),
    ("delete_rule", ("ipv4", "100", "10"), "delete", R4),
    ("set_rule_action", ("ipv4", "100", "10", "deny"), "set", R4 + ["action", "deny"]),
    ("set_rule_description", ("ipv4", "100", "10", "web"), "set", R4 + ["description", "web"]),
    ("delete_rule_description", ("ipv4", "100", "10"), "delete", R4 + ["description"]),
    ("set_rule_source_any", ("ipv4", "100", "10"), "set", S4 + ["any"]),
    ("delete_rule_source_any", ("ipv4", "100", "10"), "delete", S4 + ["any"]),
    ("set_rule_source_host", ("ipv4", "100", "10", "192.0.2.1"), "set", S4 + ["host", "192.0.2.1"]),
    ("delete_rule_source_host", ("ipv4", "100", "10"), "delete", S4 + ["host"]),
    ("set_rule_source_network", ("ipv4", "100", "10", "192.0.2.0"), "set", S4 + ["network", "192.0.2.0"]),
    ("delete_rule_source_network", ("ipv4", "100", "10"), "delete", S4 + ["network"]),
    ("set_rule_source_inverse_mask", ("ipv4", "100", "10", "0.0.0.255"), "set", S4 + ["inverse-mask", "0.0.0.255"]),
    ("delete_rule_source_inverse_mask", ("ipv4", "100", "10"), "delete", S4 + ["inverse-mask"]),
    ("delete_rule_destination", ("ipv4", "100", "10"), "delete", D4),
    ("set_rule_destination_any", ("ipv4", "100", "10"), "set", D4 + ["any"]),
    ("delete_rule_destination_any", ("ipv4", "100", "10"), "delete", D4 + ["any"]),
    ("set_rule_destination_host", ("ipv4", "100", "10", "198.51.100.7"), "set", D4 + ["host", "198.51.100.7"]),
    ("delete_rule_destination_host", ("ipv4", "100", "10"), "delete", D4 + ["host"]),
    ("set_rule_destination_network", ("ipv4", "100", "10", "198.51.100.0"), "set", D4 + ["network", "198.51.100.0"]),
    ("delete_rule_destination_network", ("ipv4", "100", "10"), "delete", D4 + ["network"]),
    ("set_rule_destination_inverse_mask", ("ipv4", "100", "10", "0.0.0.63"), "set", D4 + ["inverse-mask", "0.0.0.63"]),
    ("delete_rule_destination_inverse_mask", ("ipv4", "100", "10"), "delete", D4 + ["inverse-mask"]),
]

# access-list6 has source any / exact-match / network only.
IPV6_CASES = [
    ("create_access_list", ("ipv6", "ACL6"), "set", V6),
    ("delete_access_list", ("ipv6", "ACL6"), "delete", V6),
    ("set_access_list_description", ("ipv6", "ACL6", "v6"), "set", V6 + ["description", "v6"]),
    ("delete_access_list_description", ("ipv6", "ACL6"), "delete", V6 + ["description"]),
    ("create_rule", ("ipv6", "ACL6", "10"), "set", R6),
    ("delete_rule", ("ipv6", "ACL6", "10"), "delete", R6),
    ("set_rule_action", ("ipv6", "ACL6", "10", "permit"), "set", R6 + ["action", "permit"]),
    ("set_rule_description", ("ipv6", "ACL6", "10", "x"), "set", R6 + ["description", "x"]),
    ("delete_rule_description", ("ipv6", "ACL6", "10"), "delete", R6 + ["description"]),
    ("set_rule_source_any", ("ipv6", "ACL6", "10"), "set", S6 + ["any"]),
    ("delete_rule_source_any", ("ipv6", "ACL6", "10"), "delete", S6 + ["any"]),
    ("set_rule_source_network", ("ipv6", "ACL6", "10", "2001:db8::/32"), "set", S6 + ["network", "2001:db8::/32"]),
    ("delete_rule_source_network", ("ipv6", "ACL6", "10"), "delete", S6 + ["network"]),
    ("set_rule_source_exact_match", ("ipv6", "ACL6", "10"), "set", S6 + ["exact-match"]),
    ("delete_rule_source_exact_match", ("ipv6", "ACL6", "10"), "delete", S6 + ["exact-match"]),
]

# Leaves the other family does not have.
IPV4_ONLY = [
    "set_rule_source_host", "delete_rule_source_host",
    "set_rule_source_inverse_mask", "delete_rule_source_inverse_mask",
    "delete_rule_destination",
    "set_rule_destination_any", "delete_rule_destination_any",
    "set_rule_destination_host", "delete_rule_destination_host",
    "set_rule_destination_network", "delete_rule_destination_network",
    "set_rule_destination_inverse_mask", "delete_rule_destination_inverse_mask",
]
IPV6_ONLY = ["set_rule_source_exact_match", "delete_rule_source_exact_match"]


def _public_ops():
    return sorted(
        name
        for name, _ in inspect.getmembers(AccessListBatchBuilder, inspect.isfunction)
        if name.startswith(("set_", "delete_", "create_"))
    )


def _args(method, list_type, name):
    params = list(inspect.signature(getattr(AccessListBatchBuilder, method)).parameters)[1:]
    sample = {"rule": "10", "value": "192.0.2.1" if list_type == "ipv4" else "2001:db8::/32"}
    return (list_type, name) + tuple(sample[p] for p in params[2:])


@pytest.mark.parametrize("version", VERSIONS)
@pytest.mark.parametrize("method,args,op,path", CASES + IPV6_CASES)
def test_op_path(version, method, args, op, path):
    builder = AccessListBatchBuilder(version)
    getattr(builder, method)(*args)
    assert builder.get_operations() == [{"op": op, "path": path}]


def test_every_op_has_a_golden_path():
    public = set(_public_ops())
    assert sorted(c[0] for c in CASES) == sorted(public - set(IPV6_ONLY))
    assert sorted(c[0] for c in IPV6_CASES) == sorted(public - set(IPV4_ONLY))


def test_every_op_takes_list_type_and_name_first():
    # The router binds item_name to list_type and the bound name / rule.
    for name in _public_ops():
        params = list(inspect.signature(getattr(AccessListBatchBuilder, name)).parameters)[1:]
        assert params[:2] == ["list_type", "name"], name
        assert params[2:3] in ([], ["rule"], ["value"]), name
        if params[2:3] == ["rule"]:
            assert params[3:] in ([], ["value"]), name


@pytest.mark.parametrize("method", IPV4_ONLY)
def test_ipv4_only_leaf_raises_on_ipv6(method):
    builder = AccessListBatchBuilder("1.5")
    with pytest.raises(ValueError):
        getattr(builder, method)(*_args(method, "ipv6", "ACL6"))
    assert builder.get_operations() == []


@pytest.mark.parametrize("method", IPV6_ONLY)
def test_ipv6_only_leaf_raises_on_ipv4(method):
    builder = AccessListBatchBuilder("1.5")
    with pytest.raises(ValueError):
        getattr(builder, method)(*_args(method, "ipv4", "10"))
    assert builder.get_operations() == []


@pytest.mark.parametrize("method,args", [
    # list type
    ("create_access_list", ("ipv5", "10")),
    # IPv4 list number: the lab verify calls int() on it
    ("create_access_list", ("ipv4", "abc")),
    ("create_access_list", ("ipv4", "")),
    ("create_access_list", ("ipv4", "-1")),
    ("create_access_list", ("ipv4", "1.5")),
    ("create_access_list", ("ipv4", "4294967296")),
    ("create_access_list", ("ipv4", "\u0663")),
    ("delete_access_list", ("ipv4", "10\n")),
    # IPv6 list name: whitespace splits the FRR command
    ("create_access_list", ("ipv6", "")),
    ("create_access_list", ("ipv6", "A B")),
    ("create_rule", ("ipv6", "A\tB", "10")),
    ("create_access_list", ("ipv6", "A\x7fB")),
    ("create_access_list", ("ipv6", "A\x00")),
    # rule number
    ("create_rule", ("ipv4", "10", "0")),
    ("create_rule", ("ipv4", "10", "65536")),
    ("create_rule", ("ipv4", "10", "1.5")),
    ("delete_rule", ("ipv4", "10", "-1")),
    ("set_rule_source_any", ("ipv4", "10", "\u0663")),
    # action
    ("set_rule_action", ("ipv4", "10", "10", "accept")),
    ("set_rule_action", ("ipv4", "10", "10", "Permit")),
    # description
    ("set_access_list_description", ("ipv4", "10", "x" * (DESCRIPTION_MAX_LENGTH + 1))),
    ("set_rule_description", ("ipv6", "ACL6", "10", "x" * (DESCRIPTION_MAX_LENGTH + 1))),
    ("set_rule_description", ("ipv4", "10", "10", "two\nlines")),
    # IPv4 addresses (host, network, inverse-mask are ipv4-address on the lab)
    ("set_rule_source_host", ("ipv4", "10", "10", "10.0.0.256")),
    ("set_rule_source_host", ("ipv4", "10", "10", "010.0.0.1")),
    ("set_rule_source_network", ("ipv4", "10", "10", "10.0.0.0/24")),
    ("set_rule_source_inverse_mask", ("ipv4", "10", "10", "2001:db8::")),
    ("set_rule_destination_host", ("ipv4", "100", "10", "host")),
    ("set_rule_destination_network", ("ipv4", "100", "10", "")),
    ("set_rule_destination_inverse_mask", ("ipv4", "100", "10", "0.0.0")),
    # IPv6 network (ipv6-prefix on the lab)
    ("set_rule_source_network", ("ipv6", "ACL6", "10", "2001:db8::1/32")),
    ("set_rule_source_network", ("ipv6", "ACL6", "10", "2001:db8::")),
    ("set_rule_source_network", ("ipv6", "ACL6", "10", "10.0.0.0/8")),
    ("set_rule_source_network", ("ipv6", "ACL6", "10", "fe80::%eth0/64")),
    ("set_rule_source_network", ("ipv6", "ACL6", "10", "2001:db8::/129")),
    ("set_rule_source_network", ("ipv6", "ACL6", "10", "2001:db8::/032")),
    ("set_rule_source_network", ("ipv6", "ACL6", "10", "::ffff:10.0.0.0/104")),
])
def test_bad_value_raises_before_any_op(method, args):
    builder = AccessListBatchBuilder("1.5")
    with pytest.raises(ValueError):
        getattr(builder, method)(*args)
    assert builder.get_operations() == []


def test_lab_bounds_are_accepted():
    builder = AccessListBatchBuilder("1.4")
    # Lab commits: numbers outside the val_help ranges, 0, and IPv6 names
    # with a dot, a colon or a non-ASCII letter.
    for number in ("0", "1", "99", "300", "1999", "2699", "4294967295"):
        builder.create_access_list("ipv4", number)
    for name in ("a.b", "a:b", "\u00e9", "A_b-1"):
        builder.create_access_list("ipv6", name)
    builder.create_rule("ipv4", "10", "1").create_rule("ipv4", "10", "65535")
    builder.set_rule_description("ipv4", "10", "1", "x" * DESCRIPTION_MAX_LENGTH)
    builder.set_rule_source_network("ipv6", "ACL6", "1", "::/0")
    builder.set_rule_source_network("ipv6", "ACL6", "1", "::ffff:a00:0/104")
    builder.set_rule_source_inverse_mask("ipv4", "10", "1", "255.255.255.255")
    assert len(builder.get_operations()) == 17


def test_restore_rule_recreates_every_leaf():
    # IPv6 rule with any, network and exact-match: every leaf is kept.
    tree = {"action": "deny", "description": "d", "source": {"any": {}, "exact-match": {}, "network": "2001:db8::/32"}}
    builder = AccessListBatchBuilder("1.5").restore_rule("ipv6", "ACL6", "20", tree)
    base = V6 + ["rule", "20"]
    assert [o["path"] for o in builder.get_operations()] == [
        base,
        base + ["action", "deny"],
        base + ["description", "d"],
        base + ["source", "any"],
        base + ["source", "exact-match"],
        base + ["source", "network", "2001:db8::/32"],
    ]


def test_restore_rule_recreates_an_ipv4_destination():
    tree = {
        "action": "permit",
        "source": {"network": "10.0.0.0", "inverse-mask": "0.0.0.255"},
        "destination": {"host": "192.0.2.1"},
    }
    builder = AccessListBatchBuilder("1.4").restore_rule("ipv4", "100", "5", tree)
    base = V4 + ["rule", "5"]
    assert [o["path"] for o in builder.get_operations()] == [
        base,
        base + ["action", "permit"],
        base + ["source", "network", "10.0.0.0"],
        base + ["source", "inverse-mask", "0.0.0.255"],
        base + ["destination", "host", "192.0.2.1"],
    ]


def test_capabilities_do_not_branch_on_version():
    caps = {v: AccessListBatchBuilder(v).get_capabilities() for v in VERSIONS}
    for caps_v in caps.values():
        caps_v.pop("version")
    assert caps["1.4"] == caps["1.5"] == caps["2026.09.23-0027-rolling"]
    assert "version_info" not in caps["1.5"]
    assert caps["1.5"]["ranges"] is RANGES
    assert caps["1.5"]["values"] == {"rule_actions": ["permit", "deny"]}
    assert caps["1.5"]["extended_ranges"] == [{"min": 100, "max": 199}, {"min": 2000, "max": 2699}]
    assert caps["1.5"]["description_max_length"] == 255


def test_ranges_match_the_lab():
    assert RANGES == {
        "rule": {"min": 1, "max": 65535},
        "ipv4_list": {"min": 0, "max": 4294967295},
    }
