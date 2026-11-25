"""Input, loopback, SSTPC and VTI routers: registry mapper, 400 passthrough, batch off the loop.

Both labs have the same trees for these types, so GET /config loads the shared
class from ``CommandMapperRegistry`` for 1.4 and for the rolling 1.5 string. A
stub service records what the handlers send; the app middleware records the
event-loop thread so a device call made on it is caught.
"""

import ast
import importlib
import threading
from pathlib import Path
from types import SimpleNamespace

import pytest
from fastapi import FastAPI, HTTPException
from fastapi.testclient import TestClient

from vyos_builders.interfaces.input import InputInterfaceBuilderMixin
from vyos_builders.interfaces.loopback import LoopbackInterfaceBuilderMixin
from vyos_builders.interfaces.sstpc import SstpcInterfaceBuilderMixin
from vyos_builders.interfaces.vti import VtiInterfaceBuilderMixin

BACKEND = Path(__file__).resolve().parents[1]
ROLLING = "2026.09.23-0027-rolling"

# (module, url prefix, CLI type, sample name, service factory, builder, feature group)
ROUTERS = [
    ("input", "/vyos/input", "input", "ifb0", "create_input_batch",
     InputInterfaceBuilderMixin, "INPUT_IFACE"),
    ("loopback", "/vyos/loopback", "loopback", "lo", "create_loopback_batch",
     LoopbackInterfaceBuilderMixin, "LOOPBACK"),
    ("sstpc", "/vyos/sstpc", "sstpc", "sstpc0", "create_sstpc_batch",
     SstpcInterfaceBuilderMixin, "SSTPC"),
    ("vti", "/vyos/vti", "vti", "vti0", "create_vti_batch",
     VtiInterfaceBuilderMixin, "VTI"),
]
IDS = [row[0] for row in ROUTERS]


@pytest.fixture
def commit():
    return {"status": 200, "error": None, "version": "1.4"}


def _client(monkeypatch, commit, row, session=None, iface=None):
    module, _prefix, cli, name, factory, builder_cls, _group = row
    target = f"routers.interfaces.{module}"
    state = SimpleNamespace(executed=[], loop_threads=set(), device_threads=[], permissions=[])

    async def read(_req, feature):
        state.permissions.append(("read", feature.name))

    async def write(_req, feature):
        state.permissions.append(("write", feature.name))

    class Service:
        def get_version(self):
            return commit["version"]

        def get_full_config(self, refresh=False):
            state.device_threads.append(threading.current_thread())
            return {"interfaces": {cli: {name: iface or {"description": "lab"}}}}

        def execute_batch(self, batch):
            state.device_threads.append(threading.current_thread())
            if batch.is_empty():
                raise ValueError("Cannot execute empty batch")
            state.executed.append(batch.get_operations())
            return SimpleNamespace(status=commit["status"], result=None, error=commit["error"])

    setattr(Service, factory, lambda self: builder_cls(version=commit["version"]))

    monkeypatch.setattr(f"{target}.require_read_permission", read)
    monkeypatch.setattr(f"{target}.require_write_permission", write)
    monkeypatch.setattr(
        f"{target}.get_session_vyos_service", session or (lambda _req: Service())
    )

    router = importlib.import_module(target).router
    app = FastAPI()

    @app.middleware("http")
    async def record_loop(request, call_next):
        state.loop_threads.add(threading.current_thread())
        return await call_next(request)

    app.include_router(router)
    return app, state


@pytest.mark.parametrize("version", ["1.4.3", ROLLING])
@pytest.mark.parametrize("row", ROUTERS, ids=IDS)
def test_config_parses_through_the_registry_mapper(monkeypatch, commit, row, version):
    commit["version"] = version
    app, state = _client(monkeypatch, commit, row)
    _module, prefix, cli, name, *_rest, group = row
    with TestClient(app) as http:
        resp = http.get(f"{prefix}/config")
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert [(i["name"], i["description"]) for i in body["interfaces"]] == [(name, "lab")]
    assert body["total"] == 1
    assert state.permissions == [("read", group)]
    assert state.device_threads and not set(state.device_threads) & state.loop_threads


