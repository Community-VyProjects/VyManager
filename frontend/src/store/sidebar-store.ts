import { create } from "zustand";

interface SidebarState {
  collapsed: boolean;
  toggle: () => void;
  setCollapsed: (collapsed: boolean) => void;
}

const STORAGE_KEY = "vymanager-sidebar-collapsed";

function getInitialState(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(STORAGE_KEY) === "true";
  } catch {
    return false;
  }
}

export const useSidebarStore = create<SidebarState>((set) => ({
  collapsed: getInitialState(),
  toggle: () =>
    set((state) => {
      const next = !state.collapsed;
      try {
        localStorage.setItem(STORAGE_KEY, String(next));
      } catch {}
      return { collapsed: next };
    }),
  setCollapsed: (collapsed) => {
    try {
      localStorage.setItem(STORAGE_KEY, String(collapsed));
    } catch {}
    set({ collapsed });
  },
}));
