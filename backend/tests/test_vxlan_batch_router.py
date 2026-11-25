"""VXLAN routes driven through the handlers with a stub service.

execute_batch and get_full_config run through run_in_threadpool (locked in
test_batch_off_event_loop.py). These tests check the emitted ops and the
400/422/500 paths of POST /batch, and that every route passes a session
lookup's HTTPException through.
"""

import inspect
from types import SimpleNamespace

import pytest
from fastapi import FastAPI, HTTPException
from fastapi.testclient import TestClient

from vyos_builders.vxlan import VxlanBatchBuilder

MODULE = "routers.vxlan.vxlan"
ROLLING = "2026.09.23-0027-rolling"
BASE = ["interfaces", "vxlan", "vxlan0"]


def vxlan_client(monkeypatch, version, full_config=None, commit=None):
    """Return (client, executed); executed holds one [(op, path), ...] per commit."""
    executed = []
    if commit is None:
        commit = {"status": 200, "error": None, "raise": None}

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
            if commit.get("raise"):
                raise commit["raise"]
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
    return {"status": 200, "error": None, "raise": None}


@pytest.fixture
def client(monkeypatch, commit):
    return vxlan_client(monkeypatch, ROLLING, commit=commit)


@pytest.fixture
def client_14(monkeypatch, commit):
    return vxlan_client(monkeypatch, "1.4.3", commit=commit)


def _batch(test_client, operations, name="vxlan0"):
    return test_client.post(
        "/vyos/vxlan/batch",
        json={"interface_name": name, "operations": operations},
    )


@pytest.mark.parametrize("version, supported", [("1.4.3", False), (ROLLING, True)])
def test_capabilities_follow_the_device(monkeypatch, version, supported):
    test_client, _executed = vxlan_client(monkeypatch, version)
    resp = test_client.get("/vyos/vxlan/capabilities")
    assert resp.status_code == 200, resp.text
    features = resp.json()["features"]
    assert features["ipv6_address_interface_identifier"]["supported"] is supported
    assert features["vlan_to_vni_description"]["supported"] is supported
    assert features["gpe"]["supported"] is supported
    assert "version_info" not in resp.json()


def test_config_returns_parsed_interfaces(monkeypatch):
    tree = {
        "interfaces": {
            "vxlan": {
                "vxlan0": {
                    "vni": "100",
                    "remote": ["192.0.2.10", "192.0.2.11"],
                    "vlan-to-vni": {"10": {"vni": "1010", "description": "ten"}},
                }
            }
        }
    }
    test_client, _executed = vxlan_client(monkeypatch, ROLLING, full_config=tree)
    resp = test_client.get("/vyos/vxlan/config")
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["total"] == 1
    iface = body["interfaces"][0]
    assert iface["name"] == "vxlan0"
    assert iface["remotes"] == ["192.0.2.10", "192.0.2.11"]
    assert iface["vlan_to_vni"] == [{"vlan_id": "10", "vni": "1010", "description": "ten"}]


def test_batch_binds_the_interface_name_and_splits_the_value(client):
    test_client, executed = client
    resp = _batch(test_client, [
        {"op": "set_interface"},
        {"op": "set_vni", "value": "100"},
        {"op": "set_description", "value": "edge, core|dc"},
        {"op": "set_remote", "value": "192.0.2.10"},
        {"op": "delete_remote", "value": "192.0.2.11"},
        {"op": "set_vlan_to_vni", "value": "10"},
        {"op": "set_vlan_to_vni_vni", "value": "10|1010"},
        {"op": "set_vlan_to_vni_description", "value": "10|ten: a|b"},
        {"op": "delete_vlan_to_vni_description", "value": "20"},
        {"op": "set_ipv6_address_interface_identifier", "value": "::1:2"},
        {"op": "delete_mtu"},
    ])
    assert resp.status_code == 200, resp.text
    assert resp.json() == {
        "success": True,
        "data": {"message": "VXLAN configuration updated"},
        "error": None,
    }
    assert executed == [[
        ("set", BASE),
        ("set", BASE + ["vni", "100"]),
        ("set", BASE + ["description", "edge, core|dc"]),
        ("set", BASE + ["remote", "192.0.2.10"]),
        ("delete", BASE + ["remote", "192.0.2.11"]),
        ("set", BASE + ["vlan-to-vni", "10"]),
        ("set", BASE + ["vlan-to-vni", "10", "vni", "1010"]),
        ("set", BASE + ["vlan-to-vni", "10", "description", "ten: a|b"]),
        ("delete", BASE + ["vlan-to-vni", "20", "description"]),
        ("set", BASE + ["ipv6", "address", "interface-identifier", "::1:2"]),
        ("delete", BASE + ["mtu"]),
    ]]


