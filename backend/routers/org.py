"""
Organization Management Router

API endpoints for listing, switching, and managing organizations.
"""

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime
import asyncpg
import secrets
import string
from session_vyos_service import clear_session_cache
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/session", tags=["organizations"])


# ============================================================================
# Pydantic Models
# ============================================================================


class OrgResponse(BaseModel):
    """Response model for an organization."""

    id: str
    name: str
    slug: str
    description: Optional[str] = None
    is_demo: bool
    expires_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime


class SwitchOrgRequest(BaseModel):
    """Request to switch current organization."""

    org_id: str = Field(..., description="Organization ID to switch to")


class OrgsListResponse(BaseModel):
    """Response for listing organizations with user context."""
    orgs: List[OrgResponse]
    user_role: str


class ApiResponse(BaseModel):
    """Standard API response."""

    success: bool
    message: str
    data: Optional[dict] = None


class CreateOrgRequest(BaseModel):
    """Request to create an organization."""
    name: str = Field(..., min_length=1, max_length=100)
    slug: str = Field(..., min_length=1, max_length=50, pattern=r"^[a-z0-9][a-z0-9-]*$")
    description: Optional[str] = None


class UpdateOrgRequest(BaseModel):
    """Request to update an organization."""
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    description: Optional[str] = None


class OrgMemberResponse(BaseModel):
    """Organization member."""
    id: str
    user_id: str
    user_name: Optional[str]
    user_email: str
    user_role: str
    org_role: str
    joined_at: datetime


class AddOrgMemberRequest(BaseModel):
    """Request to add a member to an organization."""
    user_id: str
    role: str = Field("MEMBER", description="OWNER or MEMBER")


# ============================================================================
# Endpoints
# ============================================================================


@router.get("/orgs", response_model=OrgsListResponse)
async def list_organizations(request: Request):
    """
    Get all organizations the user has access to.

    Site ADMIN users see ALL organizations.
    Regular users see only organizations where they are members.
    """
    if not hasattr(request.state, "user") or not request.state.user:
        raise HTTPException(status_code=401, detail="Not authenticated")

    user = request.state.user
    user_id = user["id"]

    db_pool: asyncpg.Pool = request.app.state.db_pool
    if not db_pool:
        raise HTTPException(status_code=503, detail="Database not available")

    try:
        async with db_pool.acquire() as conn:
            row = await conn.fetchrow(
                'SELECT role, "isDemo" FROM users WHERE id = $1', user_id
            )
            user_role = row["role"] if row else "VIEWER"
            is_demo_user = row["isDemo"] if row else False

            if user_role in ("PROJECT_ADMIN", "ADMIN") and not is_demo_user:
                # Project admins see all orgs
                orgs = await conn.fetch(
                    """
                    SELECT id, name, slug, description, "isDemo", "expiresAt", "createdAt", "updatedAt"
                    FROM organizations
                    ORDER BY "isDemo" ASC, name ASC
                    """
                )
            else:
                # ORG_ADMIN, VIEWER, and demo users only see their own orgs
                orgs = await conn.fetch(
                    """
                    SELECT o.id, o.name, o.slug, o.description, o."isDemo", o."expiresAt", o."createdAt", o."updatedAt"
                    FROM organizations o
                    JOIN org_members om ON o.id = om."orgId"
                    WHERE om."userId" = $1
                    ORDER BY o."isDemo" ASC, o.name ASC
                    """,
                    user_id,
                )

            return OrgsListResponse(
                orgs=[
                    OrgResponse(
                        id=org["id"],
                        name=org["name"],
                        slug=org["slug"],
                        description=org["description"],
                        is_demo=org["isDemo"],
                        expires_at=org["expiresAt"],
                        created_at=org["createdAt"],
                        updated_at=org["updatedAt"],
                    )
                    for org in orgs
                ],
                user_role=user_role,
            )

    except Exception as e:
        logger.exception("Unhandled error")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.post("/switch-org", response_model=ApiResponse)
