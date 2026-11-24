"""Container router: comma-split args, a value on a zero-arg op, missing values, failed commits.

A stub service records what the handler sends. Device calls must run off the
event loop: the app middleware records the loop thread and the stub compares
its own thread against it.
"""

import threading
from types import SimpleNamespace

import pytest
from fastapi import FastAPI, HTTPException
from fastapi.testclient import TestClient

ROUTER = "routers.container.container"
NAME = ["container", "name"]
REGISTRY = ["container", "registry"]


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

    class Device:
        def show(self, path):
            device_threads.append(threading.current_thread())
            if path == ["container", "image"]:
                return SimpleNamespace(
                    status=200,
                    result="REPOSITORY TAG\ndocker.io/library/nginx 1.27\n",
                    error=None,
                )
            return SimpleNamespace(status=200, result="T-log\n", error=None)

    class Service:
        device = Device()

        def get_version(self):
            return commit["version"]

        def get_full_config(self, refresh=False):
            device_threads.append(threading.current_thread())
            return {"container": {"registry": {"docker.io": {
                "authentication": {"username": "T-user", "password": "T-secret"},
            }}}}

        def execute_batch(self, batch):
            device_threads.append(threading.current_thread())
            if batch.is_empty():
                raise ValueError("Cannot execute empty batch")
            executed.append(batch.get_operations())
            return SimpleNamespace(status=commit["status"], result="", error=commit["error"])

    monkeypatch.setattr(f"{ROUTER}.require_read_permission", read)
    monkeypatch.setattr(f"{ROUTER}.require_write_permission", write)
    monkeypatch.setattr(f"{ROUTER}.get_session_vyos_service", lambda _req: Service())

    from routers.container.container import router

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
    return c.http.post("/vyos/container/batch", json={"operations": operations})


@pytest.mark.parametrize("version", ["1.4", "1.5"])
def test_batch_splits_values_onto_builder_args(client, commit, version):
    commit["version"] = version
    resp = _post(client, [
        {"op": "set_name", "value": "web"},
        {"op": "set_name_arguments", "value": "web,--a=1,--b=2"},
        {"op": "set_name_environment_value", "value": "web,TZ,UTC"},
        {"op": "set_name_environment_value", "value": "web,EMPTY,"},
        {"op": "set_name_sysctl_parameter_value", "value": "web,kernel.msgmax,"},
        {"op": "delete_name_disable", "value": "web"},
        {"op": "set_registry_auth_password", "value": "docker.io,p,w"},
        {"op": "delete_container_root"},
    ])
    assert resp.status_code == 200, resp.text
    assert resp.json() == {
        "success": True,
        "data": {"message": "Container configuration updated"},
        "error": None,
    }
    assert client.executed == [[
        {"op": "set", "path": NAME + ["web"]},
        {"op": "set", "path": NAME + ["web", "arguments", "--a=1,--b=2"]},
        {"op": "set", "path": NAME + ["web", "environment", "TZ", "value", "UTC"]},
        {"op": "set", "path": NAME + ["web", "environment", "EMPTY", "value", ""]},
        {"op": "set", "path": NAME + ["web", "sysctl", "parameter", "kernel.msgmax", "value", ""]},
        {"op": "delete", "path": NAME + ["web", "disable"]},
        {"op": "set", "path": REGISTRY + ["docker.io", "authentication", "password", "p,w"]},
        {"op": "delete", "path": ["container"]},
    ]]
    assert client.permissions == [("write", "CONTAINER")]


def test_device_calls_run_off_the_event_loop(client):
    assert client.http.get("/vyos/container/config").status_code == 200
    assert client.http.get("/vyos/container/images").json() == {"images": ["docker.io/library/nginx:1.27"]}
    assert client.http.post("/vyos/container/log", json={"container_name": "web"}).status_code == 200
    assert _post(client, [{"op": "delete_name", "value": "web"}]).status_code == 200
    assert len(client.device_threads) == 4
    assert client.loop_threads
    for thread in client.device_threads:
        assert thread not in client.loop_threads


def test_config_masks_the_registry_password(client):
    resp = client.http.get("/vyos/container/config")
    assert resp.status_code == 200, resp.text
    assert resp.json()["registries"][0]["authentication"] == {"username": "T-user", "password": "***"}
    assert "T-secret" not in resp.text
    assert client.permissions == [("read", "CONTAINER")]


