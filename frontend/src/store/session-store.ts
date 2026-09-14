/**
 * Session Store - Zustand State Management
 *
 * Manages the user's active VyOS instance session across the application.
 * Provides methods to connect, disconnect, and track the current session.
 */

import { create } from "zustand";
import { ActiveSession, sessionService } from "@/lib/api/session";
import { ApiError } from "@/lib/types/api";
import { isApplianceMode } from "@/lib/appliance";

interface SessionState {
  // Current active session (null if not connected)
  activeSession: ActiveSession | null;

  // Loading state
  isLoading: boolean;

  // Error state
  error: string | null;

  appliance: boolean;

  // Actions
  loadSession: () => Promise<void>;
  connectToInstance: (instanceId: string) => Promise<void>;
  connectLocal: () => Promise<void>;
  disconnectFromInstance: () => Promise<void>;
  clearError: () => void;
}

function apiStatus(error: unknown): number | undefined {
  return (error as ApiError).status;
}

export const useSessionStore = create<SessionState>((set) => ({
  activeSession: null,
  isLoading: false,
  error: null,
  appliance: false,

  /**
   * Load the current active session from the backend.
   * Onboarding-status and current session are independent: a status failure
   * must not skip VPS session load. Appliance auto-connect uses connect-local
   * (404 means not appliance).
   */
  loadSession: async () => {
    set({ isLoading: true, error: null });
    try {
      const [statusResult, sessionResult] = await Promise.allSettled([
        sessionService.getOnboardingStatus(),
        sessionService.getCurrentSession(),
      ]);

      let appliance =
        statusResult.status === "fulfilled" && isApplianceMode(statusResult.value);
      let session =
        sessionResult.status === "fulfilled" ? sessionResult.value : null;

      const statusFailed = statusResult.status === "rejected";
      if (!session && (appliance || statusFailed)) {
        try {
          await sessionService.connectLocal();
          session = await sessionService.getCurrentSession();
          appliance = true;
        } catch (error) {
          if (apiStatus(error) === 404) {
            appliance = false;
          } else if (appliance || apiStatus(error) === 503) {
            set({
              activeSession: null,
              isLoading: false,
              error: (error as ApiError).message || "Failed to connect to this router",
              appliance: true,
            });
            return;
          }
        }
      }

      set({ activeSession: session, isLoading: false, appliance, error: null });
    } catch (error) {
      set({
        error: (error as ApiError).message || "Failed to load session",
        isLoading: false,
      });
    }
  },

  /**
   * Connect to a VyOS instance
   */
  connectToInstance: async (instanceId: string) => {
    set({ isLoading: true, error: null });
    try {
      await sessionService.connect(instanceId);
      const session = await sessionService.getCurrentSession();
      set({ activeSession: session, isLoading: false });
    } catch (error) {
      set({
        error: (error as ApiError).message || "Failed to connect to instance",
        isLoading: false,
      });
      throw error;
    }
  },

  connectLocal: async () => {
    set({ isLoading: true, error: null });
    try {
      await sessionService.connectLocal();
      const session = await sessionService.getCurrentSession();
      set({ activeSession: session, isLoading: false, appliance: true });
    } catch (error) {
      set({
        error: (error as ApiError).message || "Failed to connect to this router",
        isLoading: false,
      });
      throw error;
    }
  },

  /**
   * Disconnect from the current instance
   */
  disconnectFromInstance: async () => {
    set({ isLoading: true, error: null });
    try {
      await sessionService.disconnect();
      set({ activeSession: null, isLoading: false });
    } catch (error) {
      set({
        error: (error as ApiError).message || "Failed to disconnect",
        isLoading: false,
      });
      throw error;
    }
  },

  /**
   * Clear error state
   */
  clearError: () => {
    set({ error: null });
  },
}));
