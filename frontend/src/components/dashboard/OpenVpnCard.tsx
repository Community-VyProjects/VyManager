"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  X,
  ShieldCheck,
  RefreshCw,
  ArrowDown,
  ArrowUp,
  Clock,
} from "lucide-react";
import { CardSizeMenu } from "@/components/dashboard/CardSizeMenu";
import { OpenVpnStatus, OpenVpnTunnel } from "@/lib/api/openvpn";
import { useDashboardData } from "@/contexts/DashboardDataContext";

interface OpenVpnCardProps {
  onRemove?: () => void;
  span?: number;
  onSpanChange?: (newSpan: number) => void;
  height?: number;
  onHeightChange?: (newHeight: number) => void;
  config?: Record<string, unknown>;
  onConfigChange?: (config: Record<string, unknown>) => void;
}

function StateBadge({ state }: { state: string | null }) {
  const up = (state ?? "").toUpperCase() === "UP";
  return (
    <Badge
      variant="outline"
      className={`text-[10px] h-4 px-1 font-medium ${
        up
          ? "border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
          : "border-muted-foreground/30 text-muted-foreground"
      }`}
    >
      {state ?? "—"}
    </Badge>
  );
}

function ClientRow({ client }: { client: OpenVpnTunnel["clients"][number] }) {
  const remote = client.remote_host
    ? `${client.remote_host}${client.remote_port ? `:${client.remote_port}` : ""}`
    : null;
  return (
    <div className="flex items-center gap-2 px-3 py-1.5 pl-9 text-xs border-b last:border-0 bg-muted/5">
      <span className="font-mono font-medium truncate w-24 shrink-0" title={client.name ?? undefined}>
        {client.name || "—"}
      </span>
      <div className="flex-1 min-w-0 text-muted-foreground truncate">
        {remote && <span className="font-mono">{remote}</span>}
        {client.tunnel && client.tunnel !== "N/A" && (
          <span className="font-mono"> → {client.tunnel}</span>
        )}
      </div>
      <span className="flex items-center gap-0.5 shrink-0 tabular-nums" title="received">
        <ArrowDown className="h-3 w-3 text-blue-500" />
        {client.rx_bytes || "0"}
      </span>
      <span className="flex items-center gap-0.5 shrink-0 tabular-nums" title="sent">
        <ArrowUp className="h-3 w-3 text-orange-500" />
        {client.tx_bytes || "0"}
      </span>
    </div>
  );
}

function TunnelGroup({ title, tunnels }: { title: string; tunnels: OpenVpnTunnel[] }) {
  if (tunnels.length === 0) return null;
  return (
    <div className="border-b last:border-0">
      <div className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground bg-muted/20 border-b">
        {title}
      </div>
      {tunnels.map((t) => {
        const localEndpoint = `${t.local_host || ""}${t.local_port ? `:${t.local_port}` : ""}`;
        return (
          <div key={`${t.mode}-${t.interface}`}>
            <div className="flex items-center gap-2 px-3 py-2 text-sm border-b last:border-0">
              <span className="font-mono font-medium shrink-0">{t.interface}</span>
              <StateBadge state={t.state} />
              {localEndpoint && <span className="text-xs text-muted-foreground font-mono shrink-0">{localEndpoint}</span>}
              {t.description && (
                <span className="text-xs text-muted-foreground truncate" title={t.description}>
                  {t.description}
                </span>
              )}
              <div className="flex-1" />
              {t.mode === "server" && (
                <span className="text-[11px] text-muted-foreground shrink-0">
                  {t.clients.length} {t.clients.length === 1 ? "client" : "clients"}
                </span>
              )}
              {t.mode !== "server" && t.clients[0]?.online_since && t.clients[0].online_since !== "N/A" && (
                <span className="flex items-center gap-1 text-[11px] text-muted-foreground shrink-0">
                  <Clock className="h-3 w-3" />
                  {t.clients[0].online_since}
                </span>
              )}
            </div>
            {t.clients.map((c, i) => (
              <ClientRow key={`${t.interface}-${c.name ?? i}-${i}`} client={c} />
            ))}
          </div>
        );
      })}
    </div>
  );
}

export function OpenVpnCard({ onRemove, span = 1, onSpanChange, height, onHeightChange }: OpenVpnCardProps) {
  const [autoRefresh, setAutoRefresh] = useState(true);
  const { status: sseStatus, data: sseData } = useDashboardData();
  // Snapshot the stream so "Paused" freezes the displayed status.
  const [snapshot, setSnapshot] = useState<OpenVpnStatus | null>(null);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- freeze the last SSE snapshot for the paused view
    if (autoRefresh && sseData.openvpnStatus) setSnapshot(sseData.openvpnStatus);
  }, [autoRefresh, sseData.openvpnStatus]);

  const status = snapshot;
  const loading = status === null;
  const total = status
    ? status.servers.length + status.clients.length + status.site_to_site.length
    : 0;

  return (
    <Card className="flex flex-col h-full">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3 shrink-0">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-primary" />
          <CardTitle className="text-lg font-medium">OpenVPN</CardTitle>
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
        ) : total === 0 ? (
          <div className="flex flex-1 items-center justify-center px-6 text-center text-sm text-muted-foreground">
            No OpenVPN tunnels configured.
          </div>
        ) : (
          <div className="flex-1 min-h-0 overflow-y-auto">
            <TunnelGroup title="Servers" tunnels={status!.servers} />
            <TunnelGroup title="Clients" tunnels={status!.clients} />
            <TunnelGroup title="Site-to-Site" tunnels={status!.site_to_site} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
