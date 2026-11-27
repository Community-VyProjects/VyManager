"""The commit-confirm 409 from execute_batch reaches the client as a 409.

execute_batch raises HTTPException(409) while a commit-confirm is pending on
the router. A handler whose try catches Exception without first re-raising
HTTPException turns that into a generic 500, and the page loses the "confirm
it or wait" message.
"""

import ast
import pathlib
from unittest.mock import MagicMock

import pytest
from fastapi import FastAPI, HTTPException
from fastapi.testclient import TestClient

ROLLING = "2026.09.23-0027-rolling"
PENDING = "A commit-confirm is pending on this router. Confirm it or wait 42 seconds for it to run out."
ROUTERS = pathlib.Path(__file__).resolve().parent.parent / "routers"

# (router module, path, body)
ROUTES = [
    (
        "routers.mpls.mpls",
        "/vyos/mpls/batch",
        {"operations": [{"op": "set_interface", "value": "eth1"}]},
    ),
    (
        "routers.igmp_proxy.igmp_proxy",
        "/vyos/igmp-proxy/batch",
        {"groups": [{"interface": "eth1", "operations": [{"op": "set_interface_role", "value": "upstream"}]}]},
    ),
    (
        "routers.as_path_list.as_path_list",
        "/vyos/as-path-list/reorder",
        {
            "as_path_list_name": "AP1",
            "rules": [{"old_number": 10, "new_number": 20, "rule_data": {"rule_number": 10, "action": "permit", "regex": "65000"}}],
        },
    ),
    ("routers.system.system", "/vyos/system/general", {"hostname": "r1"}),
    ("routers.system.system", "/vyos/system/login-settings", {"timeout": 600}),
    ("routers.system.system", "/vyos/system/watchdog-settings", {"timeout": 30}),
    (
        "routers.interfaces.ethernet",
        "/vyos/ethernet/batch",
        {"interface": "eth1", "operations": [{"op": "set_description", "value": "uplink"}]},
    ),
]
IDS = [f"{module}:{path}" for module, path, _body in ROUTES]


def client_for(monkeypatch, module, error):
    """A client for one router whose commit raises error."""
    calls = []

    async def allow(*_args, **_kwargs):
        return None

    class Service:
        def get_version(self):
            return ROLLING

        def create_ethernet_batch(self):
            return MagicMock()

        def execute_batch(self, batch):
            calls.append(batch)
            raise error

    monkeypatch.setattr(f"{module}.require_write_permission", allow)
    monkeypatch.setattr(f"{module}.get_session_vyos_service", lambda _req: Service())

    app = FastAPI()
    app.include_router(__import__(module, fromlist=["router"]).router)
    return TestClient(app, raise_server_exceptions=False), calls


@pytest.mark.parametrize("module,path,body", ROUTES, ids=IDS)
def test_pending_commit_confirm_is_a_409(monkeypatch, module, path, body):
    client, calls = client_for(monkeypatch, module, HTTPException(status_code=409, detail=PENDING))

    response = client.post(path, json=body)

    assert len(calls) == 1
    assert response.status_code == 409
    assert response.json() == {"detail": PENDING}


@pytest.mark.parametrize("module,path,body", ROUTES, ids=IDS)
def test_other_commit_errors_stay_a_generic_500(monkeypatch, module, path, body):
    client, calls = client_for(monkeypatch, module, RuntimeError("device said something private"))

    response = client.post(path, json=body)

    assert len(calls) == 1
    assert response.status_code == 500
    assert response.json() == {"detail": "Internal server error"}


def _names(node):
    found = set()
    for child in ast.walk(node):
        if isinstance(child, ast.Attribute):
            found.add(child.attr)
        elif isinstance(child, ast.Name):
            found.add(child.id)
    return found


def _handler_types(handler):
    if handler.type is None:
        return ["bare"]
    if isinstance(handler.type, ast.Tuple):
        return [ast.unparse(item) for item in handler.type.elts]
    return [ast.unparse(handler.type)]


def swallowing_commit_handlers():
    """Every try that commits and catches Exception before HTTPException."""
    found = []
    for path in sorted(ROUTERS.rglob("*.py")):
        tree = ast.parse(path.read_text())
        for function in ast.walk(tree):
            if not isinstance(function, (ast.FunctionDef, ast.AsyncFunctionDef)):
                continue
            for block in ast.walk(function):
                if not isinstance(block, ast.Try):
                    continue
                body_names = set().union(*(_names(statement) for statement in block.body))
                if not any(name.startswith("execute_batch") for name in body_names):
                    continue
                types = [name for handler in block.handlers for name in _handler_types(handler)]
                broad = [i for i, name in enumerate(types) if name in ("Exception", "BaseException", "bare")]
                if not broad:
                    continue
                passed = [i for i, name in enumerate(types) if name.endswith("HTTPException")]
                if passed and passed[0] < broad[0]:
                    continue
                handlers_source = "".join(ast.unparse(handler) for handler in block.handlers)
                if "isinstance" in handlers_source and "HTTPException" in handlers_source:
                    continue
                found.append(f"{path.relative_to(ROUTERS)}:{function.name}:{block.lineno}")
    return found


def test_no_router_catches_the_409_around_a_commit():
    assert swallowing_commit_handlers() == []
