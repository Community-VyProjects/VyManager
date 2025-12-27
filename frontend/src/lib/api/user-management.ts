import { apiClient } from "./client";

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

export interface CustomRoleListItem {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  user_count: number; // How many users have this role
}

export interface CustomRoleDetail {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
  created_by: string;
  permissions: Record<string, string>; // feature -> permission level
}

export interface CreateRoleRequest {
  name: string; // 1-50 characters
  description?: string | null;
  permissions: Record<string, string>; // feature -> permission level (READ/WRITE/NONE)
}

export interface UpdateRoleRequest {
  name?: string; // 1-50 characters if provided
  description?: string | null;
  permissions?: Record<string, string>;
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
  role: InstanceRole; // ADMIN, EDITOR, or VIEWER
  feature_permissions: FeaturePermission[]; // Only used for EDITOR/VIEWER
  assigned_at: string;
  assigned_by: string;
}

export interface AssignUserRequest {
  user_id: string;
  instance_ids: string[]; // Can assign to multiple instances at once
  role: InstanceRole; // ADMIN, EDITOR, or VIEWER
  feature_permissions?: FeaturePermission[]; // Only for EDITOR/VIEWER roles
}

export interface InstanceUserListItem {
  user_id: string;
  user_name: string | null;
  user_email: string;
  roles: string[]; // List of role names for this instance
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
  ADMIN = "ADMIN",    // Full access to all features
  EDITOR = "EDITOR",  // Can edit specific features
  VIEWER = "VIEWER",  // Can view specific features
}

// Features available for granular permissions (EDITOR/VIEWER)
export enum FeatureGroup {
  FIREWALL = "FIREWALL",
  INTERFACES = "INTERFACES",
  DHCP = "DHCP",
  NAT = "NAT",
}

// ============================================================================
// User Management Service
// ============================================================================

class UserManagementService {
  // ==========================================================================
  // User Endpoints
  // ==========================================================================

  /**
   * Get list of all users with their instance counts and roles
   * SUPER_ADMIN only
   */
  async listUsers(): Promise<UserListItem[]> {
    try {
      return await apiClient.get<UserListItem[]>("/user-management/users");
    } catch (error: any) {
      const errorMessage = error?.details?.detail || error?.message || "Failed to fetch users";
      throw new Error(errorMessage);
    }
  }

  /**
   * Get detailed information about a specific user
   * SUPER_ADMIN only
   */
  async getUser(userId: string): Promise<UserDetail> {
    try {
      return await apiClient.get<UserDetail>(`/user-management/users/${userId}`);
    } catch (error: any) {
      const errorMessage = error?.details?.detail || error?.message || "Failed to fetch user";
      throw new Error(errorMessage);
    }
  }

  /**
   * Get all instance assignments for a user
   * SUPER_ADMIN only
   */
  async getUserAssignments(userId: string): Promise<UserInstanceAssignment[]> {
    try {
      return await apiClient.get<UserInstanceAssignment[]>(
        `/user-management/users/${userId}/assignments`
      );
    } catch (error: any) {
      const errorMessage = error?.details?.detail || error?.message || "Failed to fetch user assignments";
      throw new Error(errorMessage);
    }
  }

  /**
   * Create a new user
   * SUPER_ADMIN only
   */
  async createUser(data: CreateUserRequest): Promise<UserDetail> {
    try {
      return await apiClient.post<UserDetail>("/user-management/users", data);
    } catch (error: any) {
      const errorMessage = error?.details?.detail || error?.message || "Failed to create user";
      throw new Error(errorMessage);
    }
  }

  /**
   * Update an existing user
   * SUPER_ADMIN only
   */
  async updateUser(userId: string, data: UpdateUserRequest): Promise<UserDetail> {
    try {
      return await apiClient.put<UserDetail>(`/user-management/users/${userId}`, data);
    } catch (error: any) {
      const errorMessage = error?.details?.detail || error?.message || "Failed to update user";
      throw new Error(errorMessage);
    }
  }

  /**
   * Delete a user
   * SUPER_ADMIN only
   */
  async deleteUser(userId: string): Promise<{ success: boolean; message: string }> {
    try {
      return await apiClient.delete<{ success: boolean; message: string }>(
        `/user-management/users/${userId}`
      );
    } catch (error: any) {
      const errorMessage = error?.details?.detail || error?.message || "Failed to delete user";
      throw new Error(errorMessage);
    }
  }

  // ==========================================================================
  // Custom Role Endpoints
  // ==========================================================================

  /**
   * Get list of all custom roles
   * SUPER_ADMIN only
   */
  async listRoles(): Promise<CustomRoleListItem[]> {
    try {
      return await apiClient.get<CustomRoleListItem[]>("/user-management/roles");
    } catch (error: any) {
      const errorMessage = error?.details?.detail || error?.message || "Failed to fetch roles";
      throw new Error(errorMessage);
    }
  }

