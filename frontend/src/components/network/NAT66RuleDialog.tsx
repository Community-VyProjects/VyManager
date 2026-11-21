"use client";

import { useState, useEffect, useMemo } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { InterfaceSelect } from "@/components/ui/interface-select";
import { NamedListSelect } from "@/components/ui/named-list-select";
import { AlertCircle } from "lucide-react";
import {
  nat66Service,
  type NAT66SourceRule,
  type NAT66DestinationRule,
  type NAT66Capabilities,
} from "@/lib/api/nat66";
import {
  PORT_PROTOCOLS,
  emptySide,
  groupKey,
  nat66RuleProblem,
  sideFields,
  type NAT66RuleFields,
  type NAT66Side,
  type NAT66SideFields,
} from "@/lib/api/nat66-save-ops";
import { firewallGroupsService } from "@/lib/api/firewall-groups";
import type { FirewallGroup, GroupsConfigResponse } from "@/lib/api/types/firewall-groups";
import {
  NONE_SENTINEL,
  fromNamedListValue,
  listedNames,
  toNamedListValue,
} from "@/lib/named-list-select-options";
import type { ApiError } from "@/lib/types/api";

interface NAT66RuleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ruleType: "source" | "destination";
  editingRule?: NAT66SourceRule | NAT66DestinationRule | null;
  capabilities?: NAT66Capabilities | null;
  nextRuleNumber: number;
  onSuccess: () => void;
}

/** IPv6 firewall groups a nat66 group match can name, per CLI group type. */
const GROUP_OPTIONS: Record<string, (config: GroupsConfigResponse) => FirewallGroup[]> = {
  "address-group": (config) => config.ipv6_address_groups,
  "domain-group": (config) => config.domain_groups,
  "mac-group": (config) => config.mac_groups,
  "network-group": (config) => config.ipv6_network_groups,
  "port-group": (config) => config.port_groups,
};

const GROUP_LABELS = {
  "address-group": "ruleDialog.ipv6AddressGroup",
  "domain-group": "ruleDialog.domainGroup",
  "mac-group": "ruleDialog.macGroup",
  "network-group": "ruleDialog.ipv6NetworkGroup",
  "port-group": "ruleDialog.portGroup",
} as const;

const NO_GROUP_TYPES: string[] = [];

