"""RIPng batch route: comma-split args, HTTP 400 on a bad op or value.

execute_batch and get_full_config run through run_in_threadpool (locked in
test_batch_off_event_loop.py). These tests drive the handlers with a stub
service so the emitted ops and the 400/500 paths are checked.
"""

from types import SimpleNamespace

import pytest
from fastapi import FastAPI, HTTPException
from fastapi.testclient import TestClient

ROUTER = "routers.ripng.ripng"
BASE = ["protocols", "ripng"]


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

    from routers.ripng.ripng import router

    app = FastAPI()
    app.include_router(router)
    return TestClient(app, raise_server_exceptions=False)


@pytest.fixture
def client(monkeypatch):
    service = Service()
    return _client(monkeypatch, service), service


def _post(test_client, operations):
    return test_client.post("/vyos/ripng/batch", json={"operations": operations})


@pytest.mark.parametrize("version", ["1.4", "1.5"])
def test_batch_ops_are_exact(monkeypatch, version):
    service = Service(version=version)
    test_client = _client(monkeypatch, service)
    resp = _post(test_client, [
        {"op": "set_default_metric", "value": "3"},
        {"op": "delete_default_information_originate"},
        {"op": "set_network", "value": "2001:db8::/32"},
        {"op": "delete_aggregate_address", "value": "2001:db8::/48"},
        {"op": "set_passive_interface", "value": "eth1"},
        {"op": "set_distribute_list_access_list_in", "value": "ACL6"},
        {"op": "delete_distribute_list_prefix_list_out"},
        {"op": "set_distribute_list_interface_prefix_list_in", "value": "eth0,PL6"},
        {"op": "delete_distribute_list_interface_access_list_out", "value": "eth0"},
        {"op": "set_interface_split_horizon_poison_reverse", "value": "eth0"},
        {"op": "set_redistribute_route_map", "value": "connected,RM"},
        {"op": "delete_redistribute_metric", "value": "connected"},
        {"op": "set_timers_update", "value": "30"},
        {"op": "delete_timers_garbage_collection"},
    ])
    assert resp.status_code == 200, resp.text
    assert resp.json() == {"success": True, "data": {"message": "RIPng configuration updated"}, "error": None}
    assert service.executed == [[
        {"op": "set", "path": BASE + ["default-metric", "3"]},
        {"op": "delete", "path": BASE + ["default-information", "originate"]},
        {"op": "set", "path": BASE + ["network", "2001:db8::/32"]},
        {"op": "delete", "path": BASE + ["aggregate-address", "2001:db8::/48"]},
        {"op": "set", "path": BASE + ["passive-interface", "eth1"]},
        {"op": "set", "path": BASE + ["distribute-list", "access-list", "in", "ACL6"]},
        {"op": "delete", "path": BASE + ["distribute-list", "prefix-list", "out"]},
        {"op": "set", "path": BASE + ["distribute-list", "interface", "eth0", "prefix-list", "in", "PL6"]},
        {"op": "delete", "path": BASE + ["distribute-list", "interface", "eth0", "access-list", "out"]},
        {"op": "set", "path": BASE + ["interface", "eth0", "split-horizon", "poison-reverse"]},
        {"op": "set", "path": BASE + ["redistribute", "connected", "route-map", "RM"]},
        {"op": "delete", "path": BASE + ["redistribute", "connected", "metric"]},
        {"op": "set", "path": BASE + ["timers", "update", "30"]},
        {"op": "delete", "path": BASE + ["timers", "garbage-collection"]},
    ]]


@pytest.mark.parametrize("op, detail", [
    ("not_an_op", "Unknown operation: not_an_op"),
    ("set_neighbor", "Unknown operation: set_neighbor"),
    ("set_version", "Unknown operation: set_version"),
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
    {"op": "set_network"},
    {"op": "set_network", "value": ""},
    {"op": "set_default_metric"},
    {"op": "delete_interface"},
    {"op": "set_redistribute_metric"},
])
def test_missing_value_is_400(client, operation):
    test_client, service = client
    resp = _post(test_client, [operation])
    assert resp.status_code == 400
    assert "requires a value" in resp.json()["detail"]
    assert service.executed == []


@pytest.mark.parametrize("value", ["connected", "connected,", ",5"])
def test_short_multi_arg_value_is_400(client, value):
    test_client, service = client
    resp = _post(test_client, [{"op": "set_redistribute_metric", "value": value}])
    assert resp.status_code == 400
    assert "requires 2 values" in resp.json()["detail"]
    assert service.executed == []


@pytest.mark.parametrize("operation", [
    {"op": "delete_default_metric", "value": "3"},
    {"op": "delete_timers", "value": "x"},
    {"op": "set_default_information_originate", "value": "true"},
])
def test_value_on_zero_arg_op_is_400(client, operation):
    test_client, service = client
    resp = _post(test_client, [operation])
    assert resp.status_code == 400
    assert resp.json()["detail"] == f"Operation {operation['op']} takes no value"
    assert service.executed == []


