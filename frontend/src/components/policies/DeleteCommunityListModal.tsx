"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertCircle, AlertTriangle } from "lucide-react";
import { communityListService, type CommunityList } from "@/lib/api/community-list";

interface DeleteCommunityListModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  communityList: CommunityList | null;
}

export function DeleteCommunityListModal({
  open,
  onOpenChange,
  onSuccess,
  communityList,
}: DeleteCommunityListModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async () => {
    if (!communityList) return;

    setLoading(true);
    setError(null);

    try {
      await communityListService.deleteCommunityList(communityList.name);
      onOpenChange(false);
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete Community list");
    } finally {
      setLoading(false);
    }
  };

  if (!communityList) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete Community List</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete this Community list? This action cannot be undone.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-destructive">
                Deleting Community list: {communityList.name}
              </p>
              {communityList.description && (
                <p className="text-sm text-muted-foreground mt-1">
                  {communityList.description}
                </p>
              )}
              <p className="text-sm text-muted-foreground mt-2">
                This will delete {communityList.rules.length} rule{communityList.rules.length !== 1 ? "s" : ""}.
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
            {loading ? "Deleting..." : "Delete Community List"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
