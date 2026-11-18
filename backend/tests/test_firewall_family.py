"""Firewall IPv4/IPv6 stacks share one family implementation (issue #662)."""

from pathlib import Path
from types import SimpleNamespace

import pytest
from fastapi import FastAPI, HTTPException
from fastapi.testclient import TestClient

from vyos_mappers.firewall.family_versions import get_firewall_family_mapper
from vyos_builders.firewall.family import FirewallFamilyBatchBuilder
from vyos_builders.firewall.ipv4 import FirewallIPv4BatchBuilder
from vyos_builders.firewall.ipv6 import FirewallIPv6BatchBuilder


def test_ipv4_and_ipv6_paths_differ_only_by_family():
    v4 = get_firewall_family_mapper("1.5", "ipv4")
    v6 = get_firewall_family_mapper("1.5", "ipv6")
    p4 = v4.get_base_chain_rule("forward", 10)
    p6 = v6.get_base_chain_rule("forward", 10)
    assert p4 == ["firewall", "ipv4", "forward", "filter", "rule", "10"]
    assert p6 == ["firewall", "ipv6", "forward", "filter", "rule", "10"]


def test_hop_leaf_is_ttl_on_ipv4_and_hop_limit_on_ipv6():
    v4 = get_firewall_family_mapper("1.5", "ipv4")
    v6 = get_firewall_family_mapper("1.5", "ipv6")
    assert v4.get_rule_set_ttl("forward", 1, "64")[-2:] == ["ttl", "64"]
    assert v6.get_rule_set_hop_limit("forward", 1, "64")[-2:] == ["hop-limit", "64"]
    assert v6.get_rule_set_ttl("forward", 1, "64")[-2:] == ["hop-limit", "64"]


def test_icmp_leaf_follows_family():
    v4 = get_firewall_family_mapper("1.5", "ipv4")
    v6 = get_firewall_family_mapper("1.5", "ipv6")
    assert "icmp" in v4.get_rule_icmp_type_name("forward", 1, "echo-request")
    assert "icmpv6" in v6.get_rule_icmpv6_type_name("forward", 1, "echo-request")


def _firewall_config_with_prerouting():
    raw = {
        "raw": {
            "default-action": "drop",
            "rule": {"10": {"action": "drop"}},
        }
    }
    return {
        "firewall": {
            "ipv4": {"prerouting": raw},
            "ipv6": {"prerouting": raw},
        }
    }


def test_get_config_prerouting_raw_for_both_families(monkeypatch):
    """GET /config fills prerouting_raw for ipv4 and ipv6 when the node exists."""
    async def allow(*_args, **_kwargs):
        return None

    class FakeService:
        def get_full_config(self, refresh=False):
            return _firewall_config_with_prerouting()

    monkeypatch.setattr("routers.firewall.family.require_read_permission", allow)
    monkeypatch.setattr(
        "routers.firewall.family.get_session_vyos_service",
        lambda _req: FakeService(),
    )

    from fastapi import FastAPI
    from fastapi.testclient import TestClient
    from routers.firewall.family import build_router

    app = FastAPI()
    app.include_router(build_router("ipv4"))
    app.include_router(build_router("ipv6"))
    client = TestClient(app)

    ipv6 = client.get("/vyos/firewall/ipv6/config")
    assert ipv6.status_code == 200, ipv6.text
    assert ipv6.json()["prerouting_raw"] is not None
    assert ipv6.json()["prerouting_raw"]["default_action"] == "drop"

    ipv4 = client.get("/vyos/firewall/ipv4/config")
    assert ipv4.status_code == 200, ipv4.text
    assert ipv4.json()["prerouting_raw"] is not None
    assert ipv4.json()["prerouting_raw"]["default_action"] == "drop"


def test_prerouting_raw_on_both_families():
    v4 = get_firewall_family_mapper("1.5", "ipv4")
    v6 = get_firewall_family_mapper("1.5", "ipv6")
    assert v4.get_prerouting_raw_rule(1) == ["firewall", "ipv4", "prerouting", "raw", "rule", "1"]
    assert v6.get_prerouting_raw_rule(1) == ["firewall", "ipv6", "prerouting", "raw", "rule", "1"]
    assert v4.get_rule_action("prerouting_raw", 10, "drop", False) == [
        "firewall", "ipv4", "prerouting", "raw", "rule", "10", "action", "drop",
    ]
    assert v6.get_rule_action("prerouting_raw", 10, "drop", False) == [
        "firewall", "ipv6", "prerouting", "raw", "rule", "10", "action", "drop",
    ]


