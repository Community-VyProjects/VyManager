"""OSPF batch route: comma-split args, HTTP 400 on a missing value.

execute_batch and get_full_config run through run_in_threadpool (locked in
test_batch_off_event_loop.py). These tests drive the handlers end to end with
a stub service so the emitted ops and the 400/500 paths are checked.
"""

from types import SimpleNamespace

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

ROUTER = "routers.ospf.ospf"
BASE = ["protocols", "ospf"]


class Service:
    def __init__(self, version="1.5", status=200, error=None, config=None):
        self.version = version
        self.status = status
        self.error = error
        self.config = config or {}
        self.executed = []

    def get_version(self):
        return self.version

    def get_full_config(self, refresh=False):
        return self.config

    def execute_batch(self, batch):
        if batch.is_empty():
            raise ValueError("Cannot execute empty batch")
        self.executed.append(batch.get_operations())
        return SimpleNamespace(status=self.status, result="", error=self.error)


def _client(monkeypatch, service):
    async def allow(*_args, **_kwargs):
        return None

    monkeypatch.setattr(f"{ROUTER}.require_write_permission", allow)
    monkeypatch.setattr(f"{ROUTER}.require_read_permission", allow)
    monkeypatch.setattr(f"{ROUTER}.get_session_vyos_service", lambda _req: service)

    from routers.ospf.ospf import router

    app = FastAPI()
    app.include_router(router)
    return TestClient(app, raise_server_exceptions=False)


@pytest.fixture
def client(monkeypatch):
    service = Service()
    return _client(monkeypatch, service), service


def _post(test_client, operations):
    return test_client.post("/vyos/ospf/batch", json={"operations": operations})


def test_batch_splits_values_onto_builder_args(client):
    test_client, service = client
    resp = _post(test_client, [
        {"op": "delete_default_metric"},
        {"op": "set_interface", "value": "eth0"},
        {"op": "set_interface_cost", "value": "eth0,10"},
        {"op": "set_interface_authentication_md5_key_id_md5_key", "value": "eth0,1,k,ey"},
        {"op": "set_area_virtual_link_authentication_md5_key_id_md5_key", "value": "1,192.0.2.1,2,vk"},
        {"op": "set_interface_authentication_null", "value": "eth0"},
    ])
    assert resp.status_code == 200, resp.text
    assert resp.json() == {"success": True, "data": {"message": "OSPF configuration updated"}, "error": None}
    assert service.executed == [[
        {"op": "delete", "path": BASE + ["default-metric"]},
        {"op": "set", "path": BASE + ["interface", "eth0"]},
        {"op": "set", "path": BASE + ["interface", "eth0", "cost", "10"]},
        {"op": "set", "path": BASE + ["interface", "eth0", "authentication", "md5", "key-id", "1", "md5-key", "k,ey"]},
        {"op": "set", "path": BASE + [
            "area", "1", "virtual-link", "192.0.2.1", "authentication", "md5", "key-id", "2", "md5-key", "vk",
        ]},
        {"op": "set", "path": BASE + ["interface", "eth0", "authentication", "null"]},
    ]]


@pytest.mark.parametrize("operation", [
    {"op": "set_interface"},
    {"op": "set_interface", "value": ""},
    {"op": "set_interface_cost"},
    {"op": "set_interface_cost", "value": ""},
])
def test_missing_value_is_400(client, operation):
    test_client, service = client
    resp = _post(test_client, [operation])
    assert resp.status_code == 400
    assert "requires a value" in resp.json()["detail"]
    assert service.executed == []


@pytest.mark.parametrize("operation", [
    {"op": "delete_default_metric", "value": "10"},
    {"op": "delete_ospf", "value": "eth0"},
    {"op": "set_log_adjacency_changes", "value": "true"},
    {"op": "delete_router_id", "value": "192.0.2.1"},
])
def test_value_on_zero_arg_op_is_400(client, operation):
    """A value on a zero-arg op is 400, not the op run with the value dropped."""
    test_client, service = client
    resp = _post(test_client, [{"op": "set_interface", "value": "eth0"}, operation])
    assert resp.status_code == 400, resp.text
    assert resp.json()["detail"] == f"Operation {operation['op']} takes no value"
    assert service.executed == []


