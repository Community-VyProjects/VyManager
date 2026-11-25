"use client";

import { useTranslations } from "next-intl";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { StoredValue } from "@/lib/api/pki-save-ops";

interface PKIStoredValueFieldProps {
  id: string;
  label: string;
  value: StoredValue;
  onChange: (value: StoredValue) => void;
  /** The item already holds this value on the router. */
  stored: boolean;
  rows?: number;
}

/**
 * Edit-mode field for a value the config response does not show (certificate,
 * key, DH parameters, shared secret): empty keeps it, typed text replaces it,
 * and the remove box deletes the stored value.
 */
export function PKIStoredValueField({ id, label, value, onChange, stored, rows = 4 }: PKIStoredValueFieldProps) {
  const t = useTranslations("pki");
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Textarea
        id={id}
        value={value.text}
        onChange={(e) => onChange({ ...value, text: e.target.value })}
        placeholder={t("shared.leaveEmpty")}
        className="font-mono text-xs"
        rows={rows}
        disabled={value.remove}
        autoComplete="off"
      />
      {stored && (
        <div className="flex items-center space-x-2">
          <Checkbox
            id={`${id}-remove`}
            checked={value.remove}
            onCheckedChange={(v) => onChange({ text: "", remove: !!v })}
          />
          <Label htmlFor={`${id}-remove`}>{t("shared.removeStoredValue")}</Label>
        </div>
      )}
    </div>
  );
}
