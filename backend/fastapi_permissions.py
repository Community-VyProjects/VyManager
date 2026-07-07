"""
FastAPI RBAC Permission Helpers

Helper functions and dependencies for checking permissions in FastAPI endpoints.
Integrates with the session-based architecture to check user permissions
on their active VyOS instance.
"""

from fastapi import Request, HTTPException
from typing import Optional

from org_scope import org_id_from_state, request_scoped_conn
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

def is_read_only_token(request: Request) -> bool:
    """
    True if the request was authenticated with a read-only-scoped API token.

    Read-only tokens (scopes containing "read") can never perform writes,
    regardless of the owning user's role, so a read-only token can be handed to
    the MCP server safely.
    """
    scopes = getattr(request.state, "api_token_scopes", None)
    return bool(scopes) and "read" in scopes


async def require_permission(
    request: Request,
    feature: FeatureGroup,
    level: PermissionLevel
) -> None:
    """
    Check that the authenticated user has required permission for a feature
    on their active instance. Raises 403 if permission denied.

    Site ADMIN users bypass all permission checks.

    Args:
        request: FastAPI request object (carries user and org context)
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

    # Read-only API tokens cannot write — enforced before the site-ADMIN bypass
    # so even an admin's read-only token is denied write operations.
    if level == PermissionLevel.WRITE and is_read_only_token(request):
        raise HTTPException(
            status_code=403,
            detail="This API token is read-only and cannot perform write operations."
        )

    # The active instance is resolved by SessionMiddleware for both auth paths:
    # the browser cookie session, or (for token clients) the X-VyOS-Instance-Id
    # header validated against the user's grants. Checked before touching the
    # database so a missing instance stays a 404 and never costs a connection.
    instance = getattr(request.state, "instance", None)

    # One unit of work: the whole permission check runs on one org-scoped
    # connection (the handler's org_conn transaction when one is open,
    # otherwise a short-lived one of its own — /vyos handlers hold no
    # connection across their VyOS HTTP call).
    async with request_scoped_conn(request) as conn:
        # Site ADMIN bypasses all permission checks
        if await is_super_admin(conn, user["id"]):
            return

        if not instance:
            raise HTTPException(
                status_code=404,
                detail="No active VyOS instance. Please connect to an instance first."
            )

        has_permission = await check_permission(
            db_pool=conn,
            user_id=user["id"],
            instance_id=instance["id"],
            feature=feature,
            required_level=level,
            org_id=org_id_from_state(request),
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


async def has_permission(request: Request, feature: FeatureGroup, level: PermissionLevel) -> bool:
    """
    Soft permission check — returns True/False instead of raising.

    Use for optional data channels (e.g., SSE streams) where a missing
    permission should silently skip the channel rather than fail the request.
    """
    try:
        await require_permission(request, feature, level)
        return True
    except HTTPException:
        return False


async def require_super_admin(request: Request) -> None:
    """
    Require user to be a Site ADMIN.
    Used for User Management and Site/Instance management endpoints.

    Raises:
        HTTPException(401): If user is not authenticated
        HTTPException(403): If user is not a Site ADMIN
    """
    user = getattr(request.state, "user", None)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")

    async with request_scoped_conn(request) as conn:
        if not await is_super_admin(conn, user["id"]):
            raise HTTPException(
                status_code=403,
                detail="Insufficient permissions. Site ADMIN role required."
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

    # Active instance resolved by SessionMiddleware (cookie session or token header).
    instance = getattr(request.state, "instance", None)
    if not instance:
        raise HTTPException(
            status_code=404,
            detail="No active VyOS instance"
        )

    # Get all permissions (one unit of work, org-scoped)
    async with request_scoped_conn(request) as conn:
        permissions = await get_user_permissions(
            conn, user["id"], instance["id"],
            org_id=org_id_from_state(request),
        )

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
    "/vyos/nat64": FeatureGroup.NAT64,
    "/vyos/nat66": FeatureGroup.NAT66,
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
    "/vyos/ospf": FeatureGroup.OSPF,
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
