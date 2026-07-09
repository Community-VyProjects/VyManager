"""
Session Management Router

API endpoints for managing user sessions with VyOS instances.
Handles connect/disconnect operations and instance selection.
"""

from fastapi import Depends, APIRouter, HTTPException, Request, UploadFile, File, Form
from org_scope import assert_row_in_acting_org, org_conn_admin, org_conn_self
from starlette.concurrency import run_in_threadpool
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from typing import List, Dict, Optional, Any
from datetime import datetime
import asyncpg
import json
import os
from vyos_service import VyOSService, VyOSDeviceConfig
from session_vyos_service import clear_session_cache
from session_cookie import verify_session_cookie
from backup_crypto import (
    encrypt_backup,
    decrypt_backup,
    ssh_key_fingerprint,
    BackupCryptoError,
)
import logging
logger = logging.getLogger(__name__)

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
    org_id: Optional[str] = None
    org_name: Optional[str] = None
    created_at: datetime
    updated_at: datetime


class OrganizationMembership(BaseModel):
    """An organization the caller belongs to, with their role in it."""

    id: str
    name: str
    org_role: str  # OWNER, ADMIN, or MEMBER


class OrganizationsResponse(BaseModel):
    """The caller's organizations. org_ui_visible mirrors the frontend rule
    (more than one membership) so the org UI is suppressed for single-team
    deployments without the client re-deriving it."""

    organizations: List[OrganizationMembership]
    org_ui_visible: bool


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
    protocol: str = "https"
    verify_ssl: bool = False
    is_active: bool
    vyos_version: Optional[str] = None
    ssh_port: int = 22
    ssh_username: Optional[str] = None
    ssh_key_configured: bool = False
    commit_confirm_enabled: bool = False
    commit_confirm_minutes: int = 5
    timeout: int = 10
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
    ssh_port: int = Field(default=22, ge=1, le=65535, description="SSH port for monitoring")
    ssh_username: Optional[str] = Field(None, description="SSH username for monitoring")
    commit_confirm_enabled: bool = Field(default=False, description="Use commit-confirm for all changes (VyOS 1.5+ only)")
    commit_confirm_minutes: int = Field(default=5, ge=1, le=60, description="Minutes before auto-revert if not confirmed")
    timeout: int = Field(default=10, ge=1, le=300, description="API request timeout in seconds")


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
    ssh_port: Optional[int] = Field(None, ge=1, le=65535, description="SSH port for monitoring")
    ssh_username: Optional[str] = Field(None, description="SSH username for monitoring")
    commit_confirm_enabled: Optional[bool] = Field(None, description="Use commit-confirm for all changes (VyOS 1.5+ only)")
    commit_confirm_minutes: Optional[int] = Field(None, ge=1, le=60, description="Minutes before auto-revert if not confirmed")
    timeout: Optional[int] = Field(None, ge=1, le=300, description="API request timeout in seconds")


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
async def get_onboarding_status(request: Request, conn: asyncpg.Connection = Depends(org_conn_admin)):
    """
    Check if the system needs initial onboarding setup.

    Returns True if no users exist in the system.
    """
    try:
        # Count users
        result = await conn.fetchrow('SELECT COUNT(*) as count FROM users')
        user_count = result['count']

        return OnboardingStatusResponse(
            needs_onboarding=user_count == 0,
            user_count=user_count
        )
    except Exception as e:
        logger.exception("Unhandled error")
        raise HTTPException(status_code=500, detail="Internal server error")


# ============================================================================
# Endpoint: Get Current Active Session
# ============================================================================


@router.get("/current", response_model=Optional[ActiveSessionResponse])
async def get_current_session(request: Request, conn: asyncpg.Connection = Depends(org_conn_admin)):
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
    try:
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
        logger.exception("Unhandled error")
        raise HTTPException(status_code=500, detail="Internal server error")


# ============================================================================
# Endpoint: Connect to Instance
# ============================================================================


