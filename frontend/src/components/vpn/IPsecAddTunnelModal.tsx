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
import { Loader2, Network } from "lucide-react";
import { ipsecService, type ESPGroup } from "@/lib/api/ipsec";
import { useToast } from "@/hooks/useToast";

interface IPsecAddTunnelModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  peerAddress: string;
  espGroups: ESPGroup[];
}

export function IPsecAddTunnelModal({
  open,
  onOpenChange,
  onSuccess,
  peerAddress,
  espGroups,
}: IPsecAddTunnelModalProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  // Settings
  const [tunnelId, setTunnelId] = useState("1");
  const [localPrefix, setLocalPrefix] = useState("");
  const [remotePrefix, setRemotePrefix] = useState("");
  const [espGroup, setEspGroup] = useState("");

  const resetForm = () => {
    setTunnelId("1");
    setLocalPrefix("");
    setRemotePrefix("");
    setEspGroup("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!tunnelId.trim()) {
      toast.error("Validation Error", "Tunnel ID is required");
      return;
    }

    if (!localPrefix.trim()) {
      toast.error("Validation Error", "Local network prefix is required");
      return;
    }

    if (!remotePrefix.trim()) {
      toast.error("Validation Error", "Remote network prefix is required");
      return;
    }

    // Validate CIDR format
    const cidrRegex = /^(\d{1,3}\.){3}\d{1,3}\/\d{1,2}$/;
    if (!cidrRegex.test(localPrefix.trim())) {
      toast.error("Validation Error", "Local prefix must be in CIDR format (e.g., 10.0.0.0/24)");
      return;
    }
    if (!cidrRegex.test(remotePrefix.trim())) {
      toast.error("Validation Error", "Remote prefix must be in CIDR format (e.g., 192.168.0.0/24)");
      return;
    }

    setLoading(true);
    try {
      const response = await ipsecService.addPeerTunnel(peerAddress, tunnelId.trim(), {
        localPrefix: localPrefix.trim(),
        remotePrefix: remotePrefix.trim(),
        espGroup: espGroup || undefined,
      });

      if (response.success) {
        toast.success("Tunnel Created", `Tunnel ${tunnelId} has been added to peer ${peerAddress}`);
        onOpenChange(false);
        onSuccess();
        resetForm();
      } else {
        toast.error("Failed to Create Tunnel", response.error || "Unknown error");
      }
    } catch (error) {
      console.error("Create tunnel error:", error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      toast.error("Error", errorMessage || "Failed to create tunnel");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Network className="h-5 w-5 text-orange-500" />
            Add Tunnel
          </DialogTitle>
          <DialogDescription>
            Add a tunnel to peer <code className="font-mono">{peerAddress}</code>
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="tunnel-id">
                Tunnel ID <span className="text-destructive">*</span>
              </Label>
              <Input
                id="tunnel-id"
                type="number"
                min="1"
                placeholder="e.g., 1"
                value={tunnelId}
                onChange={(e) => setTunnelId(e.target.value)}
                disabled={loading}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="local-prefix">
                Local Network <span className="text-destructive">*</span>
              </Label>
              <Input
                id="local-prefix"
                placeholder="e.g., 10.0.0.0/24"
                value={localPrefix}
                onChange={(e) => setLocalPrefix(e.target.value)}
                disabled={loading}
              />
              <p className="text-xs text-muted-foreground">
                Local network prefix to encrypt (CIDR notation)
              </p>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="remote-prefix">
                Remote Network <span className="text-destructive">*</span>
              </Label>
              <Input
                id="remote-prefix"
                placeholder="e.g., 192.168.0.0/24"
                value={remotePrefix}
                onChange={(e) => setRemotePrefix(e.target.value)}
                disabled={loading}
              />
              <p className="text-xs text-muted-foreground">
                Remote network prefix to reach via tunnel (CIDR notation)
              </p>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="esp-group">ESP Group</Label>
              <Select value={espGroup} onValueChange={setEspGroup} disabled={loading}>
                <SelectTrigger>
                  <SelectValue placeholder="Use peer default" />
                </SelectTrigger>
                <SelectContent>
                  {espGroups.map((g) => (
                    <SelectItem key={g.name} value={g.name}>
                      {g.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Override ESP group for this tunnel (optional)
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
              Add Tunnel
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
