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
import { AlertCircle } from "lucide-react";
import { flowtablesService, type Flowtable } from "@/lib/api/firewall-flowtables";

interface DeleteFlowtableModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  flowtable: Flowtable | null;
}

export function DeleteFlowtableModal({
  open,
  onOpenChange,
  onSuccess,
  flowtable,
}: DeleteFlowtableModalProps) {
  const t = useTranslations("firewallFlowtables");
  const tc = useTranslations("common");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async () => {
    if (!flowtable) return;

    setLoading(true);
    setError(null);

    try {
      await flowtablesService.deleteFlowtable(flowtable.name);
      onSuccess();
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("delete.failed"));
    } finally {
      setLoading(false);
    }
  };

  if (!flowtable) return null;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
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
            <p className="text-sm text-destructive">{error}</p>
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
