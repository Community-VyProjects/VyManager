"use client";

import { useEffect, useState } from "react";
import { useSessionStore } from "@/store/session-store";
import {
  userManagementService,
  FeatureGroup,
  PermissionLevel,
  MyPermissionsResponse,
} from "@/lib/api/user-management";

interface PermissionsState {
  permissions: Record<string, string>;
  hasActiveSession: boolean;
  instanceId?: string;
  isLoading: boolean;
  error: string | null;
}

/**
 * usePermissions Hook
 *
 * Fetches and manages the current user's permissions for their active instance.
 * Automatically refetches when the active instance changes.
 *
 * @example
 * const { hasPermission, canRead, canWrite, isLoading } = usePermissions();
 *
 * if (canWrite(FeatureGroup.FIREWALL_GROUPS)) {
 *   // Show edit button
 * }
 *
 * if (canRead(FeatureGroup.FIREWALL_POLICIES)) {
 *   // Show navigation item
 * }
 */
export function usePermissions() {
  const { activeSession } = useSessionStore();
  const [state, setState] = useState<PermissionsState>({
    permissions: {},
    hasActiveSession: false,
    isLoading: true,
    error: null,
  });

  useEffect(() => {
    const fetchPermissions = async () => {
      try {
        setState((prev) => ({ ...prev, isLoading: true, error: null }));

        const response = await userManagementService.getMyPermissions();

        setState({
          permissions: response.permissions,
          hasActiveSession: response.has_active_session,
          instanceId: response.instance_id,
          isLoading: false,
          error: null,
        });
      } catch (error: any) {
        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: error.message || "Failed to fetch permissions",
        }));
      }
    };

    // Fetch permissions when component mounts or active session changes
    fetchPermissions();
  }, [activeSession?.instance_id]); // Re-fetch when instance changes

  /**
   * Check if user has a specific permission level for a feature
   */
  const hasPermission = (
    feature: FeatureGroup,
    requiredLevel: PermissionLevel
  ): boolean => {
    const userLevel = state.permissions[feature];
    if (!userLevel) return false;

    // WRITE includes READ
    if (requiredLevel === PermissionLevel.READ) {
      return (
        userLevel === PermissionLevel.READ ||
        userLevel === PermissionLevel.WRITE
      );
    }

    if (requiredLevel === PermissionLevel.WRITE) {
      return userLevel === PermissionLevel.WRITE;
    }

    return false;
  };

  /**
   * Check if user can read a feature (READ or WRITE permission)
   */
  const canRead = (feature: FeatureGroup): boolean => {
    return hasPermission(feature, PermissionLevel.READ);
  };

  /**
   * Check if user can write to a feature (WRITE permission)
   */
  const canWrite = (feature: FeatureGroup): boolean => {
    return hasPermission(feature, PermissionLevel.WRITE);
  };

  /**
   * Get the raw permission level for a feature
   */
  const getPermissionLevel = (feature: FeatureGroup): PermissionLevel => {
    const level = state.permissions[feature];
    return (level as PermissionLevel) || PermissionLevel.NONE;
  };

  return {
    permissions: state.permissions,
    hasActiveSession: state.hasActiveSession,
    instanceId: state.instanceId,
    isLoading: state.isLoading,
    error: state.error,
    hasPermission,
    canRead,
    canWrite,
    getPermissionLevel,
  };
}
