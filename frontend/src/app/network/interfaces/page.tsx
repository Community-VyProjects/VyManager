"use client";

import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, RefreshCw, AlertCircle, Search, Cable, Pencil, Trash2, Network, Link2, Layers, ArrowRightLeft, Circle } from "lucide-react";
import { useState, useEffect } from "react";
import { ethernetService } from "@/lib/api/ethernet";
import { bondingService, type BondingInterface, type BondingCapabilities } from "@/lib/api/bonding";
import { bridgeService, type BridgeInterface, type BridgeCapabilities } from "@/lib/api/bridge";
import { tunnelService, type TunnelInterface, type TunnelCapabilities } from "@/lib/api/tunnel";
import { dummyService, type DummyInterface } from "@/lib/api/dummy";
import type { EthernetInterface, EthernetCapabilities, VIFConfig } from "@/lib/api/types/ethernet";
import { ComprehensiveEthernetModal } from "@/components/network/ComprehensiveEthernetModal";
import { ComprehensiveVLANModal } from "@/components/network/ComprehensiveVLANModal";
import { DeleteEthernetModal } from "@/components/network/DeleteEthernetModal";
import { DummyInterfaceModal } from "@/components/network/DummyInterfaceModal";

type InterfaceType = "all" | "ethernet" | "vlan" | "bonding" | "bridge" | "tunnel" | "dummy";

// VLAN with parent interface info
interface VLANWithParent extends VIFConfig {
  parentInterface: string;
  fullName: string;
}

