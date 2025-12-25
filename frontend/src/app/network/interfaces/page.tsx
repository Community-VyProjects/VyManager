"use client";

import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, RefreshCw, AlertCircle, Search, Cable, Pencil, Trash2, Network } from "lucide-react";
import { useState, useEffect } from "react";
import { ethernetService } from "@/lib/api/ethernet";
import type { EthernetInterface, EthernetCapabilities, VIFConfig } from "@/lib/api/types/ethernet";
import { ComprehensiveEthernetModal } from "@/components/network/ComprehensiveEthernetModal";
import { ComprehensiveVLANModal } from "@/components/network/ComprehensiveVLANModal";
import { DeleteEthernetModal } from "@/components/network/DeleteEthernetModal";

type InterfaceType = "all" | "ethernet" | "vlan";

// VLAN with parent interface info
interface VLANWithParent extends VIFConfig {
  parentInterface: string;
  fullName: string;
}

export default function InterfacesPage() {
  const [interfaces, setInterfaces] = useState<EthernetInterface[]>([]);
  const [capabilities, setCapabilities] = useState<EthernetCapabilities | null>(null);
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

  const loadData = async () => {
    try {
      setError(null);
      setRefreshing(true);
      const [configData, capabilitiesData] = await Promise.all([
        ethernetService.getConfig(),
        ethernetService.getCapabilities(),
      ]);
      setInterfaces(configData.interfaces);
      setCapabilities(capabilitiesData);
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
  const totalInterfaces = interfaces.length;
  const totalVlans = allVlans.length;

  // Filter interfaces based on type
  const filteredInterfaces = interfaces.filter((iface) => {
    if (typeFilter === "vlan") return false; // Don't show interfaces when VLANs are selected

    const matchesType = typeFilter === "all" || iface.type === typeFilter;
    const matchesSearch =
      searchQuery === "" ||
      iface.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      iface.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      iface.addresses?.some((addr) => addr.toLowerCase().includes(searchQuery.toLowerCase())) ||
      iface.vrf?.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesType && matchesSearch;
  });

  // Filter VLANs
  const filteredVlans = allVlans.filter((vlan) => {
    if (typeFilter !== "vlan" && typeFilter !== "all") return false; // Only show VLANs when selected or in "all" mode

    return (
      searchQuery === "" ||
      vlan.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      vlan.parentInterface.toLowerCase().includes(searchQuery.toLowerCase()) ||
      vlan.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      vlan.addresses?.some((addr) => addr.toLowerCase().includes(searchQuery.toLowerCase())) ||
      vlan.vrf?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

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
        <div className="grid grid-cols-3 gap-4">
          <Card className="border-border">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <Network className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{totalInterfaces}</p>
                  <p className="text-xs text-muted-foreground">Total Interfaces</p>
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
                  <p className="text-2xl font-bold text-foreground">{totalInterfaces}</p>
                  <p className="text-xs text-muted-foreground">Ethernet</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-500/10">
                  <Network className="h-5 w-5 text-purple-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{totalVlans}</p>
                  <p className="text-xs text-muted-foreground">VLANs</p>
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

            <div className="flex gap-2">
              <Button
                variant={typeFilter === "all" ? "default" : "outline"}
                size="sm"
                onClick={() => setTypeFilter("all")}
              >
                All ({totalInterfaces + totalVlans})
              </Button>
              <Button
                variant={typeFilter === "ethernet" ? "default" : "outline"}
                size="sm"
                onClick={() => setTypeFilter("ethernet")}
              >
                Ethernet ({totalInterfaces})
              </Button>
              <Button
                variant={typeFilter === "vlan" ? "default" : "outline"}
                size="sm"
                onClick={() => setTypeFilter("vlan")}
              >
                VLAN ({totalVlans})
              </Button>
            </div>

            <Button
              onClick={() => {
                if (typeFilter === "vlan") {
                  setIsCreateVLANModalOpen(true);
                } else {
                  setIsCreateInterfaceModalOpen(true);
                }
              }}
            >
              <Plus className="mr-2 h-4 w-4" />
              Create {typeFilter === "vlan" ? "VLAN" : "Interface"}
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

            {/* Empty state */}
            {filteredInterfaces.length === 0 && filteredVlans.length === 0 && (
              <Card className="border-border">
                <CardContent className="py-12">
                  <div className="flex flex-col items-center gap-2">
                    <Network className="h-12 w-12 text-muted-foreground/30" />
                    <p className="text-muted-foreground">
                      {searchQuery
                        ? "No interfaces or VLANs found matching your search"
                        : typeFilter === "vlan"
                        ? "No VLANs configured"
                        : "No interfaces configured"}
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Count */}
            {(filteredInterfaces.length > 0 || filteredVlans.length > 0) && (
              <p className="text-sm text-muted-foreground text-center">
                Showing {filteredInterfaces.length + filteredVlans.length} of {totalInterfaces + totalVlans} item{totalInterfaces + totalVlans !== 1 ? "s" : ""}
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
    </AppLayout>
  );
}
