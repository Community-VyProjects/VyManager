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
import { RefreshCw, AlertCircle, AlertTriangle } from "lucide-react";
import { bridgeFirewallService, type BridgeChain } from "@/lib/api/firewall-bridge";

interface DeleteCustomBridgeChainModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  chain: BridgeChain;
  onSuccess: () => void;
}

export function DeleteCustomBridgeChainModal({
  open,
  onOpenChange,
  chain,
  onSuccess,
}: DeleteCustomBridgeChainModalProps) {
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async () => {
    setDeleting(true);
    setError(null);

    try {
      const response = await bridgeFirewallService.deleteCustomChain(chain.name);

      if (response.success) {
        onSuccess();
      } else {
        setError(response.error || "Failed to delete custom chain");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete custom chain");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Delete Custom Chain
          </DialogTitle>
          <DialogDescription>
            Are you sure you want to delete this custom chain? All rules in this chain will also be deleted. This action cannot be undone.
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="bg-destructive/10 border border-destructive/20 rounded-md px-3 py-2 flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-destructive" />
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        <div className="bg-muted/50 rounded-md p-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Chain Name:</span>
            <span className="font-medium">{chain.name}</span>
          </div>
          {chain.description && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Description:</span>
              <span className="truncate max-w-[200px]">{chain.description}</span>
            </div>
          )}
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Rules:</span>
            <span className="font-medium">{chain.rule_count}</span>
          </div>
          {chain.default_action && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Default Action:</span>
              <span className="font-medium">{chain.default_action}</span>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={deleting}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
            {deleting ? (
              <>
                <RefreshCw className="h-4 w-4 mr-1.5 animate-spin" />
                Deleting...
              </>
            ) : (
              "Delete Chain"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
