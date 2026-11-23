"use client";

import { useState, type MouseEvent } from "react";
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
import { AlertCircle } from "lucide-react";
import { flowtablesService, type Flowtable } from "@/lib/api/firewall-flowtables";
import type { ApiError } from "@/lib/types/api";

interface DeleteFlowtableModalProps {
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  flowtable: Flowtable;
}

/** Mount with a key per flowtable so an error never carries over. */
export function DeleteFlowtableModal({
  onOpenChange,
  onSuccess,
  flowtable,
}: DeleteFlowtableModalProps) {
  const t = useTranslations("firewallFlowtables");
  const tc = useTranslations("common");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const close = (open: boolean) => {
    if (!loading) onOpenChange(open);
  };

  const handleDelete = async (event: MouseEvent) => {
    // AlertDialogAction closes on click; stay open until the commit succeeds.
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await flowtablesService.deleteFlowtable(flowtable.name);
      onSuccess();
      onOpenChange(false);
    } catch (err) {
      setError((err as ApiError).message || t("delete.failed"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AlertDialog open onOpenChange={close}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("delete.title")}</AlertDialogTitle>
          <AlertDialogDescription>
            {t.rich("delete.confirm", {
              name: flowtable.name,
              b: (chunks) => <span className="font-mono font-semibold">{chunks}</span>,
            })}
          </AlertDialogDescription>
        </AlertDialogHeader>

        {error && (
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 flex items-start gap-2">
            <AlertCircle className="h-5 w-5 text-destructive mt-0.5 flex-shrink-0" />
            <p className="text-sm text-destructive whitespace-pre-wrap">{error}</p>
          </div>
        )}

        <div className="bg-muted rounded-lg p-3 text-sm">
          <p className="font-medium mb-2">{t("delete.willRemove")}</p>
          <ul className="list-disc list-inside space-y-1 text-muted-foreground">
            <li>{t("delete.removeConfig", { name: flowtable.name })}</li>
            {flowtable.interfaces.length > 0 && (
              <li>{t("delete.removeBindings", { interfaces: flowtable.interfaces.join(", ") })}</li>
            )}
            {flowtable.offload && (
              <li>{t("delete.removeOffload", { offload: flowtable.offload })}</li>
            )}
          </ul>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>{tc("cancel")}</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={loading}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {loading ? tc("deleting") : t("delete.title")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
