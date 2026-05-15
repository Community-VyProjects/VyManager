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
import { AlertCircle, Loader2 } from "lucide-react";
import { bridgeService } from "@/lib/api/bridge";
import { ApiError } from "@/lib/types/api";

interface DeleteBridgeVifModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  interfaceName: string;
  vlanId: string | null;
}

export function DeleteBridgeVifModal({
  open,
  onOpenChange,
  onSuccess,
  interfaceName,
  vlanId,
}: DeleteBridgeVifModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async () => {
    if (!vlanId) return;
    setLoading(true);
    setError(null);
    try {
      const result = await bridgeService.deleteVif(interfaceName, vlanId);
      if (result.success) {
        onOpenChange(false);
        onSuccess();
      } else {
        setError(result.error || "Failed to delete VIF");
      }
    } catch (err) {
      setError((err as ApiError).message || "Failed to delete VIF");
    } finally {
      setLoading(false);
    }
  };

  if (!vlanId) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Delete VIF {vlanId}</DialogTitle>
          <DialogDescription>
            This will permanently remove VIF <strong>{vlanId}</strong> from{" "}
            <strong>{interfaceName}</strong> and all its configuration.
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3 flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" />
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        <DialogFooter>
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
              "Delete VIF"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
