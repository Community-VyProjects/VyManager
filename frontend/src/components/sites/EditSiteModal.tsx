"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AlertCircle, Loader2, Building2 } from "lucide-react";
import { sessionService, Site } from "@/lib/api/session";

interface EditSiteModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  site: Site | null;
}

export function EditSiteModal({
  open,
  onOpenChange,
  onSuccess,
  site,
}: EditSiteModalProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (site && open) {
      setName(site.name);
      setDescription(site.description || "");
    }
  }, [site, open]);

  const handleClose = () => {
    setName("");
    setDescription("");
    setError(null);
    onOpenChange(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!site) return;

    if (!name.trim()) {
      setError("Site name is required");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await sessionService.updateSite(site.id, {
        name: name.trim(),
        description: description.trim() || null,
      });

      handleClose();
      onSuccess();
    } catch (err: any) {
      setError(err.message || "Failed to update site");
    } finally {
      setLoading(false);
    }
  };

  if (!site) return null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="rounded-lg bg-primary/10 p-2">
              <Building2 className="h-5 w-5 text-primary" />
            </div>
            <div>
              <DialogTitle>Edit Site</DialogTitle>
              <DialogDescription>
                Update site information
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            {/* Error Display */}
            {error && (
              <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-3">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-destructive">{error}</p>
                </div>
              </div>
            )}

            {/* Site Name */}
            <div className="space-y-2">
              <Label htmlFor="name" className="required">
                Site Name
              </Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Main Office, Data Center 1"
                disabled={loading}
                required
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Description (Optional)</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Additional information about this site..."
                rows={3}
                disabled={loading}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
