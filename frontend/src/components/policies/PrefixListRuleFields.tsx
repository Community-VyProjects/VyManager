"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useTranslations } from "next-intl";
import type { PrefixListCapabilitiesResponse, PrefixListType } from "@/lib/api/prefix-list";
import {
  descriptionMaxLength,
  lengthRange,
  ruleActions,
  type PrefixListRuleForm,
} from "@/lib/api/prefix-list-save-ops";
import { prefixLength } from "./prefix-list-rule-form";

interface PrefixListRuleFieldsProps {
  idPrefix: string;
  listType: PrefixListType;
  form: PrefixListRuleForm;
  onChange: (form: PrefixListRuleForm) => void;
  /** Locked on edit: the rule number is the rule's identity. */
  ruleNumberLocked: boolean;
  disabled: boolean;
  capabilities: PrefixListCapabilitiesResponse | null;
}

/** Every leaf of a prefix-list rule: number, action, description, prefix, ge, le. */
export function PrefixListRuleFields({
  idPrefix,
  listType,
  form,
  onChange,
  ruleNumberLocked,
  disabled,
  capabilities,
}: PrefixListRuleFieldsProps) {
  const t = useTranslations("prefixList");
  const set = (key: keyof PrefixListRuleForm, value: string) => onChange({ ...form, [key]: value });
  const range = lengthRange(capabilities, listType);
  const minLength = prefixLength(form.prefix) ?? range?.min;
  const actionLabel = (action: string) =>
    action === "permit" ? t("form.permit") : action === "deny" ? t("form.deny") : action;

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
          maxLength={descriptionMaxLength(capabilities)}
          onChange={(e) => set("description", e.target.value)}
          placeholder={t("form.ruleDescriptionPlaceholder")}
          disabled={disabled}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}-prefix`}>{t("form.prefixCidr")} *</Label>
        <Input
          id={`${idPrefix}-prefix`}
          value={form.prefix}
          onChange={(e) => set("prefix", e.target.value)}
          placeholder={t("form.example", { value: listType === "ipv4" ? "192.168.1.0/24" : "2001:db8::/32" })}
          disabled={disabled}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor={`${idPrefix}-ge`}>{t("form.geLabel")}</Label>
          <Input
            id={`${idPrefix}-ge`}
            type="number"
            inputMode="numeric"
            value={form.ge}
            onChange={(e) => set("ge", e.target.value)}
            disabled={disabled}
            min={minLength}
            max={range?.max}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor={`${idPrefix}-le`}>{t("form.leLabel")}</Label>
          <Input
            id={`${idPrefix}-le`}
            type="number"
            inputMode="numeric"
            value={form.le}
            onChange={(e) => set("le", e.target.value)}
            disabled={disabled}
            min={minLength}
            max={range?.max}
          />
        </div>
      </div>
    </div>
  );
}
