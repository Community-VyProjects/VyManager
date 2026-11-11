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

export function withCurrent(names: string[], current: string): string[] {
  if (current && !names.includes(current)) return [current, ...names];
  return names;
}

interface BabelListSelectProps {
  id?: string;
  value: string;
  names: string[];
  onChange: (next: string) => void;
  disabled?: boolean;
}

export function BabelListSelect({
  id,
  value,
  names,
  onChange,
  disabled = false,
}: BabelListSelectProps) {
  const tc = useTranslations("common");
  if (disabled) {
    return <Input id={id} value={value} disabled placeholder={tc("none")} className="font-mono" />;
  }
  return (
    <Select value={value || "none"} onValueChange={(next) => onChange(next === "none" ? "" : next)}>
      <SelectTrigger id={id}>
        <SelectValue placeholder={tc("none")} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="none">{tc("none")}</SelectItem>
        {withCurrent(names, value).map((name) => (
          <SelectItem key={name} value={name} className="font-mono">{name}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
