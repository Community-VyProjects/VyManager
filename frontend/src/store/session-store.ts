/**
 * Session Store - Zustand State Management
 *
 * Manages the user's active VyOS instance session across the application.
 * Provides methods to connect, disconnect, and track the current session.
 */

import { create } from "zustand";
import { ActiveSession, sessionService } from "@/lib/api/session";

interface SessionState {
  // Current active session (null if not connected)
  activeSession: ActiveSession | null;

  // Loading state
  isLoading: boolean;

  // Error state
  error: string | null;

  // Actions
  loadSession: () => Promise<void>;
  connectToInstance: (instanceId: string) => Promise<void>;
  disconnectFromInstance: () => Promise<void>;
  clearError: () => void;
}

export const useSessionStore = create<SessionState>((set) => ({
  activeSession: null,
  isLoading: false,
  error: null,

  /**
   * Load the current active session from the backend
   */
  loadSession: async () => {
    set({ isLoading: true, error: null });
    try {
      const session = await sessionService.getCurrentSession();
      set({ activeSession: session, isLoading: false });
    } catch (error: any) {
      set({
        error: error.message || "Failed to load session",
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
      // Reload session to get updated data
      const session = await sessionService.getCurrentSession();
      set({ activeSession: session, isLoading: false });
    } catch (error: any) {
      set({
        error: error.message || "Failed to connect to instance",
        isLoading: false,
      });
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
    } catch (error: any) {
      set({
        error: error.message || "Failed to disconnect",
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
