"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertCircle, Loader2 } from "lucide-react";
import { NhrpShortcutTarget } from "@/lib/api/nhrp";

interface NhrpShortcutTargetModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (target: string, holdingTime: string) => Promise<void>;
  existingTarget: NhrpShortcutTarget | null;
}

export function NhrpShortcutTargetModal({
  open,
  onOpenChange,
  onSubmit,
  existingTarget,
}: NhrpShortcutTargetModalProps) {
  const isEditMode = existingTarget !== null;

  const [target, setTarget] = useState("");
  const [holdingTime, setHoldingTime] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setTarget(existingTarget?.target ?? "");
      setHoldingTime(existingTarget?.holding_time ?? "");
      setError(null);
    }
  }, [open, existingTarget]);

  const handleClose = () => {
    if (!loading) onOpenChange(false);
  };

  const handleSubmit = async () => {
    if (!target.trim()) {
      setError("Target prefix is required");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await onSubmit(target.trim(), holdingTime.trim());
      onOpenChange(false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Operation failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEditMode ? "Edit Shortcut Target" : "Add Shortcut Target"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="sctarget-prefix">Target Prefix</Label>
            {isEditMode ? (
              <p className="text-sm font-mono font-medium px-3 py-2 bg-muted rounded-md">
                {existingTarget?.target}
              </p>
            ) : (
              <Input
                id="sctarget-prefix"
                value={target}
                onChange={(e) => setTarget(e.target.value)}
                placeholder="e.g. 10.0.0.0/8"
              />
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="sctarget-holding-time">Holding Time (seconds)</Label>
            <Input
              id="sctarget-holding-time"
              value={holdingTime}
              onChange={(e) => setHoldingTime(e.target.value)}
              placeholder="Optional"
              type="number"
            />
          </div>
        </div>

        {error && (
          <div className="flex items-start gap-2 rounded-lg bg-destructive/10 border border-destructive/20 p-3">
            <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
            <p className="text-sm text-destructive whitespace-pre-wrap">{error}</p>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {isEditMode ? "Saving..." : "Adding..."}
              </>
            ) : isEditMode ? (
              "Save Changes"
            ) : (
              "Add Target"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
