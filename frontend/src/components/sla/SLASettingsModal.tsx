"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AlertTriangle, Loader2 } from "lucide-react";
import { slaService, SLAConfig } from "@/lib/api/sla";

interface SLASettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  config: SLAConfig;
  onSuccess: () => void;
}

export function SLASettingsModal({
  open,
  onOpenChange,
  config,
  onSuccess,
}: SLASettingsModalProps) {
  const t = useTranslations("sla");
  const tc = useTranslations("common");
  const [owampEnabled, setOwampEnabled] = useState(config.owamp_server.enabled);
  const [owampPort, setOwampPort] = useState(
    config.owamp_server.port !== null ? String(config.owamp_server.port) : ""
  );
  const [twampEnabled, setTwampEnabled] = useState(config.twamp_server.enabled);
  const [twampPort, setTwampPort] = useState(
    config.twamp_server.port !== null ? String(config.twamp_server.port) : ""
  );

  const [submitting, setSubmitting] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const validatePort = (value: string): string | null => {
    if (!value) return null;
    const n = Number(value);
    if (!Number.isInteger(n) || n < 1 || n > 65535) {
      return t("settings.portRange");
    }
    return null;
  };

  const owampPortError = validatePort(owampPort);
  const twampPortError = validatePort(twampPort);
  const hasPortError = !!(owampPortError || twampPortError);

  const handleSubmit = async () => {
    if (hasPortError) return;
    setSubmitting(true);
    setApiError(null);
    try {
      await slaService.updateSettings(
        config,
        owampEnabled,
        owampPort,
        twampEnabled,
        twampPort
      );
      onSuccess();
      onOpenChange(false);
    } catch (err) {
      setApiError(err instanceof Error ? err.message : tc("operationFailed"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t("settings.title")}</DialogTitle>
          <DialogDescription>
            {t("settings.description")}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="space-y-6 py-1">
            {/* OWAMP Server */}
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <Checkbox
                  id="owamp-enabled"
                  checked={owampEnabled}
                  onCheckedChange={(checked) => {
                    setOwampEnabled(!!checked);
                    if (!checked) setOwampPort("");
                    setApiError(null);
                  }}
                />
                <Label htmlFor="owamp-enabled" className="cursor-pointer leading-tight">
                  <span className="font-medium">{t("settings.enableOwamp")}</span>
                  <span className="block text-xs text-muted-foreground mt-0.5">
                    {t("settings.owampHint")}
                  </span>
                </Label>
              </div>

              <div className="space-y-1.5 pl-7">
                <Label
                  htmlFor="owamp-port"
                  className={!owampEnabled ? "text-muted-foreground" : ""}
                >
                  {t("settings.port")}
                </Label>
                <Input
                  id="owamp-port"
                  type="number"
                  min={1}
                  max={65535}
                  placeholder={t("settings.portPlaceholder", { port: "861" })}
                  value={owampPort}
                  onChange={(e) => {
                    setOwampPort(e.target.value);
                    setApiError(null);
                  }}
                  disabled={!owampEnabled}
                />
                {owampPortError && owampEnabled && (
                  <p className="text-xs text-destructive">{owampPortError}</p>
                )}
                {!owampPortError && (
                  <p className="text-xs text-muted-foreground">
                    {t("settings.portHint", { port: "861" })}
                  </p>
                )}
              </div>
            </div>

            <Separator />

            {/* TWAMP Server */}
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <Checkbox
                  id="twamp-enabled"
                  checked={twampEnabled}
                  onCheckedChange={(checked) => {
                    setTwampEnabled(!!checked);
                    if (!checked) setTwampPort("");
                    setApiError(null);
                  }}
                />
                <Label htmlFor="twamp-enabled" className="cursor-pointer leading-tight">
                  <span className="font-medium">{t("settings.enableTwamp")}</span>
                  <span className="block text-xs text-muted-foreground mt-0.5">
                    {t("settings.twampHint")}
                  </span>
                </Label>
              </div>

              <div className="space-y-1.5 pl-7">
                <Label
                  htmlFor="twamp-port"
                  className={!twampEnabled ? "text-muted-foreground" : ""}
                >
                  {t("settings.port")}
                </Label>
                <Input
                  id="twamp-port"
                  type="number"
                  min={1}
                  max={65535}
                  placeholder={t("settings.portPlaceholder", { port: "862" })}
                  value={twampPort}
                  onChange={(e) => {
                    setTwampPort(e.target.value);
                    setApiError(null);
                  }}
                  disabled={!twampEnabled}
                />
                {twampPortError && twampEnabled && (
                  <p className="text-xs text-destructive">{twampPortError}</p>
                )}
                {!twampPortError && (
                  <p className="text-xs text-muted-foreground">
                    {t("settings.portHint", { port: "862" })}
                  </p>
                )}
              </div>
            </div>
          </div>
        </ScrollArea>

        {apiError && (
          <div className="flex items-start gap-2 rounded-md border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
            <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
            <span className="whitespace-pre-wrap">{apiError}</span>
          </div>
        )}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
          >
            {tc("cancel")}
          </Button>
          <Button onClick={handleSubmit} disabled={submitting || hasPortError}>
            {submitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            {tc("save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
