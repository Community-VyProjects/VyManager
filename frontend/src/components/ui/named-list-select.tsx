"use client";

import { useTranslations } from "next-intl";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  fromNamedListValue,
  listedNames,
  NONE_SENTINEL,
  toNamedListValue,
} from "@/lib/named-list-select-options";

export interface NamedListSelectProps {
  id?: string;
  /** Selected name. An empty string means none. */
  value: string;
  names: string[];
  /** Called with the selected name, or "" when none is chosen. */
  onValueChange: (value: string) => void;
  disabled?: boolean;
  /** Label of the empty item (default: common.none). */
  noneLabel?: string;
  /** Display labels by name; a name without one shows itself. */
  labels?: Record<string, string>;
}

/**
 * Shared picker for an existing named object (access list, prefix list, or
 * route map) or a capability value list. Empty value selects none. A
 * configured name that is missing from `names` stays in the list so editing
 * does not hide it.
 */
export function NamedListSelect({
  id,
  value,
  names,
  onValueChange,
  disabled = false,
  noneLabel,
  labels,
}: NamedListSelectProps) {
  const tc = useTranslations("common");
  const none = noneLabel ?? tc("none");
  if (disabled) {
    return (
      <Input
        id={id}
        value={labels?.[value] ?? value}
        disabled
        placeholder={none}
        className="font-mono"
      />
    );
  }
  return (
    <Select
      value={toNamedListValue(value)}
      onValueChange={(next) => onValueChange(fromNamedListValue(next))}
    >
      <SelectTrigger id={id}>
        <SelectValue placeholder={none} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={NONE_SENTINEL}>{none}</SelectItem>
        {listedNames(names, value).map((name) => (
          <SelectItem key={name} value={name} className="font-mono">
            {labels?.[name] ?? name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
