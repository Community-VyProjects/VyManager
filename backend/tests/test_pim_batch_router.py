"""PIM batch route: comma-split args, HTTP 400 on a bad op or value.

execute_batch and get_full_config run through run_in_threadpool (locked in
test_batch_off_event_loop.py). These tests drive the handlers with a stub
service so the emitted ops and the 400/500 paths are checked.
"""

from types import SimpleNamespace

import pytest
from fastapi import FastAPI, HTTPException
from fastapi.testclient import TestClient

ROUTER = "routers.pim.pim"
BASE = ["protocols", "pim"]


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

    from routers.pim.pim import router

    app = FastAPI()
    app.include_router(router)
    return TestClient(app, raise_server_exceptions=False)


@pytest.fixture
def client(monkeypatch):
    service = Service()
    return _client(monkeypatch, service), service


def _post(test_client, operations):
    return test_client.post("/vyos/pim/batch", json={"operations": operations})


@pytest.mark.parametrize("version", ["1.4", "1.5"])
def test_batch_ops_are_exact(monkeypatch, version):
    service = Service(version=version)
    test_client = _client(monkeypatch, service)
    resp = _post(test_client, [
        {"op": "set_ecmp"},
        {"op": "delete_ecmp_rebalance"},
        {"op": "set_join_prune_interval", "value": "60"},
        {"op": "delete_packets"},
        {"op": "set_ssm_prefix_list", "value": "SSM"},
        {"op": "set_rp_address", "value": "192.0.2.50"},
        {"op": "set_rp_address_group", "value": "192.0.2.50,224.0.0.0/4"},
        {"op": "delete_rp_address_group", "value": "192.0.2.50,239.0.0.0/8"},
        {"op": "set_interface", "value": "eth0"},
        {"op": "set_interface_bfd_profile", "value": "eth0,fast"},
        {"op": "delete_interface_hello", "value": "eth0"},
        {"op": "set_interface_igmp", "value": "eth0"},
        {"op": "set_interface_igmp_join", "value": "eth0,239.1.1.1"},
        {"op": "set_interface_igmp_join_source", "value": "eth0,239.1.1.1,192.0.2.10"},
        {"op": "delete_interface_igmp_join_source", "value": "eth0,239.1.1.1,192.0.2.11"},
        {"op": "set_interface_igmp_version", "value": "eth0,3"},
    ])
    assert resp.status_code == 200, resp.text
    assert resp.json() == {"success": True, "data": {"message": "PIM configuration updated"}, "error": None}
    i = BASE + ["interface", "eth0"]
    assert service.executed == [[
        {"op": "set", "path": BASE + ["ecmp"]},
        {"op": "delete", "path": BASE + ["ecmp", "rebalance"]},
        {"op": "set", "path": BASE + ["join-prune-interval", "60"]},
        {"op": "delete", "path": BASE + ["packets"]},
        {"op": "set", "path": BASE + ["ssm", "prefix-list", "SSM"]},
        {"op": "set", "path": BASE + ["rp", "address", "192.0.2.50"]},
        {"op": "set", "path": BASE + ["rp", "address", "192.0.2.50", "group", "224.0.0.0/4"]},
        {"op": "delete", "path": BASE + ["rp", "address", "192.0.2.50", "group", "239.0.0.0/8"]},
        {"op": "set", "path": i},
        {"op": "set", "path": i + ["bfd", "profile", "fast"]},
        {"op": "delete", "path": i + ["hello"]},
        {"op": "set", "path": i + ["igmp"]},
        {"op": "set", "path": i + ["igmp", "join", "239.1.1.1"]},
        {"op": "set", "path": i + ["igmp", "join", "239.1.1.1", "source-address", "192.0.2.10"]},
        {"op": "delete", "path": i + ["igmp", "join", "239.1.1.1", "source-address", "192.0.2.11"]},
        {"op": "set", "path": i + ["igmp", "version", "3"]},
    ]]


@pytest.mark.parametrize("op, detail", [
    ("not_an_op", "Unknown operation: not_an_op"),
    ("set_interface_igmp_join_sources", "Unknown operation: set_interface_igmp_join_sources"),
    ("get_capabilities", "Invalid operation: get_capabilities"),
    ("add_set", "Invalid operation: add_set"),
])
def test_bad_op_is_400(client, op, detail):
    test_client, service = client
    resp = _post(test_client, [{"op": op, "value": "1"}])
    assert resp.status_code == 400
    assert resp.json()["detail"] == detail
    assert service.executed == []


@pytest.mark.parametrize("operation", [
    {"op": "set_packets"},
    {"op": "set_packets", "value": ""},
    {"op": "delete_interface"},
    {"op": "set_interface_igmp_join_source"},
    {"op": "delete_rp_address"},
])
def test_missing_value_is_400(client, operation):
    test_client, service = client
    resp = _post(test_client, [operation])
    assert resp.status_code == 400
    assert "requires a value" in resp.json()["detail"]
    assert service.executed == []


@pytest.mark.parametrize("op, value, count", [
    ("set_interface_igmp_join_source", "eth0,239.1.1.1", 3),
    ("set_interface_igmp_join_source", "eth0,,192.0.2.1", 3),
    ("set_rp_address_group", "192.0.2.50", 2),
    ("set_interface_hello", "eth0,", 2),
])
def test_short_multi_arg_value_is_400(client, op, value, count):
    test_client, service = client
    resp = _post(test_client, [{"op": op, "value": value}])
    assert resp.status_code == 400
    assert f"requires {count} values" in resp.json()["detail"]
    assert service.executed == []


