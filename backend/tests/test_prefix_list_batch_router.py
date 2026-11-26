"""Prefix-list routes driven through the handlers with a stub service.

execute_batch and get_full_config run through run_in_threadpool (locked in
test_batch_off_event_loop.py). These tests check the emitted ops, the reorder
batch, the 400/500 paths, and that every route passes a session lookup's
HTTPException through.
"""

from types import SimpleNamespace

import pytest
from fastapi import FastAPI, HTTPException
from fastapi.testclient import TestClient

MODULE = "routers.prefix_list.prefix_list"
ROLLING = "2026.09.23-0027-rolling"
BASE = ["policy", "prefix-list", "PL"]

FULL_TREE = {
    "policy": {
        "prefix-list": {
            "PL": {
                "description": "corp",
                "rule": {
                    "10": {"action": "permit", "description": "a", "prefix": "10.0.0.0/8", "ge": "16", "le": "24"},
                    "20": {"action": "deny", "prefix": "0.0.0.0/0", "le": "32"},
                },
            }
        },
        "prefix-list6": {"PL6": {"rule": {"5": {"action": "permit", "prefix": "2001:db8::/32"}}}},
    }
}


def prefix_list_client(monkeypatch, commit, full_config=None):
    """Return (client, executed); executed holds one [(op, path), ...] per commit."""
    executed = []

    async def allow(*_args, **_kwargs):
        return None

    class Service:
        def get_version(self):
            return ROLLING

        def get_full_config(self, refresh=False):
            return full_config if full_config is not None else {}

        def execute_batch(self, batch):
            if batch.is_empty():
                raise ValueError("Cannot execute empty batch")
            executed.append([(item["op"], item["path"]) for item in batch.get_operations()])
            return SimpleNamespace(status=commit["status"], result="", error=commit["error"])

    monkeypatch.setattr(f"{MODULE}.require_read_permission", allow)
    monkeypatch.setattr(f"{MODULE}.require_write_permission", allow)
    monkeypatch.setattr(f"{MODULE}.get_session_vyos_service", lambda _req: Service())

    router = __import__(MODULE, fromlist=["router"]).router
    app = FastAPI()
    app.include_router(router)
    return TestClient(app, raise_server_exceptions=False), executed


@pytest.fixture
def commit():
    return {"status": 200, "error": None}


@pytest.fixture
def client(monkeypatch, commit):
    return prefix_list_client(monkeypatch, commit, full_config=FULL_TREE)


def _batch(test_client, operations, *, list_type="ipv4", name="PL", rule_number=None):
    body = {"list_type": list_type, "name": name, "operations": operations}
    if rule_number is not None:
        body["rule_number"] = rule_number
    return test_client.post("/vyos/prefix-list/batch", json=body)


# ---------------------------------------------------------------- config / capabilities


def test_config_returns_the_mapper_parse(client):
    test_client, _executed = client
    resp = test_client.get("/vyos/prefix-list/config")
    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert data["total_ipv4"] == 1 and data["total_ipv6"] == 1
    rules = data["ipv4_lists"][0]["rules"]
    assert rules[0] == {"rule_number": 10, "action": "permit", "description": "a", "prefix": "10.0.0.0/8", "ge": 16, "le": 24}
    assert data["ipv6_lists"][0]["list_type"] == "ipv6"


def test_capabilities_serve_the_ranges(client):
    test_client, _executed = client
    resp = test_client.get("/vyos/prefix-list/capabilities")
    assert resp.status_code == 200
    body = resp.json()
    assert body["ranges"]["rule"] == {"min": 1, "max": 65535}
    assert body["ranges"]["prefix_length_ipv6"] == {"min": 0, "max": 128}
    assert "version_info" not in body


# ---------------------------------------------------------------- batch


def test_batch_emits_the_exact_ops(client):
    test_client, executed = client
    resp = _batch(
        test_client,
        [
            {"op": "create_rule"},
            {"op": "set_rule_action", "value": "deny"},
            {"op": "set_rule_description", "value": "a|b, c"},
            {"op": "set_rule_prefix", "value": "192.0.2.0/24"},
            {"op": "set_rule_ge", "value": "25"},
            {"op": "delete_rule_le"},
        ],
        rule_number=30,
    )
    assert resp.status_code == 200, resp.text
    assert resp.json() == {"success": True, "data": {"message": "Configuration updated"}, "error": None}
    rule = BASE + ["rule", "30"]
    assert executed == [[
        ("set", rule),
        ("set", rule + ["action", "deny"]),
        ("set", rule + ["description", "a|b, c"]),
        ("set", rule + ["prefix", "192.0.2.0/24"]),
        ("set", rule + ["ge", "25"]),
        ("delete", rule + ["le"]),
    ]]