export function NAT66RuleDialog({
  open,
  onOpenChange,
  ruleType,
  editingRule,
  capabilities,
  nextRuleNumber,
  onSuccess,
}: NAT66RuleDialogProps) {
  const t = useTranslations("nat66");
  const tc = useTranslations("common");
  const isEditing = !!editingRule;
  const isSource = ruleType === "source";
  const matchKey = isSource ? "prefix" : "address";
  const groupsSupported = capabilities?.features?.groups?.supported ?? false;
  const groupTypes = useMemo(
    () => (groupsSupported ? capabilities?.features.groups.group_types || NO_GROUP_TYPES : NO_GROUP_TYPES),
    [groupsSupported, capabilities]
  );
  const protocols = capabilities?.protocols || [];

  const [groupsConfig, setGroupsConfig] = useState<GroupsConfigResponse | null>(null);

  // Form fields
  const [description, setDescription] = useState("");
  const [protocol, setProtocol] = useState("");
  const [interfaceName, setInterfaceName] = useState("");
  const [source, setSource] = useState<NAT66SideFields>(emptySide);
  const [destination, setDestination] = useState<NAT66SideFields>(emptySide);
  const [translationType, setTranslationType] = useState<"address" | "masquerade">("address");
  const [translationAddress, setTranslationAddress] = useState("");
  const [translationPort, setTranslationPort] = useState("");
  const [disable, setDisable] = useState(false);
  const [exclude, setExclude] = useState(false);
  const [log, setLog] = useState(false);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load firewall groups on open
  useEffect(() => {
    if (open && groupsSupported) {
      firewallGroupsService
        .getConfig()
        .then(setGroupsConfig)
        .catch(() => setError(t("ruleDialog.groupsLoadFailed")));
    }
  }, [open, groupsSupported, t]);

  // Load the form when the dialog opens
  useEffect(() => {
    if (!open) return;
    setError(null);
    if (editingRule) {
      setDescription(editingRule.description || "");
      setProtocol(editingRule.protocol || "");
      setDisable(editingRule.disable);
      setExclude(editingRule.exclude);
      setLog(editingRule.log);
      setInterfaceName(
        (isSource
          ? (editingRule as NAT66SourceRule).outbound_interface
          : (editingRule as NAT66DestinationRule).inbound_interface) || ""
      );
      setSource(sideFields(editingRule.source, matchKey));
      setDestination(sideFields(editingRule.destination, matchKey));
      const isMasq = isSource && editingRule.translation?.address === "masquerade";
      setTranslationType(isMasq ? "masquerade" : "address");
      setTranslationAddress(isMasq ? "" : editingRule.translation?.address || "");
      setTranslationPort(editingRule.translation?.port || "");
    } else {
      setDescription("");
      setProtocol("");
      setInterfaceName("");
      setSource(emptySide());
      setDestination(emptySide());
      setTranslationType(isSource ? "masquerade" : "address");
      setTranslationAddress("");
      setTranslationPort("");
      setDisable(false);
      setExclude(false);
      setLog(false);
    }
  }, [open, editingRule, isSource, matchKey]);

  const showPortFields = PORT_PROTOCOLS.includes(protocol);

  const handleSave = async () => {
    const fields: NAT66RuleFields = {
      description,
      protocol,
      interfaceName,
      source,
      destination,
      translationAddress: isSource && translationType === "masquerade" ? "masquerade" : translationAddress,
      translationPort,
      disable,
      exclude,
      log,
    };
    const problem = nat66RuleProblem(fields);
    if (problem) {
      setError(t(`ruleDialog.${problem}`));
      return;
    }
    setSaving(true);
    setError(null);
    try {
      if (editingRule) {
        await nat66Service.updateRule(ruleType, editingRule, fields, groupTypes);
      } else {
        await nat66Service.createRule(ruleType, nextRuleNumber, fields, groupTypes);
      }
      onOpenChange(false);
      onSuccess();
    } catch (err) {
      setError((err as ApiError).message || tc("operationFailed"));
    } finally {
      setSaving(false);
    }
  };

  const groupLabel = (type: string) =>
    type in GROUP_LABELS ? t(GROUP_LABELS[type as keyof typeof GROUP_LABELS]) : type;

  const renderSide = (
    side: NAT66Side,
    fields: NAT66SideFields,
    setFields: (fields: NAT66SideFields) => void
  ) => {
    const isSourceSide = side === "source";
    const matchLabel = isSource
      ? isSourceSide ? t("ruleDialog.sourcePrefix") : t("ruleDialog.destinationPrefix")
      : isSourceSide ? t("ruleDialog.sourceAddress") : t("ruleDialog.destinationAddress");
    return (
      <>
        <div className="space-y-2">
          <Label htmlFor={`nat66-${side}-match`}>{matchLabel}</Label>
          <Input
            id={`nat66-${side}-match`}
            value={fields.match}
            onChange={(e) => setFields({ ...fields, match: e.target.value })}
            placeholder={isSource ? (isSourceSide ? "fd00::/64" : "fd01::/64") : (isSourceSide ? "fd00::1" : "fd01::1")}
            className="font-mono"
          />
        </div>

        {showPortFields && (
          <div className="space-y-2">
            <Label htmlFor={`nat66-${side}-port`}>
              {isSourceSide ? t("ruleDialog.sourcePort") : t("ruleDialog.destinationPort")}
            </Label>
            <Input
              id={`nat66-${side}-port`}
              value={fields.port}
              onChange={(e) => setFields({ ...fields, port: e.target.value })}
              placeholder={isSourceSide ? t("ruleDialog.sourcePortPlaceholder") : t("ruleDialog.destinationPortPlaceholder")}
              className="font-mono"
            />
          </div>
        )}

        {groupTypes
          .filter((type) => type !== "port-group" || showPortFields)
          .map((type) => {
            const key = groupKey(type);
            const names = (groupsConfig && GROUP_OPTIONS[type] ? GROUP_OPTIONS[type](groupsConfig) : []).map(
              (group) => group.name
            );
            return (
              <div key={type} className="space-y-2">
                <Label htmlFor={`nat66-${side}-${type}`}>{groupLabel(type)}</Label>
                <NamedListSelect
                  id={`nat66-${side}-${type}`}
                  value={fields.groups[key] ?? ""}
                  names={names}
                  onValueChange={(value) => setFields({ ...fields, groups: { ...fields.groups, [key]: value } })}
                />
              </div>
            );
          })}
      </>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {editingRule
              ? t("ruleDialog.editTitle", { type: ruleType, number: String(editingRule.rule_number) })
              : t("ruleDialog.createTitle", { type: ruleType })}
          </DialogTitle>
          <DialogDescription>
            {isSource
              ? t("ruleDialog.descriptionSource")
              : t("ruleDialog.descriptionDestination")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Error Alert */}
          {error && (
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 flex items-start gap-2">
              <AlertCircle className="h-5 w-5 text-destructive mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm text-destructive">{error}</p>
              </div>
            </div>
          )}

          {/* Rule Number (Auto-calculated) */}
          <div className="space-y-2 bg-muted/30 border border-muted rounded-lg p-4">
            <Label>{t("ruleDialog.ruleNumberAuto")}</Label>
            <div className="text-2xl font-mono font-bold text-primary">
              {editingRule ? editingRule.rule_number : nextRuleNumber}
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="nat66-desc">{tc("description")}</Label>
            <Textarea
              id="nat66-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t("ruleDialog.descriptionPlaceholder")}
              rows={2}
            />
          </div>

          <Tabs defaultValue="basic" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="basic">{t("ruleDialog.tabBasic")}</TabsTrigger>
              <TabsTrigger value="source">{t("ruleDialog.tabSource")}</TabsTrigger>
              <TabsTrigger value="destination">{t("ruleDialog.tabDestination")}</TabsTrigger>
              <TabsTrigger value="advanced">{t("ruleDialog.tabAdvanced")}</TabsTrigger>
            </TabsList>

            {/* Basic Tab */}
            <TabsContent value="basic" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="nat66-iface">
                  {isSource ? t("ruleDialog.outboundInterface") : t("ruleDialog.inboundInterface")}
                </Label>
                <InterfaceSelect
                  value={interfaceName}
                  onValueChange={setInterfaceName}
                  id="nat66-iface"
                  placeholder={tc("selectInterface")}
                  noneOption={{ label: tc("none"), value: "" }}
                />
              </div>

              {isSource && (
                <div className="space-y-2">
                  <Label>{t("ruleDialog.translationType")}</Label>
                  <RadioGroup value={translationType} onValueChange={(v) => setTranslationType(v as "address" | "masquerade")}>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="masquerade" id="nat66-trans-masq" />
                      <Label htmlFor="nat66-trans-masq">{t("ruleDialog.masquerade")}</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="address" id="nat66-trans-addr-radio" />
                      <Label htmlFor="nat66-trans-addr-radio">{t("ruleDialog.ipv6Address")}</Label>
                    </div>
                  </RadioGroup>
                </div>
              )}

              {(translationType !== "masquerade" || !isSource) && (
                <div className="space-y-2">
                  <Label htmlFor="nat66-trans-addr">
                    {t("ruleDialog.translationAddress")}
                  </Label>
                  <Input
                    id="nat66-trans-addr"
                    value={translationAddress}
                    onChange={(e) => setTranslationAddress(e.target.value)}
                    placeholder="fd02::1"
                    className="font-mono"
                  />
                </div>
              )}

              {showPortFields && (
                <div className="space-y-2">
                  <Label htmlFor="nat66-trans-port">{t("ruleDialog.translationPort")}</Label>
                  <Input
                    id="nat66-trans-port"
                    value={translationPort}
                    onChange={(e) => setTranslationPort(e.target.value)}
                    placeholder={t("ruleDialog.translationPortPlaceholder")}
                    className="font-mono"
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="nat66-protocol">{t("ruleDialog.protocol")}</Label>
                <Select value={toNamedListValue(protocol)} onValueChange={(v) => setProtocol(fromNamedListValue(v))}>
                  <SelectTrigger id="nat66-protocol">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE_SENTINEL}>{tc("default")}</SelectItem>
                    {listedNames(protocols, protocol).map((name) => (
                      <SelectItem key={name} value={name}>{name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </TabsContent>

            <TabsContent value="source" className="space-y-4">
              {renderSide("source", source, setSource)}
            </TabsContent>

            <TabsContent value="destination" className="space-y-4">
              {renderSide("destination", destination, setDestination)}
            </TabsContent>

            {/* Advanced Tab */}
            <TabsContent value="advanced" className="space-y-4">
              <div className="space-y-4">
                <h4 className="font-medium">{t("ruleDialog.ruleFlags")}</h4>
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="nat66-disable"
                      checked={disable}
                      onCheckedChange={(checked) => setDisable(checked === true)}
                    />
                    <Label htmlFor="nat66-disable" className="text-sm font-normal">
                      {t("ruleDialog.disableRule")}
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="nat66-exclude"
                      checked={exclude}
                      onCheckedChange={(checked) => setExclude(checked === true)}
                    />
                    <Label htmlFor="nat66-exclude" className="text-sm font-normal">
                      {t("ruleDialog.excludeFromNat")}
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="nat66-log"
                      checked={log}
                      onCheckedChange={(checked) => setLog(checked === true)}
                    />
                    <Label htmlFor="nat66-log" className="text-sm font-normal">
                      {t("ruleDialog.enableLogging")}
                    </Label>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            {tc("cancel")}
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (isEditing ? tc("saving") : tc("creating")) : (isEditing ? tc("save") : t("ruleDialog.createRule"))}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
