"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertCircle, Loader2, Trash2 } from "lucide-react";
import { staticRoutesService, type RoutingTable } from "@/lib/api/static-routes";
import type { ApiError } from "@/lib/types/api";

interface DeleteRoutingTableModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  table: RoutingTable | null;
}

export function DeleteRoutingTableModal({
  open,
  onOpenChange,
  onSuccess,
  table,
}: DeleteRoutingTableModalProps) {
  const t = useTranslations("staticRoutes");
  const tc = useTranslations("common");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleOpenChange = (next: boolean) => {
    if (!next && loading) return;
    if (!next) setError(null);
    onOpenChange(next);
  };

  const handleDelete = async () => {
    if (!table) return;

    setError(null);
    setLoading(true);

    try {
      const result = await staticRoutesService.deleteRoutingTable(table.table_id);
      if (!result.success) {
        setError(result.error || t("deleteTableModal.failed"));
        return;
      }
      onSuccess();
      onOpenChange(false);
    } catch (err) {
      setError((err as ApiError).message || t("deleteTableModal.failed"));
    } finally {
      setLoading(false);
    }
  };

  if (!table) return null;

  const totalRoutes = table.ipv4_routes.length + table.ipv6_routes.length;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Trash2 className="h-5 w-5 text-destructive" />
            {t("deleteTableModal.title")}
          </DialogTitle>
          <DialogDescription>{t("deleteTableModal.description")}</DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {error && (
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 flex items-start gap-2 mb-4">
              <AlertCircle className="h-4 w-4 text-destructive flex-shrink-0 mt-0.5" />
              <p className="text-sm text-destructive whitespace-pre-wrap">{error}</p>
            </div>
          )}

          <div className="bg-muted/50 rounded-lg p-4 space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">{t("deleteTableModal.tableId")}</span>
              <span className="text-sm font-mono font-medium">{table.table_id}</span>
            </div>
            {table.description && (
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">{t("deleteTableModal.descriptionLabel")}</span>
                <span className="text-sm">{table.description}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">{t("deleteTableModal.ipv4Routes")}</span>
              <span className="text-sm font-mono">{table.ipv4_routes.length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">{t("deleteTableModal.ipv6Routes")}</span>
              <span className="text-sm font-mono">{table.ipv6_routes.length}</span>
            </div>
          </div>

          {totalRoutes > 0 && (
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 mt-4 flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-destructive flex-shrink-0 mt-0.5" />
              <p className="text-sm text-destructive">
                {t("deleteModal.tableContainsRoutes", { count: totalRoutes })}
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={loading}>
            {tc("cancel")}
          </Button>
          <Button variant="destructive" onClick={handleDelete} disabled={loading}>
            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {tc("delete")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
