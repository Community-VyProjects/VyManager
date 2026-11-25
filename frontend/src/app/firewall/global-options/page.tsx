"use client";

export const dynamic = 'force-dynamic';

import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { NamedListSelect } from "@/components/ui/named-list-select";
import { VrfSelect } from "@/components/ui/vrf-select";
import {
  RefreshCw,
  AlertCircle,
  Save,
  Info,
  CheckCircle2,
  Settings,
} from "lucide-react";
import { useState, useEffect, useCallback, Suspense, type ReactNode } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import type { ApiError } from "@/lib/types/api";
import {
  firewallGlobalOptionsService,
  type FirewallGlobalOptionsCapabilities,
} from "@/lib/api/firewall-global-options";
import {
  draftFromConfig,
  globalOptionsProblem,
  globalOptionsRange,
  STATES,
  TCP_TIMEOUT_KEYS,
  UDP_TIMEOUT_KEYS,
  type GlobalOptionsDraft,
  type StateKey,
  type TimeoutKey,
  type ToggleKey,
} from "@/lib/api/firewall-global-options-save-ops";
import { flowtablesService } from "@/lib/api/firewall-flowtables";
import { firewallFeatureSupported } from "@/lib/api/firewall-capability-gates";
import { cn } from "@/lib/utils";

const TIMEOUT_LABEL_KEYS = {
  icmp: "icmp",
  other: "other",
  tcp_established: "established",
  tcp_close: "close",
  tcp_close_wait: "closeWait",
  tcp_fin_wait: "finWait",
  tcp_last_ack: "lastAck",
  tcp_syn_recv: "synRecv",
  tcp_syn_sent: "synSent",
  tcp_time_wait: "timeWait",
  udp_stream: "stream",
  udp_other: "udpOther",
} as const satisfies Record<TimeoutKey, string>;

function SettingRow({ fieldId, label, children }: { fieldId: string; label: string; children: ReactNode }) {
  return (
    <div
      id={fieldId}
      className="flex items-center justify-between py-2 border-b border-border/50 last:border-0 scroll-mt-24"
    >
      <span className="flex-1 min-w-0 pr-4 text-sm font-medium">{label}</span>
      <div className="w-[200px]">{children}</div>
    </div>
  );
}

