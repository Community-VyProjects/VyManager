import { apiClient } from "./client";
import { ApiError } from "@/lib/types/api";

// ============================================================================
// TypeScript Interfaces (matching backend Pydantic models)
// ============================================================================

export interface UserListItem {
  id: string;
  name: string | null;
  email: string;
  email_verified: boolean;
  created_at: string;
  site_role: SiteRole; // ADMIN or VIEWER
  instance_count: number;
}

export interface UserDetail {
  id: string;
  name: string | null;
  email: string;
  email_verified: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateUserRequest {
  name?: string | null;
  email: string;
  password: string; // min 8 characters
  site_role: SiteRole; // ADMIN or VIEWER
}

export interface UpdateUserRequest {
  name?: string | null;
  email?: string;
  password?: string; // min 8 characters if provided
  site_role?: SiteRole; // ADMIN or VIEWER
}

export interface FeaturePermission {
  feature: FeatureGroup;
  can_edit: boolean;
  can_view: boolean;
}

export interface UserInstanceAssignment {
  id: string;
  user_id: string;
  instance_id: string;
  instance_name: string;
  site_id: string;
  site_name: string;
  role: InstanceRole; // ADMIN, OPERATOR, or VIEWER
  feature_permissions: FeaturePermission[]; // Only used for OPERATOR/VIEWER
  assigned_at: string;
  assigned_by: string;
}

export interface AssignUserRequest {
  user_id: string;
  instance_ids: string[]; // Can assign to multiple instances at once
  role: InstanceRole; // ADMIN, OPERATOR, or VIEWER
  feature_permissions?: FeaturePermission[]; // Only for OPERATOR/VIEWER roles
}

export interface InstanceUserListItem {
  user_id: string;
  user_name: string | null;
  user_email: string;
  role: string; // Instance role: ADMIN, OPERATOR, or VIEWER
  feature_permissions?: FeaturePermission[] | null; // Only for OPERATOR/VIEWER
}

export interface MyPermissionsResponse {
  has_active_session: boolean;
  instance_id?: string;
  permissions: Record<string, string>; // FeatureGroup -> PermissionLevel
}

// ============================================================================
// Enums (matching backend RBAC system)
// ============================================================================

// Site-level roles (platform-wide)
export enum SiteRole {
  ADMIN = "ADMIN",   // Can manage sites, instances, and users
  VIEWER = "VIEWER",  // Read-only access
}

// Instance-level roles
export enum InstanceRole {
  ADMIN = "ADMIN",      // Full access to all features
  OPERATOR = "OPERATOR", // Can edit specific features
  VIEWER = "VIEWER",    // Can view specific features
}

// Permission levels (matching backend)
export enum PermissionLevel {
  NONE = "NONE",
  READ = "READ",
  WRITE = "WRITE",
}

// Features available for granular permissions (OPERATOR/VIEWER)
export enum FeatureGroup {
  // Legacy/Parent features (for backward compatibility)
  FIREWALL = "FIREWALL",
  NAT = "NAT",
  NAT64 = "NAT64",
  NAT66 = "NAT66",
  DHCP = "DHCP",
  INTERFACES = "INTERFACES",

  // Firewall sub-features (page-level permissions)
  FIREWALL_GROUPS = "FIREWALL_GROUPS",
  FIREWALL_POLICIES = "FIREWALL_POLICIES",
  FIREWALL_ZONES = "FIREWALL_ZONES",
  FIREWALL_GLOBAL_OPTIONS = "FIREWALL_GLOBAL_OPTIONS",
  FIREWALL_BRIDGE = "FIREWALL_BRIDGE",
  FIREWALL_FLOWTABLES = "FIREWALL_FLOWTABLES",

  // Network features
  NETWORK = "NETWORK",
  VRF = "VRF",
  LOAD_BALANCING = "LOAD_BALANCING",

  // Service features
  SERVICE = "SERVICE",

  // VPN features
  VPN = "VPN",
  IPSEC = "IPSEC",
  WIREGUARD = "WIREGUARD",
  L2TP = "L2TP",
  OPENVPN = "OPENVPN",
  PPPOE = "PPPOE",
  SSTPC = "SSTPC",

  // PKI
  PKI = "PKI",

  // VXLAN
  VXLAN = "VXLAN",

  // Tunnel
  TUNNEL = "TUNNEL",

