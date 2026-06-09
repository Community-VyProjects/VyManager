"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AlertCircle, Loader2, Plus, Trash2 } from "lucide-react";
import {
  qosService,
  QoSCapabilities,
  QoSPolicy,
  PolicyDraft,
  ClassDraft,
  policyToDraft,
  emptyClassDraft,
} from "@/lib/api/qos";
import { POLICY_TYPE_META, POLICY_TYPE_ORDER, PRECEDENCE_FIELDS } from "@/lib/qos-schema";
import { QoSFieldForm } from "./QoSFieldForm";
import { QoSClassEditor } from "./QoSClassEditor";

interface QoSPolicyModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  capabilities: QoSCapabilities;
  existing: QoSPolicy | null;
  existingNames: string[];
  availableMatchGroups: string[];
  onSuccess: () => void;
}

function freshDraft(type: string): PolicyDraft {
  return { type, name: "", values: {}, flags: [], classes: [], default: null, precedences: [] };
}

const FI_NONE = "__none__";

export function QoSPolicyModal({
  open,
  onOpenChange,
  capabilities,
  existing,
  existingNames,
  availableMatchGroups,
  onSuccess,
}: QoSPolicyModalProps) {
  const isEdit = existing !== null;
  const [draft, setDraft] = useState<PolicyDraft>(
    existing ? policyToDraft(existing) : freshDraft(POLICY_TYPE_ORDER[0])
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const meta = POLICY_TYPE_META[draft.type];
  const dscpNames = capabilities.features.enums.dscp_names;
  const flowIsoModes = capabilities.features.enums.flow_isolation_modes;
  const matchGroupSupported = capabilities.features.match_group.supported;

  const setValue = (key: string, value: string) => {
    setDraft((d) => {
      const values = { ...d.values };
      if (value === "") delete values[key];
      else values[key] = value;
      return { ...d, values };
    });
  };

  // Flow isolation (cake) ---------------------------------------------------
  // Mode is the leaf `flow-isolation/<mode>`; NAT is the sibling leaf
  // `flow-isolation-nat` (no slash, so it never matches the mode prefix).
  const currentMode = draft.flags.find((fl) => fl.startsWith("flow-isolation/"));
  const modeValue = currentMode ? currentMode.split("/")[1] : "";
  const natOn = draft.flags.includes("flow-isolation-nat");

  const setMode = (mode: string) => {
    setDraft((d) => {
      const flags = d.flags.filter((fl) => !fl.startsWith("flow-isolation/"));
      if (mode) flags.push(`flow-isolation/${mode}`);
      return { ...d, flags };
    });
  };
  const setNat = (on: boolean) => {
    setDraft((d) => {
      const flags = d.flags.filter((fl) => fl !== "flow-isolation-nat");
      if (on) flags.push("flow-isolation-nat");
      return { ...d, flags };
    });
  };

  const handleSubmit = async () => {
    const name = draft.name.trim();
    if (!name) {
      setError("A policy name is required");
      return;
    }
    if (!isEdit && existingNames.includes(name)) {
      setError(`A ${meta.label} policy named "${name}" already exists`);
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await qosService.savePolicy(isEdit, { ...draft, name });
      onSuccess();
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Operation failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? `Edit ${meta.label} Policy` : "Add Policy"}</DialogTitle>
          <DialogDescription>{meta.description}</DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[68vh] pr-4">
          <div className="space-y-5 py-1">
            {/* Type + name */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Type</Label>
                <Select
                  value={draft.type}
                  onValueChange={(t) => setDraft(freshDraft(t))}
                  disabled={isEdit}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {POLICY_TYPE_ORDER.map((t) => (
                      <SelectItem key={t} value={t}>{POLICY_TYPE_META[t].label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="qos-policy-name" className="text-sm font-medium">Name</Label>
                <Input
                  id="qos-policy-name"
                  placeholder="e.g. wan-shaper"
                  value={draft.name}
                  onChange={(e) => {
                    setDraft((d) => ({ ...d, name: e.target.value }));
                    setError(null);
                  }}
                  disabled={isEdit}
                  className={isEdit ? "font-mono bg-muted" : "font-mono"}
                />
              </div>
            </div>

            {/* Policy-level fields */}
            {meta.policyFields.length > 0 && (
              <>
                <Separator />
                <QoSFieldForm
                  fields={meta.policyFields}
                  values={draft.values}
                  onChange={setValue}
                  dscpNames={dscpNames}
                  idPrefix="qos-policy"
                />
              </>
            )}

            {/* Flow isolation (cake) */}
            {meta.flowIsolation && (
              <>
                <Separator />
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Flow Isolation</Label>
                  <Select value={modeValue === "" ? FI_NONE : modeValue} onValueChange={(v) => setMode(v === FI_NONE ? "" : v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Default" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={FI_NONE}>Default</SelectItem>
                      {flowIsoModes.map((m) => (
                        <SelectItem key={m} value={m}>{m}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="flex items-center gap-2 pt-1">
                    <Checkbox id="cake-nat" checked={natOn} onCheckedChange={(c) => setNat(!!c)} />
                    <Label htmlFor="cake-nat" className="text-xs cursor-pointer">
                      Perform NAT lookup before applying flow isolation
                    </Label>
                  </div>
                </div>
              </>
            )}

            {/* Precedence (random-detect) */}
            {meta.precedence && (
              <>
                <Separator />
                <PrecedenceSection draft={draft} setDraft={setDraft} dscpNames={dscpNames} />
              </>
            )}

            {/* Classes */}
            {meta.hasClasses && (
              <>
                <Separator />
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium">Classes</Label>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => setDraft((d) => ({ ...d, classes: [...d.classes, emptyClassDraft("")] }))}
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Add Class
                    </Button>
                  </div>
                  {draft.classes.map((cls, i) => (
                    <QoSClassEditor
                      key={i}
                      draft={cls}
                      fields={meta.classFields}
                      isDefault={false}
                      classIdHelp={meta.classIdHelp}
                      dscpNames={dscpNames}
                      matchGroupSupported={matchGroupSupported}
                      availableMatchGroups={availableMatchGroups}
                      idPrefix={`qos-class-${i}`}
                      onChange={(c: ClassDraft) =>
                        setDraft((d) => ({ ...d, classes: d.classes.map((x, idx) => (idx === i ? c : x)) }))
                      }
                      onRemove={() => setDraft((d) => ({ ...d, classes: d.classes.filter((_, idx) => idx !== i) }))}
                    />
                  ))}
                </div>
              </>
            )}

            {/* Default */}
            {meta.hasDefault && (
              <>
                <Separator />
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="qos-default-enabled"
                      checked={draft.default !== null}
                      onCheckedChange={(c) =>
                        setDraft((d) => ({ ...d, default: c ? emptyClassDraft("default") : null }))
                      }
                    />
                    <Label htmlFor="qos-default-enabled" className="text-sm font-medium cursor-pointer">
                      Configure default class
                    </Label>
                  </div>
                  {draft.default && (
                    <QoSClassEditor
                      draft={draft.default}
                      fields={meta.classFields}
                      isDefault
                      dscpNames={dscpNames}
                      matchGroupSupported={matchGroupSupported}
                      availableMatchGroups={availableMatchGroups}
                      idPrefix="qos-default"
                      onChange={(c: ClassDraft) => setDraft((d) => ({ ...d, default: c }))}
                    />
                  )}
                </div>
              </>
            )}
          </div>
        </ScrollArea>

        {error && (
          <div className="flex items-start gap-2 rounded-md border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
            <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
            <span className="whitespace-pre-wrap">{error}</span>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            {isEdit ? "Save" : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// --------------------------------------------------------------- precedence

function PrecedenceSection({
  draft,
  setDraft,
  dscpNames,
}: {
  draft: PolicyDraft;
  setDraft: React.Dispatch<React.SetStateAction<PolicyDraft>>;
  dscpNames: string[];
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">IP Precedence</Label>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => setDraft((d) => ({ ...d, precedences: [...d.precedences, { precedence: "", values: {} }] }))}
        >
          <Plus className="h-4 w-4 mr-1" />
          Add Precedence
        </Button>
      </div>
      {draft.precedences.map((pr, i) => (
        <div key={i} className="space-y-3 rounded-md border border-border p-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex-1 space-y-1">
              <Label htmlFor={`qos-prec-${i}`} className="text-xs font-medium">Precedence (0-7)</Label>
              <Input
                id={`qos-prec-${i}`}
                type="number"
                min={0}
                max={7}
                value={pr.precedence}
                onChange={(e) =>
                  setDraft((d) => ({
                    ...d,
                    precedences: d.precedences.map((x, idx) => (idx === i ? { ...x, precedence: e.target.value } : x)),
                  }))
                }
                className="font-mono max-w-[120px]"
              />
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-9 w-9 text-destructive hover:text-destructive"
              onClick={() => setDraft((d) => ({ ...d, precedences: d.precedences.filter((_, idx) => idx !== i) }))}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
          <QoSFieldForm
            fields={PRECEDENCE_FIELDS}
            values={pr.values}
            dscpNames={dscpNames}
            idPrefix={`qos-prec-${i}`}
            onChange={(key, value) =>
              setDraft((d) => ({
                ...d,
                precedences: d.precedences.map((x, idx) => {
                  if (idx !== i) return x;
                  const values = { ...x.values };
                  if (value === "") delete values[key];
                  else values[key] = value;
                  return { ...x, values };
                }),
              }))
            }
          />
        </div>
      ))}
    </div>
  );
}
