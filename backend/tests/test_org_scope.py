"""Tests for org-scoped database connections and middleware org derivation.

Pure helper tests run everywhere; connection and middleware tests need a
migrated database and skip without DATABASE_URL.
"""

import asyncio
import os
from types import SimpleNamespace

import pytest
from fastapi import HTTPException

import org_scope
from org_scope import (
    assert_row_in_acting_org,
    is_system_admin_from_state,
    org_id_from_state,
)

requires_db = pytest.mark.skipif(
    not os.environ.get("DATABASE_URL"),
    reason="org-scope connection tests need DATABASE_URL",
)


def request_with_state(**attrs):
    return SimpleNamespace(state=SimpleNamespace(**attrs))


# ---------------------------------------------------------------------------
# Pure helpers
# ---------------------------------------------------------------------------

def test_org_id_from_state_reads_middleware_org():
    request = request_with_state(org={"id": "default", "name": "Default"})
    assert org_id_from_state(request) == "default"


def test_org_id_from_state_none_without_org():
    assert org_id_from_state(request_with_state(org=None)) is None
    assert org_id_from_state(request_with_state()) is None


# ---------------------------------------------------------------------------
# assert_row_in_acting_org — the by-id IDOR row check (no DB; fake conn)
# ---------------------------------------------------------------------------

class FakeConn:
    """Minimal asyncpg-conn stand-in for the row-check branches."""

    def __init__(self, role="ADMIN", membership_orgs=None):
        self._role = role
        self._orgs = membership_orgs or []

    async def fetchval(self, query, *args):
        # _resolve_system_admin's "SELECT role FROM users WHERE id = $1"
        return self._role

    async def fetch(self, query, *args):
        # sole-membership lookup
        return [{"orgId": o} for o in self._orgs]


def run(coro):
    return asyncio.run(coro)


def test_row_check_noop_when_enforcement_off(monkeypatch):
    monkeypatch.setattr(org_scope, "ORG_ENFORCEMENT", False)
    req = request_with_state(user={"id": "u1"}, acting_org_id="orgA")
    # Cross-org id, but enforcement off → must not raise.
    run(assert_row_in_acting_org(req, FakeConn(role="VIEWER"), "orgB"))


def test_row_check_system_admin_bypasses(monkeypatch):
    monkeypatch.setattr(org_scope, "ORG_ENFORCEMENT", True)
    req = request_with_state(user={"id": "u1"}, acting_org_id="orgA")
    # role ADMIN → System Administrator → bypass even on a cross-org id.
    run(assert_row_in_acting_org(req, FakeConn(role="ADMIN"), "orgB"))


def test_row_check_same_org_passes(monkeypatch):
    monkeypatch.setattr(org_scope, "ORG_ENFORCEMENT", True)
    req = request_with_state(user={"id": "u1"}, acting_org_id="orgA")
    run(assert_row_in_acting_org(req, FakeConn(role="VIEWER"), "orgA"))


def test_row_check_cross_org_404(monkeypatch):
    monkeypatch.setattr(org_scope, "ORG_ENFORCEMENT", True)
    req = request_with_state(user={"id": "u1"}, acting_org_id="orgA")
    with pytest.raises(HTTPException) as exc:
        run(assert_row_in_acting_org(req, FakeConn(role="VIEWER"), "orgB"))
    assert exc.value.status_code == 404


def test_row_check_falls_back_to_sole_membership(monkeypatch):
    monkeypatch.setattr(org_scope, "ORG_ENFORCEMENT", True)
    # No acting_org_id/state.org; resolve from the sole membership.
    req = request_with_state(user={"id": "u1"})
    run(assert_row_in_acting_org(
        req, FakeConn(role="VIEWER", membership_orgs=["orgA"]), "orgA"))
    with pytest.raises(HTTPException) as exc:
        run(assert_row_in_acting_org(
            req, FakeConn(role="VIEWER", membership_orgs=["orgA"]), "orgB"))
    assert exc.value.status_code == 404


