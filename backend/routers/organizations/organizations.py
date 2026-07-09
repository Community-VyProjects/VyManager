"""
Organization Management Router

System-administrator management of organizations and their memberships. Orgs
are the tenant-isolation boundary (Org -> Sites -> Instances); this is the
surface that creates them and assigns users, which previously only existed at
the database level. ADMIN (System Administrator) only.
"""
import re
import secrets
import string
from datetime import datetime
from typing import Any, Dict, Optional

import asyncpg
from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, Field

from org_scope import org_conn_admin
from fastapi_permissions import require_super_admin

router = APIRouter(prefix="/organizations", tags=["organizations"])

_ORG_ROLES = {"OWNER", "ADMIN", "MEMBER"}
_SUFFIX_ALPHABET = string.ascii_lowercase + string.digits


class OrgCreateInput(BaseModel):
    name: str = Field(..., min_length=1)
    description: Optional[str] = None


class OrgUpdateInput(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None


class MemberAddInput(BaseModel):
    userId: str = Field(..., min_length=1)
    orgRole: str = "MEMBER"


class MemberRoleInput(BaseModel):
    orgRole: str


def _slugify(name: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", name.strip().lower()).strip("-")
    return slug or "org"


async def _unique_organization_id(conn: asyncpg.Connection, name: str) -> str:
    """A readable, unique, non-empty org id derived from the name."""
    base = _slugify(name)
    if not await conn.fetchval("SELECT 1 FROM organizations WHERE id = $1", base):
        return base
    for _ in range(6):
        suffix = "".join(secrets.choice(_SUFFIX_ALPHABET) for _ in range(4))
        candidate = f"{base}-{suffix}"
        if not await conn.fetchval(
            "SELECT 1 FROM organizations WHERE id = $1", candidate
        ):
            return candidate
    return "org-" + "".join(secrets.choice(_SUFFIX_ALPHABET) for _ in range(10))


def _iso(value: Any) -> Any:
    return value.isoformat() if isinstance(value, datetime) else value


def _serialize_org(row: asyncpg.Record) -> Dict[str, Any]:
    return {
        "id": row["id"],
        "name": row["name"],
        "description": row["description"],
        "memberCount": row["member_count"],
        "createdAt": _iso(row["createdAt"]),
        "updatedAt": _iso(row["updatedAt"]),
    }


async def _require_org(conn: asyncpg.Connection, organization_id: str) -> asyncpg.Record:
    row = await conn.fetchrow("SELECT * FROM organizations WHERE id = $1", organization_id)
    if not row:
        raise HTTPException(status_code=404, detail="Organization not found")
    return row


@router.get("")
async def list_organizations(
    request: Request, conn: asyncpg.Connection = Depends(org_conn_admin)
):
    """Every organization with its member count."""
    await require_super_admin(request)
    rows = await conn.fetch(
        """
        SELECT o.*, COUNT(m.id) AS member_count
        FROM organizations o
        LEFT JOIN org_memberships m ON m."orgId" = o.id
        GROUP BY o.id
        ORDER BY o.name
        """
    )
    return {"organizations": [_serialize_org(r) for r in rows]}


@router.post("")
async def create_organization(
    body: OrgCreateInput,
    request: Request,
    conn: asyncpg.Connection = Depends(org_conn_admin),
):
    """Create an organization."""
    await require_super_admin(request)
    organization_id = await _unique_organization_id(conn, body.name)
    try:
        row = await conn.fetchrow(
            """
            INSERT INTO organizations (id, name, description, "createdAt", "updatedAt")
            VALUES ($1, $2, $3, NOW(), NOW())
            RETURNING *, 0::bigint AS member_count
            """,
            organization_id,
            body.name.strip(),
            body.description,
        )
    except asyncpg.UniqueViolationError:
        raise HTTPException(
            status_code=409, detail="An organization with this name already exists"
        )
    return {"organization": _serialize_org(row)}


@router.patch("/{organization_id}")
async def update_organization(
    organization_id: str,
    body: OrgUpdateInput,
    request: Request,
    conn: asyncpg.Connection = Depends(org_conn_admin),
):
    """Rename an organization or change its description."""
    await require_super_admin(request)
    existing = await _require_org(conn, organization_id)
    name = body.name.strip() if body.name is not None else existing["name"]
    if not name:
        raise HTTPException(status_code=400, detail="Name cannot be empty")
    description = (
        body.description if body.description is not None else existing["description"]
    )
    try:
        row = await conn.fetchrow(
            """
            UPDATE organizations SET name = $2, description = $3, "updatedAt" = NOW()
            WHERE id = $1
            RETURNING *,
                (SELECT COUNT(*) FROM org_memberships WHERE "orgId" = $1) AS member_count
            """,
            organization_id,
            name,
            description,
        )
    except asyncpg.UniqueViolationError:
        raise HTTPException(
            status_code=409, detail="An organization with this name already exists"
        )
    return {"organization": _serialize_org(row)}


@router.delete("/{organization_id}")
async def delete_organization(
    organization_id: str,
    request: Request,
    conn: asyncpg.Connection = Depends(org_conn_admin),
):
    """Delete an organization. The default org cannot be deleted, and an org
    that still owns sites must have them moved or removed first (memberships
    are removed with the org)."""
    await require_super_admin(request)
    await _require_org(conn, organization_id)
    if organization_id == "default":
        raise HTTPException(
            status_code=403, detail="The default organization cannot be deleted"
        )
    site_count = await conn.fetchval(
        'SELECT COUNT(*) FROM sites WHERE "orgId" = $1', organization_id
    )
    if site_count:
        raise HTTPException(
            status_code=409,
            detail=f"Organization still has {site_count} site(s); move or delete them first",
        )
    await conn.execute("DELETE FROM organizations WHERE id = $1", organization_id)
    return {"success": True}


@router.get("/{organization_id}/members")
async def list_members(
    organization_id: str,
    request: Request,
    conn: asyncpg.Connection = Depends(org_conn_admin),
):
    """Members of an organization."""
    await require_super_admin(request)
    await _require_org(conn, organization_id)
    rows = await conn.fetch(
        """
        SELECT m."userId", m."orgRole", m."createdAt", u.email, u.name
        FROM org_memberships m
        JOIN users u ON u.id = m."userId"
        WHERE m."orgId" = $1
        ORDER BY u.email
        """,
        organization_id,
    )
    return {
        "members": [
            {
                "userId": r["userId"],
                "email": r["email"],
                "name": r["name"],
                "orgRole": r["orgRole"],
                "createdAt": _iso(r["createdAt"]),
            }
            for r in rows
        ]
    }


@router.post("/{organization_id}/members")
async def add_member(
    organization_id: str,
    body: MemberAddInput,
    request: Request,
    conn: asyncpg.Connection = Depends(org_conn_admin),
):
    """Add a user to the organization with a role."""
    await require_super_admin(request)
    await _require_org(conn, organization_id)
    if body.orgRole not in _ORG_ROLES:
        raise HTTPException(status_code=400, detail=f"Invalid orgRole: {body.orgRole}")
    if not await conn.fetchval("SELECT 1 FROM users WHERE id = $1", body.userId):
        raise HTTPException(status_code=404, detail="User not found")
    membership_id = "om_" + "".join(
        secrets.choice(_SUFFIX_ALPHABET) for _ in range(24)
    )
    try:
        await conn.execute(
            """
            INSERT INTO org_memberships (id, "userId", "orgId", "orgRole",
                                         "createdAt", "updatedAt")
            VALUES ($1, $2, $3, $4::"OrgRole", NOW(), NOW())
            """,
            membership_id,
            body.userId,
            organization_id,
            body.orgRole,
        )
    except asyncpg.UniqueViolationError:
        raise HTTPException(
            status_code=409, detail="User is already a member of this organization"
        )
    return {"success": True}


async def _would_orphan_owner(
    conn: asyncpg.Connection, organization_id: str, user_id: str
) -> bool:
    """True if the user is the only OWNER while other members remain — the org
    would be left with members but no owner."""
    is_owner = await conn.fetchval(
        'SELECT 1 FROM org_memberships WHERE "orgId" = $1 AND "userId" = $2'
        ' AND "orgRole" = \'OWNER\'',
        organization_id,
        user_id,
    )
    if not is_owner:
        return False
    owner_count = await conn.fetchval(
        "SELECT COUNT(*) FROM org_memberships"
        " WHERE \"orgId\" = $1 AND \"orgRole\" = 'OWNER'",
        organization_id,
    )
    member_count = await conn.fetchval(
        'SELECT COUNT(*) FROM org_memberships WHERE "orgId" = $1', organization_id
    )
    return owner_count == 1 and member_count > 1


@router.patch("/{organization_id}/members/{user_id}")
async def set_member_role(
    organization_id: str,
    user_id: str,
    body: MemberRoleInput,
    request: Request,
    conn: asyncpg.Connection = Depends(org_conn_admin),
):
    """Change a member's role."""
    await require_super_admin(request)
    if body.orgRole not in _ORG_ROLES:
        raise HTTPException(status_code=400, detail=f"Invalid orgRole: {body.orgRole}")
    existing = await conn.fetchrow(
        'SELECT "orgRole" FROM org_memberships WHERE "orgId" = $1 AND "userId" = $2',
        organization_id,
        user_id,
    )
    if not existing:
        raise HTTPException(status_code=404, detail="Membership not found")
    if body.orgRole != "OWNER" and await _would_orphan_owner(conn, organization_id, user_id):
        raise HTTPException(
            status_code=409,
            detail="Organization must keep at least one owner",
        )
    await conn.execute(
        'UPDATE org_memberships SET "orgRole" = $3::"OrgRole", "updatedAt" = NOW()'
        ' WHERE "orgId" = $1 AND "userId" = $2',
        organization_id,
        user_id,
        body.orgRole,
    )
    return {"success": True}


@router.delete("/{organization_id}/members/{user_id}")
async def remove_member(
    organization_id: str,
    user_id: str,
    request: Request,
    conn: asyncpg.Connection = Depends(org_conn_admin),
):
    """Remove a user from the organization."""
    await require_super_admin(request)
    if not await conn.fetchval(
        'SELECT 1 FROM org_memberships WHERE "orgId" = $1 AND "userId" = $2',
        organization_id,
        user_id,
    ):
        raise HTTPException(status_code=404, detail="Membership not found")
    if await _would_orphan_owner(conn, organization_id, user_id):
        raise HTTPException(
            status_code=409,
            detail="Organization must keep at least one owner",
        )
    await conn.execute(
        'DELETE FROM org_memberships WHERE "orgId" = $1 AND "userId" = $2',
        organization_id,
        user_id,
    )
    return {"success": True}
