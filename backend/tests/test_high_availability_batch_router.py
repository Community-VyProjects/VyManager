"""High-availability routes: item_name plus "|" values, HTTP 400 on a bad value.

execute_batch and get_full_config run through run_in_threadpool (locked in
test_batch_off_event_loop.py). These tests drive the handlers end to end with
a stub service so the emitted ops, the 400 paths and the config response are
checked.
"""

import inspect
from types import SimpleNamespace

import pytest
from fastapi import FastAPI, HTTPException
from fastapi.testclient import TestClient

ROUTER = "routers.high_availability.high_availability"
BASE = ["high-availability"]


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


def _app(monkeypatch, service, checks=None):
    def recorder(kind):
        async def check(_request, feature):
            if checks is not None:
                checks.append((kind, feature))
        return check

    monkeypatch.setattr(f"{ROUTER}.require_write_permission", recorder("write"))
    monkeypatch.setattr(f"{ROUTER}.require_read_permission", recorder("read"))
    monkeypatch.setattr(f"{ROUTER}.get_session_vyos_service", lambda _req: service)

    from routers.high_availability.high_availability import router

    app = FastAPI()
    app.include_router(router)
    return TestClient(app, raise_server_exceptions=False)


@pytest.fixture
def client(monkeypatch):
    service = Service()
    return _app(monkeypatch, service), service


def _post(test_client, item_name, operations):
    return test_client.post(
        "/vyos/high-availability/batch",
        json={"item_name": item_name, "operations": operations},
    )


@pytest.mark.parametrize("version", ["1.4", "1.5"])
def test_every_builder_op_takes_the_item_and_at_most_two_values(version):
    from vyos_builders.high_availability import HighAvailabilityBatchBuilder

    builder = HighAvailabilityBatchBuilder(version)
    params = {
        name: list(inspect.signature(method).parameters)
        for name, method in inspect.getmembers(builder, inspect.ismethod)
        if name.startswith(("set_", "delete_", "create_"))
    }
    assert params
    assert {name: p for name, p in params.items() if not 1 <= len(p) <= 3} == {}
    # The router keys the item_name check on this name.
    assert {name: p[0] for name, p in params.items() if p[0] not in ("name", "_name")} == {}


def test_batch_binds_item_name_and_value_onto_builder_args(client):
    test_client, service = client
    resp = _post(test_client, "G1", [
        {"op": "create_vrrp_group"},
        {"op": "set_vrrp_group_vrid", "value": "10"},
        {"op": "set_vrrp_group_address_interface", "value": "192.0.2.1/24|eth1"},
        {"op": "set_vrrp_group_description", "value": "a|b"},
        {"op": "delete_vrrp_group_priority"},
    ])
    assert resp.status_code == 200, resp.text
    assert resp.json() == {"success": True, "data": None, "error": None}
    assert service.executed == [[
        {"op": "set", "path": BASE + ["vrrp", "group", "G1"]},
        {"op": "set", "path": BASE + ["vrrp", "group", "G1", "vrid", "10"]},
        {"op": "set", "path": BASE + ["vrrp", "group", "G1", "address", "192.0.2.1/24", "interface", "eth1"]},
        {"op": "set", "path": BASE + ["vrrp", "group", "G1", "description", "a|b"]},
        {"op": "delete", "path": BASE + ["vrrp", "group", "G1", "priority"]},
    ]]


def test_real_server_ops_take_the_server_and_value(client):
    test_client, service = client
    resp = _post(test_client, "V1", [
        {"op": "set_virtual_server_real_server_port", "value": "192.0.2.10|8080"},
        {"op": "set_virtual_server_real_server_health_check_script", "value": "192.0.2.10|/config/a|b.sh"},
        {"op": "delete_virtual_server_real_server_connection_timeout", "value": "192.0.2.10"},
    ])
    assert resp.status_code == 200, resp.text
    assert service.executed == [[
        {"op": "set", "path": BASE + ["virtual-server", "V1", "real-server", "192.0.2.10", "port", "8080"]},
        {"op": "set", "path": BASE + [
            "virtual-server", "V1", "real-server", "192.0.2.10", "health-check", "script", "/config/a|b.sh",
        ]},
        {"op": "delete", "path": BASE + ["virtual-server", "V1", "real-server", "192.0.2.10", "connection-timeout"]},
    ]]


