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

  // `miscLib` message key when `error` is a built-in fallback (not a backend
  // message); UI should show t(errorKey) instead of the English `error`.
  errorKey: SessionErrorKey | null;

  appliance: boolean;

  // Actions
  loadSession: () => Promise<void>;
  connectToInstance: (instanceId: string) => Promise<void>;
  connectLocal: () => Promise<void>;
  disconnectFromInstance: () => Promise<void>;
  clearError: () => void;
}

export type SessionErrorKey =
  | "session.connectRouterFailed"
  | "session.loadFailed"
  | "session.connectInstanceFailed"
  | "session.disconnectFailed";

const SESSION_FALLBACKS: Record<SessionErrorKey, string> = {
  "session.connectRouterFailed": "Failed to connect to this router",
  "session.loadFailed": "Failed to load session",
  "session.connectInstanceFailed": "Failed to connect to instance",
  "session.disconnectFailed": "Failed to disconnect",
};

/** Backend message if present, otherwise the English fallback plus its key. */
function sessionError(error: unknown, key: SessionErrorKey) {
  const message = (error as ApiError).message;
  return message
    ? { error: message, errorKey: null }
    : { error: SESSION_FALLBACKS[key], errorKey: key };
}

function apiStatus(error: unknown): number | undefined {
  return (error as ApiError).status;
}

export const useSessionStore = create<SessionState>((set) => ({
  activeSession: null,
  isLoading: false,
  error: null,
  errorKey: null,
  appliance: false,

  /**
   * Load the current active session from the backend.
   * Onboarding-status and current session are independent: a status failure
   * must not skip VPS session load. Appliance auto-connect uses connect-local
   * (404 means not appliance).
   */
  loadSession: async () => {
    set({ isLoading: true, error: null, errorKey: null });
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
          if (apiStatus(error) === 404 && !appliance) {
            appliance = false;
          } else {
            set({
              activeSession: null,
              isLoading: false,
              ...sessionError(error, "session.connectRouterFailed"),
              appliance: true,
            });
            return;
          }
        }
      }

      set({ activeSession: session, isLoading: false, appliance, error: null, errorKey: null });
    } catch (error) {
      set({
        ...sessionError(error, "session.loadFailed"),
        isLoading: false,
      });
    }
  },

  /**
   * Connect to a VyOS instance
   */
  connectToInstance: async (instanceId: string) => {
    set({ isLoading: true, error: null, errorKey: null });
    try {
      await sessionService.connect(instanceId);
      const session = await sessionService.getCurrentSession();
      set({ activeSession: session, isLoading: false });
    } catch (error) {
      set({
        ...sessionError(error, "session.connectInstanceFailed"),
        isLoading: false,
      });
      throw error;
    }
  },

  connectLocal: async () => {
    set({ isLoading: true, error: null, errorKey: null });
    try {
      await sessionService.connectLocal();
      const session = await sessionService.getCurrentSession();
      set({ activeSession: session, isLoading: false, appliance: true });
    } catch (error) {
      set({
        ...sessionError(error, "session.connectRouterFailed"),
        isLoading: false,
      });
      throw error;
    }
  },

  /**
   * Disconnect from the current instance
   */
  disconnectFromInstance: async () => {
    set({ isLoading: true, error: null, errorKey: null });
    try {
      await sessionService.disconnect();
      set({ activeSession: null, isLoading: false });
    } catch (error) {
      set({
        ...sessionError(error, "session.disconnectFailed"),
        isLoading: false,
      });
      throw error;
    }
  },

  /**
   * Clear error state
   */
  clearError: () => {
    set({ error: null, errorKey: null });
  },
}));
