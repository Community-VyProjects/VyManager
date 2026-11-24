"""Event handler router: comma-split args, a value on a zero-arg op, an empty env value, failed commits.

A stub service records what the handler sends. Device calls must run off the
event loop: the app middleware records the loop thread and the stub compares
its own thread against it.
"""

import threading
from types import SimpleNamespace

import pytest
from fastapi import FastAPI, HTTPException
from fastapi.testclient import TestClient

ROUTER = "routers.event_handler.event_handler"
ROOT = ["service", "event-handler", "event"]


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
            return {"service": {"event-handler": {"event": {"T-ev": {
                "filter": {"pattern": "T-x"},
                "script": {"path": "/usr/bin/true", "environment": {"T_E": {"value": ""}}},
            }}}}}

        def execute_batch(self, batch):
            device_threads.append(threading.current_thread())
            if batch.is_empty():
                raise ValueError("Cannot execute empty batch")
            executed.append(batch.get_operations())
            return SimpleNamespace(status=commit["status"], result="", error=commit["error"])

    monkeypatch.setattr(f"{ROUTER}.require_read_permission", read)
    monkeypatch.setattr(f"{ROUTER}.require_write_permission", write)
    monkeypatch.setattr(f"{ROUTER}.get_session_vyos_service", lambda _req: Service())

    from routers.event_handler.event_handler import router

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
    return c.http.post("/vyos/event-handler/batch", json={"operations": operations})


@pytest.mark.parametrize("version", ["1.4", "1.5"])
def test_batch_splits_values_onto_builder_args(client, commit, version):
    commit["version"] = version
    resp = _post(client, [
        {"op": "delete_event", "value": "T-ev"},
        {"op": "set_event_filter_pattern", "value": "T-ev,link,down"},
        {"op": "set_event_script_arguments", "value": "T-ev,--a,--b"},
        {"op": "set_event_script_environment_value", "value": "T-ev,T_E,x,y"},
        {"op": "delete_events"},
    ])
    assert resp.status_code == 200, resp.text
    assert resp.json() == {
        "success": True,
        "data": {"message": "Event handler configuration updated"},
        "error": None,
    }
    assert client.executed == [[
        {"op": "delete", "path": ROOT + ["T-ev"]},
        {"op": "set", "path": ROOT + ["T-ev", "filter", "pattern", "link,down"]},
        {"op": "set", "path": ROOT + ["T-ev", "script", "arguments", "--a,--b"]},
        {"op": "set", "path": ROOT + ["T-ev", "script", "environment", "T_E", "value", "x,y"]},
        {"op": "delete", "path": ROOT},
    ]]
    assert client.permissions == [("write", "EVENT_HANDLER")]


def test_batch_sets_an_empty_environment_value(client):
    """Both labs commit `environment <name> value ''`; the screen sends it as `ev,NAME,`."""
    resp = _post(client, [{"op": "set_event_script_environment_value", "value": "T-ev,T_E,"}])
    assert resp.status_code == 200, resp.text
    assert client.executed == [[
        {"op": "set", "path": ROOT + ["T-ev", "script", "environment", "T_E", "value", ""]},
    ]]


def test_device_calls_run_off_the_event_loop(client):
    assert client.http.get("/vyos/event-handler/config").status_code == 200
    assert _post(client, [{"op": "delete_event", "value": "T-ev"}]).status_code == 200
    assert len(client.device_threads) == 2
    assert client.loop_threads
    for thread in client.device_threads:
        assert thread not in client.loop_threads


def test_config_returns_the_parse(client):
    resp = client.http.get("/vyos/event-handler/config")
    assert resp.status_code == 200, resp.text
    assert resp.json() == {"events": [{
        "name": "T-ev",
        "filter": {"pattern": "T-x", "syslog_identifier": None},
        "script": {
            "path": "/usr/bin/true",
            "arguments": None,
            "environment": [{"name": "T_E", "value": ""}],
        },
    }]}
    assert client.permissions == [("read", "EVENT_HANDLER")]


@pytest.mark.parametrize("operation", [
    {"op": "delete_event"},
    {"op": "delete_event", "value": ""},
    {"op": "set_event_filter_pattern"},
    {"op": "set_event_script_environment_value", "value": ""},
])
def test_batch_missing_value_is_400(client, operation):
    resp = _post(client, [operation])
    assert resp.status_code == 400, resp.text
    assert resp.json()["detail"] == f"Operation {operation['op']} requires a value"
    assert client.executed == []


@pytest.mark.parametrize("value", ["T-ev", "x"])
def test_batch_value_on_zero_arg_op_is_400(client, value):
    """A value on delete_events is 400, not every event deleted with the value dropped."""
    resp = _post(client, [
        {"op": "delete_event", "value": "T-other"},
        {"op": "delete_events", "value": value},
    ])
    assert resp.status_code == 400, resp.text
    assert resp.json()["detail"] == "Operation delete_events takes no value"
    assert client.executed == []


@pytest.mark.parametrize("op, value, count", [
    ("set_event_filter_pattern", "T-ev", 2),
    ("set_event_filter_pattern", "T-ev,", 2),
    ("set_event_filter_pattern", ",T-x", 2),
    ("delete_event_script_environment", "T-ev,", 2),
    ("set_event_script_environment_value", "T-ev,T_E", 3),
    ("set_event_script_environment_value", "T-ev,,x", 3),
    ("set_event_script_environment_value", ",T_E,x", 3),
])
def test_batch_short_value_is_400(client, op, value, count):
    resp = _post(client, [{"op": op, "value": value}])
    assert resp.status_code == 400, resp.text
    assert resp.json()["detail"] == f"Operation {op} requires {count} values"
    assert client.executed == []


@pytest.mark.parametrize("op, detail", [
    ("no_such_op", "Unknown operation: no_such_op"),
    ("add_set", "Invalid operation: add_set"),
    ("_private", "Invalid operation: _private"),
])
def test_batch_unknown_op_is_400(client, op, detail):
    resp = _post(client, [{"op": op, "value": "x"}])
    assert resp.status_code == 400, resp.text
    assert resp.json()["detail"] == detail
    assert client.executed == []


def test_failed_commit_reports_the_error(client, commit):
    commit.update(status=400, error="Commit failed: T-err")
    resp = _post(client, [{"op": "delete_event", "value": "T-ev"}])
    assert resp.status_code == 200, resp.text
    assert resp.json() == {"success": False, "data": None, "error": "Commit failed: T-err"}


def test_batch_empty_is_500(client):
    resp = _post(client, [])
    assert resp.status_code == 500, resp.text
    assert resp.json()["detail"] == "Internal server error"
    assert client.executed == []


@pytest.mark.parametrize("method,path,body", [
    ("get", "/vyos/event-handler/capabilities", None),
    ("get", "/vyos/event-handler/config", None),
    ("post", "/vyos/event-handler/batch", {"operations": []}),
])
def test_session_400_passes_through(client, monkeypatch, method, path, body):
    def no_session(_req):
        raise HTTPException(status_code=400, detail="No active session")

    monkeypatch.setattr(f"{ROUTER}.get_session_vyos_service", no_session)
    resp = getattr(client.http, method)(path, **({"json": body} if body is not None else {}))
    assert resp.status_code == 400, resp.text
    assert resp.json()["detail"] == "No active session"
