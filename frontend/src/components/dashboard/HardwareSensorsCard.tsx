"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  X,
  Thermometer,
  RefreshCw,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  CircleAlert,
  Cpu,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { CardSizeMenu } from "@/components/dashboard/CardSizeMenu";
import { showService, type HardwareSensorsResponse } from "@/lib/api/show";

// ============================================================================
// Props
// ============================================================================

interface HardwareSensorsCardProps {
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

export function HardwareSensorsCard({
  onRemove,
  span = 1,
  onSpanChange,
  height,
  onHeightChange,
}: HardwareSensorsCardProps) {
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [data, setData] = useState<HardwareSensorsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await showService.getHardwareSensors());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load hardware sensors");
    } finally {
      setLoading(false);
    }
  }, []);

  // Auto-refresh on mount and when autoRefresh is enabled
  useEffect(() => {
    if (!autoRefresh) return;

    // Initial load
    refresh();

    // Set up interval for periodic refresh (every 30 seconds)
    const interval = setInterval(() => {
      refresh();
    }, 30000);

    return () => clearInterval(interval);
  }, [autoRefresh]);

  const isLoading = loading && !data;
  const showData = autoRefresh ? data : null;

  const cpuSensors = showData?.sensors.filter((sensor) => {
    const name = sensor.name.toLowerCase();
    return (
      name.includes("coretemp") ||
      name.includes("package id") ||
      name.includes("core 0") ||
      name.includes("core 1") ||
      name.includes("cpu") ||
      name.includes("k10temp")
    );
  }) ?? [];

  const otherSensors = showData?.sensors.filter((sensor) => !cpuSensors.some((cpu) => cpu.name === sensor.name)) ?? [];

  const averageCpuTemp =
    cpuSensors.length > 0
      ? cpuSensors.reduce((total, sensor) => {
          const value = Number.parseFloat(sensor.value.replace(/[^\d.+-]/g, ""));
          return total + (Number.isFinite(value) ? value : 0);
        }, 0) / cpuSensors.length
      : null;

  return (
    <Card className="flex flex-col h-full">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4 shrink-0">
        <div className="flex items-center gap-2">
          <Thermometer className="h-5 w-5 text-primary" />
          <CardTitle className="text-lg font-medium">Hardware Sensors</CardTitle>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={autoRefresh ? "default" : "outline"}
            size="sm"
            onClick={() => {
              setAutoRefresh((v) => !v);
              if (!autoRefresh) refresh();
            }}
            title={autoRefresh ? "Auto-refresh enabled" : "Auto-refresh paused"}
          >
            <RefreshCw className={`h-4 w-4 mr-1 ${loading ? "animate-spin" : ""}`} />
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

      <CardContent className="space-y-4 overflow-y-auto flex-1 min-h-0">
        {isLoading ? (
          <div className="flex items-center gap-2 py-8 text-muted-foreground">
            <Loader2 className="animate-spin" />
            Reading sensors...
          </div>
        ) : error ? (
          <p className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </p>
        ) : showData && !showData.sensors.length ? (
          <p className="py-8 text-sm text-muted-foreground">
            No hardware sensors available (may be running in a virtualized environment).
          </p>
        ) : showData?.sensors.length ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3 rounded-lg border bg-muted/30 p-3">
              <div className="flex items-center gap-2">
                {showData.summary === "all okay" ? (
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                ) : showData.summary?.includes("critical") ? (
                  <CircleAlert className="h-4 w-4 text-red-600" />
                ) : (
                  <AlertTriangle className="h-4 w-4 text-yellow-600" />
                )}
                <span className="text-sm font-medium">{showData.summary || "Sensors loaded"}</span>
              </div>

              {cpuSensors.length > 1 ? (
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm" className="h-8">
                      <Cpu className="h-4 w-4 mr-1" />
                      Per-core temps
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-xl">
                    <DialogHeader>
                      <DialogTitle>CPU Core Temperatures</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-2">
                      {cpuSensors.map((sensor) => (
                        <div key={sensor.name} className="flex items-center justify-between rounded-md border p-2">
                          <span className="text-sm font-medium truncate pr-3">{sensor.name}</span>
                          <span className="font-mono text-sm">{sensor.value}</span>
                        </div>
                      ))}
                    </div>
                  </DialogContent>
                </Dialog>
              ) : null}
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {averageCpuTemp !== null ? (
                <div className="flex items-start justify-between gap-3 p-3 rounded-lg border bg-card">
                  <div className="flex min-w-0 items-start gap-3">
                    <Thermometer className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                    <div className="min-w-0">
                      <p className="truncate font-medium text-sm">AVG CPU Temp</p>
                      <p className="font-mono text-lg">
                        {`${averageCpuTemp >= 0 ? "+" : ""}${averageCpuTemp.toFixed(1)}°C`}
                      </p>
                    </div>
                  </div>
                  <Badge variant="outline" className="border-green-500/30 text-green-700 dark:text-green-400">
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    CPU
                  </Badge>
                </div>
              ) : null}

              {otherSensors.map((sensor) => (
                <div
                  key={`${sensor.name}-${sensor.value}`}
                  className="flex items-start justify-between gap-3 p-3 rounded-lg border bg-card"
                >
                  <div className="flex min-w-0 items-start gap-3">
                    <Thermometer className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                    <div className="min-w-0">
                      <p className="truncate font-medium text-sm">{sensor.name}</p>
                      <p className="font-mono text-lg">{sensor.value}</p>
                      {sensor.high || sensor.critical ? (
                        <p className="text-xs text-muted-foreground">
                          {sensor.high ? `High ${sensor.high}` : ""}
                          {sensor.high && sensor.critical ? " | " : ""}
                          {sensor.critical ? `Critical ${sensor.critical}` : ""}
                        </p>
                      ) : null}
                    </div>
                  </div>
                  {sensor.status === "critical" ? (
                    <Badge variant="destructive">
                      <CircleAlert className="h-3 w-3 mr-1" />
                      Critical
                    </Badge>
                  ) : sensor.status === "warning" ? (
                    <Badge className="bg-yellow-600">
                      <AlertTriangle className="h-3 w-3 mr-1" />
                      Warning
                    </Badge>
                  ) : (
                    <Badge
                      variant="outline"
                      className="border-green-500/30 text-green-700 dark:text-green-400"
                    >
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      OK
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          </div>
        ) : (
          <p className="py-8 text-sm text-muted-foreground">
            Click &quot;Live&quot; to load sensor data
          </p>
        )}
      </CardContent>
    </Card>
  );
}
