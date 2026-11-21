"""NAT66 routes: batch arg binding, HTTP 400s, failed commits, typed reorder.

execute_batch and get_full_config run through run_in_threadpool (locked in
test_batch_off_event_loop.py). These tests drive the handlers end to end with
a stub service so the emitted ops, the 400 paths, and the event-loop thread
are checked.
"""

import threading
from types import SimpleNamespace

import pytest
from fastapi import FastAPI, HTTPException, Request
from fastapi.testclient import TestClient

ROUTER = "routers.nat66.nat66"
V1_4 = "1.4.3"
V1_5 = "2026.09.23-0027-rolling"
S = ["nat66", "source", "rule"]
D = ["nat66", "destination", "rule"]


class Service:
    def __init__(self, version=V1_5, commit=None, config=None):
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

    from routers.nat66.nat66 import router

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


def _post(test_client, operations, rule_type="source", rule_number=100):
    return test_client.post(
        "/vyos/nat66/batch",
        json={"rule_number": rule_number, "rule_type": rule_type, "operations": operations},
    )


def test_batch_binds_rule_number_and_splits_group_values(client, service):
    resp = _post(client, [
        {"op": "set_source_rule"},
        {"op": "set_source_rule_outbound_interface_name", "value": "eth0"},
        {"op": "set_source_rule_translation_address", "value": "masquerade"},
        {"op": "set_source_rule_source_group", "value": "address-group:T-A6:with:colons"},
        {"op": "delete_source_rule_destination_group", "value": "port-group"},
    ])
    assert resp.status_code == 200, resp.text
    assert resp.json() == {"success": True, "data": {"message": "NAT66 configuration updated"}, "error": None}
    r = S + ["100"]
    assert service.executed == [[
        {"op": "set", "path": r},
        {"op": "set", "path": r + ["outbound-interface", "name", "eth0"]},
        {"op": "set", "path": r + ["translation", "address", "masquerade"]},
        {"op": "set", "path": r + ["source", "group", "address-group", "T-A6:with:colons"]},
        {"op": "delete", "path": r + ["destination", "group", "port-group"]},
    ]]


@pytest.mark.parametrize("operation", [
    {"op": "set_source_rule_description"},
    {"op": "set_source_rule_description", "value": ""},
    {"op": "set_source_rule_destination_group"},
    {"op": "delete_source_rule_source_group", "value": ""},
])
def test_batch_missing_value_is_400(client, service, operation):
    resp = _post(client, [operation])
    assert resp.status_code == 400, resp.text
    assert resp.json()["detail"] == f"Operation {operation['op']} requires a value"
    assert service.executed == []


@pytest.mark.parametrize("value", ["address-group", "address-group:", ":T-A6"])
def test_batch_short_group_value_is_400(client, service, value):
    resp = _post(client, [{"op": "set_source_rule_destination_group", "value": value}])
    assert resp.status_code == 400, resp.text
    assert resp.json()["detail"] == "Operation set_source_rule_destination_group requires 2 values"
    assert service.executed == []


@pytest.mark.parametrize("rule_type, op", [
    ("source", "set_destination_rule"),
    ("destination", "delete_source_rule_log"),
    ("source", "get_capabilities"),
    ("source", "add_set"),
])
def test_batch_op_of_another_rule_type_is_400(client, service, rule_type, op):
    resp = _post(client, [{"op": op}], rule_type=rule_type)
    assert resp.status_code == 400, resp.text
    assert resp.json()["detail"] == f"Operation {op} is not a {rule_type} rule operation"
    assert service.executed == []


def test_batch_unknown_op_is_400(client, service):
    resp = _post(client, [{"op": "set_source_rule_nope", "value": "x"}])
    assert resp.status_code == 400, resp.text
    assert resp.json()["detail"] == "Unknown operation: set_source_rule_nope"
    assert service.executed == []


@pytest.mark.parametrize("body", [
    {"rule_number": 100, "rule_type": "static", "operations": []},
    {"rule_number": 0, "rule_type": "source", "operations": []},
    {"rule_number": 1000000, "rule_type": "source", "operations": []},
])
def test_batch_bad_rule_type_or_number_is_422(client, service, body):
    resp = client.post("/vyos/nat66/batch", json=body)
    assert resp.status_code == 422, resp.text
    assert service.device_threads == []


@pytest.mark.parametrize("rule_type, operation", [
    ("source", {"op": "set_source_rule_destination_group", "value": "address-group:T-A6"}),
    ("source", {"op": "delete_source_rule_source_group", "value": "address-group"}),
    ("destination", {"op": "set_destination_rule_destination_group", "value": "port-group:T-WEB"}),
    ("destination", {"op": "delete_destination_rule_source_group", "value": "mac-group"}),
])
def test_batch_group_op_on_1_4_is_400(monkeypatch, rule_type, operation):
    service = Service(version=V1_4)
    test_client, _ = _app(monkeypatch, service)
    resp = _post(test_client, [operation], rule_type=rule_type)
    assert resp.status_code == 400, resp.text
    assert "is not supported on this device" in resp.json()["detail"]
    assert service.executed == []


