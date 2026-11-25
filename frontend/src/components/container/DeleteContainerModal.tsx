"use client";

import { useState, type MouseEvent } from "react";
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
import type { ContainerInstance } from "@/lib/api/container";
import type { ApiError } from "@/lib/types/api";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  container: ContainerInstance | null;
  /** Runs the delete; throws on a rejected commit. */
  onConfirm: () => Promise<void>;
}

export function DeleteContainerModal({ open, onOpenChange, container, onConfirm }: Props) {
  const t = useTranslations("containers");
  const tc = useTranslations("common");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConfirm = async (event: MouseEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await onConfirm();
      onOpenChange(false);
    } catch (err: unknown) {
      setError((err as ApiError).message || t("deleteModal.failed"));
    } finally {
      setLoading(false);
    }
  };

  const handleOpenChange = (next: boolean) => {
    if (!next && loading) return;
    if (!next) setError(null);
    onOpenChange(next);
  };

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("deleteModal.title")}</AlertDialogTitle>
          <AlertDialogDescription>
            {t.rich("deleteModal.confirm", {
              name: container?.name ?? "",
              mono: (chunks) => <span className="font-mono font-semibold">{chunks}</span>,
            })}
            {container?.image && (
              <>{t.rich("deleteModal.image", {
                image: container.image,
                mono: (chunks) => <span className="font-mono">{chunks}</span>,
              })}</>
            )}{" "}
            {t("deleteModal.irreversible")}
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
            ) : (
              t("deleteModal.title")
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
