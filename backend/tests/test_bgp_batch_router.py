"""BGP batch route: comma-split args, HTTP 400 on a missing value.

execute_batch runs through run_in_threadpool. An empty batch stays a 500.
"""

from types import SimpleNamespace

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

ROUTER = "routers.bgp.bgp"
BASE = ["protocols", "bgp"]


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

    from routers.bgp.bgp import router

    app = FastAPI()
    app.include_router(router)
    return TestClient(app), executed


def _post(test_client, operations):
    return test_client.post("/vyos/bgp/batch", json={"operations": operations})


def test_batch_splits_values_onto_builder_args(client):
    test_client, executed = client
    resp = _post(test_client, [
        {"op": "set_parameters_log_neighbor_changes"},
        {"op": "set_system_as", "value": "65000"},
        {"op": "set_neighbor_remote_as", "value": "192.0.2.1,65100"},
        {"op": "set_af_redistribute_metric", "value": "ipv4-unicast,connected,10"},
    ])
    assert resp.status_code == 200, resp.text
    assert resp.json()["success"] is True
    assert executed == [[
        {"op": "set", "path": BASE + ["parameters", "log-neighbor-changes"]},
        {"op": "set", "path": BASE + ["system-as", "65000"]},
        {"op": "set", "path": BASE + ["neighbor", "192.0.2.1", "remote-as", "65100"]},
        {"op": "set", "path": BASE + ["address-family", "ipv4-unicast", "redistribute", "connected", "metric", "10"]},
    ]]


@pytest.mark.parametrize("operation", [
    {"op": "set_system_as"},
    {"op": "set_system_as", "value": ""},
    {"op": "set_neighbor_remote_as"},
])
def test_batch_missing_value_is_400(client, operation):
    test_client, executed = client
    resp = _post(test_client, [operation])
    assert resp.status_code == 400, resp.text
    assert resp.json()["detail"] == f"Operation {operation['op']} requires a value"
    assert executed == []


@pytest.mark.parametrize("value", ["192.0.2.1", "192.0.2.1,", ",65100"])
def test_batch_short_value_is_400(client, value):
    test_client, executed = client
    resp = _post(test_client, [{"op": "set_neighbor_remote_as", "value": value}])
    assert resp.status_code == 400, resp.text
    assert resp.json()["detail"] == "Operation set_neighbor_remote_as requires 2 values"
    assert executed == []


def test_batch_unknown_op_is_400(client):
    test_client, executed = client
    resp = _post(test_client, [{"op": "no_such_op", "value": "x"}])
    assert resp.status_code == 400, resp.text
    assert resp.json()["detail"] == "Unknown operation: no_such_op"
    assert executed == []


def test_batch_missing_leaf_on_version_is_400(client):
    test_client, executed = client
    resp = _post(test_client, [{"op": "set_parameters_as_notation", "value": "asdot"}])
    assert resp.status_code == 400, resp.text
    assert "not supported" in resp.json()["detail"]
    assert executed == []


def test_batch_empty_is_500(client):
    test_client, executed = client
    resp = _post(test_client, [])
    assert resp.status_code == 500, resp.text
    assert resp.json()["detail"] == "Internal server error"
    assert executed == []
