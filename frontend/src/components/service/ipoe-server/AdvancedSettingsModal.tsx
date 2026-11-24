"use client";

import { useState, useEffect } from "react";
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
import { NamedListSelect } from "@/components/ui/named-list-select";
import { AlertCircle, Loader2, Settings } from "lucide-react";
import { ipoeServerService, IPoECapabilities, IPoEConfigResponse } from "@/lib/api/ipoe-server";
import { ApiError } from "@/lib/types/api";

interface AdvancedSettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  config: IPoEConfigResponse;
  capabilities: IPoECapabilities | null;
}

export function AdvancedSettingsModal({ open, onOpenChange, onSuccess, config, capabilities }: AdvancedSettingsModalProps) {
  const t = useTranslations("ipoeServer");
  const tc = useTranslations("common");

  const [logLevel, setLogLevel] = useState("");
  const [shaperEnabled, setShaperEnabled] = useState(false);
  const [shaperFwmark, setShaperFwmark] = useState("");
  const [snmpEnabled, setSnmpEnabled] = useState(false);
  const [snmpMasterAgent, setSnmpMasterAgent] = useState(false);
  const [limitsEnabled, setLimitsEnabled] = useState(false);
  const [limitsBurst, setLimitsBurst] = useState("");
  const [limitsConnLimit, setLimitsConnLimit] = useState("");
  const [limitsTimeout, setLimitsTimeout] = useState("");
  const [scriptsOnChange, setScriptsOnChange] = useState("");
  const [scriptsOnDown, setScriptsOnDown] = useState("");
  const [scriptsOnPreUp, setScriptsOnPreUp] = useState("");
  const [scriptsOnUp, setScriptsOnUp] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setLogLevel(config.log?.level || "");
      setShaperEnabled(config.shaper?.enabled || false);
      setShaperFwmark(config.shaper?.fwmark || "");
      setSnmpEnabled(config.snmp?.enabled || false);
      setSnmpMasterAgent(config.snmp?.master_agent || false);
      setLimitsEnabled(config.limits?.enabled || false);
      setLimitsBurst(config.limits?.burst || "");
      setLimitsConnLimit(config.limits?.connection_limit || "");
      setLimitsTimeout(config.limits?.timeout || "");
      setScriptsOnChange(config.extended_scripts?.on_change || "");
      setScriptsOnDown(config.extended_scripts?.on_down || "");
      setScriptsOnPreUp(config.extended_scripts?.on_pre_up || "");
      setScriptsOnUp(config.extended_scripts?.on_up || "");
      setError(null);
    }
  }, [open, config]);

  const handleOpenChange = (next: boolean) => {
    if (!loading) onOpenChange(next);
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await ipoeServerService.updateAdvancedSettings(config, {
        log_level: logLevel,
        shaper_enabled: shaperEnabled,
        shaper_fwmark: shaperFwmark,
        snmp_enabled: snmpEnabled,
        snmp_master_agent: snmpMasterAgent,
        limits_enabled: limitsEnabled,
        limits_burst: limitsBurst,
        limits_connection_limit: limitsConnLimit,
        limits_timeout: limitsTimeout,
        scripts_on_change: scriptsOnChange,
        scripts_on_down: scriptsOnDown,
        scripts_on_pre_up: scriptsOnPreUp,
        scripts_on_up: scriptsOnUp,
      });
      if (result.success) {
        onOpenChange(false);
        onSuccess();
      } else {
        setError(result.error || t("advancedModal.updateFailed"));
      }
    } catch (err) {
      setError((err as ApiError).message || t("advancedModal.updateFailed"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-primary" />
            {t("advancedModal.title")}
          </DialogTitle>
          <DialogDescription>{t("advancedModal.description")}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>{t("advancedModal.logLevel")}</Label>
            <NamedListSelect
              value={logLevel}
              names={capabilities?.values.log_levels || []}
              onValueChange={setLogLevel}
              noneLabel={tc("default")}
            />
          </div>

          <Separator />
          <div className="flex items-center gap-2">
            <Checkbox id="shaper-enabled" checked={shaperEnabled} onCheckedChange={(v) => setShaperEnabled(!!v)} />
            <Label htmlFor="shaper-enabled" className="cursor-pointer">{t("advancedModal.shaper")}</Label>
          </div>
          <div className="space-y-2">
            <Label>{t("advancedModal.shaperFwmark")}</Label>
            <Input
              value={shaperFwmark}
              onChange={(e) => setShaperFwmark(e.target.value)}
              placeholder="1-2147483647"
              disabled={!shaperEnabled}
            />
          </div>

          <Separator />
          <div className="flex items-center gap-2">
            <Checkbox id="snmp-enabled" checked={snmpEnabled} onCheckedChange={(v) => setSnmpEnabled(!!v)} />
            <Label htmlFor="snmp-enabled" className="cursor-pointer">{t("advancedModal.snmp")}</Label>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              id="snmp-agent"
              checked={snmpMasterAgent}
              onCheckedChange={(v) => setSnmpMasterAgent(!!v)}
              disabled={!snmpEnabled}
            />
            <Label htmlFor="snmp-agent" className="cursor-pointer">{t("advancedModal.snmpMasterAgent")}</Label>
          </div>

          <Separator />
          <div className="flex items-center gap-2">
            <Checkbox id="limits-enabled" checked={limitsEnabled} onCheckedChange={(v) => setLimitsEnabled(!!v)} />
            <Label htmlFor="limits-enabled" className="cursor-pointer">{t("advancedModal.connectionLimits")}</Label>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>{t("advancedModal.burst")}</Label>
              <Input value={limitsBurst} onChange={(e) => setLimitsBurst(e.target.value)} placeholder="10" disabled={!limitsEnabled} />
            </div>
            <div className="space-y-2">
              <Label>{t("advancedModal.connLimit")}</Label>
              <Input value={limitsConnLimit} onChange={(e) => setLimitsConnLimit(e.target.value)} placeholder="1/min" disabled={!limitsEnabled} />
            </div>
            <div className="space-y-2">
              <Label>{t("advancedModal.timeout")}</Label>
              <Input value={limitsTimeout} onChange={(e) => setLimitsTimeout(e.target.value)} placeholder="60" disabled={!limitsEnabled} />
            </div>
          </div>

          <Separator />
          <h4 className="text-sm font-medium">{t("advancedModal.extendedScripts")}</h4>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t("advancedModal.onChange")}</Label>
              <Input value={scriptsOnChange} onChange={(e) => setScriptsOnChange(e.target.value)} placeholder="/config/scripts/on-change.sh" />
            </div>
            <div className="space-y-2">
              <Label>{t("advancedModal.onDown")}</Label>
              <Input value={scriptsOnDown} onChange={(e) => setScriptsOnDown(e.target.value)} placeholder="/config/scripts/on-down.sh" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t("advancedModal.onPreUp")}</Label>
              <Input value={scriptsOnPreUp} onChange={(e) => setScriptsOnPreUp(e.target.value)} placeholder="/config/scripts/on-pre-up.sh" />
            </div>
            <div className="space-y-2">
              <Label>{t("advancedModal.onUp")}</Label>
              <Input value={scriptsOnUp} onChange={(e) => setScriptsOnUp(e.target.value)} placeholder="/config/scripts/on-up.sh" />
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
