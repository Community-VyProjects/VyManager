"""Console server router: comma-split args, a value on a zero-arg op, missing values, failed commits.

A stub service records what the handler sends. Device calls must run off the
event loop: the app middleware records the loop thread and the stub compares
its own thread against it.
"""

import threading
from types import SimpleNamespace

import pytest
from fastapi import FastAPI, HTTPException
from fastapi.testclient import TestClient

ROUTER = "routers.console_server.console_server"
BASE = ["service", "console-server"]
DEVICE = BASE + ["device"]


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
            return {"service": {"console-server": {"device": {
                "usb0b2.4p1.0": {"speed": "9600", "data-bits": "8", "ssh": {"port": "not-int"}},
                "ttyS0": {"alias": "T-a", "speed": "115200", "ssh": {"port": "2022"}},
            }}}}

        def execute_batch(self, batch):
            device_threads.append(threading.current_thread())
            if batch.is_empty():
                raise ValueError("Cannot execute empty batch")
            executed.append(batch.get_operations())
            return SimpleNamespace(status=commit["status"], result="", error=commit["error"])

    monkeypatch.setattr(f"{ROUTER}.require_read_permission", read)
    monkeypatch.setattr(f"{ROUTER}.require_write_permission", write)
    monkeypatch.setattr(f"{ROUTER}.get_session_vyos_service", lambda _req: Service())

    from routers.console_server.console_server import router

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
    return c.http.post("/vyos/console-server/batch", json={"operations": operations})


@pytest.mark.parametrize("version", ["1.4", "1.5"])
def test_batch_splits_values_onto_builder_args(client, commit, version):
    commit["version"] = version
    resp = _post(client, [
        {"op": "delete_device", "value": "ttyS1"},
        {"op": "set_device", "value": "ttyS0"},
        {"op": "set_device_speed", "value": "ttyS0,115200"},
        {"op": "set_device_description", "value": "ttyS0,rack 1, top"},
        {"op": "delete_device_ssh", "value": "ttyS0"},
        {"op": "delete_console_server"},
    ])
    assert resp.status_code == 200, resp.text
    assert resp.json() == {
        "success": True,
        "data": {"message": "Console Server configuration updated"},
        "error": None,
    }
    assert client.executed == [[
        {"op": "delete", "path": DEVICE + ["ttyS1"]},
        {"op": "set", "path": DEVICE + ["ttyS0"]},
        {"op": "set", "path": DEVICE + ["ttyS0", "speed", "115200"]},
        {"op": "set", "path": DEVICE + ["ttyS0", "description", "rack 1, top"]},
        {"op": "delete", "path": DEVICE + ["ttyS0", "ssh"]},
        {"op": "delete", "path": BASE},
    ]]
    assert client.permissions == [("write", "CONSOLE_SERVER")]


def test_device_calls_run_off_the_event_loop(client):
    assert client.http.get("/vyos/console-server/config").status_code == 200
    assert _post(client, [{"op": "delete_device", "value": "ttyS0"}]).status_code == 200
    assert len(client.device_threads) == 2
    assert client.loop_threads
    for thread in client.device_threads:
        assert thread not in client.loop_threads


def test_config_returns_the_parse(client):
    resp = client.http.get("/vyos/console-server/config")
    assert resp.status_code == 200, resp.text
    assert resp.json() == {"devices": [
        {
            "name": "ttyS0",
            "alias": "T-a",
            "data_bits": None,
            "description": None,
            "parity": None,
            "speed": "115200",
            "ssh": {"port": 2022},
            "stop_bits": None,
        },
        {
            "name": "usb0b2.4p1.0",
            "alias": None,
            "data_bits": "8",
            "description": None,
            "parity": None,
            "speed": "9600",
            "ssh": {"port": None},
            "stop_bits": None,
        },
    ]}
    assert client.permissions == [("read", "CONSOLE_SERVER")]


@pytest.mark.parametrize("operation", [
    {"op": "set_device"},
    {"op": "delete_device", "value": ""},
    {"op": "set_device_speed"},
    {"op": "set_device_ssh_port", "value": ""},
])
def test_batch_missing_value_is_400(client, operation):
    """A missing value is 400, not a skipped op that still reports success."""
    resp = _post(client, [operation])
    assert resp.status_code == 400, resp.text
    assert resp.json()["detail"] == f"Operation {operation['op']} requires a value"
    assert client.executed == []


@pytest.mark.parametrize("value", ["ttyS0", "x"])
def test_batch_value_on_zero_arg_op_is_400(client, value):
    """A value on delete_console_server is 400, not the whole service deleted."""
    resp = _post(client, [
        {"op": "delete_device", "value": "ttyS1"},
        {"op": "delete_console_server", "value": value},
    ])
    assert resp.status_code == 400, resp.text
    assert resp.json()["detail"] == "Operation delete_console_server takes no value"
    assert client.executed == []


@pytest.mark.parametrize("op, value", [
    ("set_device_speed", "ttyS0"),
    ("set_device_speed", "ttyS0,"),
    ("set_device_alias", ",T-a"),
    ("set_device_ssh_port", "ttyS0"),
])
def test_batch_short_value_is_400(client, op, value):
    """A short value is 400, not a TypeError 500 or a one-arg call."""
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
    resp = _post(client, [{"op": "delete_device", "value": "ttyS0"}])
    assert resp.status_code == 200, resp.text
    assert resp.json() == {"success": False, "data": None, "error": "Commit failed: T-err"}


def test_batch_empty_is_500(client):
    resp = _post(client, [])
    assert resp.status_code == 500, resp.text
    assert resp.json()["detail"] == "Internal server error"
    assert client.executed == []


@pytest.mark.parametrize("method,path,body", [
    ("get", "/vyos/console-server/capabilities", None),
    ("get", "/vyos/console-server/config", None),
    ("post", "/vyos/console-server/batch", {"operations": []}),
])
def test_session_400_passes_through(client, monkeypatch, method, path, body):
    def no_session(_req):
        raise HTTPException(status_code=400, detail="No active session")

    monkeypatch.setattr(f"{ROUTER}.get_session_vyos_service", no_session)
    resp = getattr(client.http, method)(path, **({"json": body} if body is not None else {}))
    assert resp.status_code == 400, resp.text
    assert resp.json()["detail"] == "No active session"
