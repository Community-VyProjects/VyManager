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
import type { RoutingTable } from "@/lib/api/static-routes";
import { lockedIdentity, modalIsEdit, modalWriteKind } from "@/lib/modal-mode";
import {
  emptyRoutingTableDraft,
  routingTableDraftFrom,
  submitRoutingTableCreate,
  submitRoutingTableUpdate,
  validateRoutingTableCreate,
  type RoutingTableDraft,
} from "./static-routes-form";

interface RoutingTableModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  existing?: RoutingTable | null;
}

export function RoutingTableModal({
  open,
  onOpenChange,
  onSuccess,
  existing,
}: RoutingTableModalProps) {
  const isEdit = modalIsEdit(existing);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState<RoutingTableDraft>(emptyRoutingTableDraft());

  useEffect(() => {
    if (!open) return;
    if (existing) {
      setDraft(routingTableDraftFrom(existing));
    } else {
      setDraft(emptyRoutingTableDraft());
    }
    setError(null);
  }, [open, existing]);

  const patch = (fields: Partial<RoutingTableDraft>) => setDraft((d) => ({ ...d, ...fields }));
  const lockedTableId = lockedIdentity(existing, (t) => t.table_id.toString(), draft.tableId);

  const handleSubmit = async () => {
    if (!isEdit) {
      const validationError = validateRoutingTableCreate(draft);
      if (validationError) {
        setError(validationError);
        return;
      }
    }

    const write = modalWriteKind(existing ? { name: existing.table_id.toString() } : null);
    setLoading(true);
    setError(null);

    try {
      const result =
        write.kind === "update" && existing
          ? await submitRoutingTableUpdate(existing, draft)
          : await submitRoutingTableCreate(draft);
      if (result && result.success === false) {
        setError(result.error || "Operation failed");
        return;
      }
      onSuccess();
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : isEdit ? "Failed to update routing table" : "Failed to create routing table");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? `Edit Routing Table ${existing.table_id}` : "Create Routing Table"}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update the description for this routing table"
              : "Create a custom routing table for policy-based routing"}
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
              value={lockedTableId.value}
              disabled={lockedTableId.disabled}
              className={lockedTableId.disabled ? "bg-muted" : undefined}
              onChange={(e) => patch({ tableId: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description (optional)</Label>
            <Input
              id="description"
              placeholder="Description for this routing table"
              value={draft.description}
              onChange={(e) => patch({ description: e.target.value })}
            />
          </div>

          {isEdit && (
            <div className="bg-muted/50 rounded-lg p-3 space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">IPv4 Routes:</span>
                <span className="font-mono">{existing.ipv4_routes.length}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">IPv6 Routes:</span>
                <span className="font-mono">{existing.ipv6_routes.length}</span>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {isEdit ? "Save Changes" : "Create Table"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
