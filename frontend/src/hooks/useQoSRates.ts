"use client";

import { useEffect, useRef, useState } from "react";
import { QoSStatsResponse } from "@/lib/api/qos";

/** Stable key for a shaper class's sample/rate, scoped to its interface. */
export const qosSampleKey = (iface: string, cls: string) => `${iface}::${cls}`;

/** Rate key for a CAKE interface's aggregate bandwidth. */
export const qosCakeKey = (iface: string) => `cake::${iface}`;

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

/**
 * Derive live per-class / per-interface bandwidth from successive QoS snapshots
 * delivered over the dashboard SSE stream. Computes bits/s from byte deltas
 * between consecutive snapshots — the same math the interface counters use.
 *
 * `active` gates updates: when false, the last snapshot and rates are frozen
 * (a "pause"), so the card can stop moving without tearing down the stream.
 * Returns the snapshot it last accepted so paused views stay consistent.
 */
export function useQoSRates(live: QoSStatsResponse | null, active: boolean) {
  const [stats, setStats] = useState<QoSStatsResponse | null>(null);
  const [rates, setRates] = useState<Record<string, number>>({});
  const prevRef = useRef<Record<string, { bytes: number; ts: number }>>({});

  useEffect(() => {
    if (!active || !live) return;
    const now = Date.now();
    const nextSamples: Record<string, { bytes: number; ts: number }> = {};
    const nextRates: Record<string, number> = {};

    const sample = (key: string, bytes: number) => {
      const prev = prevRef.current[key];
      if (prev && now > prev.ts) {
        const deltaBytes = bytes - prev.bytes;
        // Negative delta = counter reset (policy reapplied); treat as 0.
        nextRates[key] = deltaBytes > 0 ? (deltaBytes * 8) / ((now - prev.ts) / 1000) : 0;
      }
      nextSamples[key] = { bytes, ts: now };
    };

    for (const iface of live.interfaces) {
      for (const c of iface.classes) sample(qosSampleKey(iface.interface, c.class_name), c.bytes);
    }
    for (const ck of live.cake ?? []) sample(qosCakeKey(ck.interface), ck.bytes);

    prevRef.current = nextSamples;
    setStats(live);
    setRates(nextRates);
  }, [live, active]);

  return { stats, rates };
}