@pytest.mark.parametrize("operation, needle", [
    ({"op": "set_default_metric", "value": "17"}, "metric"),
    ({"op": "set_default_metric", "value": "0"}, "metric"),
    ({"op": "set_redistribute_metric", "value": "bgp,99"}, "metric"),
    ({"op": "set_timers_update", "value": "4"}, "timer"),
    ({"op": "set_timers_timeout", "value": "2147483648"}, "timer"),
    ({"op": "set_network", "value": "2001:db8::1/48"}, "host bits"),
    ({"op": "set_route", "value": "10.0.0.0/8"}, "IPv6"),
    ({"op": "set_route_map", "value": ".bad"}, "route_map"),
    ({"op": "set_redistribute", "value": "ospf"}, "redistribute"),
    ({"op": "set_distribute_list_access_list_in", "value": "a b"}, "access-list name"),
    ({"op": "set_distribute_list_prefix_list_out", "value": "PL.6"}, "prefix-list name"),
    ({"op": "set_distribute_list_interface_prefix_list_in", "value": "eth0,PL+6"}, "prefix-list name"),
])
def test_out_of_range_value_is_400(client, operation, needle):
    test_client, service = client
    resp = _post(test_client, [{"op": "set_network", "value": "2001:db8::/32"}, operation])
    assert resp.status_code == 400, resp.text
    assert needle in resp.json()["detail"]
    assert service.executed == []


def test_comma_in_last_part_is_kept_and_rejected_by_the_builder(client):
    test_client, service = client
    resp = _post(test_client, [{"op": "set_distribute_list_interface_access_list_in", "value": "eth0,a,b"}])
    assert resp.status_code == 400
    assert "access-list name" in resp.json()["detail"]
    assert service.executed == []


def test_empty_batch_stays_500(client):
    test_client, _service = client
    resp = _post(test_client, [])
    assert resp.status_code == 500
    assert resp.json()["detail"] == "Internal server error"


def test_failed_commit_returns_success_false(monkeypatch):
    service = Service(status=400, error="Commit failed")
    test_client = _client(monkeypatch, service)
    resp = _post(test_client, [{"op": "set_interface", "value": "eth0"}])
    assert resp.status_code == 200
    assert resp.json() == {"success": False, "data": None, "error": "Commit failed"}


def test_capabilities_route_serves_builder_values(client):
    test_client, _service = client
    resp = test_client.get("/vyos/ripng/capabilities")
    assert resp.status_code == 200
    body = resp.json()
    assert "version_info" not in body
    assert body["features"]["redistribute"]["protocols"] == [
        "babel", "bgp", "connected", "kernel", "ospfv3", "static",
    ]
    assert body["ranges"] == {"metric": {"min": 1, "max": 16}, "timer": {"min": 5, "max": 2147483647}}


@pytest.mark.parametrize("method,path", [
    ("get", "/vyos/ripng/capabilities"),
    ("get", "/vyos/ripng/config"),
    ("post", "/vyos/ripng/batch"),
])
def test_session_http_error_passes_through(monkeypatch, method, path):
    async def allow(*_args, **_kwargs):
        return None

    def no_session(_req):
        raise HTTPException(status_code=400, detail="No active session")

    monkeypatch.setattr(f"{ROUTER}.require_write_permission", allow)
    monkeypatch.setattr(f"{ROUTER}.require_read_permission", allow)
    monkeypatch.setattr(f"{ROUTER}.get_session_vyos_service", no_session)

    from routers.ripng.ripng import router

    app = FastAPI()
    app.include_router(router)
    kwargs = {"json": {"operations": [{"op": "delete_ripng"}]}} if method == "post" else {}
    resp = getattr(TestClient(app), method)(path, **kwargs)
    assert resp.status_code == 400
    assert resp.json()["detail"] == "No active session"


@pytest.mark.parametrize("method,path,kind", [
    ("get", "/vyos/ripng/capabilities", "read"),
    ("get", "/vyos/ripng/config", "read"),
    ("post", "/vyos/ripng/batch", "write"),
])
def test_routes_check_the_ripng_permission(monkeypatch, method, path, kind):
    from rbac_permissions import FeatureGroup

    seen = []

    def recorder(name):
        async def check(_request, feature):
            seen.append((name, feature))
            raise HTTPException(status_code=403, detail="Forbidden")
        return check

    monkeypatch.setattr(f"{ROUTER}.require_read_permission", recorder("read"))
    monkeypatch.setattr(f"{ROUTER}.require_write_permission", recorder("write"))

    from routers.ripng.ripng import router

    app = FastAPI()
    app.include_router(router)
    kwargs = {"json": {"operations": []}} if method == "post" else {}
    resp = getattr(TestClient(app), method)(path, **kwargs)
    assert resp.status_code == 403, resp.text
    assert seen == [(kind, FeatureGroup.RIPNG)]
