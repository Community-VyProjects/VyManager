"""NAT reorder reports a rejected commit as failure.

The service has already turned pyvyos HTTP 200 plus an error into status 400.
The endpoint must not report that as success.
"""

from types import SimpleNamespace

from fastapi import FastAPI
from fastapi.testclient import TestClient


def test_reorder_reports_rejected_commit(monkeypatch):
    async def allow(*_args, **_kwargs):
        return None

    class Service:
        def get_version(self):
            return "1.5"

        def execute_batch(self, batch):
            return SimpleNamespace(
                status=400,
                result="",
                error="translation requires address and/or port",
            )

    monkeypatch.setattr("routers.nat.nat.require_write_permission", allow)
    monkeypatch.setattr("routers.nat.nat.get_session_vyos_service", lambda _req: Service())

    from routers.nat.nat import router

    app = FastAPI()
    app.include_router(router)
    response = TestClient(app).post(
        "/vyos/nat/reorder",
        json={
            "nat_type": "destination",
            "rules": [{
                "old_number": 10,
                "new_number": 20,
                "rule_data": {"translation_redirect_port": "8080"},
            }],
        },
    )

    assert response.status_code == 200, response.text
    body = response.json()
    assert body["success"] is False
    assert "translation requires" in body["error"]