@pytest.mark.parametrize("operation", [
    {"op": "delete_packets", "value": "3"},
    {"op": "set_ecmp", "value": "true"},
    {"op": "delete_pim", "value": "x"},
    {"op": "delete_rp", "value": "192.0.2.50"},
])
def test_value_on_zero_arg_op_is_400(client, operation):
    test_client, service = client
    resp = _post(test_client, [operation])
    assert resp.status_code == 400
    assert resp.json()["detail"] == f"Operation {operation['op']} takes no value"
    assert service.executed == []


@pytest.mark.parametrize("operation, needle", [
    ({"op": "set_packets", "value": "256"}, "packets"),
    ({"op": "set_join_prune_interval", "value": "0"}, "timer"),
    ({"op": "set_rp_keep_alive_timer", "value": "65536"}, "timer"),
    ({"op": "set_igmp_watermark_warning", "value": "70000"}, "watermark_warning"),
    ({"op": "set_interface_dr_priority", "value": "eth0,4294967296"}, "dr_priority"),
    ({"op": "set_interface_hello", "value": "eth0,181"}, "hello"),
    ({"op": "set_interface_igmp_query_interval", "value": "eth0,1801"}, "query_interval"),
    ({"op": "set_interface_igmp_query_max_response_time", "value": "eth0,9"}, "query_max_response_time"),
    ({"op": "set_interface_igmp_version", "value": "eth0,4"}, "igmp_version"),
    ({"op": "set_rp_address_group", "value": "192.0.2.50,224.1.1.1/16"}, "host bits"),
    ({"op": "set_rp_address_group", "value": "192.0.2.50,10.0.0.0/8"}, "224.0.0.0/4"),
    ({"op": "set_rp_address", "value": "2001:db8::1"}, "IPv4"),
    ({"op": "set_interface_source_address", "value": "eth0,192.0.2.0/24"}, "IPv4"),
    ({"op": "set_ssm_prefix_list", "value": "PL.1"}, "prefix-list name"),
    ({"op": "set_interface", "value": "foo0"}, "interface name is not valid"),
    ({"op": "set_interface_igmp_join", "value": "eth0,224.0.0.1"}, "reserved"),
    ({"op": "set_interface_bfd_profile", "value": "eth0,a b"}, "bfd profile"),
])
def test_out_of_range_value_is_400(client, operation, needle):
    test_client, service = client
    resp = _post(test_client, [{"op": "set_ecmp"}, operation])
    assert resp.status_code == 400, resp.text
    assert needle in resp.json()["detail"]
    assert service.executed == []


def test_comma_in_last_part_is_kept_and_rejected_by_the_builder(client):
    test_client, service = client
    resp = _post(test_client, [{"op": "set_interface_bfd_profile", "value": "eth0,a,b"}])
    assert resp.status_code == 400
    assert "bfd profile" in resp.json()["detail"]
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


def test_capabilities_route_serves_builder_ranges(client):
    from vyos_builders.pim.pim_batch_builder import RANGES

    test_client, _service = client
    resp = test_client.get("/vyos/pim/capabilities")
    assert resp.status_code == 200
    body = resp.json()
    assert "version_info" not in body
    assert body["ranges"] == RANGES


@pytest.mark.parametrize("method,path", [
    ("get", "/vyos/pim/capabilities"),
    ("get", "/vyos/pim/config"),
    ("post", "/vyos/pim/batch"),
])
def test_session_http_error_passes_through(monkeypatch, method, path):
    async def allow(*_args, **_kwargs):
        return None

    def no_session(_req):
        raise HTTPException(status_code=400, detail="No active session")

    monkeypatch.setattr(f"{ROUTER}.require_write_permission", allow)
    monkeypatch.setattr(f"{ROUTER}.require_read_permission", allow)
    monkeypatch.setattr(f"{ROUTER}.get_session_vyos_service", no_session)

    from routers.pim.pim import router

    app = FastAPI()
    app.include_router(router)
    kwargs = {"json": {"operations": [{"op": "delete_pim"}]}} if method == "post" else {}
    resp = getattr(TestClient(app), method)(path, **kwargs)
    assert resp.status_code == 400
    assert resp.json()["detail"] == "No active session"


@pytest.mark.parametrize("method,path,kind", [
    ("get", "/vyos/pim/capabilities", "read"),
    ("get", "/vyos/pim/config", "read"),
    ("post", "/vyos/pim/batch", "write"),
])
def test_routes_check_the_pim_permission(monkeypatch, method, path, kind):
    from rbac_permissions import FeatureGroup

    seen = []

    def recorder(name):
        async def check(_request, feature):
            seen.append((name, feature))
            raise HTTPException(status_code=403, detail="Forbidden")
        return check

    monkeypatch.setattr(f"{ROUTER}.require_read_permission", recorder("read"))
    monkeypatch.setattr(f"{ROUTER}.require_write_permission", recorder("write"))

    from routers.pim.pim import router

    app = FastAPI()
    app.include_router(router)
    kwargs = {"json": {"operations": []}} if method == "post" else {}
    resp = getattr(TestClient(app), method)(path, **kwargs)
    assert resp.status_code == 403, resp.text
    assert seen == [(kind, FeatureGroup.PIM)]
