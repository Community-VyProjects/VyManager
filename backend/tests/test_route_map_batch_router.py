"""Route-map routes driven through the handlers with a stub service.

The stub records the emitted ops per commit. Device calls must run off the
event loop: the app middleware records the loop thread and the stub compares
its own thread against it. Every route passes a session lookup's
HTTPException through.
"""

import copy
import threading
from types import SimpleNamespace

import pytest
from fastapi import FastAPI, HTTPException
from fastapi.testclient import TestClient

ROUTER = "routers.route_map.route_map"
V14 = "1.4.3"
V15 = "2025.11.01-0021-rolling"
RM = ["policy", "route-map", "RM"]

TREE = {
    "policy": {
        "route-map": {
            "RM": {
                "description": "out",
                "rule": {
                    "10": {
                        "action": "permit",
                        "match": {"community": {"community-list": "CL", "exact-match": {}}},
                        "set": {"community": {"add": ["65000:1", "65000:2"]}, "local-preference": "200"},
                    },
                    "20": {
                        "action": "deny",
                        "set": {"ipv6-next-hop": {"peer-address": {}}, "ip-next-hop": "peer-address"},
                    },
                    "30": {"action": "permit", "on-match": {"next": {}}},
                },
            }
        }
    }
}


@pytest.fixture
def commit():
    return {"status": 200, "error": None, "version": V15}


@pytest.fixture
def tree():
    return copy.deepcopy(TREE)


@pytest.fixture
def client(monkeypatch, commit, tree):
    executed = []
    loop_threads = set()
    device_threads = []
    permissions = []

    async def read(_req, feature):
        permissions.append(("read", feature))

    async def write(_req, feature):
        permissions.append(("write", feature))

    class Service:
        def get_version(self):
            return commit["version"]

        def get_full_config(self, refresh=False):
            device_threads.append(threading.current_thread())
            return tree

        def execute_batch(self, batch):
            device_threads.append(threading.current_thread())
            if batch.is_empty():
                raise ValueError("Cannot execute empty batch")
            executed.append([(item["op"], item["path"]) for item in batch.get_operations()])
            return SimpleNamespace(status=commit["status"], result="", error=commit["error"])

    monkeypatch.setattr(f"{ROUTER}.require_read_permission", read)
    monkeypatch.setattr(f"{ROUTER}.require_write_permission", write)
    monkeypatch.setattr(f"{ROUTER}.get_session_vyos_service", lambda _req: Service())

    from routers.route_map.route_map import router

    app = FastAPI()

    @app.middleware("http")
    async def record_loop(request, call_next):
        loop_threads.add(threading.current_thread())
        return await call_next(request)

    app.include_router(router)
    with TestClient(app) as test_client:
        yield SimpleNamespace(
            http=test_client,
            executed=executed,
            loop_threads=loop_threads,
            device_threads=device_threads,
            permissions=permissions,
        )


def _batch(c, operations, *, name="RM", rule_number=None):
    body = {"name": name, "operations": operations}
    if rule_number is not None:
        body["rule_number"] = rule_number
    return c.http.post("/vyos/route-map/batch", json=body)


def _reorder(c, numbers, *, name="RM"):
    return c.http.post("/vyos/route-map/reorder", json={"name": name, "rule_numbers": numbers})


# ---------------------------------------------------------------- config / capabilities


def test_config_returns_the_mapper_parse(client):
    resp = client.http.get("/vyos/route-map/config")
    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert data["total"] == 1
    (route_map,) = data["route_maps"]
    assert [rule["rule_number"] for rule in route_map["rules"]] == [10, 20, 30]
    first, second, _third = route_map["rules"]
    assert first["set"]["community_add_values"] == ["65000:1", "65000:2"]
    assert first["match"]["community_exact_match"] is True
    assert second["set"]["ip_nexthop_peer_address"] is True and second["set"]["ip_nexthop"] is None
    assert client.permissions == [("read", "ROUTE_MAP")]


