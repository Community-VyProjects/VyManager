"""Flowtable routes driven through the handlers with a stub service.

execute_batch and get_full_config run through run_in_threadpool (locked in
test_batch_off_event_loop.py). These tests check the config payload, the
emitted ops, and the 400/422/500 paths.
"""

import inspect
from types import SimpleNamespace

import pytest
from fastapi import FastAPI, HTTPException
from fastapi.testclient import TestClient

from vyos_builders.firewall.flowtables import FlowtablesBatchBuilder

MODULE = "routers.firewall.flowtables"
BASE = ["firewall", "flowtable", "FT1"]


def flowtables_client(monkeypatch, version, full_config=None, commit=None):
    """Return (client, executed); executed holds one [(op, path), ...] per commit."""
    executed = []
    if commit is None:
        commit = {"status": 200, "error": None}

    async def allow(*_args, **_kwargs):
        return None

    class Service:
        def get_version(self):
            return version

        def get_full_config(self, refresh=False):
            return full_config or {}

        def execute_batch(self, batch):
            if batch.is_empty():
                raise ValueError("Cannot execute empty batch")
            executed.append([(item["op"], item["path"]) for item in batch.get_operations()])
            return SimpleNamespace(status=commit["status"], result="", error=commit["error"])

    monkeypatch.setattr(f"{MODULE}.require_read_permission", allow)
    monkeypatch.setattr(f"{MODULE}.require_write_permission", allow)
    monkeypatch.setattr(f"{MODULE}.get_session_vyos_service", lambda _req: Service())

    router = __import__(MODULE, fromlist=["router"]).router
    app = FastAPI()
    app.include_router(router)
    return TestClient(app), executed


@pytest.fixture
def commit():
    return {"status": 200, "error": None}


@pytest.fixture
def client(monkeypatch, commit):
    return flowtables_client(monkeypatch, "1.4", commit=commit)


def _batch(test_client, operations, name="FT1"):
    return test_client.post(
        "/vyos/firewall/flowtables/batch",
        json={"flowtable_name": name, "operations": operations},
    )


@pytest.mark.parametrize("version", ["1.4", "1.5"])
def test_capabilities_returns_offload_types(monkeypatch, version):
    test_client, _executed = flowtables_client(monkeypatch, version)
    resp = test_client.get("/vyos/firewall/flowtables/capabilities")
    assert resp.status_code == 200, resp.text
    assert resp.json()["offload_types"] == ["software", "hardware"]


def test_config_returns_parsed_flowtables(monkeypatch):
    tree = {
        "firewall": {
            "flowtable": {
                "FT1": {
                    "description": "LAN",
                    "interface": ["eth0", "eth1"],
                    "offload": "hardware",
                },
                "FT2": {"interface": "eth2"},
            }
        }
    }
    test_client, _executed = flowtables_client(monkeypatch, "1.5", full_config=tree)
    resp = test_client.get("/vyos/firewall/flowtables/config")
    assert resp.status_code == 200, resp.text
    assert resp.json() == {
        "flowtables": [
            {"name": "FT1", "description": "LAN", "interfaces": ["eth0", "eth1"], "offload": "hardware"},
            {"name": "FT2", "description": None, "interfaces": ["eth2"], "offload": None},
        ],
        "total": 2,
    }


@pytest.mark.parametrize("tree", [{}, {"firewall": {}}, {"firewall": {"flowtable": {}}}])
def test_config_without_flowtables_is_empty(monkeypatch, tree):
    test_client, _executed = flowtables_client(monkeypatch, "1.4", full_config=tree)
    resp = test_client.get("/vyos/firewall/flowtables/config")
    assert resp.status_code == 200, resp.text
    assert resp.json() == {"flowtables": [], "total": 0}


def test_batch_passes_name_and_value(client):
    test_client, executed = client
    resp = _batch(test_client, [
        {"op": "set_flowtable"},
        {"op": "set_flowtable_description", "value": "LAN, edge|core"},
        {"op": "set_flowtable_interface", "value": "eth0"},
        {"op": "delete_flowtable_interface", "value": "eth1"},
        {"op": "set_flowtable_offload", "value": "software"},
        {"op": "delete_flowtable_offload"},
    ])
    assert resp.status_code == 200, resp.text
    assert resp.json() == {"success": True, "data": {"message": "Configuration updated"}, "error": None}
    assert executed == [[
        ("set", BASE),
        ("set", BASE + ["description", "LAN, edge|core"]),
        ("set", BASE + ["interface", "eth0"]),
        ("delete", BASE + ["interface", "eth1"]),
        ("set", BASE + ["offload", "software"]),
        ("delete", BASE + ["offload"]),
    ]]


def test_builder_ops_take_the_name_and_at_most_one_value():
    """The handler binds flowtable_name first and the value second, nothing more."""
    builder = FlowtablesBatchBuilder(version="1.5")
    ops = [
        (name, member)
        for name, member in inspect.getmembers(builder, inspect.ismethod)
        if name.startswith(("set_", "delete_", "create_"))
    ]
    assert ops
    for name, method in ops:
        params = list(inspect.signature(method).parameters)
        assert params[0] == "name", name
        assert len(params) in (1, 2), name


@pytest.mark.parametrize("op", [
    "set_flowtable",
    "delete_flowtable",
    "delete_flowtable_description",
    "delete_flowtable_offload",
])
def test_batch_value_on_name_only_op_is_400(client, op):
    """A dropped value would run the wider op (delete the flowtable, not one leaf)."""
    test_client, executed = client
    resp = _batch(test_client, [{"op": op, "value": "x"}])
    assert resp.status_code == 400, resp.text
    assert resp.json()["detail"] == f"Operation {op} takes no value"
    assert executed == []


