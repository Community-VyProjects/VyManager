"use client";

import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  X,
  RefreshCw,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  CircleAlert,
  Gauge,
} from "lucide-react";
import { CardSizeMenu } from "@/components/dashboard/CardSizeMenu";
import { showService } from "@/lib/api/show";
import { ethernetService } from "@/lib/api/ethernet";
import type { TransceiverStatus } from "@/lib/api/types/ethernet";

interface TransceiverHealthCardProps {
  onRemove?: () => void;
  span?: number;
  onSpanChange?: (newSpan: number) => void;
  height?: number;
  onHeightChange?: (newHeight: number) => void;
  config?: Record<string, unknown>;
}

interface TransceiverEntry {
  interface: string;
  status: TransceiverStatus;
}

function transceiverSeverity(status: TransceiverStatus): "ok" | "warning" | "critical" | "absent" {
  if (!status.present || !status.transceiver) {
    return "absent";
  }
  if (status.alarms.length > 0) {
    return "critical";
  }
  if (status.warnings.length > 0) {
    return "warning";
  }
  return "ok";
}

function SeverityBadge({ entry }: { entry: TransceiverEntry }) {
  const severity = transceiverSeverity(entry.status);

  if (severity === "critical") {
    return (
      <Badge variant="destructive" className="shrink-0">
        <CircleAlert className="h-3 w-3 mr-1" />
        Critical
      </Badge>
    );
  }

  if (severity === "warning") {
    return (
      <Badge className="bg-yellow-600 shrink-0">
        <AlertTriangle className="h-3 w-3 mr-1" />
        Warning
      </Badge>
    );
  }

  if (severity === "absent") {
    return (
      <Badge variant="outline" className="shrink-0 border-muted-foreground/40 text-muted-foreground">
        <CircleAlert className="h-3 w-3 mr-1" />
        Absent
      </Badge>
    );
  }

  return (
    <Badge variant="outline" className="shrink-0 border-green-500/30 text-green-700 dark:text-green-400">
      <CheckCircle2 className="h-3 w-3 mr-1" />
      OK
    </Badge>
  );
}

export function TransceiverHealthCard({
  onRemove,
  span = 1,
  onSpanChange,
  height,
  onHeightChange,
}: TransceiverHealthCardProps) {
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [snapshot, setSnapshot] = useState<TransceiverEntry[]>([]);

  useEffect(() => {
    if (!autoRefresh) {
      return undefined;
    }

    let cancelled = false;

    const refresh = async () => {
      setLoading(true);
      setError(null);

      try {
        const interfaces = await showService.getAllInterfaces();
        const physicalEthInterfaces = interfaces.interfaces
          .map((iface) => iface.name)
          .filter((name) => /^eth\d+(?:\.\d+)?$/.test(name))
          .sort();

        const results = await Promise.allSettled(
          physicalEthInterfaces.map(async (iface) => {
            const status = await ethernetService.getTransceiver(iface);
            return { interface: iface, status } as TransceiverEntry;
          })
        );

        const entries = results.flatMap((result) => {
          if (result.status === "fulfilled") {
            return [result.value];
          }
          return [];
        });

        if (!cancelled) {
          setSnapshot(entries);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Unable to read transceiver health");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void refresh();
    const timer = window.setInterval(refresh, 15000);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [autoRefresh]);

  const overallSeverity = snapshot.some((entry) => transceiverSeverity(entry.status) === "critical")
    ? "critical"
    : snapshot.some((entry) => transceiverSeverity(entry.status) === "warning")
      ? "warning"
      : snapshot.some((entry) => transceiverSeverity(entry.status) === "absent")
        ? "absent"
        : "ok";

  return (
    <Card className="flex flex-col h-full">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4 shrink-0">
        <div className="flex min-w-0 items-center gap-2">
          <Gauge className="h-5 w-5 shrink-0 text-primary" />
          <CardTitle className="text-lg font-medium">Transceiver / DDM Health</CardTitle>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <Button
            variant={autoRefresh ? "default" : "outline"}
            size="sm"
            onClick={() => setAutoRefresh((v) => !v)}
            title={autoRefresh ? "Live via transceiver poll" : "Paused"}
          >
            <RefreshCw className={`h-4 w-4 ${autoRefresh ? "animate-spin" : ""}`} />
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
        {loading && snapshot.length === 0 ? (
          <div className="flex items-center gap-2 py-8 text-muted-foreground">
            <Loader2 className="animate-spin" />
            Reading transceiver health...
          </div>
        ) : error ? (
          <p className="py-8 text-sm text-muted-foreground">{error}</p>
        ) : snapshot.length === 0 ? (
          <p className="py-8 text-sm text-muted-foreground">
            No ethernet transceiver diagnostics found.
          </p>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between rounded-md border p-2">
              <div className="flex items-center gap-2">
                {overallSeverity === "critical" ? (
                  <CircleAlert className="h-4 w-4 text-red-600" />
                ) : overallSeverity === "warning" ? (
                  <AlertTriangle className="h-4 w-4 text-yellow-600" />
                ) : overallSeverity === "absent" ? (
                  <CircleAlert className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                )}
                <span className="text-sm font-medium">
                  {snapshot.length} interface{snapshot.length === 1 ? "" : "s"} scanned
                </span>
              </div>
              <div className="text-xs text-muted-foreground">
                {snapshot.filter((entry) => transceiverSeverity(entry.status) === "ok").length} OK
              </div>
            </div>

            <div className="space-y-2">
              {snapshot.map((entry) => {
                const severity = transceiverSeverity(entry.status);
                return (
                  <div key={entry.interface} className="flex items-center justify-between rounded-md border p-2 gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm font-medium break-all">{entry.interface}</span>
                        <span className="text-xs text-muted-foreground">{entry.status.transceiver || "No part"}</span>
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        {entry.status.alarms.length > 0 && (
                          <span className="text-red-600">{entry.status.alarms.length} alarm{entry.status.alarms.length === 1 ? "" : "s"}</span>
                        )}
                        {entry.status.warnings.length > 0 && (
                          <span className="text-yellow-600">{entry.status.warnings.length} warning{entry.status.warnings.length === 1 ? "" : "s"}</span>
                        )}
                        {!entry.status.present && <span>No transceiver</span>}
                      </div>
                    </div>
                    <SeverityBadge entry={entry} />
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
