"use client";

import { AlertCircle, Save, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

interface NATReorderBannerProps {
  changesCount: number;
  onSave: () => void;
  onCancel: () => void;
  saving: boolean;
}

export function NATReorderBanner({ changesCount, onSave, onCancel, saving }: NATReorderBannerProps) {
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom duration-300">
      <Card className="shadow-lg border-2 border-primary bg-card">
        <div className="flex items-center gap-4 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
              <AlertCircle className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="font-semibold text-foreground">
                Rules have been reordered
              </p>
              <p className="text-sm text-muted-foreground">
                Do you want to save your changes?
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 ml-4">
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
              <Save className="h-4 w-4" />
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
