"use client";

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

/** Renders a schema-driven grid of QoS fields bound to a string map. */
export function QoSFieldForm({ fields, values, onChange, dscpNames, idPrefix }: QoSFieldFormProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3">
      {fields.map((field) => {
        const id = `${idPrefix}-${field.key}`;
        const value = values[field.key] ?? "";
        return (
          <div key={field.key} className="space-y-1">
            <Label htmlFor={id} className="text-xs font-medium">{field.label}</Label>
            {field.kind === "select" ? (
              <Select
                value={value === "" ? SELECT_NONE : value}
                onValueChange={(v) => onChange(field.key, v === SELECT_NONE ? "" : v)}
              >
                <SelectTrigger id={id}>
                  <SelectValue placeholder="Default" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={SELECT_NONE}>Default</SelectItem>
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
                  placeholder={field.placeholder ?? (field.kind === "dscp" ? "name or 0-63" : "")}
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
            {field.help && <p className="text-[11px] text-muted-foreground leading-tight">{field.help}</p>}
          </div>
        );
      })}
    </div>
  );
}
