"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { qosService, QoSStatsResponse } from "@/lib/api/qos";

export const QOS_POLL_MS = 2000;

/** Stable key for a class's sample/rate, scoped to its interface. */
export const qosSampleKey = (iface: string, cls: string) => `${iface}::${cls}`;

/** Format a bits-per-second value, e.g. 1_500_000 -> "1.5 Mbps". */
export function formatBitrate(bps: number): string {
  if (!isFinite(bps) || bps <= 0) return "0 bps";
  const units = ["bps", "Kbps", "Mbps", "Gbps", "Tbps"];
  let v = bps;
  let i = 0;
  while (v >= 1000 && i < units.length - 1) {
    v /= 1000;
    i += 1;
  }
  return `${v >= 100 || i === 0 ? Math.round(v) : v.toFixed(1)} ${units[i]}`;
}

export interface QoSLiveStats {
  stats: QoSStatsResponse | null;
  /** Live bandwidth (bits/s) per `qosSampleKey`, derived from byte deltas. */
  rates: Record<string, number>;
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

/**
 * Poll `GET /vyos/qos/stats` and derive real-time per-class bandwidth from byte
 * deltas between successive samples — the same approach the dashboard uses for
 * interface counters. When `active` is false the interval is not scheduled (a
 * single fetch still runs so paused views show the latest snapshot).
 */
export function useQoSLiveStats(active: boolean): QoSLiveStats {
  const [stats, setStats] = useState<QoSStatsResponse | null>(null);
  const [rates, setRates] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Previous byte counters per class, for rate computation.
  const prevRef = useRef<Record<string, { bytes: number; ts: number }>>({});

  const poll = useCallback(async () => {
    try {
      const res = await qosService.getStats();
      const now = Date.now();
      const nextSamples: Record<string, { bytes: number; ts: number }> = {};
      const nextRates: Record<string, number> = {};

      for (const iface of res.interfaces) {
        for (const c of iface.classes) {
          const key = qosSampleKey(iface.interface, c.class_name);
          const prev = prevRef.current[key];
          if (prev && now > prev.ts) {
            const deltaBytes = c.bytes - prev.bytes;
            // Negative delta = counter reset (policy reapplied); treat as 0.
            nextRates[key] = deltaBytes > 0 ? (deltaBytes * 8) / ((now - prev.ts) / 1000) : 0;
          }
          nextSamples[key] = { bytes: c.bytes, ts: now };
        }
      }

      prevRef.current = nextSamples;
      setStats(res);
      setRates(nextRates);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load QoS statistics");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    poll();
    if (!active) return;
    const id = setInterval(poll, QOS_POLL_MS);
    return () => clearInterval(id);
  }, [poll, active]);

  return { stats, rates, loading, error, refresh: poll };
}
