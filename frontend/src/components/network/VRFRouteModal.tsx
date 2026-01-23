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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Route } from "lucide-react";
import { vrfService, type VRF, type VRFOperation } from "@/lib/api/vrf";
import { useToast } from "@/hooks/useToast";

interface VRFRouteModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  vrf: VRF | null;
}

export function VRFRouteModal({
  open,
  onOpenChange,
  onSuccess,
  vrf,
}: VRFRouteModalProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const [network, setNetwork] = useState("");
  const [nextHop, setNextHop] = useState("");
  const [distance, setDistance] = useState("");
  const [routeType, setRouteType] = useState<"next-hop" | "blackhole">("next-hop");
  const [ipVersion, setIpVersion] = useState<"ipv4" | "ipv6">("ipv4");

  useEffect(() => {
    if (open) {
      setNetwork("");
      setNextHop("");
      setDistance("");
      setRouteType("next-hop");
      setIpVersion("ipv4");
    }
  }, [open]);

  const handleSubmit = async () => {
    if (!vrf) return;

    if (!network.trim()) {
      toast.error("Validation Error", "Network is required");
      return;
    }

    if (routeType === "next-hop" && !nextHop.trim()) {
      toast.error("Validation Error", "Next hop is required");
      return;
    }

    // Basic network validation
    const networkRegex = ipVersion === "ipv4"
      ? /^(\d{1,3}\.){3}\d{1,3}\/\d{1,2}$/
      : /^[0-9a-fA-F:]+\/\d{1,3}$/;

    if (!networkRegex.test(network.trim())) {
      toast.error(
        "Validation Error",
        `Invalid ${ipVersion.toUpperCase()} network format. Use CIDR notation (e.g., ${
          ipVersion === "ipv4" ? "10.0.0.0/24" : "2001:db8::/32"
        })`
      );
      return;
    }

    setLoading(true);
    try {
      const operations: VRFOperation[] = [];

      if (routeType === "blackhole") {
        operations.push({
          op: "add_vrf_static_route_blackhole",
          name: vrf.name,
          network: network.trim(),
        });
      } else if (ipVersion === "ipv6") {
        operations.push({
          op: "add_vrf_static_route6",
          name: vrf.name,
          network: network.trim(),
          next_hop: nextHop.trim(),
        });
      } else {
        operations.push({
          op: "add_vrf_static_route",
          name: vrf.name,
          network: network.trim(),
          next_hop: nextHop.trim(),
          distance: distance ? parseInt(distance) : undefined,
        });
      }

      const result = await vrfService.batch(operations);

      if (result.success) {
        toast.success("Route Added", `Static route has been added to VRF "${vrf.name}"`);
        onSuccess();
        onOpenChange(false);
      } else {
        toast.error("Failed", result.error || "Failed to add route");
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
            <Route className="h-5 w-5" />
            Add Static Route - {vrf.name}
          </DialogTitle>
          <DialogDescription>
            Add a static route to this VRF&apos;s routing table
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* IP Version */}
          <div className="space-y-2">
            <Label>IP Version</Label>
            <RadioGroup
              value={ipVersion}
              onValueChange={(v) => setIpVersion(v as "ipv4" | "ipv6")}
              className="flex gap-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="ipv4" id="ipv4" />
                <Label htmlFor="ipv4" className="cursor-pointer">
                  IPv4
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="ipv6" id="ipv6" />
                <Label htmlFor="ipv6" className="cursor-pointer">
                  IPv6
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Route Type */}
          <div className="space-y-2">
            <Label>Route Type</Label>
            <RadioGroup
              value={routeType}
              onValueChange={(v) => setRouteType(v as "next-hop" | "blackhole")}
              className="flex gap-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="next-hop" id="next-hop" />
                <Label htmlFor="next-hop" className="cursor-pointer">
                  Next Hop
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="blackhole" id="blackhole" />
                <Label htmlFor="blackhole" className="cursor-pointer">
                  Blackhole
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Network */}
          <div className="space-y-2">
            <Label htmlFor="network">Destination Network *</Label>
            <Input
              id="network"
              value={network}
              onChange={(e) => setNetwork(e.target.value)}
              placeholder={ipVersion === "ipv4" ? "10.0.0.0/24" : "2001:db8::/32"}
              disabled={loading}
            />
            <p className="text-xs text-muted-foreground">
              Enter network in CIDR notation
            </p>
          </div>

          {/* Next Hop (only for next-hop type) */}
          {routeType === "next-hop" && (
            <div className="space-y-2">
              <Label htmlFor="next-hop-addr">Next Hop Address *</Label>
              <Input
                id="next-hop-addr"
                value={nextHop}
                onChange={(e) => setNextHop(e.target.value)}
                placeholder={ipVersion === "ipv4" ? "192.168.1.1" : "2001:db8::1"}
                disabled={loading}
              />
            </div>
          )}

          {/* Distance (only for IPv4 with next-hop) */}
          {routeType === "next-hop" && ipVersion === "ipv4" && (
            <div className="space-y-2">
              <Label htmlFor="distance">Administrative Distance</Label>
              <Input
                id="distance"
                type="number"
                value={distance}
                onChange={(e) => setDistance(e.target.value)}
                placeholder="1-255 (optional)"
                min={1}
                max={255}
                disabled={loading}
              />
              <p className="text-xs text-muted-foreground">
                Lower values have higher priority
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Add Route
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
