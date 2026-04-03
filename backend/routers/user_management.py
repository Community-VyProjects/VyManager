"""
User Management Router

API endpoints for managing users, roles, and permissions.
Org-scoped: PROJECT_ADMIN sees all users, ORG_ADMIN sees only their org's users.
"""

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, Field, EmailStr
from typing import List, Dict, Optional, Any
from datetime import datetime
import asyncpg
import httpx

from rbac_permissions import (
    FeatureGroup,
    PermissionLevel,
    BuiltInRole,
    get_user_permissions,
    is_admin,
)

router = APIRouter(prefix="/user-management", tags=["user-management"])


# ============================================================================
# Pydantic Models
# ============================================================================

class UserListItem(BaseModel):
    """User in list view"""
    id: str
    name: Optional[str]
    email: str
    email_verified: bool
    created_at: datetime
    instance_count: int
    site_role: str
    org_role: Optional[str] = None


class UserDetail(BaseModel):
    """Detailed user information"""
    id: str
    name: Optional[str]
    email: str
    email_verified: bool
    created_at: datetime
    updated_at: datetime


class CreateUserRequest(BaseModel):
    """Request to create a new user"""
    name: Optional[str] = None
    email: EmailStr
    password: str = Field(..., min_length=8)
    site_role: str = Field(..., description="Site role: PROJECT_ADMIN, ORG_ADMIN, or VIEWER")


class UpdateUserRequest(BaseModel):
    """Request to update a user"""
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    password: Optional[str] = Field(None, min_length=8)
    site_role: Optional[str] = Field(None, description="Site role: PROJECT_ADMIN, ORG_ADMIN, or VIEWER")


class FeaturePermissionItem(BaseModel):
    """Feature permission for a user assignment"""
    feature: str
    can_edit: bool
    can_view: bool


class UserInstanceAssignment(BaseModel):
    """User assignment to an instance"""
    id: str
    user_id: str
    instance_id: str
    instance_name: str
    site_id: str
    site_name: str
    role: str
    feature_permissions: List[FeaturePermissionItem]
    assigned_at: datetime
    assigned_by: str


class AssignUserRequest(BaseModel):
    """Request to assign user to instance(s) with role"""
    user_id: str
    instance_ids: List[str]
    role: str
    feature_permissions: Optional[List[FeaturePermissionItem]] = None


class InstanceUserListItem(BaseModel):
    """User with access to an instance"""
    user_id: str
    user_name: Optional[str]
    user_email: str
    role: str
    feature_permissions: Optional[List[FeaturePermissionItem]] = None


class MyPermissionsResponse(BaseModel):
    """Response for the current user's permissions on their active instance."""
    has_active_session: bool
    instance_id: Optional[str] = None
    permissions: Dict[str, str]


class SuccessResponse(BaseModel):
    """Generic success/failure response."""
    success: bool
    message: str


class AssignmentResponse(BaseModel):
    """Response for user instance assignment operations."""
    success: bool
    assignments_created: int
    message: str


# ============================================================================
# Helper Functions
# ============================================================================

async def _require_admin(request: Request) -> dict:
    """
    Require the caller to be PROJECT_ADMIN or ORG_ADMIN.
    Returns a context dict with caller info and scoping data.
    """
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
            raise HTTPException(status_code=403, detail="Demo users cannot manage users")
        if row["role"] not in ("PROJECT_ADMIN", "ORG_ADMIN", "ADMIN"):
            raise HTTPException(status_code=403, detail="Admin role required")

    caller_role = row["role"]
    org_id = getattr(request.state, "org_id", None)

    return {
        "user_id": user["id"],
        "role": caller_role,
        "is_project_admin": caller_role in ("PROJECT_ADMIN", "ADMIN"),
        "org_id": org_id,
    }


async def _get_caller_org_ids(db_pool: asyncpg.Pool, caller: dict) -> List[str]:
    """Get org IDs the caller can manage. PROJECT_ADMIN with org_id filters to that org."""
    if caller["is_project_admin"]:
        if caller["org_id"]:
            return [caller["org_id"]]
        # No org filter — return all
        return []
    else:
        # ORG_ADMIN: only their own orgs
        async with db_pool.acquire() as conn:
            rows = await conn.fetch(
                'SELECT "orgId" FROM org_members WHERE "userId" = $1',
                caller["user_id"],
            )
            return [r["orgId"] for r in rows]


