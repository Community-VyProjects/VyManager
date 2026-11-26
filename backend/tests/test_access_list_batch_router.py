"""Access-list routes driven through the handlers with a stub service.

execute_batch and get_full_config run through run_in_threadpool (locked in
test_batch_off_event_loop.py). These tests check the emitted ops, the reorder
batch, the 400/500 paths, and that every route passes a session lookup's
HTTPException through.
"""

from types import SimpleNamespace

import pytest
from fastapi import FastAPI, HTTPException
from fastapi.testclient import TestClient

MODULE = "routers.access_list.access_list"
ROLLING = "2026.09.23-0027-rolling"
BASE = ["policy", "access-list", "100"]

FULL_TREE = {
    "policy": {
        "access-list": {
            "100": {
                "description": "corp",
                "rule": {
                    "10": {
                        "action": "permit",
                        "description": "a",
                        "source": {"network": "10.0.0.0", "inverse-mask": "0.0.0.255"},
                        "destination": {"host": "192.0.2.1"},
                    },
                    "20": {"action": "deny", "source": {"any": {}}, "destination": {"any": {}}},
                },
            }
        },
        "access-list6": {
            "ACL6": {
                "rule": {
                    "5": {"action": "permit", "source": {"network": "2001:db8::/32", "exact-match": {}}},
                    "6": {"action": "deny", "source": {"any": {}, "network": "2001:db8:1::/48"}},
                }
            }
        },
    }
}


def access_list_client(monkeypatch, commit, full_config=None):
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
    return access_list_client(monkeypatch, commit, full_config=FULL_TREE)


def _batch(test_client, operations, *, list_type="ipv4", name="100", rule_number=None):
    body = {"list_type": list_type, "name": name, "operations": operations}
    if rule_number is not None:
        body["rule_number"] = rule_number
    return test_client.post("/vyos/access-list/batch", json=body)


# ---------------------------------------------------------------- config / capabilities


def test_config_returns_the_mapper_parse(client):
    test_client, _executed = client
    resp = test_client.get("/vyos/access-list/config")
    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert data["total_ipv4"] == 1 and data["total_ipv6"] == 1
    rule = data["ipv4_lists"][0]["rules"][0]
    assert (rule["source_network"], rule["source_inverse_mask"], rule["destination_host"]) == (
        "10.0.0.0",
        "0.0.0.255",
        "192.0.2.1",
    )
    six = data["ipv6_lists"][0]
    assert six["list_type"] == "ipv6" and six["number"] == "ACL6"
    assert six["rules"][0]["source_exact_match"] is True


def test_capabilities_serve_the_ranges(client):
    test_client, _executed = client
    resp = test_client.get("/vyos/access-list/capabilities")
    assert resp.status_code == 200
    body = resp.json()
    assert body["ranges"]["rule"] == {"min": 1, "max": 65535}
    assert body["extended_ranges"] == [{"min": 100, "max": 199}, {"min": 2000, "max": 2699}]
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
            {"op": "set_rule_source_network", "value": "10.0.0.0"},
            {"op": "set_rule_source_inverse_mask", "value": "0.0.0.255"},
            {"op": "delete_rule_source_any"},
            {"op": "set_rule_destination_host", "value": "192.0.2.9"},
            {"op": "delete_rule_destination_any"},
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
        ("set", rule + ["source", "network", "10.0.0.0"]),
        ("set", rule + ["source", "inverse-mask", "0.0.0.255"]),
        ("delete", rule + ["source", "any"]),
        ("set", rule + ["destination", "host", "192.0.2.9"]),
        ("delete", rule + ["destination", "any"]),
    ]]


def test_ipv6_rule_ops(client):
    test_client, executed = client
    resp = _batch(
        test_client,
        [
            {"op": "create_rule"},
            {"op": "set_rule_action", "value": "permit"},
            {"op": "set_rule_source_network", "value": "2001:db8::/32"},
            {"op": "set_rule_source_exact_match"},
            {"op": "delete_rule_source_any"},
        ],
        list_type="ipv6",
        name="ACL6",
        rule_number=1,
    )
    assert resp.status_code == 200, resp.text
    rule = ["policy", "access-list6", "ACL6", "rule", "1"]
    assert executed == [[
        ("set", rule),
        ("set", rule + ["action", "permit"]),
        ("set", rule + ["source", "network", "2001:db8::/32"]),
        ("set", rule + ["source", "exact-match"]),
        ("delete", rule + ["source", "any"]),
    ]]


