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
import { AlertCircle, Network, Pencil } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { dhcpService, type DHCPRange } from "@/lib/api/dhcp";

interface EditRangeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  networkName: string;
  subnet: string;
  range: DHCPRange;
}

export function EditRangeModal({
  open,
  onOpenChange,
  onSuccess,
  networkName,
  subnet,
  range,
}: EditRangeModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form fields
  const [startIp, setStartIp] = useState("");
  const [stopIp, setStopIp] = useState("");

  // Reset form when modal opens
  useEffect(() => {
    if (open) {
      setError(null);
      setStartIp(range.start || "");
      setStopIp(range.stop || "");
    }
  }, [open, range]);

  const handleClose = () => {
    setError(null);
    onOpenChange(false);
  };

  const validateForm = (): boolean => {
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
      // Update range by deleting and recreating with new values
      await dhcpService.deleteRange(networkName, subnet, range.range_id);
      await dhcpService.createRange(
        networkName,
        subnet,
        range.range_id,
        startIp.trim(),
        stopIp.trim()
      );

      handleClose();
      onSuccess();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to update range"
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
            <Pencil className="h-5 w-5" />
            Edit DHCP Range
          </DialogTitle>
          <DialogDescription>
            Modify the IP address range for DHCP allocation
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Network and Subnet Info */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 rounded-lg p-3">
            <Network className="h-4 w-4" />
            <span>Network: <span className="font-medium text-foreground">{networkName}</span></span>
            <span className="text-muted-foreground">|</span>
            <span>Subnet: <span className="font-medium text-foreground">{subnet}</span></span>
          </div>

          {/* Range ID (read-only) */}
          <div className="space-y-2">
            <Label>Range ID</Label>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="font-mono">
                {range.range_id}
              </Badge>
            </div>
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
            {loading ? "Saving..." : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
