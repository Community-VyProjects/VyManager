"use client";

import { useState } from "react";
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
import { useTranslations } from "next-intl";
import type { ApiError } from "@/lib/types/api";
import { staticRoutesService, type MulticastRoute } from "@/lib/api/static-routes";
import type { MrouteFeatures } from "@/lib/api/static-routes-save-ops";

interface DeleteMrouteModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  route: MulticastRoute | null;
  features: MrouteFeatures;
}

export function DeleteMrouteModal({
  open,
  onOpenChange,
  onSuccess,
  route,
  features,
}: DeleteMrouteModalProps) {
  const t = useTranslations("routingExtras");
  const tc = useTranslations("common");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleOpenChange = (next: boolean) => {
    if (!next && loading) return;
    if (!next) setError(null);
    onOpenChange(next);
  };

  const handleDelete = async () => {
    if (!route) return;

    setError(null);
    setLoading(true);

    try {
      const result = await staticRoutesService.deleteMroute(route, features);
      if (!result.success) {
        setError(result.error || t("deleteMroute.failed"));
        return;
      }
      onSuccess();
      onOpenChange(false);
    } catch (err) {
      setError((err as ApiError).message || t("deleteMroute.failed"));
    } finally {
      setLoading(false);
    }
  };

  if (!route) return null;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Trash2 className="h-5 w-5 text-destructive" />
            {t("deleteMroute.title")}
          </DialogTitle>
          <DialogDescription>
            {t("deleteMroute.description")}
          </DialogDescription>
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
              <span className="text-sm text-muted-foreground">{t("deleteMroute.prefix")}</span>
              <span className="text-sm font-mono">{route.prefix}</span>
            </div>
            {route.next_hops.length > 0 && (
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">{t("deleteMroute.nextHops")}</span>
                <span className="text-sm font-mono">{route.next_hops.length}</span>
              </div>
            )}
            {route.interfaces.length > 0 && (
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">{t("deleteMroute.interfaces")}</span>
                <span className="text-sm font-mono">{route.interfaces.length}</span>
              </div>
            )}
          </div>
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
