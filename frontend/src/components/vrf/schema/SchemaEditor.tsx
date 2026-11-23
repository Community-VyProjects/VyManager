"use client";

import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { InterfaceSelect } from "@/components/ui/interface-select";
import { InterfaceMultiSelect } from "@/components/ui/interface-multi-select";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AlertTriangle, Loader2, X } from "lucide-react";
import {
  vrfService,
  VrfCapabilities,
} from "@/lib/api/vrf";
import {
  buildSchemaOps,
  initialSchemaValue,
  isSecretField,
  schemaFieldKey,
  schemaSecretProblem,
  type SchemaRaw,
  type SchemaValue,
} from "@/lib/api/vrf-schema-save-ops";
import type { ApiError } from "@/lib/types/api";
import { NONE_SENTINEL } from "@/lib/named-list-select-options";
import { FieldSpec, SectionSpec } from "./types";
import { useSchemaText } from "./useSchemaText";

interface SchemaEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  vrfName: string;
  sections: SectionSpec[];
  rawConfig: SchemaRaw;
  /** Extra path args inserted between the VRF name and the value (e.g. a neighbor). */
  contextArgs?: string[];
  capabilities: VrfCapabilities;
  canWrite: boolean;
  onSaved: () => void;
  /** Message scope for field labels: the protocol (e.g. "bgp") or an entity group scope. */
  scope?: string;
}

