"""Audit coverage: mutating admin calls are recorded with context columns."""

import asyncio
import base64
import hashlib
import hmac
import os

import pytest

requires_db = pytest.mark.skipif(
    not os.environ.get("DATABASE_URL"),
    reason="audit-coverage test needs DATABASE_URL",
)

SECRET = b"audit-coverage-secret"


def _cookie(token):
    sig = base64.b64encode(
        hmac.new(SECRET, token.encode(), hashlib.sha256).digest()).decode()
    return f"{token}.{sig}"


@requires_db
def test_admin_mutation_audited_with_context(monkeypatch):
    import asyncpg
    import session_cookie
    from fastapi.testclient import TestClient

    monkeypatch.setattr(session_cookie, "_secret", SECRET)
    db = os.environ["DATABASE_URL"]

    async def seed():
        conn = await asyncpg.connect(db)
        await conn.execute("DELETE FROM audit_logs")
        await conn.execute("DELETE FROM users WHERE id = 'u_au'")
        await conn.execute(
            "INSERT INTO users (id,email,name,role,\"emailVerified\","
            "\"createdAt\",\"updatedAt\") VALUES "
            "('u_au','au@cov.test','AU','ADMIN',true,NOW(),NOW())")
        await conn.execute(
            "INSERT INTO org_memberships (id,\"userId\",\"orgId\",\"orgRole\","
            "\"createdAt\",\"updatedAt\") VALUES "
            "('om_au','u_au','default','OWNER',NOW(),NOW())")
        await conn.execute(
            "INSERT INTO sessions (id,token,\"userId\",\"expiresAt\","
            "\"createdAt\",\"updatedAt\") VALUES "
            "('s_au','tok_au','u_au',NOW()+interval '1 hour',NOW(),NOW())")
        await conn.close()

    async def fetch_audit():
        conn = await asyncpg.connect(db)
        rows = await conn.fetch(
            'SELECT action, resource, "userEmail", "orgId"'
            ' FROM audit_logs ORDER BY "createdAt"')
        gets = await conn.fetchval(
            "SELECT COUNT(*) FROM audit_logs WHERE action LIKE 'GET%'")
        await conn.close()
        return rows, gets

    async def cleanup():
        conn = await asyncpg.connect(db)
        await conn.execute("DELETE FROM users WHERE id = 'u_au'")
        await conn.execute("DELETE FROM sites WHERE name = 'Audit Cov Site'")
        await conn.close()

    from app import app
    asyncio.run(seed())
    try:
        with TestClient(app) as client:
            client.cookies.set("better-auth.session_token", _cookie("tok_au"))
            client.get("/user-management/users")          # read -> not audited
            r = client.post("/session/sites",
                            json={"name": "Audit Cov Site", "description": "x"})
            assert r.status_code == 201
        rows, gets = asyncio.run(fetch_audit())
        assert gets == 0, "GET requests must not be audited"
        actions = {r["action"] for r in rows}
        assert "POST_SESSION" in actions
        site_row = next(r for r in rows if r["resource"] == "/session/sites")
        assert site_row["userEmail"] == "au@cov.test"
        assert site_row["orgId"] == "default"
    finally:
        asyncio.run(cleanup())
