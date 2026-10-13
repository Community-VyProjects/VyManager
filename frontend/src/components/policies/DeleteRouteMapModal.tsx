"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertCircle, AlertTriangle } from "lucide-react";
import { routeMapService } from "@/lib/api/route-map";
import type { RouteMap } from "@/lib/api/route-map";

interface DeleteRouteMapModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  routeMap: RouteMap | null;
}

export function DeleteRouteMapModal({ open, onOpenChange, onSuccess, routeMap }: DeleteRouteMapModalProps) {
  const t = useTranslations("routeMap");
  const tc = useTranslations("common");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async () => {
    if (!routeMap) return;

    setLoading(true);
    setError(null);

    try {
      await routeMapService.deleteRouteMap(routeMap.name);
      onOpenChange(false);
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("delete.deleteFailed"));
    } finally {
      setLoading(false);
    }
  };

  if (!routeMap) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("delete.title")}</DialogTitle>
          <DialogDescription>
            {t("delete.description")}
          </DialogDescription>
        </DialogHeader>

        <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-medium text-destructive">
              {t("delete.deleting", { name: routeMap.name })}
            </p>
            {routeMap.rules.length > 0 && (
              <p className="text-sm text-muted-foreground mt-1">
                {t("delete.willDelete", { count: routeMap.rules.length })}
              </p>
            )}
          </div>
        </div>

        {error && (
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
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
