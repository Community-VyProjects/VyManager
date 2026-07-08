"""GET /session/organizations — the caller's memberships + org_ui_visible."""

import asyncio
import base64
import hashlib
import hmac
import os

import pytest

requires_db = pytest.mark.skipif(
    not os.environ.get("DATABASE_URL"),
    reason="organizations endpoint test needs DATABASE_URL")

SECRET = b"orgs-endpoint-secret"


def _cookie(token):
    sig = base64.b64encode(
        hmac.new(SECRET, token.encode(), hashlib.sha256).digest()).decode()
    return f"{token}.{sig}"


@requires_db
def test_org_ui_visible_tracks_membership_count(monkeypatch):
    import asyncpg
    import session_cookie
    from fastapi.testclient import TestClient

    monkeypatch.setattr(session_cookie, "_secret", SECRET)
    db = os.environ["DATABASE_URL"]

    async def seed():
        conn = await asyncpg.connect(db)
        await conn.execute("DELETE FROM users WHERE id IN ('u_one','u_two')")
        await conn.execute(
            "DELETE FROM organizations WHERE id = 'org_extra'")
        await conn.execute(
            'INSERT INTO organizations (id,name,"createdAt","updatedAt")'
            " VALUES ('org_extra','Extra Org',NOW(),NOW())")
        for uid in ("u_one", "u_two"):
            await conn.execute(
                'INSERT INTO users (id,email,name,role,"emailVerified",'
                '"createdAt","updatedAt") VALUES '
                f"('{uid}','{uid}@t.test','U','VIEWER',true,NOW(),NOW())")
            await conn.execute(
                'INSERT INTO sessions (id,token,"userId","expiresAt",'
                '"createdAt","updatedAt") VALUES '
                f"('s_{uid}','tok_{uid}','{uid}',NOW()+interval '1 h',"
                "NOW(),NOW())")
        # u_one: one membership; u_two: two.
        await conn.execute(
            'INSERT INTO org_memberships (id,"userId","orgId","orgRole",'
            '"createdAt","updatedAt") VALUES '
            "('mo1','u_one','default','MEMBER',NOW(),NOW()),"
            "('mo2','u_two','default','MEMBER',NOW(),NOW()),"
            "('mo3','u_two','org_extra','ADMIN',NOW(),NOW())")
        await conn.close()

    async def cleanup():
        conn = await asyncpg.connect(db)
        await conn.execute("DELETE FROM users WHERE id IN ('u_one','u_two')")
        await conn.execute("DELETE FROM organizations WHERE id = 'org_extra'")
        await conn.close()

    from app import app
    asyncio.run(seed())
    try:
        with TestClient(app) as client:
            client.cookies.set("better-auth.session_token", _cookie("tok_u_one"))
            one = client.get("/session/organizations").json()
            assert one["org_ui_visible"] is False
            assert [o["name"] for o in one["organizations"]] == ["Default"]
            assert one["organizations"][0]["org_role"] == "MEMBER"

            client.cookies.set("better-auth.session_token", _cookie("tok_u_two"))
            two = client.get("/session/organizations").json()
            assert two["org_ui_visible"] is True
            assert {o["name"] for o in two["organizations"]} == {
                "Default", "Extra Org"}
    finally:
        asyncio.run(cleanup())
