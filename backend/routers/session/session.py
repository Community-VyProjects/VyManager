"""
Session Management Router

API endpoints for managing user sessions with VyOS instances.
Handles connect/disconnect operations and instance selection.
"""

from fastapi import APIRouter, HTTPException, Request, UploadFile, File
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from typing import List, Dict, Optional, Any
from datetime import datetime
import asyncpg
import csv
import io
from vyos_service import VyOSService, VyOSDeviceConfig

router = APIRouter(prefix="/session", tags=["session"])


# ============================================================================
# Pydantic Models
# ============================================================================


class OnboardingStatusResponse(BaseModel):
    """Response indicating if system needs onboarding."""

    needs_onboarding: bool
    user_count: int


class SiteResponse(BaseModel):
    """Response model for a site."""

    id: str
    name: str
    description: Optional[str] = None
    role: str  # User's role in this site (OWNER, ADMIN, VIEWER)
    created_at: datetime
    updated_at: datetime


class SiteCreateRequest(BaseModel):
    """Request model for creating a site."""

    name: str = Field(..., min_length=1, max_length=255, description="Site name")
    description: Optional[str] = Field(None, description="Site description")


class SiteUpdateRequest(BaseModel):
    """Request model for updating a site."""

    name: Optional[str] = Field(None, min_length=1, max_length=255, description="Site name")
    description: Optional[str] = Field(None, description="Site description")


class InstanceResponse(BaseModel):
    """Response model for an instance."""

    id: str
    site_id: str
    name: str
    description: Optional[str] = None
    host: str
    port: int
    is_active: bool
    vyos_version: Optional[str] = None
    created_at: datetime
    updated_at: datetime


class InstanceCreateRequest(BaseModel):
    """Request model for creating an instance."""

    site_id: str = Field(..., description="Site ID")
    name: str = Field(..., min_length=1, max_length=255, description="Instance name")
    description: Optional[str] = Field(None, description="Instance description")
    host: str = Field(..., description="VyOS device IP or hostname")
    port: int = Field(default=443, ge=1, le=65535, description="VyOS API port")
    api_key: str = Field(..., description="VyOS API key")
    vyos_version: str = Field(..., description="VyOS version (1.4 or 1.5)")
    protocol: str = Field(default="https", description="Protocol (http or https)")
    verify_ssl: bool = Field(default=False, description="Verify SSL certificate")
    is_active: bool = Field(default=True, description="Whether instance is active")


class InstanceUpdateRequest(BaseModel):
    """Request model for updating an instance."""

    name: Optional[str] = Field(None, min_length=1, max_length=255, description="Instance name")
    description: Optional[str] = Field(None, description="Instance description")
    host: Optional[str] = Field(None, description="VyOS device IP or hostname")
    port: Optional[int] = Field(None, ge=1, le=65535, description="VyOS API port")
    api_key: Optional[str] = Field(None, description="VyOS API key")
    vyos_version: Optional[str] = Field(None, description="VyOS version (1.4 or 1.5)")
    protocol: Optional[str] = Field(None, description="Protocol (http or https)")
    verify_ssl: Optional[bool] = Field(None, description="Verify SSL certificate")
    is_active: Optional[bool] = Field(None, description="Whether instance is active")
    site_id: Optional[str] = Field(None, description="Move to different site")


class ActiveSessionResponse(BaseModel):
    """Response model for active session."""

    instance_id: str
    instance_name: str
    site_id: str
    site_name: str
    host: str
    port: int
    connected_at: datetime


class ConnectRequest(BaseModel):
    """Request model for connecting to an instance."""

    instance_id: str = Field(..., description="Instance ID to connect to")


class ApiResponse(BaseModel):
    """Standard API response."""

    success: bool
    message: str
    data: Optional[Dict[str, Any]] = None


# ============================================================================
# Endpoint: Check Onboarding Status
# ============================================================================


@router.get("/onboarding-status", response_model=OnboardingStatusResponse)
async def get_onboarding_status(request: Request):
    """
    Check if the system needs initial onboarding setup.

    Returns True if no users exist in the system.
    """
    db_pool: asyncpg.Pool = request.app.state.db_pool
    if not db_pool:
        raise HTTPException(status_code=503, detail="Database not available")

    try:
        async with db_pool.acquire() as conn:
            # Count users
            result = await conn.fetchrow('SELECT COUNT(*) as count FROM users')
            user_count = result['count']

            return OnboardingStatusResponse(
                needs_onboarding=user_count == 0,
                user_count=user_count
            )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")


# ============================================================================
# Endpoint: Get Current Active Session
# ============================================================================