async def switch_organization(request: Request, body: SwitchOrgRequest):
    """
    Switch to a different organization.

    Disconnects the user from their current VyOS instance (if any),
    since the instance may not belong to the target org.
    """
    if not hasattr(request.state, "user") or not request.state.user:
        raise HTTPException(status_code=401, detail="Not authenticated")

    user = request.state.user
    user_id = user["id"]

    db_pool: asyncpg.Pool = request.app.state.db_pool
    if not db_pool:
        raise HTTPException(status_code=503, detail="Database not available")

    try:
        async with db_pool.acquire() as conn:
            # Demo users cannot switch orgs
            is_demo = await conn.fetchval(
                'SELECT "isDemo" FROM users WHERE id = $1', user_id
            )
            if is_demo:
                raise HTTPException(status_code=403, detail="Demo users cannot switch organizations")

            # Verify the org exists
            org = await conn.fetchrow(
                'SELECT id, name FROM organizations WHERE id = $1',
                body.org_id,
            )
            if not org:
                raise HTTPException(status_code=404, detail="Organization not found")

            # Verify access — PROJECT_ADMIN can access any org, others need membership
            user_role = await conn.fetchval(
                "SELECT role FROM users WHERE id = $1", user_id
            )
            if user_role not in ("PROJECT_ADMIN", "ADMIN"):
                has_access = await conn.fetchval(
                    'SELECT EXISTS(SELECT 1 FROM org_members WHERE "orgId" = $1 AND "userId" = $2)',
                    body.org_id, user_id,
                )
                if not has_access:
                    raise HTTPException(status_code=403, detail="You do not have access to this organization")

            # Disconnect from current instance (if any)
            deleted = await conn.execute(
                'DELETE FROM active_sessions WHERE "userId" = $1',
                user_id,
            )
            if deleted and deleted != "DELETE 0":
                clear_session_cache(user_id)

            return ApiResponse(
                success=True,
                message=f"Switched to organization: {org['name']}",
                data={"org_id": org["id"], "org_name": org["name"]},
            )

    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Unhandled error")
        raise HTTPException(status_code=500, detail="Internal server error")


# ============================================================================
# Helper: require admin role
# ============================================================================

async def _require_org_admin(request: Request) -> dict:
    """Require PROJECT_ADMIN or ORG_ADMIN. Returns caller context."""
    user = getattr(request.state, "user", None)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")

    db_pool: asyncpg.Pool = request.app.state.db_pool
    async with db_pool.acquire() as conn:
        row = await conn.fetchrow(
            'SELECT role, "isDemo" FROM users WHERE id = $1', user["id"]
        )
        if not row:
            raise HTTPException(status_code=401, detail="User not found")
        if row["isDemo"]:
            raise HTTPException(status_code=403, detail="Demo users cannot manage organizations")
        if row["role"] not in ("PROJECT_ADMIN", "ORG_ADMIN", "ADMIN"):
            raise HTTPException(status_code=403, detail="Admin role required")

    return {
        "user_id": user["id"],
        "role": row["role"],
        "is_project_admin": row["role"] in ("PROJECT_ADMIN", "ADMIN"),
    }


# ============================================================================
# Organization CRUD Endpoints
# ============================================================================


