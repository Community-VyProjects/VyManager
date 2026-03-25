"use client";

import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, RefreshCw, AlertCircle, Search, Cable, Pencil, Trash2, Network, ChevronRight, Shield } from "lucide-react";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { ethernetService } from "@/lib/api/ethernet";
import type { EthernetInterface, EthernetCapabilities, VIFConfig } from "@/lib/api/types/ethernet";
import { wireguardService, type WireGuardInterface } from "@/lib/api/wireguard";
import { ComprehensiveEthernetModal } from "@/components/network/ComprehensiveEthernetModal";
import { ComprehensiveVLANModal } from "@/components/network/ComprehensiveVLANModal";
import { DeleteEthernetModal } from "@/components/network/DeleteEthernetModal";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { usePermissions } from "@/hooks/usePermissions";
import { FeatureGroup } from "@/lib/api/user-management";

type InterfaceType = "ethernet" | "vlan" | "wireguard";

// VLAN with parent interface info
interface VLANWithParent extends VIFConfig {
  parentInterface: string;
  fullName: string;
}

export default function InterfacesPage() {
  const [interfaces, setInterfaces] = useState<EthernetInterface[]>([]);
  const [capabilities, setCapabilities] = useState<EthernetCapabilities | null>(null);
  const [wireGuardInterfaces, setWireGuardInterfaces] = useState<WireGuardInterface[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState<InterfaceType>("ethernet");

  // Ethernet Modal states
  const [isCreateInterfaceModalOpen, setIsCreateInterfaceModalOpen] = useState(false);
  const [editingInterface, setEditingInterface] = useState<EthernetInterface | null>(null);
  const [deletingInterface, setDeletingInterface] = useState<EthernetInterface | null>(null);

  // VLAN Modal states
  const [isCreateVLANModalOpen, setIsCreateVLANModalOpen] = useState(false);
  const [editingVLAN, setEditingVLAN] = useState<VLANWithParent | null>(null);

  const { canWrite } = usePermissions();

  const loadData = async () => {
    try {
      setError(null);
      const [configData, capabilitiesData, wgData] = await Promise.all([
        ethernetService.getConfig(),
        ethernetService.getCapabilities(),
        wireguardService.getConfig(),
      ]);
      setInterfaces(configData.interfaces);
      setCapabilities(capabilitiesData);
      setWireGuardInterfaces(wgData.interfaces);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load interface data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Extract all VLANs from interfaces
  const allVlans: VLANWithParent[] = interfaces.flatMap((iface) => {
    const vlans: VLANWithParent[] = [];

    if (iface.vif) {
      iface.vif.forEach((vif) => {
        vlans.push({
          ...vif,
          parentInterface: iface.name,
          fullName: `${iface.name}.${vif.vlan_id}`,
        });
      });
    }

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

  const totalInterfaces = interfaces.length;
  const totalVlans = allVlans.length;
  const totalWireGuard = wireGuardInterfaces.length;

  // Filter interfaces based on search
  const filteredInterfaces = interfaces.filter((iface) => {
    if (searchQuery === "") return true;
    const q = searchQuery.toLowerCase();
    return (
      iface.name.toLowerCase().includes(q) ||
      iface.description?.toLowerCase().includes(q) ||
      iface.addresses?.some((addr) => addr.toLowerCase().includes(q)) ||
      iface.vrf?.toLowerCase().includes(q) ||
      iface.hw_id?.toLowerCase().includes(q)
    );
  });

  // Filter VLANs based on search
  const filteredVlans = allVlans.filter((vlan) => {
    if (searchQuery === "") return true;
    const q = searchQuery.toLowerCase();
    return (
      vlan.fullName.toLowerCase().includes(q) ||
      vlan.parentInterface.toLowerCase().includes(q) ||
      vlan.description?.toLowerCase().includes(q) ||
      vlan.addresses?.some((addr) => addr.toLowerCase().includes(q)) ||
      vlan.vrf?.toLowerCase().includes(q)
    );
  });

  const filteredWireGuard = wireGuardInterfaces.filter((iface) => {
    if (searchQuery === "") return true;
    const q = searchQuery.toLowerCase();
    return (
      iface.name.toLowerCase().includes(q) ||
      iface.description?.toLowerCase().includes(q) ||
      iface.addresses?.some((addr) => addr.toLowerCase().includes(q))
    );
  });

  return (
    <AppLayout>
      <div className="flex h-full">
        {/* Left Sidebar - Interface Type Selector */}
        <div className="w-80 border-r border-border bg-card flex flex-col h-full">
          <div className="p-6 pb-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold text-foreground">Interfaces</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  {totalInterfaces + totalVlans + totalWireGuard} total
                </p>
              </div>
              <Button
                variant="outline"
                size="icon"
                onClick={loadData}
                disabled={loading}
                className="h-8 w-8"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              </Button>
            </div>
          </div>

          <Separator />

          {/* Interface Type List */}
          <ScrollArea className="flex-1 px-3">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <LoadingSpinner message="" size="sm" />
              </div>
            ) : error ? (
              <div className="p-4">
                <div className="flex items-center gap-2 text-destructive text-sm">
                  <AlertCircle className="h-4 w-4" />
                  <span>Failed to load</span>
                </div>
              </div>
            ) : (
              <div className="space-y-1 py-3">
                {/* Ethernet */}
                <button
                  onClick={() => setSelectedType("ethernet")}
                  className={cn(
                    "w-full text-left rounded-lg px-3 py-3 transition-all",
                    selectedType === "ethernet"
                      ? "bg-accent text-accent-foreground shadow-sm"
                      : "hover:bg-accent/50"
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div className={cn(
                      "mt-0.5 rounded-md p-1.5",
                      selectedType === "ethernet" ? "bg-primary/10" : "bg-muted"
                    )}>
                      <Cable className={cn(
                        "h-4 w-4",
                        selectedType === "ethernet" ? "text-primary" : "text-muted-foreground"
                      )} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="font-medium text-sm text-foreground">
                          Ethernet
                        </span>
                        {selectedType === "ethernet" && (
                          <ChevronRight className="h-4 w-4 text-primary flex-shrink-0" />
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {totalInterfaces} {totalInterfaces === 1 ? "interface" : "interfaces"}
                      </span>
                    </div>
                  </div>
                </button>

                {/* VLAN */}
                <button
                  onClick={() => setSelectedType("vlan")}
                  className={cn(
                    "w-full text-left rounded-lg px-3 py-3 transition-all",
                    selectedType === "vlan"
                      ? "bg-accent text-accent-foreground shadow-sm"
                      : "hover:bg-accent/50"
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div className={cn(
                      "mt-0.5 rounded-md p-1.5",
                      selectedType === "vlan" ? "bg-primary/10" : "bg-muted"
                    )}>
                      <Network className={cn(
                        "h-4 w-4",
                        selectedType === "vlan" ? "text-primary" : "text-muted-foreground"
                      )} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="font-medium text-sm text-foreground">
                          VLAN
                        </span>
                        {selectedType === "vlan" && (
                          <ChevronRight className="h-4 w-4 text-primary flex-shrink-0" />
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {totalVlans} {totalVlans === 1 ? "VLAN" : "VLANs"}
                      </span>
                    </div>
                  </div>
                </button>

                {/* WireGuard */}
                <button
                  onClick={() => setSelectedType("wireguard")}
                  className={cn(
                    "w-full text-left rounded-lg px-3 py-3 transition-all",
                    selectedType === "wireguard"
                      ? "bg-accent text-accent-foreground shadow-sm"
                      : "hover:bg-accent/50"
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div className={cn(
                      "mt-0.5 rounded-md p-1.5",
                      selectedType === "wireguard" ? "bg-primary/10" : "bg-muted"
                    )}>
                      <Shield className={cn(
                        "h-4 w-4",
                        selectedType === "wireguard" ? "text-primary" : "text-muted-foreground"
                      )} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="font-medium text-sm text-foreground">
                          WireGuard
                        </span>
                        {selectedType === "wireguard" && (
                          <ChevronRight className="h-4 w-4 text-primary flex-shrink-0" />
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {totalWireGuard} {totalWireGuard === 1 ? "tunnel" : "tunnels"}
                      </span>
                    </div>
                  </div>
                </button>
              </div>
            )}
          </ScrollArea>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col">
          {/* Header */}
          <div className="p-6 pb-4 border-b border-border">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <h1 className="text-2xl font-bold text-foreground">
                  {selectedType === "ethernet" ? "Ethernet Interfaces" : selectedType === "vlan" ? "VLANs" : "WireGuard Interfaces"}
                </h1>
                <p className="text-sm text-muted-foreground mt-2">
                  {selectedType === "ethernet"
                    ? "Physical and virtual ethernet interface configurations"
                    : selectedType === "vlan"
                      ? "802.1Q VLAN sub-interfaces"
                      : "WireGuard tunnel interfaces and status"}
                </p>
              </div>
              <Button
                className="gap-2"
                onClick={() => {
                  if (selectedType === "vlan") {
                    setIsCreateVLANModalOpen(true);
                  } else if (selectedType === "wireguard") {
                    window.location.href = "/vpn/wireguard";
                  } else {
                    setIsCreateInterfaceModalOpen(true);
                  }
                }}
                disabled={!canWrite(FeatureGroup.INTERFACES)}
              >
                <Plus className="h-4 w-4" />
                {selectedType === "ethernet" ? "Create Interface" : selectedType === "vlan" ? "Create VLAN" : "Manage WireGuard"}
              </Button>
            </div>

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder={
                  selectedType === "ethernet"
                    ? "Search by name, description, IP address, VRF, or MAC..."
                    : selectedType === "vlan"
                      ? "Search by name, parent, description, IP address, or VRF..."
                      : "Search by name, description, address..."
                }
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Table Content */}
          <div className="flex-1 overflow-auto p-6">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <LoadingSpinner message="Loading interfaces..." size="sm" />
              </div>
            ) : error ? (
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
            ) : selectedType === "ethernet" ? (
              /* Ethernet Table */
              filteredInterfaces.length === 0 ? (
                <Card className="border-border">
                  <CardContent className="py-12">
                    <div className="flex flex-col items-center gap-2">
                      <Cable className="h-12 w-12 text-muted-foreground/30" />
                      <p className="text-muted-foreground">
                        {searchQuery
                          ? "No ethernet interfaces matching your search"
                          : "No ethernet interfaces configured"}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <>
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Description</TableHead>
                          <TableHead>Addresses</TableHead>
                          <TableHead>VRF</TableHead>
                          <TableHead>MAC / HW ID</TableHead>
                          <TableHead>VLANs</TableHead>
                          <TableHead className="w-[80px]"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredInterfaces.map((iface) => {
                          const vlanCount = (iface.vif?.length || 0) + (iface.vif_s?.length || 0);
                          return (
                            <TableRow key={iface.name}>
                              <TableCell>
                                <code className="font-semibold font-mono text-foreground">
                                  {iface.name}
                                </code>
                              </TableCell>
                              <TableCell>
                                <Badge variant={iface.disable ? "secondary" : "default"} className="text-xs">
                                  {iface.disable ? "Disabled" : "Enabled"}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-muted-foreground max-w-[200px] truncate">
                                {iface.description || "—"}
                              </TableCell>
                              <TableCell>
                                {iface.addresses && iface.addresses.length > 0 ? (
                                  <div className="flex flex-wrap gap-1">
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
                                ) : (
                                  <span className="text-muted-foreground">—</span>
                                )}
                              </TableCell>
                              <TableCell>
                                {iface.vrf ? (
                                  <Badge variant="outline" className="bg-purple-500/10 text-purple-500 border-purple-500/20 text-xs">
                                    {iface.vrf}
                                  </Badge>
                                ) : (
                                  <span className="text-muted-foreground">—</span>
                                )}
                              </TableCell>
                              <TableCell>
                                {iface.hw_id ? (
                                  <code className="text-xs font-mono text-muted-foreground">
                                    {iface.hw_id}
                                  </code>
                                ) : (
                                  <span className="text-muted-foreground">—</span>
                                )}
                              </TableCell>
                              <TableCell>
                                {vlanCount > 0 ? (
                                  <Badge variant="secondary" className="text-xs">
                                    {vlanCount}
                                  </Badge>
                                ) : (
                                  <span className="text-muted-foreground">0</span>
                                )}
                              </TableCell>
                              <TableCell>
                                <div className="flex gap-1 justify-end">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setEditingInterface(iface)}
                                    className="h-7 w-7 p-0"
                                    disabled={!canWrite(FeatureGroup.INTERFACES)}
                                  >
                                    <Pencil className="h-3.5 w-3.5" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setDeletingInterface(iface)}
                                    className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                                    disabled={!canWrite(FeatureGroup.INTERFACES)}
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                  <p className="text-sm text-muted-foreground text-center mt-3">
                    Showing {filteredInterfaces.length} of {totalInterfaces} interface{totalInterfaces !== 1 ? "s" : ""}
                  </p>
                </>
              )
            ) : selectedType === "vlan" ? (
              /* VLAN Table */
              filteredVlans.length === 0 ? (
                <Card className="border-border">
                  <CardContent className="py-12">
                    <div className="flex flex-col items-center gap-2">
                      <Network className="h-12 w-12 text-muted-foreground/30" />
                      <p className="text-muted-foreground">
                        {searchQuery
                          ? "No VLANs matching your search"
                          : "No VLANs configured"}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <>
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>VLAN ID</TableHead>
                          <TableHead>Parent</TableHead>
                          <TableHead>Description</TableHead>
                          <TableHead>Addresses</TableHead>
                          <TableHead>VRF</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="w-[80px]"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredVlans.map((vlan) => (
                          <TableRow key={vlan.fullName}>
                            <TableCell>
                              <code className="font-semibold font-mono text-foreground">
                                {vlan.fullName}
                              </code>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="bg-purple-500/10 text-purple-500 border-purple-500/20 text-xs">
                                {vlan.vlan_id}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <code className="text-xs font-mono text-muted-foreground">
                                {vlan.parentInterface}
                              </code>
                            </TableCell>
                            <TableCell className="text-muted-foreground max-w-[200px] truncate">
                              {vlan.description || "—"}
                            </TableCell>
                            <TableCell>
                              {vlan.addresses && vlan.addresses.length > 0 ? (
                                <div className="flex flex-wrap gap-1">
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
                              ) : (
                                <span className="text-muted-foreground">—</span>
                              )}
                            </TableCell>
                            <TableCell>
                              {vlan.vrf ? (
                                <Badge variant="outline" className="bg-purple-500/10 text-purple-500 border-purple-500/20 text-xs">
                                  {vlan.vrf}
                                </Badge>
                              ) : (
                                <span className="text-muted-foreground">—</span>
                              )}
                            </TableCell>
                            <TableCell>
                              {vlan.disable ? (
                                <Badge variant="outline" className="bg-red-500/10 text-red-500 border-red-500/20 text-xs">
                                  Disabled
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20 text-xs">
                                  Enabled
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-1 justify-end">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setEditingVLAN(vlan)}
                                  className="h-7 w-7 p-0"
                                  disabled={!canWrite(FeatureGroup.INTERFACES)}
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
                                  disabled={!canWrite(FeatureGroup.INTERFACES)}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  <p className="text-sm text-muted-foreground text-center mt-3">
                    Showing {filteredVlans.length} of {totalVlans} VLAN{totalVlans !== 1 ? "s" : ""}
                  </p>
                </>
              )
            ) : filteredWireGuard.length === 0 ? (
              <Card className="border-border">
                <CardContent className="py-12">
                  <div className="flex flex-col items-center gap-2">
                    <Shield className="h-12 w-12 text-muted-foreground/30" />
                    <p className="text-muted-foreground">
                      {searchQuery ? "No WireGuard interfaces matching your search" : "No WireGuard interfaces configured"}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Addresses</TableHead>
                        <TableHead>Port</TableHead>
                        <TableHead>Peers</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredWireGuard.map((wg) => (
                        <TableRow key={wg.name}>
                          <TableCell><code className="font-semibold font-mono text-foreground">{wg.name}</code></TableCell>
                          <TableCell className="text-muted-foreground max-w-[220px] truncate">{wg.description || "—"}</TableCell>
                          <TableCell>
                            {wg.addresses?.length ? (
                              <div className="flex flex-wrap gap-1">
                                {wg.addresses.slice(0, 2).map((addr, idx) => <code key={idx} className="text-xs font-mono px-1.5 py-0.5 rounded bg-accent text-foreground">{addr}</code>)}
                                {wg.addresses.length > 2 && <Badge variant="secondary" className="text-xs px-1.5 py-0">+{wg.addresses.length - 2}</Badge>}
                              </div>
                            ) : <span className="text-muted-foreground">—</span>}
                          </TableCell>
                          <TableCell>{wg.port || "Auto"}</TableCell>
                          <TableCell><Badge variant="secondary" className="text-xs">{wg.peer_count}</Badge></TableCell>
                          <TableCell>
                            <Badge variant={wg.disabled ? "secondary" : "default"} className="text-xs">
                              {wg.disabled ? "Disabled" : "Enabled"}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                <p className="text-sm text-muted-foreground text-center mt-3">
                  Showing {filteredWireGuard.length} of {totalWireGuard} tunnel{totalWireGuard !== 1 ? "s" : ""}
                </p>
              </>
            )}
          </div>
        </div>
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
