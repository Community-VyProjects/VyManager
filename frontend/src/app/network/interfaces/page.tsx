"use client";

import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, RefreshCw, AlertCircle, Search, Cable, Pencil, Trash2, Network, ChevronRight, Shield, Boxes } from "lucide-react";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { ethernetService } from "@/lib/api/ethernet";
import type { EthernetInterface, EthernetCapabilities, VIFConfig, VIFSConfig } from "@/lib/api/types/ethernet";
import { wireguardService, type WireGuardInterface } from "@/lib/api/wireguard";
import { vxlanService, type VxlanInterface, type VxlanCapabilities } from "@/lib/api/vxlan";
import { CreateVxlanModal } from "@/components/vxlan/CreateVxlanModal";
import { EditVxlanModal } from "@/components/vxlan/EditVxlanModal";
import { DeleteVxlanModal } from "@/components/vxlan/DeleteVxlanModal";
import { ComprehensiveEthernetModal } from "@/components/network/ComprehensiveEthernetModal";
import { ComprehensiveVLANModal } from "@/components/network/ComprehensiveVLANModal";
import { ComprehensiveVIFSModal } from "@/components/network/ComprehensiveVIFSModal";
import { ComprehensiveVIFCModal } from "@/components/network/ComprehensiveVIFCModal";
import { DeleteEthernetModal } from "@/components/network/DeleteEthernetModal";
import { DeleteVLANModal } from "@/components/network/DeleteVLANModal";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { usePermissions } from "@/hooks/usePermissions";
import { FeatureGroup } from "@/lib/api/user-management";

type InterfaceType = "ethernet" | "vlan" | "wireguard" | "vxlan";
type VlanSubTab = "vif" | "vif-s" | "vif-c";

interface VLANWithParent extends VIFConfig {
  parentInterface: string;
  fullName: string;
}

interface VIFSWithParent extends VIFSConfig {
  parentInterface: string;
  fullName: string;
}

interface VIFCWithParent extends VIFConfig {
  parentInterface: string;
  sVlanId: string;
  fullName: string;
}

