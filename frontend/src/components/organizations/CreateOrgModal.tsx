"use client";

import { useState } from "react";
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
import { orgService } from "@/lib/api/org";
import { ApiError } from "@/lib/types/api";

interface CreateOrgModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function CreateOrgModal({ open, onOpenChange, onSuccess }: CreateOrgModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");

  const resetForm = () => {
    setName("");
    setSlug("");
    setDescription("");
    setError(null);
  };

  const handleClose = () => {
    resetForm();
    onOpenChange(false);
  };

  const handleNameChange = (value: string) => {
    setName(value);
    // Auto-generate slug from name
    const generated = value
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-/, "");
    setSlug(generated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError("Organization name is required");
      return;
    }
    if (!slug.trim()) {
      setError("Slug is required");
      return;
    }
    if (!/^[a-z0-9][a-z0-9-]*$/.test(slug)) {
      setError("Slug must start with a letter or number and contain only lowercase letters, numbers, and hyphens");
      return;
    }

    setLoading(true);
    try {
      await orgService.createOrg({
        name: name.trim(),
        slug: slug.trim(),
        description: description.trim() || undefined,
      });
      handleClose();
      onSuccess();
    } catch (err) {
      setError((err as ApiError).message || "Failed to create organization");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Organization</DialogTitle>
          <DialogDescription>
            Create a new organization to group sites and users.
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
              placeholder="My Organization"
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              disabled={loading}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="orgSlug">Slug <span className="text-destructive">*</span></Label>
            <Input
              id="orgSlug"
              placeholder="my-organization"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              disabled={loading}
              className="font-mono text-sm"
              required
            />
            <p className="text-xs text-muted-foreground">
              URL-friendly identifier. Lowercase letters, numbers, and hyphens only.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="orgDescription">
              Description <span className="text-muted-foreground text-xs">(Optional)</span>
            </Label>
            <Textarea
              id="orgDescription"
              placeholder="Describe this organization..."
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
              {loading ? "Creating..." : "Create Organization"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
