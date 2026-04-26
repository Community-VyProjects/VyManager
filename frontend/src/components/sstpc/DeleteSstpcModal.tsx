"use client";

import { useState } from "react";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Loader2 } from "lucide-react";
import { sstpcService, type SstpcInterface } from "@/lib/api/sstpc";
import { ApiError } from "@/lib/types/api";

interface DeleteSstpcModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  interfaceData: SstpcInterface | null;
}

export function DeleteSstpcModal({
  open,
  onOpenChange,
  onSuccess,
  interfaceData,
}: DeleteSstpcModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async () => {
    if (!interfaceData) return;

    setLoading(true);
    setError(null);

    try {
      const result = await sstpcService.deleteInterface(interfaceData.name);

      if (result.success) {
        onOpenChange(false);
        onSuccess();
      } else {
        setError(result.error || "Failed to delete SSTPC interface");
      }
    } catch (err) {
      setError((err as ApiError).message || "Failed to delete SSTPC interface");
    } finally {
      setLoading(false);
    }
  };

  if (!interfaceData) return null;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Delete Interface: {interfaceData.name}
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-2">
            <p>
              Are you sure you want to delete this SSTPC interface? This will
              tear down the SSTP session and cannot be undone.
            </p>
            <div className="rounded-lg bg-muted/50 border p-3 mt-2">
              <p className="text-sm text-muted-foreground">
                {interfaceData.server && (
                  <>
                    Server:{" "}
                    <span className="font-medium text-foreground">
                      {interfaceData.server}
                    </span>
                    {interfaceData.port && (
                      <span className="text-muted-foreground">:{interfaceData.port}</span>
                    )}
                  </>
                )}
                {interfaceData.authentication?.username && (
                  <>
                    {interfaceData.server ? " · " : ""}User:{" "}
                    <span className="font-medium text-foreground">
                      {interfaceData.authentication.username}
                    </span>
                  </>
                )}
                {interfaceData.description && (
                  <>
                    {" "}
                    &middot;{" "}
                    <span className="text-muted-foreground">{interfaceData.description}</span>
                  </>
                )}
              </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>

        {error && (
          <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3">
            <pre className="text-sm text-destructive whitespace-pre-wrap">{error}</pre>
          </div>
        )}

        <AlertDialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleDelete} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Deleting...
              </>
            ) : (
              "Delete Interface"
            )}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