@router.get("/current", response_model=Optional[ActiveSessionResponse])
async def get_current_session(request: Request):
    """
    Get the user's current active session (which instance they're connected to).

    Returns null if no active session.
    """
    # Get user from request state (set by AuthenticationMiddleware)
    if not hasattr(request.state, "user") or not request.state.user:
        raise HTTPException(status_code=401, detail="Not authenticated")

    user = request.state.user
    user_id = user["id"]

    # Get database pool from app state
    db_pool: asyncpg.Pool = request.app.state.db_pool
    if not db_pool:
        raise HTTPException(status_code=503, detail="Database not available")

    try:
        async with db_pool.acquire() as conn:
            # Get active session with instance and site details
            session = await conn.fetchrow(
                """
                SELECT
                    a.id as session_id,
                    a."instanceId" as instance_id,
                    a."connectedAt" as connected_at,
                    i.name as instance_name,
                    i.host,
                    i.port,
                    i."siteId" as site_id,
                    s.name as site_name
                FROM active_sessions a
                JOIN instances i ON a."instanceId" = i.id
                JOIN sites s ON i."siteId" = s.id
                WHERE a."userId" = $1
                """,
                user_id,
            )

            if not session:
                return None

            return ActiveSessionResponse(
                instance_id=session["instance_id"],
                instance_name=session["instance_name"],
                site_id=session["site_id"],
                site_name=session["site_name"],
                host=session["host"],
                port=session["port"],
                connected_at=session["connected_at"],
            )

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")


# ============================================================================
# Endpoint: Connect to Instance
# ============================================================================


@router.post("/connect", response_model=ApiResponse)
async def connect_to_instance(request: Request, body: ConnectRequest):
    """
    Connect to a specific VyOS instance.

    This sets the user's active session to the specified instance.
    Only one instance can be active at a time per user.
    """
    # Get user from request state
    if not hasattr(request.state, "user") or not request.state.user:
        raise HTTPException(status_code=401, detail="Not authenticated")

    user = request.state.user
    user_id = user["id"]
    instance_id = body.instance_id

    # Get database pool
    db_pool: asyncpg.Pool = request.app.state.db_pool
    if not db_pool:
        raise HTTPException(status_code=503, detail="Database not available")

    try:
        async with db_pool.acquire() as conn:
            # Verify instance exists and user has permission
            # Get ALL instance details including API credentials for connection test
            instance = await conn.fetchrow(
                """
                SELECT i.id, i.name, i.host, i.port, i."siteId", i."isActive",
                       i."apiKey", i.protocol, i."verifySsl", i."vyosVersion",
                       s.name as site_name, p.role
                FROM instances i
                JOIN sites s ON i."siteId" = s.id
                JOIN permissions p ON s.id = p."siteId" AND p."userId" = $1
                WHERE i.id = $2
                """,
                user_id,
                instance_id,
            )

            if not instance:
                raise HTTPException(
                    status_code=404,
                    detail="Instance not found or you don't have permission to access it",
                )

            if not instance["isActive"]:
                raise HTTPException(
                    status_code=400,
                    detail=f"Instance '{instance['name']}' is not active",
                )

            # Test the connection to VyOS before creating session
            try:
                device_config = VyOSDeviceConfig(
                    hostname=instance["host"],
                    apikey=instance["apiKey"],
                    version=instance["vyosVersion"],
                    protocol=instance["protocol"],
                    port=instance["port"],
                    verify=instance["verifySsl"],
                    timeout=10,
                )
                vyos_service = VyOSService(device_config)

                # Test connection by fetching config (this will raise exception if connection fails)
                vyos_service.get_full_config()

            except Exception as e:
                error_msg = str(e)
                raise HTTPException(
                    status_code=503,
                    detail=f"Failed to connect to VyOS instance: {error_msg}. Please verify the host, port, API key, and network connectivity.",
                )

            # Get current auth session token from cookie
            # This allows us to track which auth session created this VyOS connection
            cookie_token = request.cookies.get("better-auth.session_token")
            # Extract session ID (everything before the first dot)
            current_session_token = cookie_token.split(".")[0] if cookie_token else None

            # Create or update active session (upsert)
            # Generate a 32-character ID similar to CUIDs used elsewhere in the database
            import secrets
            import string
            alphabet = string.ascii_letters + string.digits
            session_id = ''.join(secrets.choice(alphabet) for _ in range(32))

            result = await conn.execute(
                """
                INSERT INTO active_sessions (id, "userId", "instanceId", "sessionToken", "connectedAt")
                VALUES ($1, $2, $3, $4, NOW())
                ON CONFLICT ("userId")
                DO UPDATE SET "instanceId" = $3, "sessionToken" = $4, "connectedAt" = NOW()
                """,
                session_id,
                user_id,
                instance_id,
                current_session_token,
            )

            return ApiResponse(
                success=True,
                message=f"Connected to instance '{instance['name']}'",
                data={
                    "instance_id": instance_id,
                    "instance_name": instance["name"],
                    "site_id": instance["siteId"],
                    "site_name": instance["site_name"],
                    "host": instance["host"],
                    "port": instance["port"],
                },
            )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")


