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
import { AlertCircle, Loader2, Plus, Settings, Trash2 } from "lucide-react";
import { pppoeServerService, PPPoECapabilities, PPPoEConfigResponse } from "@/lib/api/pppoe-server";
import {
  advancedProblem,
  PADO_DISABLE,
  PPPOE_RANGES,
  type PPPoEAdvancedDraft,
  type PPPoEPadoDelayRow,
} from "@/lib/api/pppoe-server-save-ops";
import type { ApiError } from "@/lib/types/api";
import { CapabilitySelect } from "./CapabilitySelect";

interface AdvancedSettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  config: PPPoEConfigResponse;
  capabilities: PPPoECapabilities | null;
}

export function AdvancedSettingsModal({ open, onOpenChange, onSuccess, config, capabilities }: AdvancedSettingsModalProps) {
  const t = useTranslations("pppoeServerSettings");
  const tc = useTranslations("common");
  // The page remounts this modal (key) on every open, so state seeds from props.
  const [draft, setDraft] = useState<PPPoEAdvancedDraft>(() => ({
    log_level: config.log.level || "",
    pado_delays: config.pado_delays.map((d) => ({ delay: d.delay, sessions: d.sessions || "" })),
    limits_enabled: config.limits.enabled,
    limits_burst: config.limits.burst || "",
    limits_connection_limit: config.limits.connection_limit || "",
    limits_timeout: config.limits.timeout || "",
    shaper_enabled: config.shaper.enabled,
    shaper_fwmark: config.shaper.fwmark || "",
    snmp_enabled: config.snmp.enabled,
    snmp_master_agent: config.snmp.master_agent,
    scripts_enabled: config.extended_scripts.enabled,
    scripts_on_change: config.extended_scripts.on_change || "",
    scripts_on_down: config.extended_scripts.on_down || "",
    scripts_on_pre_up: config.extended_scripts.on_pre_up || "",
    scripts_on_up: config.extended_scripts.on_up || "",
  }));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const logLabels: Record<string, string> = {
    "0": t("advanced.logLevel0"),
    "1": t("advanced.logLevel1"),
    "2": t("advanced.logLevel2"),
    "3": t("advanced.logLevel3"),
    "4": t("advanced.logLevel4"),
    "5": t("advanced.logLevel5"),
  };
  const update = (patch: Partial<PPPoEAdvancedDraft>) => setDraft((current) => ({ ...current, ...patch }));
  const updateDelay = (index: number, patch: Partial<PPPoEPadoDelayRow>) => {
    update({ pado_delays: draft.pado_delays.map((row, i) => (i === index ? { ...row, ...patch } : row)) });
  };

  const handleOpenChange = (next: boolean) => {
    if (!loading) onOpenChange(next);
  };

  const handleSubmit = async () => {
    const issue = advancedProblem(draft);
    if (issue) {
      setError(t(`advanced.${issue.problem}`, issue.params));
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await pppoeServerService.updateAdvancedSettings(config, draft);
      onOpenChange(false);
      onSuccess();
    } catch (err) {
      setError((err as ApiError).message || t("advanced.updateFailed"));
    } finally {
      setLoading(false);
    }
  };

  const { padoDelay, padoSessions, shaperFwmark } = PPPOE_RANGES;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-primary" />
            {t("advanced.title")}
          </DialogTitle>
          <DialogDescription>{t("advanced.description")}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="pppoe-log-level">{t("advanced.logLevel")}</Label>
            <CapabilitySelect
              id="pppoe-log-level"
              value={draft.log_level}
              values={capabilities?.values.log_levels || []}
              labels={logLabels}
              noneLabel={t("advanced.defaultUnset")}
              onChange={(log_level) => update({ log_level })}
            />
          </div>

          <Separator />
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium">{t("advanced.padoDelays")}</h4>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => update({ pado_delays: [...draft.pado_delays, { delay: "", sessions: "" }] })}
            >
              <Plus className="h-3 w-3 mr-1" /> {tc("add")}
            </Button>
          </div>
          {draft.pado_delays.length === 0 && (
            <p className="text-xs text-muted-foreground">{t("advanced.noPadoDelays")}</p>
          )}
          {draft.pado_delays.map((row, i) => (
            <div key={i} className="flex gap-2 items-center">
              <Input
                list="pppoe-pado-delay-keywords"
                value={row.delay}
                onChange={(e) => updateDelay(i, { delay: e.target.value })}
                placeholder={t("advanced.delayPlaceholder", { min: padoDelay.min, max: padoDelay.max })}
                className="flex-1 font-mono text-sm"
              />
              <Input
                type="number"
                min={padoSessions.min}
                max={padoSessions.max}
                value={row.sessions}
                onChange={(e) => updateDelay(i, { sessions: e.target.value })}
                placeholder={t("advanced.sessionsPlaceholder")}
                className="w-32 text-sm"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-9 w-9 shrink-0"
                onClick={() => update({ pado_delays: draft.pado_delays.filter((_, j) => j !== i) })}
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          ))}
          <datalist id="pppoe-pado-delay-keywords">
            <option value={PADO_DISABLE} />
          </datalist>

          <Separator />
          <div className="flex items-center gap-2">
            <Checkbox id="pppoe-limits" checked={draft.limits_enabled} onCheckedChange={(v) => update({ limits_enabled: !!v })} />
            <Label htmlFor="pppoe-limits" className="cursor-pointer font-medium">{t("advanced.connectionLimits")}</Label>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="pppoe-limits-burst">{t("advanced.burst")}</Label>
              <Input
                id="pppoe-limits-burst"
                value={draft.limits_burst}
                onChange={(e) => update({ limits_burst: e.target.value })}
                placeholder="10"
                disabled={!draft.limits_enabled}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pppoe-limits-conn">{t("advanced.connLimit")}</Label>
              <Input
                id="pppoe-limits-conn"
                value={draft.limits_connection_limit}
                onChange={(e) => update({ limits_connection_limit: e.target.value })}
                placeholder="60/sec"
                disabled={!draft.limits_enabled}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pppoe-limits-timeout">{t("advanced.timeout")}</Label>
              <Input
                id="pppoe-limits-timeout"
                value={draft.limits_timeout}
                onChange={(e) => update({ limits_timeout: e.target.value })}
                placeholder={t("advanced.secondsPlaceholder")}
                disabled={!draft.limits_enabled}
              />
            </div>
          </div>

          <Separator />
          <div className="flex items-center gap-2">
            <Checkbox id="pppoe-shaper" checked={draft.shaper_enabled} onCheckedChange={(v) => update({ shaper_enabled: !!v })} />
            <Label htmlFor="pppoe-shaper" className="cursor-pointer font-medium">{t("advanced.shaper")}</Label>
          </div>
          <div className="space-y-2">
            <Label htmlFor="pppoe-shaper-fwmark">FWMark</Label>
            <Input
              id="pppoe-shaper-fwmark"
              type="number"
              min={shaperFwmark.min}
              max={shaperFwmark.max}
              value={draft.shaper_fwmark}
              onChange={(e) => update({ shaper_fwmark: e.target.value })}
              placeholder={`${shaperFwmark.min}-${shaperFwmark.max}`}
              disabled={!draft.shaper_enabled}
            />
          </div>

          <Separator />
          <div className="flex items-center gap-2">
            <Checkbox id="pppoe-snmp" checked={draft.snmp_enabled} onCheckedChange={(v) => update({ snmp_enabled: !!v })} />
            <Label htmlFor="pppoe-snmp" className="cursor-pointer font-medium">{t("advanced.snmp")}</Label>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              id="snmp-agent"
              checked={draft.snmp_master_agent}
              onCheckedChange={(v) => update({ snmp_master_agent: !!v })}
              disabled={!draft.snmp_enabled}
            />
            <Label htmlFor="snmp-agent" className="cursor-pointer">{t("advanced.snmpMasterAgent")}</Label>
          </div>

          <Separator />
          <div className="flex items-center gap-2">
            <Checkbox id="pppoe-scripts" checked={draft.scripts_enabled} onCheckedChange={(v) => update({ scripts_enabled: !!v })} />
            <Label htmlFor="pppoe-scripts" className="cursor-pointer font-medium">{t("advanced.extendedScripts")}</Label>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="pppoe-script-change">{t("advanced.onChange")}</Label>
              <Input
                id="pppoe-script-change"
                value={draft.scripts_on_change}
                onChange={(e) => update({ scripts_on_change: e.target.value })}
                placeholder="/path/to/script"
                disabled={!draft.scripts_enabled}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pppoe-script-down">{t("advanced.onDown")}</Label>
              <Input
                id="pppoe-script-down"
                value={draft.scripts_on_down}
                onChange={(e) => update({ scripts_on_down: e.target.value })}
                placeholder="/path/to/script"
                disabled={!draft.scripts_enabled}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="pppoe-script-pre-up">{t("advanced.onPreUp")}</Label>
              <Input
                id="pppoe-script-pre-up"
                value={draft.scripts_on_pre_up}
                onChange={(e) => update({ scripts_on_pre_up: e.target.value })}
                placeholder="/path/to/script"
                disabled={!draft.scripts_enabled}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pppoe-script-up">{t("advanced.onUp")}</Label>
              <Input
                id="pppoe-script-up"
                value={draft.scripts_on_up}
                onChange={(e) => update({ scripts_on_up: e.target.value })}
                placeholder="/path/to/script"
                disabled={!draft.scripts_enabled}
              />
            </div>
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
