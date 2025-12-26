"""
User Management Router

API endpoints for managing users, roles, and permissions.
SUPER_ADMIN only.
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
    is_super_admin,
    get_user_permissions,
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
    roles: List[str]  # List of role names


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


class UpdateUserRequest(BaseModel):
    """Request to update a user"""
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    password: Optional[str] = Field(None, min_length=8)


class CustomRoleListItem(BaseModel):
    """Custom role in list view"""
    id: str
    name: str
    description: Optional[str]
    created_at: datetime
    user_count: int  # How many users have this role


class CustomRoleDetail(BaseModel):
    """Detailed custom role information"""
    id: str
    name: str
    description: Optional[str]
    created_at: datetime
    updated_at: datetime
    created_by: str
    permissions: Dict[str, str]  # feature -> permission level


class CreateRoleRequest(BaseModel):
    """Request to create a custom role"""
    name: str = Field(..., min_length=1, max_length=50)
    description: Optional[str] = None
    permissions: Dict[str, str]  # feature -> permission level (READ/WRITE/NONE)


class UpdateRoleRequest(BaseModel):
    """Request to update a custom role"""
    name: Optional[str] = Field(None, min_length=1, max_length=50)
    description: Optional[str] = None
    permissions: Optional[Dict[str, str]] = None


class UserInstanceAssignment(BaseModel):
    """User assignment to an instance"""
    id: str
    user_id: str
    instance_id: str
    instance_name: str
    site_id: str
    site_name: str
    role_type: str  # "BUILT_IN" or "CUSTOM"
    built_in_role: Optional[str]
    custom_role_id: Optional[str]
    custom_role_name: Optional[str]
    assigned_at: datetime
    assigned_by: str


class AssignUserRequest(BaseModel):
    """Request to assign user to instance(s) with role(s)"""
    user_id: str
    instance_ids: List[str]  # Can assign to multiple instances at once
    roles: List[Dict[str, Optional[str]]]  # [{"type": "BUILT_IN", "builtInRole": "ADMIN"}, ...]


class InstanceUserListItem(BaseModel):
    """User with access to an instance"""
    user_id: str
    user_name: Optional[str]
    user_email: str
    roles: List[str]  # List of role names for this instance


# ============================================================================
# Helper Functions
# ============================================================================

async def check_super_admin_permission(request: Request) -> None:
    """
    Check if the current user is a SUPER_ADMIN.
    Raises HTTPException if not.
    """
    user = request.state.user
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")

    db_pool: asyncpg.Pool = request.app.state.db_pool
    is_admin = await is_super_admin(db_pool, user["id"])

    if not is_admin:
        raise HTTPException(
            status_code=403,
            detail="Insufficient permissions. SUPER_ADMIN role required."
        )


# ============================================================================
# User Endpoints
# ============================================================================

@router.get("/users", response_model=List[UserListItem])
async def list_users(request: Request):
    """Get list of all users with their instance counts and roles."""
    await check_super_admin_permission(request)

    db_pool: asyncpg.Pool = request.app.state.db_pool

    async with db_pool.acquire() as conn:
        users = await conn.fetch(
            """
            SELECT
                u.id,
                u.name,
                u.email,
                u."emailVerified" as email_verified,
                u."createdAt" as created_at,
                COUNT(DISTINCT uir."instanceId") as instance_count
            FROM users u
            LEFT JOIN user_instance_roles uir ON u.id = uir."userId"
            GROUP BY u.id, u.name, u.email, u."emailVerified", u."createdAt"
            ORDER BY u."createdAt" DESC
            """
        )

        result = []
        for user in users:
            # Get unique role names for this user
            roles_data = await conn.fetch(
                """
                SELECT DISTINCT
                    uir."builtInRole",
                    cr.name as custom_role_name
                FROM user_instance_roles uir
                LEFT JOIN custom_roles cr ON uir."customRoleId" = cr.id
                WHERE uir."userId" = $1
                """,
                user["id"]
            )

            roles = []
            for role in roles_data:
                if role["builtInRole"]:
                    roles.append(role["builtInRole"])
                elif role["custom_role_name"]:
                    roles.append(role["custom_role_name"])

            result.append(UserListItem(
                id=user["id"],
                name=user["name"],
                email=user["email"],
                email_verified=user["email_verified"],
                created_at=user["created_at"],
                instance_count=user["instance_count"],
                roles=list(set(roles))  # Deduplicate
            ))

        return result


@router.get("/users/{user_id}", response_model=UserDetail)
async def get_user(request: Request, user_id: str):
    """Get detailed information about a specific user."""
    await check_super_admin_permission(request)

    db_pool: asyncpg.Pool = request.app.state.db_pool

    async with db_pool.acquire() as conn:
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
async def get_user_assignments(request: Request, user_id: str):
    """Get all instance assignments for a specific user."""
    await check_super_admin_permission(request)

    db_pool: asyncpg.Pool = request.app.state.db_pool

    async with db_pool.acquire() as conn:
        assignments = await conn.fetch(
            """
            SELECT
                uir.id,
                uir."userId" as user_id,
                uir."instanceId" as instance_id,
                i.name as instance_name,
                i."siteId" as site_id,
                s.name as site_name,
                uir."roleType" as role_type,
                uir."builtInRole" as built_in_role,
                uir."customRoleId" as custom_role_id,
                cr.name as custom_role_name,
                uir."createdAt" as assigned_at,
                uir."assignedBy" as assigned_by
            FROM user_instance_roles uir
            JOIN instances i ON uir."instanceId" = i.id
            JOIN sites s ON i."siteId" = s.id
            LEFT JOIN custom_roles cr ON uir."customRoleId" = cr.id
            WHERE uir."userId" = $1
            ORDER BY s.name, i.name
            """,
            user_id
        )

        return [UserInstanceAssignment(**dict(a)) for a in assignments]


@router.post("/users", response_model=UserDetail)
async def create_user(request: Request, body: CreateUserRequest):
    """
    Create a new user by calling Better Auth's internal API.
    This ensures password hashing is handled correctly by Better Auth.
    """
    await check_super_admin_permission(request)

    db_pool: asyncpg.Pool = request.app.state.db_pool

    # Call Better Auth's internal user creation endpoint
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

    # Fetch the created user from database
    async with db_pool.acquire() as conn:
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
async def update_user(request: Request, user_id: str, body: UpdateUserRequest):
    """
    Update a user.

    Note: Password updates are not currently supported through this endpoint.
    Use the password reset flow for changing user passwords.
    """
    await check_super_admin_permission(request)

    db_pool: asyncpg.Pool = request.app.state.db_pool

    async with db_pool.acquire() as conn:
        # Check if user exists
        existing = await conn.fetchval("SELECT id FROM users WHERE id = $1", user_id)
        if not existing:
            raise HTTPException(status_code=404, detail="User not found")

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


@router.delete("/users/{user_id}")
async def delete_user(request: Request, user_id: str):
    """Delete a user."""
    await check_super_admin_permission(request)

    db_pool: asyncpg.Pool = request.app.state.db_pool
    current_user = request.state.user

    # Prevent self-deletion
    if user_id == current_user["id"]:
        raise HTTPException(status_code=400, detail="Cannot delete your own account")

    async with db_pool.acquire() as conn:
        # Check if user exists
        existing = await conn.fetchval("SELECT id FROM users WHERE id = $1", user_id)
        if not existing:
            raise HTTPException(status_code=404, detail="User not found")

        # Delete user (cascades to sessions, accounts, user_instance_roles, etc.)
        await conn.execute("DELETE FROM users WHERE id = $1", user_id)

        return {"success": True, "message": "User deleted successfully"}


# ============================================================================
# Custom Role Endpoints
# ============================================================================

@router.get("/roles", response_model=List[CustomRoleListItem])
async def list_custom_roles(request: Request):
    """Get list of all custom roles."""
    await check_super_admin_permission(request)

    db_pool: asyncpg.Pool = request.app.state.db_pool

    async with db_pool.acquire() as conn:
        roles = await conn.fetch(
            """
            SELECT
                cr.id,
                cr.name,
                cr.description,
                cr."createdAt" as created_at,
                COUNT(DISTINCT uir."userId") as user_count
            FROM custom_roles cr
            LEFT JOIN user_instance_roles uir ON cr.id = uir."customRoleId"
            GROUP BY cr.id, cr.name, cr.description, cr."createdAt"
            ORDER BY cr.name
            """
        )

        return [CustomRoleListItem(**dict(r)) for r in roles]


@router.get("/roles/{role_id}", response_model=CustomRoleDetail)
async def get_custom_role(request: Request, role_id: str):
    """Get detailed information about a custom role."""
    await check_super_admin_permission(request)

    db_pool: asyncpg.Pool = request.app.state.db_pool

    async with db_pool.acquire() as conn:
        role = await conn.fetchrow(
            """
            SELECT id, name, description, "createdAt" as created_at,
                   "updatedAt" as updated_at, "createdBy" as created_by
            FROM custom_roles
            WHERE id = $1
            """,
            role_id
        )

        if not role:
            raise HTTPException(status_code=404, detail="Role not found")

        # Get permissions
        perms = await conn.fetch(
            """
            SELECT feature, permission
            FROM feature_permissions
            WHERE "roleId" = $1
            """,
            role_id
        )

        permissions = {p["feature"]: p["permission"] for p in perms}

        return CustomRoleDetail(
            **dict(role),
            permissions=permissions
        )


@router.post("/roles", response_model=CustomRoleDetail)
async def create_custom_role(request: Request, body: CreateRoleRequest):
    """Create a new custom role."""
    await check_super_admin_permission(request)

    db_pool: asyncpg.Pool = request.app.state.db_pool
    current_user = request.state.user

    async with db_pool.acquire() as conn:
        # Check if name already exists
        existing = await conn.fetchval(
            "SELECT id FROM custom_roles WHERE name = $1",
            body.name
        )
        if existing:
            raise HTTPException(status_code=400, detail="Role name already exists")

        # Create role
        role_id = await conn.fetchval(
            """
            INSERT INTO custom_roles (id, name, description, "createdAt", "updatedAt", "createdBy")
            VALUES (gen_random_uuid()::text, $1, $2, NOW(), NOW(), $3)
            RETURNING id
            """,
            body.name,
            body.description,
            current_user["id"]
        )

        # Create permissions
        for feature, permission in body.permissions.items():
            if permission != "NONE":  # Don't store NONE permissions
                await conn.execute(
                    """
                    INSERT INTO feature_permissions (id, "roleId", feature, permission, "createdAt")
                    VALUES (gen_random_uuid()::text, $1, $2, $3, NOW())
                    """,
                    role_id,
                    feature,
                    permission
                )

        # Fetch created role
        role = await conn.fetchrow(
            """
            SELECT id, name, description, "createdAt" as created_at,
                   "updatedAt" as updated_at, "createdBy" as created_by
            FROM custom_roles
            WHERE id = $1
            """,
            role_id
        )

        return CustomRoleDetail(**dict(role), permissions=body.permissions)


@router.put("/roles/{role_id}", response_model=CustomRoleDetail)
async def update_custom_role(request: Request, role_id: str, body: UpdateRoleRequest):
    """Update a custom role."""
    await check_super_admin_permission(request)

    db_pool: asyncpg.Pool = request.app.state.db_pool

    async with db_pool.acquire() as conn:
        # Check if role exists
        existing = await conn.fetchval("SELECT id FROM custom_roles WHERE id = $1", role_id)
        if not existing:
            raise HTTPException(status_code=404, detail="Role not found")

        # Update role
        updates = []
        params = []
        param_count = 1

        if body.name is not None:
            # Check if new name already exists
            name_exists = await conn.fetchval(
                "SELECT id FROM custom_roles WHERE name = $1 AND id != $2",
                body.name,
                role_id
            )
            if name_exists:
                raise HTTPException(status_code=400, detail="Role name already exists")

            updates.append(f'name = ${param_count}')
            params.append(body.name)
            param_count += 1

        if body.description is not None:
            updates.append(f'description = ${param_count}')
            params.append(body.description)
            param_count += 1

        if updates:
            updates.append(f'"updatedAt" = NOW()')
            params.append(role_id)
            query = f"UPDATE custom_roles SET {', '.join(updates)} WHERE id = ${param_count}"
            await conn.execute(query, *params)

        # Update permissions if provided
        if body.permissions is not None:
            # Delete existing permissions
            await conn.execute(
                'DELETE FROM feature_permissions WHERE "roleId" = $1',
                role_id
            )

            # Insert new permissions
            for feature, permission in body.permissions.items():
                if permission != "NONE":
                    await conn.execute(
                        """
                        INSERT INTO feature_permissions (id, "roleId", feature, permission, "createdAt")
                        VALUES (gen_random_uuid()::text, $1, $2, $3, NOW())
                        """,
                        role_id,
                        feature,
                        permission
                    )

        # Fetch updated role with permissions
        role = await conn.fetchrow(
            """
            SELECT id, name, description, "createdAt" as created_at,
                   "updatedAt" as updated_at, "createdBy" as created_by
            FROM custom_roles
            WHERE id = $1
            """,
            role_id
        )

        perms = await conn.fetch(
            """
            SELECT feature, permission
            FROM feature_permissions
            WHERE "roleId" = $1
            """,
            role_id
        )

        permissions = {p["feature"]: p["permission"] for p in perms}

        return CustomRoleDetail(**dict(role), permissions=permissions)


@router.delete("/roles/{role_id}")
async def delete_custom_role(request: Request, role_id: str):
    """Delete a custom role."""
    await check_super_admin_permission(request)

    db_pool: asyncpg.Pool = request.app.state.db_pool

    async with db_pool.acquire() as conn:
        # Check if role exists
        existing = await conn.fetchval("SELECT id FROM custom_roles WHERE id = $1", role_id)
        if not existing:
            raise HTTPException(status_code=404, detail="Role not found")

        # Check if role is in use
        in_use = await conn.fetchval(
            """
            SELECT COUNT(*)
            FROM user_instance_roles
            WHERE "customRoleId" = $1
            """,
            role_id
        )

        if in_use > 0:
            raise HTTPException(
                status_code=400,
                detail=f"Cannot delete role. It is assigned to {in_use} user(s)."
            )

        # Delete role (cascades to feature_permissions)
        await conn.execute("DELETE FROM custom_roles WHERE id = $1", role_id)

        return {"success": True, "message": "Role deleted successfully"}


# ============================================================================
# Assignment Endpoints
# ============================================================================

@router.post("/assignments")
async def assign_user_to_instances(request: Request, body: AssignUserRequest):
    """Assign a user to instance(s) with role(s)."""
    await check_super_admin_permission(request)

    db_pool: asyncpg.Pool = request.app.state.db_pool
    current_user = request.state.user

    async with db_pool.acquire() as conn:
        # Verify user exists
        user_exists = await conn.fetchval("SELECT id FROM users WHERE id = $1", body.user_id)
        if not user_exists:
            raise HTTPException(status_code=404, detail="User not found")

        # Verify instances exist
        for instance_id in body.instance_ids:
            instance_exists = await conn.fetchval("SELECT id FROM instances WHERE id = $1", instance_id)
            if not instance_exists:
                raise HTTPException(status_code=404, detail=f"Instance {instance_id} not found")

        # Create assignments
        for instance_id in body.instance_ids:
            for role in body.roles:
                role_type = role.get("type")
                built_in_role = role.get("builtInRole")
                custom_role_id = role.get("customRoleId")

                # Check if assignment already exists
                existing = await conn.fetchval(
                    """
                    SELECT id FROM user_instance_roles
                    WHERE "userId" = $1 AND "instanceId" = $2
                      AND "roleType" = $3
                      AND ("builtInRole" = $4 OR $4 IS NULL)
                      AND ("customRoleId" = $5 OR $5 IS NULL)
                    """,
                    body.user_id,
                    instance_id,
                    role_type,
                    built_in_role,
                    custom_role_id
                )

                if not existing:
                    await conn.execute(
                        """
                        INSERT INTO user_instance_roles
                        (id, "userId", "instanceId", "roleType", "builtInRole", "customRoleId", "createdAt", "updatedAt", "assignedBy")
                        VALUES (gen_random_uuid()::text, $1, $2, $3, $4, $5, NOW(), NOW(), $6)
                        """,
                        body.user_id,
                        instance_id,
                        role_type,
                        built_in_role,
                        custom_role_id,
                        current_user["id"]
                    )

        return {"success": True, "message": "User assigned successfully"}


@router.delete("/assignments/{assignment_id}")
async def remove_assignment(request: Request, assignment_id: str):
    """Remove a user's access to an instance."""
    await check_super_admin_permission(request)

    db_pool: asyncpg.Pool = request.app.state.db_pool

    async with db_pool.acquire() as conn:
        # Check if assignment exists
        existing = await conn.fetchval("SELECT id FROM user_instance_roles WHERE id = $1", assignment_id)
        if not existing:
            raise HTTPException(status_code=404, detail="Assignment not found")

        # Delete assignment
        await conn.execute("DELETE FROM user_instance_roles WHERE id = $1", assignment_id)

        return {"success": True, "message": "Assignment removed successfully"}


