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
import { useTranslations } from "next-intl";
import { thrownMessage } from "@/lib/api-error";

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
  const t = useTranslations("bgp");
  const tc = useTranslations("common");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      if (loading) return;
      setError(null);
    }
    onOpenChange(next);
  };

  const handleConfirm = async (event: React.MouseEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await onConfirm();
      onOpenChange(false);
    } catch (err) {
      setError(thrownMessage(err, t("content.saveFailed")));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("deletePeerGroup.title")}</AlertDialogTitle>
          <AlertDialogDescription>
            {t.rich("deletePeerGroup.description", {
              name: peerGroupName,
              mono: (chunks) => <span className="font-mono font-semibold">{chunks}</span>,
            })}
            {memberCount > 0 && (
              <>
                {" "}
                {t.rich("deletePeerGroup.membersWarning", {
                  count: memberCount,
                  b: (chunks) => <span className="font-semibold">{chunks}</span>,
                })}
              </>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>{tc("cancel")}</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={loading}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {tc("deleting")}
              </>
            ) : (
              t("deletePeerGroup.confirm")
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
