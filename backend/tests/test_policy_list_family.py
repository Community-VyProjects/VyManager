"""Policy community-list families share one implementation (issue #663)."""

from pathlib import Path

import pytest

from vyos_builders.community_list.community_list_batch_builder import CommunityListBatchBuilder
from vyos_builders.extcommunity_list.extcommunity_list_batch_builder import ExtCommunityListBatchBuilder
from vyos_builders.large_community_list.large_community_list_batch_builder import LargeCommunityListBatchBuilder
from vyos_builders.policy_list import PolicyListBatchBuilder
from vyos_mappers.base import CommandMapperRegistry
from vyos_mappers.policy_list import KIND_SPEC, POLICY_LIST_KINDS, PolicyListMapper
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
    getattr(builder, delete_op)(NAME)
    builder.set_rule_regex(NAME, RULE, "65000:.*")
    assert builder.get_operations() == [
        {"op": "set", "path": ["policy", kind, NAME]},
        {"op": "delete", "path": ["policy", kind, NAME]},
        {"op": "set", "path": ["policy", kind, NAME, "rule", RULE, "regex", "65000:.*"]},
    ]


@pytest.mark.parametrize("kind", list(BUILDERS))
@pytest.mark.parametrize("version", ["1.4", "1.5"])
def test_builder_loads_the_family_mapper_from_the_registry(monkeypatch, kind, version):
    calls = []
    real_get_mapper = CommandMapperRegistry.get_mapper

    def spy(feature, ver):
        calls.append((feature, ver))
        return real_get_mapper(feature, ver)

    monkeypatch.setattr(CommandMapperRegistry, "get_mapper", spy)
    builder = BUILDERS[kind][0](version=version)

    assert calls == [(KIND_SPEC[kind]["ident"], version)]
    assert isinstance(builder.mapper, PolicyListMapper)
    assert builder.mapper.kind == kind


def test_builders_use_the_batch_builder_filenames():
    root = Path(__file__).resolve().parents[1] / "vyos_builders"
    assert not (root / "policy_list.py").exists()
    assert (root / "policy_list" / "policy_list_batch_builder.py").is_file()
    for ident in ("community_list", "extcommunity_list", "large_community_list"):
        assert not (root / ident / f"{ident}.py").exists()
        assert (root / ident / f"{ident}_batch_builder.py").is_file()
    source = (root / "policy_list" / "policy_list_batch_builder.py").read_text()
    assert "PolicyListMapper(" not in source


def test_operations_vocab_uses_family_op_names_not_generic_list():
    from routers.policy_list.policy_list import KIND_BUILDER

    for kind, (cls, set_op, delete_op) in BUILDERS.items():
        assert KIND_BUILDER[kind] is cls
        ops = {item["op"] for item in describe_batch_builder(cls, max_args=5)}
        assert set_op in ops
        assert delete_op in ops
        assert "set_list" not in ops
        builder = KIND_BUILDER[kind]("1.5")
        resolve_batch_method(builder, set_op)
        with pytest.raises(HTTPException):
            resolve_batch_method(builder, "set_list")


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
        "vyos_builders/community_list/community_list_batch_builder.py",
        "vyos_builders/extcommunity_list/extcommunity_list_batch_builder.py",
        "vyos_builders/large_community_list/large_community_list_batch_builder.py",
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
