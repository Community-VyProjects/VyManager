"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { NONE_SENTINEL } from "@/lib/named-list-select-options";

/** Select item for a typed MAC address. */
const CUSTOM = "custom";

interface Props {
  id: string;
  label: ReactNode;
  /** The attachment MAC: "" (default), a keyword from the capability list, or an address. */
  value: string;
  onChange: (mac: string) => void;
  /** `values.network_mac_keywords` from the capabilities. */
  keywords: string[];
  disabled?: boolean;
}

/**
 * Attachment MAC: default, a keyword the router takes (`auto` on 1.5), or a
 * typed address. Shared by the container modal and the app wizard. Key it on
 * the attached network so a new network starts in the default mode.
 */
export function AttachmentMacSelect({ id, label, value, onChange, keywords, disabled }: Props) {
  const t = useTranslations("containers");
  const [custom, setCustom] = useState(() => !!value && !keywords.includes(value));
  const mode = custom ? CUSTOM : value && keywords.includes(value) ? value : NONE_SENTINEL;

  return (
    <div className="grid grid-cols-2 gap-3">
      <div className="space-y-2">
        <Label htmlFor={id}>{label}</Label>
        <Select
          value={mode}
          disabled={disabled}
          onValueChange={(next) => {
            setCustom(next === CUSTOM);
            onChange(keywords.includes(next) ? next : "");
          }}
        >
          <SelectTrigger id={id}><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value={NONE_SENTINEL}>{t("modal.defaultOption")}</SelectItem>
            {keywords.map((keyword) => (
              <SelectItem key={keyword} value={keyword} className="font-mono">{keyword}</SelectItem>
            ))}
            <SelectItem value={CUSTOM}>{t("modal.macCustom")}</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {custom && (
        <div className="space-y-2">
          <Label htmlFor={`${id}-value`}>{t("modal.macCustom")}</Label>
          <Input
            id={`${id}-value`}
            value={value}
            disabled={disabled}
            onChange={(e) => onChange(e.target.value)}
            placeholder="02:00:00:00:00:01"
            className="font-mono"
          />
        </div>
      )}
    </div>
  );
}
