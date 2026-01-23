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
import { ipsecService } from "@/lib/api/ipsec";
import { useToast } from "@/hooks/useToast";

type DeleteType = "ike-group" | "esp-group" | "peer" | "tunnel";

interface IPsecDeleteConfirmModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  deleteType: DeleteType;
  targetName: string;
  additionalInfo?: {
    peer?: string;
    tunnel?: string;
  };
}

const DELETE_TITLES: Record<DeleteType, string> = {
  "ike-group": "Delete IKE Group",
  "esp-group": "Delete ESP Group",
  peer: "Delete Peer",
  tunnel: "Delete Tunnel",
};

const DELETE_DESCRIPTIONS: Record<DeleteType, string> = {
  "ike-group": "This will remove the IKE group and may affect peers using it.",
  "esp-group": "This will remove the ESP group and may affect tunnels using it.",
  peer: "This will remove the peer and all its tunnels.",
  tunnel: "This tunnel will be removed from the peer.",
};

export function IPsecDeleteConfirmModal({
  open,
  onOpenChange,
  onSuccess,
  deleteType,
  targetName,
  additionalInfo,
}: IPsecDeleteConfirmModalProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    setLoading(true);
    try {
      let response;

      switch (deleteType) {
        case "ike-group":
          response = await ipsecService.deleteIKEGroup(targetName);
          break;
        case "esp-group":
          response = await ipsecService.deleteESPGroup(targetName);
          break;
        case "peer":
          response = await ipsecService.deletePeer(targetName);
          break;
        case "tunnel":
          if (!additionalInfo?.peer) {
            throw new Error("Peer address required for tunnel deletion");
          }
          response = await ipsecService.deletePeerTunnel(additionalInfo.peer, targetName);
          break;
      }

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
          <DialogDescription>{DELETE_DESCRIPTIONS[deleteType]}</DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20">
            <p className="text-sm">
              Are you sure you want to delete{" "}
              <code className="font-mono font-bold">{targetName}</code>?
            </p>
            {additionalInfo?.peer && deleteType === "tunnel" && (
              <p className="text-xs text-muted-foreground mt-1">
                Peer: {additionalInfo.peer}
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
