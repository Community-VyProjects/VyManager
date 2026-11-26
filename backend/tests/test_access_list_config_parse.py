"""AccessListMapper.parse_config and the mapper registration."""

import inspect
from pathlib import Path
from typing import cast

from routers.access_list.access_list import AccessListConfigResponse
from vyos_mappers import CommandMapperRegistry
from vyos_mappers.access_list.access_list import AccessListMapper

VERSIONS = ("1.4", "1.5", "2026.09.23-0027-rolling")

UNSET_DESTINATION = {
    "destination_any": False,
    "destination_host": None,
    "destination_network": None,
    "destination_inverse_mask": None,
}

TREE = {
    "policy": {
        "access-list": {
            "100": {
                "description": "corp nets",
                "rule": {
                    "20": {
                        "action": "permit",
                        "source": {"network": "10.0.0.0", "inverse-mask": "0.0.0.255"},
                        "destination": {"network": "192.0.2.0", "inverse-mask": "0.0.0.63"},
                    },
                    "10": {
                        "action": "deny",
                        "description": "lab",
                        "source": {"host": "10.1.1.1"},
                        "destination": {"any": {}},
                    },
                },
            },
            "20": {"rule": {"5": {"action": "permit", "source": {"any": {}, "host": "10.0.0.9"}}}},
            "3": {},
        },
        "access-list6": {
            "V6": {
                "rule": {
                    "1": {"action": "permit", "source": {"network": "2001:db8::/32", "exact-match": {}}},
                    "2": {"action": "deny", "source": {"any": {}, "network": "2001:db8:1::/48"}},
                }
            },
            "EMPTY": {},
        },
    }
}


def _mapper(version="1.5") -> AccessListMapper:
    return cast(AccessListMapper, CommandMapperRegistry.get_mapper("access_list", version))


def _parse(tree):
    return _mapper().parse_config(tree)


def test_parse_config_every_leaf():
    parsed = _parse(TREE)
    assert parsed["total_ipv4"] == 3 and parsed["total_ipv6"] == 2
    # IPv4 lists sort numerically.
    assert [item["number"] for item in parsed["ipv4_lists"]] == ["3", "20", "100"]
    three, twenty, hundred = parsed["ipv4_lists"]
    assert three == {"number": "3", "list_type": "ipv4", "description": None, "rules": []}
    assert hundred == {
        "number": "100",
        "list_type": "ipv4",
        "description": "corp nets",
        "rules": [
            {
                "rule_number": 10,
                "action": "deny",
                "description": "lab",
                "source_any": False,
                "source_host": "10.1.1.1",
                "source_network": None,
                "source_inverse_mask": None,
                "source_exact_match": False,
                "destination_any": True,
                "destination_host": None,
                "destination_network": None,
                "destination_inverse_mask": None,
            },
            {
                "rule_number": 20,
                "action": "permit",
                "description": None,
                "source_any": False,
                "source_host": None,
                "source_network": "10.0.0.0",
                "source_inverse_mask": "0.0.0.255",
                "source_exact_match": False,
                "destination_any": False,
                "destination_host": None,
                "destination_network": "192.0.2.0",
                "destination_inverse_mask": "0.0.0.63",
            },
        ],
    }
    # Two source leaves the device holds together are both read.
    (rule5,) = twenty["rules"]
    assert (rule5["source_any"], rule5["source_host"]) == (True, "10.0.0.9")

    empty, v6 = parsed["ipv6_lists"]
    assert empty == {"number": "EMPTY", "list_type": "ipv6", "description": None, "rules": []}
    assert v6["rules"] == [
        {
            "rule_number": 1,
            "action": "permit",
            "description": None,
            "source_any": False,
            "source_host": None,
            "source_network": "2001:db8::/32",
            "source_inverse_mask": None,
            "source_exact_match": True,
            **UNSET_DESTINATION,
        },
        {
            "rule_number": 2,
            "action": "deny",
            "description": None,
            "source_any": True,
            "source_host": None,
            "source_network": "2001:db8:1::/48",
            "source_inverse_mask": None,
            "source_exact_match": False,
            **UNSET_DESTINATION,
        },
    ]
    # The router model takes the parse unchanged.
    assert AccessListConfigResponse(**parsed).model_dump() == parsed


def test_absent_policy_is_the_same_shape_empty():
    empty = {"ipv4_lists": [], "ipv6_lists": [], "total_ipv4": 0, "total_ipv6": 0}
    assert _parse({}) == empty
    assert _parse({"policy": {}}) == empty
    assert _parse({"policy": {"access-list": {}}}) == empty


def test_bad_shapes_read_as_unset():
    tree = {"policy": {"access-list": {"7": {"rule": {"x": {}, "3": {"source": "any", "destination": {"host": {}}}}}}}}
    (only,) = _parse(tree)["ipv4_lists"]
    assert only["rules"] == [
        {
            "rule_number": 3,
            "action": None,
            "description": None,
            "source_any": False,
            "source_host": None,
            "source_network": None,
            "source_inverse_mask": None,
            "source_exact_match": False,
            **UNSET_DESTINATION,
        },
    ]
    assert AccessListConfigResponse(**_parse(tree))


def test_rule_trees():
    mapper = _mapper("1.4")
    trees = mapper.rule_trees(TREE, "ipv4", "100")
    assert trees is not None
    assert sorted(trees) == [10, 20]
    assert trees[10]["destination"] == {"any": {}}
    assert mapper.rule_trees(TREE, "ipv6", "EMPTY") == {}
    assert mapper.rule_trees(TREE, "ipv6", "100") is None


def test_registry_returns_the_shared_mapper():
    for version in VERSIONS:
        assert type(CommandMapperRegistry.get_mapper("access_list", version)) is AccessListMapper


def test_mapper_has_no_versions_package_or_pass_through_init():
    # A file check, not find_spec: a stale __pycache__/ left by the old package
    # still resolves as a namespace package.
    package = Path(inspect.getfile(AccessListMapper)).parent
    assert not (package / "access_list_versions" / "__init__.py").exists()
    assert not (package / "access_list_versions" / "v1_4.py").exists()
    assert not (package / "access_list_versions" / "v1_5.py").exists()
    assert "__init__" not in AccessListMapper.__dict__
    assert "parse_config" in AccessListMapper.__dict__


def test_parse_reads_the_mapper_family_table():
    from vyos_mappers.access_list import config_parse
    from vyos_mappers.access_list.access_list import FAMILIES

    assert config_parse.FAMILIES is FAMILIES


def test_every_leaf_has_a_delete_path():
    mapper = AccessListMapper("1.5")
    for leaf in ("action", "description"):
        path = getattr(mapper, f"get_rule_{leaf}_path")("ipv6", "A", "1")
        assert path == ["policy", "access-list6", "A", "rule", "1", leaf]
    assert mapper.get_access_list_description_path("ipv4", "10") == ["policy", "access-list", "10", "description"]
    for endpoint in ("source", "destination"):
        for leaf in ("any", "host", "network", "inverse-mask"):
            path = mapper.get_rule_endpoint_leaf_path("ipv4", "10", "1", endpoint, leaf)
            assert path == ["policy", "access-list", "10", "rule", "1", endpoint, leaf]
    for leaf in ("any", "exact-match", "network"):
        path = mapper.get_rule_endpoint_leaf_path("ipv6", "A", "1", "source", leaf)
        assert path == ["policy", "access-list6", "A", "rule", "1", "source", leaf]