export default function InterfacesPage() {
  // Ethernet state
  const [interfaces, setInterfaces] = useState<EthernetInterface[]>([]);
  const [capabilities, setCapabilities] = useState<EthernetCapabilities | null>(null);

  // Bonding state
  const [bondingInterfaces, setBondingInterfaces] = useState<BondingInterface[]>([]);
  const [bondingCapabilities, setBondingCapabilities] = useState<BondingCapabilities | null>(null);

  // Bridge state
  const [bridgeInterfaces, setBridgeInterfaces] = useState<BridgeInterface[]>([]);
  const [bridgeCapabilities, setBridgeCapabilities] = useState<BridgeCapabilities | null>(null);

  // Tunnel state
  const [tunnelInterfaces, setTunnelInterfaces] = useState<TunnelInterface[]>([]);
  const [tunnelCapabilities, setTunnelCapabilities] = useState<TunnelCapabilities | null>(null);

  // Dummy (loopback) state
  const [dummyInterfaces, setDummyInterfaces] = useState<DummyInterface[]>([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<InterfaceType>("all");

  // Ethernet Modal states
  const [isCreateInterfaceModalOpen, setIsCreateInterfaceModalOpen] = useState(false);
  const [editingInterface, setEditingInterface] = useState<EthernetInterface | null>(null);
  const [deletingInterface, setDeletingInterface] = useState<EthernetInterface | null>(null);

  // VLAN Modal states
  const [isCreateVLANModalOpen, setIsCreateVLANModalOpen] = useState(false);
  const [editingVLAN, setEditingVLAN] = useState<VLANWithParent | null>(null);

  // Bonding Modal states
  const [editingBonding, setEditingBonding] = useState<BondingInterface | null>(null);

  // Bridge Modal states
  const [editingBridge, setEditingBridge] = useState<BridgeInterface | null>(null);

  // Tunnel Modal states
  const [editingTunnel, setEditingTunnel] = useState<TunnelInterface | null>(null);

  // Dummy Modal states
  const [isCreateDummyModalOpen, setIsCreateDummyModalOpen] = useState(false);
  const [editingDummy, setEditingDummy] = useState<DummyInterface | null>(null);

  const loadData = async () => {
    try {
      setError(null);
      setRefreshing(true);

      // Load all interface types in parallel
      const results = await Promise.allSettled([
        ethernetService.getConfig(),
        ethernetService.getCapabilities(),
        bondingService.getConfig(),
        bondingService.getCapabilities(),
        bridgeService.getConfig(),
        bridgeService.getCapabilities(),
        tunnelService.getConfig(),
        tunnelService.getCapabilities(),
        dummyService.getConfig(),
      ]);

      // Ethernet
      if (results[0].status === "fulfilled") {
        setInterfaces(results[0].value.interfaces);
      }
      if (results[1].status === "fulfilled") {
        setCapabilities(results[1].value);
      }

      // Bonding
      if (results[2].status === "fulfilled") {
        setBondingInterfaces(results[2].value.interfaces);
      }
      if (results[3].status === "fulfilled") {
        setBondingCapabilities(results[3].value);
      }

      // Bridge
      if (results[4].status === "fulfilled") {
        setBridgeInterfaces(results[4].value.interfaces);
      }
      if (results[5].status === "fulfilled") {
        setBridgeCapabilities(results[5].value);
      }

      // Tunnel
      if (results[6].status === "fulfilled") {
        setTunnelInterfaces(results[6].value.interfaces);
      }
      if (results[7].status === "fulfilled") {
        setTunnelCapabilities(results[7].value);
      }

      // Dummy (loopback)
      if (results[8].status === "fulfilled") {
        setDummyInterfaces(results[8].value.interfaces);
      }

      // Check if all critical requests failed
      const allFailed = results.every((r) => r.status === "rejected");
      if (allFailed) {
        setError("Failed to load interface data");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load interface data");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Extract all VLANs from interfaces
  const allVlans: VLANWithParent[] = interfaces.flatMap((iface) => {
    const vlans: VLANWithParent[] = [];

    // Add VIFs (802.1q)
    if (iface.vif) {
      iface.vif.forEach((vif) => {
        vlans.push({
          ...vif,
          parentInterface: iface.name,
          fullName: `${iface.name}.${vif.vlan_id}`,
        });
      });
    }

    // Add VIF-S (QinQ) if needed in the future
    if (iface.vif_s) {
      iface.vif_s.forEach((vifs) => {
        vlans.push({
          ...vifs,
          parentInterface: iface.name,
          fullName: `${iface.name}.${vifs.vlan_id}`,
        });
      });
    }

    return vlans;
  });

  // Calculate statistics
  const totalEthernet = interfaces.length;
  const totalVlans = allVlans.length;
  const totalBonding = bondingInterfaces.length;
  const totalBridge = bridgeInterfaces.length;
  const totalTunnel = tunnelInterfaces.length;
  const totalDummy = dummyInterfaces.length;
  const totalAll = totalEthernet + totalVlans + totalBonding + totalBridge + totalTunnel + totalDummy;

  // Helper function for search matching
  const matchesSearch = (name: string, description?: string | null, addresses?: string[] | null, vrf?: string | null) => {
    if (searchQuery === "") return true;
    const query = searchQuery.toLowerCase();
    return (
      name.toLowerCase().includes(query) ||
      description?.toLowerCase().includes(query) ||
      addresses?.some((addr) => addr.toLowerCase().includes(query)) ||
      vrf?.toLowerCase().includes(query)
    );
  };

  // Filter Ethernet interfaces
  const filteredInterfaces = interfaces.filter((iface) => {
    if (typeFilter !== "all" && typeFilter !== "ethernet") return false;
    return matchesSearch(iface.name, iface.description, iface.addresses, iface.vrf);
  });

  // Filter VLANs
  const filteredVlans = allVlans.filter((vlan) => {
    if (typeFilter !== "vlan" && typeFilter !== "all") return false;
    return matchesSearch(vlan.fullName, vlan.description, vlan.addresses, vlan.vrf);
  });

  // Filter Bonding interfaces
  const filteredBonding = bondingInterfaces.filter((iface) => {
    if (typeFilter !== "all" && typeFilter !== "bonding") return false;
    return matchesSearch(iface.name, iface.description, iface.addresses, iface.vrf);
  });

  // Filter Bridge interfaces
  const filteredBridge = bridgeInterfaces.filter((iface) => {
    if (typeFilter !== "all" && typeFilter !== "bridge") return false;
    return matchesSearch(iface.name, iface.description, iface.addresses, iface.vrf);
  });

  // Filter Tunnel interfaces
  const filteredTunnel = tunnelInterfaces.filter((iface) => {
    if (typeFilter !== "all" && typeFilter !== "tunnel") return false;
    return matchesSearch(iface.name, iface.description, iface.addresses, iface.vrf);
  });

  // Filter Dummy interfaces
  const filteredDummy = dummyInterfaces.filter((iface) => {
    if (typeFilter !== "all" && typeFilter !== "dummy") return false;
    return matchesSearch(iface.name, iface.description, iface.addresses, iface.vrf);
  });

  const totalFiltered = filteredInterfaces.length + filteredVlans.length + filteredBonding.length + filteredBridge.length + filteredTunnel.length + filteredDummy.length;

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-96">
          <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6 p-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Network Interfaces</h1>
            <p className="text-muted-foreground mt-1">
              Manage and monitor network interface configurations
            </p>
          </div>
        </div>

        {/* Stats Dashboard */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
          <Card className="border-border">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <Network className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{totalAll}</p>
                  <p className="text-xs text-muted-foreground">Total</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10">
                  <Cable className="h-5 w-5 text-blue-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{totalEthernet}</p>
                  <p className="text-xs text-muted-foreground">Ethernet</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-500/10">
                  <Layers className="h-5 w-5 text-purple-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{totalVlans}</p>
                  <p className="text-xs text-muted-foreground">VLANs</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-500/10">
                  <Link2 className="h-5 w-5 text-orange-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{totalBonding}</p>
                  <p className="text-xs text-muted-foreground">Bonding</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-500/10">
                  <Network className="h-5 w-5 text-green-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{totalBridge}</p>
                  <p className="text-xs text-muted-foreground">Bridge</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-cyan-500/10">
                  <ArrowRightLeft className="h-5 w-5 text-cyan-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{totalTunnel}</p>
                  <p className="text-xs text-muted-foreground">Tunnel</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-pink-500/10">
                  <Circle className="h-5 w-5 text-pink-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{totalDummy}</p>
                  <p className="text-xs text-muted-foreground">Loopback</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-destructive mt-0.5" />
            <div className="flex-1">
              <h3 className="font-semibold text-destructive">Failed to load interfaces</h3>
              <p className="text-sm text-destructive/90 mt-1">{error}</p>
              <Button variant="outline" size="sm" onClick={loadData} className="mt-3">
                <RefreshCw className="h-3.5 w-3.5 mr-2" />
                Try Again
              </Button>
            </div>
          </div>
        )}

        {/* Filters and Actions */}
        {!error && (
          <div className="flex items-center justify-between gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by name, description, IP address, or VRF..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                variant={typeFilter === "all" ? "default" : "outline"}
                size="sm"
                onClick={() => setTypeFilter("all")}
              >
                All ({totalAll})
              </Button>
              <Button
                variant={typeFilter === "ethernet" ? "default" : "outline"}
                size="sm"
                onClick={() => setTypeFilter("ethernet")}
              >
                Ethernet ({totalEthernet})
              </Button>
              <Button
                variant={typeFilter === "vlan" ? "default" : "outline"}
                size="sm"
                onClick={() => setTypeFilter("vlan")}
              >
                VLAN ({totalVlans})
              </Button>
              <Button
                variant={typeFilter === "bonding" ? "default" : "outline"}
                size="sm"
                onClick={() => setTypeFilter("bonding")}
              >
                Bonding ({totalBonding})
              </Button>
              <Button
                variant={typeFilter === "bridge" ? "default" : "outline"}
                size="sm"
                onClick={() => setTypeFilter("bridge")}
              >
                Bridge ({totalBridge})
              </Button>
              <Button
                variant={typeFilter === "tunnel" ? "default" : "outline"}
                size="sm"
                onClick={() => setTypeFilter("tunnel")}
              >
                Tunnel ({totalTunnel})
              </Button>
              <Button
                variant={typeFilter === "dummy" ? "default" : "outline"}
                size="sm"
                onClick={() => setTypeFilter("dummy")}
              >
                Loopback ({totalDummy})
              </Button>
            </div>

            <Button
              onClick={() => {
                if (typeFilter === "vlan") {
                  setIsCreateVLANModalOpen(true);
                } else if (typeFilter === "dummy") {
                  setIsCreateDummyModalOpen(true);
                } else {
                  setIsCreateInterfaceModalOpen(true);
                }
              }}
            >
              <Plus className="mr-2 h-4 w-4" />
              Create {typeFilter === "vlan" ? "VLAN" : typeFilter === "dummy" ? "Loopback" : typeFilter === "all" ? "Interface" : typeFilter.charAt(0).toUpperCase() + typeFilter.slice(1)}
            </Button>
          </div>
        )}

        {/* Interface Cards */}
        {!error && (
          <div className="space-y-4 mt-6">
            {/* Ethernet Interfaces */}
            {(typeFilter === "all" || typeFilter === "ethernet") && filteredInterfaces.length > 0 && (
              <div className="space-y-3">
                {typeFilter === "all" && (
                  <h2 className="text-lg font-semibold text-foreground">Ethernet Interfaces</h2>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredInterfaces.map((iface) => {
                    const vlanCount = (iface.vif?.length || 0) + (iface.vif_s?.length || 0);
                    return (
                      <Card key={iface.name} className="border-border hover:border-primary/50 transition-colors group">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-500/10">
                                <Cable className="h-4 w-4 text-blue-500" />
                              </div>
                              <div>
                                <code className="font-semibold font-mono text-foreground text-base">
                                  {iface.name}
                                </code>
                                {vlanCount > 0 && (
                                  <div className="text-xs text-muted-foreground mt-0.5">
                                    {vlanCount} VLAN(s)
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setEditingInterface(iface)}
                                className="h-7 w-7 p-0"
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setDeletingInterface(iface)}
                                className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </div>

                          <div className="space-y-2 text-sm">
                            {iface.description && (
                              <div className="text-muted-foreground truncate">
                                {iface.description}
                              </div>
                            )}

                            {iface.addresses && iface.addresses.length > 0 && (
                              <div className="flex flex-wrap gap-1.5">
                                {iface.addresses.slice(0, 2).map((addr, idx) => (
                                  <code
                                    key={idx}
                                    className="text-xs font-mono px-1.5 py-0.5 rounded bg-accent text-foreground"
                                  >
                                    {addr}
                                  </code>
                                ))}
                                {iface.addresses.length > 2 && (
                                  <Badge variant="secondary" className="text-xs px-1.5 py-0">
                                    +{iface.addresses.length - 2}
                                  </Badge>
                                )}
                              </div>
                            )}

                            <div className="flex flex-wrap gap-2 pt-1">
                              {iface.vrf && (
                                <Badge variant="outline" className="bg-purple-500/10 text-purple-500 border-purple-500/20 text-xs">
                                  VRF: {iface.vrf}
                                </Badge>
                              )}
                              {iface.hw_id && (
                                <code className="text-xs font-mono text-muted-foreground">
                                  {iface.hw_id}
                                </code>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            )}

            {/* VLANs */}
            {(typeFilter === "all" || typeFilter === "vlan") && filteredVlans.length > 0 && (
              <div className="space-y-3">
                {typeFilter === "all" && (
                  <h2 className="text-lg font-semibold text-foreground">VLANs</h2>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredVlans.map((vlan) => (
                    <Card key={vlan.fullName} className="border-border hover:border-primary/50 transition-colors group">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-purple-500/10">
                              <Network className="h-4 w-4 text-purple-500" />
                            </div>
                            <div>
                              <code className="font-semibold font-mono text-foreground text-base">
                                {vlan.fullName}
                              </code>
                              <div className="text-xs text-muted-foreground mt-0.5">
                                Parent: {vlan.parentInterface}
                              </div>
                            </div>
                          </div>
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setEditingVLAN(vlan)}
                              className="h-7 w-7 p-0"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                // TODO: Implement VLAN delete
                              }}
                              className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>

                        <div className="space-y-2 text-sm">
                          {vlan.description && (
                            <div className="text-muted-foreground truncate">
                              {vlan.description}
                            </div>
                          )}

                          {vlan.addresses && vlan.addresses.length > 0 && (
                            <div className="flex flex-wrap gap-1.5">
                              {vlan.addresses.slice(0, 2).map((addr, idx) => (
                                <code
                                  key={idx}
                                  className="text-xs font-mono px-1.5 py-0.5 rounded bg-accent text-foreground"
                                >
                                  {addr}
                                </code>
                              ))}
                              {vlan.addresses.length > 2 && (
                                <Badge variant="secondary" className="text-xs px-1.5 py-0">
                                  +{vlan.addresses.length - 2}
                                </Badge>
                              )}
                            </div>
                          )}

                          <div className="flex flex-wrap gap-2 pt-1">
                            <Badge
                              variant="outline"
                              className="bg-purple-500/10 text-purple-500 border-purple-500/20 text-xs"
                            >
                              VLAN {vlan.vlan_id}
                            </Badge>
                            {vlan.vrf && (
                              <Badge variant="outline" className="bg-purple-500/10 text-purple-500 border-purple-500/20 text-xs">
                                VRF: {vlan.vrf}
                              </Badge>
                            )}
                            {vlan.disable ? (
                              <Badge variant="outline" className="bg-red-500/10 text-red-500 border-red-500/20 text-xs">
                                Disabled
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20 text-xs">
                                Enabled
                              </Badge>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Bonding Interfaces */}
            {(typeFilter === "all" || typeFilter === "bonding") && filteredBonding.length > 0 && (
              <div className="space-y-3">
                {typeFilter === "all" && (
                  <h2 className="text-lg font-semibold text-foreground">Bonding Interfaces</h2>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredBonding.map((iface) => (
                    <Card key={iface.name} className="border-border hover:border-primary/50 transition-colors group">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-orange-500/10">
                              <Link2 className="h-4 w-4 text-orange-500" />
                            </div>
                            <div>
                              <code className="font-semibold font-mono text-foreground text-base">
                                {iface.name}
                              </code>
                              {iface.members && iface.members.length > 0 && (
                                <div className="text-xs text-muted-foreground mt-0.5">
                                  {iface.members.length} member(s)
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setEditingBonding(iface)}
                              className="h-7 w-7 p-0"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                // TODO: Implement bonding delete
                              }}
                              className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>

                        <div className="space-y-2 text-sm">
                          {iface.description && (
                            <div className="text-muted-foreground truncate">
                              {iface.description}
                            </div>
                          )}

                          {iface.addresses && iface.addresses.length > 0 && (
                            <div className="flex flex-wrap gap-1.5">
                              {iface.addresses.slice(0, 2).map((addr, idx) => (
                                <code
                                  key={idx}
                                  className="text-xs font-mono px-1.5 py-0.5 rounded bg-accent text-foreground"
                                >
                                  {addr}
                                </code>
                              ))}
                              {iface.addresses.length > 2 && (
                                <Badge variant="secondary" className="text-xs px-1.5 py-0">
                                  +{iface.addresses.length - 2}
                                </Badge>
                              )}
                            </div>
                          )}

                          <div className="flex flex-wrap gap-2 pt-1">
                            {iface.mode && (
                              <Badge variant="outline" className="bg-orange-500/10 text-orange-500 border-orange-500/20 text-xs">
                                {iface.mode}
                              </Badge>
                            )}
                            {iface.vrf && (
                              <Badge variant="outline" className="bg-purple-500/10 text-purple-500 border-purple-500/20 text-xs">
                                VRF: {iface.vrf}
                              </Badge>
                            )}
                            {iface.disable ? (
                              <Badge variant="outline" className="bg-red-500/10 text-red-500 border-red-500/20 text-xs">
                                Disabled
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20 text-xs">
                                Enabled
                              </Badge>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Bridge Interfaces */}
            {(typeFilter === "all" || typeFilter === "bridge") && filteredBridge.length > 0 && (
              <div className="space-y-3">
                {typeFilter === "all" && (
                  <h2 className="text-lg font-semibold text-foreground">Bridge Interfaces</h2>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredBridge.map((iface) => (
                    <Card key={iface.name} className="border-border hover:border-primary/50 transition-colors group">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-green-500/10">
                              <Network className="h-4 w-4 text-green-500" />
                            </div>
                            <div>
                              <code className="font-semibold font-mono text-foreground text-base">
                                {iface.name}
                              </code>
                              {iface.members && iface.members.length > 0 && (
                                <div className="text-xs text-muted-foreground mt-0.5">
                                  {iface.members.length} member(s)
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setEditingBridge(iface)}
                              className="h-7 w-7 p-0"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                // TODO: Implement bridge delete
                              }}
                              className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>

                        <div className="space-y-2 text-sm">
                          {iface.description && (
                            <div className="text-muted-foreground truncate">
                              {iface.description}
                            </div>
                          )}

                          {iface.addresses && iface.addresses.length > 0 && (
                            <div className="flex flex-wrap gap-1.5">
                              {iface.addresses.slice(0, 2).map((addr, idx) => (
                                <code
                                  key={idx}
                                  className="text-xs font-mono px-1.5 py-0.5 rounded bg-accent text-foreground"
                                >
                                  {addr}
                                </code>
                              ))}
                              {iface.addresses.length > 2 && (
                                <Badge variant="secondary" className="text-xs px-1.5 py-0">
                                  +{iface.addresses.length - 2}
                                </Badge>
                              )}
                            </div>
                          )}

                          <div className="flex flex-wrap gap-2 pt-1">
                            {iface.stp && (
                              <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20 text-xs">
                                STP
                              </Badge>
                            )}
                            {iface.vrf && (
                              <Badge variant="outline" className="bg-purple-500/10 text-purple-500 border-purple-500/20 text-xs">
                                VRF: {iface.vrf}
                              </Badge>
                            )}
                            {iface.disable ? (
                              <Badge variant="outline" className="bg-red-500/10 text-red-500 border-red-500/20 text-xs">
                                Disabled
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20 text-xs">
                                Enabled
                              </Badge>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Tunnel Interfaces */}
            {(typeFilter === "all" || typeFilter === "tunnel") && filteredTunnel.length > 0 && (
              <div className="space-y-3">
                {typeFilter === "all" && (
                  <h2 className="text-lg font-semibold text-foreground">Tunnel Interfaces</h2>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredTunnel.map((iface) => (
                    <Card key={iface.name} className="border-border hover:border-primary/50 transition-colors group">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-cyan-500/10">
                              <ArrowRightLeft className="h-4 w-4 text-cyan-500" />
                            </div>
                            <div>
                              <code className="font-semibold font-mono text-foreground text-base">
                                {iface.name}
                              </code>
                              {iface.encapsulation && (
                                <div className="text-xs text-muted-foreground mt-0.5">
                                  {iface.encapsulation.toUpperCase()}
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setEditingTunnel(iface)}
                              className="h-7 w-7 p-0"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                // TODO: Implement tunnel delete
                              }}
                              className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>

                        <div className="space-y-2 text-sm">
                          {iface.description && (
                            <div className="text-muted-foreground truncate">
                              {iface.description}
                            </div>
                          )}

                          {/* Tunnel endpoints */}
                          {(iface.source_address || iface.remote) && (
                            <div className="text-xs text-muted-foreground">
                              {iface.source_address && <span>Source: {iface.source_address}</span>}
                              {iface.source_address && iface.remote && <span> → </span>}
                              {iface.remote && <span>Remote: {iface.remote}</span>}
                            </div>
                          )}

                          {iface.addresses && iface.addresses.length > 0 && (
                            <div className="flex flex-wrap gap-1.5">
                              {iface.addresses.slice(0, 2).map((addr, idx) => (
                                <code
                                  key={idx}
                                  className="text-xs font-mono px-1.5 py-0.5 rounded bg-accent text-foreground"
                                >
                                  {addr}
                                </code>
                              ))}
                              {iface.addresses.length > 2 && (
                                <Badge variant="secondary" className="text-xs px-1.5 py-0">
                                  +{iface.addresses.length - 2}
                                </Badge>
                              )}
                            </div>
                          )}

                          <div className="flex flex-wrap gap-2 pt-1">
                            {iface.encapsulation && (
                              <Badge variant="outline" className="bg-cyan-500/10 text-cyan-500 border-cyan-500/20 text-xs">
                                {iface.encapsulation.toUpperCase()}
                              </Badge>
                            )}
                            {iface.key && (
                              <Badge variant="outline" className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20 text-xs">
                                Key: {iface.key}
                              </Badge>
                            )}
                            {iface.vrf && (
                              <Badge variant="outline" className="bg-purple-500/10 text-purple-500 border-purple-500/20 text-xs">
                                VRF: {iface.vrf}
                              </Badge>
                            )}
                            {iface.disable ? (
                              <Badge variant="outline" className="bg-red-500/10 text-red-500 border-red-500/20 text-xs">
                                Disabled
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20 text-xs">
                                Enabled
                              </Badge>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Dummy (Loopback) Interfaces */}
            {(typeFilter === "all" || typeFilter === "dummy") && filteredDummy.length > 0 && (
              <div className="space-y-3">
                {typeFilter === "all" && (
                  <h2 className="text-lg font-semibold text-foreground">Loopback Interfaces</h2>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredDummy.map((iface) => (
                    <Card key={iface.name} className="border-border hover:border-primary/50 transition-colors group">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-pink-500/10">
                              <Circle className="h-4 w-4 text-pink-500" />
                            </div>
                            <div>
                              <code className="font-semibold font-mono text-foreground text-base">
                                {iface.name}
                              </code>
                              <div className="text-xs text-muted-foreground mt-0.5">
                                Loopback
                              </div>
                            </div>
                          </div>
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setEditingDummy(iface)}
                              className="h-7 w-7 p-0"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                // Will be handled by modal
                                setEditingDummy(iface);
                              }}
                              className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>

                        <div className="space-y-2 text-sm">
                          {iface.description && (
                            <div className="text-muted-foreground truncate">
                              {iface.description}
                            </div>
                          )}

                          {iface.addresses && iface.addresses.length > 0 && (
                            <div className="flex flex-wrap gap-1.5">
                              {iface.addresses.slice(0, 2).map((addr, idx) => (
                                <code
                                  key={idx}
                                  className="text-xs font-mono px-1.5 py-0.5 rounded bg-accent text-foreground"
                                >
                                  {addr}
                                </code>
                              ))}
                              {iface.addresses.length > 2 && (
                                <Badge variant="secondary" className="text-xs px-1.5 py-0">
                                  +{iface.addresses.length - 2}
                                </Badge>
                              )}
                            </div>
                          )}

                          <div className="flex flex-wrap gap-2 pt-1">
                            {iface.mtu && (
                              <Badge variant="outline" className="bg-pink-500/10 text-pink-500 border-pink-500/20 text-xs">
                                MTU: {iface.mtu}
                              </Badge>
                            )}
                            {iface.vrf && (
                              <Badge variant="outline" className="bg-purple-500/10 text-purple-500 border-purple-500/20 text-xs">
                                VRF: {iface.vrf}
                              </Badge>
                            )}
                            {iface.disable ? (
                              <Badge variant="outline" className="bg-red-500/10 text-red-500 border-red-500/20 text-xs">
                                Disabled
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20 text-xs">
                                Enabled
                              </Badge>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Empty state */}
            {totalFiltered === 0 && (
              <Card className="border-border">
                <CardContent className="py-12">
                  <div className="flex flex-col items-center gap-2">
                    <Network className="h-12 w-12 text-muted-foreground/30" />
                    <p className="text-muted-foreground">
                      {searchQuery
                        ? "No interfaces found matching your search"
                        : typeFilter === "all"
                        ? "No interfaces configured"
                        : `No ${typeFilter} interfaces configured`}
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Count */}
            {totalFiltered > 0 && (
              <p className="text-sm text-muted-foreground text-center">
                Showing {totalFiltered} of {totalAll} item{totalAll !== 1 ? "s" : ""}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Ethernet Modals */}
      <ComprehensiveEthernetModal
        open={isCreateInterfaceModalOpen}
        onOpenChange={setIsCreateInterfaceModalOpen}
        mode="create"
        capabilities={capabilities}
        onSuccess={loadData}
      />

      {editingInterface && (
        <ComprehensiveEthernetModal
          open={!!editingInterface}
          onOpenChange={(open) => !open && setEditingInterface(null)}
          mode="edit"
          interface={editingInterface}
          capabilities={capabilities}
          onSuccess={() => {
            setEditingInterface(null);
            loadData();
          }}
        />
      )}

      {deletingInterface && (
        <DeleteEthernetModal
          open={!!deletingInterface}
          onOpenChange={(open) => !open && setDeletingInterface(null)}
          interface={deletingInterface}
          onSuccess={() => {
            setDeletingInterface(null);
            loadData();
          }}
        />
      )}

      {/* VLAN Modals */}
      <ComprehensiveVLANModal
        open={isCreateVLANModalOpen}
        onOpenChange={setIsCreateVLANModalOpen}
        mode="create"
        interfaces={interfaces}
        capabilities={capabilities}
        onSuccess={loadData}
      />

      {editingVLAN && (
        <ComprehensiveVLANModal
          open={!!editingVLAN}
          onOpenChange={(open) => !open && setEditingVLAN(null)}
          mode="edit"
          vlan={editingVLAN}
          interfaces={interfaces}
          capabilities={capabilities}
          onSuccess={() => {
            setEditingVLAN(null);
            loadData();
          }}
        />
      )}

      {/* Dummy (Loopback) Modals */}
      <DummyInterfaceModal
        open={isCreateDummyModalOpen}
        onOpenChange={setIsCreateDummyModalOpen}
        mode="create"
        onSuccess={loadData}
      />

      {editingDummy && (
        <DummyInterfaceModal
          open={!!editingDummy}
          onOpenChange={(open) => !open && setEditingDummy(null)}
          mode="edit"
          interface={editingDummy}
          onSuccess={() => {
            setEditingDummy(null);
            loadData();
          }}
        />
      )}
    </AppLayout>
  );
}
