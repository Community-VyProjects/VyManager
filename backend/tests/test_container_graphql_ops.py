"""Container image/restart operations run over GraphQL, not SSH (issue #716).

These drive the router endpoints with a fake VyOS service and a fake httpx
client so no real device or SSH connection is used. They assert:
  - the correct GraphQL mutation is posted with a JSON-safe name argument,
  - the {success, errors, data{result}} envelope maps onto the response,
  - the SSH-key credential gate still applies (409 when not configured),
  - the operation allowlist maps update -> AddImageContainer.
"""

import json
from contextlib import asynccontextmanager

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

import routers.container.container as container_mod


class _SecureStr:
    def __init__(self, value):
        self.value = value

    def __str__(self):
        return self.value


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


class _FakeResponse:
    def __init__(self, payload, status_code=200):
        self._payload = payload
        self.status_code = status_code

    def json(self):
        return self._payload


class _FakeAsyncClient:
    """Records the last POST and returns a scripted GraphQL body."""

    last_url = None
    last_json = None
    last_auth = None
    scripted_body = {"data": {}}

    def __init__(self, *args, **kwargs):
        pass

    async def __aenter__(self):
        return self

    async def __aexit__(self, *exc):
        return False

    async def post(self, url, json=None, auth=None):
        type(self).last_url = url
        type(self).last_json = json
        type(self).last_auth = auth
        return _FakeResponse(type(self).scripted_body)


@asynccontextmanager
async def _fake_conn_cm(_request):
    class _Conn:
        def __init__(self, row):
            self._row = row

        async def fetchrow(self, *_args, **_kwargs):
            return self._row

    yield _Conn(_ROW["value"])


_ROW = {
    "value": {
        "sshEncryptedPrivKey": b"x",
        "sshKeyNonce": b"y",
        "sshKeyConfigured": True,
    }
}


def _build_client(monkeypatch, scripted_body):
    async def allow(*_a, **_k):
        return None

    monkeypatch.setattr(container_mod, "require_write_permission", allow)
    monkeypatch.setattr(container_mod, "require_read_permission", allow)
    monkeypatch.setattr(container_mod, "get_session_vyos_service", lambda _req: _FakeService())
    monkeypatch.setattr(container_mod, "request_scoped_conn", _fake_conn_cm)

    _FakeAsyncClient.scripted_body = scripted_body
    _FakeAsyncClient.last_url = None
    _FakeAsyncClient.last_json = None
    monkeypatch.setattr(container_mod.httpx, "AsyncClient", _FakeAsyncClient)

    app = FastAPI()

    @app.middleware("http")
    async def _inject_state(request, call_next):
        request.state.user = {"id": "u1"}
        request.state.instance = {"id": "i1", "name": "lab", "host": "10.0.0.1"}
        return await call_next(request)

    app.include_router(container_mod.router)
    return TestClient(app)


def test_restart_posts_restart_mutation(monkeypatch):
    body = {"data": {"RestartContainer": {"success": True, "errors": None, "data": {"result": None}}}}
    client = _build_client(monkeypatch, body)

    resp = client.post("/vyos/container/restart", json={"container_name": "web"})
    assert resp.status_code == 200, resp.text
    assert resp.json()["success"] is True

    assert _FakeAsyncClient.last_url == "https://10.0.0.1:443/graphql"
    query = _FakeAsyncClient.last_json["query"]
    assert "RestartContainer" in query
    assert json.dumps("web") in query
    # API key auth, same as the dashboard GraphQL calls
    assert _FakeAsyncClient.last_auth == ("vyos", "test-api-key")


def test_update_image_maps_to_add_image_container(monkeypatch):
    body = {"data": {"AddImageContainer": {"success": True, "errors": None, "data": {"result": "pulled"}}}}
    client = _build_client(monkeypatch, body)

    resp = client.post("/vyos/container/image/update-ref", json={"image": "nginx:1.27"})
    assert resp.status_code == 200, resp.text
    assert resp.json()["success"] is True
    assert resp.json()["output"] == "pulled"
    query = _FakeAsyncClient.last_json["query"]
    assert "AddImageContainer" in query
    assert "update container image" not in query


def test_graphql_failure_surfaces_error(monkeypatch):
    body = {"data": {"AddImageContainer": {"success": False, "errors": ["pull failed"], "data": None}}}
    client = _build_client(monkeypatch, body)

    resp = client.post("/vyos/container/image/pull", json={"image": "nginx:1.27"})
    assert resp.status_code == 200, resp.text
    assert resp.json()["success"] is False
    assert "pull failed" in resp.json()["error"]


def test_ssh_key_gate_still_enforced(monkeypatch):
    body = {"data": {"RestartContainer": {"success": True, "errors": None, "data": {"result": None}}}}
    client = _build_client(monkeypatch, body)

    _ROW["value"] = {
        "sshEncryptedPrivKey": None,
        "sshKeyNonce": None,
        "sshKeyConfigured": False,
    }
    try:
        resp = client.post("/vyos/container/restart", json={"container_name": "web"})
        assert resp.status_code == 409, resp.text
        assert "SSH key not configured" in resp.text
        # No GraphQL call was made once the gate rejected.
        assert _FakeAsyncClient.last_url is None
    finally:
        _ROW["value"] = {
            "sshEncryptedPrivKey": b"x",
            "sshKeyNonce": b"y",
            "sshKeyConfigured": True,
        }


def test_invalid_name_rejected_before_any_call(monkeypatch):
    body = {"data": {"RestartContainer": {"success": True, "errors": None, "data": {"result": None}}}}
    client = _build_client(monkeypatch, body)

    resp = client.post("/vyos/container/restart", json={"container_name": "bad name; rm -rf /"})
    assert resp.status_code == 400, resp.text
    assert _FakeAsyncClient.last_url is None


def test_allowlist_maps_update_to_add_image_container():
    assert container_mod._CONTAINER_GQL_ALLOWLIST["update_image"][0] == "AddImageContainer"
    assert container_mod._CONTAINER_GQL_ALLOWLIST["add_image"][0] == "AddImageContainer"
    assert container_mod._CONTAINER_GQL_ALLOWLIST["delete_image"][0] == "DeleteImageContainer"
    assert container_mod._CONTAINER_GQL_ALLOWLIST["restart"][0] == "RestartContainer"
