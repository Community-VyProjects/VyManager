"""Stub-service TestClient for the HTTPS router, shared by the HTTPS tests."""

from types import SimpleNamespace

from fastapi import FastAPI
from fastapi.testclient import TestClient

ROUTER = "routers.https.https"


class HttpsService:
    def __init__(self, version="1.5", status=200, error=None, config=None):
        self.version = version
        self.status = status
        self.error = error
        self.config = config or {}
        self.executed = []

    def get_version(self):
        return self.version

    def get_full_config(self, refresh=False):
        return self.config

    def execute_batch(self, batch):
        if batch.is_empty():
            raise ValueError("Cannot execute empty batch")
        self.executed.append(batch.get_operations())
        return SimpleNamespace(status=self.status, result="", error=self.error)


def https_client(monkeypatch, service, session=None):
    """App with the HTTPS router; permissions allowed, session returns ``service``."""

    async def allow(*_args, **_kwargs):
        return None

    monkeypatch.setattr(f"{ROUTER}.require_write_permission", allow)
    monkeypatch.setattr(f"{ROUTER}.require_read_permission", allow)
    monkeypatch.setattr(
        f"{ROUTER}.get_session_vyos_service", session or (lambda _req: service)
    )

    from routers.https.https import router

    app = FastAPI()
    app.include_router(router)
    return TestClient(app)
