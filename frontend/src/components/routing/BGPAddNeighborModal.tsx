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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Loader2, Users } from "lucide-react";
import { bgpService, type BGPPeerGroup } from "@/lib/api/bgp";
import { useToast } from "@/hooks/useToast";

interface BGPAddNeighborModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  asn: string;
  peerGroups: BGPPeerGroup[];
}

export function BGPAddNeighborModal({
  open,
  onOpenChange,
  onSuccess,
  asn,
  peerGroups,
}: BGPAddNeighborModalProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  // Basic settings
  const [address, setAddress] = useState("");
  const [remoteAs, setRemoteAs] = useState("");
  const [description, setDescription] = useState("");

  // Optional settings
  const [updateSource, setUpdateSource] = useState("");
  const [ebgpMultihop, setEbgpMultihop] = useState("");
  const [password, setPassword] = useState("");
  const [peerGroup, setPeerGroup] = useState("");
  const [passive, setPassive] = useState(false);
  const [shutdown, setShutdown] = useState(false);

  // Timers
  const [holdtime, setHoldtime] = useState("");
  const [keepalive, setKeepalive] = useState("");

  // BFD
  const [bfdEnabled, setBfdEnabled] = useState(false);

  const resetForm = () => {
    setAddress("");
    setRemoteAs("");
    setDescription("");
    setUpdateSource("");
    setEbgpMultihop("");
    setPassword("");
    setPeerGroup("");
    setPassive(false);
    setShutdown(false);
    setHoldtime("");
    setKeepalive("");
    setBfdEnabled(false);
  };

  const validateIP = (ip: string): boolean => {
    // IPv4
    const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
    // IPv6 (simplified)
    const ipv6Regex = /^([0-9a-fA-F]{0,4}:){2,7}[0-9a-fA-F]{0,4}$/;
    return ipv4Regex.test(ip) || ipv6Regex.test(ip);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!address.trim()) {
      toast.error("Validation Error", "Neighbor address is required");
      return;
    }

    if (!validateIP(address.trim())) {
      toast.error("Validation Error", "Invalid IP address format");
      return;
    }

    if (!remoteAs.trim()) {
      toast.error("Validation Error", "Remote AS is required");
      return;
    }

    const remoteAsNum = parseInt(remoteAs, 10);
    if (isNaN(remoteAsNum) || remoteAsNum < 1 || remoteAsNum > 4294967295) {
      toast.error("Validation Error", "Remote AS must be a valid number between 1 and 4294967295");
      return;
    }

    setLoading(true);
    try {
      const operations: Array<{ op: string; [key: string]: string | number | boolean }> = [];

      // Add neighbor with remote-as
      operations.push({
        op: "add_neighbor",
        neighbor: address.trim(),
        remote_as: remoteAs.trim(),
      });

      // Optional settings
      if (description.trim()) {
        operations.push({
          op: "set_neighbor_description",
          neighbor: address.trim(),
          value: description.trim(),
        });
      }

      if (updateSource.trim()) {
        operations.push({
          op: "set_neighbor_update_source",
          neighbor: address.trim(),
          value: updateSource.trim(),
        });
      }

      if (ebgpMultihop.trim()) {
        operations.push({
          op: "set_neighbor_ebgp_multihop",
          neighbor: address.trim(),
          value: parseInt(ebgpMultihop, 10),
        });
      }

      if (password.trim()) {
        operations.push({
          op: "set_neighbor_password",
          neighbor: address.trim(),
          value: password.trim(),
        });
      }

      if (peerGroup) {
        operations.push({
          op: "set_neighbor_peer_group",
          neighbor: address.trim(),
          value: peerGroup,
        });
      }

      if (passive) {
        operations.push({
          op: "enable_neighbor_passive",
          neighbor: address.trim(),
        });
      }

      if (shutdown) {
        operations.push({
          op: "shutdown_neighbor",
          neighbor: address.trim(),
        });
      }

      // Timers
      if (holdtime.trim() && keepalive.trim()) {
        operations.push({
          op: "set_neighbor_timers",
          neighbor: address.trim(),
          holdtime: parseInt(holdtime, 10),
          keepalive: parseInt(keepalive, 10),
        });
      }

      // BFD
      if (bfdEnabled) {
        operations.push({
          op: "enable_neighbor_bfd",
          neighbor: address.trim(),
        });
      }

      const response = await bgpService.configureBatch({ asn, operations });

      if (response.success) {
        toast.success("Neighbor Added", `BGP neighbor ${address} has been added`);
        onOpenChange(false);
        onSuccess();
        resetForm();
      } else {
        toast.error("Failed to Add Neighbor", response.error || "Unknown error");
      }
    } catch (error) {
      console.error("Add neighbor error:", error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      toast.error("Error", errorMessage || "Failed to add neighbor");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-green-500" />
            Add BGP Neighbor
          </DialogTitle>
          <DialogDescription>
            Configure a new BGP peering session with a neighbor router.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            {/* Required fields */}
            <div className="grid gap-2">
              <Label htmlFor="address">
                Neighbor Address <span className="text-destructive">*</span>
              </Label>
              <Input
                id="address"
                placeholder="e.g., 10.0.0.2 or 2001:db8::2"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                disabled={loading}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="remote-as">
                Remote AS <span className="text-destructive">*</span>
              </Label>
              <Input
                id="remote-as"
                placeholder="e.g., 65001"
                value={remoteAs}
                onChange={(e) => setRemoteAs(e.target.value)}
                disabled={loading}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                placeholder="e.g., Transit Provider"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={loading}
              />
            </div>

            {/* Peer Group */}
            {peerGroups.length > 0 && (
              <div className="grid gap-2">
                <Label htmlFor="peer-group">Peer Group</Label>
                <Select value={peerGroup} onValueChange={setPeerGroup} disabled={loading}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select peer group (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">None</SelectItem>
                    {peerGroups.map((group) => (
                      <SelectItem key={group.name} value={group.name}>
                        {group.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Advanced options */}
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="advanced">
                <AccordionTrigger className="text-sm">Advanced Options</AccordionTrigger>
                <AccordionContent className="space-y-4 pt-4">
                  <div className="grid gap-2">
                    <Label htmlFor="update-source">Update Source</Label>
                    <Input
                      id="update-source"
                      placeholder="e.g., lo0 or 10.0.0.1"
                      value={updateSource}
                      onChange={(e) => setUpdateSource(e.target.value)}
                      disabled={loading}
                    />
                    <p className="text-xs text-muted-foreground">
                      Interface or IP to use as source for BGP session
                    </p>
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="ebgp-multihop">eBGP Multihop</Label>
                    <Input
                      id="ebgp-multihop"
                      type="number"
                      min="1"
                      max="255"
                      placeholder="e.g., 2"
                      value={ebgpMultihop}
                      onChange={(e) => setEbgpMultihop(e.target.value)}
                      disabled={loading}
                    />
                    <p className="text-xs text-muted-foreground">
                      TTL for eBGP peers not directly connected
                    </p>
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="password">MD5 Password</Label>
                    <Input
                      id="password"
                      type="password"
                      placeholder="Enter MD5 authentication password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      disabled={loading}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="keepalive">Keepalive (seconds)</Label>
                      <Input
                        id="keepalive"
                        type="number"
                        min="1"
                        max="65535"
                        placeholder="60"
                        value={keepalive}
                        onChange={(e) => setKeepalive(e.target.value)}
                        disabled={loading}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="holdtime">Holdtime (seconds)</Label>
                      <Input
                        id="holdtime"
                        type="number"
                        min="3"
                        max="65535"
                        placeholder="180"
                        value={holdtime}
                        onChange={(e) => setHoldtime(e.target.value)}
                        disabled={loading}
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="bfd">Enable BFD</Label>
                      <p className="text-xs text-muted-foreground">
                        Bidirectional Forwarding Detection
                      </p>
                    </div>
                    <Switch
                      id="bfd"
                      checked={bfdEnabled}
                      onCheckedChange={setBfdEnabled}
                      disabled={loading}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="passive">Passive Mode</Label>
                      <p className="text-xs text-muted-foreground">
                        Wait for neighbor to initiate connection
                      </p>
                    </div>
                    <Switch
                      id="passive"
                      checked={passive}
                      onCheckedChange={setPassive}
                      disabled={loading}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="shutdown">Shutdown</Label>
                      <p className="text-xs text-muted-foreground">
                        Administratively disable the neighbor
                      </p>
                    </div>
                    <Switch
                      id="shutdown"
                      checked={shutdown}
                      onCheckedChange={setShutdown}
                      disabled={loading}
                    />
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
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
              Add Neighbor
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
