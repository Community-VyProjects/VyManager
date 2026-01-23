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
import { ethernetService } from "@/lib/api/ethernet";
import type { EthernetInterface } from "@/lib/api/types/ethernet";
import { Loader2, AlertTriangle } from "lucide-react";

interface DeleteEthernetModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  interface: EthernetInterface;
  onSuccess: () => void;
}

export function DeleteEthernetModal({
  open,
  onOpenChange,
  interface: iface,
  onSuccess,
}: DeleteEthernetModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async () => {
    setError(null);
    setLoading(true);

    try {
      await ethernetService.deleteInterface(iface.name);

      // Refresh config cache to remove the deleted interface
      await ethernetService.refreshConfig();

      onSuccess();
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete interface");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Delete Interface
          </DialogTitle>
          <DialogDescription>
            Are you sure you want to delete this interface? This action cannot be undone.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {error && (
            <div className="bg-destructive/10 text-destructive px-4 py-3 rounded-md text-sm">
              {error}
            </div>
          )}

          <div className="bg-muted p-4 rounded-lg space-y-2">
            <div className="flex justify-between">
              <span className="text-sm font-medium">Interface:</span>
              <code className="text-sm font-mono font-semibold">{iface.name}</code>
            </div>
            {iface.description && (
              <div className="flex justify-between">
                <span className="text-sm font-medium">Description:</span>
                <span className="text-sm text-muted-foreground">{iface.description}</span>
              </div>
            )}
            {iface.addresses.length > 0 && (
              <div>
                <span className="text-sm font-medium">IP Addresses:</span>
                <div className="mt-1 space-y-1">
                  {iface.addresses.map((addr, idx) => (
                    <code
                      key={idx}
                      className="block text-xs font-mono px-2 py-1 rounded bg-accent"
                    >
                      {addr}
                    </code>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="bg-destructive/10 border border-destructive/20 p-3 rounded-md">
            <p className="text-sm text-destructive">
              <strong>Warning:</strong> Deleting this interface will remove all of its configuration
              including IP addresses, VLANs, and other settings. This may cause network connectivity
              issues if the interface is currently in use.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={loading}
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Delete Interface
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
