"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertCircle, Loader2 } from "lucide-react";
import { showService, InterfaceName } from "@/lib/api/show";
import { InterfaceSelect } from "@/components/ui/interface-select";
import type { ArpEntry } from "@/lib/api/static-routes";
import { lockedIdentity, modalIsEdit, modalWriteKind } from "@/lib/modal-mode";
import {
  arpDraftFrom,
  emptyArpDraft,
  submitArpCreate,
  submitArpUpdate,
  validateArpCreate,
  validateArpEdit,
  type ArpDraft,
} from "./static-routes-form";

export interface ArpExisting {
  interface: string;
  entry: ArpEntry;
}

interface ArpEntryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  existing?: ArpExisting | null;
}

export function ArpEntryModal({
  open,
  onOpenChange,
  onSuccess,
  existing,
}: ArpEntryModalProps) {
  const isEdit = modalIsEdit(existing);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [availableInterfaces, setAvailableInterfaces] = useState<InterfaceName[]>([]);
  const [draft, setDraft] = useState<ArpDraft>(emptyArpDraft());

  useEffect(() => {
    if (!open) return;
    showService.getAllInterfaces().then((res) => setAvailableInterfaces(res.interfaces)).catch((err) => {
      console.error("Failed to load interfaces:", err);
    });
    if (existing) {
      setDraft(arpDraftFrom(existing.interface, existing.entry));
    } else {
      setDraft(emptyArpDraft());
    }
    setError(null);
  }, [open, existing]);

  const patch = (fields: Partial<ArpDraft>) => setDraft((d) => ({ ...d, ...fields }));
  const lockedInterface = lockedIdentity(existing, (e) => e.interface, draft.interfaceName);
  const lockedIp = lockedIdentity(existing, (e) => e.entry.ip_address, draft.ipAddress);

  const handleSubmit = async () => {
    const validationError = isEdit ? validateArpEdit(draft) : validateArpCreate(draft);
    if (validationError) {
      setError(validationError);
      return;
    }

    const write = modalWriteKind(existing ? { name: existing.entry.ip_address } : null);
    setLoading(true);
    setError(null);

    try {
      const result =
        write.kind === "update" && existing
          ? await submitArpUpdate(
              { interfaceName: existing.interface, entry: existing.entry },
              draft,
            )
          : await submitArpCreate(draft);
      if (result && result.success === false) {
        setError(result.error || "Operation failed");
        return;
      }
      onSuccess();
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : isEdit ? "Failed to update ARP entry" : "Failed to create ARP entry");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit ARP Entry" : "Create Static ARP Entry"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? `Modify static ARP entry for ${existing.entry.ip_address} on ${existing.interface}`
              : "Add a static ARP entry to map an IP address to a MAC address"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {error && (
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-destructive flex-shrink-0 mt-0.5" />
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="interface">Interface</Label>
            {lockedInterface.disabled ? (
              <Input value={lockedInterface.value} disabled className="bg-muted" />
            ) : (
              <InterfaceSelect
                value={draft.interfaceName}
                onValueChange={(value) => patch({ interfaceName: value })}
                interfaces={availableInterfaces}
                placeholder="Select interface..."
              />
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="ip-address">IP Address</Label>
            <Input
              id="ip-address"
              placeholder="192.168.1.100"
              value={lockedIp.value}
              disabled={lockedIp.disabled}
              className={lockedIp.disabled ? "bg-muted" : undefined}
              onChange={(e) => patch({ ipAddress: e.target.value })}
            />
            {isEdit && (
              <p className="text-xs text-muted-foreground">
                IP address cannot be changed. Delete and recreate to change it.
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="mac-address">MAC Address</Label>
            <Input
              id="mac-address"
              placeholder="00:11:22:33:44:55"
              value={draft.macAddress}
              onChange={(e) => patch({ macAddress: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description (optional)</Label>
            <Input
              id="description"
              placeholder="Description for this ARP entry"
              value={draft.description}
              onChange={(e) => patch({ description: e.target.value })}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {isEdit ? "Update Entry" : "Create Entry"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
