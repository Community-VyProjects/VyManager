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
import { ScrollArea } from "@/components/ui/scroll-area";
import { AlertCircle, Loader2, Plus, Trash2 } from "lucide-react";
import { snmpService, SNMPv3View, SNMPv3ViewOid } from "@/lib/api/snmp";
import { SNMPMultiValueField } from "./SNMPMultiValueField";

interface SNMPv3ViewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  existing: SNMPv3View | null;
  existingNames: string[];
  onSuccess: () => void;
}

interface EditableOid {
  oid: string;
  mask: string;
  exclude: string[];
}

function toEditable(oids: SNMPv3ViewOid[]): EditableOid[] {
  return oids.map((o) => ({ oid: o.oid, mask: o.mask ?? "", exclude: o.exclude }));
}

export function SNMPv3ViewModal({
  open,
  onOpenChange,
  existing,
  existingNames,
  onSuccess,
}: SNMPv3ViewModalProps) {
  const isEdit = existing !== null;
  const [name, setName] = useState(existing?.name ?? "");
  const [oids, setOids] = useState<EditableOid[]>(
    existing ? toEditable(existing.oids) : []
  );

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateOid = (index: number, patch: Partial<EditableOid>) => {
    setOids((prev) => prev.map((o, i) => (i === index ? { ...o, ...patch } : o)));
  };

  const handleSubmit = async () => {
    const n = name.trim();
    if (!n) {
      setError("A view name is required");
      return;
    }
    if (!isEdit && existingNames.includes(n)) {
      setError(`View "${n}" already exists`);
      return;
    }
    const cleaned = oids
      .map((o) => ({ ...o, oid: o.oid.trim() }))
      .filter((o) => o.oid !== "");
    const keys = cleaned.map((o) => o.oid);
    if (new Set(keys).size !== keys.length) {
      setError("Duplicate OID entries are not allowed");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await snmpService.saveV3View(existing, {
        name: n,
        oids: cleaned.map((o) => ({
          oid: o.oid,
          mask: o.mask.trim() || null,
          exclude: o.exclude,
        })),
      });
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
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit View" : "Add View"}</DialogTitle>
          <DialogDescription>
            An SNMPv3 view selects the OID subtrees a group may access
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[65vh] pr-4">
          <div className="space-y-5 py-1">
            <div className="space-y-1.5">
              <Label htmlFor="view-name">View Name</Label>
              <Input
                id="view-name"
                placeholder="e.g. default"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  setError(null);
                }}
                disabled={isEdit}
                className={isEdit ? "font-mono bg-muted" : "font-mono"}
              />
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">OID Subtrees</Label>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    setOids((prev) => [...prev, { oid: "", mask: "", exclude: [] }])
                  }
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add OID
                </Button>
              </div>

              {oids.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No OID subtrees yet. Add at least one for this view to be useful.
                </p>
              ) : (
                oids.map((oid, index) => (
                  <div
                    key={index}
                    className="space-y-3 rounded-md border border-border p-3"
                  >
                    <div className="flex items-end gap-2">
                      <div className="flex-1 space-y-1.5">
                        <Label className="text-xs font-medium">OID</Label>
                        <Input
                          placeholder="e.g. 1.3.6.1.2.1"
                          value={oid.oid}
                          onChange={(e) => updateOid(index, { oid: e.target.value })}
                          className="font-mono"
                        />
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 text-destructive hover:text-destructive"
                        onClick={() =>
                          setOids((prev) => prev.filter((_, i) => i !== index))
                        }
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium">Mask</Label>
                      <Input
                        placeholder="Optional, e.g. ff.a0 or ff:a0"
                        value={oid.mask}
                        onChange={(e) => updateOid(index, { mask: e.target.value })}
                        className="font-mono"
                      />
                    </div>

                    <SNMPMultiValueField
                      label="Excluded OIDs"
                      description="Subtree OIDs to exclude from this entry"
                      placeholder="e.g. 1.3.6.1.2.1.2"
                      values={oid.exclude}
                      onChange={(vals) => updateOid(index, { exclude: vals })}
                    />
                  </div>
                ))
              )}
            </div>
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
            {isEdit ? "Save" : "Add"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