function FirewallGlobalOptionsPageInner() {
  const t = useTranslations("firewallGlobalOptions");
  const tc = useTranslations("common");
  const searchParams = useSearchParams();
  const [capabilities, setCapabilities] = useState<FirewallGlobalOptionsCapabilities | null>(null);
  const [original, setOriginal] = useState<GlobalOptionsDraft | null>(null);
  const [draft, setDraft] = useState<GlobalOptionsDraft | null>(null);
  const [flowtableNames, setFlowtableNames] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      setError(null);
      setLoading(true);
      const [config, caps] = await Promise.all([
        firewallGlobalOptionsService.getConfig(true),
        firewallGlobalOptionsService.getCapabilities(),
      ]);
      setCapabilities(caps);
      const loaded = draftFromConfig(config);
      setOriginal(loaded);
      setDraft(structuredClone(loaded));
      if (firewallFeatureSupported(caps, "state_policy_offload")) {
        try {
          const flowtables = await flowtablesService.getConfig();
          setFlowtableNames(flowtables.flowtables.map((flowtable) => flowtable.name));
        } catch {
          // Without flowtable read access the picker keeps the loaded target.
          setFlowtableNames([]);
        }
      }
    } catch (err) {
      setError((err as ApiError).message || t("loadFailed"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    const field = searchParams.get("field");
    const section = searchParams.get("section");
    const targetId = field || section;
    if (targetId) {
      requestAnimationFrame(() => {
        document.getElementById(targetId)?.scrollIntoView({ behavior: "smooth", block: "center" });
      });
    }
  }, [searchParams]);

  const hasChanges = original !== null && draft !== null && JSON.stringify(original) !== JSON.stringify(draft);
  const resolverRange = globalOptionsRange(capabilities, "resolver_interval");
  const timeoutRange = globalOptionsRange(capabilities, "timeouts");

  const handleSave = async () => {
    if (!original || !draft) return;
    setError(null);
    setSuccessMessage(null);
    const problem = globalOptionsProblem(original, draft, {
      resolverInterval: resolverRange,
      timeout: timeoutRange,
    });
    if (problem) {
      setError(t(`errors.${problem.key}`, { min: problem.min ?? 0, max: problem.max ?? 0 }));
      return;
    }
    try {
      setSaving(true);
      await firewallGlobalOptionsService.save(original, draft);
      setSuccessMessage(t("saveSuccess"));
      setTimeout(() => setSuccessMessage(null), 3000);
      await loadData();
    } catch (err) {
      setError((err as ApiError).message || t("saveFailed"));
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    if (original) setDraft(structuredClone(original));
  };

  const update = (change: (next: GlobalOptionsDraft) => void) => {
    setDraft((current) => {
      if (!current) return current;
      const next = structuredClone(current);
      change(next);
      return next;
    });
  };

  if (loading && !draft) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-96">
          <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </AppLayout>
    );
  }

  // Lock the form while a load or save is in flight so a reload cannot
  // overwrite edits made mid-request.
  const formLocked = loading || saving || !draft;
  const features = capabilities?.features;
  const showOffload = firewallFeatureSupported(capabilities, "state_policy_offload");
  const showBridgedTraffic = firewallFeatureSupported(capabilities, "bridged_traffic");
  const showGeoip = firewallFeatureSupported(capabilities, "geoip");
  const showTimeouts = firewallFeatureSupported(capabilities, "timeouts");

  const optionLabels: Record<string, string> = {
    enable: t("options.enable"),
    disable: t("options.disable"),
    strict: t("options.strict"),
    loose: t("options.loose"),
    accept: t("options.accept"),
    drop: t("options.drop"),
    reject: t("options.reject"),
    emerg: t("options.emerg"),
    alert: t("options.alert"),
    crit: t("options.crit"),
    err: t("options.err"),
    warn: t("options.warn"),
    notice: t("options.notice"),
    info: t("options.info"),
    debug: t("options.debug"),
  };

  const toggleRow = (key: ToggleKey, fieldId: string, label: string) => (
    <SettingRow key={key} fieldId={fieldId} label={label}>
      <NamedListSelect
        value={draft?.toggles[key] ?? ""}
        names={features?.[key]?.values || []}
        onValueChange={(value) => update((next) => (next.toggles[key] = value))}
        disabled={formLocked}
        noneLabel={t("options.notSetDefault")}
        labels={optionLabels}
      />
    </SettingRow>
  );

  const stateBlock = (state: StateKey, first: boolean) => {
    const value = draft?.states[state];
    return (
      <div key={state} className={cn("space-y-2", !first && "pt-2 border-t border-border/50")}>
        <Badge variant="outline" className="text-xs font-medium">{t(`statePolicies.${state}`)}</Badge>
        <div className="grid grid-cols-3 gap-2">
          <div id={`${state}-action`} className="scroll-mt-24">
            <Label className="text-xs text-muted-foreground">{t("statePolicies.action")}</Label>
            <NamedListSelect
              value={value?.action ?? ""}
              names={features?.state_policy?.actions || []}
              onValueChange={(action) => update((next) => (next.states[state].action = action))}
              disabled={formLocked}
              noneLabel={t("options.notSet")}
              labels={optionLabels}
            />
          </div>
          <div id={`${state}-log-level`} className="scroll-mt-24">
            <Label className="text-xs text-muted-foreground">{t("statePolicies.logLevel")}</Label>
            <NamedListSelect
              value={value?.log_level ?? ""}
              names={features?.state_policy?.log_levels || []}
              onValueChange={(level) => update((next) => (next.states[state].log_level = level))}
              disabled={formLocked}
              noneLabel={t("options.notSet")}
              labels={optionLabels}
            />
          </div>
          <div id={`${state}-log`} className="flex items-end pb-2 scroll-mt-24">
            <div className="flex items-center gap-1.5">
              <Checkbox
                disabled={formLocked}
                id={`${state}-log-flag`}
                checked={value?.log ?? false}
                onCheckedChange={(checked) => update((next) => (next.states[state].log = checked === true))}
              />
              <Label htmlFor={`${state}-log-flag`} className="text-xs">{t("statePolicies.log")}</Label>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const timeoutInput = (key: TimeoutKey) => (
    <div key={key} id={`timeout-${key.replace(/_/g, "-")}`} className="scroll-mt-24">
      <Label className="text-xs text-muted-foreground">{t(`timeouts.${TIMEOUT_LABEL_KEYS[key]}`)}</Label>
      <Input
        disabled={formLocked}
        type="number"
        min={timeoutRange.min}
        max={timeoutRange.max}
        value={draft?.timeouts[key] ?? ""}
        onChange={(e) => update((next) => (next.timeouts[key] = e.target.value))}
        className="h-8 text-xs mt-1"
      />
    </div>
  );

  const ethernetTypes = features?.bridged_traffic?.ethernet_types || [];
  const selectedTypes = draft?.bridged_ethernet_types ?? [];
  const listedTypes = [...ethernetTypes, ...selectedTypes.filter((type) => !ethernetTypes.includes(type))];

  return (
    <AppLayout>
      <div className="space-y-4 p-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Settings className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">{t("title")}</h1>
              <p className="text-sm text-muted-foreground">
                {t("subtitle")}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => loadData()} disabled={loading || saving || hasChanges}>
              <RefreshCw className={cn("h-4 w-4 mr-1.5", loading && "animate-spin")} />
              {tc("refresh")}
            </Button>
            {hasChanges && (
              <Button variant="outline" size="sm" onClick={handleReset} disabled={formLocked}>
                {t("reset")}
              </Button>
            )}
            <Button size="sm" onClick={handleSave} disabled={formLocked || !hasChanges}>
              {saving ? (
                <RefreshCw className="h-4 w-4 mr-1.5 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-1.5" />
              )}
              {saving ? tc("saving") : tc("saveChanges")}
            </Button>
          </div>
        </div>

        {/* Alerts */}
        {successMessage && (
          <div className="bg-green-500/10 border border-green-500/20 rounded-md px-3 py-2 flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-green-500" />
            <p className="text-sm text-green-600 dark:text-green-400">{successMessage}</p>
          </div>
        )}
        {error && (
          <div className="bg-destructive/10 border border-destructive/20 rounded-md px-3 py-2 flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-destructive" />
            <p className="text-sm text-destructive whitespace-pre-wrap">{error}</p>
          </div>
        )}
        {hasChanges && (
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-md px-3 py-2 flex items-center gap-2">
            <Info className="h-4 w-4 text-amber-500" />
            <p className="text-sm text-amber-600 dark:text-amber-400">
              {t("unsavedChanges")}
            </p>
          </div>
        )}

        {/* Main Content - 2 Column Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Left Column */}
          <div className="space-y-4">
            <Card id="icmp-settings">
              <CardHeader className="py-3 px-4">
                <CardTitle className="text-sm font-semibold">{t("icmp.title")}</CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-3 pt-0">
                {toggleRow("all_ping", "all-ping", t("icmp.allPing"))}
                {toggleRow("broadcast_ping", "broadcast-ping", t("icmp.broadcastPing"))}
                {toggleRow("directed_broadcast", "directed-broadcast", t("icmp.directedBroadcast"))}
              </CardContent>
            </Card>

            <Card id="source-routing">
              <CardHeader className="py-3 px-4">
                <CardTitle className="text-sm font-semibold">{t("sourceRouting.title")}</CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-3 pt-0">
                {toggleRow("ip_src_route", "ipv4-source-routing", t("sourceRouting.ipv4"))}
                {toggleRow("ipv6_src_route", "ipv6-source-routing", t("sourceRouting.ipv6"))}
              </CardContent>
            </Card>

            <Card id="icmp-redirects">
              <CardHeader className="py-3 px-4">
                <CardTitle className="text-sm font-semibold">{t("redirects.title")}</CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-3 pt-0">
                {toggleRow("receive_redirects", "receive-redirects-ipv4", t("redirects.receiveIpv4"))}
                {toggleRow("ipv6_receive_redirects", "receive-redirects-ipv6", t("redirects.receiveIpv6"))}
                {toggleRow("send_redirects", "send-redirects", t("redirects.send"))}
              </CardContent>
            </Card>

            <Card id="security-options">
              <CardHeader className="py-3 px-4">
                <CardTitle className="text-sm font-semibold">{t("security.title")}</CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-3 pt-0">
                {toggleRow("log_martians", "log-martians", t("security.logMartians"))}
                {toggleRow("source_validation", "source-validation", t("security.sourceValidation"))}
                {toggleRow("ipv6_source_validation", "ipv6-source-validation", t("security.ipv6SourceValidation"))}
                {toggleRow("syn_cookies", "syn-cookies", t("security.synCookies"))}
                {toggleRow("twa_hazards_protection", "twa-hazards", t("security.twaHazards"))}
              </CardContent>
            </Card>

            <Card id="dns-resolver">
              <CardHeader className="py-3 px-4">
                <CardTitle className="text-sm font-semibold">{t("dns.title")}</CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-3 pt-0">
                <SettingRow fieldId="resolver-cache" label={t("dns.resolverCache")}>
                  <Checkbox
                    disabled={formLocked}
                    checked={draft?.resolver_cache ?? false}
                    onCheckedChange={(checked) => update((next) => (next.resolver_cache = checked === true))}
                  />
                </SettingRow>
                <SettingRow fieldId="resolver-interval" label={t("dns.resolverInterval")}>
                  <Input
                    disabled={formLocked}
                    type="number"
                    min={resolverRange.min}
                    max={resolverRange.max}
                    value={draft?.resolver_interval ?? ""}
                    onChange={(e) => update((next) => (next.resolver_interval = e.target.value))}
                    className="h-8 text-xs"
                  />
                </SettingRow>
              </CardContent>
            </Card>
          </div>

          {/* Right Column */}
          <div className="space-y-4">
            <Card id="state-policies">
              <CardHeader className="py-3 px-4">
                <CardTitle className="text-sm font-semibold">{t("statePolicies.title")}</CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-3 pt-0 space-y-4">
                {STATES.map((state, index) => stateBlock(state, index === 0))}
                {showOffload && (
                  <div id="offload-target" className="pt-2 border-t border-border/50 scroll-mt-24">
                    <Label className="text-xs text-muted-foreground">{t("statePolicies.offloadTarget")}</Label>
                    <NamedListSelect
                      value={draft?.offload_target ?? ""}
                      names={flowtableNames}
                      onValueChange={(name) => update((next) => (next.offload_target = name))}
                      disabled={formLocked}
                      noneLabel={t("options.notSet")}
                    />
                  </div>
                )}
              </CardContent>
            </Card>

            {showBridgedTraffic && (
              <Card id="bridged-traffic">
                <CardHeader className="py-3 px-4">
                  <CardTitle className="text-sm font-semibold">{t("bridged.title")}</CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-3 pt-0">
                  <SettingRow fieldId="bridged-ipv4" label={t("bridged.ipv4")}>
                    <Checkbox
                      disabled={formLocked}
                      checked={draft?.bridged_ipv4 ?? false}
                      onCheckedChange={(checked) => update((next) => (next.bridged_ipv4 = checked === true))}
                    />
                  </SettingRow>
                  <SettingRow fieldId="bridged-ipv6" label={t("bridged.ipv6")}>
                    <Checkbox
                      disabled={formLocked}
                      checked={draft?.bridged_ipv6 ?? false}
                      onCheckedChange={(checked) => update((next) => (next.bridged_ipv6 = checked === true))}
                    />
                  </SettingRow>
                  <div id="bridged-accept-invalid" className="py-2 scroll-mt-24">
                    <span className="text-sm font-medium">{t("bridged.acceptInvalid")}</span>
                    <div className="grid grid-cols-3 gap-2 mt-2">
                      {listedTypes.map((type) => (
                        <div key={type} className="flex items-center gap-1.5">
                          <Checkbox
                            disabled={formLocked}
                            id={`ethernet-type-${type}`}
                            checked={selectedTypes.includes(type)}
                            onCheckedChange={(checked) =>
                              update((next) => {
                                const rest = next.bridged_ethernet_types.filter((item) => item !== type);
                                next.bridged_ethernet_types = checked === true ? [...rest, type] : rest;
                              })
                            }
                          />
                          <Label htmlFor={`ethernet-type-${type}`} className="text-xs font-mono">{type}</Label>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {showGeoip && (
              <Card id="geoip">
                <CardHeader className="py-3 px-4">
                  <CardTitle className="text-sm font-semibold">{t("geoip.title")}</CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-3 pt-0">
                  <SettingRow fieldId="geoip-provider" label={t("geoip.provider")}>
                    <NamedListSelect
                      value={draft?.geoip.provider ?? ""}
                      names={features?.geoip?.providers || []}
                      onValueChange={(provider) => update((next) => (next.geoip.provider = provider))}
                      disabled={formLocked}
                      noneLabel={t("options.notSetDefault")}
                    />
                  </SettingRow>
                  <SettingRow fieldId="geoip-account-id" label={t("geoip.accountId")}>
                    <Input
                      disabled={formLocked}
                      value={draft?.geoip.maxmind_account_id ?? ""}
                      onChange={(e) => update((next) => (next.geoip.maxmind_account_id = e.target.value))}
                      className="h-8 text-xs"
                    />
                  </SettingRow>
                  <SettingRow fieldId="geoip-license-key" label={t("geoip.licenseKey")}>
                    <Input
                      disabled={formLocked}
                      type="password"
                      autoComplete="new-password"
                      value={draft?.geoip.maxmind_license_key ?? ""}
                      onChange={(e) => update((next) => (next.geoip.maxmind_license_key = e.target.value))}
                      className="h-8 text-xs"
                    />
                  </SettingRow>
                  <SettingRow fieldId="geoip-lite" label={t("geoip.lite")}>
                    <Checkbox
                      disabled={formLocked}
                      checked={draft?.geoip.maxmind_lite ?? false}
                      onCheckedChange={(checked) => update((next) => (next.geoip.maxmind_lite = checked === true))}
                    />
                  </SettingRow>
                  <SettingRow fieldId="geoip-source-address" label={t("geoip.sourceAddress")}>
                    <Input
                      disabled={formLocked}
                      value={draft?.geoip.source_address ?? ""}
                      onChange={(e) => update((next) => (next.geoip.source_address = e.target.value))}
                      className="h-8 text-xs font-mono"
                    />
                  </SettingRow>
                  <SettingRow fieldId="geoip-vrf" label={t("geoip.vrf")}>
                    <VrfSelect
                      value={draft?.geoip.vrf ?? ""}
                      onValueChange={(vrf) => update((next) => (next.geoip.vrf = vrf))}
                      disabled={formLocked}
                      noneLabel={tc("none")}
                    />
                  </SettingRow>
                </CardContent>
              </Card>
            )}

            {showTimeouts && (
              <Card id="connection-timeouts">
                <CardHeader className="py-3 px-4">
                  <CardTitle className="text-sm font-semibold">{t("timeouts.title")}</CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-3 pt-0 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    {timeoutInput("icmp")}
                    {timeoutInput("other")}
                  </div>
                  <div className="pt-2 border-t border-border/50">
                    <Label className="text-xs font-medium text-muted-foreground mb-2 block">{t("timeouts.tcp")}</Label>
                    <div className="grid grid-cols-4 gap-2">{TCP_TIMEOUT_KEYS.map(timeoutInput)}</div>
                  </div>
                  <div className="pt-2 border-t border-border/50">
                    <Label className="text-xs font-medium text-muted-foreground mb-2 block">{t("timeouts.udp")}</Label>
                    <div className="grid grid-cols-2 gap-2">{UDP_TIMEOUT_KEYS.map(timeoutInput)}</div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

export default function FirewallGlobalOptionsPage() {
  return (
    <Suspense>
      <FirewallGlobalOptionsPageInner />
    </Suspense>
  );
}
