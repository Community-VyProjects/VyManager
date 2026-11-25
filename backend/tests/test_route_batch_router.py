"""Policy route routes driven through the handlers with a stub service.

execute_batch and get_full_config run through run_in_threadpool (locked in
test_batch_off_event_loop.py). These tests check the parsed config, the
emitted ops, the reorder batch and the 400/500 paths, and that every route
passes a session lookup's HTTPException through.
"""

from types import SimpleNamespace

import pytest
from fastapi import FastAPI, HTTPException
from fastapi.testclient import TestClient

MODULE = "routers.route.route"
ROLLING = "2026.09.23-0027-rolling"
BASE = ["policy", "route", "PBR"]

FULL_TREE = {
    "policy": {
        "route": {
            "PBR": {
                "description": "pbr",
                "default-log": {},
                "interface": ["eth0", "eth1.7"],
                "rule": {
                    "10": {
                        "action": "accept",
                        "description": "web",
                        "disable": {},
                        "log": {},
                        "protocol": "tcp",
                        "source": {
                            "address": "192.0.2.0/24",
                            "mac-address": "00:11:22:33:44:55",
                            "port": "80",
                            "group": {"port-group": "GPOR", "mac-group": "GMAC"},
                            "geoip": {"country-code": ["us", "de"], "asn": "64500", "inverse-match": {}},
                        },
                        "destination": {"address": "198.51.100.0/24", "port": "443", "group": {"network-group": "GNET"}},
                        "tcp": {"flags": {"syn": {}, "not": {"ack": {}, "rst": {}}}, "mss": "1400"},
                        "set": {"table": "100", "tcp-mss": "1400"},
                    },
                    "20": {
                        "protocol": "icmp",
                        "icmp": {"type": "8", "code": "0"},
                        "ttl": {"gt": "1", "lt": "200"},
                        "fragment": {"match-frag": {}},
                        "ipsec": {"match-ipsec-in": {}, "match-none-out": {}},
                        "packet-type": "host",
                        "packet-length": ["100", "300-400"],
                        "packet-length-exclude": "200",
                        "dscp": "10",
                        "dscp-exclude": ["12", "14"],
                        "state": ["established", "related"],
                        "mark": "5",
                        "connection-mark": "7",
                        "time": {
                            "monthdays": "1,15", "startdate": "2026-01-01", "starttime": "08:00:00",
                            "stopdate": "2026-12-31", "stoptime": "18:00:00", "weekdays": "Monday,Tuesday",
                            "utc": {},
                        },
                        "limit": {"burst": "5", "rate": "10/minute"},
                        "recent": {"count": "3", "time": "60"},
                        "set": {"connection-mark": "9", "dscp": "8", "mark": "11", "vrf": "RED"},
                    },
                },
            }
        },
        "route6": {
            "PBR6": {
                "rule": {
                    "5": {"protocol": "icmpv6", "icmpv6": {"type": "echo-request"}, "hop-limit": {"eq": "64"}},
                }
            },
            "EMPTY": {},
        },
    }
}


def route_client(monkeypatch, version, commit, full_config=None):
    """Return (client, executed); executed holds one [(op, path), ...] per commit."""
    executed = []

    async def allow(*_args, **_kwargs):
        return None

    class Service:
        def get_version(self):
            return version

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
    return route_client(monkeypatch, ROLLING, commit, full_config=FULL_TREE)


@pytest.fixture
def client_14(monkeypatch, commit):
    return route_client(monkeypatch, "1.4.3", commit, full_config=FULL_TREE)


def _batch(test_client, operations, *, policy_type="route", name="PBR", rule_number=None):
    body = {"policy_type": policy_type, "name": name, "operations": operations}
    if rule_number is not None:
        body["rule_number"] = rule_number
    return test_client.post("/vyos/route/batch", json=body)


# ---------------------------------------------------------------- config


