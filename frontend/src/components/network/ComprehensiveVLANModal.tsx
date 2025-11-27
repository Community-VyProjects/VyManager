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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ethernetService } from "@/lib/api/ethernet";
import type { EthernetInterface, EthernetCapabilities, VIFConfig, BatchOperation } from "@/lib/api/types/ethernet";
import { Loader2, X } from "lucide-react";

interface VLANWithParent extends VIFConfig {
  parentInterface: string;
  fullName: string;
}

interface ComprehensiveVLANModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vlan?: VLANWithParent | null;
  interfaces: EthernetInterface[];
  capabilities: EthernetCapabilities | null;
  onSuccess: () => void;
  mode: "create" | "edit";
}

export function ComprehensiveVLANModal({
  open,
  onOpenChange,
  vlan,
  interfaces,
  capabilities,
  onSuccess,
  mode,
}: ComprehensiveVLANModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Basic settings
  const [parentInterface, setParentInterface] = useState("");
  const [vlanId, setVlanId] = useState("");
  const [description, setDescription] = useState("");
  const [addresses, setAddresses] = useState<string[]>([]);
  const [mtu, setMtu] = useState("");
  const [mac, setMac] = useState("");
  const [vrf, setVrf] = useState("");
  const [disabled, setDisabled] = useState(false);

  // DHCP options
  const [dhcpClientId, setDhcpClientId] = useState("");
  const [dhcpHostName, setDhcpHostName] = useState("");

  // IPv6 settings
  const [ipv6Autoconf, setIpv6Autoconf] = useState(false);
  const [ipv6Eui64, setIpv6Eui64] = useState("");

  // Initialize form
  useEffect(() => {
    if (vlan && mode === "edit") {
      setParentInterface(vlan.parentInterface);
      setVlanId(vlan.vlan_id);
      setDescription(vlan.description || "");
      setAddresses(vlan.addresses.length > 0 ? [...vlan.addresses] : []);
      setMtu(vlan.mtu || "");
      setMac(vlan.mac || "");
      setVrf(vlan.vrf || "");
      setDisabled(vlan.disable || false);
    } else {
      resetForm();
    }
    setError(null);
  }, [vlan, mode, open]);

  const resetForm = () => {
    setParentInterface("");
    setVlanId("");
    setDescription("");
    setAddresses([]);
    setMtu("");
    setMac("");
    setVrf("");
    setDisabled(false);
    setDhcpClientId("");
    setDhcpHostName("");
    setIpv6Autoconf(false);
    setIpv6Eui64("");
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

  const buildOperations = (): BatchOperation[] => {
    const operations: BatchOperation[] = [];
    const vid = vlanId; // VLAN ID for all operations

    // Create VLAN (VIF) if in create mode
    if (mode === "create") {
      operations.push({ op: "set_vif", value: vid });
    }

    // Description - requires (vlan_id,description)
    if (mode === "create" && description.trim()) {
      operations.push({ op: "set_vif_description", value: `${vid},${description.trim()}` });
    } else if (mode === "edit") {
      if (description.trim() !== (vlan?.description || "")) {
        if (description.trim()) {
          operations.push({ op: "set_vif_description", value: `${vid},${description.trim()}` });
        } else if (vlan?.description) {
          operations.push({ op: "delete_vif_description", value: vid });
        }
      }
    }

    // Addresses - requires (vlan_id,address)
    const currentAddrs = new Set(vlan?.addresses || []);
    const newAddrs = new Set(addresses.filter((a) => a.trim() !== ""));
    for (const addr of newAddrs) {
      if (!currentAddrs.has(addr)) {
        operations.push({ op: "set_vif_address", value: `${vid},${addr}` });
      }
    }
    if (mode === "edit") {
      for (const addr of currentAddrs) {
        if (!newAddrs.has(addr)) {
          operations.push({ op: "delete_vif_address", value: `${vid},${addr}` });
        }
      }
    }

    // MTU - requires (vlan_id,mtu)
    if (mode === "create" && mtu.trim()) {
      operations.push({ op: "set_vif_mtu", value: `${vid},${mtu.trim()}` });
    } else if (mode === "edit") {
      if (mtu.trim() !== (vlan?.mtu || "")) {
        if (mtu.trim()) {
          operations.push({ op: "set_vif_mtu", value: `${vid},${mtu.trim()}` });
        } else if (vlan?.mtu) {
          operations.push({ op: "delete_vif_mtu", value: vid });
        }
      }
    }

    // MAC - requires (vlan_id,mac)
    if (mode === "create" && mac.trim()) {
      operations.push({ op: "set_vif_mac", value: `${vid},${mac.trim()}` });
    } else if (mode === "edit") {
      if (mac.trim() !== (vlan?.mac || "")) {
        if (mac.trim()) {
          operations.push({ op: "set_vif_mac", value: `${vid},${mac.trim()}` });
        } else if (vlan?.mac) {
          operations.push({ op: "delete_vif_mac", value: vid });
        }
      }
    }

    // VRF - requires (vlan_id,vrf)
    if (mode === "create" && vrf.trim()) {
      operations.push({ op: "set_vif_vrf", value: `${vid},${vrf.trim()}` });
    } else if (mode === "edit") {
      if (vrf.trim() !== (vlan?.vrf || "")) {
        if (vrf.trim()) {
          operations.push({ op: "set_vif_vrf", value: `${vid},${vrf.trim()}` });
        } else if (vlan?.vrf) {
          operations.push({ op: "delete_vif_vrf", value: `${vid},${vlan.vrf}` });
        }
      }
    }

    // Disable/Enable - requires (vlan_id)
    if (mode === "edit" && disabled !== (vlan?.disable || false)) {
      operations.push({ op: disabled ? "set_vif_disable" : "delete_vif_disable", value: vid });
    } else if (mode === "create" && disabled) {
      operations.push({ op: "set_vif_disable", value: vid });
    }

    // DHCP options - require (vlan_id,value)
    if (capabilities?.features.vlan.vif_dhcp_options) {
      if (dhcpClientId.trim()) {
        operations.push({ op: "set_vif_dhcp_options_client_id", value: `${vid},${dhcpClientId.trim()}` });
      }
      if (dhcpHostName.trim()) {
        operations.push({ op: "set_vif_dhcp_options_host_name", value: `${vid},${dhcpHostName.trim()}` });
      }
    }

    // IPv6 settings
    if (capabilities?.features.vlan.vif_ipv6) {
      if (ipv6Autoconf) {
        operations.push({ op: "set_vif_ipv6_address_autoconf", value: vid });
      }
      if (ipv6Eui64.trim()) {
        operations.push({ op: "set_vif_ipv6_address_eui64", value: `${vid},${ipv6Eui64.trim()}` });
      }
    }

    return operations;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (mode === "create") {
        if (!parentInterface.trim()) {
          throw new Error("Parent interface is required");
        }
        if (!vlanId.trim()) {
          throw new Error("VLAN ID is required");
        }

        const vlanIdNum = parseInt(vlanId);
        if (isNaN(vlanIdNum) || vlanIdNum < 1 || vlanIdNum > 4094) {
          throw new Error("VLAN ID must be between 1 and 4094");
        }

        const operations = buildOperations();

        // Pass the parent interface name (e.g., "eth0") not the VLAN interface (e.g., "eth0.100")
        // The VLAN ID is already embedded in the operations
        await ethernetService.batchConfigure({
          interface: parentInterface,
          operations,
        });
      } else {
        const operations = buildOperations();

        if (operations.length === 0) {
          setError("No changes detected");
          setLoading(false);
          return;
        }

        // Pass the parent interface name, not the full VLAN interface name
        await ethernetService.batchConfigure({
          interface: vlan!.parentInterface,
          operations,
        });
      }

      // Refresh config cache
      await ethernetService.refreshConfig();

      onSuccess();
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to ${mode} VLAN`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {mode === "create" ? "Create VLAN" : `Edit VLAN: ${vlan?.fullName}`}
          </DialogTitle>
          <DialogDescription>
            {mode === "create"
              ? "Configure a new 802.1Q VLAN sub-interface"
              : "Modify the configuration of this VLAN"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-destructive/10 text-destructive px-4 py-3 rounded-md text-sm">
              {error}
            </div>
          )}

          <Tabs defaultValue="basic" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="basic">Basic</TabsTrigger>
              <TabsTrigger value="advanced">Advanced</TabsTrigger>
              <TabsTrigger value="dhcp">DHCP/IPv6</TabsTrigger>
            </TabsList>

            {/* Basic Tab */}
            <TabsContent value="basic" className="space-y-4">
              {mode === "create" && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="parent-interface">
                      Parent Interface <span className="text-destructive">*</span>
                    </Label>
                    <Select value={parentInterface || undefined} onValueChange={setParentInterface}>
                      <SelectTrigger id="parent-interface">
                        <SelectValue placeholder="Select parent interface" />
                      </SelectTrigger>
                      <SelectContent>
                        {interfaces.map((iface) => (
                          <SelectItem key={iface.name} value={iface.name}>
                            {iface.name}
                            {iface.description && ` - ${iface.description}`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="vlan-id">
                      VLAN ID <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="vlan-id"
                      type="number"
                      min="1"
                      max="4094"
                      placeholder="100"
                      value={vlanId}
                      onChange={(e) => setVlanId(e.target.value)}
                      required
                    />
                    <p className="text-xs text-muted-foreground">
                      Valid range: 1-4094
                    </p>
                  </div>
                </>
              )}

              {mode === "edit" && (
                <div className="space-y-2">
                  <Label>VLAN Interface</Label>
                  <Input value={vlan?.fullName} disabled className="font-mono" />
                  <p className="text-xs text-muted-foreground">
                    Parent: {vlan?.parentInterface} • VLAN ID: {vlan?.vlan_id}
                  </p>
                </div>
              )}

              {capabilities?.features.vlan.vif_description && (
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Input
                    id="description"
                    placeholder="Guest Network VLAN"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </div>
              )}

              {capabilities?.features.vlan.vif_address && (
                <div className="space-y-2">
                  <Label>IP Addresses</Label>
                  {addresses.map((address, index) => (
                    <div key={index} className="flex gap-2">
                      <Input
                        placeholder="10.0.0.1/24 or 2001:db8::1/64"
                        value={address}
                        onChange={(e) => handleAddressChange(index, e.target.value)}
                      />
                      {addresses.length > 0 && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => handleRemoveAddress(index)}
                        >
                          <X className="h-4 w-4" />
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

              {capabilities?.features.vlan.vif_disable && (
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="disable"
                    checked={disabled}
                    onCheckedChange={(checked) => setDisabled(checked as boolean)}
                  />
                  <Label htmlFor="disable" className="cursor-pointer">
                    Administratively disable VLAN
                  </Label>
                </div>
              )}
            </TabsContent>

            {/* Advanced Tab */}
            <TabsContent value="advanced" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                {capabilities?.features.vlan.vif_mtu && (
                  <div className="space-y-2">
                    <Label htmlFor="mtu">MTU</Label>
                    <Input
                      id="mtu"
                      type="number"
                      placeholder="1500"
                      value={mtu}
                      onChange={(e) => setMtu(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      Must be ≤ parent interface MTU
                    </p>
                  </div>
                )}

                {capabilities?.features.vlan.vif_mac && (
                  <div className="space-y-2">
                    <Label htmlFor="mac">MAC Address</Label>
                    <Input
                      id="mac"
                      placeholder="00:11:22:33:44:55"
                      value={mac}
                      onChange={(e) => setMac(e.target.value)}
                    />
                  </div>
                )}

                {capabilities?.features.vlan.vif_vrf && (
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
            </TabsContent>

            {/* DHCP/IPv6 Tab */}
            <TabsContent value="dhcp" className="space-y-4">
              {capabilities?.features.vlan.vif_dhcp_options && (
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold">DHCP Options</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="dhcp-client-id">Client ID</Label>
                      <Input
                        id="dhcp-client-id"
                        placeholder="client-identifier"
                        value={dhcpClientId}
                        onChange={(e) => setDhcpClientId(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="dhcp-hostname">Host Name</Label>
                      <Input
                        id="dhcp-hostname"
                        placeholder="my-host"
                        value={dhcpHostName}
                        onChange={(e) => setDhcpHostName(e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              )}

              {capabilities?.features.vlan.vif_ipv6 && (
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold">IPv6 Settings</h3>
                  <div className="space-y-2">
                    <div className="space-y-2">
                      <Label htmlFor="ipv6-eui64">EUI-64 Prefix</Label>
                      <Input
                        id="ipv6-eui64"
                        placeholder="2001:db8::/64"
                        value={ipv6Eui64}
                        onChange={(e) => setIpv6Eui64(e.target.value)}
                      />
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="ipv6-autoconf"
                        checked={ipv6Autoconf}
                        onCheckedChange={(checked) => setIpv6Autoconf(checked as boolean)}
                      />
                      <Label htmlFor="ipv6-autoconf" className="cursor-pointer text-sm">
                        Enable IPv6 Autoconfig
                      </Label>
                    </div>
                  </div>
                </div>
              )}
            </TabsContent>
          </Tabs>

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
              {mode === "create" ? "Create VLAN" : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
