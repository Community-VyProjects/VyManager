"""Golden paths for every prefix-list builder op, and the builder value checks.

Each path matches a ``policy prefix-list`` / ``policy prefix-list6`` node.def
on the 1.4 and 1.5 labs (the trees are identical on both).
"""

import inspect

import pytest

from vyos_builders.prefix_list.prefix_list_batch_builder import (
    DESCRIPTION_MAX_LENGTH,
    RANGES,
    PrefixListBatchBuilder,
)

VERSIONS = ("1.4", "1.5", "2026.09.23-0027-rolling")
V4 = ["policy", "prefix-list", "PL"]
V6 = ["policy", "prefix-list6", "PL6"]
R4 = V4 + ["rule", "10"]
R6 = V6 + ["rule", "10"]

# method, args, op, path
CASES = [
    ("create_prefix_list", ("ipv4", "PL"), "set", V4),
    ("delete_prefix_list", ("ipv4", "PL"), "delete", V4),
    ("set_prefix_list_description", ("ipv4", "PL", "corp lists"), "set", V4 + ["description", "corp lists"]),
    ("delete_prefix_list_description", ("ipv4", "PL"), "delete", V4 + ["description"]),
    ("create_rule", ("ipv4", "PL", "10"), "set", R4),
    ("delete_rule", ("ipv4", "PL", "10"), "delete", R4),
    ("set_rule_action", ("ipv4", "PL", "10", "deny"), "set", R4 + ["action", "deny"]),
    ("set_rule_description", ("ipv4", "PL", "10", "web"), "set", R4 + ["description", "web"]),
    ("delete_rule_description", ("ipv4", "PL", "10"), "delete", R4 + ["description"]),
    ("set_rule_prefix", ("ipv4", "PL", "10", "10.0.0.0/8"), "set", R4 + ["prefix", "10.0.0.0/8"]),
    ("set_rule_ge", ("ipv4", "PL", "10", "16"), "set", R4 + ["ge", "16"]),
    ("delete_rule_ge", ("ipv4", "PL", "10"), "delete", R4 + ["ge"]),
    ("set_rule_le", ("ipv4", "PL", "10", "32"), "set", R4 + ["le", "32"]),
    ("delete_rule_le", ("ipv4", "PL", "10"), "delete", R4 + ["le"]),
]

IPV6_CASES = [
    ("create_prefix_list", ("ipv6", "PL6"), "set", V6),
    ("set_prefix_list_description", ("ipv6", "PL6", "v6"), "set", V6 + ["description", "v6"]),
    ("create_rule", ("ipv6", "PL6", "10"), "set", R6),
    ("set_rule_action", ("ipv6", "PL6", "10", "permit"), "set", R6 + ["action", "permit"]),
    ("set_rule_prefix", ("ipv6", "PL6", "10", "2001:db8::/32"), "set", R6 + ["prefix", "2001:db8::/32"]),
    ("set_rule_ge", ("ipv6", "PL6", "10", "48"), "set", R6 + ["ge", "48"]),
    ("set_rule_le", ("ipv6", "PL6", "10", "128"), "set", R6 + ["le", "128"]),
    ("delete_rule_le", ("ipv6", "PL6", "10"), "delete", R6 + ["le"]),
]


def _public_ops():
    return sorted(
        name
        for name, _ in inspect.getmembers(PrefixListBatchBuilder, inspect.isfunction)
        if name.startswith(("set_", "delete_", "create_"))
    )


@pytest.mark.parametrize("version", VERSIONS)
@pytest.mark.parametrize("method,args,op,path", CASES + IPV6_CASES)
def test_op_path(version, method, args, op, path):
    builder = PrefixListBatchBuilder(version)
    getattr(builder, method)(*args)
    assert builder.get_operations() == [{"op": op, "path": path}]


def test_every_op_has_a_golden_path():
    assert sorted(c[0] for c in CASES) == _public_ops()


def test_every_op_takes_list_type_and_name_first():
    # The router binds item_name to list_type and the bound name / rule.
    for name in _public_ops():
        params = list(inspect.signature(getattr(PrefixListBatchBuilder, name)).parameters)[1:]
        assert params[:2] == ["list_type", "name"], name
        assert params[2:3] in ([], ["rule"], ["value"]), name
        if params[2:3] == ["rule"]:
            assert params[3:] in ([], ["value"]), name


