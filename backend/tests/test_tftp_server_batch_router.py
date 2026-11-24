"""TFTP server router: comma-split args, a value on a zero-arg op, missing values, failed commits.

A stub service records what the handler sends. Device calls must run off the
event loop: the app middleware records the loop thread and the stub compares
its own thread against it.
"""

import threading
from types import SimpleNamespace

import pytest
from fastapi import FastAPI, HTTPException
from fastapi.testclient import TestClient

ROUTER = "routers.tftp_server.tftp_server"
BASE = ["service", "tftp-server"]
LISTEN = BASE + ["listen-address"]


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
            return {"service": {"tftp-server": {
                "directory": "/config/tftp",
                "allow-upload": {},
                "port": "69",
                "listen-address": {
                    "192.0.2.10": {"vrf": "mgmt"},
                    "192.0.2.1": {},
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

    from routers.tftp_server.tftp_server import router

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
    return c.http.post("/vyos/tftp-server/batch", json={"operations": operations})


@pytest.mark.parametrize("version", ["1.4", "1.5"])
def test_batch_splits_values_onto_builder_args(client, commit, version):
    commit["version"] = version
    resp = _post(client, [
        {"op": "set_directory", "value": "/config/tftp"},
        {"op": "set_allow_upload"},
        {"op": "set_port", "value": "6969"},
        {"op": "set_listen_address", "value": "192.0.2.1"},
        {"op": "set_listen_address_vrf", "value": "192.0.2.1,mgmt"},
        {"op": "delete_listen_address_vrf", "value": "192.0.2.10"},
        {"op": "delete_listen_address", "value": "2001:db8::1"},
        {"op": "delete_allow_upload"},
        {"op": "delete_port"},
        {"op": "delete_directory"},
        {"op": "delete_tftp_server"},
    ])
    assert resp.status_code == 200, resp.text
    assert resp.json() == {
        "success": True,
        "data": {"message": "TFTP server configuration updated"},
        "error": None,
    }
    assert client.executed == [[
        {"op": "set", "path": BASE + ["directory", "/config/tftp"]},
        {"op": "set", "path": BASE + ["allow-upload"]},
        {"op": "set", "path": BASE + ["port", "6969"]},
        {"op": "set", "path": LISTEN + ["192.0.2.1"]},
        {"op": "set", "path": LISTEN + ["192.0.2.1", "vrf", "mgmt"]},
        {"op": "delete", "path": LISTEN + ["192.0.2.10", "vrf"]},
        {"op": "delete", "path": LISTEN + ["2001:db8::1"]},
        {"op": "delete", "path": BASE + ["allow-upload"]},
        {"op": "delete", "path": BASE + ["port"]},
        {"op": "delete", "path": BASE + ["directory"]},
        {"op": "delete", "path": BASE},
    ]]
    assert client.permissions == [("write", "TFTP_SERVER")]


def test_single_arg_value_keeps_commas(client):
    resp = _post(client, [{"op": "set_directory", "value": "/config/a,b"}])
    assert resp.status_code == 200, resp.text
    assert client.executed == [[
        {"op": "set", "path": BASE + ["directory", "/config/a,b"]},
    ]]


def test_device_calls_run_off_the_event_loop(client):
    assert client.http.get("/vyos/tftp-server/config").status_code == 200
    assert _post(client, [{"op": "delete_port"}]).status_code == 200
    assert len(client.device_threads) == 2
    assert client.loop_threads
    for thread in client.device_threads:
        assert thread not in client.loop_threads


def test_config_returns_the_parse(client):
    resp = client.http.get("/vyos/tftp-server/config")
    assert resp.status_code == 200, resp.text
    assert resp.json() == {
        "directory": "/config/tftp",
        "allow_upload": True,
        "port": "69",
        "listen_addresses": [
            {"address": "192.0.2.1", "vrf": None},
            {"address": "192.0.2.10", "vrf": "mgmt"},
        ],
    }
    assert client.permissions == [("read", "TFTP_SERVER")]


def test_capabilities_require_read(client):
    resp = client.http.get("/vyos/tftp-server/capabilities")
    assert resp.status_code == 200, resp.text
    assert resp.json()["features"]["tftp_server"]["supported"] is True
    assert client.permissions == [("read", "TFTP_SERVER")]


@pytest.mark.parametrize("operation", [
    {"op": "set_directory"},
    {"op": "set_port", "value": ""},
    {"op": "set_listen_address"},
    {"op": "delete_listen_address", "value": ""},
    {"op": "delete_listen_address_vrf"},
    {"op": "set_listen_address_vrf"},
])
def test_batch_missing_value_is_400(client, operation):
    """A missing value is 400, not a TypeError 500 or a skipped op that still reports success."""
    resp = _post(client, [operation])
    assert resp.status_code == 400, resp.text
    assert resp.json()["detail"] == f"Operation {operation['op']} requires a value"
    assert client.executed == []


@pytest.mark.parametrize("op", [
    "delete_tftp_server",
    "delete_directory",
    "set_allow_upload",
    "delete_allow_upload",
    "delete_port",
])
def test_batch_value_on_zero_arg_op_is_400(client, op):
    """A value on a zero-arg op is 400, not the value dropped and the op run."""
    resp = _post(client, [
        {"op": "set_port", "value": "69"},
        {"op": op, "value": "192.0.2.1"},
    ])
    assert resp.status_code == 400, resp.text
    assert resp.json()["detail"] == f"Operation {op} takes no value"
    assert client.executed == []


@pytest.mark.parametrize("value", ["192.0.2.1", "192.0.2.1,", ",mgmt"])
def test_batch_short_value_is_400(client, value):
    """A short value is 400, not a TypeError 500 or a one-arg call."""
    resp = _post(client, [{"op": "set_listen_address_vrf", "value": value}])
    assert resp.status_code == 400, resp.text
    assert resp.json()["detail"] == "Operation set_listen_address_vrf requires 2 values"
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
    resp = _post(client, [{"op": "delete_port"}])
    assert resp.status_code == 200, resp.text
    assert resp.json() == {"success": False, "data": None, "error": "Commit failed: T-err"}


def test_batch_empty_is_500(client):
    resp = _post(client, [])
    assert resp.status_code == 500, resp.text
    assert resp.json()["detail"] == "Internal server error"
    assert client.executed == []


@pytest.mark.parametrize("method,path,body", [
    ("get", "/vyos/tftp-server/capabilities", None),
    ("get", "/vyos/tftp-server/config", None),
    ("post", "/vyos/tftp-server/batch", {"operations": []}),
])
def test_session_400_passes_through(client, monkeypatch, method, path, body):
    def no_session(_req):
        raise HTTPException(status_code=400, detail="No active session")

    monkeypatch.setattr(f"{ROUTER}.get_session_vyos_service", no_session)
    resp = getattr(client.http, method)(path, **({"json": body} if body is not None else {}))
    assert resp.status_code == 400, resp.text
    assert resp.json()["detail"] == "No active session"
