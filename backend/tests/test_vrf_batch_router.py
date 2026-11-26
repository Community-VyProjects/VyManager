"""VRF batch route: value checks, version-gate 400s, failed commits, off-loop I/O.

Every VRF static route save goes through this handler (the VRF builder runs
the global static route ops under ``vrf name <vrf>``).
"""

import threading
from types import SimpleNamespace

import pytest
from fastapi import FastAPI, HTTPException
from fastapi.testclient import TestClient

ROUTER = "routers.vrf.vrf"
VRF = ["vrf", "name", "T-V"]


@pytest.fixture
def commit():
    return {"status": 200, "error": None, "version": "1.4"}


@pytest.fixture
def client(monkeypatch, commit):
    executed = []
    loop_threads = set()
    device_threads = []

    async def allow(*_args, **_kwargs):
        return None

    class Service:
        def get_version(self):
            return commit["version"]

        def get_full_config(self, refresh=False):
            device_threads.append(threading.current_thread())
            return {}

        def execute_batch(self, batch):
            device_threads.append(threading.current_thread())
            if batch.is_empty():
                raise ValueError("Cannot execute empty batch")
            executed.append(batch.get_operations())
            return SimpleNamespace(status=commit["status"], result="", error=commit["error"])

    monkeypatch.setattr(f"{ROUTER}.require_read_permission", allow)
    monkeypatch.setattr(f"{ROUTER}.require_write_permission", allow)
    monkeypatch.setattr(f"{ROUTER}.get_session_vyos_service", lambda _req: Service())

    from routers.vrf.vrf import router

    app = FastAPI()

    @app.middleware("http")
    async def record_loop(request, call_next):
        loop_threads.add(threading.current_thread())
        return await call_next(request)

    app.include_router(router)
    with TestClient(app) as test_client:
        yield SimpleNamespace(
            http=test_client, executed=executed, loop_threads=loop_threads, device_threads=device_threads
        )


def _post(c, operations):
    return c.http.post("/vyos/vrf/batch", json={"operations": operations})


def test_static_route_ops_reach_the_global_paths(client):
    resp = _post(client, [
        {"op": "set_vrf_static_route_next_hop_distance", "value": "T-V,198.51.100.0/24,192.0.2.1,10"},
        {"op": "set_vrf_static_route_description", "value": "T-V,198.51.100.0/24,T-desc,comma"},
        {"op": "delete_vrf_static", "value": "T-V"},
    ])
    assert resp.status_code == 200, resp.text
    assert resp.json() == {"success": True, "data": {"message": "VRF configuration updated"}, "error": None}
    assert client.executed == [[
        {"op": "set", "path": VRF + [
            "protocols", "static", "route", "198.51.100.0/24", "next-hop", "192.0.2.1", "distance", "10",
        ]},
        {"op": "set", "path": VRF + ["protocols", "static", "route", "198.51.100.0/24", "description", "T-desc,comma"]},
        {"op": "delete", "path": VRF + ["protocols", "static"]},
    ]]


def test_device_calls_run_off_the_event_loop(client):
    assert client.http.get("/vyos/vrf/config").status_code == 200
    assert _post(client, [{"op": "set_vrf", "value": "T-V"}]).status_code == 200
    assert len(client.device_threads) == 2
    for thread in client.device_threads:
        assert thread not in client.loop_threads


@pytest.mark.parametrize("operation", [
    {"op": "set_vrf"},
    {"op": "set_vrf", "value": ""},
    {"op": "set_vrf_static_route_next_hop"},
])
def test_missing_value_is_400(client, operation):
    resp = _post(client, [operation])
    assert resp.status_code == 400, resp.text
    assert resp.json()["detail"] == f"Operation {operation['op']} requires a value"
    assert client.executed == []


@pytest.mark.parametrize("value", ["T-V", "T-V,", ",x"])
def test_short_value_is_400(client, value):
    resp = _post(client, [{"op": "set_vrf_description", "value": value}])
    assert resp.status_code == 400, resp.text
    assert resp.json()["detail"] == "Operation set_vrf_description requires 2 values"
    assert client.executed == []


def test_packed_value_with_wrong_arity_is_400(client):
    resp = _post(client, [{"op": "set_vrf_static_route_next_hop_distance", "value": "T-V,198.51.100.0/24"}])
    assert resp.status_code == 400, resp.text
    assert "comma-separated" in resp.json()["detail"]
    assert client.executed == []


