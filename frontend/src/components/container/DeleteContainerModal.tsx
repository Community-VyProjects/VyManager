"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { AlertCircle, Loader2 } from "lucide-react";
import type { ContainerInstance } from "@/lib/api/container";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  container: ContainerInstance | null;
  onConfirm: () => Promise<void>;
}

export function DeleteContainerModal({ open, onOpenChange, container, onConfirm }: Props) {
  const t = useTranslations("containers");
  const tc = useTranslations("common");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConfirm = async () => {
    setLoading(true);
    setError(null);
    try {
      await onConfirm();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t("deleteModal.failed"));
      setLoading(false);
      return;
    }
    setLoading(false);
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) setError(null);
    onOpenChange(open);
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
          <Button
            onClick={handleConfirm}
            disabled={loading}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t("deleteModal.deleting")}
              </>
            ) : (
              t("deleteModal.title")
            )}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
