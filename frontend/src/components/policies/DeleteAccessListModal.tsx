"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertCircle, ListFilter } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { accessListService, type AccessList } from "@/lib/api/access-list";

interface DeleteAccessListModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  accessList: AccessList | null;
}

export function DeleteAccessListModal({ open, onOpenChange, onSuccess, accessList }: DeleteAccessListModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleClose = () => {
    setError(null);
    onOpenChange(false);
  };

  const handleDelete = async () => {
    if (!accessList) return;

    setLoading(true);
    setError(null);

    try {
      await accessListService.deleteAccessList(accessList.number, accessList.list_type);
      handleClose();
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete access list");
    } finally {
      setLoading(false);
    }
  };

  if (!accessList) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Delete Access List</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete this access list? This action cannot be undone.
          </DialogDescription>
        </DialogHeader>

        {/* Access List Details */}
        <div className="space-y-4 py-4">
          <div className="border rounded-lg p-4 space-y-3">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <ListFilter className="h-4 w-4 text-muted-foreground" />
                  <span className="font-mono text-sm font-medium">{accessList.number}</span>
                  <Badge variant="outline">
                    {accessList.list_type.toUpperCase()}
                  </Badge>
                  <Badge variant="secondary">
                    {accessList.rules.length} rule{accessList.rules.length !== 1 ? "s" : ""}
                  </Badge>
                </div>
                {accessList.description && (
                  <p className="text-sm text-muted-foreground pl-6">{accessList.description}</p>
                )}
              </div>
            </div>
          </div>

          {/* Warning */}
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="text-sm font-medium text-destructive">
                This will permanently delete the access list and all its rules
              </p>
              <p className="text-sm text-muted-foreground">
                Any traffic filtering rules configured in this access list will be removed.
              </p>
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={loading}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleDelete} disabled={loading}>
            {loading ? "Deleting..." : "Delete Access List"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
