"""Local-route routes driven through the handlers with a stub service.

execute_batch and get_full_config run through run_in_threadpool (locked in
test_batch_off_event_loop.py). These tests check the config payload, the
emitted ops, and the 400/422/500 paths.
"""

import inspect

import pytest
from fastapi import HTTPException

from tests.local_route_client import MODULE, local_route_client
from vyos_builders.local_route.local_route_batch_builder import LocalRouteBatchBuilder

V4 = ["policy", "local-route", "rule"]
V6 = ["policy", "local-route6", "rule"]


@pytest.fixture
def commit():
    return {"status": 200, "error": None}


@pytest.fixture
def client(monkeypatch, commit):
    return local_route_client(monkeypatch, "1.4", commit=commit)


def _batch(test_client, operations, rule_type="ipv4"):
    return test_client.post(
        "/vyos/local-route/batch",
        json={"rule_number": 10, "rule_type": rule_type, "operations": operations},
    )


@pytest.mark.parametrize("version, vrf", [("1.4", False), ("1.5", True)])
def test_capabilities_returns_builder_flags(monkeypatch, version, vrf):
    test_client, _executed = local_route_client(monkeypatch, version)
    resp = test_client.get("/vyos/local-route/capabilities")
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["version"] == version
    assert body["features"]["vrf_support"]["supported"] is vrf


def test_config_returns_parsed_rules(monkeypatch):
    tree = {
        "policy": {
            "local-route": {
                "rule": {
                    "20": {"set": {"table": "100"}},
                    "10": {"source": {"address": ["192.0.2.1"], "port": "80"}, "protocol": "tcp"},
                }
            },
            "local-route6": {"rule": {"5": {"destination": {"address": ["2001:db8::8"]}}}},
        }
    }
    test_client, _executed = local_route_client(monkeypatch, "1.5", full_config=tree)
    resp = test_client.get("/vyos/local-route/config")
    assert resp.status_code == 200, resp.text
    empty = {
        "source": None,
        "destination": None,
        "inbound_interface": None,
        "fwmark": None,
        "protocol": None,
        "source_port": None,
        "destination_port": None,
        "table": None,
        "vrf": None,
    }
    assert resp.json() == {
        "ipv4_rules": [
            {**empty, "rule_number": 10, "source": "192.0.2.1", "source_port": "80", "protocol": "tcp"},
            {**empty, "rule_number": 20, "table": "100"},
        ],
        "ipv6_rules": [{**empty, "rule_number": 5, "destination": "2001:db8::8"}],
        "total_ipv4": 2,
        "total_ipv6": 1,
    }


def test_config_without_local_route_is_empty(client):
    test_client, _executed = client
    resp = test_client.get("/vyos/local-route/config")
    assert resp.status_code == 200, resp.text
    assert resp.json() == {"ipv4_rules": [], "ipv6_rules": [], "total_ipv4": 0, "total_ipv6": 0}


def test_batch_passes_rule_number_and_value(client):
    test_client, executed = client
    resp = _batch(test_client, [
        {"op": "set_local_route_rule"},
        {"op": "set_local_route_rule_source", "value": "192.0.2.1"},
        {"op": "delete_local_route_rule_fwmark"},
        {"op": "set_local_route_rule_set_table", "value": "main"},
    ])
    assert resp.status_code == 200, resp.text
    assert resp.json() == {"success": True, "data": {"message": "Configuration updated"}, "error": None}
    assert executed == [[
        ("set", V4 + ["10"]),
        ("set", V4 + ["10", "source", "address", "192.0.2.1"]),
        ("delete", V4 + ["10", "fwmark"]),
        ("set", V4 + ["10", "set", "table", "main"]),
    ]]


def test_builder_ops_take_the_rule_and_at_most_one_value():
    """The handler binds rule_number first and the value second, nothing more."""
    builder = LocalRouteBatchBuilder(version="1.5")
    ops = [
        (name, member)
        for name, member in inspect.getmembers(builder, inspect.ismethod)
        if name.startswith(("set_", "delete_", "create_"))
    ]
    assert ops
    for name, method in ops:
        params = list(inspect.signature(method).parameters)
        assert params[0] == "rule_number", name
        assert len(params) in (1, 2), name


@pytest.mark.parametrize("rule_type, op", [
    ("ipv4", "delete_local_route_rule"),
    ("ipv4", "delete_local_route_rule_fwmark"),
    ("ipv6", "set_local_route6_rule"),
    ("ipv6", "delete_local_route6_rule_set_table"),
])
def test_batch_value_on_rule_only_op_is_400(client, rule_type, op):
    """A dropped value would run the wider op (delete the rule, not one leaf)."""
    test_client, executed = client
    resp = _batch(test_client, [{"op": op, "value": "x"}], rule_type)
    assert resp.status_code == 400, resp.text
    assert resp.json()["detail"] == f"Operation {op} takes no value"
    assert executed == []


def test_batch_passes_ipv6_ops(client):
    test_client, executed = client
    resp = _batch(test_client, [
        {"op": "set_local_route6_rule"},
        {"op": "set_local_route6_rule_set_table", "value": "main"},
    ], "ipv6")
    assert resp.status_code == 200, resp.text
    assert resp.json()["success"] is True
    assert executed == [[
        ("set", V6 + ["10"]),
        ("set", V6 + ["10", "set", "table", "main"]),
    ]]


