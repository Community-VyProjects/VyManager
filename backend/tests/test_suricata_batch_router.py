"""Suricata router: comma-split args, a value on a zero-arg op, 400s, failed commits.

A stub service records what the handler sends. Device calls must run off the
event loop: the app middleware records the loop thread and the stub compares
its own thread against it.
"""

import threading
from types import SimpleNamespace

import pytest
from fastapi import FastAPI, HTTPException
from fastapi.testclient import TestClient

ROUTER = "routers.suricata.suricata"
BASE = ["service", "suricata"]


@pytest.fixture
def commit():
    return {"status": 200, "error": None, "version": "1.5", "execute_error": None}


@pytest.fixture
def config():
    return {}


@pytest.fixture
def client(monkeypatch, commit, config):
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
            return config

        def execute_batch(self, batch):
            device_threads.append(threading.current_thread())
            if commit["execute_error"]:
                raise ValueError(commit["execute_error"])
            if batch.is_empty():
                raise ValueError("Cannot execute empty batch")
            executed.append(batch.get_operations())
            return SimpleNamespace(status=commit["status"], result="", error=commit["error"])

    monkeypatch.setattr(f"{ROUTER}.require_read_permission", read)
    monkeypatch.setattr(f"{ROUTER}.require_write_permission", write)
    monkeypatch.setattr(f"{ROUTER}.get_session_vyos_service", lambda _req: Service())

    from routers.suricata.suricata import router

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
    return c.http.post("/vyos/suricata/batch", json={"operations": operations})


def test_batch_splits_values_onto_builder_args(client):
    resp = _post(client, [
        {"op": "delete_log"},
        {"op": "set_interface", "value": "eth0"},
        {"op": "set_address", "value": "home-net,10.0.0.0/8"},
        {"op": "set_port_group_ref", "value": "web-ports,!http-ports"},
        {"op": "delete_suricata"},
    ])
    assert resp.status_code == 200, resp.text
    assert resp.json() == {
        "success": True,
        "data": {"message": "Suricata configuration updated"},
        "error": None,
    }
    assert client.executed == [[
        {"op": "delete", "path": BASE + ["log"]},
        {"op": "set", "path": BASE + ["interface", "eth0"]},
        {"op": "set", "path": BASE + ["address-group", "home-net", "address", "10.0.0.0/8"]},
        {"op": "set", "path": BASE + ["port-group", "web-ports", "group", "!http-ports"]},
        {"op": "delete", "path": BASE},
    ]]
    assert client.permissions == [("write", "SURICATA")]


def test_device_calls_run_off_the_event_loop(client):
    assert client.http.get("/vyos/suricata/config").status_code == 200
    assert _post(client, [{"op": "set_interface", "value": "eth0"}]).status_code == 200
    assert len(client.device_threads) == 2
    assert client.loop_threads
    for thread in client.device_threads:
        assert thread not in client.loop_threads


@pytest.mark.parametrize("operation", [
    {"op": "set_interface"},
    {"op": "set_interface", "value": ""},
    {"op": "set_address"},
    {"op": "set_address", "value": ""},
])
def test_batch_missing_value_is_400(client, operation):
    resp = _post(client, [operation])
    assert resp.status_code == 400, resp.text
    assert resp.json()["detail"] == f"Operation {operation['op']} requires a value"
    assert client.executed == []


@pytest.mark.parametrize("op", ["delete_log", "delete_suricata"])
@pytest.mark.parametrize("value", ["eth0", "x"])
def test_batch_value_on_zero_arg_op_is_400(client, op, value):
    """A value on a zero-arg op is 400, not the wider op run with the value dropped."""
    resp = _post(client, [
        {"op": "set_interface", "value": "eth0"},
        {"op": op, "value": value},
    ])
    assert resp.status_code == 400, resp.text
    assert resp.json()["detail"] == f"Operation {op} takes no value"
    assert client.executed == []