def test_list_ops_on_ipv6(client):
    test_client, executed = client
    resp = _batch(
        test_client,
        [{"op": "create_prefix_list"}, {"op": "set_prefix_list_description", "value": "v6"}],
        list_type="ipv6",
        name="NEW6",
    )
    assert resp.status_code == 200, resp.text
    six = ["policy", "prefix-list6", "NEW6"]
    assert executed == [[("set", six), ("set", six + ["description", "v6"])]]


def test_list_op_rejects_a_rule_number(client):
    test_client, executed = client
    resp = _batch(test_client, [{"op": "delete_prefix_list"}], rule_number=10)
    assert resp.status_code == 400
    assert resp.json()["detail"] == "Operation delete_prefix_list takes no rule"
    assert executed == []


@pytest.mark.parametrize("op", ["create_rule", "set_rule_ge", "delete_rule"])
def test_rule_op_without_rule_number_is_400(client, op):
    test_client, executed = client
    resp = _batch(test_client, [{"op": op, "value": "16"} if op == "set_rule_ge" else {"op": op}])
    assert resp.status_code == 400
    assert resp.json()["detail"] == f"Operation {op} requires rule"
    assert executed == []


@pytest.mark.parametrize(
    "operation,detail",
    [
        ({"op": "set_rule_ge"}, "Operation set_rule_ge requires a value"),
        ({"op": "set_rule_ge", "value": ""}, "Operation set_rule_ge requires a value"),
        ({"op": "set_rule_prefix", "value": "  "}, "Operation set_rule_prefix requires a value"),
        ({"op": "delete_rule_ge", "value": "16"}, "Operation delete_rule_ge takes no value"),
        ({"op": "nope"}, "Unknown operation: nope"),
        ({"op": "restore_rule", "value": "x"}, "Invalid operation: restore_rule"),
        ({"op": "_mapper"}, "Invalid operation: _mapper"),
        ({"op": "get_capabilities"}, "Invalid operation: get_capabilities"),
    ],
)
def test_bad_operation_is_400_and_nothing_runs(client, operation, detail):
    test_client, executed = client
    resp = _batch(test_client, [{"op": "create_rule"}, operation], rule_number=10)
    assert resp.status_code == 400
    assert resp.json()["detail"] == detail
    assert executed == []


@pytest.mark.parametrize(
    "operation,list_type,detail",
    [
        ({"op": "set_rule_prefix", "value": "10.0.0.1/8"}, "ipv4", "prefix must be an IPv4 prefix with no host bits set"),
        ({"op": "set_rule_prefix", "value": "10.0.0.0/8"}, "ipv6", "prefix must be an IPv6 prefix with no host bits set"),
        ({"op": "set_rule_ge", "value": "33"}, "ipv4", "ge must be a number from 0 to 32"),
        ({"op": "set_rule_le", "value": "129"}, "ipv6", "le must be a number from 0 to 128"),
        ({"op": "set_rule_action", "value": "accept"}, "ipv4", "action must be permit or deny"),
        ({"op": "set_rule_description", "value": "x" * 256}, "ipv4", "description must be one line of at most 255 characters"),
    ],
)
def test_bad_value_is_400(client, operation, list_type, detail):
    test_client, executed = client
    resp = _batch(test_client, [{"op": "create_rule"}, operation], list_type=list_type, rule_number=10)
    assert resp.status_code == 400
    assert resp.json()["detail"] == detail
    assert executed == []


def test_bad_name_is_400(client):
    test_client, executed = client
    resp = _batch(test_client, [{"op": "create_prefix_list"}], name="PL.1")
    assert resp.status_code == 400
    assert "prefix-list name" in resp.json()["detail"]
    assert executed == []


@pytest.mark.parametrize(
    "body",
    [
        {"list_type": "ipv5", "name": "PL", "operations": []},
        {"list_type": "ipv4", "name": " ", "operations": []},
        {"list_type": "ipv4", "name": "PL", "rule_number": 0, "operations": []},
        {"list_type": "ipv4", "name": "PL", "rule_number": 65536, "operations": []},
    ],
)
def test_bad_request_model_is_422(client, body):
    test_client, _executed = client
    assert test_client.post("/vyos/prefix-list/batch", json=body).status_code == 422


