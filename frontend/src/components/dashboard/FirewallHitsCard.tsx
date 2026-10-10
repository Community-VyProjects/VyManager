"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { X, Flame, RefreshCw } from "lucide-react";
import { CardSizeMenu } from "@/components/dashboard/CardSizeMenu";
import { useDashboardData } from "@/contexts/DashboardDataContext";
import type { FirewallHitsData, FirewallHit } from "@/hooks/useDashboardSSE";
import { formatBytes, formatNumber } from "@/lib/utils";

interface FirewallHitsCardProps {
  onRemove?: () => void;
  span?: number;
  onSpanChange?: (newSpan: number) => void;
  height?: number;
  onHeightChange?: (newHeight: number) => void;
  config?: Record<string, unknown>;
  onConfigChange?: (config: Record<string, unknown>) => void;
}

function chainLabel(hit: FirewallHit): string {
  if (hit.custom) return hit.chain;
  return hit.chain === "prerouting_raw" ? "prerouting" : hit.chain;
}

function HitRow({ hit, rank }: { hit: FirewallHit; rank: number }) {
  return (
    <div className="flex items-center gap-2 px-3 py-2 text-sm border-b last:border-0">
      <span className="w-4 text-[11px] tabular-nums text-muted-foreground shrink-0">{rank}</span>
      <Badge variant="outline" className="text-[10px] h-4 px-1 font-mono uppercase shrink-0">
        {hit.family}
      </Badge>
      <span className="font-mono truncate" title={chainLabel(hit)}>
        {chainLabel(hit)}
      </span>
      <span className="font-mono text-xs text-muted-foreground shrink-0">
        {hit.rule === "default" ? "default" : `#${hit.rule}`}
      </span>
      <Badge variant="outline" className="text-[10px] h-4 px-1 uppercase shrink-0">
        {hit.action}
      </Badge>
      <div className="flex-1" />
      <span className="text-[11px] tabular-nums text-muted-foreground shrink-0" title={`${formatNumber(hit.bytes)} bytes`}>
        {formatBytes(hit.bytes)}
      </span>
      <span className="text-xs tabular-nums font-medium shrink-0 w-[5.5rem] text-right" title="packets">
        {formatNumber(hit.packets)}
      </span>
    </div>
  );
}

export function FirewallHitsCard({
  onRemove,
  span = 1,
  onSpanChange,
  height,
  onHeightChange,
}: FirewallHitsCardProps) {
  const [autoRefresh, setAutoRefresh] = useState(true);
  const { status: sseStatus, data: sseData } = useDashboardData();
  const [snapshot, setSnapshot] = useState<FirewallHitsData | null>(null);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- freeze the last SSE snapshot for the paused view
    if (autoRefresh && sseData.firewallHits) setSnapshot(sseData.firewallHits);
  }, [autoRefresh, sseData.firewallHits]);

  const status = snapshot;
  const hits = status?.hits ?? [];
  const loading = status === null;

  return (
    <Card className="flex flex-col h-full">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <Flame className="h-5 w-5 text-primary shrink-0" />
          <CardTitle className="text-lg font-medium truncate">Firewall Hits</CardTitle>
          {status && status.total > 0 && (
            <Badge variant="outline" className="text-[10px] h-5 px-1.5 font-medium shrink-0">
              {hits.length}{status.total > hits.length ? ` of ${status.total}` : ""}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
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
            <CardSizeMenu
              span={span}
              onSpanChange={onSpanChange}
              height={height}
              onHeightChange={onHeightChange}
            />
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
        ) : hits.length === 0 ? (
          <div className="flex flex-1 items-center justify-center px-6 text-center text-sm text-muted-foreground">
            No firewall hits yet.
          </div>
        ) : (
          <div className="flex-1 min-h-0 overflow-y-auto">
            <div className="flex items-center gap-2 px-3 py-1 text-[10px] uppercase tracking-wide text-muted-foreground border-b bg-muted/30 sticky top-0">
              <span className="w-4">#</span>
              <span className="flex-1">Rule</span>
              <span className="w-[5.5rem] text-right">Packets</span>
            </div>
            {hits.map((hit, index) => (
              <HitRow key={`${hit.family}-${hit.custom}-${hit.chain}-${hit.rule}`} hit={hit} rank={index + 1} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
