"""Config router handlers must check FeatureGroup.CONFIGURATION (#592).

Snapshot, diff, save, discard, and commit-confirm already called
require_*_permission. POST /refresh pulled the full device config with
no check. These tests parse the router source so a missing call fails
without a database or a device.
"""

import ast
from pathlib import Path

CONFIG_ROUTER = Path(__file__).resolve().parents[1] / "routers" / "config" / "config.py"

GATED_HANDLERS = {
    "get_config_snapshot": "require_read_permission",
    "get_config_diff": "require_read_permission",
    "save_config": "require_write_permission",
    "discard_config": "require_write_permission",
    "refresh_config": "require_read_permission",
    "get_commit_confirm_status": "require_read_permission",
    "confirm_commit": "require_write_permission",
}


def _permission_calls(func_node):
    calls = set()
    for node in ast.walk(func_node):
        if isinstance(node, ast.Call):
            name = getattr(node.func, "id", None) or getattr(node.func, "attr", None)
            if name and name.startswith("require_"):
                calls.add(name)
    return calls


def test_config_handlers_call_their_permission_check():
    tree = ast.parse(CONFIG_ROUTER.read_text())
    handlers = {
        node.name: node
        for node in ast.walk(tree)
        if isinstance(node, (ast.AsyncFunctionDef, ast.FunctionDef))
    }
    for handler, required_call in GATED_HANDLERS.items():
        assert handler in handlers, f"handler {handler} not found"
        calls = _permission_calls(handlers[handler])
        assert required_call in calls, (
            f"config.py:{handler} must call {required_call} — "
            "a missing check lets a user without CONFIGURATION through"
        )
