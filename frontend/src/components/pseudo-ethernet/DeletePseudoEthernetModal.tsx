"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
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
import { pseudoEthernetService, type PseudoEthernetInterface } from "@/lib/api/pseudo-ethernet";
import { ApiError } from "@/lib/types/api";

interface DeletePseudoEthernetModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  interfaceData: PseudoEthernetInterface | null;
}

export function DeletePseudoEthernetModal({
  open,
  onOpenChange,
  onSuccess,
  interfaceData,
}: DeletePseudoEthernetModalProps) {
  const t = useTranslations("pseudoEthernet");
  const tc = useTranslations("common");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async () => {
    if (!interfaceData) return;
    setLoading(true);
    setError(null);
    try {
      const result = await pseudoEthernetService.deleteInterface(interfaceData.name);
      if (result.success) {
        onOpenChange(false);
        onSuccess();
      } else {
        setError(result.error || t("delete.failed"));
      }
    } catch (err) {
      setError((err as ApiError).message || t("delete.failed"));
    } finally {
      setLoading(false);
    }
  };

  if (!interfaceData) return null;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            {t("delete.title", { name: interfaceData.name })}
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-2">
            <p>
              {t("delete.confirm")}
            </p>
            <div className="rounded-lg bg-muted/50 border p-3 mt-2">
              <p className="text-sm text-muted-foreground">
                {interfaceData.source_interface && (
                  <>{t("delete.source")} <span className="font-medium text-foreground">{interfaceData.source_interface}</span></>
                )}
                {interfaceData.mode && (
                  <> &middot; {t("delete.mode")} <span className="font-medium text-foreground">{interfaceData.mode}</span></>
                )}
                {interfaceData.addresses.length > 0 && (
                  <> &middot; {t("delete.addressCount", { count: interfaceData.addresses.length })}</>
                )}
              </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>

        {error && (
          <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3">
            <pre className="text-sm text-destructive whitespace-pre-wrap">{error}</pre>
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
              tc("deleteInterface")
            )}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
