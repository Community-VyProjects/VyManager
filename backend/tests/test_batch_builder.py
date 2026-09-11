"""Shared BatchBuilder owns set/delete op list plumbing."""

import ast
from pathlib import Path

from vyos_builders.base import BatchBuilder
from vyos_builders.rip.rip_batch_builder import RipBatchBuilder

CORE = frozenset({"add_set", "add_delete", "get_operations", "is_empty"})
BUILDERS_ROOT = Path(__file__).resolve().parents[1] / "vyos_builders"


def test_empty_path_is_not_recorded():
    builder = BatchBuilder("1.5")
    builder.add_set([]).add_delete([])
    assert builder.is_empty()
    assert builder.get_operations() == []


def test_add_set_and_delete_copy_ops():
    builder = BatchBuilder("1.4")
    path = ["protocols", "ospf"]
    assert builder.add_set(path) is builder
    builder.add_delete(path)
    ops = builder.get_operations()
    assert ops == [
        {"op": "set", "path": path},
        {"op": "delete", "path": path},
    ]
    ops.append({"op": "set", "path": ["tamper"]})
    assert builder.get_operations() == [
        {"op": "set", "path": path},
        {"op": "delete", "path": path},
    ]


def test_feature_builder_inherits_plumbing():
    builder = RipBatchBuilder("1.5")
    assert isinstance(builder, BatchBuilder)
    assert builder.is_empty()
    builder.set_network("10.0.0.0/8")
    ops = builder.get_operations()
    assert len(ops) == 1
    assert ops[0]["op"] == "set"
    assert "10.0.0.0/8" in ops[0]["path"]


def test_feature_builders_do_not_redefine_ops_plumbing():
    offenders = []
    for path in BUILDERS_ROOT.rglob("*.py"):
        if path.name == "base.py":
            continue
        tree = ast.parse(path.read_text())
        for node in ast.walk(tree):
            if not isinstance(node, ast.ClassDef):
                continue
            for item in node.body:
                if isinstance(item, ast.FunctionDef) and item.name in CORE:
                    offenders.append(f"{path.relative_to(BUILDERS_ROOT)}:{node.name}.{item.name}")
    assert offenders == []
