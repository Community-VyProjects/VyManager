"use client";

import { useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  VrfBatchOperation,
  VrfCapabilities,
} from "@/lib/api/vrf";
import { FieldSpec, SectionSpec } from "./types";

type RawConfig = Record<string, unknown> | null | undefined;

interface SchemaEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  vrfName: string;
  sections: SectionSpec[];
  rawConfig: RawConfig;
  /** Extra path args inserted between the VRF name and the value (e.g. a neighbor). */
  contextArgs?: string[];
  capabilities: VrfCapabilities;
  canWrite: boolean;
  onSaved: () => void;
}

const NONE = "__none__";

// Unique state key per field: fields can share an `op` but differ by `args`
// (e.g. level-1 vs level-2 metric, or per-option generic setters).
function fieldKey(f: FieldSpec): string {
  return f.args && f.args.length ? `${f.op}::${f.args.join(",")}` : f.op;
}

function readPath(raw: RawConfig, path: string[]): unknown {
  let cur: unknown = raw;
  for (const key of path) {
    if (cur && typeof cur === "object" && key in (cur as Record<string, unknown>)) {
      cur = (cur as Record<string, unknown>)[key];
    } else {
      return undefined;
    }
  }
  return cur;
}

type FieldValue = string | boolean | string[];

function initialValue(field: FieldSpec, raw: RawConfig): FieldValue {
  const node = readPath(raw, field.path);
  if (field.type === "toggle") {
    return node !== undefined;
  }
  if (field.type === "list") {
    if (Array.isArray(node)) return node.map(String);
    if (typeof node === "string" || typeof node === "number") return [String(node)];
    return [];
  }
  if (typeof node === "string") return node;
  if (typeof node === "number") return String(node);
  return "";
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
}: SchemaEditorProps) {
  const visibleSections = useMemo(
    () =>
      sections
        .map((s) => ({
          ...s,
          fields: s.fields.filter((f) => {
            if (!f.capability) return true;
            const feats = capabilities.features as
              | Record<string, { supported?: boolean } | undefined>
              | undefined;
            return Boolean(feats?.[f.capability]?.supported);
          }),
        }))
        .filter((s) => s.fields.length > 0),
    [sections, capabilities]
  );

  const initial = useMemo(() => {
    const v: Record<string, FieldValue> = {};
    for (const s of visibleSections) {
      for (const f of s.fields) v[fieldKey(f)] = initialValue(f, rawConfig);
    }
    return v;
  }, [visibleSections, rawConfig]);

  const [values, setValues] = useState<Record<string, FieldValue>>(initial);
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

  const buildOps = (): VrfBatchOperation[] => {
    const ops: VrfBatchOperation[] = [];
    for (const s of visibleSections) {
      for (const f of s.fields) {
        const cur = values[fieldKey(f)];
        const orig = initial[fieldKey(f)];
        if (cur === orig) continue;
        const delOp = f.delOp || f.op;
        const argv = [...prefix, ...(f.args ?? [])];
        if (f.type === "toggle") {
          ops.push(
            cur
              ? { op: `set_${f.op}`, value: argv.join(",") }
              : { op: `delete_${delOp}`, value: argv.join(",") }
          );
        } else if (f.type === "list") {
          const list = (cur as string[]).map((v) => v.trim()).filter(Boolean);
          const origList = (orig as string[]) ?? [];
          if (f.listClearAll) {
            // Delete clears the whole leaf → clear then re-add.
            ops.push({ op: `delete_${delOp}`, value: argv.join(",") });
            for (const v of list) {
              ops.push({ op: `set_${f.op}`, value: [...argv, v].join(",") });
            }
          } else {
            // Per-value add/remove.
            for (const v of list) {
              if (!origList.includes(v)) ops.push({ op: `set_${f.op}`, value: [...argv, v].join(",") });
            }
            for (const v of origList) {
              if (!list.includes(v)) ops.push({ op: `delete_${delOp}`, value: [...argv, v].join(",") });
            }
          }
        } else {
          const str = String(cur ?? "").trim();
          if (str) {
            ops.push({ op: `set_${f.op}`, value: [...argv, str].join(",") });
          } else {
            ops.push({ op: `delete_${delOp}`, value: argv.join(",") });
          }
        }
      }
    }
    return ops;
  };

  const handleSave = async () => {
    const ops = buildOps();
    if (ops.length === 0) {
      onOpenChange(false);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const result = await vrfService.batchConfigure(ops);
      if (!result.success) {
        setError(result.error || "Operation failed");
        return;
      }
      onSaved();
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Operation failed");
    } finally {
      setSaving(false);
    }
  };

  const setField = (op: string, val: FieldValue) =>
    setValues((prev) => ({ ...prev, [op]: val }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="space-y-6">
            {visibleSections.map((section) => (
              <div key={section.title} className="space-y-3">
                <div>
                  <h4 className="text-sm font-semibold">{section.title}</h4>
                  {section.description && (
                    <p className="text-xs text-muted-foreground">{section.description}</p>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  {section.fields.map((field) => (
                    <FieldControl
                      key={fieldKey(field)}
                      field={field}
                      value={values[fieldKey(field)]}
                      disabled={!canWrite || saving}
                      onChange={(v) => setField(fieldKey(field), v)}
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
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!canWrite || saving}>
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function FieldControl({
  field,
  value,
  disabled,
  onChange,
}: {
  field: FieldSpec;
  value: FieldValue;
  disabled: boolean;
  onChange: (v: FieldValue) => void;
}) {
  if (field.type === "list") {
    return <ListField field={field} value={(value as string[]) || []} disabled={disabled} onChange={onChange} />;
  }

  if (field.type === "toggle") {
    return (
      <label className="flex items-center justify-between gap-2 rounded-md border p-3 col-span-1">
        <span className="text-sm">{field.label}</span>
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
        <Label className="text-xs">{field.label}</Label>
        <Select
          value={current || NONE}
          disabled={disabled}
          onValueChange={(v) => onChange(v === NONE ? "" : v)}
        >
          <SelectTrigger>
            <SelectValue placeholder={field.placeholder || "Select…"} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NONE}>—</SelectItem>
            {field.options?.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {field.help && <p className="text-[11px] text-muted-foreground">{field.help}</p>}
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{field.label}</Label>
      <Input
        type={field.type === "number" ? "number" : "text"}
        value={(value as string) || ""}
        placeholder={field.placeholder}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
      />
      {field.help && <p className="text-[11px] text-muted-foreground">{field.help}</p>}
    </div>
  );
}

function ListField({
  field,
  value,
  disabled,
  onChange,
}: {
  field: FieldSpec;
  value: string[];
  disabled: boolean;
  onChange: (v: string[]) => void;
}) {
  const [draft, setDraft] = useState("");
  const add = () => {
    const v = draft.trim();
    if (v && !value.includes(v)) onChange([...value, v]);
    setDraft("");
  };
  return (
    <div className="space-y-1.5 col-span-2">
      <Label className="text-xs">{field.label}</Label>
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
        {value.length === 0 && <span className="text-xs text-muted-foreground">None</span>}
      </div>
      <div className="flex gap-2">
        <Input
          className="h-8"
          value={draft}
          placeholder={field.placeholder || `Add ${field.label.toLowerCase()}…`}
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
          Add
        </Button>
      </div>
    </div>
  );
}
