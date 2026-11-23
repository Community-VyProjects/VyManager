"""L2TP routes: batch arg binding, HTTP 400s, failed commits, parsed config.

execute_batch and get_full_config run through run_in_threadpool (locked in
test_batch_off_event_loop.py). These tests drive the handlers end to end
with a stub service so the emitted ops, the 400 paths, and the event-loop
thread are checked.
"""

import threading
from types import SimpleNamespace

import pytest
from fastapi import FastAPI, HTTPException, Request
from fastapi.testclient import TestClient

ROUTER = "routers.l2tp.l2tp"
BASE = ["vpn", "l2tp", "remote-access"]
SECRET = "T-0123456789abcdef"


class Service:
    def __init__(self, version="2026.09.23-0027-rolling", commit=None, config=None):
        self.version = version
        self.commit = commit if commit is not None else {"status": 200, "error": None}
        self.config = config or {}
        self.executed = []
        self.device_threads = []

    def get_version(self):
        return self.version

    def get_full_config(self, refresh=False):
        self.device_threads.append(threading.current_thread())
        return self.config

    def execute_batch(self, batch):
        self.device_threads.append(threading.current_thread())
        if batch.is_empty():
            raise ValueError("Cannot execute empty batch")
        self.executed.append(batch.get_operations())
        return SimpleNamespace(status=self.commit["status"], result="", error=self.commit["error"])


def _app(monkeypatch, service, calls=None):
    calls = calls if calls is not None else []

    async def read(_request, feature):
        calls.append(("read", feature))

    async def write(_request, feature):
        calls.append(("write", feature))

    monkeypatch.setattr(f"{ROUTER}.require_read_permission", read)
    monkeypatch.setattr(f"{ROUTER}.require_write_permission", write)
    monkeypatch.setattr(f"{ROUTER}.get_session_vyos_service", lambda _req: service)

    from routers.l2tp.l2tp import router

    loop_threads = set()
    app = FastAPI()

    @app.middleware("http")
    async def record_loop_thread(request: Request, call_next):
        loop_threads.add(threading.current_thread())
        return await call_next(request)

    app.include_router(router)
    return TestClient(app), loop_threads


@pytest.fixture
def commit():
    return {"status": 200, "error": None}


@pytest.fixture
def service(commit):
    return Service(commit=commit)


@pytest.fixture
def client(monkeypatch, service):
    test_client, _ = _app(monkeypatch, service)
    return test_client


def _post(test_client, item_name, operations):
    return test_client.post("/vyos/vpn/l2tp/batch", json={"item_name": item_name, "operations": operations})


def test_batch_binds_item_name_and_splits_values(client, service):
    resp = _post(client, "l2tp", [
        {"op": "set_ppp_disable_ccp"},
        {"op": "set_mtu", "value": "1400"},
        {"op": "set_radius_server_key", "value": "192.0.2.1|k|with|pipes"},
        {"op": "set_ppp_ipv6_peer_interface_id_secret", "value": SECRET},
        {"op": "delete_ppp_ipv6_peer_interface_id_secret"},
    ])
    assert resp.status_code == 200, resp.text
    assert resp.json() == {
        "success": True,
        "data": {"message": "L2TP configuration updated"},
        "error": None,
    }
    assert service.executed == [[
        {"op": "set", "path": BASE + ["ppp-options", "disable-ccp"]},
        {"op": "set", "path": BASE + ["mtu", "1400"]},
        {"op": "set", "path": BASE + ["authentication", "radius", "server", "192.0.2.1", "key", "k|with|pipes"]},
        {"op": "set", "path": BASE + ["ppp-options", "ipv6-peer-interface-id-secret", SECRET]},
        {"op": "delete", "path": BASE + ["ppp-options", "ipv6-peer-interface-id-secret"]},
    ]]


def test_batch_pool_name_is_the_item_name(client, service):
    resp = _post(client, "T-pool", [
        {"op": "create_client_ipv6_pool"},
        {"op": "set_client_ipv6_pool_prefix_mask", "value": "2001:db8::/48|64"},
    ])
    assert resp.status_code == 200, resp.text
    assert service.executed == [[
        {"op": "set", "path": BASE + ["client-ipv6-pool", "T-pool"]},
        {"op": "set", "path": BASE + ["client-ipv6-pool", "T-pool", "prefix", "2001:db8::/48", "mask", "64"]},
    ]]


