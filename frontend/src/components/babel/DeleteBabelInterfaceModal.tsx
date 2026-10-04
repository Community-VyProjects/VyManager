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

interface DeleteBabelInterfaceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  interfaceName: string;
  onConfirm: () => Promise<void>;
}

export function DeleteBabelInterfaceModal({
  open,
  onOpenChange,
  interfaceName,
  onConfirm,
}: DeleteBabelInterfaceModalProps) {
  const t = useTranslations("babel");
  const tc = useTranslations("common");
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    setLoading(true);
    try {
      await onConfirm();
    } finally {
      setLoading(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("delete.title")}</AlertDialogTitle>
          <AlertDialogDescription>
            {t.rich("delete.description", {
              name: interfaceName,
              mono: (chunks) => <span className="font-mono font-semibold">{chunks}</span>,
            })}
          </AlertDialogDescription>
        </AlertDialogHeader>

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
              tc("deleteInterface")
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
