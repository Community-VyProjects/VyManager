"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertCircle, RefreshCw, AlertTriangle } from "lucide-react";
import { firewallIPv4Service, type CustomChain } from "@/lib/api/firewall-ipv4";
import { firewallIPv6Service } from "@/lib/api/firewall-ipv6";

interface DeleteCustomChainModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  chain: CustomChain | null;
  protocol?: "ipv4" | "ipv6";
}

export function DeleteCustomChainModal({
  open,
  onOpenChange,
  onSuccess,
  chain,
  protocol = "ipv4",
}: DeleteCustomChainModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!chain) return null;

  const handleDelete = async () => {
    setLoading(true);
    setError(null);

    try {
      const service = protocol === "ipv4" ? firewallIPv4Service : firewallIPv6Service;
      await service.deleteCustomChain(chain.name);
      onOpenChange(false);
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete custom chain");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Delete Custom Chain</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete this custom chain?
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 flex items-start gap-2">
            <AlertCircle className="h-5 w-5 text-destructive mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-destructive">Error</p>
              <p className="text-sm text-destructive/90">{error}</p>
            </div>
          </div>
        )}

        <div className="bg-muted/50 border border-border rounded-lg p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">Chain Name</span>
            <span className="text-sm font-mono font-semibold text-foreground">{chain.name}</span>
          </div>
          {chain.description && (
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-muted-foreground">Description</span>
              <span className="text-sm text-foreground">{chain.description}</span>
            </div>
          )}
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">Rules</span>
            <span className="text-sm text-foreground">{chain.rules.length}</span>
          </div>
        </div>

        {chain.rules.length > 0 && (
          <div className="bg-orange-500/10 border border-orange-500/20 rounded-lg p-3 flex items-start gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-500 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-orange-600 dark:text-orange-400">Warning</p>
              <p className="text-sm text-orange-600/90 dark:text-orange-400/90">
                This chain contains {chain.rules.length} rule{chain.rules.length !== 1 ? "s" : ""}. Deleting the chain will also delete all its rules.
              </p>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleDelete} disabled={loading}>
            {loading ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
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
