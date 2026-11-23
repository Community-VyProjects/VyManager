"""Firewall zone routes driven through the handlers with a stub service.

execute_batch and get_full_config run through run_in_threadpool (locked in
test_batch_off_event_loop.py). These tests check the config payload, the
emitted ops, and the 400/422/500 paths.
"""

import inspect
from types import SimpleNamespace

import pytest
from fastapi import FastAPI, HTTPException
from fastapi.testclient import TestClient

from vyos_builders.firewall.zones import FirewallZonesBatchBuilder

MODULE = "routers.firewall.zones"
PREFIX = "/vyos/firewall/zones"
LAN = ["firewall", "zone", "LAN"]


def zones_client(monkeypatch, version, full_config=None, commit=None):
    """Return (client, executed); executed holds one [(op, path), ...] per commit."""
    executed = []
    if commit is None:
        commit = {"status": 200, "error": None}

    async def allow(*_args, **_kwargs):
        return None

    class Service:
        def get_version(self):
            return version

        def get_full_config(self, refresh=False):
            return full_config or {}

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
    return TestClient(app), executed


@pytest.fixture
def commit():
    return {"status": 200, "error": None}


@pytest.fixture
def client(monkeypatch, commit):
    return zones_client(monkeypatch, "1.5", commit=commit)


@pytest.fixture
def client14(monkeypatch, commit):
    return zones_client(monkeypatch, "1.4", commit=commit)


def _batch(test_client, operations, name="LAN"):
    return test_client.post(
        f"{PREFIX}/batch", json={"zone_name": name, "operations": operations}
    )


# ---------------------------------------------------------------------------
# Capabilities and config
# ---------------------------------------------------------------------------


@pytest.mark.parametrize("version, member", [("1.4", False), ("1.5", True)])
def test_capabilities_follow_the_mapper(monkeypatch, version, member):
    test_client, _executed = zones_client(monkeypatch, version)
    resp = test_client.get(f"{PREFIX}/capabilities")
    assert resp.status_code == 200, resp.text
    features = resp.json()["features"]
    assert features["member_interface"]["supported"] is member
    assert features["member_vrf"]["supported"] is member
    assert features["default_firewall"]["supported"] is member
    assert features["interface_direct"]["supported"] is not member


def test_config_returns_parsed_zones_on_1_5(monkeypatch):
    tree = {
        "firewall": {
            "zone": {
                "LAN": {
                    "description": "Inside",
                    "default-action": "drop",
                    "default-log": {},
                    "member": {"interface": ["eth1", "eth2"], "vrf": "blue"},
                    "default-firewall": {"name": "RS4", "ipv6-name": "RS6"},
                    "from": {
                        "WAN": {"firewall": {"name": "WAN-LAN", "ipv6-name": "WAN-LAN-V6"}},
                        "DMZ": {},
                    },
                    "intra-zone-filtering": {
                        "action": "accept",
                        "firewall": {"name": "LAN-LAN"},
                    },
                },
                "LOCAL": {"local-zone": {}, "default-action": "reject"},
            }
        }
    }
    test_client, _executed = zones_client(monkeypatch, "1.5", full_config=tree)
    resp = test_client.get(f"{PREFIX}/config")
    assert resp.status_code == 200, resp.text
    assert resp.json() == {
        "zones": [
            {
                "name": "LAN",
                "description": "Inside",
                "default_action": "drop",
                "default_log": True,
                "local_zone": False,
                "interfaces": ["eth1", "eth2"],
                "vrfs": ["blue"],
                "default_firewall": {"name": "RS4", "ipv6_name": "RS6"},
                "from_zones": [
                    {"from_zone": "WAN", "firewall_name": "WAN-LAN", "firewall_ipv6_name": "WAN-LAN-V6"},
                    {"from_zone": "DMZ", "firewall_name": None, "firewall_ipv6_name": None},
                ],
                "intra_zone_filtering": {
                    "action": "accept",
                    "firewall_name": "LAN-LAN",
                    "firewall_ipv6_name": None,
                },
            },
            {
                "name": "LOCAL",
                "description": None,
                "default_action": "reject",
                "default_log": False,
                "local_zone": True,
                "interfaces": [],
                "vrfs": [],
                "default_firewall": None,
                "from_zones": [],
                "intra_zone_filtering": None,
            },
        ],
        "total": 2,
    }