def test_builder_ops_take_the_name_first():
    """The handler binds interface_name to the first parameter, the value to the rest."""
    builder = VxlanBatchBuilder(version=ROLLING)
    ops = [
        (name, member)
        for name, member in inspect.getmembers(builder, inspect.ismethod)
        if name.startswith(("set_", "delete_", "create_"))
    ]
    assert ops
    for name, method in ops:
        params = list(inspect.signature(method).parameters)
        assert params[0] == "name", name
        assert len(params) in (1, 2, 3), name
        if len(params) == 3:
            assert params[1] == "vlan_id", name


@pytest.mark.parametrize("op", ["set_interface", "delete_interface", "delete_mtu", "delete_all_remotes"])
def test_batch_value_on_name_only_op_is_400(client, op):
    """A dropped value would run the wider op (delete the interface, not one leaf)."""
    test_client, executed = client
    resp = _batch(test_client, [{"op": op, "value": "x"}])
    assert resp.status_code == 400, resp.text
    assert resp.json()["detail"] == f"Operation {op} takes no value"
    assert executed == []


@pytest.mark.parametrize("operation", [
    {"op": "set_vni"},
    {"op": "set_vni", "value": None},
    {"op": "set_mtu", "value": ""},
    {"op": "delete_remote", "value": "  "},
    {"op": "delete_vlan_to_vni"},
    {"op": "set_vlan_to_vni_vni", "value": ""},
])
def test_batch_missing_value_is_400(client, operation):
    """A delete_remote with no value is a 400, not a skipped op or a TypeError 500."""
    test_client, executed = client
    resp = _batch(test_client, [{"op": "set_interface"}, operation])
    assert resp.status_code == 400, resp.text
    assert resp.json()["detail"] == f"Operation {operation['op']} requires a value"
    assert executed == []


@pytest.mark.parametrize("operation", [
    {"op": "set_vlan_to_vni_vni", "value": "10"},
    {"op": "set_vlan_to_vni_vni", "value": "10|"},
    {"op": "set_vlan_to_vni_vni", "value": "|1010"},
    {"op": "set_vlan_to_vni_description", "value": "10| "},
])
def test_batch_short_two_part_value_is_400(client, operation):
    test_client, executed = client
    resp = _batch(test_client, [operation])
    assert resp.status_code == 400, resp.text
    assert resp.json()["detail"] == f"Operation {operation['op']} requires 2 values"
    assert executed == []


def test_batch_unknown_op_is_400(client):
    test_client, executed = client
    resp = _batch(test_client, [{"op": "no_such_op", "value": "x"}])
    assert resp.status_code == 400, resp.text
    assert resp.json()["detail"] == "Unknown operation: no_such_op"
    assert executed == []


@pytest.mark.parametrize("op", ["add_set", "get_capabilities", "_mapper", "_require_interface_node"])
def test_batch_internal_op_is_400(client, op):
    test_client, executed = client
    resp = _batch(test_client, [{"op": op}])
    assert resp.status_code == 400, resp.text
    assert resp.json()["detail"] == f"Invalid operation: {op}"
    assert executed == []


@pytest.mark.parametrize("name", ["", "  "])
def test_batch_rejects_blank_interface_name(client, name):
    test_client, executed = client
    resp = _batch(test_client, [{"op": "set_interface"}], name=name)
    assert resp.status_code == 422, resp.text
    assert executed == []


