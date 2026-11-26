"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
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
import { AlertCircle, Loader2 } from "lucide-react";
import type { ApiError } from "@/lib/types/api";

/** One cache server, or the whole `protocols rpki` tree. */
export type RpkiDeleteKind = "cache" | "all";

interface DeleteRpkiItemModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  kind: RpkiDeleteKind;
  /** Address of the deleted cache server; unused for the whole-tree delete. */
  serverAddress: string;
  /** Commits the delete and closes the dialog; a rejection keeps it open with the device error. */
  onConfirm: () => Promise<void>;
}

export function DeleteRpkiItemModal({
  open,
  onOpenChange,
  kind,
  serverAddress,
  onConfirm,
}: DeleteRpkiItemModalProps) {
  const t = useTranslations("rpki");
  const tc = useTranslations("common");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConfirm = async (event: React.MouseEvent) => {
    // AlertDialogAction closes on click; close only after the commit succeeds.
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await onConfirm();
    } catch (err) {
      setError((err as ApiError).message || t(kind === "all" ? "errors.deleteRpki" : "errors.deleteCache"));
    } finally {
      setLoading(false);
    }
  };

  const handleOpenChange = (next: boolean) => {
    if (!next && loading) return;
    onOpenChange(next);
  };

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{kind === "all" ? t("deleteAll.title") : t("delete.title")}</AlertDialogTitle>
          <AlertDialogDescription>
            {kind === "all"
              ? t("deleteAll.description")
              : t.rich("delete.description", {
                  address: serverAddress,
                  mono: (chunks) => <span className="font-mono font-semibold">{chunks}</span>,
                })}
          </AlertDialogDescription>
        </AlertDialogHeader>

        {error && (
          <div className="flex items-start gap-2 rounded-lg bg-destructive/10 border border-destructive/20 p-3">
            <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
            <p className="text-sm text-destructive whitespace-pre-wrap">{error}</p>
          </div>
        )}

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
            ) : kind === "all" ? (
              t("deleteAll.confirm")
            ) : (
              t("delete.confirm")
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
