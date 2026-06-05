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
import { AlertCircle, Loader2 } from "lucide-react";
import { snmpService, SNMPScriptExtension } from "@/lib/api/snmp";

interface SNMPScriptExtensionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  existing: SNMPScriptExtension | null;
  existingNames: string[];
  onSuccess: () => void;
}

export function SNMPScriptExtensionModal({
  open,
  onOpenChange,
  existing,
  existingNames,
  onSuccess,
}: SNMPScriptExtensionModalProps) {
  const isEdit = existing !== null;
  const [name, setName] = useState(existing?.name ?? "");
  const [script, setScript] = useState(existing?.script ?? "");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    const n = name.trim();
    if (!n) {
      setError("An extension name is required");
      return;
    }
    if (!isEdit && existingNames.includes(n)) {
      setError(`Extension "${n}" already exists`);
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await snmpService.saveScriptExtension(existing, { name: n, script });
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
          <DialogTitle>
            {isEdit ? "Edit Script Extension" : "Add Script Extension"}
          </DialogTitle>
          <DialogDescription>
            Extend the SNMP agent with a custom script
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-1">
          <div className="space-y-1.5">
            <Label htmlFor="ext-name">Extension Name</Label>
            <Input
              id="ext-name"
              placeholder="e.g. my-extension"
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
            <Label htmlFor="ext-script">Script</Label>
            <Input
              id="ext-script"
              placeholder="e.g. my-script.sh"
              value={script}
              onChange={(e) => setScript(e.target.value)}
              className="font-mono"
            />
            <p className="text-xs text-muted-foreground">
              Script name/path located under <span className="font-mono">/config/user-data</span>.
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