# ============================================================================
# Endpoint: Disconnect from Instance
# ============================================================================


@router.post("/disconnect", response_model=ApiResponse)
async def disconnect_from_instance(request: Request):
    """
    Disconnect from the current VyOS instance.

    This removes the user's active session.
    """
    # Get user from request state
    if not hasattr(request.state, "user") or not request.state.user:
        raise HTTPException(status_code=401, detail="Not authenticated")

    user = request.state.user
    user_id = user["id"]

    # Get database pool
    db_pool: asyncpg.Pool = request.app.state.db_pool
    if not db_pool:
        raise HTTPException(status_code=503, detail="Database not available")

    try:
        async with db_pool.acquire() as conn:
            # Delete active session
            result = await conn.execute(
                """
                DELETE FROM active_sessions
                WHERE "userId" = $1
                """,
                user_id,
            )

            # Check if a session was deleted
            if result == "DELETE 0":
                raise HTTPException(
                    status_code=404, detail="No active session to disconnect"
                )

            return ApiResponse(
                success=True,
                message="Disconnected from instance",
            )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")


# ============================================================================
# Endpoint: List User's Sites
# ============================================================================


@router.get("/sites", response_model=List[SiteResponse])
async def list_user_sites(request: Request):
    """
    Get all sites the user has access to.

    Returns sites with the user's role in each site.
    """
    # Get user from request state
    if not hasattr(request.state, "user") or not request.state.user:
        raise HTTPException(status_code=401, detail="Not authenticated")

    user = request.state.user
    user_id = user["id"]

    # Get database pool
    db_pool: asyncpg.Pool = request.app.state.db_pool
    if not db_pool:
        raise HTTPException(status_code=503, detail="Database not available")

    try:
        async with db_pool.acquire() as conn:
            sites = await conn.fetch(
                """
                SELECT s.id, s.name, s.description, s."createdAt", s."updatedAt",
                       p.role
                FROM sites s
                JOIN permissions p ON s.id = p."siteId"
                WHERE p."userId" = $1
                ORDER BY s.name
                """,
                user_id,
            )

            return [
                SiteResponse(
                    id=site["id"],
                    name=site["name"],
                    description=site["description"],
                    role=site["role"],
                    created_at=site["createdAt"],
                    updated_at=site["updatedAt"],
                )
                for site in sites
            ]

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")


# ============================================================================
# Endpoint: List Instances for a Site
# ============================================================================


@router.get("/sites/{site_id}/instances", response_model=List[InstanceResponse])
async def list_site_instances(request: Request, site_id: str):
    """
    Get all instances for a specific site.

    User must have permission to access the site.
    """
    # Get user from request state
    if not hasattr(request.state, "user") or not request.state.user:
        raise HTTPException(status_code=401, detail="Not authenticated")

    user = request.state.user
    user_id = user["id"]

    # Get database pool
    db_pool: asyncpg.Pool = request.app.state.db_pool
    if not db_pool:
        raise HTTPException(status_code=503, detail="Database not available")

    try:
        async with db_pool.acquire() as conn:
            # Verify user has access to this site
            permission = await conn.fetchval(
                """
                SELECT id FROM permissions
                WHERE "userId" = $1 AND "siteId" = $2
                """,
                user_id,
                site_id,
            )

            if not permission:
                raise HTTPException(
                    status_code=404,
                    detail="Site not found or you don't have permission to access it",
                )

            # Get instances for this site
            instances = await conn.fetch(
                """
                SELECT id, "siteId", name, description, host, port, "isActive",
                       "createdAt", "updatedAt"
                FROM instances
                WHERE "siteId" = $1
                ORDER BY name
                """,
                site_id,
            )

            return [
                InstanceResponse(
                    id=inst["id"],
                    site_id=inst["siteId"],
                    name=inst["name"],
                    description=inst["description"],
                    host=inst["host"],
                    port=inst["port"],
                    vyos_version=inst.get("vyosVersion"),
                    is_active=inst["isActive"],
                    created_at=inst["createdAt"],
                    updated_at=inst["updatedAt"],
                )
                for inst in instances
            ]

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")


# ============================================================================
# Site Management Endpoints
# ============================================================================


