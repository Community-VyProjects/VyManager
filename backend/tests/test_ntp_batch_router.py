"""NTP router: comma-split args, a value on a zero-arg op, missing values, failed commits.

A stub service records what the handler sends. Device calls must run off the
event loop: the app middleware records the loop thread and the stub compares
its own thread against it.
"""

import threading
from types import SimpleNamespace

import pytest
from fastapi import FastAPI, HTTPException
from fastapi.testclient import TestClient

ROUTER = "routers.ntp.ntp"
BASE = ["service", "ntp"]
SERVER = BASE + ["server"]
TIMESTAMP = BASE + ["timestamp", "interface"]


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
            return {"service": {"ntp": {
                "allow-client": {"address": ["192.0.2.0/24", "2001:db8::/32"]},
                "interface": "eth0",
                "leap-second": "smear",
                "listen-address": ["192.0.2.1"],
                "server": {
                    "time.example.com": {"prefer": {}, "nts": {}},
                    "pool.example.com": {"pool": {}},
                },
                "timestamp": {"interface": {"eth1": {"receive-filter": "ntp"}}},
                "vrf": "MGMT",
            }}}

        def execute_batch(self, batch):
            device_threads.append(threading.current_thread())
            if batch.is_empty():
                raise ValueError("Cannot execute empty batch")
            executed.append(batch.get_operations())
            return SimpleNamespace(status=commit["status"], result="", error=commit["error"])

    monkeypatch.setattr(f"{ROUTER}.require_read_permission", read)
    monkeypatch.setattr(f"{ROUTER}.require_write_permission", write)
    monkeypatch.setattr(f"{ROUTER}.get_session_vyos_service", lambda _req: Service())

    from routers.ntp.ntp import router

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
    return c.http.post("/vyos/ntp/batch", json={"operations": operations})


def test_batch_splits_values_onto_builder_args(client):
    resp = _post(client, [
        {"op": "set_allow_client", "value": "192.0.2.0/24"},
        {"op": "delete_allow_client", "value": "198.51.100.0/24"},
        {"op": "delete_all_allow_clients"},
        {"op": "set_interface", "value": "eth0"},
        {"op": "delete_interface", "value": "eth2"},
        {"op": "delete_all_interfaces"},
        {"op": "set_leap_second", "value": "smear"},
        {"op": "delete_leap_second"},
        {"op": "set_listen_address", "value": "192.0.2.1"},
        {"op": "delete_listen_address", "value": "192.0.2.2"},
        {"op": "delete_all_listen_addresses"},
        {"op": "set_server", "value": "time.example.com"},
        {"op": "set_server_noselect", "value": "time.example.com"},
        {"op": "set_server_nts", "value": "time.example.com"},
        {"op": "set_server_pool", "value": "time.example.com"},
        {"op": "set_server_prefer", "value": "time.example.com"},
        {"op": "delete_server_noselect", "value": "a.example.com"},
        {"op": "delete_server_nts", "value": "a.example.com"},
        {"op": "delete_server_pool", "value": "a.example.com"},
        {"op": "delete_server_prefer", "value": "a.example.com"},
        {"op": "delete_server", "value": "b.example.com"},
        {"op": "set_vrf", "value": "MGMT"},
        {"op": "delete_vrf"},
        {"op": "set_timestamp_interface_receive_filter", "value": "eth1,ntp"},
        {"op": "delete_timestamp_interface_receive_filter", "value": "eth2"},
        {"op": "delete_ntp"},
    ])
    assert resp.status_code == 200, resp.text
    assert resp.json() == {
        "success": True,
        "data": {"message": "NTP configuration updated"},
        "error": None,
    }
    assert client.executed == [[
        {"op": "set", "path": BASE + ["allow-client", "address", "192.0.2.0/24"]},
        {"op": "delete", "path": BASE + ["allow-client", "address", "198.51.100.0/24"]},
        {"op": "delete", "path": BASE + ["allow-client"]},
        {"op": "set", "path": BASE + ["interface", "eth0"]},
        {"op": "delete", "path": BASE + ["interface", "eth2"]},
        {"op": "delete", "path": BASE + ["interface"]},
        {"op": "set", "path": BASE + ["leap-second", "smear"]},
        {"op": "delete", "path": BASE + ["leap-second"]},
        {"op": "set", "path": BASE + ["listen-address", "192.0.2.1"]},
        {"op": "delete", "path": BASE + ["listen-address", "192.0.2.2"]},
        {"op": "delete", "path": BASE + ["listen-address"]},
        {"op": "set", "path": SERVER + ["time.example.com"]},
        {"op": "set", "path": SERVER + ["time.example.com", "noselect"]},
        {"op": "set", "path": SERVER + ["time.example.com", "nts"]},
        {"op": "set", "path": SERVER + ["time.example.com", "pool"]},
        {"op": "set", "path": SERVER + ["time.example.com", "prefer"]},
        {"op": "delete", "path": SERVER + ["a.example.com", "noselect"]},
        {"op": "delete", "path": SERVER + ["a.example.com", "nts"]},
        {"op": "delete", "path": SERVER + ["a.example.com", "pool"]},
        {"op": "delete", "path": SERVER + ["a.example.com", "prefer"]},
        {"op": "delete", "path": SERVER + ["b.example.com"]},
        {"op": "set", "path": BASE + ["vrf", "MGMT"]},
        {"op": "delete", "path": BASE + ["vrf"]},
        {"op": "set", "path": TIMESTAMP + ["eth1", "receive-filter", "ntp"]},
        {"op": "delete", "path": TIMESTAMP + ["eth2", "receive-filter"]},
        {"op": "delete", "path": BASE},
    ]]
    assert client.permissions == [("write", "NTP")]


