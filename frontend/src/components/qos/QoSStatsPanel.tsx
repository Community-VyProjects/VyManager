"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Activity, AlertTriangle, CheckCircle2, Network, Pause, Play } from "lucide-react";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { QoSClassStats } from "@/lib/api/qos";
import { formatBytes } from "@/lib/utils";
import {
  QOS_POLL_MS,
  formatBitrate,
  qosSampleKey,
  useQoSLiveStats,
} from "@/hooks/useQoSLiveStats";
import { QoSInterfaceSelect } from "./QoSInterfaceSelect";

function classRowLabel(c: QoSClassStats): string {
  if (c.class_name === "root") return "root";
  if (c.class_name === "default") return "default";
  return `class ${c.class_name}`;
}

/**
 * Live QoS statistics panel. Polls `GET /vyos/qos/stats` and derives real-time
 * per-class bandwidth from byte deltas between successive samples — the same
 * approach the dashboard uses for interface counters. Mounts only while the
 * Statistics tab is active (Radix unmounts inactive tabs), so polling stops
 * automatically when the user navigates away.
 */
export function QoSStatsPanel() {
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [selected, setSelected] = useState<string>(""); // "" = all interfaces
  const { stats, rates, loading, error, refresh } = useQoSLiveStats(autoRefresh);

  if (loading && !stats) {
    return (
      <div className="flex items-center justify-center py-16">
        <LoadingSpinner />
      </div>
    );
  }

  if (error && !stats) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-16">
        <p className="text-destructive">{error}</p>
        <Button variant="outline" onClick={refresh}>Retry</Button>
      </div>
    );
  }

  const applied = stats?.applied && stats.interfaces.length > 0;
  const availableIfaces = stats?.interfaces.map((i) => i.interface) ?? [];
  const stale = !!selected && availableIfaces.length > 0 && !availableIfaces.includes(selected);
  const effectiveSelected = selected && !stale ? selected : "";
  const shownInterfaces = effectiveSelected
    ? (stats?.interfaces ?? []).filter((i) => i.interface === effectiveSelected)
    : stats?.interfaces ?? [];

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Activity className={`h-4 w-4 ${autoRefresh ? "text-emerald-500" : ""}`} />
          {autoRefresh ? (
            <span className="flex items-center gap-1.5">
              Live
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
              </span>
              <span className="text-xs">· updates every {QOS_POLL_MS / 1000}s</span>
            </span>
          ) : (
            <span>Paused</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {applied && (
            <QoSInterfaceSelect
              interfaces={availableIfaces}
              value={effectiveSelected}
              onChange={setSelected}
            />
          )}
          <Button variant="outline" size="sm" onClick={() => setAutoRefresh((v) => !v)}>
            {autoRefresh ? <Pause className="mr-2 h-4 w-4" /> : <Play className="mr-2 h-4 w-4" />}
            {autoRefresh ? "Pause" : "Resume"}
          </Button>
        </div>
      </div>

      {stale && (
        <div className="flex items-center gap-2 rounded-md border border-amber-500/20 bg-amber-500/10 p-2.5 text-sm text-amber-600 dark:text-amber-400">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>“{selected}” no longer has QoS applied — showing all interfaces.</span>
        </div>
      )}

      {error && stats && (
        <div className="flex items-start gap-2 rounded-md border border-amber-500/20 bg-amber-500/10 p-3 text-sm text-amber-600 dark:text-amber-400">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>Last refresh failed ({error}) — showing previous sample.</span>
        </div>
      )}

      {!applied ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            QoS is not applied to any interface. Attach a policy under the Interfaces tab to
            see live traffic statistics here.
          </CardContent>
        </Card>
      ) : (
        shownInterfaces.map((iface) => {
          const totalDrops = iface.classes.reduce((s, c) => s + c.drops, 0);
          const totalOver = iface.classes.reduce((s, c) => s + c.overlimits, 0);
          return (
            <Card key={iface.interface}>
              <CardHeader className="pb-2 pt-4 px-4">
                <div className="flex items-center justify-between gap-3">
                  <CardTitle className="flex items-center gap-2 text-sm font-medium">
                    <Network className="h-4 w-4 text-primary" />
                    <span className="font-mono">{iface.interface}</span>
                    {iface.policy_name && (
                      <Badge variant="secondary" className="font-normal">{iface.policy_name}</Badge>
                    )}
                  </CardTitle>
                  <EffectivenessBadge drops={totalDrops} overlimits={totalOver} />
                </div>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Class</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead className="w-[34%]">Live bandwidth</TableHead>
                      <TableHead className="text-right">Bytes</TableHead>
                      <TableHead className="text-right">Packets</TableHead>
                      <TableHead className="text-right">Drops</TableHead>
                      <TableHead className="text-right">Overlimit</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {iface.classes.map((c) => {
                      const live = rates[qosSampleKey(iface.interface, c.class_name)] ?? 0;
                      return (
                        <TableRow key={c.class_name}>
                          <TableCell className="font-mono font-medium">{classRowLabel(c)}</TableCell>
                          <TableCell>
                            {c.queue_type ? (
                              <Badge variant="outline" className="font-normal">{c.queue_type}</Badge>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <LiveBandwidthBar live={live} ceiling={c.ceiling} configured={c.bandwidth} />
                          </TableCell>
                          <TableCell className="text-right tabular-nums">{formatBytes(c.bytes)}</TableCell>
                          <TableCell className="text-right tabular-nums">{c.packets.toLocaleString()}</TableCell>
                          <TableCell className={`text-right tabular-nums ${c.drops > 0 ? "text-amber-600 dark:text-amber-400" : ""}`}>
                            {c.drops.toLocaleString()}
                          </TableCell>
                          <TableCell className="text-right tabular-nums text-muted-foreground">
                            {c.overlimits.toLocaleString()}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          );
        })
      )}
    </div>
  );
}

/** Animated live-bandwidth bar, filled relative to the class ceiling. */
function LiveBandwidthBar({
  live,
  ceiling,
  configured,
}: {
  live: number;
  ceiling: number | null;
  configured: number | null;
}) {
  const cap = ceiling ?? configured ?? 0;
  const pct = cap > 0 ? Math.min(100, (live / cap) * 100) : 0;
  // Green under 60%, amber 60–90%, red above 90% utilisation.
  const color = pct >= 90 ? "bg-red-500" : pct >= 60 ? "bg-amber-500" : "bg-emerald-500";

  return (
    <div className="flex items-center gap-2">
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
        <div
          className={`h-full rounded-full transition-all duration-700 ease-out ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="w-20 shrink-0 text-right font-mono text-xs tabular-nums">
              {formatBitrate(live)}
            </span>
          </TooltipTrigger>
          <TooltipContent side="left">
            <div className="space-y-0.5 text-xs">
              <div>Live: {formatBitrate(live)}</div>
              {configured != null && <div>Configured: {formatBitrate(configured)}</div>}
              {ceiling != null && <div>Ceiling: {formatBitrate(ceiling)}</div>}
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
}

/** Per-interface policy-effectiveness summary derived from drops/overlimits. */
function EffectivenessBadge({ drops, overlimits }: { drops: number; overlimits: number }) {
  if (drops === 0) {
    return (
      <Badge variant="outline" className="gap-1 border-emerald-500/30 text-emerald-600 dark:text-emerald-400">
        <CheckCircle2 className="h-3.5 w-3.5" />
        No drops
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="gap-1 border-amber-500/30 text-amber-600 dark:text-amber-400">
      <AlertTriangle className="h-3.5 w-3.5" />
      {drops.toLocaleString()} drops
      {overlimits > 0 ? ` · ${overlimits.toLocaleString()} overlimit` : ""}
    </Badge>
  );
}
