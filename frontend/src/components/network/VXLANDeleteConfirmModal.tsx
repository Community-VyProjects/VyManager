"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Loader2, Network } from "lucide-react";

interface VXLANDeleteConfirmModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => Promise<void>;
  interfaceName: string;
  mode: string;
}

export function VXLANDeleteConfirmModal({
  open,
  onOpenChange,
  onConfirm,
  interfaceName,
  mode,
}: VXLANDeleteConfirmModalProps) {
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    setLoading(true);
    try {
      await onConfirm();
      onOpenChange(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Delete VXLAN Interface
          </DialogTitle>
          <DialogDescription>
            Are you sure you want to delete this interface?
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Network className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="font-semibold">{interfaceName}</p>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="outline">{mode}</Badge>
              </div>
            </div>
          </div>

          <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
            <p className="text-sm text-destructive">
              This will remove the VXLAN interface and all its configuration.
              Any bridge or VRF associations will also be removed.
            </p>
          </div>

          <p className="text-sm text-muted-foreground">
            This action cannot be undone.
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleDelete} disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Delete Interface
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
