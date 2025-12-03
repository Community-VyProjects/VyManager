"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertCircle, AlertTriangle } from "lucide-react";
import { routeMapService } from "@/lib/api/route-map";
import type { RouteMap } from "@/lib/api/route-map";

interface DeleteRouteMapModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  routeMap: RouteMap | null;
}

export function DeleteRouteMapModal({ open, onOpenChange, onSuccess, routeMap }: DeleteRouteMapModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async () => {
    if (!routeMap) return;

    setLoading(true);
    setError(null);

    try {
      await routeMapService.deleteRouteMap(routeMap.name);
      onOpenChange(false);
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete route-map");
    } finally {
      setLoading(false);
    }
  };

  if (!routeMap) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete Route Map</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete this route-map? This action cannot be undone.
          </DialogDescription>
        </DialogHeader>

        <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-medium text-destructive">
              Deleting route-map: {routeMap.name}
            </p>
            {routeMap.rules.length > 0 && (
              <p className="text-sm text-muted-foreground mt-1">
                This will delete {routeMap.rules.length} rule{routeMap.rules.length !== 1 ? 's' : ''}
              </p>
            )}
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
          <Button variant="destructive" onClick={handleDelete} disabled={loading}>
            {loading ? "Deleting..." : "Delete Route Map"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
