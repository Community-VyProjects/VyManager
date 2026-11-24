"""Broadcast relay router: comma-split args, a value on a zero-arg op, missing values, failed commits.

A stub service records what the handler sends. Device calls must run off the
event loop: the app middleware records the loop thread and the stub compares
its own thread against it.
"""

import threading
from types import SimpleNamespace

import pytest
from fastapi import FastAPI, HTTPException
from fastapi.testclient import TestClient

ROUTER = "routers.broadcast_relay.broadcast_relay"
BASE = ["service", "broadcast-relay"]
ID5 = BASE + ["id", "5"]


@pytest.fixture
def commit():
    return {"status": 200, "error": None, "version": "1.4"}


@pytest.fixture
def client(monkeypatch, commit):
    executed = []
    loop_threads = set()
    device_threads = []
    permissions = []

    async def read(_req, feature):
        permissions.append(("read", feature))

    async def write(_req, feature):
        permissions.append(("write", feature))

    class Service:
        def get_version(self):
            return commit["version"]

        def get_full_config(self, refresh=False):
            device_threads.append(threading.current_thread())
            return {"service": {"broadcast-relay": {
                "id": {
                    "5": {
                        "address": "192.0.2.1",
                        "description": "wol",
                        "disable": {},
                        "interface": ["eth1", "eth0"],
                        "port": "9",
                    },
                },
            }}}

        def execute_batch(self, batch):
            device_threads.append(threading.current_thread())
            if batch.is_empty():
                raise ValueError("Cannot execute empty batch")
            executed.append(batch.get_operations())
            return SimpleNamespace(status=commit["status"], result="", error=commit["error"])

    monkeypatch.setattr(f"{ROUTER}.require_read_permission", read)
    monkeypatch.setattr(f"{ROUTER}.require_write_permission", write)
    monkeypatch.setattr(f"{ROUTER}.get_session_vyos_service", lambda _req: Service())

    from routers.broadcast_relay.broadcast_relay import router

    app = FastAPI()

    @app.middleware("http")
    async def record_loop(request, call_next):
        loop_threads.add(threading.current_thread())
        return await call_next(request)

    app.include_router(router)
    with TestClient(app) as test_client:
        yield SimpleNamespace(
            http=test_client,
            executed=executed,
            loop_threads=loop_threads,
            device_threads=device_threads,
            permissions=permissions,
        )


def _post(c, operations):
    return c.http.post("/vyos/broadcast-relay/batch", json={"operations": operations})


@pytest.mark.parametrize("version", ["1.4", "2026.09.23-0027-rolling"])
def test_batch_splits_values_onto_builder_args(client, commit, version):
    commit["version"] = version
    resp = _post(client, [
        {"op": "set_global_disable"},
        {"op": "set_instance", "value": "5"},
        {"op": "set_instance_address", "value": "5,192.0.2.1"},
        {"op": "set_instance_description", "value": "5,wake on lan"},
        {"op": "set_instance_disable", "value": "5"},
        {"op": "set_instance_interface", "value": "5,eth0"},
        {"op": "set_instance_port", "value": "5,9"},
        {"op": "delete_instance_interface", "value": "5,eth1"},
        {"op": "delete_instance_interfaces", "value": "5"},
        {"op": "delete_instance_address", "value": "5"},
        {"op": "delete_instance_description", "value": "5"},
        {"op": "delete_instance_disable", "value": "5"},
        {"op": "delete_instance_port", "value": "5"},
        {"op": "delete_instance", "value": "5"},
        {"op": "delete_global_disable"},
        {"op": "delete_broadcast_relay"},
    ])
    assert resp.status_code == 200, resp.text
    assert resp.json() == {
        "success": True,
        "data": {"message": "Broadcast Relay configuration updated"},
        "error": None,
    }
    assert client.executed == [[
        {"op": "set", "path": BASE + ["disable"]},
        {"op": "set", "path": ID5},
        {"op": "set", "path": ID5 + ["address", "192.0.2.1"]},
        {"op": "set", "path": ID5 + ["description", "wake on lan"]},
        {"op": "set", "path": ID5 + ["disable"]},
        {"op": "set", "path": ID5 + ["interface", "eth0"]},
        {"op": "set", "path": ID5 + ["port", "9"]},
        {"op": "delete", "path": ID5 + ["interface", "eth1"]},
        {"op": "delete", "path": ID5 + ["interface"]},
        {"op": "delete", "path": ID5 + ["address"]},
        {"op": "delete", "path": ID5 + ["description"]},
        {"op": "delete", "path": ID5 + ["disable"]},
        {"op": "delete", "path": ID5 + ["port"]},
        {"op": "delete", "path": ID5},
        {"op": "delete", "path": BASE + ["disable"]},
        {"op": "delete", "path": BASE},
    ]]
    assert client.permissions == [("write", "BROADCAST_RELAY")]


