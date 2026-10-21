"""Column layout HTTP behavior that does not need a database.

Merge, delete, and user isolation run against Postgres in
test_table_layouts_db.py. This file does not reimplement that SQL.
"""

from fastapi import FastAPI
from fastapi.testclient import TestClient

import routers.table_layouts as table_layouts

POLICIES = {
    "visible": ["action", "protocol"],
    "order": ["action", "protocol", "log"],
}


class _Conn:
    def __init__(self, fail=False, row=None):
        self.fail = fail
        self.row = row
        self.calls = 0

    async def fetchrow(self, sql, *args):
        self.calls += 1
        if self.fail:
            raise RuntimeError("database unavailable")
        return self.row


def _build(user_id, conn=None, scopes=None):
    conn = conn or _Conn()

    async def _override():
        yield conn

    app = FastAPI()
    app.dependency_overrides[table_layouts.org_conn_self] = _override

    @app.middleware("http")
    async def _inject_state(request, call_next):
        if user_id is not None:
            request.state.user = {"id": user_id, "email": f"{user_id}@example.com"}
        else:
            request.state.user = None
        if scopes is not None:
            request.state.api_token_scopes = scopes
        return await call_next(request)

    app.include_router(table_layouts.router)
    return TestClient(app), conn


def test_get_without_a_user_is_401():
    client, conn = _build(None)
    resp = client.get("/user/table-layouts")
    assert resp.status_code == 401
    assert resp.json()["detail"] == "Not authenticated"
    assert conn.calls == 0


def test_missing_row_is_empty_not_an_error():
    client, _conn = _build("u1")
    resp = client.get("/user/table-layouts")
    assert resp.status_code == 200
    assert resp.json() == {"layouts": {}, "exists": False}


def test_body_cannot_name_the_owner():
    client, conn = _build("alice")
    resp = client.put(
        "/user/table-layouts/firewall-policies-columns",
        json={**POLICIES, "userId": "bob"},
    )
    assert resp.status_code == 422
    assert conn.calls == 0


def test_invalid_key_and_incoherent_columns_are_422():
    client, conn = _build("alice")
    bad_key = client.put("/user/table-layouts/Firewall_Policies", json=POLICIES)
    assert bad_key.status_code == 422
    incoherent = client.put(
        "/user/table-layouts/firewall-policies-columns",
        json={"visible": ["missing"], "order": ["action"]},
    )
    assert incoherent.status_code == 422
    assert conn.calls == 0


def test_read_only_token_cannot_write_or_delete():
    client, conn = _build("alice", scopes=["read"])
    saved = client.put("/user/table-layouts/firewall-policies-columns", json=POLICIES)
    assert saved.status_code == 403
    assert "read-only" in saved.json()["detail"]
    deleted = client.delete("/user/table-layouts/firewall-policies-columns")
    assert deleted.status_code == 403
    assert conn.calls == 0


def test_read_only_token_can_read():
    client, _conn = _build("alice", scopes=["read"])
    resp = client.get("/user/table-layouts")
    assert resp.status_code == 200
    assert resp.json()["exists"] is False


def test_database_error_is_500_without_the_exception_text():
    client, _conn = _build("alice", conn=_Conn(fail=True))
    resp = client.get("/user/table-layouts")
    assert resp.status_code == 500
    assert resp.json() == {"detail": "Unable to read table layouts"}
    saved = client.put("/user/table-layouts/firewall-policies-columns", json=POLICIES)
    assert saved.status_code == 500
    assert saved.json() == {"detail": "Unable to save table layout"}


def test_malformed_stored_key_is_omitted():
    conn = _Conn(row={
        "layouts": {
            "firewall-policies-columns": POLICIES,
            "not a key": {"visible": ["action"], "order": ["action"]},
            "firewall-bridge-columns": {"visible": "nope", "order": []},
        }
    })
    client, _conn = _build("alice", conn=conn)
    resp = client.get("/user/table-layouts")
    assert resp.status_code == 200
    assert list(resp.json()["layouts"]) == ["firewall-policies-columns"]


def test_backup_lists_layouts_after_users():
    from routers.session.session import BACKUP_TABLES

    assert "user_table_layouts" in BACKUP_TABLES
    assert BACKUP_TABLES.index("user_table_layouts") > BACKUP_TABLES.index("users")