def test_list_ops_on_ipv6(client):
    test_client, executed = client
    resp = _batch(
        test_client,
        [{"op": "create_access_list"}, {"op": "set_access_list_description", "value": "v6"}],
        list_type="ipv6",
        name="NEW6",
    )
    assert resp.status_code == 200, resp.text
    six = ["policy", "access-list6", "NEW6"]
    assert executed == [[("set", six), ("set", six + ["description", "v6"])]]


def test_list_op_rejects_a_rule_number(client):
    test_client, executed = client
    resp = _batch(test_client, [{"op": "delete_access_list"}], rule_number=10)
    assert resp.status_code == 400
    assert resp.json()["detail"] == "Operation delete_access_list takes no rule"
    assert executed == []


@pytest.mark.parametrize("op", ["create_rule", "set_rule_source_host", "delete_rule"])
def test_rule_op_without_rule_number_is_400(client, op):
    test_client, executed = client
    resp = _batch(test_client, [{"op": op, "value": "10.0.0.1"} if op == "set_rule_source_host" else {"op": op}])
    assert resp.status_code == 400
    assert resp.json()["detail"] == f"Operation {op} requires rule"
    assert executed == []


@pytest.mark.parametrize(
    "operation,detail",
    [
        ({"op": "set_rule_source_host"}, "Operation set_rule_source_host requires a value"),
        ({"op": "set_rule_source_host", "value": ""}, "Operation set_rule_source_host requires a value"),
        ({"op": "set_rule_action", "value": "  "}, "Operation set_rule_action requires a value"),
        ({"op": "set_rule_source_any", "value": "x"}, "Operation set_rule_source_any takes no value"),
        ({"op": "delete_rule_source_host", "value": "10.0.0.1"}, "Operation delete_rule_source_host takes no value"),
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
    "operation,list_type,name,detail",
    [
        ({"op": "set_rule_source_host", "value": "10.0.0.256"}, "ipv4", "100", "address must be an IPv4 address"),
        ({"op": "set_rule_source_network", "value": "10.0.0.0/24"}, "ipv4", "100", "address must be an IPv4 address"),
        ({"op": "set_rule_source_network", "value": "2001:db8::1/32"}, "ipv6", "ACL6",
         "network must be an IPv6 prefix with no host bits set"),
        ({"op": "set_rule_destination_any"}, "ipv6", "ACL6", "access-list6 rules have no destination"),
        ({"op": "set_rule_source_host", "value": "2001:db8::1"}, "ipv6", "ACL6", "access-list6 rule source has no host"),
        ({"op": "set_rule_source_exact_match"}, "ipv4", "100", "access-list rule source has no exact-match"),
        ({"op": "set_rule_action", "value": "accept"}, "ipv4", "100", "action must be permit or deny"),
        ({"op": "set_rule_description", "value": "x" * 256}, "ipv4", "100",
         "description must be one line of at most 255 characters"),
    ],
)
def test_bad_value_is_400(client, operation, list_type, name, detail):
    test_client, executed = client
    resp = _batch(test_client, [{"op": "create_rule"}, operation], list_type=list_type, name=name, rule_number=10)
    assert resp.status_code == 400
    assert resp.json()["detail"] == detail
    assert executed == []


@pytest.mark.parametrize(
    "list_type,name,detail",
    [
        ("ipv4", "abc", "access-list number must be a number from 0 to 4294967295"),
        ("ipv6", "A B", "access-list6 name must not be empty or contain whitespace"),
    ],
)
def test_bad_name_is_400(client, list_type, name, detail):
    test_client, executed = client
    resp = _batch(test_client, [{"op": "create_access_list"}], list_type=list_type, name=name)
    assert resp.status_code == 400
    assert resp.json()["detail"] == detail
    assert executed == []


@pytest.mark.parametrize(
    "body",
    [
        {"list_type": "ipv5", "name": "100", "operations": []},
        {"list_type": "ipv4", "name": " ", "operations": []},
        {"list_type": "ipv4", "name": "", "operations": []},
        {"list_type": "ipv4", "name": "100", "rule_number": 0, "operations": []},
        {"list_type": "ipv4", "name": "100", "rule_number": 65536, "operations": []},
        {"identifier": "100", "list_type": "ipv4", "operations": []},
    ],
)
def test_bad_request_model_is_422(client, body):
    test_client, _executed = client
    assert test_client.post("/vyos/access-list/batch", json=body).status_code == 422


def test_failed_commit_reports_the_error(client, commit):
    test_client, _executed = client
    commit.update(status=400, error="access-list 100 still in use")
    resp = _batch(test_client, [{"op": "delete_access_list"}])
    assert resp.status_code == 200
    assert resp.json() == {"success": False, "data": None, "error": "access-list 100 still in use"}


def test_empty_batch_stays_500(client):
    test_client, _executed = client
    assert _batch(test_client, []).status_code == 500


# ---------------------------------------------------------------- reorder


def _reorder(test_client, numbers, *, name="100", list_type="ipv4"):
    return test_client.post(
        "/vyos/access-list/reorder",
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
        ("set", r10 + ["source", "any"]),
        ("set", r10 + ["destination", "any"]),
        ("set", r20),
        ("set", r20 + ["action", "permit"]),
        ("set", r20 + ["description", "a"]),
        ("set", r20 + ["source", "network", "10.0.0.0"]),
        ("set", r20 + ["source", "inverse-mask", "0.0.0.255"]),
        ("set", r20 + ["destination", "host", "192.0.2.1"]),
    ]]