@router.post("/connect", response_model=ApiResponse)
async def connect_to_instance(request: Request, body: ConnectRequest, conn: asyncpg.Connection = Depends(org_conn_admin)):
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

    try:
        # Check if user is site-level ADMIN
        user_site_role = await conn.fetchval(
            """
            SELECT role FROM users WHERE id = $1
            """,
            user_id
        )

        # Site ADMIN users can access any instance
        # Other users need explicit instance-level permissions
        if user_site_role == "ADMIN":
            # ADMIN can access any instance - no instance role check needed
            instance = await conn.fetchrow(
                """
                SELECT i.id, i.name, i.host, i.port, i."siteId", i."isActive",
                       i."apiKey", i.protocol, i."verifySsl", i."vyosVersion", i.timeout,
                       s.name as site_name,
                       'ADMIN' as role
                FROM instances i
                JOIN sites s ON i."siteId" = s.id
                WHERE i.id = $1
                """,
                instance_id,
            )
        else:
            # VIEWER users need explicit instance-level role assignment
            instance = await conn.fetchrow(
                """
                SELECT i.id, i.name, i.host, i.port, i."siteId", i."isActive",
                       i."apiKey", i.protocol, i."verifySsl", i."vyosVersion", i.timeout,
                       s.name as site_name,
                       uir.role as role
                FROM instances i
                JOIN sites s ON i."siteId" = s.id
                JOIN user_instance_roles uir
                    ON (uir."instanceId" = i.id OR uir."siteId" = i."siteId")
                    AND uir."userId" = $1
                WHERE i.id = $2
                ORDER BY CASE uir.role
                    WHEN 'ADMIN' THEN 3 WHEN 'OPERATOR' THEN 2 WHEN 'VIEWER' THEN 1 ELSE 0
                END DESC
                LIMIT 1
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
                timeout=instance.get("timeout") or 10,
            )
            vyos_service = VyOSService(device_config)

            # Test connection by fetching config (this will raise exception if connection fails)
            await run_in_threadpool(vyos_service.get_full_config)

        except Exception as e:
            error_msg = str(e)
            raise HTTPException(
                status_code=503,
                detail=f"Failed to connect to VyOS instance: {error_msg}. Please verify the host, port, API key, and network connectivity.",
            )

        # Get current auth session token from cookie and verify its signature
        # This allows us to track which auth session created this VyOS connection
        cookie_token = request.cookies.get("better-auth.session_token")
        current_session_token = verify_session_cookie(cookie_token) if cookie_token else None

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
        logger.exception("Unhandled error")
        raise HTTPException(status_code=500, detail="Internal server error")


# ============================================================================
# Endpoint: Disconnect from Instance
# ============================================================================


@router.post("/disconnect", response_model=ApiResponse)
async def disconnect_from_instance(request: Request, conn: asyncpg.Connection = Depends(org_conn_admin)):
    """
    Disconnect from the current VyOS instance.

    This removes the user's active session.
    """
    # Get user from request state
    if not hasattr(request.state, "user") or not request.state.user:
        raise HTTPException(status_code=401, detail="Not authenticated")

    user = request.state.user
    user_id = user["id"]

    try:
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
        logger.exception("Unhandled error")
        raise HTTPException(status_code=500, detail="Internal server error")


# ============================================================================
# Endpoint: List User's Sites
# ============================================================================


@router.get("/organizations", response_model=OrganizationsResponse)
async def list_user_organizations(request: Request, conn: asyncpg.Connection = Depends(org_conn_self)):
    """The caller's organization memberships.

    Backs the frontend's org UI: the grouping header and switcher render only
    when the caller belongs to more than one organization (org_ui_visible),
    so single-team deployments never see the org layer.
    """
    if not hasattr(request.state, "user") or not request.state.user:
        raise HTTPException(status_code=401, detail="Not authenticated")

    rows = await conn.fetch(
        """
        SELECT o.id, o.name, m."orgRole" AS org_role
        FROM org_memberships m
        JOIN organizations o ON o.id = m."orgId"
        WHERE m."userId" = $1
        ORDER BY o.name
        """,
        request.state.user["id"],
    )
    orgs = [
        OrganizationMembership(id=r["id"], name=r["name"], org_role=r["org_role"])
        for r in rows
    ]
    return OrganizationsResponse(
        organizations=orgs,
        org_ui_visible=len(orgs) > 1,
    )


@router.get("/sites", response_model=List[SiteResponse])
async def list_user_sites(request: Request, conn: asyncpg.Connection = Depends(org_conn_admin)):
    """
    Get all sites the user has access to.

    Site ADMIN users (role='ADMIN' in users table) see ALL sites.
    Other users see only sites where they have instance access.
    Uses new RBAC system (user_instance_roles and users.role).
    """
    # Get user from request state
    if not hasattr(request.state, "user") or not request.state.user:
        raise HTTPException(status_code=401, detail="Not authenticated")

    user = request.state.user
    user_id = user["id"]

    try:
        # First, check if user is a site ADMIN
        user_role = await conn.fetchval(
            """
            SELECT role FROM users WHERE id = $1
            """,
            user_id,
        )

        if user_role == "ADMIN":
            # Site ADMINs see ALL sites with ADMIN role
            sites = await conn.fetch(
                """
                SELECT s.id, s.name, s.description, s."orgId",
                       o.name AS org_name, s."createdAt", s."updatedAt"
                FROM sites s
                LEFT JOIN organizations o ON o.id = s."orgId"
                ORDER BY o.name, s.name
                """,
            )

            return [
                SiteResponse(
                    id=site["id"],
                    name=site["name"],
                    description=site["description"],
                    role="ADMIN",  # Site ADMINs have ADMIN role on all sites
                    org_id=site["orgId"],
                    org_name=site["org_name"],
                    created_at=site["createdAt"],
                    updated_at=site["updatedAt"],
                )
                for site in sites
            ]
        else:
            # Regular users see only sites where they have instance access
            # Role shown is the highest role the user has across all instances in that site
            sites = await conn.fetch(
                """
                SELECT DISTINCT s.id, s.name, s.description, s."orgId",
                       o.name AS org_name, s."createdAt", s."updatedAt",
                       MAX(
                           CASE uir.role
                               WHEN 'ADMIN' THEN 3
                               WHEN 'OPERATOR' THEN 2
                               WHEN 'VIEWER' THEN 1
                               ELSE 0
                           END
                       ) as role_rank,
                       (ARRAY_AGG(uir.role ORDER BY
                           CASE uir.role
                               WHEN 'ADMIN' THEN 3
                               WHEN 'OPERATOR' THEN 2
                               WHEN 'VIEWER' THEN 1
                               ELSE 0
                           END DESC))[1] as role
                FROM sites s
                JOIN instances i ON s.id = i."siteId"
                JOIN user_instance_roles uir
                    ON (uir."instanceId" = i.id OR uir."siteId" = s.id)
                    AND uir."userId" = $1
                LEFT JOIN organizations o ON o.id = s."orgId"
                GROUP BY s.id, s.name, s.description, s."orgId", o.name,
                         s."createdAt", s."updatedAt"
                ORDER BY o.name, s.name
                """,
                user_id,
            )

            return [
                SiteResponse(
                    id=site["id"],
                    name=site["name"],
                    description=site["description"],
                    role=site["role"],
                    org_id=site["orgId"],
                    org_name=site["org_name"],
                    created_at=site["createdAt"],
                    updated_at=site["updatedAt"],
                )
                for site in sites
            ]

    except Exception as e:
        logger.exception("Unhandled error")
        raise HTTPException(status_code=500, detail="Internal server error")


# ============================================================================
# Endpoint: List Instances for a Site
# ============================================================================


@router.get("/sites/{site_id}/instances", response_model=List[InstanceResponse])
async def list_site_instances(request: Request, site_id: str, conn: asyncpg.Connection = Depends(org_conn_admin)):
    """
    Get all instances for a specific site that the user has access to.

    Site ADMIN users (role='ADMIN' in users table) see ALL instances in the site.
    Other users see only instances they have explicit permission to access.
    Uses new RBAC system (user_instance_roles and users.role).
    """
    # Get user from request state
    if not hasattr(request.state, "user") or not request.state.user:
        raise HTTPException(status_code=401, detail="Not authenticated")

    user = request.state.user
    user_id = user["id"]

    try:
        # First, check if user is a site ADMIN
        user_role = await conn.fetchval(
            """
            SELECT role FROM users WHERE id = $1
            """,
            user_id,
        )

        if user_role == "ADMIN":
            # Site ADMINs see ALL instances in the site
            instances = await conn.fetch(
                """
                SELECT id, "siteId", name, description, host, port, protocol, "verifySsl", "isActive",
                       "vyosVersion", "sshPort", "sshUsername", "sshKeyConfigured",
                       "commitConfirmEnabled", "commitConfirmMinutes", timeout,
                       "createdAt", "updatedAt"
                FROM instances
                WHERE "siteId" = $1
                ORDER BY name
                """,
                site_id,
            )
        else:
            # Regular users see only instances they have explicit access to
            instances = await conn.fetch(
                """
                SELECT DISTINCT i.id, i."siteId", i.name, i.description, i.host, i.port, i.protocol, i."verifySsl", i."isActive",
                       i."vyosVersion", i."sshPort", i."sshUsername", i."sshKeyConfigured",
                       i."commitConfirmEnabled", i."commitConfirmMinutes", i.timeout,
                       i."createdAt", i."updatedAt"
                FROM instances i
                JOIN user_instance_roles uir
                    ON (uir."instanceId" = i.id OR uir."siteId" = i."siteId")
                    AND uir."userId" = $2
                WHERE i."siteId" = $1
                ORDER BY i.name
                """,
                site_id,
                user_id,
            )

        # If no instances found, return empty list (don't throw 404)
        # This allows the frontend to show "No instances available"

        return [
            InstanceResponse(
                id=inst["id"],
                site_id=inst["siteId"],
                name=inst["name"],
                description=inst["description"],
                host=inst["host"],
                port=inst["port"],
                protocol=inst.get("protocol") or "https",
                verify_ssl=inst.get("verifySsl") or False,
                vyos_version=inst.get("vyosVersion"),
                is_active=inst["isActive"],
                ssh_port=inst["sshPort"],
                ssh_username=inst["sshUsername"],
                ssh_key_configured=inst["sshKeyConfigured"],
                commit_confirm_enabled=inst.get("commitConfirmEnabled") or False,
                commit_confirm_minutes=inst.get("commitConfirmMinutes") or 5,
                timeout=inst.get("timeout") or 10,
                created_at=inst["createdAt"],
                updated_at=inst["updatedAt"],
            )
            for inst in instances
        ]

    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Unhandled error")
        raise HTTPException(status_code=500, detail="Internal server error")


# ============================================================================
# Site Management Endpoints
# ============================================================================


@router.post("/sites", response_model=SiteResponse, status_code=201)
async def create_site(request: Request, body: SiteCreateRequest, conn: asyncpg.Connection = Depends(org_conn_admin)):
    """
    Create a new site.

    Only site ADMIN users can create sites.
    During onboarding (no sites exist), any authenticated user can create the first site.
    """
    if not hasattr(request.state, "user") or not request.state.user:
        raise HTTPException(status_code=401, detail="Not authenticated")

    user = request.state.user
    user_id = user["id"]

    try:
        # Check if this is the first site (onboarding)
        site_count = await conn.fetchval("SELECT COUNT(*) FROM sites")
        is_first_site = site_count == 0

        # If not first site, verify user is site ADMIN
        if not is_first_site:
            user_role = await conn.fetchval(
                "SELECT role FROM users WHERE id = $1",
                user_id
            )
            if user_role != "ADMIN":
                raise HTTPException(
                    status_code=403,
                    detail="Only site ADMIN users can create sites"
                )

        # Generate site ID
        import secrets
        import string
        alphabet = string.ascii_letters + string.digits
        site_id = ''.join(secrets.choice(alphabet) for _ in range(32))

        # Create the site in the caller's acting organization. Set it
        # explicitly (the org_conn_admin dependency resolved it) rather than
        # relying on the column's DEFAULT, so the DEFAULT can be dropped at
        # the enforcement flip. Falls back to the default org when there is
        # no org context (single-org / pre-flip).
        acting_org = getattr(request.state, "acting_org_id", None) or "default"
        site = await conn.fetchrow(
            """
            INSERT INTO sites (id, name, description, "orgId", "createdAt", "updatedAt")
            VALUES ($1, $2, $3, $4, NOW(), NOW())
            RETURNING id, name, description, "createdAt", "updatedAt"
            """,
            site_id,
            body.name,
            body.description,
            acting_org,
        )

        return SiteResponse(
            id=site["id"],
            name=site["name"],
            description=site["description"],
            role="ADMIN",  # Site ADMINs have ADMIN role on all sites
            created_at=site["createdAt"],
            updated_at=site["updatedAt"],
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Unhandled error")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.put("/sites/{site_id}", response_model=SiteResponse)
async def update_site(request: Request, site_id: str, body: SiteUpdateRequest, conn: asyncpg.Connection = Depends(org_conn_admin)):
    """
    Update a site.

    Only site ADMIN users can update sites.
    """
    if not hasattr(request.state, "user") or not request.state.user:
        raise HTTPException(status_code=401, detail="Not authenticated")

    user = request.state.user
    user_id = user["id"]

    try:
        # Check user is site ADMIN
        user_role = await conn.fetchval(
            "SELECT role FROM users WHERE id = $1",
            user_id
        )

        if user_role != "ADMIN":
            raise HTTPException(
                status_code=403,
                detail="Only site ADMIN users can update sites"
            )

        # Verify site exists and belongs to the caller's organization
        site_org = await conn.fetchval(
            'SELECT "orgId" FROM sites WHERE id = $1',
            site_id
        )

        if site_org is None:
            raise HTTPException(status_code=404, detail="Site not found")
        await assert_row_in_acting_org(request, conn, site_org)

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
            role="ADMIN",  # Site ADMINs have ADMIN role on all sites
            created_at=site["createdAt"],
            updated_at=site["updatedAt"],
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Unhandled error")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.delete("/sites/{site_id}", response_model=ApiResponse)
async def delete_site(request: Request, site_id: str, conn: asyncpg.Connection = Depends(org_conn_admin)):
    """
    Delete a site.

    Only site ADMIN users can delete sites.
    All instances and user instance roles associated with the site will be deleted.
    """
    if not hasattr(request.state, "user") or not request.state.user:
        raise HTTPException(status_code=401, detail="Not authenticated")

    user = request.state.user
    user_id = user["id"]

    try:
        # Check user is site ADMIN
        user_role = await conn.fetchval(
            "SELECT role FROM users WHERE id = $1",
            user_id
        )

        if user_role != "ADMIN":
            raise HTTPException(
                status_code=403,
                detail="Only site ADMIN users can delete sites"
            )

        # Verify site exists and belongs to the caller's organization
        site_org = await conn.fetchval(
            'SELECT "orgId" FROM sites WHERE id = $1',
            site_id
        )

        if site_org is None:
            raise HTTPException(status_code=404, detail="Site not found")
        await assert_row_in_acting_org(request, conn, site_org)

        async with conn.transaction():
            # Delete will cascade to instances and user_instance_roles
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
        logger.exception("Unhandled error")
        raise HTTPException(status_code=500, detail="Internal server error")


# ============================================================================
# Instance Management Endpoints
# ============================================================================


@router.post("/instances", response_model=InstanceResponse, status_code=201)
async def create_instance(request: Request, body: InstanceCreateRequest, conn: asyncpg.Connection = Depends(org_conn_admin)):
    """
    Create a new instance.

    Only site ADMIN users can create instances.
    """
    if not hasattr(request.state, "user") or not request.state.user:
        raise HTTPException(status_code=401, detail="Not authenticated")

    user = request.state.user
    user_id = user["id"]

    try:
        # Check user is site ADMIN
        user_role = await conn.fetchval(
            "SELECT role FROM users WHERE id = $1",
            user_id
        )

        if user_role != "ADMIN":
            raise HTTPException(
                status_code=403,
                detail="Only site ADMIN users can create instances"
            )

        # Verify target site exists and belongs to the caller's organization
        site_org = await conn.fetchval(
            'SELECT "orgId" FROM sites WHERE id = $1',
            body.site_id
        )

        if site_org is None:
            raise HTTPException(status_code=404, detail="Site not found")
        await assert_row_in_acting_org(request, conn, site_org)

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
                "sshPort", "sshUsername",
                "commitConfirmEnabled", "commitConfirmMinutes", timeout,
                "createdAt", "updatedAt"
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, NOW(), NOW())
            RETURNING id, "siteId", name, description, host, port, protocol, "verifySsl", "vyosVersion",
                      "isActive", "sshPort", "sshUsername", "sshKeyConfigured",
                      "commitConfirmEnabled", "commitConfirmMinutes", timeout,
                      "createdAt", "updatedAt"
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
            body.ssh_port,
            body.ssh_username,
            body.commit_confirm_enabled,
            body.commit_confirm_minutes,
            body.timeout,
        )

        clear_session_cache(instance_id)

        return InstanceResponse(
            id=instance["id"],
            site_id=instance["siteId"],
            name=instance["name"],
            description=instance["description"],
            host=instance["host"],
            port=instance["port"],
            protocol=instance["protocol"] or "https",
            verify_ssl=instance["verifySsl"] or False,
            vyos_version=instance["vyosVersion"],
            is_active=instance["isActive"],
            ssh_port=instance["sshPort"],
            ssh_username=instance["sshUsername"],
            ssh_key_configured=instance["sshKeyConfigured"],
            commit_confirm_enabled=instance.get("commitConfirmEnabled") or False,
            commit_confirm_minutes=instance.get("commitConfirmMinutes") or 5,
            timeout=instance.get("timeout") or 10,
            created_at=instance["createdAt"],
            updated_at=instance["updatedAt"],
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Unhandled error")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.put("/instances/{instance_id}", response_model=InstanceResponse)
async def update_instance(request: Request, instance_id: str, body: InstanceUpdateRequest, conn: asyncpg.Connection = Depends(org_conn_admin)):
    """
    Update an instance.

    Only site ADMIN users can update instances.
    Instance roles (ADMIN/OPERATOR/VIEWER) control VyOS feature access, not instance management.
    """
    if not hasattr(request.state, "user") or not request.state.user:
        raise HTTPException(status_code=401, detail="Not authenticated")

    user = request.state.user
    user_id = user["id"]

    try:
        # Check user is site ADMIN
        user_role = await conn.fetchval(
            "SELECT role FROM users WHERE id = $1",
            user_id
        )

        if user_role != "ADMIN":
            raise HTTPException(
                status_code=403,
                detail="Only site ADMIN users can update instances"
            )

        # Verify instance exists and its site is in the caller's organization
        instance_org = await conn.fetchval(
            'SELECT s."orgId" FROM instances i'
            ' JOIN sites s ON i."siteId" = s.id WHERE i.id = $1',
            instance_id
        )

        if instance_org is None:
            raise HTTPException(status_code=404, detail="Instance not found")
        await assert_row_in_acting_org(request, conn, instance_org)

        # If moving to a different site, verify the target site exists and
        # is in the caller's organization (no cross-org moves).
        if body.site_id:
            target_site_org = await conn.fetchval(
                'SELECT "orgId" FROM sites WHERE id = $1',
                body.site_id
            )
            if target_site_org is None:
                raise HTTPException(status_code=404, detail="Target site not found")
            await assert_row_in_acting_org(request, conn, target_site_org)

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

        if body.ssh_port is not None:
            updates.append(f'"sshPort" = ${param_num}')
            params.append(body.ssh_port)
            param_num += 1

        if body.ssh_username is not None:
            updates.append(f'"sshUsername" = ${param_num}')
            params.append(body.ssh_username)
            param_num += 1

        if body.commit_confirm_enabled is not None:
            updates.append(f'"commitConfirmEnabled" = ${param_num}')
            params.append(body.commit_confirm_enabled)
            param_num += 1

        if body.commit_confirm_minutes is not None:
            updates.append(f'"commitConfirmMinutes" = ${param_num}')
            params.append(body.commit_confirm_minutes)
            param_num += 1

        if body.timeout is not None:
            updates.append(f'timeout = ${param_num}')
            params.append(body.timeout)
            param_num += 1

        if not updates:
            # No fields to update, return current instance
            instance = await conn.fetchrow(
                """
                SELECT id, "siteId", name, description, host, port, protocol, "verifySsl", "vyosVersion",
                       "isActive", "sshPort", "sshUsername", "sshKeyConfigured",
                       "commitConfirmEnabled", "commitConfirmMinutes", timeout,
                       "createdAt", "updatedAt"
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
                RETURNING id, "siteId", name, description, host, port, protocol, "verifySsl", "vyosVersion",
                          "isActive", "sshPort", "sshUsername", "sshKeyConfigured",
                          "commitConfirmEnabled", "commitConfirmMinutes", timeout,
                          "createdAt", "updatedAt"
            """
            instance = await conn.fetchrow(query, *params)

        if not instance:
            raise HTTPException(status_code=404, detail="Instance not found")

        # Invalidate cached VyOS service so changes take effect immediately
        clear_session_cache(instance_id)

        return InstanceResponse(
            id=instance["id"],
            site_id=instance["siteId"],
            name=instance["name"],
            description=instance["description"],
            host=instance["host"],
            port=instance["port"],
            protocol=instance["protocol"] or "https",
            verify_ssl=instance["verifySsl"] or False,
            vyos_version=instance["vyosVersion"],
            is_active=instance["isActive"],
            ssh_port=instance["sshPort"],
            ssh_username=instance["sshUsername"],
            ssh_key_configured=instance["sshKeyConfigured"],
            commit_confirm_enabled=instance.get("commitConfirmEnabled") or False,
            commit_confirm_minutes=instance.get("commitConfirmMinutes") or 5,
            timeout=instance.get("timeout") or 10,
            created_at=instance["createdAt"],
            updated_at=instance["updatedAt"],
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Unhandled error")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.delete("/instances/{instance_id}", response_model=ApiResponse)
async def delete_instance(request: Request, instance_id: str, conn: asyncpg.Connection = Depends(org_conn_admin)):
    """
    Delete an instance.

    Only site ADMIN users can delete instances.
    Instance roles (ADMIN/OPERATOR/VIEWER) control VyOS feature access, not instance management.
    """
    if not hasattr(request.state, "user") or not request.state.user:
        raise HTTPException(status_code=401, detail="Not authenticated")

    user = request.state.user
    user_id = user["id"]

    try:
        # Check user is site ADMIN
        user_role = await conn.fetchval(
            "SELECT role FROM users WHERE id = $1",
            user_id
        )

        if user_role != "ADMIN":
            raise HTTPException(
                status_code=403,
                detail="Only site ADMIN users can delete instances"
            )

        # Verify instance exists and its site is in the caller's organization
        instance_org = await conn.fetchval(
            'SELECT s."orgId" FROM instances i'
            ' JOIN sites s ON i."siteId" = s.id WHERE i.id = $1',
            instance_id
        )

        if instance_org is None:
            raise HTTPException(status_code=404, detail="Instance not found")
        await assert_row_in_acting_org(request, conn, instance_org)

        # Delete instance
        result = await conn.execute(
            """
            DELETE FROM instances WHERE id = $1
            """,
            instance_id,
        )

        if result == "DELETE 0":
            raise HTTPException(status_code=404, detail="Instance not found")

        clear_session_cache(instance_id)

        return ApiResponse(
            success=True,
            message="Instance deleted successfully",
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Unhandled error")
        raise HTTPException(status_code=500, detail="Internal server error")


# ============================================================================
# Full Backup / Restore Endpoints
# ============================================================================
#
# A backup captures every VyManager-managed table (users, accounts, sites,
# instances + secrets, RBAC grants, OIDC providers/mappings, dashboard layouts)
# into a single passphrase-encrypted file. Restore re-applies it in either
# "replace" (wipe + restore) or "merge" (upsert) mode. See backup_crypto.py for
# the file format.

# Tables included in a backup, in FK-safe INSERT order (parents first).
# DELETE on a full replace walks this list in reverse.
BACKUP_TABLES: List[str] = [
    "users",
    "sites",
    "instances",
    "firewall_separators",
    "accounts",
    "oauth_providers",
    "user_instance_roles",
    "user_feature_permissions",
    "oauth_role_mappings",
    "dashboard_layouts",
]

# Transient/derived tables that are intentionally NOT backed up. sessions and
# active_sessions are rebuilt on next login; the rest are history/scratch.
BACKUP_EXCLUDED_TABLES: List[str] = [
    "sessions",
    "active_sessions",
    "verifications",
    "audit_logs",
    "scheduled_power_actions",
]

# Natural unique key per table for merge mode. When a row collides on this key
# (e.g. same email but a different id) we skip it and report a warning rather
# than aborting the whole restore.
BACKUP_NATURAL_KEYS: Dict[str, List[str]] = {
    "users": ["email"],
    "sites": ["name"],
    "instances": ["siteId", "name"],
    "oauth_providers": ["providerId"],
}

BACKUP_FORMAT_VERSION = 1


class BackupRequest(BaseModel):
    """Request body for creating a backup."""

    passphrase: str = Field(..., min_length=1, description="Encrypts the backup file")


def _empty_restore_enabled() -> bool:
    return os.getenv("VYMANAGER_ALLOW_EMPTY_RESTORE", "").strip().lower() in (
        "1", "true", "yes", "on"
    )


async def _require_backup_admin(conn: asyncpg.Connection, request: Request) -> None:
    """Allow platform ADMINs. The zero-users case (disaster recovery onto a
    fresh install, where no admin exists to authenticate as) is an
    unauthenticated full-DB write, so it is closed by default and must be
    explicitly enabled by the operator for the recovery via
    VYMANAGER_ALLOW_EMPTY_RESTORE.
    """
    user = getattr(request.state, "user", None)
    if user:
        role = await conn.fetchval("SELECT role FROM users WHERE id = $1", user["id"])
        if role == "ADMIN":
            return
    user_count = await conn.fetchval("SELECT COUNT(*) FROM users")
    if user_count == 0:
        if _empty_restore_enabled():
            logger.warning(
                "Empty-system backup/restore permitted via "
                "VYMANAGER_ALLOW_EMPTY_RESTORE")
            return
        raise HTTPException(
            status_code=403,
            detail="Restore on an empty system is disabled. Set "
                   "VYMANAGER_ALLOW_EMPTY_RESTORE to enable disaster recovery.",
        )
    raise HTTPException(status_code=403, detail="Only site ADMIN users can do this")


def _json_safe(value: Any) -> Any:
    """Make an asyncpg value JSON-serializable for the backup payload."""
    if isinstance(value, datetime):
        return value.isoformat()
    return value


async def _table_columns(conn: asyncpg.Connection, table: str) -> Dict[str, str]:
    """Return {column_name: udt_name} for a table's current columns."""
    rows = await conn.fetch(
        """
        SELECT column_name, udt_name
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = $1
        """,
        table,
    )
    return {r["column_name"]: r["udt_name"] for r in rows}


def _bind_value(value: Any, udt: str) -> Any:
    """Coerce a backed-up JSON value to a text form Postgres can cast.

    Every column is inserted as `$n::text::"<udt>"`, so all values are bound as
    text (or NULL) and Postgres parses them into the real column type.
    """
    if value is None:
        return None
    if udt == "jsonb" or udt == "json":
        return value if isinstance(value, str) else json.dumps(value)
    if isinstance(value, bool):
        return "true" if value else "false"
    return str(value)


def _build_insert(table: str, columns: List[str], col_types: Dict[str, str], merge: bool):
    """Build an INSERT statement that binds all values as text and casts each
    column to its real type. In merge mode, conflicts on the primary key update
    the row; RETURNING reports whether the row was inserted (xmax = 0) or updated.
    """
    quoted = [f'"{c}"' for c in columns]
    placeholders = [f'${i + 1}::text::"{col_types[c]}"' for i, c in enumerate(columns)]
    sql = f'INSERT INTO "{table}" ({", ".join(quoted)}) VALUES ({", ".join(placeholders)})'
    if merge:
        updates = ", ".join(f'{q} = EXCLUDED.{q}' for q, c in zip(quoted, columns) if c != "id")
        if updates:
            sql += f' ON CONFLICT (id) DO UPDATE SET {updates}'
        else:
            sql += ' ON CONFLICT (id) DO NOTHING'
    sql += ' RETURNING (xmax = 0) AS inserted'
    return sql


@router.post("/backup")
async def create_backup(request: Request, body: BackupRequest, conn: asyncpg.Connection = Depends(org_conn_admin)):
    """Create an encrypted full backup of all VyManager configuration."""
    try:
        await _require_backup_admin(conn, request)

        tables: Dict[str, List[Dict[str, Any]]] = {}
        for table in BACKUP_TABLES:
            rows = await conn.fetch(f'SELECT * FROM "{table}"')
            tables[table] = [
                {k: _json_safe(v) for k, v in row.items()} for row in rows
            ]

        payload = {
            "format_version": BACKUP_FORMAT_VERSION,
            "created_at": datetime.utcnow().isoformat() + "Z",
            "ssh_key_fingerprint": ssh_key_fingerprint(),
            "excluded_tables": BACKUP_EXCLUDED_TABLES,
            "tables": tables,
        }

        blob = await run_in_threadpool(encrypt_backup, payload, body.passphrase)
        filename = f"vymanager_backup_{datetime.now().strftime('%Y%m%d_%H%M%S')}.vymgr"
        return StreamingResponse(
            iter([blob]),
            media_type="application/octet-stream",
            headers={"Content-Disposition": f"attachment; filename={filename}"},
        )

    except HTTPException:
        raise
    except Exception:
        logger.exception("Backup failed")
        raise HTTPException(status_code=500, detail="Failed to create backup")


def _decode_and_validate(payload: Dict[str, Any]) -> None:
    if not isinstance(payload, dict) or "tables" not in payload:
        raise HTTPException(status_code=400, detail="File is not a valid VyManager backup")
    version = payload.get("format_version")
    if version != BACKUP_FORMAT_VERSION:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported backup format version: {version}",
        )


