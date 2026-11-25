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
import { AlertCircle, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import type { ApiError } from "@/lib/types/api";

interface DeleteOspfv3ModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  itemType: string;
  itemName: string;
  onConfirm: () => Promise<void>;
  /** Removes every OSPFv3 leaf instead of one named item. */
  wholeProtocol?: boolean;
}

export function DeleteOspfv3Modal({
  open,
  onOpenChange,
  itemType,
  itemName,
  onConfirm,
  wholeProtocol = false,
}: DeleteOspfv3ModalProps) {
  const t = useTranslations("ospfv3");
  const tc = useTranslations("common");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // The caller closes the dialog after a successful commit; a rejected one stays open with its error.
  const handleConfirm = async (event: React.MouseEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await onConfirm();
    } catch (err: unknown) {
      setError((err as ApiError).message || t("delete.failed"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {wholeProtocol ? t("overview.deleteOspfv3") : t("delete.title", { itemType })}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {wholeProtocol
              ? t("delete.allDescription")
              : t.rich("delete.description", {
                  itemType: itemType.toLowerCase(),
                  name: itemName,
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
            ) : wholeProtocol ? (
              t("overview.deleteOspfv3")
            ) : (
              t("delete.confirm", { itemType })
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