@pytest.mark.parametrize("item_name", ["", "G1"])
def test_global_op_ignores_the_request_item(client, item_name):
    test_client, service = client
    resp = _post(test_client, item_name, [
        {"op": "set_vrrp_global_version", "value": "3"},
        {"op": "set_ha_disable"},
    ])
    assert resp.status_code == 200, resp.text
    assert service.executed == [[
        {"op": "set", "path": BASE + ["vrrp", "global-parameters", "version", "3"]},
        {"op": "set", "path": BASE + ["disable"]},
    ]]


@pytest.mark.parametrize("item_name", ["", "   "])
@pytest.mark.parametrize("op", ["delete_vrrp_group", "create_virtual_server", "delete_vrrp_sync_group"])
def test_object_op_without_item_name_is_400(client, item_name, op):
    test_client, service = client
    resp = _post(test_client, item_name, [{"op": op}])
    assert resp.status_code == 400, resp.text
    assert resp.json()["detail"] == f"Operation {op} requires item_name"
    assert service.executed == []


@pytest.mark.parametrize("operation", [
    {"op": "set_vrrp_group_vrid"},
    {"op": "set_vrrp_group_vrid", "value": ""},
    {"op": "set_vrrp_group_vrid", "value": "   "},
    {"op": "set_virtual_server_real_server_port"},
    {"op": "set_virtual_server_real_server_port", "value": ""},
])
def test_missing_value_is_400(client, operation):
    test_client, service = client
    resp = _post(test_client, "G1", [operation])
    assert resp.status_code == 400, resp.text
    assert resp.json()["detail"] == f"Operation {operation['op']} requires a value"
    assert service.executed == []


@pytest.mark.parametrize("op", [
    "set_vrrp_group_address_interface",
    "set_vrrp_group_excluded_address_interface",
    "set_virtual_server_real_server_port",
    "set_virtual_server_real_server_connection_timeout",
    "set_virtual_server_real_server_health_check_script",
])
@pytest.mark.parametrize("value", ["192.0.2.1", "192.0.2.1|", "|8080", "|", "192.0.2.1| "])
def test_short_composite_value_is_400(client, op, value):
    test_client, service = client
    resp = _post(test_client, "G1", [{"op": op, "value": value}])
    assert resp.status_code == 400, resp.text
    assert resp.json()["detail"] == f"Operation {op} requires 2 values"
    assert service.executed == []


@pytest.mark.parametrize("item_name,op", [
    ("G1", "delete_vrrp_group"),
    ("G1", "delete_vrrp_group_priority"),
    ("", "set_ha_disable"),
    ("V1", "delete_virtual_server"),
])
def test_item_only_op_with_a_value_is_400(client, item_name, op):
    """A value on an item-only op must not run the wider op on the item."""
    test_client, service = client
    resp = _post(test_client, item_name, [
        {"op": "set_vrrp_global_version", "value": "3"},
        {"op": op, "value": "x"},
    ])
    assert resp.status_code == 400, resp.text
    assert resp.json()["detail"] == f"Operation {op} takes no value"
    assert service.executed == []


@pytest.mark.parametrize("op,detail", [
    ("no_such_op", "Unknown operation: no_such_op"),
    ("_versioned_path", "Invalid operation: _versioned_path"),
    ("get_capabilities", "Invalid operation: get_capabilities"),
])
def test_unknown_or_internal_op_is_400(client, op, detail):
    test_client, service = client
    resp = _post(test_client, "G1", [{"op": op, "value": "x"}])
    assert resp.status_code == 400, resp.text
    assert resp.json()["detail"] == detail
    assert service.executed == []


@pytest.mark.parametrize("op,value", [
    ("set_vrrp_snmp_trap", None),
    ("set_vrrp_group_health_check_timeout", "5"),
    ("delete_vrrp_sync_group_health_check_timeout", None),
])
def test_v15_only_op_on_1_4_is_400(monkeypatch, op, value):
    service = Service(version="1.4")
    test_client = _app(monkeypatch, service)
    resp = _post(test_client, "G1", [
        {"op": "set_vrrp_group_priority", "value": "100"},
        {"op": op, "value": value},
    ])
    assert resp.status_code == 400, resp.text
    node = "vrrp snmp trap" if "trap" in op else (
        "vrrp group health-check timeout" if "sync" not in op else "vrrp sync-group health-check timeout"
    )
    assert resp.json()["detail"] == f"{node} is not supported on this device"
    assert service.executed == []


