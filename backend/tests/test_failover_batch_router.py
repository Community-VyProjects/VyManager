"""Failover routes driven through the handlers with a stub service.

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

from vyos_builders.failover import FailoverBatchBuilder

MODULE = "routers.failover.failover"
ROLLING = "2026.09.23-0027-rolling"
ROUTE = ["protocols", "failover", "route", "10.0.0.0/8"]


def failover_client(monkeypatch, version, commit, full_config=None):
    """Return (client, executed); executed holds one [(op, path), ...] per commit."""
    executed = []

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
    return TestClient(app, raise_server_exceptions=False), executed


@pytest.fixture
def commit():
    return {"status": 200, "error": None}


@pytest.fixture
def client(monkeypatch, commit):
    return failover_client(monkeypatch, ROLLING, commit)


@pytest.fixture
def client_14(monkeypatch, commit):
    return failover_client(monkeypatch, "1.4.3", commit)


def _batch(test_client, operations, destination="10.0.0.0/8"):
    return test_client.post(
        "/vyos/failover/batch",
        json={"destination": destination, "operations": operations},
    )


def test_every_op_takes_the_destination_first():
    """The router binds the destination to the first parameter of every op."""
    builder = FailoverBatchBuilder(version=ROLLING)
    for name, method in inspect.getmembers(builder, predicate=inspect.ismethod):
        if not name.startswith(("set_", "delete_")):
            continue
        params = list(inspect.signature(method).parameters)
        assert params[0] == "destination", name
        assert len(params) <= 4, name


@pytest.mark.parametrize("version, supported", [("1.4.3", False), ("1.5", True), (ROLLING, True)])
def test_capabilities_follow_the_device(monkeypatch, commit, version, supported):
    test_client, _executed = failover_client(monkeypatch, version, commit)
    resp = test_client.get("/vyos/failover/capabilities")
    assert resp.status_code == 200, resp.text
    body = resp.json()
    features = body["features"]
    assert features["dhcp_interface"]["supported"] is supported
    assert features["check_target_interface"]["supported"] is supported
    assert features["check_target_vrf"]["supported"] is supported
    assert features["check_policy"]["values"] == ["any-available", "all-available"]
    assert features["check_type"]["values"] == ["arp", "icmp", "tcp"]
    assert (features["check_port"]["min"], features["check_port"]["max"]) == (1, 65535)
    assert (features["check_timeout"]["min"], features["check_timeout"]["max"]) == (1, 255)
    assert (features["metric"]["min"], features["metric"]["max"]) == (1, 255)
    assert "version_info" not in body


def test_config_returns_the_parsed_routes(monkeypatch, commit):
    tree = {
        "protocols": {
            "failover": {
                "route": {
                    "10.0.0.0/8": {
                        "next-hop": {
                            "192.0.2.1": {
                                "check": {
                                    "policy": "all-available",
                                    "port": "8080",
                                    "timeout": "5",
                                    "type": "icmp",
                                    "target": {"192.0.2.9": {"interface": "eth1", "vrf": "blue"}},
                                },
                                "interface": "eth0",
                                "metric": "20",
                                "onlink": {},
                            }
                        },
                        "dhcp-interface": {
                            "eth2": {"metric": "30", "check": {"target": {"192.0.2.10": {}}}}
                        },
                    }
                }
            }
        }
    }
    test_client, _executed = failover_client(monkeypatch, ROLLING, commit, full_config=tree)
    resp = test_client.get("/vyos/failover/config")
    assert resp.status_code == 200, resp.text
    route = resp.json()["routes"][0]
    assert route["next_hops"][0] == {
        "address": "192.0.2.1",
        "check": {
            "policy": "all-available",
            "port": 8080,
            "targets": [{"address": "192.0.2.9", "interface": "eth1", "vrf": "blue"}],
            "timeout": 5,
            "type": "icmp",
        },
        "interface": "eth0",
        "metric": 20,
        "onlink": True,
    }
    assert route["dhcp_interfaces"][0]["name"] == "eth2"
    assert route["dhcp_interfaces"][0]["metric"] == 30


def test_batch_binds_the_destination_and_splits_the_value(client):
    test_client, executed = client
    resp = _batch(test_client, [
        {"op": "set_route"},
        {"op": "set_next_hop", "value": "192.0.2.1"},
        {"op": "set_next_hop_metric", "value": "192.0.2.1,10"},
        {"op": "set_next_hop_check_target", "value": "192.0.2.1,203.0.113.5"},
        {"op": "set_next_hop_check_target_vrf", "value": "192.0.2.1,203.0.113.5,blue"},
        {"op": "delete_next_hop_check_target", "value": "192.0.2.1,203.0.113.6"},
        {"op": "set_dhcp_interface_check_target_interface", "value": "eth2,203.0.113.7,eth1"},
        {"op": "delete_dhcp_interface_onlink", "value": "eth2"},
    ])
    assert resp.status_code == 200, resp.text
    assert resp.json() == {
        "success": True,
        "data": {"message": "Failover configuration updated"},
        "error": None,
    }
    nh = ROUTE + ["next-hop", "192.0.2.1"]
    dhcp = ROUTE + ["dhcp-interface", "eth2"]
    assert executed == [[
        ("set", ROUTE),
        ("set", nh),
        ("set", nh + ["metric", "10"]),
        ("set", nh + ["check", "target", "203.0.113.5"]),
        ("set", nh + ["check", "target", "203.0.113.5", "vrf", "blue"]),
        ("delete", nh + ["check", "target", "203.0.113.6"]),
        ("set", dhcp + ["check", "target", "203.0.113.7", "interface", "eth1"]),
        ("delete", dhcp + ["onlink"]),
    ]]


@pytest.mark.parametrize(
    "operation, detail",
    [
        ({"op": "set_next_hop"}, "Operation set_next_hop requires a value"),
        ({"op": "set_next_hop", "value": ""}, "Operation set_next_hop requires a value"),
        ({"op": "set_next_hop", "value": "  "}, "Operation set_next_hop requires a value"),
        ({"op": "set_next_hop_metric", "value": "192.0.2.1"}, "Operation set_next_hop_metric requires 2 values"),
        ({"op": "set_next_hop_metric", "value": "192.0.2.1,"}, "Operation set_next_hop_metric requires 2 values"),
        (
            {"op": "set_next_hop_check_target_vrf", "value": "192.0.2.1,203.0.113.5"},
            "Operation set_next_hop_check_target_vrf requires 3 values",
        ),
        ({"op": "set_route", "value": "x"}, "Operation set_route takes no value"),
        ({"op": "set_bogus"}, "Unknown operation: set_bogus"),
        ({"op": "_mapper"}, "Invalid operation: _mapper"),
        ({"op": "get_capabilities"}, "Invalid operation: get_capabilities"),
    ],
)
def test_batch_rejects_a_bad_operation_without_committing(client, operation, detail):
    test_client, executed = client
    resp = _batch(test_client, [{"op": "set_route"}, operation])
    assert resp.status_code == 400, resp.text
    assert resp.json()["detail"] == detail
    assert executed == []


@pytest.mark.parametrize(
    "operation, detail",
    [
        ({"op": "set_dhcp_interface", "value": "eth2"}, "failover dhcp-interface is not supported on this device"),
        (
            {"op": "delete_dhcp_interface_check_target_vrf", "value": "eth2,203.0.113.5"},
            "failover dhcp-interface is not supported on this device",
        ),
        (
            {"op": "set_next_hop_check_target_interface", "value": "192.0.2.1,203.0.113.5,eth1"},
            "failover check target interface is not supported on this device",
        ),
        (
            {"op": "delete_next_hop_check_target_vrf", "value": "192.0.2.1,203.0.113.5"},
            "failover check target vrf is not supported on this device",
        ),
    ],
)
def test_batch_rejects_a_1_5_only_op_on_1_4(client_14, operation, detail):
    test_client, executed = client_14
    resp = _batch(test_client, [{"op": "set_route"}, operation])
    assert resp.status_code == 400, resp.text
    assert resp.json()["detail"] == detail
    assert executed == []


def test_batch_reports_a_failed_commit(client, commit):
    commit.update(status=400, error="Commit failed: bad target")
    test_client, executed = client
    resp = _batch(test_client, [{"op": "set_route"}])
    assert resp.status_code == 200, resp.text
    assert resp.json() == {"success": False, "data": None, "error": "Commit failed: bad target"}
    assert executed == [[("set", ROUTE)]]


def test_empty_batch_stays_a_500(client):
    test_client, executed = client
    resp = _batch(test_client, [])
    assert resp.status_code == 500, resp.text
    assert executed == []


def test_blank_destination_is_rejected(client):
    test_client, executed = client
    resp = _batch(test_client, [{"op": "set_route"}], destination=" ")
    assert resp.status_code == 422, resp.text
    assert executed == []


@pytest.mark.parametrize(
    "method, path, body",
    [
        ("get", "/vyos/failover/capabilities", None),
        ("get", "/vyos/failover/config", None),
        ("post", "/vyos/failover/batch", {"destination": "10.0.0.0/8", "operations": [{"op": "set_route"}]}),
    ],
)
def test_routes_pass_a_session_http_exception_through(monkeypatch, commit, method, path, body):
    test_client, _executed = failover_client(monkeypatch, ROLLING, commit)

    def no_session(_req):
        raise HTTPException(status_code=400, detail="No active VyOS session")

    monkeypatch.setattr(f"{MODULE}.get_session_vyos_service", no_session)
    resp = getattr(test_client, method)(path, **({"json": body} if body else {}))
    assert resp.status_code == 400, resp.text
    assert resp.json()["detail"] == "No active VyOS session"
