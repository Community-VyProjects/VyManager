"""NAT64 routes: batch arg binding, HTTP 400s, failed commits, typed reorder.

execute_batch and get_full_config run through run_in_threadpool (locked in
test_batch_off_event_loop.py). These tests drive the handlers end to end with
a stub service so the emitted ops, the 400 paths, and the event-loop thread
are checked.
"""

import inspect
import threading
from types import SimpleNamespace

import pytest
from fastapi import FastAPI, HTTPException, Request
from fastapi.testclient import TestClient

from vyos_builders.nat64 import NAT64BatchBuilder

ROUTER = "routers.nat64.nat64"
V1_5 = "2026.09.23-0027-rolling"
S = ["nat64", "source", "rule"]


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

    from routers.nat64.nat64 import router

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


def _post(test_client, operations, rule_number=100, pool_number=None):
    return test_client.post(
        "/vyos/nat64/batch",
        json={"rule_number": rule_number, "pool_number": pool_number, "operations": operations},
    )


def test_batch_binds_rule_number_and_values(client, service):
    resp = _post(client, [
        {"op": "set_source_rule"},
        {"op": "set_source_rule_description", "value": "v6, to v4|x"},
        {"op": "set_source_rule_source_prefix", "value": "64:ff9b::/96"},
        {"op": "delete_source_rule_match_mark"},
        {"op": "set_source_rule_disable", "value": ""},
    ])
    assert resp.status_code == 200, resp.text
    assert resp.json() == {"success": True, "data": {"message": "NAT64 configuration updated"}, "error": None}
    r = S + ["100"]
    assert service.executed == [[
        {"op": "set", "path": r},
        {"op": "set", "path": r + ["description", "v6, to v4|x"]},
        {"op": "set", "path": r + ["source", "prefix", "64:ff9b::/96"]},
        {"op": "delete", "path": r + ["match", "mark"]},
        {"op": "set", "path": r + ["disable"]},
    ]]


def test_batch_binds_pool_number_on_pool_ops(client, service):
    resp = _post(client, [
        {"op": "set_source_rule_translation_pool"},
        {"op": "set_source_rule_translation_pool_address", "value": "203.0.113.0/24"},
        {"op": "set_source_rule_translation_pool_port", "value": "1-65535"},
        {"op": "set_source_rule_translation_pool_protocol_tcp"},
        {"op": "delete_source_rule_translation_pool_description"},
    ], pool_number=2)
    assert resp.status_code == 200, resp.text
    p = S + ["100", "translation", "pool", "2"]
    assert service.executed == [[
        {"op": "set", "path": p},
        {"op": "set", "path": p + ["address", "203.0.113.0/24"]},
        {"op": "set", "path": p + ["port", "1-65535"]},
        {"op": "set", "path": p + ["protocol", "tcp"]},
        {"op": "delete", "path": p + ["description"]},
    ]]


@pytest.mark.parametrize("operation", [
    {"op": "set_source_rule_description"},
    {"op": "set_source_rule_description", "value": ""},
    {"op": "set_source_rule_description", "value": "  "},
    {"op": "set_source_rule_match_mark", "value": None},
])
def test_batch_missing_value_is_400(client, service, operation):
    resp = _post(client, [{"op": "set_source_rule"}, operation])
    assert resp.status_code == 400, resp.text
    assert resp.json()["detail"] == f"Operation {operation['op']} requires a value"
    assert service.executed == []


def test_batch_pool_op_missing_value_is_400(client, service):
    resp = _post(client, [{"op": "set_source_rule_translation_pool_port"}], pool_number=1)
    assert resp.status_code == 400, resp.text
    assert resp.json()["detail"] == "Operation set_source_rule_translation_pool_port requires a value"
    assert service.executed == []


