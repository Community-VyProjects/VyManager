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
import { AlertTriangle, Loader2, Gauge } from "lucide-react";
import { type QoSPolicy } from "@/lib/api/qos";

interface QoSDeleteConfirmModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => Promise<void>;
  policy: QoSPolicy;
}

export function QoSDeleteConfirmModal({
  open,
  onOpenChange,
  onConfirm,
  policy,
}: QoSDeleteConfirmModalProps) {
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    setLoading(true);
    try {
      await onConfirm();
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
            Delete QoS Policy
          </DialogTitle>
          <DialogDescription>
            Are you sure you want to delete this policy?
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Gauge className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="font-semibold">{policy.name}</p>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="outline">{policy.type}</Badge>
                {policy.bandwidth && (
                  <span className="text-xs text-muted-foreground">
                    {policy.bandwidth}
                  </span>
                )}
              </div>
            </div>
          </div>

          {policy.classes && policy.classes.length > 0 && (
            <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
              <p className="text-sm text-destructive">
                This policy has {policy.classes.length} class(es) configured.
                All classes will be deleted with the policy.
              </p>
            </div>
          )}

          <p className="text-sm text-muted-foreground">
            This action cannot be undone. Any interfaces using this policy will
            have their bindings removed.
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleDelete} disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Delete Policy
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
