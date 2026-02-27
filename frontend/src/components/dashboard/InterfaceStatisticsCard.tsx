"use client";

import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  X,
  Network,
  RefreshCw,
  Settings,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  AlertTriangle,
  ArrowDown,
  ArrowUp,
} from "lucide-react";
import { InterfaceCounter } from "@/lib/api/show";
import { getInterfaceType, formatBytes } from "@/lib/utils";
import { useDashboardData } from "@/contexts/DashboardDataContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ethernetService } from "@/lib/api/ethernet";

// ============================================================================
// Types & Constants
// ============================================================================

interface InterfaceWithType extends InterfaceCounter {
  type: string;
  description?: string;
  vifs?: InterfaceWithType[];
  isVif?: boolean;
  parentInterface?: string;
}

type SortKey = "interface" | "rx_bytes" | "tx_bytes";

interface InterfaceStatisticsCardProps {
  onRemove?: () => void;
  span?: number;
  onSpanChange?: (newSpan: number) => void;
  config?: Record<string, unknown>;
  onConfigChange?: (config: Record<string, unknown>) => void;
}

const PAGE_SIZE = 8;

const TYPE_META: Record<string, { abbr: string; color: string }> = {
  "Physical (Ethernet)":  { abbr: "ETH",   color: "bg-blue-500" },
  Wireless:               { abbr: "WiFi",   color: "bg-purple-500" },
  Loopback:               { abbr: "LO",     color: "bg-gray-400" },
  "VPN (WireGuard)":      { abbr: "WG",     color: "bg-green-500" },
  "VPN (Virtual Tunnel)": { abbr: "VTI",    color: "bg-emerald-500" },
  "VPN (Tunnel)":         { abbr: "TUN",    color: "bg-teal-500" },
  "VLAN (Virtual)":       { abbr: "VLAN",   color: "bg-orange-500" },
  "VLAN (Subinterface)":  { abbr: "VIF",    color: "bg-yellow-500" },
  Bridge:                 { abbr: "BR",     color: "bg-cyan-500" },
  PPPoE:                  { abbr: "PPPoE",  color: "bg-pink-500" },
  Bonding:                { abbr: "BOND",   color: "bg-indigo-500" },
  Dummy:                  { abbr: "DUM",    color: "bg-stone-400" },
  "GRE Tunnel":           { abbr: "GRE",    color: "bg-lime-500" },
  "IPIP Tunnel":          { abbr: "IPIP",   color: "bg-amber-500" },
  "SIT Tunnel":           { abbr: "SIT",    color: "bg-rose-500" },
  Other:                  { abbr: "?",      color: "bg-slate-400" },
};

// ============================================================================
// Sub-components
// ============================================================================

