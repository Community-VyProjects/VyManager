'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useCacheContext } from '@/components/providers/cache-provider';
import { Progress } from '@/components/ui/progress';
import { RefreshCw, Trash2, Server } from 'lucide-react';
import { api } from '@/lib/api';
import { useToast } from '@/components/ui/use-toast';

export function CacheDashboard() {
  const { stats, isInitialized, isInitializing, refreshCache, clearCache } = useCacheContext();
  const { toast } = useToast();

  const handleClearBackendCache = async (pattern?: string) => {
    try {
      const response = await api.clearCache(pattern);
      toast({
        title: 'Cache Cleared',
        description: response.message,
        variant: 'default',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to clear backend cache',
        variant: 'destructive',
      });
    }
  };

  const handleClearFrontendCache = (pattern?: string) => {
    clearCache(pattern);
    toast({
      title: 'Frontend Cache Cleared',
      description: pattern ? `Cleared ${pattern} entries` : 'Cleared all entries',
      variant: 'default',
    });
  };

  const handleRefreshCache = async () => {
    try {
      await refreshCache();
      toast({
        title: 'Cache Refreshed',
        description: 'All cache entries have been refreshed',
        variant: 'default',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to refresh cache',
        variant: 'destructive',
      });
    }
  };

  if (isInitializing) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Cache Initialization</CardTitle>
          <CardDescription>Initializing cache with essential data...</CardDescription>
        </CardHeader>
        <CardContent>
          <Progress value={30} className="w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!isInitialized) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Cache Not Initialized</CardTitle>
          <CardDescription>The cache has not been initialized yet.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={() => refreshCache()}>Initialize Cache</Button>
        </CardContent>
      </Card>
    );
  }

  const hitRatePercent = Math.round(stats.hitRate * 100);
  const formattedUptime = formatUptime(stats.uptime);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Cache Statistics</span>
          <Button variant="outline" size="sm" onClick={handleRefreshCache}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        </CardTitle>
        <CardDescription>Performance metrics for the frontend cache system</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard title="Cached Items" value={stats.items} />
          <StatCard title="Cache Hits" value={stats.hits} />
          <StatCard title="Cache Misses" value={stats.misses} />
          <StatCard title="Hit Rate" value={`${hitRatePercent}%`} />
        </div>

        <Separator className="my-6" />

        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-medium">Frontend Cache</h3>
            <p className="text-sm text-muted-foreground">Manage the client-side cache</p>
            <div className="flex flex-wrap gap-2 mt-2">
              <Button variant="destructive" size="sm" onClick={() => handleClearFrontendCache()}>
                <Trash2 className="mr-2 h-4 w-4" />
                Clear All
              </Button>
              <Button variant="outline" size="sm" onClick={() => handleClearFrontendCache('config')}>
                Clear Config Cache
              </Button>
              <Button variant="outline" size="sm" onClick={() => handleClearFrontendCache('show')}>
                Clear Show Cache
              </Button>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-medium">Backend Cache</h3>
            <p className="text-sm text-muted-foreground">Manage the server-side cache</p>
            <div className="flex flex-wrap gap-2 mt-2">
              <Button variant="destructive" size="sm" onClick={() => handleClearBackendCache()}>
                <Server className="mr-2 h-4 w-4" />
                Clear All
              </Button>
              <Button variant="outline" size="sm" onClick={() => handleClearBackendCache('config')}>
                Clear Config Cache
              </Button>
              <Button variant="outline" size="sm" onClick={() => handleClearBackendCache('show')}>
                Clear Show Cache
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
      <CardFooter className="text-xs text-muted-foreground">
        Cache uptime: {formattedUptime}
      </CardFooter>
    </Card>
  );
}

// Helper components
function StatCard({ title, value }: { title: string; value: string | number }) {
  return (
    <div className="bg-card border rounded-lg p-4 shadow-sm">
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-sm font-medium text-muted-foreground">{title}</div>
    </div>
  );
}

// Helper functions
function formatUptime(seconds: number): string {
  if (seconds < 60) {
    return `${seconds} seconds`;
  }
  
  if (seconds < 3600) {
    const minutes = Math.floor(seconds / 60);
    return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
  }
  
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  
  return `${hours} hour${hours !== 1 ? 's' : ''} ${minutes} minute${minutes !== 1 ? 's' : ''}`;
} 