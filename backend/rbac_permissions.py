"""
RBAC Permission System

Helper functions for checking user permissions based on the new RBAC system.

Permission Resolution:
1. Get all user's roles for the instance (from user_instance_roles table)
2. For each role, determine permissions:
   - Built-in roles (SUPER_ADMIN, ADMIN, VIEWER): Use predefined permissions
   - Custom roles: Look up permissions in feature_permissions table
3. Combine permissions (WRITE > READ > NONE)
4. Apply special rules (e.g., WRITE on CONFIGURATION requires READ on all features)
"""

from typing import Dict, List, Optional
from enum import Enum
import asyncpg


# ============================================================================
# Enums (match Prisma schema)
# ============================================================================

class FeatureGroup(str, Enum):
    """Feature groups that can have permissions"""
    FIREWALL = "FIREWALL"
    NAT = "NAT"
    DHCP = "DHCP"
    INTERFACES = "INTERFACES"
    STATIC_ROUTES = "STATIC_ROUTES"
    ROUTING_POLICIES = "ROUTING_POLICIES"
    SYSTEM = "SYSTEM"
    CONFIGURATION = "CONFIGURATION"
    DASHBOARD = "DASHBOARD"
    SITES_INSTANCES = "SITES_INSTANCES"
    USER_MANAGEMENT = "USER_MANAGEMENT"


class PermissionLevel(str, Enum):
    """Permission levels"""
    NONE = "NONE"
    READ = "READ"
    WRITE = "WRITE"


class BuiltInRole(str, Enum):
    """Built-in roles with predefined permissions"""
    SUPER_ADMIN = "SUPER_ADMIN"
    ADMIN = "ADMIN"
    VIEWER = "VIEWER"


# ============================================================================
# Built-in Role Permissions
# ============================================================================

BUILT_IN_PERMISSIONS: Dict[str, Dict[FeatureGroup, PermissionLevel]] = {
    BuiltInRole.SUPER_ADMIN: {
        # All features: WRITE
        FeatureGroup.FIREWALL: PermissionLevel.WRITE,
        FeatureGroup.NAT: PermissionLevel.WRITE,
        FeatureGroup.DHCP: PermissionLevel.WRITE,
        FeatureGroup.INTERFACES: PermissionLevel.WRITE,
        FeatureGroup.STATIC_ROUTES: PermissionLevel.WRITE,
        FeatureGroup.ROUTING_POLICIES: PermissionLevel.WRITE,
        FeatureGroup.SYSTEM: PermissionLevel.WRITE,
        FeatureGroup.CONFIGURATION: PermissionLevel.WRITE,
        FeatureGroup.DASHBOARD: PermissionLevel.WRITE,
        FeatureGroup.SITES_INSTANCES: PermissionLevel.WRITE,
        FeatureGroup.USER_MANAGEMENT: PermissionLevel.WRITE,
    },
    BuiltInRole.ADMIN: {
        # All VyOS features: WRITE
        FeatureGroup.FIREWALL: PermissionLevel.WRITE,
        FeatureGroup.NAT: PermissionLevel.WRITE,
        FeatureGroup.DHCP: PermissionLevel.WRITE,
        FeatureGroup.INTERFACES: PermissionLevel.WRITE,
        FeatureGroup.STATIC_ROUTES: PermissionLevel.WRITE,
        FeatureGroup.ROUTING_POLICIES: PermissionLevel.WRITE,
        FeatureGroup.SYSTEM: PermissionLevel.WRITE,
        FeatureGroup.CONFIGURATION: PermissionLevel.WRITE,
        FeatureGroup.DASHBOARD: PermissionLevel.WRITE,
        # Site/Instance management: NONE
        FeatureGroup.SITES_INSTANCES: PermissionLevel.NONE,
        # User management: NONE
        FeatureGroup.USER_MANAGEMENT: PermissionLevel.NONE,
    },
    BuiltInRole.VIEWER: {
        # All VyOS features: READ
        FeatureGroup.FIREWALL: PermissionLevel.READ,
        FeatureGroup.NAT: PermissionLevel.READ,
        FeatureGroup.DHCP: PermissionLevel.READ,
        FeatureGroup.INTERFACES: PermissionLevel.READ,
        FeatureGroup.STATIC_ROUTES: PermissionLevel.READ,
        FeatureGroup.ROUTING_POLICIES: PermissionLevel.READ,
        FeatureGroup.SYSTEM: PermissionLevel.READ,
        FeatureGroup.CONFIGURATION: PermissionLevel.READ,
        # Dashboard: WRITE (viewers can customize their own dashboard)
        FeatureGroup.DASHBOARD: PermissionLevel.WRITE,
        # Site/Instance management: NONE
        FeatureGroup.SITES_INSTANCES: PermissionLevel.NONE,
        # User management: NONE
        FeatureGroup.USER_MANAGEMENT: PermissionLevel.NONE,
    },
}


# ============================================================================
# Permission Helper Functions
# ============================================================================