@pytest.mark.parametrize("method,args", [
    # list type
    ("create_prefix_list", ("ipv5", "PL")),
    # names
    ("create_prefix_list", ("ipv4", "PL.1")),
    ("create_prefix_list", ("ipv4", "PL 1")),
    ("create_prefix_list", ("ipv4", "")),
    ("delete_prefix_list", ("ipv4", "PL\n")),
    ("create_rule", ("ipv6", "PL/6", "10")),
    # rule number
    ("create_rule", ("ipv4", "PL", "0")),
    ("create_rule", ("ipv4", "PL", "65536")),
    ("create_rule", ("ipv4", "PL", "1.5")),
    ("delete_rule", ("ipv4", "PL", "-1")),
    ("set_rule_ge", ("ipv4", "PL", "\u0663", "16")),
    # action
    ("set_rule_action", ("ipv4", "PL", "10", "accept")),
    ("set_rule_action", ("ipv4", "PL", "10", "Permit")),
    # description
    ("set_prefix_list_description", ("ipv4", "PL", "x" * (DESCRIPTION_MAX_LENGTH + 1))),
    ("set_rule_description", ("ipv4", "PL", "10", "x" * (DESCRIPTION_MAX_LENGTH + 1))),
    ("set_rule_description", ("ipv4", "PL", "10", "two\nlines")),
    # prefix
    ("set_rule_prefix", ("ipv4", "PL", "10", "10.0.0.1/8")),
    ("set_rule_prefix", ("ipv4", "PL", "10", "10.0.0.0")),
    ("set_rule_prefix", ("ipv4", "PL", "10", "10.0.0.0/33")),
    ("set_rule_prefix", ("ipv4", "PL", "10", "10.0.0.0/08")),
    ("set_rule_prefix", ("ipv4", "PL", "10", "010.0.0.0/8")),
    ("set_rule_prefix", ("ipv4", "PL", "10", "2001:db8::/32")),
    ("set_rule_prefix", ("ipv6", "PL6", "10", "10.0.0.0/8")),
    ("set_rule_prefix", ("ipv6", "PL6", "10", "2001:db8::1/32")),
    ("set_rule_prefix", ("ipv6", "PL6", "10", "fe80::%eth0/64")),
    ("set_rule_prefix", ("ipv6", "PL6", "10", "2001:db8::/129")),
    # ge / le
    ("set_rule_ge", ("ipv4", "PL", "10", "33")),
    ("set_rule_le", ("ipv4", "PL", "10", "-1")),
    ("set_rule_ge", ("ipv4", "PL", "10", "1e1")),
    ("set_rule_le", ("ipv4", "PL", "10", "\uff13\uff12")),
    ("set_rule_ge", ("ipv6", "PL6", "10", "129")),
    ("set_rule_le", ("ipv6", "PL6", "10", "x")),
])
def test_bad_value_raises_before_any_op(method, args):
    builder = PrefixListBatchBuilder("1.5")
    with pytest.raises(ValueError):
        getattr(builder, method)(*args)
    assert builder.get_operations() == []


@pytest.mark.parametrize("list_type,prefix", [
    ("ipv4", "0.0.0.0/0"),
    ("ipv4", "192.0.2.0/24"),
    ("ipv4", "192.0.2.1/32"),
    ("ipv6", "::/0"),
    ("ipv6", "2001:db8:0:1::/64"),
    ("ipv6", "2001:db8::1/128"),
])
def test_lab_prefixes_are_accepted(list_type, prefix):
    builder = PrefixListBatchBuilder("1.4").set_rule_prefix(list_type, "PL", "1", prefix)
    assert builder.get_operations()[0]["path"][-1] == prefix


def test_lab_bounds_are_accepted():
    builder = PrefixListBatchBuilder("1.4")
    builder.create_rule("ipv4", "a-B_9", "1").create_rule("ipv4", "a-B_9", "65535")
    builder.set_rule_ge("ipv4", "PL", "1", "0").set_rule_le("ipv6", "PL", "1", "128")
    builder.set_rule_description("ipv4", "PL", "1", "x" * DESCRIPTION_MAX_LENGTH)
    assert len(builder.get_operations()) == 5


def test_restore_rule_recreates_every_leaf():
    tree = {"action": "deny", "description": "d", "prefix": "10.0.0.0/8", "ge": "16", "le": "24"}
    builder = PrefixListBatchBuilder("1.5").restore_rule("ipv4", "PL", "20", tree)
    base = V4 + ["rule", "20"]
    assert [o["path"] for o in builder.get_operations()] == [
        base,
        base + ["action", "deny"],
        base + ["description", "d"],
        base + ["prefix", "10.0.0.0/8"],
        base + ["ge", "16"],
        base + ["le", "24"],
    ]


def test_capabilities_do_not_branch_on_version():
    caps = {v: PrefixListBatchBuilder(v).get_capabilities() for v in VERSIONS}
    for caps_v in caps.values():
        caps_v.pop("version")
    assert caps["1.4"] == caps["1.5"] == caps["2026.09.23-0027-rolling"]
    assert "version_info" not in caps["1.5"]
    assert caps["1.5"]["ranges"] is RANGES
    assert caps["1.5"]["values"] == {"rule_actions": ["permit", "deny"]}
    assert caps["1.5"]["description_max_length"] == 255


def test_ranges_match_the_lab():
    assert RANGES == {
        "rule": {"min": 1, "max": 65535},
        "prefix_length_ipv4": {"min": 0, "max": 32},
        "prefix_length_ipv6": {"min": 0, "max": 128},
    }
