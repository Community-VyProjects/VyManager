"""Org ADMIN/OWNER grants full access on their org's instances, under the flag.

Inert when ORG_ENFORCEMENT is off (an org ADMIN with no instance grant sees
nothing); load-bearing when on.
"""

import asyncio
import os

import pytest

import org_scope
from rbac_permissions import FeatureGroup, PermissionLevel, get_user_permissions

requires_db = pytest.mark.skipif(
    not os.environ.get("DATABASE_URL"),
    reason="org-admin test needs DATABASE_URL")


@requires_db
def test_org_admin_full_access_gated_by_flag(monkeypatch):
    import asyncpg

    db = os.environ["DATABASE_URL"]

    async def seed():
        conn = await asyncpg.connect(db)
        await conn.execute("DELETE FROM users WHERE id = 'u_oadm'")
        await conn.execute("DELETE FROM sites WHERE id = 's_oadm'")
        await conn.execute("DELETE FROM organizations WHERE id = 'o_oadm'")
        await conn.execute(
            'INSERT INTO organizations (id,name,"createdAt","updatedAt")'
            " VALUES ('o_oadm','OAdm',NOW(),NOW())")
        # users.role = VIEWER -> NOT a System Administrator.
        await conn.execute(
            'INSERT INTO users (id,email,name,role,"emailVerified",'
            '"createdAt","updatedAt") VALUES '
            "('u_oadm','oadm@t.test','OAdm','VIEWER',true,NOW(),NOW())")
        # ... but org ADMIN of o_oadm.
        await conn.execute(
            'INSERT INTO org_memberships (id,"userId","orgId","orgRole",'
            '"createdAt","updatedAt") VALUES '
            "('om_oadm','u_oadm','o_oadm','ADMIN',NOW(),NOW())")
        await conn.execute(
            'INSERT INTO sites (id,name,"orgId","createdAt","updatedAt")'
            " VALUES ('s_oadm','SOAdm','o_oadm',NOW(),NOW())")
        await conn.execute(
            'INSERT INTO instances (id,"siteId",name,host,username,'
            'password,"createdAt","updatedAt") VALUES '
            "('i_oadm','s_oadm','r','1.1.1.1','v','p',NOW(),NOW())")
        await conn.close()

    async def cleanup():
        conn = await asyncpg.connect(db)
        await conn.execute("DELETE FROM users WHERE id = 'u_oadm'")
        await conn.execute("DELETE FROM sites WHERE id = 's_oadm'")
        await conn.execute("DELETE FROM organizations WHERE id = 'o_oadm'")
        await conn.close()

    async def perms():
        pool = await asyncpg.create_pool(db, min_size=1, max_size=2)
        try:
            return await get_user_permissions(pool, "u_oadm", "i_oadm")
        finally:
            await pool.close()

    asyncio.run(seed())
    try:
        # Flag OFF: org ADMIN with no instance grant -> nothing.
        monkeypatch.setattr(org_scope, "ORG_ENFORCEMENT", False)
        off = asyncio.run(perms())
        assert off[FeatureGroup.FIREWALL] == PermissionLevel.NONE
        assert off[FeatureGroup.SYSTEM] == PermissionLevel.NONE

        # Flag ON: org ADMIN gets full access on their org's instance.
        monkeypatch.setattr(org_scope, "ORG_ENFORCEMENT", True)
        on = asyncio.run(perms())
        assert on[FeatureGroup.FIREWALL] == PermissionLevel.WRITE
        assert on[FeatureGroup.USER_MANAGEMENT] == PermissionLevel.WRITE
    finally:
        asyncio.run(cleanup())


@requires_db
def test_org_admin_sees_org_sites_under_enforcement(monkeypatch):
    """list_user_sites must show an org ADMIN/OWNER their org's sites when
    enforcement is on (mirrors the permission layer), and never another org's.
    Inert when off."""
    import asyncpg
    from types import SimpleNamespace

    from routers.session.session import list_user_sites

    db = os.environ["DATABASE_URL"]
    ids = ("u_ov", "o_ov", "s_ov", "o_ov2", "s_ov2")

    async def seed():
        conn = await asyncpg.connect(db)
        await conn.execute("DELETE FROM users WHERE id = 'u_ov'")
        await conn.execute("DELETE FROM sites WHERE id IN ('s_ov','s_ov2')")
        await conn.execute("DELETE FROM organizations WHERE id IN ('o_ov','o_ov2')")
        await conn.execute(
            'INSERT INTO organizations (id,name,"createdAt","updatedAt") VALUES'
            " ('o_ov','OV',NOW(),NOW()),('o_ov2','OV2',NOW(),NOW())")
        await conn.execute(
            'INSERT INTO users (id,email,name,role,"emailVerified","createdAt",'
            '"updatedAt") VALUES (\'u_ov\',\'ov@t.test\',\'OV\',\'VIEWER\',true,NOW(),NOW())')
        # org ADMIN of o_ov only; not a member of o_ov2.
        await conn.execute(
            'INSERT INTO org_memberships (id,"userId","orgId","orgRole","createdAt",'
            '"updatedAt") VALUES (\'om_ov\',\'u_ov\',\'o_ov\',\'ADMIN\',NOW(),NOW())')
        await conn.execute(
            'INSERT INTO sites (id,name,"orgId","createdAt","updatedAt") VALUES'
            " ('s_ov','SOV','o_ov',NOW(),NOW()),('s_ov2','SOV2','o_ov2',NOW(),NOW())")
        await conn.close()

    async def cleanup():
        conn = await asyncpg.connect(db)
        await conn.execute("DELETE FROM users WHERE id = 'u_ov'")
        await conn.execute("DELETE FROM sites WHERE id IN ('s_ov','s_ov2')")
        await conn.execute("DELETE FROM organizations WHERE id IN ('o_ov','o_ov2')")
        await conn.close()

    async def list_sites():
        conn = await asyncpg.connect(db)
        try:
            req = SimpleNamespace(state=SimpleNamespace(user={"id": "u_ov"}))
            result = await list_user_sites(req, conn)
            return {s.id for s in result}
        finally:
            await conn.close()

    asyncio.run(seed())
    try:
        # OFF: org ADMIN with no instance grant sees no sites.
        monkeypatch.setattr(org_scope, "ORG_ENFORCEMENT", False)
        assert asyncio.run(list_sites()) == set()

        # ON: sees their org's site, never the other org's.
        monkeypatch.setattr(org_scope, "ORG_ENFORCEMENT", True)
        seen = asyncio.run(list_sites())
        assert "s_ov" in seen, seen
        assert "s_ov2" not in seen, seen
    finally:
        asyncio.run(cleanup())
