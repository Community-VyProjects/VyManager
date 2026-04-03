"""
Organization Management Router

API endpoints for listing and switching between organizations.
"""

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime
import asyncpg
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
                # Regular users and demo users only see their own orgs
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

            # Verify access
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