def test_last_arg_keeps_commas(client):
    resp = _post(client, [{"op": "set_timestamp_interface_receive_filter", "value": "eth1,a,b"}])
    assert resp.status_code == 200, resp.text
    assert client.executed == [[
        {"op": "set", "path": TIMESTAMP + ["eth1", "receive-filter", "a,b"]},
    ]]


def test_single_arg_value_keeps_commas(client):
    """A one-arg op takes the whole value; split(',', 0) does not split it."""
    resp = _post(client, [{"op": "set_server", "value": "a,b"}])
    assert resp.status_code == 200, resp.text
    assert client.executed == [[{"op": "set", "path": SERVER + ["a,b"]}]]


def test_device_calls_run_off_the_event_loop(client):
    assert client.http.get("/vyos/ntp/config").status_code == 200
    assert _post(client, [{"op": "delete_vrf"}]).status_code == 200
    assert len(client.device_threads) == 2
    assert client.loop_threads
    for thread in client.device_threads:
        assert thread not in client.loop_threads


def test_config_returns_the_parse(client):
    resp = client.http.get("/vyos/ntp/config")
    assert resp.status_code == 200, resp.text
    assert resp.json() == {
        "allow_clients": ["192.0.2.0/24", "2001:db8::/32"],
        "interfaces": ["eth0"],
        "leap_second": "smear",
        "listen_addresses": ["192.0.2.1"],
        "servers": [
            {"name": "pool.example.com", "noselect": False, "nts": False, "pool": True, "prefer": False},
            {"name": "time.example.com", "noselect": False, "nts": True, "pool": False, "prefer": True},
        ],
        "timestamp_interfaces": [{"interface": "eth1", "receive_filter": "ntp"}],
        "vrf": "MGMT",
    }
    assert client.permissions == [("read", "NTP")]


@pytest.mark.parametrize("version, supported", [("1.4", False), ("1.5", True)])
def test_capabilities_require_read(client, commit, version, supported):
    commit["version"] = version
    resp = client.http.get("/vyos/ntp/capabilities")
    assert resp.status_code == 200, resp.text
    assert resp.json()["features"]["timestamp_receive_filter"]["supported"] is supported
    assert client.permissions == [("read", "NTP")]


