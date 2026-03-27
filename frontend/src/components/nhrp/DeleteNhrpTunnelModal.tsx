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

interface DeleteNhrpTunnelModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tunnelName: string;
  onConfirm: () => Promise<void>;
}

export function DeleteNhrpTunnelModal({
  open,
  onOpenChange,
  tunnelName,
  onConfirm,
}: DeleteNhrpTunnelModalProps) {
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
          <AlertDialogTitle>Delete NHRP Tunnel</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete tunnel{" "}
            <span className="font-mono font-semibold">{tunnelName}</span>?
            This will remove all NHRP configuration for this tunnel including
            maps, NHS entries, and multicast settings.
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
              "Delete Tunnel"
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
