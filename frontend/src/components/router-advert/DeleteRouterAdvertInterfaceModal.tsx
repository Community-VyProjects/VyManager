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
import { AlertCircle, Loader2 } from "lucide-react";
import { routerAdvertService } from "@/lib/api/router-advert";

interface DeleteRouterAdvertInterfaceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  interfaceName: string;
  prefixCount: number;
  routeCount: number;
  nat64Count: number;
  onSuccess: () => void;
}

export function DeleteRouterAdvertInterfaceModal({
  open,
  onOpenChange,
  interfaceName,
  prefixCount,
  routeCount,
  nat64Count,
  onSuccess,
}: DeleteRouterAdvertInterfaceModalProps) {
  const t = useTranslations("routerAdvert");
  const tc = useTranslations("common");
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async () => {
    setDeleting(true);
    setError(null);
    try {
      await routerAdvertService.deleteInterface(interfaceName);
      onSuccess();
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : tc("operationFailed"));
      setDeleting(false);
    }
  };

  const counts: string[] = [];
  if (prefixCount > 0) counts.push(t("delete.prefixCount", { count: prefixCount }));
  if (routeCount > 0) counts.push(t("delete.routeCount", { count: routeCount }));
  if (nat64Count > 0) counts.push(t("delete.nat64Count", { count: nat64Count }));

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
            {counts.length > 0 && (
              <>
                {" "}{t("delete.alsoRemove", { items: counts.join(t("delete.separator")) })}
              </>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>

        {error && (
          <div className="flex items-start gap-2 rounded-md border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
            <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
            <span className="whitespace-pre-wrap">{error}</span>
          </div>
        )}

        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleting}>{tc("cancel")}</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              handleDelete();
            }}
            disabled={deleting}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {deleting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            {t("delete.remove")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
