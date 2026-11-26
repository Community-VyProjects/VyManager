"""PrefixListMapper.parse_config and the mapper registration."""

import inspect
from pathlib import Path
from typing import cast

from routers.prefix_list.prefix_list import PrefixListConfigResponse
from vyos_mappers import CommandMapperRegistry
from vyos_mappers.prefix_list.prefix_list import PrefixListMapper

VERSIONS = ("1.4", "1.5", "2026.09.23-0027-rolling")

TREE = {
    "policy": {
        "prefix-list": {
            "ZED": {"rule": {"5": {"action": "deny", "prefix": "0.0.0.0/0", "le": "32"}}},
            "CORP": {
                "description": "corp nets",
                "rule": {
                    "20": {"action": "permit", "prefix": "172.16.0.0/12"},
                    "10": {
                        "action": "deny",
                        "description": "lab",
                        "prefix": "10.0.0.0/8",
                        "ge": "16",
                        "le": "24",
                    },
                },
            },
        },
        "prefix-list6": {
            "V6": {"rule": {"1": {"action": "permit", "prefix": "2001:db8::/32", "ge": "48", "le": "64"}}},
            "EMPTY": {},
        },
    }
}


def _mapper(version="1.5") -> PrefixListMapper:
    return cast(PrefixListMapper, CommandMapperRegistry.get_mapper("prefix_list", version))


def _parse(tree):
    return _mapper().parse_config(tree)


def test_parse_config_every_leaf():
    parsed = _parse(TREE)
    assert parsed["total_ipv4"] == 2 and parsed["total_ipv6"] == 2
    corp, zed = parsed["ipv4_lists"]
    assert (corp["name"], zed["name"]) == ("CORP", "ZED")
    assert corp == {
        "name": "CORP",
        "list_type": "ipv4",
        "description": "corp nets",
        "rules": [
            {"rule_number": 10, "action": "deny", "description": "lab", "prefix": "10.0.0.0/8", "ge": 16, "le": 24},
            {"rule_number": 20, "action": "permit", "description": None, "prefix": "172.16.0.0/12", "ge": None, "le": None},
        ],
    }
    empty, v6 = parsed["ipv6_lists"]
    assert empty == {"name": "EMPTY", "list_type": "ipv6", "description": None, "rules": []}
    assert v6["rules"] == [
        {"rule_number": 1, "action": "permit", "description": None, "prefix": "2001:db8::/32", "ge": 48, "le": 64},
    ]
    # The router model takes the parse unchanged.
    assert PrefixListConfigResponse(**parsed).model_dump() == parsed


def test_absent_policy_is_the_same_shape_empty():
    empty = {"ipv4_lists": [], "ipv6_lists": [], "total_ipv4": 0, "total_ipv6": 0}
    assert _parse({}) == empty
    assert _parse({"policy": {}}) == empty
    assert _parse({"policy": {"prefix-list": {}}}) == empty


def test_bad_shapes_read_as_unset():
    tree = {"policy": {"prefix-list": {"A": {"rule": {"x": {}, "3": {"ge": "abc", "le": {}}}}}}}
    (only,) = _parse(tree)["ipv4_lists"]
    assert only["rules"] == [
        {"rule_number": 3, "action": None, "description": None, "prefix": None, "ge": None, "le": None},
    ]


def test_rule_trees():
    mapper = _mapper("1.4")
    trees = mapper.rule_trees(TREE, "ipv4", "CORP")
    assert trees is not None
    assert sorted(trees) == [10, 20]
    assert trees[20] == {"action": "permit", "prefix": "172.16.0.0/12"}
    assert mapper.rule_trees(TREE, "ipv6", "EMPTY") == {}
    assert mapper.rule_trees(TREE, "ipv6", "CORP") is None


def test_registry_returns_the_shared_mapper():
    for version in VERSIONS:
        assert type(CommandMapperRegistry.get_mapper("prefix_list", version)) is PrefixListMapper


def test_mapper_has_no_versions_package_or_pass_through_init():
    # A file check, not find_spec: a stale __pycache__/ left by the old package
    # still resolves as a namespace package.
    package = Path(inspect.getfile(PrefixListMapper)).parent
    assert not (package / "prefix_list_versions" / "__init__.py").exists()
    assert "__init__" not in PrefixListMapper.__dict__
    assert "parse_config" in PrefixListMapper.__dict__


def test_parse_reads_the_mapper_family_table():
    from vyos_mappers.prefix_list import config_parse
    from vyos_mappers.prefix_list.prefix_list import FAMILIES

    assert config_parse.FAMILIES is FAMILIES
    assert not hasattr(config_parse, "_FAMILIES")


def test_every_leaf_has_a_delete_path():
    mapper = PrefixListMapper("1.5")
    for leaf in ("action", "description", "prefix", "ge", "le"):
        path = getattr(mapper, f"get_rule_{leaf}_path")("ipv6", "PL", "1")
        assert path == ["policy", "prefix-list6", "PL", "rule", "1", leaf]
    assert mapper.get_prefix_list_description_path("ipv4", "PL") == ["policy", "prefix-list", "PL", "description"]
