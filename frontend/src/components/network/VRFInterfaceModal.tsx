"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Loader2, Network, Plus, Trash2 } from "lucide-react";
import { vrfService, type VRF } from "@/lib/api/vrf";
import { useToast } from "@/hooks/useToast";

interface VRFInterfaceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  vrf: VRF | null;
}

export function VRFInterfaceModal({
  open,
  onOpenChange,
  onSuccess,
  vrf,
}: VRFInterfaceModalProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [interfaceName, setInterfaceName] = useState("");

  useEffect(() => {
    if (open) {
      setInterfaceName("");
    }
  }, [open]);

  const handleAddInterface = async () => {
    if (!vrf || !interfaceName.trim()) {
      toast.error("Validation Error", "Interface name is required");
      return;
    }

    setLoading(true);
    try {
      const result = await vrfService.assignInterface(vrf.name, interfaceName.trim());

      if (result.success) {
        toast.success(
          "Interface Assigned",
          `Interface "${interfaceName}" has been assigned to VRF "${vrf.name}"`
        );
        setInterfaceName("");
        onSuccess();
      } else {
        toast.error("Failed", result.error || "Failed to assign interface");
      }
    } catch (error) {
      toast.error("Error", error instanceof Error ? error.message : "Operation failed");
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveInterface = async (iface: string) => {
    if (!vrf) return;

    setLoading(true);
    try {
      const result = await vrfService.removeInterface(iface);

      if (result.success) {
        toast.success(
          "Interface Removed",
          `Interface "${iface}" has been removed from VRF`
        );
        onSuccess();
      } else {
        toast.error("Failed", result.error || "Failed to remove interface");
      }
    } catch (error) {
      toast.error("Error", error instanceof Error ? error.message : "Operation failed");
    } finally {
      setLoading(false);
    }
  };

  if (!vrf) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Network className="h-5 w-5" />
            Manage Interfaces - {vrf.name}
          </DialogTitle>
          <DialogDescription>
            Assign or remove interfaces from this VRF
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Currently assigned interfaces */}
          {vrf.interfaces.length > 0 && (
            <div className="space-y-2">
              <Label>Assigned Interfaces</Label>
              <div className="space-y-2">
                {vrf.interfaces.map((iface) => (
                  <div
                    key={iface}
                    className="flex items-center justify-between p-2 border rounded-lg"
                  >
                    <code className="font-mono text-sm">{iface}</code>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveInterface(iface)}
                      disabled={loading}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Add new interface */}
          <div className="space-y-2">
            <Label htmlFor="interface-name">Add Interface</Label>
            <div className="flex gap-2">
              <Input
                id="interface-name"
                value={interfaceName}
                onChange={(e) => setInterfaceName(e.target.value)}
                placeholder="e.g., eth0, eth1.100, bond0"
                disabled={loading}
              />
              <Button onClick={handleAddInterface} disabled={loading || !interfaceName.trim()}>
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4" />
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Enter the interface name (eth0, eth1, bond0, etc.)
            </p>
          </div>

          {/* Common interface examples */}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Quick Add</Label>
            <div className="flex flex-wrap gap-2">
              {["eth0", "eth1", "eth2", "bond0", "br0"].map((iface) => (
                <Badge
                  key={iface}
                  variant="outline"
                  className="cursor-pointer hover:bg-muted"
                  onClick={() => setInterfaceName(iface)}
                >
                  {iface}
                </Badge>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
