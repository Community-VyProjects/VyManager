"""Webproxy batch route: comma-split args, HTTP 400 on a missing value.

execute_batch runs through run_in_threadpool (locked in
test_batch_off_event_loop.py). These tests drive the handler end to end with a
stub service so the emitted ops and the 400 paths are checked.
"""

from types import SimpleNamespace

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

ROUTER = "routers.webproxy.webproxy"


@pytest.fixture
def client(monkeypatch):
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
            return SimpleNamespace(status=200, result="", error=None)

    monkeypatch.setattr(f"{ROUTER}.require_write_permission", allow)
    monkeypatch.setattr(f"{ROUTER}.get_session_vyos_service", lambda _req: Service())

    from routers.webproxy.webproxy import router

    app = FastAPI()
    app.include_router(router)
    return TestClient(app), executed


def _post(test_client, operations):
    return test_client.post("/vyos/webproxy/batch", json={"operations": operations})


def test_batch_splits_values_onto_builder_args(client):
    test_client, executed = client
    resp = _post(test_client, [
        {"op": "set_disable_access_log"},
        {"op": "set_ldap_base_dn", "value": "dc=example,dc=com"},
        {"op": "set_cache_peer_options", "value": "p1,no-query,default"},
        {"op": "set_squidguard_time_period_day_time", "value": "work,mon,08:00-17:00"},
    ])
    assert resp.status_code == 200, resp.text
    assert resp.json()["success"] is True
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
])
def test_batch_missing_value_is_400(client, operation):
    test_client, executed = client
    resp = _post(test_client, [operation])
    assert resp.status_code == 400, resp.text
    assert resp.json()["detail"] == f"Operation {operation['op']} requires a value"
    assert executed == []


@pytest.mark.parametrize("value", ["p1", "p1,", ",192.0.2.1"])
def test_batch_short_value_is_400(client, value):
    test_client, executed = client
    resp = _post(test_client, [{"op": "set_cache_peer_address", "value": value}])
    assert resp.status_code == 400, resp.text
    assert resp.json()["detail"] == "Operation set_cache_peer_address requires 2 values"
    assert executed == []


def test_batch_unknown_op_is_400(client):
    test_client, executed = client
    resp = _post(test_client, [{"op": "no_such_op", "value": "x"}])
    assert resp.status_code == 400, resp.text
    assert resp.json()["detail"] == "Unknown operation: no_such_op"
    assert executed == []


def test_batch_empty_is_500(client):
    """execute_batch raises ValueError for an empty batch; that stays a 500."""
    test_client, executed = client
    resp = _post(test_client, [])
    assert resp.status_code == 500, resp.text
    assert resp.json()["detail"] == "Internal server error"
    assert executed == []
