"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { AlertCircle, AlertTriangle } from "lucide-react";
import { asPathListService, type AsPathList } from "@/lib/api/as-path-list";

interface DeleteAsPathListModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  asPathList: AsPathList | null;
}

export function DeleteAsPathListModal({
  open,
  onOpenChange,
  onSuccess,
  asPathList,
}: DeleteAsPathListModalProps) {
  const t = useTranslations("bgpLists");
  const tc = useTranslations("common");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async () => {
    if (!asPathList) return;

    setLoading(true);
    setError(null);

    try {
      await asPathListService.deleteAsPathList(asPathList.name);
      onOpenChange(false);
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("shared.failedToDeleteList", { listType: t("types.asPath.modalName") }));
    } finally {
      setLoading(false);
    }
  };

  if (!asPathList) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("shared.deleteList", { listType: t("types.asPath.title") })}</DialogTitle>
          <DialogDescription>
            {t("shared.deleteListConfirm", { listType: t("types.asPath.modalName") })}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-destructive">
                {t("shared.deletingList", { listType: t("types.asPath.modalName"), name: asPathList.name })}
              </p>
              {asPathList.description && (
                <p className="text-sm text-muted-foreground mt-1">
                  {asPathList.description}
                </p>
              )}
              <p className="text-sm text-muted-foreground mt-2">
                {t("shared.willDeleteRules", { count: asPathList.rules.length })}
              </p>
            </div>
          </div>

          {error && (
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            {tc("cancel")}
          </Button>
          <Button variant="destructive" onClick={handleDelete} disabled={loading}>
            {loading ? tc("deleting") : t("shared.deleteList", { listType: t("types.asPath.title") })}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
