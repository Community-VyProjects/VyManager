"""Restore-safety tests: empty-system close + typed confirmation.

The env-helper test runs everywhere; the endpoint tests need a migrated
database and skip without DATABASE_URL.
"""

import base64
import hashlib
import hmac
import os

import pytest

requires_db = pytest.mark.skipif(
    not os.environ.get("DATABASE_URL"),
    reason="restore-safety endpoint tests need DATABASE_URL",
)

SECRET = b"backup-safety-secret"


def test_empty_restore_enabled_env_parsing(monkeypatch):
    import routers.session.session as S
    for val, expected in (("1", True), ("true", True), ("ON", True),
                          ("", False), ("0", False), ("no", False)):
        monkeypatch.setenv("VYMANAGER_ALLOW_EMPTY_RESTORE", val)
        assert S._empty_restore_enabled() is expected, val
    monkeypatch.delenv("VYMANAGER_ALLOW_EMPTY_RESTORE", raising=False)
    assert S._empty_restore_enabled() is False


def _cookie(token):
    sig = base64.b64encode(
        hmac.new(SECRET, token.encode(), hashlib.sha256).digest()).decode()
    return f"{token}.{sig}"


@requires_db
def test_confirm_required_and_empty_close(monkeypatch):
    import asyncio

    import asyncpg
    import session_cookie
    from fastapi.testclient import TestClient

    monkeypatch.setattr(session_cookie, "_secret", SECRET)
    db = os.environ["DATABASE_URL"]

    async def seed():
        conn = await asyncpg.connect(db)
        await conn.execute("DELETE FROM users")
        await conn.execute(
            "INSERT INTO users (id,email,name,role,\"emailVerified\","
            "\"createdAt\",\"updatedAt\") VALUES "
            "('u_bk','bk@safety.test','BK','ADMIN',true,NOW(),NOW())")
        await conn.execute(
            "INSERT INTO sessions (id,token,\"userId\",\"expiresAt\","
            "\"createdAt\",\"updatedAt\") VALUES "
            "('s_bk','tok_bk','u_bk',NOW()+interval '1 hour',NOW(),NOW())")
        await conn.close()

    async def wipe_users():
        conn = await asyncpg.connect(db)
        await conn.execute("DELETE FROM users")
        await conn.close()

    async def cleanup():
        conn = await asyncpg.connect(db)
        await conn.execute("DELETE FROM users WHERE id = 'u_bk'")
        await conn.close()

    from app import app
    asyncio.run(seed())
    try:
        with TestClient(app) as client:
            client.cookies.set("better-auth.session_token", _cookie("tok_bk"))
            backup = client.post("/session/backup", json={"passphrase": "pw"})
            assert backup.status_code == 200
            blob = backup.content

            def restore(mode, confirm):
                return client.post(
                    "/session/restore",
                    files={"file": ("b.vymgr", blob)},
                    data={"passphrase": "pw", "mode": mode, "confirm": confirm})

            assert restore("merge", "").status_code == 400
            assert restore("merge", "wrong").status_code == 400
            assert restore("merge", "merge").status_code == 200

            # Empty-system close: no users, no cookie, no env -> 403.
            asyncio.run(wipe_users())
            with TestClient(app) as anon:
                r = anon.post(
                    "/session/restore",
                    files={"file": ("b.vymgr", b"x")},
                    data={"passphrase": "pw", "mode": "merge",
                          "confirm": "merge"})
                assert r.status_code == 403
                monkeypatch.setenv("VYMANAGER_ALLOW_EMPTY_RESTORE", "1")
                r2 = anon.post(
                    "/session/restore",
                    files={"file": ("b.vymgr", b"x")},
                    data={"passphrase": "pw", "mode": "merge",
                          "confirm": "merge"})
                # Gate opens; the dummy file then fails to decrypt (400).
                assert r2.status_code == 400
    finally:
        asyncio.run(cleanup())