@pytest.mark.parametrize("value", ["home-net", "home-net,", ",10.0.0.0/8"])
def test_batch_short_value_is_400(client, value):
    resp = _post(client, [{"op": "set_address", "value": value}])
    assert resp.status_code == 400, resp.text
    assert resp.json()["detail"] == "Operation set_address requires 2 values"
    assert client.executed == []


def test_batch_unknown_op_is_400(client):
    resp = _post(client, [{"op": "no_such_op", "value": "x"}])
    assert resp.status_code == 400, resp.text
    assert resp.json()["detail"] == "Unknown operation: no_such_op"
    assert client.executed == []


def test_batch_comma_in_one_arg_value_reaches_the_mapper(client):
    """split(",", 0) keeps the comma; the mapper rejects it with ValueError."""
    resp = _post(client, [{"op": "set_log_eve_filename", "value": "eve,json"}])
    assert resp.status_code == 400, resp.text
    assert resp.json()["detail"] == "Invalid log file name"
    assert client.executed == []


def test_batch_on_1_4_is_400(client, commit):
    commit["version"] = "1.4"
    resp = _post(client, [{"op": "set_interface", "value": "eth0"}])
    assert resp.status_code == 400, resp.text
    assert resp.json()["detail"] == "Suricata is not supported on this device"
    assert client.executed == []


def test_batch_empty_skips_the_device(client):
    resp = _post(client, [])
    assert resp.status_code == 200, resp.text
    assert resp.json() == {
        "success": True,
        "data": {"message": "No Suricata changes"},
        "error": None,
    }
    assert client.executed == []
    assert client.device_threads == []


def test_batch_value_error_from_device_is_500(client, commit):
    """A ValueError from execute_batch is not a version gate; it stays a 500."""
    commit["execute_error"] = "Cannot execute empty batch"
    resp = _post(client, [{"op": "delete_suricata"}])
    assert resp.status_code == 500, resp.text
    assert resp.json()["detail"] == "Internal server error"


def test_failed_commit_reports_the_error(client, commit):
    commit.update(status=400, error="Commit failed: T-err")
    resp = _post(client, [{"op": "delete_suricata"}])
    assert resp.status_code == 200, resp.text
    assert resp.json() == {"success": False, "data": None, "error": "Commit failed: T-err"}


def test_config_route_parses_through_the_mapper(client, config):
    config["service"] = {
        "suricata": {
            "interface": "eth0",
            "port-group": {"http-ports": {"port": {"80": {}, "!8080": {}}}},
            "log": {"eve": {"filetype": "syslog"}},
        },
    }
    resp = client.http.get("/vyos/suricata/config")
    assert resp.status_code == 200, resp.text
    assert resp.json() == {
        "configured": True,
        "interfaces": ["eth0"],
        "address_groups": [],
        "port_groups": [
            {
                "name": "http-ports",
                "members": [
                    {"value": "80", "exclude": False},
                    {"value": "8080", "exclude": True},
                ],
                "groups": [],
            },
        ],
        "log": {
            "enabled": True,
            "filename": None,
            "filetype": "syslog",
            "types": [],
            "types_set": False,
        },
    }
    assert client.permissions == [("read", "SURICATA")]


@pytest.mark.parametrize("method,path,body", [
    ("get", "/vyos/suricata/capabilities", None),
    ("get", "/vyos/suricata/config", None),
    ("post", "/vyos/suricata/batch", {"operations": []}),
])
def test_session_400_passes_through(client, monkeypatch, method, path, body):
    def no_session(_req):
        raise HTTPException(status_code=400, detail="No active session")

    monkeypatch.setattr(f"{ROUTER}.get_session_vyos_service", no_session)
    resp = getattr(client.http, method)(path, **({"json": body} if body is not None else {}))
    assert resp.status_code == 400, resp.text
    assert resp.json()["detail"] == "No active session"
