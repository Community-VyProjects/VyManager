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
import { staticRoutesService, type ArpEntry } from "@/lib/api/static-routes";

interface EditArpEntryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  interfaceName: string;
  entry: ArpEntry | null;
}

export function EditArpEntryModal({
  open,
  onOpenChange,
  onSuccess,
  interfaceName,
  entry,
}: EditArpEntryModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [macAddress, setMacAddress] = useState("");
  const [description, setDescription] = useState("");

  useEffect(() => {
    if (open && entry) {
      setMacAddress(entry.mac_address);
      setDescription(entry.description || "");
      setError(null);
    }
  }, [open, entry]);

  const handleSubmit = async () => {
    if (!entry) return;

    setError(null);

    if (!macAddress) {
      setError("MAC address is required");
      return;
    }

    const macRegex = /^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/;
    if (!macRegex.test(macAddress)) {
      setError("Invalid MAC address format (use XX:XX:XX:XX:XX:XX)");
      return;
    }

    setLoading(true);

    try {
      await staticRoutesService.updateArpEntry(
        interfaceName,
        entry.ip_address,
        macAddress,
        description || undefined
      );
      onSuccess();
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update ARP entry");
    } finally {
      setLoading(false);
    }
  };

  if (!entry) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit ARP Entry</DialogTitle>
          <DialogDescription>
            Modify static ARP entry for {entry.ip_address} on {interfaceName}
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
            <Label>Interface</Label>
            <Input value={interfaceName} disabled className="bg-muted" />
          </div>

          <div className="space-y-2">
            <Label>IP Address</Label>
            <Input value={entry.ip_address} disabled className="bg-muted" />
            <p className="text-xs text-muted-foreground">
              IP address cannot be changed. Delete and recreate to change it.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="mac-address">MAC Address</Label>
            <Input
              id="mac-address"
              placeholder="00:11:22:33:44:55"
              value={macAddress}
              onChange={(e) => setMacAddress(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description (optional)</Label>
            <Input
              id="description"
              placeholder="Description for this ARP entry"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Update Entry
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
