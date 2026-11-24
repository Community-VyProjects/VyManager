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
import { AlertCircle, Loader2, Settings } from "lucide-react";
import { NamedListSelect } from "@/components/ui/named-list-select";
import { pppoeServerService, PPPoECapabilities, PPPoERadiusSettings } from "@/lib/api/pppoe-server";
import {
  PPPOE_RANGES,
  radiusSettingsProblem,
  type NumberRange,
  type PPPoERadiusSettingsDraft,
} from "@/lib/api/pppoe-server-save-ops";
import type { ApiError } from "@/lib/types/api";

interface RadiusSettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  currentSettings: PPPoERadiusSettings;
  capabilities: PPPoECapabilities | null;
}

type TextField = {
  [K in keyof PPPoERadiusSettingsDraft]: PPPoERadiusSettingsDraft[K] extends string ? K : never;
}[keyof PPPoERadiusSettingsDraft];

export function RadiusSettingsModal({ open, onOpenChange, onSuccess, currentSettings, capabilities }: RadiusSettingsModalProps) {
  const t = useTranslations("pppoeServerSettings");
  const tc = useTranslations("common");
  // The page remounts this modal (key) on every open, so state seeds from props.
  // The optional DAE key loads as the mask: the mask keeps it, blank deletes it.
  const [draft, setDraft] = useState<PPPoERadiusSettingsDraft>(() => ({
    source_address: currentSettings.source_address || "",
    timeout: currentSettings.timeout || "",
    max_try: currentSettings.max_try || "",
    nas_identifier: currentSettings.nas_identifier || "",
    nas_ip_address: currentSettings.nas_ip_address || "",
    preallocate_vif: currentSettings.preallocate_vif,
    accounting_interim_interval: currentSettings.accounting_interim_interval || "",
    acct_interim_jitter: currentSettings.acct_interim_jitter || "",
    acct_timeout: currentSettings.acct_timeout || "",
    called_sid_format: currentSettings.called_sid_format || "",
    dae_server: currentSettings.dynamic_author.server || "",
    dae_port: currentSettings.dynamic_author.port || "",
    dae_key: currentSettings.dynamic_author.key || "",
    rate_limit_enable: currentSettings.rate_limit.enable,
    rate_limit_attribute: currentSettings.rate_limit.attribute || "",
    rate_limit_vendor: currentSettings.rate_limit.vendor || "",
    rate_limit_multiplier: currentSettings.rate_limit.multiplier || "",
  }));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const update = (patch: Partial<PPPoERadiusSettingsDraft>) => setDraft((current) => ({ ...current, ...patch }));

  const handleOpenChange = (next: boolean) => {
    if (!loading) onOpenChange(next);
  };

  const handleSubmit = async () => {
    const issue = radiusSettingsProblem(currentSettings, draft);
    if (issue) {
      setError(t(`radiusSettings.${issue.problem}`, issue.params));
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await pppoeServerService.updateRadiusSettings(currentSettings, draft);
      onOpenChange(false);
      onSuccess();
    } catch (err) {
      setError((err as ApiError).message || t("radiusSettings.updateFailed"));
    } finally {
      setLoading(false);
    }
  };

  const numberField = (
    id: string,
    label: string,
    field: TextField,
    range: NumberRange,
    step?: number,
    disabled = false,
  ) => (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type="number"
        min={range.min}
        max={range.max}
        step={step}
        value={draft[field]}
        onChange={(e) => update({ [field]: e.target.value })}
        placeholder={`${range.min}-${range.max}`}
        disabled={disabled}
      />
    </div>
  );

  // The DAE port and key only serve a DAE server; without one the save deletes them.
  const daeOff = !draft.dae_server.trim();

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-primary" />
            {t("radiusSettings.title")}
          </DialogTitle>
          <DialogDescription>{t("radiusSettings.description")}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <h4 className="text-sm font-medium">{t("radiusSettings.general")}</h4>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="pppoe-radius-source">{t("radiusSettings.sourceAddress")}</Label>
              <Input
                id="pppoe-radius-source"
                value={draft.source_address}
                onChange={(e) => update({ source_address: e.target.value })}
                placeholder="10.0.0.1"
              />
            </div>
            {numberField("pppoe-radius-timeout", t("radiusSettings.timeout"), "timeout", PPPOE_RANGES.radiusTimeout)}
          </div>
          <div className="grid grid-cols-2 gap-4">
            {numberField("pppoe-radius-max-try", t("radiusSettings.maxTry"), "max_try", PPPOE_RANGES.radiusMaxTry)}
            <div className="space-y-2">
              <Label htmlFor="pppoe-radius-nas-id">{t("radiusSettings.nasIdentifier")}</Label>
              <Input
                id="pppoe-radius-nas-id"
                value={draft.nas_identifier}
                onChange={(e) => update({ nas_identifier: e.target.value })}
                placeholder="vyos-pppoe"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="pppoe-radius-nas-ip">{t("radiusSettings.nasIpAddress")}</Label>
            <Input
              id="pppoe-radius-nas-ip"
              value={draft.nas_ip_address}
              onChange={(e) => update({ nas_ip_address: e.target.value })}
              placeholder="10.0.0.1"
            />
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              id="preallocate-vif"
              checked={draft.preallocate_vif}
              onCheckedChange={(v) => update({ preallocate_vif: !!v })}
            />
            <Label htmlFor="preallocate-vif" className="cursor-pointer">{t("radiusSettings.preallocateVif")}</Label>
          </div>

          <Separator />
          <h4 className="text-sm font-medium">{t("radiusSettings.accounting")}</h4>
          <div className="grid grid-cols-3 gap-4">
            {numberField("pppoe-radius-interim", t("radiusSettings.interimInterval"), "accounting_interim_interval",
              PPPOE_RANGES.radiusAcctInterimInterval)}
            {numberField("pppoe-radius-jitter", t("radiusSettings.interimJitter"), "acct_interim_jitter",
              PPPOE_RANGES.radiusAcctInterimJitter)}
            {numberField("pppoe-radius-acct-timeout", t("radiusSettings.acctTimeout"), "acct_timeout",
              PPPOE_RANGES.radiusAcctTimeout)}
          </div>

          <Separator />
          <h4 className="text-sm font-medium">{t("radiusSettings.calledStation")}</h4>
          <div className="space-y-2">
            <Label htmlFor="pppoe-radius-called-sid">{t("radiusSettings.calledSidFormat")}</Label>
            <NamedListSelect
              id="pppoe-radius-called-sid"
              value={draft.called_sid_format}
              names={capabilities?.values.called_sid_formats || []}
              onValueChange={(called_sid_format) => update({ called_sid_format })}
              noneLabel={tc("default")}
            />
          </div>

          <Separator />
          <h4 className="text-sm font-medium">{t("radiusSettings.dynamicAuthorization")}</h4>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="pppoe-dae-server">{t("radiusSettings.daeServer")}</Label>
              <Input
                id="pppoe-dae-server"
                value={draft.dae_server}
                onChange={(e) => update({ dae_server: e.target.value })}
                placeholder="10.0.0.100"
              />
            </div>
            {numberField("pppoe-dae-port", t("radiusSettings.daePort"), "dae_port", PPPOE_RANGES.port, undefined, daeOff)}
          </div>
          <div className="space-y-2">
            <Label htmlFor="pppoe-dae-key">{t("radiusSettings.daeKey")}</Label>
            <Input
              id="pppoe-dae-key"
              type="password"
              autoComplete="new-password"
              value={draft.dae_key}
              onChange={(e) => update({ dae_key: e.target.value })}
              placeholder={t("radiusSettings.daeKeyEnter")}
              disabled={daeOff}
            />
          </div>

          <Separator />
          <h4 className="text-sm font-medium">{t("radiusSettings.rateLimiting")}</h4>
          <div className="flex items-center gap-2">
            <Checkbox
              id="rate-limit-enable"
              checked={draft.rate_limit_enable}
              onCheckedChange={(v) => update({ rate_limit_enable: !!v })}
            />
            <Label htmlFor="rate-limit-enable" className="cursor-pointer">{t("radiusSettings.enableRateLimiting")}</Label>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="pppoe-rate-attribute">{t("radiusSettings.attribute")}</Label>
              {/* eslint-disable-next-line vymanager/no-untranslated-text -- RADIUS attribute name */}
              <Input id="pppoe-rate-attribute" value={draft.rate_limit_attribute} onChange={(e) => update({ rate_limit_attribute: e.target.value })} placeholder="Filter-Id" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pppoe-rate-vendor">{t("radiusSettings.vendor")}</Label>
              <Input
                id="pppoe-rate-vendor"
                value={draft.rate_limit_vendor}
                onChange={(e) => update({ rate_limit_vendor: e.target.value })}
              />
            </div>
            {numberField("pppoe-rate-multiplier", t("radiusSettings.multiplier"), "rate_limit_multiplier",
              PPPOE_RANGES.radiusRateLimitMultiplier, 0.001)}
          </div>
        </div>

        {error && (
          <div className="flex items-start gap-2 rounded-lg bg-destructive/10 border border-destructive/20 p-3">
            <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
            <p className="text-sm text-destructive whitespace-pre-wrap">{error}</p>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>{tc("cancel")}</Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />{tc("saving")}</> : tc("saveChanges")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