def test_last_arg_keeps_commas(client):
    resp = _post(client, [{"op": "set_instance_description", "value": "5,wol, lab"}])
    assert resp.status_code == 200, resp.text
    assert client.executed == [[
        {"op": "set", "path": ID5 + ["description", "wol, lab"]},
    ]]


def test_device_calls_run_off_the_event_loop(client):
    assert client.http.get("/vyos/broadcast-relay/config").status_code == 200
    assert _post(client, [{"op": "delete_global_disable"}]).status_code == 200
    assert len(client.device_threads) == 2
    assert client.loop_threads
    for thread in client.device_threads:
        assert thread not in client.loop_threads


def test_config_returns_the_parse(client):
    resp = client.http.get("/vyos/broadcast-relay/config")
    assert resp.status_code == 200, resp.text
    assert resp.json() == {
        "globally_disabled": False,
        "instances": [{
            "id": "5",
            "address": "192.0.2.1",
            "description": "wol",
            "disabled": True,
            "interfaces": ["eth0", "eth1"],
            "port": 9,
        }],
    }
    assert client.permissions == [("read", "BROADCAST_RELAY")]


def test_capabilities_require_read(client):
    resp = client.http.get("/vyos/broadcast-relay/capabilities")
    assert resp.status_code == 200, resp.text
    assert resp.json()["features"]["broadcast_relay"]["supported"] is True
    assert client.permissions == [("read", "BROADCAST_RELAY")]


@pytest.mark.parametrize("operation", [
    {"op": "set_instance"},
    {"op": "delete_instance", "value": ""},
    {"op": "set_instance_disable"},
    {"op": "delete_instance_port"},
    {"op": "delete_instance_interfaces", "value": ""},
    {"op": "set_instance_port"},
    {"op": "set_instance_interface", "value": ""},
])
def test_batch_missing_value_is_400(client, operation):
    """A missing value is 400, not a TypeError 500."""
    resp = _post(client, [operation])
    assert resp.status_code == 400, resp.text
    assert resp.json()["detail"] == f"Operation {operation['op']} requires a value"
    assert client.executed == []


@pytest.mark.parametrize("op", [
    "set_global_disable",
    "delete_global_disable",
    "delete_broadcast_relay",
])
def test_batch_value_on_zero_arg_op_is_400(client, op):
    """A value on a zero-arg op is 400, not the value dropped and the op run."""
    resp = _post(client, [
        {"op": "set_instance", "value": "5"},
        {"op": op, "value": "5"},
    ])
    assert resp.status_code == 400, resp.text
    assert resp.json()["detail"] == f"Operation {op} takes no value"
    assert client.executed == []


@pytest.mark.parametrize("op, value", [
    ("set_instance_port", "5"),
    ("set_instance_port", "5,"),
    ("set_instance_address", ",192.0.2.1"),
    ("delete_instance_interface", "5"),
])
def test_batch_short_value_is_400(client, op, value):
    """A short value is 400, not a TypeError 500."""
    resp = _post(client, [{"op": op, "value": value}])
    assert resp.status_code == 400, resp.text
    assert resp.json()["detail"] == f"Operation {op} requires 2 values"
    assert client.executed == []


@pytest.mark.parametrize("op, detail", [
    ("no_such_op", "Unknown operation: no_such_op"),
    ("add_set", "Invalid operation: add_set"),
    ("_private", "Invalid operation: _private"),
])
def test_batch_unknown_op_is_400(client, op, detail):
    """The detail names the op, never raw exception text."""
    resp = _post(client, [{"op": op, "value": "x"}])
    assert resp.status_code == 400, resp.text
    assert resp.json()["detail"] == detail
    assert client.executed == []


def test_failed_commit_reports_the_error(client, commit):
    commit.update(status=400, error="Commit failed: T-err")
    resp = _post(client, [{"op": "delete_global_disable"}])
    assert resp.status_code == 200, resp.text
    assert resp.json() == {"success": False, "data": None, "error": "Commit failed: T-err"}


def test_batch_empty_is_500(client):
    resp = _post(client, [])
    assert resp.status_code == 500, resp.text
    assert resp.json()["detail"] == "Internal server error"
    assert client.executed == []


@pytest.mark.parametrize("method,path,body", [
    ("get", "/vyos/broadcast-relay/capabilities", None),
    ("get", "/vyos/broadcast-relay/config", None),
    ("post", "/vyos/broadcast-relay/batch", {"operations": []}),
])
def test_session_400_passes_through(client, monkeypatch, method, path, body):
    def no_session(_req):
        raise HTTPException(status_code=400, detail="No active session")

    monkeypatch.setattr(f"{ROUTER}.get_session_vyos_service", no_session)
    resp = getattr(client.http, method)(path, **({"json": body} if body is not None else {}))
    assert resp.status_code == 400, resp.text
    assert resp.json()["detail"] == "No active session"
