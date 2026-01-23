"use client";

import { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { RefreshCw } from "lucide-react";
import { vrrpService } from "@/lib/api/vrrp";
import { useToast } from "@/hooks/useToast";

interface VRRPDeleteConfirmModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  target: {
    type: "vrrp-group" | "sync-group" | "virtual-server";
    name: string;
  } | null;
  onSuccess?: () => void;
}

export function VRRPDeleteConfirmModal({
  open,
  onOpenChange,
  target,
  onSuccess,
}: VRRPDeleteConfirmModalProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const getTypeLabel = () => {
    switch (target?.type) {
      case "vrrp-group":
        return "VRRP Group";
      case "sync-group":
        return "Sync Group";
      case "virtual-server":
        return "Virtual Server";
      default:
        return "Item";
    }
  };

  const handleDelete = async () => {
    if (!target) return;

    setLoading(true);

    try {
      let response;

      switch (target.type) {
        case "vrrp-group":
          response = await vrrpService.deleteVRRPGroup(target.name);
          break;
        case "sync-group":
          response = await vrrpService.deleteSyncGroup(target.name);
          break;
        case "virtual-server":
          response = await vrrpService.deleteVirtualServer(target.name);
          break;
        default:
          throw new Error("Unknown target type");
      }

      if (response.success) {
        toast.success(
          "Deleted",
          `${getTypeLabel()} "${target.name}" has been deleted`
        );
        onOpenChange(false);
        onSuccess?.();
      } else {
        toast.error("Error", response.error || "Failed to delete");
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      toast.error("Error", errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete {getTypeLabel()}?</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete {getTypeLabel().toLowerCase()}{" "}
            <strong>{target?.name}</strong>? This action cannot be undone.
            {target?.type === "vrrp-group" && (
              <span className="block mt-2 text-yellow-600 dark:text-yellow-500">
                Warning: Deleting a VRRP group may cause network disruption if it&apos;s currently
                the master router.
              </span>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            disabled={loading}
          >
            {loading && <RefreshCw className="h-4 w-4 mr-2 animate-spin" />}
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
