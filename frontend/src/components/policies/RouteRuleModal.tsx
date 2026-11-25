"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { AlertCircle } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { NamedListSelect } from "@/components/ui/named-list-select";
import { VrfSelect } from "@/components/ui/vrf-select";
import { MultiValueInput } from "@/components/service/webproxy/MultiValueInput";
import {
  routeService,
  type PolicyRouteRule,
  type RouteCapabilitiesResponse,
  type RoutePolicyType,
} from "@/lib/api/route";
import {
  descriptionMaxLength,
  emptyRuleForm,
  routeRange,
  routeRuleProblem,
  ruleFormFrom,
  type ListKey,
  type RouteRuleForm,
  type RouteRuleProblem,
  type SingleKey,
} from "@/lib/api/route-save-ops";
import { firewallGroupsService } from "@/lib/api/firewall-groups";
import type { GroupsConfigResponse } from "@/lib/api/types/firewall-groups";
import type { ApiError } from "@/lib/types/api";
import {
  groupKindOf,
  groupNames,
  joinInverted,
  joinLimitRate,
  nextRuleNumber,
  splitInverted,
  splitLimitRate,
  type GroupKind,
} from "./route-rule-form";

interface RouteRuleModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  policyType: RoutePolicyType;
  policyName: string;
  capabilities: RouteCapabilitiesResponse | null;
  /** The stored rule on edit; null on create. */
  existing: PolicyRouteRule | null;
  /** Rule numbers the policy already has (a new rule may not reuse one). */
  existingRuleNumbers: number[];
}

type TableMode = "none" | "main" | "custom";

interface CheckboxGroupProps {
  idPrefix: string;
  options: string[];
  selected: string[];
  onChange: (next: string[]) => void;
  disabled: boolean;
  labels?: Record<string, string>;
}

/** One checkbox per capability value; a stored value the list lacks stays shown. */
function CheckboxGroup({ idPrefix, options, selected, onChange, disabled, labels }: CheckboxGroupProps) {
  const extra = selected.filter((value) => !options.includes(value));
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-2">
      {[...options, ...extra].map((value) => {
        const id = `${idPrefix}-${value}`;
        return (
          <div key={value} className="flex items-center space-x-2">
            <Checkbox
              id={id}
              checked={selected.includes(value)}
              onCheckedChange={(checked) =>
                onChange(checked === true ? [...selected, value] : selected.filter((v) => v !== value))
              }
              disabled={disabled}
            />
            <Label htmlFor={id} className="text-sm font-normal cursor-pointer font-mono">
              {labels?.[value] ?? value}
            </Label>
          </div>
        );
      })}
    </div>
  );
}