@pytest.mark.parametrize("operation", [
    {"op": "delete_source_rule", "value": "description"},
    {"op": "delete_source_rule_description", "value": "T-old"},
    {"op": "set_source_rule_disable", "value": " "},
])
def test_batch_rule_only_op_with_a_value_is_400(client, service, operation):
    """A value on a rule-only op must not run the wider op (delete the whole rule)."""
    resp = _post(client, [{"op": "set_source_rule"}, operation])
    assert resp.status_code == 400, resp.text
    assert resp.json()["detail"] == f"Operation {operation['op']} takes no value"
    assert service.executed == []


@pytest.mark.parametrize("operation", [
    {"op": "delete_source_rule_translation_pool", "value": "address"},
    {"op": "delete_source_rule_translation_pool_port", "value": "80"},
    {"op": "set_source_rule_translation_pool_protocol_udp", "value": "on"},
])
def test_batch_pool_only_op_with_a_value_is_400(client, service, operation):
    """A value on a pool-only op must not run the wider op (delete the whole pool)."""
    resp = _post(client, [operation], pool_number=1)
    assert resp.status_code == 400, resp.text
    assert resp.json()["detail"] == f"Operation {operation['op']} takes no value"
    assert service.executed == []


@pytest.mark.parametrize("op", [
    "set_source_rule_translation_pool",
    "delete_source_rule_translation_pool",
    "set_source_rule_translation_pool_address",
])
def test_batch_pool_op_without_pool_number_is_400(client, service, op):
    resp = _post(client, [{"op": op, "value": "192.0.2.1"}])
    assert resp.status_code == 400, resp.text
    assert resp.json()["detail"] == f"Operation {op} requires pool_number"
    assert service.executed == []


@pytest.mark.parametrize("op", ["delete_source_rule", "delete_source_rule_disable"])
def test_batch_rule_op_with_pool_number_is_400(client, service, op):
    """A pool number on a rule op must not run the wider op (delete the whole rule)."""
    resp = _post(client, [{"op": op}], pool_number=1)
    assert resp.status_code == 400, resp.text
    assert resp.json()["detail"] == f"Operation {op} takes no pool_number"
    assert service.executed == []


@pytest.mark.parametrize("op, detail", [
    ("set_source_rule_nope", "Unknown operation: set_source_rule_nope"),
    ("get_capabilities", "Invalid operation: get_capabilities"),
    ("add_set", "Invalid operation: add_set"),
    ("_check", "Invalid operation: _check"),
])
def test_batch_unknown_or_internal_op_is_400(client, service, op, detail):
    resp = _post(client, [{"op": op, "value": "x"}])
    assert resp.status_code == 400, resp.text
    assert resp.json()["detail"] == detail
    assert service.executed == []


@pytest.mark.parametrize("body", [
    {"rule_number": 0, "operations": []},
    {"rule_number": 1000000, "operations": []},
    {"rule_number": 100, "pool_number": 0, "operations": []},
    {"rule_number": 100, "pool_number": 1000000, "operations": []},
])
def test_batch_number_out_of_lab_range_is_422(client, service, body):
    resp = client.post("/vyos/nat64/batch", json=body)
    assert resp.status_code == 422, resp.text
    assert service.device_threads == []


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


def test_builder_ops_bind_rule_then_pool_then_one_value():
    """The handler binds rule_number first, then pool_number, then at most one value."""
    builder = NAT64BatchBuilder(version=V1_5)
    ops = [
        (name, member) for name, member in inspect.getmembers(builder, inspect.ismethod)
        if name.startswith(("set_", "delete_"))
    ]
    assert ops
    for name, method in ops:
        params = list(inspect.signature(method).parameters)
        assert params[0] == "rule_number", name
        rest = params[1:]
        if "translation_pool" in name:
            assert rest[:1] == ["pool_number"], name
            rest = rest[1:]
        else:
            assert "pool_number" not in rest, name
        assert len(rest) <= 1, name


RULE_DATA = {
    "description": "v6 out",
    "disable": True,
    "match_mark": "7",
    "source_prefix": "64:ff9b::/96",
    "translation_pools": [
        {
            "pool_number": 1,
            "address": "203.0.113.0/24",
            "description": "first",
            "disable": True,
            "port": "1-65535",
            "protocol": {"tcp": True, "udp": False, "icmp": True},
        },
        {"pool_number": 2, "address": "192.0.2.1", "port": "1024-2047"},
    ],
}


