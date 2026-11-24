"""Container router: batch dispatch, config masks, show and SSH file handlers.

A stub service records what the handler sends, and a stub SSH connection what
the file handlers run. Device calls must run off the event loop: the app
middleware records the loop thread and the stub compares its own thread
against it.
"""

import asyncio
import threading
from types import SimpleNamespace

import pytest
from fastapi import FastAPI, HTTPException
from fastapi.testclient import TestClient

import appliance_mode

ROUTER = "routers.container.container"
NAME = ["container", "name"]
REGISTRY = ["container", "registry"]


@pytest.fixture
def commit():
    return {"status": 200, "error": None, "version": "1.5"}


@pytest.fixture
def shell():
    """What the stub SSH connection returns, and the commands it ran."""
    return {"stdout": "", "stderr": "", "exit_status": 0, "raise": None, "commands": []}


@pytest.fixture
def client(monkeypatch, commit, shell):
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
            return {"container": {
                "registry": {"docker.io": {
                    "authentication": {"username": "T-user", "password": "T-secret"},
                }},
                "name": {
                    "vymanager-backend": {"image": "ghcr.io/x/vymanager-backend:beta", "environment": {
                        "BETTER_AUTH_SECRET": {"value": "T-stack-secret"},
                    }},
                    "web": {"image": "nginx:1.27", "environment": {"TZ": {"value": "UTC"}}},
                },
            }}

        def execute_batch(self, batch):
            device_threads.append(threading.current_thread())
            if batch.is_empty():
                raise ValueError("Cannot execute empty batch")
            executed.append(batch.get_operations())
            return SimpleNamespace(status=commit["status"], result="", error=commit["error"])

    class Conn:
        async def run(self, command, check=False, input=None):
            shell["commands"].append(command)
            if shell["raise"] is not None:
                raise shell["raise"]
            return SimpleNamespace(
                stdout=shell["stdout"], stderr=shell["stderr"], exit_status=shell["exit_status"]
            )

        def close(self):
            pass

    async def ssh_connection(_req):
        return Conn()

    monkeypatch.setattr(f"{ROUTER}.require_read_permission", read)
    monkeypatch.setattr(f"{ROUTER}.require_write_permission", write)
    monkeypatch.setattr(f"{ROUTER}.get_session_vyos_service", lambda _req: Service())
    monkeypatch.setattr(f"{ROUTER}._get_ssh_connection", ssh_connection)

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


@pytest.mark.parametrize("path", [
    "/vyos/container/capabilities",
    "/vyos/container/config",
    "/vyos/container/images",
])
def test_unexpected_error_is_500(client, monkeypatch, path):
    """A backend fault is a 500, not an empty images list that reads as nothing pulled."""
    def boom(*_a, **_k):
        raise RuntimeError("T-boom")

    service = SimpleNamespace(get_version=boom, get_full_config=boom, device=SimpleNamespace(show=boom))
    monkeypatch.setattr(f"{ROUTER}.get_session_vyos_service", lambda _req: service)
    resp = client.http.get(path)
    assert resp.status_code == 500, resp.text
    assert resp.json()["detail"] == "Internal server error"


def test_log_unexpected_error_is_a_failed_reply(client, monkeypatch):
    def boom(*_a, **_k):
        raise RuntimeError("T-boom")

    service = SimpleNamespace(device=SimpleNamespace(show=boom))
    monkeypatch.setattr(f"{ROUTER}.get_session_vyos_service", lambda _req: service)
    resp = client.http.post("/vyos/container/log", json={"container_name": "web"})
    assert resp.status_code == 200, resp.text
    assert resp.json() == {"success": False, "output": None, "error": "Failed to retrieve container log."}


@pytest.mark.parametrize("op, value", [
    ("set_network", "my_net"),
    ("set_network", "n-12345678x"),
    ("set_network_mtu", "my_net,1500"),
])
def test_network_names_follow_the_lab(client, op, value):
    """The lab allows [-_a-zA-Z0-9]{1,11} for a network name."""
    assert _post(client, [{"op": op, "value": value}]).status_code == 200