async def _verify_instance_in_org(conn, instance_id: str, allowed_org_ids: List[str]) -> bool:
    """Check that an instance belongs to one of the allowed organizations."""
    if not allowed_org_ids:
        return True  # PROJECT_ADMIN with no filter
    org_id = await conn.fetchval(
        """
        SELECT s."orgId" FROM instances i
        JOIN sites s ON i."siteId" = s.id
        WHERE i.id = $1
        """,
        instance_id,
    )
    return org_id in allowed_org_ids


# ============================================================================
# User Endpoints
# ============================================================================

@router.get("/my-permissions", response_model=MyPermissionsResponse)
async def get_my_permissions(request: Request):
    """
    Get the current user's permissions for their active instance.
    Available to any authenticated user (not admin-only).
    """
    user = request.state.user
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")

    db_pool: asyncpg.Pool = request.app.state.db_pool

    async with db_pool.acquire() as conn:
        active_session = await conn.fetchrow(
            'SELECT "instanceId" FROM active_sessions WHERE "userId" = $1 LIMIT 1',
            user["id"]
        )

        if not active_session:
            return MyPermissionsResponse(has_active_session=False, permissions={})

        instance_id = active_session["instanceId"]
        permissions = await get_user_permissions(db_pool, user["id"], instance_id)

        permissions_dict = {
            feature.value: level.value
            for feature, level in permissions.items()
        }

        return MyPermissionsResponse(
            has_active_session=True,
            instance_id=instance_id,
            permissions=permissions_dict,
        )


@router.get("/users", response_model=List[UserListItem])
async def list_users(request: Request):
    """
    Get list of users scoped to the caller's organization context.
    PROJECT_ADMIN: sees users in current org (or all if no org selected).
    ORG_ADMIN: sees only users who are members of their org(s).
    """
    caller = await _require_admin(request)
    db_pool: asyncpg.Pool = request.app.state.db_pool
    org_ids = await _get_caller_org_ids(db_pool, caller)

    async with db_pool.acquire() as conn:
        if org_ids:
            # Scoped to specific org(s)
            users = await conn.fetch(
                """
                SELECT
                    u.id,
                    u.name,
                    u.email,
                    u."emailVerified" as email_verified,
                    u."createdAt" as created_at,
                    u.role as site_role,
                    om.role as org_role,
                    COUNT(DISTINCT uir."instanceId") as instance_count
                FROM users u
                JOIN org_members om ON u.id = om."userId" AND om."orgId" = ANY($1)
                LEFT JOIN user_instance_roles uir ON u.id = uir."userId"
                GROUP BY u.id, u.name, u.email, u."emailVerified", u."createdAt", u.role, om.role
                ORDER BY u."createdAt" DESC
                """,
                org_ids,
            )
        else:
            # PROJECT_ADMIN with no org filter — all users
            users = await conn.fetch(
                """
                SELECT
                    u.id,
                    u.name,
                    u.email,
                    u."emailVerified" as email_verified,
                    u."createdAt" as created_at,
                    u.role as site_role,
                    NULL as org_role,
                    COUNT(DISTINCT uir."instanceId") as instance_count
                FROM users u
                LEFT JOIN user_instance_roles uir ON u.id = uir."userId"
                GROUP BY u.id, u.name, u.email, u."emailVerified", u."createdAt", u.role
                ORDER BY u."createdAt" DESC
                """
            )

        return [UserListItem(
            id=user["id"],
            name=user["name"],
            email=user["email"],
            email_verified=user["email_verified"],
            created_at=user["created_at"],
            instance_count=user["instance_count"],
            site_role=user["site_role"],
            org_role=user["org_role"],
        ) for user in users]


@router.get("/users/{user_id}", response_model=UserDetail)
async def get_user(request: Request, user_id: str):
    """Get detailed information about a specific user (org-scoped)."""
    caller = await _require_admin(request)
    db_pool: asyncpg.Pool = request.app.state.db_pool
    org_ids = await _get_caller_org_ids(db_pool, caller)

    async with db_pool.acquire() as conn:
        # Verify the target user is in caller's org scope
        if org_ids:
            in_org = await conn.fetchval(
                'SELECT EXISTS(SELECT 1 FROM org_members WHERE "userId" = $1 AND "orgId" = ANY($2))',
                user_id, org_ids,
            )
            if not in_org:
                raise HTTPException(status_code=404, detail="User not found")

        user = await conn.fetchrow(
            """
            SELECT id, name, email, "emailVerified" as email_verified,
                   "createdAt" as created_at, "updatedAt" as updated_at
            FROM users WHERE id = $1
            """,
            user_id
        )
        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        return UserDetail(**dict(user))


