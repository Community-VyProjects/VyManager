"""
FastAPI RBAC Permission Helpers

Helper functions and dependencies for checking permissions in FastAPI endpoints.
Integrates with the session-based architecture to check user permissions
on their active VyOS instance.
"""

from fastapi import Request, HTTPException
from typing import Optional
import asyncpg

from rbac_permissions import (
    FeatureGroup,
    PermissionLevel,
    check_permission,
    get_user_permissions,
    is_super_admin,
)


# ============================================================================
# Permission Checking Helpers
# ============================================================================

async def require_permission(
    request: Request,
    feature: FeatureGroup,
    level: PermissionLevel
) -> None:
    """
    Check that the authenticated user has required permission for a feature
    on their active instance. Raises 403 if permission denied.

    SUPER_ADMIN users bypass all permission checks.

    Args:
        request: FastAPI request object (contains user and db_pool)
        feature: Feature group to check (e.g., FIREWALL, NAT)
        level: Required permission level (READ or WRITE)

    Raises:
        HTTPException(401): If user is not authenticated
        HTTPException(404): If user has no active instance
        HTTPException(403): If user lacks required permission
        HTTPException(500): If database query fails
    """
    # Get authenticated user
    user = getattr(request.state, "user", None)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")

    # Get database pool
    db_pool: asyncpg.Pool = request.app.state.db_pool

    # SUPER_ADMIN bypasses all permission checks
    if await is_super_admin(db_pool, user["id"]):
        return

    # Get user's active instance
    async with db_pool.acquire() as conn:
        result = await conn.fetchrow(
            """
            SELECT "instanceId"
            FROM active_sessions
            WHERE "userId" = $1
            LIMIT 1
            """,
            user["id"]
        )

        if not result:
            raise HTTPException(
                status_code=404,
                detail="No active VyOS instance. Please connect to an instance first."
            )

        instance_id = result["instanceId"]

    # Check permission
    has_permission = await check_permission(
        db_pool=db_pool,
        user_id=user["id"],
        instance_id=instance_id,
        feature=feature,
        required_level=level
    )

    if not has_permission:
        # Get feature name for error message
        feature_name = feature.value.replace("_", " ").title()
        level_name = level.value.lower()

        raise HTTPException(
            status_code=403,
            detail=f"Insufficient permissions. {level_name.capitalize()} access to {feature_name} required."
        )


async def require_read_permission(request: Request, feature: FeatureGroup) -> None:
    """
    Require READ permission for a feature.
    Convenience wrapper around require_permission.
    """
    await require_permission(request, feature, PermissionLevel.READ)


async def require_write_permission(request: Request, feature: FeatureGroup) -> None:
    """
    Require WRITE permission for a feature.
    Convenience wrapper around require_permission.
    """
    await require_permission(request, feature, PermissionLevel.WRITE)


async def require_super_admin(request: Request) -> None:
    """
    Require user to be a SUPER_ADMIN.
    Used for User Management and Site/Instance management endpoints.

    Raises:
        HTTPException(401): If user is not authenticated
        HTTPException(403): If user is not a SUPER_ADMIN
    """
    user = getattr(request.state, "user", None)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")

    db_pool: asyncpg.Pool = request.app.state.db_pool

    if not await is_super_admin(db_pool, user["id"]):
        raise HTTPException(
            status_code=403,
            detail="Insufficient permissions. SUPER_ADMIN role required."
        )


async def get_user_feature_permissions(request: Request) -> dict:
    """
    Get all feature permissions for the authenticated user on their active instance.
    Useful for frontend to conditionally show/hide features.

    Returns:
        Dictionary mapping feature groups to permission levels

    Raises:
        HTTPException(401): If user is not authenticated
        HTTPException(404): If user has no active instance
    """
    user = getattr(request.state, "user", None)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")

    db_pool: asyncpg.Pool = request.app.state.db_pool

    # Get user's active instance
    async with db_pool.acquire() as conn:
        result = await conn.fetchrow(
            """
            SELECT "instanceId"
            FROM active_sessions
            WHERE "userId" = $1
            LIMIT 1
            """,
            user["id"]
        )

        if not result:
            raise HTTPException(
                status_code=404,
                detail="No active VyOS instance"
            )

        instance_id = result["instanceId"]

    # Get all permissions
    permissions = await get_user_permissions(db_pool, user["id"], instance_id)

    # Convert to JSON-serializable format
    return {
        feature.value: level.value
        for feature, level in permissions.items()
    }


# ============================================================================
# Feature Group Mapping
# ============================================================================

# Maps VyOS router prefixes to feature groups
ROUTER_FEATURE_MAP = {
    "/vyos/firewall": FeatureGroup.FIREWALL,
    "/vyos/nat": FeatureGroup.NAT,
    "/vyos/dhcp": FeatureGroup.DHCP,
    "/vyos/interfaces": FeatureGroup.INTERFACES,
    "/vyos/static-routes": FeatureGroup.STATIC_ROUTES,
    "/vyos/route": FeatureGroup.ROUTING_POLICIES,
    "/vyos/route-map": FeatureGroup.ROUTING_POLICIES,
    "/vyos/access-list": FeatureGroup.ROUTING_POLICIES,
    "/vyos/as-path-list": FeatureGroup.ROUTING_POLICIES,
    "/vyos/community-list": FeatureGroup.ROUTING_POLICIES,
    "/vyos/extcommunity-list": FeatureGroup.ROUTING_POLICIES,
    "/vyos/large-community-list": FeatureGroup.ROUTING_POLICIES,
    "/vyos/prefix-list": FeatureGroup.ROUTING_POLICIES,
    "/vyos/local-route": FeatureGroup.ROUTING_POLICIES,
    "/vyos/system": FeatureGroup.SYSTEM,
    "/vyos/config": FeatureGroup.CONFIGURATION,
    "/vyos/power": FeatureGroup.SYSTEM,
    "/dashboard": FeatureGroup.DASHBOARD,
}


def get_feature_for_router(router_prefix: str) -> Optional[FeatureGroup]:
    """
    Get the feature group for a router prefix.

    Args:
        router_prefix: Router prefix (e.g., "/vyos/firewall")

    Returns:
        Feature group or None if not mapped
    """
    return ROUTER_FEATURE_MAP.get(router_prefix)
