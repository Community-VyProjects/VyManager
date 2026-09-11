"""POST /vyos/config/save must not take a client-supplied file path (#593)."""

import ast
from pathlib import Path

CONFIG_ROUTER = Path(__file__).resolve().parents[1] / "routers" / "config" / "config.py"


def test_save_config_has_no_file_parameter():
    tree = ast.parse(CONFIG_ROUTER.read_text())
    save = None
    for node in ast.walk(tree):
        if isinstance(node, ast.AsyncFunctionDef) and node.name == "save_config":
            save = node
            break
    assert save is not None
    arg_names = [arg.arg for arg in save.args.args]
    assert "file" not in arg_names
    for node in ast.walk(save):
        if isinstance(node, ast.Call):
            for kw in node.keywords:
                assert kw.arg != "file", "save_config must not pass file= to VyOS"
