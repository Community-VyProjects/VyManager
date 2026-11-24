"""Golden (method, args, expected_path) cases for LargeCommunityListBatchBuilder.

The large-community-list node.def tree is identical on 1.4 and 1.5.
"""

import inspect

import pytest

from vyos_builders.large_community_list.large_community_list_batch_builder import (
    LargeCommunityListBatchBuilder,
)


NAME = "CUSTOM"
RULE = "10"
BASE = ["policy", "large-community-list", NAME]
NODE = BASE + ["rule", RULE]

CASES = [
    ("set_large_community_list", (NAME,), "set", BASE),
    ("delete_large_community_list", (NAME,), "delete", BASE),
    ("set_large_community_list_description", (NAME, "transit-peers"), "set", BASE + ["description", "transit-peers"]),
    ("delete_large_community_list_description", (NAME,), "delete", BASE + ["description"]),
    ("set_rule", (NAME, RULE), "set", NODE),
    ("delete_rule", (NAME, RULE), "delete", NODE),
    ("set_rule_action", (NAME, RULE, "deny"), "set", NODE + ["action", "deny"]),
    ("set_rule_description", (NAME, RULE, "allow-transit"), "set", NODE + ["description", "allow-transit"]),
    ("delete_rule_description", (NAME, RULE), "delete", NODE + ["description"]),
    ("set_rule_regex", (NAME, RULE, "65000:100:.*"), "set", NODE + ["regex", "65000:100:.*"]),
    ("delete_rule_regex", (NAME, RULE), "delete", NODE + ["regex"]),
]


@pytest.mark.parametrize("method, args, op, expected_path", CASES)
@pytest.mark.parametrize("version", ["1.4", "1.5"])
def test_large_community_list_builder_paths(method, args, op, expected_path, version):
    builder = LargeCommunityListBatchBuilder(version=version)
    getattr(builder, method)(*args)
    operations = builder.get_operations()
    assert [(item["op"], item["path"]) for item in operations] == [(op, expected_path)]


def test_every_builder_op_has_a_case():
    ops = {
        name
        for name, _ in inspect.getmembers(LargeCommunityListBatchBuilder("1.5"), inspect.ismethod)
        if name.startswith(("set_", "delete_", "create_"))
    }
    assert ops == {case[0] for case in CASES}
