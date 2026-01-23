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

interface AddRangeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  network: DHCPSharedNetwork;
}

export function AddRangeModal({
  open,
  onOpenChange,
  onSuccess,
  network,
}: AddRangeModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form fields
  const [selectedSubnet, setSelectedSubnet] = useState("");
  const [startIp, setStartIp] = useState("");
  const [stopIp, setStopIp] = useState("");

  // Calculate the next available range ID for the selected subnet
  const getNextRangeId = (subnetCidr: string): string => {
    const subnet = network.subnets.find((s) => s.subnet === subnetCidr);
    if (!subnet || subnet.ranges.length === 0) {
      return "0";
    }

    // Extract numeric IDs from existing ranges
    const existingIds = subnet.ranges
      .map((r) => parseInt(r.range_id, 10))
      .filter((id) => !isNaN(id));

    if (existingIds.length === 0) {
      return "0";
    }

    // Find the lowest available number starting from 0
    existingIds.sort((a, b) => a - b);
    for (let i = 0; i <= existingIds.length; i++) {
      if (!existingIds.includes(i)) {
        return i.toString();
      }
    }

    return (Math.max(...existingIds) + 1).toString();
  };

  // Reset form when modal opens
  useEffect(() => {
    if (open) {
      setError(null);
      setStartIp("");
      setStopIp("");
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

    // Validate start IP
    if (!startIp.trim()) {
      setError("Start IP address is required");
      return false;
    }
    const ipPattern = /^(\d{1,3}\.){3}\d{1,3}$/;
    if (!ipPattern.test(startIp.trim())) {
      setError("Invalid start IP address format");
      return false;
    }
    const startParts = startIp.trim().split(".").map(Number);
    if (startParts.some((p) => p < 0 || p > 255)) {
      setError("Start IP address octets must be between 0 and 255");
      return false;
    }

    // Validate stop IP
    if (!stopIp.trim()) {
      setError("Stop IP address is required");
      return false;
    }
    if (!ipPattern.test(stopIp.trim())) {
      setError("Invalid stop IP address format");
      return false;
    }
    const stopParts = stopIp.trim().split(".").map(Number);
    if (stopParts.some((p) => p < 0 || p > 255)) {
      setError("Stop IP address octets must be between 0 and 255");
      return false;
    }

    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setLoading(true);
    setError(null);

    try {
      const rangeId = getNextRangeId(selectedSubnet);
      await dhcpService.createRange(
        network.name,
        selectedSubnet,
        rangeId,
        startIp.trim(),
        stopIp.trim()
      );

      handleClose();
      onSuccess();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to create range"
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
            Add DHCP Range
          </DialogTitle>
          <DialogDescription>
            Create a new IP address range for DHCP allocation
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
              Select the subnet where this range will be created
            </p>
          </div>

          {/* Start IP */}
          <div className="space-y-2">
            <Label htmlFor="start-ip">Start IP Address</Label>
            <Input
              id="start-ip"
              placeholder="e.g., 192.168.1.100"
              value={startIp}
              onChange={(e) => setStartIp(e.target.value)}
              className="font-mono"
            />
            <p className="text-xs text-muted-foreground">
              The first IP address in the range
            </p>
          </div>

          {/* Stop IP */}
          <div className="space-y-2">
            <Label htmlFor="stop-ip">Stop IP Address</Label>
            <Input
              id="stop-ip"
              placeholder="e.g., 192.168.1.200"
              value={stopIp}
              onChange={(e) => setStopIp(e.target.value)}
              className="font-mono"
            />
            <p className="text-xs text-muted-foreground">
              The last IP address in the range
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
            {loading ? "Creating..." : "Create Range"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
