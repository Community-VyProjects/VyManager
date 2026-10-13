"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AlertCircle, Loader2 } from "lucide-react";
import {
  TelegrafAzure,
  ServiceMonitoringCapabilities,
  serviceMonitoringService,
} from "@/lib/api/service-monitoring";

interface TelegrafAzureModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  original: TelegrafAzure | null;
  caps: ServiceMonitoringCapabilities;
  onSuccess: () => void;
}

export function TelegrafAzureModal({ open, onOpenChange, original, caps, onSuccess }: TelegrafAzureModalProps) {
  const t = useTranslations("serviceMonitoring");
  const tc = useTranslations("common");
  const [url, setUrl] = useState(original?.url ?? "");
  const [database, setDatabase] = useState(original?.database ?? "");
  const [table, setTable] = useState(original?.table ?? "");
  const [groupMetrics, setGroupMetrics] = useState(original?.group_metrics ?? "");
  const [clientId, setClientId] = useState(original?.authentication?.client_id ?? "");
  const [clientSecret, setClientSecret] = useState(original?.authentication?.client_secret ?? "");
  const [tenantId, setTenantId] = useState(original?.authentication?.tenant_id ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const groupMetricsValues = caps.features.telegraf.outputs.azure_data_explorer.group_metrics_values;

  const handleSubmit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      await serviceMonitoringService.saveTelegrafAzure(original, {
        url: url || null,
        database: database || null,
        table: table || null,
        group_metrics: groupMetrics || null,
        authentication: {
          client_id: clientId || null,
          client_secret: clientSecret || null,
          tenant_id: tenantId || null,
        },
      });
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : tc("operationFailed"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t("telegraf.configureOutput", { name: "Azure Data Explorer" })}</DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[65vh] pr-4">
          <div className="space-y-4 py-1">
            <div className="space-y-2">
              <Label htmlFor="azure-url">{t("telegraf.azure.endpointUrl")}</Label>
              <Input
                id="azure-url"
                placeholder={t("telegraf.azure.endpointPlaceholder")}
                value={url}
                onChange={(e) => setUrl(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="azure-database">{t("telegraf.azure.database")}</Label>
              <Input
                id="azure-database"
                value={database}
                onChange={(e) => setDatabase(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="azure-table">{t("telegraf.azure.table")}</Label>
              <Input
                id="azure-table"
                value={table}
                onChange={(e) => setTable(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>{t("telegraf.azure.groupMetrics")}</Label>
              <Select value={groupMetrics} onValueChange={setGroupMetrics}>
                <SelectTrigger>
                  <SelectValue placeholder={t("telegraf.azure.groupMetricsPlaceholder")} />
                </SelectTrigger>
                <SelectContent>
                  {groupMetricsValues.map((v) => (
                    <SelectItem key={v} value={v}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="azure-client-id">{t("telegraf.azure.clientId")}</Label>
              <Input
                id="azure-client-id"
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="azure-client-secret">{t("telegraf.azure.clientSecret")}</Label>
              <Input
                id="azure-client-secret"
                type="password"
                value={clientSecret}
                onChange={(e) => setClientSecret(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="azure-tenant-id">{t("telegraf.azure.tenantId")}</Label>
              <Input
                id="azure-tenant-id"
                value={tenantId}
                onChange={(e) => setTenantId(e.target.value)}
              />
            </div>
          </div>
        </ScrollArea>

        {error && (
          <div className="flex items-start gap-2 rounded-md border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
            <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
            <span className="whitespace-pre-wrap">{error}</span>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            {tc("cancel")}
          </Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            {tc("save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
