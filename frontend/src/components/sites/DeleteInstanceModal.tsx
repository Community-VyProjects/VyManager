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
import { AlertCircle, Loader2, AlertTriangle } from "lucide-react";
import { sessionService, Instance } from "@/lib/api/session";

interface DeleteInstanceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  instance: Instance | null;
  userRole: string;
}

export function DeleteInstanceModal({
  open,
  onOpenChange,
  onSuccess,
  instance,
  userRole,
}: DeleteInstanceModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleClose = () => {
    setError(null);
    onOpenChange(false);
  };

  const handleDelete = async () => {
    if (!instance) return;

    setLoading(true);
    setError(null);

    try {
      await sessionService.deleteInstance(instance.id);
      handleClose();
      onSuccess();
    } catch (err: any) {
      setError(err.message || "Failed to delete instance");
    } finally {
      setLoading(false);
    }
  };

  if (!instance) return null;

  const canDelete = userRole === "OWNER" || userRole === "ADMIN";

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="rounded-lg bg-destructive/10 p-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
            </div>
            <div>
              <DialogTitle>Delete Instance</DialogTitle>
              <DialogDescription>
                This action cannot be undone
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

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

          {/* Warning Message */}
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4">
            <p className="text-sm text-foreground mb-2">
              Are you sure you want to delete <strong>{instance.name}</strong>?
            </p>
            <div className="text-sm text-muted-foreground space-y-1 mt-2">
              <p>• Host: {instance.host}:{instance.port}</p>
              {instance.description && <p>• {instance.description}</p>}
            </div>
          </div>

          {/* Permission Note */}
          {!canDelete && (
            <div className="rounded-lg border border-warning/30 bg-warning/5 p-3">
              <p className="text-sm text-warning">
                Only OWNER and ADMIN can delete instances. Your role: {userRole}
              </p>
            </div>
          )}
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
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={loading || !canDelete}
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Deleting...
              </>
            ) : (
              "Delete Instance"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
