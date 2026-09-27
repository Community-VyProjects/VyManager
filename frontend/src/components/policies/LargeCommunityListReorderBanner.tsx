"use client";

import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { AlertCircle, Check, X, Loader2 } from "lucide-react";

interface LargeCommunityListReorderBannerProps {
  onSave: () => void;
  onCancel: () => void;
  saving: boolean;
  count: number;
}

export function LargeCommunityListReorderBanner({
  onSave,
  onCancel,
  saving,
  count,
}: LargeCommunityListReorderBannerProps) {
  const t = useTranslations("bgpLists");
  const tc = useTranslations("common");
  return (
    <div className="bg-primary/10 border-y border-primary/20 px-6 py-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <AlertCircle className="h-5 w-5 text-primary" />
          <div>
            <p className="text-sm font-medium text-foreground">
              {t("shared.reorderedCount", { count })}
            </p>
            <p className="text-xs text-muted-foreground">
              {t("shared.reorderHint")}
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
          <Button
            size="sm"
            onClick={onSave}
            disabled={saving}
          >
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {!saving && <Check className="h-4 w-4 mr-2" />}
            {saving ? tc("saving") : t("shared.saveChanges")}
          </Button>
        </div>
      </div>
    </div>
  );
}
