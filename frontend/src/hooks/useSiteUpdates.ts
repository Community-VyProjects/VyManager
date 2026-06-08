"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  InstanceUpdateStatus,
  SiteUpdatesSummary,
  systemUpdatesService,
} from "@/lib/api/system-updates";

/**
 * Single source of truth for a site's update/reachability fan-out.
 *
 * Fetches once per site (the backend additionally caches for a short TTL) and
 * exposes the result plus a per-instance lookup, so the rollup panel and the
 * instance cards/table can share one set of results instead of each polling the
 * routers independently.
 */
export function useSiteUpdates(siteId: string | null) {
  const [summary, setSummary] = useState<SiteUpdatesSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (refresh: boolean) => {
      if (!siteId) return;
      setLoading(true);
      setError(null);
      try {
        setSummary(await systemUpdatesService.getSiteUpdates(siteId, refresh));
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to check for updates");
      } finally {
        setLoading(false);
      }
    },
    [siteId]
  );

  useEffect(() => {
    setSummary(null);
    setError(null);
    load(false);
  }, [load]);

  const statusById = useMemo(() => {
    const map = new Map<string, InstanceUpdateStatus>();
    summary?.instances.forEach((i) => map.set(i.instance_id, i));
    return map;
  }, [summary]);

  const refresh = useCallback(() => load(true), [load]);

  return { summary, loading, error, refresh, statusById };
}
