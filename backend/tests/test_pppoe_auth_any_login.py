"""PPPoE server authentication any-login is 1.5-only.

1.5 accepts `service pppoe-server authentication any-login`; 1.4 rejects it.
Paths checked with validateTmplPath on 1.4 (100.64.64.50) and 1.5 (100.64.64.5).
"""

import ast
from pathlib import Path

import pytest

from vyos_builders.pppoe_server.pppoe_server_batch_builder import PPPoEServerBatchBuilder
from vyos_mappers.pppoe_server.pppoe_server import PPPoEServerMapper

REPO = Path(__file__).resolve().parents[2]
MODAL = REPO / "frontend/src/components/pppoe-server/AuthSettingsModal.tsx"
API = REPO / "frontend/src/lib/api/pppoe-server.ts"
ROUTER = REPO / "backend/routers/pppoe_server/pppoe_server.py"

PATH = ["service", "pppoe-server", "authentication", "any-login"]


def test_any_login_paths_v1_5():
    builder = PPPoEServerBatchBuilder(version="1.5")
    builder.set_auth_any_login("pppoe")
    builder.delete_auth_any_login("pppoe")
    operations = builder.get_operations()
    assert [(item["op"], item["path"]) for item in operations] == [
        ("set", PATH),
        ("delete", PATH),
    ]


def test_any_login_set_raises_on_v1_4():
    builder = PPPoEServerBatchBuilder(version="1.4")
    with pytest.raises(ValueError, match="not supported"):
        builder.set_auth_any_login("pppoe")


def test_any_login_delete_on_v1_4():
    builder = PPPoEServerBatchBuilder(version="1.4")
    builder.delete_auth_any_login("pppoe")
    operations = builder.get_operations()
    assert operations[0]["op"] == "delete"
    assert operations[0]["path"] == PATH


def test_capability_gated_to_v1_5():
    caps_15 = PPPoEServerBatchBuilder(version="1.5").get_capabilities()
    caps_14 = PPPoEServerBatchBuilder(version="1.4").get_capabilities()
    assert caps_15["features"]["auth_any_login"] is True
    assert caps_14["features"]["auth_any_login"] is False


def test_parse_any_login():
    mapper = PPPoEServerMapper(version="1.5")
    parsed = mapper.parse_config(
        {"service": {"pppoe-server": {"authentication": {"any-login": {}}}}}
    )
    assert parsed["authentication"]["any_login"] is True
    empty = mapper.parse_config({"service": {"pppoe-server": {"authentication": {}}}})
    assert empty["authentication"]["any_login"] is False


def test_auth_modal_gates_any_login():
    text = MODAL.read_text()
    assert 'id="pppoe-auth-any-login"' in text
    assert "features.auth_any_login" in text
    assert "VyOS 1." not in text
    assert "1.5+" not in text
    assert "1.4 only" not in text


def test_api_emits_any_login_ops():
    text = API.read_text()
    assert "set_auth_any_login" in text
    assert "delete_auth_any_login" in text


def test_pppoe_batch_handler_maps_value_error_to_http_400():
    tree = ast.parse(ROUTER.read_text())
    handler = next(
        node
        for node in ast.walk(tree)
        if isinstance(node, ast.AsyncFunctionDef) and node.name == "pppoe_batch_configure"
    )

    def _handler_names(exc):
        names = set()
        etype = exc.type
        if isinstance(etype, ast.Name):
            names.add(etype.id)
        elif isinstance(etype, ast.Tuple):
            names.update(e.id for e in etype.elts if isinstance(e, ast.Name))
        return names

    value_error_handlers = [
        h
        for h in ast.walk(handler)
        if isinstance(h, ast.ExceptHandler) and "ValueError" in _handler_names(h)
    ]
    assert value_error_handlers, "pppoe_batch_configure must catch ValueError"
    status_codes = set()
    for h in value_error_handlers:
        for node in ast.walk(h):
            if isinstance(node, ast.Call) and getattr(node.func, "id", None) == "HTTPException":
                for kw in node.keywords:
                    if kw.arg == "status_code" and isinstance(kw.value, ast.Constant):
                        status_codes.add(kw.value.value)
    assert 400 in status_codes, "ValueError must map to HTTP 400"
