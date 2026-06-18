"use client";

import { useState, useEffect, useRef } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  X,
  TrendingUp,
  RefreshCw,
  Settings,
  ArrowDown,
  ArrowUp,
  Network,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import Link from "next/link";
import { useDashboardData } from "@/contexts/DashboardDataContext";
import { ethernetService } from "@/lib/api/ethernet";
import type { EthernetConfigResponse } from "@/lib/api/types/ethernet";

// ============================================================================
// Constants
// ============================================================================

/** Rolling window in milliseconds (2 minutes) */
const WINDOW_MS = 120_000;
/** Safety cap on stored points (prevents unbounded growth at very high sample rates) */
const MAX_POINTS = 1_000;
/** Number of recent samples to average for smoothing (reduces spiky readings) */
const SMOOTHING_WINDOW = 3;

// ============================================================================
// Types
// ============================================================================

interface SpeedPoint {
  /** Absolute timestamp (ms) when this sample was recorded */
  ts: number;
  /** Download speed in bits per second */
  rx: number;
  /** Upload speed in bits per second */
  tx: number;
}

interface PrevCounter {
  rx_bytes: number;
  tx_bytes: number;
  ts: number;
}

interface NetworkSpeedCardProps {
  onRemove?: () => void;
  span?: number;
  onSpanChange?: (newSpan: number) => void;
  config?: Record<string, unknown>;
  onConfigChange?: (config: Record<string, unknown>) => void;
}

// ============================================================================
// Helpers
// ============================================================================

function formatSpeed(bps: number): string {
  if (bps >= 1e9) return `${(bps / 1e9).toFixed(2)} Gbps`;
  if (bps >= 1e6) return `${(bps / 1e6).toFixed(2)} Mbps`;
  if (bps >= 1e3) return `${(bps / 1e3).toFixed(1)} Kbps`;
  return `${Math.round(bps)} bps`;
}

function xTickFormatter(secsAgo: number): string {
  if (secsAgo === 0) return "now";
  const abs = Math.abs(secsAgo);
  if (abs < 60) return `${abs}s`;
  const m = Math.floor(abs / 60);
  const s = abs % 60;
  return s ? `${m}m${s}s` : `${m}m`;
}

function yTickFormatter(bps: number): string {
  if (bps === 0) return "0";
  if (bps >= 1e9) return `${(bps / 1e9).toFixed(1)}G`;
  if (bps >= 1e6) return `${(bps / 1e6).toFixed(1)}M`;
  if (bps >= 1e3) return `${(bps / 1e3).toFixed(0)}K`;
  return `${Math.round(bps)}`;
}

// ============================================================================
// Custom Tooltip
// ============================================================================

interface TooltipPayloadEntry {
  dataKey: string;
  value: number;
  color: string;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipPayloadEntry[];
  label?: number;
}

function SpeedTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-background border rounded-lg shadow-lg px-3 py-2 text-xs space-y-1">
      <p className="text-muted-foreground font-medium mb-1">
        {typeof label === "number" ? xTickFormatter(label) : ""}
      </p>
      {payload.map((p) => (
        <div key={p.dataKey} className="flex items-center gap-2">
          <span
            className="inline-block h-2 w-2 rounded-full shrink-0"
            style={{ backgroundColor: p.color }}
          />
          <span className="text-muted-foreground">
            {p.dataKey === "rx" ? "↓ Download" : "↑ Upload"}:
          </span>
          <span className="font-semibold tabular-nums" style={{ color: p.color }}>
            {formatSpeed(p.value)}
          </span>
        </div>
      ))}
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function NetworkSpeedCard({
  onRemove,
  span = 1,
  onSpanChange,
  config,
  onConfigChange,
}: NetworkSpeedCardProps) {
  const [autoRefresh, setAutoRefresh] = useState(true);
  const { status: sseStatus, data: sseData } = useDashboardData();
  const [ethernetConfig, setEthernetConfig] = useState<EthernetConfigResponse | null>(null);

  useEffect(() => {
    ethernetService.getConfig().then((cfg) => { setEthernetConfig(cfg); }).catch(() => {});
  }, []);

  const selectedIface = (config?.interface as string) || "";
  const [history, setHistory] = useState<SpeedPoint[]>([]);
  const prevRef = useRef<PrevCounter | null>(null);

  const isConnected = sseStatus === "connected";

  // Build sorted list of available interfaces from SSE data
  const availableInterfaces = (
    sseData.interfaceCounters?.interfaces.map((i) => i.interface) ?? []
  ).sort();

  // Look up a description for an interface name from the ethernet config
  const getIfaceDescription = (name: string): string | undefined => {
    const cfg = ethernetConfig;
    if (!cfg) return undefined;
    const direct = cfg.interfaces?.find((i) => i.name === name);
    if (direct?.description) return direct.description;
    const [parentName, vlanId] = name.split(".");
    if (vlanId && !isNaN(parseInt(vlanId))) {
      const parent = cfg.interfaces?.find((i) => i.name === parentName);
      const vif = parent?.vif?.find((v) => v.vlan_id === vlanId);
      if (vif?.description) return vif.description;
    }
    return undefined;
  };

  const interfaceDescription = selectedIface ? getIfaceDescription(selectedIface) : undefined;

  // Clear history when selected interface changes
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reset chart history when the selected interface changes
    setHistory([]);
    prevRef.current = null;
    rawBufferRef.current = [];
  }, [selectedIface]);

  // Buffer of recent raw speed samples for smoothing
  const rawBufferRef = useRef<{ rx: number; tx: number }[]>([]);

  // Compute speed deltas on each SSE counter update
  useEffect(() => {
    if (!autoRefresh || !sseData.interfaceCounters || !selectedIface) return;

    const now = Date.now();
    const iface = sseData.interfaceCounters.interfaces.find(
      (i) => i.interface === selectedIface
    );
    if (!iface) return;

    const prev = prevRef.current;
    if (prev) {
      const elapsed = (now - prev.ts) / 1000;
      if (elapsed > 0.1) {
        const rxBps = Math.max(
          0,
          ((iface.rx_bytes - prev.rx_bytes) * 8) / elapsed
        );
        const txBps = Math.max(
          0,
          ((iface.tx_bytes - prev.tx_bytes) * 8) / elapsed
        );

        // Push raw sample and keep only the last SMOOTHING_WINDOW entries
        const buf = rawBufferRef.current;
        buf.push({ rx: rxBps, tx: txBps });
        if (buf.length > SMOOTHING_WINDOW) buf.shift();

        // Average over the buffer to smooth out spikes
        const smoothRx = buf.reduce((s, p) => s + p.rx, 0) / buf.length;
        const smoothTx = buf.reduce((s, p) => s + p.tx, 0) / buf.length;

        setHistory((h) => {
          const cutoff = now - WINDOW_MS;
          return [...h, { ts: now, rx: smoothRx, tx: smoothTx }]
            .filter((pt) => pt.ts >= cutoff)
            .slice(-MAX_POINTS);
        });
      }
    }

    prevRef.current = {
      rx_bytes: iface.rx_bytes,
      tx_bytes: iface.tx_bytes,
      ts: now,
    };
  }, [sseData.interfaceCounters, selectedIface, autoRefresh]);

  const latestPoint = history[history.length - 1];
  const currentRx = latestPoint?.rx ?? 0;
  const currentTx = latestPoint?.tx ?? 0;

  // Convert to chart-ready format: secsAgo relative to the latest sample's
  // timestamp (deterministic; avoids an impure Date.now() call during render).
  const renderNow = latestPoint?.ts ?? 0;
  const chartData = history.map((pt) => ({
    secsAgo: Math.round((pt.ts - renderNow) / 1000), // negative: e.g. -30 = 30s ago
    rx: pt.rx,
    tx: pt.tx,
  }));

  // Y axis domain: always at least 10 Kbps, 10% headroom above max
  const maxSpeed = Math.max(...history.map((p) => Math.max(p.rx, p.tx)), 0);
  const yMax = Math.max(maxSpeed * 1.1, 10_000);

  const isLoading = !sseData.interfaceCounters && sseStatus === "connecting";

  return (
    <Card className="flex flex-col h-[520px]">
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-3 shrink-0">
        <div className="flex flex-col min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary shrink-0" />
            <CardTitle className="text-lg font-medium shrink-0">Network Speed</CardTitle>

            {/* Interface selector — always visible, interactive when onConfigChange provided */}
            {onConfigChange ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-6 text-xs px-2 font-mono max-w-[120px] truncate"
                    title={selectedIface || "Select interface"}
                  >
                    <Network className="h-3 w-3 mr-1 shrink-0" />
                    <span className="truncate">
                      {selectedIface || "Select…"}
                    </span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  <DropdownMenuLabel>Select Interface</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {availableInterfaces.length === 0 ? (
                    <DropdownMenuItem disabled>No interfaces available</DropdownMenuItem>
                  ) : (
                    availableInterfaces.map((name) => {
                      const desc = getIfaceDescription(name);
                      return (
                        <DropdownMenuItem
                          key={name}
                          onClick={() =>
                            onConfigChange({ ...config, interface: name })
                          }
                        >
                          <div className="flex items-center justify-between w-full gap-4">
                            <div className="flex flex-col">
                              <span className="font-mono text-xs">{name}</span>
                              {desc && (
                                <span className="text-xs text-muted-foreground">{desc}</span>
                              )}
                            </div>
                            {selectedIface === name && (
                              <span className="text-primary shrink-0">✓</span>
                            )}
                          </div>
                        </DropdownMenuItem>
                      );
                    })
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            ) : selectedIface ? (
              <Link href="/network/interfaces">
                <Badge
                  variant="outline"
                  className="text-xs font-mono cursor-pointer hover:bg-accent hover:text-accent-foreground transition-colors"
                >
                  {selectedIface}
                </Badge>
              </Link>
            ) : null}
          </div>

          {/* Interface description */}
          {interfaceDescription && (
            <p
              className="text-xs text-muted-foreground truncate pl-7 mt-0.5"
              title={interfaceDescription}
            >
              {interfaceDescription}
            </p>
          )}
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
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
                        {n === 1
                          ? "Small (1 column)"
                          : n === 2
                          ? "Medium (2 columns)"
                          : "Large (3 columns)"}
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

      <CardContent className="flex flex-col flex-1 min-h-0 px-4 pb-4">
        {isLoading ? (
          <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
            Connecting...
          </div>
        ) : !selectedIface ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-2 text-center">
            <Network className="h-10 w-10 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">No interface selected</p>
            {onConfigChange ? (
              <p className="text-xs text-muted-foreground">
                Use the dropdown above to pick an interface
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">
                Enter edit mode to select an interface
              </p>
            )}
          </div>
        ) : (
          <>
            {/* Current speed stats */}
            <div className="flex items-center justify-between mb-3 shrink-0">
              <div className="flex items-center gap-1.5">
                <ArrowDown className="h-4 w-4 text-blue-500" />
                <span className="text-sm font-semibold tabular-nums text-blue-500">
                  {formatSpeed(currentRx)}
                </span>
                <span className="text-xs text-muted-foreground">down</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-muted-foreground">up</span>
                <span className="text-sm font-semibold tabular-nums text-orange-500">
                  {formatSpeed(currentTx)}
                </span>
                <ArrowUp className="h-4 w-4 text-orange-500" />
              </div>
            </div>

            {/* Chart — wrapper applies theme colors via CSS rules (SVG attrs can't resolve CSS vars) */}
            <div className="flex-1 min-h-0 [&_.recharts-text]:fill-muted-foreground [&_.recharts-cartesian-grid_line]:stroke-border">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={chartData}
                  margin={{ top: 4, right: 4, left: 8, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="rxGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.02} />
                    </linearGradient>
                    <linearGradient id="txGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f97316" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#f97316" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>

                  <CartesianGrid strokeDasharray="3 3" />

                  <XAxis
                    dataKey="secsAgo"
                    type="number"
                    domain={[-120, 0]}
                    ticks={[-120, -90, -60, -30, 0]}
                    tickFormatter={xTickFormatter}
                    tick={{ fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                  />

                  <YAxis
                    domain={[0, yMax]}
                    tickFormatter={yTickFormatter}
                    tick={{ fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                    width={44}
                  />

                  <Tooltip
                    content={<SpeedTooltip />}
                    cursor={{
                      stroke: "#94a3b8",
                      strokeWidth: 1,
                      strokeDasharray: "4 4",
                    }}
                  />

                  <Area
                    type="monotone"
                    dataKey="rx"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    fill="url(#rxGradient)"
                    dot={false}
                    activeDot={{ r: 3, strokeWidth: 0 }}
                    isAnimationActive={false}
                  />

                  <Area
                    type="monotone"
                    dataKey="tx"
                    stroke="#f97316"
                    strokeWidth={2}
                    fill="url(#txGradient)"
                    dot={false}
                    activeDot={{ r: 3, strokeWidth: 0 }}
                    isAnimationActive={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Legend */}
            <div className="flex items-center justify-center gap-4 mt-2 shrink-0">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span className="inline-block h-2.5 w-4 rounded-sm bg-blue-500 opacity-80" />
                Download (RX)
              </div>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span className="inline-block h-2.5 w-4 rounded-sm bg-orange-500 opacity-80" />
                Upload (TX)
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
