"""IS-IS batch route: comma-split args, HTTP 400 on a missing value.

execute_batch runs through run_in_threadpool (locked in
test_batch_off_event_loop.py). These tests drive the handler end to end with a
stub service so the emitted ops and the 400 paths are checked.
"""

from types import SimpleNamespace

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

ROUTER = "routers.isis.isis"
BASE = ["protocols", "isis"]


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

    from routers.isis.isis import router

    app = FastAPI()
    app.include_router(router)
    return TestClient(app), executed


def _post(test_client, operations):
    return test_client.post("/vyos/isis/batch", json={"operations": operations})


def test_batch_splits_values_onto_builder_args(client):
    test_client, executed = client
    resp = _post(test_client, [
        {"op": "set_overload_bit"},
        {"op": "set_level", "value": "level-1-2"},
        {"op": "set_interface_password_plaintext", "value": "eth0,pa,ss"},
        {"op": "set_redistribute_ipv4_metric", "value": "bgp|level-1,10"},
        {"op": "set_frr_lfa_tiebreaker_index", "value": "downstream,10,level-1"},
    ])
    assert resp.status_code == 200, resp.text
    assert resp.json()["success"] is True
    assert executed == [[
        {"op": "set", "path": BASE + ["set-overload-bit"]},
        {"op": "set", "path": BASE + ["level", "level-1-2"]},
        {"op": "set", "path": BASE + ["interface", "eth0", "password", "plaintext-password", "pa,ss"]},
        {"op": "set", "path": BASE + ["redistribute", "ipv4", "bgp", "level-1", "metric", "10"]},
        {"op": "set", "path": BASE + [
            "fast-reroute", "lfa", "local", "tiebreaker", "downstream", "index", "10", "level-1",
        ]},
    ]]


@pytest.mark.parametrize("operation", [
    {"op": "set_level"},
    {"op": "set_level", "value": ""},
    {"op": "delete_interface"},
])
def test_batch_missing_value_is_400(client, operation):
    test_client, executed = client
    resp = _post(test_client, [operation])
    assert resp.status_code == 400, resp.text
    assert resp.json()["detail"] == f"Operation {operation['op']} requires a value"
    assert executed == []


@pytest.mark.parametrize("value", ["eth0", "eth0,", ",10"])
def test_batch_short_value_is_400(client, value):
    test_client, executed = client
    resp = _post(test_client, [{"op": "set_interface_metric", "value": value}])
    assert resp.status_code == 400, resp.text
    assert resp.json()["detail"] == "Operation set_interface_metric requires 2 values"
    assert executed == []


def test_batch_unknown_op_is_400(client):
    test_client, executed = client
    resp = _post(test_client, [{"op": "no_such_op", "value": "x"}])
    assert resp.status_code == 400, resp.text
    assert resp.json()["detail"] == "Unknown operation: no_such_op"
    assert executed == []


def test_batch_missing_leaf_on_version_is_400(client):
    """The 1.4 mapper raises ValueError for TI-LFA; the op loop turns it into 400."""
    test_client, executed = client
    resp = _post(test_client, [{"op": "set_interface_ti_lfa_level1", "value": "eth0"}])
    assert resp.status_code == 400, resp.text
    assert "requires VyOS 1.5" in resp.json()["detail"]
    assert executed == []


def test_batch_empty_is_500(client):
    """execute_batch raises ValueError for an empty batch; that stays a 500."""
    test_client, executed = client
    resp = _post(test_client, [])
    assert resp.status_code == 500, resp.text
    assert resp.json()["detail"] == "Internal server error"
    assert executed == []