@router.get("/users/{user_id}/assignments", response_model=List[UserInstanceAssignment])
async def get_user_assignments(request: Request, user_id: str):
    """Get instance assignments for a user, scoped to caller's org."""
    caller = await _require_admin(request)
    db_pool: asyncpg.Pool = request.app.state.db_pool
    org_ids = await _get_caller_org_ids(db_pool, caller)

    async with db_pool.acquire() as conn:
        # Verify the target user is in caller's org scope
        if org_ids:
            in_org = await conn.fetchval(
                'SELECT EXISTS(SELECT 1 FROM org_members WHERE "userId" = $1 AND "orgId" = ANY($2))',
                user_id, org_ids,
            )
            if not in_org:
                raise HTTPException(status_code=404, detail="User not found")

        # Build query — filter assignments to org's instances if scoped
        if org_ids:
            assignments = await conn.fetch(
                """
                SELECT
                    uir.id, uir."userId" as user_id, uir."instanceId" as instance_id,
                    i.name as instance_name, i."siteId" as site_id, s.name as site_name,
                    uir.role, uir."createdAt" as assigned_at, uir."assignedBy" as assigned_by
                FROM user_instance_roles uir
                JOIN instances i ON uir."instanceId" = i.id
                JOIN sites s ON i."siteId" = s.id
                WHERE uir."userId" = $1 AND s."orgId" = ANY($2)
                ORDER BY s.name, i.name
                """,
                user_id, org_ids,
            )
        else:
            assignments = await conn.fetch(
                """
                SELECT
                    uir.id, uir."userId" as user_id, uir."instanceId" as instance_id,
                    i.name as instance_name, i."siteId" as site_id, s.name as site_name,
                    uir.role, uir."createdAt" as assigned_at, uir."assignedBy" as assigned_by
                FROM user_instance_roles uir
                JOIN instances i ON uir."instanceId" = i.id
                JOIN sites s ON i."siteId" = s.id
                WHERE uir."userId" = $1
                ORDER BY s.name, i.name
                """,
                user_id,
            )

        result = []
        for assignment in assignments:
            feature_perms = await conn.fetch(
                """
                SELECT feature, "canEdit" as can_edit, "canView" as can_view
                FROM user_feature_permissions
                WHERE "userInstanceRoleId" = $1
                """,
                assignment["id"]
            )
            permissions = [
                FeaturePermissionItem(
                    feature=fp["feature"], can_edit=fp["can_edit"], can_view=fp["can_view"]
                )
                for fp in feature_perms
            ]
            result.append(UserInstanceAssignment(
                id=assignment["id"],
                user_id=assignment["user_id"],
                instance_id=assignment["instance_id"],
                instance_name=assignment["instance_name"],
                site_id=assignment["site_id"],
                site_name=assignment["site_name"],
                role=assignment["role"],
                feature_permissions=permissions,
                assigned_at=assignment["assigned_at"],
                assigned_by=assignment["assigned_by"],
            ))

        return result