@router.post("/sites", response_model=SiteResponse, status_code=201)
async def create_site(request: Request, body: SiteCreateRequest):
    """
    Create a new site.

    The user who creates the site becomes the OWNER automatically.
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
            # Generate IDs for site and permission
            import secrets
            import string
            alphabet = string.ascii_letters + string.digits
            site_id = ''.join(secrets.choice(alphabet) for _ in range(32))
            permission_id = ''.join(secrets.choice(alphabet) for _ in range(32))

            async with conn.transaction():
                # Create site
                site = await conn.fetchrow(
                    """
                    INSERT INTO sites (id, name, description, "createdAt", "updatedAt")
                    VALUES ($1, $2, $3, NOW(), NOW())
                    RETURNING id, name, description, "createdAt", "updatedAt"
                    """,
                    site_id,
                    body.name,
                    body.description,
                )

                # Create owner permission
                await conn.execute(
                    """
                    INSERT INTO permissions (id, "userId", "siteId", role, "createdAt", "updatedAt")
                    VALUES ($1, $2, $3, 'OWNER', NOW(), NOW())
                    """,
                    permission_id,
                    user_id,
                    site_id,
                )

                return SiteResponse(
                    id=site["id"],
                    name=site["name"],
                    description=site["description"],
                    role="OWNER",
                    created_at=site["createdAt"],
                    updated_at=site["updatedAt"],
                )

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")


@router.put("/sites/{site_id}", response_model=SiteResponse)
async def update_site(request: Request, site_id: str, body: SiteUpdateRequest):
    """
    Update a site.

    Only OWNER and ADMIN roles can update sites.
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
            # Check user has OWNER or ADMIN permission
            permission = await conn.fetchrow(
                """
                SELECT role FROM permissions
                WHERE "userId" = $1 AND "siteId" = $2
                """,
                user_id,
                site_id,
            )

            if not permission:
                raise HTTPException(status_code=404, detail="Site not found")

            if permission["role"] not in ["OWNER", "ADMIN"]:
                raise HTTPException(
                    status_code=403,
                    detail="Only OWNER and ADMIN can update sites",
                )

            # Build update query dynamically
            updates = []
            params = [site_id]
            param_num = 2

            if body.name is not None:
                updates.append(f'name = ${param_num}')
                params.append(body.name)
                param_num += 1

            if body.description is not None:
                updates.append(f'description = ${param_num}')
                params.append(body.description)
                param_num += 1

            if not updates:
                # No fields to update, return current site
                site = await conn.fetchrow(
                    'SELECT id, name, description, "createdAt", "updatedAt" FROM sites WHERE id = $1',
                    site_id
                )
            else:
                updates.append(f'"updatedAt" = NOW()')
                query = f"""
                    UPDATE sites
                    SET {', '.join(updates)}
                    WHERE id = $1
                    RETURNING id, name, description, "createdAt", "updatedAt"
                """
                site = await conn.fetchrow(query, *params)

            return SiteResponse(
                id=site["id"],
                name=site["name"],
                description=site["description"],
                role=permission["role"],
                created_at=site["createdAt"],
                updated_at=site["updatedAt"],
            )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")


@router.delete("/sites/{site_id}", response_model=ApiResponse)
async def delete_site(request: Request, site_id: str):
    """
    Delete a site.

    Only OWNER role can delete sites.
    All instances and permissions associated with the site will be deleted.
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
            # Check user is OWNER
            permission = await conn.fetchrow(
                """
                SELECT role FROM permissions
                WHERE "userId" = $1 AND "siteId" = $2
                """,
                user_id,
                site_id,
            )

            if not permission:
                raise HTTPException(status_code=404, detail="Site not found")

            if permission["role"] != "OWNER":
                raise HTTPException(
                    status_code=403,
                    detail="Only OWNER can delete sites",
                )

            async with conn.transaction():
                # Delete will cascade to instances and permissions
                result = await conn.execute(
                    """
                    DELETE FROM sites WHERE id = $1
                    """,
                    site_id,
                )

                if result == "DELETE 0":
                    raise HTTPException(status_code=404, detail="Site not found")

                return ApiResponse(
                    success=True,
                    message="Site deleted successfully",
                )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")


# ============================================================================
# Instance Management Endpoints
# ============================================================================


@router.post("/instances", response_model=InstanceResponse, status_code=201)
async def create_instance(request: Request, body: InstanceCreateRequest):
    """
    Create a new instance.

    User must have OWNER or ADMIN permission on the site.
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
            # Check user has OWNER or ADMIN permission
            permission = await conn.fetchrow(
                """
                SELECT role FROM permissions
                WHERE "userId" = $1 AND "siteId" = $2
                """,
                user_id,
                body.site_id,
            )

            if not permission:
                raise HTTPException(status_code=404, detail="Site not found")

            if permission["role"] not in ["OWNER", "ADMIN"]:
                raise HTTPException(
                    status_code=403,
                    detail="Only OWNER and ADMIN can create instances",
                )

            # Generate instance ID
            import secrets
            import string
            alphabet = string.ascii_letters + string.digits
            instance_id = ''.join(secrets.choice(alphabet) for _ in range(32))

            # Create instance
            # Note: username/password are legacy fields, VyOS uses apiKey
            instance = await conn.fetchrow(
                """
                INSERT INTO instances (
                    id, "siteId", name, description, host, port, username, password,
                    "apiKey", "vyosVersion", protocol, "verifySsl", "isActive",
                    "createdAt", "updatedAt"
                )
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW(), NOW())
                RETURNING id, "siteId", name, description, host, port, "vyosVersion",
                          "isActive", "createdAt", "updatedAt"
                """,
                instance_id,
                body.site_id,
                body.name,
                body.description,
                body.host,
                body.port,
                "api",  # username (legacy field, not used with API key auth)
                "",  # password (legacy field, not used with API key auth)
                body.api_key,
                body.vyos_version,
                body.protocol,
                body.verify_ssl,
                body.is_active,
            )

            return InstanceResponse(
                id=instance["id"],
                site_id=instance["siteId"],
                name=instance["name"],
                description=instance["description"],
                host=instance["host"],
                port=instance["port"],
                vyos_version=instance["vyosVersion"],
                is_active=instance["isActive"],
                created_at=instance["createdAt"],
                updated_at=instance["updatedAt"],
            )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")


