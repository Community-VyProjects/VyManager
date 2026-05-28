"use client";

import { useState, useEffect, useCallback } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Activity, RefreshCw, AlertTriangle } from "lucide-react";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import {
  serviceMonitoringService,
  ServiceMonitoringConfig,
  ServiceMonitoringCapabilities,
} from "@/lib/api/service-monitoring";
import { usePermissions } from "@/hooks/usePermissions";
import { FeatureGroup } from "@/lib/api/user-management";
import { TelegrafTab } from "./TelegrafTab";
import { ZabbixTab } from "./ZabbixTab";
import { PrometheusTab } from "./PrometheusTab";
import { NetworkEventTab } from "./NetworkEventTab";

export function ServiceMonitoringContent() {
  const { canWrite } = usePermissions();
  const hasWrite = canWrite(FeatureGroup.SERVICE_MONITORING);

  const [config, setConfig] = useState<ServiceMonitoringConfig | null>(null);
  const [caps, setCaps] = useState<ServiceMonitoringCapabilities | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async (refresh = false) => {
    try {
      setLoading(true);
      setError(null);
      const [cfg, c] = await Promise.all([
        serviceMonitoringService.getConfig(refresh),
        serviceMonitoringService.getCapabilities(),
      ]);
      setConfig(cfg);
      setCaps(c);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load service monitoring configuration"
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

  const showPrometheus = caps?.features.prometheus.supported ?? false;
  const showNetworkEvent = caps?.features.network_event.supported ?? false;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-6 pb-4 border-b border-border">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <div className="rounded-md p-2 bg-primary/10">
              <Activity className="h-5 w-5 text-primary" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold text-foreground">Service Monitoring</h1>
                {!hasWrite && <Badge variant="secondary">Read Only</Badge>}
              </div>
              <p className="text-sm text-muted-foreground mt-0.5">
                Telegraf, Zabbix, Prometheus exporters, and network event logging
              </p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={() => loadData(true)}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>

        {error && config && (
          <div className="mt-3 flex items-start gap-2 rounded-md border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
            <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
            <span className="whitespace-pre-wrap">{error}</span>
          </div>
        )}
      </div>

      {/* Body */}
      <div className="flex-1 p-6 pt-4 overflow-auto">
        <Tabs defaultValue="telegraf">
          <TabsList>
            <TabsTrigger value="telegraf">Telegraf</TabsTrigger>
            <TabsTrigger value="zabbix">Zabbix Agent</TabsTrigger>
            {showPrometheus && <TabsTrigger value="prometheus">Prometheus</TabsTrigger>}
            {showNetworkEvent && <TabsTrigger value="network-event">Network Events</TabsTrigger>}
          </TabsList>

          <TabsContent value="telegraf" className="mt-4">
            {config && caps && (
              <TelegrafTab
                config={config.telegraf ?? null}
                caps={caps}
                hasWrite={hasWrite}
                onSuccess={() => loadData(true)}
              />
            )}
          </TabsContent>

          <TabsContent value="zabbix" className="mt-4">
            {config && caps && (
              <ZabbixTab
                config={config.zabbix_agent ?? null}
                caps={caps}
                hasWrite={hasWrite}
                onSuccess={() => loadData(true)}
              />
            )}
          </TabsContent>

          {showPrometheus && (
            <TabsContent value="prometheus" className="mt-4">
              {config && caps && (
                <PrometheusTab
                  config={config.prometheus ?? null}
                  caps={caps}
                  hasWrite={hasWrite}
                  onSuccess={() => loadData(true)}
                />
              )}
            </TabsContent>
          )}

          {showNetworkEvent && (
            <TabsContent value="network-event" className="mt-4">
              {config && caps && (
                <NetworkEventTab
                  config={config.network_event ?? null}
                  caps={caps}
                  hasWrite={hasWrite}
                  onSuccess={() => loadData(true)}
                />
              )}
            </TabsContent>
          )}
        </Tabs>
      </div>
    </div>
  );
}
