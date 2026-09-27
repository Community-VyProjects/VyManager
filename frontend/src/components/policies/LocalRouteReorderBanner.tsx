"use client";

import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";
import { useTranslations } from "next-intl";

interface LocalRouteReorderBannerProps {
  ruleCount: number;
  onSave: () => void;
  onCancel: () => void;
  saving: boolean;
}

export function LocalRouteReorderBanner({
  ruleCount,
  onSave,
  onCancel,
  saving,
}: LocalRouteReorderBannerProps) {
  const t = useTranslations("localRoute");
  const tc = useTranslations("common");
  return (
    <div className="bg-blue-500/10 border-y border-blue-500/20 px-6 py-3 flex items-center justify-between shrink-0">
      <div className="flex items-center gap-3">
        <AlertCircle className="h-5 w-5 text-blue-500" />
        <div>
          <p className="text-sm font-medium text-foreground">
            {t("banner.reordering", { count: ruleCount })}
          </p>
          <p className="text-xs text-muted-foreground">
            {t("banner.hint")}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={onCancel} disabled={saving}>
          {tc("cancel")}
        </Button>
        <Button size="sm" onClick={onSave} disabled={saving}>
          {saving ? tc("saving") : t("banner.saveOrder")}
        </Button>
      </div>
    </div>
  );
}
