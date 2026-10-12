"""Config discard goes through VyOSService.commit_operations.

A rejected discard must not overwrite the saved baseline.
"""

from fastapi import FastAPI
from fastapi.testclient import TestClient
from pyvyos.core.rest_client import ApiResponse


def test_discard_rejected_commit_does_not_save_baseline(monkeypatch):
    saved = []

    async def allow(*_args, **_kwargs):
        return None

    class Service:
        def get_full_config(self, refresh=False):
            return {"nat": {"destination": {"rule": {"10": {"description": "live"}}}}}

        def commit_operations(self, operations):
            return ApiResponse(status=400, request={}, result={}, error="rejected")

    monkeypatch.setattr("routers.config.config.require_write_permission", allow)
    monkeypatch.setattr("routers.config.config.get_session_vyos_service", lambda _req: Service())
    monkeypatch.setattr("routers.config.config.reconcile_baseline", lambda _id, _cfg: {"nat": {}})
    monkeypatch.setattr("routers.config.config.set_saved_config", lambda *args: saved.append(args))

    from routers.config.config import router

    app = FastAPI()

    @app.middleware("http")
    async def add_instance(request, call_next):
        request.state.instance = {"id": "inst"}
        return await call_next(request)

    app.include_router(router)
    response = TestClient(app).post("/vyos/config/discard")

    assert response.status_code == 200, response.text
    body = response.json()
    assert body["success"] is False
    assert "rejected" in (body.get("error") or "")
    assert saved == []
