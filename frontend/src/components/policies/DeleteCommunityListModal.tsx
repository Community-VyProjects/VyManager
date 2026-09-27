"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { AlertCircle, AlertTriangle } from "lucide-react";
import { communityListService, type CommunityList } from "@/lib/api/community-list";

interface DeleteCommunityListModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  communityList: CommunityList | null;
}

export function DeleteCommunityListModal({
  open,
  onOpenChange,
  onSuccess,
  communityList,
}: DeleteCommunityListModalProps) {
  const t = useTranslations("bgpLists");
  const tc = useTranslations("common");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async () => {
    if (!communityList) return;

    setLoading(true);
    setError(null);

    try {
      await communityListService.deleteCommunityList(communityList.name);
      onOpenChange(false);
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("shared.failedToDeleteList", { listType: t("types.community.modalName") }));
    } finally {
      setLoading(false);
    }
  };

  if (!communityList) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("shared.deleteList", { listType: t("types.community.title") })}</DialogTitle>
          <DialogDescription>
            {t("shared.deleteListConfirm", { listType: t("types.community.modalName") })}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-destructive">
                {t("shared.deletingList", { listType: t("types.community.modalName"), name: communityList.name })}
              </p>
              {communityList.description && (
                <p className="text-sm text-muted-foreground mt-1">
                  {communityList.description}
                </p>
              )}
              <p className="text-sm text-muted-foreground mt-2">
                {t("shared.willDeleteRules", { count: communityList.rules.length })}
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
            {loading ? tc("deleting") : t("shared.deleteList", { listType: t("types.community.title") })}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
