"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { X, Route, RefreshCw, Clock, ArrowDownToLine, ArrowUpFromLine } from "lucide-react";
import { CardSizeMenu } from "@/components/dashboard/CardSizeMenu";
import { BgpStatusData, BgpAddressFamilyData, BgpPeerData } from "@/hooks/useDashboardSSE";
import { useDashboardData } from "@/contexts/DashboardDataContext";

interface BgpStatusCardProps {
  onRemove?: () => void;
  span?: number;
  onSpanChange?: (newSpan: number) => void;
  height?: number;
  onHeightChange?: (newHeight: number) => void;
  config?: Record<string, unknown>;
  onConfigChange?: (config: Record<string, unknown>) => void;
}

function StateBadge({ state, established }: { state: string | null; established: boolean }) {
  const value = state ?? "—";
  // Established = healthy; Idle = down; everything else (Active/Connect/OpenSent/
  // OpenConfirm) is a transient mid-handshake state.
  const style = established
    ? "border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
    : (state ?? "").toLowerCase() === "idle"
    ? "border-red-500/30 text-red-600 dark:text-red-400"
    : "border-amber-500/30 text-amber-600 dark:text-amber-400";
  return (
    <Badge
      variant="outline"
      className={`text-[10px] h-4 px-1 font-semibold tracking-wide ${style}`}
    >
      {value}
    </Badge>
  );
}

function PeerRow({ peer }: { peer: BgpPeerData }) {
  return (
    <div className="flex items-center gap-2 px-3 py-2 text-sm border-b last:border-0">
      <span className="font-mono font-medium truncate shrink-0 max-w-[11rem]" title={peer.neighbor}>
        {peer.neighbor}
      </span>
      <StateBadge state={peer.state} established={peer.established} />
      {peer.remote_as != null && (
        <span className="text-xs text-muted-foreground font-mono shrink-0" title="remote AS">
          AS{peer.remote_as}
        </span>
      )}
      <div className="flex-1" />
      {peer.established && (
        <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground shrink-0 tabular-nums" title="prefixes received / sent">
          <span className="flex items-center gap-0.5">
            <ArrowDownToLine className="h-3 w-3" />
            {peer.pfx_rcd ?? 0}
          </span>
          <span className="flex items-center gap-0.5">
            <ArrowUpFromLine className="h-3 w-3" />
            {peer.pfx_snt ?? 0}
          </span>
        </span>
      )}
      {peer.uptime && (
        <span className="flex items-center gap-1 text-[11px] text-muted-foreground shrink-0" title="uptime">
          <Clock className="h-3 w-3" />
          {peer.uptime}
        </span>
      )}
    </div>
  );
}

function FamilySection({ family }: { family: BgpAddressFamilyData }) {
  return (
    <div>
      <div className="flex items-center gap-2 px-3 py-1.5 bg-muted/40 border-b text-[11px] text-muted-foreground sticky top-0">
        <span className="font-semibold tracking-wide uppercase">{family.label}</span>
        {family.local_as != null && <span className="font-mono">local AS{family.local_as}</span>}
        {family.router_id && <span className="font-mono opacity-70">id {family.router_id}</span>}
        <div className="flex-1" />
        <span className="tabular-nums">{family.peers.length} peer{family.peers.length === 1 ? "" : "s"}</span>
      </div>
      {family.peers.map((p) => (
        <PeerRow key={`${family.afi}-${p.neighbor}`} peer={p} />
      ))}
    </div>
  );
}

export function BgpStatusCard({ onRemove, span = 1, onSpanChange, height, onHeightChange }: BgpStatusCardProps) {
  const [autoRefresh, setAutoRefresh] = useState(true);
  const { status: sseStatus, data: sseData } = useDashboardData();
  // Snapshot the stream so "Paused" freezes the displayed status.
  const [snapshot, setSnapshot] = useState<BgpStatusData | null>(null);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- freeze the last SSE snapshot for the paused view
    if (autoRefresh && sseData.bgpStatus) setSnapshot(sseData.bgpStatus);
  }, [autoRefresh, sseData.bgpStatus]);

  const status = snapshot;
  const loading = status === null;
  const families = status?.address_families ?? [];

  return (
    <Card className="flex flex-col h-full">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3 shrink-0">
        <div className="flex items-center gap-2">
          <Route className="h-5 w-5 text-primary" />
          <CardTitle className="text-lg font-medium">BGP Sessions</CardTitle>
          {status && status.total_peers > 0 && (
            <Badge variant="outline" className="text-[10px] h-5 px-1.5 font-medium">
              {status.established_peers}/{status.total_peers} up
            </Badge>
          )}
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
        ) : families.length === 0 ? (
          <div className="flex flex-1 items-center justify-center px-6 text-center text-sm text-muted-foreground">
            No BGP neighbors.
          </div>
        ) : (
          <div className="flex-1 min-h-0 overflow-y-auto">
            {families.map((f) => (
              <FamilySection key={f.afi} family={f} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
