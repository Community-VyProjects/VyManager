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
} from "lucide-react";
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
          <div className="grid gap-3 sm:grid-cols-2">
            {showData.sensors.map((sensor) => (
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
        ) : (
          <p className="py-8 text-sm text-muted-foreground">
            Click "Live" to load sensor data
          </p>
        )}
      </CardContent>
    </Card>
  );
}
