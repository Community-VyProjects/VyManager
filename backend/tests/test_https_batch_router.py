"""HTTPS routes: comma-split batch args, HTTP 400 paths, session and permission checks.

execute_batch and get_full_config run through run_in_threadpool (locked in
test_batch_off_event_loop.py). These tests drive the handlers end to end with
a stub service so the emitted ops and the 400 paths are checked.
"""

import pytest
from fastapi import FastAPI, HTTPException
from fastapi.testclient import TestClient

from https_router_client import ROUTER, HttpsService, https_client
from rbac_permissions import FeatureGroup

BASE = ["service", "https"]


@pytest.fixture
def client(monkeypatch):
    service = HttpsService()
    return https_client(monkeypatch, service), service


def _post(test_client, operations):
    return test_client.post("/vyos/https/batch", json={"operations": operations})


def test_batch_splits_values_onto_builder_args(client):
    test_client, service = client
    resp = _post(test_client, [
        {"op": "delete_api_graphql"},
        {"op": "set_listen_address", "value": "192.0.2.1"},
        {"op": "set_api_key", "value": "vym,abc,def"},
        {"op": "set_api_rest"},
        {"op": "delete_api_key", "value": "old"},
    ])
    assert resp.status_code == 200, resp.text
    assert resp.json() == {
        "success": True,
        "data": {"message": "HTTPS service configuration updated"},
        "error": None,
    }
    assert service.executed == [[
        {"op": "delete", "path": BASE + ["api", "graphql"]},
        {"op": "set", "path": BASE + ["listen-address", "192.0.2.1"]},
        {"op": "set", "path": BASE + ["api", "keys", "id", "vym", "key", "abc,def"]},
        {"op": "set", "path": BASE + ["api", "rest"]},
        {"op": "delete", "path": BASE + ["api", "keys", "id", "old"]},
    ]]


@pytest.mark.parametrize("operation", [
    {"op": "set_port"},
    {"op": "set_port", "value": ""},
    {"op": "set_api_key"},
    {"op": "set_api_key", "value": ""},
])
def test_batch_missing_value_is_400(client, operation):
    test_client, service = client
    resp = _post(test_client, [operation])
    assert resp.status_code == 400, resp.text
    assert resp.json()["detail"] == f"Operation {operation['op']} requires a value"
    assert service.executed == []


@pytest.mark.parametrize("value", ["vym", "vym,", ",secret"])
def test_batch_short_value_is_400(client, value):
    test_client, service = client
    resp = _post(test_client, [{"op": "set_api_key", "value": value}])
    assert resp.status_code == 400, resp.text
    assert resp.json()["detail"] == "Operation set_api_key requires 2 values"
    assert service.executed == []


@pytest.mark.parametrize("operation", [
    {"op": "delete_https", "value": "listen-address"},
    {"op": "delete_api_keys", "value": "vym"},
    {"op": "set_api_graphql", "value": "true"},
    {"op": "delete_port", "value": "443"},
    {"op": "set_api_rest", "value": "x"},
])
def test_batch_value_on_zero_arg_op_is_400(client, operation):
    """A value on a zero-arg op is 400, not the op run with the value dropped."""
    test_client, service = client
    resp = _post(test_client, [{"op": "set_port", "value": "8443"}, operation])
    assert resp.status_code == 400, resp.text
    assert resp.json()["detail"] == f"Operation {operation['op']} takes no value"
    assert service.executed == []


@pytest.mark.parametrize("op, detail", [
    ("no_such_op", "Unknown operation: no_such_op"),
    ("_versioned_path", "Invalid operation: _versioned_path"),
    ("get_capabilities", "Invalid operation: get_capabilities"),
])
def test_batch_unknown_op_is_400(client, op, detail):
    test_client, service = client
    resp = _post(test_client, [{"op": op, "value": "x"}])
    assert resp.status_code == 400, resp.text
    assert resp.json()["detail"] == detail
    assert service.executed == []


@pytest.mark.parametrize("op", ["set_api_rest", "delete_api_rest"])
def test_batch_rest_on_1_4_is_400(monkeypatch, op):
    service = HttpsService(version="1.4")
    resp = _post(https_client(monkeypatch, service), [{"op": op}])
    assert resp.status_code == 400, resp.text
    assert resp.json()["detail"] == "api rest is not supported on this device"
    assert service.executed == []


def test_batch_empty_batch_is_500(client):
    """execute_batch raises ValueError for an empty batch; that is not a 400."""
    test_client, service = client
    resp = _post(test_client, [])
    assert resp.status_code == 500, resp.text
    assert resp.json()["detail"] == "Internal server error"
    assert service.executed == []


def test_batch_failed_commit_omits_updated_message(monkeypatch):
    service = HttpsService(status=400, error="commit failed")
    resp = _post(https_client(monkeypatch, service), [{"op": "delete_port"}])
    assert resp.status_code == 200, resp.text
    assert resp.json() == {"success": False, "data": None, "error": "commit failed"}


def test_capabilities_come_from_the_mapper(monkeypatch):
    resp = https_client(monkeypatch, HttpsService(version="1.4")).get(
        "/vyos/https/capabilities"
    )
    assert resp.status_code == 200, resp.text
    features = resp.json()["features"]
    assert features["api_rest"]["supported"] is False
    assert features["api_cors"]["cors_scope"] == "api"
    assert features["tls_version"]["options"] == ["1.2", "1.3"]
    assert features["api_graphql_auth"]["auth_types"] == ["key", "token"]


@pytest.mark.parametrize("method, path", [
    ("get", "/vyos/https/capabilities"),
    ("get", "/vyos/https/config"),
    ("post", "/vyos/https/batch"),
])
def test_session_http_exception_is_not_swallowed(monkeypatch, method, path):
    def boom(_req):
        raise HTTPException(status_code=503, detail="session down")

    test_client = https_client(monkeypatch, HttpsService(), session=boom)
    kwargs = {"json": {"operations": [{"op": "delete_port"}]}} if method == "post" else {}
    resp = getattr(test_client, method)(path, **kwargs)
    assert resp.status_code == 503, resp.text
    assert resp.json()["detail"] == "session down"


@pytest.mark.parametrize("method, path, kind", [
    ("get", "/vyos/https/capabilities", "read"),
    ("get", "/vyos/https/config", "read"),
    ("post", "/vyos/https/batch", "write"),
])
def test_routes_check_the_https_permission(monkeypatch, method, path, kind):
    seen = []

    def recorder(name):
        async def check(_request, feature):
            seen.append((name, feature))
            raise HTTPException(status_code=403, detail="Forbidden")
        return check

    monkeypatch.setattr(f"{ROUTER}.require_read_permission", recorder("read"))
    monkeypatch.setattr(f"{ROUTER}.require_write_permission", recorder("write"))

    from routers.https.https import router

    app = FastAPI()
    app.include_router(router)
    kwargs = {"json": {"operations": [{"op": "delete_port"}]}} if method == "post" else {}
    resp = getattr(TestClient(app), method)(path, **kwargs)
    assert resp.status_code == 403, resp.text
    assert seen == [(kind, FeatureGroup.HTTPS)]
