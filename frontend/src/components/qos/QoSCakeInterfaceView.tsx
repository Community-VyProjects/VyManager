"use client";

import { Badge } from "@/components/ui/badge";
import { AlertTriangle, CheckCircle2, Network } from "lucide-react";
import { QoSCakeStats } from "@/lib/api/qos";
import { formatBytes } from "@/lib/utils";
import { formatBitrate } from "@/hooks/useQoSLiveStats";

/**
 * Renders one CAKE interface: header (policy / diffserv / flow mode), an
 * aggregate live-bandwidth bar, and the per-tin counters table. CAKE is a
 * single qdisc, so its "classes" are diffserv tins rather than config classes.
 */
export function QoSCakeInterfaceView({ cake, live }: { cake: QoSCakeStats; live: number }) {
  const cap = cake.bandwidth ?? cake.capacity_estimate ?? 0;
  const pct = cap > 0 ? Math.min(100, (live / cap) * 100) : 0;
  const color = pct >= 90 ? "bg-red-500" : pct >= 60 ? "bg-amber-500" : "bg-emerald-500";

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 min-w-0 flex-wrap">
          <Network className="h-4 w-4 text-primary shrink-0" />
          <span className="font-mono text-sm font-medium">{cake.interface}</span>
          {cake.policy_name && (
            <Badge variant="secondary" className="font-normal">{cake.policy_name}</Badge>
          )}
          <Badge variant="outline" className="font-normal">CAKE</Badge>
          {cake.diffserv && (
            <Badge variant="outline" className="font-normal text-muted-foreground">{cake.diffserv}</Badge>
          )}
          {cake.flow_mode && (
            <span className="text-xs text-muted-foreground">{cake.flow_mode}</span>
          )}
        </div>
        {cake.drops > 0 ? (
          <span className="flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400 shrink-0">
            <AlertTriangle className="h-3.5 w-3.5" />
            {cake.drops.toLocaleString()} drops
          </span>
        ) : (
          <span className="flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400 shrink-0">
            <CheckCircle2 className="h-3.5 w-3.5" />
            no drops
          </span>
        )}
      </div>

      {/* Aggregate live bandwidth */}
      <div className="flex items-center gap-2 mb-3">
        <span className="text-xs text-muted-foreground w-20 shrink-0">Throughput</span>
        <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
          <div
            className={`h-full rounded-full transition-all duration-700 ease-out ${color}`}
            style={{ width: `${pct}%` }}
          />
        </div>
        <span className="w-20 shrink-0 text-right font-mono text-xs tabular-nums">{formatBitrate(live)}</span>
      </div>

      {/* Per-tin table */}
      {cake.tins.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-muted-foreground border-b">
                <th className="text-left font-medium py-1 pr-2">Tin</th>
                <th className="text-right font-medium py-1 px-2">Threshold</th>
                <th className="text-right font-medium py-1 px-2">Bytes</th>
                <th className="text-right font-medium py-1 px-2">Pkts</th>
                <th className="text-right font-medium py-1 px-2">Drops</th>
                <th className="text-right font-medium py-1 pl-2">Marks</th>
              </tr>
            </thead>
            <tbody>
              {cake.tins.map((t) => (
                <tr key={t.name} className="border-b last:border-0">
                  <td className="py-1 pr-2 font-medium">{t.name}</td>
                  <td className="py-1 px-2 text-right tabular-nums text-muted-foreground">
                    {t.threshold_rate != null ? formatBitrate(t.threshold_rate) : "—"}
                  </td>
                  <td className="py-1 px-2 text-right tabular-nums">{formatBytes(t.sent_bytes)}</td>
                  <td className="py-1 px-2 text-right tabular-nums">{t.sent_packets.toLocaleString()}</td>
                  <td className={`py-1 px-2 text-right tabular-nums ${t.drops > 0 ? "text-amber-600 dark:text-amber-400" : ""}`}>
                    {t.drops.toLocaleString()}
                  </td>
                  <td className="py-1 pl-2 text-right tabular-nums text-muted-foreground">{t.marks.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