def test_row_check_null_row_org_404(monkeypatch):
    monkeypatch.setattr(org_scope, "ORG_ENFORCEMENT", True)
    req = request_with_state(user={"id": "u1"}, acting_org_id="orgA")
    with pytest.raises(HTTPException) as exc:
        run(assert_row_in_acting_org(req, FakeConn(role="VIEWER"), None))
    assert exc.value.status_code == 404


def test_enforcement_flag_env_parsing(monkeypatch):
    import importlib
    for val, expected in (("1", True), ("true", True), ("ON", True),
                          ("", False), ("0", False), ("no", False)):
        monkeypatch.setenv("ORG_ENFORCEMENT", val)
        reloaded = importlib.reload(org_scope)
        assert reloaded.ORG_ENFORCEMENT is expected, val
    monkeypatch.delenv("ORG_ENFORCEMENT", raising=False)
    importlib.reload(org_scope)


def test_system_admin_flag_tristate():
    assert is_system_admin_from_state(request_with_state(user_role="ADMIN")) is True
    assert is_system_admin_from_state(request_with_state(user_role="VIEWER")) is False
    # Role not resolved on this path (e.g. /session/*): caller must fetch.
    assert is_system_admin_from_state(request_with_state()) is None


# ---------------------------------------------------------------------------
# WebSocket org context (real database)
# ---------------------------------------------------------------------------

@requires_db
def test_ws_org_conn_resolves_instance_org_and_role():
    import asyncpg
    from org_scope import ws_org_conn

    async def main():
        pool = await asyncpg.create_pool(
            os.environ["DATABASE_URL"], min_size=1, max_size=2)
        conn0 = await pool.acquire()
        try:
            await conn0.execute("DELETE FROM users WHERE id = 'u_ws'")
            await conn0.execute("DELETE FROM sites WHERE id = 's_ws'")
            await conn0.execute(
                "INSERT INTO organizations (id,name,\"createdAt\",\"updatedAt\")"
                " VALUES ('org_ws','WS Org',NOW(),NOW())"
                " ON CONFLICT (id) DO NOTHING")
            await conn0.execute(
                "INSERT INTO users (id,email,name,role,\"emailVerified\","
                "\"createdAt\",\"updatedAt\") VALUES "
                "('u_ws','ws@t.test','WS','ADMIN',true,NOW(),NOW())")
            await conn0.execute(
                "INSERT INTO sites (id,name,\"orgId\",\"createdAt\",\"updatedAt\")"
                " VALUES ('s_ws','WS Site','org_ws',NOW(),NOW())")
            await conn0.execute(
                "INSERT INTO instances (id,\"siteId\",name,host,username,"
                "password,\"createdAt\",\"updatedAt\") VALUES "
                "('i_ws','s_ws','ws-r','192.0.2.9','v','p',NOW(),NOW())")

            fake_ws = SimpleNamespace(app=SimpleNamespace(
                state=SimpleNamespace(db_pool=pool)))
            async with ws_org_conn(fake_ws, "u_ws", "i_ws") as conn:
                assert await conn.fetchval(
                    "SELECT current_setting('app.org_id', true)") == "org_ws"
                # user u_ws is a deployment ADMIN -> System Administrator flag
                assert await conn.fetchval(
                    "SELECT current_setting('app.is_system_admin', true)"
                ) == "true"
        finally:
            await conn0.execute("DELETE FROM users WHERE id = 'u_ws'")
            await conn0.execute("DELETE FROM sites WHERE id = 's_ws'")
            await conn0.execute("DELETE FROM organizations WHERE id = 'org_ws'")
            await pool.release(conn0)
            await pool.close()

    asyncio.run(main())


# ---------------------------------------------------------------------------
# Connection scoping (real database)
# ---------------------------------------------------------------------------

