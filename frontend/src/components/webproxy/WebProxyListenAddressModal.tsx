"use client";

import { useState, useEffect } from "react";
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
import { AlertCircle, Loader2 } from "lucide-react";
import type { ListenAddress } from "@/lib/api/webproxy";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  listenAddress: ListenAddress | null;
  onSubmit: (addr: ListenAddress, isEdit: boolean) => Promise<void>;
}

const numOrNull = (s: string): number | null => {
  if (s.trim() === "") return null;
  const n = parseInt(s, 10);
  return Number.isNaN(n) ? null : n;
};

export function WebProxyListenAddressModal({ open, onOpenChange, listenAddress, onSubmit }: Props) {
  const isEdit = !!listenAddress;
  const [address, setAddress] = useState("");
  const [port, setPort] = useState("");
  const [disableTransparent, setDisableTransparent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setAddress(listenAddress?.address ?? "");
      setPort(listenAddress?.port != null ? String(listenAddress.port) : "");
      setDisableTransparent(listenAddress?.disable_transparent ?? false);
      setError(null);
    }
  }, [open, listenAddress]);

  const handleSubmit = async () => {
    if (!address.trim()) {
      setError("Listen address is required");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await onSubmit({
        address: address.trim(),
        port: numOrNull(port),
        disable_transparent: disableTransparent,
      }, isEdit);
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Operation failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Listen Address" : "Add Listen Address"}</DialogTitle>
          <DialogDescription>Bind the proxy to a local IPv4 address.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="la-address">IPv4 Address</Label>
            <Input id="la-address" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="192.168.1.1" disabled={isEdit} className={isEdit ? "bg-muted font-mono" : "font-mono"} />
            {isEdit && <p className="text-xs text-muted-foreground">Address cannot be changed after creation.</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="la-port">Port</Label>
            <Input id="la-port" type="number" value={port} onChange={(e) => setPort(e.target.value)} placeholder="3128" className="font-mono" />
          </div>
          <div className="flex items-center gap-2">
            <Checkbox id="la-transparent" checked={disableTransparent} onCheckedChange={(c) => setDisableTransparent(c === true)} />
            <Label htmlFor="la-transparent" className="cursor-pointer">Disable transparent mode</Label>
          </div>
        </div>

        {error && (
          <div className="flex items-start gap-2 rounded-lg bg-destructive/10 border border-destructive/20 p-3">
            <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
            <pre className="text-sm text-destructive whitespace-pre-wrap font-mono">{error}</pre>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving...</> : isEdit ? "Save Changes" : "Add Address"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
