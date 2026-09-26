"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
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
import { useDashboardData } from "@/contexts/DashboardDataContext";
import type { TransceiverHealthData, TransceiverPortData } from "@/hooks/useDashboardSSE";

interface TransceiverHealthCardProps {
  onRemove?: () => void;
  span?: number;
  onSpanChange?: (newSpan: number) => void;
  height?: number;
  onHeightChange?: (newHeight: number) => void;
  config?: Record<string, unknown>;
}

function transceiverSeverity(port: TransceiverPortData): "ok" | "warning" | "critical" | "absent" {
  if (!port.present || !port.transceiver) {
    return "absent";
  }
  if (port.alarms.length > 0) {
    return "critical";
  }
  if (port.warnings.length > 0) {
    return "warning";
  }
  return "ok";
}

function SeverityBadge({ port }: { port: TransceiverPortData }) {
  const t = useTranslations("dashboard");
  const severity = transceiverSeverity(port);

  if (severity === "critical") {
    return (
      <Badge variant="destructive" className="shrink-0">
        <CircleAlert className="h-3 w-3 mr-1" />
        {t("severity.critical")}
      </Badge>
    );
  }

  if (severity === "warning") {
    return (
      <Badge className="bg-yellow-600 shrink-0">
        <AlertTriangle className="h-3 w-3 mr-1" />
        {t("severity.warning")}
      </Badge>
    );
  }

  if (severity === "absent") {
    return (
      <Badge variant="outline" className="shrink-0 border-muted-foreground/40 text-muted-foreground">
        <CircleAlert className="h-3 w-3 mr-1" />
        {t("severity.absent")}
      </Badge>
    );
  }

  return (
    <Badge variant="outline" className="shrink-0 border-green-500/30 text-green-700 dark:text-green-400">
      <CheckCircle2 className="h-3 w-3 mr-1" />
      {t("severity.ok")}
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
  const t = useTranslations("dashboard");
  const [autoRefresh, setAutoRefresh] = useState(true);
  const { status: sseStatus, data: sseData } = useDashboardData();
  // Snapshot the stream so "Paused" freezes the displayed readings.
  const [snapshot, setSnapshot] = useState<TransceiverHealthData | null>(null);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- freeze the last SSE snapshot for the paused view
    if (autoRefresh && sseData.transceiverHealth) setSnapshot(sseData.transceiverHealth);
  }, [autoRefresh, sseData.transceiverHealth]);

  // The backend sweeps only physical Ethernet ports; VLAN sub-interfaces have
  // no transceiver of their own and never appear on this channel.
  const ports = snapshot?.interfaces ?? [];
  const isLoading = snapshot === null && autoRefresh;

  const overallSeverity = ports.some((port) => transceiverSeverity(port) === "critical")
    ? "critical"
    : ports.some((port) => transceiverSeverity(port) === "warning")
      ? "warning"
      : ports.some((port) => transceiverSeverity(port) === "absent")
        ? "absent"
        : "ok";

  return (
    <Card className="flex flex-col h-full">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4 shrink-0">
        <div className="flex min-w-0 items-center gap-2">
          <Gauge className="h-5 w-5 shrink-0 text-primary" />
          <CardTitle className="text-lg font-medium">{t("transceiver.title")}</CardTitle>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <Button
            variant={autoRefresh ? "default" : "outline"}
            size="sm"
            onClick={() => setAutoRefresh((v) => !v)}
            title={autoRefresh ? t("stream.liveVia", { status: sseStatus }) : t("stream.paused")}
          >
            <RefreshCw className={`h-4 w-4 ${autoRefresh && sseStatus === "connected" ? "animate-spin" : ""}`} />
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
            {t("transceiver.reading")}
          </div>
        ) : ports.length === 0 ? (
          <p className="py-8 text-sm text-muted-foreground">
            {t("transceiver.noDiagnostics")}
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
                  {t("transceiver.scanned", { count: ports.length })}
                </span>
              </div>
              <div className="text-xs text-muted-foreground">
                {t("transceiver.okCount", { count: ports.filter((port) => transceiverSeverity(port) === "ok").length })}
              </div>
            </div>

            <div className="space-y-2">
              {ports.map((port) => (
                <div key={port.interface} className="flex items-center justify-between rounded-md border p-2 gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-medium break-all">{port.interface}</span>
                      <span className="text-xs text-muted-foreground">{port.transceiver || t("transceiver.noPart")}</span>
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      {port.alarms.length > 0 && (
                        <span className="text-red-600">{t("transceiver.alarms", { count: port.alarms.length })}</span>
                      )}
                      {port.warnings.length > 0 && (
                        <span className="text-yellow-600">{t("transceiver.warnings", { count: port.warnings.length })}</span>
                      )}
                      {!port.present && <span>{t("transceiver.noTransceiver")}</span>}
                    </div>
                  </div>
                  <SeverityBadge port={port} />
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