def test_config_reads_zone_level_interfaces_on_1_4(monkeypatch):
    tree = {
        "firewall": {
            "zone": {
                "LAN": {
                    "interface": "eth1",
                    "member": {"interface": ["eth9"]},
                    "default-firewall": {"name": "RS4"},
                }
            }
        }
    }
    test_client, _executed = zones_client(monkeypatch, "1.4", full_config=tree)
    resp = test_client.get(f"{PREFIX}/config")
    assert resp.status_code == 200, resp.text
    zone = resp.json()["zones"][0]
    assert zone["interfaces"] == ["eth1"]
    assert zone["vrfs"] == []
    assert zone["default_firewall"] is None


@pytest.mark.parametrize("tree", [{}, {"firewall": {}}, {"firewall": {"zone": {}}}])
def test_config_without_zones_is_empty(monkeypatch, tree):
    test_client, _executed = zones_client(monkeypatch, "1.5", full_config=tree)
    resp = test_client.get(f"{PREFIX}/config")
    assert resp.status_code == 200, resp.text
    assert resp.json() == {"zones": [], "total": 0}


def test_config_read_failure_is_500(monkeypatch):
    test_client, _executed = zones_client(monkeypatch, "1.5")

    class Broken:
        def get_version(self):
            return "1.5"

        def get_full_config(self, refresh=False):
            raise RuntimeError("device down")

    monkeypatch.setattr(f"{MODULE}.get_session_vyos_service", lambda _req: Broken())
    resp = test_client.get(f"{PREFIX}/config")
    assert resp.status_code == 500, resp.text
    assert resp.json()["detail"] == "Internal server error"


# ---------------------------------------------------------------------------
# Batch
# ---------------------------------------------------------------------------


def test_batch_binds_the_zone_and_splits_the_value_on_colon(client):
    test_client, executed = client
    resp = _batch(test_client, [
        {"op": "set_zone"},
        {"op": "set_zone_description", "value": "edge: a, b|c"},
        {"op": "set_zone_interface", "value": "eth1"},
        {"op": "delete_zone_member_vrf", "value": "blue"},
        {"op": "set_zone_from", "value": "WAN"},
        {"op": "delete_zone_from_firewall_name", "value": "WAN"},
        {"op": "set_zone_from_firewall_name", "value": "WAN:WAN-LAN"},
        {"op": "set_zone_from_ipv4", "value": "WAN:WAN-LAN"},
        {"op": "set_zone_from_ipv6", "value": "WAN:WAN-LAN-V6"},
        {"op": "set_zone_default_firewall_name", "value": "RS4"},
        {"op": "delete_zone_intra_zone_action"},
    ])
    assert resp.status_code == 200, resp.text
    assert resp.json() == {
        "success": True,
        "data": {"message": "Zone configuration updated"},
        "error": None,
    }
    from_wan = LAN + ["from", "WAN", "firewall"]
    assert executed == [[
        ("set", LAN),
        ("set", LAN + ["description", "edge: a, b|c"]),
        ("set", LAN + ["member", "interface", "eth1"]),
        ("delete", LAN + ["member", "vrf", "blue"]),
        ("set", LAN + ["from", "WAN"]),
        ("delete", from_wan + ["name"]),
        ("set", from_wan + ["name", "WAN-LAN"]),
        ("set", from_wan + ["name", "WAN-LAN"]),
        ("set", from_wan + ["ipv6-name", "WAN-LAN-V6"]),
        ("set", LAN + ["default-firewall", "name", "RS4"]),
        ("delete", LAN + ["intra-zone-filtering", "action"]),
    ]]


def test_batch_interface_is_zone_level_on_1_4(client14):
    test_client, executed = client14
    resp = _batch(test_client, [{"op": "set_zone_interface", "value": "eth1"}])
    assert resp.status_code == 200, resp.text
    assert executed == [[("set", LAN + ["interface", "eth1"])]]


