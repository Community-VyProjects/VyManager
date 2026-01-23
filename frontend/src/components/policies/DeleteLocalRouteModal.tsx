"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertCircle } from "lucide-react";
import { localRouteService, type LocalRouteRule } from "@/lib/api/local-route";

interface DeleteLocalRouteModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  rule: LocalRouteRule;
  ruleType: "ipv4" | "ipv6";
}

export function DeleteLocalRouteModal({
  open,
  onOpenChange,
  onSuccess,
  rule,
  ruleType,
}: DeleteLocalRouteModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleClose = () => {
    setError(null);
    onOpenChange(false);
  };

  const handleDelete = async () => {
    setLoading(true);
    setError(null);

    try {
      await localRouteService.deleteRule(rule.rule_number, ruleType);
      handleClose();
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete rule");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Delete Local Route Rule</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete this rule? This action cannot be undone.
          </DialogDescription>
        </DialogHeader>

        {/* Rule Details */}
        <div className="space-y-4 py-4">
          <div className="border rounded-lg p-4 space-y-3">
            <div className="flex items-start justify-between">
              <div className="space-y-2 flex-1">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="font-mono">
                    Rule {rule.rule_number}
                  </Badge>
                  <Badge variant="outline" className="uppercase">
                    {ruleType}
                  </Badge>
                </div>
                <div className="space-y-1 text-sm">
                  {rule.source && (
                    <div className="flex gap-2">
                      <span className="text-muted-foreground min-w-32">Source:</span>
                      <span className="font-mono">{rule.source}</span>
                    </div>
                  )}
                  {rule.destination && (
                    <div className="flex gap-2">
                      <span className="text-muted-foreground min-w-32">Destination:</span>
                      <span className="font-mono">{rule.destination}</span>
                    </div>
                  )}
                  {rule.inbound_interface && (
                    <div className="flex gap-2">
                      <span className="text-muted-foreground min-w-32">Inbound Interface:</span>
                      <Badge variant="outline" className="font-mono">
                        {rule.inbound_interface}
                      </Badge>
                    </div>
                  )}
                  {rule.table && (
                    <div className="flex gap-2">
                      <span className="text-muted-foreground min-w-32">Routing Table:</span>
                      <Badge
                        variant="secondary"
                        className={rule.table === "main" ? "bg-blue-500/10 text-blue-500 border-blue-500/20" : ""}
                      >
                        {rule.table}
                      </Badge>
                    </div>
                  )}
                  {rule.vrf && (
                    <div className="flex gap-2">
                      <span className="text-muted-foreground min-w-32">VRF Instance:</span>
                      <Badge
                        variant="secondary"
                        className={rule.vrf === "default" ? "bg-blue-500/10 text-blue-500 border-blue-500/20" : ""}
                      >
                        {rule.vrf}
                      </Badge>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Warning */}
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="text-sm font-medium text-destructive">
                This will permanently delete the rule
              </p>
              <p className="text-sm text-muted-foreground">
                Traffic matching this rule will no longer use policy-based routing.
              </p>
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={loading}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleDelete} disabled={loading}>
            {loading ? "Deleting..." : "Delete Rule"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