@router.put("/instances/{instance_id}", response_model=InstanceResponse)
async def update_instance(request: Request, instance_id: str, body: InstanceUpdateRequest):
    """
    Update an instance.

    User must have OWNER or ADMIN permission on the site.
    Can move instance to different site if user has permission on target site.
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
            # Get instance and check permissions
            instance_check = await conn.fetchrow(
                """
                SELECT i."siteId", p.role
                FROM instances i
                JOIN permissions p ON i."siteId" = p."siteId" AND p."userId" = $1
                WHERE i.id = $2
                """,
                user_id,
                instance_id,
            )

            if not instance_check:
                raise HTTPException(status_code=404, detail="Instance not found")

            if instance_check["role"] not in ["OWNER", "ADMIN"]:
                raise HTTPException(
                    status_code=403,
                    detail="Only OWNER and ADMIN can update instances",
                )

            # If moving to a different site, check permissions on target site
            if body.site_id and body.site_id != instance_check["siteId"]:
                target_permission = await conn.fetchrow(
                    """
                    SELECT role FROM permissions
                    WHERE "userId" = $1 AND "siteId" = $2
                    """,
                    user_id,
                    body.site_id,
                )

                if not target_permission or target_permission["role"] not in ["OWNER", "ADMIN"]:
                    raise HTTPException(
                        status_code=403,
                        detail="You don't have permission to move instance to target site",
                    )

            # Build update query dynamically
            updates = []
            params = [instance_id]
            param_num = 2

            if body.site_id is not None:
                updates.append(f'"siteId" = ${param_num}')
                params.append(body.site_id)
                param_num += 1

            if body.name is not None:
                updates.append(f'name = ${param_num}')
                params.append(body.name)
                param_num += 1

            if body.description is not None:
                updates.append(f'description = ${param_num}')
                params.append(body.description)
                param_num += 1

            if body.host is not None:
                updates.append(f'host = ${param_num}')
                params.append(body.host)
                param_num += 1

            if body.port is not None:
                updates.append(f'port = ${param_num}')
                params.append(body.port)
                param_num += 1

            if body.api_key is not None:
                updates.append(f'"apiKey" = ${param_num}')
                params.append(body.api_key)
                param_num += 1
                # Also update username/password legacy fields
                updates.append(f'username = ${param_num}')
                params.append("api")
                param_num += 1
                updates.append(f'password = ${param_num}')
                params.append("")
                param_num += 1

            if body.vyos_version is not None:
                updates.append(f'"vyosVersion" = ${param_num}')
                params.append(body.vyos_version)
                param_num += 1

            if body.protocol is not None:
                updates.append(f'protocol = ${param_num}')
                params.append(body.protocol)
                param_num += 1

            if body.verify_ssl is not None:
                updates.append(f'"verifySsl" = ${param_num}')
                params.append(body.verify_ssl)
                param_num += 1

            if body.is_active is not None:
                updates.append(f'"isActive" = ${param_num}')
                params.append(body.is_active)
                param_num += 1

            if not updates:
                # No fields to update, return current instance
                instance = await conn.fetchrow(
                    """
                    SELECT id, "siteId", name, description, host, port, "vyosVersion",
                           "isActive", "createdAt", "updatedAt"
                    FROM instances WHERE id = $1
                    """,
                    instance_id
                )
            else:
                updates.append(f'"updatedAt" = NOW()')
                query = f"""
                    UPDATE instances
                    SET {', '.join(updates)}
                    WHERE id = $1
                    RETURNING id, "siteId", name, description, host, port, "vyosVersion",
                              "isActive", "createdAt", "updatedAt"
                """
                instance = await conn.fetchrow(query, *params)

            if not instance:
                raise HTTPException(status_code=404, detail="Instance not found")

            return InstanceResponse(
                id=instance["id"],
                site_id=instance["siteId"],
                name=instance["name"],
                description=instance["description"],
                host=instance["host"],
                port=instance["port"],
                vyos_version=instance["vyosVersion"],
                is_active=instance["isActive"],
                created_at=instance["createdAt"],
                updated_at=instance["updatedAt"],
            )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")


@router.delete("/instances/{instance_id}", response_model=ApiResponse)
async def delete_instance(request: Request, instance_id: str):
    """
    Delete an instance.

    User must have OWNER or ADMIN permission on the site.
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
            # Get instance and check permissions
            instance_check = await conn.fetchrow(
                """
                SELECT i."siteId", p.role
                FROM instances i
                JOIN permissions p ON i."siteId" = p."siteId" AND p."userId" = $1
                WHERE i.id = $2
                """,
                user_id,
                instance_id,
            )

            if not instance_check:
                raise HTTPException(status_code=404, detail="Instance not found")

            if instance_check["role"] not in ["OWNER", "ADMIN"]:
                raise HTTPException(
                    status_code=403,
                    detail="Only OWNER and ADMIN can delete instances",
                )

            # Delete instance
            result = await conn.execute(
                """
                DELETE FROM instances WHERE id = $1
                """,
                instance_id,
            )

            if result == "DELETE 0":
                raise HTTPException(status_code=404, detail="Instance not found")

            return ApiResponse(
                success=True,
                message="Instance deleted successfully",
            )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")


