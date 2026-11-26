"""RPKI router: comma-split args, a value on a zero-arg op, missing values, failed commits.

A stub service records what the handler sends. Device calls must run off the
event loop: the app middleware records the loop thread and the stub compares
its own thread against it.
"""

import threading
from types import SimpleNamespace

import pytest
from fastapi import FastAPI, HTTPException
from fastapi.testclient import TestClient

ROUTER = "routers.rpki.rpki"
BASE = ["protocols", "rpki"]
CACHE = BASE + ["cache"]


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
            return {"protocols": {"rpki": {
                "cache": {
                    "192.0.2.1": {
                        "port": "3323",
                        "preference": "10",
                        "ssh": {"key": "rpki-key", "username": "rpki"},
                    },
                },
                "polling-period": "300",
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

    from routers.rpki.rpki import router

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
    return c.http.post("/vyos/rpki/batch", json={"operations": operations})


def test_batch_splits_values_onto_builder_args(client):
    resp = _post(client, [
        {"op": "set_cache", "value": "192.0.2.1"},
        {"op": "set_cache_port", "value": "192.0.2.1,3323"},
        {"op": "set_cache_preference", "value": "192.0.2.1,10"},
        {"op": "set_cache_source_address", "value": "192.0.2.1,192.0.2.10"},
        {"op": "set_cache_ssh_key", "value": "192.0.2.1,rpki-key"},
        {"op": "set_cache_ssh_username", "value": "192.0.2.1,rpki"},
        {"op": "delete_cache_port", "value": "192.0.2.2"},
        {"op": "delete_cache_preference", "value": "192.0.2.2"},
        {"op": "delete_cache_source_address", "value": "192.0.2.2"},
        {"op": "delete_cache_ssh_key", "value": "192.0.2.2"},
        {"op": "delete_cache_ssh_username", "value": "192.0.2.2"},
        {"op": "delete_cache_ssh", "value": "192.0.2.3"},
        {"op": "delete_cache", "value": "192.0.2.4"},
        {"op": "set_expire_interval", "value": "7200"},
        {"op": "set_polling_period", "value": "300"},
        {"op": "set_retry_interval", "value": "600"},
        {"op": "delete_expire_interval"},
        {"op": "delete_polling_period"},
        {"op": "delete_retry_interval"},
        {"op": "delete_rpki"},
    ])
    assert resp.status_code == 200, resp.text
    assert resp.json() == {
        "success": True,
        "data": {"message": "RPKI configuration updated"},
        "error": None,
    }
    assert client.executed == [[
        {"op": "set", "path": CACHE + ["192.0.2.1"]},
        {"op": "set", "path": CACHE + ["192.0.2.1", "port", "3323"]},
        {"op": "set", "path": CACHE + ["192.0.2.1", "preference", "10"]},
        {"op": "set", "path": CACHE + ["192.0.2.1", "source-address", "192.0.2.10"]},
        {"op": "set", "path": CACHE + ["192.0.2.1", "ssh", "key", "rpki-key"]},
        {"op": "set", "path": CACHE + ["192.0.2.1", "ssh", "username", "rpki"]},
        {"op": "delete", "path": CACHE + ["192.0.2.2", "port"]},
        {"op": "delete", "path": CACHE + ["192.0.2.2", "preference"]},
        {"op": "delete", "path": CACHE + ["192.0.2.2", "source-address"]},
        {"op": "delete", "path": CACHE + ["192.0.2.2", "ssh", "key"]},
        {"op": "delete", "path": CACHE + ["192.0.2.2", "ssh", "username"]},
        {"op": "delete", "path": CACHE + ["192.0.2.3", "ssh"]},
        {"op": "delete", "path": CACHE + ["192.0.2.4"]},
        {"op": "set", "path": BASE + ["expire-interval", "7200"]},
        {"op": "set", "path": BASE + ["polling-period", "300"]},
        {"op": "set", "path": BASE + ["retry-interval", "600"]},
        {"op": "delete", "path": BASE + ["expire-interval"]},
        {"op": "delete", "path": BASE + ["polling-period"]},
        {"op": "delete", "path": BASE + ["retry-interval"]},
        {"op": "delete", "path": BASE},
    ]]
    assert client.permissions == [("write", "RPKI")]


def test_last_arg_keeps_commas(client):
    resp = _post(client, [{"op": "set_cache_ssh_username", "value": "192.0.2.1,a,b"}])
    assert resp.status_code == 200, resp.text
    assert client.executed == [[
        {"op": "set", "path": CACHE + ["192.0.2.1", "ssh", "username", "a,b"]},
    ]]


def test_device_calls_run_off_the_event_loop(client):
    assert client.http.get("/vyos/rpki/config").status_code == 200
    assert _post(client, [{"op": "delete_polling_period"}]).status_code == 200
    assert len(client.device_threads) == 2
    assert client.loop_threads
    for thread in client.device_threads:
        assert thread not in client.loop_threads


def test_config_returns_the_parse(client):
    resp = client.http.get("/vyos/rpki/config")
    assert resp.status_code == 200, resp.text
    assert resp.json() == {
        "configured": True,
        "cache_servers": [{
            "address": "192.0.2.1",
            "port": 3323,
            "preference": 10,
            "source_address": None,
            "ssh": {"key": "rpki-key", "username": "rpki"},
        }],
        "expire_interval": None,
        "polling_period": 300,
        "retry_interval": None,
    }
    assert client.permissions == [("read", "RPKI")]


def test_capabilities_require_read(client):
    resp = client.http.get("/vyos/rpki/capabilities")
    assert resp.status_code == 200, resp.text
    assert resp.json()["features"]["cache_servers"]["supported"] is True
    assert client.permissions == [("read", "RPKI")]


@pytest.mark.parametrize("operation", [
    {"op": "set_cache"},
    {"op": "delete_cache", "value": ""},
    {"op": "delete_cache_ssh"},
    {"op": "set_expire_interval"},
    {"op": "set_polling_period", "value": ""},
    {"op": "set_retry_interval"},
    {"op": "set_cache_port"},
    {"op": "set_cache_ssh_key", "value": ""},
])
def test_batch_missing_value_is_400(client, operation):
    """A missing value is 400, not a skipped op that still reports success."""
    resp = _post(client, [operation])
    assert resp.status_code == 400, resp.text
    assert resp.json()["detail"] == f"Operation {operation['op']} requires a value"
    assert client.executed == []


@pytest.mark.parametrize("op", [
    "delete_rpki",
    "delete_expire_interval",
    "delete_polling_period",
    "delete_retry_interval",
])
def test_batch_value_on_zero_arg_op_is_400(client, op):
    """A value on a zero-arg op is 400, not the value dropped and the op run."""
    resp = _post(client, [
        {"op": "set_polling_period", "value": "300"},
        {"op": op, "value": "192.0.2.1"},
    ])
    assert resp.status_code == 400, resp.text
    assert resp.json()["detail"] == f"Operation {op} takes no value"
    assert client.executed == []


@pytest.mark.parametrize("value", ["192.0.2.1", "192.0.2.1,", ",3323"])
def test_batch_short_value_is_400(client, value):
    """A short value is 400, not a set with an empty port."""
    resp = _post(client, [{"op": "set_cache_port", "value": value}])
    assert resp.status_code == 400, resp.text
    assert resp.json()["detail"] == "Operation set_cache_port requires 2 values"
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
    ("set_cache_source_address", "192.0.2.1,192.0.2.10"),
    ("delete_cache_source_address", "192.0.2.1"),
])
def test_batch_source_address_on_1_4_is_400(client, commit, op, value):
    """cache source-address is 1.5-only; on 1.4 the mapper gate is a 400 and nothing commits."""
    commit["version"] = "1.4"
    resp = _post(client, [
        {"op": "set_cache", "value": "192.0.2.1"},
        {"op": op, "value": value},
    ])
    assert resp.status_code == 400, resp.text
    assert resp.json()["detail"] == "rpki cache source-address is not supported on this device"
    assert client.executed == []


@pytest.mark.parametrize("op, value, detail", [
    ("set_cache", "rpki cache", "rpki cache address must be an IP address or a hostname"),
    ("set_cache_port", "192.0.2.1,0", "rpki cache port must be a number from 1 to 65535"),
    ("set_cache_port", "192.0.2.1,65536", "rpki cache port must be a number from 1 to 65535"),
    ("set_cache_preference", "192.0.2.1,256", "rpki cache preference must be a number from 1 to 255"),
    ("set_cache_source_address", "192.0.2.1,2001:db8::1", "rpki cache source-address must be an IPv4 address"),
    ("set_cache_ssh_username", "192.0.2.1,r\u00e9", "rpki cache ssh username must be 1 to 128 ASCII characters"),
    ("set_expire_interval", "599", "rpki expire-interval must be a number from 600 to 172800"),
    ("set_polling_period", "86401", "rpki polling-period must be a number from 1 to 86400"),
    ("set_retry_interval", "\u0663", "rpki retry-interval must be a number from 1 to 7200"),
])
def test_batch_value_the_lab_rejects_is_400(client, op, value, detail):
    """The builder checks each value against the lab syntax before anything commits."""
    resp = _post(client, [
        {"op": "set_polling_period", "value": "300"},
        {"op": op, "value": value},
    ])
    assert resp.status_code == 400, resp.text
    assert resp.json()["detail"] == detail
    assert client.executed == []


def test_failed_commit_reports_the_error(client, commit):
    commit.update(status=400, error="Commit failed: T-err")
    resp = _post(client, [{"op": "delete_polling_period"}])
    assert resp.status_code == 200, resp.text
    assert resp.json() == {"success": False, "data": None, "error": "Commit failed: T-err"}


def test_batch_empty_is_500(client):
    resp = _post(client, [])
    assert resp.status_code == 500, resp.text
    assert resp.json()["detail"] == "Internal server error"
    assert client.executed == []


@pytest.mark.parametrize("method,path,body", [
    ("get", "/vyos/rpki/capabilities", None),
    ("get", "/vyos/rpki/config", None),
    ("post", "/vyos/rpki/batch", {"operations": []}),
])
def test_session_400_passes_through(client, monkeypatch, method, path, body):
    def no_session(_req):
        raise HTTPException(status_code=400, detail="No active session")

    monkeypatch.setattr(f"{ROUTER}.get_session_vyos_service", no_session)
    resp = getattr(client.http, method)(path, **({"json": body} if body is not None else {}))
    assert resp.status_code == 400, resp.text
    assert resp.json()["detail"] == "No active session"