def test_builder_ops_take_the_zone_first():
    """The handler binds zone_name first; the value fills the rest."""
    builder = FirewallZonesBatchBuilder(version="1.5")
    ops = [
        (name, member)
        for name, member in inspect.getmembers(builder, inspect.ismethod)
        if name.startswith(("set_", "delete_", "create_"))
    ]
    assert ops
    for name, method in ops:
        params = list(inspect.signature(method).parameters)
        assert params[0] == "zone_name", name
        assert len(params) in (1, 2, 3), name


@pytest.mark.parametrize("op", [
    "set_zone",
    "delete_zone",
    "delete_zone_description",
    "set_zone_default_log",
    "delete_zone_local_zone",
    "delete_zone_intra_zone_firewall_name",
])
def test_batch_value_on_zone_only_op_is_400(client, op):
    """A dropped value would run the wider op (delete the zone, not one leaf)."""
    test_client, executed = client
    resp = _batch(test_client, [{"op": op, "value": "x"}])
    assert resp.status_code == 400, resp.text
    assert resp.json()["detail"] == f"Operation {op} takes no value"
    assert executed == []


@pytest.mark.parametrize("operation", [
    {"op": "set_zone_interface"},
    {"op": "set_zone_description", "value": None},
    {"op": "delete_zone_from", "value": ""},
    {"op": "set_zone_from_ipv4", "value": "  "},
])
def test_batch_missing_value_is_400(client, operation):
    """A delete_zone_from with no value is not a TypeError 500."""
    test_client, executed = client
    resp = _batch(test_client, [operation])
    assert resp.status_code == 400, resp.text
    assert resp.json()["detail"] == f"Operation {operation['op']} requires a value"
    assert executed == []


@pytest.mark.parametrize("value", ["WAN", "WAN:", ":WAN-LAN", "WAN: "])
def test_batch_short_multi_arg_value_is_400(client, value):
    test_client, executed = client
    resp = _batch(test_client, [{"op": "set_zone_from_firewall_name", "value": value}])
    assert resp.status_code == 400, resp.text
    assert resp.json()["detail"] == "Operation set_zone_from_firewall_name requires 2 values"
    assert executed == []


@pytest.mark.parametrize("op", ["set_zone_from_ipv4", "set_zone_from_ipv6"])
@pytest.mark.parametrize("value", ["WAN", "WAN:", ":WAN-LAN", " :X", "WAN :X", "WAN: X", "WAN:X ", "WAN:A:B"])
def test_batch_bad_composite_value_is_400(client, op, value):
    """The builder splits these itself; a half-empty or padded value is not sent."""
    test_client, executed = client
    resp = _batch(test_client, [{"op": op, "value": value}])
    assert resp.status_code == 400, resp.text
    assert resp.json()["detail"] == f"Operation {op} has an invalid value"
    assert executed == []


def test_composite_op_list_matches_the_builder_ops_that_split_on_colon():
    from routers.firewall.zones import COMPOSITE_OPS

    splitting = {
        name
        for name, method in inspect.getmembers(FirewallZonesBatchBuilder, inspect.isfunction)
        if name.startswith(("set_", "delete_", "create_"))
        and 'split(":"' in inspect.getsource(method)
    }
    assert set(COMPOSITE_OPS) == splitting


def test_batch_unknown_op_is_400(client):
    test_client, executed = client
    resp = _batch(test_client, [{"op": "no_such_op", "value": "x"}])
    assert resp.status_code == 400, resp.text
    assert resp.json()["detail"] == "Unknown operation: no_such_op"
    assert executed == []


@pytest.mark.parametrize("op", ["clear", "operation_count", "_operations", "add_set", "get_capabilities"])
def test_batch_internal_op_is_400(client, op):
    test_client, executed = client
    resp = _batch(test_client, [{"op": op}])
    assert resp.status_code == 400, resp.text
    assert resp.json()["detail"] == f"Invalid operation: {op}"
    assert executed == []