@router.post("/users", response_model=UserDetail)
async def create_user(request: Request, body: CreateUserRequest):
    """
    Create a new user and add them to the current organization.
    ORG_ADMIN cannot create PROJECT_ADMIN users.
    """
    caller = await _require_admin(request)
    db_pool: asyncpg.Pool = request.app.state.db_pool

    # Validate site_role
    allowed_roles = ["PROJECT_ADMIN", "ORG_ADMIN", "VIEWER"]
    if body.site_role not in allowed_roles:
        raise HTTPException(status_code=400, detail=f"site_role must be one of: {', '.join(allowed_roles)}")

    # ORG_ADMIN cannot create PROJECT_ADMIN users
    if not caller["is_project_admin"] and body.site_role == "PROJECT_ADMIN":
        raise HTTPException(
            status_code=403,
            detail="Only Project Admins can create other Project Admin users"
        )

    # Determine which org to add the user to
    org_id = caller["org_id"]
    if not org_id:
        if not caller["is_project_admin"]:
            # ORG_ADMIN must have an org context
            org_ids = await _get_caller_org_ids(db_pool, caller)
            if org_ids:
                org_id = org_ids[0]
        else:
            # PROJECT_ADMIN without org selected — use default org
            async with db_pool.acquire() as conn:
                org_id = await conn.fetchval(
                    "SELECT id FROM organizations WHERE slug = 'default' LIMIT 1"
                )

    if not org_id:
        raise HTTPException(status_code=400, detail="No organization context. Please select an organization first.")

    # Create user via Better Auth
    frontend_url = "http://frontend:3000"
    create_user_url = f"{frontend_url}/api/internal/create-user"

    async with httpx.AsyncClient(timeout=10.0, follow_redirects=False) as client:
        try:
            response = await client.post(
                create_user_url,
                json={
                    "email": body.email,
                    "password": body.password,
                    "name": body.name,
                },
                headers={"Content-Type": "application/json"},
            )
            if response.status_code != 200:
                error_data = response.json() if "application/json" in response.headers.get("content-type", "") else {}
                error_message = error_data.get("error", response.text or "Failed to create user")
                raise HTTPException(status_code=response.status_code, detail=error_message)

            result = response.json()
            user_id = result["user"]["id"]

        except httpx.RequestError as e:
            raise HTTPException(status_code=500, detail=f"Failed to connect to user creation service: {str(e)}")
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Unexpected error: {str(e)}")

    # Set the site role and add to org
    async with db_pool.acquire() as conn:
        async with conn.transaction():
            # Set site role
            await conn.execute(
                'UPDATE users SET role = $1, "updatedAt" = NOW() WHERE id = $2',
                body.site_role, user_id,
            )

            # Add user to the organization
            await conn.execute(
                """
                INSERT INTO org_members (id, "orgId", "userId", role, "createdAt")
                VALUES (gen_random_uuid()::text, $1, $2, 'MEMBER', NOW())
                ON CONFLICT ("orgId", "userId") DO NOTHING
                """,
                org_id, user_id,
            )

            # Fetch the created user
            user = await conn.fetchrow(
                """
                SELECT id, name, email, "emailVerified" as email_verified,
                       "createdAt" as created_at, "updatedAt" as updated_at
                FROM users WHERE id = $1
                """,
                user_id,
            )
            if not user:
                raise HTTPException(status_code=500, detail="User was created but not found in database")

            return UserDetail(**dict(user))


@router.put("/users/{user_id}", response_model=UserDetail)
async def update_user(request: Request, user_id: str, body: UpdateUserRequest):
    """
    Update a user. ORG_ADMIN cannot escalate users to PROJECT_ADMIN.
    """
    caller = await _require_admin(request)
    db_pool: asyncpg.Pool = request.app.state.db_pool
    org_ids = await _get_caller_org_ids(db_pool, caller)

    async with db_pool.acquire() as conn:
        # Verify user exists and is in caller's org scope
        if org_ids:
            in_org = await conn.fetchval(
                'SELECT EXISTS(SELECT 1 FROM org_members WHERE "userId" = $1 AND "orgId" = ANY($2))',
                user_id, org_ids,
            )
            if not in_org:
                raise HTTPException(status_code=404, detail="User not found")

        existing = await conn.fetchval("SELECT id FROM users WHERE id = $1", user_id)
        if not existing:
            raise HTTPException(status_code=404, detail="User not found")

        # Validate site_role
        if body.site_role is not None:
            allowed_roles = ["PROJECT_ADMIN", "ORG_ADMIN", "VIEWER"]
            if body.site_role not in allowed_roles:
                raise HTTPException(status_code=400, detail=f"site_role must be one of: {', '.join(allowed_roles)}")
            if not caller["is_project_admin"] and body.site_role == "PROJECT_ADMIN":
                raise HTTPException(status_code=403, detail="Only Project Admins can assign the Project Admin role")

        # Build update query
        updates = []
        params = []
        param_count = 1

        if body.name is not None:
            updates.append(f'name = ${param_count}')
            params.append(body.name)
            param_count += 1

        if body.email is not None:
            email_exists = await conn.fetchval(
                "SELECT id FROM users WHERE email = $1 AND id != $2", body.email, user_id
            )
            if email_exists:
                raise HTTPException(status_code=400, detail="Email already exists")
            updates.append(f'email = ${param_count}')
            params.append(body.email)
            param_count += 1

        if body.site_role is not None:
            updates.append(f'role = ${param_count}')
            params.append(body.site_role)
            param_count += 1

        if body.password is not None:
            raise HTTPException(status_code=400, detail="Password updates not supported. Please use the password reset flow.")

        if updates:
            updates.append('"updatedAt" = NOW()')
            params.append(user_id)
            query = f"UPDATE users SET {', '.join(updates)} WHERE id = ${param_count}"
            await conn.execute(query, *params)

        user = await conn.fetchrow(
            """
            SELECT id, name, email, "emailVerified" as email_verified,
                   "createdAt" as created_at, "updatedAt" as updated_at
            FROM users WHERE id = $1
            """,
            user_id
        )
        return UserDetail(**dict(user))


