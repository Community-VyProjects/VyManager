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
  activeSession: ActiveSession | null;
  isLoading: boolean;
  error: string | null;
  appliance: boolean;
  loadSession: () => Promise<void>;
  connectToInstance: (instanceId: string) => Promise<void>;
  connectLocal: () => Promise<void>;
  disconnectFromInstance: () => Promise<void>;
  clearError: () => void;
}

export const useSessionStore = create<SessionState>((set) => ({
  activeSession: null,
  isLoading: false,
  error: null,
  appliance: false,

  loadSession: async () => {
    set({ isLoading: true, error: null });
    try {
      const status = await sessionService.getOnboardingStatus();
      const appliance = isApplianceMode(status);
      let session = await sessionService.getCurrentSession();
      if (!session && appliance) {
        try {
          await sessionService.connectLocal();
          session = await sessionService.getCurrentSession();
        } catch (error) {
          set({
            activeSession: null,
            isLoading: false,
            error: (error as ApiError).message || "Failed to connect to this router",
            appliance,
          });
          return;
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
      set({ activeSession: session, isLoading: false });
    } catch (error) {
      set({
        error: (error as ApiError).message || "Failed to connect to this router",
        isLoading: false,
      });
      throw error;
    }
  },

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

  clearError: () => {
    set({ error: null });
  },
}));
