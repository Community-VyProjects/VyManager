"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  X,
  Server,
  RefreshCw,
  Settings,
  MemoryStick,
  HardDrive,
  Activity,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useDashboardData } from "@/contexts/DashboardDataContext";
import { LoadData, DiskPartition } from "@/hooks/useDashboardSSE";

// ============================================================================
// Helpers
// ============================================================================

/** Parse a memory string like "15.54 GB" or "1.62 GB" → float (GB). */
function parseMemoryGB(s: string | null): number {
  if (!s) return 0;
  const m = s.match(/([\d.]+)/);
  return m ? parseFloat(m[1]) : 0;
}

/** Parse "20%" → 20 */
function parseDiskPercent(s: string): number {
  const m = s.match(/(\d+)/);
  return m ? parseInt(m[1], 10) : 0;
}

function loadBarColor(pct: number): string {
  if (pct < 60) return "bg-green-500";
  if (pct < 80) return "bg-yellow-500";
  return "bg-red-500";
}

function memoryBarColor(pct: number): string {
  if (pct < 70) return "bg-blue-500";
  if (pct < 90) return "bg-yellow-500";
  return "bg-red-500";
}

function diskBarColor(pct: number): string {
  if (pct < 70) return "bg-green-500";
  if (pct < 90) return "bg-yellow-500";
  return "bg-red-500";
}

/** show system storage returns only real disk entries — keep all non-empty ones. */
function filterRealDisks(partitions: DiskPartition[]): DiskPartition[] {
  return partitions.filter((p) => !!p.filesystem);
}

// ============================================================================
// Props
// ============================================================================

interface SystemInfoCardProps {
  onRemove?: () => void;
  span?: number;
  onSpanChange?: (newSpan: number) => void;
  config?: Record<string, unknown>;
}

// ============================================================================
// Component
// ============================================================================

export function SystemInfoCard({
  onRemove,
  span = 1,
  onSpanChange,
}: SystemInfoCardProps) {
  const [autoRefresh, setAutoRefresh] = useState(true);
  const { status: sseStatus, data: sseData } = useDashboardData();

  const info = autoRefresh ? sseData.systemInfo : null;
  const memory = info?.memory ?? { total: null, free: null, used: null };
  const version = info?.version ?? {};
  const disk = filterRealDisks(info?.disk ?? []);
  const load: LoadData = info?.load ?? { uptime: null, load_1min: null, load_5min: null, load_15min: null };

  // Memory percentage
  const usedGB = parseMemoryGB(memory.used);
  const totalGB = parseMemoryGB(memory.total);
  const memPct = totalGB > 0 ? (usedGB / totalGB) * 100 : 0;

  const isLoading = !info && sseStatus === "connecting";
  const isConnected = sseStatus === "connected";

  return (
    <Card className="flex flex-col h-[520px]">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4 shrink-0">
        <div className="flex items-center gap-2">
          <Server className="h-5 w-5 text-primary" />
          <CardTitle className="text-lg font-medium">System Information</CardTitle>
        </div>
        <div className="flex items-center gap-2">
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
                <DropdownMenuItem onClick={() => onSpanChange(1)}>
                  <div className="flex items-center justify-between w-full">
                    <span>Small (1 column)</span>
                    {span === 1 && <span className="ml-2 text-primary">✓</span>}
                  </div>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onSpanChange(2)}>
                  <div className="flex items-center justify-between w-full">
                    <span>Medium (2 columns)</span>
                    {span === 2 && <span className="ml-2 text-primary">✓</span>}
                  </div>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onSpanChange(3)}>
                  <div className="flex items-center justify-between w-full">
                    <span>Large (3 columns)</span>
                    {span === 3 && <span className="ml-2 text-primary">✓</span>}
                  </div>
                </DropdownMenuItem>
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

      <CardContent className="space-y-5 overflow-y-auto flex-1 min-h-0">
        {isLoading ? (
          <div className="text-center text-muted-foreground py-6 text-sm">
            Connecting...
          </div>
        ) : (
          <>
            {/* ── Version / Hardware ── */}
            {version.version && (
              <div className="space-y-2">
                <p className="text-base font-semibold text-primary leading-tight">
                  {version.version}
                </p>
                {(version.hardware_vendor || version.hardware_model) && (
                  <p className="text-sm text-muted-foreground">
                    {[version.hardware_vendor, version.hardware_model]
                      .filter(Boolean)
                      .join(" ")}
                  </p>
                )}
                {version.release_train && (
                  <div className="flex flex-wrap gap-1.5">
                    <Badge variant="secondary" className="text-xs">
                      {version.release_train}
                    </Badge>
                  </div>
                )}
                {version.built_on && (
                  <p className="text-xs text-muted-foreground">
                    Built: {version.built_on}
                  </p>
                )}
              </div>
            )}

            {/* ── Load Averages ── */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-1.5">
                  <Activity className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Load Average</span>
                </div>
                {load.uptime && (
                  <span className="text-xs text-muted-foreground">Uptime {load.uptime}</span>
                )}
              </div>
              {load.load_1min !== null ? (
                <div className="space-y-2">
                  {([
                    { label: "1 min",  value: load.load_1min },
                    { label: "5 min",  value: load.load_5min },
                    { label: "15 min", value: load.load_15min },
                  ] as { label: string; value: number | null }[]).map(({ label, value }) => (
                    <div key={label}>
                      <div className="flex justify-between text-xs text-muted-foreground mb-0.5">
                        <span>{label}</span>
                        <span className="font-medium text-foreground">{value ?? "—"}%</span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-1.5">
                        <div
                          className={`h-1.5 rounded-full transition-all ${loadBarColor(value ?? 0)}`}
                          style={{ width: `${Math.max(value ?? 0, 1)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground italic">No data</p>
              )}
            </div>

            {/* ── Memory ── */}
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5 mb-1">
                <MemoryStick className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Memory</span>
              </div>
              {memory.total ? (
                <>
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>
                      Used: <span className="text-foreground font-medium">{memory.used}</span>
                    </span>
                    <span className="font-medium">{memPct.toFixed(1)}%</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-1.5">
                    <div
                      className={`h-1.5 rounded-full transition-all ${memoryBarColor(memPct)}`}
                      style={{ width: `${Math.max(memPct, 1)}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Free: {memory.free}</span>
                    <span>Total: {memory.total}</span>
                  </div>
                </>
              ) : (
                <p className="text-xs text-muted-foreground italic">No data</p>
              )}
            </div>

            {/* ── Disk ── */}
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 mb-1">
                <HardDrive className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Disk Usage</span>
              </div>
              {disk.length === 0 ? (
                <p className="text-xs text-muted-foreground italic">No data</p>
              ) : (
                disk.map((p) => {
                  const pct = parseDiskPercent(p.use_percent);
                  return (
                    <div key={p.filesystem} className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="font-medium truncate max-w-[120px]" title={p.filesystem}>
                          {p.filesystem}
                        </span>
                        <span className="text-muted-foreground">
                          {p.used} / {p.size} ({p.use_percent})
                        </span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-1.5">
                        <div
                          className={`h-1.5 rounded-full transition-all ${diskBarColor(pct)}`}
                          style={{ width: `${Math.max(pct, 1)}%` }}
                        />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
