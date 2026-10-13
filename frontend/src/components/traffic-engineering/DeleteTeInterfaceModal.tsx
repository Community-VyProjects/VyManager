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
import { Loader2 } from "lucide-react";

interface DeleteTeInterfaceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  interfaceName: string;
  onConfirm: () => Promise<void>;
}

export function DeleteTeInterfaceModal({
  open,
  onOpenChange,
  interfaceName,
  onConfirm,
}: DeleteTeInterfaceModalProps) {
  const t = useTranslations("trafficEngineering");
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
          <AlertDialogTitle>{t("deleteInterface.title")}</AlertDialogTitle>
          <AlertDialogDescription>
            {t.rich("deleteInterface.description", {
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
              t("deleteInterface.confirm")
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