@pytest.mark.parametrize("row", ROUTERS, ids=IDS)
def test_batch_commits_off_the_event_loop(monkeypatch, commit, row):
    app, state = _client(monkeypatch, commit, row)
    _module, prefix, cli, name, *_rest, group = row
    with TestClient(app) as http:
        resp = http.post(f"{prefix}/batch", json={
            "interface": name,
            "operations": [{"op": "set_interface_description", "value": "uplink"}],
        })
    assert resp.status_code == 200, resp.text
    assert resp.json() == {"success": True, "data": None, "error": None}
    assert state.executed == [[
        {"op": "set", "path": ["interfaces", cli, name, "description", "uplink"]},
    ]]
    assert state.permissions == [("write", group)]
    assert len(state.loop_threads) == 1
    assert state.device_threads and not set(state.device_threads) & state.loop_threads


@pytest.mark.parametrize("row", ROUTERS, ids=IDS)
def test_failed_commit_reports_the_error(monkeypatch, commit, row):
    commit.update(status=400, error="Commit failed")
    app, _state = _client(monkeypatch, commit, row)
    _module, prefix, _cli, name, *_rest = row
    with TestClient(app) as http:
        resp = http.post(f"{prefix}/batch", json={
            "interface": name,
            "operations": [{"op": "delete_interface"}],
        })
    assert resp.status_code == 200, resp.text
    assert resp.json() == {"success": False, "data": None, "error": "Commit failed"}


@pytest.mark.parametrize("row", ROUTERS, ids=IDS)
def test_empty_batch_stays_a_500(monkeypatch, commit, row):
    app, _state = _client(monkeypatch, commit, row)
    _module, prefix, _cli, name, *_rest = row
    with TestClient(app, raise_server_exceptions=False) as http:
        resp = http.post(f"{prefix}/batch", json={"interface": name, "operations": []})
    assert resp.status_code == 500


@pytest.mark.parametrize("method, route", [
    ("get", "capabilities"),
    ("get", "config"),
    ("post", "batch"),
])
@pytest.mark.parametrize("row", ROUTERS, ids=IDS)
def test_session_lookup_400_survives(monkeypatch, commit, row, method, route):
    def no_session(_req):
        raise HTTPException(status_code=400, detail="No active VyOS session")

    app, _state = _client(monkeypatch, commit, row, session=no_session)
    _module, prefix, _cli, name, *_rest = row
    with TestClient(app) as http:
        if method == "get":
            resp = http.get(f"{prefix}/{route}")
        else:
            resp = http.post(f"{prefix}/{route}", json={"interface": name, "operations": []})
    assert resp.status_code == 400
    assert resp.json() == {"detail": "No active VyOS session"}


@pytest.mark.parametrize("auth, expected", [
    ({"username": "vyos", "password": "s3cret"}, {"username": "vyos", "password": "***"}),
    ({"username": "vyos"}, {"username": "vyos", "password": None}),
])
def test_sstpc_config_masks_the_password(monkeypatch, commit, auth, expected):
    row = ROUTERS[IDS.index("sstpc")]
    app, _state = _client(
        monkeypatch, commit, row,
        iface={"server": "vpn.example.com", "authentication": auth},
    )
    with TestClient(app) as http:
        resp = http.get("/vyos/sstpc/config")
    assert resp.status_code == 200, resp.text
    assert resp.json()["interfaces"][0]["authentication"] == expected
    assert "s3cret" not in resp.text


@pytest.mark.parametrize("row", ROUTERS, ids=IDS)
def test_handlers_import_nothing_and_skip_the_version_factory(row):
    """Imports sit at module top and the mapper comes from the registry."""
    source = (BACKEND / "routers" / "interfaces" / f"{row[0]}.py").read_text()
    tree = ast.parse(source)
    for node in ast.walk(tree):
        if isinstance(node, ast.AsyncFunctionDef):
            inner = [n for n in ast.walk(node) if isinstance(n, (ast.Import, ast.ImportFrom))]
            assert not inner, f"{node.name} imports inside the handler"
    assert "_versions" not in source
    assert f'CommandMapperRegistry.get_mapper("interface_{row[0]}"' in source
