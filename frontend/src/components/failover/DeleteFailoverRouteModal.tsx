"use client";

import { useState, type MouseEvent } from "react";
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
import { failoverService } from "@/lib/api/failover";
import type { ApiError } from "@/lib/types/api";

interface DeleteFailoverRouteModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  destination: string;
  onSuccess: () => void;
}

export function DeleteFailoverRouteModal({
  open,
  onOpenChange,
  destination,
  onSuccess,
}: DeleteFailoverRouteModalProps) {
  const t = useTranslations("failover");
  const tc = useTranslations("common");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleOpenChange = (next: boolean) => {
    if (!next && loading) return;
    if (!next) setError(null);
    onOpenChange(next);
  };

  const handleConfirm = async (event: MouseEvent) => {
    // The action would close the dialog on click; close only after the commit lands.
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await failoverService.deleteRoute(destination);
      onOpenChange(false);
      onSuccess();
    } catch (err) {
      setError((err as ApiError).message || t("deleteModal.failed"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("deleteModal.title")}</AlertDialogTitle>
          <AlertDialogDescription>
            {t.rich("deleteModal.description", {
              destination,
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
            ) : (
              t("deleteModal.deleteRoute")
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
