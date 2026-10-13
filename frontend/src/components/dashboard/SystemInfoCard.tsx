"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  X,
  Server,
  RefreshCw,
  MemoryStick,
  HardDrive,
  Activity,
} from "lucide-react";
import { CardSizeMenu } from "@/components/dashboard/CardSizeMenu";
import { useDashboardData } from "@/contexts/DashboardDataContext";
import { LoadData, DiskPartition } from "@/hooks/useDashboardSSE";

// ============================================================================
// Helpers
// ============================================================================

/** Parse a memory string like "220.41 MB" or "7.77 GB" → float (GB). */
function parseMemoryGB(s: string | null): number {
  if (!s) return 0;
  const m = s.match(/([\d.]+)\s*(GB|MB|KB|B)/i);
  if (!m) return 0;
  const value = parseFloat(m[1]);
  switch (m[2].toUpperCase()) {
    case "GB": return value;
    case "MB": return value / 1024;
    case "KB": return value / (1024 * 1024);
    default:   return value / (1024 * 1024 * 1024); // B
  }
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
  height?: number;
  onHeightChange?: (newHeight: number) => void;
  config?: Record<string, unknown>;
}

// ============================================================================
// Component
// ============================================================================

export function SystemInfoCard({
  onRemove,
  span = 1,
  onSpanChange,
  height,
  onHeightChange,
}: SystemInfoCardProps) {
  const t = useTranslations("dashboard");
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
    <Card className="flex flex-col h-full">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4 shrink-0">
        <div className="flex items-center gap-2">
          <Server className="h-5 w-5 text-primary" />
          <CardTitle className="text-lg font-medium">{t("systemInfo.title")}</CardTitle>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={autoRefresh ? "default" : "outline"}
            size="sm"
            onClick={() => setAutoRefresh((v) => !v)}
            title={autoRefresh ? t("stream.streaming", { status: sseStatus }) : t("stream.paused")}
          >
            <RefreshCw
              className={`h-4 w-4 mr-1 ${autoRefresh && isConnected ? "animate-spin" : ""}`}
            />
            {autoRefresh ? t("stream.live") : t("stream.paused")}
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

      <CardContent className="space-y-5 overflow-y-auto flex-1 min-h-0">
        {isLoading ? (
          <div className="text-center text-muted-foreground py-6 text-sm">
            {t("stream.connecting")}
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
                    {t("systemInfo.built", { date: version.built_on })}
                  </p>
                )}
              </div>
            )}

            {/* ── Load Averages ── */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-1.5">
                  <Activity className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">{t("systemInfo.loadAverage")}</span>
                </div>
                {load.uptime && (
                  <span className="text-xs text-muted-foreground">{t("systemInfo.uptime", { value: load.uptime })}</span>
                )}
              </div>
              {load.load_1min !== null ? (
                <div className="space-y-2">
                  {([
                    { label: t("systemInfo.minutes", { count: 1 }),  value: load.load_1min },
                    { label: t("systemInfo.minutes", { count: 5 }),  value: load.load_5min },
                    { label: t("systemInfo.minutes", { count: 15 }), value: load.load_15min },
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
                <p className="text-xs text-muted-foreground italic">{t("stream.noData")}</p>
              )}
            </div>

            {/* ── Memory ── */}
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5 mb-1">
                <MemoryStick className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">{t("systemInfo.memory")}</span>
              </div>
              {memory.total ? (
                <>
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>
                      {t("systemInfo.used")} <span className="text-foreground font-medium">{memory.used}</span>
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
                    <span>{t("systemInfo.free", { value: memory.free ?? "" })}</span>
                    <span>{t("systemInfo.total", { value: memory.total })}</span>
                  </div>
                </>
              ) : (
                <p className="text-xs text-muted-foreground italic">{t("stream.noData")}</p>
              )}
            </div>

            {/* ── Disk ── */}
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 mb-1">
                <HardDrive className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">{t("systemInfo.diskUsage")}</span>
              </div>
              {disk.length === 0 ? (
                <p className="text-xs text-muted-foreground italic">{t("stream.noData")}</p>
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
