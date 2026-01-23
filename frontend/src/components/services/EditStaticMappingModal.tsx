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
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, Monitor, Network } from "lucide-react";
import { dhcpService, type DHCPStaticMapping } from "@/lib/api/dhcp";

interface EditStaticMappingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  networkName: string;
  subnet: string;
  mapping: DHCPStaticMapping;
}

export function EditStaticMappingModal({
  open,
  onOpenChange,
  onSuccess,
  networkName,
  subnet,
  mapping,
}: EditStaticMappingModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form fields
  const [ipAddress, setIpAddress] = useState("");
  const [macAddress, setMacAddress] = useState("");
  const [disabled, setDisabled] = useState(false);

  // Load mapping data when modal opens
  useEffect(() => {
    if (open && mapping) {
      setIpAddress(mapping.ip_address || "");
      setMacAddress(mapping.mac_address || "");
      setDisabled(mapping.disable);
      setError(null);
    }
  }, [open, mapping]);

  const handleClose = () => {
    setError(null);
    onOpenChange(false);
  };

  const validateForm = (): boolean => {
    // Validate IP address format if provided
    if (ipAddress.trim()) {
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
    }

    // Validate MAC address format if provided
    if (macAddress.trim()) {
      const macPattern = /^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/;
      if (!macPattern.test(macAddress.trim())) {
        setError("Invalid MAC address format (use XX:XX:XX:XX:XX:XX)");
        return false;
      }
    }

    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setLoading(true);
    setError(null);

    try {
      const config: {
        ip_address?: string;
        mac_address?: string;
        disable?: boolean;
        delete_ip_address?: boolean;
        delete_mac_address?: boolean;
      } = {};

      // Handle IP address changes
      const newIp = ipAddress.trim();
      const oldIp = mapping.ip_address || "";
      if (newIp !== oldIp) {
        if (newIp) {
          config.ip_address = newIp;
        } else if (oldIp) {
          config.delete_ip_address = true;
        }
      }

      // Handle MAC address changes
      const newMac = macAddress.trim().toLowerCase();
      const oldMac = (mapping.mac_address || "").toLowerCase();
      if (newMac !== oldMac) {
        if (newMac) {
          config.mac_address = newMac;
        } else if (oldMac) {
          config.delete_mac_address = true;
        }
      }

      // Handle disable state changes
      if (disabled !== mapping.disable) {
        config.disable = disabled;
      }

      // Only make API call if there are changes
      if (Object.keys(config).length > 0) {
        await dhcpService.updateStaticMapping(
          networkName,
          subnet,
          mapping.name,
          config
        );
      }

      handleClose();
      onSuccess();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to update static mapping"
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
            <Monitor className="h-5 w-5" />
            Edit Static Mapping
          </DialogTitle>
          <DialogDescription>
            Update the static DHCP mapping configuration
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Context Info */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 rounded-lg p-3">
            <Network className="h-4 w-4" />
            <span>Network: <span className="font-medium text-foreground">{networkName}</span></span>
            <span className="mx-2">|</span>
            <span>Subnet: <Badge variant="outline">{subnet}</Badge></span>
          </div>

          {/* Mapping Name (Read-only) */}
          <div className="space-y-2">
            <Label>Mapping Name</Label>
            <Input value={mapping.name} disabled className="bg-muted" />
            <p className="text-xs text-muted-foreground">
              The mapping name cannot be changed
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
              The IP address to assign to this device
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
            />
            <p className="text-xs text-muted-foreground">
              The MAC address of the device (format: XX:XX:XX:XX:XX:XX)
            </p>
          </div>

          {/* Disabled Toggle */}
          <div className="flex items-center gap-3 rounded-lg border p-4">
            <Checkbox
              id="disabled"
              checked={disabled}
              onCheckedChange={(checked) => setDisabled(checked === true)}
            />
            <div className="space-y-0.5">
              <Label htmlFor="disabled" className="cursor-pointer">Disable Mapping</Label>
              <p className="text-xs text-muted-foreground">
                When disabled, this mapping will not assign the IP to the device
              </p>
            </div>
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
            {loading ? "Saving..." : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
