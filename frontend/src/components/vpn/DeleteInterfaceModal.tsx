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
import { wireguardService, WireGuardInterface } from "@/lib/api/wireguard";
import { ApiError } from "@/lib/types/api";

interface DeleteInterfaceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  interfaceData: WireGuardInterface | null;
}

export function DeleteInterfaceModal({
  open,
  onOpenChange,
  onSuccess,
  interfaceData,
}: DeleteInterfaceModalProps) {
  const t = useTranslations("wireguard");
  const tc = useTranslations("common");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async () => {
    if (!interfaceData) return;

    setLoading(true);
    setError(null);

    try {
      const result = await wireguardService.deleteInterface(interfaceData.name);

      if (result.success) {
        onOpenChange(false);
        onSuccess();
      } else {
        setError(result.error || t("deleteInterface.failed"));
      }
    } catch (err) {
      setError((err as ApiError).message || t("deleteInterface.failed"));
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
            {t("deleteInterface.title", { name: interfaceData.name })}
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-2">
            <p>
              {t("deleteInterface.confirm")}
            </p>
            {interfaceData.peer_count > 0 && (
              <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 p-3 mt-2">
                <p className="text-sm text-amber-600 font-medium">
                  {t("deleteInterface.peerWarning", { count: interfaceData.peer_count })}
                </p>
                <p className="text-xs text-amber-600/80 mt-1">
                  {t("deleteInterface.peerWarningHint")}
                </p>
              </div>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>

        {error && (
          <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3">
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        <AlertDialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            {tc("cancel")}
          </Button>
          <Button variant="destructive" onClick={handleDelete} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {tc("deleting")}
              </>
            ) : (
              t("deleteInterface.submit")
            )}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