  // Interface sub-types
  BONDING = "BONDING",
  BRIDGE = "BRIDGE",
  DUMMY = "DUMMY",
  ETHERNET = "ETHERNET",
  VLAN = "VLAN",
  GENEVE = "GENEVE",
  INPUT_IFACE = "INPUT_IFACE",
  LOOPBACK = "LOOPBACK",
  MACSEC = "MACSEC",
  PSEUDO_ETHERNET = "PSEUDO_ETHERNET",
  VIRTUAL_ETHERNET = "VIRTUAL_ETHERNET",
  VPP = "VPP",
  VTI = "VTI",
  WIRELESS = "WIRELESS",
  WWAN = "WWAN",

  // Routing features (three-level hierarchy)
  ROUTING = "ROUTING",
  UNICAST_PROTOCOLS = "UNICAST_PROTOCOLS",
  BGP = "BGP",
  OSPF = "OSPF",
  OSPFV3 = "OSPFV3",
  ISIS = "ISIS",
  OPENFABRIC = "OPENFABRIC",
  RIP = "RIP",
  RIPNG = "RIPNG",
  BABEL = "BABEL",

  // Other features
  STATIC_ROUTES = "STATIC_ROUTES",
  FAILOVER = "FAILOVER",

  // Routing Infrastructure
  ROUTING_INFRASTRUCTURE = "ROUTING_INFRASTRUCTURE",
  BFD = "BFD",
  MPLS = "MPLS",
  SEGMENT_ROUTING = "SEGMENT_ROUTING",
  NHRP = "NHRP",
  RPKI = "RPKI",
  TRAFFIC_ENGINEERING = "TRAFFIC_ENGINEERING",

  // Routing Policies
  ROUTING_POLICIES = "ROUTING_POLICIES",
  ACCESS_LIST = "ACCESS_LIST",
  PREFIX_LIST = "PREFIX_LIST",
  ROUTE_POLICY = "ROUTE_POLICY",
  ROUTE_MAP = "ROUTE_MAP",
  LOCAL_ROUTE = "LOCAL_ROUTE",
  BGP_AS_PATH = "BGP_AS_PATH",
  BGP_COMMUNITY = "BGP_COMMUNITY",
  BGP_EXTENDED_COMMUNITY = "BGP_EXTENDED_COMMUNITY",
  BGP_LARGE_COMMUNITY = "BGP_LARGE_COMMUNITY",

  // Multicast
  MULTICAST = "MULTICAST",
  IGMP_PROXY = "IGMP_PROXY",
  PIM = "PIM",
  PIM6 = "PIM6",

  SYSTEM = "SYSTEM",
  CONFIGURATION = "CONFIGURATION",
  MONITORING = "MONITORING",
  DASHBOARD = "DASHBOARD",
  SITES_INSTANCES = "SITES_INSTANCES",
  USER_MANAGEMENT = "USER_MANAGEMENT",
  POWER = "POWER",
  HIGH_AVAILABILITY = "HIGH_AVAILABILITY",
}

// ============================================================================
// User Management Service
// ============================================================================

class UserManagementService {
  // ==========================================================================
  // Permissions Endpoint (available to all authenticated users)
  // ==========================================================================

  /**
   * Get the current user's permissions for their active instance.
   * Available to any authenticated user (not admin-only).
   */
  async getMyPermissions(): Promise<MyPermissionsResponse> {
    try {
      return await apiClient.get<MyPermissionsResponse>("/user-management/my-permissions");
    } catch (error) {
      const errorMessage = ((error as ApiError).details as { detail?: string })?.detail || (error as ApiError).message || "Failed to fetch permissions";
      throw new Error(errorMessage);
    }
  }

  // ==========================================================================
  // User Endpoints
  // ==========================================================================

  /**
   * Get list of all users with their instance counts and roles
   * ADMIN only
   */
  async listUsers(): Promise<UserListItem[]> {
    try {
      return await apiClient.get<UserListItem[]>("/user-management/users");
    } catch (error) {
      const errorMessage = ((error as ApiError).details as { detail?: string })?.detail || (error as ApiError).message || "Failed to fetch users";
      throw new Error(errorMessage);
    }
  }

  /**
   * Get detailed information about a specific user
   * ADMIN only
   */
  async getUser(userId: string): Promise<UserDetail> {
    try {
      return await apiClient.get<UserDetail>(`/user-management/users/${userId}`);
    } catch (error) {
      const errorMessage = ((error as ApiError).details as { detail?: string })?.detail || (error as ApiError).message || "Failed to fetch user";
      throw new Error(errorMessage);
    }
  }

