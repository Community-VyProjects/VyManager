"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AlertCircle } from "lucide-react";
import { routeMapService } from "@/lib/api/route-map";
import type { RouteMap } from "@/lib/api/route-map";

interface EditRouteMapModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  routeMap: RouteMap | null;
}

export function EditRouteMapModal({ open, onOpenChange, onSuccess, routeMap }: EditRouteMapModalProps) {
  const t = useTranslations("routeMap");
  const tc = useTranslations("common");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [description, setDescription] = useState("");

  useEffect(() => {
    if (open && routeMap) {
      setDescription(routeMap.description || "");
    }
  }, [open, routeMap]);

  const handleSubmit = async () => {
    if (!routeMap) return;

    setLoading(true);
    setError(null);

    try {
      await routeMapService.updateRouteMap(
        routeMap.name,
        routeMap,
        description.trim() || null
      );

      onOpenChange(false);
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("edit.updateFailed"));
    } finally {
      setLoading(false);
    }
  };

  if (!routeMap) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("edit.title")}</DialogTitle>
          <DialogDescription>
            {t("edit.description")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>{t("edit.nameLabel")}</Label>
            <Input value={routeMap.name} disabled className="bg-muted" />
            <p className="text-xs text-muted-foreground">
              {t("edit.nameHint")}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">{tc("description")}</Label>
            <Textarea
              id="description"
              placeholder={t("edit.descriptionPlaceholder")}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>

          <div className="bg-muted/50 border rounded-lg p-3">
            <p className="text-sm text-muted-foreground">
              {t("edit.rulesInfo", { count: routeMap.rules.length })}
            </p>
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
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? t("edit.updating") : t("edit.submit")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
