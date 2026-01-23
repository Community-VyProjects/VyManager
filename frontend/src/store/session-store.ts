/**
 * Session Store - Zustand State Management
 *
 * Manages the user's active VyOS instance session across the application.
 * Provides methods to connect, disconnect, and track the current session.
 */

import { create } from "zustand";
import { ActiveSession, sessionService } from "@/lib/api/session";

// Helper to extract error message from unknown error
function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "object" && error !== null && "message" in error) {
    return String((error as { message: unknown }).message);
  }
  return fallback;
}

interface SessionState {
  // Current active session (null if not connected)
  activeSession: ActiveSession | null;

  // Loading state
  isLoading: boolean;

  // Error state
  error: string | null;

  // Track ongoing connection request to prevent race conditions
  _pendingConnectId: string | null;

  // Actions
  loadSession: () => Promise<void>;
  connectToInstance: (instanceId: string) => Promise<void>;
  disconnectFromInstance: () => Promise<void>;
  clearError: () => void;
}

export const useSessionStore = create<SessionState>((set, get) => ({
  activeSession: null,
  isLoading: false,
  error: null,
  _pendingConnectId: null,

  /**
   * Load the current active session from the backend
   */
  loadSession: async () => {
    set({ isLoading: true, error: null });
    try {
      const session = await sessionService.getCurrentSession();
      set({ activeSession: session, isLoading: false });
    } catch (error: unknown) {
      set({
        error: getErrorMessage(error, "Failed to load session"),
        isLoading: false,
      });
    }
  },

  /**
   * Connect to a VyOS instance
   * Uses request ID to prevent race conditions from rapid clicks
   */
  connectToInstance: async (instanceId: string) => {
    // Generate unique ID for this request
    const requestId = `${instanceId}-${Date.now()}`;
    set({ isLoading: true, error: null, _pendingConnectId: requestId });

    try {
      await sessionService.connect(instanceId);

      // Check if this is still the latest request
      if (get()._pendingConnectId !== requestId) {
        return; // A newer request superseded this one
      }

      // Reload session to get updated data
      const session = await sessionService.getCurrentSession();

      // Check again after the second async operation
      if (get()._pendingConnectId !== requestId) {
        return;
      }

      set({ activeSession: session, isLoading: false, _pendingConnectId: null });
    } catch (error: unknown) {
      // Only update state if this is still the latest request
      if (get()._pendingConnectId === requestId) {
        set({
          error: getErrorMessage(error, "Failed to connect to instance"),
          isLoading: false,
          _pendingConnectId: null,
        });
      }
      throw error; // Re-throw so UI can handle it
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
    } catch (error: unknown) {
      set({
        error: getErrorMessage(error, "Failed to disconnect"),
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
