'use client';

import React, { useState } from 'react';
import { useCacheContext } from '@/components/providers/cache-provider';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { refreshCache } from '@/lib/cache-init';

export function CacheInitializer({ children }: { children: React.ReactNode }) {
  const { isInitialized, isInitializing } = useCacheContext();
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [retrying, setRetrying] = useState(false);

  // Handle retry button click
  const handleRetry = async () => {
    setRetrying(true);
    setConnectionError(null);
    
    try {
      await refreshCache();
    } catch (error) {
      setConnectionError(
        error instanceof Error 
          ? error.message 
          : 'Failed to connect to the backend server. Please check if the server is running.'
      );
    } finally {
      setRetrying(false);
    }
  };

  if (isInitializing) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-background">
        <div className="w-full max-w-md px-4 space-y-4">
          <div className="text-center space-y-2">
            <h1 className="text-2xl font-bold">Initializing VyManager</h1>
            <p className="text-muted-foreground">
              Loading essential data and preparing application...
            </p>
          </div>
          
          <Progress value={60} className="h-1.5" />
          
          <ul className="text-sm space-y-1 mt-4">
            <li className="text-green-500">✓ Connection established</li>
            <li className="text-green-500">✓ Loading configuration data</li>
            <li className="text-green-500">✓ Loading routing information</li>
            <li className="animate-pulse">⋯ Loading device information</li>
          </ul>
        </div>
      </div>
    );
  }
  
  // Show error message if there's a connection error
  if (connectionError) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-background">
        <div className="w-full max-w-md p-6 space-y-4 bg-card border rounded-lg shadow-lg">
          <div className="text-center space-y-2">
            <h1 className="text-2xl font-bold text-destructive">Connection Error</h1>
            <p className="text-muted-foreground">
              {connectionError}
            </p>
          </div>
          
          <div className="bg-muted/50 p-4 rounded text-sm">
            <p className="font-medium">Troubleshooting steps:</p>
            <ol className="list-decimal pl-4 space-y-1 mt-2">
              <li>Ensure the backend server is running (python -m uvicorn main:app --host 0.0.0.0 --port 3001)</li>
              <li>Check network connectivity between your browser and the server</li>
              <li>Verify the API URL in the frontend configuration is correct</li>
            </ol>
          </div>
          
          <div className="flex justify-center">
            <Button 
              onClick={handleRetry} 
              disabled={retrying}
              className="w-full"
            >
              {retrying ? 'Retrying...' : 'Retry Connection'}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
} 