@pytest.mark.parametrize("rule_type, op", [
    ("ipv4", "set_local_route6_rule"),
    ("ipv6", "set_local_route_rule"),
    ("ipv4", "delete_local_route6_rule_fwmark"),
    ("ipv6", "delete_local_route_rule_fwmark"),
])
def test_batch_op_of_other_family_is_400(client, rule_type, op):
    test_client, executed = client
    resp = _batch(test_client, [{"op": op}], rule_type)
    assert resp.status_code == 400, resp.text
    assert resp.json()["detail"] == f"Operation {op} does not match rule type {rule_type}"
    assert executed == []


def test_batch_rejects_unknown_rule_type(client):
    test_client, executed = client
    resp = _batch(test_client, [{"op": "set_local_route_rule"}], "ipv5")
    assert resp.status_code == 422, resp.text
    assert executed == []


@pytest.mark.parametrize("rule_type, operation", [
    ("ipv4", {"op": "set_local_route_rule_source"}),
    ("ipv4", {"op": "set_local_route_rule_source", "value": ""}),
    ("ipv4", {"op": "set_local_route_rule_source", "value": "  "}),
    ("ipv6", {"op": "set_local_route6_rule_protocol", "value": None}),
])
def test_batch_missing_value_is_400(client, rule_type, operation):
    test_client, executed = client
    resp = _batch(test_client, [operation], rule_type)
    assert resp.status_code == 400, resp.text
    assert resp.json()["detail"] == f"Operation {operation['op']} requires a value"
    assert executed == []


@pytest.mark.parametrize("rule_type", ["ipv4", "ipv6"])
def test_batch_unknown_op_is_400(client, rule_type):
    test_client, executed = client
    resp = _batch(test_client, [{"op": "no_such_op", "value": "x"}], rule_type)
    assert resp.status_code == 400, resp.text
    assert resp.json()["detail"] == "Unknown operation: no_such_op"
    assert executed == []


@pytest.mark.parametrize("rule_type", ["ipv4", "ipv6"])
@pytest.mark.parametrize("op", ["clear", "_operations"])
def test_batch_internal_op_is_400(client, rule_type, op):
    test_client, executed = client
    resp = _batch(test_client, [{"op": op}], rule_type)
    assert resp.status_code == 400, resp.text
    assert resp.json()["detail"] == f"Invalid operation: {op}"
    assert executed == []


def test_batch_empty_is_500(client):
    """execute_batch raises ValueError for an empty batch; that stays a 500."""
    test_client, executed = client
    resp = _batch(test_client, [])
    assert resp.status_code == 500, resp.text
    assert resp.json()["detail"] == "Internal server error"
    assert executed == []


@pytest.mark.parametrize("status, error", [(400, "Commit failed"), (200, "set failed")])
def test_batch_rejected_commit_reports_failure(client, commit, status, error):
    test_client, executed = client
    commit.update(status=status, error=error)
    resp = _batch(test_client, [{"op": "set_local_route_rule"}])
    assert resp.status_code == 200, resp.text
    assert resp.json() == {"success": False, "data": None, "error": error}
    assert executed == [[("set", V4 + ["10"])]]


@pytest.mark.parametrize("method, path, payload", [
    ("get", "/vyos/local-route/capabilities", None),
    ("get", "/vyos/local-route/config", None),
    ("post", "/vyos/local-route/batch", {
        "rule_number": 10, "rule_type": "ipv4", "operations": [{"op": "set_local_route_rule"}],
    }),
    ("post", "/vyos/local-route/reorder", {
        "rule_type": "ipv4", "rules": [{"old_number": 10, "new_number": 20, "rule_data": {}}],
    }),
], ids=["capabilities", "config", "batch", "reorder"])
def test_session_400_passes_through(client, monkeypatch, method, path, payload):
    """A session lookup 400 is not turned into a 500 by the catch-all."""
    test_client, executed = client

    def no_session(_request):
        raise HTTPException(status_code=400, detail="No active VyOS session")

    monkeypatch.setattr(f"{MODULE}.get_session_vyos_service", no_session)
    if method == "get":
        resp = test_client.get(path)
    else:
        resp = test_client.post(path, json=payload)
    assert resp.status_code == 400, resp.text
    assert resp.json()["detail"] == "No active VyOS session"
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
    assert resp.json() == {
        "success": True, "data": {"message": "Rules reordered successfully"}, "error": None,
    }
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


@pytest.mark.parametrize("rules", [
    [
        {"old_number": 10, "new_number": 30, "rule_data": {"table": "100"}},
        {"old_number": 20, "new_number": 30, "rule_data": {"table": "main"}},
    ],
    [
        {"old_number": 10, "new_number": 20, "rule_data": {"table": "100"}},
        {"old_number": 10, "new_number": 30, "rule_data": {"table": "main"}},
    ],
], ids=["new_number", "old_number"])
def test_reorder_rejects_duplicate_numbers(client, rules):
    """Two rules on one number would merge their leaves in the commit."""
    test_client, executed = client
    resp = _reorder(test_client, rules)
    assert resp.status_code == 422, resp.text
    assert executed == []


def test_reorder_empty_is_500(client):
    """execute_batch raises ValueError for an empty batch; that stays a 500."""
    test_client, executed = client
    resp = _reorder(test_client, [])
    assert resp.status_code == 500, resp.text
    assert resp.json()["detail"] == "Internal server error"
    assert executed == []


@pytest.mark.parametrize("status, error", [(400, "Commit failed"), (200, "set failed")])
def test_reorder_rejected_commit_reports_failure(client, commit, status, error):
    test_client, executed = client
    commit.update(status=status, error=error)
    resp = _reorder(test_client, [{"old_number": 10, "new_number": 20, "rule_data": {"table": "main"}}])
    assert resp.status_code == 200, resp.text
    assert resp.json() == {"success": False, "data": None, "error": error}
    assert len(executed) == 1
