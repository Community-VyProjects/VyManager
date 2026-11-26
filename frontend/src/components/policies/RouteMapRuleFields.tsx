"use client";

import { useState, type Dispatch, type SetStateAction } from "react";
import { useTranslations } from "next-intl";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { NamedListSelect } from "@/components/ui/named-list-select";
import { InterfaceSelect } from "@/components/ui/interface-select";
import { VrfSelect } from "@/components/ui/vrf-select";
import { MultiValueInput } from "@/components/service/webproxy/MultiValueInput";
import type { RouteMapCapabilities, RouteMapRangeKey } from "@/lib/api/route-map";
import {
  descriptionMaxLength,
  IP_NEXTHOP_PEER_ADDRESS,
  IP_NEXTHOP_UNCHANGED,
  routeMapRange,
  ruleActions,
  type FlagKey,
  type ListKey,
  type RouteMapRuleForm,
  type SingleKey,
} from "@/lib/api/route-map-save-ops";
import { RouteMapEvpnMatchSection, RouteMapEvpnSetSection } from "./RouteMapEvpnSections";
import type { RouteMapPickers, RouteMapRuleTab } from "./route-map-rule-form";

interface RouteMapRuleFieldsProps {
  idPrefix: string;
  form: RouteMapRuleForm;
  onChange: Dispatch<SetStateAction<RouteMapRuleForm>>;
  /** The rule number is the stored one on edit. */
  ruleNumberLocked: boolean;
  disabled: boolean;
  capabilities: RouteMapCapabilities | null;
  pickers: RouteMapPickers;
  tab: RouteMapRuleTab;
  onTabChange: (tab: RouteMapRuleTab) => void;
}

type NexthopMode = "none" | "address" | typeof IP_NEXTHOP_PEER_ADDRESS | typeof IP_NEXTHOP_UNCHANGED;

function nexthopModeOf(value: string): NexthopMode {
  if (!value) return "none";
  if (value === IP_NEXTHOP_PEER_ADDRESS || value === IP_NEXTHOP_UNCHANGED) return value;
  return "address";
}

/**
 * Every leaf of one route-map rule, shared by the rule modal (create and
 * edit) and the create-route-map modal's first rule. Leaves a device lacks
 * are hidden by its capabilities.
 */
