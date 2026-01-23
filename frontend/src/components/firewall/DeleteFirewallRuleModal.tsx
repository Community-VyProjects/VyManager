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
import { AlertCircle, RefreshCw, Shield } from "lucide-react";
import { firewallIPv4Service, type FirewallRule } from "@/lib/api/firewall-ipv4";
import { firewallIPv6Service } from "@/lib/api/firewall-ipv6";
import { Badge } from "@/components/ui/badge";

interface DeleteFirewallRuleModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  rule: FirewallRule | null;
  protocol?: "ipv4" | "ipv6";
}

export function DeleteFirewallRuleModal({
  open,
  onOpenChange,
  onSuccess,
  rule,
  protocol = "ipv4",
}: DeleteFirewallRuleModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleClose = () => {
    setError(null);
    onOpenChange(false);
  };

  const handleDelete = async () => {
    if (!rule) return;

    setLoading(true);
    setError(null);

    try {
      const service = protocol === "ipv4" ? firewallIPv4Service : firewallIPv6Service;
      await service.deleteRule(
        rule.chain,
        rule.rule_number,
        rule.is_custom_chain
      );

      handleClose();
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete rule");
    } finally {
      setLoading(false);
    }
  };

  if (!rule) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-destructive/10">
              <Shield className="h-5 w-5 text-destructive" />
            </div>
            <div>
              <DialogTitle>Delete Firewall Rule</DialogTitle>
              <DialogDescription>
                This action cannot be undone
              </DialogDescription>
            </div>
          </div>
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

        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete this firewall rule? This will remove all
            traffic filtering for this rule.
          </p>

          <div className="rounded-lg border border-border bg-muted/50 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Rule Number</span>
              <span className="font-mono font-semibold">{rule.rule_number}</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Chain</span>
              <Badge variant="outline" className="capitalize">
                {rule.chain}
              </Badge>
            </div>

            {rule.description && (
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Description</span>
                <span className="text-sm text-muted-foreground">
                  {rule.description}
                </span>
              </div>
            )}

            {rule.action && (
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Action</span>
                <Badge
                  variant="outline"
                  className={
                    rule.action === "accept"
                      ? "bg-green-500/10 text-green-500 border-green-500/20"
                      : rule.action === "drop" || rule.action === "reject"
                      ? "bg-red-500/10 text-red-500 border-red-500/20"
                      : ""
                  }
                >
                  {rule.action}
                </Badge>
              </div>
            )}

            {rule.protocol && (
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Protocol</span>
                <Badge variant="outline">{rule.protocol.toUpperCase()}</Badge>
              </div>
            )}

            {rule.source?.address && (
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Source</span>
                <span className="font-mono text-sm">{rule.source.address}</span>
              </div>
            )}

            {rule.destination?.address && (
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Destination</span>
                <span className="font-mono text-sm">
                  {rule.destination.address}
                </span>
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={loading}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleDelete} disabled={loading}>
            {loading ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                Deleting...
              </>
            ) : (
              "Delete Rule"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
