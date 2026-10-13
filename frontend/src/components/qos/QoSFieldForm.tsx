"use client";

import { useTranslations } from "next-intl";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FieldDef } from "@/lib/qos-schema";

interface QoSFieldFormProps {
  fields: FieldDef[];
  values: Record<string, string>;
  onChange: (key: string, value: string) => void;
  dscpNames: string[];
  idPrefix: string;
}

const SELECT_NONE = "__none__";

/**
 * Translates an English display string from lib/qos-schema.ts (labels, help,
 * placeholders, policy type names) at render time. The lookup key is the text
 * reduced to [A-Za-z0-9_] under `qos.schema`; unknown strings fall back to the
 * original English.
 */
export function useQoSSchemaText() {
  const t = useTranslations("qos");
  return (text: string): string => {
    const key = `schema.${text.replace(/[^A-Za-z0-9]+/g, "_").replace(/^_+|_+$/g, "")}` as never;
    return t.has(key) ? t(key) : text;
  };
}

/** Renders a schema-driven grid of QoS fields bound to a string map. */
export function QoSFieldForm({ fields, values, onChange, dscpNames, idPrefix }: QoSFieldFormProps) {
  const t = useTranslations("qos");
  const tc = useTranslations("common");
  const st = useQoSSchemaText();
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3">
      {fields.map((field) => {
        const id = `${idPrefix}-${field.key}`;
        const value = values[field.key] ?? "";
        return (
          <div key={field.key} className="space-y-1">
            <Label htmlFor={id} className="text-xs font-medium">{st(field.label)}</Label>
            {field.kind === "select" ? (
              <Select
                value={value === "" ? SELECT_NONE : value}
                onValueChange={(v) => onChange(field.key, v === SELECT_NONE ? "" : v)}
              >
                <SelectTrigger id={id}>
                  <SelectValue placeholder={tc("default")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={SELECT_NONE}>{tc("default")}</SelectItem>
                  {(field.options ?? []).map((opt) => (
                    <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <>
                <Input
                  id={id}
                  type={field.kind === "number" ? "number" : "text"}
                  list={field.kind === "dscp" ? `${idPrefix}-dscp-list` : undefined}
                  placeholder={field.placeholder !== undefined ? st(field.placeholder) : (field.kind === "dscp" ? t("fieldForm.dscpPlaceholder") : "")}
                  value={value}
                  onChange={(e) => onChange(field.key, e.target.value)}
                  className={field.kind === "bandwidth" || field.kind === "dscp" ? "font-mono" : ""}
                />
                {field.kind === "dscp" && (
                  <datalist id={`${idPrefix}-dscp-list`}>
                    {dscpNames.map((n) => (
                      <option key={n} value={n} />
                    ))}
                  </datalist>
                )}
              </>
            )}
            {field.help && <p className="text-[11px] text-muted-foreground leading-tight">{st(field.help)}</p>}
          </div>
        );
      })}
    </div>
  );
}