def test_unknown_op_is_400(client):
    resp = _post(client, [{"op": "no_such_op", "value": "x"}])
    assert resp.status_code == 400, resp.text
    assert resp.json()["detail"] == "Unknown operation: no_such_op"


@pytest.mark.parametrize("version", ["1.4", "1.5"])
def test_unresolvable_protocol_op_is_400(client, commit, version):
    """A packed protocol op whose value fits no mapper path raises
    ArityError in vrf_protocol; the client sent it, so it is a 400 naming the op."""
    commit["version"] = version
    resp = _post(client, [{"op": "set_vrf_ospf_area_type", "value": "red"}])
    assert resp.status_code == 400, resp.text
    assert resp.json()["detail"] == (
        "Operation set_vrf_ospf_area_type has the wrong number of comma-separated values"
    )
    assert client.executed == []


@pytest.mark.parametrize("family", ["ip", "ipv6"])
@pytest.mark.parametrize("value", ["T-V,bgp", "T-V,bgp,", "T-V,,T-RM"])
def test_protocol_route_map_without_both_parts_is_400(client, family, value):
    resp = _post(client, [{"op": f"set_vrf_{family}_protocol_route_map", "value": value}])
    assert resp.status_code == 400, resp.text
    assert "requires 'protocol,route-map'" in resp.json()["detail"]
    assert client.executed == []


@pytest.mark.parametrize("family", ["ip", "ipv6"])
def test_protocol_route_map_sets_the_path(client, family):
    resp = _post(client, [{"op": f"set_vrf_{family}_protocol_route_map", "value": "T-V,bgp,T-RM"}])
    assert resp.status_code == 200, resp.text
    [ops] = client.executed
    assert ops[0]["path"] == ["vrf", "name", "T-V", family, "protocol", "bgp", "route-map", "T-RM"]


# Lab ``allowed:`` lines of ``vrf name <vrf> ip|ipv6 protocol``.
PROTOCOLS = {
    "1.4": {
        "ip": ["any", "babel", "bgp", "connected", "eigrp", "isis", "kernel", "ospf", "rip", "static", "table"],
        "ipv6": ["any", "babel", "bgp", "connected", "isis", "kernel", "ospfv3", "ripng", "static", "table"],
    },
    "1.5": {
        "ip": ["any", "babel", "bgp", "eigrp", "isis", "ospf", "rip", "static"],
        "ipv6": ["any", "babel", "bgp", "isis", "ospfv3", "ripng", "static"],
    },
}


@pytest.mark.parametrize("version, lab", [("1.4", "1.4"), ("1.5", "1.5"), ("2026.09.23-0027-rolling", "1.5")])
def test_protocol_lists_come_from_the_mapper(version, lab):
    from vyos_builders.vrf.vrf_batch_builder import VrfBatchBuilder

    flag = VrfBatchBuilder(version).get_capabilities()["features"]["protocol_route_maps"]
    assert flag["ip_protocols"] == PROTOCOLS[lab]["ip"]
    assert flag["ipv6_protocols"] == PROTOCOLS[lab]["ipv6"]


@pytest.mark.parametrize("family", ["ip", "ipv6"])
@pytest.mark.parametrize("op, value", [
    ("set_vrf_{family}_protocol_route_map", "T-V,connected,T-RM"),
    ("delete_vrf_{family}_protocol_route_map", "T-V,kernel"),
])
def test_1_4_only_protocol_on_1_5_is_400(client, commit, family, op, value):
    commit["version"] = "1.5"
    resp = _post(client, [{"op": op.format(family=family), "value": value}])
    assert resp.status_code == 400, resp.text
    protocol = value.split(",")[1]
    assert resp.json()["detail"] == f"vrf {family} protocol {protocol} is not supported on this device"
    assert client.executed == []


@pytest.mark.parametrize("family", ["ip", "ipv6"])
def test_1_4_only_protocol_on_1_4_sets_and_deletes(client, family):
    resp = _post(client, [
        {"op": f"set_vrf_{family}_protocol_route_map", "value": "T-V,table,T-RM"},
        {"op": f"delete_vrf_{family}_protocol_route_map", "value": "T-V,kernel"},
    ])
    assert resp.status_code == 200, resp.text
    assert client.executed == [[
        {"op": "set", "path": VRF + [family, "protocol", "table", "route-map", "T-RM"]},
        {"op": "delete", "path": VRF + [family, "protocol", "kernel", "route-map"]},
    ]]


