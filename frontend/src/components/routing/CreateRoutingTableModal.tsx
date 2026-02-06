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
import { staticRoutesService } from "@/lib/api/static-routes";

interface CreateRoutingTableModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function CreateRoutingTableModal({
  open,
  onOpenChange,
  onSuccess,
}: CreateRoutingTableModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form fields
  const [tableId, setTableId] = useState("");
  const [description, setDescription] = useState("");

  useEffect(() => {
    if (open) {
      resetForm();
    }
  }, [open]);

  const resetForm = () => {
    setTableId("");
    setDescription("");
    setError(null);
  };

  const handleSubmit = async () => {
    setError(null);

    // Validation
    if (!tableId) {
      setError("Table ID is required");
      return;
    }

    const tableIdNum = parseInt(tableId);
    if (isNaN(tableIdNum) || tableIdNum < 1 || tableIdNum > 200) {
      setError("Table ID must be a number between 1 and 200");
      return;
    }

    setLoading(true);

    try {
      await staticRoutesService.createRoutingTable(tableIdNum, description || undefined);
      onSuccess();
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create routing table");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Create Routing Table</DialogTitle>
          <DialogDescription>
            Create a custom routing table for policy-based routing
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
            <Label htmlFor="table-id">Table ID (1-200)</Label>
            <Input
              id="table-id"
              type="number"
              min="1"
              max="200"
              placeholder="100"
              value={tableId}
              onChange={(e) => setTableId(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description (optional)</Label>
            <Input
              id="description"
              placeholder="Description for this routing table"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Create Table
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