def test_ipv6_reorder_keeps_exact_match_and_a_network_beside_any(client):
    # #1078: the old reorder dropped source exact-match, and the network
    # when any was also set.
    test_client, executed = client
    resp = _reorder(test_client, [6, 5], name="ACL6", list_type="ipv6")
    assert resp.status_code == 200, resp.text
    six = ["policy", "access-list6", "ACL6", "rule"]
    assert executed == [[
        ("delete", six + ["6"]),
        ("delete", six + ["5"]),
        ("set", six + ["5"]),
        ("set", six + ["5", "action", "deny"]),
        ("set", six + ["5", "source", "any"]),
        ("set", six + ["5", "source", "network", "2001:db8:1::/48"]),
        ("set", six + ["6"]),
        ("set", six + ["6", "action", "permit"]),
        ("set", six + ["6", "source", "network", "2001:db8::/32"]),
        ("set", six + ["6", "source", "exact-match"]),
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
    assert _reorder(test_client, [5, 6], name="ACL6", list_type="ipv6").status_code == 200


def test_reorder_missing_list_is_404(client):
    test_client, _executed = client
    assert _reorder(test_client, [1], name="7").status_code == 404


def test_reorder_rejects_repeated_numbers(client):
    test_client, _executed = client
    assert _reorder(test_client, [10, 10]).status_code == 422


def test_reorder_failed_commit_reports_the_error(client, commit):
    test_client, _executed = client
    commit.update(status=400, error="Commit failed")
    resp = _reorder(test_client, [20, 10])
    assert resp.json() == {"success": False, "data": None, "error": "Commit failed"}


def test_not_in_the_generic_operations_vocabulary():
    # Its ops take list_type, name and rule from the body, so the introspected
    # signature would misreport them (same as prefix-list).
    from routers.operations.operations import _BUILDER_REGISTRY

    assert "access-list" not in _BUILDER_REGISTRY


# ---------------------------------------------------------------- passthrough


@pytest.mark.parametrize(
    "method,path,body",
    [
        ("get", "/vyos/access-list/capabilities", None),
        ("get", "/vyos/access-list/config", None),
        ("post", "/vyos/access-list/batch", {"list_type": "ipv4", "name": "100", "operations": [{"op": "create_access_list"}]}),
        ("post", "/vyos/access-list/reorder", {"list_type": "ipv4", "name": "100", "rule_numbers": [1]}),
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
