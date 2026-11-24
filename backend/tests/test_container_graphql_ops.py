"""Container image/restart operations run over GraphQL, not SSH (issue #716).

These drive the router endpoints with a fake VyOS service and a fake httpx
client so no real device or SSH connection is used. They assert:
  - the container mapper's mutation document is posted, with the API key and
    the name as GraphQL variables (never written into the query text),
  - the {success, errors, data{result}} envelope maps onto the response,
  - the SSH-key credential gate still applies (409 when not configured),
  - a re-pull (update) runs AddImageContainer.
"""

from contextlib import asynccontextmanager

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

import routers.container.container as container_mod
from vyos_mappers import CommandMapperRegistry
from vyos_mappers.container.container import ContainerMapper, GraphQLMutation
from vyos_mappers.container.container_versions import get_container_mapper


def _doc(field):
    return (
        "mutation ($key: String!, $name: String!) { "
        + field
        + "(data: {key: $key, name: $name}) { success errors data { result } } }"
    )


ADD_DOC = _doc("AddImageContainer")
DELETE_DOC = _doc("DeleteImageContainer")
RESTART_DOC = _doc("RestartContainer")


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

    def get_version(self):
        return "1.5"

    def get_full_config(self, refresh=False):
        return {"container": {"name": {"web": {"image": "nginx:1.27"}}}}


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
    last_timeout = None
    scripted_body = {"data": {}}

    def __init__(self, *args, **kwargs):
        type(self).last_timeout = kwargs.get("timeout")

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
    assert _FakeAsyncClient.last_json is not None
    assert _FakeAsyncClient.last_json == {
        "query": RESTART_DOC,
        "variables": {"key": "test-api-key", "name": "web"},
    }
    # API key auth, same as the dashboard GraphQL calls
    assert _FakeAsyncClient.last_auth == ("vyos", "test-api-key")
    assert _FakeAsyncClient.last_timeout == 60.0


def test_update_image_maps_to_add_image_container(monkeypatch):
    body = {"data": {"AddImageContainer": {"success": True, "errors": None, "data": {"result": "pulled"}}}}
    client = _build_client(monkeypatch, body)

    resp = client.post("/vyos/container/image/update-ref", json={"image": "nginx:1.27"})
    assert resp.status_code == 200, resp.text
    assert resp.json()["success"] is True
    assert resp.json()["output"] == "pulled"
    assert _FakeAsyncClient.last_json is not None
    assert _FakeAsyncClient.last_json == {
        "query": ADD_DOC,
        "variables": {"key": "test-api-key", "name": "nginx:1.27"},
    }
    assert _FakeAsyncClient.last_timeout == 300.0


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


def test_update_image_resolves_container_name_to_image_ref(monkeypatch):
    body = {
        "data": {
            "AddImageContainer": {
                "success": True,
                "errors": None,
                "data": {"result": "pulled"},
            }
        }
    }
    client = _build_client(monkeypatch, body)

    resp = client.post("/vyos/container/image/update", json={"container_name": "web"})
    assert resp.status_code == 200, resp.text
    assert resp.json()["success"] is True
    assert _FakeAsyncClient.last_json is not None
    assert _FakeAsyncClient.last_json == {
        "query": ADD_DOC,
        "variables": {"key": "test-api-key", "name": "nginx:1.27"},
    }


def test_update_image_unknown_container(monkeypatch):
    body = {"data": {"AddImageContainer": {"success": True, "errors": None, "data": {}}}}
    client = _build_client(monkeypatch, body)

    resp = client.post("/vyos/container/image/update", json={"container_name": "missing"})
    assert resp.status_code == 400, resp.text
    assert "not found" in resp.text
    assert _FakeAsyncClient.last_url is None