@pytest.mark.parametrize("value", ["n-123456789x", "_net", "my.net"])
def test_network_name_outside_the_lab_is_400(client, value):
    resp = _post(client, [{"op": "delete_network", "value": value}])
    assert resp.status_code == 400, resp.text
    assert resp.json()["detail"] == "Invalid name in operation 'delete_network'."


def test_stack_env_values_are_masked_on_the_appliance(client, monkeypatch):
    monkeypatch.setenv("VYMANAGER_MODE", "appliance")
    body = client.http.get("/vyos/container/config").json()
    envs = {c["name"]: c["environments"] for c in body["containers"]}
    assert envs["vymanager-backend"] == [{"name": "BETTER_AUTH_SECRET", "value": "***"}]
    assert envs["web"] == [{"name": "TZ", "value": "UTC"}]
    monkeypatch.delenv("VYMANAGER_MODE")
    body = client.http.get("/vyos/container/config").json()
    envs = {c["name"]: c["environments"] for c in body["containers"]}
    assert envs["vymanager-backend"] == [{"name": "BETTER_AUTH_SECRET", "value": "T-stack-secret"}]


def test_base_dir_check_reports_a_failed_command(client, shell):
    """A failed SSH check is a 502, not exists=false that offers to create the directory."""
    shell["stdout"] = "exists\n"
    assert client.http.get("/vyos/container/base-dir").json() == {"exists": True}
    shell["stdout"] = "missing\n"
    assert client.http.get("/vyos/container/base-dir").json() == {"exists": False}
    shell["stdout"] = ""
    shell["raise"] = asyncio.TimeoutError()
    resp = client.http.get("/vyos/container/base-dir")
    assert resp.status_code == 502, resp.text
    assert resp.json()["detail"] == "Command timed out"


def test_file_read_keeps_the_content_byte_for_byte(client, shell):
    shell["stdout"] = "  indented: 1\n\n"
    resp = client.http.get("/vyos/container/file", params={"path": "/config/containers/web/app.yml"})
    assert resp.json() == {"success": True, "content": "  indented: 1\n\n", "error": None}
    assert shell["commands"] == ["sudo cat /config/containers/web/app.yml"]


def test_shell_output_bytes_are_decoded(client, shell):
    shell.update(stdout=b"exists\n", stderr=b"", exit_status=0)
    assert client.http.get("/vyos/container/base-dir").json() == {"exists": True}
    shell.update(stdout=b"", stderr=b"T-denied\n", exit_status=1)
    resp = client.http.post("/vyos/container/file", json={"path": "/config/containers/web/a", "content": "x"})
    assert resp.json() == {"success": False, "output": None, "error": "T-denied"}


@pytest.mark.parametrize("method,path,kwargs", [
    ("get", "/vyos/container/file", {"params": {"path": "/config/containers/vymanager-postgres/pg_hba.conf"}}),
    ("post", "/vyos/container/file", {"json": {"path": "/config/containers/vymanager-backend/x", "content": "x"}}),
    ("post", "/vyos/container/mkdir", {"json": {"paths": ["/config/containers/web", "/config/containers/vymanager-x"]}}),
    ("post", "/vyos/container/touch", {"json": {"paths": ["/config/containers/vymanager-backend/x"]}}),
    ("post", "/vyos/container/rmdir", {"json": {"path": "/config/containers/vymanager-postgres"}}),
])
def test_stack_volumes_are_refused_on_the_appliance(client, monkeypatch, shell, method, path, kwargs):
    monkeypatch.setenv("VYMANAGER_MODE", "appliance")
    resp = getattr(client.http, method)(path, **kwargs)
    assert resp.status_code == 400, resp.text
    assert resp.json()["detail"] == appliance_mode.STACK_GUARD_DETAIL
    assert shell["commands"] == []
    monkeypatch.delenv("VYMANAGER_MODE")
    assert getattr(client.http, method)(path, **kwargs).status_code == 200
    assert shell["commands"]


@pytest.mark.parametrize("path", ["/config/containers/web\n", "/config/containers/../etc", "/etc/passwd"])
def test_file_path_outside_the_base_is_400(client, shell, path):
    resp = client.http.get("/vyos/container/file", params={"path": path})
    assert resp.status_code == 400, resp.text
    assert shell["commands"] == []
