"use client";

import { useEffect, useState } from "react";
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

interface DeleteBabelInterfaceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  interfaceName: string;
  onConfirm: () => Promise<void>;
  variant?: "interface" | "filter";
}

export function DeleteBabelInterfaceModal({
  open,
  onOpenChange,
  interfaceName,
  onConfirm,
  variant = "interface",
}: DeleteBabelInterfaceModalProps) {
  const t = useTranslations("babel");
  const tc = useTranslations("common");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) setError(null);
  }, [open]);

  const handleConfirm = async () => {
    setLoading(true);
    setError(null);
    try {
      await onConfirm();
    } catch (err) {
      setError(err instanceof Error ? err.message : tc("operationFailed"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {variant === "filter" ? t("delete.filterTitle") : t("delete.title")}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {t.rich(variant === "filter" ? "delete.filterDescription" : "delete.description", {
              name: interfaceName,
              mono: (chunks) => <span className="font-mono font-semibold">{chunks}</span>,
            })}
          </AlertDialogDescription>
        </AlertDialogHeader>

        {error && (
          <div className="flex items-start gap-2 rounded-md border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
            <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
            <span className="whitespace-pre-wrap">{error}</span>
          </div>
        )}

        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>{tc("cancel")}</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              handleConfirm();
            }}
            disabled={loading}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {tc("deleting")}
              </>
            ) : variant === "filter" ? (
              t("delete.filterConfirm")
            ) : (
              tc("deleteInterface")
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
