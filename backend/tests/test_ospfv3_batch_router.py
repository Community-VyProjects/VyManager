"""OSPFv3 batch route: comma-split args, HTTP 400 on a bad op or value.

execute_batch and get_full_config run through run_in_threadpool (locked in
test_batch_off_event_loop.py). These tests drive the handlers with a stub
service so the emitted ops and the 400/500 paths are checked.
"""

from types import SimpleNamespace

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

ROUTER = "routers.ospfv3.ospfv3"
BASE = ["protocols", "ospfv3"]


class Service:
    def __init__(self, version="1.5", status=200, error=None):
        self.version = version
        self.status = status
        self.error = error
        self.executed = []

    def get_version(self):
        return self.version

    def get_full_config(self, refresh=False):
        return {}

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

    from routers.ospfv3.ospfv3 import router

    app = FastAPI()
    app.include_router(router)
    return TestClient(app, raise_server_exceptions=False)


@pytest.fixture
def client(monkeypatch):
    service = Service()
    return _client(monkeypatch, service), service


def _post(test_client, operations):
    return test_client.post("/vyos/ospfv3/batch", json={"operations": operations})


@pytest.mark.parametrize("version", ["1.4", "1.5"])
def test_batch_ops_are_exact(monkeypatch, version):
    service = Service(version=version)
    test_client = _client(monkeypatch, service)
    resp = _post(test_client, [
        {"op": "delete_log_adjacency_changes_detail"},
        {"op": "set_area", "value": "0.0.0.1"},
        {"op": "delete_area_type", "value": "0.0.0.1"},
        {"op": "set_area_type_nssa", "value": "0.0.0.1"},
        {"op": "delete_area_range_advertise", "value": "0.0.0.1,2001:db8::/32"},
        {"op": "set_interface_cost", "value": "eth0,10"},
        {"op": "set_redistribute_route_map", "value": "connected,RM"},
        {"op": "delete_redistribute_metric", "value": "connected"},
        {"op": "delete_graceful_restart_helper_enable_router_id", "value": "192.0.2.1"},
    ])
    assert resp.status_code == 200, resp.text
    assert resp.json() == {"success": True, "data": {"message": "OSPFv3 configuration updated"}, "error": None}
    assert service.executed == [[
        {"op": "delete", "path": BASE + ["log-adjacency-changes", "detail"]},
        {"op": "set", "path": BASE + ["area", "0.0.0.1"]},
        {"op": "delete", "path": BASE + ["area", "0.0.0.1", "area-type"]},
        {"op": "set", "path": BASE + ["area", "0.0.0.1", "area-type", "nssa"]},
        {"op": "delete", "path": BASE + ["area", "0.0.0.1", "range", "2001:db8::/32", "advertise"]},
        {"op": "set", "path": BASE + ["interface", "eth0", "cost", "10"]},
        {"op": "set", "path": BASE + ["redistribute", "connected", "route-map", "RM"]},
        {"op": "delete", "path": BASE + ["redistribute", "connected", "metric"]},
        {"op": "delete", "path": BASE + ["graceful-restart", "helper", "enable", "router-id", "192.0.2.1"]},
    ]]


@pytest.mark.parametrize("op, detail", [
    ("not_an_op", "Unknown operation: not_an_op"),
    ("set_area_type_normal", "Unknown operation: set_area_type_normal"),
    ("set_area_type_stub_default_cost", "Unknown operation: set_area_type_stub_default_cost"),
    ("set_area_type_nssa_default_cost", "Unknown operation: set_area_type_nssa_default_cost"),
    ("_protocol", "Invalid operation: _protocol"),
    ("get_capabilities", "Invalid operation: get_capabilities"),
])
def test_bad_op_is_400(client, op, detail):
    test_client, service = client
    resp = _post(test_client, [{"op": op, "value": "1"}])
    assert resp.status_code == 400
    assert resp.json()["detail"] == detail
    assert service.executed == []


