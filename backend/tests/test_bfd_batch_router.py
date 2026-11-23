"""BFD routes: comma-split batch args, HTTP 400 on a missing value, a failed
live-status read as 502, and the session lookup's HTTPException surviving every
handler.

execute_batch and get_full_config run through run_in_threadpool (locked in
test_batch_off_event_loop.py). These tests drive the handlers end to end with
a stub service so the emitted ops and the 400/500/502 paths are checked.
"""

import inspect
from types import SimpleNamespace

import pytest
import requests
from fastapi import FastAPI, HTTPException
from fastapi.testclient import TestClient

from vyos_builders.bfd import BfdBatchBuilder
from vyos_mappers.base import CommandMapperRegistry
from vyos_mappers.bfd import BfdMapper

ROUTER = "routers.bfd.bfd"
BASE = ["protocols", "bfd"]


class Device:
    def __init__(self):
        self.shown = []
        self.show_reply = SimpleNamespace(status=200, error=False, result="")
        self.show_raises = None

    def show(self, path=None):
        self.shown.append(path)
        if self.show_raises is not None:
            raise self.show_raises
        return self.show_reply


class Service:
    def __init__(self):
        self.status = 200
        self.error = None
        self.executed = []
        self.device = Device()

    def get_version(self):
        return "1.5"

    def get_full_config(self, refresh=False):
        return {}

    def execute_batch(self, batch):
        if batch.is_empty():
            raise ValueError("Cannot execute empty batch")
        self.executed.append(batch.get_operations())
        return SimpleNamespace(status=self.status, result="", error=self.error)


async def _allow(*_args, **_kwargs):
    return None


def _app(monkeypatch, get_service):
    monkeypatch.setattr(f"{ROUTER}.require_write_permission", _allow)
    monkeypatch.setattr(f"{ROUTER}.require_read_permission", _allow)
    monkeypatch.setattr(f"{ROUTER}.get_session_vyos_service", get_service)

    from routers.bfd.bfd import router

    app = FastAPI()
    app.include_router(router)
    return TestClient(app, raise_server_exceptions=False)


@pytest.fixture
def commit():
    return {"status": 200, "error": None}


@pytest.fixture
def client(monkeypatch, commit):
    service = Service()

    def get_service(_req):
        service.status = commit["status"]
        service.error = commit["error"]
        return service

    return _app(monkeypatch, get_service), service


def _post(test_client, operations):
    return test_client.post("/vyos/bfd/batch", json={"operations": operations})


def test_every_op_takes_the_object_and_at_most_one_value():
    """Every op names a peer or profile, so a value is always required."""
    builder = BfdBatchBuilder(version="1.5")
    ops = [
        (name, member)
        for name, member in inspect.getmembers(builder, inspect.ismethod)
        if name.startswith(("set_", "delete_", "create_"))
    ]
    assert ops
    for name, method in ops:
        assert len(inspect.signature(method).parameters) in (1, 2), name


def test_batch_splits_values_onto_builder_args(client):
    test_client, service = client
    resp = _post(test_client, [
        {"op": "set_peer", "value": "192.0.2.1"},
        {"op": "set_peer_interval_receive", "value": "192.0.2.1,300"},
        {"op": "set_peer_source_interface", "value": "2001:db8::1,eth0"},
        {"op": "delete_profile_minimum_ttl", "value": "fast"},
    ])
    assert resp.status_code == 200, resp.text
    assert resp.json() == {
        "success": True,
        "data": {"message": "BFD configuration updated"},
        "error": None,
    }
    assert service.executed == [[
        {"op": "set", "path": BASE + ["peer", "192.0.2.1"]},
        {"op": "set", "path": BASE + ["peer", "192.0.2.1", "interval", "receive", "300"]},
        {"op": "set", "path": BASE + ["peer", "2001:db8::1", "source", "interface", "eth0"]},
        {"op": "delete", "path": BASE + ["profile", "fast", "minimum-ttl"]},
    ]]


def test_one_arg_value_keeps_a_comma(client):
    test_client, service = client
    resp = _post(test_client, [{"op": "set_profile", "value": "a,b"}])
    assert resp.status_code == 200, resp.text
    assert service.executed == [[{"op": "set", "path": BASE + ["profile", "a,b"]}]]


@pytest.mark.parametrize("operation", [
    {"op": "set_peer"},
    {"op": "set_peer", "value": ""},
    {"op": "set_peer_vrf"},
    {"op": "set_peer_vrf", "value": ""},
])
def test_missing_value_is_400(client, operation):
    test_client, service = client
    resp = _post(test_client, [{"op": "set_peer", "value": "192.0.2.1"}, operation])
    assert resp.status_code == 400, resp.text
    assert resp.json()["detail"] == f"Operation {operation['op']} requires a value"
    assert service.executed == []


@pytest.mark.parametrize("value", ["192.0.2.1", "192.0.2.1,", ",blue"])
def test_short_multi_arg_value_is_400(client, value):
    test_client, service = client
    resp = _post(test_client, [{"op": "set_peer_vrf", "value": value}])
    assert resp.status_code == 400, resp.text
    assert resp.json()["detail"] == "Operation set_peer_vrf requires 2 values"
    assert service.executed == []


