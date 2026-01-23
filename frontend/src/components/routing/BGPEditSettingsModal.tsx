"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Loader2, Settings, AlertTriangle } from "lucide-react";
import { bgpService, type BGPConfig } from "@/lib/api/bgp";
import { useToast } from "@/hooks/useToast";

interface BGPEditSettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  config: BGPConfig;
}

export function BGPEditSettingsModal({
  open,
  onOpenChange,
  onSuccess,
  config,
}: BGPEditSettingsModalProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Form state
  const [routerId, setRouterId] = useState(config.router_id || "");
  const [logNeighborChanges, setLogNeighborChanges] = useState(config.log_neighbor_changes);

  // Reset form when config changes or modal opens
  useEffect(() => {
    if (open) {
      setRouterId(config.router_id || "");
      setLogNeighborChanges(config.log_neighbor_changes);
      setShowDeleteConfirm(false);
    }
  }, [open, config]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!config.asn) {
      toast.error("Error", "BGP ASN not found");
      return;
    }

    // Validate router ID if provided
    if (routerId.trim()) {
      const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
      if (!ipv4Regex.test(routerId)) {
        toast.error("Validation Error", "Router ID must be a valid IPv4 address");
        return;
      }
    }

    setLoading(true);
    try {
      const operations: Array<{ op: string; value?: string }> = [];

      // Router ID changes
      if (routerId.trim() !== (config.router_id || "")) {
        if (routerId.trim()) {
          operations.push({ op: "set_router_id", value: routerId.trim() });
        } else {
          operations.push({ op: "delete_router_id" });
        }
      }

      // Log neighbor changes toggle
      if (logNeighborChanges !== config.log_neighbor_changes) {
        if (logNeighborChanges) {
          operations.push({ op: "enable_log_neighbor_changes" });
        } else {
          operations.push({ op: "disable_log_neighbor_changes" });
        }
      }

      if (operations.length === 0) {
        toast.info("No Changes", "No settings were modified");
        onOpenChange(false);
        return;
      }

      const response = await bgpService.configureBatch({
        asn: config.asn,
        operations,
      });

      if (response.success) {
        toast.success("Settings Updated", "BGP settings have been updated");
        onOpenChange(false);
        onSuccess();
      } else {
        toast.error("Update Failed", response.error || "Failed to update settings");
      }
    } catch (error) {
      console.error("Update settings error:", error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      toast.error("Error", errorMessage || "Failed to update settings");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteBGP = async () => {
    if (!config.asn) return;

    setLoading(true);
    try {
      const response = await bgpService.configureBatch({
        asn: config.asn,
        operations: [{ op: "delete_bgp" }],
      });

      if (response.success) {
        toast.success("BGP Deleted", "BGP configuration has been removed");
        onOpenChange(false);
        onSuccess();
      } else {
        toast.error("Delete Failed", response.error || "Failed to delete BGP");
      }
    } catch (error) {
      console.error("Delete BGP error:", error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      toast.error("Error", errorMessage || "Failed to delete BGP");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-purple-500" />
            Edit BGP Settings
          </DialogTitle>
          <DialogDescription>
            Modify global BGP configuration for AS {config.asn}
          </DialogDescription>
        </DialogHeader>

        {!showDeleteConfirm ? (
          <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-4">
              {/* ASN (read-only) */}
              <div className="grid gap-2">
                <Label>Autonomous System Number</Label>
                <Input
                  value={config.asn || ""}
                  disabled
                  className="font-mono bg-muted"
                />
                <p className="text-xs text-muted-foreground">
                  ASN cannot be changed. Delete BGP and reconfigure to use a different ASN.
                </p>
              </div>

              {/* Router ID */}
              <div className="grid gap-2">
                <Label htmlFor="router-id">Router ID</Label>
                <Input
                  id="router-id"
                  placeholder="e.g., 10.0.0.1"
                  value={routerId}
                  onChange={(e) => setRouterId(e.target.value)}
                  disabled={loading}
                />
                <p className="text-xs text-muted-foreground">
                  IPv4 address used to identify this router. Leave empty for auto-selection.
                </p>
              </div>

              {/* Log Neighbor Changes */}
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="log-changes">Log Neighbor Changes</Label>
                  <p className="text-xs text-muted-foreground">
                    Log BGP neighbor state changes to syslog
                  </p>
                </div>
                <Switch
                  id="log-changes"
                  checked={logNeighborChanges}
                  onCheckedChange={setLogNeighborChanges}
                  disabled={loading}
                />
              </div>

              {/* Danger Zone */}
              <div className="pt-4 border-t">
                <p className="text-sm font-medium text-destructive mb-2">Danger Zone</p>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
                  onClick={() => setShowDeleteConfirm(true)}
                  disabled={loading}
                >
                  <AlertTriangle className="h-4 w-4 mr-2" />
                  Delete BGP Configuration
                </Button>
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Changes
              </Button>
            </DialogFooter>
          </form>
        ) : (
          <div className="py-4">
            <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20 mb-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-destructive">Delete BGP Configuration?</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    This will remove all BGP configuration including:
                  </p>
                  <ul className="text-sm text-muted-foreground mt-2 list-disc list-inside space-y-1">
                    <li>{config.neighbors.length} neighbor(s)</li>
                    <li>{config.peer_groups.length} peer group(s)</li>
                    <li>{Object.keys(config.address_families).length} address family configuration(s)</li>
                  </ul>
                  <p className="text-sm text-destructive font-medium mt-3">
                    This action cannot be undone.
                  </p>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowDeleteConfirm(false)}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="destructive"
                onClick={handleDeleteBGP}
                disabled={loading}
              >
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Yes, Delete BGP
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
