/**
 * Organization Store
 *
 * Loads the caller's organization memberships and tracks which org the admin
 * surface is acting in. The org UI (grouping header, switcher) renders only
 * when `orgUiVisible` (more than one membership), so single-team deployments
 * never see the org layer. The active org is persisted and mirrored into
 * org-context so the API service layer can scope its requests.
 */

import { create } from "zustand";
import { sessionService, OrganizationMembership } from "@/lib/api/session";
import { setActiveOrgId } from "@/lib/api/org-context";

const STORAGE_KEY = "vymgr.activeOrgId";

function loadPersisted(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function persist(id: string | null): void {
  if (typeof window === "undefined") return;
  try {
    if (id) window.localStorage.setItem(STORAGE_KEY, id);
    else window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

interface OrgState {
  organizations: OrganizationMembership[];
  orgUiVisible: boolean;
  activeOrgId: string | null;
  loaded: boolean;

  loadOrganizations: () => Promise<void>;
  setActiveOrg: (id: string) => void;
}

export const useOrgStore = create<OrgState>((set, get) => ({
  organizations: [],
  orgUiVisible: false,
  activeOrgId: null,
  loaded: false,

  loadOrganizations: async () => {
    try {
      const res = await sessionService.listOrganizations();
      const persisted = loadPersisted();
      const valid = res.organizations.some((o) => o.id === persisted);
      // Prefer the persisted choice; otherwise the first org (stable, sorted
      // by name server-side). Null only when the user has no memberships.
      const active =
        (valid ? persisted : null) ?? res.organizations[0]?.id ?? null;
      setActiveOrgId(active);
      persist(active);
      set({
        organizations: res.organizations,
        orgUiVisible: res.org_ui_visible,
        activeOrgId: active,
        loaded: true,
      });
    } catch {
      set({ loaded: true });
    }
  },

  setActiveOrg: (id: string) => {
    if (id === get().activeOrgId) return;
    setActiveOrgId(id);
    persist(id);
    set({ activeOrgId: id });
  },
}));
