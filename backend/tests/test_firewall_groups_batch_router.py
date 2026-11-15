"""Firewall groups batch route: dispatch, HTTP 400 paths, empty batch.

execute_batch runs through run_in_threadpool (locked in
test_batch_off_event_loop.py). These tests drive the handler end to end with a
stub service so the emitted ops and the 400 paths are checked.
"""

import inspect
from types import SimpleNamespace

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from dispatchable_ops import dispatchable_ops
from vyos_builders.firewall.groups import FirewallGroupsBatchBuilder

ROUTER = "routers.firewall.groups"
BASE = ["firewall", "group"]


def _client(monkeypatch, version):
    executed = []

    async def allow(*_args, **_kwargs):
        return None

    class Service:
        def get_version(self):
            return version

        def execute_batch(self, batch):
            if batch.is_empty():
                raise ValueError("Cannot execute empty batch")
            executed.append(batch.get_operations())
            return SimpleNamespace(status=200, result="", error=None)

    monkeypatch.setattr(f"{ROUTER}.require_write_permission", allow)
    monkeypatch.setattr(f"{ROUTER}.get_session_vyos_service", lambda _req: Service())

    from routers.firewall.groups import router

    app = FastAPI()
    app.include_router(router)
    return TestClient(app), executed


@pytest.fixture
def client(monkeypatch):
    return _client(monkeypatch, "1.5")


@pytest.fixture
def client_1_4(monkeypatch):
    return _client(monkeypatch, "1.4")


def _post(test_client, operations, group_name="G1"):
    return test_client.post(
        "/vyos/firewall/groups/batch",
        json={"group_name": group_name, "operations": operations},
    )


def test_batch_binds_group_name_and_value(client):
    test_client, executed = client
    resp = _post(test_client, [
        {"op": "set_address_group"},
        {"op": "set_address_group_description", "value": "Internal hosts"},
        {"op": "set_address_group_address", "value": "10.0.0.1-10.0.0.9"},
        {"op": "set_address_group_include", "value": "G2"},
        {"op": "delete_address_group_address", "value": "10.0.0.20"},
        {"op": "delete_address_group_description"},
        {"op": "set_remote_group_url", "value": "https://example.com/list.txt"},
    ])
    assert resp.status_code == 200, resp.text
    assert resp.json() == {"success": True, "data": None, "error": None}
    assert executed == [[
        {"op": "set", "path": BASE + ["address-group", "G1"]},
        {"op": "set", "path": BASE + ["address-group", "G1", "description", "Internal hosts"]},
        {"op": "set", "path": BASE + ["address-group", "G1", "address", "10.0.0.1-10.0.0.9"]},
        {"op": "set", "path": BASE + ["address-group", "G1", "include", "G2"]},
        {"op": "delete", "path": BASE + ["address-group", "G1", "address", "10.0.0.20"]},
        {"op": "delete", "path": BASE + ["address-group", "G1", "description"]},
        {"op": "set", "path": BASE + ["remote-group", "G1", "url", "https://example.com/list.txt"]},
    ]]


def test_batch_ignores_value_on_a_name_only_op(client):
    test_client, executed = client
    resp = _post(test_client, [{"op": "delete_port_group", "value": "unused"}])
    assert resp.status_code == 200, resp.text
    assert executed == [[{"op": "delete", "path": BASE + ["port-group", "G1"]}]]


def test_every_builder_op_takes_the_group_name_then_at_most_one_value():
    """The handler binds group_name first and value second; nothing else fits."""
    for version in ("1.4", "1.5"):
        builder = FirewallGroupsBatchBuilder(version=version)
        ops = dispatchable_ops(builder)
        assert ops, "builder exposes no dispatchable op"
        for name in sorted(ops):
            params = list(inspect.signature(getattr(builder, name)).parameters)
            assert params[0] == "group_name", name
            assert len(params) in (1, 2), name


@pytest.mark.parametrize("operation", [
    {"op": "set_address_group_address"},
    {"op": "set_address_group_address", "value": ""},
    {"op": "delete_mac_group_mac"},
    {"op": "set_port_group_description", "value": ""},
    {"op": "delete_remote_group_url"},
])
def test_batch_missing_value_is_400(client, operation):
    test_client, executed = client
    resp = _post(test_client, [operation])
    assert resp.status_code == 400, resp.text
    assert resp.json()["detail"] == f"{operation['op']} requires a value"
    assert executed == []


@pytest.mark.parametrize("op,detail", [
    ("no_such_op", "Unknown operation: no_such_op"),
    ("mapper_key", "Unknown operation: mapper_key"),
    ("add_set", "Invalid operation: add_set"),
    ("clear", "Invalid operation: clear"),
    ("get_capabilities", "Invalid operation: get_capabilities"),
    ("_operations", "Invalid operation: _operations"),
    ("", "Invalid operation: "),
])
def test_batch_rejects_names_that_are_not_group_ops(client, op, detail):
    test_client, executed = client
    resp = _post(test_client, [{"op": op, "value": "x"}])
    assert resp.status_code == 400, resp.text
    assert resp.json()["detail"] == detail
    assert executed == []


def test_batch_group_type_missing_on_version_is_400(client_1_4):
    """The mapper raises ValueError for remote-group on 1.4; the op loop turns it into 400."""
    test_client, executed = client_1_4
    resp = _post(test_client, [{"op": "set_remote_group"}])
    assert resp.status_code == 400, resp.text
    assert "remote-group" in resp.json()["detail"]
    assert executed == []


def test_batch_empty_is_500(client):
    """execute_batch raises ValueError for an empty batch; that stays a 500."""
    test_client, executed = client
    resp = _post(test_client, [])
    assert resp.status_code == 500, resp.text
    assert resp.json()["detail"] == "Internal server error"
    assert executed == []


def test_batch_reports_a_rejected_commit(monkeypatch):
    """A rejected VyOS commit is HTTP 200 with success false and the error."""
    test_client, _executed = _client(monkeypatch, "1.5")

    class Rejecting:
        def get_version(self):
            return "1.5"

        def execute_batch(self, _batch):
            return SimpleNamespace(status=400, result=None, error="Commit failed")

    monkeypatch.setattr(f"{ROUTER}.get_session_vyos_service", lambda _req: Rejecting())
    resp = _post(test_client, [{"op": "set_address_group"}])
    assert resp.status_code == 200, resp.text
    assert resp.json() == {"success": False, "data": None, "error": "Commit failed"}
