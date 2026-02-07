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

interface DeleteBgpPeerGroupModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  peerGroupName: string;
  memberCount: number;
  onConfirm: () => Promise<void>;
}

export function DeleteBgpPeerGroupModal({
  open,
  onOpenChange,
  peerGroupName,
  memberCount,
  onConfirm,
}: DeleteBgpPeerGroupModalProps) {
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
          <AlertDialogTitle>Delete BGP Peer Group</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete the peer group{" "}
            <span className="font-mono font-semibold">{peerGroupName}</span>?
            {memberCount > 0 && (
              <>
                {" "}This peer group is currently referenced by{" "}
                <span className="font-semibold">{memberCount}</span> neighbor{memberCount !== 1 ? "s" : ""}.
                Those neighbors will lose their peer group association.
              </>
            )}
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
              "Delete Peer Group"
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
