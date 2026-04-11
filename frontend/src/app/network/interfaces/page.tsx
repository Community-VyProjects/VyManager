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
import { Plus, RefreshCw, AlertCircle, Search, Cable, Pencil, Trash2, Network, ChevronRight, Shield, Boxes, Waypoints, Link2, GitMerge, Box, Layers, ArrowDownToLine, Repeat, Lock } from "lucide-react";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { ethernetService } from "@/lib/api/ethernet";
import type { EthernetInterface, EthernetCapabilities, VIFConfig, VIFSConfig } from "@/lib/api/types/ethernet";
import { wireguardService, type WireGuardInterface } from "@/lib/api/wireguard";
import { vxlanService, type VxlanInterface, type VxlanCapabilities } from "@/lib/api/vxlan";
import { tunnelService, type TunnelInterface, type TunnelCapabilities } from "@/lib/api/tunnel";
import { CreateTunnelModal } from "@/components/tunnel/CreateTunnelModal";
import { EditTunnelModal } from "@/components/tunnel/EditTunnelModal";
import { DeleteTunnelModal } from "@/components/tunnel/DeleteTunnelModal";
import { bondingService, type BondingInterface, type BondingCapabilities } from "@/lib/api/bonding";
import { CreateBondingModal } from "@/components/bonding/CreateBondingModal";
import { EditBondingModal } from "@/components/bonding/EditBondingModal";
import { DeleteBondingModal } from "@/components/bonding/DeleteBondingModal";
import { dummyService, type DummyInterface, type DummyCapabilities } from "@/lib/api/dummy";
import { CreateDummyModal } from "@/components/dummy/CreateDummyModal";
import { EditDummyModal } from "@/components/dummy/EditDummyModal";
import { DeleteDummyModal } from "@/components/dummy/DeleteDummyModal";
import { geneveService, type GeneveInterface, type GeneveCapabilities } from "@/lib/api/geneve";
import { CreateGeneveModal } from "@/components/geneve/CreateGeneveModal";
import { EditGeneveModal } from "@/components/geneve/EditGeneveModal";
import { DeleteGeneveModal } from "@/components/geneve/DeleteGeneveModal";
import { inputService, type InputInterface, type InputCapabilities } from "@/lib/api/input";
import { CreateInputModal } from "@/components/input/CreateInputModal";
import { EditInputModal } from "@/components/input/EditInputModal";
import { DeleteInputModal } from "@/components/input/DeleteInputModal";
import { l2tpv3Service, type L2TPv3Interface, type L2TPv3Capabilities } from "@/lib/api/l2tpv3";
import { CreateL2TPv3Modal } from "@/components/l2tpv3/CreateL2TPv3Modal";
import { EditL2TPv3Modal } from "@/components/l2tpv3/EditL2TPv3Modal";
import { DeleteL2TPv3Modal } from "@/components/l2tpv3/DeleteL2TPv3Modal";
import { loopbackService, type LoopbackInterface, type LoopbackCapabilities } from "@/lib/api/loopback";
import { CreateLoopbackModal } from "@/components/loopback/CreateLoopbackModal";
import { EditLoopbackModal } from "@/components/loopback/EditLoopbackModal";
import { DeleteLoopbackModal } from "@/components/loopback/DeleteLoopbackModal";
import { macsecService, type MacsecInterface, type MacsecCapabilities } from "@/lib/api/macsec";
import { CreateMacsecModal } from "@/components/macsec/CreateMacsecModal";
import { EditMacsecModal } from "@/components/macsec/EditMacsecModal";
import { DeleteMacsecModal } from "@/components/macsec/DeleteMacsecModal";
import { bridgeService, type BridgeInterface, type BridgeCapabilities } from "@/lib/api/bridge";
import { CreateBridgeModal } from "@/components/bridge/CreateBridgeModal";
import { EditBridgeModal } from "@/components/bridge/EditBridgeModal";
import { DeleteBridgeModal } from "@/components/bridge/DeleteBridgeModal";
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