@pytest.mark.parametrize("operation", [
    {"op": "set_flowtable_interface"},
    {"op": "set_flowtable_interface", "value": None},
    {"op": "set_flowtable_offload", "value": ""},
    {"op": "delete_flowtable_interface", "value": "  "},
])
def test_batch_missing_value_is_400(client, operation):
    """A delete_flowtable_interface with no value is not a TypeError 500."""
    test_client, executed = client
    resp = _batch(test_client, [operation])
    assert resp.status_code == 400, resp.text
    assert resp.json()["detail"] == f"Operation {operation['op']} requires a value"
    assert executed == []


def test_batch_unknown_op_is_400(client):
    test_client, executed = client
    resp = _batch(test_client, [{"op": "no_such_op", "value": "x"}])
    assert resp.status_code == 400, resp.text
    assert resp.json()["detail"] == "Unknown operation: no_such_op"
    assert executed == []


@pytest.mark.parametrize("op", ["clear", "operation_count", "_operations", "add_set"])
def test_batch_internal_op_is_400(client, op):
    test_client, executed = client
    resp = _batch(test_client, [{"op": op}])
    assert resp.status_code == 400, resp.text
    assert resp.json()["detail"] == f"Invalid operation: {op}"
    assert executed == []


def test_batch_rejects_empty_name(client):
    test_client, executed = client
    resp = _batch(test_client, [{"op": "set_flowtable"}], name="")
    assert resp.status_code == 422, resp.text
    assert executed == []


def test_batch_empty_returns_success_without_commit(client):
    test_client, executed = client
    resp = _batch(test_client, [])
    assert resp.status_code == 200, resp.text
    assert resp.json() == {"success": True, "data": {"message": "No operations to execute"}, "error": None}
    assert executed == []


def test_batch_execute_value_error_is_500(client, monkeypatch):
    """A ValueError from execute_batch on a non-empty batch is not a client 400."""
    test_client, executed = client

    def broken(_req):
        class Service:
            def get_version(self):
                return "1.4"

            def execute_batch(self, _batch):
                raise ValueError("boom")

        return Service()

    monkeypatch.setattr(f"{MODULE}.get_session_vyos_service", broken)
    resp = _batch(test_client, [{"op": "set_flowtable"}])
    assert resp.status_code == 500, resp.text
    assert resp.json()["detail"] == "Internal server error"


@pytest.mark.parametrize("status, error", [(400, "Commit failed"), (200, "set failed")])
def test_batch_rejected_commit_reports_failure(client, commit, status, error):
    test_client, executed = client
    commit.update(status=status, error=error)
    resp = _batch(test_client, [{"op": "set_flowtable"}])
    assert resp.status_code == 200, resp.text
    assert resp.json() == {"success": False, "data": None, "error": error}
    assert executed == [[("set", BASE)]]


def test_delete_commits_the_flowtable(client):
    test_client, executed = client
    resp = test_client.delete("/vyos/firewall/flowtables/FT1")
    assert resp.status_code == 200, resp.text
    assert resp.json() == {"success": True, "data": None, "error": None}
    assert executed == [[("delete", BASE)]]


@pytest.mark.parametrize("status, error", [(400, "Commit failed"), (200, "delete failed")])
def test_delete_rejected_commit_reports_failure(client, commit, status, error):
    test_client, executed = client
    commit.update(status=status, error=error)
    resp = test_client.delete("/vyos/firewall/flowtables/FT1")
    assert resp.status_code == 200, resp.text
    assert resp.json() == {"success": False, "data": None, "error": error}


@pytest.mark.parametrize("method, path, payload", [
    ("get", "/vyos/firewall/flowtables/capabilities", None),
    ("get", "/vyos/firewall/flowtables/config", None),
    ("post", "/vyos/firewall/flowtables/batch", {
        "flowtable_name": "FT1", "operations": [{"op": "set_flowtable"}],
    }),
    ("delete", "/vyos/firewall/flowtables/FT1", None),
], ids=["capabilities", "config", "batch", "delete"])
def test_session_400_passes_through(client, monkeypatch, method, path, payload):
    """A session lookup 400 is not turned into a 500 by the catch-all."""
    test_client, executed = client

    def no_session(_request):
        raise HTTPException(status_code=400, detail="No active VyOS session")

    monkeypatch.setattr(f"{MODULE}.get_session_vyos_service", no_session)
    if method == "post":
        resp = test_client.post(path, json=payload)
    else:
        resp = getattr(test_client, method)(path)
    assert resp.status_code == 400, resp.text
    assert resp.json()["detail"] == "No active VyOS session"
    assert executed == []


@pytest.mark.parametrize("method, path", [
    ("get", "/vyos/firewall/flowtables/capabilities"),
    ("get", "/vyos/firewall/flowtables/config"),
    ("delete", "/vyos/firewall/flowtables/FT1"),
], ids=["capabilities", "config", "delete"])
def test_unexpected_error_is_logged_500(client, monkeypatch, method, path):
    """The catch-all logs through the module logger, not a NameError."""
    test_client, _executed = client

    def broken(_request):
        raise RuntimeError("boom")

    monkeypatch.setattr(f"{MODULE}.get_session_vyos_service", broken)
    resp = getattr(test_client, method)(path)
    assert resp.status_code == 500, resp.text
    assert resp.json()["detail"] == "Internal server error"
