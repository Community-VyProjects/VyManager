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
import { AlertCircle, Loader2 } from "lucide-react";
import {
  TelegrafInfluxDB,
  serviceMonitoringService,
} from "@/lib/api/service-monitoring";

interface TelegrafInfluxDBModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  original: TelegrafInfluxDB | null;
  onSuccess: () => void;
}

export function TelegrafInfluxDBModal({
  open,
  onOpenChange,
  original,
  onSuccess,
}: TelegrafInfluxDBModalProps) {
  const t = useTranslations("serviceMonitoring");
  const tc = useTranslations("common");
  const [url, setUrl] = useState(original?.url ?? "");
  const [port, setPort] = useState(original?.port ? String(original.port) : "");
  const [bucket, setBucket] = useState(original?.bucket ?? "");
  const [token, setToken] = useState(original?.authentication?.token ?? "");
  const [organization, setOrganization] = useState(original?.authentication?.organization ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      await serviceMonitoringService.saveTelegrafInfluxDB(original, {
        url: url || null,
        port: port ? parseInt(port, 10) : null,
        bucket: bucket || null,
        authentication: {
          token: token || null,
          organization: organization || null,
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
          <DialogTitle>{t("telegraf.configureOutput", { name: "InfluxDB" })}</DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="space-y-4 py-1">
            <div className="space-y-2">
              <Label htmlFor="influxdb-url">URL</Label>
              <Input
                id="influxdb-url"
                placeholder={t("telegraf.influxdb.urlPlaceholder")}
                value={url}
                onChange={(e) => setUrl(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="influxdb-port">{t("common.port")}</Label>
              <Input
                id="influxdb-port"
                type="number"
                placeholder="8086"
                value={port}
                onChange={(e) => setPort(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="influxdb-bucket">{t("telegraf.influxdb.bucket")}</Label>
              <Input
                id="influxdb-bucket"
                placeholder={t("telegraf.influxdb.bucketPlaceholder")}
                value={bucket}
                onChange={(e) => setBucket(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="influxdb-token">{t("telegraf.token")}</Label>
              <Input
                id="influxdb-token"
                type="password"
                placeholder={t("telegraf.influxdb.tokenPlaceholder")}
                value={token}
                onChange={(e) => setToken(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="influxdb-org">{t("telegraf.influxdb.organization")}</Label>
              <Input
                id="influxdb-org"
                placeholder={t("telegraf.influxdb.organizationPlaceholder")}
                value={organization}
                onChange={(e) => setOrganization(e.target.value)}
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
