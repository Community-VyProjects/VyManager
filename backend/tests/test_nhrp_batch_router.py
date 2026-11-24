"""NHRP router: comma-split args, a value on a zero-arg op, missing values, failed commits.

A stub service records what the handler sends. Device calls must run off the
event loop: the app middleware records the loop thread and the stub compares
its own thread against it.
"""

import threading
from types import SimpleNamespace

import pytest
from fastapi import FastAPI, HTTPException
from fastapi.testclient import TestClient

ROUTER = "routers.nhrp.nhrp"
TUN = ["protocols", "nhrp", "tunnel", "tun0"]

CONFIG = {"protocols": {"nhrp": {"tunnel": {
    "tun0": {
        "cisco-authentication": "s3cr,t14",
        "authentication": "s3cr,t15",
        "holding-time": "600",
        "holdtime": "700",
        "map": {"tunnel-ip": {"10.0.0.2": {"nbma": "192.0.2.2"}}},
        "nhs": {"tunnel-ip": {"10.0.0.3": {"nbma": "192.0.2.3"}}},
        "multicast": "dynamic",
        "shortcut": {},
    },
}}}}


@pytest.fixture
def commit():
    return {"status": 200, "error": None, "version": "1.5"}


@pytest.fixture
def client(monkeypatch, commit):
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
            return CONFIG

        def execute_batch(self, batch):
            device_threads.append(threading.current_thread())
            if batch.is_empty():
                raise ValueError("Cannot execute empty batch")
            executed.append(batch.get_operations())
            return SimpleNamespace(status=commit["status"], result="", error=commit["error"])

    monkeypatch.setattr(f"{ROUTER}.require_read_permission", read)
    monkeypatch.setattr(f"{ROUTER}.require_write_permission", write)
    monkeypatch.setattr(f"{ROUTER}.get_session_vyos_service", lambda _req: Service())

    from routers.nhrp.nhrp import router

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


def _post(c, operations):
    return c.http.post("/vyos/nhrp/batch", json={"operations": operations})


def test_batch_splits_values_onto_builder_args_1_5(client):
    resp = _post(client, [
        {"op": "set_tunnel", "value": "tun0"},
        {"op": "set_authentication", "value": "tun0,pa,ss"},
        {"op": "set_holding_time", "value": "tun0,600"},
        {"op": "set_map_nbma", "value": "tun0,10.0.0.2,local"},
        {"op": "set_nhs_nbma", "value": "tun0,10.0.0.3,192.0.2.3"},
        {"op": "delete_nhs_nbma", "value": "tun0,10.0.0.3,192.0.2.4"},
        {"op": "delete_map", "value": "tun0,10.0.0.9"},
        {"op": "set_mtu", "value": "tun0,1400"},
        {"op": "set_registration_no_unique", "value": "tun0"},
        {"op": "set_multicast", "value": "tun0,dynamic"},
        {"op": "delete_authentication", "value": "tun0"},
        {"op": "delete_nhrp"},
    ])
    assert resp.status_code == 200, resp.text
    assert resp.json() == {
        "success": True,
        "data": {"message": "NHRP configuration updated"},
        "error": None,
    }
    assert client.executed == [[
        {"op": "set", "path": TUN},
        {"op": "set", "path": TUN + ["authentication", "pa,ss"]},
        {"op": "set", "path": TUN + ["holdtime", "600"]},
        {"op": "set", "path": TUN + ["map", "tunnel-ip", "10.0.0.2", "nbma", "local"]},
        {"op": "set", "path": TUN + ["nhs", "tunnel-ip", "10.0.0.3", "nbma", "192.0.2.3"]},
        {"op": "delete", "path": TUN + ["nhs", "tunnel-ip", "10.0.0.3", "nbma", "192.0.2.4"]},
        {"op": "delete", "path": TUN + ["map", "tunnel-ip", "10.0.0.9"]},
        {"op": "set", "path": TUN + ["mtu", "1400"]},
        {"op": "set", "path": TUN + ["registration-no-unique"]},
        {"op": "set", "path": TUN + ["multicast", "dynamic"]},
        {"op": "delete", "path": TUN + ["authentication"]},
        {"op": "delete", "path": ["protocols", "nhrp"]},
    ]]
    assert client.permissions == [("write", "NHRP")]


