"use client";

import { useState, type ReactNode } from "react";
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
import { macsecService, type MacsecInterface } from "@/lib/api/macsec";
import type { ApiError } from "@/lib/types/api";

interface DeleteMacsecModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  interfaceData: MacsecInterface | null;
}

export function DeleteMacsecModal({
  open,
  onOpenChange,
  onSuccess,
  interfaceData,
}: DeleteMacsecModalProps) {
  const t = useTranslations("macsec");
  const tc = useTranslations("common");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async () => {
    if (!interfaceData) return;

    setLoading(true);
    setError(null);

    try {
      await macsecService.deleteInterface(interfaceData.name);
      onOpenChange(false);
      onSuccess();
    } catch (err) {
      setError((err as ApiError).message || t("delete.failed"));
    } finally {
      setLoading(false);
    }
  };

  const handleOpenChange = (next: boolean) => {
    if (!next && loading) return;
    onOpenChange(next);
  };

  if (!interfaceData) return null;

  const securityMode = interfaceData.security?.static ? t("delete.modeStatic") : interfaceData.security?.mka ? "MKA" : null;
  const strong = (chunks: ReactNode) => <span className="font-medium text-foreground">{chunks}</span>;

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogContent className="max-h-[85vh] overflow-y-auto">
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
                  <>{t.rich("delete.source", { value: interfaceData.source_interface, strong })}</>
                )}
                {interfaceData.security?.cipher && (
                  <> &middot; {t.rich("delete.cipher", { value: interfaceData.security.cipher, strong })}</>
                )}
                {securityMode && (
                  <> &middot; {t.rich("delete.mode", { value: securityMode, strong })}</>
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
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
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
              tc("deleteInterface")
            )}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
