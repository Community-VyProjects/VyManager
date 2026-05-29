"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Gauge,
  RefreshCw,
  Pencil,
  AlertTriangle,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { slaService, SLAConfig } from "@/lib/api/sla";
import { SLASettingsModal } from "./SLASettingsModal";
import { usePermissions } from "@/hooks/usePermissions";
import { FeatureGroup } from "@/lib/api/user-management";

interface ServerCardProps {
  title: string;
  fullName: string;
  defaultPort: number;
  config: { enabled: boolean; port: number | null };
  description: string;
}

function ServerCard({
  title,
  fullName,
  defaultPort,
  config,
  description,
}: ServerCardProps) {
  const portLabel = config.enabled
    ? config.port !== null
      ? `${config.port} (custom)`
      : `${defaultPort} (default)`
    : "—";

  return (
    <Card>
      <CardHeader className="pb-3 pt-4 px-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold">{title}</CardTitle>
          {config.enabled ? (
            <Badge className="bg-green-500/10 text-green-600 dark:text-green-400 border-0 text-xs font-medium">
              <CheckCircle2 className="h-3 w-3 mr-1" />
              Enabled
            </Badge>
          ) : (
            <Badge variant="secondary" className="text-xs font-medium">
              <XCircle className="h-3 w-3 mr-1" />
              Disabled
            </Badge>
          )}
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">{fullName}</p>
      </CardHeader>
      <CardContent className="px-4 pb-4 space-y-3">
        <p className="text-xs text-muted-foreground leading-relaxed">{description}</p>
        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">Port</span>
          <span className={`font-mono font-medium ${!config.enabled ? "text-muted-foreground" : ""}`}>
            {portLabel}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

export function SLAContent() {
  const { canWrite } = usePermissions();
  const hasWrite = canWrite(FeatureGroup.SLA);

  const [config, setConfig] = useState<SLAConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const loadData = useCallback(async (refresh = false) => {
    try {
      setLoading(true);
      setError(null);
      const cfg = await slaService.getConfig(refresh);
      setConfig(cfg);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load SLA configuration"
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <LoadingSpinner />
      </div>
    );
  }

  if (error && !config) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <p className="text-destructive">{error}</p>
        <Button variant="outline" onClick={() => loadData()}>
          Retry
        </Button>
      </div>
    );
  }

  const enabledCount = [
    config?.owamp_server.enabled,
    config?.twamp_server.enabled,
  ].filter(Boolean).length;

  return (
    <>
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="p-6 pb-4 border-b border-border">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <div className="rounded-md p-2 bg-primary/10">
                <Gauge className="h-5 w-5 text-primary" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-bold text-foreground">SLA</h1>
                  {!hasWrite && <Badge variant="secondary">Read Only</Badge>}
                </div>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Service Level Agreement — OWAMP and TWAMP measurement servers
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {hasWrite && (
                <Button size="sm" onClick={() => setSettingsOpen(true)}>
                  <Pencil className="h-4 w-4 mr-2" />
                  Edit Settings
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => loadData(true)}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>
          </div>

          {error && config && (
            <div className="mt-3 flex items-start gap-2 rounded-md border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
              <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
              <span className="whitespace-pre-wrap">{error}</span>
            </div>
          )}
        </div>

        {/* Body */}
        <div className="flex-1 p-6 pt-4 overflow-auto space-y-6">
          {/* Summary stat */}
          <div className="flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-3">
            <Gauge className="h-4 w-4 text-muted-foreground shrink-0" />
            <span className="text-sm text-muted-foreground">
              {enabledCount === 0
                ? "No measurement servers enabled"
                : enabledCount === 1
                ? "1 measurement server enabled"
                : "2 measurement servers enabled"}
            </span>
          </div>

          {/* Server cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <ServerCard
              title="OWAMP Server"
              fullName="One-Way Active Measurement Protocol"
              defaultPort={861}
              config={config!.owamp_server}
              description="Measures one-way network delay, jitter, and packet loss between endpoints. Used for asymmetric path analysis and SLA verification."
            />
            <ServerCard
              title="TWAMP Server"
              fullName="Two-Way Active Measurement Protocol"
              defaultPort={862}
              config={config!.twamp_server}
              description="Measures round-trip network delay, jitter, and packet loss between endpoints. Extends OWAMP with bidirectional measurement capability."
            />
          </div>
        </div>
      </div>

      {config && settingsOpen && (
        <SLASettingsModal
          open={settingsOpen}
          onOpenChange={setSettingsOpen}
          config={config}
          onSuccess={() => loadData(true)}
        />
      )}
    </>
  );
}
