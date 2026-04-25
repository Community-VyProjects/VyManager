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
import { pppoeService, type PppoeInterface } from "@/lib/api/pppoe";
import { ApiError } from "@/lib/types/api";

interface DeletePppoeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  interfaceData: PppoeInterface | null;
}

export function DeletePppoeModal({
  open,
  onOpenChange,
  onSuccess,
  interfaceData,
}: DeletePppoeModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async () => {
    if (!interfaceData) return;

    setLoading(true);
    setError(null);

    try {
      const result = await pppoeService.deleteInterface(interfaceData.name);

      if (result.success) {
        onOpenChange(false);
        onSuccess();
      } else {
        setError(result.error || "Failed to delete PPPoE interface");
      }
    } catch (err) {
      setError((err as ApiError).message || "Failed to delete PPPoE interface");
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
              Are you sure you want to delete this PPPoE interface? This will
              tear down the session and cannot be undone.
            </p>
            <div className="rounded-lg bg-muted/50 border p-3 mt-2">
              <p className="text-sm text-muted-foreground">
                {interfaceData.source_interface && (
                  <>
                    Source:{" "}
                    <span className="font-medium text-foreground">
                      {interfaceData.source_interface}
                    </span>
                  </>
                )}
                {interfaceData.access_concentrator && (
                  <>
                    {" "}
                    &middot; AC:{" "}
                    <span className="font-medium text-foreground">
                      {interfaceData.access_concentrator}
                    </span>
                  </>
                )}
                {interfaceData.service_name && (
                  <>
                    {" "}
                    &middot; Service:{" "}
                    <span className="font-medium text-foreground">
                      {interfaceData.service_name}
                    </span>
                  </>
                )}
                {interfaceData.authentication?.username && (
                  <>
                    {" "}
                    &middot; User:{" "}
                    <span className="font-medium text-foreground">
                      {interfaceData.authentication.username}
                    </span>
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