@pytest.mark.parametrize("op, value", [
    ("set_zone_default_firewall_name", "RS4"),
    ("set_zone_default_firewall_ipv6_name", "RS6"),
    ("delete_zone_default_firewall_name", None),
    ("delete_zone_default_firewall_ipv6_name", None),
])
def test_batch_node_missing_on_1_4_is_400(client14, op, value):
    """The mapper raises ValueError for a 1.5-only node; nothing is committed."""
    test_client, executed = client14
    resp = _batch(test_client, [{"op": "set_zone"}, {"op": op, "value": value}])
    assert resp.status_code == 400, resp.text
    assert resp.json()["detail"] == "firewall zone default-firewall is not supported on this device"
    assert executed == []


@pytest.mark.parametrize("name", ["", "  "])
def test_batch_rejects_blank_zone_name(client, name):
    test_client, executed = client
    resp = _batch(test_client, [{"op": "set_zone"}], name=name)
    assert resp.status_code == 422, resp.text
    assert executed == []


def test_batch_empty_is_500(client):
    """An empty batch is a ValueError from execute_batch, not a client 400."""
    test_client, executed = client
    resp = _batch(test_client, [])
    assert resp.status_code == 500, resp.text
    assert resp.json()["detail"] == "Internal server error"
    assert executed == []


@pytest.mark.parametrize("status, error", [(400, "Commit failed"), (200, "set failed")])
def test_batch_rejected_commit_reports_failure(client, commit, status, error):
    test_client, executed = client
    commit.update(status=status, error=error)
    resp = _batch(test_client, [{"op": "set_zone"}])
    assert resp.status_code == 200, resp.text
    assert resp.json() == {"success": False, "data": None, "error": error}
    assert executed == [[("set", LAN)]]


# ---------------------------------------------------------------------------
# Provision and deprovision
# ---------------------------------------------------------------------------


def _provision(test_client, **body):
    payload = {"zone_name": "LAN", "interfaces": ["eth1"], "is_first_zone": True}
    payload.update(body)
    return test_client.post(f"{PREFIX}/provision", json=payload)


def _deprovision(test_client, **body):
    payload = {"zone_name": "LAN", "peer_zones": ["WAN"], "is_last_zone": False}
    payload.update(body)
    return test_client.post(f"{PREFIX}/deprovision", json=payload)


def test_provision_commits_the_zone_and_chains(client):
    test_client, executed = client
    resp = _provision(test_client, default_action="reject", existing_zones=["WAN"])
    assert resp.status_code == 200, resp.text
    assert resp.json() == {"success": True, "data": {"message": "Zone provisioned"}, "error": None}
    assert len(executed) == 1
    ops = executed[0]
    assert ops[:3] == [
        ("set", LAN),
        ("set", LAN + ["default-action", "reject"]),
        ("set", LAN + ["member", "interface", "eth1"]),
    ]
    assert ("set", ["firewall", "zone", "LOCAL", "local-zone"]) in ops
    assert ("set", ["firewall", "zone", "WAN", "from", "LAN", "firewall", "name", "LAN-WAN"]) in ops
    assert ("set", ["firewall", "ipv4", "name", "WAN-LAN", "default-action", "drop"]) in ops


def test_provision_rejects_an_unknown_default_action(client):
    test_client, executed = client
    resp = _provision(test_client, default_action="accept")
    assert resp.status_code == 422, resp.text
    assert executed == []


def test_provision_skips_a_blank_description(client):
    test_client, executed = client
    resp = _provision(test_client, description="   ")
    assert resp.status_code == 200, resp.text
    assert not [path for _op, path in executed[0] if "description" in path]


@pytest.mark.parametrize("body", [
    {"interfaces": [""]},
    {"interfaces": ["eth1", "eth1"]},
    {"vrfs": ["  "]},
    {"vrfs": ["blue", "blue"]},
    {"existing_zones": [""]},
    {"existing_zones": ["WAN", "WAN"]},
    {"existing_zones": ["LAN"]},
    {"existing_zones": ["LOCAL"]},
    {"zone_name": "LOCAL"},
])
def test_provision_rejects_bad_names(client, body):
    """Each name becomes a path node or a pair chain name."""
    test_client, executed = client
    resp = _provision(test_client, **body)
    assert resp.status_code == 422, resp.text
    assert executed == []


