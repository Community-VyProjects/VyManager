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
import { AlertCircle, Loader2 } from "lucide-react";
import type { ContainerRegistry } from "@/lib/api/container";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  registry: ContainerRegistry | null;
  onConfirm: () => Promise<void>;
}

export function DeleteRegistryModal({ open, onOpenChange, registry, onConfirm }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConfirm = async () => {
    setLoading(true);
    setError(null);
    try {
      await onConfirm();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to delete registry");
      setLoading(false);
      return;
    }
    setLoading(false);
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) setError(null);
    onOpenChange(open);
  };

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Registry</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete registry{" "}
            <span className="font-mono font-semibold">{registry?.name}</span>? This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>

        {error && (
          <div className="flex items-start gap-2 rounded-lg bg-destructive/10 border border-destructive/20 p-3">
            <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
            <p className="text-sm text-destructive whitespace-pre-wrap">{error}</p>
          </div>
        )}

        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={loading}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Deleting…
              </>
            ) : (
              "Delete Registry"
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
