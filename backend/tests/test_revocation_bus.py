"""Revocation bus: LISTEN/NOTIFY delivery, transaction coupling, emit points."""

import asyncio
import base64
import hashlib
import hmac
import os

import pytest

import revocation_bus

requires_db = pytest.mark.skipif(
    not os.environ.get("DATABASE_URL"),
    reason="revocation-bus tests need DATABASE_URL",
)

SECRET = b"revocation-bus-secret"


def test_payload_matches():
    assert revocation_bus.payload_matches("user:u1", user_id="u1")
    assert not revocation_bus.payload_matches("user:u2", user_id="u1")
    assert revocation_bus.payload_matches("instance:i1", instance_id="i1")
    assert not revocation_bus.payload_matches("instance:i2", instance_id="i1")
    assert not revocation_bus.payload_matches("malformed", user_id="u1")


@requires_db
def test_delivery_and_transaction_coupling():
    import asyncpg

    async def main():
        pool = await asyncpg.create_pool(
            os.environ["DATABASE_URL"], min_size=2, max_size=4)
        await revocation_bus.start(pool)
        q = revocation_bus.subscribe()
        try:
            # Committed emit is delivered.
            async with pool.acquire() as c:
                async with c.transaction():
                    await revocation_bus.emit(c, "user", "u_x")
            assert await asyncio.wait_for(q.get(), timeout=3) == "user:u_x"

            # Rolled-back emit is not delivered (pg_notify fires on commit).
            while not q.empty():
                q.get_nowait()
            async with pool.acquire() as c:
                tx = c.transaction()
                await tx.start()
                await revocation_bus.emit(c, "user", "u_rollback")
                await tx.rollback()
            with pytest.raises(asyncio.TimeoutError):
                await asyncio.wait_for(q.get(), timeout=1.5)
        finally:
            revocation_bus.unsubscribe(q)
            await revocation_bus.stop()
            await pool.close()

    asyncio.run(main())


def _cookie(token):
    sig = base64.b64encode(
        hmac.new(SECRET, token.encode(), hashlib.sha256).digest()).decode()
    return f"{token}.{sig}"


@requires_db
def test_token_revoke_emits_through_bus(monkeypatch):
    import asyncpg
    import session_cookie
    from fastapi.testclient import TestClient

    monkeypatch.setattr(session_cookie, "_secret", SECRET)
    db = os.environ["DATABASE_URL"]

    async def seed():
        conn = await asyncpg.connect(db)
        await conn.execute("DELETE FROM users WHERE id = 'u_rb'")
        await conn.execute(
            "INSERT INTO users (id,email,name,role,\"emailVerified\","
            "\"createdAt\",\"updatedAt\") VALUES "
            "('u_rb','rb@bus.test','RB','VIEWER',true,NOW(),NOW())")
        await conn.execute(
            "INSERT INTO org_memberships (id,\"userId\",\"orgId\",\"orgRole\","
            "\"createdAt\",\"updatedAt\") VALUES "
            "('om_rb','u_rb','default','MEMBER',NOW(),NOW())")
        await conn.execute(
            "INSERT INTO sessions (id,token,\"userId\",\"expiresAt\","
            "\"createdAt\",\"updatedAt\") VALUES "
            "('s_rb','tok_rb','u_rb',NOW()+interval '1 hour',NOW(),NOW())")
        await conn.close()

    async def cleanup():
        conn = await asyncpg.connect(db)
        await conn.execute("DELETE FROM users WHERE id = 'u_rb'")
        await conn.close()

    from app import app
    asyncio.run(seed())
    try:
        # The app's lifespan starts the bus listener on its own pool; the
        # module-global subscriber registry receives its fan-out.
        with TestClient(app) as client:
            q = revocation_bus.subscribe()
            try:
                client.cookies.set(
                    "better-auth.session_token", _cookie("tok_rb"))
                created = client.post(
                    "/tokens",
                    json={"name": "rb", "scopes": ["read"],
                          "allowed_instance_ids": [], "allowed_site_ids": []})
                assert created.status_code == 200
                token_id = created.json()["metadata"]["id"]

                revoked = client.delete(f"/tokens/{token_id}")
                assert revoked.status_code == 200

                # The revoke emits a single user-scoped payload; the owner's
                # streams (cookie- and token-authenticated alike) key on the
                # user id, so user:<owner> tears them all down. The old
                # token:<id> emit was dead — payload_matches has no token
                # branch — and was dropped, so it must NOT appear.
                seen = set()

                async def drain():
                    try:
                        for _ in range(4):
                            seen.add(await asyncio.wait_for(q.get(), timeout=3))
                    except asyncio.TimeoutError:
                        pass

                asyncio.run(drain())
                assert "user:u_rb" in seen
                assert f"token:{token_id}" not in seen
            finally:
                revocation_bus.unsubscribe(q)
    finally:
        asyncio.run(cleanup())