export function RouteRuleModal({
  open,
  onOpenChange,
  onSuccess,
  policyType,
  policyName,
  capabilities: caps,
  existing,
  existingRuleNumbers,
}: RouteRuleModalProps) {
  const t = useTranslations("routeRuleModal");
  const tc = useTranslations("common");
  const isEdit = existing !== null;
  const family = policyType === "route" ? "IPv4" : "IPv6";

  const [form, setForm] = useState<RouteRuleForm>(() =>
    existing ? ruleFormFrom(existing) : emptyRuleForm(nextRuleNumber(existingRuleNumbers, routeRange(caps, "rule"))),
  );
  const [sourceGroupKind, setSourceGroupKind] = useState<GroupKind>(() => groupKindOf(form, "source"));
  const [destinationGroupKind, setDestinationGroupKind] = useState<GroupKind>(() =>
    groupKindOf(form, "destination"),
  );
  const [tableMode, setTableMode] = useState<TableMode>(() =>
    form.set_table === "main" ? "main" : form.set_table ? "custom" : "none",
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [groups, setGroups] = useState<GroupsConfigResponse | null>(null);
  const [groupsError, setGroupsError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    firewallGroupsService
      .getConfig()
      .then((config) => {
        if (active) setGroups(config);
      })
      .catch((err) => {
        if (active) setGroupsError((err as ApiError).message || t("errors.groupsLoadFailed"));
      });
    return () => {
      active = false;
    };
  }, [t]);

  const names = groupNames(groups, policyType);
  const values = caps?.values;
  const geoipOn = caps?.features?.geoip_matching?.supported === true;
  const tcpMssOn = caps?.features?.tcp_mss_matching?.supported === true;
  const vrfOn = caps?.features?.vrf_routing?.supported === true;
  const rateUnits = caps?.features?.limit_rate?.units || [];
  const loadedRecent = existing && (existing.match.recent_count || existing.match.recent_time) ? existing.match : null;

  const set = <K extends keyof RouteRuleForm>(key: K, value: RouteRuleForm[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const problemMessage = (problem: RouteRuleProblem): string =>
    t(`errors.${problem.key}`, {
      min: problem.min ?? "",
      max: problem.max ?? "",
      value: problem.value ?? "",
    });

  const handleSubmit = async () => {
    const problem = routeRuleProblem(policyType, existing, form, caps, existingRuleNumbers);
    if (problem) {
      setError(problemMessage(problem));
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await routeService.saveRule(policyType, policyName, existing, form, caps);
      onOpenChange(false);
      onSuccess();
    } catch (err) {
      setError((err as ApiError).message || (isEdit ? t("errors.updateFailed") : t("errors.createFailed")));
    } finally {
      setLoading(false);
    }
  };

  const handleOpenChange = (next: boolean) => {
    if (!next && loading) return;
    onOpenChange(next);
  };

  const rangeHint = (key: string): string | undefined => {
    const range = routeRange(caps, key);
    return range ? t("rangePlaceholder", { min: range.min, max: range.max }) : undefined;
  };

  const textField = (key: SingleKey, label: string, placeholder?: string, rangeKey?: string) => (
    <div className="space-y-2">
      <Label htmlFor={`rr-${key}`}>{label}</Label>
      <Input
        id={`rr-${key}`}
        value={form[key]}
        onChange={(e) => set(key, e.target.value)}
        placeholder={placeholder ?? (rangeKey ? rangeHint(rangeKey) : undefined)}
        inputMode={rangeKey ? "numeric" : undefined}
        disabled={loading}
        className="font-mono"
      />
    </div>
  );

  const listField = (key: ListKey, label: string, rangeKey?: string, suggestions?: string[]) => (
    <MultiValueInput
      label={label}
      values={form[key]}
      onChange={(next) => set(key, next)}
      placeholder={rangeKey ? rangeHint(rangeKey) : undefined}
      suggestions={suggestions}
    />
  );

  const invertCheckbox = (key: SingleKey, name: string, inverted: boolean) => (
    <div className="flex items-center space-x-2">
      <Checkbox
        id={`rr-${key}-invert`}
        checked={inverted}
        onCheckedChange={(checked) => set(key, joinInverted(name, checked === true))}
        disabled={loading || !name}
      />
      <Label htmlFor={`rr-${key}-invert`} className="text-sm font-normal cursor-pointer">
        {t("invertMatch")}
      </Label>
    </div>
  );

  const invertedField = (key: SingleKey, label: string, example: string) => {
    const { name, inverted } = splitInverted(form[key]);
    return (
      <div className="space-y-2">
        <Label htmlFor={`rr-${key}`}>{label}</Label>
        <Input
          id={`rr-${key}`}
          value={name}
          onChange={(e) => set(key, joinInverted(e.target.value, inverted))}
          placeholder={t("examplePlaceholder", { example })}
          disabled={loading}
          className="font-mono"
        />
        {invertCheckbox(key, name, inverted)}
      </div>
    );
  };

  const groupPick = (key: SingleKey, label: string, options: string[]) => {
    const { name, inverted } = splitInverted(form[key]);
    return (
      <div className="space-y-2">
        <Label htmlFor={`rr-${key}`}>{label}</Label>
        <NamedListSelect
          id={`rr-${key}`}
          value={name}
          names={options}
          onValueChange={(next) => set(key, joinInverted(next, inverted))}
          disabled={loading}
        />
        {invertCheckbox(key, name, inverted)}
      </div>
    );
  };

  const sidePanel = (side: "source" | "destination") => {
    const kind = side === "source" ? sourceGroupKind : destinationGroupKind;
    const setKind = side === "source" ? setSourceGroupKind : setDestinationGroupKind;
    const changeKind = (next: GroupKind) => {
      setKind(next);
      setForm((prev) => ({
        ...prev,
        [`${side}_group_address`]: "",
        [`${side}_group_network`]: "",
        [`${side}_group_domain`]: "",
      }));
    };
    const example = policyType === "route6" ? "2001:db8::/32" : "192.0.2.0/24";
    return (
      <div className="space-y-4">
        <h3 className="font-semibold text-sm">{t(`side.${side}`)}</h3>
        {invertedField(`${side}_address`, t("address.address"), example)}
        {side === "source" && invertedField("source_mac_address", t("address.mac"), "00:11:22:33:44:55")}
        {textField(`${side}_port`, t("address.port"), t("examplePlaceholder", { example: "80,443,8000-9000" }))}

        <div className="space-y-2">
          <Label>{t("groups.addressGroupKind")}</Label>
          <RadioGroup
            value={kind || "none"}
            onValueChange={(v) => changeKind(v === "none" ? "" : (v as GroupKind))}
            disabled={loading}
          >
            {(["none", "address", "network", "domain"] as const).map((value) => (
              <div key={value} className="flex items-center space-x-2">
                <RadioGroupItem value={value} id={`rr-${side}-kind-${value}`} />
                <Label htmlFor={`rr-${side}-kind-${value}`} className="font-normal cursor-pointer">
                  {value === "none" ? tc("none") : t(`groups.${value}Group`)}
                </Label>
              </div>
            ))}
          </RadioGroup>
          {kind && groupPick(`${side}_group_${kind}`, t(`groups.${kind}Group`), names[kind])}
        </div>
        {groupPick(`${side}_group_mac`, t("groups.macGroup"), names.mac)}
        {groupPick(`${side}_group_port`, t("groups.portGroup"), names.port)}

        {geoipOn && (
          <div className="space-y-3">
            {listField(
              `${side}_geoip_country_code`,
              t("geoip.countryCodes"),
              undefined,
              caps?.features?.geoip_matching?.country_codes || [],
            )}
            {listField(`${side}_geoip_asn`, t("geoip.asn"), "geoip_asn")}
            <div className="flex items-center space-x-2">
              <Checkbox
                id={`rr-${side}-geoip-inverse`}
                checked={form[`${side}_geoip_inverse`]}
                onCheckedChange={(checked) => set(`${side}_geoip_inverse`, checked === true)}
                disabled={loading}
              />
              <Label htmlFor={`rr-${side}-geoip-inverse`} className="text-sm font-normal cursor-pointer">
                {t("geoip.inverse")}
              </Label>
            </div>
          </div>
        )}
      </div>
    );
  };

  const compareFields = (prefix: "ttl" | "hop_limit", title: string) => (
    <div className="space-y-3">
      <h3 className="font-semibold text-sm">{title}</h3>
      <div className="grid grid-cols-3 gap-4">
        {(values?.compare_ops || []).map((cmp) =>
          cmp === "eq" || cmp === "gt" || cmp === "lt" ? (
            <div key={cmp}>{textField(`${prefix}_${cmp}`, t(`compare.${cmp}`), undefined, "ttl")}</div>
          ) : null,
        )}
      </div>
    </div>
  );

  const weekdayLabels: Record<string, string> = {
    Monday: t("time.days.mon"),
    Tuesday: t("time.days.tue"),
    Wednesday: t("time.days.wed"),
    Thursday: t("time.days.thu"),
    Friday: t("time.days.fri"),
    Saturday: t("time.days.sat"),
    Sunday: t("time.days.sun"),
  };
  const rate = splitLimitRate(form.limit_rate);
  const recentRemoved = loadedRecent !== null && !form.recent_count && !form.recent_time;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEdit
              ? t("title.edit", { number: String(existing.rule_number), policyName })
              : t("title.create", { policyName })}
          </DialogTitle>
          <DialogDescription>
            {isEdit ? t("description.edit", { family }) : t("description.create", { family })}
          </DialogDescription>
        </DialogHeader>

        {(error || groupsError) && (
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-destructive mt-0.5 flex-shrink-0" />
            <p className="text-sm text-destructive whitespace-pre-wrap">{error || groupsError}</p>
          </div>
        )}

        <fieldset disabled={loading} className="contents">
        <Tabs defaultValue="basic" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="basic">{t("tabs.basic")}</TabsTrigger>
            <TabsTrigger value="match">{t("tabs.match")}</TabsTrigger>
            <TabsTrigger value="advanced">{t("tabs.advanced")}</TabsTrigger>
            <TabsTrigger value="set">{t("tabs.set")}</TabsTrigger>
          </TabsList>

          {/* Basic */}
          <TabsContent value="basic" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="rr-rule-number">{t("basic.ruleNumber")}</Label>
                <Input
                  id="rr-rule-number"
                  type="number"
                  min={routeRange(caps, "rule")?.min}
                  max={routeRange(caps, "rule")?.max}
                  value={isEdit ? String(existing.rule_number) : form.rule_number}
                  onChange={(e) => set("rule_number", e.target.value)}
                  disabled={loading || isEdit}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="rr-description">{tc("description")}</Label>
                <Input
                  id="rr-description"
                  placeholder={t("basic.descriptionPlaceholder")}
                  value={form.description}
                  maxLength={descriptionMaxLength(caps)}
                  onChange={(e) => set("description", e.target.value)}
                  disabled={loading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="rr-action">{t("basic.action")}</Label>
                <NamedListSelect
                  id="rr-action"
                  value={form.action}
                  names={values?.rule_actions || []}
                  onValueChange={(v) => set("action", v)}
                  disabled={loading}
                />
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="rr-disable"
                  checked={form.disable}
                  onCheckedChange={(checked) => set("disable", checked === true)}
                  disabled={loading}
                />
                <Label htmlFor="rr-disable" className="text-sm font-normal cursor-pointer">
                  {t("basic.disable")}
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="rr-log"
                  checked={form.log}
                  onCheckedChange={(checked) => set("log", checked === true)}
                  disabled={loading}
                />
                <Label htmlFor="rr-log" className="text-sm font-normal cursor-pointer">
                  {t("basic.log")}
                </Label>
              </div>
            </div>
          </TabsContent>

          {/* Match: addresses, groups, ports, protocol */}
          <TabsContent value="match" className="space-y-6">
            <div className="grid grid-cols-2 gap-6">
              {sidePanel("source")}
              {sidePanel("destination")}
            </div>

            <div className="space-y-4">
              <h3 className="font-semibold text-sm">{t("protocol.title")}</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="rr-protocol">{t("protocol.protocol")}</Label>
                  <NamedListSelect
                    id="rr-protocol"
                    value={form.protocol}
                    names={values?.protocols || []}
                    onValueChange={(v) => set("protocol", v)}
                    disabled={loading}
                  />
                </div>
                {tcpMssOn && textField("tcp_mss", t("protocol.tcpMss"), undefined, "tcp_mss")}
              </div>
              <div className="space-y-2">
                <Label>{t("protocol.tcpFlags")}</Label>
                <CheckboxGroup
                  idPrefix="rr-tcp-flag"
                  options={values?.tcp_flags || []}
                  selected={form.tcp_flags}
                  onChange={(next) => set("tcp_flags", next)}
                  disabled={loading}
                />
              </div>
              <div className="space-y-2">
                <Label>{t("protocol.tcpFlagsNot")}</Label>
                <CheckboxGroup
                  idPrefix="rr-tcp-flag-not"
                  options={values?.tcp_flags || []}
                  selected={form.tcp_flags_not}
                  onChange={(next) => set("tcp_flags_not", next)}
                  disabled={loading}
                />
              </div>
            </div>

            {policyType === "route" ? (
              <div className="space-y-4">
                <h3 className="font-semibold text-sm">{t("icmp.title")}</h3>
                <div className="grid grid-cols-3 gap-4">
                  {textField("icmp_type", t("icmp.type"), undefined, "icmp_type")}
                  {textField("icmp_code", t("icmp.code"), undefined, "icmp_code")}
                  <div className="space-y-2">
                    <Label htmlFor="rr-icmp-type-name">{t("icmp.typeName")}</Label>
                    <NamedListSelect
                      id="rr-icmp-type-name"
                      value={form.icmp_type_name}
                      names={values?.icmp_type_names || []}
                      onValueChange={(v) => set("icmp_type_name", v)}
                      disabled={loading}
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <h3 className="font-semibold text-sm">{t("icmp.v6Title")}</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="rr-icmpv6-type">{t("icmp.v6Type")}</Label>
                    <NamedListSelect
                      id="rr-icmpv6-type"
                      value={form.icmpv6_type}
                      names={values?.icmpv6_types || []}
                      onValueChange={(v) => set("icmpv6_type", v)}
                      disabled={loading}
                    />
                  </div>
                </div>
              </div>
            )}
          </TabsContent>

          {/* Advanced: ttl, packet, state, marks, time, limits */}
          <TabsContent value="advanced" className="space-y-6">
            {policyType === "route"
              ? compareFields("ttl", t("compare.ttlTitle"))
              : compareFields("hop_limit", t("compare.hopLimitTitle"))}

            <div className="space-y-4">
              <h3 className="font-semibold text-sm">{t("packet.title")}</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="rr-packet-type">{t("packet.type")}</Label>
                  <NamedListSelect
                    id="rr-packet-type"
                    value={form.packet_type}
                    names={values?.packet_types || []}
                    onValueChange={(v) => set("packet_type", v)}
                    disabled={loading}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t("packet.fragment")}</Label>
                  <CheckboxGroup
                    idPrefix="rr-fragment"
                    options={values?.fragments || []}
                    selected={form.fragment}
                    onChange={(next) => set("fragment", next)}
                    disabled={loading}
                  />
                </div>
                {listField("packet_length", t("packet.length"), "packet_length")}
                {listField("packet_length_exclude", t("packet.lengthExclude"), "packet_length")}
                {listField("dscp", t("packet.dscp"), "dscp")}
                {listField("dscp_exclude", t("packet.dscpExclude"), "dscp")}
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="font-semibold text-sm">{t("state.title")}</h3>
              <div className="space-y-2">
                <Label>{t("state.connectionState")}</Label>
                <CheckboxGroup
                  idPrefix="rr-state"
                  options={values?.states || []}
                  selected={form.state}
                  onChange={(next) => set("state", next)}
                  disabled={loading}
                />
              </div>
              <div className="space-y-2">
                <Label>{t("state.ipsec")}</Label>
                <CheckboxGroup
                  idPrefix="rr-ipsec"
                  options={caps?.features?.ipsec_matching?.values || []}
                  selected={form.ipsec}
                  onChange={(next) => set("ipsec", next)}
                  disabled={loading}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                {textField("mark", t("state.mark"), undefined, "mark")}
                {listField("connection_mark", t("state.connectionMark"), "connection_mark")}
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="font-semibold text-sm">{t("time.title")}</h3>
              <div className="grid grid-cols-2 gap-4">
                {textField("time_monthdays", t("time.monthDays"), t("examplePlaceholder", { example: "1,15" }))}
                <div />
                {textField("time_startdate", t("time.startDate"), t("examplePlaceholder", { example: "2026-01-31" }))}
                {textField("time_stopdate", t("time.stopDate"), t("examplePlaceholder", { example: "2026-12-31" }))}
                {textField("time_starttime", t("time.startTime"), t("examplePlaceholder", { example: "08:00:00" }))}
                {textField("time_stoptime", t("time.stopTime"), t("examplePlaceholder", { example: "18:00:00" }))}
              </div>
              <div className="space-y-2">
                <Label>{t("time.weekdays")}</Label>
                <CheckboxGroup
                  idPrefix="rr-weekday"
                  options={values?.weekdays || []}
                  selected={form.time_weekdays}
                  onChange={(next) => set("time_weekdays", next)}
                  disabled={loading}
                  labels={weekdayLabels}
                />
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="rr-time-utc"
                  checked={form.time_utc}
                  onCheckedChange={(checked) => set("time_utc", checked === true)}
                  disabled={loading}
                />
                <Label htmlFor="rr-time-utc" className="text-sm font-normal cursor-pointer">
                  {t("time.utc")}
                </Label>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="font-semibold text-sm">{t("limit.title")}</h3>
              <div className="grid grid-cols-2 gap-4">
                {textField("limit_burst", t("limit.burst"), undefined, "limit_burst")}
                {rateUnits.length > 0 && (
                  <div className="space-y-2">
                    <Label htmlFor="rr-limit-rate">{t("limit.rate")}</Label>
                    <div className="flex gap-2">
                      <Input
                        id="rr-limit-rate"
                        value={rate.count}
                        inputMode="numeric"
                        placeholder={rangeHint("limit_rate")}
                        onChange={(e) => set("limit_rate", joinLimitRate(e.target.value, rate.unit || rateUnits[0]))}
                        disabled={loading}
                        className="font-mono"
                      />
                      <div className="w-40">
                        <NamedListSelect
                          id="rr-limit-rate-unit"
                          value={rate.unit}
                          names={rateUnits}
                          onValueChange={(unit) => set("limit_rate", joinLimitRate(rate.count, unit))}
                          disabled={loading || !rate.count}
                          noneLabel={t("limit.unit")}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
              {loadedRecent && (
                <div className="space-y-2">
                  <p className="text-sm font-mono">
                    {t("limit.recent", {
                      count: loadedRecent.recent_count ?? "—",
                      time: loadedRecent.recent_time ?? "—",
                    })}
                  </p>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="rr-recent-remove"
                      checked={recentRemoved}
                      onCheckedChange={(checked) =>
                        setForm((prev) => ({
                          ...prev,
                          recent_count: checked === true ? "" : (loadedRecent.recent_count ?? ""),
                          recent_time: checked === true ? "" : (loadedRecent.recent_time ?? ""),
                        }))
                      }
                      disabled={loading}
                    />
                    <Label htmlFor="rr-recent-remove" className="text-sm font-normal cursor-pointer">
                      {t("limit.removeRecent")}
                    </Label>
                  </div>
                </div>
              )}
            </div>
          </TabsContent>

          {/* Set actions */}
          <TabsContent value="set" className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              {textField("set_connection_mark", t("actions.connectionMark"), undefined, "set_connection_mark")}
              {textField("set_mark", t("actions.mark"), undefined, "set_mark")}
              {textField("set_dscp", t("actions.dscp"), undefined, "set_dscp")}
              {textField("set_tcp_mss", t("actions.tcpMss"), undefined, "set_tcp_mss")}
            </div>

            <div className="space-y-2">
              <Label>{t("actions.routingTable")}</Label>
              <RadioGroup
                value={tableMode}
                onValueChange={(v) => {
                  const mode = v as TableMode;
                  setTableMode(mode);
                  set("set_table", mode === "main" ? "main" : "");
                }}
                disabled={loading}
              >
                {(["none", "main", "custom"] as const).map((mode) => (
                  <div key={mode} className="flex items-center space-x-2">
                    <RadioGroupItem value={mode} id={`rr-table-${mode}`} />
                    <Label htmlFor={`rr-table-${mode}`} className="font-normal cursor-pointer">
                      {mode === "none" ? tc("none") : t(`actions.${mode}Table`)}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
              {tableMode === "custom" && (
                <Input
                  id="rr-set-table"
                  aria-label={t("actions.customTable")}
                  value={form.set_table}
                  inputMode="numeric"
                  placeholder={rangeHint("set_table")}
                  onChange={(e) => set("set_table", e.target.value)}
                  disabled={loading}
                  className="font-mono"
                />
              )}
            </div>

            {vrfOn && (
              <div className="space-y-2">
                <Label htmlFor="rr-set-vrf">{t("actions.vrf")}</Label>
                <VrfSelect
                  id="rr-set-vrf"
                  value={form.set_vrf}
                  onValueChange={(v) => set("set_vrf", v)}
                  disabled={loading}
                />
              </div>
            )}
          </TabsContent>
        </Tabs>
        </fieldset>

        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={loading}>
            {tc("cancel")}
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? tc("saving") : isEdit ? tc("saveChanges") : t("buttons.createRule")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
