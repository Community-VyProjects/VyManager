"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertCircle, Loader2 } from "lucide-react";
import type { AdminGroup } from "@/lib/api/traffic-engineering";

interface AdminGroupModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (group: AdminGroup) => Promise<void>;
  existingGroup?: AdminGroup | null;
}

export function AdminGroupModal({
  open,
  onOpenChange,
  onSubmit,
  existingGroup,
}: AdminGroupModalProps) {
  const isEditMode = !!existingGroup;

  const [name, setName] = useState("");
  const [bitPosition, setBitPosition] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      if (existingGroup) {
        setName(existingGroup.name);
        setBitPosition(existingGroup.bit_position != null ? String(existingGroup.bit_position) : "");
      } else {
        setName("");
        setBitPosition("");
      }
      setError(null);
    }
  }, [open, existingGroup]);

  const validate = (): string | null => {
    if (!name.trim()) return "Name is required";
    if (!/^[-a-zA-Z0-9]+$/.test(name.trim())) return "Name may only contain letters, numbers, and hyphens";
    if (bitPosition) {
      const v = parseInt(bitPosition, 10);
      if (isNaN(v) || v < 0 || v > 31 || String(v) !== bitPosition.trim())
        return "Bit position must be an integer between 0 and 31";
    }
    return null;
  };

  const handleSubmit = async () => {
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await onSubmit({
        name: name.trim(),
        bit_position: bitPosition ? parseInt(bitPosition, 10) : null,
      });
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Operation failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle>{isEditMode ? "Edit Admin Group" : "Add Admin Group"}</DialogTitle>
          <DialogDescription>
            Configure a Traffic Engineering admin group for link classification.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="ag-name">Name</Label>
            <Input
              id="ag-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. gold"
              disabled={isEditMode}
              className={isEditMode ? "bg-muted" : ""}
            />
            <p className="text-xs text-muted-foreground">Letters, numbers, and hyphens only</p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="ag-bit">Bit Position</Label>
            <Input
              id="ag-bit"
              type="number"
              min={0}
              max={31}
              value={bitPosition}
              onChange={(e) => setBitPosition(e.target.value)}
              placeholder="0 – 31 (optional)"
            />
          </div>
        </div>

        {error && (
          <div className="flex items-start gap-2 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <span className="whitespace-pre-wrap">{error}</span>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {isEditMode ? "Saving..." : "Creating..."}
              </>
            ) : isEditMode ? (
              "Save Changes"
            ) : (
              "Add Admin Group"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