@router.delete("/users/{user_id}", response_model=SuccessResponse)
async def delete_user(request: Request, user_id: str):
    """Delete a user (org-scoped)."""
    caller = await _require_admin(request)
    db_pool: asyncpg.Pool = request.app.state.db_pool
    org_ids = await _get_caller_org_ids(db_pool, caller)

    if user_id == caller["user_id"]:
        raise HTTPException(status_code=400, detail="Cannot delete your own account")

    async with db_pool.acquire() as conn:
        # Verify user is in caller's org scope
        if org_ids:
            in_org = await conn.fetchval(
                'SELECT EXISTS(SELECT 1 FROM org_members WHERE "userId" = $1 AND "orgId" = ANY($2))',
                user_id, org_ids,
            )
            if not in_org:
                raise HTTPException(status_code=404, detail="User not found")

        existing = await conn.fetchval("SELECT id FROM users WHERE id = $1", user_id)
        if not existing:
            raise HTTPException(status_code=404, detail="User not found")

        # ORG_ADMIN cannot delete PROJECT_ADMIN users
        if not caller["is_project_admin"]:
            target_role = await conn.fetchval("SELECT role FROM users WHERE id = $1", user_id)
            if target_role in ("PROJECT_ADMIN", "ADMIN"):
                raise HTTPException(status_code=403, detail="Only Project Admins can delete other Project Admins")

        await conn.execute("DELETE FROM users WHERE id = $1", user_id)
        return SuccessResponse(success=True, message="User deleted successfully")


# ============================================================================
# Assignment Endpoints
# ============================================================================

@router.post("/assignments", response_model=AssignmentResponse)
async def assign_user_to_instances(request: Request, body: AssignUserRequest):
    """Assign a user to instance(s) with a role. Instances must belong to caller's org."""
    caller = await _require_admin(request)
    db_pool: asyncpg.Pool = request.app.state.db_pool
    org_ids = await _get_caller_org_ids(db_pool, caller)

    if body.role not in ["ADMIN", "OPERATOR", "VIEWER"]:
        raise HTTPException(status_code=400, detail="role must be ADMIN, OPERATOR, or VIEWER")

    async with db_pool.acquire() as conn:
        # Verify user exists and is in caller's org
        user_exists = await conn.fetchval("SELECT id FROM users WHERE id = $1", body.user_id)
        if not user_exists:
            raise HTTPException(status_code=404, detail="User not found")

        if org_ids:
            in_org = await conn.fetchval(
                'SELECT EXISTS(SELECT 1 FROM org_members WHERE "userId" = $1 AND "orgId" = ANY($2))',
                body.user_id, org_ids,
            )
            if not in_org:
                raise HTTPException(status_code=404, detail="User not found in your organization")

        # Verify all instances exist and belong to caller's org
        for instance_id in body.instance_ids:
            instance_exists = await conn.fetchval("SELECT id FROM instances WHERE id = $1", instance_id)
            if not instance_exists:
                raise HTTPException(status_code=404, detail=f"Instance {instance_id} not found")
            if not await _verify_instance_in_org(conn, instance_id, org_ids):
                raise HTTPException(status_code=403, detail=f"Instance {instance_id} is not in your organization")

        assignments_created = 0
        for instance_id in body.instance_ids:
            existing = await conn.fetchval(
                'SELECT id FROM user_instance_roles WHERE "userId" = $1 AND "instanceId" = $2',
                body.user_id, instance_id,
            )
            if not existing:
                assignment_id = await conn.fetchval(
                    """
                    INSERT INTO user_instance_roles
                    (id, "userId", "instanceId", role, "createdAt", "updatedAt", "assignedBy")
                    VALUES (gen_random_uuid()::text, $1, $2, $3, NOW(), NOW(), $4)
                    RETURNING id
                    """,
                    body.user_id, instance_id, body.role, caller["user_id"],
                )

                if body.feature_permissions:
                    for perm in body.feature_permissions:
                        await conn.execute(
                            """
                            INSERT INTO user_feature_permissions
                            (id, "userInstanceRoleId", feature, "canEdit", "canView", "createdAt")
                            VALUES (gen_random_uuid()::text, $1, $2::text::"FeatureGroup", $3, $4, NOW())
                            """,
                            assignment_id, perm.feature, perm.can_edit, perm.can_view,
                        )

                assignments_created += 1

        return AssignmentResponse(
            success=True,
            assignments_created=assignments_created,
            message=f"User assigned to {assignments_created} instance(s) successfully",
        )