def test_prerouting_raw_absent_on_1_4():
    v4 = FirewallIPv4BatchBuilder("1.4")
    v6 = FirewallIPv6BatchBuilder("1.4")
    assert v4.get_capabilities()["features"]["prerouting_raw"]["supported"] is False
    assert v6.get_capabilities()["features"]["prerouting_raw"]["supported"] is False


def test_builders_are_thin_family_wrappers():
    assert issubclass(FirewallIPv4BatchBuilder, FirewallFamilyBatchBuilder)
    assert issubclass(FirewallIPv6BatchBuilder, FirewallFamilyBatchBuilder)
    v4 = FirewallIPv4BatchBuilder("1.5")
    v6 = FirewallIPv6BatchBuilder("1.5")
    assert v4.family == "ipv4"
    assert v6.family == "ipv6"
    assert v4.get_capabilities()["features"]["prerouting_raw"]["supported"] is True
    assert v6.get_capabilities()["features"]["prerouting_raw"]["supported"] is True
    assert v4.get_capabilities()["features"]["icmp_matching"]["supported"] is True
    assert v6.get_capabilities()["features"]["icmpv6_matching"]["supported"] is True


def test_ipv4_ipv6_modules_do_not_reimplement_the_stack():
    root = Path(__file__).resolve().parents[1]
    for rel in (
        "vyos_mappers/firewall/ipv4.py",
        "vyos_mappers/firewall/ipv6.py",
        "vyos_builders/firewall/ipv4.py",
        "vyos_builders/firewall/ipv6.py",
        "routers/firewall/ipv4.py",
        "routers/firewall/ipv6.py",
    ):
        lines = (root / rel).read_text().splitlines()
        assert len(lines) < 20, rel


def _family_client(monkeypatch, family, version="1.5", full_config=None):
    executed = []

    async def allow(*_args, **_kwargs):
        return None

    class Service:
        def get_version(self):
            return version

        def get_full_config(self, refresh=False):
            return full_config if full_config is not None else {"firewall": {}}

        def execute_batch(self, batch):
            if batch.is_empty():
                raise ValueError("Cannot execute empty batch")
            executed.append(batch.get_operations())
            return SimpleNamespace(status=200, result="", error=None)

    monkeypatch.setattr("routers.firewall.family.require_write_permission", allow)
    monkeypatch.setattr("routers.firewall.family.require_read_permission", allow)
    monkeypatch.setattr(
        "routers.firewall.family.get_session_vyos_service",
        lambda _req: Service(),
    )
    from routers.firewall.family import build_router

    app = FastAPI()
    app.include_router(build_router(family))
    return TestClient(app), executed


def _batch(client, family, operations, **extra):
    body = {"chain": "forward", "operations": operations}
    body.update(extra)
    return client.post(f"/vyos/firewall/{family}/batch", json=body)


@pytest.mark.parametrize("family", ["ipv4", "ipv6"])
def test_batch_binds_chain_rule_and_value(monkeypatch, family):
    client, executed = _family_client(monkeypatch, family)
    resp = _batch(
        client,
        family,
        [
            {"op": "set_base_chain_rule"},
            {"op": "set_rule_action", "value": "drop"},
            {"op": "set_rule_disable"},
            {"op": "set_custom_chain", "value": "ignored"},
        ],
        rule_number=10,
    )
    assert resp.status_code == 200, resp.text
    assert resp.json()["success"] is True
    assert resp.json()["error"] is None
    rule = ["firewall", family, "forward", "filter", "rule", "10"]
    assert executed == [[
        {"op": "set", "path": rule},
        {"op": "set", "path": rule + ["action", "drop"]},
        {"op": "set", "path": rule + ["disable"]},
        {"op": "set", "path": ["firewall", family, "name", "forward"]},
    ]]


def test_batch_custom_chain_passes_is_custom(monkeypatch):
    client, executed = _family_client(monkeypatch, "ipv4")
    resp = _batch(
        client,
        "ipv4",
        [{"op": "set_rule_action", "value": "accept"}],
        chain="LAN_IN",
        rule_number=20,
        is_custom_chain=True,
    )
    assert resp.status_code == 200, resp.text
    assert executed == [[
        {"op": "set", "path": ["firewall", "ipv4", "name", "LAN_IN", "rule", "20", "action", "accept"]},
    ]]


