"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertCircle, ListFilter } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useTranslations } from "next-intl";
import { prefixListService, type PrefixList } from "@/lib/api/prefix-list";

interface DeletePrefixListModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  prefixList: PrefixList | null;
}

export function DeletePrefixListModal({ open, onOpenChange, onSuccess, prefixList }: DeletePrefixListModalProps) {
  const t = useTranslations("prefixList");
  const tc = useTranslations("common");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleClose = () => {
    setError(null);
    onOpenChange(false);
  };

  const handleDelete = async () => {
    if (!prefixList) return;

    setLoading(true);
    setError(null);

    try {
      await prefixListService.deletePrefixList(prefixList.name, prefixList.list_type);
      handleClose();
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("delete.failed"));
    } finally {
      setLoading(false);
    }
  };

  if (!prefixList) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t("delete.title")}</DialogTitle>
          <DialogDescription>
            {t("delete.description")}
          </DialogDescription>
        </DialogHeader>

        {/* Prefix List Details */}
        <div className="space-y-4 py-4">
          <div className="border rounded-lg p-4 space-y-3">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <ListFilter className="h-4 w-4 text-muted-foreground" />
                  <span className="font-mono text-sm font-medium">{prefixList.name}</span>
                  <Badge variant="outline">
                    {prefixList.list_type.toUpperCase()}
                  </Badge>
                  <Badge variant="secondary">
                    {t("ruleCount", { count: prefixList.rules.length })}
                  </Badge>
                </div>
                {prefixList.description && (
                  <p className="text-sm text-muted-foreground pl-6">{prefixList.description}</p>
                )}
              </div>
            </div>
          </div>

          {/* Warning */}
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="text-sm font-medium text-destructive">
                {t("delete.warning")}
              </p>
              <p className="text-sm text-muted-foreground">
                {t("delete.warningDetail")}
              </p>
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={loading}>
            {tc("cancel")}
          </Button>
          <Button variant="destructive" onClick={handleDelete} disabled={loading}>
            {loading ? tc("deleting") : t("delete.submit")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
