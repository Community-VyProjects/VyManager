"""Golden (method, args, expected_path) cases for AsPathListBatchBuilder.

Paths checked with validateTmplPath on 1.4 (100.64.64.50) and 1.5 (100.64.64.5).
"""

import pytest

from vyos_builders.as_path_list.as_path_list import AsPathListBatchBuilder

CASES = [
    (
        "set_as_path_list",
        ("ASPATH1",),
        "set",
        ["policy", "as-path-list", "ASPATH1"],
    ),
    (
        "delete_as_path_list",
        ("ASPATH1",),
        "delete",
        ["policy", "as-path-list", "ASPATH1"],
    ),
    (
        "set_as_path_list_description",
        ("ASPATH1", "core peers"),
        "set",
        ["policy", "as-path-list", "ASPATH1", "description", "core peers"],
    ),
    (
        "delete_as_path_list_description",
        ("ASPATH1",),
        "delete",
        ["policy", "as-path-list", "ASPATH1", "description"],
    ),
    (
        "set_rule",
        ("ASPATH1", "10"),
        "set",
        ["policy", "as-path-list", "ASPATH1", "rule", "10"],
    ),
    (
        "delete_rule",
        ("ASPATH1", "10"),
        "delete",
        ["policy", "as-path-list", "ASPATH1", "rule", "10"],
    ),
    (
        "set_rule_action",
        ("ASPATH1", "10", "permit"),
        "set",
        ["policy", "as-path-list", "ASPATH1", "rule", "10", "action", "permit"],
    ),
    (
        "set_rule_description",
        ("ASPATH1", "10", "match transit"),
        "set",
        ["policy", "as-path-list", "ASPATH1", "rule", "10", "description", "match transit"],
    ),
    (
        "delete_rule_description",
        ("ASPATH1", "10"),
        "delete",
        ["policy", "as-path-list", "ASPATH1", "rule", "10", "description"],
    ),
    (
        "set_rule_regex",
        ("ASPATH1", "10", "_65000_"),
        "set",
        ["policy", "as-path-list", "ASPATH1", "rule", "10", "regex", "_65000_"],
    ),
    (
        "delete_rule_regex",
        ("ASPATH1", "10"),
        "delete",
        ["policy", "as-path-list", "ASPATH1", "rule", "10", "regex"],
    ),
]


@pytest.mark.parametrize("method, args, op, expected_path", CASES)
@pytest.mark.parametrize("version", ["1.4", "1.5"])
def test_as_path_list_builder_paths(method, args, op, expected_path, version):
    builder = AsPathListBatchBuilder(version=version)
    getattr(builder, method)(*args)
    ops = builder.get_operations()
    assert [(item["op"], item["path"]) for item in ops] == [(op, expected_path)]
