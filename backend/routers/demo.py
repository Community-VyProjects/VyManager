"""
Demo Management Router

API endpoints for creating, listing, and deleting demo environments.
Each demo creates an isolated organization with its own user, site, and placeholder instances.
Demos auto-expire after 10 hours.
"""

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime, timedelta
import asyncpg
import os
import secrets
import string
import httpx
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/demo", tags=["demo"])

DEMO_DURATION_HOURS = 10
DEMO_BASE_DOMAIN = os.environ.get("DEMO_BASE_DOMAIN", "")
FRONTEND_URL = os.environ.get("FRONTEND_URL", "http://localhost:3000")


# ============================================================================
# Pydantic Models
# ============================================================================


class DemoCreateResponse(BaseModel):
    """Response after creating a demo environment."""

    org_id: str
    org_name: str
    slug: str
    email: str
    password: str
    expires_at: datetime
    demo_url: str


class DemoInfo(BaseModel):
    """Information about an active demo."""

    org_id: str
    org_name: str
    slug: str
    email: str
    demo_url: str
    expires_at: datetime
    created_at: datetime
    site_count: int
    instance_count: int


class DemoListResponse(BaseModel):
    """Response for listing demos."""

    demos: List[DemoInfo]
    total: int


class DemoDeleteResponse(BaseModel):
    """Response after deleting a demo."""

    success: bool
    message: str


# ============================================================================
# Helper Functions
# ============================================================================


def _build_demo_url(slug: str) -> str:
    if DEMO_BASE_DOMAIN:
        protocol = "https" if "https" in FRONTEND_URL else "http"
        return f"{protocol}://{slug}.{DEMO_BASE_DOMAIN}"
    return FRONTEND_URL


def _generate_id(length: int = 32) -> str:
    alphabet = string.ascii_letters + string.digits
    return "".join(secrets.choice(alphabet) for _ in range(length))


def _generate_slug() -> str:
    return "demo-" + "".join(secrets.choice(string.ascii_lowercase + string.digits) for _ in range(8))


def _generate_password(length: int = 16) -> str:
    alphabet = string.ascii_letters + string.digits
    return "".join(secrets.choice(alphabet) for _ in range(length))


async def _require_admin(request: Request):
    """Verify the current user is a site ADMIN."""
    if not hasattr(request.state, "user") or not request.state.user:
        raise HTTPException(status_code=401, detail="Not authenticated")

    user_role = getattr(request.state, "user_role", None)
    if user_role != "ADMIN":
        raise HTTPException(status_code=403, detail="Only site ADMINs can manage demos")


# ============================================================================
# Endpoints
# ============================================================================