def _reorder(test_client, rules):
    return test_client.post("/vyos/nat64/reorder", json={"rules": rules})


def test_reorder_recreates_every_leaf(client, service):
    resp = _reorder(client, [
        {"old_number": 105, "new_number": None, "rule_data": {}},
        {"old_number": 110, "new_number": 100, "rule_data": RULE_DATA},
    ])
    assert resp.status_code == 200, resp.text
    assert resp.json() == {"success": True, "data": {"message": "Reordered 2 NAT64 rules"}, "error": None}
    r = S + ["100"]
    p1 = r + ["translation", "pool", "1"]
    p2 = r + ["translation", "pool", "2"]
    assert service.executed == [[
        {"op": "delete", "path": S + ["105"]},
        {"op": "delete", "path": S + ["110"]},
        {"op": "set", "path": r},
        {"op": "set", "path": r + ["description", "v6 out"]},
        {"op": "set", "path": r + ["disable"]},
        {"op": "set", "path": r + ["match", "mark", "7"]},
        {"op": "set", "path": r + ["source", "prefix", "64:ff9b::/96"]},
        {"op": "set", "path": p1},
        {"op": "set", "path": p1 + ["address", "203.0.113.0/24"]},
        {"op": "set", "path": p1 + ["description", "first"]},
        {"op": "set", "path": p1 + ["disable"]},
        {"op": "set", "path": p1 + ["port", "1-65535"]},
        {"op": "set", "path": p1 + ["protocol", "tcp"]},
        {"op": "set", "path": p1 + ["protocol", "icmp"]},
        {"op": "set", "path": p2},
        {"op": "set", "path": p2 + ["address", "192.0.2.1"]},
        {"op": "set", "path": p2 + ["port", "1024-2047"]},
    ]]


def test_reorder_pool_with_null_protocol_is_recreated(client, service):
    """#1392: a pool sent with "protocol": null used to raise AttributeError (500)."""
    resp = _reorder(client, [{"old_number": 100, "new_number": 101, "rule_data": {
        "source_prefix": "64:ff9b::/96",
        "translation_pools": [{"pool_number": 1, "address": "192.0.2.1", "port": "1-100", "protocol": None}],
    }}])
    assert resp.status_code == 200, resp.text
    p = S + ["101", "translation", "pool", "1"]
    assert service.executed == [[
        {"op": "delete", "path": S + ["100"]},
        {"op": "set", "path": S + ["101"]},
        {"op": "set", "path": S + ["101", "source", "prefix", "64:ff9b::/96"]},
        {"op": "set", "path": p},
        {"op": "set", "path": p + ["address", "192.0.2.1"]},
        {"op": "set", "path": p + ["port", "1-100"]},
    ]]


@pytest.mark.parametrize("rules", [
    [{"old_number": 1, "new_number": 2, "rule_data": {"extra": True}}],
    [{"old_number": 1, "new_number": 2, "rule_data": {"translation_pools": [{"address": "192.0.2.1"}]}}],
    [{"old_number": 1, "new_number": 2, "rule_data": {"translation_pools": [{"pool_number": 1, "bogus": 1}]}}],
    [{"old_number": 1, "new_number": 2, "rule_data": {"translation_pools": [{"pool_number": 0}]}}],
    [{"old_number": 1, "new_number": 2, "rule_data": {"translation_pools": [
        {"pool_number": 1, "protocol": {"sctp": True}},
    ]}}],
    [{"old_number": 1, "new_number": 2, "rule_data": {"translation_pools": [
        {"pool_number": 1}, {"pool_number": 1},
    ]}}],
    [{"old_number": 1, "new_number": 2, "rule_data": {"translation_pools": None}}],
    [{"old_number": 1, "new_number": 2}],
    [
        {"old_number": 1, "new_number": 3, "rule_data": {}},
        {"old_number": 1, "new_number": 4, "rule_data": {}},
    ],
    [
        {"old_number": 1, "new_number": 3, "rule_data": {}},
        {"old_number": 2, "new_number": 3, "rule_data": {}},
    ],
    [],
    [{"old_number": 0, "new_number": None}],
    [{"old_number": 1, "new_number": 1000000, "rule_data": {}}],
])
def test_reorder_rejects_untyped_or_duplicate_rules(client, service, rules):
    resp = _reorder(client, rules)
    assert resp.status_code == 422, resp.text
    assert service.device_threads == []


