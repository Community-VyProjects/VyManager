"""
User Management Router

API endpoints for managing users, roles, and permissions.
ADMIN only.
"""
import os

from fastapi import Depends, APIRouter, HTTPException, Request
from org_scope import assert_row_in_acting_org, org_conn_admin
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
)
from fastapi_permissions import require_super_admin

router = APIRouter(prefix="/user-management", tags=["user-management"])

FRONTEND_INTERNAL_URL = os.getenv("FRONTEND_INTERNAL_URL", "http://frontend:3000")


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
    site_role: str  # ADMIN or VIEWER
    sso_role_managed: bool = False  # signs in via a role-mapping-enabled provider


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
    site_role: str = Field(..., description="Site role: ADMIN or VIEWER")


class UpdateUserRequest(BaseModel):
    """Request to update a user"""
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    password: Optional[str] = Field(None, min_length=8)
    site_role: Optional[str] = Field(None, description="Site role: ADMIN or VIEWER")


class FeaturePermissionItem(BaseModel):
    """Feature permission for a user assignment"""
    feature: str  # FeatureGroup enum value
    can_edit: bool
    can_view: bool


class UserInstanceAssignment(BaseModel):
    """User assignment to an instance or a whole site."""
    id: str
    user_id: str
    instance_id: Optional[str] = None   # null for a whole-site grant
    instance_name: Optional[str] = None
    site_id: str                        # instance's site, or the granted site
    site_name: str
    is_site_grant: bool = False         # True when this grants the whole site
    role: str  # InstanceRole: ADMIN, OPERATOR, or VIEWER
    feature_permissions: List[FeaturePermissionItem]  # Only used for OPERATOR/VIEWER
    assigned_at: datetime
    assigned_by: str


class AssignUserRequest(BaseModel):
    """Request to assign a user to instance(s) and/or whole site(s) with a role."""
    user_id: str
    instance_ids: List[str] = []  # Specific instances
    site_ids: List[str] = []      # Whole sites (cover all instances, incl. future)
    role: str  # InstanceRole: ADMIN, OPERATOR, or VIEWER
    feature_permissions: Optional[List[FeaturePermissionItem]] = None  # Only for OPERATOR/VIEWER


class InstanceUserListItem(BaseModel):
    """User with access to an instance"""
    user_id: str
    user_name: Optional[str]
    user_email: str
    role: str  # Instance role: ADMIN, OPERATOR, or VIEWER
    feature_permissions: Optional[List[FeaturePermissionItem]] = None  # Only for OPERATOR/VIEWER


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

# ============================================================================
# User Endpoints
# ============================================================================

