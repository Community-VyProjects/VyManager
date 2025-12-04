"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertCircle, ListFilter } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { prefixListService, type PrefixList } from "@/lib/api/prefix-list";

interface EditPrefixListModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  prefixList: PrefixList | null;
}

export function EditPrefixListModal({ open, onOpenChange, onSuccess, prefixList }: EditPrefixListModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [description, setDescription] = useState("");

  useEffect(() => {
    if (open && prefixList) {
      setDescription(prefixList.description || "");
    }
  }, [open, prefixList]);

  const handleClose = () => {
    setError(null);
    setDescription("");
    onOpenChange(false);
  };

  const handleSubmit = async () => {
    if (!prefixList) return;

    setLoading(true);
    setError(null);

    try {
      await prefixListService.updatePrefixListDescription(
        prefixList.name,
        prefixList.list_type,
        description || null
      );
      handleClose();
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update prefix list");
    } finally {
      setLoading(false);
    }
  };

  if (!prefixList) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Edit Prefix List</DialogTitle>
          <DialogDescription>
            Update the description for this prefix list
          </DialogDescription>
        </DialogHeader>

        {/* Prefix List Details */}
        <div className="space-y-4 py-4">
          <div className="border rounded-lg p-4 space-y-3">
            <div className="flex items-center gap-2">
              <ListFilter className="h-4 w-4 text-muted-foreground" />
              <span className="font-mono text-sm font-medium">{prefixList.name}</span>
              <Badge variant="outline">
                {prefixList.list_type.toUpperCase()}
              </Badge>
              <Badge variant="secondary">
                {prefixList.rules.length} rule{prefixList.rules.length !== 1 ? "s" : ""}
              </Badge>
            </div>
          </div>

          {/* Description Field */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Input
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter prefix list description (optional)"
              disabled={loading}
            />
            <p className="text-xs text-muted-foreground">
              Leave empty to remove the description
            </p>
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
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? "Updating..." : "Update Prefix List"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
