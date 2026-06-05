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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AlertCircle, Loader2 } from "lucide-react";
import { snmpService, SNMPv3Group, SNMPCapabilities } from "@/lib/api/snmp";

interface SNMPv3GroupModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  existing: SNMPv3Group | null;
  existingNames: string[];
  viewNames: string[];
  capabilities: SNMPCapabilities;
  onSuccess: () => void;
}

const DEFAULT = "__default__";

const SECLEVEL_LABELS: Record<string, string> = {
  noauth: "No Auth, No Privacy (noAuthNoPriv)",
  auth: "Auth, No Privacy (authNoPriv)",
  priv: "Auth + Privacy (authPriv)",
};

export function SNMPv3GroupModal({
  open,
  onOpenChange,
  existing,
  existingNames,
  viewNames,
  capabilities,
  onSuccess,
}: SNMPv3GroupModalProps) {
  const isEdit = existing !== null;
  const v3 = capabilities.features.v3;

  const [name, setName] = useState(existing?.name ?? "");
  const [mode, setMode] = useState(existing?.mode ?? DEFAULT);
  const [seclevel, setSeclevel] = useState(existing?.seclevel ?? DEFAULT);
  const [view, setView] = useState(existing?.view ?? "");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    const n = name.trim();
    if (!n) {
      setError("A group name is required");
      return;
    }
    if (!isEdit && existingNames.includes(n)) {
      setError(`Group "${n}" already exists`);
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await snmpService.saveV3Group(existing, {
        name: n,
        mode: mode === DEFAULT ? "" : mode,
        seclevel: seclevel === DEFAULT ? "" : seclevel,
        view: view.trim(),
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
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Group" : "Add Group"}</DialogTitle>
          <DialogDescription>
            An SNMPv3 group binds a security level and access mode to a view
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-1">
          <div className="space-y-1.5">
            <Label htmlFor="group-name">Group Name</Label>
            <Input
              id="group-name"
              placeholder="e.g. readers"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setError(null);
              }}
              disabled={isEdit}
              className={isEdit ? "font-mono bg-muted" : "font-mono"}
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-sm font-medium">Access Mode</Label>
            <Select value={mode} onValueChange={setMode}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={DEFAULT}>Default (Read-Only)</SelectItem>
                {v3.mode_values.map((m) => (
                  <SelectItem key={m} value={m}>
                    {m === "ro" ? "Read-Only (ro)" : "Read-Write (rw)"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-sm font-medium">Security Level</Label>
            <Select value={seclevel} onValueChange={setSeclevel}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={DEFAULT}>Default (Auth, No Privacy)</SelectItem>
                {v3.seclevel_values.map((s) => (
                  <SelectItem key={s} value={s}>
                    {SECLEVEL_LABELS[s] ?? s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-sm font-medium">View</Label>
            {viewNames.length > 0 ? (
              <Select
                value={view === "" ? DEFAULT : view}
                onValueChange={(v) => setView(v === DEFAULT ? "" : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a view" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={DEFAULT}>None</SelectItem>
                  {viewNames.map((vn) => (
                    <SelectItem key={vn} value={vn}>
                      {vn}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Input
                placeholder="View name"
                value={view}
                onChange={(e) => setView(e.target.value)}
                className="font-mono"
              />
            )}
            <p className="text-xs text-muted-foreground">
              The view that defines which OIDs this group can access.
            </p>
          </div>
        </div>

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
