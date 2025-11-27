"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertCircle, AlertTriangle } from "lucide-react";
import { dhcpService } from "@/lib/api/dhcp";

interface DeleteDHCPModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  networkName: string;
  subnet: string;
  deleteEntireNetwork?: boolean;
}

export function DeleteDHCPModal({
  open,
  onOpenChange,
  onSuccess,
  networkName,
  subnet,
  deleteEntireNetwork = false,
}: DeleteDHCPModalProps) {
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
      if (deleteEntireNetwork) {
        await dhcpService.deleteSharedNetwork(networkName);
      } else {
        await dhcpService.deleteSubnet(networkName, subnet);
      }

      handleClose();
      onSuccess();
    } catch (err: any) {
      setError(err.message || "Failed to delete DHCP configuration");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            {deleteEntireNetwork ? "Delete Shared Network" : "Delete DHCP Subnet"}
          </DialogTitle>
          <DialogDescription>
            {deleteEntireNetwork
              ? "This will delete the entire shared network and all its subnets."
              : "This will permanently delete this DHCP subnet configuration."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
            <div className="space-y-2 text-sm">
              <p className="font-medium text-foreground">You are about to delete:</p>
              <div className="space-y-1 text-muted-foreground">
                <p>
                  <span className="font-medium">Network:</span> {networkName}
                </p>
                {!deleteEntireNetwork && (
                  <p>
                    <span className="font-medium">Subnet:</span> {subnet}
                  </p>
                )}
              </div>
            </div>
          </div>

          {deleteEntireNetwork && (
            <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4">
              <div className="flex gap-2">
                <AlertTriangle className="h-5 w-5 text-yellow-500 flex-shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-foreground mb-1">Warning</p>
                  <p className="text-muted-foreground">
                    Deleting a shared network will remove all associated subnets, ranges,
                    static mappings, and configuration. This action cannot be undone.
                  </p>
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 flex items-start gap-2">
              <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={loading}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleDelete} disabled={loading}>
            {loading ? "Deleting..." : "Delete"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