  /**
   * Get detailed information about a specific custom role
   * SUPER_ADMIN only
   */
  async getRole(roleId: string): Promise<CustomRoleDetail> {
    try {
      return await apiClient.get<CustomRoleDetail>(`/user-management/roles/${roleId}`);
    } catch (error: any) {
      const errorMessage = error?.details?.detail || error?.message || "Failed to fetch role";
      throw new Error(errorMessage);
    }
  }

  /**
   * Create a new custom role
   * SUPER_ADMIN only
   */
  async createRole(data: CreateRoleRequest): Promise<CustomRoleDetail> {
    try {
      return await apiClient.post<CustomRoleDetail>("/user-management/roles", data);
    } catch (error: any) {
      const errorMessage = error?.details?.detail || error?.message || "Failed to create role";
      throw new Error(errorMessage);
    }
  }

  /**
   * Update an existing custom role
   * SUPER_ADMIN only
   */
  async updateRole(roleId: string, data: UpdateRoleRequest): Promise<CustomRoleDetail> {
    try {
      return await apiClient.put<CustomRoleDetail>(`/user-management/roles/${roleId}`, data);
    } catch (error: any) {
      const errorMessage = error?.details?.detail || error?.message || "Failed to update role";
      throw new Error(errorMessage);
    }
  }

  /**
   * Delete a custom role
   * SUPER_ADMIN only
   */
  async deleteRole(roleId: string): Promise<{ success: boolean; message: string }> {
    try {
      return await apiClient.delete<{ success: boolean; message: string }>(
        `/user-management/roles/${roleId}`
      );
    } catch (error: any) {
      const errorMessage = error?.details?.detail || error?.message || "Failed to delete role";
      throw new Error(errorMessage);
    }
  }

  // ==========================================================================
  // Assignment Endpoints
  // ==========================================================================

  /**
   * Assign a user to instance(s) with role(s)
   * Can assign to multiple instances at once
   * SUPER_ADMIN only
   */
  async assignUser(data: AssignUserRequest): Promise<{ success: boolean; assignments_created: number }> {
    try {
      return await apiClient.post<{ success: boolean; assignments_created: number }>(
        "/user-management/assignments",
        data
      );
    } catch (error: any) {
      const errorMessage = error?.details?.detail || error?.message || "Failed to assign user";
      throw new Error(errorMessage);
    }
  }

  /**
   * Remove a user's assignment (revoke access to instance)
   * SUPER_ADMIN only
   */
  async removeAssignment(assignmentId: string): Promise<{ success: boolean; message: string }> {
    try {
      return await apiClient.delete<{ success: boolean; message: string }>(
        `/user-management/assignments/${assignmentId}`
      );
    } catch (error: any) {
      const errorMessage = error?.details?.detail || error?.message || "Failed to remove assignment";
      throw new Error(errorMessage);
    }
  }

  // ==========================================================================
  // Instance User Endpoints
  // ==========================================================================

  /**
   * Get all users with access to a specific instance
   * SUPER_ADMIN only
   */
  async getInstanceUsers(instanceId: string): Promise<InstanceUserListItem[]> {
    try {
      return await apiClient.get<InstanceUserListItem[]>(
        `/user-management/instances/${instanceId}/users`
      );
    } catch (error: any) {
      const errorMessage = error?.details?.detail || error?.message || "Failed to fetch instance users";
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
      [FeatureGroup.STATIC_ROUTES]: "Static Routes",
      [FeatureGroup.ROUTING_POLICIES]: "Routing Policies",
      [FeatureGroup.SYSTEM]: "System",
      [FeatureGroup.CONFIGURATION]: "Configuration",
      [FeatureGroup.DASHBOARD]: "Dashboard",
      [FeatureGroup.SITES_INSTANCES]: "Sites & Instances",
      [FeatureGroup.USER_MANAGEMENT]: "User Management",
    };
    return displayNames[feature] || feature;
  }

  /**
   * Get display name for a permission level
   */
  getPermissionLevelDisplayName(level: PermissionLevel | string): string {
    const displayNames: Record<string, string> = {
      [PermissionLevel.NONE]: "No Access",
      [PermissionLevel.READ]: "Read Only",
      [PermissionLevel.WRITE]: "Full Access",
    };
    return displayNames[level] || level;
  }

  /**
   * Get all feature groups
   */
  getAllFeatureGroups(): FeatureGroup[] {
    return Object.values(FeatureGroup);
  }

  /**
   * Get all permission levels
   */
  getAllPermissionLevels(): PermissionLevel[] {
    return Object.values(PermissionLevel);
  }

  /**
   * Get all built-in roles
   */
  getAllBuiltInRoles(): BuiltInRole[] {
    return Object.values(BuiltInRole);
  }

  /**
   * Create a role assignment object for built-in role
   */
  createBuiltInRoleAssignment(role: BuiltInRole): {
    type: "BUILT_IN";
    builtInRole: string;
  } {
    return {
      type: "BUILT_IN",
      builtInRole: role,
    };
  }

  /**
   * Create a role assignment object for custom role
   */
  createCustomRoleAssignment(roleId: string): {
    type: "CUSTOM";
    customRoleId: string;
  } {
    return {
      type: "CUSTOM",
      customRoleId: roleId,
    };
  }
}

export const userManagementService = new UserManagementService();