@pytest.mark.parametrize("operation, detail", [
    ({"op": "set_name_image"}, "Operation set_name_image requires a value"),
    ({"op": "set_registry_insecure", "value": ""}, "Operation set_registry_insecure requires a value"),
    ({"op": "set_name_image", "value": "web,"}, "Operation set_name_image requires 2 values"),
    ({"op": "set_name_disable", "value": "web,"}, "Invalid name in operation 'set_name_disable'."),
])
def test_batch_missing_value_is_400(client, operation, detail):
    """A missing value is 400, and a single-arg name cannot carry a trailing part."""
    resp = _post(client, [operation])
    assert resp.status_code == 400, resp.text
    assert resp.json()["detail"] == detail
    assert client.executed == []


@pytest.mark.parametrize("value", ["x", "web"])
def test_batch_value_on_zero_arg_op_is_400(client, value):
    """A value on delete_container_root is 400, not the whole container tree deleted."""
    resp = _post(client, [
        {"op": "delete_name", "value": "web"},
        {"op": "delete_container_root", "value": value},
    ])
    assert resp.status_code == 400, resp.text
    assert resp.json()["detail"] == "Operation delete_container_root takes no value"
    assert client.executed == []


@pytest.mark.parametrize("op, value, count", [
    ("set_name_image", "web", 2),
    ("set_name_environment_value", "web,TZ", 3),
    ("set_name_device_source", "web,,/dev/x", 3),
    ("set_registry_auth_username", "docker.io", 2),
])
def test_batch_short_value_is_400(client, op, value, count):
    """A short value is 400, not a TypeError 500 or a one-arg call."""
    resp = _post(client, [{"op": op, "value": value}])
    assert resp.status_code == 400, resp.text
    assert resp.json()["detail"] == f"Operation {op} requires {count} values"
    assert client.executed == []


@pytest.mark.parametrize("op, value", [
    ("set_name", " web"),
    ("set_name", "web\n"),
    ("set_name_image", "-rm,nginx"),
    ("set_network", "net;id"),
    ("set_registry", "docker.io\n"),
])
def test_batch_invalid_name_is_400(client, op, value):
    """The name reaching the builder is the one the regex checked, whole."""
    resp = _post(client, [{"op": op, "value": value}])
    assert resp.status_code == 400, resp.text
    assert resp.json()["detail"] == f"Invalid name in operation '{op}'."
    assert client.executed == []


def test_batch_version_gate_is_400(client, commit):
    """A 1.5-only leaf on 1.4 is the mapper's 400, and nothing is committed."""
    commit["version"] = "1.4"
    resp = _post(client, [
        {"op": "set_name", "value": "web"},
        {"op": "set_name_log_driver", "value": "web,journald"},
    ])
    assert resp.status_code == 400, resp.text
    assert resp.json()["detail"] == "log-driver is not supported on this device"
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


def test_failed_commit_reports_the_error(client, commit):
    commit.update(status=400, error="Commit failed: T-err")
    resp = _post(client, [{"op": "delete_name", "value": "web"}])
    assert resp.status_code == 200, resp.text
    assert resp.json() == {"success": False, "data": None, "error": "Commit failed: T-err"}


def test_batch_empty_is_500(client):
    resp = _post(client, [])
    assert resp.status_code == 500, resp.text
    assert resp.json()["detail"] == "Internal server error"
    assert client.executed == []


@pytest.mark.parametrize("method,path,body", [
    ("get", "/vyos/container/capabilities", None),
    ("get", "/vyos/container/config", None),
    ("post", "/vyos/container/batch", {"operations": []}),
    ("get", "/vyos/container/images", None),
    ("post", "/vyos/container/log", {"container_name": "web"}),
])
def test_session_400_passes_through(client, monkeypatch, method, path, body):
    def no_session(_req):
        raise HTTPException(status_code=400, detail="No active session")

    monkeypatch.setattr(f"{ROUTER}.get_session_vyos_service", no_session)
    resp = getattr(client.http, method)(path, **({"json": body} if body is not None else {}))
    assert resp.status_code == 400, resp.text
    assert resp.json()["detail"] == "No active session"
