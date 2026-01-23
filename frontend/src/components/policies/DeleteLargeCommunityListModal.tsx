"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertCircle, AlertTriangle } from "lucide-react";
import { largeCommunityListService, type LargeCommunityList } from "@/lib/api/large-community-list";

interface DeleteLargeCommunityListModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  largeCommunityList: LargeCommunityList | null;
}

export function DeleteLargeCommunityListModal({
  open,
  onOpenChange,
  onSuccess,
  largeCommunityList,
}: DeleteLargeCommunityListModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async () => {
    if (!largeCommunityList) return;

    setLoading(true);
    setError(null);

    try {
      await largeCommunityListService.deleteLargeCommunityList(largeCommunityList.name);
      onOpenChange(false);
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete large community list");
    } finally {
      setLoading(false);
    }
  };

  if (!largeCommunityList) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete Large Community List</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete this large community list? This action cannot be undone.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-destructive">
                Deleting large community list: {largeCommunityList.name}
              </p>
              {largeCommunityList.description && (
                <p className="text-sm text-muted-foreground mt-1">
                  {largeCommunityList.description}
                </p>
              )}
              <p className="text-sm text-muted-foreground mt-2">
                This will delete {largeCommunityList.rules.length} rule{largeCommunityList.rules.length !== 1 ? "s" : ""}.
              </p>
            </div>
          </div>

          {error && (
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleDelete} disabled={loading}>
            {loading ? "Deleting..." : "Delete Large Community List"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
