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
import { Switch } from "@/components/ui/switch";
import { Loader2, Network } from "lucide-react";
import { bgpService } from "@/lib/api/bgp";
import { useToast } from "@/hooks/useToast";

interface BGPConfigureModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function BGPConfigureModal({ open, onOpenChange, onSuccess }: BGPConfigureModalProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [asn, setAsn] = useState("");
  const [routerId, setRouterId] = useState("");
  const [logNeighborChanges, setLogNeighborChanges] = useState(true);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!asn.trim()) {
      toast.error("Validation Error", "ASN is required");
      return;
    }

    // Validate ASN is a number
    const asnNum = parseInt(asn, 10);
    if (isNaN(asnNum) || asnNum < 1 || asnNum > 4294967295) {
      toast.error("Validation Error", "ASN must be a valid number between 1 and 4294967295");
      return;
    }

    // Validate router ID if provided (should be IPv4 format)
    if (routerId.trim()) {
      const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
      if (!ipv4Regex.test(routerId)) {
        toast.error("Validation Error", "Router ID must be a valid IPv4 address");
        return;
      }
    }

    setLoading(true);
    try {
      const response = await bgpService.initializeBGP(asn, {
        routerId: routerId.trim() || undefined,
        logNeighborChanges,
      });

      if (response.success) {
        toast.success("BGP Configured", `BGP AS ${asn} has been configured successfully`);
        onOpenChange(false);
        onSuccess();
        // Reset form
        setAsn("");
        setRouterId("");
        setLogNeighborChanges(true);
      } else {
        toast.error("Configuration Failed", response.error || "Failed to configure BGP");
      }
    } catch (error) {
      console.error("BGP configuration error:", error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      toast.error("Error", errorMessage || "Failed to configure BGP");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Network className="h-5 w-5 text-purple-500" />
            Configure BGP
          </DialogTitle>
          <DialogDescription>
            Initialize BGP routing protocol with your Autonomous System Number.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="asn">
                Autonomous System Number (ASN) <span className="text-destructive">*</span>
              </Label>
              <Input
                id="asn"
                placeholder="e.g., 65000"
                value={asn}
                onChange={(e) => setAsn(e.target.value)}
                disabled={loading}
              />
              <p className="text-xs text-muted-foreground">
                Private ASN range: 64512-65534 (16-bit) or 4200000000-4294967294 (32-bit)
              </p>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="router-id">Router ID (optional)</Label>
              <Input
                id="router-id"
                placeholder="e.g., 10.0.0.1"
                value={routerId}
                onChange={(e) => setRouterId(e.target.value)}
                disabled={loading}
              />
              <p className="text-xs text-muted-foreground">
                IPv4 address used to identify this router. If not set, VyOS will auto-select.
              </p>
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="log-changes">Log Neighbor Changes</Label>
                <p className="text-xs text-muted-foreground">
                  Log BGP neighbor state changes
                </p>
              </div>
              <Switch
                id="log-changes"
                checked={logNeighborChanges}
                onCheckedChange={setLogNeighborChanges}
                disabled={loading}
              />
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
              Configure BGP
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
