"use client";

import { useState } from "react";
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
import { AlertCircle, Loader2, Trash2 } from "lucide-react";
import { vrfService } from "@/lib/api/vrf";

interface DeleteVrfModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vrfName: string;
  onDeleted: () => void;
}

export function DeleteVrfModal({
  open,
  onOpenChange,
  vrfName,
  onDeleted,
}: DeleteVrfModalProps) {
  const [confirmation, setConfirmation] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleClose = (isOpen: boolean) => {
    if (!isOpen) {
      setConfirmation("");
      setError(null);
    }
    onOpenChange(isOpen);
  };

  const handleDelete = async () => {
    if (confirmation !== vrfName) return;

    setDeleting(true);
    setError(null);

    try {
      const result = await vrfService.deleteVrf(vrfName);
      if (!result.success) {
        throw new Error(result.error || "Failed to delete VRF");
      }
      setConfirmation("");
      onDeleted();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete VRF");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <Trash2 className="h-5 w-5" />
            Delete VRF
          </DialogTitle>
          <DialogDescription>
            This will permanently delete VRF <strong>{vrfName}</strong> and all
            its associated configuration including protocols, routes, and services.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {error && (
            <div className="flex items-center gap-2 p-3 bg-destructive/10 text-destructive rounded-lg text-sm">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              {error}
            </div>
          )}

          <div className="p-3 bg-destructive/5 border border-destructive/20 rounded-lg">
            <p className="text-sm text-muted-foreground">
              Type <strong>{vrfName}</strong> to confirm deletion.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirm-name">VRF Name</Label>
            <Input
              id="confirm-name"
              placeholder={vrfName}
              value={confirmation}
              onChange={(e) => setConfirmation(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleClose(false)} disabled={deleting}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={deleting || confirmation !== vrfName}
          >
            {deleting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Delete VRF
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
