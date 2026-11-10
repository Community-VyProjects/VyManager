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
import { AlertCircle, Loader2 } from "lucide-react";
import { sshService, SSHConfig, SSHCapabilities } from "@/lib/api/ssh";
import { SSHMultiValueField, isValidIP } from "./SSHMultiValueField";

interface SSHProtectionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  config: SSHConfig;
  capabilities: SSHCapabilities;
  onSuccess: () => void;
}

export function SSHProtectionModal({
  open,
  onOpenChange,
  config,
  capabilities,
  onSuccess,
}: SSHProtectionModalProps) {
  const t = useTranslations("ssh");
  const tc = useTranslations("common");
  const defaults = capabilities.features.dynamic_protection.defaults;

  const [disableHostValidation, setDisableHostValidation] = useState(config.disable_host_validation);
  const [dpEnabled, setDpEnabled] = useState(config.dynamic_protection.enabled);
  const [allowFrom, setAllowFrom] = useState<string[]>(config.dynamic_protection.allow_from);
  const [blockTime, setBlockTime] = useState(config.dynamic_protection.block_time ?? "");
  const [detectTime, setDetectTime] = useState(config.dynamic_protection.detect_time ?? "");
  const [threshold, setThreshold] = useState(config.dynamic_protection.threshold ?? "");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    setSubmitting(true);
    setError(null);
    const next: SSHConfig = {
      ...config,
      disable_host_validation: disableHostValidation,
      dynamic_protection: {
        enabled: dpEnabled,
        allow_from: allowFrom,
        block_time: blockTime.trim() || null,
        detect_time: detectTime.trim() || null,
        threshold: threshold.trim() || null,
      },
    };
    try {
      await sshService.updateConfig(config, next);
      onSuccess();
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : tc("operationFailed"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("content.protection")}</DialogTitle>
          <DialogDescription>
            {t("protection.description")}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[65vh] pr-4">
          <div className="space-y-5 py-1">
            <div className="flex items-start gap-3">
              <Checkbox
                id="disable-host-validation"
                checked={disableHostValidation}
                onCheckedChange={(c) => setDisableHostValidation(!!c)}
              />
              <Label htmlFor="disable-host-validation" className="cursor-pointer leading-tight">
                <span className="font-medium">{t("protection.disableHostValidation")}</span>
                <span className="block text-xs text-muted-foreground mt-0.5">
                  {t("protection.disableHostValidationHelp")}
                </span>
              </Label>
            </div>

            <Separator />

            <div className="flex items-start gap-3">
              <Checkbox
                id="dynamic-protection"
                checked={dpEnabled}
                onCheckedChange={(c) => setDpEnabled(!!c)}
              />
              <Label htmlFor="dynamic-protection" className="cursor-pointer leading-tight">
                <span className="font-medium">{t("protection.enableDynamic")}</span>
                <span className="block text-xs text-muted-foreground mt-0.5">
                  {t("protection.enableDynamicHelp")}
                </span>
              </Label>
            </div>

            {dpEnabled && (
              <div className="space-y-4 pl-7">
                <SSHMultiValueField
                  label={t("content.allowFrom")}
                  description={t("protection.allowFromHelp")}
                  placeholder={t("protection.allowFromPlaceholder")}
                  values={allowFrom}
                  onChange={setAllowFrom}
                  validate={(v) =>
                    isValidIP(v, true) ? null : t("protection.invalidNetwork")
                  }
                />

                <div className="space-y-1.5">
                  <Label htmlFor="dp-threshold" className="text-xs font-medium">
                    {t("content.threshold")}
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    {t("protection.thresholdHelp", { value: String(defaults.threshold) })}
                  </p>
                  <Input
                    id="dp-threshold"
                    type="number"
                    min={1}
                    max={65535}
                    placeholder={defaults.threshold}
                    value={threshold}
                    onChange={(e) => setThreshold(e.target.value)}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="dp-block" className="text-xs font-medium">
                    {t("protection.blockTimeSeconds")}
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    {t("protection.blockTimeHelp", { value: String(defaults.block_time) })}
                  </p>
                  <Input
                    id="dp-block"
                    type="number"
                    min={1}
                    max={65535}
                    placeholder={defaults.block_time}
                    value={blockTime}
                    onChange={(e) => setBlockTime(e.target.value)}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="dp-detect" className="text-xs font-medium">
                    {t("protection.detectTimeSeconds")}
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    {t("protection.detectTimeHelp", { value: String(defaults.detect_time) })}
                  </p>
                  <Input
                    id="dp-detect"
                    type="number"
                    min={1}
                    max={65535}
                    placeholder={defaults.detect_time}
                    value={detectTime}
                    onChange={(e) => setDetectTime(e.target.value)}
                  />
                </div>
              </div>
            )}
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
