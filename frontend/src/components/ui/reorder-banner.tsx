"use client";

import { Button } from "@/components/ui/button";
import { RefreshCw, X, Check, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface ReorderBannerProps {
  count: number;
  onSave: () => void;
  onCancel: () => void;
  saving: boolean;
  label?: string;
  variant?: "inline" | "floating";
}

function ReorderBanner({
  count,
  onSave,
  onCancel,
  saving,
  label = "rule",
  variant = "inline",
}: ReorderBannerProps) {
  if (variant === "floating") {
    return (
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-5 duration-300">
        <div className="bg-card border border-border shadow-lg rounded-lg px-5 py-3 flex items-center gap-5">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center">
              <span className="text-sm font-bold text-primary">{count}</span>
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">
                Reorder pending
              </p>
              <p className="text-xs text-muted-foreground">
                {count} {label}{count !== 1 ? "s" : ""} will be reordered
              </p>
            </div>
          </div>
          <div className="h-7 w-px bg-border" />
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={onCancel} disabled={saving}>
              <X className="h-3.5 w-3.5 mr-1.5" />
              Cancel
            </Button>
            <Button size="sm" onClick={onSave} disabled={saving}>
              {saving ? (
                <>
                  <RefreshCw className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Check className="h-3.5 w-3.5 mr-1.5" />
                  Save Order
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Inline variant
  return (
    <div className="bg-primary/10 border-y border-primary/20 px-5 py-3 shrink-0">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <AlertCircle className="h-4 w-4 text-primary" />
          <div>
            <p className="text-sm font-medium text-foreground">
              Reorder in progress
            </p>
            <p className="text-xs text-muted-foreground">
              {count} {label}{count !== 1 ? "s" : ""} will be renumbered
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={onCancel} disabled={saving}>
            <X className="h-3.5 w-3.5 mr-1.5" />
            Cancel
          </Button>
          <Button size="sm" onClick={onSave} disabled={saving}>
            {saving ? (
              <>
                <RefreshCw className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Check className="h-3.5 w-3.5 mr-1.5" />
                Save Order
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

export { ReorderBanner };
export type { ReorderBannerProps };
