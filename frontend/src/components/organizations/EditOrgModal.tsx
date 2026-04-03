"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, AlertCircle } from "lucide-react";
import { Organization, orgService } from "@/lib/api/org";
import { ApiError } from "@/lib/types/api";

interface EditOrgModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  org: Organization;
  onSuccess: () => void;
}

export function EditOrgModal({ open, onOpenChange, org, onSuccess }: EditOrgModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  useEffect(() => {
    if (open) {
      setName(org.name);
      setDescription(org.description || "");
      setError(null);
    }
  }, [open, org]);

  const handleClose = () => {
    setError(null);
    onOpenChange(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError("Organization name is required");
      return;
    }

    setLoading(true);
    try {
      await orgService.updateOrg(org.id, {
        name: name.trim(),
        description: description.trim() || undefined,
      });
      handleClose();
      onSuccess();
    } catch (err) {
      setError((err as ApiError).message || "Failed to update organization");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Organization</DialogTitle>
          <DialogDescription>
            Update organization details. The slug cannot be changed.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="orgName">Name <span className="text-destructive">*</span></Label>
            <Input
              id="orgName"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={loading}
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Slug</Label>
            <Input value={org.slug} disabled className="font-mono text-sm bg-muted" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="orgDescription">
              Description <span className="text-muted-foreground text-xs">(Optional)</span>
            </Label>
            <Textarea
              id="orgDescription"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={loading}
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {loading ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