@pytest.mark.parametrize("value", ["eth0", "eth0,", ",10"])
def test_short_multi_arg_value_is_400(client, value):
    test_client, service = client
    resp = _post(test_client, [{"op": "set_interface_cost", "value": value}])
    assert resp.status_code == 400
    assert "requires 2 values" in resp.json()["detail"]
    assert service.executed == []


@pytest.mark.parametrize("op, detail", [
    ("not_an_op", "Unknown operation: not_an_op"),
    ("_mapper", "Invalid operation: _mapper"),
    ("get_capabilities", "Invalid operation: get_capabilities"),
])
def test_unknown_op_is_400(client, op, detail):
    test_client, service = client
    resp = _post(test_client, [{"op": op, "value": "x"}])
    assert resp.status_code == 400
    assert resp.json()["detail"] == detail
    assert service.executed == []


def test_15_only_leaf_on_14_is_400(monkeypatch):
    service = Service(version="1.4")
    test_client = _client(monkeypatch, service)
    resp = _post(test_client, [{"op": "set_interface_authentication_null", "value": "eth0"}])
    assert resp.status_code == 400
    assert "not supported" in resp.json()["detail"]
    assert service.executed == []


def test_empty_batch_stays_500(client):
    test_client, service = client
    resp = _post(test_client, [])
    assert resp.status_code == 500
    assert resp.json()["detail"] == "Internal server error"


def test_failed_commit_returns_success_false(monkeypatch):
    service = Service(status=400, error="Commit failed")
    test_client = _client(monkeypatch, service)
    resp = _post(test_client, [{"op": "set_default_metric", "value": "10"}])
    assert resp.status_code == 200
    assert resp.json() == {"success": False, "data": None, "error": "Commit failed"}


def test_config_and_capabilities_keep_http_exception_status(monkeypatch):
    from fastapi import HTTPException

    def no_session(_req):
        raise HTTPException(status_code=400, detail="No active session")

    async def allow(*_args, **_kwargs):
        return None

    monkeypatch.setattr(f"{ROUTER}.require_read_permission", allow)
    monkeypatch.setattr(f"{ROUTER}.require_write_permission", allow)
    monkeypatch.setattr(f"{ROUTER}.get_session_vyos_service", no_session)

    from routers.ospf.ospf import router

    app = FastAPI()
    app.include_router(router)
    test_client = TestClient(app, raise_server_exceptions=False)
    for resp in (
        test_client.get("/vyos/ospf/config"),
        test_client.get("/vyos/ospf/capabilities"),
        _post(test_client, [{"op": "set_default_metric", "value": "10"}]),
    ):
        assert resp.status_code == 400
        assert resp.json()["detail"] == "No active session"


@pytest.mark.parametrize("method,path,kind", [
    ("get", "/vyos/ospf/capabilities", "read"),
    ("get", "/vyos/ospf/config", "read"),
    ("post", "/vyos/ospf/batch", "write"),
])
def test_routes_check_the_ospf_permission(monkeypatch, method, path, kind):
    from fastapi import HTTPException
    from rbac_permissions import FeatureGroup

    seen = []

    def recorder(name):
        async def check(_request, feature):
            seen.append((name, feature))
            raise HTTPException(status_code=403, detail="Forbidden")
        return check

    monkeypatch.setattr(f"{ROUTER}.require_read_permission", recorder("read"))
    monkeypatch.setattr(f"{ROUTER}.require_write_permission", recorder("write"))

    from routers.ospf.ospf import router

    app = FastAPI()
    app.include_router(router)
    kwargs = {"json": {"operations": []}} if method == "post" else {}
    resp = getattr(TestClient(app), method)(path, **kwargs)
    assert resp.status_code == 403, resp.text
    assert seen == [(kind, FeatureGroup.OSPF)]
