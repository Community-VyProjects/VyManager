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
import { snmpService, SNMPTrapTarget } from "@/lib/api/snmp";
import { isValidIP } from "./SNMPMultiValueField";

interface SNMPTrapTargetModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  existing: SNMPTrapTarget | null;
  existingAddresses: string[];
  defaultPort: string;
  onSuccess: () => void;
}

export function SNMPTrapTargetModal({
  open,
  onOpenChange,
  existing,
  existingAddresses,
  defaultPort,
  onSuccess,
}: SNMPTrapTargetModalProps) {
  const isEdit = existing !== null;
  const [address, setAddress] = useState(existing?.address ?? "");
  const [community, setCommunity] = useState(existing?.community ?? "");
  const [port, setPort] = useState(existing?.port ?? "");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    const addr = address.trim();
    if (!addr) {
      setError("A target IP address is required");
      return;
    }
    if (!isValidIP(addr)) {
      setError("Enter a valid IPv4 or IPv6 address");
      return;
    }
    if (!isEdit && existingAddresses.includes(addr)) {
      setError(`Trap target "${addr}" already exists`);
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await snmpService.saveTrapTarget(existing, { address: addr, community, port });
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
          <DialogTitle>{isEdit ? "Edit Trap Target" : "Add Trap Target"}</DialogTitle>
          <DialogDescription>
            SNMPv1/v2c destination for outgoing trap notifications
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-1">
          <div className="space-y-1.5">
            <Label htmlFor="trap-address">Target Address</Label>
            <Input
              id="trap-address"
              placeholder="e.g. 192.0.2.50"
              value={address}
              onChange={(e) => {
                setAddress(e.target.value);
                setError(null);
              }}
              disabled={isEdit}
              className={isEdit ? "font-mono bg-muted" : "font-mono"}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="trap-community">Community</Label>
            <Input
              id="trap-community"
              placeholder="Community string sent with traps"
              value={community}
              onChange={(e) => setCommunity(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="trap-port">Port</Label>
            <Input
              id="trap-port"
              type="number"
              min={1}
              max={65535}
              placeholder={`Default (${defaultPort})`}
              value={port}
              onChange={(e) => setPort(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Leave empty to use the default trap port ({defaultPort}).
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
