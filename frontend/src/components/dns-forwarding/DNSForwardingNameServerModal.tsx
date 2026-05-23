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
import { AlertCircle, Loader2 } from "lucide-react";
import type { NameServerEntry } from "@/lib/api/dns-forwarding";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (ip: string, port: number | null) => Promise<void>;
}

export function DNSForwardingNameServerModal({ open, onOpenChange, onSubmit }: Props) {
  const [ip, setIp] = useState("");
  const [port, setPort] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setIp("");
      setPort("");
      setError(null);
    }
  }, [open]);

  const handleSubmit = async () => {
    if (!ip.trim()) {
      setError("IP address is required");
      return;
    }
    const portNum = port ? parseInt(port, 10) : null;
    if (port && (isNaN(portNum!) || portNum! < 1 || portNum! > 65535)) {
      setError("Port must be between 1 and 65535");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await onSubmit(ip.trim(), portNum);
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Operation failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Add Name Server</DialogTitle>
          <DialogDescription>Add an upstream DNS name server.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="ns-ip">IP Address</Label>
            <Input
              id="ns-ip"
              value={ip}
              onChange={(e) => setIp(e.target.value)}
              placeholder="e.g. 8.8.8.8 or 2001:4860:4860::8888"
              className="font-mono"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ns-port">Port (optional)</Label>
            <Input
              id="ns-port"
              type="number"
              value={port}
              onChange={(e) => setPort(e.target.value)}
              placeholder="53 (default)"
              min={1}
              max={65535}
              className="font-mono"
            />
          </div>
        </div>

        {error && (
          <div className="flex items-start gap-2 rounded-lg bg-destructive/10 border border-destructive/20 p-3">
            <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
            <pre className="text-sm text-destructive whitespace-pre-wrap font-mono">{error}</pre>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Adding...</> : "Add"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
