"""Traffic Engineering router: comma-split args, 400s, failed commits, threadpool.

A stub service records what the handler sends. Device calls must run off the
event loop: the app middleware records the loop thread and the stub compares
its own thread against it.
"""

import threading
from types import SimpleNamespace

import pytest
from fastapi import FastAPI, HTTPException
from fastapi.testclient import TestClient

ROUTER = "routers.traffic_engineering.traffic_engineering"
BASE = ["protocols", "traffic-engineering"]


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

    from routers.traffic_engineering.traffic_engineering import router

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
    return c.http.post("/vyos/traffic-engineering/batch", json={"operations": operations})


def test_batch_splits_values_onto_builder_args(client):
    resp = _post(client, [
        {"op": "set_admin_group", "value": "gold"},
        {"op": "set_admin_group_bit_position", "value": "gold,7"},
        {"op": "set_interface_admin_group", "value": "eth0,gold"},
        {"op": "delete_interface_metric", "value": "eth0"},
        {"op": "delete_traffic_engineering"},
    ])
    assert resp.status_code == 200, resp.text
    assert resp.json() == {
        "success": True,
        "data": {"message": "Traffic Engineering configuration updated"},
        "error": None,
    }
    assert client.executed == [[
        {"op": "set", "path": BASE + ["admin-group", "gold"]},
        {"op": "set", "path": BASE + ["admin-group", "gold", "bit-position", "7"]},
        {"op": "set", "path": BASE + ["interface", "eth0", "admin-group", "gold"]},
        {"op": "delete", "path": BASE + ["interface", "eth0", "metric"]},
        {"op": "delete", "path": BASE},
    ]]
    assert client.permissions == [("write", "TRAFFIC_ENGINEERING")]


def test_device_calls_run_off_the_event_loop(client):
    assert client.http.get("/vyos/traffic-engineering/config").status_code == 200
    assert _post(client, [{"op": "set_interface", "value": "eth0"}]).status_code == 200
    assert len(client.device_threads) == 2
    assert client.loop_threads
    for thread in client.device_threads:
        assert thread not in client.loop_threads


@pytest.mark.parametrize("operation", [
    {"op": "set_interface"},
    {"op": "set_interface", "value": ""},
    {"op": "set_interface_metric"},
    {"op": "set_interface_metric", "value": ""},
])
def test_batch_missing_value_is_400(client, operation):
    resp = _post(client, [operation])
    assert resp.status_code == 400, resp.text
    assert resp.json()["detail"] == f"Operation {operation['op']} requires a value"
    assert client.executed == []


def test_batch_value_on_zero_arg_op_is_400(client):
    resp = _post(client, [
        {"op": "set_interface", "value": "eth0"},
        {"op": "delete_traffic_engineering", "value": "eth0"},
    ])
    assert resp.status_code == 400, resp.text
    assert resp.json()["detail"] == "Operation delete_traffic_engineering takes no value"
    assert client.executed == []


@pytest.mark.parametrize("value", ["eth0", "eth0,", ",10"])
def test_batch_short_value_is_400(client, value):
    resp = _post(client, [{"op": "set_interface_metric", "value": value}])
    assert resp.status_code == 400, resp.text
    assert resp.json()["detail"] == "Operation set_interface_metric requires 2 values"
    assert client.executed == []


def test_batch_unknown_op_is_400(client):
    resp = _post(client, [{"op": "no_such_op", "value": "x"}])
    assert resp.status_code == 400, resp.text
    assert resp.json()["detail"] == "Unknown operation: no_such_op"
    assert client.executed == []


def test_batch_value_the_mapper_rejects_is_400(client):
    resp = _post(client, [{"op": "set_admin_group_bit_position", "value": "gold,32"}])
    assert resp.status_code == 400, resp.text
    assert resp.json()["detail"] == "Bit position must be 0-31"
    assert client.executed == []


def test_batch_on_1_4_is_400(client, commit):
    commit["version"] = "1.4.3"
    resp = _post(client, [
        {"op": "set_admin_group", "value": "gold"},
        {"op": "set_admin_group_bit_position", "value": "gold,1"},
    ])
    assert resp.status_code == 400, resp.text
    assert resp.json()["detail"] == "Traffic Engineering is not supported on this device"
    assert client.executed == []
    assert client.device_threads == []


def test_batch_empty_stays_500(client):
    resp = _post(client, [])
    assert resp.status_code == 500, resp.text
    assert resp.json()["detail"] == "Internal server error"
    assert client.executed == []


def test_batch_value_error_from_device_is_500(client, commit):
    """A ValueError from execute_batch is not a version gate; it stays a 500."""
    commit["execute_error"] = "device fault"
    resp = _post(client, [{"op": "delete_traffic_engineering"}])
    assert resp.status_code == 500, resp.text
    assert resp.json()["detail"] == "Internal server error"


def test_failed_commit_reports_the_error(client, commit):
    commit.update(status=400, error="Commit failed: T-err")
    resp = _post(client, [{"op": "delete_traffic_engineering"}])
    assert resp.status_code == 200, resp.text
    assert resp.json() == {"success": False, "data": None, "error": "Commit failed: T-err"}


def test_config_route_parses_through_the_mapper(client, config):
    config["protocols"] = {
        "traffic-engineering": {
            "admin-group": {"gold": {"bit-position": "7"}},
            "interface": {"eth0": {"admin-group": "gold", "metric": "10"}},
        },
    }
    resp = client.http.get("/vyos/traffic-engineering/config")
    assert resp.status_code == 200, resp.text
    assert resp.json() == {
        "configured": True,
        "admin_groups": [{"name": "gold", "bit_position": 7}],
        "interfaces": [
            {
                "name": "eth0",
                "admin_groups": ["gold"],
                "max_bandwidth": None,
                "max_reservable_bandwidth": None,
                "metric": 10,
            }
        ],
    }
    assert client.permissions == [("read", "TRAFFIC_ENGINEERING")]


def test_capabilities_route(client, commit):
    resp = client.http.get("/vyos/traffic-engineering/capabilities")
    assert resp.status_code == 200, resp.text
    assert resp.json()["features"]["traffic_engineering"]["supported"] is True
    commit["version"] = "1.4.3"
    resp = client.http.get("/vyos/traffic-engineering/capabilities")
    assert resp.json()["features"]["traffic_engineering"]["supported"] is False
    assert client.permissions == [("read", "TRAFFIC_ENGINEERING")] * 2


@pytest.mark.parametrize("method,path,body", [
    ("get", "/vyos/traffic-engineering/capabilities", None),
    ("get", "/vyos/traffic-engineering/config", None),
    ("post", "/vyos/traffic-engineering/batch", {"operations": []}),
])
def test_session_400_passes_through(client, monkeypatch, method, path, body):
    def no_session(_req):
        raise HTTPException(status_code=400, detail="No active session")

    monkeypatch.setattr(f"{ROUTER}.get_session_vyos_service", no_session)
    resp = getattr(client.http, method)(path, **({"json": body} if body is not None else {}))
    assert resp.status_code == 400, resp.text
    assert resp.json()["detail"] == "No active session"
