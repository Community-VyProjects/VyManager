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
import { virtualEthernetService, type VirtualEthernetInterface } from "@/lib/api/virtual-ethernet";
import { ApiError } from "@/lib/types/api";

interface DeleteVirtualEthernetModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  interfaceData: VirtualEthernetInterface | null;
}

export function DeleteVirtualEthernetModal({
  open,
  onOpenChange,
  onSuccess,
  interfaceData,
}: DeleteVirtualEthernetModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async () => {
    if (!interfaceData) return;
    setLoading(true);
    setError(null);
    try {
      const result = await virtualEthernetService.deleteInterface(interfaceData.name);
      if (result.success) {
        onOpenChange(false);
        onSuccess();
      } else {
        setError(result.error || "Failed to delete virtual-ethernet interface");
      }
    } catch (err) {
      setError((err as ApiError).message || "Failed to delete virtual-ethernet interface");
    } finally {
      setLoading(false);
    }
  };

  if (!interfaceData) return null;

  const subIfaceCount = interfaceData.vif.length + interfaceData.vif_s.length;

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
              Are you sure you want to delete this virtual-ethernet interface? This action
              cannot be undone.
            </p>
            <div className="rounded-lg bg-muted/50 border p-3 mt-2">
              <p className="text-sm text-muted-foreground">
                {interfaceData.peer_name && (
                  <>Peer: <span className="font-medium text-foreground font-mono">{interfaceData.peer_name}</span></>
                )}
                {interfaceData.netns && (
                  <> &middot; Namespace: <span className="font-medium text-foreground font-mono">{interfaceData.netns}</span></>
                )}
                {interfaceData.addresses.length > 0 && (
                  <> &middot; {interfaceData.addresses.length} address{interfaceData.addresses.length !== 1 ? "es" : ""}</>
                )}
                {subIfaceCount > 0 && (
                  <> &middot; {subIfaceCount} sub-interface{subIfaceCount !== 1 ? "s" : ""}</>
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
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
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
