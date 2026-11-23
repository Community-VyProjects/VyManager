"""Babel batch route: comma-split args, HTTP 400 on a missing value.

execute_batch runs through run_in_threadpool (locked in
test_batch_off_event_loop.py). These tests drive the handler end to end with a
stub service so the emitted ops and the 400 paths are checked.
"""

from types import SimpleNamespace

import pytest
from fastapi import FastAPI, HTTPException
from fastapi.testclient import TestClient

ROUTER = "routers.babel.babel"
BASE = ["protocols", "babel"]


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
            return "1.4"

        def execute_batch(self, batch):
            if batch.is_empty():
                raise ValueError("Cannot execute empty batch")
            executed.append(batch.get_operations())
            return SimpleNamespace(status=commit["status"], result="", error=commit["error"])

    monkeypatch.setattr(f"{ROUTER}.require_write_permission", allow)
    monkeypatch.setattr(f"{ROUTER}.get_session_vyos_service", lambda _req: Service())

    from routers.babel.babel import router

    app = FastAPI()
    app.include_router(router)
    return TestClient(app), executed


def _post(test_client, operations):
    return test_client.post("/vyos/babel/batch", json={"operations": operations})


def test_batch_splits_values_onto_builder_args(client):
    test_client, executed = client
    resp = _post(test_client, [
        {"op": "set_parameters_diversity"},
        {"op": "set_interface", "value": "eth0"},
        {"op": "set_interface_type", "value": "eth0,wired"},
        {"op": "set_redistribute_ipv4", "value": "bgp"},
    ])
    assert resp.status_code == 200, resp.text
    assert resp.json() == {"success": True, "data": {"message": "Babel configuration updated"}, "error": None}
    assert executed == [[
        {"op": "set", "path": BASE + ["parameters", "diversity"]},
        {"op": "set", "path": BASE + ["interface", "eth0"]},
        {"op": "set", "path": BASE + ["interface", "eth0", "type", "wired"]},
        {"op": "set", "path": BASE + ["redistribute", "ipv4", "bgp"]},
    ]]


@pytest.mark.parametrize("operation", [
    {"op": "set_interface"},
    {"op": "set_interface", "value": ""},
    {"op": "delete_interface"},
    {"op": "set_redistribute_ipv4"},
])
def test_batch_missing_value_is_400(client, operation):
    test_client, executed = client
    resp = _post(test_client, [operation])
    assert resp.status_code == 400, resp.text
    assert resp.json()["detail"] == f"Operation {operation['op']} requires a value"
    assert executed == []


@pytest.mark.parametrize("operation", [
    {"op": "set_parameters_diversity", "value": "true"},
    {"op": "delete_parameters_diversity_factor", "value": "128"},
    {"op": "delete_distribute_list_ipv4_access_list_in", "value": "ACL4"},
])
def test_batch_value_on_zero_arg_op_is_400(client, operation):
    """A value on a zero-arg op is 400, not the op run with the value dropped."""
    test_client, executed = client
    resp = _post(test_client, [{"op": "set_interface", "value": "eth0"}, operation])
    assert resp.status_code == 400, resp.text
    assert resp.json()["detail"] == f"Operation {operation['op']} takes no value"
    assert executed == []


@pytest.mark.parametrize("value", ["eth0", "eth0,", ",wired"])
def test_batch_short_value_is_400(client, value):
    test_client, executed = client
    resp = _post(test_client, [{"op": "set_interface_type", "value": value}])
    assert resp.status_code == 400, resp.text
    assert resp.json()["detail"] == "Operation set_interface_type requires 2 values"
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


def test_batch_unsupported_redistribute_is_400(client):
    """The mapper raises ValueError for a protocol the lab does not allow."""
    test_client, executed = client
    resp = _post(test_client, [{"op": "set_redistribute_ipv4", "value": "ripng"}])
    assert resp.status_code == 400, resp.text
    assert "not supported" in resp.json()["detail"]
    assert executed == []


def test_batch_failed_commit_returns_error_without_data(client, commit):
    test_client, executed = client
    commit.update(status=400, error="Commit failed")
    resp = _post(test_client, [{"op": "set_parameters_diversity"}])
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
    ("get", "/vyos/babel/capabilities"),
    ("get", "/vyos/babel/config"),
    ("post", "/vyos/babel/batch"),
])
def test_session_lookup_http_error_is_not_a_500(monkeypatch, method, path):
    async def allow(*_args, **_kwargs):
        return None

    def no_session(_req):
        raise HTTPException(status_code=400, detail="No active instance")

    monkeypatch.setattr(f"{ROUTER}.require_read_permission", allow)
    monkeypatch.setattr(f"{ROUTER}.require_write_permission", allow)
    monkeypatch.setattr(f"{ROUTER}.get_session_vyos_service", no_session)

    from routers.babel.babel import router

    app = FastAPI()
    app.include_router(router)
    test_client = TestClient(app)
    kwargs = {"json": {"operations": []}} if method == "post" else {}
    resp = getattr(test_client, method)(path, **kwargs)
    assert resp.status_code == 400, resp.text
    assert resp.json()["detail"] == "No active instance"


@pytest.mark.parametrize("method, path, kind", [
    ("get", "/vyos/babel/capabilities", "read"),
    ("get", "/vyos/babel/config", "read"),
    ("post", "/vyos/babel/batch", "write"),
])
def test_routes_check_the_babel_permission(monkeypatch, method, path, kind):
    from rbac_permissions import FeatureGroup

    seen = []

    def recorder(name):
        async def check(_request, feature):
            seen.append((name, feature))
            raise HTTPException(status_code=403, detail="Forbidden")
        return check

    monkeypatch.setattr(f"{ROUTER}.require_read_permission", recorder("read"))
    monkeypatch.setattr(f"{ROUTER}.require_write_permission", recorder("write"))

    from routers.babel.babel import router

    app = FastAPI()
    app.include_router(router)
    kwargs = {"json": {"operations": []}} if method == "post" else {}
    resp = getattr(TestClient(app), method)(path, **kwargs)
    assert resp.status_code == 403, resp.text
    assert seen == [(kind, FeatureGroup.BABEL)]