def test_config_parses_every_leaf(client):
    test_client, _executed = client
    resp = test_client.get("/vyos/route/config")
    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert data["total_ipv4"] == 1 and data["total_ipv6"] == 2
    policy = data["ipv4_policies"][0]
    assert policy["description"] == "pbr"
    assert policy["default_log"] is True
    assert policy["interfaces"] == ["eth0", "eth1.7"]
    r10, r20 = policy["rules"]
    assert (r10["rule_number"], r10["disable"], r10["log"], r10["action"]) == (10, True, True, "accept")
    m10 = r10["match"]
    assert m10["source_mac_address"] == "00:11:22:33:44:55"
    assert m10["source_group_port"] == "GPOR" and m10["source_group_mac"] == "GMAC"
    assert m10["destination_group_network"] == "GNET"
    assert m10["source_geoip"] == {"country_code": ["us", "de"], "asn": ["64500"], "inverse_match": True}
    assert m10["destination_geoip"] == {"country_code": [], "asn": [], "inverse_match": False}
    assert m10["tcp_flags"] == ["syn"] and m10["tcp_flags_not"] == ["ack", "rst"]
    assert m10["tcp_mss"] == "1400"
    assert r10["set"]["table"] == "100" and r10["set"]["tcp_mss"] == "1400"
    m20 = r20["match"]
    assert (m20["icmp_type"], m20["icmp_code"], m20["ttl_gt"], m20["ttl_lt"], m20["ttl_eq"]) == ("8", "0", "1", "200", None)
    assert m20["fragment"] == ["match-frag"]
    assert m20["ipsec"] == ["match-ipsec-in", "match-none-out"]
    assert m20["packet_length"] == ["100", "300-400"] and m20["packet_length_exclude"] == ["200"]
    assert m20["dscp"] == ["10"] and m20["dscp_exclude"] == ["12", "14"]
    assert m20["state"] == ["established", "related"]
    assert m20["connection_mark"] == ["7"] and m20["mark"] == "5"
    assert m20["time_weekdays"] == "Monday,Tuesday" and m20["time_utc"] is True
    assert (m20["limit_rate"], m20["limit_burst"], m20["recent_count"], m20["recent_time"]) == ("10/minute", "5", "3", "60")
    assert r20["set"] == {"connection_mark": "9", "dscp": "8", "mark": "11", "table": None, "tcp_mss": None, "vrf": "RED"}
    six = {p["name"]: p for p in data["ipv6_policies"]}
    assert six["PBR6"]["rules"][0]["match"]["icmpv6_type"] == "echo-request"
    assert six["PBR6"]["rules"][0]["match"]["hop_limit_eq"] == "64"
    assert six["EMPTY"] == {
        "name": "EMPTY", "policy_type": "route6", "description": None, "default_log": False,
        "interfaces": [], "rules": [],
    }


def test_config_without_policy_returns_empty_lists(monkeypatch, commit):
    test_client, _executed = route_client(monkeypatch, ROLLING, commit, full_config={})
    resp = test_client.get("/vyos/route/config")
    assert resp.json() == {"ipv4_policies": [], "ipv6_policies": [], "total_ipv4": 0, "total_ipv6": 0}


# ---------------------------------------------------------------- batch


def test_batch_binds_policy_rule_and_value(client):
    test_client, executed = client
    resp = _batch(
        test_client,
        [
            {"op": "create_rule"},
            {"op": "set_rule_description", "value": "a|b, c"},
            {"op": "set_match_ttl", "value": "gt|5"},
            {"op": "delete_match_state", "value": "related"},
            {"op": "set_vrf", "value": "RED"},
        ],
        rule_number=30,
    )
    assert resp.status_code == 200, resp.text
    assert resp.json() == {"success": True, "data": {"message": "Configuration updated"}, "error": None}
    rule = BASE + ["rule", "30"]
    assert executed == [[
        ("set", rule),
        ("set", rule + ["description", "a|b, c"]),
        ("set", rule + ["ttl", "gt", "5"]),
        ("delete", rule + ["state", "related"]),
        ("set", rule + ["set", "vrf", "RED"]),
    ]]


def test_policy_ops_take_no_rule_number(client):
    test_client, executed = client
    resp = _batch(test_client, [{"op": "set_interface_policy", "value": "eth0"}, {"op": "set_policy_default_log"}])
    assert resp.status_code == 200, resp.text
    assert executed == [[("set", BASE + ["interface", "eth0"]), ("set", BASE + ["default-log"])]]
    resp = _batch(test_client, [{"op": "delete_policy"}], rule_number=10)
    assert resp.status_code == 400
    assert resp.json()["detail"] == "Operation delete_policy takes no rule"


@pytest.mark.parametrize(
    "operations,detail",
    [
        ([{"op": "create_rule"}], "Operation create_rule requires rule"),
        ([{"op": "set_table"}], "Operation set_table requires rule"),
    ],
)
def test_rule_op_without_rule_number_is_400(client, operations, detail):
    test_client, executed = client
    resp = _batch(test_client, operations)
    assert resp.status_code == 400
    assert resp.json()["detail"] == detail
    assert executed == []


@pytest.mark.parametrize(
    "operation,detail",
    [
        ({"op": "set_table"}, "Operation set_table requires a value"),
        ({"op": "set_table", "value": ""}, "Operation set_table requires a value"),
        ({"op": "set_table", "value": "  "}, "Operation set_table requires a value"),
        ({"op": "set_match_ttl", "value": "gt"}, "Operation set_match_ttl requires 2 values"),
        ({"op": "set_match_ttl", "value": "gt|"}, "Operation set_match_ttl requires 2 values"),
        ({"op": "set_rule_log", "value": "x"}, "Operation set_rule_log takes no value"),
        ({"op": "nope"}, "Unknown operation: nope"),
        ({"op": "restore_rule", "value": "x"}, "Invalid operation: restore_rule"),
        ({"op": "_mapper"}, "Invalid operation: _mapper"),
    ],
)
def test_bad_operation_is_400_and_nothing_runs(client, operation, detail):
    test_client, executed = client
    resp = _batch(test_client, [{"op": "create_rule"}, operation], rule_number=10)
    assert resp.status_code == 400
    assert resp.json()["detail"] == detail
    assert executed == []


