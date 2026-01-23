"use client";

import { Button } from "@/components/ui/button";
import { AlertCircle, Check, X, Loader2 } from "lucide-react";

interface AsPathListReorderBannerProps {
  onSave: () => void;
  onCancel: () => void;
  saving: boolean;
  count: number;
}

export function AsPathListReorderBanner({
  onSave,
  onCancel,
  saving,
  count,
}: AsPathListReorderBannerProps) {
  return (
    <div className="bg-primary/10 border-y border-primary/20 px-6 py-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <AlertCircle className="h-5 w-5 text-primary" />
          <div>
            <p className="text-sm font-medium text-foreground">
              You have reordered {count} rule{count !== 1 ? "s" : ""}
            </p>
            <p className="text-xs text-muted-foreground">
              Click "Save Changes" to apply the new order or "Cancel" to discard changes
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
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={onSave}
            disabled={saving}
          >
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {!saving && <Check className="h-4 w-4 mr-2" />}
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </div>
    </div>
  );
}