def test_batch_unknown_group_type_is_400(client, service):
    resp = _post(client, [{"op": "set_source_rule_source_group", "value": "interface-group:T-X"}])
    assert resp.status_code == 400, resp.text
    assert resp.json()["detail"] == "nat66 group type 'interface-group' is not supported on this device"
    assert service.executed == []


def test_batch_empty_skips_the_device(client, service):
    resp = _post(client, [])
    assert resp.status_code == 200, resp.text
    assert resp.json() == {"success": True, "data": {"message": "No operations to execute"}, "error": None}
    assert service.device_threads == []


def test_batch_value_error_from_execute_batch_is_500(monkeypatch):
    class Failing(Service):
        def execute_batch(self, batch):
            raise ValueError("Cannot execute empty batch")

    test_client, _ = _app(monkeypatch, Failing())
    resp = _post(test_client, [{"op": "delete_source_rule"}])
    assert resp.status_code == 500, resp.text
    assert resp.json()["detail"] == "Internal server error"


@pytest.mark.parametrize("status, error", [(400, "commit failed"), (200, "verify failed")])
def test_batch_failed_commit_omits_updated_message(client, commit, status, error):
    commit.update(status=status, error=error)
    resp = _post(client, [{"op": "delete_source_rule"}])
    assert resp.status_code == 200, resp.text
    assert resp.json() == {"success": False, "data": None, "error": error}


RULE_DATA = {
    "description": "out",
    "disable": True,
    "exclude": False,
    "log": True,
    "protocol": "tcp",
    "outbound_interface": "eth0",
    "source": {"prefix": "fd00::/64", "port": "80", "group": {"mac_group": "T-MAC"}},
    "destination": {"prefix": None, "port": None, "group": {"network_group": "T-N6", "port_group": "T-WEB"}},
    "translation": {"address": "masquerade", "port": None},
}


def _reorder(test_client, rules, rule_type="source"):
    return test_client.post("/vyos/nat66/reorder", json={"rule_type": rule_type, "rules": rules})


def test_reorder_recreates_every_leaf_including_groups(client, service):
    resp = _reorder(client, [
        {"old_number": 105, "new_number": None, "rule_data": None},
        {"old_number": 110, "new_number": 101, "rule_data": RULE_DATA},
    ])
    assert resp.status_code == 200, resp.text
    assert resp.json() == {"success": True, "data": {"message": "Reordered 2 NAT66 source rules"}, "error": None}
    r = S + ["101"]
    assert service.executed == [[
        {"op": "delete", "path": S + ["105"]},
        {"op": "delete", "path": S + ["110"]},
        {"op": "set", "path": r},
        {"op": "set", "path": r + ["description", "out"]},
        {"op": "set", "path": r + ["disable"]},
        {"op": "set", "path": r + ["log"]},
        {"op": "set", "path": r + ["protocol", "tcp"]},
        {"op": "set", "path": r + ["outbound-interface", "name", "eth0"]},
        {"op": "set", "path": r + ["source", "prefix", "fd00::/64"]},
        {"op": "set", "path": r + ["source", "port", "80"]},
        {"op": "set", "path": r + ["source", "group", "mac-group", "T-MAC"]},
        {"op": "set", "path": r + ["destination", "group", "network-group", "T-N6"]},
        {"op": "set", "path": r + ["destination", "group", "port-group", "T-WEB"]},
        {"op": "set", "path": r + ["translation", "address", "masquerade"]},
    ]]


def test_reorder_destination_rules_use_address_and_inbound_interface(client, service):
    resp = _reorder(client, [{"old_number": 7, "new_number": 100, "rule_data": {
        "inbound_interface": "eth1",
        "source": {"address": "2001:db8::1"},
        "destination": {"address": "2001:db8::2", "port": "443"},
        "translation": {"address": "fd00::10", "port": "8443"},
    }}], rule_type="destination")
    assert resp.status_code == 200, resp.text
    r = D + ["100"]
    assert service.executed == [[
        {"op": "delete", "path": D + ["7"]},
        {"op": "set", "path": r},
        {"op": "set", "path": r + ["inbound-interface", "name", "eth1"]},
        {"op": "set", "path": r + ["source", "address", "2001:db8::1"]},
        {"op": "set", "path": r + ["destination", "address", "2001:db8::2"]},
        {"op": "set", "path": r + ["destination", "port", "443"]},
        {"op": "set", "path": r + ["translation", "address", "fd00::10"]},
        {"op": "set", "path": r + ["translation", "port", "8443"]},
    ]]


