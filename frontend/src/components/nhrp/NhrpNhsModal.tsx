"use client";

import { useState, useEffect } from "react";
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
import { Badge } from "@/components/ui/badge";
import { AlertCircle, Loader2, Plus, X } from "lucide-react";
import { NhrpNhsEntry } from "@/lib/api/nhrp";

interface NhrpNhsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (tunnelIp: string, nbmaAddresses: string[]) => Promise<void>;
  existingNhs: NhrpNhsEntry | null;
}

export function NhrpNhsModal({
  open,
  onOpenChange,
  onSubmit,
  existingNhs,
}: NhrpNhsModalProps) {
  const isEditMode = existingNhs !== null;

  const [tunnelIp, setTunnelIp] = useState("");
  const [nbmaAddresses, setNbmaAddresses] = useState<string[]>([]);
  const [nbmaInput, setNbmaInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setTunnelIp(existingNhs?.tunnel_ip ?? "");
      setNbmaAddresses(existingNhs?.nbma_addresses ?? []);
      setNbmaInput("");
      setError(null);
    }
  }, [open, existingNhs]);

  const handleClose = () => {
    if (!loading) onOpenChange(false);
  };

  const handleAddNbma = () => {
    const val = nbmaInput.trim();
    if (val && !nbmaAddresses.includes(val)) {
      setNbmaAddresses([...nbmaAddresses, val]);
      setNbmaInput("");
    }
  };

  const handleRemoveNbma = (addr: string) => {
    setNbmaAddresses(nbmaAddresses.filter((a) => a !== addr));
  };

  const handleSubmit = async () => {
    if (!tunnelIp.trim()) {
      setError("Tunnel IP is required");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await onSubmit(tunnelIp.trim(), nbmaAddresses);
      onOpenChange(false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Operation failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEditMode ? "Edit NHS Entry" : "Add NHS Entry"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="nhs-tunnel-ip">Tunnel IP</Label>
            {isEditMode ? (
              <p className="text-sm font-mono font-medium px-3 py-2 bg-muted rounded-md">
                {existingNhs?.tunnel_ip}
              </p>
            ) : (
              <Input
                id="nhs-tunnel-ip"
                value={tunnelIp}
                onChange={(e) => setTunnelIp(e.target.value)}
                placeholder="e.g. 10.0.0.1 or dynamic"
              />
            )}
          </div>

          <div className="space-y-2">
            <Label>NBMA Addresses</Label>
            <div className="flex gap-2">
              <Input
                value={nbmaInput}
                onChange={(e) => setNbmaInput(e.target.value)}
                placeholder="e.g. 192.168.1.1"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddNbma();
                  }
                }}
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={handleAddNbma}
                disabled={!nbmaInput.trim()}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            {nbmaAddresses.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {nbmaAddresses.map((addr) => (
                  <Badge key={addr} variant="secondary" className="gap-1 pr-1">
                    <span className="font-mono text-xs">{addr}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveNbma(addr)}
                      className="ml-1 rounded-full p-0.5 hover:bg-muted-foreground/20"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </div>

        {error && (
          <div className="flex items-start gap-2 rounded-lg bg-destructive/10 border border-destructive/20 p-3">
            <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
            <p className="text-sm text-destructive whitespace-pre-wrap">{error}</p>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {isEditMode ? "Saving..." : "Adding..."}
              </>
            ) : isEditMode ? (
              "Save Changes"
            ) : (
              "Add NHS"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
