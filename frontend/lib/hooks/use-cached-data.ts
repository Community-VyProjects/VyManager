import { useEffect, useState } from 'react';
import { useCache } from '@/lib/cache';
import { api } from '@/lib/api';

// Hook for config data
export function useCachedConfig<T>(path: string = '') {
  return useCache<T>(
    `config:${path}`,
    () => api.getConfig(path),
    30  // 30 second TTL
  );
}

// Hook for routing table
export function useCachedRoutingTable() {
  return useCache(
    'routing:table',
    () => api.getRoutingTable(),
    60  // 60 second TTL
  );
}

// Hook for DHCP leases
export function useCachedDHCPLeases() {
  return useCache(
    'dhcp:leases',
    () => api.getDHCPLeases(),
    60  // 60 second TTL
  );
}

// Hook for show commands
export function useCachedShowCommand<T>(command: string) {
  return useCache<T>(
    `show:${command}`,
    () => api.showCommand(command),
    30  // 30 second TTL
  );
}

// Hook to check for unsaved changes
export function useUnsavedChanges() {
  return useCache(
    'system:unsaved',
    () => api.checkUnsavedChanges(),
    10  // 10 second TTL
  );
} 