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
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AlertCircle, Loader2 } from "lucide-react";
import type { BfdPeer, BfdCapabilities } from "@/lib/api/bfd";

interface BfdPeerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (peer: BfdPeer) => Promise<void>;
  existingPeer?: BfdPeer | null;
  profiles: string[];
  capabilities?: BfdCapabilities | null;
}

export function BfdPeerModal({
  open,
  onOpenChange,
  onSubmit,
  existingPeer,
  profiles,
  capabilities,
}: BfdPeerModalProps) {
  const isEditMode = !!existingPeer;

  // Form state
  const [address, setAddress] = useState("");
  const [shutdown, setShutdown] = useState(false);
  const [passive, setPassive] = useState(false);
  const [echoMode, setEchoMode] = useState(false);
  const [multihop, setMultihop] = useState(false);
  const [transmit, setTransmit] = useState("");
  const [receive, setReceive] = useState("");
  const [echoInterval, setEchoInterval] = useState("");
  const [multiplier, setMultiplier] = useState("");
  const [profile, setProfile] = useState("");
  const [sourceAddress, setSourceAddress] = useState("");
  const [sourceInterface, setSourceInterface] = useState("");
  const [minimumTtl, setMinimumTtl] = useState("");
  const [vrf, setVrf] = useState("");

  // UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Populate form when editing or when modal opens
  useEffect(() => {
    if (open) {
      if (existingPeer) {
        setAddress(existingPeer.address);
        setShutdown(existingPeer.shutdown);
        setPassive(existingPeer.passive);
        setEchoMode(existingPeer.echo_mode);
        setMultihop(existingPeer.multihop);
        setTransmit(
          existingPeer.interval.transmit != null
            ? String(existingPeer.interval.transmit)
            : ""
        );
        setReceive(
          existingPeer.interval.receive != null
            ? String(existingPeer.interval.receive)
            : ""
        );
        setEchoInterval(
          existingPeer.interval.echo_interval != null
            ? String(existingPeer.interval.echo_interval)
            : ""
        );
        setMultiplier(
          existingPeer.interval.multiplier != null
            ? String(existingPeer.interval.multiplier)
            : ""
        );
        setProfile(existingPeer.profile || "");
        setSourceAddress(existingPeer.source.address || "");
        setSourceInterface(existingPeer.source.interface || "");
        setMinimumTtl(
          existingPeer.minimum_ttl != null
            ? String(existingPeer.minimum_ttl)
            : ""
        );
        setVrf(existingPeer.vrf || "");
      } else {
        resetForm();
      }
    }
  }, [open, existingPeer]);

  const resetForm = () => {
    setAddress("");
    setShutdown(false);
    setPassive(false);
    setEchoMode(false);
    setMultihop(false);
    setTransmit("");
    setReceive("");
    setEchoInterval("");
    setMultiplier("");
    setProfile("");
    setSourceAddress("");
    setSourceInterface("");
    setMinimumTtl("");
    setVrf("");
    setError(null);
  };

  const handleClose = () => {
    resetForm();
    onOpenChange(false);
  };

  const validateForm = (): string | null => {
    if (!address.trim()) {
      return "Peer address is required";
    }

    if (!address.includes(".") && !address.includes(":")) {
      return "Peer address must be a valid IPv4 or IPv6 address";
    }

    if (transmit.trim()) {
      const val = parseInt(transmit.trim(), 10);
      if (isNaN(val) || val < 10 || val > 60000) {
        return "Transmit interval must be between 10 and 60000 ms";
      }
    }

    if (receive.trim()) {
      const val = parseInt(receive.trim(), 10);
      if (isNaN(val) || val < 10 || val > 60000) {
        return "Receive interval must be between 10 and 60000 ms";
      }
    }

    if (echoInterval.trim()) {
      const val = parseInt(echoInterval.trim(), 10);
      if (isNaN(val) || val < 10 || val > 60000) {
        return "Echo interval must be between 10 and 60000 ms";
      }
    }

    if (multiplier.trim()) {
      const val = parseInt(multiplier.trim(), 10);
      if (isNaN(val) || val < 2 || val > 255) {
        return "Multiplier must be between 2 and 255";
      }
    }

    if (minimumTtl.trim()) {
      const val = parseInt(minimumTtl.trim(), 10);
      if (isNaN(val) || val < 1 || val > 254) {
        return "Minimum TTL must be between 1 and 254";
      }
      if (!multihop) {
        return "Multihop must be enabled when minimum TTL is set";
      }
    }

    return null;
  };

  const handleSubmit = async () => {
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const peer: BfdPeer = {
        address: address.trim(),
        echo_mode: echoMode,
        interval: {
          echo_interval: echoInterval.trim()
            ? parseInt(echoInterval.trim(), 10)
            : null,
          multiplier: multiplier.trim()
            ? parseInt(multiplier.trim(), 10)
            : null,
          receive: receive.trim() ? parseInt(receive.trim(), 10) : null,
          transmit: transmit.trim() ? parseInt(transmit.trim(), 10) : null,
        },
        minimum_ttl: minimumTtl.trim()
          ? parseInt(minimumTtl.trim(), 10)
          : null,
        multihop,
        passive,
        profile: profile && profile !== "__none__" ? profile : null,
        shutdown,
        source: {
          address: sourceAddress.trim() || null,
          interface: sourceInterface.trim() || null,
        },
        vrf: vrf.trim() || null,
      };

      await onSubmit(peer);
      handleClose();
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Operation failed";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {isEditMode ? "Edit BFD Peer" : "Add BFD Peer"}
          </DialogTitle>
          <DialogDescription>
            {isEditMode
              ? `Modify the BFD peer configuration for ${existingPeer?.address}.`
              : "Configure a new BFD peer for bidirectional forwarding detection."}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="space-y-6 pb-2">
            {/* Peer Address */}
            <div className="space-y-2">
              <Label htmlFor="bfd-peer-address">Peer Address</Label>
              <Input
                id="bfd-peer-address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="e.g. 192.0.2.1 or 2001:db8::1"
                disabled={isEditMode}
                className={isEditMode ? "bg-muted" : ""}
              />
              <p className="text-xs text-muted-foreground">
                IPv4 or IPv6 address of the BFD peer.
              </p>
            </div>

            {/* Status & Mode Section */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium">Status &amp; Mode</h4>
              <div className="space-y-3 rounded-lg border p-3">
                {/* Shutdown */}
                <div className="flex items-center space-x-3">
                  <Checkbox
                    id="bfd-peer-shutdown"
                    checked={shutdown}
                    onCheckedChange={(checked) =>
                      setShutdown(checked === true)
                    }
                  />
                  <div className="flex-1">
                    <Label
                      htmlFor="bfd-peer-shutdown"
                      className="cursor-pointer text-destructive"
                    >
                      Shutdown
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Administratively disable this BFD peer.
                    </p>
                  </div>
                </div>

                {/* Passive */}
                <div className="flex items-center space-x-3">
                  <Checkbox
                    id="bfd-peer-passive"
                    checked={passive}
                    onCheckedChange={(checked) =>
                      setPassive(checked === true)
                    }
                  />
                  <div className="flex-1">
                    <Label
                      htmlFor="bfd-peer-passive"
                      className="cursor-pointer"
                    >
                      Passive Mode
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Wait for the remote peer to initiate the BFD session.
                    </p>
                  </div>
                </div>

                {/* Echo Mode */}
                <div className="flex items-center space-x-3">
                  <Checkbox
                    id="bfd-peer-echo-mode"
                    checked={echoMode}
                    onCheckedChange={(checked) =>
                      setEchoMode(checked === true)
                    }
                  />
                  <div className="flex-1">
                    <Label
                      htmlFor="bfd-peer-echo-mode"
                      className="cursor-pointer"
                    >
                      Echo Mode
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Enable BFD echo mode for faster failure detection.
                    </p>
                  </div>
                </div>

                {/* Multihop */}
                <div className="flex items-center space-x-3">
                  <Checkbox
                    id="bfd-peer-multihop"
                    checked={multihop}
                    onCheckedChange={(checked) =>
                      setMultihop(checked === true)
                    }
                  />
                  <div className="flex-1">
                    <Label
                      htmlFor="bfd-peer-multihop"
                      className="cursor-pointer"
                    >
                      Multihop
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Enable multihop BFD session (required for minimum TTL).
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Timer Intervals Section */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium">Timer Intervals</h4>
              <div className="grid grid-cols-2 gap-4">
                {/* Transmit Interval */}
                <div className="space-y-2">
                  <Label htmlFor="bfd-peer-transmit">
                    Transmit Interval (ms)
                  </Label>
                  <Input
                    id="bfd-peer-transmit"
                    type="number"
                    value={transmit}
                    onChange={(e) => setTransmit(e.target.value)}
                    placeholder="300"
                    min={10}
                    max={60000}
                  />
                </div>

                {/* Receive Interval */}
                <div className="space-y-2">
                  <Label htmlFor="bfd-peer-receive">
                    Receive Interval (ms)
                  </Label>
                  <Input
                    id="bfd-peer-receive"
                    type="number"
                    value={receive}
                    onChange={(e) => setReceive(e.target.value)}
                    placeholder="300"
                    min={10}
                    max={60000}
                  />
                </div>

                {/* Echo Interval */}
                <div className="space-y-2">
                  <Label htmlFor="bfd-peer-echo-interval">
                    Echo Interval (ms)
                  </Label>
                  <Input
                    id="bfd-peer-echo-interval"
                    type="number"
                    value={echoInterval}
                    onChange={(e) => setEchoInterval(e.target.value)}
                    placeholder="10-60000"
                    min={10}
                    max={60000}
                  />
                </div>

                {/* Multiplier */}
                <div className="space-y-2">
                  <Label htmlFor="bfd-peer-multiplier">Multiplier</Label>
                  <Input
                    id="bfd-peer-multiplier"
                    type="number"
                    value={multiplier}
                    onChange={(e) => setMultiplier(e.target.value)}
                    placeholder="3"
                    min={2}
                    max={255}
                  />
                </div>
              </div>
            </div>

            {/* Advanced Section */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium">Advanced</h4>
              <div className="space-y-4">
                {/* Profile */}
                <div className="space-y-2">
                  <Label htmlFor="bfd-peer-profile">Profile</Label>
                  <Select value={profile} onValueChange={setProfile}>
                    <SelectTrigger id="bfd-peer-profile">
                      <SelectValue placeholder="Select profile (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">None</SelectItem>
                      {profiles.map((p) => (
                        <SelectItem key={p} value={p}>
                          {p}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Apply a BFD profile to this peer.
                  </p>
                </div>

                {/* Source Address */}
                <div className="space-y-2">
                  <Label htmlFor="bfd-peer-source-address">
                    Source Address
                  </Label>
                  <Input
                    id="bfd-peer-source-address"
                    value={sourceAddress}
                    onChange={(e) => setSourceAddress(e.target.value)}
                    placeholder="e.g. 192.0.2.10"
                  />
                  <p className="text-xs text-muted-foreground">
                    Source IP address for BFD packets.
                  </p>
                </div>

                {/* Source Interface */}
                <div className="space-y-2">
                  <Label htmlFor="bfd-peer-source-interface">
                    Source Interface
                  </Label>
                  <Input
                    id="bfd-peer-source-interface"
                    value={sourceInterface}
                    onChange={(e) => setSourceInterface(e.target.value)}
                    placeholder="e.g. eth0"
                  />
                  <p className="text-xs text-muted-foreground">
                    Source interface for BFD packets.
                  </p>
                </div>

                {/* Minimum TTL - only relevant when multihop is enabled */}
                {multihop && (
                  <div className="space-y-2">
                    <Label htmlFor="bfd-peer-minimum-ttl">
                      Minimum TTL
                    </Label>
                    <Input
                      id="bfd-peer-minimum-ttl"
                      type="number"
                      value={minimumTtl}
                      onChange={(e) => setMinimumTtl(e.target.value)}
                      placeholder="1-254"
                      min={1}
                      max={254}
                    />
                    <p className="text-xs text-muted-foreground">
                      Minimum TTL for incoming BFD multihop packets (1-254).
                    </p>
                  </div>
                )}

                {/* VRF */}
                <div className="space-y-2">
                  <Label htmlFor="bfd-peer-vrf">VRF</Label>
                  <Input
                    id="bfd-peer-vrf"
                    value={vrf}
                    onChange={(e) => setVrf(e.target.value)}
                    placeholder="e.g. my-vrf"
                  />
                  <p className="text-xs text-muted-foreground">
                    VRF instance for this BFD peer.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </ScrollArea>

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
                {isEditMode ? "Saving..." : "Creating..."}
              </>
            ) : isEditMode ? (
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
