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

interface DeleteLocatorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  locatorName: string;
  /** True on VyOS 1.4: deletion rewrites the whole segment-routing tree. */
  requiresRecreate: boolean;
  onConfirm: () => Promise<void>;
}

export function DeleteLocatorModal({
  open,
  onOpenChange,
  locatorName,
  requiresRecreate,
  onConfirm,
}: DeleteLocatorModalProps) {
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
          <AlertDialogTitle>Delete SRv6 Locator</AlertDialogTitle>
          <AlertDialogDescription>
            Remove locator{" "}
            <span className="font-mono font-semibold">{locatorName}</span>?
            IGPs referencing this locator will stop advertising its SIDs.
            {requiresRecreate && (
              <>
                {" "}This router runs VyOS 1.4, which cannot modify existing
                Segment Routing configuration in place: the whole
                segment-routing tree is removed and recreated without this
                locator, in two commits.
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
              "Delete Locator"
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
