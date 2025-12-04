"use client";

import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";

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
  return (
    <div className="bg-blue-500/10 border-y border-blue-500/20 px-6 py-3 flex items-center justify-between shrink-0">
      <div className="flex items-center gap-3">
        <AlertCircle className="h-5 w-5 text-blue-500" />
        <div>
          <p className="text-sm font-medium text-foreground">
            Reordering {ruleCount} rule{ruleCount !== 1 ? "s" : ""}
          </p>
          <p className="text-xs text-muted-foreground">
            Rules will be renumbered sequentially when you save
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={onCancel} disabled={saving}>
          Cancel
        </Button>
        <Button size="sm" onClick={onSave} disabled={saving}>
          {saving ? "Saving..." : "Save Order"}
        </Button>
      </div>
    </div>
  );
}
