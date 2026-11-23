"""Webproxy routes: comma-split batch args, HTTP 400 paths, session and permission checks.

execute_batch runs through run_in_threadpool (locked in
test_batch_off_event_loop.py). These tests drive the handlers end to end with a
stub service so the emitted ops and the 400 paths are checked.
"""

from types import SimpleNamespace

import pytest
from fastapi import FastAPI, HTTPException
from fastapi.testclient import TestClient

ROUTER = "routers.webproxy.webproxy"


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

        def get_full_config(self, refresh=False):
            return {"service": {"webproxy": {
                "cache-size": "100",
                "authentication": {"method": "ldap", "ldap": {"password": "s3cret"}},
            }}}

        def execute_batch(self, batch):
            if batch.is_empty():
                raise ValueError("Cannot execute empty batch")
            executed.append(batch.get_operations())
            return SimpleNamespace(status=commit["status"], result="", error=commit["error"])

    monkeypatch.setattr(f"{ROUTER}.require_read_permission", allow)
    monkeypatch.setattr(f"{ROUTER}.require_write_permission", allow)
    monkeypatch.setattr(f"{ROUTER}.get_session_vyos_service", lambda _req: Service())

    from routers.webproxy.webproxy import router

    app = FastAPI()
    app.include_router(router)
    return TestClient(app), executed


def _post(test_client, operations):
    return test_client.post("/vyos/webproxy/batch", json={"operations": operations})


def test_config_parses_through_the_mapper_and_masks_the_ldap_password(client):
    test_client, _executed = client
    resp = test_client.get("/vyos/webproxy/config")
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["cache_size"] == 100
    assert body["authentication"]["method"] == "ldap"
    assert body["authentication"]["ldap"]["password"] == "***"


def test_batch_splits_values_onto_builder_args(client):
    test_client, executed = client
    resp = _post(test_client, [
        {"op": "set_disable_access_log"},
        {"op": "set_ldap_base_dn", "value": "dc=example,dc=com"},
        {"op": "set_cache_peer_options", "value": "p1,no-query,default"},
        {"op": "set_squidguard_time_period_day_time", "value": "work,mon,08:00-17:00"},
    ])
    assert resp.status_code == 200, resp.text
    assert resp.json() == {
        "success": True,
        "data": {"message": "Web proxy configuration updated"},
        "error": None,
    }
    base = ["service", "webproxy"]
    assert executed == [[
        {"op": "set", "path": base + ["disable-access-log"]},
        {"op": "set", "path": base + ["authentication", "ldap", "base-dn", "dc=example,dc=com"]},
        {"op": "set", "path": base + ["cache-peer", "p1", "options", "no-query,default"]},
        {"op": "set", "path": base + [
            "url-filtering", "squidguard", "time-period", "work", "days", "mon", "time", "08:00-17:00",
        ]},
    ]]


@pytest.mark.parametrize("operation", [
    {"op": "set_cache_size"},
    {"op": "set_cache_size", "value": ""},
    {"op": "delete_cache_peer"},
    {"op": "delete_cache_peer", "value": ""},
])
def test_batch_missing_value_is_400(client, operation):
    test_client, executed = client
    resp = _post(test_client, [operation])
    assert resp.status_code == 400, resp.text
    assert resp.json()["detail"] == f"Operation {operation['op']} requires a value"
    assert executed == []


@pytest.mark.parametrize("operation", [
    {"op": "set_disable_access_log", "value": "true"},
    {"op": "delete_webproxy", "value": "p1"},
    {"op": "delete_authentication", "value": "ldap"},
    {"op": "delete_ldap_password", "value": "secret"},
])
def test_batch_value_on_zero_arg_op_is_400(client, operation):
    """A value on a zero-arg op is 400, not the op run with the value dropped."""
    test_client, executed = client
    resp = _post(test_client, [{"op": "set_cache_size", "value": "100"}, operation])
    assert resp.status_code == 400, resp.text
    assert resp.json()["detail"] == f"Operation {operation['op']} takes no value"
    assert executed == []


@pytest.mark.parametrize("value", ["p1", "p1,", ",192.0.2.1"])
def test_batch_short_value_is_400(client, value):
    test_client, executed = client
    resp = _post(test_client, [{"op": "set_cache_peer_address", "value": value}])
    assert resp.status_code == 400, resp.text
    assert resp.json()["detail"] == "Operation set_cache_peer_address requires 2 values"
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


def test_batch_failed_commit_returns_error_without_data(client, commit):
    test_client, executed = client
    commit.update(status=400, error="Commit failed")
    resp = _post(test_client, [{"op": "set_disable_access_log"}])
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
    ("get", "/vyos/webproxy/capabilities"),
    ("get", "/vyos/webproxy/config"),
    ("post", "/vyos/webproxy/batch"),
])
def test_session_lookup_http_error_is_not_a_500(monkeypatch, method, path):
    async def allow(*_args, **_kwargs):
        return None

    def no_session(_req):
        raise HTTPException(status_code=400, detail="No active instance")

    monkeypatch.setattr(f"{ROUTER}.require_read_permission", allow)
    monkeypatch.setattr(f"{ROUTER}.require_write_permission", allow)
    monkeypatch.setattr(f"{ROUTER}.get_session_vyos_service", no_session)

    from routers.webproxy.webproxy import router

    app = FastAPI()
    app.include_router(router)
    test_client = TestClient(app)
    kwargs = {"json": {"operations": []}} if method == "post" else {}
    resp = getattr(test_client, method)(path, **kwargs)
    assert resp.status_code == 400, resp.text
    assert resp.json()["detail"] == "No active instance"


@pytest.mark.parametrize("method, path, kind", [
    ("get", "/vyos/webproxy/capabilities", "read"),
    ("get", "/vyos/webproxy/config", "read"),
    ("post", "/vyos/webproxy/batch", "write"),
])
def test_routes_check_the_webproxy_permission(monkeypatch, method, path, kind):
    from rbac_permissions import FeatureGroup

    seen = []

    def recorder(name):
        async def check(_request, feature):
            seen.append((name, feature))
            raise HTTPException(status_code=403, detail="Forbidden")
        return check

    monkeypatch.setattr(f"{ROUTER}.require_read_permission", recorder("read"))
    monkeypatch.setattr(f"{ROUTER}.require_write_permission", recorder("write"))

    from routers.webproxy.webproxy import router

    app = FastAPI()
    app.include_router(router)
    kwargs = {"json": {"operations": []}} if method == "post" else {}
    resp = getattr(TestClient(app), method)(path, **kwargs)
    assert resp.status_code == 403, resp.text
    assert seen == [(kind, FeatureGroup.WEBPROXY)]
