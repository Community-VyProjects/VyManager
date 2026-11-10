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
import { Checkbox } from "@/components/ui/checkbox";
import { AlertCircle, Loader2 } from "lucide-react";
import { TelegrafSplunk, serviceMonitoringService } from "@/lib/api/service-monitoring";

interface TelegrafSplunkModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  original: TelegrafSplunk | null;
  onSuccess: () => void;
}

export function TelegrafSplunkModal({ open, onOpenChange, original, onSuccess }: TelegrafSplunkModalProps) {
  const t = useTranslations("serviceMonitoring");
  const tc = useTranslations("common");
  const [url, setUrl] = useState(original?.url ?? "");
  const [token, setToken] = useState(original?.authentication?.token ?? "");
  const [insecure, setInsecure] = useState(original?.authentication?.insecure ?? false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      await serviceMonitoringService.saveTelegrafSplunk(original, {
        url: url || null,
        authentication: {
          token: token || null,
          insecure,
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
          <DialogTitle>{t("telegraf.configureOutput", { name: "Splunk" })}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-1">
          <div className="space-y-2">
            <Label htmlFor="splunk-url">URL</Label>
            <Input
              id="splunk-url"
              placeholder={t("telegraf.splunk.urlPlaceholder")}
              value={url}
              onChange={(e) => setUrl(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="splunk-token">{t("telegraf.token")}</Label>
            <Input
              id="splunk-token"
              type="password"
              placeholder={t("telegraf.splunk.tokenPlaceholder")}
              value={token}
              onChange={(e) => setToken(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              id="splunk-insecure"
              checked={insecure}
              onCheckedChange={(checked) => setInsecure(!!checked)}
            />
            <Label htmlFor="splunk-insecure" className="cursor-pointer">
              {t("telegraf.splunk.skipTlsVerify")}
            </Label>
          </div>
        </div>

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
