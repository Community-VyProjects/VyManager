"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Cpu,
  MemoryStick,
  HardDrive,
  RefreshCw,
  Clock,
  AlertTriangle,
} from "lucide-react";
import { monitoringService, type SystemMetrics } from "@/lib/api/monitoring";
import { formatBytes } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

interface SystemMetricsCardProps {
  autoRefresh?: boolean;
  refreshInterval?: number;
}

export function SystemMetricsCard({
  autoRefresh = true,
  refreshInterval = 5000,
}: SystemMetricsCardProps) {
  const [metrics, setMetrics] = useState<SystemMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAutoRefresh, setIsAutoRefresh] = useState(autoRefresh);

  const loadMetrics = async () => {
    try {
      setError(null);
      const data = await monitoringService.getSystemMetrics();
      setMetrics(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load metrics");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMetrics();

    if (isAutoRefresh) {
      const interval = setInterval(loadMetrics, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [isAutoRefresh, refreshInterval]);

  const getUsageColor = (percent: number) => {
    if (percent >= 90) return "text-red-500";
    if (percent >= 70) return "text-yellow-500";
    return "text-green-500";
  };

  const getProgressColor = (percent: number) => {
    if (percent >= 90) return "bg-red-500";
    if (percent >= 70) return "bg-yellow-500";
    return "bg-green-500";
  };

  if (loading && !metrics) {
    return (
      <div className="space-y-4">
        {/* Header Skeleton */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-6 w-28" />
          </div>
          <Skeleton className="h-9 w-28" />
        </div>

        {/* Cards Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-5 w-24" />
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <Skeleton className="h-9 w-20" />
                  <Skeleton className="h-2 w-full" />
                  <Skeleton className="h-4 w-32" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error && !metrics) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
            <AlertTriangle className="h-8 w-8 mb-2 text-destructive" />
            <p>{error}</p>
            <Button variant="outline" size="sm" onClick={loadMetrics} className="mt-4">
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-semibold">System Metrics</h3>
          {metrics?.uptime && (
            <Badge variant="outline" className="font-mono">
              <Clock className="h-3 w-3 mr-1" />
              Uptime: {metrics.uptime}
            </Badge>
          )}
        </div>
        <Button
          variant={isAutoRefresh ? "default" : "outline"}
          size="sm"
          onClick={() => setIsAutoRefresh(!isAutoRefresh)}
        >
          <RefreshCw className={`h-4 w-4 mr-1 ${isAutoRefresh ? "animate-spin" : ""}`} />
          Auto-refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* CPU Card */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Cpu className="h-4 w-4" />
              CPU Usage
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className={`text-3xl font-bold ${getUsageColor(metrics?.cpu.usage_percent ?? 0)}`}>
                  {metrics?.cpu.usage_percent.toFixed(1)}%
                </span>
              </div>
              <Progress
                value={metrics?.cpu.usage_percent ?? 0}
                className="h-2"
                indicatorClassName={getProgressColor(metrics?.cpu.usage_percent ?? 0)}
              />
              <div className="text-xs text-muted-foreground">
                Load: {metrics?.cpu.load_average.map(l => l.toFixed(2)).join(" / ")}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Memory Card */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <MemoryStick className="h-4 w-4" />
              Memory Usage
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className={`text-3xl font-bold ${getUsageColor(metrics?.memory.usage_percent ?? 0)}`}>
                  {metrics?.memory.usage_percent.toFixed(1)}%
                </span>
              </div>
              <Progress
                value={metrics?.memory.usage_percent ?? 0}
                className="h-2"
                indicatorClassName={getProgressColor(metrics?.memory.usage_percent ?? 0)}
              />
              <div className="text-xs text-muted-foreground">
                {formatBytes(metrics?.memory.used_bytes ?? 0)} / {formatBytes(metrics?.memory.total_bytes ?? 0)}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Disk Card - Show primary disk */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <HardDrive className="h-4 w-4" />
              Disk Usage
            </CardTitle>
          </CardHeader>
          <CardContent>
            {metrics?.disk && metrics.disk.length > 0 ? (
              <div className="space-y-3">
                {metrics.disk.slice(0, 2).map((disk) => (
                  <div key={disk.mount_point} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-mono text-xs truncate max-w-[120px]" title={disk.mount_point}>
                        {disk.mount_point}
                      </span>
                      <span className={getUsageColor(disk.usage_percent)}>
                        {disk.usage_percent.toFixed(0)}%
                      </span>
                    </div>
                    <Progress
                      value={disk.usage_percent}
                      className="h-1.5"
                      indicatorClassName={getProgressColor(disk.usage_percent)}
                    />
                    <div className="text-xs text-muted-foreground">
                      {formatBytes(disk.used_bytes)} / {formatBytes(disk.total_bytes)}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-muted-foreground text-sm">No disk data available</div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
