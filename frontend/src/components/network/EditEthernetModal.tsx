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
import { ethernetService } from "@/lib/api/ethernet";
import type { EthernetInterface, EthernetCapabilities, BatchOperation } from "@/lib/api/types/ethernet";
import { Loader2 } from "lucide-react";

interface EditEthernetModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  interface: EthernetInterface;
  capabilities: EthernetCapabilities | null;
  onSuccess: () => void;
}

export function EditEthernetModal({
  open,
  onOpenChange,
  interface: iface,
  capabilities,
  onSuccess,
}: EditEthernetModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [description, setDescription] = useState("");
  const [addresses, setAddresses] = useState<string[]>([]);
  const [mtu, setMtu] = useState("");
  const [speed, setSpeed] = useState("");
  const [duplex, setDuplex] = useState("");
  const [vrf, setVrf] = useState("");
  const [disabled, setDisabled] = useState(false);

  // Initialize form with interface data
  useEffect(() => {
    if (iface) {
      setDescription(iface.description || "");
      setAddresses(iface.addresses.length > 0 ? [...iface.addresses] : [""]);
      setMtu(iface.mtu || "");
      setSpeed(iface.speed || "");
      setDuplex(iface.duplex || "");
      setVrf(iface.vrf || "");
      setDisabled(iface.disable || false);
      setError(null);
    }
  }, [iface]);

  const handleAddAddress = () => {
    setAddresses([...addresses, ""]);
  };

  const handleRemoveAddress = (index: number) => {
    setAddresses(addresses.filter((_, i) => i !== index));
  };

  const handleAddressChange = (index: number, value: string) => {
    const newAddresses = [...addresses];
    newAddresses[index] = value;
    setAddresses(newAddresses);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const operations: BatchOperation[] = [];

      // Description changes
      if (description.trim() !== (iface.description || "")) {
        if (description.trim()) {
          operations.push({ op: "set_description", value: description.trim() });
        } else if (iface.description) {
          operations.push({ op: "delete_description" });
        }
      }

      // Address changes
      const currentAddrs = new Set(iface.addresses);
      const newAddrs = new Set(addresses.filter((a) => a.trim() !== ""));

      // Add new addresses
      for (const addr of newAddrs) {
        if (!currentAddrs.has(addr)) {
          operations.push({ op: "set_address", value: addr });
        }
      }

      // Remove old addresses
      for (const addr of currentAddrs) {
        if (!newAddrs.has(addr)) {
          operations.push({ op: "delete_address", value: addr });
        }
      }

      // MTU changes
      if (mtu.trim() !== (iface.mtu || "")) {
        if (mtu.trim()) {
          operations.push({ op: "set_mtu", value: mtu.trim() });
        } else if (iface.mtu) {
          operations.push({ op: "delete_mtu" });
        }
      }

      // Speed changes
      if (speed !== (iface.speed || "")) {
        if (speed) {
          operations.push({ op: "set_speed", value: speed });
        } else if (iface.speed) {
          operations.push({ op: "delete_speed" });
        }
      }

      // Duplex changes
      if (duplex !== (iface.duplex || "")) {
        if (duplex) {
          operations.push({ op: "set_duplex", value: duplex });
        } else if (iface.duplex) {
          operations.push({ op: "delete_duplex" });
        }
      }

      // VRF changes
      if (vrf.trim() !== (iface.vrf || "")) {
        if (vrf.trim()) {
          operations.push({ op: "set_vrf", value: vrf.trim() });
        } else if (iface.vrf) {
          operations.push({ op: "delete_vrf", value: iface.vrf });
        }
      }

      // Disable/Enable changes
      if (disabled !== (iface.disable || false)) {
        operations.push({ op: disabled ? "disable" : "enable" });
      }

      if (operations.length === 0) {
        setError("No changes detected");
        setLoading(false);
        return;
      }

      await ethernetService.updateInterface(iface.name, operations);

      // Refresh config cache to show the updated interface
      await ethernetService.refreshConfig();

      onSuccess();
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update interface");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Interface: {iface.name}</DialogTitle>
          <DialogDescription>
            Modify the configuration of this ethernet interface.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-destructive/10 text-destructive px-4 py-3 rounded-md text-sm">
              {error}
            </div>
          )}

          {/* Description */}
          {capabilities?.features.basic.description && (
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                placeholder="WAN Interface"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
          )}

          {/* IP Addresses */}
          {capabilities?.features.basic.address && (
            <div className="space-y-2">
              <Label>IP Addresses</Label>
              {addresses.map((address, index) => (
                <div key={index} className="flex gap-2">
                  <Input
                    placeholder="10.0.0.1/24 or 2001:db8::1/64"
                    value={address}
                    onChange={(e) => handleAddressChange(index, e.target.value)}
                  />
                  {addresses.length > 1 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleRemoveAddress(index)}
                    >
                      Remove
                    </Button>
                  )}
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddAddress}
              >
                Add Address
              </Button>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            {/* Speed */}
            {capabilities?.features.ethernet.speed && (
              <div className="space-y-2">
                <Label htmlFor="speed">Speed</Label>
                <Select value={speed} onValueChange={setSpeed}>
                  <SelectTrigger id="speed">
                    <SelectValue placeholder="Auto" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="auto">Auto</SelectItem>
                    <SelectItem value="10">10 Mbps</SelectItem>
                    <SelectItem value="100">100 Mbps</SelectItem>
                    <SelectItem value="1000">1 Gbps</SelectItem>
                    <SelectItem value="2500">2.5 Gbps</SelectItem>
                    <SelectItem value="5000">5 Gbps</SelectItem>
                    <SelectItem value="10000">10 Gbps</SelectItem>
                    <SelectItem value="25000">25 Gbps</SelectItem>
                    <SelectItem value="40000">40 Gbps</SelectItem>
                    <SelectItem value="50000">50 Gbps</SelectItem>
                    <SelectItem value="100000">100 Gbps</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Duplex */}
            {capabilities?.features.ethernet.duplex && (
              <div className="space-y-2">
                <Label htmlFor="duplex">Duplex</Label>
                <Select value={duplex} onValueChange={setDuplex}>
                  <SelectTrigger id="duplex">
                    <SelectValue placeholder="Auto" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="auto">Auto</SelectItem>
                    <SelectItem value="half">Half</SelectItem>
                    <SelectItem value="full">Full</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* MTU */}
            {capabilities?.features.basic.mtu && (
              <div className="space-y-2">
                <Label htmlFor="mtu">MTU</Label>
                <Input
                  id="mtu"
                  type="number"
                  placeholder="1500"
                  value={mtu}
                  onChange={(e) => setMtu(e.target.value)}
                />
              </div>
            )}

            {/* VRF */}
            {capabilities?.features.basic.vrf && (
              <div className="space-y-2">
                <Label htmlFor="vrf">VRF</Label>
                <Input
                  id="vrf"
                  placeholder="MGMT"
                  value={vrf}
                  onChange={(e) => setVrf(e.target.value)}
                />
              </div>
            )}
          </div>

          {/* Hardware ID (Read-only) */}
          {iface.hw_id && (
            <div className="space-y-2">
              <Label>Hardware ID</Label>
              <Input value={iface.hw_id} disabled className="font-mono" />
            </div>
          )}

          {/* Disable Interface */}
          {capabilities?.features.basic.disable && (
            <div className="flex items-center space-x-2">
              <Checkbox
                id="disable"
                checked={disabled}
                onCheckedChange={(checked) => setDisabled(checked as boolean)}
              />
              <Label htmlFor="disable" className="cursor-pointer">
                Administratively disable interface
              </Label>
            </div>
          )}

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
              Save Changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