type InterfaceType = "ethernet" | "vlan" | "wireguard" | "vxlan" | "tunnel" | "bonding" | "bridge" | "dummy" | "geneve" | "input" | "l2tpv3" | "loopback" | "macsec";
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

  // Tunnel state
  const [tunnelInterfaces, setTunnelInterfaces] = useState<TunnelInterface[]>([]);
  const [tunnelCapabilities, setTunnelCapabilities] = useState<TunnelCapabilities | null>(null);

  // Tunnel Modal states
  const [isCreateTunnelModalOpen, setIsCreateTunnelModalOpen] = useState(false);
  const [editingTunnel, setEditingTunnel] = useState<TunnelInterface | null>(null);
  const [deletingTunnel, setDeletingTunnel] = useState<TunnelInterface | null>(null);

  // Dummy state
  const [dummyInterfaces, setDummyInterfaces] = useState<DummyInterface[]>([]);
  const [dummyCapabilities, setDummyCapabilities] = useState<DummyCapabilities | null>(null);

  // Dummy Modal states
  const [isCreateDummyModalOpen, setIsCreateDummyModalOpen] = useState(false);
  const [editingDummy, setEditingDummy] = useState<DummyInterface | null>(null);
  const [deletingDummy, setDeletingDummy] = useState<DummyInterface | null>(null);

  // GENEVE state
  const [geneveInterfaces, setGeneveInterfaces] = useState<GeneveInterface[]>([]);
  const [geneveCapabilities, setGeneveCapabilities] = useState<GeneveCapabilities | null>(null);

  // GENEVE Modal states
  const [isCreateGeneveModalOpen, setIsCreateGeneveModalOpen] = useState(false);
  const [editingGeneve, setEditingGeneve] = useState<GeneveInterface | null>(null);
  const [deletingGeneve, setDeletingGeneve] = useState<GeneveInterface | null>(null);

  // Input state
  const [inputInterfaces, setInputInterfaces] = useState<InputInterface[]>([]);
  const [inputCapabilities, setInputCapabilities] = useState<InputCapabilities | null>(null);

  // Input Modal states
  const [isCreateInputModalOpen, setIsCreateInputModalOpen] = useState(false);
  const [editingInput, setEditingInput] = useState<InputInterface | null>(null);
  const [deletingInput, setDeletingInput] = useState<InputInterface | null>(null);

  // L2TPv3 state
  const [l2tpv3Interfaces, setL2tpv3Interfaces] = useState<L2TPv3Interface[]>([]);
  const [l2tpv3Capabilities, setL2tpv3Capabilities] = useState<L2TPv3Capabilities | null>(null);

  // L2TPv3 Modal states
  const [editingL2tpv3, setEditingL2tpv3] = useState<L2TPv3Interface | null>(null);
  const [deletingL2tpv3, setDeletingL2tpv3] = useState<L2TPv3Interface | null>(null);
  const [isCreateL2tpv3ModalOpen, setIsCreateL2tpv3ModalOpen] = useState(false);

  // Loopback state
  const [loopbackInterfaces, setLoopbackInterfaces] = useState<LoopbackInterface[]>([]);
  const [loopbackCapabilities, setLoopbackCapabilities] = useState<LoopbackCapabilities | null>(null);

  // Loopback Modal states
  const [isCreateLoopbackModalOpen, setIsCreateLoopbackModalOpen] = useState(false);
  const [editingLoopback, setEditingLoopback] = useState<LoopbackInterface | null>(null);
  const [deletingLoopback, setDeletingLoopback] = useState<LoopbackInterface | null>(null);

  // MACsec state
  const [macsecInterfaces, setMacsecInterfaces] = useState<MacsecInterface[]>([]);
  const [macsecCapabilities, setMacsecCapabilities] = useState<MacsecCapabilities | null>(null);

  // MACsec Modal states
  const [isCreateMacsecModalOpen, setIsCreateMacsecModalOpen] = useState(false);
  const [editingMacsec, setEditingMacsec] = useState<MacsecInterface | null>(null);
  const [deletingMacsec, setDeletingMacsec] = useState<MacsecInterface | null>(null);

  // Bonding state
  const [bondingInterfaces, setBondingInterfaces] = useState<BondingInterface[]>([]);
  const [bondingCapabilities, setBondingCapabilities] = useState<BondingCapabilities | null>(null);

  // Bonding Modal states
  const [isCreateBondingModalOpen, setIsCreateBondingModalOpen] = useState(false);
  const [editingBonding, setEditingBonding] = useState<BondingInterface | null>(null);
  const [deletingBonding, setDeletingBonding] = useState<BondingInterface | null>(null);

  // Bridge state
  const [bridgeInterfaces, setBridgeInterfaces] = useState<BridgeInterface[]>([]);
  const [bridgeCapabilities, setBridgeCapabilities] = useState<BridgeCapabilities | null>(null);

  // Bridge Modal states
  const [isCreateBridgeModalOpen, setIsCreateBridgeModalOpen] = useState(false);
  const [editingBridge, setEditingBridge] = useState<BridgeInterface | null>(null);
  const [deletingBridge, setDeletingBridge] = useState<BridgeInterface | null>(null);

  const { canWrite } = usePermissions();

  const loadData = async () => {
    try {
      setError(null);
      const [configData, capabilitiesData, wgData, vxlanData, vxlanCapData, tunnelData, tunnelCapData, dummyData, dummyCapData, geneveData, geneveCapData, inputData, inputCapData, l2tpv3Data, l2tpv3CapData, loopbackData, loopbackCapData, macsecData, macsecCapData, bondingData, bondingCapData, bridgeData, bridgeCapData] = await Promise.all([
        ethernetService.getConfig(),
        ethernetService.getCapabilities(),
        wireguardService.getConfig(),
        vxlanService.getConfig(),
        vxlanService.getCapabilities(),
        tunnelService.getConfig(),
        tunnelService.getCapabilities(),
        dummyService.getConfig(),
        dummyService.getCapabilities(),
        geneveService.getConfig(),
        geneveService.getCapabilities(),
        inputService.getConfig(),
        inputService.getCapabilities(),
        l2tpv3Service.getConfig(),
        l2tpv3Service.getCapabilities(),
        loopbackService.getConfig(),
        loopbackService.getCapabilities(),
        macsecService.getConfig(),
        macsecService.getCapabilities(),
        bondingService.getConfig(),
        bondingService.getCapabilities(),
        bridgeService.getConfig(),
        bridgeService.getCapabilities(),
      ]);
      setInterfaces(configData.interfaces);
      setCapabilities(capabilitiesData);
      setWireGuardInterfaces(wgData.interfaces);
      setVxlanInterfaces(vxlanData.interfaces);
      setVxlanCapabilities(vxlanCapData);
      setTunnelInterfaces(tunnelData.interfaces);
      setTunnelCapabilities(tunnelCapData);
      setDummyInterfaces(dummyData.interfaces);
      setDummyCapabilities(dummyCapData);
      setGeneveInterfaces(geneveData.interfaces);
      setGeneveCapabilities(geneveCapData);
      setInputInterfaces(inputData.interfaces);
      setInputCapabilities(inputCapData);
      setL2tpv3Interfaces(l2tpv3Data.interfaces);
      setL2tpv3Capabilities(l2tpv3CapData);
      setLoopbackInterfaces(loopbackData.interfaces);
      setLoopbackCapabilities(loopbackCapData);
      setMacsecInterfaces(macsecData.interfaces);
      setMacsecCapabilities(macsecCapData);
      setBondingInterfaces(bondingData.interfaces);
      setBondingCapabilities(bondingCapData);
      setBridgeInterfaces(bridgeData.interfaces);
      setBridgeCapabilities(bridgeCapData);
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
  const totalTunnel = tunnelInterfaces.length;
  const totalDummy = dummyInterfaces.length;
  const totalGeneve = geneveInterfaces.length;
  const totalInput = inputInterfaces.length;
  const totalL2tpv3 = l2tpv3Interfaces.length;
  const totalLoopback = loopbackInterfaces.length;
  const totalMacsec = macsecInterfaces.length;
  const totalBonding = bondingInterfaces.length;
  const totalBridge = bridgeInterfaces.length;

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
                    <Badge variant="secondary" className="text-xs">
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

  const filteredTunnel = tunnelInterfaces.filter((iface) => {
    if (searchQuery === "") return true;
    const q = searchQuery.toLowerCase();
    return (
      iface.name.toLowerCase().includes(q) ||
      (iface.description || "").toLowerCase().includes(q) ||
      iface.addresses?.some((addr) => addr.toLowerCase().includes(q)) ||
      (iface.encapsulation || "").toLowerCase().includes(q) ||
      (iface.remote || "").toLowerCase().includes(q)
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

  const filteredDummy = dummyInterfaces.filter((iface) => {
    if (searchQuery === "") return true;
    const q = searchQuery.toLowerCase();
    return (
      iface.name.toLowerCase().includes(q) ||
      (iface.description || "").toLowerCase().includes(q) ||
      iface.addresses?.some((addr) => addr.toLowerCase().includes(q)) ||
      (iface.vrf || "").toLowerCase().includes(q)
    );
  });

  const filteredGeneve = geneveInterfaces.filter((iface) => {
    if (searchQuery === "") return true;
    const q = searchQuery.toLowerCase();
    return (
      iface.name.toLowerCase().includes(q) ||
      (iface.description || "").toLowerCase().includes(q) ||
      iface.addresses?.some((addr) => addr.toLowerCase().includes(q)) ||
      (iface.remote || "").toLowerCase().includes(q) ||
      (iface.vni || "").includes(q)
    );
  });

  const filteredInput = inputInterfaces.filter((iface) => {
    if (searchQuery === "") return true;
    const q = searchQuery.toLowerCase();
    return (
      iface.name.toLowerCase().includes(q) ||
      (iface.description || "").toLowerCase().includes(q) ||
      (iface.redirect || "").toLowerCase().includes(q)
    );
  });

  const filteredL2tpv3 = l2tpv3Interfaces.filter((iface) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      iface.name.toLowerCase().includes(q) ||
      (iface.description?.toLowerCase().includes(q) ?? false) ||
      (iface.remote?.toLowerCase().includes(q) ?? false) ||
      iface.addresses.some((a) => a.toLowerCase().includes(q))
    );
  });

  const filteredLoopback = loopbackInterfaces.filter((iface) => {
    if (searchQuery === "") return true;
    const q = searchQuery.toLowerCase();
    return (
      iface.name.toLowerCase().includes(q) ||
      (iface.description || "").toLowerCase().includes(q) ||
      iface.addresses?.some((addr) => addr.toLowerCase().includes(q))
    );
  });

  const filteredMacsec = macsecInterfaces.filter((iface) => {
    if (searchQuery === "") return true;
    const q = searchQuery.toLowerCase();
    return (
      iface.name.toLowerCase().includes(q) ||
      (iface.description || "").toLowerCase().includes(q) ||
      iface.addresses?.some((addr) => addr.toLowerCase().includes(q)) ||
      (iface.source_interface || "").toLowerCase().includes(q) ||
      (iface.security?.cipher || "").toLowerCase().includes(q)
    );
  });

  const filteredBonding = bondingInterfaces.filter((iface) => {
    if (searchQuery === "") return true;
    const q = searchQuery.toLowerCase();
    return (
      iface.name.toLowerCase().includes(q) ||
      (iface.description || "").toLowerCase().includes(q) ||
      iface.addresses?.some((addr) => addr.toLowerCase().includes(q)) ||
      (iface.mode || "").toLowerCase().includes(q) ||
      iface.members?.some((m) => m.toLowerCase().includes(q))
    );
  });

  const filteredBridge = bridgeInterfaces.filter((iface) => {
    if (searchQuery === "") return true;
    const q = searchQuery.toLowerCase();
    return (
      iface.name.toLowerCase().includes(q) ||
      (iface.description || "").toLowerCase().includes(q) ||
      iface.addresses?.some((addr) => addr.toLowerCase().includes(q)) ||
      iface.members?.some((m) => m.name.toLowerCase().includes(q))
    );
  });

  return (
    <AppLayout>
      <div className="flex h-full overflow-hidden">
        {/* Left Sidebar - Interface Type Selector */}
        <div className="w-80 border-r border-border bg-card flex flex-col h-full min-h-0">
          <div className="p-4 sm:p-6 pb-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold text-foreground">Interfaces</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  {totalInterfaces + totalVlans + totalWireGuard + totalVxlan + totalTunnel + totalDummy + totalGeneve + totalInput + totalLoopback + totalMacsec + totalBonding + totalBridge} total
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
          <ScrollArea className="flex-1 min-h-0 overflow-hidden px-3">
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

                {/* Tunnel */}
                <button
                  onClick={() => setSelectedType("tunnel")}
                  className={cn(
                    "w-full text-left rounded-lg px-3 py-3 transition-all",
                    selectedType === "tunnel"
                      ? "bg-accent text-accent-foreground shadow-sm"
                      : "hover:bg-accent/50"
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div className={cn(
                      "mt-0.5 rounded-md p-1.5",
                      selectedType === "tunnel" ? "bg-primary/10" : "bg-muted"
                    )}>
                      <Waypoints className={cn(
                        "h-4 w-4",
                        selectedType === "tunnel" ? "text-primary" : "text-muted-foreground"
                      )} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="font-medium text-sm text-foreground">Tunnel</span>
                        {selectedType === "tunnel" && (
                          <ChevronRight className="h-4 w-4 text-primary flex-shrink-0" />
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {totalTunnel} {totalTunnel === 1 ? "interface" : "interfaces"}
                      </span>
                    </div>
                  </div>
                </button>

                {/* Dummy */}
                <button
                  onClick={() => setSelectedType("dummy")}
                  className={cn(
                    "w-full text-left rounded-lg px-3 py-3 transition-all",
                    selectedType === "dummy"
                      ? "bg-accent text-accent-foreground shadow-sm"
                      : "hover:bg-accent/50"
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div className={cn(
                      "mt-0.5 rounded-md p-1.5",
                      selectedType === "dummy" ? "bg-primary/10" : "bg-muted"
                    )}>
                      <Box className={cn(
                        "h-4 w-4",
                        selectedType === "dummy" ? "text-primary" : "text-muted-foreground"
                      )} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="font-medium text-sm text-foreground">Dummy</span>
                        {selectedType === "dummy" && (
                          <ChevronRight className="h-4 w-4 text-primary flex-shrink-0" />
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {totalDummy} {totalDummy === 1 ? "interface" : "interfaces"}
                      </span>
                    </div>
                  </div>
                </button>

                {/* GENEVE */}
                <button
                  onClick={() => setSelectedType("geneve")}
                  className={cn(
                    "w-full text-left rounded-lg px-3 py-3 transition-all",
                    selectedType === "geneve"
                      ? "bg-accent text-accent-foreground shadow-sm"
                      : "hover:bg-accent/50"
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div className={cn(
                      "mt-0.5 rounded-md p-1.5",
                      selectedType === "geneve" ? "bg-primary/10" : "bg-muted"
                    )}>
                      <Layers className={cn(
                        "h-4 w-4",
                        selectedType === "geneve" ? "text-primary" : "text-muted-foreground"
                      )} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="font-medium text-sm text-foreground">GENEVE</span>
                        {selectedType === "geneve" && (
                          <ChevronRight className="h-4 w-4 text-primary flex-shrink-0" />
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {totalGeneve} {totalGeneve === 1 ? "interface" : "interfaces"}
                      </span>
                    </div>
                  </div>
                </button>

                {/* Input */}
                <button
                  onClick={() => setSelectedType("input")}
                  className={cn(
                    "w-full text-left rounded-lg px-3 py-3 transition-all",
                    selectedType === "input"
                      ? "bg-accent text-accent-foreground shadow-sm"
                      : "hover:bg-accent/50"
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div className={cn(
                      "mt-0.5 rounded-md p-1.5",
                      selectedType === "input" ? "bg-primary/10" : "bg-muted"
                    )}>
                      <ArrowDownToLine className={cn(
                        "h-4 w-4",
                        selectedType === "input" ? "text-primary" : "text-muted-foreground"
                      )} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="font-medium text-sm text-foreground">Input</span>
                        {selectedType === "input" && (
                          <ChevronRight className="h-4 w-4 text-primary flex-shrink-0" />
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {totalInput} {totalInput === 1 ? "interface" : "interfaces"}
                      </span>
                    </div>
                  </div>
                </button>

                {/* L2TPv3 */}
                <button
                  onClick={() => setSelectedType("l2tpv3")}
                  className={cn(
                    "w-full text-left rounded-lg px-3 py-3 transition-all",
                    selectedType === "l2tpv3"
                      ? "bg-accent text-accent-foreground shadow-sm"
                      : "hover:bg-accent/50"
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div className={cn(
                      "mt-0.5 rounded-md p-1.5",
                      selectedType === "l2tpv3" ? "bg-primary/10" : "bg-muted"
                    )}>
                      <Cable className={cn(
                        "h-4 w-4",
                        selectedType === "l2tpv3" ? "text-primary" : "text-muted-foreground"
                      )} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="font-medium text-sm text-foreground">L2TPv3</span>
                        {selectedType === "l2tpv3" && (
                          <ChevronRight className="h-4 w-4 text-primary flex-shrink-0" />
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {totalL2tpv3} {totalL2tpv3 === 1 ? "interface" : "interfaces"}
                      </span>
                    </div>
                  </div>
                </button>

                {/* Loopback */}
                <button
                  onClick={() => setSelectedType("loopback")}
                  className={cn(
                    "w-full text-left rounded-lg px-3 py-3 transition-all",
                    selectedType === "loopback"
                      ? "bg-accent text-accent-foreground shadow-sm"
                      : "hover:bg-accent/50"
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div className={cn(
                      "mt-0.5 rounded-md p-1.5",
                      selectedType === "loopback" ? "bg-primary/10" : "bg-muted"
                    )}>
                      <Repeat className={cn(
                        "h-4 w-4",
                        selectedType === "loopback" ? "text-primary" : "text-muted-foreground"
                      )} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="font-medium text-sm text-foreground">Loopback</span>
                        {selectedType === "loopback" && (
                          <ChevronRight className="h-4 w-4 text-primary flex-shrink-0" />
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {totalLoopback} {totalLoopback === 1 ? "interface" : "interfaces"}
                      </span>
                    </div>
                  </div>
                </button>

                {/* MACsec */}
                <button
                  onClick={() => setSelectedType("macsec")}
                  className={cn(
                    "w-full text-left rounded-lg px-3 py-3 transition-all",
                    selectedType === "macsec"
                      ? "bg-accent text-accent-foreground shadow-sm"
                      : "hover:bg-accent/50"
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div className={cn(
                      "mt-0.5 rounded-md p-1.5",
                      selectedType === "macsec" ? "bg-primary/10" : "bg-muted"
                    )}>
                      <Lock className={cn(
                        "h-4 w-4",
                        selectedType === "macsec" ? "text-primary" : "text-muted-foreground"
                      )} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="font-medium text-sm text-foreground">MACsec</span>
                        {selectedType === "macsec" && (
                          <ChevronRight className="h-4 w-4 text-primary flex-shrink-0" />
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {totalMacsec} {totalMacsec === 1 ? "interface" : "interfaces"}
                      </span>
                    </div>
                  </div>
                </button>

                {/* Bonding */}
                <button
                  onClick={() => setSelectedType("bonding")}
                  className={cn(
                    "w-full text-left rounded-lg px-3 py-3 transition-all",
                    selectedType === "bonding"
                      ? "bg-accent text-accent-foreground shadow-sm"
                      : "hover:bg-accent/50"
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div className={cn(
                      "mt-0.5 rounded-md p-1.5",
                      selectedType === "bonding" ? "bg-primary/10" : "bg-muted"
                    )}>
                      <Link2 className={cn(
                        "h-4 w-4",
                        selectedType === "bonding" ? "text-primary" : "text-muted-foreground"
                      )} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="font-medium text-sm text-foreground">Bonding</span>
                        {selectedType === "bonding" && (
                          <ChevronRight className="h-4 w-4 text-primary flex-shrink-0" />
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {totalBonding} {totalBonding === 1 ? "interface" : "interfaces"}
                      </span>
                    </div>
                  </div>
                </button>

                {/* Bridge */}
                <button
                  onClick={() => setSelectedType("bridge")}
                  className={cn(
                    "w-full text-left rounded-lg px-3 py-3 transition-all",
                    selectedType === "bridge"
                      ? "bg-accent text-accent-foreground shadow-sm"
                      : "hover:bg-accent/50"
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div className={cn(
                      "mt-0.5 rounded-md p-1.5",
                      selectedType === "bridge" ? "bg-primary/10" : "bg-muted"
                    )}>
                      <GitMerge className={cn(
                        "h-4 w-4",
                        selectedType === "bridge" ? "text-primary" : "text-muted-foreground"
                      )} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="font-medium text-sm text-foreground">Bridge</span>
                        {selectedType === "bridge" && (
                          <ChevronRight className="h-4 w-4 text-primary flex-shrink-0" />
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {totalBridge} {totalBridge === 1 ? "interface" : "interfaces"}
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
          <div className="p-4 sm:p-6 pb-4 border-b border-border">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <h1 className="text-2xl font-bold text-foreground">
                  {selectedType === "ethernet" ? "Ethernet Interfaces" : selectedType === "vlan" ? "VLANs" : selectedType === "vxlan" ? "VXLAN Interfaces" : selectedType === "tunnel" ? "Tunnel Interfaces" : selectedType === "l2tpv3" ? "L2TPv3 Interfaces" : selectedType === "dummy" ? "Dummy Interfaces" : selectedType === "geneve" ? "GENEVE Interfaces" : selectedType === "input" ? "Input Interfaces" : selectedType === "loopback" ? "Loopback Interface" : selectedType === "macsec" ? "MACsec Interfaces" : selectedType === "bonding" ? "Bonding Interfaces" : selectedType === "bridge" ? "Bridge Interfaces" : "WireGuard Interfaces"}
                </h1>
                <p className="text-sm text-muted-foreground mt-2">
                  {selectedType === "ethernet"
                    ? "Physical and virtual ethernet interface configurations"
                    : selectedType === "vlan"
                      ? "802.1Q VLAN, QinQ Service (VIF-S), and QinQ Customer (VIF-C) sub-interfaces"
                      : selectedType === "vxlan"
                        ? "VXLAN tunnel interfaces for overlay networking"
                        : selectedType === "tunnel"
                          ? "GRE, IPIP, SIT, ERSPAN and other tunnel interfaces"
                          : selectedType === "l2tpv3"
                            ? "Layer 2 Tunnel Protocol Version 3 tunnel interfaces"
                            : selectedType === "dummy"
                              ? "Software-only dummy interfaces for testing and routing"
                            : selectedType === "geneve"
                              ? "GENEVE tunnel interfaces for network virtualization encapsulation"
                              : selectedType === "input"
                              ? "Input Functional Block (IFB) interfaces for traffic redirection and shaping"
                              : selectedType === "loopback"
                              ? "Loopback interface for local address assignment and routing"
                              : selectedType === "macsec"
                              ? "IEEE 802.1AE MACsec interfaces for layer-2 encryption"
                              : selectedType === "bonding"
                              ? "Link aggregation (bonding) interfaces for high availability and throughput"
                              : selectedType === "bridge"
                                ? "Bridge interfaces for layer-2 network bridging"
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
                  } else if (selectedType === "tunnel") {
                    setIsCreateTunnelModalOpen(true);
                  } else if (selectedType === "dummy") {
                    setIsCreateDummyModalOpen(true);
                  } else if (selectedType === "geneve") {
                    setIsCreateGeneveModalOpen(true);
                  } else if (selectedType === "input") {
                    setIsCreateInputModalOpen(true);
                  } else if (selectedType === "l2tpv3") {
                    setIsCreateL2tpv3ModalOpen(true);
                  } else if (selectedType === "loopback") {
                    const existingLo = loopbackInterfaces.find((i) => i.name === "lo");
                    if (existingLo) {
                      setEditingLoopback(existingLo);
                    } else {
                      setIsCreateLoopbackModalOpen(true);
                    }
                  } else if (selectedType === "macsec") {
                    setIsCreateMacsecModalOpen(true);
                  } else if (selectedType === "bonding") {
                    setIsCreateBondingModalOpen(true);
                  } else if (selectedType === "bridge") {
                    setIsCreateBridgeModalOpen(true);
                  } else {
                    setIsCreateInterfaceModalOpen(true);
                  }
                }}
                disabled={selectedType === "vxlan" ? !canWrite(FeatureGroup.VXLAN) : selectedType === "tunnel" ? !canWrite(FeatureGroup.TUNNEL) && !canWrite(FeatureGroup.INTERFACES) : !canWrite(FeatureGroup.INTERFACES)}
              >
                <Plus className="h-4 w-4" />
                {selectedType === "ethernet"
                  ? "Create Interface"
                  : selectedType === "vlan"
                    ? `Create ${vlanSubTabLabel[vlanSubTab]}`
                    : selectedType === "vxlan"
                      ? "Create VXLAN"
                      : selectedType === "tunnel"
                        ? "Create Tunnel"
                        : selectedType === "dummy"
                          ? "Create Dummy"
                          : selectedType === "geneve"
                            ? "Create GENEVE"
                            : selectedType === "input"
                            ? "Create Input"
                            : selectedType === "l2tpv3"
                            ? "Create L2TPv3"
                            : selectedType === "loopback"
                            ? "Configure Loopback"
                            : selectedType === "macsec"
                            ? "Create MACsec"
                            : selectedType === "bonding"
                            ? "Create Bond"
                            : selectedType === "bridge"
                              ? "Create Bridge"
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
                        : selectedType === "tunnel"
                          ? "Search by name, description, address, encapsulation, or remote..."
                          : selectedType === "dummy"
                            ? "Search by name, description, address, or VRF..."
                            : selectedType === "geneve"
                              ? "Search by name, description, address, remote, or VNI..."
                              : selectedType === "input"
                              ? "Search by name, description, or redirect..."
                              : selectedType === "l2tpv3"
                              ? "Search by name, description, remote, or address..."
                              : selectedType === "loopback"
                              ? "Search by name, description, or address..."
                              : selectedType === "bonding"
                              ? "Search by name, description, address, mode, or member..."
                              : selectedType === "bridge"
                                ? "Search by name, description, address, or member..."
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
                                {iface.disable ? (
                                  <Badge variant="outline" className="bg-red-500/10 text-red-500 border-red-500/20 text-xs">Disabled</Badge>
                                ) : (
                                  <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20 text-xs">Enabled</Badge>
                                )}
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
                              {vx.disabled ? (
                                <Badge variant="outline" className="bg-red-500/10 text-red-500 border-red-500/20 text-xs">Disabled</Badge>
                              ) : (
                                <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20 text-xs">Enabled</Badge>
                              )}
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
            ) : selectedType === "tunnel" ? (
              /* Tunnel Table */
              filteredTunnel.length === 0 ? (
                <Card className="border-border">
                  <CardContent className="py-12">
                    <div className="flex flex-col items-center gap-2">
                      <Waypoints className="h-12 w-12 text-muted-foreground/30" />
                      <p className="text-muted-foreground">
                        {searchQuery ? "No tunnel interfaces matching your search" : "No tunnel interfaces configured"}
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
                          <TableHead>Encapsulation</TableHead>
                          <TableHead>Description</TableHead>
                          <TableHead>Addresses</TableHead>
                          <TableHead>Source</TableHead>
                          <TableHead>Remote</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="w-[80px]"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredTunnel.map((tun) => (
                          <TableRow key={tun.name} className="group">
                            <TableCell><code className="font-semibold font-mono text-foreground">{tun.name}</code></TableCell>
                            <TableCell>
                              {tun.encapsulation ? (
                                <Badge variant="outline" className="bg-blue-500/10 text-blue-500 border-blue-500/20 text-xs">
                                  {tun.encapsulation}
                                </Badge>
                              ) : <span className="text-muted-foreground">—</span>}
                            </TableCell>
                            <TableCell className="text-muted-foreground max-w-[180px] truncate">{tun.description || "—"}</TableCell>
                            <TableCell>
                              {tun.addresses?.length ? (
                                <div className="flex flex-wrap gap-1">
                                  {tun.addresses.slice(0, 2).map((addr, idx) => <code key={idx} className="text-xs font-mono px-1.5 py-0.5 rounded bg-accent text-foreground">{addr}</code>)}
                                  {tun.addresses.length > 2 && <Badge variant="secondary" className="text-xs px-1.5 py-0">+{tun.addresses.length - 2}</Badge>}
                                </div>
                              ) : <span className="text-muted-foreground">—</span>}
                            </TableCell>
                            <TableCell className="text-sm">{tun.source_address || tun.source_interface || "—"}</TableCell>
                            <TableCell className="text-sm">{tun.remote || "—"}</TableCell>
                            <TableCell>
                              {tun.disabled ? (
                                <Badge variant="outline" className="bg-red-500/10 text-red-500 border-red-500/20 text-xs">Disabled</Badge>
                              ) : (
                                <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20 text-xs">Enabled</Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                {(canWrite(FeatureGroup.TUNNEL) || canWrite(FeatureGroup.INTERFACES)) && (
                                  <>
                                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditingTunnel(tun)}>
                                      <Pencil className="h-3.5 w-3.5" />
                                    </Button>
                                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setDeletingTunnel(tun)}>
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
                    Showing {filteredTunnel.length} of {totalTunnel} interface{totalTunnel !== 1 ? "s" : ""}
                  </p>
                </>
              )
            ) : selectedType === "dummy" ? (
              /* Dummy Table */
              filteredDummy.length === 0 ? (
                <Card className="border-border">
                  <CardContent className="py-12">
                    <div className="flex flex-col items-center gap-2">
                      <Box className="h-12 w-12 text-muted-foreground/30" />
                      <p className="text-muted-foreground">
                        {searchQuery ? "No dummy interfaces matching your search" : "No dummy interfaces configured"}
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
                          <TableHead>MTU</TableHead>
                          <TableHead>VRF</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="w-[80px]"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredDummy.map((dum) => (
                          <TableRow key={dum.name} className="group">
                            <TableCell><code className="font-semibold font-mono text-foreground">{dum.name}</code></TableCell>
                            <TableCell className="text-muted-foreground max-w-[180px] truncate">{dum.description || "—"}</TableCell>
                            <TableCell>
                              {dum.addresses?.length ? (
                                <div className="flex flex-wrap gap-1">
                                  {dum.addresses.slice(0, 2).map((addr, idx) => <code key={idx} className="text-xs font-mono px-1.5 py-0.5 rounded bg-accent text-foreground">{addr}</code>)}
                                  {dum.addresses.length > 2 && <Badge variant="secondary" className="text-xs px-1.5 py-0">+{dum.addresses.length - 2}</Badge>}
                                </div>
                              ) : <span className="text-muted-foreground">—</span>}
                            </TableCell>
                            <TableCell className="text-sm">{dum.mtu || "—"}</TableCell>
                            <TableCell>
                              {dum.vrf ? (
                                <Badge variant="outline" className="bg-purple-500/10 text-purple-500 border-purple-500/20 text-xs">
                                  {dum.vrf}
                                </Badge>
                              ) : <span className="text-muted-foreground">—</span>}
                            </TableCell>
                            <TableCell>
                              {dum.disable ? (
                                <Badge variant="outline" className="bg-red-500/10 text-red-500 border-red-500/20 text-xs">Disabled</Badge>
                              ) : (
                                <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20 text-xs">Enabled</Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                {canWrite(FeatureGroup.INTERFACES) && (
                                  <>
                                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditingDummy(dum)}>
                                      <Pencil className="h-3.5 w-3.5" />
                                    </Button>
                                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setDeletingDummy(dum)}>
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
                    Showing {filteredDummy.length} of {totalDummy} interface{totalDummy !== 1 ? "s" : ""}
                  </p>
                </>
              )
            ) : selectedType === "geneve" ? (
              /* GENEVE Table */
              filteredGeneve.length === 0 ? (
                <Card className="border-border">
                  <CardContent className="py-12">
                    <div className="flex flex-col items-center gap-2">
                      <Layers className="h-12 w-12 text-muted-foreground/30" />
                      <p className="text-muted-foreground">
                        {searchQuery ? "No GENEVE interfaces matching your search" : "No GENEVE interfaces configured"}
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
                          <TableHead>Remote</TableHead>
                          <TableHead>VNI</TableHead>
                          <TableHead>Description</TableHead>
                          <TableHead>Addresses</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="w-[80px]"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredGeneve.map((gnv) => (
                          <TableRow key={gnv.name} className="group">
                            <TableCell><code className="font-semibold font-mono text-foreground">{gnv.name}</code></TableCell>
                            <TableCell className="text-sm">{gnv.remote || "—"}</TableCell>
                            <TableCell className="font-mono text-sm">{gnv.vni || "—"}</TableCell>
                            <TableCell className="text-muted-foreground max-w-[180px] truncate">{gnv.description || "—"}</TableCell>
                            <TableCell>
                              {gnv.addresses?.length ? (
                                <div className="flex flex-wrap gap-1">
                                  {gnv.addresses.slice(0, 2).map((addr, idx) => <code key={idx} className="text-xs font-mono px-1.5 py-0.5 rounded bg-accent text-foreground">{addr}</code>)}
                                  {gnv.addresses.length > 2 && <Badge variant="secondary" className="text-xs px-1.5 py-0">+{gnv.addresses.length - 2}</Badge>}
                                </div>
                              ) : <span className="text-muted-foreground">—</span>}
                            </TableCell>
                            <TableCell>
                              {gnv.disable ? (
                                <Badge variant="outline" className="bg-red-500/10 text-red-500 border-red-500/20 text-xs">Disabled</Badge>
                              ) : (
                                <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20 text-xs">Enabled</Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                {canWrite(FeatureGroup.INTERFACES) && (
                                  <>
                                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditingGeneve(gnv)}>
                                      <Pencil className="h-3.5 w-3.5" />
                                    </Button>
                                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setDeletingGeneve(gnv)}>
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
                    Showing {filteredGeneve.length} of {totalGeneve} interface{totalGeneve !== 1 ? "s" : ""}
                  </p>
                </>
              )
            ) : selectedType === "l2tpv3" ? (
              /* L2TPv3 Table */
              filteredL2tpv3.length === 0 ? (
                <Card className="border-border">
                  <CardContent className="py-12">
                    <div className="flex flex-col items-center gap-2">
                      <Cable className="h-12 w-12 text-muted-foreground/30" />
                      <p className="text-muted-foreground">
                        {searchQuery ? "No L2TPv3 interfaces matching your search" : "No L2TPv3 interfaces configured"}
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
                          <TableHead>Remote</TableHead>
                          <TableHead>Tunnel ID</TableHead>
                          <TableHead>Session ID</TableHead>
                          <TableHead>Encapsulation</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="w-[80px]"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredL2tpv3.map((iface) => (
                          <TableRow key={iface.name} className="group">
                            <TableCell><code className="font-semibold font-mono text-foreground">{iface.name}</code></TableCell>
                            <TableCell className="text-muted-foreground">{iface.remote || "—"}</TableCell>
                            <TableCell className="text-muted-foreground">{iface.tunnel_id || "—"}</TableCell>
                            <TableCell className="text-muted-foreground">{iface.session_id || "—"}</TableCell>
                            <TableCell>
                              {iface.encapsulation ? (
                                <code className="text-xs font-mono px-1.5 py-0.5 rounded bg-accent text-foreground">{iface.encapsulation}</code>
                              ) : <span className="text-muted-foreground">udp</span>}
                            </TableCell>
                            <TableCell>
                              {iface.disable ? (
                                <Badge variant="outline" className="bg-red-500/10 text-red-500 border-red-500/20 text-xs">Disabled</Badge>
                              ) : (
                                <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20 text-xs">Enabled</Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                {canWrite(FeatureGroup.INTERFACES) && (
                                  <>
                                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditingL2tpv3(iface)}>
                                      <Pencil className="h-3.5 w-3.5" />
                                    </Button>
                                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setDeletingL2tpv3(iface)}>
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
                    Showing {filteredL2tpv3.length} of {totalL2tpv3} interface{totalL2tpv3 !== 1 ? "s" : ""}
                  </p>
                </>
              )
            ) : selectedType === "input" ? (
              /* Input Table */
              filteredInput.length === 0 ? (
                <Card className="border-border">
                  <CardContent className="py-12">
                    <div className="flex flex-col items-center gap-2">
                      <ArrowDownToLine className="h-12 w-12 text-muted-foreground/30" />
                      <p className="text-muted-foreground">
                        {searchQuery ? "No input interfaces matching your search" : "No input interfaces configured"}
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
                          <TableHead>Redirect</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="w-[80px]"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredInput.map((ifb) => (
                          <TableRow key={ifb.name} className="group">
                            <TableCell><code className="font-semibold font-mono text-foreground">{ifb.name}</code></TableCell>
                            <TableCell className="text-muted-foreground max-w-[200px] truncate">{ifb.description || "—"}</TableCell>
                            <TableCell>
                              {ifb.redirect ? (
                                <code className="text-xs font-mono px-1.5 py-0.5 rounded bg-accent text-foreground">{ifb.redirect}</code>
                              ) : <span className="text-muted-foreground">—</span>}
                            </TableCell>
                            <TableCell>
                              {ifb.disable ? (
                                <Badge variant="outline" className="bg-red-500/10 text-red-500 border-red-500/20 text-xs">Disabled</Badge>
                              ) : (
                                <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20 text-xs">Enabled</Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                {canWrite(FeatureGroup.INTERFACES) && (
                                  <>
                                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditingInput(ifb)}>
                                      <Pencil className="h-3.5 w-3.5" />
                                    </Button>
                                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setDeletingInput(ifb)}>
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
                    Showing {filteredInput.length} of {totalInput} interface{totalInput !== 1 ? "s" : ""}
                  </p>
                </>
              )
            ) : selectedType === "loopback" ? (
              /* Loopback Table */
              filteredLoopback.length === 0 ? (
                <Card className="border-border">
                  <CardContent className="py-12">
                    <div className="flex flex-col items-center gap-2">
                      <Repeat className="h-12 w-12 text-muted-foreground/30" />
                      <p className="text-muted-foreground">
                        {searchQuery ? "No loopback interfaces matching your search" : "No loopback interface configured"}
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
                          <TableHead>Source Validation</TableHead>
                          <TableHead className="w-[80px]"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredLoopback.map((lo) => (
                          <TableRow key={lo.name} className="group">
                            <TableCell><code className="font-semibold font-mono text-foreground">{lo.name}</code></TableCell>
                            <TableCell className="text-muted-foreground max-w-[180px] truncate">{lo.description || "\u2014"}</TableCell>
                            <TableCell>
                              {lo.addresses?.length ? (
                                <div className="flex flex-wrap gap-1">
                                  {lo.addresses.slice(0, 2).map((addr, idx) => <code key={idx} className="text-xs font-mono px-1.5 py-0.5 rounded bg-accent text-foreground">{addr}</code>)}
                                  {lo.addresses.length > 2 && <Badge variant="secondary" className="text-xs px-1.5 py-0">+{lo.addresses.length - 2}</Badge>}
                                </div>
                              ) : <span className="text-muted-foreground">{"\u2014"}</span>}
                            </TableCell>
                            <TableCell>
                              {lo.ip_source_validation ? (
                                <Badge variant="outline" className="text-xs">{lo.ip_source_validation}</Badge>
                              ) : <span className="text-muted-foreground">{"\u2014"}</span>}
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                {canWrite(FeatureGroup.INTERFACES) && (
                                  <>
                                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditingLoopback(lo)}>
                                      <Pencil className="h-3.5 w-3.5" />
                                    </Button>
                                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setDeletingLoopback(lo)}>
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
                    Showing {filteredLoopback.length} of {totalLoopback} interface{totalLoopback !== 1 ? "s" : ""}
                  </p>
                </>
              )
            ) : selectedType === "macsec" ? (
              /* MACsec Table */
              filteredMacsec.length === 0 ? (
                <Card className="border-border">
                  <CardContent className="py-12">
                    <div className="flex flex-col items-center gap-2">
                      <Lock className="h-12 w-12 text-muted-foreground/30" />
                      <p className="text-muted-foreground">
                        {searchQuery ? "No MACsec interfaces matching your search" : "No MACsec interfaces configured"}
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
                          <TableHead>Source</TableHead>
                          <TableHead>Cipher</TableHead>
                          <TableHead>Addresses</TableHead>
                          <TableHead>Security Mode</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="w-[80px]"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredMacsec.map((iface) => {
                          const securityMode = iface.security?.mka?.cak ? "MKA" : iface.security?.static?.key ? "Static" : null;
                          return (
                            <TableRow key={iface.name} className="group">
                              <TableCell><code className="font-semibold font-mono text-foreground">{iface.name}</code></TableCell>
                              <TableCell>
                                {iface.source_interface ? (
                                  <code className="text-xs font-mono px-1.5 py-0.5 rounded bg-accent text-foreground">{iface.source_interface}</code>
                                ) : <span className="text-muted-foreground">—</span>}
                              </TableCell>
                              <TableCell>
                                {iface.security?.cipher ? (
                                  <Badge variant="outline" className="bg-blue-500/10 text-blue-500 border-blue-500/20 text-xs">
                                    {iface.security.cipher}
                                  </Badge>
                                ) : <span className="text-muted-foreground">—</span>}
                              </TableCell>
                              <TableCell>
                                {iface.addresses?.length ? (
                                  <div className="flex flex-wrap gap-1">
                                    {iface.addresses.slice(0, 2).map((addr, idx) => <code key={idx} className="text-xs font-mono px-1.5 py-0.5 rounded bg-accent text-foreground">{addr}</code>)}
                                    {iface.addresses.length > 2 && <Badge variant="secondary" className="text-xs px-1.5 py-0">+{iface.addresses.length - 2}</Badge>}
                                  </div>
                                ) : <span className="text-muted-foreground">—</span>}
                              </TableCell>
                              <TableCell>
                                {securityMode ? (
                                  <Badge variant="outline" className={securityMode === "MKA" ? "bg-purple-500/10 text-purple-500 border-purple-500/20 text-xs" : "bg-orange-500/10 text-orange-500 border-orange-500/20 text-xs"}>
                                    {securityMode}
                                  </Badge>
                                ) : <span className="text-muted-foreground">—</span>}
                              </TableCell>
                              <TableCell>
                                {iface.disabled ? (
                                  <Badge variant="outline" className="bg-red-500/10 text-red-500 border-red-500/20 text-xs">Disabled</Badge>
                                ) : (
                                  <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20 text-xs">Enabled</Badge>
                                )}
                              </TableCell>
                              <TableCell>
                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                  {canWrite(FeatureGroup.INTERFACES) && (
                                    <>
                                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditingMacsec(iface)}>
                                        <Pencil className="h-3.5 w-3.5" />
                                      </Button>
                                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setDeletingMacsec(iface)}>
                                        <Trash2 className="h-3.5 w-3.5" />
                                      </Button>
                                    </>
                                  )}
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                  <p className="text-sm text-muted-foreground text-center mt-3">
                    Showing {filteredMacsec.length} of {totalMacsec} interface{totalMacsec !== 1 ? "s" : ""}
                  </p>
                </>
              )
            ) : selectedType === "bonding" ? (
              /* Bonding Table */
              filteredBonding.length === 0 ? (
                <Card className="border-border">
                  <CardContent className="py-12">
                    <div className="flex flex-col items-center gap-2">
                      <Link2 className="h-12 w-12 text-muted-foreground/30" />
                      <p className="text-muted-foreground">
                        {searchQuery ? "No bonding interfaces matching your search" : "No bonding interfaces configured"}
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
                          <TableHead>Mode</TableHead>
                          <TableHead>Description</TableHead>
                          <TableHead>Addresses</TableHead>
                          <TableHead>Members</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="w-[80px]"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredBonding.map((bond) => (
                          <TableRow key={bond.name} className="group">
                            <TableCell><code className="font-semibold font-mono text-foreground">{bond.name}</code></TableCell>
                            <TableCell>
                              {bond.mode ? (
                                <Badge variant="outline" className="bg-orange-500/10 text-orange-500 border-orange-500/20 text-xs">
                                  {bond.mode}
                                </Badge>
                              ) : <span className="text-muted-foreground">—</span>}
                            </TableCell>
                            <TableCell className="text-muted-foreground max-w-[180px] truncate">{bond.description || "—"}</TableCell>
                            <TableCell>
                              {bond.addresses?.length ? (
                                <div className="flex flex-wrap gap-1">
                                  {bond.addresses.slice(0, 2).map((addr, idx) => <code key={idx} className="text-xs font-mono px-1.5 py-0.5 rounded bg-accent text-foreground">{addr}</code>)}
                                  {bond.addresses.length > 2 && <Badge variant="secondary" className="text-xs px-1.5 py-0">+{bond.addresses.length - 2}</Badge>}
                                </div>
                              ) : <span className="text-muted-foreground">—</span>}
                            </TableCell>
                            <TableCell>
                              {bond.members?.length ? (
                                <div className="flex flex-wrap gap-1">
                                  {bond.members.slice(0, 3).map((m, idx) => <code key={idx} className="text-xs font-mono px-1.5 py-0.5 rounded bg-accent text-foreground">{m}</code>)}
                                  {bond.members.length > 3 && <Badge variant="secondary" className="text-xs px-1.5 py-0">+{bond.members.length - 3}</Badge>}
                                </div>
                              ) : <span className="text-muted-foreground">—</span>}
                            </TableCell>
                            <TableCell>
                              {bond.disable ? (
                                <Badge variant="outline" className="bg-red-500/10 text-red-500 border-red-500/20 text-xs">Disabled</Badge>
                              ) : (
                                <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20 text-xs">Enabled</Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                {canWrite(FeatureGroup.INTERFACES) && (
                                  <>
                                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditingBonding(bond)}>
                                      <Pencil className="h-3.5 w-3.5" />
                                    </Button>
                                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setDeletingBonding(bond)}>
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
                    Showing {filteredBonding.length} of {totalBonding} interface{totalBonding !== 1 ? "s" : ""}
                  </p>
                </>
              )
            ) : selectedType === "bridge" ? (
              /* Bridge Table */
              filteredBridge.length === 0 ? (
                <Card className="border-border">
                  <CardContent className="py-12">
                    <div className="flex flex-col items-center gap-2">
                      <GitMerge className="h-12 w-12 text-muted-foreground/30" />
                      <p className="text-muted-foreground">
                        {searchQuery ? "No bridge interfaces matching your search" : "No bridge interfaces configured"}
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
                          <TableHead>STP</TableHead>
                          <TableHead>Description</TableHead>
                          <TableHead>Addresses</TableHead>
                          <TableHead>Members</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="w-[80px]"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredBridge.map((br) => (
                          <TableRow key={br.name} className="group">
                            <TableCell><code className="font-semibold font-mono text-foreground">{br.name}</code></TableCell>
                            <TableCell>
                              <Badge variant="outline" className={cn("text-xs", br.stp ? "bg-green-500/10 text-green-500 border-green-500/20" : "bg-muted text-muted-foreground")}>
                                {br.stp ? "Enabled" : "Disabled"}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-muted-foreground max-w-[180px] truncate">{br.description || "\u2014"}</TableCell>
                            <TableCell>
                              {br.addresses?.length ? (
                                <div className="flex flex-wrap gap-1">
                                  {br.addresses.slice(0, 2).map((addr, idx) => <code key={idx} className="text-xs font-mono px-1.5 py-0.5 rounded bg-accent text-foreground">{addr}</code>)}
                                  {br.addresses.length > 2 && <Badge variant="secondary" className="text-xs px-1.5 py-0">+{br.addresses.length - 2}</Badge>}
                                </div>
                              ) : <span className="text-muted-foreground">{"\u2014"}</span>}
                            </TableCell>
                            <TableCell>
                              {br.members?.length ? (
                                <div className="flex flex-wrap gap-1">
                                  {br.members.slice(0, 3).map((m, idx) => <code key={idx} className="text-xs font-mono px-1.5 py-0.5 rounded bg-accent text-foreground">{m.name}</code>)}
                                  {br.members.length > 3 && <Badge variant="secondary" className="text-xs px-1.5 py-0">+{br.members.length - 3}</Badge>}
                                </div>
                              ) : <span className="text-muted-foreground">{"\u2014"}</span>}
                            </TableCell>
                            <TableCell>
                              {br.disable ? (
                                <Badge variant="outline" className="bg-red-500/10 text-red-500 border-red-500/20 text-xs">Disabled</Badge>
                              ) : (
                                <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20 text-xs">Enabled</Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                {canWrite(FeatureGroup.INTERFACES) && (
                                  <>
                                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditingBridge(br)}>
                                      <Pencil className="h-3.5 w-3.5" />
                                    </Button>
                                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setDeletingBridge(br)}>
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
                    Showing {filteredBridge.length} of {totalBridge} interface{totalBridge !== 1 ? "s" : ""}
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
                            {wg.disabled ? (
                              <Badge variant="outline" className="bg-red-500/10 text-red-500 border-red-500/20 text-xs">Disabled</Badge>
                            ) : (
                              <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20 text-xs">Enabled</Badge>
                            )}
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
      {/* Tunnel Modals */}
      <CreateTunnelModal
        open={isCreateTunnelModalOpen}
        onOpenChange={setIsCreateTunnelModalOpen}
        onSuccess={loadData}
        capabilities={tunnelCapabilities}
        existingInterfaces={tunnelInterfaces.map((i) => i.name)}
      />
      <EditTunnelModal
        open={!!editingTunnel}
        onOpenChange={(open) => !open && setEditingTunnel(null)}
        onSuccess={() => {
          setEditingTunnel(null);
          loadData();
        }}
        capabilities={tunnelCapabilities}
        interfaceData={editingTunnel}
      />
      <DeleteTunnelModal
        open={!!deletingTunnel}
        onOpenChange={(open) => !open && setDeletingTunnel(null)}
        onSuccess={() => {
          setDeletingTunnel(null);
          loadData();
        }}
        interfaceData={deletingTunnel}
      />
      {/* Dummy Modals */}
      <CreateDummyModal
        open={isCreateDummyModalOpen}
        onOpenChange={setIsCreateDummyModalOpen}
        onSuccess={loadData}
        capabilities={dummyCapabilities}
        existingInterfaces={dummyInterfaces.map((i) => i.name)}
      />
      <EditDummyModal
        open={!!editingDummy}
        onOpenChange={(open) => !open && setEditingDummy(null)}
        onSuccess={() => {
          setEditingDummy(null);
          loadData();
        }}
        capabilities={dummyCapabilities}
        interfaceData={editingDummy}
      />
      <DeleteDummyModal
        open={!!deletingDummy}
        onOpenChange={(open) => !open && setDeletingDummy(null)}
        onSuccess={() => {
          setDeletingDummy(null);
          loadData();
        }}
        interfaceData={deletingDummy}
      />
      {/* GENEVE Modals */}
      <CreateGeneveModal
        open={isCreateGeneveModalOpen}
        onOpenChange={setIsCreateGeneveModalOpen}
        onSuccess={loadData}
        capabilities={geneveCapabilities}
        existingInterfaces={geneveInterfaces.map((i) => i.name)}
      />
      <EditGeneveModal
        open={!!editingGeneve}
        onOpenChange={(open) => !open && setEditingGeneve(null)}
        onSuccess={() => {
          setEditingGeneve(null);
          loadData();
        }}
        capabilities={geneveCapabilities}
        interfaceData={editingGeneve}
      />
      <DeleteGeneveModal
        open={!!deletingGeneve}
        onOpenChange={(open) => !open && setDeletingGeneve(null)}
        onSuccess={() => {
          setDeletingGeneve(null);
          loadData();
        }}
        interfaceData={deletingGeneve}
      />
      {/* Input Modals */}
      <CreateInputModal
        open={isCreateInputModalOpen}
        onOpenChange={setIsCreateInputModalOpen}
        onSuccess={loadData}
        capabilities={inputCapabilities}
        existingInterfaces={inputInterfaces.map((i) => i.name)}
      />
      <EditInputModal
        open={!!editingInput}
        onOpenChange={(open) => !open && setEditingInput(null)}
        onSuccess={() => {
          setEditingInput(null);
          loadData();
        }}
        capabilities={inputCapabilities}
        interfaceData={editingInput}
      />
      <DeleteInputModal
        open={!!deletingInput}
        onOpenChange={(open) => !open && setDeletingInput(null)}
        onSuccess={() => {
          setDeletingInput(null);
          loadData();
        }}
        interfaceData={deletingInput}
      />
      {/* L2TPv3 Modals */}
      <CreateL2TPv3Modal
        open={isCreateL2tpv3ModalOpen}
        onOpenChange={setIsCreateL2tpv3ModalOpen}
        onSuccess={loadData}
        capabilities={l2tpv3Capabilities}
        existingInterfaces={l2tpv3Interfaces.map((i) => i.name)}
      />
      <EditL2TPv3Modal
        open={!!editingL2tpv3}
        onOpenChange={(open) => !open && setEditingL2tpv3(null)}
        onSuccess={() => {
          setEditingL2tpv3(null);
          loadData();
        }}
        capabilities={l2tpv3Capabilities}
        interfaceData={editingL2tpv3}
      />
      <DeleteL2TPv3Modal
        open={!!deletingL2tpv3}
        onOpenChange={(open) => !open && setDeletingL2tpv3(null)}
        onSuccess={() => {
          setDeletingL2tpv3(null);
          loadData();
        }}
        interfaceData={deletingL2tpv3}
      />
      {/* Loopback Modals */}
      <CreateLoopbackModal
        open={isCreateLoopbackModalOpen}
        onOpenChange={setIsCreateLoopbackModalOpen}
        onSuccess={loadData}
        capabilities={loopbackCapabilities}
      />
      <EditLoopbackModal
        open={!!editingLoopback}
        onOpenChange={(open) => !open && setEditingLoopback(null)}
        onSuccess={() => {
          setEditingLoopback(null);
          loadData();
        }}
        capabilities={loopbackCapabilities}
        interfaceData={editingLoopback}
      />
      <DeleteLoopbackModal
        open={!!deletingLoopback}
        onOpenChange={(open) => !open && setDeletingLoopback(null)}
        onSuccess={() => {
          setDeletingLoopback(null);
          loadData();
        }}
        interfaceData={deletingLoopback}
      />
      {/* MACsec Modals */}
      <CreateMacsecModal
        open={isCreateMacsecModalOpen}
        onOpenChange={setIsCreateMacsecModalOpen}
        onSuccess={loadData}
        capabilities={macsecCapabilities}
        existingInterfaces={macsecInterfaces.map((i) => i.name)}
      />
      <EditMacsecModal
        open={!!editingMacsec}
        onOpenChange={(open) => !open && setEditingMacsec(null)}
        onSuccess={() => {
          setEditingMacsec(null);
          loadData();
        }}
        capabilities={macsecCapabilities}
        interfaceData={editingMacsec}
      />
      <DeleteMacsecModal
        open={!!deletingMacsec}
        onOpenChange={(open) => !open && setDeletingMacsec(null)}
        onSuccess={() => {
          setDeletingMacsec(null);
          loadData();
        }}
        interfaceData={deletingMacsec}
      />
      {/* Bonding Modals */}
      <CreateBondingModal
        open={isCreateBondingModalOpen}
        onOpenChange={setIsCreateBondingModalOpen}
        onSuccess={loadData}
        capabilities={bondingCapabilities}
        existingInterfaces={bondingInterfaces.map((i) => i.name)}
      />
      <EditBondingModal
        open={!!editingBonding}
        onOpenChange={(open) => !open && setEditingBonding(null)}
        onSuccess={() => {
          setEditingBonding(null);
          loadData();
        }}
        capabilities={bondingCapabilities}
        interfaceData={editingBonding}
      />
      <DeleteBondingModal
        open={!!deletingBonding}
        onOpenChange={(open) => !open && setDeletingBonding(null)}
        onSuccess={() => {
          setDeletingBonding(null);
          loadData();
        }}
        interfaceData={deletingBonding}
      />
      {/* Bridge Modals */}
      <CreateBridgeModal
        open={isCreateBridgeModalOpen}
        onOpenChange={setIsCreateBridgeModalOpen}
        onSuccess={loadData}
        capabilities={bridgeCapabilities}
        existingInterfaces={bridgeInterfaces.map((i) => i.name)}
      />
      <EditBridgeModal
        open={!!editingBridge}
        onOpenChange={(open) => !open && setEditingBridge(null)}
        onSuccess={() => {
          setEditingBridge(null);
          loadData();
        }}
        capabilities={bridgeCapabilities}
        interfaceData={editingBridge}
      />
      <DeleteBridgeModal
        open={!!deletingBridge}
        onOpenChange={(open) => !open && setDeletingBridge(null)}
        onSuccess={() => {
          setDeletingBridge(null);
          loadData();
        }}
        interfaceData={deletingBridge}
      />
    </AppLayout>
  );
}