def test_batch_chain_default_action_needs_no_rule_number(monkeypatch):
    client, executed = _family_client(monkeypatch, "ipv4")
    resp = _batch(
        client,
        "ipv4",
        [{"op": "set_base_chain_default_action", "value": "drop"}],
    )
    assert resp.status_code == 200, resp.text
    assert executed == [[
        {"op": "set", "path": ["firewall", "ipv4", "forward", "filter", "default-action", "drop"]},
    ]]


@pytest.mark.parametrize("operation", [
    {"op": "set_rule_action"},
    {"op": "set_rule_action", "value": ""},
    {"op": "set_base_chain_default_action"},
    {"op": "set_base_chain_default_action", "value": ""},
])
def test_batch_missing_value_is_400(monkeypatch, operation):
    client, executed = _family_client(monkeypatch, "ipv4")
    extra = {"rule_number": 10} if "rule" in operation["op"] else {}
    resp = _batch(client, "ipv4", [operation], **extra)
    assert resp.status_code == 400, resp.text
    assert resp.json()["detail"] == f"{operation['op']} requires a value"
    assert executed == []


def test_batch_missing_rule_number_is_400(monkeypatch):
    client, executed = _family_client(monkeypatch, "ipv4")
    resp = _batch(client, "ipv4", [{"op": "set_rule_action", "value": "drop"}])
    assert resp.status_code == 400, resp.text
    assert resp.json()["detail"] == "set_rule_action requires a rule number"
    assert executed == []


def test_batch_rejects_names_that_are_not_rule_ops(monkeypatch):
    client, executed = _family_client(monkeypatch, "ipv4")
    blocked = _batch(client, "ipv4", [{"op": "add_set", "value": "x"}], rule_number=1)
    assert blocked.status_code == 400, blocked.text
    assert blocked.json()["detail"] == "Invalid operation: add_set"
    unknown = _batch(client, "ipv4", [{"op": "no_such_op", "value": "x"}], rule_number=1)
    assert unknown.status_code == 400, unknown.text
    assert unknown.json()["detail"] == "Unknown operation: no_such_op"
    assert executed == []


def test_batch_empty_is_500(monkeypatch):
    """execute_batch raises ValueError for an empty batch; that stays a 500."""
    client, executed = _family_client(monkeypatch, "ipv4")
    resp = _batch(client, "ipv4", [])
    assert resp.status_code == 500, resp.text
    assert resp.json()["detail"] == "Internal server error"
    assert executed == []


def test_reorder_deletes_then_recreates(monkeypatch):
    client, executed = _family_client(monkeypatch, "ipv4")
    resp = client.post(
        "/vyos/firewall/ipv4/reorder",
        json={
            "chain": "forward",
            "rules": [{
                "old_number": 10,
                "new_number": 20,
                "rule_data": {"action": "accept"},
            }],
        },
    )
    assert resp.status_code == 200, resp.text
    assert resp.json()["data"]["message"] == "Rules reordered successfully"
    rule = ["firewall", "ipv4", "forward", "filter", "rule"]
    assert executed == [[
        {"op": "delete", "path": rule + ["10"]},
        {"op": "set", "path": rule + ["20"]},
        {"op": "set", "path": rule + ["20", "action", "accept"]},
    ]]


def test_reorder_empty_is_500(monkeypatch):
    client, executed = _family_client(monkeypatch, "ipv4")
    resp = client.post(
        "/vyos/firewall/ipv4/reorder",
        json={"chain": "forward", "rules": []},
    )
    assert resp.status_code == 500, resp.text
    assert resp.json()["detail"] == "Internal server error"
    assert executed == []


@pytest.mark.parametrize("method,path,body", [
    ("get", "/vyos/firewall/ipv4/capabilities", None),
    ("get", "/vyos/firewall/ipv4/config", None),
    ("post", "/vyos/firewall/ipv4/batch", {"chain": "forward", "operations": []}),
    ("post", "/vyos/firewall/ipv4/reorder", {"chain": "forward", "rules": []}),
])
def test_family_routes_pass_an_http_error_through(monkeypatch, method, path, body):
    """No active instance is the session lookup's 400, not a logged 500."""
    client, executed = _family_client(monkeypatch, "ipv4")

    def no_instance(_req):
        raise HTTPException(status_code=400, detail="No active instance")

    monkeypatch.setattr("routers.firewall.family.get_session_vyos_service", no_instance)
    resp = client.request(method, path, json=body)
    assert resp.status_code == 400, resp.text
    assert resp.json()["detail"] == "No active instance"
    assert executed == []