function TypePill({ type }: { type: string }) {
  const meta = TYPE_META[type] ?? { abbr: "?", color: "bg-slate-400" };
  return (
    <span
      className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold text-white shrink-0 ${meta.color}`}
      title={type}
    >
      {meta.abbr}
    </span>
  );
}

function TrafficBars({
  rxBytes,
  txBytes,
  rxPackets,
  txPackets,
  maxRx,
  maxTx,
}: {
  rxBytes: number;
  txBytes: number;
  rxPackets: number;
  txPackets: number;
  maxRx: number;
  maxTx: number;
}) {
  const rxPct = maxRx > 0 ? Math.max((rxBytes / maxRx) * 100, rxBytes > 0 ? 2 : 0) : 0;
  const txPct = maxTx > 0 ? Math.max((txBytes / maxTx) * 100, txBytes > 0 ? 2 : 0) : 0;

  return (
    <div
      className="flex-1 min-w-0 space-y-1"
      title={`RX: ${formatBytes(rxBytes)} / ${rxPackets.toLocaleString()} pkts\nTX: ${formatBytes(txBytes)} / ${txPackets.toLocaleString()} pkts`}
    >
      <div className="flex items-center gap-1.5">
        <ArrowDown className="h-3 w-3 text-blue-500 shrink-0" />
        <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-blue-500 rounded-full transition-all duration-300"
            style={{ width: `${rxPct}%` }}
          />
        </div>
        <span className="text-[10px] text-muted-foreground w-14 text-right shrink-0 tabular-nums">
          {formatBytes(rxBytes)}
        </span>
      </div>
      <div className="flex items-center gap-1.5">
        <ArrowUp className="h-3 w-3 text-orange-500 shrink-0" />
        <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-orange-500 rounded-full transition-all duration-300"
            style={{ width: `${txPct}%` }}
          />
        </div>
        <span className="text-[10px] text-muted-foreground w-14 text-right shrink-0 tabular-nums">
          {formatBytes(txBytes)}
        </span>
      </div>
    </div>
  );
}

interface IfaceRowProps {
  iface: InterfaceWithType;
  expanded: boolean;
  onToggle: () => void;
  maxRx: number;
  maxTx: number;
  indent?: boolean;
}

function IfaceRow({ iface, expanded, onToggle, maxRx, maxTx, indent = false }: IfaceRowProps) {
  const hasVifs = !indent && (iface.vifs?.length ?? 0) > 0;
  const errors = iface.rx_errors + iface.tx_errors + iface.rx_dropped + iface.tx_dropped;

  return (
    <>
      <div
        className={`flex items-center gap-2 px-3 py-2 border-b last:border-0 hover:bg-muted/30 transition-colors min-w-0 ${
          indent ? "pl-9 bg-muted/5" : ""
        }`}
      >
        {/* Expand toggle */}
        <button
          className={`h-4 w-4 shrink-0 flex items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-muted ${
            !hasVifs ? "invisible pointer-events-none" : ""
          }`}
          onClick={hasVifs ? onToggle : undefined}
          aria-expanded={hasVifs ? expanded : undefined}
        >
          {hasVifs &&
            (expanded ? (
              <ChevronDown className="h-3 w-3" />
            ) : (
              <ChevronRight className="h-3 w-3" />
            ))}
        </button>

        {/* Name + optional description */}
        <div className="w-28 shrink-0 min-w-0">
          <p
            className="text-sm font-mono font-medium leading-tight truncate"
            title={iface.interface}
          >
            {iface.interface}
          </p>
          {iface.description && (
            <p
              className="text-[10px] text-muted-foreground leading-tight truncate"
              title={iface.description}
            >
              {iface.description}
            </p>
          )}
        </div>

        {/* Type pill */}
        <TypePill type={iface.type} />

        {/* Traffic bars */}
        <TrafficBars
          rxBytes={iface.rx_bytes}
          txBytes={iface.tx_bytes}
          rxPackets={iface.rx_packets}
          txPackets={iface.tx_packets}
          maxRx={maxRx}
          maxTx={maxTx}
        />

        {/* VIF count + error badge */}
        <div className="w-16 shrink-0 flex items-center justify-end gap-1">
          {hasVifs && (
            <Badge variant="secondary" className="text-[10px] h-4 px-1 font-normal">
              +{iface.vifs!.length}
            </Badge>
          )}
          {errors > 0 && (
            <Badge
              variant="destructive"
              className="text-[10px] h-4 px-1"
              title={`Dropped: ${iface.rx_dropped + iface.tx_dropped} · Errors: ${iface.rx_errors + iface.tx_errors}`}
            >
              <AlertTriangle className="h-2 w-2 mr-0.5" />
              {errors}
            </Badge>
          )}
        </div>
      </div>

      {/* VIF children */}
      {hasVifs &&
        expanded &&
        iface.vifs!.map((vif) => (
          <IfaceRow
            key={vif.interface}
            iface={vif}
            expanded={false}
            onToggle={() => {}}
            maxRx={maxRx}
            maxTx={maxTx}
            indent
          />
        ))}
    </>
  );
}

// ============================================================================
// Helpers
// ============================================================================

const parseInterfaceName = (name: string) => {
  const [parentName, vlanId] = name.split(".");
  return { parentName, vlanId, isVif: !!vlanId && !isNaN(parseInt(vlanId)) };
};

// ============================================================================
// Main Component
// ============================================================================

export function InterfaceStatisticsCard({
  onRemove,
  span = 1,
  onSpanChange,
}: InterfaceStatisticsCardProps) {
  const [interfaces, setInterfaces] = useState<InterfaceWithType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState("");
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [sortKey, setSortKey] = useState<SortKey>("interface");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(0);

  const { status: sseStatus, data: sseData, error: sseError } = useDashboardData();
  const ethernetConfigRef = useRef<Awaited<ReturnType<typeof ethernetService.getConfig>> | null>(null);

  useEffect(() => {
    ethernetService
      .getConfig()
      .then((cfg) => { ethernetConfigRef.current = cfg; })
      .catch(() => {});
  }, []);

  const buildGroupedInterfaces = (raw: InterfaceCounter[]): InterfaceWithType[] => {
    const cfg = ethernetConfigRef.current;

    const all = raw.map((iface) => {
      const { parentName, vlanId, isVif } = parseInterfaceName(iface.interface);
      let description: string | undefined;

      const direct = cfg?.interfaces?.find((i) => i.name === iface.interface);
      if (direct) {
        description = direct.description ?? undefined;
      } else if (isVif && parentName) {
        const parent = cfg?.interfaces?.find((i) => i.name === parentName);
        const vif = parent?.vif?.find((v) => v.vlan_id === vlanId);
        description = vif?.description ?? undefined;
      }

      return {
        ...iface,
        type: getInterfaceType(iface.interface),
        description,
        isVif,
        parentInterface: isVif ? parentName : undefined,
      };
    });

    const byName = new Map<string, InterfaceWithType>();
    const vifs: InterfaceWithType[] = [];

    all.forEach((iface) => {
      if (iface.isVif && iface.parentInterface) {
        vifs.push(iface);
      } else {
        byName.set(iface.interface, { ...iface, vifs: [] });
      }
    });

    vifs.forEach((vif) => {
      const parent = byName.get(vif.parentInterface!);
      if (parent) parent.vifs!.push(vif);
      else byName.set(vif.interface, { ...vif, vifs: [] });
    });

    return Array.from(byName.values())
      .map((i) => ({
        ...i,
        vifs: i.vifs?.sort((a, b) => a.interface.localeCompare(b.interface)),
      }))
      .sort((a, b) => a.interface.localeCompare(b.interface));
  };

  useEffect(() => {
    if (!sseData.interfaceCounters || !autoRefresh) return;
    setInterfaces(buildGroupedInterfaces(sseData.interfaceCounters.interfaces));
    setLoading(false);
    setError(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sseData.interfaceCounters, autoRefresh]);

  useEffect(() => {
    if (sseError) { setError(sseError); setLoading(false); }
  }, [sseError]);

  // Reset to first page when filter changes
  useEffect(() => { setCurrentPage(0); }, [filter]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir(key === "interface" ? "asc" : "desc");
    }
    setCurrentPage(0);
  };

  const toggleExpand = (name: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  // Scale bars relative to the full (unfiltered) interface set
  const maxRx = Math.max(...interfaces.map((i) => i.rx_bytes), 1);
  const maxTx = Math.max(...interfaces.map((i) => i.tx_bytes), 1);

  const filtered = interfaces
    .filter((i) => {
      if (!filter) return true;
      const q = filter.toLowerCase();
      return (
        i.interface.toLowerCase().includes(q) ||
        i.description?.toLowerCase().includes(q) ||
        i.vifs?.some((v) => v.interface.toLowerCase().includes(q))
      );
    })
    .sort((a, b) => {
      let av: string | number, bv: string | number;
      if (sortKey === "interface") { av = a.interface; bv = b.interface; }
      else if (sortKey === "rx_bytes") { av = a.rx_bytes; bv = b.rx_bytes; }
      else { av = a.tx_bytes; bv = b.tx_bytes; }

      if (typeof av === "string") {
        return sortDir === "asc"
          ? av.localeCompare(bv as string)
          : (bv as string).localeCompare(av);
      }
      return sortDir === "asc" ? av - (bv as number) : (bv as number) - av;
    });

  const pageCount = Math.ceil(filtered.length / PAGE_SIZE);
  const paged = filtered.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE);
  const isConnected = sseStatus === "connected";

  return (
    <Card className="flex flex-col h-[520px]">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3 shrink-0">
        <div className="flex items-center gap-2">
          <Network className="h-5 w-5 text-primary" />
          <CardTitle className="text-lg font-medium">Interface Statistics</CardTitle>
        </div>
        <div className="flex items-center gap-1.5">
          <Input
            placeholder="Filter..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="h-7 w-28 text-xs"
          />
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

      <CardContent className="flex flex-col flex-1 min-h-0 p-0">
        {error ? (
          <div className="px-4 py-6 text-destructive text-sm text-center">{error}</div>
        ) : loading ? (
          <div className="px-4 py-6 text-center text-muted-foreground text-sm">Connecting...</div>
        ) : (
          <>
            {/* Sort + count bar — pinned */}
            <div className="flex items-center gap-2 px-3 py-1.5 border-b border-t bg-muted/20 text-xs shrink-0">
              <span className="text-muted-foreground shrink-0">Sort:</span>
              {(["interface", "rx_bytes", "tx_bytes"] as SortKey[]).map((key) => {
                const labels: Record<SortKey, string> = {
                  interface: "Name",
                  rx_bytes: "↓ RX",
                  tx_bytes: "↑ TX",
                };
                const active = sortKey === key;
                const activeColor =
                  key === "rx_bytes"
                    ? "bg-blue-500 text-white"
                    : key === "tx_bytes"
                    ? "bg-orange-500 text-white"
                    : "bg-primary text-primary-foreground";
                return (
                  <button
                    key={key}
                    onClick={() => handleSort(key)}
                    className={`px-2 py-0.5 rounded font-medium transition-colors ${
                      active
                        ? activeColor
                        : "bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {labels[key]} {active && (sortDir === "asc" ? "↑" : "↓")}
                  </button>
                );
              })}
              <div className="flex-1" />
              <span className="text-muted-foreground">
                {filtered.length} interface{filtered.length !== 1 ? "s" : ""}
              </span>
            </div>

            {/* Interface rows — scrollable */}
            <div className="flex-1 min-h-0 overflow-y-auto">
              {paged.length === 0 ? (
                <div className="px-4 py-6 text-center text-muted-foreground text-sm">
                  {filter ? `No interfaces matching "${filter}"` : "No interfaces"}
                </div>
              ) : (
                paged.map((iface) => (
                  <IfaceRow
                    key={iface.interface}
                    iface={iface}
                    expanded={expanded.has(iface.interface)}
                    onToggle={() => toggleExpand(iface.interface)}
                    maxRx={maxRx}
                    maxTx={maxTx}
                  />
                ))
              )}
            </div>

            {/* Pagination — pinned at bottom */}
            {pageCount > 1 && (
              <div className="flex items-center justify-between px-3 py-2 border-t text-xs text-muted-foreground shrink-0">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-xs"
                  disabled={currentPage === 0}
                  onClick={() => setCurrentPage((p) => p - 1)}
                >
                  <ChevronLeft className="h-3 w-3 mr-1" />
                  Prev
                </Button>
                <span>
                  Page {currentPage + 1} of {pageCount}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-xs"
                  disabled={currentPage === pageCount - 1}
                  onClick={() => setCurrentPage((p) => p + 1)}
                >
                  Next
                  <ChevronRight className="h-3 w-3 ml-1" />
                </Button>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