@pytest.mark.parametrize("operation", [
    {"op": "set_area"},
    {"op": "set_area", "value": ""},
    {"op": "set_interface_cost"},
    {"op": "set_router_id"},
])
def test_missing_value_is_400(client, operation):
    test_client, service = client
    resp = _post(test_client, [operation])
    assert resp.status_code == 400
    assert "requires a value" in resp.json()["detail"]
    assert service.executed == []


@pytest.mark.parametrize("value", ["eth0", "eth0,", ",10"])
def test_short_multi_arg_value_is_400(client, value):
    test_client, service = client
    resp = _post(test_client, [{"op": "set_interface_cost", "value": value}])
    assert resp.status_code == 400
    assert "requires 2 values" in resp.json()["detail"]
    assert service.executed == []


@pytest.mark.parametrize("operation", [
    {"op": "delete_router_id", "value": "192.0.2.1"},
    {"op": "set_log_adjacency_changes", "value": "true"},
])
def test_value_on_zero_arg_op_is_400(client, operation):
    test_client, service = client
    resp = _post(test_client, [operation])
    assert resp.status_code == 400
    assert resp.json()["detail"] == f"Operation {operation['op']} takes no value"
    assert service.executed == []


@pytest.mark.parametrize("operation, needle", [
    ({"op": "set_interface_cost", "value": "eth0,0"}, "cost"),
    ({"op": "set_interface_priority", "value": "eth0,256"}, "priority"),
    ({"op": "set_distance_global", "value": "256"}, "distance"),
    ({"op": "set_graceful_restart_grace_period", "value": "1801"}, "grace_period"),
    ({"op": "set_default_information_originate_metric_type", "value": "3"}, "metric_type"),
    ({"op": "set_interface_network", "value": "eth0,point-to-multipoint"}, "network"),
    ({"op": "set_redistribute", "value": "ospf"}, "redistribute"),
    ({"op": "set_area", "value": "4294967296"}, "area_id"),
    ({"op": "set_area_range", "value": "0,10.0.0.0/8"}, "IPv6"),
    ({"op": "set_router_id", "value": "2001:db8::1"}, "router_id"),
])
def test_out_of_range_value_is_400(client, operation, needle):
    test_client, service = client
    resp = _post(test_client, [{"op": "set_area", "value": "0"}, operation])
    assert resp.status_code == 400, resp.text
    assert needle in resp.json()["detail"]
    assert service.executed == []


def test_empty_batch_stays_500(client):
    test_client, _service = client
    resp = _post(test_client, [])
    assert resp.status_code == 500
    assert resp.json()["detail"] == "Internal server error"


def test_failed_commit_returns_success_false(monkeypatch):
    service = Service(status=400, error="Can only configure one area-type for OSPFv3 area")
    test_client = _client(monkeypatch, service)
    resp = _post(test_client, [{"op": "set_area_type_stub", "value": "1"}])
    assert resp.status_code == 200
    assert resp.json() == {
        "success": False, "data": None, "error": "Can only configure one area-type for OSPFv3 area",
    }


def test_capabilities_route_serves_builder_values(client):
    test_client, _service = client
    resp = test_client.get("/vyos/ospfv3/capabilities")
    assert resp.status_code == 200
    body = resp.json()
    assert "version_info" not in body
    assert body["features"]["areas"]["area_types"] == ["stub", "nssa"]
    assert body["ranges"]["distance"] == {"min": 1, "max": 255}


def test_config_model_has_no_default_cost():
    from routers.ospfv3.ospfv3 import Ospfv3Area

    assert "area_type_default_cost" not in Ospfv3Area.model_fields


@pytest.mark.parametrize("method,path,kind", [
    ("get", "/vyos/ospfv3/capabilities", "read"),
    ("get", "/vyos/ospfv3/config", "read"),
    ("post", "/vyos/ospfv3/batch", "write"),
])
def test_routes_check_the_ospfv3_permission(monkeypatch, method, path, kind):
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

    from routers.ospfv3.ospfv3 import router

    app = FastAPI()
    app.include_router(router)
    kwargs = {"json": {"operations": []}} if method == "post" else {}
    resp = getattr(TestClient(app), method)(path, **kwargs)
    assert resp.status_code == 403, resp.text
    assert seen == [(kind, FeatureGroup.OSPFV3)]
