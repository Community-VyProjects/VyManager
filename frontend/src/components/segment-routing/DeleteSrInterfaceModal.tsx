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

interface DeleteSrInterfaceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  interfaceName: string;
  /**
   * True when this is the last SRv6 interface and locators still exist:
   * VyOS rejects that commit, so the dialog explains instead of offering
   * the action.
   */
  blocked: boolean;
  /** True on VyOS 1.4: deletion rewrites the whole segment-routing tree. */
  requiresRecreate: boolean;
  onConfirm: () => Promise<void>;
}

export function DeleteSrInterfaceModal({
  open,
  onOpenChange,
  interfaceName,
  blocked,
  requiresRecreate,
  onConfirm,
}: DeleteSrInterfaceModalProps) {
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
          <AlertDialogTitle>
            {blocked ? "Cannot Disable SRv6" : "Disable SRv6 on Interface"}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {blocked ? (
              <>
                <span className="font-mono font-semibold">{interfaceName}</span>{" "}
                is the last SRv6-enabled interface and locators are still
                configured. VyOS requires SRv6 on at least one interface while
                locators exist, so this commit would be rejected. Delete the
                locators first, or enable SRv6 on another interface.
              </>
            ) : (
              <>
                Disable SRv6 on{" "}
                <span className="font-mono font-semibold">{interfaceName}</span>?
                The interface will stop accepting SR-enabled IPv6 packets.
                {requiresRecreate && (
                  <>
                    {" "}This router runs VyOS 1.4, which cannot modify
                    existing Segment Routing configuration in place: the whole
                    segment-routing tree is removed and recreated without this
                    interface, in two commits.
                  </>
                )}
              </>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>
            {blocked ? "Close" : "Cancel"}
          </AlertDialogCancel>
          {!blocked && (
            <AlertDialogAction
              onClick={handleConfirm}
              disabled={loading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Disabling...
                </>
              ) : (
                "Disable SRv6"
              )}
            </AlertDialogAction>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
