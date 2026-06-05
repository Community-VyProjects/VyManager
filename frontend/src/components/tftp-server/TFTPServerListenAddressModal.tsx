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
import { tftpServerService, TFTPServerListenAddress } from "@/lib/api/tftp-server";

interface TFTPServerListenAddressModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  existing: TFTPServerListenAddress | null;
  existingAddresses: string[];
  onSuccess: () => void;
}

function isValidIP(value: string): boolean {
  const ipv4 = /^(\d{1,3}\.){3}\d{1,3}$/;
  const ipv6 = /^[0-9a-fA-F:]+$/;
  return ipv4.test(value) || ipv6.test(value);
}

export function TFTPServerListenAddressModal({
  open,
  onOpenChange,
  existing,
  existingAddresses,
  onSuccess,
}: TFTPServerListenAddressModalProps) {
  const isEdit = existing !== null;
  const [address, setAddress] = useState(existing?.address ?? "");
  const [vrf, setVrf] = useState(existing?.vrf ?? "");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    const addr = address.trim();
    if (!addr) {
      setError("An IP address is required");
      return;
    }
    if (!isValidIP(addr)) {
      setError("Enter a valid IPv4 or IPv6 address");
      return;
    }
    if (!isEdit && existingAddresses.includes(addr)) {
      setError(`Listen address "${addr}" already exists`);
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await tftpServerService.saveListenAddress(existing, { address: addr, vrf });
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
          <DialogTitle>{isEdit ? "Edit Listen Address" : "Add Listen Address"}</DialogTitle>
          <DialogDescription>
            Bind the TFTP server to a specific local IP address, optionally within a VRF
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-1">
          <div className="space-y-1.5">
            <Label htmlFor="tftp-listen-address">IP Address</Label>
            <Input
              id="tftp-listen-address"
              placeholder="e.g. 192.0.2.1 or 2001:db8::1"
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
            <Label htmlFor="tftp-listen-vrf">VRF</Label>
            <Input
              id="tftp-listen-vrf"
              placeholder="Optional VRF instance"
              value={vrf}
              onChange={(e) => setVrf(e.target.value)}
              className="font-mono"
            />
            <p className="text-xs text-muted-foreground">
              Leave empty to use the default routing table.
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