@pytest.mark.parametrize("operation", [
    {"op": "set_mtu"},
    {"op": "set_mtu", "value": ""},
    {"op": "set_mtu", "value": "   "},
    {"op": "set_radius_server_port"},
])
def test_batch_missing_value_is_400(client, service, operation):
    resp = _post(client, "l2tp", [operation])
    assert resp.status_code == 400, resp.text
    assert resp.json()["detail"] == f"Operation {operation['op']} requires a value"
    assert service.executed == []


@pytest.mark.parametrize("item_name,op,value", [
    ("T-pool", "delete_client_ip_pool", "range"),
    ("T-u", "delete_local_user", "static-ip"),
    ("l2tp", "delete_l2tp", "x"),
    ("l2tp", "set_ppp_disable_ccp", "x"),
])
def test_batch_item_only_op_with_a_value_is_400(client, service, item_name, op, value):
    """A value on an item-only op must not run the wider op on the item."""
    resp = _post(client, item_name, [
        {"op": "set_mtu", "value": "1400"},
        {"op": op, "value": value},
    ])
    assert resp.status_code == 400, resp.text
    assert resp.json()["detail"] == f"Operation {op} takes no value"
    assert service.executed == []


@pytest.mark.parametrize("value", ["192.0.2.1", "192.0.2.1|", "|1812", "192.0.2.1|  "])
def test_batch_short_multi_arg_value_is_400(client, service, value):
    resp = _post(client, "l2tp", [{"op": "set_radius_server_port", "value": value}])
    assert resp.status_code == 400, resp.text
    assert resp.json()["detail"] == "Operation set_radius_server_port requires 2 values"
    assert service.executed == []


def test_batch_unknown_op_is_400(client, service):
    resp = _post(client, "l2tp", [{"op": "no_such_op", "value": "x"}])
    assert resp.status_code == 400, resp.text
    assert resp.json()["detail"] == "Unknown operation: no_such_op"
    assert service.executed == []


def test_batch_empty_item_name_is_422(client, service):
    resp = _post(client, "", [{"op": "set_mtu", "value": "1400"}])
    assert resp.status_code == 422, resp.text
    assert service.executed == []


@pytest.mark.parametrize("operation", [
    {"op": "set_ppp_ipv6_peer_interface_id_secret", "value": SECRET},
    {"op": "delete_ppp_ipv6_peer_interface_id_secret"},
])
def test_batch_1_5_leaf_on_1_4_is_400(monkeypatch, operation):
    service = Service(version="1.4.3")
    test_client, _ = _app(monkeypatch, service)
    resp = _post(test_client, "l2tp", [operation])
    assert resp.status_code == 400, resp.text
    assert resp.json()["detail"] == "l2tp ppp_ipv6_peer_interface_id_secret is not supported on this device"
    assert service.executed == []


def test_batch_empty_skips_the_device(client, service):
    resp = _post(client, "l2tp", [])
    assert resp.status_code == 200, resp.text
    assert resp.json() == {
        "success": True,
        "data": {"message": "No operations to execute"},
        "error": None,
    }
    assert service.device_threads == []


def test_batch_value_error_from_execute_batch_is_500(monkeypatch):
    class Failing(Service):
        def execute_batch(self, batch):
            raise ValueError("Cannot execute empty batch")

    test_client, _ = _app(monkeypatch, Failing())
    resp = _post(test_client, "l2tp", [{"op": "delete_l2tp"}])
    assert resp.status_code == 500, resp.text
    assert resp.json()["detail"] == "Internal server error"


def test_batch_failed_commit_omits_updated_message(client, commit):
    commit.update(status=400, error="commit failed")
    resp = _post(client, "l2tp", [{"op": "delete_l2tp"}])
    assert resp.status_code == 200, resp.text
    assert resp.json() == {"success": False, "data": None, "error": "commit failed"}


def test_device_calls_run_off_the_event_loop(monkeypatch):
    service = Service()
    calls = []
    test_client, loop_threads = _app(monkeypatch, service, calls)
    assert test_client.get("/vyos/vpn/l2tp/config").status_code == 200
    assert _post(test_client, "l2tp", [{"op": "delete_l2tp"}]).status_code == 200
    assert len(service.device_threads) == 2
    assert loop_threads
    assert not set(service.device_threads) & loop_threads
    from rbac_permissions import FeatureGroup

    assert calls == [("read", FeatureGroup.L2TP), ("write", FeatureGroup.L2TP)]