def test_bad_forward_method_is_400(client):
    test_client, service = client
    resp = _post(test_client, "V1", [{"op": "set_virtual_server_forward_method", "value": "dr"}])
    assert resp.status_code == 400, resp.text
    assert resp.json()["detail"] == "forward-method dr is not supported on this device"
    assert service.executed == []


def test_batch_with_no_ops_returns_success_without_the_device(client):
    test_client, service = client
    resp = _post(test_client, "", [])
    assert resp.status_code == 200, resp.text
    assert resp.json() == {"success": True, "data": None, "error": None}
    assert service.executed == []


def test_execute_value_error_stays_500(monkeypatch):
    class Failing(Service):
        def execute_batch(self, batch):
            raise ValueError("Cannot execute empty batch")

    test_client = _app(monkeypatch, Failing())
    resp = _post(test_client, "", [{"op": "set_vrrp_global_version", "value": "3"}])
    assert resp.status_code == 500, resp.text


@pytest.mark.parametrize("status,error", [(400, "Commit failed"), (200, "Commit failed")])
def test_failed_commit_returns_the_error(monkeypatch, status, error):
    service = Service(status=status, error=error)
    test_client = _app(monkeypatch, service)
    resp = _post(test_client, "", [{"op": "set_vrrp_global_version", "value": "3"}])
    assert resp.status_code == 200, resp.text
    assert resp.json() == {"success": False, "data": None, "error": "Commit failed"}


def test_config_route_masks_the_password(monkeypatch):
    service = Service(config={"high-availability": {"vrrp": {"group": {"G1": {
        "vrid": "10", "authentication": {"type": "plaintext-password", "password": "s3cret"},
    }}}}})
    test_client = _app(monkeypatch, service)
    resp = test_client.get("/vyos/high-availability/config")
    assert resp.status_code == 200, resp.text
    assert resp.json()["vrrp"]["groups"][0]["authentication"] == {"type": "plaintext-password", "password": "***"}
    assert "s3cret" not in resp.text


@pytest.mark.parametrize("version,supported", [("1.4", False), ("1.5", True)])
def test_capabilities_route(monkeypatch, version, supported):
    test_client = _app(monkeypatch, Service(version=version))
    resp = test_client.get("/vyos/high-availability/capabilities")
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["features"]["vrrp_snmp_trap"]["supported"] is supported
    assert body["auth_types"] == ["plaintext-password", "ah"]


@pytest.mark.parametrize("method,path,kind,body", [
    ("get", "/vyos/high-availability/capabilities", "read", None),
    ("get", "/vyos/high-availability/config", "read", None),
    ("post", "/vyos/high-availability/batch", "write", {"item_name": "", "operations": []}),
])
def test_routes_check_the_feature_permission(monkeypatch, method, path, kind, body):
    from rbac_permissions import FeatureGroup

    checks = []
    test_client = _app(monkeypatch, Service(), checks)
    resp = test_client.request(method, path, json=body)
    assert resp.status_code == 200, resp.text
    assert checks == [(kind, FeatureGroup.HIGH_AVAILABILITY)]


@pytest.mark.parametrize("method,path,body", [
    ("get", "/vyos/high-availability/capabilities", None),
    ("get", "/vyos/high-availability/config", None),
    ("post", "/vyos/high-availability/batch", {"item_name": "", "operations": []}),
])
def test_session_lookup_400_passes_through(monkeypatch, method, path, body):
    test_client = _app(monkeypatch, Service())

    def no_session(_request):
        raise HTTPException(status_code=400, detail="No active session")

    monkeypatch.setattr(f"{ROUTER}.get_session_vyos_service", no_session)
    resp = test_client.request(method, path, json=body)
    assert resp.status_code == 400, resp.text
    assert resp.json()["detail"] == "No active session"
