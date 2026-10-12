"""A VyOS commit error on HTTP 200 must not be reported as success.

pyvyos keeps status 200 and sets error when the API body says success=false.
NAT, NAT64, and NAT66 batch and reorder all go through that client.
"""

from types import SimpleNamespace

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from pyvyos.core.rest_client import commit_accepted


def test_commit_accepted_rejects_http_200_with_error():
    ok, error = commit_accepted(SimpleNamespace(
        status=200,
        error="API Error 200: translation requires address and/or port",
    ))
    assert ok is False
    assert error is not None
    assert "translation requires" in error


def test_commit_accepted_allows_http_200_without_error():
    ok, error = commit_accepted(SimpleNamespace(status=200, error=False))
    assert ok is True
    assert error is None


class _FailingService:
    def get_version(self):
        return "1.5"

    def execute_batch(self, batch):
        return SimpleNamespace(
            status=200,
            result="",
            error="API Error 200: translation requires address and/or port",
        )


def _post(monkeypatch, module_path, router_attr, path, body):
    async def allow(*_args, **_kwargs):
        return None

    monkeypatch.setattr(f"{module_path}.require_write_permission", allow)
    monkeypatch.setattr(
        f"{module_path}.get_session_vyos_service",
        lambda _req: _FailingService(),
    )
    module = __import__(module_path, fromlist=[router_attr])
    app = FastAPI()
    app.include_router(getattr(module, router_attr))
    return TestClient(app).post(path, json=body)


CASES = [
    (
        "routers.nat.nat",
        "/vyos/nat/batch",
        {
            "rule_number": 10,
            "nat_type": "destination",
            "operations": [{"op": "set_destination_rule"}],
        },
    ),
    (
        "routers.nat.nat",
        "/vyos/nat/reorder",
        {
            "nat_type": "destination",
            "rules": [{"old_number": 10, "new_number": 20, "rule_data": {"description": "probe"}}],
        },
    ),
    (
        "routers.nat64.nat64",
        "/vyos/nat64/batch",
        {"rule_number": 10, "operations": [{"op": "set_source_rule"}]},
    ),
    (
        "routers.nat64.nat64",
        "/vyos/nat64/reorder",
        {"rules": [{"old_number": 10, "new_number": 20, "rule_data": {"description": "probe"}}]},
    ),
    (
        "routers.nat66.nat66",
        "/vyos/nat66/batch",
        {
            "rule_number": 10,
            "rule_type": "source",
            "operations": [{"op": "set_source_rule"}],
        },
    ),
    (
        "routers.nat66.nat66",
        "/vyos/nat66/reorder",
        {
            "rule_type": "destination",
            "rules": [{"old_number": 10, "new_number": 20, "rule_data": {"description": "probe"}}],
        },
    ),
]


@pytest.mark.parametrize("module_path, path, body", CASES)
def test_http_200_vyos_error_is_not_success(monkeypatch, module_path, path, body):
    response = _post(monkeypatch, module_path, "router", path, body)
    assert response.status_code == 200, response.text
    payload = response.json()
    assert payload["success"] is False
    assert payload["data"] is None
    assert "translation requires" in payload["error"]
