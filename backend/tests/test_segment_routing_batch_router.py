"""Segment Routing routes: comma-split batch args, HTTP 400 on a bad value.

execute_batch and get_full_config run through run_in_threadpool (locked in
test_batch_off_event_loop.py). These tests drive the handlers end to end with
a stub service so the emitted ops and the 400 paths are checked.
"""

from types import SimpleNamespace

import pytest
from fastapi import FastAPI, HTTPException
from fastapi.testclient import TestClient

ROUTER = "routers.segment_routing.segment_routing"
BASE = ["protocols", "segment-routing"]


def _app():
    from routers.segment_routing.segment_routing import router

    app = FastAPI()
    app.include_router(router)
    return TestClient(app)


@pytest.fixture
def commit():
    """Status and error the stub execute_batch returns."""
    return {"status": 200, "error": None}


@pytest.fixture
def client(monkeypatch, commit):
    executed = []

    async def allow(*_args, **_kwargs):
        return None

    class Service:
        def get_version(self):
            return "1.5"

        def get_full_config(self, refresh=False):
            return {"protocols": {"segment-routing": {
                "srv6": {"locator": {"loc1": {"prefix": "2001:db8::/48"}}},
                "interface": {"eth0": {"srv6": {"hmac": "drop"}}},
            }}}

        def execute_batch(self, batch):
            if batch.is_empty():
                raise ValueError("Cannot execute empty batch")
            executed.append(batch.get_operations())
            return SimpleNamespace(status=commit["status"], result="", error=commit["error"])

    monkeypatch.setattr(f"{ROUTER}.require_write_permission", allow)
    monkeypatch.setattr(f"{ROUTER}.require_read_permission", allow)
    monkeypatch.setattr(f"{ROUTER}.get_session_vyos_service", lambda _req: Service())
    return _app(), executed


def _post(test_client, operations):
    return test_client.post("/vyos/segment-routing/batch", json={"operations": operations})


def test_batch_splits_values_onto_builder_args(client):
    test_client, executed = client
    resp = _post(test_client, [
        {"op": "delete_srv6"},
        {"op": "set_locator", "value": "loc1"},
        {"op": "set_locator_prefix", "value": "loc1,2001:db8::/48"},
        {"op": "set_interface_hmac", "value": "eth0,drop"},
    ])
    assert resp.status_code == 200, resp.text
    assert resp.json()["success"] is True
    assert executed == [[
        {"op": "delete", "path": BASE + ["srv6"]},
        {"op": "set", "path": BASE + ["srv6", "locator", "loc1"]},
        {"op": "set", "path": BASE + ["srv6", "locator", "loc1", "prefix", "2001:db8::/48"]},
        {"op": "set", "path": BASE + ["interface", "eth0", "srv6", "hmac", "drop"]},
    ]]


@pytest.mark.parametrize("operation", [
    {"op": "set_locator"},
    {"op": "set_locator", "value": ""},
    {"op": "delete_interface"},
    {"op": "set_interface_hmac", "value": ""},
])
def test_batch_missing_value_is_400(client, operation):
    test_client, executed = client
    resp = _post(test_client, [operation])
    assert resp.status_code == 400, resp.text
    assert resp.json()["detail"] == f"Operation {operation['op']} requires a value"
    assert executed == []


@pytest.mark.parametrize("value", ["eth0", "eth0,", ",drop"])
def test_batch_short_value_is_400(client, value):
    test_client, executed = client
    resp = _post(test_client, [{"op": "set_interface_hmac", "value": value}])
    assert resp.status_code == 400, resp.text
    assert resp.json()["detail"] == "Operation set_interface_hmac requires 2 values"
    assert executed == []


@pytest.mark.parametrize("op,detail", [
    ("no_such_op", "Unknown operation: no_such_op"),
    ("_internal", "Invalid operation: _internal"),
    ("get_capabilities", "Invalid operation: get_capabilities"),
])
def test_batch_rejected_op_is_400(client, op, detail):
    test_client, executed = client
    resp = _post(test_client, [{"op": op, "value": "x"}])
    assert resp.status_code == 400, resp.text
    assert resp.json()["detail"] == detail
    assert executed == []


def test_batch_failed_commit_omits_updated_message(client, commit):
    test_client, executed = client
    commit.update(status=400, error="commit failed")
    resp = _post(test_client, [{"op": "delete_segment_routing"}])
    assert resp.status_code == 200, resp.text
    assert resp.json() == {"success": False, "data": None, "error": "commit failed"}
    assert executed == [[{"op": "delete", "path": BASE}]]


def test_batch_empty_is_500(client):
    """execute_batch raises ValueError for an empty batch; that stays a 500."""
    test_client, executed = client
    resp = _post(test_client, [])
    assert resp.status_code == 500, resp.text
    assert resp.json()["detail"] == "Internal server error"
    assert executed == []


def test_config_returns_parsed_tree(client):
    test_client, _ = client
    resp = test_client.get("/vyos/segment-routing/config")
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["locators"][0]["name"] == "loc1"
    assert body["locators"][0]["prefix"] == "2001:db8::/48"
    assert body["interfaces"] == [{"name": "eth0", "hmac": "drop"}]


@pytest.mark.parametrize("method,path,json", [
    ("get", "/vyos/segment-routing/capabilities", None),
    ("get", "/vyos/segment-routing/config", None),
    ("post", "/vyos/segment-routing/batch", {"operations": []}),
])
def test_session_lookup_400_is_not_a_500(monkeypatch, method, path, json):
    async def allow(*_args, **_kwargs):
        return None

    def no_session(_req):
        raise HTTPException(status_code=400, detail="No active VyOS session")

    monkeypatch.setattr(f"{ROUTER}.require_write_permission", allow)
    monkeypatch.setattr(f"{ROUTER}.require_read_permission", allow)
    monkeypatch.setattr(f"{ROUTER}.get_session_vyos_service", no_session)
    test_client = _app()
    resp = getattr(test_client, method)(path, **({"json": json} if json else {}))
    assert resp.status_code == 400, resp.text
    assert resp.json()["detail"] == "No active VyOS session"
