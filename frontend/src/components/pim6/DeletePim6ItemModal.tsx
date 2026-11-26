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

export type Pim6DeleteKind = "interface" | "rpAddress" | "pim6";

interface DeletePim6ItemModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  itemType: Pim6DeleteKind;
  /** Name of the deleted object; unused for the whole-protocol delete. */
  itemName: string;
  /** The last RP address with a keep-alive timer: its delete clears the timer too. */
  clearsRpTimer?: boolean;
  /** Commits the delete and closes the dialog; a rejection keeps it open with the device error. */
  onConfirm: () => Promise<void>;
}

export function DeletePim6ItemModal({
  open,
  onOpenChange,
  itemType,
  itemName,
  clearsRpTimer = false,
  onConfirm,
}: DeletePim6ItemModalProps) {
  const t = useTranslations("pim6");
  const tc = useTranslations("common");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConfirm = async (event: React.MouseEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await onConfirm();
    } catch (err: unknown) {
      setError((err as ApiError).message || t(`deleteModal.${itemType}.failed`));
    } finally {
      setLoading(false);
    }
  };

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      if (loading) return;
      setError(null);
    }
    onOpenChange(next);
  };

  const title = t(`deleteModal.${itemType}.title`);

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>
            {clearsRpTimer ? t("deleteModal.rpAddress.descriptionLast") : t(`deleteModal.${itemType}.description`)}
            {itemType !== "pim6" && (
              <>
                <br />
                <span className="font-mono font-semibold">{itemName}</span>
              </>
            )}
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
                {t("deleteModal.removing")}
              </>
            ) : (
              title
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
