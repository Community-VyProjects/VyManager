"""Tests for org-scoped database connections and middleware org derivation.

Pure helper tests run everywhere; connection and middleware tests need a
migrated database and skip without DATABASE_URL.
"""

import asyncio
import os
from types import SimpleNamespace

import pytest

from org_scope import is_system_admin_from_state, org_id_from_state

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


def test_system_admin_flag_tristate():
    assert is_system_admin_from_state(request_with_state(user_role="ADMIN")) is True
    assert is_system_admin_from_state(request_with_state(user_role="VIEWER")) is False
    # Role not resolved on this path (e.g. /session/*): caller must fetch.
    assert is_system_admin_from_state(request_with_state()) is None


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
            INSERT INTO sites (id, name, "createdAt", "updatedAt")
            VALUES ('s_orgscope', 'Org Scope Site', NOW(), NOW())
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
