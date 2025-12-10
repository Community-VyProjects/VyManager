"use client";

import { Button } from "@/components/ui/button";
import { AlertCircle, Check, X } from "lucide-react";

interface RouteReorderBannerProps {
  onSave: () => void;
  onCancel: () => void;
  saving: boolean;
  count: number;
}

export function RouteReorderBanner({
  onSave,
  onCancel,
  saving,
  count,
}: RouteReorderBannerProps) {
  return (
    <div className="bg-blue-50 dark:bg-blue-950 border-y border-blue-200 dark:border-blue-800 px-6 py-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          <div>
            <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
              Rule Order Changed
            </p>
            <p className="text-xs text-blue-700 dark:text-blue-300">
              {count} rule{count !== 1 ? "s" : ""} will be reordered
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onCancel}
            disabled={saving}
            className="border-blue-300 dark:border-blue-700"
          >
            <X className="h-4 w-4 mr-2" />
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={onSave}
            disabled={saving}
            className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600"
          >
            <Check className="h-4 w-4 mr-2" />
            {saving ? "Saving..." : "Save Order"}
          </Button>
        </div>
      </div>
    </div>
  );
}
