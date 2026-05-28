"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Pencil, Trash2, Plus, Settings, Database, FileText, Cloud, BarChart3 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  TelegrafConfig,
  ServiceMonitoringCapabilities,
  serviceMonitoringService,
} from "@/lib/api/service-monitoring";
import { TelegrafSourcesModal } from "./TelegrafSourcesModal";
import { TelegrafInfluxDBModal } from "./TelegrafInfluxDBModal";
import { TelegrafLokiModal } from "./TelegrafLokiModal";
import { TelegrafSplunkModal } from "./TelegrafSplunkModal";
import { TelegrafAzureModal } from "./TelegrafAzureModal";
import { TelegrafPrometheusClientModal } from "./TelegrafPrometheusClientModal";

interface TelegrafTabProps {
  config: TelegrafConfig | null;
  caps: ServiceMonitoringCapabilities;
  hasWrite: boolean;
  onSuccess: () => void;
}

export function TelegrafTab({ config, caps, hasWrite, onSuccess }: TelegrafTabProps) {
  const [sourcesOpen, setSourcesOpen] = useState(false);
  const [influxdbOpen, setInfluxdbOpen] = useState(false);
  const [lokiOpen, setLokiOpen] = useState(false);
  const [splunkOpen, setSplunkOpen] = useState(false);
  const [azureOpen, setAzureOpen] = useState(false);
  const [promClientOpen, setPromClientOpen] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<
    "influxdb" | "loki" | "splunk" | "azure" | "prom_client" | null
  >(null);
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      switch (deleteTarget) {
        case "influxdb": await serviceMonitoringService.deleteTelegrafInfluxDB(); break;
        case "loki": await serviceMonitoringService.deleteTelegrafLoki(); break;
        case "splunk": await serviceMonitoringService.deleteTelegrafSplunk(); break;
        case "azure": await serviceMonitoringService.deleteTelegrafAzure(); break;
        case "prom_client": await serviceMonitoringService.deleteTelegrafPrometheusClient(); break;
      }
      setDeleteTarget(null);
      onSuccess();
    } catch {
      // ignore — toast not available here; error visible on next load
    } finally {
      setDeleting(false);
    }
  };

  const sourceLabels: Record<string, string> = {
    all: "All",
    "hardware-utilization": "Hardware",
    logs: "Logs",
    network: "Network",
    system: "System",
    telegraf: "Telegraf",
  };

  return (
    <div className="space-y-6">
      {/* General Settings */}
      <Card>
        <CardHeader className="pb-2 pt-4 px-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
              <Settings className="h-4 w-4" />
              General Settings
            </CardTitle>
            {hasWrite && (
              <Button size="sm" variant="outline" onClick={() => setSourcesOpen(true)}>
                <Pencil className="h-4 w-4 mr-1" />
                Edit
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="px-4 pb-4 space-y-3">
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2">Sources</p>
            {config && config.sources.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {config.sources.map((s) => (
                  <Badge key={s} variant="secondary">
                    {sourceLabels[s] ?? s}
                  </Badge>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">None configured</p>
            )}
          </div>
          {config?.vrf && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">VRF</p>
              <Badge variant="secondary" className="font-mono">{config.vrf}</Badge>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Output Plugins */}
      <div>
        <p className="text-sm font-medium text-foreground mb-3">Output Plugins</p>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {/* InfluxDB */}
          <PluginCard
            icon={<Database className="h-4 w-4" />}
            title="InfluxDB"
            configured={!!config?.influxdb}
            summary={config?.influxdb ? [
              config.influxdb.url ? `URL: ${config.influxdb.url}` : null,
              config.influxdb.port ? `Port: ${config.influxdb.port}` : null,
              config.influxdb.bucket ? `Bucket: ${config.influxdb.bucket}` : null,
            ].filter(Boolean) as string[] : []}
            hasWrite={hasWrite}
            onEdit={() => setInfluxdbOpen(true)}
            onRemove={() => setDeleteTarget("influxdb")}
          />

          {/* Loki */}
          <PluginCard
            icon={<FileText className="h-4 w-4" />}
            title="Loki"
            configured={!!config?.loki}
            summary={config?.loki ? [
              config.loki.url ? `URL: ${config.loki.url}` : null,
              config.loki.port ? `Port: ${config.loki.port}` : null,
            ].filter(Boolean) as string[] : []}
            hasWrite={hasWrite}
            onEdit={() => setLokiOpen(true)}
            onRemove={() => setDeleteTarget("loki")}
          />

          {/* Splunk */}
          <PluginCard
            icon={<BarChart3 className="h-4 w-4" />}
            title="Splunk"
            configured={!!config?.splunk}
            summary={config?.splunk ? [
              config.splunk.url ? `URL: ${config.splunk.url}` : null,
              config.splunk.authentication.insecure ? "Insecure: Yes" : null,
            ].filter(Boolean) as string[] : []}
            hasWrite={hasWrite}
            onEdit={() => setSplunkOpen(true)}
            onRemove={() => setDeleteTarget("splunk")}
          />

          {/* Azure Data Explorer */}
          <PluginCard
            icon={<Cloud className="h-4 w-4" />}
            title="Azure Data Explorer"
            configured={!!config?.azure_data_explorer}
            summary={config?.azure_data_explorer ? [
              config.azure_data_explorer.database ? `DB: ${config.azure_data_explorer.database}` : null,
              config.azure_data_explorer.table ? `Table: ${config.azure_data_explorer.table}` : null,
            ].filter(Boolean) as string[] : []}
            hasWrite={hasWrite}
            onEdit={() => setAzureOpen(true)}
            onRemove={() => setDeleteTarget("azure")}
          />

          {/* Prometheus Client */}
          <PluginCard
            icon={<BarChart3 className="h-4 w-4" />}
            title="Prometheus Client"
            configured={!!config?.prometheus_client}
            summary={config?.prometheus_client ? [
              config.prometheus_client.port ? `Port: ${config.prometheus_client.port}` : null,
              config.prometheus_client.listen_address ? `Listen: ${config.prometheus_client.listen_address}` : null,
            ].filter(Boolean) as string[] : []}
            hasWrite={hasWrite}
            onEdit={() => setPromClientOpen(true)}
            onRemove={() => setDeleteTarget("prom_client")}
          />
        </div>
      </div>

      {/* Modals */}
      {sourcesOpen && (
        <TelegrafSourcesModal
          open={sourcesOpen}
          onOpenChange={setSourcesOpen}
          config={config}
          caps={caps}
          onSuccess={() => { setSourcesOpen(false); onSuccess(); }}
        />
      )}
      {influxdbOpen && (
        <TelegrafInfluxDBModal
          open={influxdbOpen}
          onOpenChange={setInfluxdbOpen}
          original={config?.influxdb ?? null}
          onSuccess={() => { setInfluxdbOpen(false); onSuccess(); }}
        />
      )}
      {lokiOpen && (
        <TelegrafLokiModal
          open={lokiOpen}
          onOpenChange={setLokiOpen}
          original={config?.loki ?? null}
          onSuccess={() => { setLokiOpen(false); onSuccess(); }}
        />
      )}
      {splunkOpen && (
        <TelegrafSplunkModal
          open={splunkOpen}
          onOpenChange={setSplunkOpen}
          original={config?.splunk ?? null}
          onSuccess={() => { setSplunkOpen(false); onSuccess(); }}
        />
      )}
      {azureOpen && (
        <TelegrafAzureModal
          open={azureOpen}
          onOpenChange={setAzureOpen}
          original={config?.azure_data_explorer ?? null}
          caps={caps}
          onSuccess={() => { setAzureOpen(false); onSuccess(); }}
        />
      )}
      {promClientOpen && (
        <TelegrafPrometheusClientModal
          open={promClientOpen}
          onOpenChange={setPromClientOpen}
          original={config?.prometheus_client ?? null}
          caps={caps}
          onSuccess={() => { setPromClientOpen(false); onSuccess(); }}
        />
      )}

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove output plugin?</AlertDialogTitle>
            <AlertDialogDescription>
              This will delete the output plugin configuration. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

interface PluginCardProps {
  icon: React.ReactNode;
  title: string;
  configured: boolean;
  summary: string[];
  hasWrite: boolean;
  onEdit: () => void;
  onRemove: () => void;
}

function PluginCard({ icon, title, configured, summary, hasWrite, onEdit, onRemove }: PluginCardProps) {
  return (
    <Card className={configured ? "" : "opacity-60"}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="rounded-md p-1.5 bg-primary/10 shrink-0">{icon}</div>
            <p className="text-sm font-medium truncate">{title}</p>
          </div>
          {configured ? (
            <Badge variant="secondary" className="bg-green-500/10 text-green-600 dark:text-green-500 shrink-0 text-xs">
              Active
            </Badge>
          ) : (
            <Badge variant="secondary" className="text-xs shrink-0">
              Not configured
            </Badge>
          )}
        </div>

        {configured && summary.length > 0 && (
          <div className="mt-3 space-y-1">
            {summary.map((s, i) => (
              <p key={i} className="text-xs text-muted-foreground font-mono">{s}</p>
            ))}
          </div>
        )}

        {hasWrite && (
          <div className="mt-3 flex gap-2">
            <Button size="sm" variant="outline" className="flex-1" onClick={onEdit}>
              {configured ? (
                <><Pencil className="h-3.5 w-3.5 mr-1" />Edit</>
              ) : (
                <><Plus className="h-3.5 w-3.5 mr-1" />Configure</>
              )}
            </Button>
            {configured && (
              <Button size="sm" variant="outline" className="text-destructive hover:text-destructive" onClick={onRemove}>
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