export function RouteMapRuleFields({
  idPrefix,
  form,
  onChange,
  ruleNumberLocked,
  disabled,
  capabilities: caps,
  pickers,
  tab,
  onTabChange,
}: RouteMapRuleFieldsProps) {
  const t = useTranslations("routeMapRuleModal");
  const tm = useTranslations("routeMap");
  const tc = useTranslations("common");
  const values = caps?.values;
  const features = caps?.features;
  const bandwidthKeywords = values?.extcommunity_bandwidth_keywords || [];
  const [nexthopMode, setNexthopMode] = useState<NexthopMode>(() => nexthopModeOf(form.set_ip_nexthop.trim()));
  const [bandwidthMode, setBandwidthMode] = useState<string>(() => {
    const value = form.set_extcommunity_bandwidth.trim();
    if (!value) return "none";
    return bandwidthKeywords.includes(value) ? value : "number";
  });

  const set = <K extends keyof RouteMapRuleForm>(key: K, value: RouteMapRuleForm[K]) =>
    onChange((prev) => ({ ...prev, [key]: value }));
  const id = (key: string) => `${idPrefix}-${key.replace(/_/g, "-")}`;

  const rangeHint = (key: RouteMapRangeKey): string | undefined => {
    const range = routeMapRange(caps, key);
    return range ? t("rangePlaceholder", { min: range.min, max: range.max }) : undefined;
  };

  const textField = (key: SingleKey, label: string, placeholder?: string) => (
    <div className="space-y-2">
      <Label htmlFor={id(key)}>{label}</Label>
      <Input
        id={id(key)}
        value={form[key]}
        onChange={(e) => set(key, e.target.value)}
        placeholder={placeholder}
        className="font-mono"
      />
    </div>
  );

  const numberField = (key: SingleKey, label: string, rangeKey: RouteMapRangeKey) => {
    return (
      <div className="space-y-2">
        <Label htmlFor={id(key)}>{label}</Label>
        <Input
          id={id(key)}
          value={form[key]}
          inputMode="numeric"
          onChange={(e) => set(key, e.target.value)}
          placeholder={rangeHint(rangeKey)}
          className="font-mono"
        />
      </div>
    );
  };

  const pick = (key: SingleKey, label: string, names: string[], labels?: Record<string, string>) => (
    <div className="space-y-2">
      <Label htmlFor={id(key)}>{label}</Label>
      <NamedListSelect id={id(key)} value={form[key]} names={names} labels={labels} onValueChange={(v) => set(key, v)} />
    </div>
  );

  const flagField = (key: FlagKey, label: string) => (
    <div className="flex items-center space-x-2">
      <Checkbox id={id(key)} checked={form[key]} onCheckedChange={(checked) => set(key, checked === true)} />
      <Label htmlFor={id(key)} className="text-sm font-normal cursor-pointer">
        {label}
      </Label>
    </div>
  );

  const listField = (key: ListKey, label: string, example: string, suggestions?: string[]) => (
    <MultiValueInput
      label={label}
      values={form[key]}
      onChange={(next) => set(key, next)}
      placeholder={t("example", { value: example })}
      suggestions={suggestions}
    />
  );

  const actionLabels: Record<string, string> = { permit: t("permit"), deny: t("deny") };
  const excludeAll = form.set_as_path_exclude.trim() === "all";

  return (
    <Tabs value={tab} onValueChange={(v) => onTabChange(v as RouteMapRuleTab)} className="w-full">
      <TabsList className="grid w-full grid-cols-4">
        <TabsTrigger value="basic">{t("tabBasic")}</TabsTrigger>
        <TabsTrigger value="match">{tm("page.colMatch")}</TabsTrigger>
        <TabsTrigger value="set">{tm("page.colSet")}</TabsTrigger>
        <TabsTrigger value="advanced">{t("tabAdvanced")}</TabsTrigger>
      </TabsList>

      <fieldset disabled={disabled} className="min-w-0">
        {/* Basic */}
        <TabsContent value="basic" className="space-y-4 mt-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor={id("rule_number")}>{t("ruleNumber")}</Label>
              <Input
                id={id("rule_number")}
                value={form.rule_number}
                inputMode="numeric"
                placeholder={rangeHint("rule")}
                onChange={(e) => set("rule_number", e.target.value)}
                disabled={ruleNumberLocked}
                className="font-mono"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor={id("action")}>{tm("page.colAction")}</Label>
              {/* Required by the lab: no empty item. */}
              <Select value={form.action || undefined} onValueChange={(v) => set("action", v)}>
                <SelectTrigger id={id("action")}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[...ruleActions(caps), ...(form.action && !ruleActions(caps).includes(form.action) ? [form.action] : [])].map(
                    (action) => (
                      <SelectItem key={action} value={action}>
                        {actionLabels[action] ?? action}
                      </SelectItem>
                    ),
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor={id("description")}>{t("ruleDescription")}</Label>
            <Input
              id={id("description")}
              value={form.description}
              maxLength={descriptionMaxLength(caps)}
              onChange={(e) => set("description", e.target.value)}
            />
          </div>
        </TabsContent>

        {/* Match */}
        <TabsContent value="match" className="mt-4">
          <Accordion type="multiple" className="w-full">
            <AccordionItem value="bgp">
              <AccordionTrigger>{t("field.bgpAttributes")}</AccordionTrigger>
              <AccordionContent className="space-y-4 pt-4">
                <div className="grid grid-cols-2 gap-4">
                  {pick("match_as_path", t("field.asPathList"), pickers.asPathLists)}
                  {pick("match_origin", t("field.origin"), values?.origins || [])}
                  <div className="space-y-2">
                    {pick("match_community_list", t("field.communityList"), pickers.communityLists)}
                    {flagField("match_community_exact_match", t("field.exactMatch"))}
                  </div>
                  {pick("match_extcommunity", t("field.extendedCommunity"), pickers.extcommunityLists)}
                  {pick("match_large_community_list", t("field.largeCommunityList"), pickers.largeCommunityLists)}
                  {numberField("match_local_preference", t("field.localPreference"), "match_local_preference")}
                  {numberField("match_metric", t("field.metricMed"), "match_metric")}
                  {textField("match_peer", t("field.peerAddress"), t("example", { value: "192.0.2.1" }))}
                  {features?.match_source_peer?.supported === true &&
                    pick("match_source_peer", t("field.sourcePeer"), pickers.bgpPeers)}
                  {pick("match_rpki", t("field.rpki"), values?.rpki_states || [])}
                  {features?.match_rpki_extcommunity?.supported === true &&
                    pick("match_rpki_extcommunity", t("field.rpkiExtcommunity"), values?.rpki_states || [])}
                </div>
              </AccordionContent>
            </AccordionItem>

            <RouteMapEvpnMatchSection idPrefix={idPrefix} form={form} set={set} capabilities={caps} />

            <AccordionItem value="address">
              <AccordionTrigger>{t("field.addressMatching")}</AccordionTrigger>
              <AccordionContent className="space-y-4 pt-4">
                <h4 className="text-sm font-medium">{t("field.ipv4Address")}</h4>
                <div className="grid grid-cols-3 gap-4">
                  {pick("match_ip_address_access_list", t("field.accessList"), pickers.ipv4AccessLists)}
                  {pick("match_ip_address_prefix_list", t("field.prefixList"), pickers.ipv4PrefixLists)}
                  {numberField("match_ip_address_prefix_len", t("field.prefixLength"), "ip_prefix_len")}
                </div>
                <h4 className="text-sm font-medium">{t("field.ipv6Address")}</h4>
                <div className="grid grid-cols-3 gap-4">
                  {pick("match_ipv6_address_access_list", t("field.accessList"), pickers.ipv6AccessLists)}
                  {pick("match_ipv6_address_prefix_list", t("field.prefixList"), pickers.ipv6PrefixLists)}
                  {numberField("match_ipv6_address_prefix_len", t("field.prefixLength"), "ipv6_prefix_len")}
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="nexthop">
              <AccordionTrigger>{t("field.nexthopMatching")}</AccordionTrigger>
              <AccordionContent className="space-y-4 pt-4">
                <h4 className="text-sm font-medium">{t("field.ipv4Nexthop")}</h4>
                <div className="grid grid-cols-2 gap-4">
                  {pick("match_ip_nexthop_access_list", t("field.accessList"), pickers.ipv4AccessLists)}
                  {pick("match_ip_nexthop_prefix_list", t("field.prefixList"), pickers.ipv4PrefixLists)}
                  {textField("match_ip_nexthop_address", t("field.address"), t("example", { value: "192.0.2.1" }))}
                  {numberField("match_ip_nexthop_prefix_len", t("field.prefixLength"), "ip_prefix_len")}
                  {pick("match_ip_nexthop_type", t("field.nexthopType"), values?.nexthop_types || [])}
                </div>
                <h4 className="text-sm font-medium">{t("field.ipv6Nexthop")}</h4>
                <div className="grid grid-cols-2 gap-4">
                  {pick("match_ipv6_nexthop_access_list", t("field.accessList"), pickers.ipv6AccessLists)}
                  {pick("match_ipv6_nexthop_prefix_list", t("field.prefixList"), pickers.ipv6PrefixLists)}
                  {textField("match_ipv6_nexthop_address", t("field.address"), t("example", { value: "2001:db8::1" }))}
                  {pick("match_ipv6_nexthop_type", t("field.nexthopType"), values?.nexthop_types || [])}
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="other">
              <AccordionTrigger>{t("field.otherConditions")}</AccordionTrigger>
              <AccordionContent className="space-y-4 pt-4">
                <div className="grid grid-cols-2 gap-4">
                  {pick("match_ip_route_source_access_list", t("field.routeSourceAccessList"), pickers.ipv4AccessLists)}
                  {pick("match_ip_route_source_prefix_list", t("field.routeSourcePrefixList"), pickers.ipv4PrefixLists)}
                  <div className="space-y-2">
                    <Label htmlFor={id("match_interface")}>{t("field.interface")}</Label>
                    <InterfaceSelect
                      id={id("match_interface")}
                      value={form.match_interface}
                      onValueChange={(v) => set("match_interface", v)}
                      noneOption={{ label: tc("none"), value: "" }}
                      placeholder={tc("selectInterface")}
                      disabled={disabled}
                    />
                  </div>
                  {pick("match_protocol", t("field.protocol"), values?.protocols || [])}
                  <div className="space-y-2">
                    <Label htmlFor={id("match_source_vrf")}>{t("field.sourceVrf")}</Label>
                    <VrfSelect
                      id={id("match_source_vrf")}
                      value={form.match_source_vrf}
                      onValueChange={(v) => set("match_source_vrf", v)}
                      extraOptions={[{ label: tc("default"), value: "default" }]}
                      disabled={disabled}
                    />
                  </div>
                  {numberField("match_tag", t("field.tag"), "match_tag")}
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </TabsContent>

        {/* Set */}
        <TabsContent value="set" className="mt-4">
          <Accordion type="multiple" className="w-full">
            <AccordionItem value="as-path">
              <AccordionTrigger>{t("field.asPath")}</AccordionTrigger>
              <AccordionContent className="space-y-4 pt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor={id("set_as_path_exclude")}>{t("field.excludeAs")}</Label>
                    <Input
                      id={id("set_as_path_exclude")}
                      value={excludeAll ? "" : form.set_as_path_exclude}
                      onChange={(e) => set("set_as_path_exclude", e.target.value)}
                      placeholder={t("example", { value: "65001 65002" })}
                      disabled={excludeAll}
                      className="font-mono"
                    />
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id={id("set_as_path_exclude_all")}
                        checked={excludeAll}
                        onCheckedChange={(checked) => set("set_as_path_exclude", checked === true ? "all" : "")}
                      />
                      <Label htmlFor={id("set_as_path_exclude_all")} className="text-sm font-normal cursor-pointer">
                        {t("field.excludeAll")}
                      </Label>
                    </div>
                  </div>
                  {textField("set_as_path_prepend", t("field.prependAs"), t("example", { value: "65001 65001" }))}
                  {numberField("set_as_path_prepend_last_as", t("field.prependLastAs"), "as_path_prepend_last_as")}
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="communities">
              <AccordionTrigger>{t("field.communities")}</AccordionTrigger>
              <AccordionContent className="space-y-6 pt-4">
                <div className="space-y-4">
                  <h4 className="text-sm font-medium">{t("field.standardCommunity")}</h4>
                  {listField("set_community_add", t("field.communityAdd"), "65000:100", values?.community_well_known)}
                  {listField("set_community_replace", t("field.communityReplace"), "65000:100", values?.community_well_known)}
                  {pick("set_community_delete", t("field.communityDelete"), pickers.communityLists)}
                  {flagField("set_community_none", t("field.communityNone"))}
                </div>
                <div className="space-y-4">
                  <h4 className="text-sm font-medium">{t("field.largeCommunity")}</h4>
                  {listField("set_large_community_add", t("field.largeCommunityAdd"), "65000:1:1")}
                  {listField("set_large_community_replace", t("field.largeCommunityReplace"), "65000:1:1")}
                  {pick("set_large_community_delete", t("field.largeCommunityDelete"), pickers.largeCommunityLists)}
                  {flagField("set_large_community_none", t("field.largeCommunityNone"))}
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="extcommunity">
              <AccordionTrigger>{t("field.extendedCommunity")}</AccordionTrigger>
              <AccordionContent className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label id={id("set_extcommunity_bandwidth_label")}>{t("field.bandwidth")}</Label>
                  <RadioGroup
                    aria-labelledby={id("set_extcommunity_bandwidth_label")}
                    value={bandwidthMode}
                    onValueChange={(mode) => {
                      setBandwidthMode(mode);
                      set("set_extcommunity_bandwidth", mode === "none" || mode === "number" ? "" : mode);
                    }}
                    className="flex flex-wrap gap-4"
                  >
                    {["none", "number", ...bandwidthKeywords].map((mode) => (
                      <div key={mode} className="flex items-center space-x-2">
                        <RadioGroupItem value={mode} id={id(`set_extcommunity_bandwidth_${mode}`)} />
                        <Label htmlFor={id(`set_extcommunity_bandwidth_${mode}`)} className="font-normal cursor-pointer">
                          {mode === "none" ? tc("none") : mode === "number" ? t("field.bandwidthMbps") : mode}
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                  {bandwidthMode === "number" && (
                    <Input
                      id={id("set_extcommunity_bandwidth")}
                      aria-label={t("field.bandwidthMbps")}
                      value={form.set_extcommunity_bandwidth}
                      inputMode="numeric"
                      placeholder={rangeHint("extcommunity_bandwidth")}
                      onChange={(e) => set("set_extcommunity_bandwidth", e.target.value)}
                      className="font-mono"
                    />
                  )}
                  {flagField("set_extcommunity_bandwidth_non_transitive", t("field.bandwidthNonTransitive"))}
                </div>
                {listField("set_extcommunity_rt", t("field.routeTarget"), "65000:100")}
                {listField("set_extcommunity_soo", t("field.siteOfOrigin"), "65000:100")}
                {flagField("set_extcommunity_none", t("field.extcommunityNone"))}
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="bgp-set">
              <AccordionTrigger>{t("field.bgpAttributes")}</AccordionTrigger>
              <AccordionContent className="space-y-4 pt-4">
                {flagField("set_atomic_aggregate", t("field.atomicAggregate"))}
                <div className="grid grid-cols-2 gap-4">
                  {numberField("set_aggregator_as", t("field.aggregatorAs"), "aggregator_as")}
                  {textField("set_aggregator_ip", t("field.aggregatorIp"), t("example", { value: "192.0.2.1" }))}
                  {numberField("set_local_preference", t("field.localPreference"), "local_preference")}
                  {pick("set_origin", t("field.origin"), values?.origins || [])}
                  {textField("set_originator_id", t("field.originatorId"), t("example", { value: "192.0.2.1" }))}
                  {numberField("set_weight", t("field.weight"), "weight")}
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="nexthop-set">
              <AccordionTrigger>{t("field.nexthop")}</AccordionTrigger>
              <AccordionContent className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label id={id("set_ip_nexthop_label")}>{t("field.ipv4Nexthop")}</Label>
                  <RadioGroup
                    aria-labelledby={id("set_ip_nexthop_label")}
                    value={nexthopMode}
                    onValueChange={(v) => {
                      const mode = v as NexthopMode;
                      setNexthopMode(mode);
                      set("set_ip_nexthop", mode === "none" || mode === "address" ? "" : mode);
                    }}
                    className="flex flex-wrap gap-4"
                  >
                    {(["none", "address", IP_NEXTHOP_PEER_ADDRESS, IP_NEXTHOP_UNCHANGED] as const).map((mode) => (
                      <div key={mode} className="flex items-center space-x-2">
                        <RadioGroupItem value={mode} id={id(`set_ip_nexthop_${mode}`)} />
                        <Label htmlFor={id(`set_ip_nexthop_${mode}`)} className="font-normal cursor-pointer">
                          {mode === "none"
                            ? tc("none")
                            : mode === "address"
                              ? t("field.address")
                              : mode === IP_NEXTHOP_PEER_ADDRESS
                                ? t("field.usePeerAddress")
                                : t("field.keepUnchanged")}
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                  {nexthopMode === "address" && (
                    <Input
                      id={id("set_ip_nexthop")}
                      aria-label={t("field.ipv4Nexthop")}
                      value={form.set_ip_nexthop}
                      onChange={(e) => set("set_ip_nexthop", e.target.value)}
                      placeholder={t("example", { value: "192.0.2.1" })}
                      className="font-mono"
                    />
                  )}
                </div>
                <h4 className="text-sm font-medium">{t("field.ipv6Nexthop")}</h4>
                <div className="grid grid-cols-2 gap-4">
                  {textField("set_ipv6_nexthop_global", t("field.globalAddress"), t("example", { value: "2001:db8::1" }))}
                  {textField("set_ipv6_nexthop_local", t("field.linkLocalAddress"), t("example", { value: "fe80::1" }))}
                </div>
                {flagField("set_ipv6_nexthop_peer_address", t("field.usePeerAddress"))}
                {flagField("set_ipv6_nexthop_prefer_global", t("field.preferGlobal"))}
                <h4 className="text-sm font-medium">{t("field.l3vpnNexthop")}</h4>
                {flagField("set_l3vpn_nexthop_encapsulation_gre", t("field.l3vpnNexthopGre"))}
              </AccordionContent>
            </AccordionItem>

            <RouteMapEvpnSetSection idPrefix={idPrefix} form={form} set={set} />

            <AccordionItem value="route">
              <AccordionTrigger>{t("field.routeProperties")}</AccordionTrigger>
              <AccordionContent className="space-y-4 pt-4">
                <div className="grid grid-cols-2 gap-4">
                  {numberField("set_distance", t("field.adminDistance"), "distance")}
                  {textField("set_metric", t("field.metric"), t("example", { value: "+10" }))}
                  {pick("set_metric_type", t("field.metricType"), values?.metric_types || [])}
                  {textField("set_src", t("field.sourceAddress"), t("example", { value: "192.0.2.1" }))}
                  {numberField("set_table", t("field.routingTable"), "table")}
                  {numberField("set_tag", t("field.tag"), "tag")}
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </TabsContent>

        {/* Advanced */}
        <TabsContent value="advanced" className="space-y-4 mt-4">
          <div className="grid grid-cols-2 gap-4">
            {pick("call", t("field.callRouteMap"), pickers.routeMaps)}
            {numberField("continue_rule", t("field.continueToRule"), "continue")}
            {numberField("on_match_goto", t("field.onMatchGoto"), "on_match_goto")}
          </div>
          {flagField("on_match_next", t("field.onMatchNext"))}
        </TabsContent>
      </fieldset>
    </Tabs>
  );
}