@pytest.mark.parametrize("version,gated", [(V14, False), (V15, True)])
def test_capabilities_follow_the_mapper(client, commit, version, gated):
    commit.update(version=version)
    resp = client.http.get("/vyos/route-map/capabilities")
    assert resp.status_code == 200
    body = resp.json()
    assert body["features"]["match_source_peer"]["supported"] is gated
    assert body["features"]["match_rpki_extcommunity"]["supported"] is gated
    assert body["as_path_prepend_exclusive"] is gated
    assert body["ranges"]["rule"] == {"min": 1, "max": 65535}
    assert "version_info" not in body


# ---------------------------------------------------------------- batch


def test_batch_dispatches_onto_paths(client):
    resp = _batch(client, [
        {"op": "set_rule"},
        {"op": "set_rule_action", "value": "permit"},
        {"op": "set_rule_description", "value": "a|b, c"},
        {"op": "set_community_add", "value": "65000:3"},
        {"op": "delete_set_community_add", "value": "65000:1"},
        {"op": "set_community_delete", "value": "CL"},
        {"op": "delete_set_large_community_delete"},
        {"op": "set_extcommunity_rt", "value": "192.0.2.1:7"},
        {"op": "set_ip_nexthop_unchanged"},
        {"op": "set_as_path_prepend", "value": "65001 65002"},
        {"op": "delete_match_ip_nexthop_address"},
        {"op": "set_match_source_peer", "value": "eth0"},
    ], rule_number=10)
    assert resp.status_code == 200, resp.text
    assert resp.json() == {"success": True, "data": {"message": "Configuration updated"}, "error": None}
    r = RM + ["rule", "10"]
    assert client.executed == [[
        ("set", r),
        ("set", r + ["action", "permit"]),
        ("set", r + ["description", "a|b, c"]),
        ("set", r + ["set", "community", "add", "65000:3"]),
        ("delete", r + ["set", "community", "add", "65000:1"]),
        ("set", r + ["set", "community", "delete", "CL"]),
        ("delete", r + ["set", "large-community", "delete"]),
        ("set", r + ["set", "extcommunity", "rt", "192.0.2.1:7"]),
        ("set", r + ["set", "ip-next-hop", "unchanged"]),
        ("set", r + ["set", "as-path", "prepend", "65001 65002"]),
        ("delete", r + ["match", "ip", "nexthop", "address"]),
        ("set", r + ["match", "source-peer", "eth0"]),
    ]]
    assert client.permissions == [("write", "ROUTE_MAP")]


def test_parent_deletes_dispatch_with_the_rule(client):
    ops = ["delete_match_ip", "delete_match_ipv6", "delete_set_as_path", "delete_rule_on_match", "delete_match",
           "delete_set"]
    resp = _batch(client, [{"op": op} for op in ops], rule_number=10)
    assert resp.status_code == 200, resp.text
    r = RM + ["rule", "10"]
    assert client.executed == [[
        ("delete", r + ["match", "ip"]),
        ("delete", r + ["match", "ipv6"]),
        ("delete", r + ["set", "as-path"]),
        ("delete", r + ["on-match"]),
        ("delete", r + ["match"]),
        ("delete", r + ["set"]),
    ]]


def test_map_ops_run_without_a_rule_number(client):
    resp = _batch(client, [{"op": "set_route_map"}, {"op": "set_route_map_description", "value": "x"}], name="NEW")
    assert resp.status_code == 200, resp.text
    new = ["policy", "route-map", "NEW"]
    assert client.executed == [[("set", new), ("set", new + ["description", "x"])]]


def test_device_calls_run_off_the_event_loop(client):
    assert client.http.get("/vyos/route-map/config").status_code == 200
    assert _batch(client, [{"op": "delete_route_map"}]).status_code == 200
    assert _reorder(client, [20, 10, 30]).status_code == 200
    assert len(client.device_threads) == 4
    assert client.loop_threads
    for thread in client.device_threads:
        assert thread not in client.loop_threads