@router.get("/instances/{instance_id}/users", response_model=List[InstanceUserListItem])
async def get_instance_users(request: Request, instance_id: str):
    """Get all users with access to a specific instance."""
    await check_super_admin_permission(request)

    db_pool: asyncpg.Pool = request.app.state.db_pool

    async with db_pool.acquire() as conn:
        # Verify instance exists
        instance_exists = await conn.fetchval("SELECT id FROM instances WHERE id = $1", instance_id)
        if not instance_exists:
            raise HTTPException(status_code=404, detail="Instance not found")

        # Get users with access
        users_data = await conn.fetch(
            """
            SELECT DISTINCT u.id as user_id, u.name as user_name, u.email as user_email
            FROM users u
            JOIN user_instance_roles uir ON u.id = uir."userId"
            WHERE uir."instanceId" = $1
            ORDER BY u.name, u.email
            """,
            instance_id
        )

        result = []
        for user in users_data:
            # Get roles for this user on this instance
            roles_data = await conn.fetch(
                """
                SELECT uir."builtInRole", cr.name as custom_role_name
                FROM user_instance_roles uir
                LEFT JOIN custom_roles cr ON uir."customRoleId" = cr.id
                WHERE uir."userId" = $1 AND uir."instanceId" = $2
                """,
                user["user_id"],
                instance_id
            )

            roles = []
            for role in roles_data:
                if role["builtInRole"]:
                    roles.append(role["builtInRole"])
                elif role["custom_role_name"]:
                    roles.append(role["custom_role_name"])

            result.append(InstanceUserListItem(
                user_id=user["user_id"],
                user_name=user["user_name"],
                user_email=user["user_email"],
                roles=roles
            ))

        return result
