"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { X, Shield, RefreshCw, Settings } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useDashboardData } from "@/contexts/DashboardDataContext";
import { WireGuardPeerData, WireGuardInterfaceData } from "@/hooks/useDashboardSSE";

// ============================================================================
// Helpers
// ============================================================================

function formatHandshake(raw: string | null, seconds: number | null): string {
  if (!raw || raw.toLowerCase() === "(none)" || raw.toLowerCase() === "none") {
    return "Never";
  }
  if (seconds !== null && seconds < 30) return "Just now";
  // Strip trailing "ago" and normalise spacing
  return raw.replace(/\s*ago\s*$/i, "").trim();
}

function statusColor(status: WireGuardPeerData["status"]): string {
  switch (status) {
    case "connected": return "bg-green-500";
    case "idle":      return "bg-yellow-500";
    default:          return "bg-gray-400";
  }
}

function statusLabel(status: WireGuardPeerData["status"]): string {
  switch (status) {
    case "connected": return "Connected";
    case "idle":      return "Idle";
    default:          return "Never connected";
  }
}

// ============================================================================
// Sub-components
// ============================================================================

function PeerRow({ peer }: { peer: WireGuardPeerData }) {
  const allowedIps = peer.allowed_ips.join(", ") || "—";
  const handshake = formatHandshake(peer.latest_handshake, peer.latest_handshake_seconds);

  return (
    <div
      className="flex items-center gap-3 px-3 py-2 border-b last:border-0 hover:bg-muted/20 transition-colors min-w-0"
      title={[
        peer.endpoint ? `Endpoint: ${peer.endpoint}` : null,
        peer.transfer_rx ? `RX: ${peer.transfer_rx}` : null,
        peer.transfer_tx ? `TX: ${peer.transfer_tx}` : null,
        peer.public_key ? `Key: ${peer.public_key}` : null,
      ]
        .filter(Boolean)
        .join("\n")}
    >
      {/* Status dot */}
      <span
        className={`h-2 w-2 rounded-full shrink-0 ${statusColor(peer.status)}`}
        title={statusLabel(peer.status)}
      />

      {/* Peer name */}
      <span className="text-sm font-mono font-medium w-28 shrink-0 truncate" title={peer.name}>
        {peer.name}
      </span>

      {/* Allowed IPs */}
      <span
        className="flex-1 text-xs text-muted-foreground truncate min-w-0"
        title={allowedIps}
      >
        {allowedIps}
      </span>

      {/* Handshake time */}
      <span
        className={`text-xs shrink-0 tabular-nums ${
          peer.status === "connected"
            ? "text-green-600 dark:text-green-400"
            : peer.status === "idle"
            ? "text-yellow-600 dark:text-yellow-400"
            : "text-muted-foreground"
        }`}
      >
        {handshake}
      </span>
    </div>
  );
}

function InterfaceSection({ iface }: { iface: WireGuardInterfaceData }) {
  const connectedCount = iface.peers.filter((p) => p.status === "connected").length;

  return (
    <div className="border-b last:border-0">
      {/* Interface header */}
      <div className="flex items-center gap-2 px-3 py-2 bg-muted/30">
        <span className="text-sm font-semibold font-mono">{iface.name}</span>
        {iface.port && (
          <Badge variant="outline" className="text-[10px] h-4 px-1 font-normal">
            :{iface.port}
          </Badge>
        )}
        {iface.addresses.length > 0 && (
          <span className="text-xs text-muted-foreground truncate flex-1">
            {iface.addresses.join(", ")}
          </span>
        )}
        <Badge
          variant={connectedCount > 0 ? "default" : "secondary"}
          className="text-[10px] h-4 px-1.5 ml-auto shrink-0"
        >
          {connectedCount}/{iface.peers.length} up
        </Badge>
        {iface.disabled && (
          <Badge variant="destructive" className="text-[10px] h-4 px-1 shrink-0">
            disabled
          </Badge>
        )}
      </div>

      {/* Peer rows */}
      {iface.peers.length === 0 ? (
        <p className="px-3 py-2 text-xs text-muted-foreground italic">No peers configured</p>
      ) : (
        iface.peers.map((peer) => <PeerRow key={peer.name} peer={peer} />)
      )}
    </div>
  );
}

// ============================================================================
// Props
// ============================================================================

interface WireGuardPeersCardProps {
  onRemove?: () => void;
  span?: number;
  onSpanChange?: (newSpan: number) => void;
  config?: Record<string, unknown>;
}

// ============================================================================
// Main Component
// ============================================================================

export function WireGuardPeersCard({
  onRemove,
  span = 1,
  onSpanChange,
}: WireGuardPeersCardProps) {
  const [autoRefresh, setAutoRefresh] = useState(true);
  const { status: sseStatus, data: sseData } = useDashboardData();

  const data = autoRefresh ? sseData.wireguardPeers : null;
  const isConnected = sseStatus === "connected";
  const isLoading = !data && sseStatus === "connecting";

  const totalPeers = data?.interfaces.reduce((n, i) => n + i.peers.length, 0) ?? 0;
  const connectedPeers = data?.interfaces.reduce(
    (n, i) => n + i.peers.filter((p) => p.status === "connected").length,
    0
  ) ?? 0;

  return (
    <Card className="flex flex-col h-[520px]">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3 shrink-0">
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-primary" />
          <CardTitle className="text-lg font-medium">WireGuard Peers</CardTitle>
          {data && totalPeers > 0 && (
            <Badge
              variant={connectedPeers === totalPeers ? "default" : "secondary"}
              className="text-xs"
            >
              {connectedPeers}/{totalPeers}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          <Button
            variant={autoRefresh ? "default" : "outline"}
            size="sm"
            onClick={() => setAutoRefresh((v) => !v)}
            title={autoRefresh ? `Streaming (${sseStatus})` : "Paused"}
          >
            <RefreshCw
              className={`h-4 w-4 mr-1 ${autoRefresh && isConnected ? "animate-spin" : ""}`}
            />
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

      <CardContent className="flex-1 min-h-0 overflow-y-auto p-0">
        {isLoading ? (
          <div className="px-4 py-6 text-center text-muted-foreground text-sm">
            Connecting...
          </div>
        ) : !data ? (
          <div className="px-4 py-6 text-center text-muted-foreground text-sm">
            No data — paused or stream not yet received.
          </div>
        ) : data.interfaces.length === 0 ? (
          <div className="px-4 py-6 text-center text-muted-foreground text-sm">
            No WireGuard interfaces configured.
          </div>
        ) : (
          data.interfaces.map((iface) => (
            <InterfaceSection key={iface.name} iface={iface} />
          ))
        )}
      </CardContent>
    </Card>
  );
}
