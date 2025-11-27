"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertCircle, AlertTriangle } from "lucide-react";
import { firewallGroupsService } from "@/lib/api/firewall-groups";
import type { FirewallGroup } from "@/lib/api/types/firewall-groups";

interface DeleteGroupModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  group: FirewallGroup | null;
  onSuccess: () => void;
}

export function DeleteGroupModal({ open, onOpenChange, group, onSuccess }: DeleteGroupModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleClose = () => {
    setError(null);
    onOpenChange(false);
  };

  const handleDelete = async () => {
    if (!group) return;

    setLoading(true);
    setError(null);

    try {
      await firewallGroupsService.deleteGroup(group.name, group.type);

      // Refresh config cache
      await firewallGroupsService.refreshConfig();

      handleClose();
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete group");
    } finally {
      setLoading(false);
    }
  };

  const getGroupTypeLabel = () => {
    if (!group) return "";

    const labels: Record<string, string> = {
      "address-group": "IPv4 Address Group",
      "ipv6-address-group": "IPv6 Address Group",
      "network-group": "IPv4 Network Group",
      "ipv6-network-group": "IPv6 Network Group",
      "port-group": "Port Group",
      "interface-group": "Interface Group",
      "mac-group": "MAC Address Group",
      "domain-group": "Domain Group",
    };
    return labels[group.type] || group.type;
  };

  if (!group) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Delete Firewall Group
          </DialogTitle>
          <DialogDescription>
            Permanently remove this firewall group. This action cannot be undone.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Error Alert */}
          {error && (
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 flex items-start gap-2">
              <AlertCircle className="h-5 w-5 text-destructive mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm text-destructive">{error}</p>
              </div>
            </div>
          )}

          {/* Warning */}
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 space-y-3">
            <p className="text-sm text-foreground">
              Are you sure you want to delete this firewall group?
            </p>

            <div className="space-y-2 text-sm">
              <div className="flex items-start gap-2">
                <span className="text-muted-foreground font-semibold min-w-[80px]">Name:</span>
                <code className="font-mono text-foreground">{group.name}</code>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-muted-foreground font-semibold min-w-[80px]">Type:</span>
                <span className="text-foreground">{getGroupTypeLabel()}</span>
              </div>
              {group.description && (
                <div className="flex items-start gap-2">
                  <span className="text-muted-foreground font-semibold min-w-[80px]">Description:</span>
                  <span className="text-foreground">{group.description}</span>
                </div>
              )}
              <div className="flex items-start gap-2">
                <span className="text-muted-foreground font-semibold min-w-[80px]">Members:</span>
                <span className="text-foreground">{group.members.length}</span>
              </div>
            </div>
          </div>

          {/* Warning Message */}
          <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3">
            <p className="text-sm text-yellow-600 dark:text-yellow-500">
              <strong>Warning:</strong> This action cannot be undone. If this group is referenced in any firewall rules, those rules may become invalid.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={loading}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleDelete} disabled={loading}>
            {loading ? "Deleting..." : "Delete Group"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
