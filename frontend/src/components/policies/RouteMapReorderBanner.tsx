"use client";

import { AlertCircle, Check, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";

interface RouteMapReorderBannerProps {
  onSave: () => void;
  onCancel: () => void;
  saving: boolean;
  count: number;
}

export function RouteMapReorderBanner({
  onSave,
  onCancel,
  saving,
  count,
}: RouteMapReorderBannerProps) {
  const t = useTranslations("routeMap");
  const tc = useTranslations("common");
  return (
    <div className="bg-primary/10 border-y border-primary/20 px-6 py-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <AlertCircle className="h-5 w-5 text-primary" />
          <div>
            <p className="text-sm font-medium text-foreground">
              {t("reorder.title")}
            </p>
            <p className="text-xs text-muted-foreground">
              {t("reorder.renumber", { count })}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onCancel}
            disabled={saving}
          >
            <X className="h-4 w-4 mr-2" />
            {tc("cancel")}
          </Button>
          <Button size="sm" onClick={onSave} disabled={saving}>
            <Check className="h-4 w-4 mr-2" />
            {saving ? tc("saving") : t("reorder.saveOrder")}
          </Button>
        </div>
      </div>
    </div>
  );
}
