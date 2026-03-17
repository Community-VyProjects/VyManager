"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertCircle, Loader2 } from "lucide-react";
import { staticRoutesService, type RoutingTable } from "@/lib/api/static-routes";

interface EditRoutingTableModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  table: RoutingTable | null;
}

export function EditRoutingTableModal({
  open,
  onOpenChange,
  onSuccess,
  table,
}: EditRoutingTableModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [description, setDescription] = useState("");

  useEffect(() => {
    if (open && table) {
      setDescription(table.description || "");
      setError(null);
    }
  }, [open, table]);

  const handleSubmit = async () => {
    if (!table) return;

    setError(null);
    setLoading(true);

    try {
      await staticRoutesService.updateRoutingTableDescription(table.table_id, description);
      onSuccess();
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update routing table");
    } finally {
      setLoading(false);
    }
  };

  if (!table) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Routing Table {table.table_id}</DialogTitle>
          <DialogDescription>
            Update the description for this routing table
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {error && (
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-destructive flex-shrink-0 mt-0.5" />
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          <div className="space-y-2">
            <Label>Table ID</Label>
            <Input
              value={table.table_id.toString()}
              disabled
              className="bg-muted"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Input
              id="description"
              placeholder="Description for this routing table"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="bg-muted/50 rounded-lg p-3 space-y-1">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">IPv4 Routes:</span>
              <span className="font-mono">{table.ipv4_routes.length}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">IPv6 Routes:</span>
              <span className="font-mono">{table.ipv6_routes.length}</span>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
