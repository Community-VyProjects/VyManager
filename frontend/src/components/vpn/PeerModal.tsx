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
  UserPlus,
  UserCog,
  Loader2,
  Eye,
  EyeOff,
  Sparkles,
  Ban,
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import {
  wireguardService,
  WireGuardInterface,
  WireGuardPeer,
} from "@/lib/api/wireguard";
import { ApiError } from "@/lib/types/api";
import { lockedIdentity, modalIsEdit, modalWriteKind } from "@/lib/modal-mode";

interface PeerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  interfaceData: WireGuardInterface | null;
  existing?: WireGuardPeer | null;
}

export function PeerModal({
  open,
  onOpenChange,
  onSuccess,
  interfaceData,
  existing,
}: PeerModalProps) {
  const isEdit = modalIsEdit(existing);

  // Form state
  const [name, setName] = useState("");
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

  // Reset form
  const resetForm = () => {
    setName("");
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

  // Populate form from the peer being edited
  const populateForm = (peerData: WireGuardPeer) => {
    setName(peerData.name);
    setPublicKey(peerData.public_key || "");
    setAllowedIps(peerData.allowed_ips.join(", "));
    setPresharedKey(peerData.preshared_key || "");
    setAddress(peerData.address || "");
    setPort(peerData.port || "");
    setPersistentKeepalive(peerData.persistent_keepalive || "");
    setDescription(peerData.description || "");
    setDisabled(peerData.disabled || false);
    setHostName(peerData.host_name || "");
    setError(null);
    setShowPresharedKey(false);
  };

  useEffect(() => {
    if (!open) return;
    if (existing) {
      populateForm(existing);
    } else {
      resetForm();
    }
  }, [open, existing]);

  const lockedName = lockedIdentity(existing, (p) => p.name, name);

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

  // Handle close
  const handleClose = () => {
    onOpenChange(false);
  };

  // Create checks the identity fields the operator can only set once; both
  // modes check the fields VyOS requires on a peer. Order matches the
  // messages the separate create and edit modals used to produce.
  const validate = (isCreate: boolean): string | null => {
    if (isCreate) {
      if (!name.trim()) {
        return "Peer name is required";
      }
      if (/\s/.test(name.trim())) {
        return "Peer name cannot contain spaces";
      }
    }
    if (!publicKey.trim()) {
      return "Public key is required";
    }
    if (!allowedIps.trim()) {
      return "At least one allowed IP is required";
    }
    if (isCreate && interfaceData?.peers.some((p) => p.name === name.trim())) {
      return `Peer '${name}' already exists on this interface`;
    }
    return null;
  };

  const submitCreate = async (target: WireGuardInterface) => {
    const config: {
      name: string;
      public_key: string;
      allowed_ips: string[];
      preshared_key?: string;
      address?: string;
      port?: string;
      persistent_keepalive?: string;
      description?: string;
      disabled?: boolean;
      host_name?: string;
    } = {
      name: name.trim(),
      public_key: publicKey.trim(),
      allowed_ips: allowedIps
        .split(",")
        .map((ip) => ip.trim())
        .filter(Boolean),
    };

    if (presharedKey.trim()) {
      config.preshared_key = presharedKey.trim();
    }

    if (address.trim()) {
      config.address = address.trim();
    }

    if (port.trim()) {
      config.port = port.trim();
    }

    if (persistentKeepalive.trim()) {
      config.persistent_keepalive = persistentKeepalive.trim();
    }

    if (description.trim()) {
      config.description = description.trim();
    }

    if (disabled) {
      config.disabled = true;
    }

    if (hostName.trim()) {
      config.host_name = hostName.trim();
    }

    return wireguardService.createPeer(target.name, config);
  };

  // Only the fields the operator actually changed are sent, so an untouched
  // leaf is never rewritten and a cleared one is deleted.
  const submitUpdate = async (
    target: WireGuardInterface,
    current: WireGuardPeer,
    peerName: string
  ) => {
    const newConfig: Record<string, unknown> = {};

    // Public key change
    if (publicKey.trim() !== (current.public_key || "")) {
      newConfig.public_key = publicKey.trim();
    }

    // Allowed IPs change
    const newAllowedIps = allowedIps
      .split(",")
      .map((ip) => ip.trim())
      .filter(Boolean);
    if (JSON.stringify(newAllowedIps) !== JSON.stringify(current.allowed_ips)) {
      newConfig.allowed_ips = newAllowedIps;
    }

    // Preshared key change (only if not masked)
    if (presharedKey !== "***") {
      if (presharedKey.trim() !== (current.preshared_key === "***" ? "***" : current.preshared_key || "")) {
        newConfig.preshared_key = presharedKey.trim() || null;
      }
    }

    // Address change
    if (address.trim() !== (current.address || "")) {
      newConfig.address = address.trim() || null;
    }

    // Port change
    if (port.trim() !== (current.port || "")) {
      newConfig.port = port.trim() || null;
    }

    // Persistent keepalive change
    if (persistentKeepalive.trim() !== (current.persistent_keepalive || "")) {
      newConfig.persistent_keepalive = persistentKeepalive.trim() || null;
    }

    // Description change
    if (description.trim() !== (current.description || "")) {
      newConfig.description = description.trim() || null;
    }

    // Disabled change
    if (disabled !== (current.disabled || false)) {
      newConfig.disabled = disabled;
    }

    // Host name change
    if (hostName.trim() !== (current.host_name || "")) {
      newConfig.host_name = hostName.trim() || null;
    }

    // Nothing changed: no write to send.
    if (Object.keys(newConfig).length === 0) {
      return null;
    }

    return wireguardService.updatePeer(target.name, peerName, current, newConfig);
  };

  // Handle submit
  const handleSubmit = async () => {
    if (!interfaceData) return;

    const write = modalWriteKind(existing);

    if (write.kind === "update" && !existing) {
      return;
    }

    const validationError = validate(write.kind === "create");
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result =
        write.kind === "update" && existing
          ? await submitUpdate(interfaceData, existing, write.name)
          : await submitCreate(interfaceData);

      if (result === null) {
        handleClose();
        return;
      }

      if (result.success) {
        handleClose();
        onSuccess();
      } else {
        setError(result.error || (isEdit ? "Failed to update peer" : "Failed to add peer"));
      }
    } catch (err) {
      setError(
        (err as ApiError).message || (isEdit ? "Failed to update peer" : "Failed to add peer")
      );
    } finally {
      setLoading(false);
    }
  };

  if (!interfaceData) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isEdit ? (
              <UserCog className="h-5 w-5 text-primary" />
            ) : (
              <UserPlus className="h-5 w-5 text-primary" />
            )}
            {isEdit ? `Edit Peer: ${existing.name}` : `Add Peer to ${interfaceData.name}`}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? `Modify the peer configuration on ${interfaceData.name}. Peer name cannot be changed.`
              : "Configure a new WireGuard peer connection."}
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="basic" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="basic">Basic</TabsTrigger>
            <TabsTrigger value="endpoint">Endpoint</TabsTrigger>
          </TabsList>

          <TabsContent value="basic" className="space-y-4 mt-4">
            {/* Peer Name */}
            <div className="space-y-2">
              <Label htmlFor="peer-name">Peer Name</Label>
              <Input
                id="peer-name"
                value={lockedName.value}
                onChange={(e) => setName(e.target.value)}
                placeholder="my-laptop"
                disabled={lockedName.disabled}
                className={lockedName.disabled ? "bg-muted" : undefined}
              />
              <p className="text-xs text-muted-foreground">
                {isEdit
                  ? "Peer name cannot be changed."
                  : "A friendly name to identify this peer (no spaces)."}
              </p>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="peer-description">
                {isEdit ? "Description" : "Description (optional)"}
              </Label>
              <Input
                id="peer-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={isEdit ? "Description for this peer" : "John's laptop for remote work"}
              />
              <p className="text-xs text-muted-foreground">
                A description to help identify this peer.
              </p>
            </div>

            {/* Public Key */}
            <div className="space-y-2">
              <Label htmlFor="peer-public-key">Public Key</Label>
              <Input
                id="peer-public-key"
                value={publicKey}
                onChange={(e) => setPublicKey(e.target.value)}
                placeholder={
                  isEdit ? "Base64 encoded public key" : "Base64 encoded public key from peer"
                }
                className="font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground">
                {isEdit
                  ? "The peer\u2019s WireGuard public key."
                  : "The peer\u2019s WireGuard public key. Get this from the peer device."}
              </p>
            </div>

            {/* Allowed IPs */}
            <div className="space-y-2">
              <Label htmlFor="peer-allowed-ips">Allowed IPs</Label>
              <Input
                id="peer-allowed-ips"
                value={allowedIps}
                onChange={(e) => setAllowedIps(e.target.value)}
                placeholder="10.0.0.2/32, 192.168.1.0/24"
              />
              <p className="text-xs text-muted-foreground">
                {isEdit
                  ? "Comma-separated IPs/networks this peer can route."
                  : "Comma-separated IPs/networks this peer can route. Use x.x.x.x/32 for single client or 0.0.0.0/0 for all traffic."}
              </p>
            </div>

            {/* Preshared Key */}
            <div className="space-y-2">
              <Label htmlFor="peer-psk">
                {isEdit ? "Preshared Key" : "Preshared Key (optional)"}
              </Label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input
                    id="peer-psk"
                    type={showPresharedKey ? "text" : "password"}
                    value={presharedKey}
                    onChange={(e) => setPresharedKey(e.target.value)}
                    placeholder={
                      isEdit
                        ? "Leave as *** to keep current key"
                        : "Optional additional encryption"
                    }
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
                {isEdit
                  ? "Keep as \u201c***\u201d to preserve existing key, or generate/enter a new one. Clear to remove."
                  : "Adds an extra layer of symmetric encryption for post-quantum security."}
              </p>
            </div>
          </TabsContent>

          <TabsContent value="endpoint" className="space-y-4 mt-4">
            {!isEdit && (
              <div className="rounded-lg bg-muted/50 border p-3 mb-4">
                <p className="text-sm text-muted-foreground">
                  Endpoint settings are for connecting to peers that act as servers.
                  Leave these empty if this peer will connect to your VyOS device.
                </p>
              </div>
            )}

            {/* Endpoint Address (IP) */}
            <div className="space-y-2">
              <Label htmlFor="peer-address">Endpoint IP Address</Label>
              <Input
                id="peer-address"
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
              <Label htmlFor="peer-hostname">Endpoint Hostname</Label>
              <Input
                id="peer-hostname"
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
              <Label htmlFor="peer-port">Endpoint Port</Label>
              <Input
                id="peer-port"
                type="number"
                value={port}
                onChange={(e) => setPort(e.target.value)}
                placeholder="51820"
              />
              {!isEdit && (
                <p className="text-xs text-muted-foreground">
                  UDP port on the remote peer. Default: 51820
                </p>
              )}
            </div>

            {/* Persistent Keepalive */}
            <div className="space-y-2">
              <Label htmlFor="peer-keepalive">Persistent Keepalive (seconds)</Label>
              <Input
                id="peer-keepalive"
                type="number"
                value={persistentKeepalive}
                onChange={(e) => setPersistentKeepalive(e.target.value)}
                placeholder="25"
              />
              <p className="text-xs text-muted-foreground">
                {isEdit
                  ? "Send keepalive packets every N seconds. Useful for NAT traversal."
                  : "Send keepalive packets every N seconds. Useful for NAT traversal (typically 25 seconds)."}
              </p>
            </div>

            {/* Disable Peer */}
            <div className="flex items-center space-x-3 pt-2">
              <Checkbox
                id="peer-disabled"
                checked={disabled}
                onCheckedChange={(checked) => setDisabled(checked === true)}
              />
              <div className="space-y-0.5">
                <Label htmlFor="peer-disabled" className="flex items-center gap-2 cursor-pointer">
                  <Ban className="h-4 w-4 text-muted-foreground" />
                  Disable Peer
                </Label>
                <p className="text-xs text-muted-foreground">
                  {isEdit
                    ? "Disable this peer connection."
                    : "Create the peer in a disabled state."}
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
                {isEdit ? "Saving..." : "Adding..."}
              </>
            ) : isEdit ? (
              "Save Changes"
            ) : (
              "Add Peer"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