@pytest.mark.parametrize("operation, node", [
    ({"op": "set_vlan_to_vni_description", "value": "10|ten"}, "vlan_to_vni_description"),
    ({"op": "delete_vlan_to_vni_description", "value": "10"}, "vlan_to_vni_description"),
    ({"op": "set_ipv6_address_interface_identifier", "value": "::1:2"}, "ipv6_address_interface_identifier"),
    ({"op": "delete_ipv6_address_interface_identifier"}, "ipv6_address_interface_identifier"),
    ({"op": "set_gpe"}, "gpe"),
])
def test_batch_1_5_only_op_on_1_4_is_400(client_14, operation, node):
    """The mapper ValueError is a 400, and nothing in the batch reaches the device."""
    test_client, executed = client_14
    resp = _batch(test_client, [{"op": "set_vni", "value": "100"}, operation])
    assert resp.status_code == 400, resp.text
    assert resp.json()["detail"] == f"vxlan {node} is not supported on this device"
    assert executed == []


def test_batch_shared_ops_commit_on_1_4(client_14):
    test_client, executed = client_14
    resp = _batch(test_client, [{"op": "set_vlan_to_vni_vni", "value": "10|1010"}])
    assert resp.status_code == 200, resp.text
    assert executed == [[("set", BASE + ["vlan-to-vni", "10", "vni", "1010"])]]


@pytest.mark.parametrize("status, error", [(400, "Commit failed"), (200, "Commit failed")])
def test_batch_failed_commit_is_not_a_success(client, commit, status, error):
    commit.update(status=status, error=error)
    test_client, executed = client
    resp = _batch(test_client, [{"op": "set_vni", "value": "100"}])
    assert resp.status_code == 200, resp.text
    assert resp.json() == {"success": False, "data": None, "error": "Commit failed"}
    assert len(executed) == 1


def test_batch_empty_returns_success_without_the_device(client):
    test_client, executed = client
    resp = _batch(test_client, [])
    assert resp.status_code == 200, resp.text
    assert resp.json() == {
        "success": True,
        "data": {"message": "No operations to execute"},
        "error": None,
    }
    assert executed == []


def test_batch_execute_value_error_is_500(client, commit):
    """Only the op loop's ValueError is a 400; one from execute_batch stays a 500."""
    commit.update({"raise": ValueError("boom")})
    test_client, executed = client
    resp = _batch(test_client, [{"op": "set_vni", "value": "100"}])
    assert resp.status_code == 500, resp.text
    assert resp.json()["detail"] == "Internal server error"
    assert executed == []


def test_operations_vocabulary_binds_the_interface_name():
    """GET /vyos/operations/vxlan names the subject field and keeps the vlan ops."""
    import asyncio
    from typing import cast

    from fastapi import Request

    from routers.operations.operations import get_feature_operations

    body = asyncio.run(get_feature_operations("vxlan", cast(Request, None)))
    assert body["subject_field"] == "interface_name"
    ops = {row["op"]: row for row in body["operations"]}
    assert ops["set_vlan_to_vni_vni"]["arg_count"] == 3
    assert ops["set_vlan_to_vni_vni"]["args"] == ["name", "vlan_id", "vni"]
    assert ops["set_vlan_to_vni_description"]["arg_count"] == 3
    assert ops["delete_vlan_to_vni_description"]["arg_count"] == 2
    assert ops["set_interface"]["arg_count"] == 1


@pytest.mark.parametrize("method, path, body", [
    ("get", "/vyos/vxlan/capabilities", None),
    ("get", "/vyos/vxlan/config", None),
    ("post", "/vyos/vxlan/batch", {"interface_name": "vxlan0", "operations": [{"op": "set_interface"}]}),
])
def test_routes_pass_session_http_exception_through(monkeypatch, method, path, body):
    vxlan_client(monkeypatch, ROLLING)

    def no_session(_req):
        raise HTTPException(status_code=400, detail="No active VyOS session")

    monkeypatch.setattr(f"{MODULE}.get_session_vyos_service", no_session)
    router = __import__(MODULE, fromlist=["router"]).router
    app = FastAPI()
    app.include_router(router)
    test_client = TestClient(app, raise_server_exceptions=False)
    resp = test_client.request(method.upper(), path, json=body)
    assert resp.status_code == 400, resp.text
    assert resp.json()["detail"] == "No active VyOS session"