export function SchemaEditor({
  open,
  onOpenChange,
  title,
  vrfName,
  sections,
  rawConfig,
  contextArgs = [],
  capabilities,
  canWrite,
  onSaved,
  scope,
}: SchemaEditorProps) {
  const tc = useTranslations("common");
  const t = useTranslations("vrfProtocols");
  const st = useSchemaText();
  const visibleSections = useMemo(
    () =>
      sections
        .map((s) => ({
          ...s,
          fields: s.fields.filter((f) => {
            if (f.capability) {
              const feats = capabilities.features as
                | Record<string, { supported?: boolean } | undefined>
                | undefined;
              if (!Boolean(feats?.[f.capability]?.supported)) return false;
            }
            if (f.entityIds?.length) {
              const entityId = contextArgs[contextArgs.length - 1];
              if (!entityId || !f.entityIds.includes(entityId)) return false;
            }
            return true;
          }),
        }))
        .filter((s) => s.fields.length > 0),
    [sections, capabilities, contextArgs]
  );

  const initial = useMemo(() => {
    const v: Record<string, SchemaValue> = {};
    for (const s of visibleSections) {
      for (const f of s.fields) v[schemaFieldKey(f)] = initialSchemaValue(f, rawConfig);
    }
    return v;
  }, [visibleSections, rawConfig]);

  const [values, setValues] = useState<Record<string, SchemaValue>>(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Re-seed when the dialog (re)opens for a different VRF/raw config.
  const seedKey = `${vrfName}:${open}`;
  const [lastSeed, setLastSeed] = useState(seedKey);
  if (seedKey !== lastSeed) {
    setLastSeed(seedKey);
    setValues(initial);
    setError(null);
  }

  const prefix = [vrfName, ...contextArgs];
  const visibleFields = visibleSections.flatMap((s) => s.fields);

  const handleSave = async () => {
    const masked = schemaSecretProblem(visibleFields, initial, values);
    if (masked) {
      setError(t("schemaEditor.secretIsMask", { field: st.field(scope, masked) }));
      return;
    }
    const ops = buildSchemaOps(visibleFields, prefix, initial, values);
    if (ops.length === 0) {
      onOpenChange(false);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const result = await vrfService.batchConfigure(ops);
      if (!result.success) {
        setError(result.error || tc("operationFailed"));
        return;
      }
      onSaved();
      onOpenChange(false);
    } catch (err) {
      setError((err as ApiError).message || tc("operationFailed"));
    } finally {
      setSaving(false);
    }
  };

  // A close (Esc, overlay) mid-save would drop a failed save's error.
  const handleOpenChange = (next: boolean) => {
    if (!next && saving) return;
    onOpenChange(next);
  };

  const setField = (op: string, val: SchemaValue) =>
    setValues((prev) => ({ ...prev, [op]: val }));

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="space-y-6">
            {visibleSections.map((section) => (
              <div key={section.title} className="space-y-3">
                <div>
                  <h4 className="text-sm font-semibold">{st.section(section)}</h4>
                  {section.description && (
                    <p className="text-xs text-muted-foreground">{st.sectionDescription(section)}</p>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  {section.fields.map((field) => (
                    <FieldControl
                      key={schemaFieldKey(field)}
                      field={field}
                      scope={scope}
                      value={values[schemaFieldKey(field)]}
                      disabled={!canWrite || saving}
                      onChange={(v) => setField(schemaFieldKey(field), v)}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>

        {error && (
          <div className="flex items-start gap-2 rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
            <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
            <pre className="whitespace-pre-wrap break-words font-mono text-xs">{error}</pre>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            {tc("cancel")}
          </Button>
          <Button onClick={handleSave} disabled={!canWrite || saving}>
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {tc("saveChanges")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function FieldControl({
  field,
  scope,
  value,
  disabled,
  onChange,
}: {
  field: FieldSpec;
  scope?: string;
  value: SchemaValue;
  disabled: boolean;
  onChange: (v: SchemaValue) => void;
}) {
  const t = useTranslations("vrfProtocols");
  const st = useSchemaText();
  const label = st.field(scope, field);
  const help = st.fieldHelp(scope, field);

  if (field.type === "list" && field.interface) {
    return (
      <div className="space-y-1.5 col-span-2">
        <Label className="text-xs">{label}</Label>
        <InterfaceMultiSelect values={(value as string[]) || []} disabled={disabled} onChange={onChange} />
      </div>
    );
  }

  if (field.type === "list") {
    return <ListField field={field} label={label} value={(value as string[]) || []} disabled={disabled} onChange={onChange} />;
  }

  if (field.type === "text" && field.interface) {
    return (
      <div className="space-y-1.5">
        <Label className="text-xs">{label}</Label>
        <InterfaceSelect
          value={(value as string) || ""}
          disabled={disabled}
          onValueChange={onChange}
          noneOption={{ label: "—", value: "" }}
        />
        {help && <p className="text-[11px] text-muted-foreground">{help}</p>}
      </div>
    );
  }

  if (field.type === "toggle") {
    return (
      <label className="flex items-center justify-between gap-2 rounded-md border p-3 col-span-1">
        <span className="text-sm">{label}</span>
        <input
          type="checkbox"
          className="h-4 w-4"
          checked={Boolean(value)}
          disabled={disabled}
          onChange={(e) => onChange(e.target.checked)}
        />
      </label>
    );
  }

  if (field.type === "select") {
    const current = (value as string) || "";
    return (
      <div className="space-y-1.5">
        <Label className="text-xs">{label}</Label>
        <Select
          value={current || NONE_SENTINEL}
          disabled={disabled}
          onValueChange={(v) => onChange(v === NONE_SENTINEL ? "" : v)}
        >
          <SelectTrigger>
            <SelectValue placeholder={field.placeholder || t("schemaEditor.select")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NONE_SENTINEL}>—</SelectItem>
            {field.options?.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {st.option(o)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {help && <p className="text-[11px] text-muted-foreground">{help}</p>}
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      <Input
        type={isSecretField(field) ? "password" : field.type === "number" ? "number" : "text"}
        autoComplete={isSecretField(field) ? "new-password" : undefined}
        value={(value as string) || ""}
        placeholder={field.placeholder}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
      />
      {help && <p className="text-[11px] text-muted-foreground">{help}</p>}
    </div>
  );
}

function ListField({
  field,
  label,
  value,
  disabled,
  onChange,
}: {
  field: FieldSpec;
  label: string;
  value: string[];
  disabled: boolean;
  onChange: (v: string[]) => void;
}) {
  const t = useTranslations("vrfProtocols");
  const tc = useTranslations("common");
  const locale = useLocale();
  const [draft, setDraft] = useState("");
  const add = () => {
    const v = draft.trim();
    if (v && !value.includes(v)) onChange([...value, v]);
    setDraft("");
  };
  return (
    <div className="space-y-1.5 col-span-2">
      <Label className="text-xs">{label}</Label>
      <div className="flex flex-wrap gap-1.5">
        {value.map((v) => (
          <span key={v} className="inline-flex items-center gap-1 rounded-md border bg-muted/50 px-2 py-0.5 text-xs font-mono">
            {v}
            {!disabled && (
              <button type="button" className="text-muted-foreground hover:text-destructive" onClick={() => onChange(value.filter((x) => x !== v))}>
                <X className="h-3 w-3" />
              </button>
            )}
          </span>
        ))}
        {value.length === 0 && <span className="text-xs text-muted-foreground">{tc("none")}</span>}
      </div>
      <div className="flex gap-2">
        <Input
          className="h-8"
          value={draft}
          placeholder={
            field.placeholder ||
            t("schemaEditor.addListItem", {
              // Lower-casing only suits English labels.
              label: locale.startsWith("en") ? label.toLowerCase() : label,
            })
          }
          disabled={disabled}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
        />
        <Button type="button" size="sm" variant="outline" onClick={add} disabled={disabled || !draft.trim()}>
          {tc("add")}
        </Button>
      </div>
    </div>
  );
}
