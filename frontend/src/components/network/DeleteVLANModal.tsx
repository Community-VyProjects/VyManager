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
import type { BatchOperation, VlanBatchService } from "@/lib/api/types/ethernet";
import { Loader2, AlertTriangle, AlertCircle } from "lucide-react";

interface DeleteVLANModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vlanType: "vif" | "vif-s" | "vif-c";
  parentInterface: string;
  vlanId: string;
  sVlanId?: string;
  description?: string | null;
  addresses?: string[];
  onSuccess: () => void;
  /** Defaults to ethernetService; pass the bonding adapter to delete bond VLANs. */
  service?: VlanBatchService;
}

const VLAN_TYPE_LABELS: Record<DeleteVLANModalProps["vlanType"], string> = {
  vif: "802.1Q VLAN",
  "vif-s": "QinQ Service VLAN",
  "vif-c": "QinQ Customer VLAN",
};

function getVlanDisplayName(
  parentInterface: string,
  vlanType: DeleteVLANModalProps["vlanType"],
  vlanId: string,
  sVlanId?: string
): string {
  if (vlanType === "vif-c" && sVlanId) {
    return `${parentInterface}.${sVlanId}.${vlanId}`;
  }
  return `${parentInterface}.${vlanId}`;
}

function getDeleteOperation(
  vlanType: DeleteVLANModalProps["vlanType"],
  vlanId: string,
  sVlanId?: string
): BatchOperation {
  switch (vlanType) {
    case "vif":
      return { op: "delete_vif", value: vlanId };
    case "vif-s":
      return { op: "delete_vif_s", value: vlanId };
    case "vif-c":
      return { op: "delete_vif_c", value: `${sVlanId},${vlanId}` };
  }
}

export function DeleteVLANModal({
  open,
  onOpenChange,
  vlanType,
  parentInterface,
  vlanId,
  sVlanId,
  description,
  addresses,
  onSuccess,
  service = ethernetService,
}: DeleteVLANModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const displayName = getVlanDisplayName(parentInterface, vlanType, vlanId, sVlanId);
  const typeLabel = VLAN_TYPE_LABELS[vlanType];

  const handleDelete = async () => {
    setError(null);
    setLoading(true);

    try {
      const operation = getDeleteOperation(vlanType, vlanId, sVlanId);

      await service.batchConfigure({
        interface: parentInterface,
        operations: [operation],
      });

      await service.refreshConfig();

      onSuccess();
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete VLAN");
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
            Delete VLAN
          </DialogTitle>
          <DialogDescription>
            Are you sure you want to delete this VLAN? This action cannot be undone.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {error && (
            <div className="bg-destructive/10 border border-destructive/20 rounded-md p-3 flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
              <pre className="whitespace-pre-wrap font-mono text-sm text-destructive">{error}</pre>
            </div>
          )}

          <div className="bg-muted p-4 rounded-lg space-y-2">
            <div className="flex justify-between">
              <span className="text-sm font-medium">VLAN:</span>
              <code className="text-sm font-mono font-semibold">{displayName}</code>
            </div>
            <div className="flex justify-between">
              <span className="text-sm font-medium">Type:</span>
              <span className="text-sm text-muted-foreground">{typeLabel}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm font-medium">Parent Interface:</span>
              <code className="text-sm font-mono">{parentInterface}</code>
            </div>
            {description && (
              <div className="flex justify-between">
                <span className="text-sm font-medium">Description:</span>
                <span className="text-sm text-muted-foreground">{description}</span>
              </div>
            )}
            {addresses && addresses.length > 0 && (
              <div>
                <span className="text-sm font-medium">IP Addresses:</span>
                <div className="mt-1 space-y-1">
                  {addresses.map((addr, idx) => (
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
              <strong>Warning:</strong> Deleting this VLAN will remove all of its configuration
              including IP addresses and other settings. This may cause network connectivity
              issues if the VLAN is currently in use.
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
            Delete VLAN
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