def test_batch_reports_a_rejected_commit(monkeypatch):
    client, _executed = _family_client(monkeypatch, "ipv4")

    class Rejecting:
        def get_version(self):
            return "1.5"

        def execute_batch(self, _batch):
            return SimpleNamespace(status=400, result=None, error="Commit failed")

    monkeypatch.setattr(
        "routers.firewall.family.get_session_vyos_service",
        lambda _req: Rejecting(),
    )
    resp = _batch(
        client,
        "ipv4",
        [{"op": "set_base_chain_default_action", "value": "drop"}],
    )
    assert resp.status_code == 200, resp.text
    assert resp.json() == {
        "success": False,
        "data": {"message": "Firewall configuration updated"},
        "error": "Commit failed",
    }


def test_reorder_keeps_interface_groups_and_dynamic_address_groups(monkeypatch):
    client, executed = _family_client(monkeypatch, "ipv4")
    resp = client.post(
        "/vyos/firewall/ipv4/reorder",
        json={
            "chain": "forward",
            "rules": [{
                "old_number": 10,
                "new_number": 20,
                "rule_data": {
                    "interface": {
                        "inbound_group": "LAN_IFS",
                        "outbound_group": "WAN_IFS",
                    },
                    "source": {"group": {
                        "dynamic-address-group": "DYN",
                        "address-group": "LAN",
                    }},
                    "destination": {"group": {"dynamic-address-group": "DYN2"}},
                },
            }],
        },
    )
    assert resp.status_code == 200, resp.text
    rule = ["firewall", "ipv4", "forward", "filter", "rule", "20"]
    paths = [op["path"] for op in executed[0]]
    assert rule + ["inbound-interface", "group", "LAN_IFS"] in paths
    assert rule + ["outbound-interface", "group", "WAN_IFS"] in paths
    assert rule + ["source", "group", "dynamic-address-group", "DYN"] in paths
    assert rule + ["source", "group", "address-group", "LAN"] in paths
    assert rule + ["destination", "group", "dynamic-address-group", "DYN2"] in paths
    assert rule + ["source", "group", "address-group", "DYN"] not in paths


@pytest.mark.parametrize("family,leaf", [("ipv4", "icmp"), ("ipv6", "icmpv6")])
def test_config_and_reorder_keep_icmp_code_and_type(monkeypatch, family, leaf):
    client, executed = _family_client(monkeypatch, family, full_config={
        "firewall": {
            family: {
                "forward": {
                    "filter": {
                        "rule": {
                            "10": {leaf: {"code": 0, "type": 8, "type-name": "echo-request"}},
                        }
                    }
                }
            }
        }
    })
    loaded = client.get(f"/vyos/firewall/{family}/config")
    assert loaded.status_code == 200, loaded.text
    rule = loaded.json()["forward"]["rules"][0]
    assert rule["icmp_code"] == "0"
    assert rule["icmp_type"] == "8"
    assert rule["icmp_type_name"] == "echo-request"

    resp = client.post(
        f"/vyos/firewall/{family}/reorder",
        json={
            "chain": "forward",
            "rules": [{
                "old_number": 10,
                "new_number": 20,
                "rule_data": {
                    "icmp_code": rule["icmp_code"],
                    "icmp_type": rule["icmp_type"],
                    "icmp_type_name": rule["icmp_type_name"],
                },
            }],
        },
    )
    assert resp.status_code == 200, resp.text
    paths = [op["path"] for op in executed[0]]
    base = ["firewall", family, "forward", "filter", "rule", "20", leaf]
    assert base + ["code", "0"] in paths
    assert base + ["type", "8"] in paths
    assert base + ["type-name", "echo-request"] in paths


def test_reorder_rejects_duplicate_numbers(monkeypatch):
    client, executed = _family_client(monkeypatch, "ipv4")
    duplicate_new = client.post(
        "/vyos/firewall/ipv4/reorder",
        json={
            "chain": "forward",
            "rules": [
                {"old_number": 10, "new_number": 20, "rule_data": {}},
                {"old_number": 30, "new_number": 20, "rule_data": {}},
            ],
        },
    )
    assert duplicate_new.status_code == 422, duplicate_new.text
    duplicate_old = client.post(
        "/vyos/firewall/ipv4/reorder",
        json={
            "chain": "forward",
            "rules": [
                {"old_number": 10, "new_number": 20, "rule_data": {}},
                {"old_number": 10, "new_number": 30, "rule_data": {}},
            ],
        },
    )
    assert duplicate_old.status_code == 422, duplicate_old.text
    assert executed == []
