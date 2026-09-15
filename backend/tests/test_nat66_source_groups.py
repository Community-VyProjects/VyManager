"""NAT66 source match groups are invalid on 1.4 and 1.5.

Destination groups stay on 1.5. Source groups must not be emitted or offered.
"""

from pathlib import Path

import pytest

from vyos_builders.nat66 import NAT66BatchBuilder
from vyos_mappers.nat66.nat66_versions.v1_5 import NAT66Mapper_v1_5

DIALOG = (
    Path(__file__).resolve().parents[2]
    / "frontend/src/components/network/NAT66RuleDialog.tsx"
)

SOURCE_GROUP_OPS = (
    "set_source_rule_source_group",
    "delete_source_rule_source_group",
    "set_destination_rule_source_group",
    "delete_destination_rule_source_group",
)

DEST_GROUP_CASES = [
    (
        "set_source_rule_destination_group",
        (10, "address-group", "FOO"),
        ["nat66", "source", "rule", "10", "destination", "group", "address-group", "FOO"],
    ),
    (
        "delete_source_rule_destination_group",
        (10, "address-group"),
        ["nat66", "source", "rule", "10", "destination", "group", "address-group"],
    ),
    (
        "set_destination_rule_destination_group",
        (10, "port-group", "WEB"),
        ["nat66", "destination", "rule", "10", "destination", "group", "port-group", "WEB"],
    ),
    (
        "delete_destination_rule_destination_group",
        (10, "port-group"),
        ["nat66", "destination", "rule", "10", "destination", "group", "port-group"],
    ),
]


@pytest.mark.parametrize("method, args, expected_path", DEST_GROUP_CASES)
def test_nat66_destination_group_paths_v1_5(method, args, expected_path):
    builder = NAT66BatchBuilder("1.5")
    getattr(builder, method)(*args)
    op = "delete" if method.startswith("delete_") else "set"
    operations = builder.get_operations()
    assert [(item["op"], item["path"]) for item in operations] == [(op, expected_path)]


@pytest.mark.parametrize("method", SOURCE_GROUP_OPS)
def test_nat66_builder_has_no_source_group_ops(method):
    builder = NAT66BatchBuilder("1.5")
    assert not hasattr(builder, method)


@pytest.mark.parametrize(
    "name",
    [
        "get_source_rule_source_group",
        "get_source_rule_source_group_path",
        "get_destination_rule_source_group",
        "get_destination_rule_source_group_path",
    ],
)
def test_nat66_v15_mapper_has_no_source_group_paths(name):
    mapper = NAT66Mapper_v1_5("1.5")
    assert not hasattr(mapper, name)


def test_nat66_dialog_drops_source_group_ops():
    text = DIALOG.read_text()
    for op in SOURCE_GROUP_OPS:
        assert op not in text
    assert "set_source_rule_destination_group" in text
    assert "set_destination_rule_destination_group" in text
    assert "nat66-source-group-radio" not in text
    assert "nat66-source-port-group-radio" not in text