async def get_user_permissions(
    db_pool: asyncpg.Pool,
    user_id: str,
    instance_id: str
) -> Dict[FeatureGroup, PermissionLevel]:
    """
    Get all permissions for a user on a specific instance.

    Combines permissions from all roles (built-in and custom) the user has
    on this instance. Higher permission level wins (WRITE > READ > NONE).

    Args:
        db_pool: Database connection pool
        user_id: User ID
        instance_id: Instance ID

    Returns:
        Dictionary mapping feature groups to permission levels
    """
    # Initialize with all NONE
    permissions: Dict[FeatureGroup, PermissionLevel] = {
        feature: PermissionLevel.NONE for feature in FeatureGroup
    }

    async with db_pool.acquire() as conn:
        # Get all roles for this user on this instance
        user_roles = await conn.fetch(
            """
            SELECT
                uir."roleType",
                uir."builtInRole",
                uir."customRoleId"
            FROM user_instance_roles uir
            WHERE uir."userId" = $1 AND uir."instanceId" = $2
            """,
            user_id,
            instance_id
        )

        # Process each role
        for role_record in user_roles:
            role_type = role_record["roleType"]

            if role_type == "BUILT_IN":
                # Built-in role: use predefined permissions
                built_in_role = role_record["builtInRole"]
                if built_in_role in BUILT_IN_PERMISSIONS:
                    role_permissions = BUILT_IN_PERMISSIONS[built_in_role]
                    _merge_permissions(permissions, role_permissions)

            elif role_type == "CUSTOM":
                # Custom role: fetch from feature_permissions table
                custom_role_id = role_record["customRoleId"]
                if custom_role_id:
                    feature_perms = await conn.fetch(
                        """
                        SELECT feature, permission
                        FROM feature_permissions
                        WHERE "roleId" = $1
                        """,
                        custom_role_id
                    )

                    role_permissions = {
                        FeatureGroup(fp["feature"]): PermissionLevel(fp["permission"])
                        for fp in feature_perms
                    }
                    _merge_permissions(permissions, role_permissions)

    # Apply special rules
    _apply_special_rules(permissions)

    return permissions


async def check_permission(
    db_pool: asyncpg.Pool,
    user_id: str,
    instance_id: str,
    feature: FeatureGroup,
    required_level: PermissionLevel
) -> bool:
    """
    Check if a user has a specific permission level for a feature on an instance.

    Args:
        db_pool: Database connection pool
        user_id: User ID
        instance_id: Instance ID
        feature: Feature group to check
        required_level: Required permission level (READ or WRITE)

    Returns:
        True if user has required permission, False otherwise
    """
    permissions = await get_user_permissions(db_pool, user_id, instance_id)
    user_level = permissions.get(feature, PermissionLevel.NONE)

    # WRITE includes READ
    if required_level == PermissionLevel.READ:
        return user_level in [PermissionLevel.READ, PermissionLevel.WRITE]
    elif required_level == PermissionLevel.WRITE:
        return user_level == PermissionLevel.WRITE

    return False


async def is_super_admin(db_pool: asyncpg.Pool, user_id: str) -> bool:
    """
    Check if a user is a SUPER_ADMIN (has SUPER_ADMIN role on any instance).

    SUPER_ADMIN automatically has access to all instances.

    Args:
        db_pool: Database connection pool
        user_id: User ID

    Returns:
        True if user is SUPER_ADMIN, False otherwise
    """
    async with db_pool.acquire() as conn:
        result = await conn.fetchval(
            """
            SELECT EXISTS(
                SELECT 1
                FROM user_instance_roles
                WHERE "userId" = $1
                  AND "roleType" = 'BUILT_IN'
                  AND "builtInRole" = 'SUPER_ADMIN'
            )
            """,
            user_id
        )
        return result or False


async def get_user_accessible_instances(
    db_pool: asyncpg.Pool,
    user_id: str
) -> List[str]:
    """
    Get list of instance IDs that a user has access to.

    Args:
        db_pool: Database connection pool
        user_id: User ID

    Returns:
        List of instance IDs
    """
    async with db_pool.acquire() as conn:
        # Check if user is SUPER_ADMIN
        is_admin = await is_super_admin(db_pool, user_id)

        if is_admin:
            # SUPER_ADMIN has access to all instances
            instances = await conn.fetch(
                """
                SELECT id FROM instances WHERE "isActive" = true
                """
            )
        else:
            # Get instances user has explicit access to
            instances = await conn.fetch(
                """
                SELECT DISTINCT "instanceId" as id
                FROM user_instance_roles
                WHERE "userId" = $1
                """,
                user_id
            )

        return [inst["id"] for inst in instances]


# ============================================================================
# Helper Functions
# ============================================================================

def _merge_permissions(
    target: Dict[FeatureGroup, PermissionLevel],
    source: Dict[FeatureGroup, PermissionLevel]
) -> None:
    """
    Merge permissions from source into target.
    Higher permission level wins (WRITE > READ > NONE).

    Modifies target in place.
    """
    permission_order = {
        PermissionLevel.NONE: 0,
        PermissionLevel.READ: 1,
        PermissionLevel.WRITE: 2,
    }

    for feature, level in source.items():
        current_level = target.get(feature, PermissionLevel.NONE)
        if permission_order[level] > permission_order[current_level]:
            target[feature] = level


def _apply_special_rules(permissions: Dict[FeatureGroup, PermissionLevel]) -> None:
    """
    Apply special permission rules.

    Rules:
    1. WRITE on CONFIGURATION requires READ on all VyOS features
       (You need to see what you're saving)

    Modifies permissions in place.
    """
    # Rule 1: WRITE on CONFIGURATION requires READ on all VyOS features
    if permissions.get(FeatureGroup.CONFIGURATION) == PermissionLevel.WRITE:
        vyos_features = [
            FeatureGroup.FIREWALL,
            FeatureGroup.NAT,
            FeatureGroup.DHCP,
            FeatureGroup.INTERFACES,
            FeatureGroup.STATIC_ROUTES,
            FeatureGroup.ROUTING_POLICIES,
            FeatureGroup.SYSTEM,
        ]

        for feature in vyos_features:
            if permissions.get(feature) == PermissionLevel.NONE:
                permissions[feature] = PermissionLevel.READ
