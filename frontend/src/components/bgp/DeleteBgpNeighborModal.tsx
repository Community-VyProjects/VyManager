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
import { Loader2 } from "lucide-react";

interface DeleteBgpNeighborModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  neighborAddress: string;
  onConfirm: () => Promise<void>;
}

export function DeleteBgpNeighborModal({
  open,
  onOpenChange,
  neighborAddress,
  onConfirm,
}: DeleteBgpNeighborModalProps) {
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    setLoading(true);
    try {
      await onConfirm();
    } finally {
      setLoading(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete BGP Neighbor</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete the BGP neighbor{" "}
            <span className="font-mono font-semibold">{neighborAddress}</span>?
            This will remove the peering session and all associated address-family
            configurations. Active BGP sessions will be terminated.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={loading}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Deleting...
              </>
            ) : (
              "Delete Neighbor"
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
