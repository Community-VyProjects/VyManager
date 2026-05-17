"use client";

import { createContext, useContext, useState, useCallback } from "react";

interface PageRefreshContextType {
  refreshKey: number;
  triggerRefresh: () => void;
}

const PageRefreshContext = createContext<PageRefreshContextType>({
  refreshKey: 0,
  triggerRefresh: () => {},
});

export function PageRefreshProvider({ children }: { children: React.ReactNode }) {
  const [refreshKey, setRefreshKey] = useState(0);
  const triggerRefresh = useCallback(() => setRefreshKey((k) => k + 1), []);
  return (
    <PageRefreshContext.Provider value={{ refreshKey, triggerRefresh }}>
      {children}
    </PageRefreshContext.Provider>
  );
}

export const usePageRefresh = () => useContext(PageRefreshContext);
