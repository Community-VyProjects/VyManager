"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertCircle, Plus, Trash2 } from "lucide-react";
import { staticRoutesService } from "@/lib/api/static-routes";
import { ethernetService } from "@/lib/api/ethernet";
import type { StaticRoutesCapabilities } from "@/lib/api/static-routes";
import type { EthernetInterface } from "@/lib/api/types/ethernet";

interface CreateStaticRouteModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  routeType: "ipv4" | "ipv6";
}

interface NextHopEntry {
  address: string;
  distance: string;
  disable: boolean;
  vrf: string;
  bfd_enable: boolean;
  bfd_profile: string;
}

interface InterfaceEntry {
  interface: string;
  distance: string;
  disable: boolean;
}

export function CreateStaticRouteModal({ open, onOpenChange, onSuccess, routeType }: CreateStaticRouteModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [capabilities, setCapabilities] = useState<StaticRoutesCapabilities | null>(null);
  const [availableInterfaces, setAvailableInterfaces] = useState<EthernetInterface[]>([]);

  // Form fields
  const [destination, setDestination] = useState("");
  const [description, setDescription] = useState("");

  // Next-hops
  const [nextHops, setNextHops] = useState<NextHopEntry[]>([]);

  // Interfaces
  const [interfaces, setInterfaces] = useState<InterfaceEntry[]>([]);

  // Blackhole
  const [isBlackhole, setIsBlackhole] = useState(false);
  const [blackholeDistance, setBlackholeDistance] = useState("");
  const [blackholeTag, setBlackholeTag] = useState("");

  // Reject
  const [isReject, setIsReject] = useState(false);
  const [rejectDistance, setRejectDistance] = useState("");
  const [rejectTag, setRejectTag] = useState("");

  // DHCP Interface (1.4 only)
  const [dhcpInterface, setDhcpInterface] = useState("");

  // Load capabilities and interfaces on mount
  useEffect(() => {
    if (open) {
      loadCapabilities();
      loadInterfaces();
    }
  }, [open]);

  const loadCapabilities = async () => {
    try {
      const caps = await staticRoutesService.getCapabilities();
      setCapabilities(caps);
    } catch (err) {
      console.error("Failed to load capabilities:", err);
    }
  };

  const loadInterfaces = async () => {
    try {
      const config = await ethernetService.getConfig();

      // Flatten interfaces to include VLANs
      const allInterfaces: EthernetInterface[] = [];

      for (const iface of config.interfaces) {
        // Add the main interface
        allInterfaces.push(iface);

        // Add VIF (VLAN) sub-interfaces
        if (iface.vif && iface.vif.length > 0) {
          for (const vif of iface.vif) {
            allInterfaces.push({
              name: `${iface.name}.${vif.vlan_id}`,
              type: 'vlan',
              addresses: vif.addresses || [],
              description: vif.description || null,
              vrf: vif.vrf || null,
            } as EthernetInterface);
          }
        }

        // Add VIF-S (Service VLAN) sub-interfaces
        if (iface.vif_s && iface.vif_s.length > 0) {
          for (const vif_s of iface.vif_s) {
            allInterfaces.push({
              name: `${iface.name}.${vif_s.vlan_id}`,
              type: 'vlan',
              addresses: vif_s.addresses || [],
              description: vif_s.description || null,
              vrf: vif_s.vrf || null,
            } as EthernetInterface);

            // Add VIF-C (Customer VLAN) under VIF-S
            if (vif_s.vif_c && vif_s.vif_c.length > 0) {
              for (const vif_c of vif_s.vif_c) {
                allInterfaces.push({
                  name: `${iface.name}.${vif_s.vlan_id}.${vif_c.vlan_id}`,
                  type: 'vlan',
                  addresses: vif_c.addresses || [],
                  description: vif_c.description || null,
                  vrf: vif_c.vrf || null,
                } as EthernetInterface);
              }
            }
          }
        }
      }

      setAvailableInterfaces(allInterfaces);
    } catch (err) {
      console.error("Failed to load interfaces:", err);
    }
  };

  const resetForm = () => {
    setDestination("");
    setDescription("");
    setNextHops([]);
    setInterfaces([]);
    setIsBlackhole(false);
    setBlackholeDistance("");
    setBlackholeTag("");
    setIsReject(false);
    setRejectDistance("");
    setRejectTag("");
    setDhcpInterface("");
    setError(null);
  };

  const handleClose = () => {
    resetForm();
    onOpenChange(false);
  };

  // Next-hop management
  const addNextHop = () => {
    setNextHops([...nextHops, { address: "", distance: "", disable: false, vrf: "", bfd_enable: false, bfd_profile: "" }]);
  };

  const removeNextHop = (index: number) => {
    setNextHops(nextHops.filter((_, i) => i !== index));
  };

  const updateNextHop = (index: number, field: keyof NextHopEntry, value: any) => {
    const updated = [...nextHops];
    updated[index] = { ...updated[index], [field]: value };
    setNextHops(updated);
  };

  // Interface management
  const addInterface = () => {
    setInterfaces([...interfaces, { interface: "", distance: "", disable: false }]);
  };

  const removeInterface = (index: number) => {
    setInterfaces(interfaces.filter((_, i) => i !== index));
  };

  const updateInterface = (index: number, field: keyof InterfaceEntry, value: any) => {
    const updated = [...interfaces];
    updated[index] = { ...updated[index], [field]: value };
    setInterfaces(updated);
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);

    try {
      // Validate destination
      if (!destination.trim()) {
        throw new Error("Destination is required");
      }

      const config: any = {};

      if (description.trim()) {
        config.description = description.trim();
      }

      // Next-hops
      const validNextHops = nextHops.filter(nh => nh.address.trim());
      if (validNextHops.length > 0) {
        config.next_hops = validNextHops.map(nh => ({
          address: nh.address.trim(),
          distance: nh.distance.trim() ? parseInt(nh.distance) : null,
          disable: nh.disable,
          vrf: nh.vrf.trim() || null,
          bfd_enable: nh.bfd_enable,
          bfd_profile: nh.bfd_profile.trim() || null,
        }));
      }

      // Interfaces
      const validInterfaces = interfaces.filter(iface => iface.interface.trim());
      if (validInterfaces.length > 0) {
        config.interfaces = validInterfaces.map(iface => ({
          interface: iface.interface.trim(),
          distance: iface.distance.trim() ? parseInt(iface.distance) : null,
          disable: iface.disable,
        }));
      }

      // Blackhole
      if (isBlackhole) {
        config.blackhole = true;
        if (blackholeDistance.trim()) {
          config.blackhole_distance = parseInt(blackholeDistance);
        }
        if (blackholeTag.trim()) {
          config.blackhole_tag = parseInt(blackholeTag);
        }
      }

      // Reject
      if (isReject) {
        config.reject = true;
        if (rejectDistance.trim()) {
          config.reject_distance = parseInt(rejectDistance);
        }
        if (rejectTag.trim()) {
          config.reject_tag = parseInt(rejectTag);
        }
      }

      // Validate at least one routing method (only for IPv4)
      if (routeType === "ipv4" && !config.next_hops?.length && !config.interfaces?.length && !isBlackhole && !isReject) {
        throw new Error("At least one routing method is required (next-hop, interface, blackhole, or reject)");
      }

      // DHCP interface (1.4 only)
      if (dhcpInterface.trim() && capabilities?.features.dhcp_interface_1_4.supported) {
        config.dhcp_interface = dhcpInterface.trim();
      }

      // Create route
      if (routeType === "ipv4") {
        await staticRoutesService.createIPv4Route(destination.trim(), config);
      } else {
        await staticRoutesService.createIPv6Route(destination.trim(), config);
      }

      handleClose();
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create route");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create {routeType.toUpperCase()} Static Route</DialogTitle>
          <DialogDescription>
            Configure a new static route for {routeType === "ipv4" ? "IPv4" : "IPv6"} traffic
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="basic" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="basic">Basic</TabsTrigger>
            <TabsTrigger value="routing">Routing</TabsTrigger>
            <TabsTrigger value="advanced">Advanced</TabsTrigger>
          </TabsList>

          {/* Basic Tab */}
          <TabsContent value="basic" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="destination">
                Destination Network <span className="text-destructive">*</span>
              </Label>
              <Input
                id="destination"
                placeholder={routeType === "ipv4" ? "e.g., 10.0.0.0/24" : "e.g., 2001:db8::/32"}
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Network in CIDR notation
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Optional description for this route"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
              />
            </div>
          </TabsContent>

          {/* Routing Tab */}
          <TabsContent value="routing" className="space-y-6">
            {/* Next-Hops Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-base font-semibold">Next-Hops</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addNextHop}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Next-Hop
                </Button>
              </div>

              {nextHops.length > 0 ? (
                nextHops.map((nh, index) => (
                  <div key={index} className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Next-Hop #{index + 1}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeNextHop(index)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label>
                          Address <span className="text-destructive">*</span>
                        </Label>
                        <Input
                          placeholder={routeType === "ipv4" ? "e.g., 192.168.1.1" : "e.g., 2001:db8::1"}
                          value={nh.address}
                          onChange={(e) => updateNextHop(index, "address", e.target.value)}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Distance (Metric)</Label>
                        <Input
                          type="number"
                          placeholder="Default: 1"
                          value={nh.distance}
                          onChange={(e) => updateNextHop(index, "distance", e.target.value)}
                        />
                      </div>
                    </div>

                    {capabilities?.features.next_hop_vrf.supported && (
                      <div className="space-y-2">
                        <Label>VRF</Label>
                        <Input
                          placeholder="VRF name (optional)"
                          value={nh.vrf}
                          onChange={(e) => updateNextHop(index, "vrf", e.target.value)}
                        />
                      </div>
                    )}

                    {capabilities?.features.next_hop_bfd.supported && (
                      <div className="space-y-3">
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id={`bfd-enable-${index}`}
                            checked={nh.bfd_enable}
                            onCheckedChange={(checked) => updateNextHop(index, "bfd_enable", checked)}
                          />
                          <Label htmlFor={`bfd-enable-${index}`}>Enable BFD Monitoring</Label>
                        </div>

                        {nh.bfd_enable && (
                          <div className="space-y-2 ml-6">
                            <Label>BFD Profile</Label>
                            <Input
                              placeholder="BFD profile name (optional)"
                              value={nh.bfd_profile}
                              onChange={(e) => updateNextHop(index, "bfd_profile", e.target.value)}
                            />
                          </div>
                        )}
                      </div>
                    )}

                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id={`nh-disable-${index}`}
                        checked={nh.disable}
                        onCheckedChange={(checked) => updateNextHop(index, "disable", checked)}
                      />
                      <Label htmlFor={`nh-disable-${index}`}>Disable this next-hop</Label>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No next-hops configured. Click "Add Next-Hop" to add one.
                </p>
              )}
            </div>

            {/* Interfaces Section */}
            <div className="space-y-4 border-t pt-4">
              <div className="flex items-center justify-between">
                <Label className="text-base font-semibold">Interface Routes</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addInterface}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Interface
                </Button>
              </div>

              {interfaces.length > 0 ? (
                interfaces.map((iface, index) => (
                  <div key={index} className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Interface #{index + 1}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeInterface(index)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label>
                          Interface <span className="text-destructive">*</span>
                        </Label>
                        <Select
                          value={iface.interface}
                          onValueChange={(value) => updateInterface(index, "interface", value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select interface" />
                          </SelectTrigger>
                          <SelectContent>
                            {availableInterfaces.map((eth) => (
                              <SelectItem key={eth.name} value={eth.name}>
                                {eth.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label>Distance (Metric)</Label>
                        <Input
                          type="number"
                          placeholder="Default: 1"
                          value={iface.distance}
                          onChange={(e) => updateInterface(index, "distance", e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id={`iface-disable-${index}`}
                        checked={iface.disable}
                        onCheckedChange={(checked) => updateInterface(index, "disable", checked)}
                      />
                      <Label htmlFor={`iface-disable-${index}`}>Disable this interface route</Label>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No interface routes configured. Click "Add Interface" to add one.
                </p>
              )}
            </div>

            {/* Blackhole Section */}
            <div className="space-y-4 border-t pt-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="blackhole"
                  checked={isBlackhole}
                  onCheckedChange={(checked) => setIsBlackhole(checked as boolean)}
                />
                <Label htmlFor="blackhole" className="text-base font-semibold cursor-pointer">
                  Blackhole Route (Drop silently)
                </Label>
              </div>

              {isBlackhole && (
                <div className="ml-6 space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Packets matching this route will be dropped without notification.
                  </p>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>Distance (Metric)</Label>
                      <Input
                        type="number"
                        placeholder="Default: 1"
                        value={blackholeDistance}
                        onChange={(e) => setBlackholeDistance(e.target.value)}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Tag</Label>
                      <Input
                        type="number"
                        placeholder="Optional"
                        value={blackholeTag}
                        onChange={(e) => setBlackholeTag(e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Reject Section */}
            <div className="space-y-4 border-t pt-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="reject"
                  checked={isReject}
                  onCheckedChange={(checked) => setIsReject(checked as boolean)}
                />
                <Label htmlFor="reject" className="text-base font-semibold cursor-pointer">
                  Reject Route (ICMP unreachable)
                </Label>
              </div>

              {isReject && (
                <div className="ml-6 space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Packets matching this route will be rejected with ICMP unreachable response.
                  </p>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>Distance (Metric)</Label>
                      <Input
                        type="number"
                        placeholder="Default: 1"
                        value={rejectDistance}
                        onChange={(e) => setRejectDistance(e.target.value)}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Tag</Label>
                      <Input
                        type="number"
                        placeholder="Optional"
                        value={rejectTag}
                        onChange={(e) => setRejectTag(e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </TabsContent>

          {/* Advanced Tab */}
          <TabsContent value="advanced" className="space-y-4">
            {capabilities?.features.dhcp_interface_1_4.supported && (
              <div className="space-y-2">
                <Label htmlFor="dhcp-interface">DHCP Interface</Label>
                <Input
                  id="dhcp-interface"
                  placeholder="e.g., eth0"
                  value={dhcpInterface}
                  onChange={(e) => setDhcpInterface(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Use gateway from DHCP on this interface (VyOS 1.4 only)
                </p>
              </div>
            )}

            {!capabilities?.features.dhcp_interface_1_4.supported && (
              <div className="bg-muted/50 border rounded-lg p-4">
                <p className="text-sm text-muted-foreground">
                  No advanced options available for this VyOS version.
                </p>
              </div>
            )}
          </TabsContent>
        </Tabs>

        {error && (
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? "Creating..." : "Create Route"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