export default function InterfacesPage() {
  const [interfaces, setInterfaces] = useState<EthernetInterface[]>([]);
  const [capabilities, setCapabilities] = useState<EthernetCapabilities | null>(null);
  const [wireGuardInterfaces, setWireGuardInterfaces] = useState<WireGuardInterface[]>([]);
  const [vxlanInterfaces, setVxlanInterfaces] = useState<VxlanInterface[]>([]);
  const [vxlanCapabilities, setVxlanCapabilities] = useState<VxlanCapabilities | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState<InterfaceType>("ethernet");
  const [vlanSubTab, setVlanSubTab] = useState<VlanSubTab>("vif");

  // Ethernet Modal states
  const [isCreateInterfaceModalOpen, setIsCreateInterfaceModalOpen] = useState(false);
  const [editingInterface, setEditingInterface] = useState<EthernetInterface | null>(null);
  const [deletingInterface, setDeletingInterface] = useState<EthernetInterface | null>(null);

  // VIF Modal states
  const [isCreateVLANModalOpen, setIsCreateVLANModalOpen] = useState(false);
  const [editingVLAN, setEditingVLAN] = useState<VLANWithParent | null>(null);
  const [deletingVLAN, setDeletingVLAN] = useState<{ type: "vif" | "vif-s" | "vif-c"; parentInterface: string; vlanId: string; sVlanId?: string; description?: string | null; addresses?: string[] } | null>(null);

  // VIF-S Modal states
  const [isCreateVIFSModalOpen, setIsCreateVIFSModalOpen] = useState(false);
  const [editingVIFS, setEditingVIFS] = useState<VIFSWithParent | null>(null);

  // VIF-C Modal states
  const [isCreateVIFCModalOpen, setIsCreateVIFCModalOpen] = useState(false);
  const [editingVIFC, setEditingVIFC] = useState<VIFCWithParent | null>(null);

  // VXLAN Modal states
  const [isCreateVxlanModalOpen, setIsCreateVxlanModalOpen] = useState(false);
  const [editingVxlan, setEditingVxlan] = useState<VxlanInterface | null>(null);
  const [deletingVxlan, setDeletingVxlan] = useState<VxlanInterface | null>(null);

  const { canWrite } = usePermissions();

  const loadData = async () => {
    try {
      setError(null);
      const [configData, capabilitiesData, wgData, vxlanData, vxlanCapData] = await Promise.all([
        ethernetService.getConfig(),
        ethernetService.getCapabilities(),
        wireguardService.getConfig(),
        vxlanService.getConfig(),
        vxlanService.getCapabilities(),
      ]);
      setInterfaces(configData.interfaces);
      setCapabilities(capabilitiesData);
      setWireGuardInterfaces(wgData.interfaces);
      setVxlanInterfaces(vxlanData.interfaces);
      setVxlanCapabilities(vxlanCapData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load interface data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Extract VIF (802.1Q) sub-interfaces
  const allVifs: VLANWithParent[] = interfaces.flatMap((iface) =>
    (iface.vif || []).map((vif) => ({
      ...vif,
      parentInterface: iface.name,
      fullName: `${iface.name}.${vif.vlan_id}`,
    }))
  );

  // Extract VIF-S (QinQ Service) sub-interfaces
  const allVifS: VIFSWithParent[] = interfaces.flatMap((iface) =>
    (iface.vif_s || []).map((vifs) => ({
      ...vifs,
      parentInterface: iface.name,
      fullName: `${iface.name}.${vifs.vlan_id}`,
    }))
  );

  // Extract VIF-C (QinQ Customer) sub-interfaces from within VIF-S
  const allVifC: VIFCWithParent[] = interfaces.flatMap((iface) =>
    (iface.vif_s || []).flatMap((vifs) =>
      (vifs.vif_c || []).map((vifc) => ({
        ...vifc,
        parentInterface: iface.name,
        sVlanId: vifs.vlan_id,
        fullName: `${iface.name}.${vifs.vlan_id}.${vifc.vlan_id}`,
      }))
    )
  );

  const totalInterfaces = interfaces.length;
  const totalVlans = allVifs.length + allVifS.length + allVifC.length;
  const totalWireGuard = wireGuardInterfaces.length;
  const totalVxlan = vxlanInterfaces.length;

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

  // Generic VLAN filter helper
  const filterVlan = <T extends { fullName: string; parentInterface: string; description?: string | null; addresses?: string[]; vrf?: string | null }>(
    items: T[]
  ): T[] => {
    if (searchQuery === "") return items;
    const q = searchQuery.toLowerCase();
    return items.filter(
      (v) =>
        v.fullName.toLowerCase().includes(q) ||
        v.parentInterface.toLowerCase().includes(q) ||
        v.description?.toLowerCase().includes(q) ||
        v.addresses?.some((addr) => addr.toLowerCase().includes(q)) ||
        v.vrf?.toLowerCase().includes(q)
    );
  };

  const filteredVifs = filterVlan(allVifs);
  const filteredVifS = filterVlan(allVifS);
  const filteredVifC = filterVlan(allVifC);

  const handleCreateVlan = () => {
    if (vlanSubTab === "vif") setIsCreateVLANModalOpen(true);
    else if (vlanSubTab === "vif-s") setIsCreateVIFSModalOpen(true);
    else setIsCreateVIFCModalOpen(true);
  };

  const vlanSubTabLabel: Record<VlanSubTab, string> = {
    vif: "VLAN",
    "vif-s": "VIF-S",
    "vif-c": "VIF-C",
  };

  // Shared VLAN table renderer
  const renderVlanTable = <T extends { fullName: string; vlan_id: string; parentInterface: string; description?: string | null; addresses?: string[]; vrf?: string | null; disable?: boolean | null }>(
    items: T[],
    type: "vif" | "vif-s" | "vif-c",
    extraColumns?: (item: T) => React.ReactNode,
    onEdit?: (item: T) => void,
  ) => {
    if (items.length === 0) {
      return (
        <Card className="border-border">
          <CardContent className="py-12">
            <div className="flex flex-col items-center gap-2">
              <Network className="h-12 w-12 text-muted-foreground/30" />
              <p className="text-muted-foreground">
                {searchQuery
                  ? `No ${vlanSubTabLabel[type]}s matching your search`
                  : `No ${vlanSubTabLabel[type]}s configured`}
              </p>
            </div>
          </CardContent>
        </Card>
      );
    }

    return (
      <>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>VLAN ID</TableHead>
                <TableHead>Parent</TableHead>
                {type === "vif-c" && <TableHead>S-VLAN</TableHead>}
                <TableHead>Description</TableHead>
                <TableHead>Addresses</TableHead>
                <TableHead>VRF</TableHead>
                <TableHead>Status</TableHead>
                {extraColumns && <TableHead>Extra</TableHead>}
                <TableHead className="w-[80px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => (
                <TableRow key={item.fullName}>
                  <TableCell>
                    <code className="font-semibold font-mono text-foreground">{item.fullName}</code>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="bg-purple-500/10 text-purple-500 border-purple-500/20 text-xs">
                      {item.vlan_id}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <code className="text-xs font-mono text-muted-foreground">{item.parentInterface}</code>
                  </TableCell>
                  {type === "vif-c" && (
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {(item as unknown as VIFCWithParent).sVlanId}
                      </Badge>
                    </TableCell>
                  )}
                  <TableCell className="text-muted-foreground max-w-[200px] truncate">
                    {item.description || "—"}
                  </TableCell>
                  <TableCell>
                    {item.addresses && item.addresses.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {item.addresses.slice(0, 2).map((addr, idx) => (
                          <code key={idx} className="text-xs font-mono px-1.5 py-0.5 rounded bg-accent text-foreground">
                            {addr}
                          </code>
                        ))}
                        {item.addresses.length > 2 && (
                          <Badge variant="secondary" className="text-xs px-1.5 py-0">
                            +{item.addresses.length - 2}
                          </Badge>
                        )}
                      </div>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {item.vrf ? (
                      <Badge variant="outline" className="bg-purple-500/10 text-purple-500 border-purple-500/20 text-xs">
                        {item.vrf}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {item.disable ? (
                      <Badge variant="outline" className="bg-red-500/10 text-red-500 border-red-500/20 text-xs">Disabled</Badge>
                    ) : (
                      <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20 text-xs">Enabled</Badge>
                    )}
                  </TableCell>
                  {extraColumns && <TableCell>{extraColumns(item)}</TableCell>}
                  <TableCell>
                    <div className="flex gap-1 justify-end">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onEdit?.(item)}
                        className="h-7 w-7 p-0"
                        disabled={!canWrite(FeatureGroup.INTERFACES)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          const base = {
                            type,
                            parentInterface: item.parentInterface,
                            vlanId: item.vlan_id,
                            description: item.description,
                            addresses: item.addresses,
                          } as typeof deletingVLAN;
                          if (type === "vif-c") {
                            base!.sVlanId = (item as unknown as VIFCWithParent).sVlanId;
                          }
                          setDeletingVLAN(base);
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
          Showing {items.length} {vlanSubTabLabel[type]}{items.length !== 1 ? "s" : ""}
        </p>
      </>
    );
  };

  const filteredWireGuard = wireGuardInterfaces.filter((iface) => {
    if (searchQuery === "") return true;
    const q = searchQuery.toLowerCase();
    return (
      iface.name.toLowerCase().includes(q) ||
      iface.description?.toLowerCase().includes(q) ||
      iface.addresses?.some((addr) => addr.toLowerCase().includes(q))
    );
  });

  const filteredVxlan = vxlanInterfaces.filter((iface) => {
    if (searchQuery === "") return true;
    const q = searchQuery.toLowerCase();
    return (
      iface.name.toLowerCase().includes(q) ||
      (iface.description || "").toLowerCase().includes(q) ||
      iface.addresses?.some((addr) => addr.toLowerCase().includes(q)) ||
      (iface.vni || "").includes(q)
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
                  {totalInterfaces + totalVlans + totalWireGuard + totalVxlan} total
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
                        <span className="font-medium text-sm text-foreground">Ethernet</span>
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
                        <span className="font-medium text-sm text-foreground">VLAN</span>
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

                {/* VXLAN */}
                <button
                  onClick={() => setSelectedType("vxlan")}
                  className={cn(
                    "w-full text-left rounded-lg px-3 py-3 transition-all",
                    selectedType === "vxlan"
                      ? "bg-accent text-accent-foreground shadow-sm"
                      : "hover:bg-accent/50"
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div className={cn(
                      "mt-0.5 rounded-md p-1.5",
                      selectedType === "vxlan" ? "bg-primary/10" : "bg-muted"
                    )}>
                      <Boxes className={cn(
                        "h-4 w-4",
                        selectedType === "vxlan" ? "text-primary" : "text-muted-foreground"
                      )} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="font-medium text-sm text-foreground">
                          VXLAN
                        </span>
                        {selectedType === "vxlan" && (
                          <ChevronRight className="h-4 w-4 text-primary flex-shrink-0" />
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {totalVxlan} {totalVxlan === 1 ? "tunnel" : "tunnels"}
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
                  {selectedType === "ethernet" ? "Ethernet Interfaces" : selectedType === "vlan" ? "VLANs" : selectedType === "vxlan" ? "VXLAN Interfaces" : "WireGuard Interfaces"}
                </h1>
                <p className="text-sm text-muted-foreground mt-2">
                  {selectedType === "ethernet"
                    ? "Physical and virtual ethernet interface configurations"
                    : selectedType === "vlan"
                      ? "802.1Q VLAN, QinQ Service (VIF-S), and QinQ Customer (VIF-C) sub-interfaces"
                      : selectedType === "vxlan"
                        ? "VXLAN tunnel interfaces for overlay networking"
                        : "WireGuard tunnel interfaces and status"}
                </p>
              </div>
              <Button
                className="gap-2"
                onClick={() => {
                  if (selectedType === "vlan") {
                    handleCreateVlan();
                  } else if (selectedType === "wireguard") {
                    window.location.href = "/vpn/wireguard";
                  } else if (selectedType === "vxlan") {
                    setIsCreateVxlanModalOpen(true);
                  } else {
                    setIsCreateInterfaceModalOpen(true);
                  }
                }}
                disabled={selectedType === "vxlan" ? !canWrite(FeatureGroup.VXLAN) : !canWrite(FeatureGroup.INTERFACES)}
              >
                <Plus className="h-4 w-4" />
                {selectedType === "ethernet"
                  ? "Create Interface"
                  : selectedType === "vlan"
                    ? `Create ${vlanSubTabLabel[vlanSubTab]}`
                    : selectedType === "vxlan"
                      ? "Create VXLAN"
                      : "Manage WireGuard"}
              </Button>
            </div>

            {/* VLAN Sub-tabs */}
            {selectedType === "vlan" && (
              <div className="mb-4">
                <Tabs value={vlanSubTab} onValueChange={(v) => setVlanSubTab(v as VlanSubTab)}>
                  <TabsList>
                    <TabsTrigger value="vif" className="gap-1.5">
                      802.1Q VLAN
                      <Badge variant="secondary" className="text-xs px-1.5 py-0 ml-1">{allVifs.length}</Badge>
                    </TabsTrigger>
                    <TabsTrigger value="vif-s" className="gap-1.5">
                      VIF-S (QinQ Service)
                      <Badge variant="secondary" className="text-xs px-1.5 py-0 ml-1">{allVifS.length}</Badge>
                    </TabsTrigger>
                    <TabsTrigger value="vif-c" className="gap-1.5">
                      VIF-C (QinQ Customer)
                      <Badge variant="secondary" className="text-xs px-1.5 py-0 ml-1">{allVifC.length}</Badge>
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
            )}

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder={
                  selectedType === "ethernet"
                    ? "Search by name, description, IP address, VRF, or MAC..."
                    : selectedType === "vlan"
                      ? "Search by name, parent, description, IP address, or VRF..."
                      : selectedType === "vxlan"
                        ? "Search by name, description, address, or VNI..."
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
                                <code className="font-semibold font-mono text-foreground">{iface.name}</code>
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
                                      <code key={idx} className="text-xs font-mono px-1.5 py-0.5 rounded bg-accent text-foreground">
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
                                  <code className="text-xs font-mono text-muted-foreground">{iface.hw_id}</code>
                                ) : (
                                  <span className="text-muted-foreground">—</span>
                                )}
                              </TableCell>
                              <TableCell>
                                {vlanCount > 0 ? (
                                  <Badge variant="secondary" className="text-xs">{vlanCount}</Badge>
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
              /* VLAN Tables - based on sub-tab */
              <>
                {vlanSubTab === "vif" && renderVlanTable(
                  filteredVifs,
                  "vif",
                  undefined,
                  (item) => setEditingVLAN(item),
                )}
                {vlanSubTab === "vif-s" && renderVlanTable(
                  filteredVifS,
                  "vif-s",
                  undefined,
                  (item) => setEditingVIFS(item),
                )}
                {vlanSubTab === "vif-c" && renderVlanTable(
                  filteredVifC,
                  "vif-c",
                  undefined,
                  (item) => setEditingVIFC(item),
                )}
              </>
            ) : selectedType === "vxlan" ? (
              /* VXLAN Table */
              filteredVxlan.length === 0 ? (
                <Card className="border-border">
                  <CardContent className="py-12">
                    <div className="flex flex-col items-center gap-2">
                      <Boxes className="h-12 w-12 text-muted-foreground/30" />
                      <p className="text-muted-foreground">
                        {searchQuery ? "No VXLAN interfaces matching your search" : "No VXLAN interfaces configured"}
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
                          <TableHead>VNI</TableHead>
                          <TableHead>Description</TableHead>
                          <TableHead>Addresses</TableHead>
                          <TableHead>Source</TableHead>
                          <TableHead>Remotes</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="w-[80px]"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredVxlan.map((vx) => (
                          <TableRow key={vx.name} className="group">
                            <TableCell><code className="font-semibold font-mono text-foreground">{vx.name}</code></TableCell>
                            <TableCell className="font-mono text-sm">{vx.vni || "—"}</TableCell>
                            <TableCell className="text-muted-foreground max-w-[180px] truncate">{vx.description || "—"}</TableCell>
                            <TableCell>
                              {vx.addresses?.length ? (
                                <div className="flex flex-wrap gap-1">
                                  {vx.addresses.slice(0, 2).map((addr, idx) => <code key={idx} className="text-xs font-mono px-1.5 py-0.5 rounded bg-accent text-foreground">{addr}</code>)}
                                  {vx.addresses.length > 2 && <Badge variant="secondary" className="text-xs px-1.5 py-0">+{vx.addresses.length - 2}</Badge>}
                                </div>
                              ) : <span className="text-muted-foreground">—</span>}
                            </TableCell>
                            <TableCell className="text-sm">{vx.source_address || vx.source_interface || "—"}</TableCell>
                            <TableCell>
                              {vx.remotes.length > 0 ? (
                                <Badge variant="secondary" className="text-xs">{vx.remotes.length}</Badge>
                              ) : vx.group ? (
                                <span className="text-xs text-muted-foreground">{vx.group}</span>
                              ) : <span className="text-muted-foreground">—</span>}
                            </TableCell>
                            <TableCell>
                              <Badge variant={vx.disabled ? "secondary" : "default"} className="text-xs">
                                {vx.disabled ? "Disabled" : "Enabled"}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                {canWrite(FeatureGroup.VXLAN) && (
                                  <>
                                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditingVxlan(vx)}>
                                      <Pencil className="h-3.5 w-3.5" />
                                    </Button>
                                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setDeletingVxlan(vx)}>
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </Button>
                                  </>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  <p className="text-sm text-muted-foreground text-center mt-3">
                    Showing {filteredVxlan.length} of {totalVxlan} tunnel{totalVxlan !== 1 ? "s" : ""}
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

      {/* VIF (802.1Q) Modals */}
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

      {/* VIF-S (QinQ Service) Modals */}
      <ComprehensiveVIFSModal
        open={isCreateVIFSModalOpen}
        onOpenChange={setIsCreateVIFSModalOpen}
        mode="create"
        interfaces={interfaces}
        capabilities={capabilities}
        onSuccess={loadData}
      />

      {editingVIFS && (
        <ComprehensiveVIFSModal
          open={!!editingVIFS}
          onOpenChange={(open) => !open && setEditingVIFS(null)}
          mode="edit"
          vlan={editingVIFS}
          interfaces={interfaces}
          capabilities={capabilities}
          onSuccess={() => {
            setEditingVIFS(null);
            loadData();
          }}
        />
      )}

      {/* VIF-C (QinQ Customer) Modals */}
      <ComprehensiveVIFCModal
        open={isCreateVIFCModalOpen}
        onOpenChange={setIsCreateVIFCModalOpen}
        mode="create"
        interfaces={interfaces}
        capabilities={capabilities}
        onSuccess={loadData}
      />

      {editingVIFC && (
        <ComprehensiveVIFCModal
          open={!!editingVIFC}
          onOpenChange={(open) => !open && setEditingVIFC(null)}
          mode="edit"
          vlan={editingVIFC}
          interfaces={interfaces}
          capabilities={capabilities}
          onSuccess={() => {
            setEditingVIFC(null);
            loadData();
          }}
        />
      )}

      {/* Delete VLAN Modal (shared for all types) */}
      {deletingVLAN && (
        <DeleteVLANModal
          open={!!deletingVLAN}
          onOpenChange={(open) => !open && setDeletingVLAN(null)}
          vlanType={deletingVLAN.type}
          parentInterface={deletingVLAN.parentInterface}
          vlanId={deletingVLAN.vlanId}
          sVlanId={deletingVLAN.sVlanId}
          description={deletingVLAN.description}
          addresses={deletingVLAN.addresses}
          onSuccess={() => {
            setDeletingVLAN(null);
            loadData();
          }}
        />
      )}

      {/* VXLAN Modals */}
      <CreateVxlanModal
        open={isCreateVxlanModalOpen}
        onOpenChange={setIsCreateVxlanModalOpen}
        onSuccess={loadData}
        capabilities={vxlanCapabilities}
        existingInterfaces={vxlanInterfaces.map((i) => i.name)}
      />
      <EditVxlanModal
        open={!!editingVxlan}
        onOpenChange={(open) => !open && setEditingVxlan(null)}
        onSuccess={() => {
          setEditingVxlan(null);
          loadData();
        }}
        capabilities={vxlanCapabilities}
        interfaceData={editingVxlan}
      />
      <DeleteVxlanModal
        open={!!deletingVxlan}
        onOpenChange={(open) => !open && setDeletingVxlan(null)}
        onSuccess={() => {
          setDeletingVxlan(null);
          loadData();
        }}
        interfaceData={deletingVxlan}
      />
    </AppLayout>
  );
}
