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
import { bgpService } from "@/lib/api/bgp";
import { useToast } from "@/hooks/useToast";

interface BGPAddNetworkModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  asn: string;
  defaultFamily?: string;
}

const ADDRESS_FAMILIES = [
  { value: "ipv4-unicast", label: "IPv4 Unicast" },
  { value: "ipv6-unicast", label: "IPv6 Unicast" },
];

export function BGPAddNetworkModal({
  open,
  onOpenChange,
  onSuccess,
  asn,
  defaultFamily = "ipv4-unicast",
}: BGPAddNetworkModalProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [family, setFamily] = useState(defaultFamily);
  const [network, setNetwork] = useState("");
  const [routeMap, setRouteMap] = useState("");

  const resetForm = () => {
    setNetwork("");
    setRouteMap("");
    setFamily(defaultFamily);
  };

  const validateNetwork = (net: string): boolean => {
    // IPv4 CIDR
    const ipv4CidrRegex = /^(\d{1,3}\.){3}\d{1,3}\/\d{1,2}$/;
    // IPv6 CIDR (simplified)
    const ipv6CidrRegex = /^([0-9a-fA-F]{0,4}:){2,7}[0-9a-fA-F]{0,4}\/\d{1,3}$/;
    return ipv4CidrRegex.test(net) || ipv6CidrRegex.test(net);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!network.trim()) {
      toast.error("Validation Error", "Network prefix is required");
      return;
    }

    if (!validateNetwork(network.trim())) {
      toast.error("Validation Error", "Invalid network format. Use CIDR notation (e.g., 10.0.0.0/24)");
      return;
    }

    // Validate family matches network type
    if (family === "ipv4-unicast" && network.includes(":")) {
      toast.error("Validation Error", "IPv6 network cannot be added to IPv4 address family");
      return;
    }
    if (family === "ipv6-unicast" && !network.includes(":")) {
      toast.error("Validation Error", "IPv4 network cannot be added to IPv6 address family");
      return;
    }

    setLoading(true);
    try {
      const operations: Array<{ op: string; [key: string]: string }> = [
        {
          op: "add_network",
          family,
          network: network.trim(),
        },
      ];

      if (routeMap.trim()) {
        operations.push({
          op: "set_network_route_map",
          family,
          network: network.trim(),
          value: routeMap.trim(),
        });
      }

      const response = await bgpService.configureBatch({ asn, operations });

      if (response.success) {
        toast.success("Network Added", `Network ${network} added to ${family}`);
        onOpenChange(false);
        onSuccess();
        resetForm();
      } else {
        toast.error("Failed to Add Network", response.error || "Unknown error");
      }
    } catch (error) {
      console.error("Add network error:", error);
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
            Add BGP Network
          </DialogTitle>
          <DialogDescription>
            Advertise a network prefix via BGP to your peers.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="family">Address Family</Label>
              <Select value={family} onValueChange={setFamily} disabled={loading}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ADDRESS_FAMILIES.map((af) => (
                    <SelectItem key={af.value} value={af.value}>
                      {af.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="network">
                Network Prefix <span className="text-destructive">*</span>
              </Label>
              <Input
                id="network"
                placeholder={family === "ipv6-unicast" ? "e.g., 2001:db8::/32" : "e.g., 10.0.0.0/24"}
                value={network}
                onChange={(e) => setNetwork(e.target.value)}
                disabled={loading}
              />
              <p className="text-xs text-muted-foreground">
                Network in CIDR notation to advertise via BGP
              </p>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="route-map">Route Map (optional)</Label>
              <Input
                id="route-map"
                placeholder="e.g., EXPORT-FILTER"
                value={routeMap}
                onChange={(e) => setRouteMap(e.target.value)}
                disabled={loading}
              />
              <p className="text-xs text-muted-foreground">
                Apply a route-map when advertising this network
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
              Add Network
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
