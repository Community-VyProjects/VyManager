"use client";

import { useState } from "react";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { useLocale, useTranslations } from "next-intl";
import { AlertTriangle, Loader2 } from "lucide-react";
import { VyOSResponse } from "@/lib/api/pki";
import { ApiError } from "@/lib/types/api";

interface DeletePKIItemModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  itemType: string;
  itemName: string;
  onDelete: () => Promise<VyOSResponse>;
}

export function DeletePKIItemModal({
  open,
  onOpenChange,
  onSuccess,
  itemType,
  itemName,
  onDelete,
}: DeletePKIItemModalProps) {
  const t = useTranslations("pki");
  const tc = useTranslations("common");
  const locale = useLocale();
  // English puts the type mid-sentence in lower case; other languages keep it as-is.
  const inlineType = locale.startsWith("en") ? itemType.toLowerCase() : itemType;
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
        setError(result.error || t("delete.failed", { type: inlineType }));
      }
    } catch (err) {
      setError((err as ApiError).message || t("delete.failed", { type: inlineType }));
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
            {t("delete.title", { type: itemType, name: itemName })}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {t("delete.confirm", { type: inlineType })}
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
              t("delete.button", { type: itemType })
            )}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
