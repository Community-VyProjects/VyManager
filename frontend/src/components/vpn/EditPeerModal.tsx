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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertCircle,
  UserCog,
  Loader2,
  Eye,
  EyeOff,
  Sparkles,
  Ban,
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { wireguardService, WireGuardPeer } from "@/lib/api/wireguard";
import { ApiError } from "@/lib/types/api";

interface EditPeerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  interfaceName: string;
  peerData: WireGuardPeer | null;
}

export function EditPeerModal({
  open,
  onOpenChange,
  onSuccess,
  interfaceName,
  peerData,
}: EditPeerModalProps) {
  // Form state
  const [publicKey, setPublicKey] = useState("");
  const [allowedIps, setAllowedIps] = useState("");
  const [presharedKey, setPresharedKey] = useState("");
  const [address, setAddress] = useState("");
  const [port, setPort] = useState("");
  const [persistentKeepalive, setPersistentKeepalive] = useState("");
  const [description, setDescription] = useState("");
  const [disabled, setDisabled] = useState(false);
  const [hostName, setHostName] = useState("");

  // UI state
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPresharedKey, setShowPresharedKey] = useState(false);

  // Populate form when peer data changes
  useEffect(() => {
    if (peerData && open) {
      setPublicKey(peerData.public_key || "");
      setAllowedIps(peerData.allowed_ips.join(", "));
      setPresharedKey(peerData.preshared_key || "");
      setAddress(peerData.address || "");
      setPort(peerData.port || "");
      setPersistentKeepalive(peerData.persistent_keepalive || "");
      setDescription(peerData.description || "");
      setDisabled(peerData.disabled || false);
      setHostName(peerData.host_name || "");
    }
  }, [peerData, open]);

  // Generate preshared key
  const handleGeneratePSK = async () => {
    setGenerating(true);
    setError(null);
    try {
      const result = await wireguardService.generatePSK();
      if (result.preshared_key) {
        setPresharedKey(result.preshared_key);
      }
    } catch (err) {
      setError((err as ApiError).message || "Failed to generate preshared key");
    } finally {
      setGenerating(false);
    }
  };

  // Reset form
  const resetForm = () => {
    setPublicKey("");
    setAllowedIps("");
    setPresharedKey("");
    setAddress("");
    setPort("");
    setPersistentKeepalive("");
    setDescription("");
    setDisabled(false);
    setHostName("");
    setError(null);
    setShowPresharedKey(false);
  };

  // Handle close
  const handleClose = () => {
    resetForm();
    onOpenChange(false);
  };

  // Validate form
  const validateForm = (): string | null => {
    if (!publicKey.trim()) {
      return "Public key is required";
    }
    if (!allowedIps.trim()) {
      return "At least one allowed IP is required";
    }
    return null;
  };

  // Handle submit
  const handleSubmit = async () => {
    if (!peerData) return;

    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Build config with changes
      const newConfig: any = {};

      // Public key change
      if (publicKey.trim() !== (peerData.public_key || "")) {
        newConfig.public_key = publicKey.trim();
      }

      // Allowed IPs change
      const newAllowedIps = allowedIps
        .split(",")
        .map((ip) => ip.trim())
        .filter(Boolean);
      if (JSON.stringify(newAllowedIps) !== JSON.stringify(peerData.allowed_ips)) {
        newConfig.allowed_ips = newAllowedIps;
      }

      // Preshared key change (only if not masked)
      if (presharedKey !== "***") {
        if (presharedKey.trim() !== (peerData.preshared_key === "***" ? "***" : peerData.preshared_key || "")) {
          newConfig.preshared_key = presharedKey.trim() || null;
        }
      }

      // Address change
      if (address.trim() !== (peerData.address || "")) {
        newConfig.address = address.trim() || null;
      }

      // Port change
      if (port.trim() !== (peerData.port || "")) {
        newConfig.port = port.trim() || null;
      }

      // Persistent keepalive change
      if (persistentKeepalive.trim() !== (peerData.persistent_keepalive || "")) {
        newConfig.persistent_keepalive = persistentKeepalive.trim() || null;
      }

      // Description change
      if (description.trim() !== (peerData.description || "")) {
        newConfig.description = description.trim() || null;
      }

      // Disabled change
      if (disabled !== (peerData.disabled || false)) {
        newConfig.disabled = disabled;
      }

      // Host name change
      if (hostName.trim() !== (peerData.host_name || "")) {
        newConfig.host_name = hostName.trim() || null;
      }

      // Check if there are any changes
      if (Object.keys(newConfig).length === 0) {
        handleClose();
        return;
      }

      const result = await wireguardService.updatePeer(
        interfaceName,
        peerData.name,
        peerData,
        newConfig
      );

      if (result.success) {
        handleClose();
        onSuccess();
      } else {
        setError(result.error || "Failed to update peer");
      }
    } catch (err) {
      setError((err as ApiError).message || "Failed to update peer");
    } finally {
      setLoading(false);
    }
  };

  if (!peerData) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserCog className="h-5 w-5 text-primary" />
            Edit Peer: {peerData.name}
          </DialogTitle>
          <DialogDescription>
            Modify the peer configuration on {interfaceName}.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="basic" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="basic">Basic</TabsTrigger>
            <TabsTrigger value="endpoint">Endpoint</TabsTrigger>
          </TabsList>

          <TabsContent value="basic" className="space-y-4 mt-4">
            {/* Peer Name (read-only) */}
            <div className="space-y-2">
              <Label>Peer Name</Label>
              <Input value={peerData.name} disabled className="bg-muted" />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="edit-peer-description">Description</Label>
              <Input
                id="edit-peer-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Description for this peer"
              />
              <p className="text-xs text-muted-foreground">
                A description to help identify this peer.
              </p>
            </div>

            {/* Public Key */}
            <div className="space-y-2">
              <Label htmlFor="edit-peer-public-key">Public Key</Label>
              <Input
                id="edit-peer-public-key"
                value={publicKey}
                onChange={(e) => setPublicKey(e.target.value)}
                placeholder="Base64 encoded public key"
                className="font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground">
                The peer&apos;s WireGuard public key.
              </p>
            </div>

            {/* Allowed IPs */}
            <div className="space-y-2">
              <Label htmlFor="edit-peer-allowed-ips">Allowed IPs</Label>
              <Input
                id="edit-peer-allowed-ips"
                value={allowedIps}
                onChange={(e) => setAllowedIps(e.target.value)}
                placeholder="10.0.0.2/32, 192.168.1.0/24"
              />
              <p className="text-xs text-muted-foreground">
                Comma-separated IPs/networks this peer can route.
              </p>
            </div>

            {/* Preshared Key */}
            <div className="space-y-2">
              <Label htmlFor="edit-peer-psk">Preshared Key</Label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input
                    id="edit-peer-psk"
                    type={showPresharedKey ? "text" : "password"}
                    value={presharedKey}
                    onChange={(e) => setPresharedKey(e.target.value)}
                    placeholder="Leave as *** to keep current key"
                    className="pr-10 font-mono text-sm"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full px-3"
                    onClick={() => setShowPresharedKey(!showPresharedKey)}
                  >
                    {showPresharedKey ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleGeneratePSK}
                  disabled={generating}
                  className="gap-2"
                >
                  {generating ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Sparkles className="h-4 w-4" />
                  )}
                  {presharedKey === "***" ? "Replace" : "Generate"}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Keep as &quot;***&quot; to preserve existing key, or generate/enter a new one.
                Clear to remove.
              </p>
            </div>
          </TabsContent>

          <TabsContent value="endpoint" className="space-y-4 mt-4">
            {/* Endpoint IP Address */}
            <div className="space-y-2">
              <Label htmlFor="edit-peer-address">Endpoint IP Address</Label>
              <Input
                id="edit-peer-address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="203.0.113.1"
              />
              <p className="text-xs text-muted-foreground">
                IP address of the remote peer. Use this OR hostname below.
              </p>
            </div>

            {/* Endpoint Hostname */}
            <div className="space-y-2">
              <Label htmlFor="edit-peer-hostname">Endpoint Hostname</Label>
              <Input
                id="edit-peer-hostname"
                value={hostName}
                onChange={(e) => setHostName(e.target.value)}
                placeholder="vpn.example.com"
              />
              <p className="text-xs text-muted-foreground">
                Hostname of the remote peer. Use this OR IP address above.
              </p>
            </div>

            {/* Endpoint Port */}
            <div className="space-y-2">
              <Label htmlFor="edit-peer-port">Endpoint Port</Label>
              <Input
                id="edit-peer-port"
                type="number"
                value={port}
                onChange={(e) => setPort(e.target.value)}
                placeholder="51820"
              />
            </div>

            {/* Persistent Keepalive */}
            <div className="space-y-2">
              <Label htmlFor="edit-peer-keepalive">
                Persistent Keepalive (seconds)
              </Label>
              <Input
                id="edit-peer-keepalive"
                type="number"
                value={persistentKeepalive}
                onChange={(e) => setPersistentKeepalive(e.target.value)}
                placeholder="25"
              />
              <p className="text-xs text-muted-foreground">
                Send keepalive packets every N seconds. Useful for NAT traversal.
              </p>
            </div>

            {/* Disable Peer */}
            <div className="flex items-center space-x-3 pt-2">
              <Checkbox
                id="edit-peer-disabled"
                checked={disabled}
                onCheckedChange={(checked) => setDisabled(checked === true)}
              />
              <div className="space-y-0.5">
                <Label htmlFor="edit-peer-disabled" className="flex items-center gap-2 cursor-pointer">
                  <Ban className="h-4 w-4 text-muted-foreground" />
                  Disable Peer
                </Label>
                <p className="text-xs text-muted-foreground">
                  Disable this peer connection.
                </p>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {/* Error Display */}
        {error && (
          <div className="flex items-start gap-2 rounded-lg bg-destructive/10 border border-destructive/20 p-3">
            <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              "Save Changes"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
