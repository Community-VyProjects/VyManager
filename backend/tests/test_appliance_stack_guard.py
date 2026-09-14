"""Appliance mode refuses delete/edit of the VyManager container stack."""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.testclient import TestClient

import routers.container.container as container_mod


class _FakeConfig:
    def __init__(self):
        self.apikey = "test-api-key"
        self.protocol = "https"
        self.hostname = "10.0.0.1"
        self.port = 443
        self.verify = False


class _FakeService:
    def __init__(self):
        self.config = _FakeConfig()
        self.executed = False

    def get_version(self):
        return "1.5"

    def get_full_config(self, refresh=False):
        return {
            "container": {
                "name": {
                    "vymanager-backend": {
                        "image": "ghcr.io/community-vyprojects/vymanager-backend:beta",
                    }
                }
            }
        }

    def execute_batch(self, _builder):
        self.executed = True
        return type("R", (), {"status": 200, "error": None})()


class _FakeResponse:
    def __init__(self, payload, status_code=200):
        self._payload = payload
        self.status_code = status_code

    def json(self):
        return self._payload


class _FakeAsyncClient:
    last_url = None

    def __init__(self, *args, **kwargs):
        pass

    async def __aenter__(self):
        return self

    async def __aexit__(self, *exc):
        return False

    async def post(self, url, json=None, auth=None):
        type(self).last_url = url
        return _FakeResponse(
            {"data": {"RestartContainer": {"success": True, "errors": None, "data": {"result": None}}}}
        )


@asynccontextmanager
async def _fake_conn_cm(_request):
    class _Conn:
        async def fetchrow(self, *_args, **_kwargs):
            return {
                "sshEncryptedPrivKey": b"x",
                "sshKeyNonce": b"y",
                "sshKeyConfigured": True,
            }

    yield _Conn()


def _build_client(monkeypatch, appliance: bool):
    async def allow(*_a, **_k):
        return None

    if appliance:
        monkeypatch.setenv("VYMANAGER_MODE", "appliance")
    else:
        monkeypatch.delenv("VYMANAGER_MODE", raising=False)

    service = _FakeService()
    monkeypatch.setattr(container_mod, "require_write_permission", allow)
    monkeypatch.setattr(container_mod, "require_read_permission", allow)
    monkeypatch.setattr(container_mod, "get_session_vyos_service", lambda _req: service)
    monkeypatch.setattr(container_mod, "request_scoped_conn", _fake_conn_cm)
    _FakeAsyncClient.last_url = None
    monkeypatch.setattr(container_mod.httpx, "AsyncClient", _FakeAsyncClient)

    app = FastAPI()

    @app.middleware("http")
    async def _inject_state(request, call_next):
        request.state.user = {"id": "u1"}
        request.state.instance = {"id": "i1", "name": "lab", "host": "10.0.0.1"}
        return await call_next(request)

    app.include_router(container_mod.router)
    return TestClient(app), service


def test_appliance_refuses_delete_name(monkeypatch):
    client, service = _build_client(monkeypatch, True)
    resp = client.post(
        "/vyos/container/batch",
        json={"operations": [{"op": "delete_name", "value": "vymanager-backend"}]},
    )
    assert resp.status_code == 400, resp.text
    assert "Cannot delete or edit the VyManager stack" in resp.text
    assert service.executed is False


def test_appliance_refuses_edit_and_root_delete(monkeypatch):
    client, service = _build_client(monkeypatch, True)
    resp = client.post(
        "/vyos/container/batch",
        json={"operations": [{"op": "set_name_disable", "value": "vymanager-frontend"}]},
    )
    assert resp.status_code == 400, resp.text
    resp = client.post(
        "/vyos/container/batch",
        json={"operations": [{"op": "delete_container_root"}]},
    )
    assert resp.status_code == 400, resp.text
    resp = client.post(
        "/vyos/container/batch",
        json={"operations": [{"op": "delete_network", "value": "vymanager"}]},
    )
    assert resp.status_code == 400, resp.text
    assert service.executed is False


def test_appliance_allows_unrelated_delete(monkeypatch):
    client, service = _build_client(monkeypatch, True)
    resp = client.post(
        "/vyos/container/batch",
        json={"operations": [{"op": "delete_name", "value": "adguard"}]},
    )
    assert resp.status_code == 200, resp.text
    assert service.executed is True


def test_vps_allows_stack_delete(monkeypatch):
    client, service = _build_client(monkeypatch, False)
    resp = client.post(
        "/vyos/container/batch",
        json={"operations": [{"op": "delete_name", "value": "vymanager-backend"}]},
    )
    assert resp.status_code == 200, resp.text
    assert service.executed is True


def test_appliance_refuses_rmdir(monkeypatch):
    client, service = _build_client(monkeypatch, True)
    resp = client.post(
        "/vyos/container/rmdir",
        json={"path": "/config/containers/vymanager-postgres"},
    )
    assert resp.status_code == 400, resp.text
    assert "Cannot delete or edit the VyManager stack" in resp.text


def test_appliance_allows_restart_and_image_pull(monkeypatch):
    client, _service = _build_client(monkeypatch, True)
    resp = client.post("/vyos/container/restart", json={"container_name": "vymanager-backend"})
    assert resp.status_code == 200, resp.text
    assert resp.json()["success"] is True
    assert _FakeAsyncClient.last_url is not None

    _FakeAsyncClient.last_url = None
    resp = client.post("/vyos/container/image/update", json={"container_name": "vymanager-backend"})
    assert resp.status_code == 200, resp.text


def test_appliance_refuses_image_delete(monkeypatch):
    client, _service = _build_client(monkeypatch, True)
    resp = client.post("/vyos/container/image/delete", json={"container_name": "vymanager-backend"})
    assert resp.status_code == 400, resp.text
    assert _FakeAsyncClient.last_url is None

    resp = client.post(
        "/vyos/container/image/delete-ref",
        json={"image": "ghcr.io/community-vyprojects/vymanager-frontend:beta"},
    )
    assert resp.status_code == 400, resp.text
    assert _FakeAsyncClient.last_url is None
