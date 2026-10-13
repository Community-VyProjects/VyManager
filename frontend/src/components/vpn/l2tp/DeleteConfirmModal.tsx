"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Loader2 } from "lucide-react";
import { VyOSResponse } from "@/lib/api/l2tp";
import { ApiError } from "@/lib/types/api";

interface DeleteConfirmModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  itemType: string;
  itemName: string;
  onDelete: () => Promise<VyOSResponse>;
  warning?: string;
}

export function DeleteConfirmModal({
  open,
  onOpenChange,
  onSuccess,
  itemType,
  itemName,
  onDelete,
  warning,
}: DeleteConfirmModalProps) {
  const t = useTranslations("l2tp");
  // English sentences use the type in lower case; other languages keep it as given
  // (lower-casing would break acronyms such as "IKE 组").
  const typeInSentence = useLocale().startsWith("en") ? itemType.toLowerCase() : itemType;
  const tc = useTranslations("common");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await onDelete();
      if (result.success) {
        onOpenChange(false);
        onSuccess();
      } else {
        setError(result.error || t("deleteModal.failed", { type: typeInSentence }));
      }
    } catch (err) {
      setError((err as ApiError).message || t("deleteModal.failed", { type: typeInSentence }));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            {t("deleteModal.title", { type: itemType, name: itemName })}
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-2">
            <p>
              {t("deleteModal.confirm", { type: typeInSentence })}
            </p>
            {warning && (
              <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 p-3 mt-2">
                <p className="text-sm text-amber-600 font-medium">{warning}</p>
              </div>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>

        {error && (
          <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3">
            <p className="text-sm text-destructive whitespace-pre-wrap">{error}</p>
          </div>
        )}

        <AlertDialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            {tc("cancel")}
          </Button>
          <Button variant="destructive" onClick={handleDelete} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {tc("deleting")}
              </>
            ) : (
              t("deleteModal.deleteButton", { type: itemType })
            )}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