@router.post("/orgs", response_model=OrgResponse)
async def create_organization(request: Request, body: CreateOrgRequest):
    """Create a new organization. PROJECT_ADMIN only."""
    caller = await _require_org_admin(request)
    if not caller["is_project_admin"]:
        raise HTTPException(status_code=403, detail="Only Project Admins can create organizations")

    db_pool: asyncpg.Pool = request.app.state.db_pool

    try:
        async with db_pool.acquire() as conn:
            # Check slug uniqueness
            exists = await conn.fetchval(
                "SELECT EXISTS(SELECT 1 FROM organizations WHERE slug = $1)", body.slug
            )
            if exists:
                raise HTTPException(status_code=400, detail="Organization slug already exists")

            alphabet = string.ascii_letters + string.digits
            org_id = ''.join(secrets.choice(alphabet) for _ in range(24))

            org = await conn.fetchrow(
                """
                INSERT INTO organizations (id, name, slug, description, "isDemo", "createdAt", "updatedAt")
                VALUES ($1, $2, $3, $4, false, NOW(), NOW())
                RETURNING id, name, slug, description, "isDemo", "expiresAt", "createdAt", "updatedAt"
                """,
                org_id, body.name, body.slug, body.description,
            )

            # Add creator as OWNER
            await conn.execute(
                """
                INSERT INTO org_members (id, "orgId", "userId", role, "createdAt")
                VALUES (gen_random_uuid()::text, $1, $2, 'OWNER', NOW())
                """,
                org_id, caller["user_id"],
            )

            return OrgResponse(
                id=org["id"], name=org["name"], slug=org["slug"],
                description=org["description"], is_demo=org["isDemo"],
                expires_at=org["expiresAt"], created_at=org["createdAt"],
                updated_at=org["updatedAt"],
            )
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Unhandled error creating organization")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.put("/orgs/{org_id}", response_model=OrgResponse)
async def update_organization(request: Request, org_id: str, body: UpdateOrgRequest):
    """Update an organization. PROJECT_ADMIN or org OWNER only."""
    caller = await _require_org_admin(request)
    db_pool: asyncpg.Pool = request.app.state.db_pool

    try:
        async with db_pool.acquire() as conn:
            # Verify org exists
            org = await conn.fetchrow(
                'SELECT id, "isDemo" FROM organizations WHERE id = $1', org_id
            )
            if not org:
                raise HTTPException(status_code=404, detail="Organization not found")

            # ORG_ADMIN must be OWNER of this org
            if not caller["is_project_admin"]:
                is_owner = await conn.fetchval(
                    """SELECT EXISTS(
                        SELECT 1 FROM org_members
                        WHERE "orgId" = $1 AND "userId" = $2 AND role = 'OWNER'
                    )""",
                    org_id, caller["user_id"],
                )
                if not is_owner:
                    raise HTTPException(status_code=403, detail="Only org owners can update this organization")

            updates = []
            params = []
            idx = 1

            if body.name is not None:
                updates.append(f'name = ${idx}')
                params.append(body.name)
                idx += 1
            if body.description is not None:
                updates.append(f'description = ${idx}')
                params.append(body.description)
                idx += 1

            if not updates:
                raise HTTPException(status_code=400, detail="No fields to update")

            updates.append('"updatedAt" = NOW()')
            params.append(org_id)
            query = f'UPDATE organizations SET {", ".join(updates)} WHERE id = ${idx} RETURNING id, name, slug, description, "isDemo", "expiresAt", "createdAt", "updatedAt"'

            updated = await conn.fetchrow(query, *params)
            return OrgResponse(
                id=updated["id"], name=updated["name"], slug=updated["slug"],
                description=updated["description"], is_demo=updated["isDemo"],
                expires_at=updated["expiresAt"], created_at=updated["createdAt"],
                updated_at=updated["updatedAt"],
            )
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Unhandled error updating organization")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.delete("/orgs/{org_id}", response_model=ApiResponse)
async def delete_organization(request: Request, org_id: str):
    """Delete an organization. PROJECT_ADMIN only. Cannot delete default org."""
    caller = await _require_org_admin(request)
    if not caller["is_project_admin"]:
        raise HTTPException(status_code=403, detail="Only Project Admins can delete organizations")

    db_pool: asyncpg.Pool = request.app.state.db_pool

    try:
        async with db_pool.acquire() as conn:
            org = await conn.fetchrow(
                'SELECT id, slug, name FROM organizations WHERE id = $1', org_id
            )
            if not org:
                raise HTTPException(status_code=404, detail="Organization not found")
            if org["slug"] == "default":
                raise HTTPException(status_code=400, detail="Cannot delete the default organization")

            await conn.execute("DELETE FROM organizations WHERE id = $1", org_id)
            return ApiResponse(success=True, message=f"Organization '{org['name']}' deleted")
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Unhandled error deleting organization")
        raise HTTPException(status_code=500, detail="Internal server error")


# ============================================================================
# Organization Members Endpoints
# ============================================================================


