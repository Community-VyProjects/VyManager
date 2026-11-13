"""Local-route batch and reorder routes: 400 on bad ops, commit off the loop.

execute_batch runs through run_in_threadpool (locked in
test_batch_off_event_loop.py). These tests drive the handlers end to end with
a stub service so the emitted ops and the 400/500 paths are checked.
"""

from types import SimpleNamespace

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

ROUTER = "routers.local_route.local_route"
V4 = ["policy", "local-route", "rule"]
V6 = ["policy", "local-route6", "rule"]


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
            executed.append([(item["op"], item["path"]) for item in batch.get_operations()])
            return SimpleNamespace(status=200, result="", error=None)

    monkeypatch.setattr(f"{ROUTER}.require_write_permission", allow)
    monkeypatch.setattr(f"{ROUTER}.get_session_vyos_service", lambda _req: Service())

    from routers.local_route.local_route import router

    app = FastAPI()
    app.include_router(router)
    return TestClient(app), executed


def _batch(test_client, operations, rule_type="ipv4"):
    return test_client.post(
        "/vyos/local-route/batch",
        json={"rule_number": 10, "rule_type": rule_type, "operations": operations},
    )


def test_batch_passes_rule_number_and_value(client):
    test_client, executed = client
    resp = _batch(test_client, [
        {"op": "set_local_route_rule"},
        {"op": "set_local_route_rule_source", "value": "192.0.2.1"},
        {"op": "delete_local_route_rule_fwmark", "value": "ignored"},
        {"op": "set_local_route6_rule_set_table", "value": "main"},
    ])
    assert resp.status_code == 200, resp.text
    assert resp.json()["success"] is True
    assert executed == [[
        ("set", V4 + ["10"]),
        ("set", V4 + ["10", "source", "address", "192.0.2.1"]),
        ("delete", V4 + ["10", "fwmark"]),
        ("set", V6 + ["10", "set", "table", "main"]),
    ]]


@pytest.mark.parametrize("operation", [
    {"op": "set_local_route_rule_source"},
    {"op": "set_local_route_rule_source", "value": ""},
    {"op": "set_local_route6_rule_protocol", "value": None},
])
def test_batch_missing_value_is_400(client, operation):
    test_client, executed = client
    resp = _batch(test_client, [operation])
    assert resp.status_code == 400, resp.text
    assert resp.json()["detail"] == f"Operation {operation['op']} requires a value"
    assert executed == []


def test_batch_unknown_op_is_400(client):
    test_client, executed = client
    resp = _batch(test_client, [{"op": "no_such_op", "value": "x"}])
    assert resp.status_code == 400, resp.text
    assert resp.json()["detail"] == "Unknown operation: no_such_op"
    assert executed == []


def test_batch_internal_op_is_400(client):
    test_client, executed = client
    resp = _batch(test_client, [{"op": "clear"}])
    assert resp.status_code == 400, resp.text
    assert resp.json()["detail"] == "Invalid operation: clear"
    assert executed == []


def test_batch_empty_is_500(client):
    """execute_batch raises ValueError for an empty batch; that stays a 500."""
    test_client, executed = client
    resp = _batch(test_client, [])
    assert resp.status_code == 500, resp.text
    assert resp.json()["detail"] == "Internal server error"
    assert executed == []


def _reorder(test_client, rules, rule_type="ipv4"):
    return test_client.post(
        "/vyos/local-route/reorder", json={"rule_type": rule_type, "rules": rules}
    )


FULL_RULE = {
    "rule_number": 10,
    "source": "192.0.2.1",
    "destination": "192.0.2.8",
    "inbound_interface": "eth0",
    "fwmark": "1",
    "protocol": "tcp",
    "source_port": "80",
    "destination_port": "443",
    "table": "100",
    "vrf": None,
}


@pytest.mark.parametrize("rule_type, base", [("ipv4", V4), ("ipv6", V6)])
def test_reorder_recreates_every_leaf(client, rule_type, base):
    test_client, executed = client
    resp = _reorder(test_client, [
        {"old_number": 10, "new_number": 20, "rule_data": FULL_RULE},
        {"old_number": 20, "new_number": 10, "rule_data": {"rule_number": 20, "table": "main"}},
    ], rule_type)
    assert resp.status_code == 200, resp.text
    assert resp.json()["success"] is True
    assert executed == [[
        ("delete", base + ["20"]),
        ("delete", base + ["10"]),
        ("set", base + ["20"]),
        ("set", base + ["20", "source", "address", "192.0.2.1"]),
        ("set", base + ["20", "destination", "address", "192.0.2.8"]),
        ("set", base + ["20", "inbound-interface", "eth0"]),
        ("set", base + ["20", "fwmark", "1"]),
        ("set", base + ["20", "protocol", "tcp"]),
        ("set", base + ["20", "source", "port", "80"]),
        ("set", base + ["20", "destination", "port", "443"]),
        ("set", base + ["20", "set", "table", "100"]),
        ("set", base + ["10"]),
        ("set", base + ["10", "set", "table", "main"]),
    ]]


def test_reorder_rejects_unknown_rule_type(client):
    test_client, executed = client
    resp = _reorder(test_client, [{"old_number": 10, "new_number": 20, "rule_data": {}}], "ipv5")
    assert resp.status_code == 422, resp.text
    assert executed == []


def test_reorder_rejects_missing_numbers(client):
    test_client, executed = client
    resp = _reorder(test_client, [{"new_number": 20, "rule_data": {}}])
    assert resp.status_code == 422, resp.text
    assert executed == []


def test_reorder_empty_is_500(client):
    """execute_batch raises ValueError for an empty batch; that stays a 500."""
    test_client, executed = client
    resp = _reorder(test_client, [])
    assert resp.status_code == 500, resp.text
    assert resp.json()["detail"] == "Internal server error"
    assert executed == []
