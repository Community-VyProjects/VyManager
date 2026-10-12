"""DNAT reorder must recreate the fields VyOS verify requires.

A destination rule with only a redirect, or only a load-balance backend, is
valid. Dropping those leaves on recreate makes VyOS reject the whole commit,
so the rules never move. A VyOS error returned as HTTP 200 must not be
reported as success.
"""

from pathlib import Path
from types import SimpleNamespace

from fastapi import FastAPI
from fastapi.testclient import TestClient


def _client(monkeypatch, service):
    async def allow(*_args, **_kwargs):
        return None

    monkeypatch.setattr("routers.nat.nat.require_write_permission", allow)
    monkeypatch.setattr(
        "routers.nat.nat.get_session_vyos_service",
        lambda _req: service,
    )
    from routers.nat.nat import router

    app = FastAPI()
    app.include_router(router)
    return TestClient(app)


def test_destination_reorder_emits_redirect_and_load_balance_backend(monkeypatch):
    captured = {}

    class Service:
        def get_version(self):
            return "1.5"

        def execute_batch(self, batch):
            captured["ops"] = batch.get_operations()
            return SimpleNamespace(status=200, result="", error=False)

    client = _client(monkeypatch, Service())
    response = client.post(
        "/vyos/nat/reorder",
        json={
            "nat_type": "destination",
            "rules": [
                {
                    "old_number": 20,
                    "new_number": 10,
                    "rule_data": {
                        "protocol": "tcp",
                        "inbound_interface_name": "eth2",
                        "translation_redirect_port": "8080",
                    },
                },
                {
                    "old_number": 10,
                    "new_number": 20,
                    "rule_data": {
                        "protocol": "tcp",
                        "load_balance_backends": [{"name": "10.0.0.2", "weight": "50"}],
                    },
                },
            ],
        },
    )
    assert response.status_code == 200, response.text
    body = response.json()
    assert body["success"] is True
    paths = [(op["op"], op["path"]) for op in captured["ops"]]
    assert (
        "set",
        ["nat", "destination", "rule", "10", "translation", "redirect", "port", "8080"],
    ) in paths
    assert (
        "set",
        ["nat", "destination", "rule", "20", "load-balance", "backend", "10.0.0.2"],
    ) in paths
    assert (
        "set",
        ["nat", "destination", "rule", "20", "load-balance", "backend", "10.0.0.2", "weight", "50"],
    ) in paths


def test_reorder_reports_vyos_http_200_failure(monkeypatch):
    class Service:
        def get_version(self):
            return "1.5"

        def execute_batch(self, batch):
            return SimpleNamespace(
                status=200,
                result="",
                error="API Error 200: translation requires address and/or port",
            )

    client = _client(monkeypatch, Service())
    response = client.post(
        "/vyos/nat/reorder",
        json={
            "nat_type": "destination",
            "rules": [
                {
                    "old_number": 10,
                    "new_number": 20,
                    "rule_data": {"description": "probe"},
                }
            ],
        },
    )
    assert response.status_code == 200, response.text
    body = response.json()
    assert body["success"] is False
    assert body["data"] is None
    assert "translation requires" in body["error"]


def test_nat_page_reorder_uses_full_rule_data():
    """The drag-save path must not grow a second hand-picked field list."""
    page = (
        Path(__file__).resolve().parents[2]
        / "frontend/src/app/network/nat/page.tsx"
    ).read_text()
    save = page.split("const handleSaveReorder", 1)[1].split("const filteredRules", 1)[0]
    assert "natService.ruleDataForReorder(selectedType, rule)" in save
    assert "translation_address:" not in save
    assert "ruleData = {" not in save
