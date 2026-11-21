"""Static routes router: comma-split args, version-gate 400s, failed commits.

A stub service records what the handler sends. Device calls must run off the
event loop: the app middleware records the loop thread and the stub compares
its own thread against it.
"""

import threading
from types import SimpleNamespace

import pytest
from fastapi import FastAPI, HTTPException
from fastapi.testclient import TestClient

ROUTER = "routers.static_routes.static_routes"
ROOT = ["protocols", "static"]


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
            return {"protocols": {"static": {"route": {"198.51.100.0/24": {"blackhole": {}}}}}}

        def execute_batch(self, batch):
            device_threads.append(threading.current_thread())
            if batch.is_empty():
                raise ValueError("Cannot execute empty batch")
            executed.append(batch.get_operations())
            return SimpleNamespace(status=commit["status"], result="", error=commit["error"])

    monkeypatch.setattr(f"{ROUTER}.require_read_permission", read)
    monkeypatch.setattr(f"{ROUTER}.require_write_permission", write)
    monkeypatch.setattr(f"{ROUTER}.get_session_vyos_service", lambda _req: Service())

    from routers.static_routes.static_routes import router

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
    return c.http.post("/vyos/static-routes/batch", json={"operations": operations})


def test_batch_splits_values_onto_builder_args(client):
    resp = _post(client, [
        {"op": "set_ipv4_route_description", "value": "198.51.100.0/24,T-desc,comma"},
        {"op": "set_table_ipv6_route_next_hop_distance", "value": "10,2001:db8:100::/48,2001:db8::1,5"},
        {"op": "delete_route_map"},
    ])
    assert resp.status_code == 200, resp.text
    assert resp.json() == {
        "success": True,
        "data": {"message": "Static routes configuration updated"},
        "error": None,
    }
    assert client.executed == [[
        {"op": "set", "path": ROOT + ["route", "198.51.100.0/24", "description", "T-desc,comma"]},
        {"op": "set", "path": ROOT + [
            "table", "10", "route6", "2001:db8:100::/48", "next-hop", "2001:db8::1", "distance", "5",
        ]},
        {"op": "delete", "path": ROOT + ["route-map"]},
    ]]
    assert client.permissions == [("write", "STATIC_ROUTES")]


def test_device_calls_run_off_the_event_loop(client):
    assert client.http.get("/vyos/static-routes/config").status_code == 200
    assert _post(client, [{"op": "set_ipv4_route", "value": "198.51.100.0/24"}]).status_code == 200
    assert len(client.device_threads) == 2
    assert client.loop_threads
    for thread in client.device_threads:
        assert thread not in client.loop_threads


def test_config_returns_the_parse(client):
    resp = client.http.get("/vyos/static-routes/config")
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert [r["destination"] for r in body["ipv4_routes"]] == ["198.51.100.0/24"]
    assert body["ipv4_routes"][0]["blackhole"] is True
    assert client.permissions == [("read", "STATIC_ROUTES")]


@pytest.mark.parametrize("operation", [
    {"op": "set_ipv4_route"},
    {"op": "set_ipv4_route", "value": ""},
])
def test_batch_missing_value_is_400(client, operation):
    resp = _post(client, [operation])
    assert resp.status_code == 400, resp.text
    assert resp.json()["detail"] == f"Operation {operation['op']} requires a value"
    assert client.executed == []


@pytest.mark.parametrize("value", ["198.51.100.0/24", "198.51.100.0/24,", ",192.0.2.1"])
def test_batch_short_value_is_400(client, value):
    resp = _post(client, [{"op": "set_ipv4_route_next_hop", "value": value}])
    assert resp.status_code == 400, resp.text
    assert resp.json()["detail"] == "Operation set_ipv4_route_next_hop requires 2 values"
    assert client.executed == []


def test_batch_unknown_op_is_400(client):
    resp = _post(client, [{"op": "no_such_op", "value": "x"}])
    assert resp.status_code == 400, resp.text
    assert resp.json()["detail"] == "Unknown operation: no_such_op"
    assert client.executed == []


def test_batch_1_5_leaf_on_1_4_is_400(client):
    resp = _post(client, [
        {"op": "set_ipv4_route", "value": "198.51.100.0/24"},
        {"op": "set_ipv4_route_next_hop_segments", "value": "198.51.100.0/24,192.0.2.1,fc00::1"},
    ])
    assert resp.status_code == 400, resp.text
    assert resp.json()["detail"] == "protocols static route segments is not supported on this device"
    assert client.executed == []


def test_batch_1_4_leaf_on_1_5_is_400(client, commit):
    commit["version"] = "1.5"
    resp = _post(client, [{
        "op": "set_ipv4_route_next_hop_bfd_multi_hop_source_profile",
        "value": "198.51.100.0/24,192.0.2.1,192.0.2.9,T-P",
    }])
    assert resp.status_code == 400, resp.text
    assert resp.json()["detail"] == (
        "protocols static next-hop bfd multi-hop source profile is not supported on this device"
    )
    assert client.executed == []


def test_failed_commit_reports_the_error(client, commit):
    commit.update(status=400, error="Commit failed: T-err")
    resp = _post(client, [{"op": "set_ipv4_route", "value": "198.51.100.0/24"}])
    assert resp.status_code == 200, resp.text
    assert resp.json() == {"success": False, "data": None, "error": "Commit failed: T-err"}


def test_batch_empty_is_500(client):
    resp = _post(client, [])
    assert resp.status_code == 500, resp.text
    assert resp.json()["detail"] == "Internal server error"
    assert client.executed == []


@pytest.mark.parametrize("method,path,body", [
    ("get", "/vyos/static-routes/capabilities", None),
    ("get", "/vyos/static-routes/config", None),
    ("post", "/vyos/static-routes/batch", {"operations": []}),
])
def test_session_400_passes_through(client, monkeypatch, method, path, body):
    def no_session(_req):
        raise HTTPException(status_code=400, detail="No active session")

    monkeypatch.setattr(f"{ROUTER}.get_session_vyos_service", no_session)
    resp = getattr(client.http, method)(path, **({"json": body} if body is not None else {}))
    assert resp.status_code == 400, resp.text
    assert resp.json()["detail"] == "No active session"
