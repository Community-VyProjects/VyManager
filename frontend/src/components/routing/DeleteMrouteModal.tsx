"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertCircle, Loader2, Trash2 } from "lucide-react";
import { staticRoutesService, type MulticastRoute } from "@/lib/api/static-routes";

interface DeleteMrouteModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  route: MulticastRoute | null;
}

export function DeleteMrouteModal({
  open,
  onOpenChange,
  onSuccess,
  route,
}: DeleteMrouteModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async () => {
    if (!route) return;

    setError(null);
    setLoading(true);

    try {
      await staticRoutesService.deleteMroute(route.prefix);
      onSuccess();
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete multicast route");
    } finally {
      setLoading(false);
    }
  };

  if (!route) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Trash2 className="h-5 w-5 text-destructive" />
            Delete Multicast Route
          </DialogTitle>
          <DialogDescription>
            Are you sure you want to delete this multicast route?
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {error && (
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 flex items-start gap-2 mb-4">
              <AlertCircle className="h-4 w-4 text-destructive flex-shrink-0 mt-0.5" />
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          <div className="bg-muted/50 rounded-lg p-4 space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Prefix:</span>
              <span className="text-sm font-mono">{route.prefix}</span>
            </div>
            {route.next_hops.length > 0 && (
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Next Hops:</span>
                <span className="text-sm font-mono">{route.next_hops.length}</span>
              </div>
            )}
            {route.interfaces.length > 0 && (
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Interfaces:</span>
                <span className="text-sm font-mono">{route.interfaces.length}</span>
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleDelete} disabled={loading}>
            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
