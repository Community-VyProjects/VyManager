"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { NamedListSelect } from "@/components/ui/named-list-select";
import { AlertCircle, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { routeMapService } from "@/lib/api/route-map";
import { staticRoutesService } from "@/lib/api/static-routes";
import type { ApiError } from "@/lib/types/api";

interface StaticRouteMapModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  /** `protocols static route-map` as loaded ("" when unset). */
  current: string;
}

export function StaticRouteMapModal({ open, onOpenChange, onSuccess, current }: StaticRouteMapModalProps) {
  const t = useTranslations("staticRoutes");
  const tc = useTranslations("common");
  const [value, setValue] = useState(current);
  const [names, setNames] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const seedKey = open ? current : null;
  const [seed, setSeed] = useState(seedKey);
  if (seedKey !== seed) {
    setSeed(seedKey);
    setValue(current);
    setError(null);
  }

  useEffect(() => {
    if (!open) return;
    let live = true;
    routeMapService
      .getConfig()
      .then((config) => {
        if (live) setNames(config.route_maps.map((routeMap) => routeMap.name));
      })
      .catch(() => {
        if (live) setNames([]);
      });
    return () => {
      live = false;
    };
  }, [open]);

  const handleOpenChange = (next: boolean) => {
    if (!next && saving) return;
    onOpenChange(next);
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const result = await staticRoutesService.saveRouteMap(current, value);
      if (result && !result.success) {
        setError(result.error || t("routeMap.saveFailed"));
        return;
      }
      if (result) onSuccess();
      onOpenChange(false);
    } catch (err) {
      setError((err as ApiError).message || t("routeMap.saveFailed"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t("routeMap.title")}</DialogTitle>
          <DialogDescription>{t("routeMap.description")}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {error && (
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-destructive flex-shrink-0 mt-0.5" />
              <p className="text-sm text-destructive whitespace-pre-wrap">{error}</p>
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="static-route-map">{t("routeMap.label")}</Label>
            <NamedListSelect id="static-route-map" value={value} names={names} onValueChange={setValue} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={saving}>
            {tc("cancel")}
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {tc("save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
