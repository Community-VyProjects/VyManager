"""Column layouts follow the signed-in user, not the browser."""

import json
from pathlib import Path

from fastapi import FastAPI
from fastapi.testclient import TestClient

import routers.table_layouts as table_layouts

ROUTER = Path(__file__).resolve().parents[1] / "routers" / "table_layouts.py"

POLICIES = {
    "visible": ["action", "protocol"],
    "order": ["action", "protocol", "log"],
}
BRIDGE = {
    "visible": ["action"],
    "order": ["action", "log"],
}


class _Store:
    def __init__(self):
        self.rows = {}
        self.sql = []
        self.fail = False


class _Conn:
    def __init__(self, store: _Store):
        self.store = store

    async def fetchrow(self, sql, *args):
        self.store.sql.append(sql)
        if self.store.fail:
            raise RuntimeError("database unavailable")
        folded = " ".join(sql.split()).lower()
        if "insert into" in folded:
            assert "on conflict" in folded
            assert "||" in folded
            assert "jsonb_build_object" in folded
            _record_id, user_id, key, layout_json = args
            layouts = self.store.rows.setdefault(user_id, {})
            layouts[key] = json.loads(layout_json)
            return {"layouts": dict(layouts)}
        if "layouts -" in folded:
            user_id, key = args
            layouts = self.store.rows.get(user_id)
            if layouts is None:
                return None
            layouts.pop(key, None)
            return {"layouts": dict(layouts)}
        if folded.startswith("select"):
            user_id = args[0]
            layouts = self.store.rows.get(user_id)
            if layouts is None:
                return None
            return {"layouts": dict(layouts)}
        raise AssertionError(f"unexpected SQL: {sql}")


def _build(user_id, store=None, instance=False):
    store = store or _Store()
    conn = _Conn(store)

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
        if instance:
            request.state.instance = {"id": "inst-1"}
        return await call_next(request)

    app.include_router(table_layouts.router)
    return TestClient(app), store


def test_router_does_not_create_tables():
    source = ROUTER.read_text()
    assert "CREATE TABLE" not in source
    assert 'prefix="/user"' in source
    assert "require_permission" not in source
    assert "require_active_instance" not in source


def test_get_without_a_user_is_401():
    client, _store = _build(None)
    resp = client.get("/user/table-layouts")
    assert resp.status_code == 401
    assert resp.json()["detail"] == "Not authenticated"


def test_missing_row_is_empty_not_an_error():
    client, _store = _build("u1")
    resp = client.get("/user/table-layouts")
    assert resp.status_code == 200
    assert resp.json() == {"layouts": {}, "exists": False}


def test_layout_follows_the_session_user_not_another_account():
    store = _Store()
    alice, _ = _build("alice", store)
    bob, _ = _build("bob", store)

    saved = alice.put("/user/table-layouts/firewall-policies-columns", json=POLICIES)
    assert saved.status_code == 200, saved.text
    assert saved.json()["layouts"]["firewall-policies-columns"] == POLICIES

    bob_view = bob.get("/user/table-layouts")
    assert bob_view.status_code == 200
    assert bob_view.json() == {"layouts": {}, "exists": False}
    assert "alice" in store.rows
    assert "bob" not in store.rows


def test_body_cannot_name_the_owner():
    client, store = _build("alice")
    resp = client.put(
        "/user/table-layouts/firewall-policies-columns",
        json={**POLICIES, "userId": "bob"},
    )
    assert resp.status_code == 422
    assert store.rows == {}


def test_saving_one_table_does_not_erase_another():
    client, store = _build("alice")
    first = client.put("/user/table-layouts/firewall-policies-columns", json=POLICIES)
    assert first.status_code == 200, first.text
    second = client.put("/user/table-layouts/firewall-bridge-columns", json=BRIDGE)
    assert second.status_code == 200, second.text

    layouts = second.json()["layouts"]
    assert layouts["firewall-policies-columns"] == POLICIES
    assert layouts["firewall-bridge-columns"] == BRIDGE
    assert set(store.rows["alice"]) == {
        "firewall-policies-columns",
        "firewall-bridge-columns",
    }


def test_reset_deletes_one_table_and_leaves_the_other():
    client, _store = _build("alice")
    assert client.put("/user/table-layouts/firewall-policies-columns", json=POLICIES).status_code == 200
    assert client.put("/user/table-layouts/firewall-bridge-columns", json=BRIDGE).status_code == 200

    deleted = client.delete("/user/table-layouts/firewall-policies-columns")
    assert deleted.status_code == 200, deleted.text
    assert "firewall-policies-columns" not in deleted.json()["layouts"]
    assert deleted.json()["layouts"]["firewall-bridge-columns"] == BRIDGE


def test_save_does_not_require_an_active_instance():
    client, store = _build("alice", instance=False)
    resp = client.put("/user/table-layouts/firewall-policies-columns", json=POLICIES)
    assert resp.status_code == 200, resp.text
    assert store.rows["alice"]["firewall-policies-columns"] == POLICIES


def test_invalid_key_and_incoherent_columns_are_422():
    client, store = _build("alice")
    bad_key = client.put("/user/table-layouts/Firewall_Policies", json=POLICIES)
    assert bad_key.status_code == 422
    incoherent = client.put(
        "/user/table-layouts/firewall-policies-columns",
        json={"visible": ["missing"], "order": ["action"]},
    )
    assert incoherent.status_code == 422
    assert store.rows == {}


def test_database_error_is_500_without_the_exception_text():
    client, store = _build("alice")
    store.fail = True
    resp = client.get("/user/table-layouts")
    assert resp.status_code == 500
    assert resp.json() == {"detail": "Unable to read table layouts"}
    saved = client.put("/user/table-layouts/firewall-policies-columns", json=POLICIES)
    assert saved.status_code == 500
    assert saved.json() == {"detail": "Unable to save table layout"}


def test_malformed_stored_key_is_omitted():
    store = _Store()
    store.rows["alice"] = {
        "firewall-policies-columns": POLICIES,
        "not a key": {"visible": ["action"], "order": ["action"]},
        "firewall-bridge-columns": {"visible": "nope", "order": []},
    }
    client, _store = _build("alice", store)
    resp = client.get("/user/table-layouts")
    assert resp.status_code == 200
    assert list(resp.json()["layouts"]) == ["firewall-policies-columns"]


def test_backup_lists_layouts_after_users():
    from routers.session.session import BACKUP_TABLES

    assert "user_table_layouts" in BACKUP_TABLES
    assert BACKUP_TABLES.index("user_table_layouts") > BACKUP_TABLES.index("users")
