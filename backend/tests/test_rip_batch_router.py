"""RIP batch route: comma-split args, HTTP 400 on a missing value.

execute_batch runs through run_in_threadpool (locked in
test_batch_off_event_loop.py). These tests drive the handler end to end with a
stub service so the emitted ops and the 400 paths are checked.
"""

from types import SimpleNamespace

import pytest
from fastapi import FastAPI, HTTPException
from fastapi.testclient import TestClient

ROUTER = "routers.rip.rip"
BASE = ["protocols", "rip"]


@pytest.fixture
def commit():
    """Commit result the stub service returns; a test flips it with update()."""
    return {"status": 200, "error": None}


@pytest.fixture
def client(monkeypatch, commit):
    executed = []

    async def allow(*_args, **_kwargs):
        return None

    class Service:
        def get_version(self):
            return "1.4.3"

        def execute_batch(self, batch):
            if batch.is_empty():
                raise ValueError("Cannot execute empty batch")
            executed.append(batch.get_operations())
            return SimpleNamespace(status=commit["status"], result="", error=commit["error"])

    monkeypatch.setattr(f"{ROUTER}.require_write_permission", allow)
    monkeypatch.setattr(f"{ROUTER}.get_session_vyos_service", lambda _req: Service())

    from routers.rip.rip import router

    app = FastAPI()
    app.include_router(router)
    return TestClient(app), executed


def _post(test_client, operations):
    return test_client.post("/vyos/rip/batch", json={"operations": operations})


def test_batch_splits_values_onto_builder_args(client):
    test_client, executed = client
    resp = _post(test_client, [
        {"op": "set_default_information_originate"},
        {"op": "set_version", "value": "2"},
        {"op": "set_interface_send_version", "value": "eth0,2"},
        {"op": "set_interface_authentication_md5_key", "value": "eth0,1,K,1"},
        {"op": "set_interface_authentication_plaintext", "value": "eth1,a,b"},
        {"op": "delete_redistribute_metric", "value": "ospf"},
    ])
    assert resp.status_code == 200, resp.text
    assert resp.json() == {"success": True, "data": {"message": "RIP configuration updated"}, "error": None}
    assert executed == [[
        {"op": "set", "path": BASE + ["default-information", "originate"]},
        {"op": "set", "path": BASE + ["version", "2"]},
        {"op": "set", "path": BASE + ["interface", "eth0", "send", "version", "2"]},
        {"op": "set", "path": BASE + ["interface", "eth0", "authentication", "md5", "1", "password", "K,1"]},
        {"op": "set", "path": BASE + ["interface", "eth1", "authentication", "plaintext-password", "a,b"]},
        {"op": "delete", "path": BASE + ["redistribute", "ospf", "metric"]},
    ]]


@pytest.mark.parametrize("operation", [
    {"op": "set_version"},
    {"op": "set_version", "value": ""},
    {"op": "delete_interface"},
    {"op": "delete_interface", "value": ""},
])
def test_batch_missing_value_is_400(client, operation):
    test_client, executed = client
    resp = _post(test_client, [operation])
    assert resp.status_code == 400, resp.text
    assert resp.json()["detail"] == f"Operation {operation['op']} requires a value"
    assert executed == []


@pytest.mark.parametrize("op, value, count", [
    ("set_interface_send_version", "eth0", 2),
    ("set_interface_send_version", "eth0,", 2),
    ("set_interface_send_version", ",2", 2),
    ("set_interface_authentication_md5_key", "eth0,1", 3),
    ("set_interface_authentication_md5_key", "eth0,,K1", 3),
])
def test_batch_short_value_is_400(client, op, value, count):
    test_client, executed = client
    resp = _post(test_client, [{"op": op, "value": value}])
    assert resp.status_code == 400, resp.text
    assert resp.json()["detail"] == f"Operation {op} requires {count} values"
    assert executed == []


@pytest.mark.parametrize("op, detail", [
    ("no_such_op", "Unknown operation: no_such_op"),
    ("_mapper", "Invalid operation: _mapper"),
    ("get_capabilities", "Invalid operation: get_capabilities"),
])
def test_batch_unknown_op_is_400(client, op, detail):
    test_client, executed = client
    resp = _post(test_client, [{"op": op, "value": "x"}])
    assert resp.status_code == 400, resp.text
    assert resp.json()["detail"] == detail
    assert executed == []


def test_batch_redistribute_nhrp_on_1_4_is_400(client):
    """1.4 has no ``redistribute nhrp``; the mapper gate is a 400 and nothing commits."""
    test_client, executed = client
    resp = _post(test_client, [
        {"op": "set_network", "value": "10.0.0.0/8"},
        {"op": "set_redistribute", "value": "nhrp"},
    ])
    assert resp.status_code == 400, resp.text
    assert resp.json()["detail"] == "redistribute nhrp is not supported on this device"
    assert executed == []


def test_batch_failed_commit_returns_error_without_data(client, commit):
    test_client, executed = client
    commit.update(status=400, error="Commit failed")
    resp = _post(test_client, [{"op": "set_default_information_originate"}])
    assert resp.status_code == 200, resp.text
    assert resp.json() == {"success": False, "data": None, "error": "Commit failed"}
    assert len(executed) == 1


def test_batch_empty_is_500(client):
    """execute_batch raises ValueError for an empty batch; that stays a 500."""
    test_client, executed = client
    resp = _post(test_client, [])
    assert resp.status_code == 500, resp.text
    assert resp.json()["detail"] == "Internal server error"
    assert executed == []


@pytest.mark.parametrize("method, path", [
    ("get", "/vyos/rip/capabilities"),
    ("get", "/vyos/rip/config"),
    ("post", "/vyos/rip/batch"),
])
def test_session_lookup_http_error_is_not_a_500(monkeypatch, method, path):
    async def allow(*_args, **_kwargs):
        return None

    def no_session(_req):
        raise HTTPException(status_code=400, detail="No active instance")

    monkeypatch.setattr(f"{ROUTER}.require_read_permission", allow)
    monkeypatch.setattr(f"{ROUTER}.require_write_permission", allow)
    monkeypatch.setattr(f"{ROUTER}.get_session_vyos_service", no_session)

    from routers.rip.rip import router

    app = FastAPI()
    app.include_router(router)
    test_client = TestClient(app)
    kwargs = {"json": {"operations": []}} if method == "post" else {}
    resp = getattr(test_client, method)(path, **kwargs)
    assert resp.status_code == 400, resp.text
    assert resp.json()["detail"] == "No active instance"


@pytest.mark.parametrize("method, path, kind", [
    ("get", "/vyos/rip/capabilities", "read"),
    ("get", "/vyos/rip/config", "read"),
    ("post", "/vyos/rip/batch", "write"),
])
def test_routes_check_the_rip_permission(monkeypatch, method, path, kind):
    from rbac_permissions import FeatureGroup

    seen = []

    def recorder(name):
        async def check(_request, feature):
            seen.append((name, feature))
            raise HTTPException(status_code=403, detail="Forbidden")
        return check

    monkeypatch.setattr(f"{ROUTER}.require_read_permission", recorder("read"))
    monkeypatch.setattr(f"{ROUTER}.require_write_permission", recorder("write"))

    from routers.rip.rip import router

    app = FastAPI()
    app.include_router(router)
    kwargs = {"json": {"operations": []}} if method == "post" else {}
    resp = getattr(TestClient(app), method)(path, **kwargs)
    assert resp.status_code == 403, resp.text
    assert seen == [(kind, FeatureGroup.RIP)]