@pytest.mark.parametrize("operation,detail", [
    ({"op": "set_rule_action"}, "Operation set_rule_action requires a value"),
    ({"op": "set_rule_action", "value": ""}, "Operation set_rule_action requires a value"),
    ({"op": "set_community_add", "value": "  "}, "Operation set_community_add requires a value"),
    ({"op": "set_community_none", "value": "x"}, "Operation set_community_none takes no value"),
    ({"op": "delete_set_tag", "value": "5"}, "Operation delete_set_tag takes no value"),
    ({"op": "nope"}, "Unknown operation: nope"),
    ({"op": "restore_rule", "value": "x"}, "Invalid operation: restore_rule"),
    ({"op": "_mapper"}, "Invalid operation: _mapper"),
    ({"op": "get_capabilities"}, "Invalid operation: get_capabilities"),
    ({"op": "set_match_large_community_exact_match"}, "Unknown operation: set_match_large_community_exact_match"),
])
def test_bad_operation_is_400_and_nothing_runs(client, operation, detail):
    resp = _batch(client, [{"op": "set_rule"}, operation], rule_number=10)
    assert resp.status_code == 400
    assert resp.json()["detail"] == detail
    assert client.executed == []


@pytest.mark.parametrize("op", ["set_rule", "delete_rule", "set_rule_action"])
def test_rule_op_without_rule_number_is_400(client, op):
    operation = {"op": op, "value": "permit"} if op == "set_rule_action" else {"op": op}
    resp = _batch(client, [operation])
    assert resp.status_code == 400
    assert resp.json()["detail"] == f"Operation {op} requires rule"
    assert client.executed == []


@pytest.mark.parametrize("op", ["set_route_map", "delete_route_map", "delete_route_map_description"])
def test_map_op_with_rule_number_is_400(client, op):
    resp = _batch(client, [{"op": op}], rule_number=10)
    assert resp.status_code == 400
    assert resp.json()["detail"] == f"Operation {op} takes no rule"
    assert client.executed == []


@pytest.mark.parametrize("operation", [
    {"op": "set_match_source_peer", "value": "eth0"},
    {"op": "delete_match_source_peer"},
    {"op": "set_match_rpki_extcommunity", "value": "valid"},
    {"op": "delete_match_rpki_extcommunity"},
])
def test_gated_op_on_1_4_is_400_and_nothing_runs(client, commit, operation):
    commit.update(version=V14)
    resp = _batch(client, [{"op": "set_rule"}, operation], rule_number=10)
    assert resp.status_code == 400
    node = "source-peer" if "source_peer" in operation["op"] else "rpki-extcommunity"
    assert resp.json()["detail"] == f"route-map rule match {node} is not supported on this device"
    assert client.executed == []
    assert client.device_threads == []


@pytest.mark.parametrize("operation,detail", [
    ({"op": "set_rule_action", "value": "accept"}, "action must be one of: permit, deny"),
    ({"op": "set_set_tag", "value": "1"}, "Unknown operation: set_set_tag"),
    ({"op": "set_tag", "value": "0"}, "set tag must be a number from 1 to 65535"),
    ({"op": "set_community_add", "value": "internet"},
     "set community add must be AA:NN (0-65535:0-65535) or a well-known community"),
    ({"op": "set_ip_nexthop", "value": "peer-address"}, "set ip-next-hop must be an IPv4 address"),
    ({"op": "set_as_path_prepend", "value": "65001,65002"},
     "set as-path prepend must be AS numbers from 1 to 4294967295 separated by spaces"),
    ({"op": "set_rule_description", "value": "x" * 256}, "description must be one line of at most 255 characters"),
])
def test_bad_value_is_400(client, operation, detail):
    resp = _batch(client, [{"op": "set_rule"}, operation], rule_number=10)
    assert resp.status_code == 400
    assert resp.json()["detail"] == detail
    assert client.executed == []


def test_bad_name_is_400(client):
    resp = _batch(client, [{"op": "set_route_map"}], name="bad name")
    assert resp.status_code == 400
    assert resp.json()["detail"].startswith("route-map name must start with")
    assert client.executed == []


@pytest.mark.parametrize("body", [
    {"name": " ", "operations": []},
    {"name": "", "operations": []},
    {"name": "RM", "rule_number": 0, "operations": []},
    {"name": "RM", "rule_number": 65536, "operations": []},
    {"route_map_name": "RM", "operations": []},
])
def test_bad_request_model_is_422(client, body):
    assert client.http.post("/vyos/route-map/batch", json=body).status_code == 422


def test_failed_commit_reports_the_error(client, commit):
    commit.update(status=400, error="route-map RM still in use")
    resp = _batch(client, [{"op": "delete_route_map"}])
    assert resp.status_code == 200
    assert resp.json() == {"success": False, "data": None, "error": "route-map RM still in use"}


