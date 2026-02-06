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
import { Badge } from "@/components/ui/badge";
import { AlertCircle, Loader2, Trash2 } from "lucide-react";
import { staticRoutesService, type StaticRoute } from "@/lib/api/static-routes";

interface DeleteTableRouteModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  tableId: number;
  route: StaticRoute | null;
}

export function DeleteTableRouteModal({
  open,
  onOpenChange,
  onSuccess,
  tableId,
  route,
}: DeleteTableRouteModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async () => {
    if (!route) return;

    setError(null);
    setLoading(true);

    try {
      await staticRoutesService.deleteTableRoute(tableId, route.destination, route.route_type);
      onSuccess();
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete route");
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
            Delete Route from Table {tableId}
          </DialogTitle>
          <DialogDescription>
            Are you sure you want to delete this route from the routing table?
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
              <span className="text-sm text-muted-foreground">Destination:</span>
              <span className="text-sm font-mono">{route.destination}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Type:</span>
              <Badge variant="outline" className={route.route_type === "ipv4" ? "bg-green-500/10 text-green-500" : "bg-purple-500/10 text-purple-500"}>
                {route.route_type.toUpperCase()}
              </Badge>
            </div>
            {route.description && (
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Description:</span>
                <span className="text-sm">{route.description}</span>
              </div>
            )}
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
            {route.blackhole && (
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Type:</span>
                <Badge variant="outline" className="bg-red-500/10 text-red-500">Blackhole</Badge>
              </div>
            )}
            {route.reject && (
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Type:</span>
                <Badge variant="outline" className="bg-orange-500/10 text-orange-500">Reject</Badge>
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
