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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Globe } from "lucide-react";
import { ospfService, type OSPFOperation } from "@/lib/api/ospf";
import { useToast } from "@/hooks/useToast";

interface OSPFAddAreaNetworkModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const AREA_TYPES = [
  { value: "normal", label: "Normal" },
  { value: "stub", label: "Stub" },
  { value: "nssa", label: "NSSA" },
];

export function OSPFAddAreaNetworkModal({
  open,
  onOpenChange,
  onSuccess,
}: OSPFAddAreaNetworkModalProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  // Form state
  const [areaId, setAreaId] = useState("0.0.0.0");
  const [network, setNetwork] = useState("");
  const [areaType, setAreaType] = useState("normal");
  const [noSummary, setNoSummary] = useState(false);

  const resetForm = () => {
    setAreaId("0.0.0.0");
    setNetwork("");
    setAreaType("normal");
    setNoSummary(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!network.trim()) {
      toast.error("Validation Error", "Network prefix is required");
      return;
    }

    // Validate area ID
    const areaRegex = /^(\d{1,3}\.){3}\d{1,3}$|^\d+$/;
    if (!areaRegex.test(areaId.trim())) {
      toast.error("Validation Error", "Area ID must be in format x.x.x.x or a number");
      return;
    }

    // Validate network
    const cidrRegex = /^(\d{1,3}\.){3}\d{1,3}\/\d{1,2}$/;
    if (!cidrRegex.test(network.trim())) {
      toast.error("Validation Error", "Network must be in CIDR format (e.g., 10.0.0.0/24)");
      return;
    }

    setLoading(true);
    try {
      const operations: OSPFOperation[] = [];

      // Add network to area
      operations.push({
        op: "add_area_network",
        area: areaId.trim(),
        network: network.trim(),
      });

      // Set area type if not normal
      if (areaType === "stub") {
        operations.push({
          op: "set_area_type_stub",
          area: areaId.trim(),
          no_summary: noSummary,
        });
      } else if (areaType === "nssa") {
        operations.push({
          op: "set_area_type_nssa",
          area: areaId.trim(),
          no_summary: noSummary,
        });
      }

      const response = await ospfService.configureBatch({ operations });

      if (response.success) {
        toast.success("Network Added", `Network ${network} added to Area ${areaId}`);
        onOpenChange(false);
        onSuccess();
        resetForm();
      } else {
        toast.error("Failed to Add Network", response.error || "Unknown error");
      }
    } catch (error) {
      console.error("Add area network error:", error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      toast.error("Error", errorMessage || "Failed to add network");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5 text-blue-500" />
            Add Area Network
          </DialogTitle>
          <DialogDescription>
            Add a network prefix to an OSPF area.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="area-id">Area ID</Label>
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
              <Label htmlFor="network">
                Network Prefix <span className="text-destructive">*</span>
              </Label>
              <Input
                id="network"
                placeholder="e.g., 10.0.0.0/24"
                value={network}
                onChange={(e) => setNetwork(e.target.value)}
                disabled={loading}
              />
              <p className="text-xs text-muted-foreground">
                Network in CIDR notation to add to the area
              </p>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="area-type">Area Type</Label>
              <Select value={areaType} onValueChange={setAreaType} disabled={loading}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {AREA_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {areaType === "stub"
                  ? "Stub areas don't receive external routes"
                  : areaType === "nssa"
                  ? "NSSA allows limited external routes via Type-7 LSAs"
                  : "Normal area receives all route types"}
              </p>
            </div>

            {(areaType === "stub" || areaType === "nssa") && (
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="no-summary"
                  checked={noSummary}
                  onChange={(e) => setNoSummary(e.target.checked)}
                  disabled={loading}
                  className="rounded border-gray-300"
                />
                <Label htmlFor="no-summary" className="text-sm font-normal">
                  No Summary (Totally {areaType === "stub" ? "Stubby" : "NSSA"})
                </Label>
              </div>
            )}
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
              Add Network
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