@router.post("/restore/preview", response_model=ApiResponse)
async def preview_restore(
    request: Request,
    file: UploadFile = File(...),
    passphrase: str = Form(...),
    conn: asyncpg.Connection = Depends(org_conn_admin),
):
    """Decrypt a backup and report its contents without applying anything.

    Lets the restore UI validate the passphrase and show record counts first.
    """
    await _require_backup_admin(conn, request)

    contents = await file.read()
    try:
        payload = await run_in_threadpool(decrypt_backup, contents, passphrase)
    except BackupCryptoError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    _decode_and_validate(payload)

    tables = payload.get("tables", {})
    counts = {t: len(rows) for t, rows in tables.items()}
    host_fp = ssh_key_fingerprint()
    backup_fp = payload.get("ssh_key_fingerprint")
    ssh_keys_decryptable = backup_fp is None or backup_fp == host_fp

    return ApiResponse(
        success=True,
        message="Backup is valid",
        data={
            "created_at": payload.get("created_at"),
            "counts": counts,
            "ssh_keys_decryptable": ssh_keys_decryptable,
        },
    )


@router.post("/restore", response_model=ApiResponse)
async def restore_backup(
    request: Request,
    file: UploadFile = File(...),
    passphrase: str = Form(...),
    mode: str = Form("merge"),
    confirm: str = Form(""),
    conn: asyncpg.Connection = Depends(org_conn_admin),
):
    """Restore a backup in "replace" (wipe + restore) or "merge" (upsert) mode."""
    if mode not in ("replace", "merge"):
        raise HTTPException(status_code=400, detail="mode must be 'replace' or 'merge'")

    # Typed confirmation: the destructive action must be named back explicitly,
    # defeating accidental and CSRF-style restores.
    if confirm != mode:
        raise HTTPException(
            status_code=400,
            detail=f"Restore requires confirm='{mode}' to proceed",
        )

    await _require_backup_admin(conn, request)

    contents = await file.read()
    try:
        payload = await run_in_threadpool(decrypt_backup, contents, passphrase)
    except BackupCryptoError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    _decode_and_validate(payload)

    tables = payload.get("tables", {})

    # Guard against a replace that would leave nobody able to log in.
    if mode == "replace":
        has_admin = any(
            (u.get("role") == "ADMIN") for u in tables.get("users", [])
        )
        if not has_admin:
            raise HTTPException(
                status_code=400,
                detail="Backup contains no ADMIN user; refusing to replace and lock you out",
            )

    warnings: List[str] = []
    host_fp = ssh_key_fingerprint()
    backup_fp = payload.get("ssh_key_fingerprint")
    if tables.get("instances") and backup_fp and backup_fp != host_fp:
        warnings.append(
            "Encrypted SSH keys in this backup were created with a different "
            "SSH_ENCRYPTION_KEY and cannot be decrypted on this host. "
            "Re-run SSH key setup per instance to restore monitoring."
        )

    inserted_counts: Dict[str, int] = {}
    updated_counts: Dict[str, int] = {}
    skipped_counts: Dict[str, int] = {}
    affected_instance_ids: List[str] = []

    # Cache each table's real columns so we can cast text -> column type and
    # ignore any backed-up columns that no longer exist in the schema.
    col_types = {t: await _table_columns(conn, t) for t in BACKUP_TABLES}

    async with conn.transaction():
        if mode == "replace":
            for table in reversed(BACKUP_TABLES):
                await conn.execute(f'DELETE FROM "{table}"')

        for table in BACKUP_TABLES:
            rows = tables.get(table, [])
            types = col_types.get(table, {})
            inserted = updated = skipped = 0

            for row in rows:
                # Pre-org backups predate sites.orgId; the column has no DEFAULT
                # anymore, so land those sites in the default org (never wiped by
                # a restore, so the FK always resolves).
                if table == "sites" and "orgId" in types and not row.get("orgId"):
                    row = {**row, "orgId": "default"}
                columns = [c for c in row.keys() if c in types]
                if not columns:
                    continue
                values = [_bind_value(row[c], types[c]) for c in columns]
                sql = _build_insert(table, columns, types, merge=(mode == "merge"))

                try:
                    if mode == "merge":
                        # Row-level savepoint so a natural-key collision skips
                        # just this row instead of aborting the whole restore.
                        async with conn.transaction():
                            was_inserted = await conn.fetchval(sql, *values)
                    else:
                        was_inserted = await conn.fetchval(sql, *values)
                except asyncpg.UniqueViolationError:
                    skipped += 1
                    continue

                if was_inserted:
                    inserted += 1
                else:
                    updated += 1
                if table == "instances":
                    affected_instance_ids.append(row.get("id"))

            inserted_counts[table] = inserted
            updated_counts[table] = updated
            if skipped:
                skipped_counts[table] = skipped

    for instance_id in affected_instance_ids:
        if instance_id:
            clear_session_cache(instance_id)

    if mode == "replace":
        warnings.append(
            "Existing sessions were cleared; sign in again with a restored account."
        )
    if skipped_counts:
        warnings.append(
            "Some rows were skipped because a record with the same name/email "
            "already exists. Use replace mode to overwrite."
        )

    return ApiResponse(
        success=True,
        message=f"Restore completed ({mode} mode)",
        data={
            "mode": mode,
            "inserted": inserted_counts,
            "updated": updated_counts,
            "skipped": skipped_counts,
            "warnings": warnings,
        },
    )


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
async def get_active_auth_sessions(request: Request, conn: asyncpg.Connection = Depends(org_conn_admin)):
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

    # Better-auth stores compound tokens in the format: {session_id}.{base64(HMAC-SHA256)}
    # Verify the signature and extract the session ID
    current_token = verify_session_cookie(cookie_token) if cookie_token else None

    try:
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
        logger.exception("Unhandled error")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.post("/revoke-session", response_model=ApiResponse)
async def revoke_auth_session(request: Request, body: RevokeSessionRequest, conn: asyncpg.Connection = Depends(org_conn_admin)):
    """
    Revoke a specific authentication session.

    This allows a user to force logout from another device/browser.
    """
    if not hasattr(request.state, "user") or not request.state.user:
        raise HTTPException(status_code=401, detail="Not authenticated")

    user = request.state.user
    user_id = user["id"]

    # Get current session token to prevent self-logout; verify its signature
    cookie_token = request.cookies.get("better-auth.session_token")
    current_token = verify_session_cookie(cookie_token) if cookie_token else None

    if body.session_token == current_token:
        raise HTTPException(
            status_code=400,
            detail="Cannot revoke your current session. Use logout instead.",
        )

    try:
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
        logger.exception("Unhandled error")
        raise HTTPException(status_code=500, detail="Internal server error")