@pytest.mark.parametrize("operation", [
    {"op": "set_server"},
    {"op": "delete_server", "value": ""},
    {"op": "set_server_prefer"},
    {"op": "delete_server_nts", "value": ""},
    {"op": "set_allow_client"},
    {"op": "delete_allow_client", "value": ""},
    {"op": "set_interface"},
    {"op": "delete_interface", "value": ""},
    {"op": "set_listen_address"},
    {"op": "delete_listen_address", "value": ""},
    {"op": "set_leap_second", "value": ""},
    {"op": "set_vrf"},
    {"op": "set_timestamp_interface_receive_filter"},
    {"op": "delete_timestamp_interface_receive_filter", "value": ""},
])
def test_batch_missing_value_is_400(client, operation):
    """A missing value is 400, not a skipped op that still reports success."""
    resp = _post(client, [operation])
    assert resp.status_code == 400, resp.text
    assert resp.json()["detail"] == f"Operation {operation['op']} requires a value"
    assert client.executed == []


@pytest.mark.parametrize("op", [
    "delete_ntp",
    "delete_all_allow_clients",
    "delete_all_interfaces",
    "delete_all_listen_addresses",
    "delete_leap_second",
    "delete_vrf",
])
def test_batch_value_on_zero_arg_op_is_400(client, op):
    """A value on a zero-arg op is 400, not the value dropped and the op run."""
    resp = _post(client, [
        {"op": "set_vrf", "value": "MGMT"},
        {"op": op, "value": "eth0"},
    ])
    assert resp.status_code == 400, resp.text
    assert resp.json()["detail"] == f"Operation {op} takes no value"
    assert client.executed == []


@pytest.mark.parametrize("value", ["eth1", "eth1,", ",ntp"])
def test_batch_short_value_is_400(client, value):
    """A short value is 400, not a set with an empty filter."""
    resp = _post(client, [{"op": "set_timestamp_interface_receive_filter", "value": value}])
    assert resp.status_code == 400, resp.text
    assert resp.json()["detail"] == "Operation set_timestamp_interface_receive_filter requires 2 values"
    assert client.executed == []


@pytest.mark.parametrize("op, detail", [
    ("no_such_op", "Unknown operation: no_such_op"),
    ("add_set", "Invalid operation: add_set"),
    ("_private", "Invalid operation: _private"),
])
def test_batch_unknown_op_is_400(client, op, detail):
    """The detail names the op, never raw exception text."""
    resp = _post(client, [{"op": op, "value": "x"}])
    assert resp.status_code == 400, resp.text
    assert resp.json()["detail"] == detail
    assert client.executed == []


@pytest.mark.parametrize("op, value", [
    ("set_timestamp_interface_receive_filter", "eth1,ntp"),
    ("delete_timestamp_interface_receive_filter", "eth1"),
])
def test_batch_timestamp_on_1_4_is_400(client, commit, op, value):
    """timestamp interface receive-filter is 1.5-only; on 1.4 the mapper gate is a 400 and nothing commits."""
    commit["version"] = "1.4"
    resp = _post(client, [
        {"op": "set_vrf", "value": "MGMT"},
        {"op": op, "value": value},
    ])
    assert resp.status_code == 400, resp.text
    assert resp.json()["detail"] == "ntp timestamp_receive_filter is not supported on this device"
    assert client.executed == []


def test_failed_commit_reports_the_error(client, commit):
    commit.update(status=400, error="Commit failed: T-err")
    resp = _post(client, [{"op": "delete_vrf"}])
    assert resp.status_code == 200, resp.text
    assert resp.json() == {"success": False, "data": None, "error": "Commit failed: T-err"}


def test_batch_empty_is_500(client):
    resp = _post(client, [])
    assert resp.status_code == 500, resp.text
    assert resp.json()["detail"] == "Internal server error"
    assert client.executed == []


@pytest.mark.parametrize("method,path,body", [
    ("get", "/vyos/ntp/capabilities", None),
    ("get", "/vyos/ntp/config", None),
    ("post", "/vyos/ntp/batch", {"operations": []}),
])
def test_session_400_passes_through(client, monkeypatch, method, path, body):
    def no_session(_req):
        raise HTTPException(status_code=400, detail="No active session")

    monkeypatch.setattr(f"{ROUTER}.get_session_vyos_service", no_session)
    resp = getattr(client.http, method)(path, **({"json": body} if body is not None else {}))
    assert resp.status_code == 400, resp.text
    assert resp.json()["detail"] == "No active session"