@router.get("/my-permissions", response_model=MyPermissionsResponse)
async def get_my_permissions(request: Request, conn: asyncpg.Connection = Depends(org_conn_admin)):
    """
    Get the current user's permissions for their active instance.

    Returns a dictionary mapping feature groups to permission levels.
    This endpoint does NOT require admin permission - any authenticated user
    can check their own permissions.
    """
    user = request.state.user
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")

    # Get user's active session to find which instance they're connected to
    active_session = await conn.fetchrow(
        """
        SELECT "instanceId"
        FROM active_sessions
        WHERE "userId" = $1
        LIMIT 1
        """,
        user["id"]
    )

    if not active_session:
        # User has no active session - return empty permissions
        return MyPermissionsResponse(has_active_session=False, permissions={})

    instance_id = active_session["instanceId"]

    # Get user's permissions for this instance
    permissions = await get_user_permissions(conn, user["id"], instance_id)

    # Convert enum values to strings for JSON serialization
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
async def list_users(request: Request, conn: asyncpg.Connection = Depends(org_conn_admin)):
    """Get list of all users with their instance counts and site roles."""
    await require_super_admin(request)

    users = await conn.fetch(
        """
        SELECT
            u.id,
            u.name,
            u.email,
            u."emailVerified" as email_verified,
            u."createdAt" as created_at,
            u.role as site_role,
            COUNT(DISTINCT uir."instanceId") as instance_count,
            EXISTS (
                SELECT 1 FROM accounts acc
                JOIN oauth_providers op ON op."providerId" = acc."providerId"
                WHERE acc."userId" = u.id AND op."roleMappingEnabled" = true
            ) as sso_role_managed
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
        sso_role_managed=user["sso_role_managed"]
    ) for user in users]


@router.get("/users/{user_id}", response_model=UserDetail)
async def get_user(request: Request, user_id: str, conn: asyncpg.Connection = Depends(org_conn_admin)):
    """Get detailed information about a specific user."""
    await require_super_admin(request)

    user = await conn.fetchrow(
        """
        SELECT id, name, email, "emailVerified" as email_verified,
               "createdAt" as created_at, "updatedAt" as updated_at
        FROM users
        WHERE id = $1
        """,
        user_id
    )

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    return UserDetail(**dict(user))


@router.get("/users/{user_id}/assignments", response_model=List[UserInstanceAssignment])
async def get_user_assignments(request: Request, user_id: str, conn: asyncpg.Connection = Depends(org_conn_admin)):
    """Get all instance assignments for a specific user."""
    await require_super_admin(request)

    assignments = await conn.fetch(
        """
        SELECT
            uir.id,
            uir."userId" as user_id,
            uir."instanceId" as instance_id,
            i.name as instance_name,
            COALESCE(uir."siteId", i."siteId") as site_id,
            COALESCE(sg.name, s.name) as site_name,
            (uir."siteId" IS NOT NULL) as is_site_grant,
            uir.role,
            uir."createdAt" as assigned_at,
            uir."assignedBy" as assigned_by
        FROM user_instance_roles uir
        LEFT JOIN instances i ON uir."instanceId" = i.id
        LEFT JOIN sites s ON i."siteId" = s.id
        LEFT JOIN sites sg ON uir."siteId" = sg.id
        WHERE uir."userId" = $1
        ORDER BY COALESCE(sg.name, s.name), i.name NULLS FIRST
        """,
        user_id
    )

    result = []
    for assignment in assignments:
        # Get feature permissions for this assignment
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
                feature=fp["feature"],
                can_edit=fp["can_edit"],
                can_view=fp["can_view"]
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
            is_site_grant=assignment["is_site_grant"],
            role=assignment["role"],
            feature_permissions=permissions,
            assigned_at=assignment["assigned_at"],
            assigned_by=assignment["assigned_by"]
        ))

    return result


@router.post("/users", response_model=UserDetail)
async def create_user(request: Request, body: CreateUserRequest, conn: asyncpg.Connection = Depends(org_conn_admin)):
    """
    Create a new user by calling Better Auth's internal API.
    This ensures password hashing is handled correctly by Better Auth.
    Then sets the site role in the database.
    """
    await require_super_admin(request)

    # Validate site_role
    if body.site_role not in ["ADMIN", "VIEWER"]:
        raise HTTPException(status_code=400, detail="site_role must be ADMIN or VIEWER")

    # Call Better Auth's internal user creation endpoint
    frontend_url = FRONTEND_INTERNAL_URL.rstrip("/")
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
            raise HTTPException(
                status_code=500,
                detail=f"Failed to connect to user creation service: {str(e)}"
            )
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(
                status_code=500,
                detail=f"Unexpected error: {str(e)}"
            )

    # Set the site role in the database
    await conn.execute(
        """
        UPDATE users
        SET role = $1, "updatedAt" = NOW()
        WHERE id = $2
        """,
        body.site_role,
        user_id
    )

    # Fetch the created user from database
    user = await conn.fetchrow(
        """
        SELECT id, name, email, "emailVerified" as email_verified,
               "createdAt" as created_at, "updatedAt" as updated_at
        FROM users
        WHERE id = $1
        """,
        user_id
    )

    if not user:
        raise HTTPException(
            status_code=500,
            detail="User was created but not found in database"
        )

    return UserDetail(**dict(user))


@router.put("/users/{user_id}", response_model=UserDetail)
async def update_user(request: Request, user_id: str, body: UpdateUserRequest, conn: asyncpg.Connection = Depends(org_conn_admin)):
    """
    Update a user.

    Note: Password updates are not currently supported through this endpoint.
    Use the password reset flow for changing user passwords.
    """
    await require_super_admin(request)

    # Check if user exists
    existing = await conn.fetchval("SELECT id FROM users WHERE id = $1", user_id)
    if not existing:
        raise HTTPException(status_code=404, detail="User not found")

    # Validate site_role if provided
    if body.site_role is not None and body.site_role not in ["ADMIN", "VIEWER"]:
        raise HTTPException(status_code=400, detail="site_role must be ADMIN or VIEWER")

    # Update user
    updates = []
    params = []
    param_count = 1

    if body.name is not None:
        updates.append(f'name = ${param_count}')
        params.append(body.name)
        param_count += 1

    if body.email is not None:
        # Check if new email already exists
        email_exists = await conn.fetchval(
            "SELECT id FROM users WHERE email = $1 AND id != $2",
            body.email,
            user_id
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
        # Password updates not supported - require password reset flow
        raise HTTPException(
            status_code=400,
            detail="Password updates not supported. Please use the password reset flow."
        )

    if updates:
        updates.append(f'"updatedAt" = NOW()')
        params.append(user_id)
        query = f"UPDATE users SET {', '.join(updates)} WHERE id = ${param_count}"
        await conn.execute(query, *params)

    # Fetch updated user
    user = await conn.fetchrow(
        """
        SELECT id, name, email, "emailVerified" as email_verified,
               "createdAt" as created_at, "updatedAt" as updated_at
        FROM users
        WHERE id = $1
        """,
        user_id
    )

    return UserDetail(**dict(user))


@router.delete("/users/{user_id}", response_model=SuccessResponse)
async def delete_user(request: Request, user_id: str, conn: asyncpg.Connection = Depends(org_conn_admin)):
    """Delete a user."""
    await require_super_admin(request)

    current_user = request.state.user

    # Prevent self-deletion
    if user_id == current_user["id"]:
        raise HTTPException(status_code=400, detail="Cannot delete your own account")

    # Check if user exists
    existing = await conn.fetchval("SELECT id FROM users WHERE id = $1", user_id)
    if not existing:
        raise HTTPException(status_code=404, detail="User not found")

    # Delete user (cascades to sessions, accounts, user_instance_roles, etc.)
    await conn.execute("DELETE FROM users WHERE id = $1", user_id)

    return SuccessResponse(success=True, message="User deleted successfully")


# ============================================================================
# Assignment Endpoints
# ============================================================================

@router.post("/assignments", response_model=AssignmentResponse)
async def assign_user_to_instances(request: Request, body: AssignUserRequest, conn: asyncpg.Connection = Depends(org_conn_admin)):
    """Assign a user to instance(s) with a role and optional feature permissions."""
    await require_super_admin(request)

    current_user = request.state.user

    # Validate role
    if body.role not in ["ADMIN", "OPERATOR", "VIEWER"]:
        raise HTTPException(status_code=400, detail="role must be ADMIN, OPERATOR, or VIEWER")

    # Verify user exists
    user_exists = await conn.fetchval("SELECT id FROM users WHERE id = $1", body.user_id)
    if not user_exists:
        raise HTTPException(status_code=404, detail="User not found")

    # Verify instances exist
    for instance_id in body.instance_ids:
        if not await conn.fetchval("SELECT id FROM instances WHERE id = $1", instance_id):
            raise HTTPException(status_code=404, detail=f"Instance {instance_id} not found")

    # Verify sites exist
    for site_id in body.site_ids:
        if not await conn.fetchval("SELECT id FROM sites WHERE id = $1", site_id):
            raise HTTPException(status_code=404, detail=f"Site {site_id} not found")

    async def insert_feature_perms(assignment_id: str):
        # Feature permissions only apply to OPERATOR/VIEWER.
        if not body.feature_permissions:
            return
        for perm in body.feature_permissions:
            await conn.execute(
                """
                INSERT INTO user_feature_permissions
                (id, "userInstanceRoleId", feature, "canEdit", "canView", "createdAt")
                VALUES (gen_random_uuid()::text, $1, $2, $3, $4, NOW())
                """,
                assignment_id, perm.feature, perm.can_edit, perm.can_view,
            )

    assignments_created = 0

    # Per-instance grants
    for instance_id in body.instance_ids:
        existing = await conn.fetchval(
            'SELECT id FROM user_instance_roles WHERE "userId" = $1 AND "instanceId" = $2',
            body.user_id, instance_id,
        )
        if existing:
            continue
        assignment_id = await conn.fetchval(
            """
            INSERT INTO user_instance_roles
            (id, "userId", "instanceId", role, "createdAt", "updatedAt", "assignedBy")
            VALUES (gen_random_uuid()::text, $1, $2, $3, NOW(), NOW(), $4)
            RETURNING id
            """,
            body.user_id, instance_id, body.role, current_user["id"],
        )
        await insert_feature_perms(assignment_id)
        assignments_created += 1

    # Whole-site grants (cover every instance in the site, incl. future ones)
    for site_id in body.site_ids:
        existing = await conn.fetchval(
            'SELECT id FROM user_instance_roles WHERE "userId" = $1 AND "siteId" = $2',
            body.user_id, site_id,
        )
        if existing:
            continue
        assignment_id = await conn.fetchval(
            """
            INSERT INTO user_instance_roles
            (id, "userId", "siteId", role, "createdAt", "updatedAt", "assignedBy")
            VALUES (gen_random_uuid()::text, $1, $2, $3, NOW(), NOW(), $4)
            RETURNING id
            """,
            body.user_id, site_id, body.role, current_user["id"],
        )
        await insert_feature_perms(assignment_id)
        assignments_created += 1

    return AssignmentResponse(
        success=True,
        assignments_created=assignments_created,
        message=f"Created {assignments_created} grant(s) successfully",
    )


@router.delete("/assignments/{assignment_id}", response_model=SuccessResponse)
async def remove_assignment(request: Request, assignment_id: str, conn: asyncpg.Connection = Depends(org_conn_admin)):
    """Remove a user's access to an instance."""
    await require_super_admin(request)

    # Resolve the grant's organization (via its instance's site, or its
    # whole-site grant) and confirm it is in the caller's org before deleting.
    grant_org = await conn.fetchval(
        '''
        SELECT COALESCE(si."orgId", ss."orgId")
        FROM user_instance_roles uir
        LEFT JOIN instances i ON uir."instanceId" = i.id
        LEFT JOIN sites si ON i."siteId" = si.id
        LEFT JOIN sites ss ON uir."siteId" = ss.id
        WHERE uir.id = $1
        ''',
        assignment_id,
    )
    if grant_org is None:
        raise HTTPException(status_code=404, detail="Assignment not found")
    await assert_row_in_acting_org(request, conn, grant_org)

    # Delete assignment
    await conn.execute("DELETE FROM user_instance_roles WHERE id = $1", assignment_id)

    return SuccessResponse(success=True, message="Assignment removed successfully")


@router.get("/instances/{instance_id}/users", response_model=List[InstanceUserListItem])
async def get_instance_users(request: Request, instance_id: str, conn: asyncpg.Connection = Depends(org_conn_admin)):
    """Get all users with access to a specific instance."""
    await require_super_admin(request)

    # Verify instance exists
    instance_exists = await conn.fetchval("SELECT id FROM instances WHERE id = $1", instance_id)
    if not instance_exists:
        raise HTTPException(status_code=404, detail="Instance not found")

    # Get users with access and their instance roles
    users_data = await conn.fetch(
        """
        SELECT DISTINCT
            u.id as user_id,
            u.name as user_name,
            u.email as user_email,
            uir.role as instance_role,
            uir.id as assignment_id
        FROM users u
        JOIN user_instance_roles uir ON u.id = uir."userId"
        WHERE uir."instanceId" = $1
        ORDER BY u.name, u.email
        """,
        instance_id
    )

    result = []
    for user in users_data:
        role = user["instance_role"]
        feature_permissions = None

        # For OPERATOR/VIEWER roles, fetch feature permissions
        if role in ["OPERATOR", "VIEWER"]:
            perms_data = await conn.fetch(
                """
                SELECT feature, "canEdit" as can_edit, "canView" as can_view
                FROM user_feature_permissions
                WHERE "userInstanceRoleId" = $1
                ORDER BY feature
                """,
                user["assignment_id"]
            )

            if perms_data:
                feature_permissions = [
                    FeaturePermissionItem(
                        feature=perm["feature"],
                        can_edit=perm["can_edit"],
                        can_view=perm["can_view"]
                    )
                    for perm in perms_data
                ]

        result.append(InstanceUserListItem(
            user_id=user["user_id"],
            user_name=user["user_name"],
            user_email=user["user_email"],
            role=role,
            feature_permissions=feature_permissions
        ))

    return result
