"""Two-organization world for the adversarial suite.

Seeds two organizations with sites, instances, users and grants directly
in SQL (the org tables exist since the schema migration; org management
endpoints do not exist yet and are not needed for seeding). Everything is
torn down afterwards. All fixtures skip without DATABASE_URL.

The golden-file harness (tests/test_permission_golden.py) is the
equivalence stage of this suite: capture before a migration, compare
after. It shares the pytest invocation; nothing to wire here.
"""

import asyncio
import base64
import hashlib
import hmac
import os

import pytest

SECRET = b"adversarial-local-secret"

USERS = {
    # deployment operator (System Administrator)
    "sys": ("adv_sys", "tok_adv_sys", "ADMIN"),
    # org-A ADMIN by membership only - deployment role stays VIEWER
    "a_admin": ("adv_a_admin", "tok_adv_a_admin", "VIEWER"),
    # org-A MEMBER with an OPERATOR grant on one org-A instance
    "a_member": ("adv_a_member", "tok_adv_a_member", "VIEWER"),
    # org-B MEMBER with a grant on the org-B instance
    "b_member": ("adv_b_member", "tok_adv_b_member", "VIEWER"),
}

IDS = {
    "org_a": "adv_org_a",
    "org_b": "adv_org_b",
    "site_a": "s_adv_a",
    "site_b": "s_adv_b",
    "instance_a": "i_adv_a1",
    "instance_b": "i_adv_b1",
    "grant_a": "g_adv_a1",
    "grant_b": "g_adv_b1",
}


def signed_cookie(token: str) -> str:
    signature = base64.b64encode(
        hmac.new(SECRET, token.encode(), hashlib.sha256).digest()).decode()
    return f"{token}.{signature}"


def as_user(client, key: str):
    """Point the shared client's session cookie at one of the seeded users."""
    token = USERS[key][1]
    client.cookies.set("better-auth.session_token", signed_cookie(token))
    return client


async def _seed(db_url: str) -> None:
    import asyncpg

    conn = await asyncpg.connect(db_url)
    try:
        await conn.execute(
            """
            INSERT INTO organizations (id, name, "createdAt", "updatedAt")
            VALUES ($1, 'Adversarial Org A', NOW(), NOW()),
                   ($2, 'Adversarial Org B', NOW(), NOW())
            """, IDS["org_a"], IDS["org_b"])
        for user_id, token, role in USERS.values():
            await conn.execute(
                """
                INSERT INTO users (id, email, name, role, "emailVerified",
                                   "createdAt", "updatedAt")
                VALUES ($1, $1 || '@adversarial.test', $1, $2, true,
                        NOW(), NOW())
                """, user_id, role)
            await conn.execute(
                """
                INSERT INTO sessions (id, token, "userId", "expiresAt",
                                      "createdAt", "updatedAt")
                VALUES ('sess_' || $1, $2, $1,
                        NOW() + interval '1 hour', NOW(), NOW())
                """, user_id, token)
        await conn.execute(
            """
            INSERT INTO org_memberships
                (id, "userId", "orgId", "orgRole", "createdAt", "updatedAt")
            VALUES ('om_' || $1, $1, $3, 'ADMIN',  NOW(), NOW()),
                   ('om_' || $2, $2, $3, 'MEMBER', NOW(), NOW()),
                   ('om_' || $4, $4, $5, 'MEMBER', NOW(), NOW())
            """,
            USERS["a_admin"][0], USERS["a_member"][0], IDS["org_a"],
            USERS["b_member"][0], IDS["org_b"])
        await conn.execute(
            """
            INSERT INTO sites (id, name, "orgId", "createdAt", "updatedAt")
            VALUES ($1, 'Adversarial Site A', $3, NOW(), NOW()),
                   ($2, 'Adversarial Site B', $4, NOW(), NOW())
            """, IDS["site_a"], IDS["site_b"], IDS["org_a"], IDS["org_b"])
        await conn.execute(
            """
            INSERT INTO instances (id, "siteId", name, host, username,
                                   password, "createdAt", "updatedAt")
            VALUES ($1, $3, 'adv-router-a1', '192.0.2.31', 'vyos',
                    'enc-placeholder', NOW(), NOW()),
                   ($2, $4, 'adv-router-b1', '192.0.2.32', 'vyos',
                    'enc-placeholder', NOW(), NOW())
            """, IDS["instance_a"], IDS["instance_b"],
            IDS["site_a"], IDS["site_b"])
        await conn.execute(
            """
            INSERT INTO user_instance_roles
                (id, "userId", "instanceId", role, "assignedBy",
                 "createdAt", "updatedAt")
            VALUES ($1, $3, $5, 'OPERATOR', 'adv_sys', NOW(), NOW()),
                   ($2, $4, $6, 'VIEWER',   'adv_sys', NOW(), NOW())
            """, IDS["grant_a"], IDS["grant_b"],
            USERS["a_member"][0], USERS["b_member"][0],
            IDS["instance_a"], IDS["instance_b"])
        await conn.execute(
            """
            INSERT INTO user_feature_permissions
                (id, "userInstanceRoleId", feature, "canEdit", "canView")
            VALUES ('f_' || $1, $1, 'FIREWALL', true, true)
            """, IDS["grant_a"])
    finally:
        await conn.close()


async def _teardown(db_url: str) -> None:
    import asyncpg

    conn = await asyncpg.connect(db_url)
    try:
        # users cascade sessions/grants/tokens; instances cascade from
        # sites; sites must go before orgs (RESTRICT FK).
        await conn.execute("DELETE FROM users WHERE id LIKE 'adv\\_%'")
        await conn.execute("DELETE FROM sites WHERE id LIKE 's\\_adv\\_%'")
        await conn.execute(
            "DELETE FROM organizations WHERE id LIKE 'adv\\_org\\_%'")
    finally:
        await conn.close()


@pytest.fixture(scope="session")
def adversarial_world():
    db_url = os.environ.get("DATABASE_URL")
    if not db_url:
        pytest.skip("adversarial suite needs DATABASE_URL")

    import session_cookie
    original_secret = session_cookie._secret
    session_cookie._secret = SECRET

    from fastapi.testclient import TestClient
    from app import app

    asyncio.run(_seed(db_url))
    try:
        with TestClient(app) as client:
            yield client
    finally:
        session_cookie._secret = original_secret
        asyncio.run(_teardown(db_url))
