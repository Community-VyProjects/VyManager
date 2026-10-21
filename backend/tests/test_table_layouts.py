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


def test_read_for_a_different_user_is_403():
    client, conn = _build("alice")
    resp = client.get("/user/table-layouts?asUser=bob")
    assert resp.status_code == 403
    assert resp.json()["detail"] == "Signed-in user changed"
    assert conn.calls == 0


def test_missing_row_is_empty_not_an_error():
    client, _conn = _build("u1")
    resp = client.get("/user/table-layouts")
    assert resp.status_code == 200
    assert resp.json()["layouts"] == {}
    assert resp.json()["exists"] is False
    assert resp.json()["userId"] == "u1"


def test_body_cannot_name_the_owner():
    client, conn = _build("alice")
    resp = client.put(
        "/user/table-layouts/firewall-policies-columns",
        json={**POLICIES, "userId": "bob"},
    )
    assert resp.status_code == 422
    assert conn.calls == 0


def test_unknown_key_is_422():
    client, conn = _build("alice")
    resp = client.put("/user/table-layouts/not-a-table", json=POLICIES)
    assert resp.status_code == 422
    assert conn.calls == 0


def test_write_for_a_different_user_is_403():
    client, conn = _build("alice")
    saved = client.put(
        "/user/table-layouts/firewall-policies-columns?asUser=bob",
        json=POLICIES,
    )
    assert saved.status_code == 403
    assert conn.calls == 0
    deleted = client.delete("/user/table-layouts/firewall-policies-columns?asUser=bob")
    assert deleted.status_code == 403
    assert conn.calls == 0


def test_stale_save_does_not_write():
    from datetime import datetime

    conn = _Conn(row={
        "layouts": {"firewall-policies-columns": {**POLICIES, "updatedAt": "t1"}},
        "updatedAt": datetime(2026, 1, 1),
    })
    client, conn = _build("alice", conn=conn)
    resp = client.put("/user/table-layouts/firewall-policies-columns", json=POLICIES)
    assert resp.status_code == 409
    assert resp.json()["detail"]["layouts"]["firewall-policies-columns"]["visible"] == ["action", "protocol"]
    assert conn.calls == 1
    client, conn = _build("alice")
    bad_key = client.put("/user/table-layouts/Firewall_Policies", json=POLICIES)
    assert bad_key.status_code == 422
    incoherent = client.put(
        "/user/table-layouts/firewall-policies-columns",
        json={"visible": ["missing"], "order": ["action"]},
    )
    assert incoherent.status_code == 422
    assert conn.calls == 0


class _Script:
    def __init__(self, rows):
        self.rows = list(rows)
        self.calls = 0
        self.sql = []

    async def fetchrow(self, sql, *args):
        self.calls += 1
        self.sql.append(sql)
        if not self.rows:
            return None
        return self.rows.pop(0)


def test_insert_race_on_a_different_table_merges_instead_of_409():
    bridge = {
        "layouts": {
            "firewall-bridge-columns": {
                "visible": ["action"],
                "order": ["action"],
                "updatedAt": "t1",
            }
        },
        "updatedAt": None,
    }
    merged = {
        "layouts": {
            "firewall-bridge-columns": bridge["layouts"]["firewall-bridge-columns"],
            "firewall-policies-columns": {**POLICIES, "updatedAt": "t2"},
        },
        "updatedAt": None,
    }
    conn = _Script([None, None, bridge, merged])
    client, conn = _build("alice", conn=conn)
    resp = client.put("/user/table-layouts/firewall-policies-columns", json=POLICIES)
    assert resp.status_code == 200, resp.text
    assert "firewall-policies-columns" in resp.json()["layouts"]
    assert any("NOT (layouts ?" in sql for sql in conn.sql)


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
        },
        "updatedAt": None,
    })
    client, _conn = _build("alice", conn=conn)
    resp = client.get("/user/table-layouts")
    assert resp.status_code == 200
    assert list(resp.json()["layouts"]) == ["firewall-policies-columns"]


def test_malformed_stored_key_can_be_replaced_and_deleted():
    broken = {
        "layouts": {
            "firewall-policies-columns": {"visible": "nope", "order": [], "updatedAt": "t-bad"},
        },
        "updatedAt": None,
    }
    replaced = {
        "layouts": {"firewall-policies-columns": {**POLICIES, "updatedAt": "t2"}},
        "updatedAt": None,
    }
    conn = _Script([broken, replaced])
    client, conn = _build("alice", conn=conn)
    saved = client.put("/user/table-layouts/firewall-policies-columns", json=POLICIES)
    assert saved.status_code == 200, saved.text
    assert any("layouts->$2 = $4::jsonb" in sql for sql in conn.sql)

    cleared = {"layouts": {}, "updatedAt": None}
    conn = _Script([broken, cleared])
    client, conn = _build("alice", conn=conn)
    deleted = client.delete("/user/table-layouts/firewall-policies-columns")
    assert deleted.status_code == 200, deleted.text
    assert any("layouts - $2" in sql for sql in conn.sql)


def test_backup_lists_layouts_after_users():
    from routers.session.session import BACKUP_TABLES

    assert "user_table_layouts" in BACKUP_TABLES
    assert BACKUP_TABLES.index("user_table_layouts") > BACKUP_TABLES.index("users")
