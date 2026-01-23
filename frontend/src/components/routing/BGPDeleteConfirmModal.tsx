"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader2, AlertTriangle } from "lucide-react";
import { bgpService } from "@/lib/api/bgp";
import { useToast } from "@/hooks/useToast";

type DeleteType = "neighbor" | "network" | "peer-group" | "redistribute" | "aggregate";

interface BGPDeleteConfirmModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  asn: string;
  deleteType: DeleteType;
  targetName: string;
  additionalInfo?: {
    family?: string;
    protocol?: string;
  };
}

const DELETE_TITLES: Record<DeleteType, string> = {
  neighbor: "Delete Neighbor",
  network: "Delete Network",
  "peer-group": "Delete Peer Group",
  redistribute: "Remove Redistribution",
  aggregate: "Delete Aggregate",
};

const DELETE_DESCRIPTIONS: Record<DeleteType, string> = {
  neighbor: "This will remove the BGP peering session with this neighbor.",
  network: "This network will no longer be advertised via BGP.",
  "peer-group": "All neighbors in this peer group will lose their inherited settings.",
  redistribute: "Routes from this protocol will no longer be redistributed into BGP.",
  aggregate: "This aggregate address will be removed.",
};

export function BGPDeleteConfirmModal({
  open,
  onOpenChange,
  onSuccess,
  asn,
  deleteType,
  targetName,
  additionalInfo,
}: BGPDeleteConfirmModalProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    setLoading(true);
    try {
      let operation: { op: string; [key: string]: string };

      switch (deleteType) {
        case "neighbor":
          operation = { op: "delete_neighbor", neighbor: targetName };
          break;
        case "network":
          operation = {
            op: "delete_network",
            family: additionalInfo?.family || "ipv4-unicast",
            network: targetName,
          };
          break;
        case "peer-group":
          operation = { op: "delete_peer_group", group: targetName };
          break;
        case "redistribute":
          operation = {
            op: "delete_redistribute",
            family: additionalInfo?.family || "ipv4-unicast",
            protocol: additionalInfo?.protocol || targetName,
          };
          break;
        case "aggregate":
          operation = {
            op: "delete_aggregate",
            family: additionalInfo?.family || "ipv4-unicast",
            prefix: targetName,
          };
          break;
      }

      const response = await bgpService.configureBatch({
        asn,
        operations: [operation],
      });

      if (response.success) {
        toast.success("Deleted", `${DELETE_TITLES[deleteType]} successful`);
        onOpenChange(false);
        onSuccess();
      } else {
        toast.error("Delete Failed", response.error || "Unknown error");
      }
    } catch (error) {
      console.error("Delete error:", error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      toast.error("Error", errorMessage || "Failed to delete");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            {DELETE_TITLES[deleteType]}
          </DialogTitle>
          <DialogDescription>
            {DELETE_DESCRIPTIONS[deleteType]}
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20">
            <p className="text-sm">
              Are you sure you want to delete{" "}
              <code className="font-mono font-bold">{targetName}</code>?
            </p>
            {additionalInfo?.family && (
              <p className="text-xs text-muted-foreground mt-1">
                Address family: {additionalInfo.family}
              </p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleDelete}
            disabled={loading}
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
