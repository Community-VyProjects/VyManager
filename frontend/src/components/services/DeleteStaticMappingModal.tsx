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
import { Badge } from "@/components/ui/badge";
import { AlertCircle, AlertTriangle, Monitor } from "lucide-react";
import { dhcpService, type DHCPStaticMapping } from "@/lib/api/dhcp";

interface DeleteStaticMappingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  networkName: string;
  subnet: string;
  mapping: DHCPStaticMapping;
}

export function DeleteStaticMappingModal({
  open,
  onOpenChange,
  onSuccess,
  networkName,
  subnet,
  mapping,
}: DeleteStaticMappingModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleClose = () => {
    setError(null);
    onOpenChange(false);
  };

  const handleDelete = async () => {
    setLoading(true);
    setError(null);

    try {
      await dhcpService.deleteStaticMapping(networkName, subnet, mapping.name);
      handleClose();
      onSuccess();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to delete static mapping"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Delete Static Mapping
          </DialogTitle>
          <DialogDescription>
            This action cannot be undone. The static mapping will be permanently
            removed.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Warning Box */}
          <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Monitor className="h-5 w-5 text-destructive" />
              <span className="font-semibold text-foreground">{mapping.name}</span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="text-muted-foreground">Network:</div>
              <div className="font-medium">{networkName}</div>

              <div className="text-muted-foreground">Subnet:</div>
              <div>
                <Badge variant="outline">{subnet}</Badge>
              </div>

              {mapping.ip_address && (
                <>
                  <div className="text-muted-foreground">IP Address:</div>
                  <div className="font-mono">{mapping.ip_address}</div>
                </>
              )}

              {mapping.mac_address && (
                <>
                  <div className="text-muted-foreground">MAC Address:</div>
                  <div className="font-mono text-xs">{mapping.mac_address}</div>
                </>
              )}
            </div>
          </div>

          {/* Error Display */}
          {error && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
              <AlertCircle className="h-4 w-4 text-destructive" />
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={loading}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={loading}
          >
            {loading ? "Deleting..." : "Delete Mapping"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
