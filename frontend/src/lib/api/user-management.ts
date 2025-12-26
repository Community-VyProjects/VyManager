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
  instance_count: number;
  roles: string[]; // List of role names
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
}

export interface UpdateUserRequest {
  name?: string | null;
  email?: string;
  password?: string; // min 8 characters if provided
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

export interface UserInstanceAssignment {
  id: string;
  user_id: string;
  instance_id: string;
  instance_name: string;
  site_id: string;
  site_name: string;
  role_type: string; // "BUILT_IN" or "CUSTOM"
  built_in_role: string | null;
  custom_role_id: string | null;
  custom_role_name: string | null;
  assigned_at: string;
  assigned_by: string;
}

export interface AssignUserRequest {
  user_id: string;
  instance_ids: string[]; // Can assign to multiple instances at once
  roles: Array<{
    type: "BUILT_IN" | "CUSTOM";
    builtInRole?: string;
    customRoleId?: string;
  }>;
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

export enum FeatureGroup {
  FIREWALL = "FIREWALL",
  NAT = "NAT",
  DHCP = "DHCP",
  INTERFACES = "INTERFACES",
  STATIC_ROUTES = "STATIC_ROUTES",
  ROUTING_POLICIES = "ROUTING_POLICIES",
  SYSTEM = "SYSTEM",
  CONFIGURATION = "CONFIGURATION",
  DASHBOARD = "DASHBOARD",
  SITES_INSTANCES = "SITES_INSTANCES",
  USER_MANAGEMENT = "USER_MANAGEMENT",
}

export enum PermissionLevel {
  NONE = "NONE",
  READ = "READ",
  WRITE = "WRITE",
}

export enum BuiltInRole {
  SUPER_ADMIN = "SUPER_ADMIN",
  ADMIN = "ADMIN",
  VIEWER = "VIEWER",
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
