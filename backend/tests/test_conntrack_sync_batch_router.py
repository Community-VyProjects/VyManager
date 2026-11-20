"""Conntrack-sync batch route: comma-split args, HTTP 400 on a missing value.

execute_batch runs through run_in_threadpool (locked in
test_batch_off_event_loop.py). These tests drive the handler end to end with a
stub service so the emitted ops and the 400 paths are checked.
"""

from types import SimpleNamespace

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

ROUTER = "routers.conntrack_sync.conntrack_sync"
BASE = ["service", "conntrack-sync"]


@pytest.fixture
def client(monkeypatch):
    executed = []

    async def allow(*_args, **_kwargs):
        return None

    class Service:
        def get_version(self):
            return "1.4"

        def execute_batch(self, batch):
            if batch.is_empty():
                raise ValueError("Cannot execute empty batch")
            executed.append(batch.get_operations())
            return SimpleNamespace(status=200, result="", error=None)

    monkeypatch.setattr(f"{ROUTER}.require_write_permission", allow)
    monkeypatch.setattr(f"{ROUTER}.get_session_vyos_service", lambda _req: Service())

    from routers.conntrack_sync.conntrack_sync import router

    app = FastAPI()
    app.include_router(router)
    return TestClient(app), executed


def _post(test_client, operations):
    return test_client.post("/vyos/conntrack-sync/batch", json={"operations": operations})


def test_batch_splits_values_onto_builder_args(client):
    test_client, executed = client
    resp = _post(test_client, [
        {"op": "set_disable_external_cache"},
        {"op": "delete_conntrack_sync"},
        {"op": "set_accept_protocol", "value": "tcp"},
        {"op": "set_mcast_group", "value": "225.0.0.50,extra"},
        {"op": "set_interface_peer", "value": "eth0,192.0.2.2,9"},
        {"op": "set_interface_port", "value": "eth0,3780"},
        {"op": "delete_interface_peer", "value": "eth0"},
    ])
    assert resp.status_code == 200, resp.text
    assert resp.json()["success"] is True
    assert resp.json()["data"]["message"] == "Conntrack-Sync configuration updated"
    assert executed == [[
        {"op": "set", "path": BASE + ["disable-external-cache"]},
        {"op": "delete", "path": BASE},
        {"op": "set", "path": BASE + ["accept-protocol", "tcp"]},
        {"op": "set", "path": BASE + ["mcast-group", "225.0.0.50,extra"]},
        {"op": "set", "path": BASE + ["interface", "eth0", "peer", "192.0.2.2,9"]},
        {"op": "set", "path": BASE + ["interface", "eth0", "port", "3780"]},
        {"op": "delete", "path": BASE + ["interface", "eth0", "peer"]},
    ]]


@pytest.mark.parametrize("operation", [
    {"op": "set_accept_protocol"},
    {"op": "set_accept_protocol", "value": ""},
    {"op": "delete_interface"},
    {"op": "set_interface_peer"},
])
def test_batch_missing_value_is_400(client, operation):
    test_client, executed = client
    resp = _post(test_client, [operation])
    assert resp.status_code == 400, resp.text
    assert resp.json()["detail"] == f"Operation {operation['op']} requires a value"
    assert executed == []


@pytest.mark.parametrize("value", ["eth0", "eth0,", ",192.0.2.2"])
def test_batch_short_value_is_400(client, value):
    test_client, executed = client
    resp = _post(test_client, [{"op": "set_interface_peer", "value": value}])
    assert resp.status_code == 400, resp.text
    assert resp.json()["detail"] == "Operation set_interface_peer requires 2 values"
    assert executed == []


def test_batch_unknown_op_is_400(client):
    test_client, executed = client
    resp = _post(test_client, [{"op": "no_such_op", "value": "x"}])
    assert resp.status_code == 400, resp.text
    assert resp.json()["detail"] == "Unknown operation: no_such_op"
    assert executed == []


def test_batch_empty_is_500(client):
    """execute_batch raises ValueError for an empty batch; that stays a 500."""
    test_client, executed = client
    resp = _post(test_client, [])
    assert resp.status_code == 500, resp.text
    assert resp.json()["detail"] == "Internal server error"
    assert executed == []


def test_batch_failed_commit_omits_updated_message(monkeypatch):
    async def allow(*_args, **_kwargs):
        return None

    class Service:
        def get_version(self):
            return "1.4"

        def execute_batch(self, batch):
            return SimpleNamespace(status=400, result="", error="commit failed")

    monkeypatch.setattr(f"{ROUTER}.require_write_permission", allow)
    monkeypatch.setattr(f"{ROUTER}.get_session_vyos_service", lambda _req: Service())

    from routers.conntrack_sync.conntrack_sync import router

    app = FastAPI()
    app.include_router(router)
    resp = TestClient(app).post(
        "/vyos/conntrack-sync/batch",
        json={"operations": [{"op": "set_disable_external_cache"}]},
    )
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["success"] is False
    assert body["data"] is None
    assert body["error"] == "commit failed"


@pytest.mark.parametrize("path", ["/vyos/conntrack-sync/capabilities", "/vyos/conntrack-sync/config"])
def test_session_http_exception_is_not_swallowed(monkeypatch, path):
    from fastapi import HTTPException

    async def allow(*_args, **_kwargs):
        return None

    def boom(_req):
        raise HTTPException(status_code=503, detail="session down")

    monkeypatch.setattr(f"{ROUTER}.require_read_permission", allow)
    monkeypatch.setattr(f"{ROUTER}.get_session_vyos_service", boom)

    from routers.conntrack_sync.conntrack_sync import router

    app = FastAPI()
    app.include_router(router)
    resp = TestClient(app).get(path)
    assert resp.status_code == 503, resp.text
    assert resp.json()["detail"] == "session down"
