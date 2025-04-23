import React from 'react';
import { CacheDashboard } from '@/components/cache/dashboard';

export const metadata = {
  title: 'Cache Dashboard | VyManager',
  description: 'Monitor and manage the caching system',
};

export default function CacheDashboardPage() {
  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Cache Management</h1>
      </div>
      
      <p className="text-muted-foreground">
        Monitor cache performance and manage cache settings for both frontend and backend systems.
      </p>
      
      <CacheDashboard />
    </div>
  );
} 