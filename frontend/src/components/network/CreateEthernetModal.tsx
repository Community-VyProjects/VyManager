"use client";

import { useState } from "react";
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
import type { EthernetCapabilities } from "@/lib/api/types/ethernet";
import { Loader2 } from "lucide-react";

interface CreateEthernetModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  capabilities: EthernetCapabilities | null;
}

export function CreateEthernetModal({
  open,
  onOpenChange,
  onSuccess,
  capabilities,
}: CreateEthernetModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [interfaceName, setInterfaceName] = useState("");
  const [description, setDescription] = useState("");
  const [addresses, setAddresses] = useState<string[]>([""]);
  const [mtu, setMtu] = useState("");
  const [speed, setSpeed] = useState("");
  const [duplex, setDuplex] = useState("");
  const [vrf, setVrf] = useState("");
  const [disabled, setDisabled] = useState(false);

  const resetForm = () => {
    setInterfaceName("");
    setDescription("");
    setAddresses([""]);
    setMtu("");
    setSpeed("");
    setDuplex("");
    setVrf("");
    setDisabled(false);
    setError(null);
  };

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
      // Validate interface name
      if (!interfaceName.trim()) {
        throw new Error("Interface name is required");
      }

      // Filter out empty addresses
      const validAddresses = addresses.filter((addr) => addr.trim() !== "");

      // Create interface
      await ethernetService.createInterface(interfaceName, {
        description: description.trim() || undefined,
        addresses: validAddresses.length > 0 ? validAddresses : undefined,
        mtu: mtu.trim() || undefined,
        speed: speed || undefined,
        duplex: duplex || undefined,
        vrf: vrf.trim() || undefined,
        disable: disabled,
      });

      // Refresh config cache to show the new interface
      await ethernetService.refreshConfig();

      resetForm();
      onSuccess();
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create interface");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      resetForm();
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Ethernet Interface</DialogTitle>
          <DialogDescription>
            Configure a new ethernet interface. Only the interface name is required.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-destructive/10 text-destructive px-4 py-3 rounded-md text-sm">
              {error}
            </div>
          )}

          {/* Interface Name */}
          <div className="space-y-2">
            <Label htmlFor="interface-name">
              Interface Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="interface-name"
              placeholder="eth2"
              value={interfaceName}
              onChange={(e) => setInterfaceName(e.target.value)}
              required
            />
            <p className="text-xs text-muted-foreground">
              Example: eth0, eth1, eth2
            </p>
          </div>

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

          {/* Disable Interface */}
          {capabilities?.features.basic.disable && (
            <div className="flex items-center space-x-2">
              <Checkbox
                id="disable"
                checked={disabled}
                onCheckedChange={(checked) => setDisabled(checked as boolean)}
              />
              <Label htmlFor="disable" className="cursor-pointer">
                Start interface in disabled state
              </Label>
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Interface
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
