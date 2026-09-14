"""Appliance restore preview and restore both refuse fleet backups."""

import ast
from pathlib import Path


def test_preview_and_restore_call_fleet_guard():
    src = Path(__file__).resolve().parents[1] / "routers" / "session" / "session.py"
    tree = ast.parse(src.read_text())
    needed = {"preview_restore", "restore_backup"}
    found = set()
    for node in ast.walk(tree):
        if isinstance(node, ast.AsyncFunctionDef) and node.name in needed:
            assert "fleet_restore_error" in ast.unparse(node), node.name
            found.add(node.name)
    assert found == needed