def test_failed_commit_reports_the_error(client, commit):
    test_client, _executed = client
    commit.update(status=400, error="prefix-list PL still in use")
    resp = _batch(test_client, [{"op": "delete_prefix_list"}])
    assert resp.status_code == 200
    assert resp.json() == {"success": False, "data": None, "error": "prefix-list PL still in use"}


def test_empty_batch_stays_500(client):
    test_client, _executed = client
    assert _batch(test_client, []).status_code == 500


# ---------------------------------------------------------------- reorder


def _reorder(test_client, numbers, *, name="PL", list_type="ipv4"):
    return test_client.post(
        "/vyos/prefix-list/reorder",
        json={"list_type": list_type, "name": name, "rule_numbers": numbers},
    )


def test_reorder_moves_every_leaf_in_one_commit(client):
    test_client, executed = client
    resp = _reorder(test_client, [20, 10])
    assert resp.status_code == 200, resp.text
    assert resp.json() == {"success": True, "data": {"message": "Rules reordered"}, "error": None}
    r10 = BASE + ["rule", "10"]
    r20 = BASE + ["rule", "20"]
    assert executed == [[
        ("delete", r20),
        ("delete", r10),
        ("set", r10),
        ("set", r10 + ["action", "deny"]),
        ("set", r10 + ["prefix", "0.0.0.0/0"]),
        ("set", r10 + ["le", "32"]),
        ("set", r20),
        ("set", r20 + ["action", "permit"]),
        ("set", r20 + ["description", "a"]),
        ("set", r20 + ["prefix", "10.0.0.0/8"]),
        ("set", r20 + ["ge", "16"]),
        ("set", r20 + ["le", "24"]),
    ]]


def test_reorder_same_order_commits_nothing(client):
    test_client, executed = client
    resp = _reorder(test_client, [10, 20])
    assert resp.status_code == 200
    assert resp.json()["success"] is True
    assert executed == []


@pytest.mark.parametrize("numbers", [[10], [10, 20, 30]])
def test_reorder_rejects_a_partial_list(client, numbers):
    test_client, executed = client
    resp = _reorder(test_client, numbers)
    assert resp.status_code == 400
    assert resp.json()["detail"] == "rule_numbers must list every rule of the list"
    assert executed == []


def test_reorder_reads_the_family_of_the_request(client):
    test_client, _executed = client
    assert _reorder(test_client, [10, 20], list_type="ipv6").status_code == 404
    assert _reorder(test_client, [5], name="PL6", list_type="ipv6").status_code == 200


def test_reorder_missing_list_is_404(client):
    test_client, _executed = client
    assert _reorder(test_client, [1], name="NOPE").status_code == 404


def test_reorder_rejects_repeated_numbers(client):
    test_client, _executed = client
    assert _reorder(test_client, [10, 10]).status_code == 422


def test_reorder_failed_commit_reports_the_error(client, commit):
    test_client, _executed = client
    commit.update(status=400, error="Commit failed")
    resp = _reorder(test_client, [20, 10])
    assert resp.json() == {"success": False, "data": None, "error": "Commit failed"}


# ---------------------------------------------------------------- passthrough


@pytest.mark.parametrize(
    "method,path,body",
    [
        ("get", "/vyos/prefix-list/capabilities", None),
        ("get", "/vyos/prefix-list/config", None),
        ("post", "/vyos/prefix-list/batch", {"list_type": "ipv4", "name": "PL", "operations": [{"op": "create_prefix_list"}]}),
        ("post", "/vyos/prefix-list/reorder", {"list_type": "ipv4", "name": "PL", "rule_numbers": [1]}),
    ],
)
def test_session_lookup_http_exception_passes_through(monkeypatch, client, method, path, body):
    test_client, _executed = client

    def no_session(_request):
        raise HTTPException(status_code=409, detail="Commit-confirm pending")

    monkeypatch.setattr(f"{MODULE}.get_session_vyos_service", no_session)
    resp = getattr(test_client, method)(path, json=body) if body else getattr(test_client, method)(path)
    assert resp.status_code == 409
    assert resp.json()["detail"] == "Commit-confirm pending"