@requires_db
def test_org_scoped_conn_sets_context_and_it_dies_with_transaction():
    import asyncpg
    from org_scope import org_scoped_conn

    async def main():
        pool = await asyncpg.create_pool(
            os.environ["DATABASE_URL"], min_size=1, max_size=1)
        try:
            async with org_scoped_conn(pool, "org_a", False) as conn:
                assert await conn.fetchval(
                    "SELECT current_setting('app.org_id', true)") == "org_a"
                assert await conn.fetchval(
                    "SELECT current_setting('app.is_system_admin', true)"
                ) == "false"
            # max_size=1 guarantees this is the same physical connection:
            # the settings must not have leaked past the transaction.
            async with pool.acquire() as conn:
                leaked = await conn.fetchval(
                    "SELECT current_setting('app.org_id', true)")
                assert leaked in (None, "")
        finally:
            await pool.close()

    asyncio.run(main())


@requires_db
def test_org_scoped_conn_operator_path_uses_empty_sentinel():
    import asyncpg
    from org_scope import org_scoped_conn

    async def main():
        pool = await asyncpg.create_pool(
            os.environ["DATABASE_URL"], min_size=1, max_size=1)
        try:
            async with org_scoped_conn(pool, None, True) as conn:
                assert await conn.fetchval(
                    "SELECT current_setting('app.org_id', true)") == ""
                assert await conn.fetchval(
                    "SELECT current_setting('app.is_system_admin', true)"
                ) == "true"
        finally:
            await pool.close()

    asyncio.run(main())


@requires_db
def test_empty_string_org_id_is_rejected_by_constraint():
    import asyncpg

    async def main():
        conn = await asyncpg.connect(os.environ["DATABASE_URL"])
        try:
            with pytest.raises(asyncpg.CheckViolationError):
                await conn.execute(
                    """
                    INSERT INTO organizations
                        (id, name, "createdAt", "updatedAt")
                    VALUES ('', 'Sentinel Collision', NOW(), NOW())
                    """)
        finally:
            await conn.close()

    asyncio.run(main())


# ---------------------------------------------------------------------------
# Middleware org derivation (real app, real database)
# ---------------------------------------------------------------------------

@requires_db
def test_middleware_derives_org_from_active_instance():
    import base64
    import hashlib
    import hmac

    import asyncpg
    from fastapi.testclient import TestClient

    import session_cookie
    from app import app

    secret = "org-scope-test-secret"

    async def seed():
        conn = await asyncpg.connect(os.environ["DATABASE_URL"])
        await conn.execute("""
            INSERT INTO users (id, email, name, role, "emailVerified",
                               "createdAt", "updatedAt")
            VALUES ('u_orgscope', 'orgscope@test.local', 'Org Scope',
                    'ADMIN', true, NOW(), NOW())
        """)
        await conn.execute("""
            INSERT INTO sessions (id, token, "userId", "expiresAt",
                                  "createdAt", "updatedAt")
            VALUES ('sess_orgscope', 'tok_orgscope', 'u_orgscope',
                    NOW() + interval '1 hour', NOW(), NOW())
        """)
        await conn.execute("""
            INSERT INTO sites (id, name, "orgId", "createdAt", "updatedAt")
            VALUES ('s_orgscope', 'Org Scope Site', 'default', NOW(), NOW())
        """)
        await conn.execute("""
            INSERT INTO instances (id, "siteId", name, host, username,
                                   password, "createdAt", "updatedAt")
            VALUES ('i_orgscope', 's_orgscope', 'org-scope-router',
                    '192.0.2.99', 'vyos', 'enc-placeholder', NOW(), NOW())
        """)
        await conn.execute("""
            INSERT INTO active_sessions (id, "userId", "instanceId",
                                         "sessionToken", "connectedAt")
            VALUES ('as_orgscope', 'u_orgscope', 'i_orgscope',
                    'tok_orgscope', NOW())
        """)
        await conn.close()

    async def cleanup():
        conn = await asyncpg.connect(os.environ["DATABASE_URL"])
        # users cascades sessions/active_sessions; sites cascades instances
        await conn.execute("DELETE FROM users WHERE id = 'u_orgscope'")
        await conn.execute("DELETE FROM sites WHERE id = 's_orgscope'")
        await conn.close()

    from fastapi import Request

    if not any(getattr(r, "path", None) == "/_test/org-state"
               for r in app.router.routes):
        @app.get("/_test/org-state")
        async def _org_state(request: Request):
            return {
                "org": getattr(request.state, "org", "unset"),
                "user_role": getattr(request.state, "user_role", "unset"),
            }

    original_secret = session_cookie._secret
    session_cookie._secret = secret.encode()
    try:
        asyncio.run(seed())
        signature = base64.b64encode(
            hmac.new(secret.encode(), b"tok_orgscope",
                     hashlib.sha256).digest()).decode()
        with TestClient(app) as client:
            client.cookies.set("better-auth.session_token",
                               f"tok_orgscope.{signature}")
            response = client.get("/_test/org-state")
        assert response.status_code == 200
        body = response.json()
        assert body["org"] == {"id": "default", "name": "Default"}
        assert body["user_role"] == "ADMIN"
    finally:
        session_cookie._secret = original_secret
        asyncio.run(cleanup())