def test_config_route_returns_the_mapper_parse_with_secrets_masked(monkeypatch):
    service = Service(config={
        "vpn": {
            "l2tp": {
                "remote-access": {
                    "outside-address": "192.0.2.10",
                    "name-server": "192.0.2.53",
                    "authentication": {
                        "mode": "local",
                        "protocols": ["chap", "mschap-v2"],
                        "local-users": {"username": {"T-u": {"password": "T-plain-pw", "rate-limit": {"download": "100"}}}},
                        "radius": {"server": {"192.0.2.1": {"key": "T-radius-key", "disable": {}}}},
                    },
                    "ipsec-settings": {"authentication": {"mode": "pre-shared-secret", "pre-shared-secret": "T-psk-value"}},
                    "client-ip-pool": {"T-p": {"range": "10.255.0.2-10.255.0.254"}},
                    "client-ipv6-pool": {"T-v6": {"prefix": {"2001:db8::/48": {"mask": "64"}}}},
                    "ppp-options": {"ipv6-peer-interface-id": "calling-sid", "ipv6-peer-interface-id-secret": SECRET},
                    "lns": {"shared-secret": "T-lns-secret"},
                },
            },
        },
    })
    test_client, _ = _app(monkeypatch, service)
    resp = test_client.get("/vyos/vpn/l2tp/config")
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["configured"] is True
    assert body["name_servers"] == ["192.0.2.53"]
    assert body["authentication"]["protocols"] == ["chap", "mschap-v2"]
    assert body["authentication"]["local_users"] == [{
        "username": "T-u",
        "password": "***",
        "disabled": False,
        "static_ip": None,
        "rate_limit": {"download": "100", "upload": None},
    }]
    assert body["authentication"]["radius"]["servers"][0]["key"] == "***"
    assert body["authentication"]["radius"]["servers"][0]["disabled"] is True
    assert body["ipsec_settings"]["authentication"]["pre_shared_secret"] == "***"
    assert body["client_ip_pools"] == [{"name": "T-p", "range": "10.255.0.2-10.255.0.254", "next_pool": None}]
    assert body["client_ipv6_pools"] == [{
        "name": "T-v6",
        "prefixes": {"2001:db8::/48": {"prefix": "2001:db8::/48", "mask": "64"}},
        "delegates": {},
    }]
    assert body["ppp_options"]["ipv6_peer_interface_id"] == "calling-sid"
    assert body["ppp_options"]["ipv6_peer_interface_id_secret"] == "***"
    assert body["lns"]["shared_secret"] == "***"
    assert body["totals"] == {"local_users": 1, "radius_servers": 1, "client_ip_pools": 1, "client_ipv6_pools": 1}
    for secret in ("T-plain-pw", "T-radius-key", "T-psk-value", SECRET, "T-lns-secret"):
        assert secret not in resp.text


def test_config_route_unconfigured_keeps_the_same_shape(monkeypatch):
    service = Service(config={"vpn": {"ipsec": {}}})
    test_client, _ = _app(monkeypatch, service)
    body = test_client.get("/vyos/vpn/l2tp/config").json()
    configured = Service(config={"vpn": {"l2tp": {}}})
    test_client, _ = _app(monkeypatch, configured)
    bare = test_client.get("/vyos/vpn/l2tp/config").json()
    assert body["configured"] is False
    assert bare["configured"] is True
    assert body == {**bare, "configured": False}
    assert body["authentication"]["local_users"] == []
    assert body["client_ip_pools"] == []
    assert body["ppp_options"]["ipv6_peer_interface_id_secret"] is None


@pytest.mark.parametrize("method,path", [
    ("get", "/vyos/vpn/l2tp/capabilities"),
    ("get", "/vyos/vpn/l2tp/config"),
    ("post", "/vyos/vpn/l2tp/batch"),
])
def test_session_http_exception_is_not_swallowed(monkeypatch, method, path):
    def boom(_req):
        raise HTTPException(status_code=400, detail="no active session")

    test_client, _ = _app(monkeypatch, Service())
    monkeypatch.setattr(f"{ROUTER}.get_session_vyos_service", boom)
    if method == "get":
        resp = test_client.get(path)
    else:
        resp = _post(test_client, "l2tp", [{"op": "delete_l2tp"}])
    assert resp.status_code == 400, resp.text
    assert resp.json()["detail"] == "no active session"
