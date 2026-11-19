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
}

/**
 * Shared picker for an existing named object (access list, prefix list, or
 * route map). Empty value selects none. A configured name that is missing
 * from `names` stays in the list so editing does not hide it.
 */
export function NamedListSelect({
  id,
  value,
  names,
  onValueChange,
  disabled = false,
}: NamedListSelectProps) {
  const tc = useTranslations("common");
  if (disabled) {
    return (
      <Input
        id={id}
        value={value}
        disabled
        placeholder={tc("none")}
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
        <SelectValue placeholder={tc("none")} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={NONE_SENTINEL}>{tc("none")}</SelectItem>
        {listedNames(names, value).map((name) => (
          <SelectItem key={name} value={name} className="font-mono">
            {name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