@pytest.mark.parametrize("rule_type, rules", [
    ("source", [{"old_number": 1, "new_number": 2, "rule_data": {"protocol": None, "source": {"bogus": 1}}}]),
    ("source", [{"old_number": 1, "new_number": 2, "rule_data": {"extra": True}}]),
    ("source", [{"old_number": 1, "new_number": 2, "rule_data": {"source": "fd00::/64"}}]),
    ("source", [{"old_number": 1, "new_number": 2}]),
    ("source", [{"old_number": 1, "new_number": 2, "rule_data": {"inbound_interface": "eth1"}}]),
    ("source", [{"old_number": 1, "new_number": 2, "rule_data": {"source": {"address": "2001:db8::1"}}}]),
    ("destination", [{"old_number": 1, "new_number": 2, "rule_data": {"outbound_interface": "eth0"}}]),
    ("destination", [{"old_number": 1, "new_number": 2, "rule_data": {"destination": {"prefix": "fd00::/64"}}}]),
    ("source", [
        {"old_number": 1, "new_number": 3, "rule_data": {}},
        {"old_number": 1, "new_number": 4, "rule_data": {}},
    ]),
    ("source", [
        {"old_number": 1, "new_number": 3, "rule_data": {}},
        {"old_number": 2, "new_number": 3, "rule_data": {}},
    ]),
    ("source", []),
    ("static", [{"old_number": 1, "new_number": None}]),
    ("source", [{"old_number": 0, "new_number": None}]),
])
def test_reorder_rejects_untyped_or_mismatched_rule_data(client, service, rule_type, rules):
    resp = _reorder(client, rules, rule_type=rule_type)
    assert resp.status_code == 422, resp.text
    assert service.device_threads == []


def test_reorder_group_on_1_4_is_400(monkeypatch):
    service = Service(version=V1_4)
    test_client, _ = _app(monkeypatch, service)
    resp = _reorder(test_client, [{"old_number": 1, "new_number": 2, "rule_data": RULE_DATA}])
    assert resp.status_code == 400, resp.text
    assert "is not supported on this device" in resp.json()["detail"]
    assert service.executed == []


def test_reorder_failed_commit_omits_reordered_message(client, commit):
    commit.update(status=400, error="commit failed")
    resp = _reorder(client, [{"old_number": 1, "new_number": None}])
    assert resp.status_code == 200, resp.text
    assert resp.json() == {"success": False, "data": None, "error": "commit failed"}


def test_config_route_returns_the_mapper_parse(monkeypatch):
    service = Service(config={"nat66": {
        "source": {"rule": {"10": {
            "outbound-interface": {"name": "eth0"},
            "source": {"group": {"address-group": "T-A6", "mac-group": "T-MAC"}},
            "translation": {"address": "masquerade"},
        }}},
        "destination": {"rule": {"5": {
            "inbound-interface": {"name": "eth1"},
            "destination": {"address": "2001:db8::1", "group": {"port-group": "T-WEB"}},
            "translation": {"address": "fd00::1"},
        }}},
    }})
    test_client, _ = _app(monkeypatch, service)
    resp = test_client.get("/vyos/nat66/config")
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["total"] == 2
    assert body["source_rules"][0]["source"] == {
        "address": None,
        "prefix": None,
        "port": None,
        "group": {
            "address_group": "T-A6",
            "domain_group": None,
            "mac_group": "T-MAC",
            "network_group": None,
            "port_group": None,
        },
    }
    assert body["destination_rules"][0]["destination"]["group"]["port_group"] == "T-WEB"
    assert body["destination_rules"][0]["destination"]["address"] == "2001:db8::1"


def test_config_route_unconfigured_keeps_the_same_shape(monkeypatch):
    test_client, _ = _app(monkeypatch, Service(config={}))
    assert test_client.get("/vyos/nat66/config").json() == {
        "source_rules": [],
        "destination_rules": [],
        "total": 0,
    }


def test_device_calls_run_off_the_event_loop(monkeypatch):
    service = Service()
    calls = []
    test_client, loop_threads = _app(monkeypatch, service, calls)
    assert test_client.get("/vyos/nat66/capabilities").status_code == 200
    assert test_client.get("/vyos/nat66/config").status_code == 200
    assert _post(test_client, [{"op": "delete_source_rule"}]).status_code == 200
    assert _reorder(test_client, [{"old_number": 1, "new_number": None}]).status_code == 200
    assert len(service.device_threads) == 3
    assert loop_threads
    assert not set(service.device_threads) & loop_threads
    from rbac_permissions import FeatureGroup

    assert calls == [
        ("read", FeatureGroup.NAT66),
        ("read", FeatureGroup.NAT66),
        ("write", FeatureGroup.NAT66),
        ("write", FeatureGroup.NAT66),
    ]


@pytest.mark.parametrize("method, path", [
    ("get", "/vyos/nat66/capabilities"),
    ("get", "/vyos/nat66/config"),
    ("post", "/vyos/nat66/batch"),
    ("post", "/vyos/nat66/reorder"),
])
def test_session_http_exception_is_not_swallowed(monkeypatch, method, path):
    def boom(_req):
        raise HTTPException(status_code=400, detail="no active session")

    test_client, _ = _app(monkeypatch, Service())
    monkeypatch.setattr(f"{ROUTER}.get_session_vyos_service", boom)
    if path.endswith("/batch"):
        resp = _post(test_client, [{"op": "delete_source_rule"}])
    elif path.endswith("/reorder"):
        resp = _reorder(test_client, [{"old_number": 1, "new_number": None}])
    else:
        resp = test_client.get(path)
    assert resp.status_code == 400, resp.text
    assert resp.json()["detail"] == "no active session"
