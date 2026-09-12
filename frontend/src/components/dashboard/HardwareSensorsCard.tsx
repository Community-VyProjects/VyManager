"use client";

import { useEffect, useState, type ReactNode } from "react";
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
import { type HardwareSensorsResponse } from "@/lib/api/show";
import { useDashboardData } from "@/contexts/DashboardDataContext";
import { hardwareSensorsLayout } from "@/lib/hardware-sensors-layout";

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

type SensorReading = HardwareSensorsResponse["sensors"][number];

function SensorStatusBadge({ sensor }: { sensor: SensorReading }) {
  if (sensor.status === "critical") {
    return (
      <Badge variant="destructive" className="shrink-0">
        <CircleAlert className="h-3 w-3 mr-1" />
        Critical
      </Badge>
    );
  }
  if (sensor.status === "warning") {
    return (
      <Badge className="bg-yellow-600 shrink-0">
        <AlertTriangle className="h-3 w-3 mr-1" />
        Warning
      </Badge>
    );
  }
  return (
    <Badge
      variant="outline"
      className="shrink-0 border-green-500/30 text-green-700 dark:text-green-400"
    >
      <CheckCircle2 className="h-3 w-3 mr-1" />
      OK
    </Badge>
  );
}

function SensorTile({
  name,
  value,
  badge,
  high,
  critical,
  tileClass,
  nameClass,
}: {
  name: string;
  value: string;
  badge: ReactNode;
  high?: string | null;
  critical?: string | null;
  tileClass: string;
  nameClass: string;
}) {
  return (
    <div className={tileClass}>
      <div className="flex min-w-0 items-start gap-3">
        <Thermometer className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
        <div className="min-w-0">
          <p className={nameClass}>{name}</p>
          <p className="font-mono text-lg">{value}</p>
          {high || critical ? (
            <p className="text-xs text-muted-foreground">
              {high ? `High ${high}` : ""}
              {high && critical ? " | " : ""}
              {critical ? `Critical ${critical}` : ""}
            </p>
          ) : null}
        </div>
      </div>
      {badge}
    </div>
  );
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
  const layout = hardwareSensorsLayout(span);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const { status: sseStatus, data: sseData } = useDashboardData();
  // Snapshot the stream so "Paused" freezes the displayed readings.
  const [snapshot, setSnapshot] = useState<HardwareSensorsResponse | null>(null);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- freeze the last SSE snapshot for the paused view
    if (autoRefresh && sseData.hardwareSensors) setSnapshot(sseData.hardwareSensors);
  }, [autoRefresh, sseData.hardwareSensors]);

  const showData = snapshot;
  const isLoading = showData === null && autoRefresh;

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
        <div className="flex min-w-0 items-center gap-2">
          <Thermometer className="h-5 w-5 shrink-0 text-primary" />
          <CardTitle className="text-lg font-medium">Hardware Sensors</CardTitle>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <Button
            variant={autoRefresh ? "default" : "outline"}
            size="sm"
            onClick={() => setAutoRefresh((v) => !v)}
            title={autoRefresh ? `Live via dashboard stream (${sseStatus})` : "Paused"}
          >
            <RefreshCw className={`h-4 w-4 ${layout.showLiveLabel ? "mr-1" : ""} ${autoRefresh && sseStatus === "connected" ? "animate-spin" : ""}`} />
            {layout.showLiveLabel ? (autoRefresh ? "Live" : "Paused") : null}
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
        ) : showData && !showData.sensors.length ? (
          <p className="py-8 text-sm text-muted-foreground">
            No hardware sensors available (may be running in a virtualized environment).
          </p>
        ) : showData?.sensors.length ? (
          <div className="space-y-3">
            <div className={layout.statusClass}>
              <div className="flex items-center gap-2">
                {showData.summary === "No issues" ? (
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
                  <DialogContent className="max-w-[min(680px,calc(100vw-2rem))] max-h-[80vh] overflow-hidden">
                    <DialogHeader>
                      <DialogTitle>CPU Core Temperatures</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
                      {cpuSensors.map((sensor) => (
                        <div key={sensor.name} className="flex items-center justify-between rounded-md border p-2">
                          <span className="text-sm font-medium break-words pr-3">{sensor.name}</span>
                          <span className="font-mono text-sm shrink-0">{sensor.value}</span>
                        </div>
                      ))}
                    </div>
                  </DialogContent>
                </Dialog>
              ) : null}
            </div>

            <div className={`${layout.tileGridClass} max-h-[260px] overflow-y-auto pr-1`}>
              {averageCpuTemp !== null ? (
                <SensorTile
                  name="AVG CPU Temp"
                  value={`${averageCpuTemp >= 0 ? "+" : ""}${averageCpuTemp.toFixed(1)}°C`}
                  tileClass={layout.tileClass}
                  nameClass={layout.nameClass}
                  badge={
                    <Badge
                      variant="outline"
                      className="shrink-0 border-green-500/30 text-green-700 dark:text-green-400"
                    >
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      CPU
                    </Badge>
                  }
                />
              ) : null}
              {otherSensors.map((sensor) => (
                <SensorTile
                  key={`${sensor.name}-${sensor.value}`}
                  name={sensor.name}
                  value={sensor.value}
                  high={sensor.high}
                  critical={sensor.critical}
                  tileClass={layout.tileClass}
                  nameClass={layout.nameClass}
                  badge={<SensorStatusBadge sensor={sensor} />}
                />
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