def test_add_and_delete_image_resolve_the_configured_image(monkeypatch):
    """Op-mode add/delete container image take an image ref, not the container name."""
    for path, mutation, doc, timeout in (
        ("/vyos/container/image/add", "AddImageContainer", ADD_DOC, 300.0),
        ("/vyos/container/image/delete", "DeleteImageContainer", DELETE_DOC, 60.0),
    ):
        body = {"data": {mutation: {"success": True, "errors": None, "data": {"result": "ok"}}}}
        client = _build_client(monkeypatch, body)
        resp = client.post(path, json={"container_name": "web"})
        assert resp.status_code == 200, resp.text
        assert resp.json()["output"] == "ok"
        assert _FakeAsyncClient.last_json == {
            "query": doc,
            "variables": {"key": "test-api-key", "name": "nginx:1.27"},
        }
        assert _FakeAsyncClient.last_timeout == timeout


def test_delete_ref_posts_the_delete_mutation(monkeypatch):
    body = {"data": {"DeleteImageContainer": {"success": True, "errors": None, "data": {"result": None}}}}
    client = _build_client(monkeypatch, body)
    resp = client.post("/vyos/container/image/delete-ref", json={"image": "nginx:1.27"})
    assert resp.status_code == 200, resp.text
    assert resp.json() == {"success": True, "output": None, "error": None}
    assert _FakeAsyncClient.last_json == {
        "query": DELETE_DOC,
        "variables": {"key": "test-api-key", "name": "nginx:1.27"},
    }


def test_api_key_and_name_never_enter_the_query_text(monkeypatch):
    body = {"data": {"RestartContainer": {"success": True, "errors": None, "data": {"result": None}}}}
    client = _build_client(monkeypatch, body)
    client.post("/vyos/container/restart", json={"container_name": "web"})
    assert _FakeAsyncClient.last_json is not None
    query = _FakeAsyncClient.last_json["query"]
    assert "test-api-key" not in query
    assert "web" not in query


def test_mutations_come_from_the_registry_mapper(monkeypatch):
    class Tagged(ContainerMapper):
        def restart_mutation(self):
            return GraphQLMutation("RestartContainer", "tagged-restart")

    monkeypatch.setitem(CommandMapperRegistry._features, "container", Tagged)
    body = {"data": {"RestartContainer": {"success": True, "errors": None, "data": {"result": None}}}}
    client = _build_client(monkeypatch, body)
    resp = client.post("/vyos/container/restart", json={"container_name": "web"})
    assert resp.status_code == 200, resp.text
    assert _FakeAsyncClient.last_json is not None
    assert _FakeAsyncClient.last_json["query"] == "tagged-restart"


def test_delete_ref_refuses_a_stack_image_on_the_appliance(monkeypatch):
    monkeypatch.setenv("VYMANAGER_MODE", "appliance")
    monkeypatch.setattr(container_mod.appliance_mode, "is_stack_image_ref", lambda ref: ref == "nginx:1.27")
    client = _build_client(monkeypatch, {"data": {}})
    resp = client.post("/vyos/container/image/delete-ref", json={"image": "nginx:1.27"})
    assert resp.status_code == 400, resp.text
    assert resp.json()["detail"] == container_mod.appliance_mode.STACK_GUARD_DETAIL
    assert _FakeAsyncClient.last_url is None


def test_delete_refuses_a_configured_stack_image_on_the_appliance(monkeypatch):
    monkeypatch.setenv("VYMANAGER_MODE", "appliance")
    monkeypatch.setattr(container_mod.appliance_mode, "is_stack_image_ref", lambda ref: ref == "nginx:1.27")
    client = _build_client(monkeypatch, {"data": {}})
    resp = client.post("/vyos/container/image/delete", json={"container_name": "web"})
    assert resp.status_code == 400, resp.text
    assert resp.json()["detail"] == container_mod.appliance_mode.STACK_GUARD_DETAIL
    assert _FakeAsyncClient.last_url is None


def test_delete_image_refuses_a_stack_container_on_the_appliance(monkeypatch):
    monkeypatch.setenv("VYMANAGER_MODE", "appliance")
    client = _build_client(monkeypatch, {"data": {}})
    resp = client.post("/vyos/container/image/delete", json={"container_name": "vymanager-backend"})
    assert resp.status_code == 400, resp.text
    assert resp.json()["detail"] == container_mod.appliance_mode.STACK_GUARD_DETAIL
    assert _FakeAsyncClient.last_url is None


