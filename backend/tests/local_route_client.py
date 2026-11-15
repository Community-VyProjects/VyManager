"""A TestClient on the local-route router with a stub VyOS service."""

from types import SimpleNamespace

from fastapi import FastAPI
from fastapi.testclient import TestClient

MODULE = "routers.local_route.local_route"


def local_route_client(monkeypatch, version, full_config=None):
    """Return (client, executed); executed holds one [(op, path), ...] per commit."""
    executed = []

    async def allow(*_args, **_kwargs):
        return None

    class Service:
        def get_version(self):
            return version

        def get_full_config(self, refresh=False):
            return full_config or {}

        def execute_batch(self, batch):
            if batch.is_empty():
                raise ValueError("Cannot execute empty batch")
            executed.append([(item["op"], item["path"]) for item in batch.get_operations()])
            return SimpleNamespace(status=200, result="", error=None)

    monkeypatch.setattr(f"{MODULE}.require_read_permission", allow)
    monkeypatch.setattr(f"{MODULE}.require_write_permission", allow)
    monkeypatch.setattr(f"{MODULE}.get_session_vyos_service", lambda _req: Service())

    router = __import__(MODULE, fromlist=["router"]).router
    app = FastAPI()
    app.include_router(router)
    return TestClient(app), executed
