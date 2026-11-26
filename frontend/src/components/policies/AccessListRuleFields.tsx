"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useTranslations } from "next-intl";
import type { AccessListCapabilitiesResponse, AccessListType } from "@/lib/api/access-list";
import {
  descriptionMaxLength,
  destinationChoices,
  ruleActions,
  sourceChoices,
  type AccessListRuleForm,
  type DestinationChoice,
  type EndpointChoice,
} from "@/lib/api/access-list-save-ops";

interface AccessListRuleFieldsProps {
  idPrefix: string;
  listType: AccessListType;
  /** An extended IPv4 list: the destination is required (no "none"). */
  extended: boolean;
  form: AccessListRuleForm;
  onChange: (form: AccessListRuleForm) => void;
  /** Locked on edit: the rule number is the rule's identity. */
  ruleNumberLocked: boolean;
  disabled: boolean;
  capabilities: AccessListCapabilitiesResponse | null;
}

/**
 * Every leaf of an access-list rule, for create and edit alike: IPv4 offers
 * source and destination any/host/network (+ inverse-mask); IPv6 offers only
 * source any/network and exact-match with a network.
 */
export function AccessListRuleFields({
  idPrefix,
  listType,
  extended,
  form,
  onChange,
  ruleNumberLocked,
  disabled,
  capabilities,
}: AccessListRuleFieldsProps) {
  const t = useTranslations("accessList");
  const tc = useTranslations("common");
  const set = <K extends keyof AccessListRuleForm>(key: K, value: AccessListRuleForm[K]) =>
    onChange({ ...form, [key]: value });
  const ipv4 = listType === "ipv4";
  const actionLabel = (action: string) =>
    action === "permit" ? t("form.permit") : action === "deny" ? t("form.deny") : action;
  const choiceLabel: Record<DestinationChoice, string> = {
    none: tc("none"),
    any: t("form.any"),
    host: t("form.host"),
    network: t("form.network"),
  };
  const destinations = destinationChoices(extended);
  const destination = destinations.includes(form.destination) ? form.destination : "";
  const descriptionMax = descriptionMaxLength(capabilities);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor={`${idPrefix}-rule-number`}>{t("form.ruleNumber")} *</Label>
          <Input
            id={`${idPrefix}-rule-number`}
            inputMode="numeric"
            value={form.rule_number}
            onChange={(e) => set("rule_number", e.target.value)}
            disabled={disabled || ruleNumberLocked}
            className={ruleNumberLocked ? "bg-muted" : undefined}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor={`${idPrefix}-action`}>{t("form.action")} *</Label>
          <Select value={form.action} onValueChange={(v) => set("action", v)} disabled={disabled}>
            <SelectTrigger id={`${idPrefix}-action`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ruleActions(capabilities).map((action) => (
                <SelectItem key={action} value={action}>
                  {actionLabel(action)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}-rule-description`}>{t("form.ruleDescription")}</Label>
        <Input
          id={`${idPrefix}-rule-description`}
          value={form.description}
          maxLength={descriptionMax}
          onChange={(e) => set("description", e.target.value)}
          placeholder={t("form.ruleDescriptionPlaceholder")}
          disabled={disabled}
        />
      </div>

      <div className="space-y-3 border rounded-lg p-4">
        <div className="space-y-2">
          <Label htmlFor={`${idPrefix}-source`}>{t("form.source")} *</Label>
          <Select
            value={form.source}
            onValueChange={(v) => set("source", v as EndpointChoice)}
            disabled={disabled}
          >
            <SelectTrigger id={`${idPrefix}-source`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {sourceChoices(listType).map((choice) => (
                <SelectItem key={choice} value={choice}>
                  {choiceLabel[choice]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {form.source === "host" && ipv4 && (
          <div className="space-y-2">
            <Label htmlFor={`${idPrefix}-source-host`}>{t("form.hostAddress")} *</Label>
            <Input
              id={`${idPrefix}-source-host`}
              value={form.source_host}
              onChange={(e) => set("source_host", e.target.value)}
              placeholder={t("form.example", { value: "192.168.1.1" })}
              disabled={disabled}
            />
          </div>
        )}

        {form.source === "network" && ipv4 && (
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor={`${idPrefix}-source-network`}>{t("form.networkAddress")} *</Label>
              <Input
                id={`${idPrefix}-source-network`}
                value={form.source_network}
                onChange={(e) => set("source_network", e.target.value)}
                placeholder={t("form.example", { value: "192.168.1.0" })}
                disabled={disabled}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`${idPrefix}-source-mask`}>{t("form.inverseMask")} *</Label>
              <Input
                id={`${idPrefix}-source-mask`}
                value={form.source_inverse_mask}
                onChange={(e) => set("source_inverse_mask", e.target.value)}
                placeholder={t("form.example", { value: "0.0.0.255" })}
                disabled={disabled}
              />
            </div>
          </div>
        )}

        {form.source === "network" && !ipv4 && (
          <>
            <div className="space-y-2">
              <Label htmlFor={`${idPrefix}-source-network`}>{t("form.networkCidr")} *</Label>
              <Input
                id={`${idPrefix}-source-network`}
                value={form.source_network}
                onChange={(e) => set("source_network", e.target.value)}
                placeholder={t("form.example", { value: "2001:db8::/32" })}
                disabled={disabled}
              />
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id={`${idPrefix}-source-exact-match`}
                checked={form.source_exact_match}
                onCheckedChange={(checked) => set("source_exact_match", checked === true)}
                disabled={disabled}
              />
              <Label htmlFor={`${idPrefix}-source-exact-match`} className="font-normal cursor-pointer">
                {t("form.exactMatch")}
              </Label>
            </div>
          </>
        )}
      </div>

      {ipv4 && (
        <div className="space-y-3 border rounded-lg p-4">
          <div className="space-y-2">
            <Label htmlFor={`${idPrefix}-destination`}>
              {t("form.destination")}
              {extended && " *"}
            </Label>
            <Select
              value={destination}
              onValueChange={(v) => set("destination", v as DestinationChoice)}
              disabled={disabled}
            >
              <SelectTrigger id={`${idPrefix}-destination`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {destinations.map((choice) => (
                  <SelectItem key={choice} value={choice}>
                    {choiceLabel[choice]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {destination === "host" && (
            <div className="space-y-2">
              <Label htmlFor={`${idPrefix}-destination-host`}>{t("form.hostAddress")} *</Label>
              <Input
                id={`${idPrefix}-destination-host`}
                value={form.destination_host}
                onChange={(e) => set("destination_host", e.target.value)}
                placeholder={t("form.example", { value: "10.0.0.1" })}
                disabled={disabled}
              />
            </div>
          )}

          {destination === "network" && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor={`${idPrefix}-destination-network`}>{t("form.networkAddress")} *</Label>
                <Input
                  id={`${idPrefix}-destination-network`}
                  value={form.destination_network}
                  onChange={(e) => set("destination_network", e.target.value)}
                  placeholder={t("form.example", { value: "10.0.0.0" })}
                  disabled={disabled}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor={`${idPrefix}-destination-mask`}>{t("form.inverseMask")} *</Label>
                <Input
                  id={`${idPrefix}-destination-mask`}
                  value={form.destination_inverse_mask}
                  onChange={(e) => set("destination_inverse_mask", e.target.value)}
                  placeholder={t("form.example", { value: "0.0.0.255" })}
                  disabled={disabled}
                />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
