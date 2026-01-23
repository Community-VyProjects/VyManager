"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AlertCircle } from "lucide-react";
import { routeMapService } from "@/lib/api/route-map";
import type { RouteMap } from "@/lib/api/route-map";

interface EditRouteMapModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  routeMap: RouteMap | null;
}

export function EditRouteMapModal({ open, onOpenChange, onSuccess, routeMap }: EditRouteMapModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [description, setDescription] = useState("");

  useEffect(() => {
    if (open && routeMap) {
      setDescription(routeMap.description || "");
    }
  }, [open, routeMap]);

  const handleSubmit = async () => {
    if (!routeMap) return;

    setLoading(true);
    setError(null);

    try {
      await routeMapService.updateRouteMap(
        routeMap.name,
        routeMap,
        description.trim() || null
      );

      onOpenChange(false);
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update route-map");
    } finally {
      setLoading(false);
    }
  };

  if (!routeMap) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Route Map</DialogTitle>
          <DialogDescription>
            Update route-map description and metadata
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Route-Map Name</Label>
            <Input value={routeMap.name} disabled className="bg-muted" />
            <p className="text-xs text-muted-foreground">
              Name cannot be changed. Delete and recreate to change name.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Optional description for this route-map"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>

          <div className="bg-muted/50 border rounded-lg p-3">
            <p className="text-sm text-muted-foreground">
              This route-map has {routeMap.rules.length} rule{routeMap.rules.length !== 1 ? 's' : ''}.
              To edit rules, use the rule management options in the main table.
            </p>
          </div>
        </div>

        {error && (
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? "Updating..." : "Update Route Map"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
