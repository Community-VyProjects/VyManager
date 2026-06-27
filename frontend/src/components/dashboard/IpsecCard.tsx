"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  X,
  Lock,
  RefreshCw,
  Settings,
  ArrowDownToLine,
  ArrowUpFromLine,
  ArrowLeftRight,
  ShieldOff,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { IPSecStatus, IPSecTunnelStatus } from "@/lib/api/ipsec";
import { useDashboardData } from "@/contexts/DashboardDataContext";

interface IpsecCardProps {
  onRemove?: () => void;
  span?: number;
  onSpanChange?: (newSpan: number) => void;
  config?: Record<string, unknown>;
  onConfigChange?: (config: Record<string, unknown>) => void;
}

/** strongSwan reports byte counters as raw integer strings — humanize them. */
function formatBytes(value?: string | null): string {
  const n = Number(value);
  if (!value || Number.isNaN(n)) return "0 B";
  if (n < 1024) return `${n} B`;
  const units = ["KB", "MB", "GB", "TB"];
  let v = n / 1024;
  let i = 0;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i += 1;
  }
  return `${v.toFixed(1)} ${units[i]}`;
}

function StatPill({ label, value, tone }: { label: string; value: number; tone: "up" | "down" | "total" }) {
  const styles = {
    up: "text-emerald-600 dark:text-emerald-400",
    down: "text-red-600 dark:text-red-400",
    total: "text-foreground",
  }[tone];
  return (
    <div className="flex items-baseline gap-1.5">
      <span className={cn("text-sm font-semibold tabular-nums", styles)}>{value}</span>
      <span className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</span>
    </div>
  );
}

function TunnelRow({ tunnel }: { tunnel: IPSecTunnelStatus }) {
  const up = (tunnel.state ?? "").toLowerCase() === "up";
  const local = tunnel.local_ts.length ? tunnel.local_ts.join(", ") : "any";
  const remote = tunnel.remote_ts.length ? tunnel.remote_ts.join(", ") : "any";
  const proposal = tunnel.esp_proposal
    ? [
        tunnel.esp_proposal.cipher,
        tunnel.esp_proposal.key_size,
        tunnel.esp_proposal.hash,
      ]
        .filter(Boolean)
        .join("/")
    : null;

  return (
    <div className="relative px-3.5 py-2.5 border-b last:border-0 transition-colors hover:bg-muted/40">
      {/* status accent bar */}
      <span
        className={cn(
          "absolute inset-y-0 left-0 w-[3px]",
          up ? "bg-emerald-500" : "bg-muted-foreground/30",
        )}
      />

      {/* line 1: dot + name + state + proposal */}
      <div className="flex items-center gap-2">
        <span className="relative flex h-2 w-2 shrink-0">
          {up && (
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400/60" />
          )}
          <span
            className={cn(
              "relative inline-flex h-2 w-2 rounded-full",
              up ? "bg-emerald-500" : "bg-muted-foreground/40",
            )}
          />
        </span>
        <span className="font-mono text-sm font-medium truncate" title={tunnel.name ?? undefined}>
          {tunnel.name || "—"}
        </span>
        <Badge
          variant="outline"
          className={cn(
            "h-4 px-1 text-[10px] font-semibold tracking-wide shrink-0",
            up
              ? "border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
              : "border-red-500/30 text-red-600 dark:text-red-400",
          )}
        >
          {up ? "UP" : "DOWN"}
        </Badge>
      </div>

      {/* line 2: traffic selectors */}
      <div className="mt-1.5 flex items-center gap-1.5 pl-4 text-xs font-mono">
        <span className="truncate rounded bg-muted px-1.5 py-0.5 text-foreground/80" title={local}>
          {local}
        </span>
        <ArrowLeftRight className="h-3 w-3 shrink-0 text-muted-foreground" />
        <span className="truncate rounded bg-muted px-1.5 py-0.5 text-foreground/80" title={remote}>
          {remote}
        </span>
      </div>

      {/* line 3: traffic counters + ESP proposal (wraps instead of truncating) */}
      <div className="mt-1.5 flex flex-wrap items-center justify-between gap-x-4 gap-y-1 pl-4 text-[11px] tabular-nums text-muted-foreground">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1" title="received">
            <ArrowDownToLine className="h-3 w-3 text-blue-500" />
            {formatBytes(tunnel.bytes_in)}
          </span>
          <span className="flex items-center gap-1" title="sent">
            <ArrowUpFromLine className="h-3 w-3 text-orange-500" />
            {formatBytes(tunnel.bytes_out)}
          </span>
        </div>
        {proposal && (
          <span
            className="whitespace-nowrap rounded bg-muted px-1.5 py-0.5 font-mono text-[10px]"
            title="negotiated ESP proposal"
          >
            {proposal}
          </span>
        )}
      </div>
    </div>
  );
}

export function IpsecCard({ onRemove, span = 1, onSpanChange }: IpsecCardProps) {
  const [autoRefresh, setAutoRefresh] = useState(true);
  const { status: sseStatus, data: sseData } = useDashboardData();
  // Snapshot the stream so "Paused" freezes the displayed status.
  const [snapshot, setSnapshot] = useState<IPSecStatus | null>(null);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- freeze the last SSE snapshot for the paused view
    if (autoRefresh && sseData.ipsecStatus) setSnapshot(sseData.ipsecStatus);
  }, [autoRefresh, sseData.ipsecStatus]);

  const status = snapshot;
  const loading = status === null;
  const hasTunnels = !!status && status.tunnels.length > 0;

  return (
    <Card className="flex flex-col h-[520px]">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3 shrink-0">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
            <Lock className="h-4 w-4 text-primary" />
          </div>
          <CardTitle className="text-lg font-medium">IPSec</CardTitle>
        </div>
        <div className="flex items-center gap-1.5">
          <Button
            variant={autoRefresh ? "default" : "outline"}
            size="sm"
            onClick={() => setAutoRefresh((v) => !v)}
            title={autoRefresh ? `Live via dashboard stream (${sseStatus})` : "Paused"}
          >
            <RefreshCw className={`h-4 w-4 mr-1 ${autoRefresh && sseStatus === "connected" ? "animate-spin" : ""}`} />
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
                      <span>{n === 1 ? "Small (1 column)" : n === 2 ? "Medium (2 columns)" : "Large (3 columns)"}</span>
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

      {/* summary stat bar */}
      {hasTunnels && (
        <div className="flex items-center gap-5 border-y bg-muted/30 px-4 py-2 shrink-0">
          <StatPill label="Up" value={status!.up} tone="up" />
          <StatPill label="Down" value={status!.down} tone="down" />
          <StatPill label="Total" value={status!.total} tone="total" />
        </div>
      )}

      <CardContent className="flex flex-col flex-1 min-h-0 p-0">
        {loading ? (
          <div className="px-4 py-6 text-center text-muted-foreground text-sm">Loading…</div>
        ) : !hasTunnels ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 px-6 text-center text-sm text-muted-foreground">
            <ShieldOff className="h-8 w-8 opacity-40" />
            No active IPSec tunnels.
          </div>
        ) : (
          <div className="flex-1 min-h-0 overflow-y-auto">
            {status!.tunnels.map((t, i) => (
              <TunnelRow key={`${t.name ?? "tunnel"}-${i}`} tunnel={t} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
