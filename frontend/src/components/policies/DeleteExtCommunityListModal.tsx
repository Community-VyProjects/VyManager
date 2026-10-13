"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { AlertCircle, AlertTriangle } from "lucide-react";
import { extcommunityListService, type ExtCommunityList } from "@/lib/api/extcommunity-list";

interface DeleteExtCommunityListModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  extcommunityList: ExtCommunityList | null;
}

export function DeleteExtCommunityListModal({
  open,
  onOpenChange,
  onSuccess,
  extcommunityList,
}: DeleteExtCommunityListModalProps) {
  const t = useTranslations("bgpLists");
  const tc = useTranslations("common");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async () => {
    if (!extcommunityList) return;

    setLoading(true);
    setError(null);

    try {
      await extcommunityListService.deleteExtCommunityList(extcommunityList.name);
      onOpenChange(false);
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("shared.failedToDeleteList", { listType: t("types.extCommunity.modalName") }));
    } finally {
      setLoading(false);
    }
  };

  if (!extcommunityList) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("shared.deleteList", { listType: t("types.extCommunity.title") })}</DialogTitle>
          <DialogDescription>
            {t("shared.deleteListConfirm", { listType: t("types.extCommunity.modalName") })}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-destructive">
                {t("shared.deletingList", { listType: t("types.extCommunity.modalName"), name: extcommunityList.name })}
              </p>
              {extcommunityList.description && (
                <p className="text-sm text-muted-foreground mt-1">
                  {extcommunityList.description}
                </p>
              )}
              <p className="text-sm text-muted-foreground mt-2">
                {t("shared.willDeleteRules", { count: extcommunityList.rules.length })}
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
            {loading ? tc("deleting") : t("shared.deleteList", { listType: t("types.extCommunity.title") })}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
