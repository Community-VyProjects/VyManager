"use client";

import { Button } from "@/components/ui/button";
import { RefreshCw, X, Check } from "lucide-react";

interface FirewallReorderBannerProps {
  changesCount: number;
  onSave: () => void;
  onCancel: () => void;
  saving: boolean;
}

export function FirewallReorderBanner({
  changesCount,
  onSave,
  onCancel,
  saving,
}: FirewallReorderBannerProps) {
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-5 duration-300">
      <div className="bg-card border-2 border-primary shadow-2xl rounded-lg px-6 py-4 flex items-center gap-6">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
            <span className="text-lg font-bold text-primary">{changesCount}</span>
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">
              Reorder Pending
            </p>
            <p className="text-xs text-muted-foreground">
              {changesCount} rule{changesCount !== 1 ? "s" : ""} will be reordered
            </p>
          </div>
        </div>

        <div className="h-8 w-px bg-border" />

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onCancel}
            disabled={saving}
            className="gap-2"
          >
            <X className="h-4 w-4" />
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={onSave}
            disabled={saving}
            className="gap-2 bg-primary hover:bg-primary/90"
          >
            {saving ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Check className="h-4 w-4" />
                Save Order
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
