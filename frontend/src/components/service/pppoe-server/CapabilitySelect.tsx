"use client";

import { useTranslations } from "next-intl";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { NONE_SENTINEL, fromNamedListValue, toNamedListValue } from "@/lib/named-list-select-options";

interface CapabilitySelectProps {
  id: string;
  /** Selected value; empty is the unset leaf. */
  value: string;
  /** Lab ``allowed:`` values from the capabilities. */
  values: string[];
  /** Translated labels for values that have one; others show the CLI value. */
  labels?: Record<string, string>;
  /** Label of the unset item (default: common.default). */
  noneLabel?: string;
  onChange: (value: string) => void;
}

/**
 * Pick of one capability value with an unset item. Choosing the unset item
 * reports "", which the save emits as the leaf delete.
 */
export function CapabilitySelect({ id, value, values, labels, noneLabel, onChange }: CapabilitySelectProps) {
  const tc = useTranslations("common");
  const none = noneLabel ?? tc("default");
  return (
    <Select value={toNamedListValue(value)} onValueChange={(next) => onChange(fromNamedListValue(next))}>
      <SelectTrigger id={id}><SelectValue placeholder={none} /></SelectTrigger>
      <SelectContent>
        <SelectItem value={NONE_SENTINEL}>{none}</SelectItem>
        {values.map((v) => <SelectItem key={v} value={v}>{labels?.[v] ?? v}</SelectItem>)}
      </SelectContent>
    </Select>
  );
}
