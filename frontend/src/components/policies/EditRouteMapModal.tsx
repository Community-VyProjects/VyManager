"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, Map as MapIcon } from "lucide-react";
import { routeMapService, type RouteMap, type RouteMapCapabilities } from "@/lib/api/route-map";
import {
  descriptionMaxLength,
  mapFormFrom,
  routeMapProblem,
  type RouteMapForm,
} from "@/lib/api/route-map-save-ops";
import type { ApiError } from "@/lib/types/api";

interface EditRouteMapModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  routeMap: RouteMap;
  capabilities: RouteMapCapabilities | null;
}

/** The route-map's own leaves (its description); rules are edited from the table. */
export function EditRouteMapModal({ open, onOpenChange, onSuccess, routeMap, capabilities }: EditRouteMapModalProps) {
  const t = useTranslations("routeMap");
  const tl = useTranslations("routeMap.mapErrors");
  const tc = useTranslations("common");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<RouteMapForm>(() => mapFormFrom(routeMap));

  const handleSubmit = async () => {
    const problem = routeMapProblem(form, null, capabilities);
    if (problem) {
      setError(tl(problem.key, { max: problem.max ?? "" }));
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await routeMapService.updateRouteMap(routeMap, form);
      onOpenChange(false);
      onSuccess();
    } catch (err) {
      setError((err as ApiError).message || t("edit.failed"));
    } finally {
      setLoading(false);
    }
  };

  const handleOpenChange = (next: boolean) => {
    if (!next && loading) return;
    onOpenChange(next);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("edit.title")}</DialogTitle>
          <DialogDescription>{t("edit.description")}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="border rounded-lg p-4">
            <div className="flex items-center gap-2">
              <MapIcon className="h-4 w-4 text-muted-foreground" />
              <span className="font-mono text-sm font-medium">{routeMap.name}</span>
              <Badge variant="secondary">{t("ruleCount", { count: routeMap.rules.length })}</Badge>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="route-map-edit-description">{tc("description")}</Label>
            <Input
              id="route-map-edit-description"
              value={form.description}
              maxLength={descriptionMaxLength(capabilities)}
              onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
              disabled={loading}
            />
          </div>
        </div>

        {error && (
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
            <p className="text-sm text-destructive whitespace-pre-wrap">{error}</p>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={loading}>
            {tc("cancel")}
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? tc("saving") : tc("saveChanges")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
