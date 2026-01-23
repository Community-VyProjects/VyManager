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
import { Loader2, Zap, Shield, ArrowRight } from "lucide-react";
import { ipsecService } from "@/lib/api/ipsec";
import { useToast } from "@/hooks/useToast";

interface IPsecQuickSetupModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function IPsecQuickSetupModal({
  open,
  onOpenChange,
  onSuccess,
}: IPsecQuickSetupModalProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  // Form state
  const [peerAddress, setPeerAddress] = useState("");
  const [localAddress, setLocalAddress] = useState("");
  const [preSharedKey, setPreSharedKey] = useState("");
  const [localNetwork, setLocalNetwork] = useState("");
  const [remoteNetwork, setRemoteNetwork] = useState("");

  const resetForm = () => {
    setPeerAddress("");
    setLocalAddress("");
    setPreSharedKey("");
    setLocalNetwork("");
    setRemoteNetwork("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!peerAddress.trim()) {
      toast.error("Validation Error", "Remote peer address is required");
      return;
    }

    if (!localAddress.trim()) {
      toast.error("Validation Error", "Local address is required");
      return;
    }

    if (!preSharedKey.trim()) {
      toast.error("Validation Error", "Pre-shared key is required");
      return;
    }

    if (preSharedKey.length < 8) {
      toast.error("Validation Error", "Pre-shared key must be at least 8 characters");
      return;
    }

    if (!localNetwork.trim()) {
      toast.error("Validation Error", "Local network is required");
      return;
    }

    if (!remoteNetwork.trim()) {
      toast.error("Validation Error", "Remote network is required");
      return;
    }

    // Validate CIDR format
    const cidrRegex = /^(\d{1,3}\.){3}\d{1,3}\/\d{1,2}$/;
    if (!cidrRegex.test(localNetwork.trim())) {
      toast.error("Validation Error", "Local network must be in CIDR format (e.g., 10.0.0.0/24)");
      return;
    }
    if (!cidrRegex.test(remoteNetwork.trim())) {
      toast.error("Validation Error", "Remote network must be in CIDR format (e.g., 192.168.0.0/24)");
      return;
    }

    setLoading(true);
    try {
      const response = await ipsecService.quickSetupSiteToSite({
        peerAddress: peerAddress.trim(),
        localAddress: localAddress.trim(),
        preSharedKey: preSharedKey,
        localNetwork: localNetwork.trim(),
        remoteNetwork: remoteNetwork.trim(),
      });

      if (response.success) {
        toast.success("VPN Created", "Site-to-site VPN has been configured successfully");
        onOpenChange(false);
        onSuccess();
        resetForm();
      } else {
        toast.error("Setup Failed", response.error || "Unknown error");
      }
    } catch (error) {
      console.error("Quick setup error:", error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      toast.error("Error", errorMessage || "Failed to create VPN");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-yellow-500" />
            Quick VPN Setup
          </DialogTitle>
          <DialogDescription>
            Create a site-to-site VPN with secure defaults (IKEv2, AES-256, SHA-256, DH14).
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            {/* Visual representation */}
            <div className="flex items-center justify-center gap-4 p-4 rounded-lg bg-accent/50">
              <div className="text-center">
                <Shield className="h-8 w-8 mx-auto mb-1 text-blue-500" />
                <p className="text-xs font-medium">Local Site</p>
              </div>
              <ArrowRight className="h-6 w-6 text-muted-foreground" />
              <div className="flex-1 border-t-2 border-dashed border-muted-foreground/30" />
              <ArrowRight className="h-6 w-6 text-muted-foreground" />
              <div className="text-center">
                <Shield className="h-8 w-8 mx-auto mb-1 text-green-500" />
                <p className="text-xs font-medium">Remote Site</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="local-address">
                  Local Address <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="local-address"
                  placeholder="e.g., 198.51.100.1"
                  value={localAddress}
                  onChange={(e) => setLocalAddress(e.target.value)}
                  disabled={loading}
                />
                <p className="text-xs text-muted-foreground">Your public IP</p>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="peer-address">
                  Remote Peer <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="peer-address"
                  placeholder="e.g., 203.0.113.1"
                  value={peerAddress}
                  onChange={(e) => setPeerAddress(e.target.value)}
                  disabled={loading}
                />
                <p className="text-xs text-muted-foreground">Remote public IP</p>
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="psk">
                Pre-Shared Key <span className="text-destructive">*</span>
              </Label>
              <Input
                id="psk"
                type="password"
                placeholder="Enter a strong pre-shared key"
                value={preSharedKey}
                onChange={(e) => setPreSharedKey(e.target.value)}
                disabled={loading}
              />
              <p className="text-xs text-muted-foreground">
                Must be identical on both VPN endpoints
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="local-network">
                  Local Network <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="local-network"
                  placeholder="e.g., 10.0.0.0/24"
                  value={localNetwork}
                  onChange={(e) => setLocalNetwork(e.target.value)}
                  disabled={loading}
                />
                <p className="text-xs text-muted-foreground">Your LAN subnet</p>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="remote-network">
                  Remote Network <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="remote-network"
                  placeholder="e.g., 192.168.0.0/24"
                  value={remoteNetwork}
                  onChange={(e) => setRemoteNetwork(e.target.value)}
                  disabled={loading}
                />
                <p className="text-xs text-muted-foreground">Remote LAN subnet</p>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-blue-500/10 text-sm">
              <p className="font-medium text-blue-600 dark:text-blue-400 mb-1">
                Default Settings:
              </p>
              <ul className="text-xs text-muted-foreground space-y-0.5">
                <li>• IKEv2 key exchange</li>
                <li>• AES-256 encryption, SHA-256 hash, DH Group 14</li>
                <li>• Dead Peer Detection with restart action</li>
                <li>• Perfect Forward Secrecy enabled</li>
              </ul>
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
              Create VPN
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