@router.delete("/assignments/{assignment_id}", response_model=SuccessResponse)
async def remove_assignment(request: Request, assignment_id: str):
    """Remove a user's access to an instance (org-scoped)."""
    caller = await _require_admin(request)
    db_pool: asyncpg.Pool = request.app.state.db_pool
    org_ids = await _get_caller_org_ids(db_pool, caller)

    async with db_pool.acquire() as conn:
        # Verify assignment exists and instance is in caller's org
        row = await conn.fetchrow(
            """
            SELECT uir.id, s."orgId"
            FROM user_instance_roles uir
            JOIN instances i ON uir."instanceId" = i.id
            JOIN sites s ON i."siteId" = s.id
            WHERE uir.id = $1
            """,
            assignment_id,
        )
        if not row:
            raise HTTPException(status_code=404, detail="Assignment not found")
        if org_ids and row["orgId"] not in org_ids:
            raise HTTPException(status_code=403, detail="Assignment is not in your organization")

        await conn.execute("DELETE FROM user_instance_roles WHERE id = $1", assignment_id)
        return SuccessResponse(success=True, message="Assignment removed successfully")


@router.get("/instances/{instance_id}/users", response_model=List[InstanceUserListItem])
async def get_instance_users(request: Request, instance_id: str):
    """Get all users with access to a specific instance (org-scoped)."""
    caller = await _require_admin(request)
    db_pool: asyncpg.Pool = request.app.state.db_pool
    org_ids = await _get_caller_org_ids(db_pool, caller)

    async with db_pool.acquire() as conn:
        # Verify instance exists and is in caller's org
        instance_exists = await conn.fetchval("SELECT id FROM instances WHERE id = $1", instance_id)
        if not instance_exists:
            raise HTTPException(status_code=404, detail="Instance not found")
        if not await _verify_instance_in_org(conn, instance_id, org_ids):
            raise HTTPException(status_code=403, detail="Instance is not in your organization")

        users_data = await conn.fetch(
            """
            SELECT DISTINCT
                u.id as user_id, u.name as user_name, u.email as user_email,
                uir.role as instance_role, uir.id as assignment_id
            FROM users u
            JOIN user_instance_roles uir ON u.id = uir."userId"
            WHERE uir."instanceId" = $1
            ORDER BY u.name, u.email
            """,
            instance_id,
        )

        result = []
        for user in users_data:
            role = user["instance_role"]
            feature_permissions = None

            if role in ["OPERATOR", "VIEWER"]:
                perms_data = await conn.fetch(
                    """
                    SELECT feature, "canEdit" as can_edit, "canView" as can_view
                    FROM user_feature_permissions
                    WHERE "userInstanceRoleId" = $1
                    ORDER BY feature
                    """,
                    user["assignment_id"],
                )
                if perms_data:
                    feature_permissions = [
                        FeaturePermissionItem(
                            feature=perm["feature"], can_edit=perm["can_edit"], can_view=perm["can_view"]
                        )
                        for perm in perms_data
                    ]

            result.append(InstanceUserListItem(
                user_id=user["user_id"],
                user_name=user["user_name"],
                user_email=user["user_email"],
                role=role,
                feature_permissions=feature_permissions,
            ))

        return result