# ---------------------------------------------------------------------------
# Multi-org context resolution: a system admin acts globally with no org_id;
# a non-admin member must still choose an org.
# ---------------------------------------------------------------------------

def _fake_request(pool, user_id):
    return SimpleNamespace(
        app=SimpleNamespace(state=SimpleNamespace(db_pool=pool)),
        state=SimpleNamespace(user={"id": user_id}),
    )


@requires_db
def test_multi_org_admin_acts_globally_without_org_id():
    import asyncpg

    async def body():
        pool = await asyncpg.create_pool(os.environ["DATABASE_URL"])
        try:
            async with pool.acquire() as c:
                await c.execute(
                    'INSERT INTO organizations (id,name,"createdAt","updatedAt")'
                    " VALUES ('org_g2','Org G2',NOW(),NOW())"
                    " ON CONFLICT (id) DO NOTHING")
                await c.execute(
                    'INSERT INTO users (id,email,name,role,"emailVerified",'
                    '"createdAt","updatedAt") VALUES'
                    " ('u_admin_g','admin_g@t.test','AG','ADMIN',true,NOW(),NOW()),"
                    " ('u_member_g','member_g@t.test','MG','VIEWER',true,NOW(),NOW())")
                for uid in ("u_admin_g", "u_member_g"):
                    await c.execute(
                        'INSERT INTO org_memberships (id,"userId","orgId","orgRole",'
                        '"createdAt","updatedAt") VALUES'
                        " ($1,$2,'default','MEMBER',NOW(),NOW()),"
                        " ($3,$2,'org_g2','MEMBER',NOW(),NOW())",
                        f"omg_{uid}_1", uid, f"omg_{uid}_2")

            # System admin, two orgs, no org_id -> global (bypass, empty org).
            req = _fake_request(pool, "u_admin_g")
            async with org_scope._handler_conn(req, None) as conn:
                sysadmin = await conn.fetchval(
                    "SELECT current_setting('app.is_system_admin', true)")
                org = await conn.fetchval(
                    "SELECT current_setting('app.org_id', true)")
            assert sysadmin == "true"
            assert org == ""
            assert req.state.is_system_admin is True
            assert req.state.acting_org_id is None

            # Non-admin, two orgs, no org_id -> must choose (400).
            req2 = _fake_request(pool, "u_member_g")
            raised = None
            try:
                async with org_scope._handler_conn(req2, None):
                    pass
            except HTTPException as exc:
                raised = exc
            assert raised is not None and raised.status_code == 400
        finally:
            async with pool.acquire() as c:
                await c.execute(
                    "DELETE FROM users WHERE id IN ('u_admin_g','u_member_g')")
                await c.execute("DELETE FROM organizations WHERE id='org_g2'")
            await pool.close()

    asyncio.run(body())