def test_1_5_static_leaf_on_1_4_is_400(client):
    resp = _post(client, [
        {"op": "set_vrf", "value": "T-V"},
        {"op": "set_vrf_static_route_next_hop_segments", "value": "T-V,198.51.100.0/24,192.0.2.1,fc00::1"},
    ])
    assert resp.status_code == 400, resp.text
    assert resp.json()["detail"] == "protocols static route segments is not supported on this device"
    assert client.executed == []


@pytest.mark.parametrize("operation, node", [
    ({"op": "set_vrf_isis_interface_fr_ti_lfa_level", "value": "T-V,eth0,level-1"}, "interface fast-reroute"),
    ({"op": "delete_vrf_isis_segment_routing_srv6_locator", "value": "T-V,T-LOC"}, "segment-routing srv6"),
    ({"op": "set_vrf_isis_traffic_engineering_export", "value": "T-V"}, "traffic-engineering export"),
])
def test_1_5_isis_leaf_on_1_4_is_400(client, operation, node):
    resp = _post(client, [{"op": "set_vrf_isis_net", "value": "T-V,49.0001.1921.6800.1002.00"}, operation])
    assert resp.status_code == 400, resp.text
    assert resp.json()["detail"] == f"{node} is not supported on this device"
    assert client.executed == []


@pytest.mark.parametrize("operation, detail", [
    ({"op": "set_vrf_bgp_peer_group_solo", "value": "T-V,PG"}, "peer-group solo is not supported on this device"),
    ({"op": "delete_vrf_bgp_af_redistribute_metric", "value": "T-V,ipv4-unicast,nhrp"},
     "redistribute nhrp is not supported on this device"),
    ({"op": "delete_vrf_bgp_af_redistribute_table_metric", "value": "T-V,ipv6-unicast,10"},
     "redistribute table is not supported for ipv6-unicast on this device"),
])
def test_1_5_bgp_leaf_on_1_4_is_400(client, operation, detail):
    resp = _post(client, [{"op": "set_vrf_bgp_system_as", "value": "T-V,65001"}, operation])
    assert resp.status_code == 400, resp.text
    assert resp.json()["detail"] == detail
    assert client.executed == []


@pytest.mark.parametrize("operation, detail", [
    ({"op": "set_vrf_ospf_redistribute", "value": "T-V,nhrp"}, "redistribute nhrp is not supported on this device"),
    ({"op": "delete_vrf_ospf_redistribute", "value": "T-V,nhrp"}, "redistribute nhrp is not supported on this device"),
    ({"op": "set_vrf_ospf_redistribute_metric", "value": "T-V,nhrp,10"},
     "redistribute nhrp is not supported on this device"),
    ({"op": "set_vrf_ospf_interface_authentication_null", "value": "T-V,eth0"},
     "interface authentication null is not supported on this device"),
    ({"op": "delete_vrf_ospf_area_virtual_link_authentication_null", "value": "T-V,0,192.0.2.1"},
     "virtual-link authentication null is not supported on this device"),
])
def test_1_5_ospf_leaf_on_1_4_is_400(client, operation, detail):
    resp = _post(client, [{"op": "set_vrf_ospf_router_id", "value": "T-V,192.0.2.1"}, operation])
    assert resp.status_code == 400, resp.text
    assert resp.json()["detail"] == detail
    assert client.executed == []


def test_failed_commit_reports_the_error(client, commit):
    commit.update(status=200, error="Commit failed: T-err")
    resp = _post(client, [{"op": "set_vrf", "value": "T-V"}])
    assert resp.status_code == 200, resp.text
    assert resp.json() == {"success": False, "data": None, "error": "Commit failed: T-err"}


def test_empty_batch_is_500(client):
    resp = _post(client, [])
    assert resp.status_code == 500, resp.text
    assert resp.json()["detail"] == "Internal server error"


@pytest.mark.parametrize("method,path,body", [
    ("get", "/vyos/vrf/capabilities", None),
    ("get", "/vyos/vrf/config", None),
    ("post", "/vyos/vrf/batch", {"operations": []}),
])
def test_session_400_passes_through(client, monkeypatch, method, path, body):
    def no_session(_req):
        raise HTTPException(status_code=400, detail="No active session")

    monkeypatch.setattr(f"{ROUTER}.get_session_vyos_service", no_session)
    resp = getattr(client.http, method)(path, **({"json": body} if body is not None else {}))
    assert resp.status_code == 400, resp.text
    assert resp.json()["detail"] == "No active session"