@router.post("/create", response_model=DemoCreateResponse)
async def create_demo(request: Request):
    """
    Create a new demo environment.

    Creates:
    1. A new organization (isDemo=true, expires in 10 hours)
    2. A new demo user with generated credentials
    3. A default site within the org
    4. 3 placeholder instances (no real VyOS connection)

    Returns the login credentials for the demo user.
    """
    await _require_admin(request)

    db_pool: asyncpg.Pool = request.app.state.db_pool
    if not db_pool:
        raise HTTPException(status_code=503, detail="Database not available")

    slug = _generate_slug()
    org_id = _generate_id()
    site_id = _generate_id()
    email = f"{slug}@demo.vymanager.local"
    password = _generate_password()
    now = datetime.utcnow()
    expires_at = now + timedelta(hours=DEMO_DURATION_HOURS)

    try:
        async with db_pool.acquire() as conn:
            # 1. Create the organization
            await conn.execute(
                """
                INSERT INTO organizations (id, name, slug, description, "isDemo", "expiresAt", "createdAt", "updatedAt")
                VALUES ($1, $2, $3, $4, true, $5, $6, $6)
                """,
                org_id,
                f"Demo ({slug})",
                slug,
                f"Demo environment - expires {expires_at.strftime('%Y-%m-%d %H:%M UTC')}",
                expires_at,
                now,
            )

            # 2. Create demo user via Better Auth's internal endpoint
            frontend_url = "http://frontend:3000"
            create_user_url = f"{frontend_url}/api/internal/create-user"

            async with httpx.AsyncClient(timeout=10.0, follow_redirects=False) as client:
                response = await client.post(
                    create_user_url,
                    json={
                        "email": email,
                        "password": password,
                        "name": f"Demo User ({slug})",
                    },
                    headers={"Content-Type": "application/json"},
                )

                if response.status_code != 200:
                    # Cleanup the org we just created
                    await conn.execute("DELETE FROM organizations WHERE id = $1", org_id)
                    error_data = response.json() if "application/json" in response.headers.get("content-type", "") else {}
                    raise HTTPException(
                        status_code=500,
                        detail=f"Failed to create demo user: {error_data.get('error', 'Unknown error')}",
                    )

                result = response.json()
                user_id = result["user"]["id"]

            # 3. Mark user as demo (keep VIEWER site role - they only access their own org)
            await conn.execute(
                """
                UPDATE users SET "isDemo" = true WHERE id = $1
                """,
                user_id,
            )

            # 4. Create org membership
            await conn.execute(
                """
                INSERT INTO org_members (id, "orgId", "userId", role, "createdAt")
                VALUES ($1, $2, $3, 'OWNER', $4)
                """,
                _generate_id(),
                org_id,
                user_id,
                now,
            )

            # 5. Create default site
            await conn.execute(
                """
                INSERT INTO sites (id, "orgId", name, description, "createdAt", "updatedAt")
                VALUES ($1, $2, $3, $4, $5, $5)
                """,
                site_id,
                org_id,
                "Demo Site",
                "Default demo site with placeholder instances",
                now,
            )

            # 6. Create placeholder instances
            placeholder_instances = [
                ("Core Router", "Primary core router"),
                ("Edge Router", "Edge/border router"),
                ("Branch Router", "Branch office router"),
            ]

            for inst_name, inst_desc in placeholder_instances:
                await conn.execute(
                    """
                    INSERT INTO instances (id, "siteId", name, description, host, port, username, password, "apiKey",
                                          "vyosVersion", protocol, "verifySsl", "isActive", "createdAt", "updatedAt")
                    VALUES ($1, $2, $3, $4, '0.0.0.0', 443, 'demo', '', '', '1.5', 'https', false, false, $5, $5)
                    """,
                    _generate_id(),
                    site_id,
                    inst_name,
                    inst_desc,
                    now,
                )

        return DemoCreateResponse(
            org_id=org_id,
            org_name=f"Demo ({slug})",
            slug=slug,
            email=email,
            password=password,
            expires_at=expires_at,
            demo_url=_build_demo_url(slug),
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Failed to create demo")
        raise HTTPException(status_code=500, detail="Failed to create demo environment")


@router.get("/list", response_model=DemoListResponse)
async def list_demos(request: Request):
    """
    List all active demo environments.

    Only accessible by site ADMIN users.
    """
    await _require_admin(request)

    db_pool: asyncpg.Pool = request.app.state.db_pool
    if not db_pool:
        raise HTTPException(status_code=503, detail="Database not available")

    try:
        async with db_pool.acquire() as conn:
            demos = await conn.fetch(
                """
                SELECT
                    o.id as org_id,
                    o.name as org_name,
                    o.slug,
                    o."expiresAt",
                    o."createdAt",
                    (SELECT COUNT(*) FROM sites WHERE "orgId" = o.id) as site_count,
                    (SELECT COUNT(*) FROM instances i JOIN sites s ON i."siteId" = s.id WHERE s."orgId" = o.id) as instance_count,
                    (SELECT u.email FROM org_members om JOIN users u ON om."userId" = u.id WHERE om."orgId" = o.id AND om.role = 'OWNER' LIMIT 1) as email
                FROM organizations o
                WHERE o."isDemo" = true
                ORDER BY o."createdAt" DESC
                """
            )

            return DemoListResponse(
                demos=[
                    DemoInfo(
                        org_id=d["org_id"],
                        org_name=d["org_name"],
                        slug=d["slug"],
                        email=d["email"] or "unknown",
                        demo_url=_build_demo_url(d["slug"]),
                        expires_at=d["expiresAt"],
                        created_at=d["createdAt"],
                        site_count=d["site_count"],
                        instance_count=d["instance_count"],
                    )
                    for d in demos
                ],
                total=len(demos),
            )

    except Exception as e:
        logger.exception("Failed to list demos")
        raise HTTPException(status_code=500, detail="Failed to list demos")


@router.delete("/{org_id}", response_model=DemoDeleteResponse)
async def delete_demo(request: Request, org_id: str):
    """
    Delete a demo environment immediately.

    Cascades to delete all sites, instances, users, and sessions.
    Only accessible by site ADMIN users.
    """
    await _require_admin(request)

    db_pool: asyncpg.Pool = request.app.state.db_pool
    if not db_pool:
        raise HTTPException(status_code=503, detail="Database not available")

    try:
        async with db_pool.acquire() as conn:
            # Verify it's a demo org
            org = await conn.fetchrow(
                'SELECT id, name, "isDemo" FROM organizations WHERE id = $1',
                org_id,
            )
            if not org:
                raise HTTPException(status_code=404, detail="Organization not found")
            if not org["isDemo"]:
                raise HTTPException(status_code=400, detail="Cannot delete a non-demo organization via this endpoint")

            # Get demo users to clean up
            demo_user_ids = await conn.fetch(
                """
                SELECT om."userId" FROM org_members om
                JOIN users u ON om."userId" = u.id
                WHERE om."orgId" = $1 AND u."isDemo" = true
                """,
                org_id,
            )

            # Delete the org (cascades to sites, instances, org_members)
            await conn.execute("DELETE FROM organizations WHERE id = $1", org_id)

            # Delete orphaned demo users
            for row in demo_user_ids:
                uid = row["userId"]
                has_other_orgs = await conn.fetchval(
                    'SELECT EXISTS(SELECT 1 FROM org_members WHERE "userId" = $1)',
                    uid,
                )
                if not has_other_orgs:
                    # Delete sessions first, then accounts, then user
                    await conn.execute('DELETE FROM sessions WHERE "userId" = $1', uid)
                    await conn.execute('DELETE FROM accounts WHERE "userId" = $1', uid)
                    await conn.execute("DELETE FROM users WHERE id = $1", uid)

            return DemoDeleteResponse(
                success=True,
                message=f"Demo '{org['name']}' deleted successfully",
            )

    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Failed to delete demo")
        raise HTTPException(status_code=500, detail="Failed to delete demo")


# ============================================================================
# Background Cleanup (called from app.py cleanup task)
# ============================================================================


async def cleanup_expired_demos(conn) -> None:
    """
    Clean up expired demo organizations and orphaned demo users.
    Called by the background cleanup task in app.py.
    """
    expired_demos = await conn.fetch(
        """
        DELETE FROM organizations
        WHERE "isDemo" = true AND "expiresAt" < NOW()
        RETURNING id, name, "expiresAt"
        """
    )

    if expired_demos:
        print(f"[DemoCleanup] Removed {len(expired_demos)} expired demo(s):")
        for row in expired_demos:
            print(f"  - Demo: {row['name']} (expired at {row['expiresAt']})")

        # Clean up demo users that no longer have any org membership
        orphan_users = await conn.fetch(
            """
            DELETE FROM users
            WHERE "isDemo" = true
              AND NOT EXISTS (SELECT 1 FROM org_members WHERE "userId" = users.id)
            RETURNING id, email
            """
        )
        if orphan_users:
            print(f"[DemoCleanup] Removed {len(orphan_users)} orphaned demo user(s)")
