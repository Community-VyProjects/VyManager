"use client";

import { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { AlertCircle } from "lucide-react";
import { flowtablesService, type Flowtable } from "@/lib/api/firewall-flowtables";

interface DeleteFlowtableModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  flowtable: Flowtable | null;
}

export function DeleteFlowtableModal({
  open,
  onOpenChange,
  onSuccess,
  flowtable,
}: DeleteFlowtableModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async () => {
    if (!flowtable) return;

    setLoading(true);
    setError(null);

    try {
      await flowtablesService.deleteFlowtable(flowtable.name);
      onSuccess();
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete flowtable");
    } finally {
      setLoading(false);
    }
  };

  if (!flowtable) return null;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Flowtable</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete the flowtable{" "}
            <span className="font-mono font-semibold">{flowtable.name}</span>?
            This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>

        {error && (
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 flex items-start gap-2">
            <AlertCircle className="h-5 w-5 text-destructive mt-0.5 flex-shrink-0" />
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        <div className="bg-muted rounded-lg p-3 text-sm">
          <p className="font-medium mb-2">This will remove:</p>
          <ul className="list-disc list-inside space-y-1 text-muted-foreground">
            <li>Flowtable configuration for {flowtable.name}</li>
            {flowtable.interfaces.length > 0 && (
              <li>Interface bindings: {flowtable.interfaces.join(", ")}</li>
            )}
            {flowtable.offload && (
              <li>Offload type: {flowtable.offload}</li>
            )}
          </ul>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={loading}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {loading ? "Deleting..." : "Delete Flowtable"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
