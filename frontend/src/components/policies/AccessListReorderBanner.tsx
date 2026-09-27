"use client";

import { Button } from "@/components/ui/button";
import { Check, X, AlertCircle } from "lucide-react";
import { useTranslations } from "next-intl";

interface AccessListReorderBannerProps {
  onSave: () => void;
  onCancel: () => void;
  saving: boolean;
  count: number;
}

export function AccessListReorderBanner({
  onSave,
  onCancel,
  saving,
  count,
}: AccessListReorderBannerProps) {
  const t = useTranslations("accessList");
  const tc = useTranslations("common");
  return (
    <div className="bg-blue-500/10 border-y border-blue-500/20 px-6 py-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <AlertCircle className="h-5 w-5 text-blue-500" />
          <div>
            <p className="text-sm font-medium text-foreground">
              {t("banner.title")}
            </p>
            <p className="text-xs text-muted-foreground">
              {t("banner.renumbered", { count })}
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
            className="bg-blue-500 hover:bg-blue-600"
          >
            <Check className="h-4 w-4 mr-2" />
            {saving ? tc("saving") : t("banner.saveOrder")}
          </Button>
        </div>
      </div>
    </div>
  );
}
