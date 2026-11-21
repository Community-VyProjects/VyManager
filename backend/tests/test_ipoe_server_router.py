"""IPoE server routes: item_name plus "|" values, HTTP 400 on a bad value.

execute_batch and get_full_config run through run_in_threadpool (locked in
test_batch_off_event_loop.py). These tests drive the handlers end to end with
a stub service so the emitted ops, the 400 paths and the config response are
checked.
"""

import inspect
from types import SimpleNamespace

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

ROUTER = "routers.ipoe_server.ipoe_server"
BASE = ["service", "ipoe-server"]


def _app(monkeypatch, service):
    async def allow(*_args, **_kwargs):
        return None

    monkeypatch.setattr(f"{ROUTER}.require_write_permission", allow)
    monkeypatch.setattr(f"{ROUTER}.require_read_permission", allow)
    monkeypatch.setattr(f"{ROUTER}.get_session_vyos_service", lambda _req: service)

    from routers.ipoe_server.ipoe_server import router

    app = FastAPI()
    app.include_router(router)
    return TestClient(app)


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


@pytest.fixture
def client(monkeypatch):
    service = Service()
    return _app(monkeypatch, service), service


def _post(test_client, item_name, operations):
    return test_client.post(
        "/vyos/ipoe-server/batch",
        json={"item_name": item_name, "operations": operations},
    )


@pytest.mark.parametrize("version", ["1.4", "1.5"])
def test_every_builder_op_takes_the_item_and_at_most_one_value(version):
    from vyos_builders.ipoe_server import IPoEServerBatchBuilder

    builder = IPoEServerBatchBuilder(version)
    arities = {
        name: len(inspect.signature(method).parameters)
        for name, method in inspect.getmembers(builder, inspect.ismethod)
        if name.startswith(("set_", "delete_", "create_"))
    }
    assert arities
    assert {name: n for name, n in arities.items() if n not in (1, 2)} == {}


def test_batch_binds_item_name_and_value_onto_builder_args(client):
    test_client, service = client
    resp = _post(test_client, "eth1", [
        {"op": "set_interface_mode", "value": "l2"},
        {"op": "set_auth_mac_ip_address", "value": "00:11:22:33:44:55|192.0.2.10"},
        {"op": "set_interface_lua_username", "value": "user|name"},
        {"op": "delete_interface"},
    ])
    assert resp.status_code == 200, resp.text
    assert resp.json() == {
        "success": True,
        "data": {"message": "IPoE server configuration updated"},
        "error": None,
    }
    assert service.executed == [[
        {"op": "set", "path": BASE + ["interface", "eth1", "mode", "l2"]},
        {"op": "set", "path": BASE + [
            "authentication", "interface", "eth1", "mac", "00:11:22:33:44:55",
            "ip-address", "192.0.2.10",
        ]},
        {"op": "set", "path": BASE + ["interface", "eth1", "lua-username", "user|name"]},
        {"op": "delete", "path": BASE + ["interface", "eth1"]},
    ]]


def test_batch_global_op_ignores_the_request_item(client):
    test_client, service = client
    resp = _post(test_client, "ipoe", [{"op": "set_description", "value": "lab"}])
    assert resp.status_code == 200, resp.text
    assert service.executed == [[{"op": "set", "path": BASE + ["description", "lab"]}]]


@pytest.mark.parametrize("operation", [
    {"op": "set_description"},
    {"op": "set_description", "value": ""},
    {"op": "set_auth_mac_ip_address"},
    {"op": "set_auth_mac_ip_address", "value": ""},
])
def test_batch_missing_value_is_400(client, operation):
    test_client, service = client
    resp = _post(test_client, "eth1", [operation])
    assert resp.status_code == 400, resp.text
    assert resp.json()["detail"] == f"Operation {operation['op']} requires a value"
    assert service.executed == []


@pytest.mark.parametrize("value", ["00:11:22:33:44:55", "00:11:22:33:44:55-192.0.2.10"])
def test_batch_short_composite_value_is_400(client, value):
    test_client, service = client
    resp = _post(test_client, "eth1", [{"op": "set_auth_mac_ip_address", "value": value}])
    assert resp.status_code == 400, resp.text
    assert resp.json()["detail"] == "Operation set_auth_mac_ip_address has an invalid value"
    assert service.executed == []


def test_batch_empty_item_name_is_422(client):
    test_client, service = client
    resp = _post(test_client, "", [{"op": "delete_interface"}])
    assert resp.status_code == 422, resp.text
    assert service.executed == []


def test_batch_unknown_op_is_400(client):
    test_client, service = client
    resp = _post(test_client, "eth1", [{"op": "no_such_op", "value": "x"}])
    assert resp.status_code == 400, resp.text
    assert resp.json()["detail"] == "Unknown operation: no_such_op"
    assert service.executed == []


def test_batch_with_no_ops_returns_success_without_the_device(client):
    test_client, service = client
    resp = _post(test_client, "ipoe", [])
    assert resp.status_code == 200, resp.text
    assert resp.json()["success"] is True
    assert resp.json()["data"] == {"message": "No operations to execute"}
    assert service.executed == []


def test_batch_execute_value_error_stays_500(monkeypatch):
    class Failing(Service):
        def execute_batch(self, batch):
            raise ValueError("Cannot execute empty batch")

    test_client = _app(monkeypatch, Failing())
    resp = _post(test_client, "ipoe", [{"op": "set_description", "value": "lab"}])
    assert resp.status_code == 500, resp.text
    assert resp.json()["detail"] == "Internal server error"


def test_batch_failed_commit_returns_error_without_success_message(monkeypatch):
    service = Service(status=400, error="Commit failed")
    test_client = _app(monkeypatch, service)
    resp = _post(test_client, "ipoe", [{"op": "set_description", "value": "lab"}])
    assert resp.status_code == 200, resp.text
    assert resp.json() == {"success": False, "data": None, "error": "Commit failed"}


@pytest.mark.parametrize("version", ["1.4", "1.5"])
def test_config_route_returns_the_parsed_lists(monkeypatch, version):
    service = Service(version=version, config={
        "service": {
            "ipoe-server": {
                "interface": {"eth1": {"mode": "l2"}},
                "authentication": {
                    "mode": "radius",
                    "radius": {"server": {"192.0.2.1": {"key": "s3cret"}}},
                },
            },
        },
    })
    test_client = _app(monkeypatch, service)
    resp = test_client.get("/vyos/ipoe-server/config")
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["configured"] is True
    assert [row["interface"] for row in body["interfaces"]] == ["eth1"]
    assert body["authentication"]["radius"]["servers"][0]["key"] == "***"
    assert "s3cret" not in resp.text
    assert body["totals"]["radius_servers"] == 1
