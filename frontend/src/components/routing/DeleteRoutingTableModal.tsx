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
import { staticRoutesService, type RoutingTable } from "@/lib/api/static-routes";

interface DeleteRoutingTableModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  table: RoutingTable | null;
}

export function DeleteRoutingTableModal({
  open,
  onOpenChange,
  onSuccess,
  table,
}: DeleteRoutingTableModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async () => {
    if (!table) return;

    setError(null);
    setLoading(true);

    try {
      await staticRoutesService.deleteRoutingTable(table.table_id);
      onSuccess();
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete routing table");
    } finally {
      setLoading(false);
    }
  };

  if (!table) return null;

  const totalRoutes = table.ipv4_routes.length + table.ipv6_routes.length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Trash2 className="h-5 w-5 text-destructive" />
            Delete Routing Table
          </DialogTitle>
          <DialogDescription>
            Are you sure you want to delete this routing table?
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
              <span className="text-sm text-muted-foreground">Table ID:</span>
              <span className="text-sm font-mono font-medium">{table.table_id}</span>
            </div>
            {table.description && (
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Description:</span>
                <span className="text-sm">{table.description}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">IPv4 Routes:</span>
              <span className="text-sm font-mono">{table.ipv4_routes.length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">IPv6 Routes:</span>
              <span className="text-sm font-mono">{table.ipv6_routes.length}</span>
            </div>
          </div>

          {totalRoutes > 0 && (
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 mt-4 flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-destructive flex-shrink-0 mt-0.5" />
              <p className="text-sm text-destructive">
                This table contains {totalRoutes} route(s). Deleting the table will also remove all routes within it.
              </p>
            </div>
          )}
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