@pytest.mark.parametrize("body", [
    {"peer_zones": [""]},
    {"peer_zones": ["WAN", "WAN"]},
    {"peer_zones": ["LAN"]},
    {"peer_zones": ["LOCAL"]},
    {"zone_name": "LOCAL"},
])
def test_deprovision_rejects_bad_names(client, body):
    test_client, executed = client
    resp = _deprovision(test_client, **body)
    assert resp.status_code == 422, resp.text
    assert executed == []


@pytest.mark.parametrize("call", [_provision, _deprovision])
def test_provision_and_deprovision_need_policies_write(monkeypatch, call):
    """Both write firewall ipv4/ipv6 rulesets, which the policies screen owns."""
    test_client, executed = zones_client(monkeypatch, "1.5")
    checked = []

    async def write(_request, feature):
        checked.append(feature.value)
        if feature.value == "FIREWALL_POLICIES":
            raise HTTPException(status_code=403, detail="denied")

    monkeypatch.setattr(f"{MODULE}.require_write_permission", write)
    resp = call(test_client)
    assert resp.status_code == 403, resp.text
    assert checked == ["FIREWALL_ZONES", "FIREWALL_POLICIES"]
    assert executed == []


@pytest.mark.parametrize("call", [_provision, _deprovision])
@pytest.mark.parametrize("name", ["", "  "])
def test_provision_and_deprovision_reject_blank_zone_name(client, call, name):
    test_client, executed = client
    resp = call(test_client, zone_name=name)
    assert resp.status_code == 422, resp.text
    assert executed == []


def test_deprovision_commits_the_deletes(client):
    test_client, executed = client
    resp = _deprovision(test_client)
    assert resp.status_code == 200, resp.text
    assert resp.json() == {"success": True, "data": {"message": "Zone deprovisioned"}, "error": None}
    ops = executed[0]
    assert ops[0] == ("delete", LAN)
    assert ("delete", ["firewall", "zone", "WAN", "from", "LAN"]) in ops
    assert ("delete", ["firewall", "zone", "LOCAL", "from", "LAN"]) in ops
    assert ("delete", ["firewall", "ipv6", "name", "LAN-LOCAL-V6"]) in ops


@pytest.mark.parametrize("call", [_provision, _deprovision])
@pytest.mark.parametrize("status, error", [(400, "Commit failed"), (200, "set failed")])
def test_provision_and_deprovision_rejected_commit_report_failure(client, commit, call, status, error):
    test_client, executed = client
    commit.update(status=status, error=error)
    resp = call(test_client)
    assert resp.status_code == 200, resp.text
    assert resp.json() == {"success": False, "data": None, "error": error}
    assert len(executed) == 1


@pytest.mark.parametrize("call", [_provision, _deprovision])
def test_provision_and_deprovision_device_error_is_500(monkeypatch, call):
    test_client, _executed = zones_client(monkeypatch, "1.5")

    class Broken:
        def get_version(self):
            return "1.5"

        def execute_batch(self, _batch):
            raise RuntimeError("device down")

    monkeypatch.setattr(f"{MODULE}.get_session_vyos_service", lambda _req: Broken())
    resp = call(test_client)
    assert resp.status_code == 500, resp.text
    assert resp.json()["detail"] == "Internal server error"


# ---------------------------------------------------------------------------
# Session lookup errors pass through
# ---------------------------------------------------------------------------


@pytest.mark.parametrize("method, path, body", [
    ("get", "/capabilities", None),
    ("get", "/config", None),
    ("post", "/batch", {"zone_name": "LAN", "operations": [{"op": "set_zone"}]}),
    ("post", "/provision", {"zone_name": "LAN"}),
    ("post", "/deprovision", {"zone_name": "LAN"}),
])
def test_session_lookup_400_survives(monkeypatch, method, path, body):
    test_client, executed = zones_client(monkeypatch, "1.5")

    def no_session(_req):
        raise HTTPException(status_code=400, detail="No active VyOS session")

    monkeypatch.setattr(f"{MODULE}.get_session_vyos_service", no_session)
    if method == "get":
        resp = test_client.get(f"{PREFIX}{path}")
    else:
        resp = test_client.post(f"{PREFIX}{path}", json=body)
    assert resp.status_code == 400, resp.text
    assert resp.json()["detail"] == "No active VyOS session"
    assert executed == []
