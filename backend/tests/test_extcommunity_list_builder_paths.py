"""Golden (method, args, expected_path) cases for ExtCommunityListBatchBuilder.

Paths checked with validateTmplPath on 1.4 (100.64.64.50) and 1.5 (100.64.64.5).
Every valueless set_* leaf has a matching delete_*.
"""

import pytest

from vyos_builders.extcommunity_list.extcommunity_list import (
    ExtCommunityListBatchBuilder,
)


NAME = "CUSTOM"
RULE = "10"
BASE = ["policy", "extcommunity-list", NAME]
NODE = BASE + ["rule", RULE]

CASES = [
    ("set_extcommunity_list", (NAME,), "set", BASE),
    ("delete_extcommunity_list", (NAME,), "delete", BASE),
    ("set_extcommunity_list_description", (NAME, "transit-peers"), "set", BASE + ["description", "transit-peers"]),
    ("delete_extcommunity_list_description", (NAME,), "delete", BASE + ["description"]),
    ("set_rule", (NAME, RULE), "set", NODE),
    ("delete_rule", (NAME, RULE), "delete", NODE),
    ("set_rule_action", (NAME, RULE, "permit"), "set", NODE + ["action", "permit"]),
    ("set_rule_description", (NAME, RULE, "allow-transit"), "set", NODE + ["description", "allow-transit"]),
    ("delete_rule_description", (NAME, RULE), "delete", NODE + ["description"]),
    ("set_rule_regex", (NAME, RULE, "RT:65000:.*"), "set", NODE + ["regex", "RT:65000:.*"]),
    ("delete_rule_regex", (NAME, RULE), "delete", NODE + ["regex"]),
]


@pytest.mark.parametrize("method, args, op, expected_path", CASES)
@pytest.mark.parametrize("version", ["1.4", "1.5"])
def test_extcommunity_list_builder_paths(method, args, op, expected_path, version):
    builder = ExtCommunityListBatchBuilder(version=version)
    getattr(builder, method)(*args)
    operations = builder.get_operations()
    assert [(item["op"], item["path"]) for item in operations] == [(op, expected_path)]
