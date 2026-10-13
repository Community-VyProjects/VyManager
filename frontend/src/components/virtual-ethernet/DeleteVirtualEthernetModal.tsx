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
import { virtualEthernetService, type VirtualEthernetInterface } from "@/lib/api/virtual-ethernet";
import { ApiError } from "@/lib/types/api";

interface DeleteVirtualEthernetModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  interfaceData: VirtualEthernetInterface | null;
}

export function DeleteVirtualEthernetModal({
  open,
  onOpenChange,
  onSuccess,
  interfaceData,
}: DeleteVirtualEthernetModalProps) {
  const t = useTranslations("virtualEthernet");
  const tc = useTranslations("common");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async () => {
    if (!interfaceData) return;
    setLoading(true);
    setError(null);
    try {
      const result = await virtualEthernetService.deleteInterface(interfaceData.name);
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

  const subIfaceCount = interfaceData.vif.length + interfaceData.vif_s.length;

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
                {interfaceData.peer_name && (
                  <>{t("delete.peer")} <span className="font-medium text-foreground font-mono">{interfaceData.peer_name}</span></>
                )}
                {interfaceData.netns && (
                  <> &middot; {t("delete.namespace")} <span className="font-medium text-foreground font-mono">{interfaceData.netns}</span></>
                )}
                {interfaceData.addresses.length > 0 && (
                  <> &middot; {t("delete.addressCount", { count: interfaceData.addresses.length })}</>
                )}
                {subIfaceCount > 0 && (
                  <> &middot; {t("delete.subInterfaceCount", { count: subIfaceCount })}</>
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