@pytest.mark.parametrize(
    "operation,detail",
    [
        ({"op": "set_vrf", "value": "RED"}, "policy route set vrf is not supported on this device"),
        ({"op": "set_match_tcp_mss", "value": "1400"}, "policy route tcp mss is not supported on this device"),
        ({"op": "set_match_source_geoip_asn", "value": "64500"}, "policy route geoip is not supported on this device"),
        ({"op": "set_match_ipsec", "value": "match-ipsec-in"}, "policy route ipsec match-ipsec-in is not supported on this device"),
    ],
)
def test_version_gate_is_400_on_1_4(client_14, operation, detail):
    test_client, executed = client_14
    resp = _batch(test_client, [{"op": "create_rule"}, operation], rule_number=10)
    assert resp.status_code == 400
    assert resp.json()["detail"] == detail
    assert executed == []


def test_family_mismatch_is_400(client):
    test_client, executed = client
    resp = _batch(test_client, [{"op": "set_match_icmp_type", "value": "8"}], policy_type="route6", rule_number=10)
    assert resp.status_code == 400
    assert resp.json()["detail"] == "this match is not available in policy route6"
    assert executed == []


@pytest.mark.parametrize(
    "body",
    [
        {"policy_type": "route4", "name": "PBR", "operations": []},
        {"policy_type": "route", "name": " ", "operations": []},
        {"policy_type": "route", "name": "PBR", "rule_number": 0, "operations": []},
    ],
)
def test_bad_request_model_is_422(client, body):
    test_client, _executed = client
    assert test_client.post("/vyos/route/batch", json=body).status_code == 422


def test_failed_commit_reports_the_error(client, commit):
    test_client, _executed = client
    commit.update(status=400, error="Commit failed")
    resp = _batch(test_client, [{"op": "set_table", "value": "100"}], rule_number=10)
    assert resp.status_code == 200
    assert resp.json() == {"success": False, "data": None, "error": "Commit failed"}


def test_empty_batch_stays_500(client):
    test_client, _executed = client
    assert _batch(test_client, []).status_code == 500


# ---------------------------------------------------------------- reorder


def _reorder(test_client, numbers, *, name="PBR", policy_type="route"):
    return test_client.post(
        "/vyos/route/reorder",
        json={"policy_type": policy_type, "policy_name": name, "rule_numbers": numbers},
    )


def test_reorder_moves_every_leaf_in_one_commit(client):
    test_client, executed = client
    resp = _reorder(test_client, [20, 10])
    assert resp.status_code == 200, resp.text
    assert resp.json() == {"success": True, "data": {"message": "Rules reordered"}, "error": None}
    (ops,) = executed
    assert ops[:2] == [("delete", BASE + ["rule", "20"]), ("delete", BASE + ["rule", "10"])]
    sets = [path for op, path in ops[2:]]
    assert BASE + ["rule", "10"] in sets and BASE + ["rule", "20"] in sets
    # rule 20's subtree lands on 10 and rule 10's on 20, every leaf included.
    assert BASE + ["rule", "10", "time", "weekdays", "Monday,Tuesday"] in sets
    assert BASE + ["rule", "10", "recent", "count", "3"] in sets
    assert BASE + ["rule", "10", "dscp-exclude", "14"] in sets
    assert BASE + ["rule", "20", "source", "geoip", "inverse-match"] in sets
    assert BASE + ["rule", "20", "tcp", "flags", "not", "rst"] in sets
    # Two rule nodes, rule 20's 34 leaves and rule 10's 23.
    assert len(sets) == 2 + 34 + 23


def test_reorder_same_order_commits_nothing(client):
    test_client, executed = client
    resp = _reorder(test_client, [10, 20])
    assert resp.status_code == 200
    assert resp.json()["success"] is True
    assert executed == []


@pytest.mark.parametrize(
    "numbers,status,detail",
    [
        ([10], 400, "rule_numbers must list every rule of the policy"),
        ([10, 20, 30], 400, "rule_numbers must list every rule of the policy"),
    ],
)
def test_reorder_rejects_a_partial_list(client, numbers, status, detail):
    test_client, executed = client
    resp = _reorder(test_client, numbers)
    assert resp.status_code == status
    assert resp.json()["detail"] == detail
    assert executed == []


def test_reorder_missing_policy_is_404(client):
    test_client, _executed = client
    resp = _reorder(test_client, [1], name="NOPE")
    assert resp.status_code == 404


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
        ("get", "/vyos/route/capabilities", None),
        ("get", "/vyos/route/config", None),
        ("post", "/vyos/route/batch", {"policy_type": "route", "name": "PBR", "operations": [{"op": "create_policy"}]}),
        ("post", "/vyos/route/reorder", {"policy_type": "route", "policy_name": "PBR", "rule_numbers": [1]}),
    ],
)
def test_session_lookup_http_exception_passes_through(monkeypatch, client, method, path, body):
    test_client, _executed = client

    def no_session(_request):
        raise HTTPException(status_code=400, detail="No active session")

    monkeypatch.setattr(f"{MODULE}.get_session_vyos_service", no_session)
    resp = getattr(test_client, method)(path, json=body) if body else getattr(test_client, method)(path)
    assert resp.status_code == 400
    assert resp.json()["detail"] == "No active session"
