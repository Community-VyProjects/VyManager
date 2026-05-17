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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AlertCircle, Network, Plus } from "lucide-react";
import { dhcpService, type DHCPSharedNetwork } from "@/lib/api/dhcp";

interface AddStaticMappingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  network: DHCPSharedNetwork;
}

export function AddStaticMappingModal({
  open,
  onOpenChange,
  onSuccess,
  network,
}: AddStaticMappingModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form fields
  const [selectedSubnet, setSelectedSubnet] = useState("");
  const [mappingName, setMappingName] = useState("");
  const [ipAddress, setIpAddress] = useState("");
  const [macAddress, setMacAddress] = useState("");
  const [description, setDescription] = useState("");

  // Reset form when modal opens
  useEffect(() => {
    if (open) {
      setError(null);
      setMappingName("");
      setIpAddress("");
      setMacAddress("");
      setDescription("");
      // Auto-select subnet if there's only one
      if (network.subnets.length === 1) {
        setSelectedSubnet(network.subnets[0].subnet);
      } else {
        setSelectedSubnet("");
      }
    }
  }, [open, network]);

  const handleClose = () => {
    setError(null);
    onOpenChange(false);
  };

  const validateForm = (): boolean => {
    // Validate subnet selection
    if (!selectedSubnet) {
      setError("Please select a subnet");
      return false;
    }

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

    // Validate IP address
    if (!ipAddress.trim()) {
      setError("IP address is required");
      return false;
    }
    const ipPattern = /^(\d{1,3}\.){3}\d{1,3}$/;
    if (!ipPattern.test(ipAddress.trim())) {
      setError("Invalid IP address format");
      return false;
    }
    const ipParts = ipAddress.trim().split(".").map(Number);
    if (ipParts.some((p) => p < 0 || p > 255)) {
      setError("IP address octets must be between 0 and 255");
      return false;
    }

    // Validate MAC address
    if (!macAddress.trim()) {
      setError("MAC address is required");
      return false;
    }
    const macPattern = /^([0-9A-Fa-f]{2}:){5}[0-9A-Fa-f]{2}$/;
    if (!macPattern.test(macAddress.trim())) {
      setError("Invalid MAC address format (expected: XX:XX:XX:XX:XX:XX)");
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
        macAddress.trim(),
        description.trim() || undefined
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
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Add Static Mapping
          </DialogTitle>
          <DialogDescription>
            Create a new static MAC to IP address mapping
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Network Info */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 rounded-lg p-3">
            <Network className="h-4 w-4" />
            <span>Network: <span className="font-medium text-foreground">{network.name}</span></span>
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
              Select the subnet for this static mapping
            </p>
          </div>

          {/* Mapping Name */}
          <div className="space-y-2">
            <Label htmlFor="mapping-name">Mapping Name</Label>
            <Input
              id="mapping-name"
              placeholder="e.g., server-1 or printer-hp"
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
              className="font-mono"
            />
            <p className="text-xs text-muted-foreground">
              The IP address to assign to this device
            </p>
          </div>

          {/* MAC Address */}
          <div className="space-y-2">
            <Label htmlFor="mac-address">MAC Address</Label>
            <Input
              id="mac-address"
              placeholder="e.g., AA:BB:CC:DD:EE:FF"
              value={macAddress}
              onChange={(e) => setMacAddress(e.target.value.toUpperCase())}
              className="font-mono"
            />
            <p className="text-xs text-muted-foreground">
              The hardware MAC address of the device
            </p>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="mapping-description">Description</Label>
            <Input
              id="mapping-description"
              placeholder="Optional description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
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
            {loading ? "Creating..." : "Create Mapping"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
