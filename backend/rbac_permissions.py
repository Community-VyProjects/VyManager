"""
RBAC Permission System

Helper functions for checking user permissions based on the simplified RBAC system.

Permission Resolution:
1. Get all user's roles for the instance (from user_instance_roles table)
2. For each role, determine permissions:
   - Built-in roles (ADMIN, OPERATOR, VIEWER): Use predefined permissions
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
    # Legacy/Parent features (for backward compatibility)
    FIREWALL = "FIREWALL"
    NAT = "NAT"
    NAT64 = "NAT64"
    NAT66 = "NAT66"
    DHCP = "DHCP"
    INTERFACES = "INTERFACES"

    # Firewall sub-features (page-level permissions)
    FIREWALL_GROUPS = "FIREWALL_GROUPS"
    FIREWALL_POLICIES = "FIREWALL_POLICIES"
    FIREWALL_ZONES = "FIREWALL_ZONES"
    FIREWALL_GLOBAL_OPTIONS = "FIREWALL_GLOBAL_OPTIONS"
    FIREWALL_BRIDGE = "FIREWALL_BRIDGE"
    FIREWALL_FLOWTABLES = "FIREWALL_FLOWTABLES"

    # Network features
    NETWORK = "NETWORK"
    TUNNEL = "TUNNEL"
    VXLAN = "VXLAN"
    VRF = "VRF"
    LOAD_BALANCING = "LOAD_BALANCING"

    # VPN features
    VPN = "VPN"
    IPSEC = "IPSEC"
    WIREGUARD = "WIREGUARD"
    L2TP = "L2TP"

    # PKI
    PKI = "PKI"

    # Routing features (parent/child hierarchy)
    ROUTING = "ROUTING"
    UNICAST_PROTOCOLS = "UNICAST_PROTOCOLS"
    BGP = "BGP"
    OSPF = "OSPF"
    OSPFV3 = "OSPFV3"
    ISIS = "ISIS"
    OPENFABRIC = "OPENFABRIC"
    RIP = "RIP"
    RIPNG = "RIPNG"
    BABEL = "BABEL"
    STATIC_ROUTES = "STATIC_ROUTES"
    FAILOVER = "FAILOVER"

    # Routing Infrastructure
    ROUTING_INFRASTRUCTURE = "ROUTING_INFRASTRUCTURE"
    BFD = "BFD"
    MPLS = "MPLS"
    SEGMENT_ROUTING = "SEGMENT_ROUTING"
    NHRP = "NHRP"
    RPKI = "RPKI"

    # Routing Policies
    ROUTING_POLICIES = "ROUTING_POLICIES"
    ACCESS_LIST = "ACCESS_LIST"
    PREFIX_LIST = "PREFIX_LIST"
    ROUTE_POLICY = "ROUTE_POLICY"
    ROUTE_MAP = "ROUTE_MAP"
    LOCAL_ROUTE = "LOCAL_ROUTE"
    BGP_AS_PATH = "BGP_AS_PATH"
    BGP_COMMUNITY = "BGP_COMMUNITY"
    BGP_EXTENDED_COMMUNITY = "BGP_EXTENDED_COMMUNITY"
    BGP_LARGE_COMMUNITY = "BGP_LARGE_COMMUNITY"

    # Multicast
    MULTICAST = "MULTICAST"
    IGMP_PROXY = "IGMP_PROXY"
    PIM = "PIM"
    PIM6 = "PIM6"

    HIGH_AVAILABILITY = "HIGH_AVAILABILITY"

    SYSTEM = "SYSTEM"
    POWER = "POWER"  # Reboot, shutdown actions
    CONFIGURATION = "CONFIGURATION"
    MONITORING = "MONITORING"  # SSH monitoring / live traffic
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
    ADMIN = "ADMIN"
    OPERATOR = "OPERATOR"
    VIEWER = "VIEWER"


# ============================================================================
# Built-in Role Permissions
# ============================================================================

BUILT_IN_PERMISSIONS: Dict[str, Dict[FeatureGroup, PermissionLevel]] = {
    BuiltInRole.ADMIN: {
        # ADMIN has full WRITE access to everything
        FeatureGroup.FIREWALL: PermissionLevel.WRITE,
        FeatureGroup.FIREWALL_GROUPS: PermissionLevel.WRITE,
        FeatureGroup.FIREWALL_POLICIES: PermissionLevel.WRITE,
        FeatureGroup.FIREWALL_ZONES: PermissionLevel.WRITE,
        FeatureGroup.FIREWALL_GLOBAL_OPTIONS: PermissionLevel.WRITE,
        FeatureGroup.FIREWALL_BRIDGE: PermissionLevel.WRITE,
        FeatureGroup.FIREWALL_FLOWTABLES: PermissionLevel.WRITE,
        FeatureGroup.NETWORK: PermissionLevel.WRITE,
        FeatureGroup.NAT: PermissionLevel.WRITE,
        FeatureGroup.NAT64: PermissionLevel.WRITE,
        FeatureGroup.NAT66: PermissionLevel.WRITE,
        FeatureGroup.DHCP: PermissionLevel.WRITE,
        FeatureGroup.INTERFACES: PermissionLevel.WRITE,
        FeatureGroup.TUNNEL: PermissionLevel.WRITE,
        FeatureGroup.VXLAN: PermissionLevel.WRITE,
        FeatureGroup.VRF: PermissionLevel.WRITE,
        FeatureGroup.LOAD_BALANCING: PermissionLevel.WRITE,
        FeatureGroup.VPN: PermissionLevel.WRITE,
        FeatureGroup.IPSEC: PermissionLevel.WRITE,
        FeatureGroup.WIREGUARD: PermissionLevel.WRITE,
        FeatureGroup.L2TP: PermissionLevel.WRITE,
        FeatureGroup.PKI: PermissionLevel.WRITE,
        FeatureGroup.ROUTING: PermissionLevel.WRITE,
        FeatureGroup.UNICAST_PROTOCOLS: PermissionLevel.WRITE,
        FeatureGroup.BGP: PermissionLevel.WRITE,
        FeatureGroup.OSPF: PermissionLevel.WRITE,
        FeatureGroup.OSPFV3: PermissionLevel.WRITE,
        FeatureGroup.ISIS: PermissionLevel.WRITE,
        FeatureGroup.OPENFABRIC: PermissionLevel.WRITE,
        FeatureGroup.RIP: PermissionLevel.WRITE,
        FeatureGroup.RIPNG: PermissionLevel.WRITE,
        FeatureGroup.BABEL: PermissionLevel.WRITE,
        FeatureGroup.STATIC_ROUTES: PermissionLevel.WRITE,
        FeatureGroup.FAILOVER: PermissionLevel.WRITE,
        FeatureGroup.ROUTING_INFRASTRUCTURE: PermissionLevel.WRITE,
        FeatureGroup.BFD: PermissionLevel.WRITE,
        FeatureGroup.MPLS: PermissionLevel.WRITE,
        FeatureGroup.SEGMENT_ROUTING: PermissionLevel.WRITE,
        FeatureGroup.NHRP: PermissionLevel.WRITE,
        FeatureGroup.RPKI: PermissionLevel.WRITE,
        FeatureGroup.ROUTING_POLICIES: PermissionLevel.WRITE,
        FeatureGroup.ACCESS_LIST: PermissionLevel.WRITE,
        FeatureGroup.PREFIX_LIST: PermissionLevel.WRITE,
        FeatureGroup.ROUTE_POLICY: PermissionLevel.WRITE,
        FeatureGroup.ROUTE_MAP: PermissionLevel.WRITE,
        FeatureGroup.LOCAL_ROUTE: PermissionLevel.WRITE,
        FeatureGroup.BGP_AS_PATH: PermissionLevel.WRITE,
        FeatureGroup.BGP_COMMUNITY: PermissionLevel.WRITE,
        FeatureGroup.BGP_EXTENDED_COMMUNITY: PermissionLevel.WRITE,
        FeatureGroup.BGP_LARGE_COMMUNITY: PermissionLevel.WRITE,
        FeatureGroup.MULTICAST: PermissionLevel.WRITE,
        FeatureGroup.IGMP_PROXY: PermissionLevel.WRITE,
        FeatureGroup.PIM: PermissionLevel.WRITE,
        FeatureGroup.PIM6: PermissionLevel.WRITE,
        FeatureGroup.HIGH_AVAILABILITY: PermissionLevel.WRITE,
        FeatureGroup.SYSTEM: PermissionLevel.WRITE,
        FeatureGroup.POWER: PermissionLevel.WRITE,
        FeatureGroup.CONFIGURATION: PermissionLevel.WRITE,
        FeatureGroup.MONITORING: PermissionLevel.WRITE,
        FeatureGroup.DASHBOARD: PermissionLevel.WRITE,
        FeatureGroup.SITES_INSTANCES: PermissionLevel.WRITE,
        FeatureGroup.USER_MANAGEMENT: PermissionLevel.WRITE,
    },
    BuiltInRole.OPERATOR: {
        # OPERATOR has WRITE access to VyOS features only
        FeatureGroup.FIREWALL: PermissionLevel.WRITE,
        FeatureGroup.FIREWALL_GROUPS: PermissionLevel.WRITE,
        FeatureGroup.FIREWALL_POLICIES: PermissionLevel.WRITE,
        FeatureGroup.FIREWALL_ZONES: PermissionLevel.WRITE,
        FeatureGroup.FIREWALL_GLOBAL_OPTIONS: PermissionLevel.WRITE,
        FeatureGroup.FIREWALL_BRIDGE: PermissionLevel.WRITE,
        FeatureGroup.FIREWALL_FLOWTABLES: PermissionLevel.WRITE,
        FeatureGroup.NETWORK: PermissionLevel.WRITE,
        FeatureGroup.NAT: PermissionLevel.WRITE,
        FeatureGroup.NAT64: PermissionLevel.WRITE,
        FeatureGroup.NAT66: PermissionLevel.WRITE,
        FeatureGroup.DHCP: PermissionLevel.WRITE,
        FeatureGroup.INTERFACES: PermissionLevel.WRITE,
        FeatureGroup.TUNNEL: PermissionLevel.WRITE,
        FeatureGroup.VXLAN: PermissionLevel.WRITE,
        FeatureGroup.VRF: PermissionLevel.WRITE,
        FeatureGroup.LOAD_BALANCING: PermissionLevel.WRITE,
        FeatureGroup.VPN: PermissionLevel.WRITE,
        FeatureGroup.IPSEC: PermissionLevel.WRITE,
        FeatureGroup.WIREGUARD: PermissionLevel.WRITE,
        FeatureGroup.L2TP: PermissionLevel.WRITE,
        FeatureGroup.PKI: PermissionLevel.WRITE,
        FeatureGroup.ROUTING: PermissionLevel.WRITE,
        FeatureGroup.UNICAST_PROTOCOLS: PermissionLevel.WRITE,
        FeatureGroup.BGP: PermissionLevel.WRITE,
        FeatureGroup.OSPF: PermissionLevel.WRITE,
        FeatureGroup.OSPFV3: PermissionLevel.WRITE,
        FeatureGroup.ISIS: PermissionLevel.WRITE,
        FeatureGroup.OPENFABRIC: PermissionLevel.WRITE,
        FeatureGroup.RIP: PermissionLevel.WRITE,
        FeatureGroup.RIPNG: PermissionLevel.WRITE,
        FeatureGroup.BABEL: PermissionLevel.WRITE,
        FeatureGroup.STATIC_ROUTES: PermissionLevel.WRITE,
        FeatureGroup.FAILOVER: PermissionLevel.WRITE,
        FeatureGroup.ROUTING_INFRASTRUCTURE: PermissionLevel.WRITE,
        FeatureGroup.BFD: PermissionLevel.WRITE,
        FeatureGroup.MPLS: PermissionLevel.WRITE,
        FeatureGroup.SEGMENT_ROUTING: PermissionLevel.WRITE,
        FeatureGroup.NHRP: PermissionLevel.WRITE,
        FeatureGroup.RPKI: PermissionLevel.WRITE,
        FeatureGroup.ROUTING_POLICIES: PermissionLevel.WRITE,
        FeatureGroup.ACCESS_LIST: PermissionLevel.WRITE,
        FeatureGroup.PREFIX_LIST: PermissionLevel.WRITE,
        FeatureGroup.ROUTE_POLICY: PermissionLevel.WRITE,
        FeatureGroup.ROUTE_MAP: PermissionLevel.WRITE,
        FeatureGroup.LOCAL_ROUTE: PermissionLevel.WRITE,
        FeatureGroup.BGP_AS_PATH: PermissionLevel.WRITE,
        FeatureGroup.BGP_COMMUNITY: PermissionLevel.WRITE,
        FeatureGroup.BGP_EXTENDED_COMMUNITY: PermissionLevel.WRITE,
        FeatureGroup.BGP_LARGE_COMMUNITY: PermissionLevel.WRITE,
        FeatureGroup.MULTICAST: PermissionLevel.WRITE,
        FeatureGroup.IGMP_PROXY: PermissionLevel.WRITE,
        FeatureGroup.PIM: PermissionLevel.WRITE,
        FeatureGroup.PIM6: PermissionLevel.WRITE,
        FeatureGroup.HIGH_AVAILABILITY: PermissionLevel.WRITE,
        FeatureGroup.SYSTEM: PermissionLevel.WRITE,
        FeatureGroup.POWER: PermissionLevel.WRITE,
        FeatureGroup.CONFIGURATION: PermissionLevel.WRITE,
        FeatureGroup.MONITORING: PermissionLevel.WRITE,
        FeatureGroup.DASHBOARD: PermissionLevel.WRITE,
        # No site/instance or user management
        FeatureGroup.SITES_INSTANCES: PermissionLevel.NONE,
        FeatureGroup.USER_MANAGEMENT: PermissionLevel.NONE,
    },
    BuiltInRole.VIEWER: {
        # VIEWER has READ-only access to VyOS features
        FeatureGroup.FIREWALL: PermissionLevel.READ,
        FeatureGroup.FIREWALL_GROUPS: PermissionLevel.READ,
        FeatureGroup.FIREWALL_POLICIES: PermissionLevel.READ,
        FeatureGroup.FIREWALL_ZONES: PermissionLevel.READ,
        FeatureGroup.FIREWALL_GLOBAL_OPTIONS: PermissionLevel.READ,
        FeatureGroup.FIREWALL_BRIDGE: PermissionLevel.READ,
        FeatureGroup.FIREWALL_FLOWTABLES: PermissionLevel.READ,
        FeatureGroup.NETWORK: PermissionLevel.READ,
        FeatureGroup.NAT: PermissionLevel.READ,
        FeatureGroup.NAT64: PermissionLevel.READ,
        FeatureGroup.NAT66: PermissionLevel.READ,
        FeatureGroup.DHCP: PermissionLevel.READ,
        FeatureGroup.INTERFACES: PermissionLevel.READ,
        FeatureGroup.TUNNEL: PermissionLevel.READ,
        FeatureGroup.VXLAN: PermissionLevel.READ,
        FeatureGroup.VRF: PermissionLevel.READ,
        FeatureGroup.LOAD_BALANCING: PermissionLevel.READ,
        FeatureGroup.VPN: PermissionLevel.READ,
        FeatureGroup.IPSEC: PermissionLevel.READ,
        FeatureGroup.WIREGUARD: PermissionLevel.READ,
        FeatureGroup.L2TP: PermissionLevel.READ,
        FeatureGroup.PKI: PermissionLevel.READ,
        FeatureGroup.ROUTING: PermissionLevel.READ,
        FeatureGroup.UNICAST_PROTOCOLS: PermissionLevel.READ,
        FeatureGroup.BGP: PermissionLevel.READ,
        FeatureGroup.OSPF: PermissionLevel.READ,
        FeatureGroup.OSPFV3: PermissionLevel.READ,
        FeatureGroup.ISIS: PermissionLevel.READ,
        FeatureGroup.OPENFABRIC: PermissionLevel.READ,
        FeatureGroup.RIP: PermissionLevel.READ,
        FeatureGroup.RIPNG: PermissionLevel.READ,
        FeatureGroup.BABEL: PermissionLevel.READ,
        FeatureGroup.STATIC_ROUTES: PermissionLevel.READ,
        FeatureGroup.FAILOVER: PermissionLevel.READ,
        FeatureGroup.ROUTING_INFRASTRUCTURE: PermissionLevel.READ,
        FeatureGroup.BFD: PermissionLevel.READ,
        FeatureGroup.MPLS: PermissionLevel.READ,
        FeatureGroup.SEGMENT_ROUTING: PermissionLevel.READ,
        FeatureGroup.NHRP: PermissionLevel.READ,
        FeatureGroup.RPKI: PermissionLevel.READ,
        FeatureGroup.ROUTING_POLICIES: PermissionLevel.READ,
        FeatureGroup.ACCESS_LIST: PermissionLevel.READ,
        FeatureGroup.PREFIX_LIST: PermissionLevel.READ,
        FeatureGroup.ROUTE_POLICY: PermissionLevel.READ,
        FeatureGroup.ROUTE_MAP: PermissionLevel.READ,
        FeatureGroup.LOCAL_ROUTE: PermissionLevel.READ,
        FeatureGroup.BGP_AS_PATH: PermissionLevel.READ,
        FeatureGroup.BGP_COMMUNITY: PermissionLevel.READ,
        FeatureGroup.BGP_EXTENDED_COMMUNITY: PermissionLevel.READ,
        FeatureGroup.BGP_LARGE_COMMUNITY: PermissionLevel.READ,
        FeatureGroup.MULTICAST: PermissionLevel.READ,
        FeatureGroup.IGMP_PROXY: PermissionLevel.READ,
        FeatureGroup.PIM: PermissionLevel.READ,
        FeatureGroup.PIM6: PermissionLevel.READ,
        FeatureGroup.HIGH_AVAILABILITY: PermissionLevel.READ,
        FeatureGroup.SYSTEM: PermissionLevel.READ,
        FeatureGroup.POWER: PermissionLevel.READ,  # Can see status, cannot execute power actions
        FeatureGroup.CONFIGURATION: PermissionLevel.READ,
        FeatureGroup.MONITORING: PermissionLevel.NONE,
        FeatureGroup.DASHBOARD: PermissionLevel.WRITE,
        # No site/instance or user management
        FeatureGroup.SITES_INSTANCES: PermissionLevel.NONE,
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

    Uses new two-tier RBAC:
    - Site ADMIN (users.role = 'ADMIN'): Full WRITE access to all features on all instances
    - Instance ADMIN role: Full WRITE access to all VyOS features on this instance
    - Instance OPERATOR/VIEWER: Check user_feature_permissions for granular access

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
        # First check if user is site-level ADMIN
        site_role = await conn.fetchval(
            """
            SELECT role FROM users WHERE id = $1
            """,
            user_id
        )

        # Site ADMINs (PROJECT_ADMIN or ORG_ADMIN) have full access to everything
        if site_role in ("PROJECT_ADMIN", "ORG_ADMIN", "ADMIN"):
            all_features = [
                FeatureGroup.FIREWALL,
                FeatureGroup.FIREWALL_GROUPS,
                FeatureGroup.FIREWALL_POLICIES,
                FeatureGroup.FIREWALL_ZONES,
                FeatureGroup.FIREWALL_GLOBAL_OPTIONS,
                FeatureGroup.NETWORK,
                FeatureGroup.NAT,
                FeatureGroup.NAT64,
                FeatureGroup.NAT66,
                FeatureGroup.DHCP,
                FeatureGroup.INTERFACES,
                FeatureGroup.VRF,
                FeatureGroup.LOAD_BALANCING,
                FeatureGroup.VPN,
                FeatureGroup.IPSEC,
                FeatureGroup.WIREGUARD,
                FeatureGroup.L2TP,
                FeatureGroup.PKI,
                FeatureGroup.VXLAN,
                FeatureGroup.ROUTING,
                FeatureGroup.UNICAST_PROTOCOLS,
                FeatureGroup.BGP,
                FeatureGroup.OSPF,
                FeatureGroup.OSPFV3,
                FeatureGroup.ISIS,
                FeatureGroup.OPENFABRIC,
                FeatureGroup.RIP,
                FeatureGroup.RIPNG,
                FeatureGroup.BABEL,
                FeatureGroup.STATIC_ROUTES,
                FeatureGroup.FAILOVER,
                FeatureGroup.ROUTING_INFRASTRUCTURE,
                FeatureGroup.BFD,
                FeatureGroup.MPLS,
                FeatureGroup.SEGMENT_ROUTING,
                FeatureGroup.NHRP,
                FeatureGroup.RPKI,
                FeatureGroup.ROUTING_POLICIES,
                FeatureGroup.ACCESS_LIST,
                FeatureGroup.PREFIX_LIST,
                FeatureGroup.ROUTE_POLICY,
                FeatureGroup.ROUTE_MAP,
                FeatureGroup.LOCAL_ROUTE,
                FeatureGroup.BGP_AS_PATH,
                FeatureGroup.BGP_COMMUNITY,
                FeatureGroup.BGP_EXTENDED_COMMUNITY,
                FeatureGroup.BGP_LARGE_COMMUNITY,
                FeatureGroup.MULTICAST,
                FeatureGroup.IGMP_PROXY,
                FeatureGroup.PIM,
                FeatureGroup.PIM6,
                FeatureGroup.HIGH_AVAILABILITY,
                FeatureGroup.SYSTEM,
                FeatureGroup.POWER,
                FeatureGroup.CONFIGURATION,
                FeatureGroup.MONITORING,
                FeatureGroup.DASHBOARD,
                FeatureGroup.SITES_INSTANCES,
                FeatureGroup.USER_MANAGEMENT,
            ]
            for feature in all_features:
                permissions[feature] = PermissionLevel.WRITE
            return permissions

        # Not a site ADMIN - check instance-level role
        user_role = await conn.fetchrow(
            """
            SELECT uir.role, uir.id as assignment_id
            FROM user_instance_roles uir
            WHERE uir."userId" = $1 AND uir."instanceId" = $2
            """,
            user_id,
            instance_id
        )

        if not user_role:
            # User has no access to this instance
            return permissions

        role = user_role["role"]

        if role == "ADMIN":
            # ADMIN has full WRITE access to all VyOS features
            vyos_features = [
                FeatureGroup.FIREWALL,
                FeatureGroup.FIREWALL_GROUPS,
                FeatureGroup.FIREWALL_POLICIES,
                FeatureGroup.FIREWALL_ZONES,
                FeatureGroup.FIREWALL_GLOBAL_OPTIONS,
                FeatureGroup.NETWORK,
                FeatureGroup.NAT,
                FeatureGroup.NAT64,
                FeatureGroup.NAT66,
                FeatureGroup.DHCP,
                FeatureGroup.INTERFACES,
                FeatureGroup.VRF,
                FeatureGroup.LOAD_BALANCING,
                FeatureGroup.VPN,
                FeatureGroup.IPSEC,
                FeatureGroup.WIREGUARD,
                FeatureGroup.L2TP,
                FeatureGroup.PKI,
                FeatureGroup.VXLAN,
                FeatureGroup.ROUTING,  # Added for three-level hierarchy
                FeatureGroup.UNICAST_PROTOCOLS,  # Added for three-level hierarchy
                FeatureGroup.BGP,
                FeatureGroup.OSPF,
                FeatureGroup.OSPFV3,
                FeatureGroup.ISIS,
                FeatureGroup.OPENFABRIC,
                FeatureGroup.RIP,
                FeatureGroup.RIPNG,
                FeatureGroup.BABEL,
                FeatureGroup.STATIC_ROUTES,
                FeatureGroup.FAILOVER,
                FeatureGroup.ROUTING_INFRASTRUCTURE,
                FeatureGroup.BFD,
                FeatureGroup.MPLS,
                FeatureGroup.SEGMENT_ROUTING,
                FeatureGroup.NHRP,
                FeatureGroup.RPKI,
                FeatureGroup.ROUTING_POLICIES,
                FeatureGroup.ACCESS_LIST,
                FeatureGroup.PREFIX_LIST,
                FeatureGroup.ROUTE_POLICY,
                FeatureGroup.ROUTE_MAP,
                FeatureGroup.LOCAL_ROUTE,
                FeatureGroup.BGP_AS_PATH,
                FeatureGroup.BGP_COMMUNITY,
                FeatureGroup.BGP_EXTENDED_COMMUNITY,
                FeatureGroup.BGP_LARGE_COMMUNITY,
                FeatureGroup.MULTICAST,
                FeatureGroup.IGMP_PROXY,
                FeatureGroup.PIM,
                FeatureGroup.PIM6,
                FeatureGroup.HIGH_AVAILABILITY,
                FeatureGroup.SYSTEM,
                FeatureGroup.POWER,
                FeatureGroup.CONFIGURATION,
                FeatureGroup.MONITORING,
                FeatureGroup.DASHBOARD,
            ]
            for feature in vyos_features:
                permissions[feature] = PermissionLevel.WRITE

        else:
            # OPERATOR or VIEWER: check feature permissions
            feature_perms = await conn.fetch(
                """
                SELECT feature, "canEdit", "canView"
                FROM user_feature_permissions
                WHERE "userInstanceRoleId" = $1
                """,
                user_role["assignment_id"]
            )

            for fp in feature_perms:
                feature_name = fp["feature"]
                # Convert string to FeatureGroup enum
                try:
                    feature = FeatureGroup(feature_name)

                    if fp["canEdit"]:
                        permissions[feature] = PermissionLevel.WRITE
                    elif fp["canView"]:
                        permissions[feature] = PermissionLevel.READ
                except ValueError:
                    # Invalid feature name, skip it
                    continue

    # Apply backward compatibility: Parent permissions grant child permissions
    _apply_parent_child_permissions(permissions)

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


async def is_admin(db_pool: asyncpg.Pool, user_id: str) -> bool:
    """
    Check if a user has admin-level access (PROJECT_ADMIN or ORG_ADMIN).

    Admins have full access to user management, sites, and all instances
    within their scope (PROJECT_ADMIN: all orgs, ORG_ADMIN: own org).
    Demo users are excluded even if they hold an admin role.
    """
    async with db_pool.acquire() as conn:
        row = await conn.fetchrow(
            """
            SELECT role, "isDemo" FROM users WHERE id = $1
            """,
            user_id
        )
        if not row:
            return False
        if row["isDemo"]:
            return False
        return row["role"] in ("PROJECT_ADMIN", "ORG_ADMIN", "ADMIN")


# Deprecated: Kept for backwards compatibility
async def is_super_admin(db_pool: asyncpg.Pool, user_id: str) -> bool:
    """Deprecated: Use is_admin() instead."""
    return await is_admin(db_pool, user_id)


async def get_user_accessible_instances(
    db_pool: asyncpg.Pool,
    user_id: str
) -> List[str]:
    """
    Get list of instance IDs that a user has access to.
    PROJECT_ADMIN: all active instances.
    ORG_ADMIN: active instances in their org(s).
    Others: explicitly assigned instances.
    """
    async with db_pool.acquire() as conn:
        row = await conn.fetchrow(
            'SELECT role, "isDemo" FROM users WHERE id = $1', user_id
        )
        if not row:
            return []

        user_role = row["role"]
        is_demo = row["isDemo"]

        if user_role in ("PROJECT_ADMIN", "ADMIN") and not is_demo:
            instances = await conn.fetch(
                'SELECT id FROM instances WHERE "isActive" = true'
            )
        elif user_role == "ORG_ADMIN" and not is_demo:
            # ORG_ADMIN: instances in their orgs only
            instances = await conn.fetch(
                """
                SELECT i.id FROM instances i
                JOIN sites s ON i."siteId" = s.id
                JOIN org_members om ON s."orgId" = om."orgId"
                WHERE om."userId" = $1 AND i."isActive" = true
                """,
                user_id,
            )
        else:
            instances = await conn.fetch(
                'SELECT DISTINCT "instanceId" as id FROM user_instance_roles WHERE "userId" = $1',
                user_id,
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


def _apply_parent_child_permissions(permissions: Dict[FeatureGroup, PermissionLevel]) -> None:
    """
    Apply parent-child permission inheritance.

    If a user has permission on a parent feature, automatically grant the same
    permission to all child features.

    Parent-Child relationships:
    - FIREWALL → FIREWALL_GROUPS, FIREWALL_POLICIES, FIREWALL_ZONES
    - NETWORK → INTERFACES, DHCP, VRF, LOAD_BALANCING, NAT
    - VPN → IPSEC, WIREGUARD
    - ROUTING → UNICAST_PROTOCOLS
    - UNICAST_PROTOCOLS → BGP, OSPF, OSPFv3, ISIS, OPENFABRIC, RIP, RIPng, BABEL
    - ROUTING_INFRASTRUCTURE → BFD, MPLS, SEGMENT_ROUTING, NHRP, RPKI
    - ROUTING_POLICIES → ACCESS_LIST, PREFIX_LIST, ROUTE_POLICY, ROUTE_MAP, LOCAL_ROUTE,
                         BGP_AS_PATH, BGP_COMMUNITY, BGP_EXTENDED_COMMUNITY, BGP_LARGE_COMMUNITY
    - MULTICAST → IGMP_PROXY, PIM, PIM6

    Modifies permissions in place.
    """
    # FIREWALL parent grants child permissions
    firewall_perm = permissions.get(FeatureGroup.FIREWALL, PermissionLevel.NONE)
    if firewall_perm != PermissionLevel.NONE:
        # Grant parent permission to children if they don't have a higher permission
        for child in [FeatureGroup.FIREWALL_GROUPS, FeatureGroup.FIREWALL_POLICIES, FeatureGroup.FIREWALL_ZONES, FeatureGroup.FIREWALL_GLOBAL_OPTIONS, FeatureGroup.FIREWALL_BRIDGE, FeatureGroup.FIREWALL_FLOWTABLES]:
            current = permissions.get(child, PermissionLevel.NONE)
            # Only upgrade permission, never downgrade
            if firewall_perm == PermissionLevel.WRITE:
                permissions[child] = PermissionLevel.WRITE
            elif firewall_perm == PermissionLevel.READ and current == PermissionLevel.NONE:
                permissions[child] = PermissionLevel.READ

    # NETWORK grants permissions to all network features
    network_perm = permissions.get(FeatureGroup.NETWORK, PermissionLevel.NONE)
    if network_perm != PermissionLevel.NONE:
        network_children = [
            FeatureGroup.INTERFACES,
            FeatureGroup.DHCP,
            FeatureGroup.VRF,
            FeatureGroup.LOAD_BALANCING,
            FeatureGroup.NAT,
            FeatureGroup.NAT64,
            FeatureGroup.NAT66,
        ]
        for child in network_children:
            current = permissions.get(child, PermissionLevel.NONE)
            if network_perm == PermissionLevel.WRITE:
                permissions[child] = PermissionLevel.WRITE
            elif network_perm == PermissionLevel.READ and current == PermissionLevel.NONE:
                permissions[child] = PermissionLevel.READ

    # ROUTING parent grants UNICAST_PROTOCOLS permission
    routing_perm = permissions.get(FeatureGroup.ROUTING, PermissionLevel.NONE)
    if routing_perm != PermissionLevel.NONE:
        current = permissions.get(FeatureGroup.UNICAST_PROTOCOLS, PermissionLevel.NONE)
        if routing_perm == PermissionLevel.WRITE:
            permissions[FeatureGroup.UNICAST_PROTOCOLS] = PermissionLevel.WRITE
        elif routing_perm == PermissionLevel.READ and current == PermissionLevel.NONE:
            permissions[FeatureGroup.UNICAST_PROTOCOLS] = PermissionLevel.READ

    # UNICAST_PROTOCOLS grants permissions to all routing protocols
    unicast_perm = permissions.get(FeatureGroup.UNICAST_PROTOCOLS, PermissionLevel.NONE)
    if unicast_perm != PermissionLevel.NONE:
        protocol_children = [
            FeatureGroup.BGP,
            FeatureGroup.OSPF,
            FeatureGroup.OSPFV3,
            FeatureGroup.ISIS,
            FeatureGroup.OPENFABRIC,
            FeatureGroup.RIP,
            FeatureGroup.RIPNG,
            FeatureGroup.BABEL,
        ]
        for child in protocol_children:
            current = permissions.get(child, PermissionLevel.NONE)
            if unicast_perm == PermissionLevel.WRITE:
                permissions[child] = PermissionLevel.WRITE
            elif unicast_perm == PermissionLevel.READ and current == PermissionLevel.NONE:
                permissions[child] = PermissionLevel.READ

    # ROUTING_INFRASTRUCTURE grants permissions to all infrastructure components
    infrastructure_perm = permissions.get(FeatureGroup.ROUTING_INFRASTRUCTURE, PermissionLevel.NONE)
    if infrastructure_perm != PermissionLevel.NONE:
        infrastructure_children = [
            FeatureGroup.BFD,
            FeatureGroup.MPLS,
            FeatureGroup.SEGMENT_ROUTING,
            FeatureGroup.NHRP,
            FeatureGroup.RPKI,
        ]
        for child in infrastructure_children:
            current = permissions.get(child, PermissionLevel.NONE)
            if infrastructure_perm == PermissionLevel.WRITE:
                permissions[child] = PermissionLevel.WRITE
            elif infrastructure_perm == PermissionLevel.READ and current == PermissionLevel.NONE:
                permissions[child] = PermissionLevel.READ

    # ROUTING_POLICIES grants permissions to all policy components
    policies_perm = permissions.get(FeatureGroup.ROUTING_POLICIES, PermissionLevel.NONE)
    if policies_perm != PermissionLevel.NONE:
        policy_children = [
            FeatureGroup.ACCESS_LIST,
            FeatureGroup.PREFIX_LIST,
            FeatureGroup.ROUTE_POLICY,
            FeatureGroup.ROUTE_MAP,
            FeatureGroup.LOCAL_ROUTE,
            FeatureGroup.BGP_AS_PATH,
            FeatureGroup.BGP_COMMUNITY,
            FeatureGroup.BGP_EXTENDED_COMMUNITY,
            FeatureGroup.BGP_LARGE_COMMUNITY,
        ]
        for child in policy_children:
            current = permissions.get(child, PermissionLevel.NONE)
            if policies_perm == PermissionLevel.WRITE:
                permissions[child] = PermissionLevel.WRITE
            elif policies_perm == PermissionLevel.READ and current == PermissionLevel.NONE:
                permissions[child] = PermissionLevel.READ

    # MULTICAST grants permissions to all multicast protocols
    multicast_perm = permissions.get(FeatureGroup.MULTICAST, PermissionLevel.NONE)
    if multicast_perm != PermissionLevel.NONE:
        multicast_children = [
            FeatureGroup.IGMP_PROXY,
            FeatureGroup.PIM,
            FeatureGroup.PIM6,
        ]
        for child in multicast_children:
            current = permissions.get(child, PermissionLevel.NONE)
            if multicast_perm == PermissionLevel.WRITE:
                permissions[child] = PermissionLevel.WRITE
            elif multicast_perm == PermissionLevel.READ and current == PermissionLevel.NONE:
                permissions[child] = PermissionLevel.READ

    # VPN grants permissions to all VPN protocols
    vpn_perm = permissions.get(FeatureGroup.VPN, PermissionLevel.NONE)
    if vpn_perm != PermissionLevel.NONE:
        vpn_children = [
            FeatureGroup.IPSEC,
            FeatureGroup.WIREGUARD,
            FeatureGroup.L2TP,
        ]
        for child in vpn_children:
            current = permissions.get(child, PermissionLevel.NONE)
            if vpn_perm == PermissionLevel.WRITE:
                permissions[child] = PermissionLevel.WRITE
            elif vpn_perm == PermissionLevel.READ and current == PermissionLevel.NONE:
                permissions[child] = PermissionLevel.READ


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
