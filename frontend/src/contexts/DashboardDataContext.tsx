"use client";

import React, { createContext, useContext } from "react";
import { useDashboardSSE, DashboardSSEState } from "@/hooks/useDashboardSSE";

// ============================================================================
// Context
// ============================================================================

const DashboardDataContext = createContext<DashboardSSEState | null>(null);

// ============================================================================
// Provider
// ============================================================================

export function DashboardDataProvider({
  children,
  interests,
}: {
  children: React.ReactNode;
  interests?: string[];
}) {
  const sseState = useDashboardSSE({ interests });

  return (
    <DashboardDataContext.Provider value={sseState}>
      {children}
    </DashboardDataContext.Provider>
  );
}

// ============================================================================
// Consumer hook
// ============================================================================

export function useDashboardData(): DashboardSSEState {
  const ctx = useContext(DashboardDataContext);
  if (ctx === null) {
    throw new Error("useDashboardData must be used within a DashboardDataProvider");
  }
  return ctx;
}