  /**
   * Get all instance assignments for a user
   * ADMIN only
   */
  async getUserAssignments(userId: string): Promise<UserInstanceAssignment[]> {
    try {
      return await apiClient.get<UserInstanceAssignment[]>(
        `/user-management/users/${userId}/assignments`
      );
    } catch (error) {
      const errorMessage = ((error as ApiError).details as { detail?: string })?.detail || (error as ApiError).message || "Failed to fetch user assignments";
      throw new Error(errorMessage);
    }
  }

  /**
   * Create a new user
   * ADMIN only
   */
  async createUser(data: CreateUserRequest): Promise<UserDetail> {
    try {
      return await apiClient.post<UserDetail>("/user-management/users", data);
    } catch (error) {
      const errorMessage = ((error as ApiError).details as { detail?: string })?.detail || (error as ApiError).message || "Failed to create user";
      throw new Error(errorMessage);
    }
  }

  /**
   * Update an existing user
   * ADMIN only
   */
  async updateUser(userId: string, data: UpdateUserRequest): Promise<UserDetail> {
    try {
      return await apiClient.put<UserDetail>(`/user-management/users/${userId}`, data);
    } catch (error) {
      const errorMessage = ((error as ApiError).details as { detail?: string })?.detail || (error as ApiError).message || "Failed to update user";
      throw new Error(errorMessage);
    }
  }

  /**
   * Delete a user
   * ADMIN only
   */
  async deleteUser(userId: string): Promise<{ success: boolean; message: string }> {
    try {
      return await apiClient.delete<{ success: boolean; message: string }>(
        `/user-management/users/${userId}`
      );
    } catch (error) {
      const errorMessage = ((error as ApiError).details as { detail?: string })?.detail || (error as ApiError).message || "Failed to delete user";
      throw new Error(errorMessage);
    }
  }

  // ==========================================================================
  // Assignment Endpoints
  // ==========================================================================

  /**
   * Assign a user to instance(s) with role(s)
   * Can assign to multiple instances at once
   * ADMIN only
   */
  async assignUser(data: AssignUserRequest): Promise<{ success: boolean; assignments_created: number }> {
    try {
      return await apiClient.post<{ success: boolean; assignments_created: number }>(
        "/user-management/assignments",
        data
      );
    } catch (error) {
      const errorMessage = ((error as ApiError).details as { detail?: string })?.detail || (error as ApiError).message || "Failed to assign user";
      throw new Error(errorMessage);
    }
  }

  /**
   * Remove a user's assignment (revoke access to instance)
   * ADMIN only
   */
  async removeAssignment(assignmentId: string): Promise<{ success: boolean; message: string }> {
    try {
      return await apiClient.delete<{ success: boolean; message: string }>(
        `/user-management/assignments/${assignmentId}`
      );
    } catch (error) {
      const errorMessage = ((error as ApiError).details as { detail?: string })?.detail || (error as ApiError).message || "Failed to remove assignment";
      throw new Error(errorMessage);
    }
  }

  // ==========================================================================
  // Instance User Endpoints
  // ==========================================================================

  /**
   * Get all users with access to a specific instance
   * ADMIN only
   */
  async getInstanceUsers(instanceId: string): Promise<InstanceUserListItem[]> {
    try {
      return await apiClient.get<InstanceUserListItem[]>(
        `/user-management/instances/${instanceId}/users`
      );
    } catch (error) {
      const errorMessage = ((error as ApiError).details as { detail?: string })?.detail || (error as ApiError).message || "Failed to fetch instance users";
      throw new Error(errorMessage);
    }
  }

  // ==========================================================================
  // Helper Methods
  // ==========================================================================

  /**
   * Get display name for a feature group
   */
  getFeatureGroupDisplayName(feature: FeatureGroup | string): string {
    const displayNames: Record<string, string> = {
      [FeatureGroup.FIREWALL]: "Firewall",
      [FeatureGroup.NAT]: "NAT",
      [FeatureGroup.DHCP]: "DHCP",
      [FeatureGroup.INTERFACES]: "Interfaces",
      [FeatureGroup.OPENVPN]: "OpenVPN",
    };
    return displayNames[feature] || feature;
  }

  /**
   * Get all feature groups
   */
  getAllFeatureGroups(): FeatureGroup[] {
    return Object.values(FeatureGroup);
  }
}

export const userManagementService = new UserManagementService();
