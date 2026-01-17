"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AlertCircle, Monitor, Network, Plus } from "lucide-react";
import { dhcpService, type DHCPLease, type DHCPSharedNetwork } from "@/lib/api/dhcp";

interface AddLeaseToStaticMappingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  lease: DHCPLease;
  network: DHCPSharedNetwork;
}

export function AddLeaseToStaticMappingModal({
  open,
  onOpenChange,
  onSuccess,
  lease,
  network,
}: AddLeaseToStaticMappingModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form fields - pre-populated from lease
  const [mappingName, setMappingName] = useState("");
  const [ipAddress, setIpAddress] = useState("");
  const [macAddress, setMacAddress] = useState("");
  const [selectedSubnet, setSelectedSubnet] = useState("");

  // Load lease data when modal opens
  useEffect(() => {
    if (open && lease) {
      // Use hostname as mapping name, fallback to a sanitized version of MAC
      const defaultName = lease.hostname || lease.mac_address.replace(/:/g, "-");
      setMappingName(defaultName);
      setIpAddress(lease.ip_address);
      setMacAddress(lease.mac_address);
      setError(null);

      // Auto-select subnet if there's only one, or try to match by IP
      if (network.subnets.length === 1) {
        setSelectedSubnet(network.subnets[0].subnet);
      } else if (network.subnets.length > 1) {
        // Try to find a matching subnet based on IP address
        const matchingSubnet = findMatchingSubnet(lease.ip_address, network.subnets);
        setSelectedSubnet(matchingSubnet || network.subnets[0].subnet);
      }
    }
  }, [open, lease, network]);

  // Helper function to find matching subnet for an IP
  const findMatchingSubnet = (ip: string, subnets: { subnet: string }[]): string | null => {
    const ipParts = ip.split(".").map(Number);

    for (const subnet of subnets) {
      const [subnetIp, maskBits] = subnet.subnet.split("/");
      const subnetParts = subnetIp.split(".").map(Number);
      const mask = parseInt(maskBits);

      // Simple check for /24 networks (most common)
      if (mask === 24) {
        if (ipParts[0] === subnetParts[0] &&
            ipParts[1] === subnetParts[1] &&
            ipParts[2] === subnetParts[2]) {
          return subnet.subnet;
        }
      } else if (mask === 16) {
        if (ipParts[0] === subnetParts[0] &&
            ipParts[1] === subnetParts[1]) {
          return subnet.subnet;
        }
      } else if (mask === 8) {
        if (ipParts[0] === subnetParts[0]) {
          return subnet.subnet;
        }
      }
    }
    return null;
  };

  const handleClose = () => {
    setError(null);
    onOpenChange(false);
  };

  const validateForm = (): boolean => {
    // Validate mapping name
    if (!mappingName.trim()) {
      setError("Mapping name is required");
      return false;
    }

    // Check for invalid characters in mapping name (VyOS node names)
    if (!/^[a-zA-Z0-9_-]+$/.test(mappingName.trim())) {
      setError("Mapping name can only contain letters, numbers, hyphens, and underscores");
      return false;
    }

    // Validate IP address format
    if (!ipAddress.trim()) {
      setError("IP address is required");
      return false;
    }
    const ipPattern = /^(\d{1,3}\.){3}\d{1,3}$/;
    if (!ipPattern.test(ipAddress.trim())) {
      setError("Invalid IP address format");
      return false;
    }
    const parts = ipAddress.trim().split(".").map(Number);
    if (parts.some((p) => p < 0 || p > 255)) {
      setError("IP address octets must be between 0 and 255");
      return false;
    }

    // Validate MAC address format
    if (!macAddress.trim()) {
      setError("MAC address is required");
      return false;
    }
    const macPattern = /^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/;
    if (!macPattern.test(macAddress.trim())) {
      setError("Invalid MAC address format (use XX:XX:XX:XX:XX:XX)");
      return false;
    }

    // Validate subnet selection
    if (!selectedSubnet) {
      setError("Please select a subnet");
      return false;
    }

    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setLoading(true);
    setError(null);

    try {
      await dhcpService.createStaticMapping(
        network.name,
        selectedSubnet,
        mappingName.trim(),
        ipAddress.trim(),
        macAddress.trim().toLowerCase()
      );

      handleClose();
      onSuccess();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to create static mapping"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Add Lease to Static Mapping
          </DialogTitle>
          <DialogDescription>
            Convert this DHCP lease into a static mapping to reserve the IP address
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Context Info */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 rounded-lg p-3">
            <Network className="h-4 w-4" />
            <span>Network: <span className="font-medium text-foreground">{network.name}</span></span>
          </div>

          {/* Original Lease Info */}
          <div className="rounded-lg border bg-muted/30 p-3 space-y-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Original Lease</p>
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline" className="font-mono">{lease.ip_address}</Badge>
              <Badge variant="outline" className="font-mono text-xs">{lease.mac_address}</Badge>
              {lease.hostname && (
                <Badge variant="secondary">{lease.hostname}</Badge>
              )}
            </div>
          </div>

          {/* Subnet Selection */}
          <div className="space-y-2">
            <Label htmlFor="subnet">Subnet</Label>
            <Select value={selectedSubnet} onValueChange={setSelectedSubnet}>
              <SelectTrigger>
                <SelectValue placeholder="Select a subnet" />
              </SelectTrigger>
              <SelectContent>
                {network.subnets.map((subnet) => (
                  <SelectItem key={subnet.subnet} value={subnet.subnet}>
                    {subnet.subnet}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Select the subnet where this static mapping will be created
            </p>
          </div>

          {/* Mapping Name */}
          <div className="space-y-2">
            <Label htmlFor="mapping-name">Mapping Name</Label>
            <Input
              id="mapping-name"
              placeholder="e.g., desktop-pc"
              value={mappingName}
              onChange={(e) => setMappingName(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              A unique identifier for this mapping (letters, numbers, hyphens, underscores)
            </p>
          </div>

          {/* IP Address */}
          <div className="space-y-2">
            <Label htmlFor="ip-address">IP Address</Label>
            <Input
              id="ip-address"
              placeholder="e.g., 192.168.1.100"
              value={ipAddress}
              onChange={(e) => setIpAddress(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              The IP address to reserve for this device
            </p>
          </div>

          {/* MAC Address */}
          <div className="space-y-2">
            <Label htmlFor="mac-address">MAC Address</Label>
            <Input
              id="mac-address"
              placeholder="e.g., aa:bb:cc:dd:ee:ff"
              value={macAddress}
              onChange={(e) => setMacAddress(e.target.value)}
              className="font-mono"
            />
            <p className="text-xs text-muted-foreground">
              The MAC address of the device (format: XX:XX:XX:XX:XX:XX)
            </p>
          </div>

          {/* Error Display */}
          {error && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
              <AlertCircle className="h-4 w-4 text-destructive" />
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? "Creating..." : "Create Static Mapping"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
