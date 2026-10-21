"""Column layout SQL runs against Postgres. The unit file does not fake it."""

import os
from pathlib import Path

import asyncpg
import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

import routers.table_layouts as table_layouts

MIGRATION = (
    Path(__file__).resolve().parents[2]
    / "frontend"
    / "prisma"
    / "migrations"
    / "20261021120000_add_user_table_layouts"
    / "migration.sql"
)

POLICIES = {
    "visible": ["action", "protocol"],
    "order": ["action", "protocol", "log"],
}
BRIDGE = {
    "visible": ["action"],
    "order": ["action", "log"],
}

pytestmark = pytest.mark.skipif(
    not os.environ.get("DATABASE_URL"),
    reason="column layout SQL needs DATABASE_URL",
)


def _client(user_id: str) -> TestClient:
    async def _override():
        conn = await asyncpg.connect(os.environ["DATABASE_URL"])
        try:
            yield conn
        finally:
            await conn.close()

    app = FastAPI()
    app.dependency_overrides[table_layouts.org_conn_self] = _override

    @app.middleware("http")
    async def _inject_state(request, call_next):
        request.state.user = {"id": user_id, "email": f"{user_id}@example.com"}
        return await call_next(request)

    app.include_router(table_layouts.router)
    return TestClient(app)


async def _prepare():
    conn = await asyncpg.connect(os.environ["DATABASE_URL"])
    try:
        await conn.execute(MIGRATION.read_text())
        await conn.execute(
            'DELETE FROM user_table_layouts WHERE "userId" LIKE $1',
            "layout-test-%",
        )
    finally:
        await conn.close()


def test_postgres_merge_isolates_users_and_deletes_one_table():
    import asyncio

    asyncio.run(_prepare())
    alice = _client("layout-test-alice")
    bob = _client("layout-test-bob")

    first = alice.put("/user/table-layouts/firewall-policies-columns", json=POLICIES)
    assert first.status_code == 200, first.text
    policies_rev = first.json()["revisions"]["firewall-policies-columns"]
    assert policies_rev
    second = alice.put("/user/table-layouts/firewall-bridge-columns", json=BRIDGE)
    assert second.status_code == 200, second.text
    layouts = second.json()["layouts"]
    assert layouts["firewall-policies-columns"] == POLICIES
    assert layouts["firewall-bridge-columns"] == BRIDGE
    assert second.json()["revisions"]["firewall-policies-columns"] == policies_rev

    bob_view = bob.get("/user/table-layouts")
    assert bob_view.status_code == 200
    assert bob_view.json()["exists"] is False

    stale = alice.put(
        "/user/table-layouts/firewall-policies-columns",
        json={**POLICIES, "basedOn": "2000-01-01T00:00:00Z"},
    )
    assert stale.status_code == 409
    assert stale.json()["detail"]["revisions"]["firewall-policies-columns"] == policies_rev

    deleted = alice.delete(
        f"/user/table-layouts/firewall-policies-columns?basedOn={policies_rev}"
    )
    assert deleted.status_code == 200, deleted.text
    assert "firewall-policies-columns" not in deleted.json()["layouts"]
    assert deleted.json()["layouts"]["firewall-bridge-columns"] == BRIDGE

    again = alice.get("/user/table-layouts")
    assert again.json()["layouts"]["firewall-bridge-columns"] == BRIDGE
    assert "firewall-policies-columns" not in again.json()["layouts"]