@router.get("/orgs/{org_id}/members", response_model=List[OrgMemberResponse])
async def list_org_members(request: Request, org_id: str):
    """List members of an organization."""
    caller = await _require_org_admin(request)
    db_pool: asyncpg.Pool = request.app.state.db_pool

    try:
        async with db_pool.acquire() as conn:
            # Verify access
            if not caller["is_project_admin"]:
                has_access = await conn.fetchval(
                    'SELECT EXISTS(SELECT 1 FROM org_members WHERE "orgId" = $1 AND "userId" = $2)',
                    org_id, caller["user_id"],
                )
                if not has_access:
                    raise HTTPException(status_code=403, detail="Not a member of this organization")

            members = await conn.fetch(
                """
                SELECT om.id, om."userId" as user_id, u.name as user_name,
                       u.email as user_email, u.role as user_role,
                       om.role as org_role, om."createdAt" as joined_at
                FROM org_members om
                JOIN users u ON om."userId" = u.id
                WHERE om."orgId" = $1
                ORDER BY om.role DESC, u.name ASC
                """,
                org_id,
            )

            return [
                OrgMemberResponse(
                    id=m["id"], user_id=m["user_id"], user_name=m["user_name"],
                    user_email=m["user_email"], user_role=m["user_role"],
                    org_role=m["org_role"], joined_at=m["joined_at"],
                )
                for m in members
            ]
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Unhandled error listing org members")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.post("/orgs/{org_id}/members", response_model=ApiResponse)
async def add_org_member(request: Request, org_id: str, body: AddOrgMemberRequest):
    """Add a user to an organization."""
    caller = await _require_org_admin(request)
    db_pool: asyncpg.Pool = request.app.state.db_pool

    if body.role not in ("OWNER", "MEMBER"):
        raise HTTPException(status_code=400, detail="Role must be OWNER or MEMBER")

    try:
        async with db_pool.acquire() as conn:
            # Verify org exists
            org = await conn.fetchval("SELECT id FROM organizations WHERE id = $1", org_id)
            if not org:
                raise HTTPException(status_code=404, detail="Organization not found")

            # ORG_ADMIN must be OWNER of this org
            if not caller["is_project_admin"]:
                is_owner = await conn.fetchval(
                    """SELECT EXISTS(
                        SELECT 1 FROM org_members
                        WHERE "orgId" = $1 AND "userId" = $2 AND role = 'OWNER'
                    )""",
                    org_id, caller["user_id"],
                )
                if not is_owner:
                    raise HTTPException(status_code=403, detail="Only org owners can add members")

            # Verify user exists
            user = await conn.fetchrow("SELECT id, name FROM users WHERE id = $1", body.user_id)
            if not user:
                raise HTTPException(status_code=404, detail="User not found")

            # Check if already a member
            already = await conn.fetchval(
                'SELECT EXISTS(SELECT 1 FROM org_members WHERE "orgId" = $1 AND "userId" = $2)',
                org_id, body.user_id,
            )
            if already:
                raise HTTPException(status_code=400, detail="User is already a member of this organization")

            await conn.execute(
                """
                INSERT INTO org_members (id, "orgId", "userId", role, "createdAt")
                VALUES (gen_random_uuid()::text, $1, $2, $3, NOW())
                """,
                org_id, body.user_id, body.role,
            )

            return ApiResponse(success=True, message=f"User added to organization")
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Unhandled error adding org member")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.delete("/orgs/{org_id}/members/{user_id}", response_model=ApiResponse)
async def remove_org_member(request: Request, org_id: str, user_id: str):
    """Remove a user from an organization."""
    caller = await _require_org_admin(request)
    db_pool: asyncpg.Pool = request.app.state.db_pool

    try:
        async with db_pool.acquire() as conn:
            # ORG_ADMIN must be OWNER
            if not caller["is_project_admin"]:
                is_owner = await conn.fetchval(
                    """SELECT EXISTS(
                        SELECT 1 FROM org_members
                        WHERE "orgId" = $1 AND "userId" = $2 AND role = 'OWNER'
                    )""",
                    org_id, caller["user_id"],
                )
                if not is_owner:
                    raise HTTPException(status_code=403, detail="Only org owners can remove members")

            deleted = await conn.execute(
                'DELETE FROM org_members WHERE "orgId" = $1 AND "userId" = $2',
                org_id, user_id,
            )
            if deleted == "DELETE 0":
                raise HTTPException(status_code=404, detail="Member not found")

            return ApiResponse(success=True, message="Member removed from organization")
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Unhandled error removing org member")
        raise HTTPException(status_code=500, detail="Internal server error")