# ============================================================================
# CSV Import/Export Endpoints
# ============================================================================


@router.get("/export-csv")
async def export_sites_and_instances_csv(request: Request):
    """
    Export all sites and instances to CSV format.

    Returns a CSV file with all sites and their instances that the user has access to.
    CSV Format: site_name, site_description, instance_name, instance_description,
                host, port, api_key, vyos_version, protocol, verify_ssl
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
            # Get all sites and instances for the user
            rows = await conn.fetch(
                """
                SELECT
                    s.name as site_name,
                    s.description as site_description,
                    i.name as instance_name,
                    i.description as instance_description,
                    i.host,
                    i.port,
                    i."apiKey" as api_key,
                    i."vyosVersion" as vyos_version,
                    i.protocol,
                    i."verifySsl" as verify_ssl
                FROM sites s
                JOIN permissions p ON s.id = p."siteId"
                LEFT JOIN instances i ON s.id = i."siteId"
                WHERE p."userId" = $1
                ORDER BY s.name, i.name
                """,
                user_id,
            )

            # Create CSV in memory
            output = io.StringIO()
            writer = csv.writer(output)

            # Write header
            writer.writerow([
                "site_name",
                "site_description",
                "instance_name",
                "instance_description",
                "host",
                "port",
                "api_key",
                "vyos_version",
                "protocol",
                "verify_ssl"
            ])

            # Write data rows
            for row in rows:
                writer.writerow([
                    row["site_name"] or "",
                    row["site_description"] or "",
                    row["instance_name"] or "",
                    row["instance_description"] or "",
                    row["host"] or "",
                    str(row["port"]) if row["port"] else "",
                    row["api_key"] or "",
                    row["vyos_version"] or "",
                    row["protocol"] or "",
                    str(row["verify_ssl"]).lower() if row["verify_ssl"] is not None else "false"
                ])

            # Get CSV content
            csv_content = output.getvalue()
            output.close()

            # Return as downloadable file
            return StreamingResponse(
                iter([csv_content]),
                media_type="text/csv",
                headers={
                    "Content-Disposition": f"attachment; filename=vymanager_sites_instances_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"
                }
            )

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Export error: {str(e)}")


@router.post("/import-csv", response_model=ApiResponse)
async def import_sites_and_instances_csv(
    request: Request,
    file: UploadFile = File(...)
):
    """
    Import sites and instances from CSV file.

    CSV Format: site_name, site_description, instance_name, instance_description,
                host, port, api_key, vyos_version, protocol, verify_ssl

    Rules:
    - Sites will be created if they don't exist
    - If a site already exists with the same name, instances will be added to that site
    - Instances will be created if they don't exist
    - User will become OWNER of newly created sites
    """
    if not hasattr(request.state, "user") or not request.state.user:
        raise HTTPException(status_code=401, detail="Not authenticated")

    user = request.state.user
    user_id = user["id"]

    db_pool: asyncpg.Pool = request.app.state.db_pool
    if not db_pool:
        raise HTTPException(status_code=503, detail="Database not available")

    # Validate file type
    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="File must be a CSV file")

    try:
        # Read file content
        contents = await file.read()
        csv_content = contents.decode('utf-8')

        # Parse CSV
        csv_file = io.StringIO(csv_content)
        reader = csv.DictReader(csv_file)

        # Validate headers
        required_headers = {
            "site_name", "site_description", "instance_name", "instance_description",
            "host", "port", "api_key", "vyos_version", "protocol", "verify_ssl"
        }

        if not reader.fieldnames or not required_headers.issubset(set(reader.fieldnames)):
            raise HTTPException(
                status_code=400,
                detail=f"CSV must have headers: {', '.join(required_headers)}"
            )

        # Process rows
        sites_created = 0
        instances_created = 0
        errors = []

        async with db_pool.acquire() as conn:
            import secrets
            import string
            alphabet = string.ascii_letters + string.digits

            # Track sites by name to avoid duplicates
            site_cache = {}

            for row_num, row in enumerate(reader, start=2):  # Start at 2 (header is row 1)
                try:
                    site_name = row.get("site_name", "").strip()
                    instance_name = row.get("instance_name", "").strip()

                    # Skip rows with no site name
                    if not site_name:
                        continue

                    # Get or create site
                    if site_name in site_cache:
                        site_id = site_cache[site_name]
                    else:
                        # Check if site already exists
                        existing_site = await conn.fetchrow(
                            """
                            SELECT s.id FROM sites s
                            JOIN permissions p ON s.id = p."siteId"
                            WHERE s.name = $1 AND p."userId" = $2
                            """,
                            site_name,
                            user_id,
                        )

                        if existing_site:
                            site_id = existing_site["id"]
                            site_cache[site_name] = site_id
                        else:
                            # Create new site
                            site_id = ''.join(secrets.choice(alphabet) for _ in range(32))
                            permission_id = ''.join(secrets.choice(alphabet) for _ in range(32))

                            async with conn.transaction():
                                await conn.execute(
                                    """
                                    INSERT INTO sites (id, name, description, "createdAt", "updatedAt")
                                    VALUES ($1, $2, $3, NOW(), NOW())
                                    """,
                                    site_id,
                                    site_name,
                                    row.get("site_description", "").strip() or None,
                                )

                                await conn.execute(
                                    """
                                    INSERT INTO permissions (id, "userId", "siteId", role, "createdAt", "updatedAt")
                                    VALUES ($1, $2, $3, 'OWNER', NOW(), NOW())
                                    """,
                                    permission_id,
                                    user_id,
                                    site_id,
                                )

                            site_cache[site_name] = site_id
                            sites_created += 1

                    # Create instance if instance details provided
                    if instance_name and row.get("host", "").strip():
                        # Validate required instance fields
                        host = row.get("host", "").strip()
                        port_str = row.get("port", "").strip()
                        api_key = row.get("api_key", "").strip()
                        vyos_version = row.get("vyos_version", "").strip()

                        if not all([host, port_str, api_key, vyos_version]):
                            errors.append(f"Row {row_num}: Missing required instance fields (host, port, api_key, vyos_version)")
                            continue

                        # Parse and validate port
                        try:
                            port = int(port_str)
                            if port < 1 or port > 65535:
                                raise ValueError("Port must be between 1 and 65535")
                        except ValueError as e:
                            errors.append(f"Row {row_num}: Invalid port '{port_str}': {str(e)}")
                            continue

                        # Parse protocol and verify_ssl
                        protocol = row.get("protocol", "https").strip().lower()
                        if protocol not in ["http", "https"]:
                            protocol = "https"

                        verify_ssl_str = row.get("verify_ssl", "false").strip().lower()
                        verify_ssl = verify_ssl_str in ["true", "1", "yes"]

                        # Check if instance already exists
                        existing_instance = await conn.fetchrow(
                            """
                            SELECT id FROM instances
                            WHERE "siteId" = $1 AND name = $2
                            """,
                            site_id,
                            instance_name,
                        )

                        if existing_instance:
                            errors.append(f"Row {row_num}: Instance '{instance_name}' already exists in site '{site_name}'")
                            continue

                        # Create instance
                        instance_id = ''.join(secrets.choice(alphabet) for _ in range(32))

                        await conn.execute(
                            """
                            INSERT INTO instances (
                                id, "siteId", name, description, host, port, username, password,
                                "apiKey", "vyosVersion", protocol, "verifySsl", "isActive",
                                "createdAt", "updatedAt"
                            )
                            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW(), NOW())
                            """,
                            instance_id,
                            site_id,
                            instance_name,
                            row.get("instance_description", "").strip() or None,
                            host,
                            port,
                            "api",  # username (legacy)
                            "",     # password (legacy)
                            api_key,
                            vyos_version,
                            protocol,
                            verify_ssl,
                            True,   # isActive
                        )

                        instances_created += 1

                except Exception as e:
                    errors.append(f"Row {row_num}: {str(e)}")
                    continue

        # Build response message
        message = f"Import completed: {sites_created} sites created, {instances_created} instances created"
        if errors:
            message += f", {len(errors)} errors"

        return ApiResponse(
            success=True,
            message=message,
            data={
                "sites_created": sites_created,
                "instances_created": instances_created,
                "errors": errors if errors else None,
            }
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Import error: {str(e)}")


# ============================================================================
# Authentication Session Management Endpoints
# ============================================================================


class AuthSessionInfo(BaseModel):
    """Information about an authentication session."""

    token: str
    created_at: datetime
    expires_at: datetime
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    is_current: bool


class ActiveSessionsResponse(BaseModel):
    """Response containing active authentication sessions."""

    has_other_sessions: bool
    current_session_token: str
    other_sessions: List[AuthSessionInfo]


class RevokeSessionRequest(BaseModel):
    """Request to revoke a specific session."""

    session_token: str = Field(..., description="Session token to revoke")


@router.get("/auth-sessions", response_model=ActiveSessionsResponse)
async def get_active_auth_sessions(request: Request):
    """
    Get all active authentication sessions for the current user.

    Used to detect if user is logged in from multiple devices/browsers.
    """
    if not hasattr(request.state, "user") or not request.state.user:
        raise HTTPException(status_code=401, detail="Not authenticated")

    user = request.state.user
    user_id = user["id"]

    # Get current session token from cookie
    cookie_token = request.cookies.get("better-auth.session_token")

    # Better-auth stores compound tokens in the format: {session_id}.{signature}
    # But the database only stores the session_id part
    # Extract just the session ID (everything before the first dot)
    current_token = cookie_token.split(".")[0] if cookie_token else None

    db_pool: asyncpg.Pool = request.app.state.db_pool
    if not db_pool:
        raise HTTPException(status_code=503, detail="Database not available")

    try:
        async with db_pool.acquire() as conn:
            # Get all active sessions for this user from better-auth's session table
            sessions = await conn.fetch(
                """
                SELECT token, "createdAt", "expiresAt", "ipAddress", "userAgent"
                FROM sessions
                WHERE "userId" = $1 AND "expiresAt" > NOW()
                ORDER BY "createdAt" DESC
                """,
                user_id,
            )

            other_sessions = []
            for session in sessions:
                session_token = session["token"]
                is_current = session_token == current_token
                if not is_current:
                    other_sessions.append(
                        AuthSessionInfo(
                            token=session["token"],
                            created_at=session["createdAt"],
                            expires_at=session["expiresAt"],
                            ip_address=session["ipAddress"],
                            user_agent=session["userAgent"],
                            is_current=False,
                        )
                    )

            return ActiveSessionsResponse(
                has_other_sessions=len(other_sessions) > 0,
                current_session_token=current_token or "",
                other_sessions=other_sessions,
            )

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")


@router.post("/revoke-session", response_model=ApiResponse)
async def revoke_auth_session(request: Request, body: RevokeSessionRequest):
    """
    Revoke a specific authentication session.

    This allows a user to force logout from another device/browser.
    """
    if not hasattr(request.state, "user") or not request.state.user:
        raise HTTPException(status_code=401, detail="Not authenticated")

    user = request.state.user
    user_id = user["id"]

    # Get current session token to prevent self-logout
    cookie_token = request.cookies.get("better-auth.session_token")

    # Extract session ID from compound token (format: {session_id}.{signature})
    current_token = cookie_token.split(".")[0] if cookie_token else None

    if body.session_token == current_token:
        raise HTTPException(
            status_code=400,
            detail="Cannot revoke your current session. Use logout instead.",
        )

    db_pool: asyncpg.Pool = request.app.state.db_pool
    if not db_pool:
        raise HTTPException(status_code=503, detail="Database not available")

    try:
        async with db_pool.acquire() as conn:
            # Verify the session belongs to this user before deleting
            session_check = await conn.fetchrow(
                """
                SELECT "userId" FROM sessions
                WHERE token = $1
                """,
                body.session_token,
            )

            if not session_check:
                raise HTTPException(status_code=404, detail="Session not found")

            if session_check["userId"] != user_id:
                raise HTTPException(
                    status_code=403,
                    detail="You can only revoke your own sessions",
                )

            # Delete the session
            result = await conn.execute(
                """
                DELETE FROM sessions
                WHERE token = $1
                """,
                body.session_token,
            )

            if result == "DELETE 0":
                raise HTTPException(status_code=404, detail="Session not found")

            return ApiResponse(
                success=True,
                message="Session revoked successfully",
            )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
