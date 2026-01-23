"use client";

import { useState } from "react";
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
import { Loader2, Router } from "lucide-react";
import { ospfService } from "@/lib/api/ospf";
import { useToast } from "@/hooks/useToast";

interface OSPFConfigureModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function OSPFConfigureModal({
  open,
  onOpenChange,
  onSuccess,
}: OSPFConfigureModalProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [routerId, setRouterId] = useState("");
  const [areaId, setAreaId] = useState("0.0.0.0");
  const [network, setNetwork] = useState("");

  const resetForm = () => {
    setRouterId("");
    setAreaId("0.0.0.0");
    setNetwork("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate router ID if provided
    if (routerId.trim()) {
      const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
      if (!ipv4Regex.test(routerId.trim())) {
        toast.error("Validation Error", "Router ID must be a valid IPv4 address");
        return;
      }
    }

    // Validate area ID
    const areaRegex = /^(\d{1,3}\.){3}\d{1,3}$|^\d+$/;
    if (!areaRegex.test(areaId.trim())) {
      toast.error("Validation Error", "Area ID must be in format x.x.x.x or a number");
      return;
    }

    // Validate network if provided
    if (network.trim()) {
      const cidrRegex = /^(\d{1,3}\.){3}\d{1,3}\/\d{1,2}$/;
      if (!cidrRegex.test(network.trim())) {
        toast.error("Validation Error", "Network must be in CIDR format (e.g., 10.0.0.0/24)");
        return;
      }
    }

    setLoading(true);
    try {
      const operations: Array<{ op: string; [key: string]: string | number }> = [];

      // Set router ID if provided
      if (routerId.trim()) {
        operations.push({ op: "set_router_id", value: routerId.trim() });
      }

      // Add initial network to area if provided
      if (network.trim()) {
        operations.push({
          op: "add_area_network",
          area: areaId.trim(),
          network: network.trim(),
        });
      } else {
        // Just create the area
        operations.push({ op: "add_area", area: areaId.trim() });
      }

      const response = await ospfService.configureBatch({ operations });

      if (response.success) {
        toast.success("OSPF Configured", "OSPF has been successfully configured");
        onOpenChange(false);
        onSuccess();
        resetForm();
      } else {
        toast.error("Configuration Failed", response.error || "Unknown error");
      }
    } catch (error) {
      console.error("Configure OSPF error:", error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      toast.error("Error", errorMessage || "Failed to configure OSPF");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Router className="h-5 w-5 text-green-500" />
            Configure OSPF
          </DialogTitle>
          <DialogDescription>
            Initialize OSPF routing protocol on this router.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="router-id">Router ID</Label>
              <Input
                id="router-id"
                placeholder="e.g., 10.0.0.1 (optional)"
                value={routerId}
                onChange={(e) => setRouterId(e.target.value)}
                disabled={loading}
              />
              <p className="text-xs text-muted-foreground">
                Leave empty to auto-select from interface addresses
              </p>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="area-id">Initial Area ID</Label>
              <Input
                id="area-id"
                placeholder="e.g., 0.0.0.0"
                value={areaId}
                onChange={(e) => setAreaId(e.target.value)}
                disabled={loading}
              />
              <p className="text-xs text-muted-foreground">
                Backbone area is 0.0.0.0 or 0
              </p>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="network">Initial Network (optional)</Label>
              <Input
                id="network"
                placeholder="e.g., 10.0.0.0/24"
                value={network}
                onChange={(e) => setNetwork(e.target.value)}
                disabled={loading}
              />
              <p className="text-xs text-muted-foreground">
                Network prefix to advertise in the area
              </p>
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
              Configure OSPF
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
