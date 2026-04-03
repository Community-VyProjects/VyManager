/**
 * Organization Store - Zustand State Management
 *
 * Manages the user's current organization context.
 * The selected org determines which sites/instances are visible.
 */

import { create } from "zustand";
import { Organization, orgService } from "@/lib/api/org";
import { setCurrentOrgId } from "@/lib/api/client";
import { ApiError } from "@/lib/types/api";

interface OrgState {
  currentOrg: Organization | null;
  orgs: Organization[];
  userRole: string | null;
  isLoading: boolean;
  error: string | null;

  loadOrgs: () => Promise<void>;
  switchOrg: (orgId: string) => Promise<void>;
  setCurrentOrg: (org: Organization) => void;
  clearError: () => void;
}

export const useOrgStore = create<OrgState>((set, get) => ({
  currentOrg: null,
  orgs: [],
  userRole: null,
  isLoading: false,
  error: null,

  loadOrgs: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await orgService.listOrgs();
      const orgs = response.orgs;
      const current = get().currentOrg;

      // If no org selected yet, pick the first non-demo org or fallback
      let selectedOrg = current;
      if (!selectedOrg && orgs.length > 0) {
        selectedOrg = orgs.find((o) => !o.is_demo) || orgs[0];
        setCurrentOrgId(selectedOrg.id);
      }

      set({ orgs, currentOrg: selectedOrg, userRole: response.user_role, isLoading: false });
    } catch (error) {
      set({
        error: (error as ApiError).message || "Failed to load organizations",
        isLoading: false,
      });
    }
  },

  switchOrg: async (orgId: string) => {
    const { orgs } = get();
    const targetOrg = orgs.find((o) => o.id === orgId);
    if (!targetOrg) return;

    set({ isLoading: true, error: null });
    try {
      await orgService.switchOrg(orgId);
      setCurrentOrgId(orgId);
      set({ currentOrg: targetOrg, isLoading: false });
    } catch (error) {
      set({
        error: (error as ApiError).message || "Failed to switch organization",
        isLoading: false,
      });
    }
  },

  setCurrentOrg: (org: Organization) => {
    setCurrentOrgId(org.id);
    set({ currentOrg: org });
  },

  clearError: () => set({ error: null }),
}));