def test_empty_batch_stays_500(client):
    assert _batch(client, []).status_code == 500


def test_not_in_the_generic_operations_vocabulary():
    # Its ops take name and rule from the body, so the introspected signature
    # would misreport them (same as access-list and prefix-list).
    import routers.operations.operations as operations
    from vyos_builders.route_map import RouteMapBatchBuilder

    assert "route-map" not in operations._BUILDER_REGISTRY
    assert RouteMapBatchBuilder not in operations._BUILDER_REGISTRY.values()
    assert "RouteMapBatchBuilder" not in vars(operations)


# ---------------------------------------------------------------- reorder


def test_reorder_moves_every_leaf_in_one_commit(client):
    resp = _reorder(client, [20, 10, 30])
    assert resp.status_code == 200, resp.text
    assert resp.json() == {"success": True, "data": {"message": "Rules reordered"}, "error": None}
    r10 = RM + ["rule", "10"]
    r20 = RM + ["rule", "20"]
    # Rule 30 stays in place, so it is neither deleted nor rewritten.
    assert client.executed == [[
        ("delete", r20),
        ("delete", r10),
        ("set", r10),
        ("set", r10 + ["action", "deny"]),
        # #1047: ipv6-next-hop peer-address survives the move.
        ("set", r10 + ["set", "ipv6-next-hop", "peer-address"]),
        ("set", r10 + ["set", "ip-next-hop", "peer-address"]),
        ("set", r20),
        ("set", r20 + ["action", "permit"]),
        ("set", r20 + ["match", "community", "community-list", "CL"]),
        ("set", r20 + ["match", "community", "exact-match"]),
        ("set", r20 + ["set", "community", "add", "65000:1"]),
        ("set", r20 + ["set", "community", "add", "65000:2"]),
        ("set", r20 + ["set", "local-preference", "200"]),
    ]]


def test_reorder_same_order_commits_nothing(client):
    resp = _reorder(client, [10, 20, 30])
    assert resp.status_code == 200
    assert resp.json() == {"success": True, "data": {"message": "Rules reordered"}, "error": None}
    assert client.executed == []


@pytest.mark.parametrize("numbers", [[10, 20], [10, 20, 30, 40], [10, 20, 31]])
def test_reorder_requires_the_exact_rule_set(client, numbers):
    resp = _reorder(client, numbers)
    assert resp.status_code == 400
    assert resp.json()["detail"] == "rule_numbers must list every rule of the route-map"
    assert client.executed == []


def test_reorder_missing_map_is_404(client):
    resp = _reorder(client, [1], name="NOPE")
    assert resp.status_code == 404
    assert resp.json()["detail"] == "Route-map NOPE not found"


@pytest.mark.parametrize("body", [
    {"name": "RM", "rule_numbers": [10, 10]},
    {"name": "RM", "rule_numbers": []},
    {"name": "", "rule_numbers": [10]},
    {"route_map_name": "RM", "rules": []},
])
def test_reorder_bad_request_is_422(client, body):
    assert client.http.post("/vyos/route-map/reorder", json=body).status_code == 422


def test_reorder_failed_commit_reports_the_error(client, commit):
    commit.update(status=400, error="Commit failed")
    resp = _reorder(client, [20, 10, 30])
    assert resp.json() == {"success": False, "data": None, "error": "Commit failed"}


def _rules(tree):
    return tree["policy"]["route-map"]["RM"]["rule"]


def test_reorder_retargets_continue_in_a_rule_that_stays(client, tree):
    # Rule 10 stays and continues to rule 20; rules 20 and 30 swap.
    _rules(tree)["10"]["continue"] = "20"
    before = copy.deepcopy(tree)
    resp = _reorder(client, [10, 30, 20])
    assert resp.status_code == 200, resp.text
    r10, r20, r30 = (RM + ["rule", n] for n in ("10", "20", "30"))
    (ops,) = client.executed
    assert ops[:2] == [("delete", r30), ("delete", r20)]
    # Old 30 is restored as 20, old 20 as 30.
    assert ("set", r20 + ["on-match", "next"]) in ops
    assert ("set", r30 + ["action", "deny"]) in ops
    # Rule 10 is not rewritten; only its continue follows rule 20 to 30.
    assert [op for op in ops if op[1][: len(r10)] == r10] == [("set", r10 + ["continue", "30"])]
    assert ops[-1] == ("set", r10 + ["continue", "30"])
    # The config read is not changed in place.
    assert tree == before


