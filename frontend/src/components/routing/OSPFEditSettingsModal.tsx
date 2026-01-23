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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Settings, AlertTriangle } from "lucide-react";
import { ospfService, type OSPFConfig, type OSPFOperation } from "@/lib/api/ospf";
import { useToast } from "@/hooks/useToast";

interface OSPFEditSettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  config: OSPFConfig;
}

const ABR_TYPES = [
  { value: "standard", label: "Standard" },
  { value: "cisco", label: "Cisco" },
  { value: "ibm", label: "IBM" },
  { value: "shortcut", label: "Shortcut" },
];

export function OSPFEditSettingsModal({
  open,
  onOpenChange,
  onSuccess,
  config,
}: OSPFEditSettingsModalProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Form state
  const [routerId, setRouterId] = useState(config.router_id || "");
  const [abrType, setAbrType] = useState(config.abr_type || "standard");
  const [rfc1583, setRfc1583] = useState(config.rfc1583_compatibility);
  const [opaqueLsa, setOpaqueLsa] = useState(config.opaque_lsa);

  // Reset form when config changes or modal opens
  useEffect(() => {
    if (open) {
      setRouterId(config.router_id || "");
      setAbrType(config.abr_type || "standard");
      setRfc1583(config.rfc1583_compatibility);
      setOpaqueLsa(config.opaque_lsa);
      setShowDeleteConfirm(false);
    }
  }, [open, config]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

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
      const operations: OSPFOperation[] = [];

      // Router ID changes
      if (routerId.trim() !== (config.router_id || "")) {
        if (routerId.trim()) {
          operations.push({ op: "set_router_id", value: routerId.trim() });
        } else {
          operations.push({ op: "delete_router_id" });
        }
      }

      // ABR type changes
      if (abrType !== (config.abr_type || "standard")) {
        if (abrType && abrType !== "standard") {
          operations.push({ op: "set_abr_type", value: abrType });
        } else {
          operations.push({ op: "delete_abr_type" });
        }
      }

      // RFC 1583 compatibility
      if (rfc1583 !== config.rfc1583_compatibility) {
        if (rfc1583) {
          operations.push({ op: "enable_rfc1583" });
        } else {
          operations.push({ op: "disable_rfc1583" });
        }
      }

      // Opaque LSA
      if (opaqueLsa !== config.opaque_lsa) {
        if (opaqueLsa) {
          operations.push({ op: "enable_opaque_lsa" });
        } else {
          operations.push({ op: "disable_opaque_lsa" });
        }
      }

      if (operations.length === 0) {
        toast.info("No Changes", "No settings were modified");
        onOpenChange(false);
        return;
      }

      const response = await ospfService.configureBatch({ operations });

      if (response.success) {
        toast.success("Settings Updated", "OSPF settings have been updated");
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

  const handleDeleteOSPF = async () => {
    setLoading(true);
    try {
      const response = await ospfService.configureBatch({
        operations: [{ op: "delete_ospf" }],
      });

      if (response.success) {
        toast.success("OSPF Deleted", "OSPF configuration has been removed");
        onOpenChange(false);
        onSuccess();
      } else {
        toast.error("Delete Failed", response.error || "Failed to delete OSPF");
      }
    } catch (error) {
      console.error("Delete OSPF error:", error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      toast.error("Error", errorMessage || "Failed to delete OSPF");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-green-500" />
            Edit OSPF Settings
          </DialogTitle>
          <DialogDescription>Modify global OSPF configuration</DialogDescription>
        </DialogHeader>

        {!showDeleteConfirm ? (
          <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-4">
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

              {/* ABR Type */}
              <div className="grid gap-2">
                <Label htmlFor="abr-type">ABR Type</Label>
                <Select value={abrType} onValueChange={setAbrType} disabled={loading}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ABR_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Area Border Router behavior type
                </p>
              </div>

              {/* RFC 1583 Compatibility */}
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="rfc1583">RFC 1583 Compatibility</Label>
                  <p className="text-xs text-muted-foreground">
                    Use older OSPF external route comparison
                  </p>
                </div>
                <Switch
                  id="rfc1583"
                  checked={rfc1583}
                  onCheckedChange={setRfc1583}
                  disabled={loading}
                />
              </div>

              {/* Opaque LSA */}
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="opaque-lsa">Opaque LSA</Label>
                  <p className="text-xs text-muted-foreground">
                    Enable Opaque LSA support (for MPLS-TE)
                  </p>
                </div>
                <Switch
                  id="opaque-lsa"
                  checked={opaqueLsa}
                  onCheckedChange={setOpaqueLsa}
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
                  Delete OSPF Configuration
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
                  <p className="font-medium text-destructive">Delete OSPF Configuration?</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    This will remove all OSPF configuration including:
                  </p>
                  <ul className="text-sm text-muted-foreground mt-2 list-disc list-inside space-y-1">
                    <li>{config.areas.length} area(s)</li>
                    <li>{config.interfaces.length} interface(s)</li>
                    <li>{config.redistributions.length} redistribution(s)</li>
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
                onClick={handleDeleteOSPF}
                disabled={loading}
              >
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Yes, Delete OSPF
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
