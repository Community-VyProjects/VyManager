"""Policy community-list families share one implementation (issue #663)."""

from pathlib import Path

import pytest

from vyos_builders.community_list.community_list import CommunityListBatchBuilder
from vyos_builders.extcommunity_list.extcommunity_list import ExtCommunityListBatchBuilder
from vyos_builders.large_community_list.large_community_list import LargeCommunityListBatchBuilder
from vyos_builders.policy_list import PolicyListBatchBuilder
from vyos_mappers.policy_list import POLICY_LIST_KINDS, PolicyListMapper
from routers.operations.operations import describe_batch_builder
from batch_dispatch import resolve_batch_method
from fastapi import HTTPException


NAME = "CUSTOM"
RULE = "10"

BUILDERS = {
    "community-list": (CommunityListBatchBuilder, "set_community_list", "delete_community_list"),
    "extcommunity-list": (ExtCommunityListBatchBuilder, "set_extcommunity_list", "delete_extcommunity_list"),
    "large-community-list": (LargeCommunityListBatchBuilder, "set_large_community_list", "delete_large_community_list"),
}


@pytest.mark.parametrize("kind", list(BUILDERS))
@pytest.mark.parametrize("version", ["1.4", "1.5"])
def test_policy_list_kind_paths(kind, version):
    cls, set_op, delete_op = BUILDERS[kind]
    builder = cls(version=version)
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


def test_operations_vocab_uses_family_op_names_not_generic_list():
    ops = {item["op"] for item in describe_batch_builder(CommunityListBatchBuilder, max_args=5)}
    assert "set_community_list" in ops
    assert "delete_community_list" in ops
    assert "set_list" not in ops
    assert "delete_list" not in ops
    with pytest.raises(HTTPException):
        resolve_batch_method(CommunityListBatchBuilder("1.5"), "set_list")


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
        assert len(lines) < 25, rel
    assert set(POLICY_LIST_KINDS) == {
        "community-list",
        "extcommunity-list",
        "large-community-list",
    }