def test_reorder_retargets_goto_in_a_rule_that_stays(client, tree):
    _rules(tree)["10"]["on-match"] = {"goto": "30"}
    resp = _reorder(client, [10, 30, 20])
    assert resp.status_code == 200, resp.text
    r10 = RM + ["rule", "10"]
    (ops,) = client.executed
    assert [op for op in ops if op[1][: len(r10)] == r10] == [("set", r10 + ["on-match", "goto", "20"])]


def test_reorder_moved_rule_follows_its_moved_target(client, tree):
    # 20 -> 10 continues to 30, which moves to 40.
    _rules(tree)["20"]["continue"] = "30"
    _rules(tree)["40"] = {"action": "permit"}
    resp = _reorder(client, [20, 10, 40, 30])
    assert resp.status_code == 200, resp.text
    r10 = RM + ["rule", "10"]
    (ops,) = client.executed
    assert ("set", r10 + ["continue", "40"]) in ops
    assert ("set", r10 + ["continue", "30"]) not in ops
    assert not any(path[-2:] == ["continue", "20"] for _op, path in ops)


@pytest.mark.parametrize("leaf,value,label", [
    ("continue", "20", "continue"),
    ("on-match", {"goto": "20"}, "on-match goto"),
])
def test_reorder_target_below_its_rule_is_400_and_nothing_runs(client, tree, leaf, value, label):
    # Rule 10 -> 20 and 20 -> 10: its target would be 10, not after 20.
    _rules(tree)["10"][leaf] = value
    resp = _reorder(client, [20, 10, 30])
    assert resp.status_code == 400
    assert resp.json()["detail"] == (
        f"Rule 10's {label} target 20 would become 10, which is not greater than its rule number 20"
    )
    assert client.executed == []
    # Only the config read ran; execute_batch never did.
    assert len(client.device_threads) == 1


@pytest.mark.parametrize("leaf,value,label", [
    ("continue", "20", "continue"),
    ("on-match", {"goto": "20"}, "on-match goto"),
])
def test_reorder_target_moved_below_an_unmoved_rule_is_400(client, tree, leaf, value, label):
    # Rule 10 stays put; its target 20 would move to 5, below it.
    _rules(tree)["5"] = {"action": "permit"}
    _rules(tree)["10"][leaf] = value
    resp = _reorder(client, [20, 10, 5, 30])
    assert resp.status_code == 400
    assert resp.json()["detail"] == (
        f"Rule 10's {label} target 20 would become 5, which is not greater than its rule number 10"
    )
    assert client.executed == []
    assert len(client.device_threads) == 1


def test_reorder_moved_rule_past_its_unmoved_target_is_400(client, tree):
    # Rule 10 continues to 30 and would move to 40, past its own target.
    _rules(tree)["10"]["continue"] = "30"
    _rules(tree)["40"] = {"action": "permit"}
    resp = _reorder(client, [20, 40, 30, 10])  # 30 stays put
    assert resp.status_code == 400
    assert resp.json()["detail"] == (
        "Rule 10's continue target 30 stays, which is not greater than its rule number 40"
    )
    assert client.executed == []
    assert len(client.device_threads) == 1


# ---------------------------------------------------------------- passthrough


@pytest.mark.parametrize("method,path,body", [
    ("get", "/vyos/route-map/capabilities", None),
    ("get", "/vyos/route-map/config", None),
    ("post", "/vyos/route-map/batch", {"name": "RM", "operations": [{"op": "set_route_map"}]}),
    ("post", "/vyos/route-map/reorder", {"name": "RM", "rule_numbers": [1]}),
])
def test_session_lookup_http_exception_passes_through(monkeypatch, client, method, path, body):
    def no_session(_request):
        raise HTTPException(status_code=400, detail="No active session")

    monkeypatch.setattr(f"{ROUTER}.get_session_vyos_service", no_session)
    resp = getattr(client.http, method)(path, json=body) if body else getattr(client.http, method)(path)
    assert resp.status_code == 400
    assert resp.json()["detail"] == "No active session"