def test_batch_splits_values_onto_builder_args_1_4(client, commit):
    commit["version"] = "1.4.3"
    resp = _post(client, [
        {"op": "set_authentication", "value": "tun0,pa,ss"},
        {"op": "set_map_nbma", "value": "tun0,10.0.0.2,192.0.2.2"},
        {"op": "set_map_cisco", "value": "tun0,10.0.0.2"},
        {"op": "set_dynamic_map_nbma_domain", "value": "tun0,10.1.0.0/24,hub.example.com"},
        {"op": "set_shortcut_target_holding_time", "value": "tun0,10.2.0.0/24,300"},
        {"op": "delete_shortcut_target", "value": "tun0,10.3.0.0/24"},
        {"op": "set_non_caching", "value": "tun0"},
    ])
    assert resp.status_code == 200, resp.text
    assert client.executed == [[
        {"op": "set", "path": TUN + ["cisco-authentication", "pa,ss"]},
        {"op": "set", "path": TUN + ["map", "10.0.0.2", "nbma-address", "192.0.2.2"]},
        {"op": "set", "path": TUN + ["map", "10.0.0.2", "cisco"]},
        {"op": "set", "path": TUN + ["dynamic-map", "10.1.0.0/24", "nbma-domain-name", "hub.example.com"]},
        {"op": "set", "path": TUN + ["shortcut-target", "10.2.0.0/24", "holding-time", "300"]},
        {"op": "delete", "path": TUN + ["shortcut-target", "10.3.0.0/24"]},
        {"op": "set", "path": TUN + ["non-caching"]},
    ]]


@pytest.mark.parametrize("version, op, value", [
    ("1.4", "set_nhs", "tun0,10.0.0.3"),
    ("1.4", "set_mtu", "tun0,1400"),
    ("1.5", "set_dynamic_map", "tun0,10.1.0.0/24"),
    ("1.5", "set_map_cisco", "tun0,10.0.0.2"),
])
def test_batch_op_of_the_other_version_is_400(client, commit, version, op, value):
    """An op with no path on this version is 400, not a 500, and nothing commits."""
    commit["version"] = version
    resp = _post(client, [
        {"op": "set_tunnel", "value": "tun0"},
        {"op": op, "value": value},
    ])
    assert resp.status_code == 400, resp.text
    assert resp.json()["detail"] == f"Operation {op} is not supported on this VyOS version"
    assert client.executed == []


def test_device_calls_run_off_the_event_loop(client):
    assert client.http.get("/vyos/nhrp/config").status_code == 200
    assert _post(client, [{"op": "delete_shortcut", "value": "tun0"}]).status_code == 200
    assert len(client.device_threads) == 2
    assert client.loop_threads
    for thread in client.device_threads:
        assert thread not in client.loop_threads


@pytest.mark.parametrize("version, holding_time", [("1.4", "600"), ("1.5", "700")])
def test_config_masks_the_pass_phrase(client, commit, version, holding_time):
    commit["version"] = version
    resp = client.http.get("/vyos/nhrp/config")
    assert resp.status_code == 200, resp.text
    assert "s3cr" not in resp.text
    body = resp.json()
    assert body["enabled"] is True
    (tunnel,) = body["tunnels"]
    assert tunnel["name"] == "tun0"
    assert tunnel["authentication"] == "***"
    assert tunnel["holding_time"] == holding_time
    assert client.permissions == [("read", "NHRP")]


def test_config_1_5_returns_the_parse(client):
    (tunnel,) = client.http.get("/vyos/nhrp/config").json()["tunnels"]
    assert tunnel["maps"] == [
        {"tunnel_ip": "10.0.0.2", "nbma_address": "192.0.2.2", "cisco": False, "register": False},
    ]
    assert tunnel["nhs_entries"] == [{"tunnel_ip": "10.0.0.3", "nbma_addresses": ["192.0.2.3"]}]
    assert tunnel["multicast"] == ["dynamic"]
    assert tunnel["shortcut"] is True