@pytest.mark.parametrize("config, detail", [
    ({"container": {"name": {"web": {"description": "x"}}}}, "No image configured for container web"),
    ({"container": {"name": {"web": {"image": "bad image"}}}}, "Invalid image reference on container web"),
])
def test_configured_image_must_be_a_valid_ref(monkeypatch, config, detail):
    client = _build_client(monkeypatch, {"data": {}})
    monkeypatch.setattr(_FakeService, "get_full_config", lambda self, refresh=False: config)
    for path in ("/vyos/container/image/add", "/vyos/container/image/update", "/vyos/container/image/delete"):
        resp = client.post(path, json={"container_name": "web"})
        assert resp.status_code == 400, resp.text
        assert resp.json()["detail"] == detail
    assert _FakeAsyncClient.last_url is None


@pytest.mark.parametrize("path", ["/vyos/container/image/add", "/vyos/container/image/update", "/vyos/container/log"])
def test_invalid_container_name_is_400_before_any_lookup(monkeypatch, path):
    client = _build_client(monkeypatch, {"data": {}})
    resp = client.post(path, json={"container_name": "web;id"})
    assert resp.status_code == 400, resp.text
    assert resp.json()["detail"] == container_mod._INVALID_CONTAINER_NAME
    assert _FakeAsyncClient.last_url is None


def test_graphql_body_that_is_not_an_object_is_502(monkeypatch):
    client = _build_client(monkeypatch, ["not", "an", "object"])
    resp = client.post("/vyos/container/image/pull", json={"image": "nginx:1.27"})
    assert resp.status_code == 502, resp.text
    assert resp.json()["detail"] == "GraphQL response is not a JSON object"


def test_graphql_string_errors_are_joined(monkeypatch):
    client = _build_client(monkeypatch, {"errors": ["T-one", {"message": "T-two"}]})
    resp = client.post("/vyos/container/image/pull", json={"image": "nginx:1.27"})
    assert resp.status_code == 200, resp.text
    assert resp.json() == {"success": False, "output": None, "error": "T-one; T-two"}


@pytest.mark.parametrize("body", [
    {"data": ["x"]},
    {"data": {"AddImageContainer": "x"}},
    {"data": {"AddImageContainer": {"success": False, "errors": None, "data": ["x"]}}},
])
def test_graphql_parts_that_are_not_objects_are_a_failed_reply(monkeypatch, body):
    client = _build_client(monkeypatch, body)
    resp = client.post("/vyos/container/image/pull", json={"image": "nginx:1.27"})
    assert resp.status_code == 200, resp.text
    assert resp.json() == {"success": False, "output": None, "error": "AddImageContainer failed"}


def test_graphql_empty_errors_names_the_mutation(monkeypatch):
    body = {"data": {"AddImageContainer": {"success": False, "errors": None, "data": None}}}
    client = _build_client(monkeypatch, body)

    resp = client.post("/vyos/container/image/pull", json={"image": "nginx:1.27"})
    assert resp.status_code == 200, resp.text
    assert resp.json()["success"] is False
    assert "AddImageContainer failed" in resp.json()["error"]


@pytest.mark.parametrize("version", ["1.4.3", "1.5", "2026.09.23-0027-rolling"])
def test_mapper_mutation_documents(version):
    """The exact documents the device receives; a re-pull uses AddImageContainer."""
    mapper = get_container_mapper(version)
    assert mapper.add_image_mutation() == GraphQLMutation("AddImageContainer", ADD_DOC)
    assert mapper.delete_image_mutation() == GraphQLMutation("DeleteImageContainer", DELETE_DOC)
    assert mapper.restart_mutation() == GraphQLMutation("RestartContainer", RESTART_DOC)


def test_invalid_image_ref_detail_names_the_image(monkeypatch):
    client = _build_client(monkeypatch, {"data": {}})
    for path in ("/vyos/container/image/pull", "/vyos/container/image/update-ref", "/vyos/container/image/delete-ref"):
        resp = client.post(path, json={"image": "bad image"})
        assert resp.status_code == 400, resp.text
        assert resp.json()["detail"] == container_mod._INVALID_IMAGE_REF
    assert _FakeAsyncClient.last_url is None
