'use client';

import React, { ReactNode } from 'react';
import { CacheProvider } from './cache-provider';

interface ProvidersProps {
  children: ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  return (
    <CacheProvider>
      {children}
    </CacheProvider>
  );
} 