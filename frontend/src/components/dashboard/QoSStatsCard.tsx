"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  X,
  Gauge,
  RefreshCw,
  Settings,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { QoSClassStats } from "@/lib/api/qos";
import { formatBytes } from "@/lib/utils";
import { formatBitrate, qosCakeKey, qosSampleKey, useQoSLiveStats } from "@/hooks/useQoSLiveStats";
import { QoSInterfaceSelect } from "@/components/qos/QoSInterfaceSelect";
import { QoSCakeInterfaceView } from "@/components/qos/QoSCakeInterfaceView";

interface QoSStatsCardProps {
  onRemove?: () => void;
  span?: number;
  onSpanChange?: (newSpan: number) => void;
  config?: Record<string, unknown>;
  onConfigChange?: (config: Record<string, unknown>) => void;
}

function classLabel(c: QoSClassStats): string {
  if (c.class_name === "root" || c.class_name === "default") return c.class_name;
  return `class ${c.class_name}`;
}

export function QoSStatsCard({ onRemove, span = 1, onSpanChange, config, onConfigChange }: QoSStatsCardProps) {
  const [autoRefresh, setAutoRefresh] = useState(true);
  // Watched interface; "" = all. Seeded from saved card config, editable live.
  const [selected, setSelected] = useState<string>(() => (config?.interface as string) || "");
  const { stats, rates, loading, error } = useQoSLiveStats(autoRefresh);

  const shaperIfaces = stats?.interfaces ?? [];
  const cakeIfaces = stats?.cake ?? [];
  const applied = !!stats?.applied && (shaperIfaces.length > 0 || cakeIfaces.length > 0);
  const availableIfaces = [
    ...shaperIfaces.map((i) => i.interface),
    ...cakeIfaces.map((c) => c.interface),
  ];
  // Fall back to "all" if the saved interface no longer has QoS applied.
  const stale = !!selected && availableIfaces.length > 0 && !availableIfaces.includes(selected);
  const effectiveSelected = selected && !stale ? selected : "";
  const shownInterfaces = effectiveSelected
    ? shaperIfaces.filter((i) => i.interface === effectiveSelected)
    : shaperIfaces;
  const shownCake = effectiveSelected
    ? cakeIfaces.filter((c) => c.interface === effectiveSelected)
    : cakeIfaces;

  const handleSelect = (value: string) => {
    setSelected(value);
    onConfigChange?.({ ...config, interface: value });
  };

  return (
    <Card className="flex flex-col h-[520px]">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3 shrink-0">
        <div className="flex items-center gap-2">
          <Gauge className="h-5 w-5 text-primary" />
          <CardTitle className="text-lg font-medium">QoS Statistics</CardTitle>
        </div>
        <div className="flex items-center gap-1.5">
          {applied && (
            <QoSInterfaceSelect
              interfaces={availableIfaces}
              value={effectiveSelected}
              onChange={handleSelect}
            />
          )}
          <Button
            variant={autoRefresh ? "default" : "outline"}
            size="sm"
            onClick={() => setAutoRefresh((v) => !v)}
            title={autoRefresh ? "Polling every 2s" : "Paused"}
          >
            <RefreshCw className={`h-4 w-4 mr-1 ${autoRefresh ? "animate-spin" : ""}`} />
            {autoRefresh ? "Live" : "Paused"}
          </Button>
          {onSpanChange && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm">
                  <Settings className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Card Width</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {([1, 2, 3] as const).map((n) => (
                  <DropdownMenuItem key={n} onClick={() => onSpanChange(n)}>
                    <div className="flex items-center justify-between w-full">
                      <span>
                        {n === 1 ? "Small (1 column)" : n === 2 ? "Medium (2 columns)" : "Large (3 columns)"}
                      </span>
                      {span === n && <span className="ml-2 text-primary">✓</span>}
                    </div>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          {onRemove && (
            <Button variant="ghost" size="sm" onClick={onRemove}>
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="flex flex-col flex-1 min-h-0 p-0">
        {error && !stats ? (
          <div className="px-4 py-6 text-destructive text-sm text-center">{error}</div>
        ) : loading && !stats ? (
          <div className="px-4 py-6 text-center text-muted-foreground text-sm">Loading…</div>
        ) : !applied ? (
          <div className="flex flex-1 items-center justify-center px-6 text-center text-sm text-muted-foreground">
            QoS is not applied to any interface. Attach a policy to an interface to see live
            traffic here.
          </div>
        ) : (
          <div className="flex-1 min-h-0 overflow-y-auto">
            {stale && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] text-amber-600 dark:text-amber-400 bg-amber-500/10 border-b">
                <AlertTriangle className="h-3 w-3 shrink-0" />
                <span className="truncate">“{selected}” no longer has QoS applied — showing all interfaces.</span>
              </div>
            )}
            {shownInterfaces.map((iface) => {
              const drops = iface.classes.reduce((s, c) => s + c.drops, 0);
              return (
                <div key={iface.interface} className="border-b last:border-0">
                  {/* Interface header */}
                  <div className="flex items-center justify-between gap-2 px-3 py-1.5 bg-muted/20 border-b">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-mono text-sm font-medium truncate">{iface.interface}</span>
                      {iface.policy_name && (
                        <Badge variant="secondary" className="text-[10px] h-4 px-1 font-normal">
                          {iface.policy_name}
                        </Badge>
                      )}
                    </div>
                    {drops > 0 ? (
                      <span className="flex items-center gap-1 text-[10px] text-amber-600 dark:text-amber-400 shrink-0">
                        <AlertTriangle className="h-3 w-3" />
                        {drops.toLocaleString()} drops
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400 shrink-0">
                        <CheckCircle2 className="h-3 w-3" />
                        no drops
                      </span>
                    )}
                  </div>

                  {/* Per-class rows */}
                  {iface.classes.map((c) => {
                    const live = rates[qosSampleKey(iface.interface, c.class_name)] ?? 0;
                    const cap = c.ceiling ?? c.bandwidth ?? 0;
                    const pct = cap > 0 ? Math.min(100, (live / cap) * 100) : 0;
                    const color = pct >= 90 ? "bg-red-500" : pct >= 60 ? "bg-amber-500" : "bg-emerald-500";
                    return (
                      <div
                        key={c.class_name}
                        className="flex items-center gap-2 px-3 py-2 border-b last:border-0 hover:bg-muted/30 transition-colors"
                        title={`${formatBytes(c.bytes)} · ${c.packets.toLocaleString()} pkts${c.drops ? ` · ${c.drops.toLocaleString()} drops` : ""}`}
                      >
                        <div className="w-24 shrink-0 min-w-0">
                          <p className="font-mono text-xs font-medium truncate">{classLabel(c)}</p>
                          {c.queue_type && (
                            <p className="text-[10px] text-muted-foreground leading-tight truncate">{c.queue_type}</p>
                          )}
                        </div>
                        <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                          <div
                            className={`h-full rounded-full transition-all duration-700 ease-out ${color}`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="w-20 shrink-0 text-right font-mono text-xs tabular-nums">
                          {formatBitrate(live)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              );
            })}

            {/* CAKE interfaces */}
            {shownCake.map((ck) => (
              <div key={`cake-${ck.interface}`} className="border-b last:border-0 p-3">
                <QoSCakeInterfaceView cake={ck} live={rates[qosCakeKey(ck.interface)] ?? 0} />
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
