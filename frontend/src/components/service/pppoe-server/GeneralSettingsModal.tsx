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
import { NamedListSelect } from "@/components/ui/named-list-select";
import { AlertCircle, Loader2, Settings } from "lucide-react";
import { MultiValueInput } from "@/components/service/webproxy/MultiValueInput";
import { pppoeServerService, PPPoECapabilities, PPPoEConfigResponse } from "@/lib/api/pppoe-server";
import { generalProblem, PPPOE_RANGES, type PPPoEGeneralDraft } from "@/lib/api/pppoe-server-save-ops";
import type { ApiError } from "@/lib/types/api";

interface GeneralSettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  config: PPPoEConfigResponse;
  capabilities: PPPoECapabilities | null;
}

export function GeneralSettingsModal({ open, onOpenChange, onSuccess, config, capabilities }: GeneralSettingsModalProps) {
  const t = useTranslations("pppoeServerSettings");
  const tc = useTranslations("common");
  // The page remounts this modal (key) on every open, so state seeds from props.
  const [draft, setDraft] = useState<PPPoEGeneralDraft>(() => ({
    description: config.description || "",
    access_concentrator: config.access_concentrator || "",
    service_names: config.service_names,
    gateway_address: config.gateway_address || "",
    name_servers: config.name_servers,
    wins_servers: config.wins_servers,
    mtu: config.mtu || "",
    max_concurrent_sessions: config.max_concurrent_sessions || "",
    thread_count: config.thread_count || "",
    default_pool: config.default_pool || "",
    default_ipv6_pool: config.default_ipv6_pool || "",
    session_control: config.session_control || "",
    accept_any_service: config.accept_any_service,
    accept_blank_service: config.accept_blank_service,
  }));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const values = capabilities?.values;
  const threadKeywords = values?.thread_count_keywords || [];
  const sessionLabels: Record<string, string> = {
    deny: t("general.sessionDeny"),
    disable: t("general.sessionDisable"),
    replace: t("general.sessionReplace"),
  };
  const update = (patch: Partial<PPPoEGeneralDraft>) => setDraft((current) => ({ ...current, ...patch }));

  const handleOpenChange = (next: boolean) => {
    if (!loading) onOpenChange(next);
  };

  const handleSubmit = async () => {
    const issue = generalProblem(draft, threadKeywords);
    if (issue) {
      setError(t(`general.${issue.problem}`, issue.params));
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await pppoeServerService.updateGeneralSettings(config, draft);
      onOpenChange(false);
      onSuccess();
    } catch (err) {
      setError((err as ApiError).message || t("general.updateFailed"));
    } finally {
      setLoading(false);
    }
  };

  const range = PPPOE_RANGES.maxConcurrentSessions;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-primary" />
            {t("general.title")}
          </DialogTitle>
          <DialogDescription>{t("general.description")}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <h4 className="text-sm font-medium">{t("general.serverIdentity")}</h4>
          <div className="space-y-2">
            <Label htmlFor="pppoe-description">{tc("description")}</Label>
            <Input
              id="pppoe-description"
              value={draft.description}
              onChange={(e) => update({ description: e.target.value })}
              placeholder={t("general.descriptionPlaceholder")}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="pppoe-ac">{t("general.accessConcentrator")}</Label>
            <Input
              id="pppoe-ac"
              value={draft.access_concentrator}
              onChange={(e) => update({ access_concentrator: e.target.value })}
              placeholder="vyos-ac"
            />
          </div>
          <MultiValueInput
            label={t("general.serviceNames")}
            values={draft.service_names}
            placeholder="internet"
            onChange={(service_names) => update({ service_names })}
          />

          <h4 className="text-sm font-medium">{t("general.addressing")}</h4>
          <div className="space-y-2">
            <Label htmlFor="pppoe-gateway">{t("general.gatewayAddress")}</Label>
            <Input
              id="pppoe-gateway"
              value={draft.gateway_address}
              onChange={(e) => update({ gateway_address: e.target.value })}
              placeholder="10.0.0.1"
            />
          </div>
          <MultiValueInput
            label={t("general.nameServers")}
            values={draft.name_servers}
            placeholder="8.8.8.8"
            onChange={(name_servers) => update({ name_servers })}
          />
          <MultiValueInput
            label={t("general.winsServers")}
            values={draft.wins_servers}
            placeholder="192.168.1.10"
            onChange={(wins_servers) => update({ wins_servers })}
          />

          <h4 className="text-sm font-medium">{t("general.poolsSession")}</h4>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="pppoe-default-pool">{t("general.defaultPool")}</Label>
              <NamedListSelect
                id="pppoe-default-pool"
                value={draft.default_pool}
                names={config.client_ip_pools.map((pool) => pool.name)}
                onValueChange={(default_pool) => update({ default_pool })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pppoe-default-ipv6-pool">{t("general.defaultIpv6Pool")}</Label>
              <NamedListSelect
                id="pppoe-default-ipv6-pool"
                value={draft.default_ipv6_pool}
                names={config.client_ipv6_pools.map((pool) => pool.name)}
                onValueChange={(default_ipv6_pool) => update({ default_ipv6_pool })}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="pppoe-session-control">{t("general.sessionControl")}</Label>
            <NamedListSelect
              id="pppoe-session-control"
              value={draft.session_control}
              names={values?.session_control_modes || []}
              labels={sessionLabels}
              onValueChange={(session_control) => update({ session_control })}
              noneLabel={tc("default")}
            />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="pppoe-mtu">MTU</Label>
              <Input id="pppoe-mtu" value={draft.mtu} onChange={(e) => update({ mtu: e.target.value })} placeholder="1492" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pppoe-max-sessions">{t("general.maxSessions")}</Label>
              <Input
                id="pppoe-max-sessions"
                type="number"
                min={range.min}
                max={range.max}
                value={draft.max_concurrent_sessions}
                onChange={(e) => update({ max_concurrent_sessions: e.target.value })}
                placeholder={`${range.min}-${range.max}`}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pppoe-thread-count">{t("general.threadCount")}</Label>
              <Input
                id="pppoe-thread-count"
                list="pppoe-thread-count-keywords"
                value={draft.thread_count}
                onChange={(e) => update({ thread_count: e.target.value })}
                placeholder={`${PPPOE_RANGES.threadCount.min}-${PPPOE_RANGES.threadCount.max}`}
              />
              <datalist id="pppoe-thread-count-keywords">
                {threadKeywords.map((keyword) => <option key={keyword} value={keyword} />)}
              </datalist>
            </div>
          </div>

          <h4 className="text-sm font-medium">{t("general.flags")}</h4>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Checkbox
                id="accept-any"
                checked={draft.accept_any_service}
                onCheckedChange={(v) => update({ accept_any_service: !!v })}
              />
              <Label htmlFor="accept-any" className="cursor-pointer">{t("general.acceptAnyService")}</Label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="accept-blank"
                checked={draft.accept_blank_service}
                onCheckedChange={(v) => update({ accept_blank_service: !!v })}
              />
              <Label htmlFor="accept-blank" className="cursor-pointer">{t("general.acceptBlankService")}</Label>
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
