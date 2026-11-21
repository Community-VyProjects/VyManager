"""Suricata batch route: comma-split args, HTTP 400 on a missing value.

execute_batch and get_full_config run through run_in_threadpool (locked in
test_batch_off_event_loop.py). These tests drive the handlers end to end with
a stub service so the emitted ops and the 400 paths are checked.
"""

from types import SimpleNamespace

import pytest
from fastapi import FastAPI, HTTPException
from fastapi.testclient import TestClient

ROUTER = "routers.suricata.suricata"
BASE = ["service", "suricata"]


def _app(monkeypatch, service):
    async def allow(*_args, **_kwargs):
        return None

    monkeypatch.setattr(f"{ROUTER}.require_write_permission", allow)
    monkeypatch.setattr(f"{ROUTER}.require_read_permission", allow)
    monkeypatch.setattr(f"{ROUTER}.get_session_vyos_service", lambda _req: service)

    from routers.suricata.suricata import router

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


def _post(test_client, operations):
    return test_client.post("/vyos/suricata/batch", json={"operations": operations})


def test_batch_splits_values_onto_builder_args(client):
    test_client, service = client
    resp = _post(test_client, [
        {"op": "delete_log"},
        {"op": "set_interface", "value": "eth0"},
        {"op": "set_address", "value": "home-net,10.0.0.0/8"},
        {"op": "set_port_group_ref", "value": "web-ports,!http-ports"},
        {"op": "delete_suricata"},
    ])
    assert resp.status_code == 200, resp.text
    assert resp.json()["success"] is True
    assert resp.json()["data"]["message"] == "Suricata configuration updated"
    assert service.executed == [[
        {"op": "delete", "path": BASE + ["log"]},
        {"op": "set", "path": BASE + ["interface", "eth0"]},
        {"op": "set", "path": BASE + ["address-group", "home-net", "address", "10.0.0.0/8"]},
        {"op": "set", "path": BASE + ["port-group", "web-ports", "group", "!http-ports"]},
        {"op": "delete", "path": BASE},
    ]]


@pytest.mark.parametrize("operation", [
    {"op": "set_interface"},
    {"op": "set_interface", "value": ""},
    {"op": "set_address"},
    {"op": "set_address", "value": ""},
])
def test_batch_missing_value_is_400(client, operation):
    test_client, service = client
    resp = _post(test_client, [operation])
    assert resp.status_code == 400, resp.text
    assert resp.json()["detail"] == f"Operation {operation['op']} requires a value"
    assert service.executed == []


@pytest.mark.parametrize("value", ["home-net", "home-net,", ",10.0.0.0/8"])
def test_batch_short_value_is_400(client, value):
    test_client, service = client
    resp = _post(test_client, [{"op": "set_address", "value": value}])
    assert resp.status_code == 400, resp.text
    assert resp.json()["detail"] == "Operation set_address requires 2 values"
    assert service.executed == []


def test_batch_unknown_op_is_400(client):
    test_client, service = client
    resp = _post(test_client, [{"op": "no_such_op", "value": "x"}])
    assert resp.status_code == 400, resp.text
    assert resp.json()["detail"] == "Unknown operation: no_such_op"
    assert service.executed == []


def test_batch_comma_in_one_arg_value_reaches_the_mapper(client):
    """split(",", 0) keeps the comma; the mapper rejects it with ValueError."""
    test_client, service = client
    resp = _post(test_client, [{"op": "set_log_eve_filename", "value": "eve,json"}])
    assert resp.status_code == 400, resp.text
    assert resp.json()["detail"] == "Invalid log file name"
    assert service.executed == []


def test_batch_on_1_4_is_400(monkeypatch):
    service = Service(version="1.4")
    resp = _post(_app(monkeypatch, service), [{"op": "set_interface", "value": "eth0"}])
    assert resp.status_code == 400, resp.text
    assert resp.json()["detail"] == "Suricata is not supported on this device"
    assert service.executed == []


def test_batch_empty_skips_the_device(client):
    test_client, service = client
    resp = _post(test_client, [])
    assert resp.status_code == 200, resp.text
    assert resp.json() == {
        "success": True,
        "data": {"message": "No Suricata changes"},
        "error": None,
    }
    assert service.executed == []


def test_batch_empty_batch_error_from_device_is_500(monkeypatch):
    """A ValueError from execute_batch is not a version gate; it stays a 500."""

    class Failing(Service):
        def execute_batch(self, batch):
            raise ValueError("Cannot execute empty batch")

    resp = _post(_app(monkeypatch, Failing()), [{"op": "delete_suricata"}])
    assert resp.status_code == 500, resp.text
    assert resp.json()["detail"] == "Internal server error"


def test_batch_failed_commit_omits_updated_message(monkeypatch):
    service = Service(status=400, error="commit failed")
    resp = _post(_app(monkeypatch, service), [{"op": "delete_suricata"}])
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["success"] is False
    assert body["data"] is None
    assert body["error"] == "commit failed"


def test_config_route_parses_through_the_mapper(monkeypatch):
    service = Service(config={
        "service": {
            "suricata": {
                "interface": "eth0",
                "port-group": {"http-ports": {"port": {"80": {}, "!8080": {}}}},
                "log": {"eve": {"filetype": "syslog"}},
            },
        },
    })
    resp = _app(monkeypatch, service).get("/vyos/suricata/config")
    assert resp.status_code == 200, resp.text
    assert resp.json() == {
        "configured": True,
        "interfaces": ["eth0"],
        "address_groups": [],
        "port_groups": [
            {
                "name": "http-ports",
                "members": [
                    {"value": "80", "exclude": False},
                    {"value": "8080", "exclude": True},
                ],
                "groups": [],
            },
        ],
        "log": {
            "enabled": True,
            "filename": None,
            "filetype": "syslog",
            "types": [],
            "types_set": False,
        },
    }


@pytest.mark.parametrize("path", ["/vyos/suricata/capabilities", "/vyos/suricata/config"])
def test_session_http_exception_is_not_swallowed(monkeypatch, path):
    async def allow(*_args, **_kwargs):
        return None

    def boom(_req):
        raise HTTPException(status_code=503, detail="session down")

    monkeypatch.setattr(f"{ROUTER}.require_read_permission", allow)
    monkeypatch.setattr(f"{ROUTER}.get_session_vyos_service", boom)

    from routers.suricata.suricata import router

    app = FastAPI()
    app.include_router(router)
    resp = TestClient(app).get(path)
    assert resp.status_code == 503, resp.text
    assert resp.json()["detail"] == "session down"