@pytest.mark.parametrize("op,detail", [
    ("no_such_op", "Unknown operation: no_such_op"),
    ("_private", "Invalid operation: _private"),
    ("get_capabilities", "Invalid operation: get_capabilities"),
])
def test_unknown_or_internal_op_is_400(client, op, detail):
    test_client, service = client
    resp = _post(test_client, [{"op": op, "value": "x"}])
    assert resp.status_code == 400, resp.text
    assert resp.json()["detail"] == detail
    assert service.executed == []


def test_empty_batch_stays_500(client):
    """execute_batch raises ValueError for an empty batch; that stays a 500."""
    test_client, service = client
    resp = _post(test_client, [])
    assert resp.status_code == 500, resp.text
    assert resp.json()["detail"] == "Internal server error"
    assert service.executed == []


def test_failed_commit_returns_success_false(client, commit):
    test_client, _service = client
    commit.update(status=400, error="Commit failed")
    resp = _post(test_client, [{"op": "set_peer", "value": "192.0.2.1"}])
    assert resp.status_code == 200, resp.text
    assert resp.json() == {"success": False, "data": None, "error": "Commit failed"}


@pytest.mark.parametrize("method,path", [
    ("get", "/vyos/bfd/capabilities"),
    ("get", "/vyos/bfd/config"),
    ("get", "/vyos/bfd/status"),
    ("post", "/vyos/bfd/batch"),
])
def test_session_lookup_400_survives_every_route(monkeypatch, method, path):
    def no_session(_req):
        raise HTTPException(status_code=400, detail="No active session")

    test_client = _app(monkeypatch, no_session)
    if method == "post":
        resp = _post(test_client, [{"op": "set_peer", "value": "192.0.2.1"}])
    else:
        resp = test_client.get(path)
    assert resp.status_code == 400, resp.text
    assert resp.json()["detail"] == "No active session"


@pytest.mark.parametrize("version", ["1.4", "1.5", "1.5-rolling-202511010000"])
def test_peers_show_path(version):
    """Both labs run ``show bfd peers`` (vtysh -c "show bfd peers")."""
    mapper = CommandMapperRegistry.get_mapper("bfd", version)
    assert isinstance(mapper, BfdMapper)
    assert mapper.get_peers_show_path() == ["bfd", "peers"]


PEERS_TEXT = """BFD Peers:
\tpeer 192.0.2.1 vrf default
\t\tID: 1
\t\tStatus: up
\t\tUptime: 10 second(s)
\t\tPeer Type: dynamic
\t\tActive mode
\t\tLocal timers:
\t\t\tDetect-multiplier: 3
\t\t\tReceive interval: 300ms
"""


def test_status_reads_the_mapper_show_path(client):
    test_client, service = client
    service.device.show_reply = SimpleNamespace(status=200, error=False, result=PEERS_TEXT)
    resp = test_client.get("/vyos/bfd/status")
    assert resp.status_code == 200, resp.text
    assert service.device.shown == [["bfd", "peers"]]
    peers = resp.json()["peers"]
    assert [(p["peer"], p["status"], p["peer_type"], p["receive_interval"]) for p in peers] == [
        ("192.0.2.1", "up", "dynamic", 300),
    ]


@pytest.mark.parametrize("status,error", [
    (400, "Not authorized"),
    (200, "Invalid command"),
    (500, False),
])
def test_status_failed_show_is_502(client, status, error):
    test_client, service = client
    service.device.show_reply = SimpleNamespace(status=status, error=error, result="")
    resp = test_client.get("/vyos/bfd/status")
    assert resp.status_code == 502, resp.text
    assert resp.json()["detail"] == "Failed to fetch BFD status"


@pytest.mark.parametrize("exc", [
    requests.exceptions.ConnectionError("Network error"),
    requests.exceptions.Timeout("Request timed out"),
])
def test_status_unreachable_device_is_502(client, exc):
    test_client, service = client
    service.device.show_raises = exc
    resp = test_client.get("/vyos/bfd/status")
    assert resp.status_code == 502, resp.text
    assert resp.json()["detail"] == "Failed to fetch BFD status"


@pytest.mark.parametrize("method,path,kind", [
    ("get", "/vyos/bfd/capabilities", "read"),
    ("get", "/vyos/bfd/config", "read"),
    ("get", "/vyos/bfd/status", "read"),
    ("post", "/vyos/bfd/batch", "write"),
])
def test_routes_check_the_bfd_permission(monkeypatch, method, path, kind):
    from rbac_permissions import FeatureGroup

    seen = []

    def recorder(name):
        async def check(_request, feature):
            seen.append((name, feature))
            raise HTTPException(status_code=403, detail="Forbidden")
        return check

    monkeypatch.setattr(f"{ROUTER}.require_read_permission", recorder("read"))
    monkeypatch.setattr(f"{ROUTER}.require_write_permission", recorder("write"))

    from routers.bfd.bfd import router

    app = FastAPI()
    app.include_router(router)
    kwargs = {"json": {"operations": []}} if method == "post" else {}
    resp = getattr(TestClient(app), method)(path, **kwargs)
    assert resp.status_code == 403, resp.text
    assert seen == [(kind, FeatureGroup.BFD)]
