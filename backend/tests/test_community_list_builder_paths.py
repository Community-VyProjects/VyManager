"""Golden (method, args, expected_path) cases for CommunityListBatchBuilder."""

import pytest

from vyos_builders.community_list.community_list import CommunityListBatchBuilder


NAME = "CUSTOM"
RULE = "10"

CASES = [
    ("set_community_list", (NAME,), "set", ["policy", "community-list", NAME]),
    ("delete_community_list", (NAME,), "delete", ["policy", "community-list", NAME]),
    ("set_community_list_description", (NAME, "transit peers"), "set", ["policy", "community-list", NAME, "description", "transit peers"]),
    ("delete_community_list_description", (NAME,), "delete", ["policy", "community-list", NAME, "description"]),
    ("set_rule", (NAME, RULE), "set", ["policy", "community-list", NAME, "rule", RULE]),
    ("delete_rule", (NAME, RULE), "delete", ["policy", "community-list", NAME, "rule", RULE]),
    ("set_rule_action", (NAME, RULE, "permit"), "set", ["policy", "community-list", NAME, "rule", RULE, "action", "permit"]),
    ("set_rule_description", (NAME, RULE, "allow transit"), "set", ["policy", "community-list", NAME, "rule", RULE, "description", "allow transit"]),
    ("delete_rule_description", (NAME, RULE), "delete", ["policy", "community-list", NAME, "rule", RULE, "description"]),
    ("set_rule_regex", (NAME, RULE, "65000:.*"), "set", ["policy", "community-list", NAME, "rule", RULE, "regex", "65000:.*"]),
    ("delete_rule_regex", (NAME, RULE), "delete", ["policy", "community-list", NAME, "rule", RULE, "regex"]),
]


@pytest.mark.parametrize("method, args, op, expected_path", CASES)
@pytest.mark.parametrize("version", ["1.4", "1.5"])
def test_community_list_builder_paths(method, args, op, expected_path, version):
    builder = CommunityListBatchBuilder(version=version)
    getattr(builder, method)(*args)
    operations = builder.get_operations()
    assert [(item["op"], item["path"]) for item in operations] == [(op, expected_path)]