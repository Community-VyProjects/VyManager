"use client";

export const dynamic = 'force-dynamic';

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
import { Plus, RefreshCw, AlertCircle, Search, Cable, Pencil, Trash2, Network, ChevronRight, ChevronDown, Shield, Boxes, Waypoints, Link2, GitMerge, Box, Layers, ArrowDownToLine, Repeat, Lock, ArrowLeftRight, Wifi, Signal } from "lucide-react";
import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
import { ethernetService } from "@/lib/api/ethernet";
import type { EthernetInterface, EthernetCapabilities, TransceiverStatus, VIFConfig, VIFSConfig } from "@/lib/api/types/ethernet";
import { wireguardService, type WireGuardInterface } from "@/lib/api/wireguard";
import { vxlanService, type VxlanInterface, type VxlanCapabilities } from "@/lib/api/vxlan";
import { tunnelService, type TunnelInterface, type TunnelCapabilities } from "@/lib/api/tunnel";
import { TunnelModal } from "@/components/tunnel/TunnelModal";
import { DeleteTunnelModal } from "@/components/tunnel/DeleteTunnelModal";
import { bondingService, bondingVlanService, bondingVlanCapabilities, bondVifToVlanShape, type BondingInterface, type BondingCapabilities } from "@/lib/api/bonding";
import { BondingModal } from "@/components/bonding/BondingModal";
import { DeleteBondingModal } from "@/components/bonding/DeleteBondingModal";
import { dummyService, type DummyInterface, type DummyCapabilities } from "@/lib/api/dummy";
import { DummyModal } from "@/components/dummy/DummyModal";
import { DeleteDummyModal } from "@/components/dummy/DeleteDummyModal";
import { geneveService, type GeneveInterface, type GeneveCapabilities } from "@/lib/api/geneve";
import { GeneveModal } from "@/components/geneve/GeneveModal";
import { DeleteGeneveModal } from "@/components/geneve/DeleteGeneveModal";
import { inputService, type InputInterface, type InputCapabilities } from "@/lib/api/input";
import { InputModal } from "@/components/input/InputModal";
import { DeleteInputModal } from "@/components/input/DeleteInputModal";
import { l2tpv3Service, type L2TPv3Interface, type L2TPv3Capabilities } from "@/lib/api/l2tpv3";
import { L2TPv3Modal } from "@/components/l2tpv3/L2TPv3Modal";
import { DeleteL2TPv3Modal } from "@/components/l2tpv3/DeleteL2TPv3Modal";
import { loopbackService, type LoopbackInterface, type LoopbackCapabilities } from "@/lib/api/loopback";
import { LoopbackModal } from "@/components/loopback/LoopbackModal";
import { DeleteLoopbackModal } from "@/components/loopback/DeleteLoopbackModal";
import { macsecService, type MacsecInterface, type MacsecCapabilities } from "@/lib/api/macsec";
import { MacsecModal } from "@/components/macsec/MacsecModal";
import { DeleteMacsecModal } from "@/components/macsec/DeleteMacsecModal";
import { bridgeService, type BridgeInterface, type BridgeCapabilities, type BridgeVifConfig } from "@/lib/api/bridge";
import { BridgeModal } from "@/components/bridge/BridgeModal";
import { DeleteBridgeModal } from "@/components/bridge/DeleteBridgeModal";
import { BridgeVifModal } from "@/components/bridge/BridgeVifModal";
import { DeleteBridgeVifModal } from "@/components/bridge/DeleteBridgeVifModal";
import { pppoeService, type PppoeInterface, type PppoeCapabilities } from "@/lib/api/pppoe";
import { PppoeModal } from "@/components/pppoe/PppoeModal";
import { DeletePppoeModal } from "@/components/pppoe/DeletePppoeModal";
import { pseudoEthernetService, type PseudoEthernetInterface, type PseudoEthernetCapabilities } from "@/lib/api/pseudo-ethernet";
import { CreatePseudoEthernetModal } from "@/components/pseudo-ethernet/CreatePseudoEthernetModal";
import { EditPseudoEthernetModal } from "@/components/pseudo-ethernet/EditPseudoEthernetModal";
import { DeletePseudoEthernetModal } from "@/components/pseudo-ethernet/DeletePseudoEthernetModal";
import { sstpcService, type SstpcInterface, type SstpcCapabilities } from "@/lib/api/sstpc";
import { SstpcModal } from "@/components/sstpc/SstpcModal";
import { DeleteSstpcModal } from "@/components/sstpc/DeleteSstpcModal";
import { virtualEthernetService, type VirtualEthernetInterface, type VirtualEthernetCapabilities } from "@/lib/api/virtual-ethernet";
import { CreateVirtualEthernetModal } from "@/components/virtual-ethernet/CreateVirtualEthernetModal";
import { EditVirtualEthernetModal } from "@/components/virtual-ethernet/EditVirtualEthernetModal";
import { DeleteVirtualEthernetModal } from "@/components/virtual-ethernet/DeleteVirtualEthernetModal";
import { vppService, type VppCapabilities, type VppBondingConfig, type VppBridgeConfig, type VppGreConfig, type VppIpipConfig, type VppLoopbackConfig, type VppVxlanConfig, type VppXconnectConfig, type VppSubType, type VppAnyConfig, getVppSubType } from "@/lib/api/vpp";
import { VppModal } from "@/components/vpp/VppModal";
import { DeleteVppModal } from "@/components/vpp/DeleteVppModal";
import { vtiService, type VtiInterface, type VtiCapabilities } from "@/lib/api/vti";
import { VtiModal } from "@/components/vti/VtiModal";
import { DeleteVtiModal } from "@/components/vti/DeleteVtiModal";
import { wirelessService, type WirelessInterface, type WirelessCapabilitiesResponse } from "@/lib/api/wireless";
import { WirelessModal } from "@/components/wireless/WirelessModal";
import { DeleteWirelessModal } from "@/components/wireless/DeleteWirelessModal";
import { wwanService, type WwanInterface, type WwanCapabilities } from "@/lib/api/wwan";
import { WwanModal } from "@/components/wwan/WwanModal";
import { DeleteWwanModal } from "@/components/wwan/DeleteWwanModal";
import { VxlanModal } from "@/components/vxlan/VxlanModal";
import { DeleteVxlanModal } from "@/components/vxlan/DeleteVxlanModal";
import { ComprehensiveEthernetModal } from "@/components/network/ComprehensiveEthernetModal";
import { ComprehensiveVLANModal } from "@/components/network/ComprehensiveVLANModal";
import { ComprehensiveVIFSModal } from "@/components/network/ComprehensiveVIFSModal";
import { ComprehensiveVIFCModal } from "@/components/network/ComprehensiveVIFCModal";
import { TransceiverDiagnosticsDialog } from "@/components/network/TransceiverDiagnosticsDialog";
import { DeleteEthernetModal } from "@/components/network/DeleteEthernetModal";
import { DeleteVLANModal } from "@/components/network/DeleteVLANModal";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { usePermissions } from "@/hooks/usePermissions";
import { FeatureGroup } from "@/lib/api/user-management";

type InterfaceType = "ethernet" | "vlan" | "wireguard" | "vxlan" | "tunnel" | "bonding" | "bridge" | "dummy" | "geneve" | "input" | "l2tpv3" | "loopback" | "macsec" | "pppoe" | "pseudo-ethernet" | "sstpc" | "virtual-ethernet" | "vpp" | "vti" | "wireless" | "wwan";
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

