"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { X, Network, RefreshCw, Settings, Clock } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { VrrpStatusData, VrrpGroupData } from "@/hooks/useDashboardSSE";
import { useDashboardData } from "@/contexts/DashboardDataContext";

interface VrrpStatusCardProps {
  onRemove?: () => void;
  span?: number;
  onSpanChange?: (newSpan: number) => void;
  config?: Record<string, unknown>;
  onConfigChange?: (config: Record<string, unknown>) => void;
}

function StateBadge({ state }: { state: string | null }) {
  const value = (state ?? "").toUpperCase();
  const styles: Record<string, string> = {
    MASTER: "border-emerald-500/30 text-emerald-600 dark:text-emerald-400",
    BACKUP: "border-blue-500/30 text-blue-600 dark:text-blue-400",
    FAULT: "border-red-500/30 text-red-600 dark:text-red-400",
  };
  return (
    <Badge
      variant="outline"
      className={`text-[10px] h-4 px-1 font-semibold tracking-wide ${
        styles[value] ?? "border-muted-foreground/30 text-muted-foreground"
      }`}
    >
      {state ?? "—"}
    </Badge>
  );
}

function GroupRow({ group }: { group: VrrpGroupData }) {
  return (
    <div className="flex items-center gap-2 px-3 py-2 text-sm border-b last:border-0">
      <span className="font-mono font-medium truncate shrink-0 max-w-[10rem]" title={group.name}>
        {group.name}
      </span>
      <StateBadge state={group.state} />
      {group.interface && (
        <span className="text-xs text-muted-foreground font-mono shrink-0">
          {group.interface}
          {group.vrid != null && <span className="opacity-60"> · vrid {group.vrid}</span>}
        </span>
      )}
      <div className="flex-1" />
      {group.priority != null && (
        <span className="text-[11px] text-muted-foreground shrink-0 tabular-nums" title="priority">
          prio {group.priority}
        </span>
      )}
      {group.last_transition && (
        <span className="flex items-center gap-1 text-[11px] text-muted-foreground shrink-0" title="last transition">
          <Clock className="h-3 w-3" />
          {group.last_transition}
        </span>
      )}
    </div>
  );
}

export function VrrpStatusCard({ onRemove, span = 1, onSpanChange }: VrrpStatusCardProps) {
  const [autoRefresh, setAutoRefresh] = useState(true);
  const { status: sseStatus, data: sseData } = useDashboardData();
  // Snapshot the stream so "Paused" freezes the displayed status.
  const [snapshot, setSnapshot] = useState<VrrpStatusData | null>(null);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- freeze the last SSE snapshot for the paused view
    if (autoRefresh && sseData.vrrpStatus) setSnapshot(sseData.vrrpStatus);
  }, [autoRefresh, sseData.vrrpStatus]);

  const status = snapshot;
  const loading = status === null;
  const groups = status?.groups ?? [];

  return (
    <Card className="flex flex-col h-[520px]">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3 shrink-0">
        <div className="flex items-center gap-2">
          <Network className="h-5 w-5 text-primary" />
          <CardTitle className="text-lg font-medium">VRRP / High Availability</CardTitle>
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

      <CardContent className="flex flex-col flex-1 min-h-0 p-0">
        {loading ? (
          <div className="px-4 py-6 text-center text-muted-foreground text-sm">Loading…</div>
        ) : groups.length === 0 ? (
          <div className="flex flex-1 items-center justify-center px-6 text-center text-sm text-muted-foreground">
            No active VRRP groups.
          </div>
        ) : (
          <div className="flex-1 min-h-0 overflow-y-auto">
            {groups.map((g) => (
              <GroupRow key={`${g.name}-${g.interface ?? ""}-${g.vrid ?? ""}`} group={g} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