def test_reorder_failed_commit_omits_reordered_message(client, commit):
    commit.update(status=400, error="commit failed")
    resp = _reorder(client, [{"old_number": 1, "new_number": None}])
    assert resp.status_code == 200, resp.text
    assert resp.json() == {"success": False, "data": None, "error": "commit failed"}


def test_config_route_returns_the_mapper_parse(monkeypatch):
    service = Service(config={"nat64": {"source": {"rule": {
        "20": {"source": {"prefix": "64:ff9b::/96"}},
        "10": {
            "description": "lab",
            "translation": {"pool": {"1": {"address": "192.0.2.1", "port": "1-100", "protocol": {"udp": {}}}}},
        },
    }}}})
    test_client, _ = _app(monkeypatch, service)
    resp = test_client.get("/vyos/nat64/config")
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["total"] == 2
    assert [rule["rule_number"] for rule in body["source_rules"]] == [10, 20]
    assert body["source_rules"][0]["translation_pools"] == [{
        "pool_number": 1,
        "address": "192.0.2.1",
        "description": None,
        "disable": False,
        "port": "1-100",
        "protocol": {"tcp": False, "udp": True, "icmp": False},
    }]


def test_config_route_unconfigured_keeps_the_same_shape(monkeypatch):
    test_client, _ = _app(monkeypatch, Service(config={}))
    assert test_client.get("/vyos/nat64/config").json() == {"source_rules": [], "total": 0}


@pytest.mark.parametrize("config", [
    {"nat64": None},
    {"nat64": {"source": None}},
    {"nat64": {"source": {"rule": None}}},
])
def test_config_route_null_nodes_parse_as_unconfigured(monkeypatch, config):
    test_client, _ = _app(monkeypatch, Service(config=config))
    assert test_client.get("/vyos/nat64/config").json() == {"source_rules": [], "total": 0}


def test_config_route_null_rule_children_parse_as_unset(monkeypatch):
    service = Service(config={"nat64": {"source": {"rule": {"10": {
        "match": None, "source": None, "translation": None,
    }}}}})
    test_client, _ = _app(monkeypatch, service)
    rule = test_client.get("/vyos/nat64/config").json()["source_rules"][0]
    assert rule["match_mark"] is None
    assert rule["source_prefix"] is None
    assert rule["translation_pools"] == []


def test_device_calls_run_off_the_event_loop(monkeypatch):
    service = Service()
    calls = []
    test_client, loop_threads = _app(monkeypatch, service, calls)
    assert test_client.get("/vyos/nat64/capabilities").status_code == 200
    assert test_client.get("/vyos/nat64/config").status_code == 200
    assert _post(test_client, [{"op": "delete_source_rule"}]).status_code == 200
    assert _reorder(test_client, [{"old_number": 1, "new_number": None}]).status_code == 200
    assert len(service.device_threads) == 3
    assert loop_threads
    assert not set(service.device_threads) & loop_threads
    from rbac_permissions import FeatureGroup

    assert calls == [
        ("read", FeatureGroup.NAT64),
        ("read", FeatureGroup.NAT64),
        ("write", FeatureGroup.NAT64),
        ("write", FeatureGroup.NAT64),
    ]


@pytest.mark.parametrize("method, path", [
    ("get", "/vyos/nat64/capabilities"),
    ("get", "/vyos/nat64/config"),
    ("post", "/vyos/nat64/batch"),
    ("post", "/vyos/nat64/reorder"),
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
