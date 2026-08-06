"use client";

import React, { createContext, useContext, useState } from "react";

interface UnifiedViewData {
  type: 'subnet' | 'client';
  data: unknown;
}

interface UnifiedViewContextType {
  openUnifiedView: (type: 'subnet' | 'client', data: unknown) => void;
  closeUnifiedView: () => void;
  unifiedViewData: UnifiedViewData | null;
}

const UnifiedViewContext = createContext<UnifiedViewContextType | undefined>(undefined);

export function UnifiedViewProvider({ children }: { children: React.ReactNode }) {
  const [unifiedViewData, setUnifiedViewData] = useState<UnifiedViewData | null>(null);

  const openUnifiedView = (type: 'subnet' | 'client', data: unknown) => {
    setUnifiedViewData({ type, data });
  };

  const closeUnifiedView = () => {
    setUnifiedViewData(null);
  };

  return (
    <UnifiedViewContext.Provider value={{
      openUnifiedView,
      closeUnifiedView,
      unifiedViewData,
    }}>
      {children}
    </UnifiedViewContext.Provider>
  );
}

export function useUnifiedView() {
  const context = useContext(UnifiedViewContext);
  if (context === undefined) {
    throw new Error('useUnifiedView must be used within a UnifiedViewProvider');
  }
  return context;
}