def test_capabilities_require_read(client):
    resp = client.http.get("/vyos/nhrp/capabilities")
    assert resp.status_code == 200, resp.text
    assert resp.json()["features"]["nhrp"]["supported"] is True
    assert client.permissions == [("read", "NHRP")]


@pytest.mark.parametrize("operation", [
    {"op": "set_tunnel"},
    {"op": "delete_tunnel", "value": ""},
    {"op": "set_shortcut"},
    {"op": "delete_redirect", "value": ""},
    {"op": "delete_authentication"},
    {"op": "set_authentication"},
    {"op": "set_map_nbma", "value": ""},
])
def test_batch_missing_value_is_400(client, operation):
    """A missing value is 400, not a TypeError 500 or a skipped op that still reports success."""
    resp = _post(client, [operation])
    assert resp.status_code == 400, resp.text
    assert resp.json()["detail"] == f"Operation {operation['op']} requires a value"
    assert client.executed == []


def test_batch_value_on_zero_arg_op_is_400(client):
    """A value on delete_nhrp is 400, not the value dropped and all of NHRP deleted."""
    resp = _post(client, [
        {"op": "set_tunnel", "value": "tun0"},
        {"op": "delete_nhrp", "value": "tun0"},
    ])
    assert resp.status_code == 400, resp.text
    assert resp.json()["detail"] == "Operation delete_nhrp takes no value"
    assert client.executed == []


@pytest.mark.parametrize("op, value, count", [
    ("set_authentication", "tun0", 2),
    ("set_authentication", "tun0,", 2),
    ("set_authentication", ",pass", 2),
    ("delete_map", "tun0", 2),
    ("set_map_nbma", "tun0,10.0.0.2", 3),
    ("set_map_nbma", "tun0,,192.0.2.2", 3),
    ("set_nhs_nbma", "tun0,10.0.0.3,", 3),
])
def test_batch_short_value_is_400(client, op, value, count):
    """A short value is 400, not a TypeError 500 or a call with fewer args."""
    resp = _post(client, [{"op": op, "value": value}])
    assert resp.status_code == 400, resp.text
    assert resp.json()["detail"] == f"Operation {op} requires {count} values"
    assert client.executed == []


@pytest.mark.parametrize("op, detail", [
    ("no_such_op", "Unknown operation: no_such_op"),
    ("add_set", "Invalid operation: add_set"),
    ("get_capabilities", "Invalid operation: get_capabilities"),
    ("_private", "Invalid operation: _private"),
])
def test_batch_unknown_op_is_400(client, op, detail):
    """The detail names the op, never raw exception text."""
    resp = _post(client, [{"op": op, "value": "x"}])
    assert resp.status_code == 400, resp.text
    assert resp.json()["detail"] == detail
    assert client.executed == []


def test_failed_commit_reports_the_error(client, commit):
    commit.update(status=400, error="Commit failed: T-err")
    resp = _post(client, [{"op": "delete_tunnel", "value": "tun0"}])
    assert resp.status_code == 200, resp.text
    assert resp.json() == {"success": False, "data": None, "error": "Commit failed: T-err"}


def test_batch_empty_is_500(client):
    resp = _post(client, [])
    assert resp.status_code == 500, resp.text
    assert resp.json()["detail"] == "Internal server error"
    assert client.executed == []


@pytest.mark.parametrize("method,path,body", [
    ("get", "/vyos/nhrp/capabilities", None),
    ("get", "/vyos/nhrp/config", None),
    ("post", "/vyos/nhrp/batch", {"operations": []}),
])
def test_session_400_passes_through(client, monkeypatch, method, path, body):
    def no_session(_req):
        raise HTTPException(status_code=400, detail="No active session")

    monkeypatch.setattr(f"{ROUTER}.get_session_vyos_service", no_session)
    resp = getattr(client.http, method)(path, **({"json": body} if body is not None else {}))
    assert resp.status_code == 400, resp.text
    assert resp.json()["detail"] == "No active session"