function InterfacesPageInner() {
  const searchParams = useSearchParams();
  const t = useTranslations("interfaces");
  const tc = useTranslations("common");
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
  const [vlanParent, setVlanParent] = useState<"ethernet" | "bonding">("ethernet");

  useEffect(() => {
    const requestedType = searchParams.get("type") as InterfaceType | null;
    const requestedVlanSubTab = searchParams.get("vlanSubTab") as VlanSubTab | null;

    const validTypes: InterfaceType[] = [
      "ethernet",
      "vlan",
      "wireguard",
      "vxlan",
      "tunnel",
      "bonding",
      "bridge",
      "dummy",
      "geneve",
      "input",
      "l2tpv3",
      "loopback",
      "macsec",
      "pppoe",
      "pseudo-ethernet",
      "sstpc",
      "virtual-ethernet",
      "vpp",
      "vti",
      "wireless",
      "wwan",
    ];

    if (requestedType && validTypes.includes(requestedType)) {
      setSelectedType(requestedType);
    }

    if (requestedType === "vlan" && requestedVlanSubTab && ["vif", "vif-s", "vif-c"].includes(requestedVlanSubTab)) {
      setVlanSubTab(requestedVlanSubTab);
    }
  }, [searchParams]);

  // Ethernet Modal states
  const [isCreateInterfaceModalOpen, setIsCreateInterfaceModalOpen] = useState(false);
  const [editingInterface, setEditingInterface] = useState<EthernetInterface | null>(null);
  const [deletingInterface, setDeletingInterface] = useState<EthernetInterface | null>(null);
  const [transceiverStatuses, setTransceiverStatuses] = useState<Record<string, TransceiverStatus | null>>({});
  const [diagnosticsInterface, setDiagnosticsInterface] = useState<string | null>(null);

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

  // PPPoE state
  const [pppoeInterfaces, setPppoeInterfaces] = useState<PppoeInterface[]>([]);
  const [pppoeCapabilities, setPppoeCapabilities] = useState<PppoeCapabilities | null>(null);

  // PPPoE Modal states
  const [isCreatePppoeModalOpen, setIsCreatePppoeModalOpen] = useState(false);
  const [editingPppoe, setEditingPppoe] = useState<PppoeInterface | null>(null);
  const [deletingPppoe, setDeletingPppoe] = useState<PppoeInterface | null>(null);

  // Pseudo-Ethernet state
  const [pseudoEthernetInterfaces, setPseudoEthernetInterfaces] = useState<PseudoEthernetInterface[]>([]);
  const [pseudoEthernetCapabilities, setPseudoEthernetCapabilities] = useState<PseudoEthernetCapabilities | null>(null);

  // Pseudo-Ethernet Modal states
  const [isCreatePseudoEthernetModalOpen, setIsCreatePseudoEthernetModalOpen] = useState(false);
  const [editingPseudoEthernet, setEditingPseudoEthernet] = useState<PseudoEthernetInterface | null>(null);
  const [deletingPseudoEthernet, setDeletingPseudoEthernet] = useState<PseudoEthernetInterface | null>(null);

  // SSTPC state
  const [sstpcInterfaces, setSstpcInterfaces] = useState<SstpcInterface[]>([]);
  const [sstpcCapabilities, setSstpcCapabilities] = useState<SstpcCapabilities | null>(null);

  // SSTPC Modal states
  const [isCreateSstpcModalOpen, setIsCreateSstpcModalOpen] = useState(false);
  const [editingSstpc, setEditingSstpc] = useState<SstpcInterface | null>(null);
  const [deletingSstpc, setDeletingSstpc] = useState<SstpcInterface | null>(null);

  // Virtual-Ethernet state
  const [virtualEthernetInterfaces, setVirtualEthernetInterfaces] = useState<VirtualEthernetInterface[]>([]);
  const [virtualEthernetCapabilities, setVirtualEthernetCapabilities] = useState<VirtualEthernetCapabilities | null>(null);

  // Virtual-Ethernet Modal states
  const [isCreateVirtualEthernetModalOpen, setIsCreateVirtualEthernetModalOpen] = useState(false);
  const [editingVirtualEthernet, setEditingVirtualEthernet] = useState<VirtualEthernetInterface | null>(null);
  const [deletingVirtualEthernet, setDeletingVirtualEthernet] = useState<VirtualEthernetInterface | null>(null);

  // VTI state
  const [vtiInterfaces, setVtiInterfaces] = useState<VtiInterface[]>([]);
  const [vtiCapabilities, setVtiCapabilities] = useState<VtiCapabilities | null>(null);

  // VTI Modal states
  const [isCreateVtiModalOpen, setIsCreateVtiModalOpen] = useState(false);
  const [editingVti, setEditingVti] = useState<VtiInterface | null>(null);
  const [deletingVti, setDeletingVti] = useState<VtiInterface | null>(null);

  // Wireless state
  const [wirelessInterfaces, setWirelessInterfaces] = useState<WirelessInterface[]>([]);
  const [wirelessCapabilities, setWirelessCapabilities] = useState<WirelessCapabilitiesResponse | null>(null);

  // Wireless Modal states
  const [isCreateWirelessModalOpen, setIsCreateWirelessModalOpen] = useState(false);
  const [editingWireless, setEditingWireless] = useState<WirelessInterface | null>(null);
  const [deletingWireless, setDeletingWireless] = useState<WirelessInterface | null>(null);

  // WWAN state
  const [wwanInterfaces, setWwanInterfaces] = useState<WwanInterface[]>([]);
  const [wwanCapabilities, setWwanCapabilities] = useState<WwanCapabilities | null>(null);

  // WWAN Modal states
  const [isCreateWwanModalOpen, setIsCreateWwanModalOpen] = useState(false);
  const [editingWwan, setEditingWwan] = useState<WwanInterface | null>(null);
  const [deletingWwan, setDeletingWwan] = useState<WwanInterface | null>(null);

  // VPP state
  const [vppBonding, setVppBonding] = useState<VppBondingConfig[]>([]);
  const [vppBridge, setVppBridge] = useState<VppBridgeConfig[]>([]);
  const [vppGre, setVppGre] = useState<VppGreConfig[]>([]);
  const [vppIpip, setVppIpip] = useState<VppIpipConfig[]>([]);
  const [vppLoopback, setVppLoopback] = useState<VppLoopbackConfig[]>([]);
  const [vppVxlanIfaces, setVppVxlanIfaces] = useState<VppVxlanConfig[]>([]);
  const [vppXconnect, setVppXconnect] = useState<VppXconnectConfig[]>([]);
  const [vppCapabilities, setVppCapabilities] = useState<VppCapabilities | null>(null);
  const [vppSubTab, setVppSubTab] = useState<VppSubType>("bonding");
  const [isCreateVppModalOpen, setIsCreateVppModalOpen] = useState(false);
  const [editingVpp, setEditingVpp] = useState<{ data: VppAnyConfig; subType: VppSubType } | null>(null);
  const [deletingVpp, setDeletingVpp] = useState<{ name: string; subType: VppSubType } | null>(null);

  // Bridge state
  const [bridgeInterfaces, setBridgeInterfaces] = useState<BridgeInterface[]>([]);
  const [bridgeCapabilities, setBridgeCapabilities] = useState<BridgeCapabilities | null>(null);

  // Bridge Modal states
  const [isCreateBridgeModalOpen, setIsCreateBridgeModalOpen] = useState(false);
  const [editingBridge, setEditingBridge] = useState<BridgeInterface | null>(null);
  const [deletingBridge, setDeletingBridge] = useState<BridgeInterface | null>(null);

  // Bridge VIF states
  const [expandedBridges, setExpandedBridges] = useState<Set<string>>(new Set());
  const [createVifForBridge, setCreateVifForBridge] = useState<string | null>(null);
  const [editingVif, setEditingVif] = useState<{ bridge: string; vif: BridgeVifConfig } | null>(null);
  const [deletingVif, setDeletingVif] = useState<{ bridge: string; vifId: string } | null>(null);

  const toggleBridgeExpand = (name: string) => {
    setExpandedBridges((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name); else next.add(name);
      return next;
    });
  };

  const { canWrite, canRead } = usePermissions();

  const canWriteVlanParentType =
    vlanParent === "bonding"
      ? canWrite(FeatureGroup.BONDING) || canWrite(FeatureGroup.INTERFACES)
      : canWrite(FeatureGroup.ETHERNET) || canWrite(FeatureGroup.INTERFACES);

  const canWriteSelectedType = () => {
    switch (selectedType) {
      case "vxlan":
        return canWrite(FeatureGroup.VXLAN);
      case "tunnel":
        return canWrite(FeatureGroup.TUNNEL) || canWrite(FeatureGroup.INTERFACES);
      case "pppoe":
        return canWrite(FeatureGroup.PPPOE) || canWrite(FeatureGroup.INTERFACES);
      case "sstpc":
        return canWrite(FeatureGroup.SSTPC) || canWrite(FeatureGroup.INTERFACES);
      case "bonding":
        return canWrite(FeatureGroup.BONDING) || canWrite(FeatureGroup.INTERFACES);
      case "bridge":
        return canWrite(FeatureGroup.BRIDGE) || canWrite(FeatureGroup.INTERFACES);
      case "dummy":
        return canWrite(FeatureGroup.DUMMY) || canWrite(FeatureGroup.INTERFACES);
      case "ethernet":
        return canWrite(FeatureGroup.ETHERNET) || canWrite(FeatureGroup.INTERFACES);
      case "geneve":
        return canWrite(FeatureGroup.GENEVE) || canWrite(FeatureGroup.INTERFACES);
      case "input":
        return canWrite(FeatureGroup.INPUT_IFACE) || canWrite(FeatureGroup.INTERFACES);
      case "loopback":
        return canWrite(FeatureGroup.LOOPBACK) || canWrite(FeatureGroup.INTERFACES);
      case "macsec":
        return canWrite(FeatureGroup.MACSEC) || canWrite(FeatureGroup.INTERFACES);
      case "vlan":
        return canWriteVlanParentType;
      default:
        return canWrite(FeatureGroup.INTERFACES);
    }
  };

  const loadData = async () => {
    try {
      setError(null);
      const [configData, capabilitiesData, wgData, vxlanData, vxlanCapData, tunnelData, tunnelCapData, dummyData, dummyCapData, geneveData, geneveCapData, inputData, inputCapData, l2tpv3Data, l2tpv3CapData, loopbackData, loopbackCapData, macsecData, macsecCapData, bondingData, bondingCapData, bridgeData, bridgeCapData, pppoeData, pppoeCapData, pseudoEthernetData, pseudoEthernetCapData, sstpcData, sstpcCapData, virtualEthernetData, virtualEthernetCapData, vppData, vppCapData, vtiData, vtiCapData, wirelessData, wirelessCapData, wwanData, wwanCapData] = await Promise.all([
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
        pppoeService.getConfig(),
        pppoeService.getCapabilities(),
        pseudoEthernetService.getConfig(),
        pseudoEthernetService.getCapabilities(),
        sstpcService.getConfig(),
        sstpcService.getCapabilities(),
        virtualEthernetService.getConfig(),
        virtualEthernetService.getCapabilities(),
        vppService.getConfig(),
        vppService.getCapabilities(),
        vtiService.getConfig(),
        vtiService.getCapabilities(),
        wirelessService.getConfig(),
        wirelessService.getCapabilities(),
        wwanService.getConfig(),
        wwanService.getCapabilities(),
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
      setPppoeInterfaces(pppoeData.interfaces);
      setPppoeCapabilities(pppoeCapData);
      setPseudoEthernetInterfaces(pseudoEthernetData.interfaces);
      setPseudoEthernetCapabilities(pseudoEthernetCapData);
      setSstpcInterfaces(sstpcData.interfaces);
      setSstpcCapabilities(sstpcCapData);
      setVirtualEthernetInterfaces(virtualEthernetData.interfaces);
      setVirtualEthernetCapabilities(virtualEthernetCapData);
      setVppCapabilities(vppCapData);
      if (vppCapData.supported) {
        setVppBonding(vppData.bonding);
        setVppBridge(vppData.bridge);
        setVppGre(vppData.gre);
        setVppIpip(vppData.ipip);
        setVppLoopback(vppData.loopback);
        setVppVxlanIfaces(vppData.vxlan);
        setVppXconnect(vppData.xconnect);
      }
      setVtiInterfaces(vtiData.interfaces);
      setVtiCapabilities(vtiCapData);
      setWirelessInterfaces(wirelessData.interfaces);
      setWirelessCapabilities(wirelessCapData);
      setWwanInterfaces(wwanData.interfaces);
      setWwanCapabilities(wwanCapData);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("page.loadFailed"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- load once on mount; a language switch re-renders via router.refresh()
  }, []);

  useEffect(() => {
    if (!interfaces.length) return;
    let cancelled = false;
    const refreshTransceivers = async () => {
      const entries = await Promise.all(interfaces.map(async (iface) => {
        try {
          return [iface.name, await ethernetService.getTransceiver(iface.name)] as const;
        } catch {
          return [iface.name, null] as const;
        }
      }));
      if (!cancelled) setTransceiverStatuses(Object.fromEntries(entries));
    };
    void refreshTransceivers();
    const timer = window.setInterval(refreshTransceivers, 15000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [interfaces]);

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

  const countNestedVlanInterfaces = <T extends {
    vif?: unknown[];
    vif_s?: Array<{ vif_c?: unknown[] }>;
    vifs?: unknown[];
  }>(items: T[]) => items.reduce(
    (total, iface) => total + 1 + (iface.vif?.length ?? 0) + (iface.vifs?.length ?? 0) +
      (iface.vif_s?.length ?? 0) + (iface.vif_s?.reduce((subTotal, vifS) => subTotal + (vifS.vif_c?.length ?? 0), 0) ?? 0),
    0
  );

  const totalInterfaces = interfaces.length;
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
  const totalBridge = countNestedVlanInterfaces(bridgeInterfaces);
  const totalPppoe = pppoeInterfaces.length;
  const totalPseudoEthernet = countNestedVlanInterfaces(pseudoEthernetInterfaces);
  const totalSstpc = sstpcInterfaces.length;
  const totalVirtualEthernet = countNestedVlanInterfaces(virtualEthernetInterfaces);
  const totalVpp = vppBonding.length + vppBridge.length + vppGre.length + vppIpip.length + vppLoopback.length + vppVxlanIfaces.length + vppXconnect.length;
  const totalVti = vtiInterfaces.length;
  const totalWireless = wirelessInterfaces.length;
  const totalWwan = wwanInterfaces.length;

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

  // Bond-parent VLANs (same shape as ethernet VLANs so the shared modals work)
  const bondVifs: VLANWithParent[] = bondingInterfaces.flatMap((iface) =>
    (iface.vifs || []).map((vif) => ({
      ...bondVifToVlanShape(vif),
      parentInterface: iface.name,
      fullName: `${iface.name}.${vif.vlan_id}`,
    } as unknown as VLANWithParent))
  );
  const bondVifS: VIFSWithParent[] = bondingInterfaces.flatMap((iface) =>
    (iface.vif_s || []).map((vifs) => ({
      ...bondVifToVlanShape(vifs),
      parentInterface: iface.name,
      fullName: `${iface.name}.${vifs.vlan_id}`,
    } as unknown as VIFSWithParent))
  );
  const bondVifC: VIFCWithParent[] = bondingInterfaces.flatMap((iface) =>
    (iface.vif_s || []).flatMap((vifs) =>
      (vifs.vif_c || []).map((vifc) => ({
        ...bondVifToVlanShape(vifc),
        parentInterface: iface.name,
        sVlanId: vifs.vlan_id,
        fullName: `${iface.name}.${vifs.vlan_id}.${vifc.vlan_id}`,
      } as unknown as VIFCWithParent))
    )
  );
  const totalEthernetVlans = allVifs.length + allVifS.length + allVifC.length;
  const totalBondingVlans = bondVifs.length + bondVifS.length + bondVifC.length;
  const totalVlans = totalEthernetVlans + totalBondingVlans;

  // Active VLAN lists + the modal wiring depend on the selected parent type tab
  const isBondVlan = vlanParent === "bonding";
  const activeVifs = isBondVlan ? bondVifs : allVifs;
  const activeVifS = isBondVlan ? bondVifS : allVifS;
  const activeVifC = isBondVlan ? bondVifC : allVifC;
  const vlanModalInterfaces = isBondVlan ? bondingInterfaces : interfaces;
  const vlanModalCapabilities = isBondVlan
    ? (bondingCapabilities ? bondingVlanCapabilities(bondingCapabilities.version) : null)
    : capabilities;
  const vlanModalService = isBondVlan ? bondingVlanService : undefined;

  const filteredVifs = filterVlan(activeVifs);
  const filteredVifS = filterVlan(activeVifS);
  const filteredVifC = filterVlan(activeVifC);

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
                  ? t("empty.vlan.noMatch", { label: vlanSubTabLabel[type] })
                  : t("empty.vlan.none", { label: vlanSubTabLabel[type] })}
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
                <TableHead>{tc("name")}</TableHead>
                <TableHead>VLAN ID</TableHead>
                <TableHead>{t("table.parent")}</TableHead>
                {type === "vif-c" && <TableHead>S-VLAN</TableHead>}
                <TableHead>{tc("description")}</TableHead>
                <TableHead>{t("table.addresses")}</TableHead>
                <TableHead>VRF</TableHead>
                <TableHead>{tc("status")}</TableHead>
                {extraColumns && <TableHead>{t("table.extra")}</TableHead>}
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
                      <Badge variant="outline" className="bg-red-500/10 text-red-500 border-red-500/20 text-xs">{tc("disabled")}</Badge>
                    ) : (
                      <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20 text-xs">{tc("enabled")}</Badge>
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
                        disabled={!canWriteVlanParentType}
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
                        disabled={!canWriteVlanParentType}
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
          {t("table.showingVlans", { count: items.length, label: vlanSubTabLabel[type] })}
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

  const filteredPppoe = pppoeInterfaces.filter((iface) => {
    if (searchQuery === "") return true;
    const q = searchQuery.toLowerCase();
    return (
      iface.name.toLowerCase().includes(q) ||
      (iface.description || "").toLowerCase().includes(q) ||
      (iface.source_interface || "").toLowerCase().includes(q) ||
      (iface.access_concentrator || "").toLowerCase().includes(q) ||
      (iface.authentication?.username || "").toLowerCase().includes(q)
    );
  });

  const filteredPseudoEthernet = pseudoEthernetInterfaces.filter((iface) => {
    if (searchQuery === "") return true;
    const q = searchQuery.toLowerCase();
    return (
      iface.name.toLowerCase().includes(q) ||
      (iface.description || "").toLowerCase().includes(q) ||
      (iface.source_interface || "").toLowerCase().includes(q) ||
      iface.addresses?.some((a) => a.toLowerCase().includes(q))
    );
  });

  const filteredSstpc = sstpcInterfaces.filter((iface) => {
    if (searchQuery === "") return true;
    const q = searchQuery.toLowerCase();
    return (
      iface.name.toLowerCase().includes(q) ||
      (iface.description || "").toLowerCase().includes(q) ||
      (iface.server || "").toLowerCase().includes(q) ||
      (iface.vrf || "").toLowerCase().includes(q) ||
      (iface.authentication?.username || "").toLowerCase().includes(q)
    );
  });

  const filteredVirtualEthernet = virtualEthernetInterfaces.filter((iface) => {
    if (searchQuery === "") return true;
    const q = searchQuery.toLowerCase();
    return (
      iface.name.toLowerCase().includes(q) ||
      (iface.description || "").toLowerCase().includes(q) ||
      (iface.peer_name || "").toLowerCase().includes(q) ||
      iface.addresses?.some((a) => a.toLowerCase().includes(q))
    );
  });

  const filteredVti = vtiInterfaces.filter((iface) => {
    if (searchQuery === "") return true;
    const q = searchQuery.toLowerCase();
    return (
      iface.name.toLowerCase().includes(q) ||
      (iface.description || "").toLowerCase().includes(q) ||
      iface.addresses?.some((addr) => addr.toLowerCase().includes(q)) ||
      (iface.vrf || "").toLowerCase().includes(q)
    );
  });

  const filteredWireless = wirelessInterfaces.filter((iface) => {
    if (searchQuery === "") return true;
    const q = searchQuery.toLowerCase();
    return (
      iface.name.toLowerCase().includes(q) ||
      (iface.description || "").toLowerCase().includes(q) ||
      (iface.ssid || "").toLowerCase().includes(q) ||
      iface.addresses?.some((addr) => addr.toLowerCase().includes(q)) ||
      (iface.vrf || "").toLowerCase().includes(q)
    );
  });

  const filteredWwan = wwanInterfaces.filter((iface) => {
    if (searchQuery === "") return true;
    const q = searchQuery.toLowerCase();
    return (
      iface.name.toLowerCase().includes(q) ||
      (iface.description || "").toLowerCase().includes(q) ||
      (iface.apn || "").toLowerCase().includes(q) ||
      iface.addresses?.some((addr) => addr.toLowerCase().includes(q)) ||
      (iface.vrf || "").toLowerCase().includes(q)
    );
  });

  const filterVppIface = <T extends { name: string; description: string | null }>(items: T[]): T[] => {
    if (searchQuery === "") return items;
    const q = searchQuery.toLowerCase();
    return items.filter((i) => i.name.toLowerCase().includes(q) || (i.description || "").toLowerCase().includes(q));
  };

  const vppSubTabData: Record<VppSubType, { items: VppAnyConfig[]; label: string }> = {
    bonding: { items: filterVppIface(vppBonding), label: t("types.bonding") },
    bridge: { items: filterVppIface(vppBridge), label: t("types.bridge") },
    gre: { items: filterVppIface(vppGre), label: "GRE" },
    ipip: { items: filterVppIface(vppIpip), label: "IPIP" },
    loopback: { items: filterVppIface(vppLoopback), label: t("types.loopback") },
    vxlan: { items: filterVppIface(vppVxlanIfaces), label: "VXLAN" },
    xconnect: { items: filterVppIface(vppXconnect), label: "XConnect" },
  };

  return (
    <AppLayout>
      <div className="flex h-full overflow-hidden">
        {/* Left Sidebar - Interface Type Selector */}
        <div className="w-80 border-r border-border bg-card flex flex-col h-full min-h-0">
          <div className="p-6 pb-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold text-foreground">{t("page.title")}</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  {t("page.total", { count: totalInterfaces + totalVlans + totalWireGuard + totalVxlan + totalTunnel + totalDummy + totalGeneve + totalInput + totalL2tpv3 + totalLoopback + totalMacsec + totalBonding + totalBridge + totalPppoe + totalPseudoEthernet + totalSstpc + totalVirtualEthernet + totalVpp + totalVti + totalWireless + totalWwan })}
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
                  <span>{t("page.failedToLoad")}</span>
                </div>
              </div>
            ) : (
              <div className="space-y-1 py-3">
                {/* Bonding */}
                {(canRead(FeatureGroup.BONDING) || canRead(FeatureGroup.INTERFACES)) && (
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
                        <span className="font-medium text-sm text-foreground">{t("types.bonding")}</span>
                        {selectedType === "bonding" && (
                          <ChevronRight className="h-4 w-4 text-primary flex-shrink-0" />
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {t("sidebar.interfaceCount", { count: totalBonding })}
                      </span>
                    </div>
                  </div>
                </button>
                )}

                {/* Bridge */}
                {(canRead(FeatureGroup.BRIDGE) || canRead(FeatureGroup.INTERFACES)) && (
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
                        <span className="font-medium text-sm text-foreground">{t("types.bridge")}</span>
                        {selectedType === "bridge" && (
                          <ChevronRight className="h-4 w-4 text-primary flex-shrink-0" />
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {t("sidebar.interfaceCount", { count: totalBridge })}
                      </span>
                    </div>
                  </div>
                </button>
                )}

                {/* Dummy */}
                {(canRead(FeatureGroup.DUMMY) || canRead(FeatureGroup.INTERFACES)) && (
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
                        <span className="font-medium text-sm text-foreground">{t("types.dummy")}</span>
                        {selectedType === "dummy" && (
                          <ChevronRight className="h-4 w-4 text-primary flex-shrink-0" />
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {t("sidebar.interfaceCount", { count: totalDummy })}
                      </span>
                    </div>
                  </div>
                </button>
                )}

                {/* Ethernet */}
                {(canRead(FeatureGroup.ETHERNET) || canRead(FeatureGroup.INTERFACES)) && (
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
                        <span className="font-medium text-sm text-foreground">{t("types.ethernet")}</span>
                        {selectedType === "ethernet" && (
                          <ChevronRight className="h-4 w-4 text-primary flex-shrink-0" />
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {t("sidebar.interfaceCount", { count: totalInterfaces })}
                      </span>
                    </div>
                  </div>
                </button>
                )}

                {/* GENEVE */}
                {(canRead(FeatureGroup.GENEVE) || canRead(FeatureGroup.INTERFACES)) && (
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
                        {t("sidebar.interfaceCount", { count: totalGeneve })}
                      </span>
                    </div>
                  </div>
                </button>
                )}

                {/* Input */}
                {(canRead(FeatureGroup.INPUT_IFACE) || canRead(FeatureGroup.INTERFACES)) && (
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
                        <span className="font-medium text-sm text-foreground">{t("types.input")}</span>
                        {selectedType === "input" && (
                          <ChevronRight className="h-4 w-4 text-primary flex-shrink-0" />
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {t("sidebar.interfaceCount", { count: totalInput })}
                      </span>
                    </div>
                  </div>
                </button>
                )}

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
                        {t("sidebar.interfaceCount", { count: totalL2tpv3 })}
                      </span>
                    </div>
                  </div>
                </button>

                {/* Loopback */}
                {(canRead(FeatureGroup.LOOPBACK) || canRead(FeatureGroup.INTERFACES)) && (
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
                        <span className="font-medium text-sm text-foreground">{t("types.loopback")}</span>
                        {selectedType === "loopback" && (
                          <ChevronRight className="h-4 w-4 text-primary flex-shrink-0" />
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {t("sidebar.interfaceCount", { count: totalLoopback })}
                      </span>
                    </div>
                  </div>
                </button>
                )}

                {/* MACsec */}
                {(canRead(FeatureGroup.MACSEC) || canRead(FeatureGroup.INTERFACES)) && (
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
                        {t("sidebar.interfaceCount", { count: totalMacsec })}
                      </span>
                    </div>
                  </div>
                </button>
                )}

                {/* PPPoE */}
                {(canRead(FeatureGroup.PPPOE) || canRead(FeatureGroup.INTERFACES)) && (
                  <button
                    onClick={() => setSelectedType("pppoe")}
                    className={cn(
                      "w-full text-left rounded-lg px-3 py-3 transition-all",
                      selectedType === "pppoe"
                        ? "bg-accent text-accent-foreground shadow-sm"
                        : "hover:bg-accent/50"
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <div className={cn(
                        "mt-0.5 rounded-md p-1.5",
                        selectedType === "pppoe" ? "bg-primary/10" : "bg-muted"
                      )}>
                        <Cable className={cn(
                          "h-4 w-4",
                          selectedType === "pppoe" ? "text-primary" : "text-muted-foreground"
                        )} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <span className="font-medium text-sm text-foreground">PPPoE</span>
                          {selectedType === "pppoe" && (
                            <ChevronRight className="h-4 w-4 text-primary flex-shrink-0" />
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {t("sidebar.interfaceCount", { count: totalPppoe })}
                        </span>
                      </div>
                    </div>
                  </button>
                )}

                {/* Pseudo-Ethernet */}
                {canRead(FeatureGroup.INTERFACES) && (
                  <button
                    onClick={() => setSelectedType("pseudo-ethernet")}
                    className={cn(
                      "w-full text-left rounded-lg px-3 py-3 transition-all",
                      selectedType === "pseudo-ethernet"
                        ? "bg-accent text-accent-foreground shadow-sm"
                        : "hover:bg-accent/50"
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <div className={cn(
                        "mt-0.5 rounded-md p-1.5",
                        selectedType === "pseudo-ethernet" ? "bg-primary/10" : "bg-muted"
                      )}>
                        <Layers className={cn(
                          "h-4 w-4",
                          selectedType === "pseudo-ethernet" ? "text-primary" : "text-muted-foreground"
                        )} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <span className="font-medium text-sm text-foreground">{t("types.pseudoEthernet")}</span>
                          {selectedType === "pseudo-ethernet" && (
                            <ChevronRight className="h-4 w-4 text-primary flex-shrink-0" />
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {t("sidebar.interfaceCount", { count: totalPseudoEthernet })}
                        </span>
                      </div>
                    </div>
                  </button>
                )}

                {/* SSTPC */}
                {(canRead(FeatureGroup.SSTPC) || canRead(FeatureGroup.INTERFACES)) && (
                  <button
                    onClick={() => setSelectedType("sstpc")}
                    className={cn(
                      "w-full text-left rounded-lg px-3 py-3 transition-all",
                      selectedType === "sstpc"
                        ? "bg-accent text-accent-foreground shadow-sm"
                        : "hover:bg-accent/50"
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <div className={cn(
                        "mt-0.5 rounded-md p-1.5",
                        selectedType === "sstpc" ? "bg-primary/10" : "bg-muted"
                      )}>
                        <Lock className={cn(
                          "h-4 w-4",
                          selectedType === "sstpc" ? "text-primary" : "text-muted-foreground"
                        )} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <span className="font-medium text-sm text-foreground">SSTPC</span>
                          {selectedType === "sstpc" && (
                            <ChevronRight className="h-4 w-4 text-primary flex-shrink-0" />
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {t("sidebar.interfaceCount", { count: totalSstpc })}
                        </span>
                      </div>
                    </div>
                  </button>
                )}

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
                        <span className="font-medium text-sm text-foreground">{t("types.tunnel")}</span>
                        {selectedType === "tunnel" && (
                          <ChevronRight className="h-4 w-4 text-primary flex-shrink-0" />
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {t("sidebar.interfaceCount", { count: totalTunnel })}
                      </span>
                    </div>
                  </div>
                </button>

                {/* Virtual Ethernet */}
                {canRead(FeatureGroup.INTERFACES) && (
                  <button
                    onClick={() => setSelectedType("virtual-ethernet")}
                    className={cn(
                      "w-full text-left rounded-lg px-3 py-3 transition-all",
                      selectedType === "virtual-ethernet"
                        ? "bg-accent text-accent-foreground shadow-sm"
                        : "hover:bg-accent/50"
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <div className={cn(
                        "mt-0.5 rounded-md p-1.5",
                        selectedType === "virtual-ethernet" ? "bg-primary/10" : "bg-muted"
                      )}>
                        <ArrowLeftRight className={cn(
                          "h-4 w-4",
                          selectedType === "virtual-ethernet" ? "text-primary" : "text-muted-foreground"
                        )} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <span className="font-medium text-sm text-foreground">{t("types.virtualEthernet")}</span>
                          {selectedType === "virtual-ethernet" && (
                            <ChevronRight className="h-4 w-4 text-primary flex-shrink-0" />
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {t("sidebar.interfaceCount", { count: totalVirtualEthernet })}
                        </span>
                      </div>
                    </div>
                  </button>
                )}

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
                        {t("sidebar.vlanCount", { count: totalVlans })}
                      </span>
                    </div>
                  </div>
                </button>

                {/* VPP — only shown when capabilities confirm VyOS 1.5+ support */}
                {canRead(FeatureGroup.INTERFACES) && vppCapabilities?.supported && (
                  <button
                    onClick={() => setSelectedType("vpp")}
                    className={cn(
                      "w-full text-left rounded-lg px-3 py-3 transition-all",
                      selectedType === "vpp"
                        ? "bg-accent text-accent-foreground shadow-sm"
                        : "hover:bg-accent/50"
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <div className={cn(
                        "mt-0.5 rounded-md p-1.5",
                        selectedType === "vpp" ? "bg-primary/10" : "bg-muted"
                      )}>
                        <Boxes className={cn(
                          "h-4 w-4",
                          selectedType === "vpp" ? "text-primary" : "text-muted-foreground"
                        )} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <span className="font-medium text-sm text-foreground">VPP</span>
                          {selectedType === "vpp" && (
                            <ChevronRight className="h-4 w-4 text-primary flex-shrink-0" />
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {t("sidebar.interfaceCount", { count: totalVpp })}
                        </span>
                      </div>
                    </div>
                  </button>
                )}

                {/* VTI */}
                <button
                  onClick={() => setSelectedType("vti")}
                  className={cn(
                    "w-full text-left rounded-lg px-3 py-3 transition-all",
                    selectedType === "vti"
                      ? "bg-accent text-accent-foreground shadow-sm"
                      : "hover:bg-accent/50"
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div className={cn(
                      "mt-0.5 rounded-md p-1.5",
                      selectedType === "vti" ? "bg-primary/10" : "bg-muted"
                    )}>
                      <Lock className={cn(
                        "h-4 w-4",
                        selectedType === "vti" ? "text-primary" : "text-muted-foreground"
                      )} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="font-medium text-sm text-foreground">VTI</span>
                        {selectedType === "vti" && (
                          <ChevronRight className="h-4 w-4 text-primary flex-shrink-0" />
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {t("sidebar.interfaceCount", { count: totalVti })}
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
                        {t("sidebar.tunnelCount", { count: totalVxlan })}
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
                        {t("sidebar.tunnelCount", { count: totalWireGuard })}
                      </span>
                    </div>
                  </div>
                </button>

                {/* Wireless */}
                <button
                  onClick={() => setSelectedType("wireless")}
                  className={cn(
                    "w-full text-left rounded-lg px-3 py-3 transition-all",
                    selectedType === "wireless"
                      ? "bg-accent text-accent-foreground shadow-sm"
                      : "hover:bg-accent/50"
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div className={cn(
                      "mt-0.5 rounded-md p-1.5",
                      selectedType === "wireless" ? "bg-primary/10" : "bg-muted"
                    )}>
                      <Wifi className={cn(
                        "h-4 w-4",
                        selectedType === "wireless" ? "text-primary" : "text-muted-foreground"
                      )} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="font-medium text-sm text-foreground">{t("types.wireless")}</span>
                        {selectedType === "wireless" && (
                          <ChevronRight className="h-4 w-4 text-primary flex-shrink-0" />
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {t("sidebar.interfaceCount", { count: totalWireless })}
                      </span>
                    </div>
                  </div>
                </button>

                {/* WWAN */}
                <button
                  onClick={() => setSelectedType("wwan")}
                  className={cn(
                    "w-full text-left rounded-lg px-3 py-3 transition-all",
                    selectedType === "wwan"
                      ? "bg-accent text-accent-foreground shadow-sm"
                      : "hover:bg-accent/50"
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div className={cn(
                      "mt-0.5 rounded-md p-1.5",
                      selectedType === "wwan" ? "bg-primary/10" : "bg-muted"
                    )}>
                      <Signal className={cn(
                        "h-4 w-4",
                        selectedType === "wwan" ? "text-primary" : "text-muted-foreground"
                      )} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="font-medium text-sm text-foreground">WWAN</span>
                        {selectedType === "wwan" && (
                          <ChevronRight className="h-4 w-4 text-primary flex-shrink-0" />
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {t("sidebar.interfaceCount", { count: totalWwan })}
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
                  {selectedType === "ethernet" ? t("titles.ethernet") : selectedType === "vlan" ? t("titles.vlan") : selectedType === "vxlan" ? t("titles.vxlan") : selectedType === "tunnel" ? t("titles.tunnel") : selectedType === "l2tpv3" ? t("titles.l2tpv3") : selectedType === "dummy" ? t("titles.dummy") : selectedType === "geneve" ? t("titles.geneve") : selectedType === "input" ? t("titles.input") : selectedType === "loopback" ? t("titles.loopback") : selectedType === "macsec" ? t("titles.macsec") : selectedType === "bonding" ? t("titles.bonding") : selectedType === "bridge" ? t("titles.bridge") : selectedType === "pppoe" ? t("titles.pppoe") : selectedType === "pseudo-ethernet" ? t("titles.pseudoEthernet") : selectedType === "sstpc" ? t("titles.sstpc") : selectedType === "virtual-ethernet" ? t("titles.virtualEthernet") : selectedType === "vpp" ? t("titles.vpp") : selectedType === "vti" ? t("titles.vti") : selectedType === "wireless" ? t("titles.wireless") : selectedType === "wwan" ? t("titles.wwan") : t("titles.wireguard")}
                </h1>
                <p className="text-sm text-muted-foreground mt-2">
                  {selectedType === "ethernet"
                    ? t("descriptions.ethernet")
                    : selectedType === "vlan"
                      ? t("descriptions.vlan")
                      : selectedType === "vxlan"
                        ? t("descriptions.vxlan")
                        : selectedType === "tunnel"
                          ? t("descriptions.tunnel")
                          : selectedType === "l2tpv3"
                            ? t("descriptions.l2tpv3")
                            : selectedType === "dummy"
                              ? t("descriptions.dummy")
                            : selectedType === "geneve"
                              ? t("descriptions.geneve")
                              : selectedType === "input"
                              ? t("descriptions.input")
                              : selectedType === "loopback"
                              ? t("descriptions.loopback")
                              : selectedType === "macsec"
                              ? t("descriptions.macsec")
                              : selectedType === "bonding"
                              ? t("descriptions.bonding")
                              : selectedType === "bridge"
                              ? t("descriptions.bridge")
                              : selectedType === "pppoe"
                                ? t("descriptions.pppoe")
                                : selectedType === "pseudo-ethernet"
                                  ? t("descriptions.pseudoEthernet")
                                  : selectedType === "sstpc"
                                    ? t("descriptions.sstpc")
                                    : selectedType === "virtual-ethernet"
                                      ? t("descriptions.virtualEthernet")
                                      : selectedType === "vpp"
                                        ? t("descriptions.vpp")
                                        : selectedType === "vti"
                                          ? t("descriptions.vti")
                                          : selectedType === "wireless"
                                            ? t("descriptions.wireless")
                                            : selectedType === "wwan"
                                              ? t("descriptions.wwan")
                                              : t("descriptions.wireguard")}
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
                  } else if (selectedType === "pppoe") {
                    setIsCreatePppoeModalOpen(true);
                  } else if (selectedType === "pseudo-ethernet") {
                    setIsCreatePseudoEthernetModalOpen(true);
                  } else if (selectedType === "sstpc") {
                    setIsCreateSstpcModalOpen(true);
                  } else if (selectedType === "virtual-ethernet") {
                    setIsCreateVirtualEthernetModalOpen(true);
                  } else if (selectedType === "vpp") {
                    setIsCreateVppModalOpen(true);
                  } else if (selectedType === "vti") {
                    setIsCreateVtiModalOpen(true);
                  } else if (selectedType === "wireless") {
                    setIsCreateWirelessModalOpen(true);
                  } else if (selectedType === "wwan") {
                    setIsCreateWwanModalOpen(true);
                  } else {
                    setIsCreateInterfaceModalOpen(true);
                  }
                }}
                disabled={!canWriteSelectedType()}
              >
                <Plus className="h-4 w-4" />
                {selectedType === "ethernet"
                  ? t("create.ethernet")
                  : selectedType === "vlan"
                    ? t("create.vlan", { label: vlanSubTabLabel[vlanSubTab] })
                    : selectedType === "vxlan"
                      ? t("create.vxlan")
                      : selectedType === "tunnel"
                        ? t("create.tunnel")
                        : selectedType === "dummy"
                          ? t("create.dummy")
                          : selectedType === "geneve"
                            ? t("create.geneve")
                            : selectedType === "input"
                            ? t("create.input")
                            : selectedType === "l2tpv3"
                            ? t("create.l2tpv3")
                            : selectedType === "loopback"
                            ? t("create.loopback")
                            : selectedType === "macsec"
                            ? t("create.macsec")
                            : selectedType === "bonding"
                            ? t("create.bonding")
                            : selectedType === "bridge"
                            ? t("create.bridge")
                            : selectedType === "pppoe"
                              ? t("create.pppoe")
                              : selectedType === "pseudo-ethernet"
                                ? t("create.pseudoEthernet")
                                : selectedType === "sstpc"
                                  ? t("create.sstpc")
                                  : selectedType === "virtual-ethernet"
                                    ? t("create.virtualEthernet")
                                    : selectedType === "vpp"
                                      ? t("create.vpp")
                                      : selectedType === "vti"
                                        ? t("create.vti")
                                        : selectedType === "wireless"
                                          ? t("create.wireless")
                                          : selectedType === "wwan"
                                            ? t("create.wwan")
                                            : t("create.wireguard")}
              </Button>
            </div>

            {/* VLAN parent-type tabs + sub-tabs */}
            {selectedType === "vlan" && (
              <div className="mb-4 space-y-3">
                <Tabs value={vlanParent} onValueChange={(v) => setVlanParent(v as "ethernet" | "bonding")}>
                  <TabsList>
                    <TabsTrigger value="ethernet" className="gap-1.5">
                      {t("types.ethernet")}
                      <Badge variant="secondary" className="text-xs px-1.5 py-0 ml-1">{totalEthernetVlans}</Badge>
                    </TabsTrigger>
                    <TabsTrigger value="bonding" className="gap-1.5">
                      {t("types.bonding")}
                      <Badge variant="secondary" className="text-xs px-1.5 py-0 ml-1">{totalBondingVlans}</Badge>
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
                <Tabs value={vlanSubTab} onValueChange={(v) => setVlanSubTab(v as VlanSubTab)}>
                  <TabsList>
                    <TabsTrigger value="vif" className="gap-1.5">
                      802.1Q VLAN
                      <Badge variant="secondary" className="text-xs px-1.5 py-0 ml-1">{activeVifs.length}</Badge>
                    </TabsTrigger>
                    <TabsTrigger value="vif-s" className="gap-1.5">
                      {t("vlan.tabVifS")}
                      <Badge variant="secondary" className="text-xs px-1.5 py-0 ml-1">{activeVifS.length}</Badge>
                    </TabsTrigger>
                    <TabsTrigger value="vif-c" className="gap-1.5">
                      {t("vlan.tabVifC")}
                      <Badge variant="secondary" className="text-xs px-1.5 py-0 ml-1">{activeVifC.length}</Badge>
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
                    ? t("search.ethernet")
                    : selectedType === "vlan"
                      ? t("search.vlan")
                      : selectedType === "vxlan"
                        ? t("search.vxlan")
                        : selectedType === "tunnel"
                          ? t("search.tunnel")
                          : selectedType === "dummy"
                            ? t("search.dummy")
                            : selectedType === "geneve"
                              ? t("search.geneve")
                              : selectedType === "input"
                              ? t("search.input")
                              : selectedType === "l2tpv3"
                              ? t("search.l2tpv3")
                              : selectedType === "loopback"
                              ? t("search.loopback")
                              : selectedType === "bonding"
                              ? t("search.bonding")
                              : selectedType === "bridge"
                              ? t("search.bridge")
                              : selectedType === "pppoe"
                                ? t("search.pppoe")
                                : selectedType === "pseudo-ethernet"
                                  ? t("search.pseudoEthernet")
                                  : selectedType === "virtual-ethernet"
                                    ? t("search.virtualEthernet")
                                    : t("search.default")
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
                <LoadingSpinner message={t("page.loading")} size="sm" />
              </div>
            ) : error ? (
              <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-destructive mt-0.5" />
                <div className="flex-1">
                  <h3 className="font-semibold text-destructive">{t("page.failedToLoadInterfaces")}</h3>
                  <p className="text-sm text-destructive/90 mt-1">{error}</p>
                  <Button variant="outline" size="sm" onClick={loadData} className="mt-3">
                    <RefreshCw className="h-3.5 w-3.5 mr-2" />
                    {t("page.tryAgain")}
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
                          ? t("empty.ethernet.noMatch")
                          : t("empty.ethernet.none")}
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
                          <TableHead>{tc("name")}</TableHead>
                          <TableHead>{tc("status")}</TableHead>
                          <TableHead>{tc("description")}</TableHead>
                          <TableHead>{t("table.addresses")}</TableHead>
                          <TableHead>VRF</TableHead>
                          <TableHead>{t("table.macHwId")}</TableHead>
                          <TableHead>{t("table.vlans")}</TableHead>
                          <TableHead>{t("table.optic")}</TableHead>
                          <TableHead className="w-[80px]"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredInterfaces.map((iface) => {
                          const vlanCount = (iface.vif?.length || 0) + (iface.vif_s?.length || 0) +
                            (iface.vif_s?.reduce((count, serviceVlan) => count + (serviceVlan.vif_c?.length || 0), 0) || 0);
                          return (
                            <TableRow key={iface.name}>
                              <TableCell>
                                <code className="font-semibold font-mono text-foreground">{iface.name}</code>
                              </TableCell>
                              <TableCell>
                                {iface.disable ? (
                                  <Badge variant="outline" className="bg-red-500/10 text-red-500 border-red-500/20 text-xs">{tc("disabled")}</Badge>
                                ) : (
                                  <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20 text-xs">{tc("enabled")}</Badge>
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
                                {(() => {
                                  const status = transceiverStatuses[iface.name];
                                  if (!status) return <span className="text-muted-foreground">-</span>;
                                  if (status.alarms.length) return <Badge variant="destructive" className="cursor-pointer" onClick={() => setDiagnosticsInterface(iface.name)} title={t("optic.alarmTitle")}>{t("optic.alarm")}</Badge>;
                                  if (status.warnings.length || !status.present) return <Badge variant="outline" className="cursor-pointer border-yellow-500/30 bg-yellow-500/10 text-yellow-700 dark:text-yellow-400" onClick={() => setDiagnosticsInterface(iface.name)} title={t("optic.warningTitle")}>{t("optic.warning")}</Badge>;
                                  return <Badge variant="outline" className="cursor-pointer border-green-500/30 bg-green-500/10 text-green-700 dark:text-green-400" onClick={() => setDiagnosticsInterface(iface.name)} title={t("optic.healthyTitle")}>{t("optic.healthy")}</Badge>;
                                })()}
                              </TableCell>
                              <TableCell>
                                <div className="flex gap-1 justify-end">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setDiagnosticsInterface(iface.name)}
                                    className="h-7 w-7 p-0"
                                    disabled={!canRead(FeatureGroup.ETHERNET) && !canRead(FeatureGroup.INTERFACES)}
                                    title={t("actions.viewDiagnostics")}
                                  >
                                    <Signal className="h-3.5 w-3.5" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setEditingInterface(iface)}
                                    className="h-7 w-7 p-0"
                                    disabled={!canWrite(FeatureGroup.ETHERNET) && !canWrite(FeatureGroup.INTERFACES)}
                                  >
                                    <Pencil className="h-3.5 w-3.5" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setDeletingInterface(iface)}
                                    className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                                    disabled={!canWrite(FeatureGroup.ETHERNET) && !canWrite(FeatureGroup.INTERFACES)}
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
                    {t("table.showingInterfaces", { shown: filteredInterfaces.length, total: totalInterfaces })}
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
                        {searchQuery ? t("empty.vxlan.noMatch") : t("empty.vxlan.none")}
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
                          <TableHead>{tc("name")}</TableHead>
                          <TableHead>VNI</TableHead>
                          <TableHead>{tc("description")}</TableHead>
                          <TableHead>{t("table.addresses")}</TableHead>
                          <TableHead>{t("table.source")}</TableHead>
                          <TableHead>{t("table.remotes")}</TableHead>
                          <TableHead>{tc("status")}</TableHead>
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
                                <Badge variant="outline" className="bg-red-500/10 text-red-500 border-red-500/20 text-xs">{tc("disabled")}</Badge>
                              ) : (
                                <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20 text-xs">{tc("enabled")}</Badge>
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
                    {t("table.showingTunnels", { shown: filteredVxlan.length, total: totalVxlan })}
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
                        {searchQuery ? t("empty.tunnel.noMatch") : t("empty.tunnel.none")}
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
                          <TableHead>{tc("name")}</TableHead>
                          <TableHead>{t("table.encapsulation")}</TableHead>
                          <TableHead>{tc("description")}</TableHead>
                          <TableHead>{t("table.addresses")}</TableHead>
                          <TableHead>{t("table.source")}</TableHead>
                          <TableHead>{t("table.remote")}</TableHead>
                          <TableHead>{tc("status")}</TableHead>
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
                                <Badge variant="outline" className="bg-red-500/10 text-red-500 border-red-500/20 text-xs">{tc("disabled")}</Badge>
                              ) : (
                                <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20 text-xs">{tc("enabled")}</Badge>
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
                    {t("table.showingInterfaces", { shown: filteredTunnel.length, total: totalTunnel })}
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
                        {searchQuery ? t("empty.dummy.noMatch") : t("empty.dummy.none")}
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
                          <TableHead>{tc("name")}</TableHead>
                          <TableHead>{tc("description")}</TableHead>
                          <TableHead>{t("table.addresses")}</TableHead>
                          <TableHead>MTU</TableHead>
                          <TableHead>VRF</TableHead>
                          <TableHead>{tc("status")}</TableHead>
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
                                <Badge variant="outline" className="bg-red-500/10 text-red-500 border-red-500/20 text-xs">{tc("disabled")}</Badge>
                              ) : (
                                <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20 text-xs">{tc("enabled")}</Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                {(canWrite(FeatureGroup.DUMMY) || canWrite(FeatureGroup.INTERFACES)) && (
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
                    {t("table.showingInterfaces", { shown: filteredDummy.length, total: totalDummy })}
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
                        {searchQuery ? t("empty.geneve.noMatch") : t("empty.geneve.none")}
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
                          <TableHead>{tc("name")}</TableHead>
                          <TableHead>{t("table.remote")}</TableHead>
                          <TableHead>VNI</TableHead>
                          <TableHead>{tc("description")}</TableHead>
                          <TableHead>{t("table.addresses")}</TableHead>
                          <TableHead>{tc("status")}</TableHead>
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
                                <Badge variant="outline" className="bg-red-500/10 text-red-500 border-red-500/20 text-xs">{tc("disabled")}</Badge>
                              ) : (
                                <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20 text-xs">{tc("enabled")}</Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                {(canWrite(FeatureGroup.GENEVE) || canWrite(FeatureGroup.INTERFACES)) && (
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
                    {t("table.showingInterfaces", { shown: filteredGeneve.length, total: totalGeneve })}
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
                        {searchQuery ? t("empty.l2tpv3.noMatch") : t("empty.l2tpv3.none")}
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
                          <TableHead>{tc("name")}</TableHead>
                          <TableHead>{t("table.remote")}</TableHead>
                          <TableHead>{t("table.tunnelId")}</TableHead>
                          <TableHead>{t("table.sessionId")}</TableHead>
                          <TableHead>{t("table.encapsulation")}</TableHead>
                          <TableHead>{tc("status")}</TableHead>
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
                                <Badge variant="outline" className="bg-red-500/10 text-red-500 border-red-500/20 text-xs">{tc("disabled")}</Badge>
                              ) : (
                                <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20 text-xs">{tc("enabled")}</Badge>
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
                    {t("table.showingInterfaces", { shown: filteredL2tpv3.length, total: totalL2tpv3 })}
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
                        {searchQuery ? t("empty.input.noMatch") : t("empty.input.none")}
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
                          <TableHead>{tc("name")}</TableHead>
                          <TableHead>{tc("description")}</TableHead>
                          <TableHead>{t("table.redirect")}</TableHead>
                          <TableHead>{tc("status")}</TableHead>
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
                                <Badge variant="outline" className="bg-red-500/10 text-red-500 border-red-500/20 text-xs">{tc("disabled")}</Badge>
                              ) : (
                                <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20 text-xs">{tc("enabled")}</Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                {(canWrite(FeatureGroup.INPUT_IFACE) || canWrite(FeatureGroup.INTERFACES)) && (
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
                    {t("table.showingInterfaces", { shown: filteredInput.length, total: totalInput })}
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
                        {searchQuery ? t("empty.loopback.noMatch") : t("empty.loopback.none")}
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
                          <TableHead>{tc("name")}</TableHead>
                          <TableHead>{tc("description")}</TableHead>
                          <TableHead>{t("table.addresses")}</TableHead>
                          <TableHead>{t("table.sourceValidation")}</TableHead>
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
                                {(canWrite(FeatureGroup.LOOPBACK) || canWrite(FeatureGroup.INTERFACES)) && (
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
                    {t("table.showingInterfaces", { shown: filteredLoopback.length, total: totalLoopback })}
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
                        {searchQuery ? t("empty.macsec.noMatch") : t("empty.macsec.none")}
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
                          <TableHead>{tc("name")}</TableHead>
                          <TableHead>{t("table.source")}</TableHead>
                          <TableHead>{t("table.cipher")}</TableHead>
                          <TableHead>{t("table.addresses")}</TableHead>
                          <TableHead>{t("table.securityMode")}</TableHead>
                          <TableHead>{tc("status")}</TableHead>
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
                                    {securityMode === "Static" ? t("macsec.static") : securityMode}
                                  </Badge>
                                ) : <span className="text-muted-foreground">—</span>}
                              </TableCell>
                              <TableCell>
                                {iface.disabled ? (
                                  <Badge variant="outline" className="bg-red-500/10 text-red-500 border-red-500/20 text-xs">{tc("disabled")}</Badge>
                                ) : (
                                  <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20 text-xs">{tc("enabled")}</Badge>
                                )}
                              </TableCell>
                              <TableCell>
                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                  {(canWrite(FeatureGroup.MACSEC) || canWrite(FeatureGroup.INTERFACES)) && (
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
                    {t("table.showingInterfaces", { shown: filteredMacsec.length, total: totalMacsec })}
                  </p>
                </>
              )
            ) : selectedType === "pppoe" ? (
              /* PPPoE Table */
              filteredPppoe.length === 0 ? (
                <Card className="border-border">
                  <CardContent className="py-12">
                    <div className="flex flex-col items-center gap-2">
                      <Cable className="h-12 w-12 text-muted-foreground/30" />
                      <p className="text-muted-foreground">
                        {searchQuery ? t("empty.pppoe.noMatch") : t("empty.pppoe.none")}
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
                          <TableHead>{tc("name")}</TableHead>
                          <TableHead>{t("table.source")}</TableHead>
                          <TableHead>{t("table.acService")}</TableHead>
                          <TableHead>{tc("description")}</TableHead>
                          <TableHead>{tc("status")}</TableHead>
                          <TableHead className="w-[80px]"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredPppoe.map((iface) => (
                          <TableRow key={iface.name} className="group">
                            <TableCell>
                              <code className="font-semibold font-mono text-foreground">{iface.name}</code>
                            </TableCell>
                            <TableCell>
                              {iface.source_interface ? (
                                <code className="text-xs font-mono px-1.5 py-0.5 rounded bg-accent text-foreground">{iface.source_interface}</code>
                              ) : (
                                <span className="text-muted-foreground">—</span>
                              )}
                            </TableCell>
                            <TableCell className="text-muted-foreground text-sm">
                              {iface.access_concentrator && (
                                <span>{iface.access_concentrator}</span>
                              )}
                              {iface.access_concentrator && iface.service_name && (
                                <span className="mx-1 text-muted-foreground/50">/</span>
                              )}
                              {iface.service_name && (
                                <span>{iface.service_name}</span>
                              )}
                              {!iface.access_concentrator && !iface.service_name && "—"}
                            </TableCell>
                            <TableCell className="text-muted-foreground max-w-[180px] truncate">
                              {iface.description || "—"}
                            </TableCell>
                            <TableCell>
                              {iface.disabled ? (
                                <Badge variant="outline" className="bg-red-500/10 text-red-500 border-red-500/20 text-xs">{tc("disabled")}</Badge>
                              ) : (
                                <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20 text-xs">{tc("enabled")}</Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                {(canWrite(FeatureGroup.PPPOE) || canWrite(FeatureGroup.INTERFACES)) && (
                                  <>
                                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditingPppoe(iface)}>
                                      <Pencil className="h-3.5 w-3.5" />
                                    </Button>
                                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setDeletingPppoe(iface)}>
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
                    {t("table.showingInterfaces", { shown: filteredPppoe.length, total: totalPppoe })}
                  </p>
                </>
              )
            ) : selectedType === "pseudo-ethernet" ? (
              /* Pseudo-Ethernet Table */
              filteredPseudoEthernet.length === 0 ? (
                <Card className="border-border">
                  <CardContent className="py-12">
                    <div className="flex flex-col items-center gap-2">
                      <Layers className="h-12 w-12 text-muted-foreground/30" />
                      <p className="text-muted-foreground">
                        {searchQuery ? t("empty.pseudoEthernet.noMatch") : t("empty.pseudoEthernet.none")}
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
                          <TableHead>{tc("name")}</TableHead>
                          <TableHead>{t("table.sourceInterface")}</TableHead>
                          <TableHead>{t("table.mode")}</TableHead>
                          <TableHead>{t("table.addresses")}</TableHead>
                          <TableHead>{tc("description")}</TableHead>
                          <TableHead>{tc("status")}</TableHead>
                          <TableHead className="w-[80px]"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredPseudoEthernet.map((iface) => (
                          <TableRow key={iface.name} className="group">
                            <TableCell>
                              <code className="font-semibold font-mono text-foreground">{iface.name}</code>
                            </TableCell>
                            <TableCell>
                              {iface.source_interface ? (
                                <code className="text-xs font-mono px-1.5 py-0.5 rounded bg-accent text-foreground">{iface.source_interface}</code>
                              ) : (
                                <span className="text-muted-foreground">—</span>
                              )}
                            </TableCell>
                            <TableCell>
                              {iface.mode ? (
                                <Badge variant="outline" className={
                                  iface.mode === "private" ? "bg-muted/50 text-muted-foreground border-muted-foreground/20 text-xs" :
                                  iface.mode === "vepa" ? "bg-blue-500/10 text-blue-500 border-blue-500/20 text-xs" :
                                  iface.mode === "bridge" ? "bg-green-500/10 text-green-500 border-green-500/20 text-xs" :
                                  "bg-orange-500/10 text-orange-500 border-orange-500/20 text-xs"
                                }>
                                  {iface.mode}
                                </Badge>
                              ) : (
                                <span className="text-muted-foreground">—</span>
                              )}
                            </TableCell>
                            <TableCell>
                              {iface.addresses?.length ? (
                                <div className="flex flex-wrap gap-1">
                                  {iface.addresses.slice(0, 2).map((addr, idx) => (
                                    <code key={idx} className="text-xs font-mono px-1.5 py-0.5 rounded bg-accent text-foreground">{addr}</code>
                                  ))}
                                  {iface.addresses.length > 2 && (
                                    <Badge variant="secondary" className="text-xs px-1.5 py-0">+{iface.addresses.length - 2}</Badge>
                                  )}
                                </div>
                              ) : (
                                <span className="text-muted-foreground">—</span>
                              )}
                            </TableCell>
                            <TableCell className="text-muted-foreground max-w-[180px] truncate">
                              {iface.description || "—"}
                            </TableCell>
                            <TableCell>
                              {iface.disabled ? (
                                <Badge variant="outline" className="bg-red-500/10 text-red-500 border-red-500/20 text-xs">{tc("disabled")}</Badge>
                              ) : (
                                <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20 text-xs">{tc("enabled")}</Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                {canWrite(FeatureGroup.INTERFACES) && (
                                  <>
                                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditingPseudoEthernet(iface)}>
                                      <Pencil className="h-3.5 w-3.5" />
                                    </Button>
                                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setDeletingPseudoEthernet(iface)}>
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
                    {t("table.showingInterfaces", { shown: filteredPseudoEthernet.length, total: totalPseudoEthernet })}
                  </p>
                </>
              )
            ) : selectedType === "sstpc" ? (
              /* SSTPC Table */
              filteredSstpc.length === 0 ? (
                <Card className="border-border">
                  <CardContent className="py-12">
                    <div className="flex flex-col items-center gap-2">
                      <Lock className="h-12 w-12 text-muted-foreground/30" />
                      <p className="text-muted-foreground">
                        {searchQuery ? t("empty.sstpc.noMatch") : t("empty.sstpc.none")}
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
                          <TableHead>{tc("name")}</TableHead>
                          <TableHead>{t("table.server")}</TableHead>
                          <TableHead>{t("table.port")}</TableHead>
                          <TableHead>{tc("description")}</TableHead>
                          <TableHead>{tc("status")}</TableHead>
                          <TableHead className="w-[80px]"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredSstpc.map((iface) => (
                          <TableRow key={iface.name} className="group">
                            <TableCell>
                              <code className="font-semibold font-mono text-foreground">{iface.name}</code>
                            </TableCell>
                            <TableCell>
                              {iface.server ? (
                                <code className="text-xs font-mono px-1.5 py-0.5 rounded bg-accent text-foreground">{iface.server}</code>
                              ) : (
                                <span className="text-muted-foreground">—</span>
                              )}
                            </TableCell>
                            <TableCell className="text-muted-foreground text-sm">
                              {iface.port || "443"}
                            </TableCell>
                            <TableCell className="text-muted-foreground max-w-[180px] truncate">
                              {iface.description || "—"}
                            </TableCell>
                            <TableCell>
                              {iface.disabled ? (
                                <Badge variant="outline" className="bg-red-500/10 text-red-500 border-red-500/20 text-xs">{tc("disabled")}</Badge>
                              ) : (
                                <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20 text-xs">{tc("enabled")}</Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                {(canWrite(FeatureGroup.SSTPC) || canWrite(FeatureGroup.INTERFACES)) && (
                                  <>
                                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditingSstpc(iface)}>
                                      <Pencil className="h-3.5 w-3.5" />
                                    </Button>
                                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setDeletingSstpc(iface)}>
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
                    {t("table.showingInterfaces", { shown: filteredSstpc.length, total: totalSstpc })}
                  </p>
                </>
              )
            ) : selectedType === "virtual-ethernet" ? (
              /* Virtual Ethernet Table */
              filteredVirtualEthernet.length === 0 ? (
                <Card className="border-border">
                  <CardContent className="py-12">
                    <div className="flex flex-col items-center gap-2">
                      <ArrowLeftRight className="h-12 w-12 text-muted-foreground/30" />
                      <p className="text-muted-foreground">
                        {searchQuery ? t("empty.virtualEthernet.noMatch") : t("empty.virtualEthernet.none")}
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
                          <TableHead>{tc("name")}</TableHead>
                          <TableHead>{t("table.peer")}</TableHead>
                          <TableHead>{t("table.addresses")}</TableHead>
                          <TableHead>{t("table.namespace")}</TableHead>
                          <TableHead>{t("table.subInterfaces")}</TableHead>
                          <TableHead>{tc("description")}</TableHead>
                          <TableHead>{tc("status")}</TableHead>
                          <TableHead className="w-[80px]"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredVirtualEthernet.map((iface) => {
                          const subIfaceCount = iface.vif.length + iface.vif_s.length;
                          return (
                            <TableRow key={iface.name} className="group">
                              <TableCell>
                                <code className="font-semibold font-mono text-foreground">{iface.name}</code>
                              </TableCell>
                              <TableCell>
                                {iface.peer_name ? (
                                  <code className="text-xs font-mono px-1.5 py-0.5 rounded bg-accent text-foreground">{iface.peer_name}</code>
                                ) : (
                                  <span className="text-muted-foreground">—</span>
                                )}
                              </TableCell>
                              <TableCell>
                                {iface.addresses?.length ? (
                                  <div className="flex flex-wrap gap-1">
                                    {iface.addresses.slice(0, 2).map((addr, idx) => (
                                      <code key={idx} className="text-xs font-mono px-1.5 py-0.5 rounded bg-accent text-foreground">{addr}</code>
                                    ))}
                                    {iface.addresses.length > 2 && (
                                      <Badge variant="secondary" className="text-xs px-1.5 py-0">+{iface.addresses.length - 2}</Badge>
                                    )}
                                  </div>
                                ) : (
                                  <span className="text-muted-foreground">—</span>
                                )}
                              </TableCell>
                              <TableCell>
                                {iface.netns ? (
                                  <code className="text-xs font-mono px-1.5 py-0.5 rounded bg-accent text-foreground">{iface.netns}</code>
                                ) : (
                                  <span className="text-muted-foreground">—</span>
                                )}
                              </TableCell>
                              <TableCell>
                                {subIfaceCount > 0 ? (
                                  <Badge variant="secondary" className="text-xs">{subIfaceCount}</Badge>
                                ) : (
                                  <span className="text-muted-foreground">—</span>
                                )}
                              </TableCell>
                              <TableCell className="text-muted-foreground max-w-[180px] truncate">
                                {iface.description || "—"}
                              </TableCell>
                              <TableCell>
                                {iface.disabled ? (
                                  <Badge variant="outline" className="bg-red-500/10 text-red-500 border-red-500/20 text-xs">{tc("disabled")}</Badge>
                                ) : (
                                  <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20 text-xs">{tc("enabled")}</Badge>
                                )}
                              </TableCell>
                              <TableCell>
                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                  {canWrite(FeatureGroup.INTERFACES) && (
                                    <>
                                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditingVirtualEthernet(iface)}>
                                        <Pencil className="h-3.5 w-3.5" />
                                      </Button>
                                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setDeletingVirtualEthernet(iface)}>
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
                    {t("table.showingInterfaces", { shown: filteredVirtualEthernet.length, total: totalVirtualEthernet })}
                  </p>
                </>
              )
            ) : selectedType === "vpp" ? (
              /* VPP Interfaces */
              <>
                {/* VPP sub-type tab bar */}
                <div className="mb-4">
                  <Tabs value={vppSubTab} onValueChange={(v) => setVppSubTab(v as VppSubType)}>
                    <TabsList>
                      {(["bonding", "bridge", "gre", "ipip", "loopback", "vxlan", "xconnect"] as VppSubType[]).map((st) => {
                        const counts: Record<VppSubType, number> = {
                          bonding: vppBonding.length, bridge: vppBridge.length, gre: vppGre.length,
                          ipip: vppIpip.length, loopback: vppLoopback.length, vxlan: vppVxlanIfaces.length, xconnect: vppXconnect.length,
                        };
                        const labels: Record<VppSubType, string> = {
                          bonding: t("types.bonding"), bridge: t("types.bridge"), gre: "GRE", ipip: "IPIP",
                          loopback: t("types.loopback"), vxlan: "VXLAN", xconnect: "XConnect",
                        };
                        return (
                          <TabsTrigger key={st} value={st} className="gap-1.5">
                            {labels[st]}
                            <Badge variant="secondary" className="text-xs px-1.5 py-0 ml-1">{counts[st]}</Badge>
                          </TabsTrigger>
                        );
                      })}
                    </TabsList>
                  </Tabs>
                </div>
                {(() => {
                  const { items } = vppSubTabData[vppSubTab];
                  if (items.length === 0) {
                    return (
                      <Card className="border-border">
                        <CardContent className="py-12">
                          <div className="flex flex-col items-center gap-2">
                            <Boxes className="h-12 w-12 text-muted-foreground/30" />
                            <p className="text-muted-foreground">
                              {searchQuery ? t("empty.vpp.noMatch", { label: vppSubTabData[vppSubTab].label }) : t("empty.vpp.none", { label: vppSubTabData[vppSubTab].label })}
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
                              <TableHead>{tc("name")}</TableHead>
                              {vppSubTab === "bonding" && <><TableHead>{t("table.mode")}</TableHead><TableHead>{t("table.hashPolicy")}</TableHead><TableHead>{tc("shown.mac")}</TableHead></>}
                              {vppSubTab === "bridge" && <TableHead>{t("table.members")}</TableHead>}
                              {(vppSubTab === "gre" || vppSubTab === "ipip" || vppSubTab === "vxlan") && <><TableHead>{t("table.remote")}</TableHead><TableHead>{t("table.source")}</TableHead></>}
                              {vppSubTab === "gre" && <><TableHead>{t("table.tunnelType")}</TableHead><TableHead>{t("table.key")}</TableHead></>}
                              {vppSubTab === "vxlan" && <TableHead>VNI</TableHead>}
                              {(vppSubTab === "bonding" || vppSubTab === "gre" || vppSubTab === "ipip" || vppSubTab === "loopback" || vppSubTab === "vxlan") && <TableHead>{t("table.addresses")}</TableHead>}
                              {vppSubTab === "xconnect" && <TableHead>{t("table.members")}</TableHead>}
                              {(vppSubTab === "bonding" || vppSubTab === "gre" || vppSubTab === "ipip" || vppSubTab === "loopback" || vppSubTab === "vxlan") && <TableHead>MTU</TableHead>}
                              <TableHead>{tc("description")}</TableHead>
                              {vppSubTab !== "bridge" && <TableHead>{tc("status")}</TableHead>}
                              <TableHead className="w-[80px]"></TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {items.map((iface) => {
                              const subType = getVppSubType(iface.name);
                              const hasDisabled = "disabled" in iface;
                              const isDisabled = hasDisabled && (iface as { disabled: boolean }).disabled;
                              const hasAddresses = "addresses" in iface;
                              const hasMtu = "mtu" in iface;
                              return (
                                <TableRow key={iface.name} className="group">
                                  <TableCell><code className="font-semibold font-mono text-foreground">{iface.name}</code></TableCell>
                                  {vppSubTab === "bonding" && (() => {
                                    const b = iface as VppBondingConfig;
                                    return (
                                      <>
                                        <TableCell>{b.mode ? <Badge variant="secondary" className="text-xs">{b.mode}</Badge> : <span className="text-muted-foreground">—</span>}</TableCell>
                                        <TableCell>{b.hash_policy ? <Badge variant="outline" className="text-xs">{b.hash_policy}</Badge> : <span className="text-muted-foreground">—</span>}</TableCell>
                                        <TableCell>{b.mac ? <code className="text-xs font-mono">{b.mac}</code> : <span className="text-muted-foreground">—</span>}</TableCell>
                                      </>
                                    );
                                  })()}
                                  {vppSubTab === "bridge" && (() => {
                                    const b = iface as VppBridgeConfig;
                                    const bviCount = b.members.filter((m) => m.bvi).length;
                                    return (
                                      <TableCell>
                                        {b.members.length > 0 ? (
                                          <span className="text-sm">{t("vpp.memberCount", { count: b.members.length })}{bviCount > 0 ? t("vpp.bviCount", { count: bviCount }) : ""}</span>
                                        ) : <span className="text-muted-foreground">—</span>}
                                      </TableCell>
                                    );
                                  })()}
                                  {(vppSubTab === "gre" || vppSubTab === "ipip" || vppSubTab === "vxlan") && (() => {
                                    const t = iface as VppGreConfig | VppIpipConfig | VppVxlanConfig;
                                    return (
                                      <>
                                        <TableCell>{t.remote ? <code className="text-xs font-mono">{t.remote}</code> : <span className="text-muted-foreground">—</span>}</TableCell>
                                        <TableCell>{t.source_address ? <code className="text-xs font-mono">{t.source_address}</code> : <span className="text-muted-foreground">—</span>}</TableCell>
                                      </>
                                    );
                                  })()}
                                  {vppSubTab === "gre" && (() => {
                                    const g = iface as VppGreConfig;
                                    return (
                                      <>
                                        <TableCell>{g.tunnel_type ? <Badge variant="outline" className="text-xs">{g.tunnel_type}</Badge> : <span className="text-muted-foreground">—</span>}</TableCell>
                                        <TableCell>{g.key ?? <span className="text-muted-foreground">—</span>}</TableCell>
                                      </>
                                    );
                                  })()}
                                  {vppSubTab === "vxlan" && (() => {
                                    const v = iface as VppVxlanConfig;
                                    return <TableCell>{v.vni ? <Badge variant="secondary" className="text-xs">{v.vni}</Badge> : <span className="text-muted-foreground">—</span>}</TableCell>;
                                  })()}
                                  {hasAddresses && vppSubTab !== "bridge" && vppSubTab !== "xconnect" && (() => {
                                    const addrs = (iface as { addresses: string[] }).addresses;
                                    return (
                                      <TableCell>
                                        {addrs.length > 0 ? (
                                          <div className="flex flex-wrap gap-1">
                                            {addrs.slice(0, 2).map((a, i) => (
                                              <code key={i} className="text-xs font-mono px-1.5 py-0.5 rounded bg-accent text-foreground">{a}</code>
                                            ))}
                                            {addrs.length > 2 && <Badge variant="secondary" className="text-xs px-1.5 py-0">+{addrs.length - 2}</Badge>}
                                          </div>
                                        ) : <span className="text-muted-foreground">—</span>}
                                      </TableCell>
                                    );
                                  })()}
                                  {vppSubTab === "xconnect" && (() => {
                                    const x = iface as VppXconnectConfig;
                                    return (
                                      <TableCell>
                                        {x.members.length > 0 ? (
                                          <div className="flex flex-wrap gap-1">
                                            {x.members.map((m) => <code key={m} className="text-xs font-mono px-1 py-0.5 rounded bg-accent">{m}</code>)}
                                          </div>
                                        ) : <span className="text-muted-foreground">—</span>}
                                      </TableCell>
                                    );
                                  })()}
                                  {hasMtu && vppSubTab !== "bridge" && (
                                    <TableCell className="text-sm text-muted-foreground">
                                      {(iface as { mtu: string | null }).mtu ?? "—"}
                                    </TableCell>
                                  )}
                                  <TableCell className="text-muted-foreground max-w-[160px] truncate">{iface.description || "—"}</TableCell>
                                  {vppSubTab !== "bridge" && (
                                    <TableCell>
                                      {isDisabled ? (
                                        <Badge variant="outline" className="bg-red-500/10 text-red-500 border-red-500/20 text-xs">{tc("disabled")}</Badge>
                                      ) : (
                                        <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20 text-xs">{tc("enabled")}</Badge>
                                      )}
                                    </TableCell>
                                  )}
                                  <TableCell>
                                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                      {canWrite(FeatureGroup.INTERFACES) && (
                                        <>
                                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditingVpp({ data: iface, subType })}>
                                            <Pencil className="h-3.5 w-3.5" />
                                          </Button>
                                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setDeletingVpp({ name: iface.name, subType })}>
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
                        {t("table.showingVpp", { shown: items.length, total: vppSubTabData[vppSubTab].items.length === items.length ? totalVpp : vppSubTabData[vppSubTab].items.length })}
                      </p>
                    </>
                  );
                })()}
              </>
            ) : selectedType === "bonding" ? (
              /* Bonding Table */
              filteredBonding.length === 0 ? (
                <Card className="border-border">
                  <CardContent className="py-12">
                    <div className="flex flex-col items-center gap-2">
                      <Link2 className="h-12 w-12 text-muted-foreground/30" />
                      <p className="text-muted-foreground">
                        {searchQuery ? t("empty.bonding.noMatch") : t("empty.bonding.none")}
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
                          <TableHead>{tc("name")}</TableHead>
                          <TableHead>{t("table.mode")}</TableHead>
                          <TableHead>{tc("description")}</TableHead>
                          <TableHead>{t("table.addresses")}</TableHead>
                          <TableHead>{t("table.members")}</TableHead>
                          <TableHead>{tc("status")}</TableHead>
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
                                <Badge variant="outline" className="bg-red-500/10 text-red-500 border-red-500/20 text-xs">{tc("disabled")}</Badge>
                              ) : (
                                <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20 text-xs">{tc("enabled")}</Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                {(canWrite(FeatureGroup.BONDING) || canWrite(FeatureGroup.INTERFACES)) && (
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
                    {t("table.showingInterfaces", { shown: filteredBonding.length, total: totalBonding })}
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
                        {searchQuery ? t("empty.bridge.noMatch") : t("empty.bridge.none")}
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
                          <TableHead className="w-8"></TableHead>
                          <TableHead>{tc("name")}</TableHead>
                          <TableHead>STP</TableHead>
                          <TableHead>{tc("description")}</TableHead>
                          <TableHead>{t("table.addresses")}</TableHead>
                          <TableHead>{t("table.members")}</TableHead>
                          <TableHead>{tc("status")}</TableHead>
                          <TableHead className="w-[80px]"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredBridge.map((br) => {
                          const isExpanded = expandedBridges.has(br.name);
                          const vifCount = br.vifs?.length ?? 0;
                          return (
                            <>
                              <TableRow key={br.name} className="group">
                                <TableCell className="pr-0 pl-3">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6"
                                    onClick={() => toggleBridgeExpand(br.name)}
                                  >
                                    <ChevronDown className={cn("h-3.5 w-3.5 transition-transform text-muted-foreground", isExpanded ? "rotate-0" : "-rotate-90")} />
                                  </Button>
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-2">
                                    <code className="font-semibold font-mono text-foreground">{br.name}</code>
                                    {vifCount > 0 && (
                                      <Badge variant="secondary" className="text-xs px-1.5 py-0 cursor-pointer" onClick={() => toggleBridgeExpand(br.name)}>
                                        {t("bridge.vifCount", { count: vifCount })}
                                      </Badge>
                                    )}
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <Badge variant="outline" className={cn("text-xs", br.stp ? "bg-green-500/10 text-green-500 border-green-500/20" : "bg-muted text-muted-foreground")}>
                                    {br.stp ? tc("enabled") : tc("disabled")}
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
                                    <Badge variant="outline" className="bg-red-500/10 text-red-500 border-red-500/20 text-xs">{tc("disabled")}</Badge>
                                  ) : (
                                    <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20 text-xs">{tc("enabled")}</Badge>
                                  )}
                                </TableCell>
                                <TableCell>
                                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    {(canWrite(FeatureGroup.BRIDGE) || canWrite(FeatureGroup.INTERFACES)) && (
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
                              {isExpanded && (
                                <TableRow key={`${br.name}-vifs`} className="hover:bg-transparent">
                                  <TableCell colSpan={8} className="p-0">
                                    <div className="mx-4 mb-3 mt-1 rounded-lg border bg-muted/30">
                                      <div className="flex items-center justify-between px-4 py-2 border-b">
                                        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{t("bridge.vifSubInterfaces", { count: vifCount })}</span>
                                        {(canWrite(FeatureGroup.BRIDGE) || canWrite(FeatureGroup.INTERFACES)) && (
                                          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setCreateVifForBridge(br.name)}>
                                            <Plus className="h-3 w-3 mr-1" /> {t("bridge.addVif")}
                                          </Button>
                                        )}
                                      </div>
                                      {vifCount > 0 ? (
                                        <Table>
                                          <TableHeader>
                                            <TableRow className="hover:bg-transparent">
                                              <TableHead className="h-8 text-xs pl-4">{t("table.subInterface")}</TableHead>
                                              <TableHead className="h-8 text-xs">{t("table.addresses")}</TableHead>
                                              <TableHead className="h-8 text-xs">{tc("description")}</TableHead>
                                              <TableHead className="h-8 text-xs">MTU</TableHead>
                                              <TableHead className="h-8 text-xs">{tc("status")}</TableHead>
                                              <TableHead className="h-8 w-[70px]"></TableHead>
                                            </TableRow>
                                          </TableHeader>
                                          <TableBody>
                                            {br.vifs!.map((vif) => (
                                              <TableRow key={vif.vlan_id} className="group/vif hover:bg-muted/50">
                                                <TableCell className="py-2 pl-4">
                                                  <code className="font-mono text-sm font-medium">{br.name}.{vif.vlan_id}</code>
                                                </TableCell>
                                                <TableCell className="py-2">
                                                  {vif.addresses.length ? (
                                                    <div className="flex flex-wrap gap-1">
                                                      {vif.addresses.map((addr, i) => (
                                                        <code key={i} className="text-xs font-mono px-1.5 py-0.5 rounded bg-accent text-foreground">{addr}</code>
                                                      ))}
                                                    </div>
                                                  ) : <span className="text-muted-foreground text-xs">{"\u2014"}</span>}
                                                </TableCell>
                                                <TableCell className="py-2 text-muted-foreground text-sm">{vif.description || "\u2014"}</TableCell>
                                                <TableCell className="py-2 text-sm font-mono text-muted-foreground">{vif.mtu || "\u2014"}</TableCell>
                                                <TableCell className="py-2">
                                                  {vif.disable ? (
                                                    <Badge variant="outline" className="bg-red-500/10 text-red-500 border-red-500/20 text-xs">{tc("disabled")}</Badge>
                                                  ) : (
                                                    <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20 text-xs">{tc("enabled")}</Badge>
                                                  )}
                                                </TableCell>
                                                <TableCell className="py-2 pr-3">
                                                  <div className="flex gap-1 opacity-0 group-hover/vif:opacity-100 transition-opacity justify-end">
                                                    {(canWrite(FeatureGroup.BRIDGE) || canWrite(FeatureGroup.INTERFACES)) && (
                                                      <>
                                                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setEditingVif({ bridge: br.name, vif })}>
                                                          <Pencil className="h-3 w-3" />
                                                        </Button>
                                                        <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => setDeletingVif({ bridge: br.name, vifId: vif.vlan_id })}>
                                                          <Trash2 className="h-3 w-3" />
                                                        </Button>
                                                      </>
                                                    )}
                                                  </div>
                                                </TableCell>
                                              </TableRow>
                                            ))}
                                          </TableBody>
                                        </Table>
                                      ) : (
                                        <p className="text-sm text-muted-foreground px-4 py-3">{t("bridge.noVifs")}</p>
                                      )}
                                    </div>
                                  </TableCell>
                                </TableRow>
                              )}
                            </>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                  <p className="text-sm text-muted-foreground text-center mt-3">
                    {t("table.showingInterfaces", { shown: filteredBridge.length, total: totalBridge })}
                  </p>
                </>
              )
            ) : selectedType === "vti" ? (
              /* VTI Table */
              filteredVti.length === 0 ? (
                <Card className="border-border">
                  <CardContent className="py-12">
                    <div className="flex flex-col items-center gap-2">
                      <Lock className="h-12 w-12 text-muted-foreground/30" />
                      <p className="text-muted-foreground">
                        {searchQuery ? t("empty.vti.noMatch") : t("empty.vti.none")}
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
                          <TableHead>{tc("name")}</TableHead>
                          <TableHead>{tc("description")}</TableHead>
                          <TableHead>{t("table.addresses")}</TableHead>
                          <TableHead>MTU</TableHead>
                          <TableHead>VRF</TableHead>
                          <TableHead>{tc("status")}</TableHead>
                          <TableHead className="w-[80px]"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredVti.map((vti) => (
                          <TableRow key={vti.name} className="group">
                            <TableCell><code className="font-semibold font-mono text-foreground">{vti.name}</code></TableCell>
                            <TableCell className="text-muted-foreground max-w-[180px] truncate">{vti.description || "—"}</TableCell>
                            <TableCell>
                              {vti.addresses?.length ? (
                                <div className="flex flex-wrap gap-1">
                                  {vti.addresses.slice(0, 2).map((addr, idx) => <code key={idx} className="text-xs font-mono px-1.5 py-0.5 rounded bg-accent text-foreground">{addr}</code>)}
                                  {vti.addresses.length > 2 && <Badge variant="secondary" className="text-xs px-1.5 py-0">+{vti.addresses.length - 2}</Badge>}
                                </div>
                              ) : <span className="text-muted-foreground">—</span>}
                            </TableCell>
                            <TableCell className="text-sm">{vti.mtu || "—"}</TableCell>
                            <TableCell>
                              {vti.vrf ? (
                                <Badge variant="outline" className="bg-purple-500/10 text-purple-500 border-purple-500/20 text-xs">
                                  {vti.vrf}
                                </Badge>
                              ) : <span className="text-muted-foreground">—</span>}
                            </TableCell>
                            <TableCell>
                              {vti.disable ? (
                                <Badge variant="outline" className="bg-red-500/10 text-red-500 border-red-500/20 text-xs">{tc("disabled")}</Badge>
                              ) : (
                                <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20 text-xs">{tc("enabled")}</Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                {canWrite(FeatureGroup.INTERFACES) && (
                                  <>
                                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditingVti(vti)}>
                                      <Pencil className="h-3.5 w-3.5" />
                                    </Button>
                                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setDeletingVti(vti)}>
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
                    {t("table.showingInterfaces", { shown: filteredVti.length, total: totalVti })}
                  </p>
                </>
              )
            ) : selectedType === "wireless" ? (
              /* Wireless Table */
              filteredWireless.length === 0 ? (
                <Card className="border-border">
                  <CardContent className="py-12">
                    <div className="flex flex-col items-center gap-2">
                      <Wifi className="h-12 w-12 text-muted-foreground/30" />
                      <p className="text-muted-foreground">
                        {searchQuery ? t("empty.wireless.noMatch") : t("empty.wireless.none")}
                      </p>
                      {!searchQuery && canWrite(FeatureGroup.INTERFACES) && (
                        <Button variant="outline" size="sm" onClick={() => setIsCreateWirelessModalOpen(true)} className="mt-2 gap-2">
                          <Plus className="h-4 w-4" />
                          {t("create.wirelessInterface")}
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <>
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>{tc("name")}</TableHead>
                          <TableHead>{t("table.type")}</TableHead>
                          <TableHead>{t("table.mode")}</TableHead>
                          <TableHead>SSID</TableHead>
                          <TableHead>{t("table.channel")}</TableHead>
                          <TableHead>{t("table.security")}</TableHead>
                          <TableHead>{t("table.addresses")}</TableHead>
                          <TableHead>{tc("status")}</TableHead>
                          <TableHead className="w-[80px]"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredWireless.map((iface) => {
                          const wpaMode = iface.security?.wpa?.mode;
                          const hasWep = (iface.security?.wep?.key?.length ?? 0) > 0;
                          const securityBadge = wpaMode === "wpa3"
                            ? <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20 text-xs">WPA3</Badge>
                            : wpaMode === "wpa2"
                              ? <Badge variant="outline" className="bg-blue-500/10 text-blue-500 border-blue-500/20 text-xs">WPA2</Badge>
                              : (wpaMode === "wpa+wpa2" || wpaMode === "wpa")
                                ? <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20 text-xs">WPA</Badge>
                                : hasWep
                                  ? <Badge variant="outline" className="bg-red-500/10 text-red-500 border-red-500/20 text-xs">WEP</Badge>
                                  : <Badge variant="outline" className="text-xs">{t("wireless.open")}</Badge>;
                          const typeBadge = iface.wireless_type === "access-point"
                            ? <Badge variant="outline" className="bg-blue-500/10 text-blue-500 border-blue-500/20 text-xs">AP</Badge>
                            : iface.wireless_type === "station"
                              ? <Badge variant="outline" className="bg-purple-500/10 text-purple-500 border-purple-500/20 text-xs">{t("wireless.station")}</Badge>
                              : iface.wireless_type === "monitor"
                                ? <Badge variant="outline" className="text-xs">{t("wireless.monitor")}</Badge>
                                : <span className="text-muted-foreground">—</span>;
                          return (
                            <TableRow key={iface.name} className="group">
                              <TableCell><code className="font-semibold font-mono text-foreground">{iface.name}</code></TableCell>
                              <TableCell>{typeBadge}</TableCell>
                              <TableCell className="text-sm text-muted-foreground">{iface.mode ?? "—"}</TableCell>
                              <TableCell className="text-sm">{iface.ssid ?? "—"}</TableCell>
                              <TableCell className="text-sm">{iface.channel ?? "—"}</TableCell>
                              <TableCell>{securityBadge}</TableCell>
                              <TableCell>
                                {iface.addresses?.length ? (
                                  <div className="flex flex-wrap gap-1">
                                    {iface.addresses.slice(0, 2).map((addr, idx) => <code key={idx} className="text-xs font-mono px-1.5 py-0.5 rounded bg-accent text-foreground">{addr}</code>)}
                                    {iface.addresses.length > 2 && <Badge variant="secondary" className="text-xs px-1.5 py-0">+{iface.addresses.length - 2}</Badge>}
                                  </div>
                                ) : <span className="text-muted-foreground">—</span>}
                              </TableCell>
                              <TableCell>
                                {iface.disable ? (
                                  <Badge variant="outline" className="bg-red-500/10 text-red-500 border-red-500/20 text-xs">{tc("disabled")}</Badge>
                                ) : (
                                  <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20 text-xs">{tc("enabled")}</Badge>
                                )}
                              </TableCell>
                              <TableCell>
                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                  {canWrite(FeatureGroup.INTERFACES) && (
                                    <>
                                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditingWireless(iface)}>
                                        <Pencil className="h-3.5 w-3.5" />
                                      </Button>
                                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setDeletingWireless(iface)}>
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
                    {t("table.showingInterfaces", { shown: filteredWireless.length, total: totalWireless })}
                  </p>
                </>
              )
            ) : selectedType === "wwan" ? (
              /* WWAN Table */
              filteredWwan.length === 0 ? (
                <Card className="border-border">
                  <CardContent className="py-12">
                    <div className="flex flex-col items-center gap-2">
                      <Signal className="h-12 w-12 text-muted-foreground/30" />
                      <p className="text-muted-foreground">
                        {searchQuery ? t("empty.wwan.noMatch") : t("empty.wwan.none")}
                      </p>
                      {!searchQuery && canWrite(FeatureGroup.INTERFACES) && (
                        <Button variant="outline" size="sm" onClick={() => setIsCreateWwanModalOpen(true)} className="mt-2 gap-2">
                          <Plus className="h-4 w-4" />
                          {t("create.wwanInterface")}
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <>
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>{tc("name")}</TableHead>
                          <TableHead>APN</TableHead>
                          <TableHead>{tc("status")}</TableHead>
                          <TableHead>{t("table.addresses")}</TableHead>
                          <TableHead>VRF</TableHead>
                          <TableHead className="w-[80px]"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredWwan.map((iface) => (
                          <TableRow key={iface.name} className="group">
                            <TableCell><code className="font-semibold font-mono text-foreground">{iface.name}</code></TableCell>
                            <TableCell>
                              {iface.apn ? (
                                <Badge variant="outline" className="text-xs font-mono">{iface.apn}</Badge>
                              ) : <span className="text-muted-foreground">—</span>}
                            </TableCell>
                            <TableCell>
                              {iface.disable ? (
                                <Badge variant="outline" className="bg-red-500/10 text-red-500 border-red-500/20 text-xs">{tc("disabled")}</Badge>
                              ) : (
                                <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20 text-xs">{tc("enabled")}</Badge>
                              )}
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
                              {iface.vrf ? (
                                <Badge variant="outline" className="bg-purple-500/10 text-purple-500 border-purple-500/20 text-xs">
                                  {iface.vrf}
                                </Badge>
                              ) : <span className="text-muted-foreground">—</span>}
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                {canWrite(FeatureGroup.INTERFACES) && (
                                  <>
                                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditingWwan(iface)}>
                                      <Pencil className="h-3.5 w-3.5" />
                                    </Button>
                                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setDeletingWwan(iface)}>
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
                    {t("table.showingInterfaces", { shown: filteredWwan.length, total: totalWwan })}
                  </p>
                </>
              )
            ) : filteredWireGuard.length === 0 ? (
              <Card className="border-border">
                <CardContent className="py-12">
                  <div className="flex flex-col items-center gap-2">
                    <Shield className="h-12 w-12 text-muted-foreground/30" />
                    <p className="text-muted-foreground">
                      {searchQuery ? t("empty.wireguard.noMatch") : t("empty.wireguard.none")}
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
                        <TableHead>{tc("name")}</TableHead>
                        <TableHead>{tc("description")}</TableHead>
                        <TableHead>{t("table.addresses")}</TableHead>
                        <TableHead>{t("table.port")}</TableHead>
                        <TableHead>{t("table.peers")}</TableHead>
                        <TableHead>{tc("status")}</TableHead>
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
                          <TableCell>{wg.port || t("wireguard.auto")}</TableCell>
                          <TableCell><Badge variant="secondary" className="text-xs">{wg.peer_count}</Badge></TableCell>
                          <TableCell>
                            {wg.disabled ? (
                              <Badge variant="outline" className="bg-red-500/10 text-red-500 border-red-500/20 text-xs">{tc("disabled")}</Badge>
                            ) : (
                              <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20 text-xs">{tc("enabled")}</Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                <p className="text-sm text-muted-foreground text-center mt-3">
                  {t("table.showingTunnels", { shown: filteredWireGuard.length, total: totalWireGuard })}
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

      <TransceiverDiagnosticsDialog
        interfaceName={diagnosticsInterface}
        open={!!diagnosticsInterface}
        onOpenChange={(open) => !open && setDiagnosticsInterface(null)}
      />

      {/* VIF (802.1Q) Modals */}
      <ComprehensiveVLANModal
        open={isCreateVLANModalOpen}
        onOpenChange={setIsCreateVLANModalOpen}
        mode="create"
        interfaces={vlanModalInterfaces}
        capabilities={vlanModalCapabilities}
        service={vlanModalService}
        onSuccess={loadData}
      />

      {editingVLAN && (
        <ComprehensiveVLANModal
          open={!!editingVLAN}
          onOpenChange={(open) => !open && setEditingVLAN(null)}
          mode="edit"
          vlan={editingVLAN}
          interfaces={vlanModalInterfaces}
          capabilities={vlanModalCapabilities}
          service={vlanModalService}
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
        interfaces={vlanModalInterfaces}
        capabilities={vlanModalCapabilities}
        service={vlanModalService}
        onSuccess={loadData}
      />

      {editingVIFS && (
        <ComprehensiveVIFSModal
          open={!!editingVIFS}
          onOpenChange={(open) => !open && setEditingVIFS(null)}
          mode="edit"
          vlan={editingVIFS}
          interfaces={vlanModalInterfaces}
          capabilities={vlanModalCapabilities}
          service={vlanModalService}
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
        interfaces={vlanModalInterfaces}
        capabilities={vlanModalCapabilities}
        service={vlanModalService}
        onSuccess={loadData}
      />

      {editingVIFC && (
        <ComprehensiveVIFCModal
          open={!!editingVIFC}
          onOpenChange={(open) => !open && setEditingVIFC(null)}
          mode="edit"
          vlan={editingVIFC}
          interfaces={vlanModalInterfaces}
          capabilities={vlanModalCapabilities}
          service={vlanModalService}
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
          service={vlanModalService}
          onSuccess={() => {
            setDeletingVLAN(null);
            loadData();
          }}
        />
      )}

      {/* VXLAN Modals */}
      <VxlanModal
        open={isCreateVxlanModalOpen || !!editingVxlan}
        onOpenChange={(open) => {
          if (!open) {
            setIsCreateVxlanModalOpen(false);
            setEditingVxlan(null);
          }
        }}
        onSuccess={() => {
          setEditingVxlan(null);
          loadData();
        }}
        capabilities={vxlanCapabilities}
        existingInterfaces={vxlanInterfaces.map((i) => i.name)}
        existing={editingVxlan}
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
      <TunnelModal
        open={isCreateTunnelModalOpen || !!editingTunnel}
        onOpenChange={(open) => {
          if (!open) {
            setIsCreateTunnelModalOpen(false);
            setEditingTunnel(null);
          }
        }}
        onSuccess={() => {
          setEditingTunnel(null);
          loadData();
        }}
        capabilities={tunnelCapabilities}
        existingInterfaces={tunnelInterfaces.map((i) => i.name)}
        existing={editingTunnel}
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
      <DummyModal
        open={isCreateDummyModalOpen || !!editingDummy}
        onOpenChange={(open) => {
          if (!open) {
            setIsCreateDummyModalOpen(false);
            setEditingDummy(null);
          }
        }}
        onSuccess={() => {
          setEditingDummy(null);
          loadData();
        }}
        capabilities={dummyCapabilities}
        existingInterfaces={dummyInterfaces.map((i) => i.name)}
        existing={editingDummy}
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
      <GeneveModal
        open={isCreateGeneveModalOpen || !!editingGeneve}
        onOpenChange={(open) => {
          if (!open) {
            setIsCreateGeneveModalOpen(false);
            setEditingGeneve(null);
          }
        }}
        onSuccess={() => {
          setEditingGeneve(null);
          loadData();
        }}
        capabilities={geneveCapabilities}
        existingInterfaces={geneveInterfaces.map((i) => i.name)}
        existing={editingGeneve}
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
      <InputModal
        open={isCreateInputModalOpen || !!editingInput}
        onOpenChange={(open) => {
          if (!open) {
            setIsCreateInputModalOpen(false);
            setEditingInput(null);
          }
        }}
        onSuccess={() => {
          setEditingInput(null);
          loadData();
        }}
        capabilities={inputCapabilities}
        existingInterfaces={inputInterfaces.map((i) => i.name)}
        existing={editingInput}
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
      <L2TPv3Modal
        open={isCreateL2tpv3ModalOpen || !!editingL2tpv3}
        onOpenChange={(open) => {
          if (!open) {
            setIsCreateL2tpv3ModalOpen(false);
            setEditingL2tpv3(null);
          }
        }}
        onSuccess={() => {
          setEditingL2tpv3(null);
          loadData();
        }}
        capabilities={l2tpv3Capabilities}
        existingInterfaces={l2tpv3Interfaces.map((i) => i.name)}
        existing={editingL2tpv3}
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
      <LoopbackModal
        open={isCreateLoopbackModalOpen || !!editingLoopback}
        onOpenChange={(open) => {
          if (!open) {
            setIsCreateLoopbackModalOpen(false);
            setEditingLoopback(null);
          }
        }}
        onSuccess={() => {
          setEditingLoopback(null);
          loadData();
        }}
        capabilities={loopbackCapabilities}
        existing={editingLoopback}
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
      <MacsecModal
        open={isCreateMacsecModalOpen || !!editingMacsec}
        onOpenChange={(open) => {
          if (!open) {
            setIsCreateMacsecModalOpen(false);
            setEditingMacsec(null);
          }
        }}
        onSuccess={() => {
          setEditingMacsec(null);
          loadData();
        }}
        capabilities={macsecCapabilities}
        existingInterfaces={macsecInterfaces.map((i) => i.name)}
        existing={editingMacsec}
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
      <BondingModal
        open={isCreateBondingModalOpen || !!editingBonding}
        onOpenChange={(open) => {
          if (!open) {
            setIsCreateBondingModalOpen(false);
            setEditingBonding(null);
          }
        }}
        onSuccess={() => {
          setEditingBonding(null);
          loadData();
        }}
        capabilities={bondingCapabilities}
        existingInterfaces={bondingInterfaces.map((i) => i.name)}
        existing={editingBonding}
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
      {/* PPPoE Modals */}
      <PppoeModal
        open={isCreatePppoeModalOpen || !!editingPppoe}
        onOpenChange={(open) => {
          if (!open) {
            setIsCreatePppoeModalOpen(false);
            setEditingPppoe(null);
          }
        }}
        onSuccess={() => {
          setEditingPppoe(null);
          loadData();
        }}
        capabilities={pppoeCapabilities}
        existingInterfaces={pppoeInterfaces.map((i) => i.name)}
        availableEthernet={interfaces.map((i) => i.name)}
        existing={editingPppoe}
      />
      <DeletePppoeModal
        open={!!deletingPppoe}
        onOpenChange={(open) => !open && setDeletingPppoe(null)}
        onSuccess={() => {
          setDeletingPppoe(null);
          loadData();
        }}
        interfaceData={deletingPppoe}
      />
      {/* Pseudo-Ethernet Modals */}
      <CreatePseudoEthernetModal
        open={isCreatePseudoEthernetModalOpen}
        onOpenChange={setIsCreatePseudoEthernetModalOpen}
        onSuccess={loadData}
        availableInterfaces={interfaces}
        capabilities={pseudoEthernetCapabilities}
        existingNames={pseudoEthernetInterfaces.map((i) => i.name)}
      />
      <EditPseudoEthernetModal
        open={!!editingPseudoEthernet}
        onOpenChange={(o) => !o && setEditingPseudoEthernet(null)}
        onSuccess={() => {
          setEditingPseudoEthernet(null);
          loadData();
        }}
        interfaceData={editingPseudoEthernet}
        availableInterfaces={interfaces}
        capabilities={pseudoEthernetCapabilities}
      />
      <DeletePseudoEthernetModal
        open={!!deletingPseudoEthernet}
        onOpenChange={(o) => !o && setDeletingPseudoEthernet(null)}
        onSuccess={() => {
          setDeletingPseudoEthernet(null);
          loadData();
        }}
        interfaceData={deletingPseudoEthernet}
      />
      {/* SSTPC Modals */}
      <SstpcModal
        open={isCreateSstpcModalOpen || !!editingSstpc}
        onOpenChange={(open) => {
          if (!open) {
            setIsCreateSstpcModalOpen(false);
            setEditingSstpc(null);
          }
        }}
        onSuccess={() => {
          setEditingSstpc(null);
          loadData();
        }}
        capabilities={sstpcCapabilities}
        existingInterfaces={sstpcInterfaces.map((i) => i.name)}
        existing={editingSstpc}
      />
      <DeleteSstpcModal
        open={!!deletingSstpc}
        onOpenChange={(o) => !o && setDeletingSstpc(null)}
        onSuccess={() => {
          setDeletingSstpc(null);
          loadData();
        }}
        interfaceData={deletingSstpc}
      />
      {/* Virtual Ethernet Modals */}
      <CreateVirtualEthernetModal
        open={isCreateVirtualEthernetModalOpen}
        onOpenChange={setIsCreateVirtualEthernetModalOpen}
        onSuccess={loadData}
        capabilities={virtualEthernetCapabilities}
        existingNames={virtualEthernetInterfaces.map((i) => i.name)}
      />
      <EditVirtualEthernetModal
        open={!!editingVirtualEthernet}
        onOpenChange={(o) => !o && setEditingVirtualEthernet(null)}
        onSuccess={() => {
          setEditingVirtualEthernet(null);
          loadData();
        }}
        interfaceData={editingVirtualEthernet}
        capabilities={virtualEthernetCapabilities}
      />
      <DeleteVirtualEthernetModal
        open={!!deletingVirtualEthernet}
        onOpenChange={(o) => !o && setDeletingVirtualEthernet(null)}
        onSuccess={() => {
          setDeletingVirtualEthernet(null);
          loadData();
        }}
        interfaceData={deletingVirtualEthernet}
      />
      {/* VPP Modals */}
      <VppModal
        open={isCreateVppModalOpen || !!editingVpp}
        onOpenChange={(o) => {
          if (!o) {
            setIsCreateVppModalOpen(false);
            setEditingVpp(null);
          }
        }}
        onSuccess={() => { setEditingVpp(null); loadData(); }}
        capabilities={vppCapabilities}
        existingNames={[...vppBonding, ...vppBridge, ...vppGre, ...vppIpip, ...vppLoopback, ...vppVxlanIfaces, ...vppXconnect].map((i) => i.name)}
        existing={editingVpp?.data ?? null}
        existingSubType={editingVpp?.subType ?? null}
      />
      <DeleteVppModal
        open={!!deletingVpp}
        onOpenChange={(o) => !o && setDeletingVpp(null)}
        onSuccess={() => { setDeletingVpp(null); loadData(); }}
        interfaceData={deletingVpp ? { name: deletingVpp.name } : null}
        subType={deletingVpp?.subType ?? null}
      />
      {/* VTI Modals */}
      <VtiModal
        open={isCreateVtiModalOpen || !!editingVti}
        onOpenChange={(open) => {
          if (!open) {
            setIsCreateVtiModalOpen(false);
            setEditingVti(null);
          }
        }}
        onSuccess={() => {
          setEditingVti(null);
          loadData();
        }}
        capabilities={vtiCapabilities}
        existingInterfaces={vtiInterfaces.map((i) => i.name)}
        existing={editingVti}
      />
      <DeleteVtiModal
        open={!!deletingVti}
        onOpenChange={(open) => !open && setDeletingVti(null)}
        onSuccess={() => {
          setDeletingVti(null);
          loadData();
        }}
        interfaceData={deletingVti}
      />
      {/* Wireless Modals */}
      <WirelessModal
        open={isCreateWirelessModalOpen || !!editingWireless}
        onOpenChange={(open) => {
          if (!open) {
            setIsCreateWirelessModalOpen(false);
            setEditingWireless(null);
          }
        }}
        onSuccess={() => {
          setEditingWireless(null);
          loadData();
        }}
        capabilities={wirelessCapabilities}
        existingInterfaces={wirelessInterfaces.map((i) => i.name)}
        existing={editingWireless}
      />
      <DeleteWirelessModal
        open={!!deletingWireless}
        onOpenChange={(open) => !open && setDeletingWireless(null)}
        onSuccess={() => {
          setDeletingWireless(null);
          loadData();
        }}
        interfaceData={deletingWireless}
      />
      {/* WWAN Modals */}
      <WwanModal
        open={isCreateWwanModalOpen || !!editingWwan}
        onOpenChange={(open) => {
          if (!open) {
            setIsCreateWwanModalOpen(false);
            setEditingWwan(null);
          }
        }}
        onSuccess={() => {
          setEditingWwan(null);
          loadData();
        }}
        capabilities={wwanCapabilities}
        existingInterfaces={wwanInterfaces.map((i) => i.name)}
        existing={editingWwan}
      />
      <DeleteWwanModal
        open={!!deletingWwan}
        onOpenChange={(open) => !open && setDeletingWwan(null)}
        onSuccess={() => {
          setDeletingWwan(null);
          loadData();
        }}
        interfaceData={deletingWwan}
      />
      {/* Bridge Modals */}
      <BridgeModal
        open={isCreateBridgeModalOpen || !!editingBridge}
        onOpenChange={(open) => {
          if (!open) {
            setIsCreateBridgeModalOpen(false);
            setEditingBridge(null);
          }
        }}
        onSuccess={() => {
          setEditingBridge(null);
          loadData();
        }}
        capabilities={bridgeCapabilities}
        existingInterfaces={bridgeInterfaces.map((i) => i.name)}
        existing={editingBridge}
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
      <BridgeVifModal
        open={!!createVifForBridge || !!editingVif}
        onOpenChange={(open) => {
          if (!open) {
            setCreateVifForBridge(null);
            setEditingVif(null);
          }
        }}
        onSuccess={() => {
          setCreateVifForBridge(null);
          setEditingVif(null);
          loadData();
        }}
        interfaceName={editingVif?.bridge ?? createVifForBridge ?? ""}
        existingVlanIds={bridgeInterfaces.find((b) => b.name === (editingVif?.bridge ?? createVifForBridge))?.vifs?.map((v) => v.vlan_id) ?? []}
        existing={editingVif?.vif ?? null}
      />
      <DeleteBridgeVifModal
        open={!!deletingVif}
        onOpenChange={(open) => { if (!open) setDeletingVif(null); }}
        onSuccess={() => { setDeletingVif(null); loadData(); }}
        interfaceName={deletingVif?.bridge ?? ""}
        vlanId={deletingVif?.vifId ?? null}
      />
    </AppLayout>
  );
}

export default function InterfacesPage() {
  return (
    <Suspense>
      <InterfacesPageInner />
    </Suspense>
  );
}
