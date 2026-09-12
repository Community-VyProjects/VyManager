"""Policy community-list families share one implementation (issue #663)."""

from pathlib import Path

import pytest

from vyos_builders.community_list.community_list import CommunityListBatchBuilder
from vyos_builders.extcommunity_list.extcommunity_list import ExtCommunityListBatchBuilder
from vyos_builders.large_community_list.large_community_list import LargeCommunityListBatchBuilder
from vyos_builders.policy_list import PolicyListBatchBuilder
from vyos_mappers.policy_list import POLICY_LIST_KINDS, PolicyListMapper


NAME = "CUSTOM"
RULE = "10"

KINDS = [
    ("community-list", "set_community_list", "delete_community_list"),
    ("extcommunity-list", "set_extcommunity_list", "delete_extcommunity_list"),
    ("large-community-list", "set_large_community_list", "delete_large_community_list"),
]


@pytest.mark.parametrize("kind, set_op, delete_op", KINDS)
@pytest.mark.parametrize("version", ["1.4", "1.5"])
def test_policy_list_kind_paths(kind, set_op, delete_op, version):
    builder = PolicyListBatchBuilder(version=version, kind=kind)
    getattr(builder, set_op)(NAME)
    assert builder.get_operations() == [{"op": "set", "path": ["policy", kind, NAME]}]
    builder.clear()
    getattr(builder, delete_op)(NAME)
    assert builder.get_operations() == [{"op": "delete", "path": ["policy", kind, NAME]}]
    builder.clear()
    builder.set_rule_regex(NAME, RULE, "65000:.*")
    assert builder.get_operations() == [
        {"op": "set", "path": ["policy", kind, NAME, "rule", RULE, "regex", "65000:.*"]}
    ]


def test_thin_builders_are_family_wrappers():
    assert issubclass(CommunityListBatchBuilder, PolicyListBatchBuilder)
    assert issubclass(ExtCommunityListBatchBuilder, PolicyListBatchBuilder)
    assert issubclass(LargeCommunityListBatchBuilder, PolicyListBatchBuilder)
    assert CommunityListBatchBuilder("1.5").kind == "community-list"
    assert ExtCommunityListBatchBuilder("1.5").kind == "extcommunity-list"
    assert LargeCommunityListBatchBuilder("1.5").kind == "large-community-list"


def test_mapper_rejects_unknown_kind():
    with pytest.raises(ValueError):
        PolicyListMapper("1.5", "bogus-list")


def test_copied_modules_do_not_reimplement_the_stack():
    root = Path(__file__).resolve().parents[1]
    for rel in (
        "vyos_mappers/community_list/community_list.py",
        "vyos_mappers/extcommunity_list/extcommunity_list.py",
        "vyos_mappers/large_community_list/large_community_list.py",
        "vyos_builders/community_list/community_list.py",
        "vyos_builders/extcommunity_list/extcommunity_list.py",
        "vyos_builders/large_community_list/large_community_list.py",
        "routers/community_list/community_list.py",
        "routers/extcommunity_list/extcommunity_list.py",
        "routers/large_community_list/large_community_list.py",
    ):
        lines = (root / rel).read_text().splitlines()
        assert len(lines) < 20, rel
    assert set(POLICY_LIST_KINDS) == {
        "community-list",
        "extcommunity-list",
        "large-community-list",
    }
