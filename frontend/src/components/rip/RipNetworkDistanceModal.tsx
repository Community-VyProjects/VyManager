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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AlertCircle, Loader2 } from "lucide-react";
import type { RipNetworkDistance } from "@/lib/api/rip";

interface RipNetworkDistanceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (entry: RipNetworkDistance) => Promise<void>;
  existingEntry?: RipNetworkDistance | null;
  existingPrefixes: string[];
  accessListNames: string[];
}

export function RipNetworkDistanceModal({
  open,
  onOpenChange,
  onSubmit,
  existingEntry,
  existingPrefixes,
  accessListNames,
}: RipNetworkDistanceModalProps) {
  const isEditMode = !!existingEntry;

  const [prefix, setPrefix] = useState("");
  const [distance, setDistance] = useState("");
  const [accessList, setAccessList] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    if (existingEntry) {
      setPrefix(existingEntry.prefix);
      setDistance(existingEntry.distance != null ? String(existingEntry.distance) : "");
      setAccessList(existingEntry.access_list || "");
    } else {
      setPrefix("");
      setDistance("");
      setAccessList("");
      setError(null);
    }
  }, [open, existingEntry]);

  const handleClose = () => {
    setPrefix("");
    setDistance("");
    setAccessList("");
    setError(null);
    onOpenChange(false);
  };

  const validate = (): string | null => {
    if (!prefix.trim()) return "Network prefix is required";
    if (!isEditMode && existingPrefixes.includes(prefix.trim())) {
      return "This prefix is already configured";
    }
    if (!distance.trim()) return "Distance is required";
    const dist = parseInt(distance.trim(), 10);
    if (isNaN(dist) || dist < 1 || dist > 255) return "Distance must be between 1 and 255";
    return null;
  };

  const handleSubmit = async () => {
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    const entry: RipNetworkDistance = {
      prefix: prefix.trim(),
      distance: parseInt(distance.trim(), 10),
      access_list: accessList || null,
    };

    try {
      setLoading(true);
      setError(null);
      await onSubmit(entry);
      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Operation failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEditMode ? "Edit Network Distance" : "Add Network Distance"}
          </DialogTitle>
          <DialogDescription>
            Set administrative distance for routes from a specific network.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Prefix */}
          <div className="space-y-2">
            <Label>Network Prefix</Label>
            <Input
              placeholder="e.g. 10.0.0.0/8"
              value={prefix}
              onChange={(e) => setPrefix(e.target.value)}
              disabled={isEditMode}
              className={isEditMode ? "bg-muted font-mono" : "font-mono"}
            />
          </div>

          {/* Distance */}
          <div className="space-y-2">
            <Label>Distance <span className="text-muted-foreground text-xs">(1-255)</span></Label>
            <Input
              type="number"
              min={1}
              max={255}
              placeholder="1-255"
              value={distance}
              onChange={(e) => setDistance(e.target.value)}
            />
          </div>

          {/* Access List */}
          <div className="space-y-2">
            <Label>Access List <span className="text-muted-foreground text-xs">(optional)</span></Label>
            <Select value={accessList || "none"} onValueChange={(v) => setAccessList(v === "none" ? "" : v)}>
              <SelectTrigger>
                <SelectValue placeholder="None" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {accessListNames.map((al) => (
                  <SelectItem key={al} value={al} className="font-mono">{al}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {error && (
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" />
            <pre className="text-sm text-destructive whitespace-pre-wrap flex-1">{error}</pre>
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
              "Add"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
