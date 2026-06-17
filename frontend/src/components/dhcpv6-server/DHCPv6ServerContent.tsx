"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Plus,
  RefreshCw,
  AlertCircle,
  Server,
  Network,
  Pencil,
  Trash2,
  MapPin,
  Settings2,
  Link2,
  Loader2,
  Power,
  PowerOff,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  dhcpv6ServerService,
  DHCPv6ServerConfig,
  DHCPv6ServerCapabilities,
  DHCPv6SharedNetwork,
  DHCPv6Subnet,
  DHCPv6AddressRange,
  DHCPv6PrefixDelegation,
  DHCPv6StaticMapping,
} from "@/lib/api/dhcpv6-server";
import { FeatureGroup } from "@/lib/api/user-management";
import { usePermissions } from "@/hooks/usePermissions";
import { DHCPv6ServerGlobalModal } from "./DHCPv6ServerGlobalModal";
import { DHCPv6ServerNetworkModal } from "./DHCPv6ServerNetworkModal";
import { DHCPv6ServerSubnetModal } from "./DHCPv6ServerSubnetModal";
import { DHCPv6ServerAddressRangeModal } from "./DHCPv6ServerAddressRangeModal";
import { DHCPv6ServerPrefixDelegationModal } from "./DHCPv6ServerPrefixDelegationModal";
import { DHCPv6ServerStaticMappingModal } from "./DHCPv6ServerStaticMappingModal";

export function DHCPv6ServerContent() {
  const { canWrite } = usePermissions();
  const hasWrite = canWrite(FeatureGroup.DHCPV6_SERVER);

  const [config, setConfig] = useState<DHCPv6ServerConfig | null>(null);
  const [caps, setCaps] = useState<DHCPv6ServerCapabilities | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedNetwork, setSelectedNetwork] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("subnets");

  // Sub-tab subnet filters
  const [rangeSubnetFilter, setRangeSubnetFilter] = useState("all");
  const [pdSubnetFilter, setPdSubnetFilter] = useState("all");
  const [staticSubnetFilter, setStaticSubnetFilter] = useState("all");

  // Modal open states
  const [globalModalOpen, setGlobalModalOpen] = useState(false);
  const [networkModalOpen, setNetworkModalOpen] = useState(false);
  const [editingNetwork, setEditingNetwork] = useState<DHCPv6SharedNetwork | null>(null);
  const [subnetModalOpen, setSubnetModalOpen] = useState(false);
  const [editingSubnet, setEditingSubnet] = useState<DHCPv6Subnet | null>(null);

  const [rangeModalOpen, setRangeModalOpen] = useState(false);
  const [editingRange, setEditingRange] = useState<{ subnet: string; range: DHCPv6AddressRange } | null>(null);
  const [addingRangeSubnet, setAddingRangeSubnet] = useState<string | null>(null);

  const [pdModalOpen, setPdModalOpen] = useState(false);
  const [editingPD, setEditingPD] = useState<{ subnet: string; pd: DHCPv6PrefixDelegation } | null>(null);
  const [addingPDSubnet, setAddingPDSubnet] = useState<string | null>(null);

  const [staticModalOpen, setStaticModalOpen] = useState(false);
  const [editingMapping, setEditingMapping] = useState<{ subnet: string; mapping: DHCPv6StaticMapping } | null>(null);
  const [addingMappingSubnet, setAddingMappingSubnet] = useState<string | null>(null);

  // Delete confirmation
  type DeleteTarget =
    | { kind: "network"; name: string }
    | { kind: "subnet"; subnetCidr: string }
    | { kind: "range"; subnetCidr: string; range: DHCPv6AddressRange }
    | { kind: "pd"; subnetCidr: string; pd: DHCPv6PrefixDelegation }
    | { kind: "mapping"; subnetCidr: string; mapping: DHCPv6StaticMapping };
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Disable/enable confirmation
  type DisableTarget =
    | { kind: "server"; currentlyDisabled: boolean }
    | { kind: "network"; name: string; currentlyDisabled: boolean };
  const [disableTarget, setDisableTarget] = useState<DisableTarget | null>(null);
  const [disableLoading, setDisableLoading] = useState(false);
  const [disableError, setDisableError] = useState<string | null>(null);

  // ── Data fetching ──────────────────────────────────────────────────────────

  async function fetchData(refresh = false) {
    try {
      setLoading(true);
      setError(null);
      const [cfg, cap] = await Promise.all([
        dhcpv6ServerService.getConfig(refresh),
        dhcpv6ServerService.getCapabilities(),
      ]);
      setConfig(cfg);
      setCaps(cap);
      if (!selectedNetwork && cfg.shared_networks.length > 0) {
        setSelectedNetwork(cfg.shared_networks[0].name);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load DHCPv6 server configuration");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchData(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Derived data ───────────────────────────────────────────────────────────

  const currentNetwork = config?.shared_networks.find(n => n.name === selectedNetwork) ?? null;
  const is15 = caps?.version_info.is_1_5 ?? false;
  const allSubnetCidrs = currentNetwork?.subnets.map(s => s.subnet) ?? [];

  function getAllRanges(): Array<DHCPv6AddressRange & { subnetCidr: string }> {
    if (!currentNetwork) return [];
    return currentNetwork.subnets.flatMap(s =>
      s.address_ranges.map(r => ({ ...r, subnetCidr: s.subnet }))
    );
  }

  function getAllPDs(): Array<DHCPv6PrefixDelegation & { subnetCidr: string }> {
    if (!currentNetwork) return [];
    return currentNetwork.subnets.flatMap(s =>
      s.prefix_delegations.map(pd => ({ ...pd, subnetCidr: s.subnet }))
    );
  }

  function getAllMappings(): Array<DHCPv6StaticMapping & { subnetCidr: string }> {
    if (!currentNetwork) return [];
    return currentNetwork.subnets.flatMap(s =>
      s.static_mappings.map(m => ({ ...m, subnetCidr: s.subnet }))
    );
  }

  const filteredRanges = getAllRanges().filter(r =>
    rangeSubnetFilter === "all" || r.subnetCidr === rangeSubnetFilter
  );
  const filteredPDs = getAllPDs().filter(pd =>
    pdSubnetFilter === "all" || pd.subnetCidr === pdSubnetFilter
  );
  const filteredMappings = getAllMappings().filter(m =>
    staticSubnetFilter === "all" || m.subnetCidr === staticSubnetFilter
  );

  // ── Actions ────────────────────────────────────────────────────────────────

  function openAddSubnet() {
    setEditingSubnet(null);
    setSubnetModalOpen(true);
  }

  function openEditSubnet(subnet: DHCPv6Subnet) {
    setEditingSubnet(subnet);
    setSubnetModalOpen(true);
  }

  function openAddRange() {
    setEditingRange(null);
    setAddingRangeSubnet(rangeSubnetFilter !== "all" ? rangeSubnetFilter : null);
    setRangeModalOpen(true);
  }

  function openEditRange(subnetCidr: string, range: DHCPv6AddressRange) {
    setEditingRange({ subnet: subnetCidr, range });
    setAddingRangeSubnet(null);
    setRangeModalOpen(true);
  }

  function openAddPD() {
    setEditingPD(null);
    setAddingPDSubnet(pdSubnetFilter !== "all" ? pdSubnetFilter : null);
    setPdModalOpen(true);
  }

  function openEditPD(subnetCidr: string, pd: DHCPv6PrefixDelegation) {
    setEditingPD({ subnet: subnetCidr, pd });
    setAddingPDSubnet(null);
    setPdModalOpen(true);
  }

  function openAddMapping() {
    setEditingMapping(null);
    setAddingMappingSubnet(staticSubnetFilter !== "all" ? staticSubnetFilter : null);
    setStaticModalOpen(true);
  }

  function openEditMapping(subnetCidr: string, mapping: DHCPv6StaticMapping) {
    setEditingMapping({ subnet: subnetCidr, mapping });
    setAddingMappingSubnet(null);
    setStaticModalOpen(true);
  }

  async function handleDelete() {
    if (!deleteTarget || !selectedNetwork) return;
    setDeleteLoading(true);
    setDeleteError(null);

    let result;
    if (deleteTarget.kind === "network") {
      result = await dhcpv6ServerService.deleteSharedNetwork(deleteTarget.name);
    } else if (deleteTarget.kind === "subnet") {
      result = await dhcpv6ServerService.deleteSubnet(selectedNetwork, deleteTarget.subnetCidr);
    } else if (deleteTarget.kind === "range") {
      result = await dhcpv6ServerService.deleteAddressRange(selectedNetwork, deleteTarget.subnetCidr, is15, deleteTarget.range);
    } else if (deleteTarget.kind === "pd") {
      result = await dhcpv6ServerService.deletePrefixDelegation(selectedNetwork, deleteTarget.subnetCidr, is15, deleteTarget.pd);
    } else {
      result = await dhcpv6ServerService.deleteStaticMapping(selectedNetwork, deleteTarget.subnetCidr, deleteTarget.mapping.name);
    }

    setDeleteLoading(false);
    if (!result.success) {
      setDeleteError(result.error ?? "Operation failed");
      return;
    }
    if (deleteTarget.kind === "network" && deleteTarget.name === selectedNetwork) {
      setSelectedNetwork(null);
    }
    setDeleteTarget(null);
    fetchData(true);
  }

  async function handleDisableToggle() {
    if (!disableTarget) return;
    setDisableLoading(true);
    setDisableError(null);

    let result;
    if (disableTarget.kind === "server") {
      result = await dhcpv6ServerService.setDisabled(!disableTarget.currentlyDisabled);
    } else {
      const net = config?.shared_networks.find(n => n.name === disableTarget.name);
      if (!net) { setDisableLoading(false); return; }
      result = await dhcpv6ServerService.saveSharedNetwork(net, { ...net, disabled: !disableTarget.currentlyDisabled });
    }

    setDisableLoading(false);
    if (!result.success) {
      setDisableError(result.error ?? "Operation failed");
      return;
    }
    setDisableTarget(null);
    fetchData(true);
  }

  // ── Loading / error states ─────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground">Loading DHCPv6 server configuration...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center space-y-4">
          <AlertCircle className="h-12 w-12 text-destructive mx-auto" />
          <h2 className="text-xl font-semibold">Error Loading DHCPv6 Server</h2>
          <p className="text-muted-foreground max-w-md">{error}</p>
          <Button onClick={() => fetchData(true)} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </div>
      </div>
    );
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  const totalNetworks = config?.shared_networks.length ?? 0;
  const totalSubnets = config?.total_subnets ?? 0;
  const totalStatic = config?.total_static_mappings ?? 0;

  return (
    <div className="flex h-full overflow-hidden">
      {/* ── Sidebar ── */}
      <div className="w-72 border-r border-border bg-card/50 flex flex-col">
        <div className="p-4 border-b border-border">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-lg font-semibold">DHCPv6 Server</h2>
              {config?.disabled && (
                <Badge variant="outline" className="mt-1 bg-red-500/10 text-red-500 border-red-500/20 text-xs">
                  Disabled
                </Badge>
              )}
            </div>
            <Button variant="ghost" size="icon" onClick={() => fetchData(true)}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
          <div className="space-y-2">
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => setGlobalModalOpen(true)}
            >
              <Settings2 className="h-4 w-4 mr-2" />
              Global Settings
            </Button>
            {hasWrite && (
              <Button
                size="sm"
                className="w-full"
                onClick={() => { setEditingNetwork(null); setNetworkModalOpen(true); }}
              >
                <Plus className="h-4 w-4 mr-2" />
                New Server
              </Button>
            )}
          </div>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-2">
            {config?.shared_networks.length === 0 ? (
              <div className="px-3 py-8 text-center">
                <Server className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No servers configured</p>
                {hasWrite && (
                  <p className="text-xs text-muted-foreground mt-1">Click &quot;New Server&quot; to create one</p>
                )}
              </div>
            ) : (
              <div className="space-y-1">
                {config?.shared_networks.map((network) => {
                  const isSelected = selectedNetwork === network.name;
                  const isDisabled = network.disabled;
                  return (
                    <div
                      key={network.name}
                      className={cn(
                        "group w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all cursor-pointer",
                        isSelected ? "bg-accent text-accent-foreground shadow-sm" : "hover:bg-accent/50",
                        isDisabled && "opacity-60"
                      )}
                      onClick={() => {
                        setSelectedNetwork(network.name);
                        setRangeSubnetFilter("all");
                        setPdSubnetFilter("all");
                        setStaticSubnetFilter("all");
                        setActiveTab("subnets");
                      }}
                    >
                      <div className="p-1.5 rounded-md bg-blue-500/10 flex-shrink-0">
                        <Server className={cn("h-4 w-4", isDisabled ? "text-muted-foreground" : "text-blue-500")} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className={cn("font-medium truncate text-sm", isDisabled && "text-muted-foreground")}>
                          {network.name}
                        </div>
                        {network.description && (
                          <div className="text-xs text-muted-foreground truncate">{network.description}</div>
                        )}
                      </div>
                      {hasWrite && (
                        <>
                          <button
                            className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-accent transition-opacity"
                            onClick={(e) => {
                              e.stopPropagation();
                              setDisableError(null);
                              setDisableTarget({ kind: "network", name: network.name, currentlyDisabled: !!isDisabled });
                            }}
                            title={isDisabled ? "Enable network" : "Disable network"}
                          >
                            {isDisabled
                              ? <Power className="h-4 w-4 text-green-500" />
                              : <PowerOff className="h-4 w-4 text-muted-foreground" />
                            }
                          </button>
                          <button
                            className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-destructive/10 transition-opacity"
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleteError(null);
                              setDeleteTarget({ kind: "network", name: network.name });
                            }}
                            title="Delete network"
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </button>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </ScrollArea>

        <div className="p-4 border-t border-border bg-card/30">
          <div className="grid grid-cols-3 gap-2 text-xs text-center">
            <div>
              <div className="font-semibold text-sm">{totalNetworks}</div>
              <div className="text-muted-foreground">Networks</div>
            </div>
            <div>
              <div className="font-semibold text-sm">{totalSubnets}</div>
              <div className="text-muted-foreground">Subnets</div>
            </div>
            <div>
              <div className="font-semibold text-sm">{totalStatic}</div>
              <div className="text-muted-foreground">Static</div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Main Content ── */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {currentNetwork ? (
          <>
            {/* Global disable banner */}
            {config?.disabled && (
              <div className="border-b border-amber-500/30 bg-amber-500/10 px-6 py-3 flex items-center gap-2 text-amber-600 dark:text-amber-400">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                <span className="text-sm font-medium">
                  DHCPv6 server is globally disabled — no networks are serving requests.
                </span>
              </div>
            )}

            {/* Network header */}
            <div className="border-b border-border bg-card/50 px-6 py-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                    <span>DHCPv6</span>
                    <ChevronRight className="h-4 w-4" />
                    <span className="text-foreground font-medium">{currentNetwork.name}</span>
                    {currentNetwork.disabled && (
                      <Badge variant="outline" className="bg-red-500/10 text-red-500 border-red-500/20">
                        Disabled
                      </Badge>
                    )}
                  </div>
                  <h2 className="text-2xl font-bold">{currentNetwork.name}</h2>
                  {currentNetwork.description && (
                    <p className="text-sm text-muted-foreground mt-0.5">{currentNetwork.description}</p>
                  )}
                  {(currentNetwork.name_servers.length > 0 || currentNetwork.info_refresh_time != null) && (
                    <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                      {currentNetwork.name_servers.length > 0 && (
                        <span>Name Servers: {currentNetwork.name_servers.join(", ")}</span>
                      )}
                      {currentNetwork.info_refresh_time != null && (
                        <span>Refresh: {currentNetwork.info_refresh_time}s</span>
                      )}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {hasWrite && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => { setEditingNetwork(currentNetwork); setNetworkModalOpen(true); }}
                    >
                      <Pencil className="h-4 w-4 mr-1.5" />
                      Edit Network
                    </Button>
                  )}
                  {hasWrite && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => { setDisableError(null); setDisableTarget({ kind: "server", currentlyDisabled: !!config?.disabled }); }}
                      className={cn(
                        config?.disabled
                          ? "border-green-500/50 text-green-600 hover:bg-green-500/10"
                          : "border-muted text-muted-foreground hover:bg-muted"
                      )}
                    >
                      {config?.disabled
                        ? <><Power className="h-4 w-4 mr-1.5" />Enable DHCPv6</>
                        : <><PowerOff className="h-4 w-4 mr-1.5" />Disable DHCPv6</>
                      }
                    </Button>
                  )}
                </div>
              </div>
            </div>

            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
              <div className="border-b border-border px-6">
                <TabsList className="bg-transparent h-12">
                  <TabsTrigger value="subnets" className="data-[state=active]:bg-accent">
                    <Network className="h-4 w-4 mr-2" />
                    Subnets
                    <Badge variant="secondary" className="ml-2">{currentNetwork.subnets.length}</Badge>
                  </TabsTrigger>
                  <TabsTrigger value="ranges" className="data-[state=active]:bg-accent">
                    <Settings2 className="h-4 w-4 mr-2" />
                    Address Ranges
                    <Badge variant="secondary" className="ml-2">{getAllRanges().length}</Badge>
                  </TabsTrigger>
                  <TabsTrigger value="delegation" className="data-[state=active]:bg-accent">
                    <Link2 className="h-4 w-4 mr-2" />
                    Prefix Delegation
                    <Badge variant="secondary" className="ml-2">{getAllPDs().length}</Badge>
                  </TabsTrigger>
                  <TabsTrigger value="static" className="data-[state=active]:bg-accent">
                    <MapPin className="h-4 w-4 mr-2" />
                    Static Mappings
                    <Badge variant="secondary" className="ml-2">{getAllMappings().length}</Badge>
                  </TabsTrigger>
                </TabsList>
              </div>

              {/* ── Subnets Tab ── */}
              <TabsContent value="subnets" className="flex-1 mt-0 overflow-hidden">
                <div className="p-6 h-full flex flex-col">
                  <div className="flex items-center justify-between mb-4">
                    <div className="text-sm text-muted-foreground">
                      {currentNetwork.subnets.length} subnet{currentNetwork.subnets.length !== 1 ? "s" : ""}
                    </div>
                    {hasWrite && (
                      <Button size="sm" onClick={openAddSubnet}>
                        <Plus className="h-4 w-4 mr-2" />
                        Add Subnet
                      </Button>
                    )}
                  </div>
                  <Card className="flex-1 overflow-hidden">
                    <ScrollArea className="h-full">
                      {currentNetwork.subnets.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12">
                          <Network className="h-12 w-12 text-muted-foreground mb-4" />
                          <h3 className="text-lg font-semibold mb-2">No Subnets</h3>
                          <p className="text-sm text-muted-foreground mb-4">Add a subnet to this network</p>
                          {hasWrite && (
                            <Button onClick={openAddSubnet}>
                              <Plus className="h-4 w-4 mr-2" />
                              Add Subnet
                            </Button>
                          )}
                        </div>
                      ) : (
                        <Table>
                          <TableHeader>
                            <TableRow className="hover:bg-transparent">
                              <TableHead>Subnet</TableHead>
                              {caps?.features.subnet_id.supported && <TableHead>ID</TableHead>}
                              <TableHead>Status</TableHead>
                              <TableHead>Lease Default</TableHead>
                              <TableHead>Ranges</TableHead>
                              <TableHead>PD</TableHead>
                              <TableHead>Mappings</TableHead>
                              <TableHead>Name Servers</TableHead>
                              <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {currentNetwork.subnets.map((subnet) => (
                              <TableRow key={subnet.subnet} className="group">
                                <TableCell className="font-mono font-medium">{subnet.subnet}</TableCell>
                                {caps?.features.subnet_id.supported && (
                                  <TableCell>
                                    {subnet.subnet_id != null
                                      ? subnet.subnet_id
                                      : <span className="text-muted-foreground">—</span>}
                                  </TableCell>
                                )}
                                <TableCell>
                                  <Badge
                                    variant="outline"
                                    className={cn(
                                      subnet.disabled
                                        ? "bg-red-500/10 text-red-500 border-red-500/20"
                                        : "bg-green-500/10 text-green-500 border-green-500/20"
                                    )}
                                  >
                                    {subnet.disabled ? "Disabled" : "Active"}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  {subnet.lease_default != null
                                    ? `${subnet.lease_default}s`
                                    : <span className="text-muted-foreground">—</span>}
                                </TableCell>
                                <TableCell>
                                  <Badge variant="outline">{subnet.address_ranges.length}</Badge>
                                </TableCell>
                                <TableCell>
                                  <Badge variant="outline">{subnet.prefix_delegations.length}</Badge>
                                </TableCell>
                                <TableCell>
                                  <Badge variant="outline">{subnet.static_mappings.length}</Badge>
                                </TableCell>
                                <TableCell>
                                  {subnet.options.name_servers.length > 0 ? (
                                    <div className="flex flex-wrap gap-1">
                                      {subnet.options.name_servers.slice(0, 2).map(ns => (
                                        <Badge key={ns} variant="secondary" className="text-xs font-mono">{ns}</Badge>
                                      ))}
                                      {subnet.options.name_servers.length > 2 && (
                                        <Badge variant="secondary" className="text-xs">
                                          +{subnet.options.name_servers.length - 2}
                                        </Badge>
                                      )}
                                    </div>
                                  ) : <span className="text-muted-foreground">—</span>}
                                </TableCell>
                                <TableCell className="text-right">
                                  {hasWrite && (
                                    <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                      <Button
                                        variant="ghost" size="icon" className="h-8 w-8"
                                        onClick={() => openEditSubnet(subnet)}
                                      >
                                        <Pencil className="h-4 w-4" />
                                      </Button>
                                      <Button
                                        variant="ghost" size="icon" className="h-8 w-8 hover:bg-destructive/10"
                                        onClick={() => { setDeleteError(null); setDeleteTarget({ kind: "subnet", subnetCidr: subnet.subnet }); }}
                                      >
                                        <Trash2 className="h-4 w-4 text-destructive" />
                                      </Button>
                                    </div>
                                  )}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      )}
                    </ScrollArea>
                  </Card>
                </div>
              </TabsContent>

              {/* ── Address Ranges Tab ── */}
              <TabsContent value="ranges" className="flex-1 mt-0 overflow-hidden">
                <div className="p-6 h-full flex flex-col">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">Subnet:</span>
                      <Select value={rangeSubnetFilter} onValueChange={setRangeSubnetFilter}>
                        <SelectTrigger className="w-[220px]">
                          <SelectValue placeholder="All Subnets" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Subnets</SelectItem>
                          {allSubnetCidrs.map(s => (
                            <SelectItem key={s} value={s}>{s}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    {hasWrite && (
                      <Button size="sm" onClick={openAddRange} disabled={allSubnetCidrs.length === 0}>
                        <Plus className="h-4 w-4 mr-2" />
                        Add Range
                      </Button>
                    )}
                    <div className="text-sm text-muted-foreground ml-auto">
                      {filteredRanges.length} range{filteredRanges.length !== 1 ? "s" : ""}
                    </div>
                  </div>
                  <Card className="flex-1 overflow-hidden">
                    <ScrollArea className="h-full">
                      {filteredRanges.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12">
                          <Settings2 className="h-12 w-12 text-muted-foreground mb-4" />
                          <h3 className="text-lg font-semibold mb-2">No Address Ranges</h3>
                          <p className="text-sm text-muted-foreground">No address ranges configured</p>
                        </div>
                      ) : (
                        <Table>
                          <TableHeader>
                            <TableRow className="hover:bg-transparent">
                              <TableHead>Subnet</TableHead>
                              {is15 && <TableHead>Range ID</TableHead>}
                              <TableHead>Start</TableHead>
                              <TableHead>Stop</TableHead>
                              <TableHead>Prefix</TableHead>
                              {!is15 && <TableHead>Temporary</TableHead>}
                              <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {filteredRanges.map((r, idx) => (
                              <TableRow key={`${r.subnetCidr}-${r.range_id}-${idx}`} className="group">
                                <TableCell>
                                  <Badge variant="outline" className="font-mono">{r.subnetCidr}</Badge>
                                </TableCell>
                                {is15 && <TableCell className="font-mono">{r.range_id}</TableCell>}
                                <TableCell className="font-mono">
                                  {r.start ?? <span className="text-muted-foreground">—</span>}
                                </TableCell>
                                <TableCell className="font-mono">
                                  {r.stop ?? <span className="text-muted-foreground">—</span>}
                                </TableCell>
                                <TableCell className="font-mono">
                                  {r.prefix ?? <span className="text-muted-foreground">—</span>}
                                </TableCell>
                                {!is15 && (
                                  <TableCell>
                                    {r.temporary
                                      ? <Badge variant="secondary">Yes</Badge>
                                      : <span className="text-muted-foreground">—</span>}
                                  </TableCell>
                                )}
                                <TableCell className="text-right">
                                  {hasWrite && (
                                    <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                      <Button
                                        variant="ghost" size="icon" className="h-8 w-8"
                                        onClick={() => openEditRange(r.subnetCidr, r)}
                                      >
                                        <Pencil className="h-4 w-4" />
                                      </Button>
                                      <Button
                                        variant="ghost" size="icon" className="h-8 w-8 hover:bg-destructive/10"
                                        onClick={() => { setDeleteError(null); setDeleteTarget({ kind: "range", subnetCidr: r.subnetCidr, range: r }); }}
                                      >
                                        <Trash2 className="h-4 w-4 text-destructive" />
                                      </Button>
                                    </div>
                                  )}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      )}
                    </ScrollArea>
                  </Card>
                </div>
              </TabsContent>

              {/* ── Prefix Delegation Tab ── */}
              <TabsContent value="delegation" className="flex-1 mt-0 overflow-hidden">
                <div className="p-6 h-full flex flex-col">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">Subnet:</span>
                      <Select value={pdSubnetFilter} onValueChange={setPdSubnetFilter}>
                        <SelectTrigger className="w-[220px]">
                          <SelectValue placeholder="All Subnets" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Subnets</SelectItem>
                          {allSubnetCidrs.map(s => (
                            <SelectItem key={s} value={s}>{s}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    {hasWrite && (
                      <Button size="sm" onClick={openAddPD} disabled={allSubnetCidrs.length === 0}>
                        <Plus className="h-4 w-4 mr-2" />
                        Add Delegation
                      </Button>
                    )}
                    <div className="text-sm text-muted-foreground ml-auto">
                      {filteredPDs.length} delegation{filteredPDs.length !== 1 ? "s" : ""}
                    </div>
                  </div>
                  <Card className="flex-1 overflow-hidden">
                    <ScrollArea className="h-full">
                      {filteredPDs.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12">
                          <Link2 className="h-12 w-12 text-muted-foreground mb-4" />
                          <h3 className="text-lg font-semibold mb-2">No Prefix Delegations</h3>
                          <p className="text-sm text-muted-foreground">No prefix delegations configured</p>
                        </div>
                      ) : is15 ? (
                        <Table>
                          <TableHeader>
                            <TableRow className="hover:bg-transparent">
                              <TableHead>Subnet</TableHead>
                              <TableHead>Prefix</TableHead>
                              <TableHead>Delegated Len</TableHead>
                              <TableHead>Prefix Len</TableHead>
                              <TableHead>Excluded Prefix</TableHead>
                              <TableHead>Excl. Len</TableHead>
                              <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {filteredPDs.map((pd, idx) => (
                              <TableRow key={`${pd.subnetCidr}-${pd.prefix ?? idx}`} className="group">
                                <TableCell>
                                  <Badge variant="outline" className="font-mono">{pd.subnetCidr}</Badge>
                                </TableCell>
                                <TableCell className="font-mono">
                                  {pd.prefix ?? <span className="text-muted-foreground">—</span>}
                                </TableCell>
                                <TableCell>{pd.delegated_length ?? <span className="text-muted-foreground">—</span>}</TableCell>
                                <TableCell>{pd.prefix_length ?? <span className="text-muted-foreground">—</span>}</TableCell>
                                <TableCell className="font-mono">
                                  {pd.excluded_prefix ?? <span className="text-muted-foreground">—</span>}
                                </TableCell>
                                <TableCell>
                                  {pd.excluded_prefix_length ?? <span className="text-muted-foreground">—</span>}
                                </TableCell>
                                <TableCell className="text-right">
                                  {hasWrite && (
                                    <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                      <Button
                                        variant="ghost" size="icon" className="h-8 w-8"
                                        onClick={() => openEditPD(pd.subnetCidr, pd)}
                                      >
                                        <Pencil className="h-4 w-4" />
                                      </Button>
                                      <Button
                                        variant="ghost" size="icon" className="h-8 w-8 hover:bg-destructive/10"
                                        onClick={() => { setDeleteError(null); setDeleteTarget({ kind: "pd", subnetCidr: pd.subnetCidr, pd }); }}
                                      >
                                        <Trash2 className="h-4 w-4 text-destructive" />
                                      </Button>
                                    </div>
                                  )}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      ) : (
                        <Table>
                          <TableHeader>
                            <TableRow className="hover:bg-transparent">
                              <TableHead>Subnet</TableHead>
                              <TableHead>Start</TableHead>
                              <TableHead>Stop</TableHead>
                              <TableHead>Prefix Length</TableHead>
                              <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {filteredPDs.map((pd, idx) => (
                              <TableRow key={`${pd.subnetCidr}-${pd.start ?? idx}`} className="group">
                                <TableCell>
                                  <Badge variant="outline" className="font-mono">{pd.subnetCidr}</Badge>
                                </TableCell>
                                <TableCell className="font-mono">
                                  {pd.start ?? <span className="text-muted-foreground">—</span>}
                                </TableCell>
                                <TableCell className="font-mono">
                                  {pd.stop ?? <span className="text-muted-foreground">—</span>}
                                </TableCell>
                                <TableCell>
                                  {pd.prefix_length ?? <span className="text-muted-foreground">—</span>}
                                </TableCell>
                                <TableCell className="text-right">
                                  {hasWrite && (
                                    <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                      <Button
                                        variant="ghost" size="icon" className="h-8 w-8"
                                        onClick={() => openEditPD(pd.subnetCidr, pd)}
                                      >
                                        <Pencil className="h-4 w-4" />
                                      </Button>
                                      <Button
                                        variant="ghost" size="icon" className="h-8 w-8 hover:bg-destructive/10"
                                        onClick={() => { setDeleteError(null); setDeleteTarget({ kind: "pd", subnetCidr: pd.subnetCidr, pd }); }}
                                      >
                                        <Trash2 className="h-4 w-4 text-destructive" />
                                      </Button>
                                    </div>
                                  )}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      )}
                    </ScrollArea>
                  </Card>
                </div>
              </TabsContent>

              {/* ── Static Mappings Tab ── */}
              <TabsContent value="static" className="flex-1 mt-0 overflow-hidden">
                <div className="p-6 h-full flex flex-col">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">Subnet:</span>
                      <Select value={staticSubnetFilter} onValueChange={setStaticSubnetFilter}>
                        <SelectTrigger className="w-[220px]">
                          <SelectValue placeholder="All Subnets" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Subnets</SelectItem>
                          {allSubnetCidrs.map(s => (
                            <SelectItem key={s} value={s}>{s}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    {hasWrite && (
                      <Button size="sm" onClick={openAddMapping} disabled={allSubnetCidrs.length === 0}>
                        <Plus className="h-4 w-4 mr-2" />
                        Add Mapping
                      </Button>
                    )}
                    <div className="text-sm text-muted-foreground ml-auto">
                      {filteredMappings.length} mapping{filteredMappings.length !== 1 ? "s" : ""}
                    </div>
                  </div>
                  <Card className="flex-1 overflow-hidden">
                    <ScrollArea className="h-full">
                      {filteredMappings.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12">
                          <MapPin className="h-12 w-12 text-muted-foreground mb-4" />
                          <h3 className="text-lg font-semibold mb-2">No Static Mappings</h3>
                          <p className="text-sm text-muted-foreground">No static IPv6 mappings configured</p>
                        </div>
                      ) : (
                        <Table>
                          <TableHeader>
                            <TableRow className="hover:bg-transparent">
                              <TableHead>Name</TableHead>
                              <TableHead>Subnet</TableHead>
                              <TableHead>
                                {caps?.features.static_mapping_mac.supported ? "DUID" : "Client ID"}
                              </TableHead>
                              {caps?.features.static_mapping_mac.supported && <TableHead>MAC</TableHead>}
                              <TableHead>IPv6 Address</TableHead>
                              <TableHead>IPv6 Prefix</TableHead>
                              <TableHead>Status</TableHead>
                              <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {filteredMappings.map((m, idx) => (
                              <TableRow key={`${m.subnetCidr}-${m.name}-${idx}`} className="group">
                                <TableCell className="font-medium">{m.name}</TableCell>
                                <TableCell>
                                  <Badge variant="outline" className="font-mono">{m.subnetCidr}</Badge>
                                </TableCell>
                                <TableCell className="font-mono text-sm">
                                  {m.duid ?? <span className="text-muted-foreground">—</span>}
                                </TableCell>
                                {caps?.features.static_mapping_mac.supported && (
                                  <TableCell className="font-mono text-sm">
                                    {m.mac ?? <span className="text-muted-foreground">—</span>}
                                  </TableCell>
                                )}
                                <TableCell className="font-mono text-sm">
                                  {m.ipv6_address ?? <span className="text-muted-foreground">—</span>}
                                </TableCell>
                                <TableCell className="font-mono text-sm">
                                  {m.ipv6_prefix ?? <span className="text-muted-foreground">—</span>}
                                </TableCell>
                                <TableCell>
                                  <Badge
                                    variant="outline"
                                    className={cn(
                                      m.disabled
                                        ? "bg-red-500/10 text-red-500 border-red-500/20"
                                        : "bg-green-500/10 text-green-500 border-green-500/20"
                                    )}
                                  >
                                    {m.disabled ? "Disabled" : "Active"}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-right">
                                  {hasWrite && (
                                    <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                      <Button
                                        variant="ghost" size="icon" className="h-8 w-8"
                                        onClick={() => openEditMapping(m.subnetCidr, m)}
                                      >
                                        <Pencil className="h-4 w-4" />
                                      </Button>
                                      <Button
                                        variant="ghost" size="icon" className="h-8 w-8 hover:bg-destructive/10"
                                        onClick={() => { setDeleteError(null); setDeleteTarget({ kind: "mapping", subnetCidr: m.subnetCidr, mapping: m }); }}
                                      >
                                        <Trash2 className="h-4 w-4 text-destructive" />
                                      </Button>
                                    </div>
                                  )}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      )}
                    </ScrollArea>
                  </Card>
                </div>
              </TabsContent>
            </Tabs>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center space-y-4">
              <Server className="h-16 w-16 text-muted-foreground mx-auto" />
              <h2 className="text-xl font-semibold">No DHCPv6 Servers</h2>
              <p className="text-muted-foreground max-w-md">
                Get started by creating your first DHCPv6 server to manage IPv6 address allocation.
              </p>
              {hasWrite && (
                <Button onClick={() => { setEditingNetwork(null); setNetworkModalOpen(true); }}>
                  <Plus className="h-4 w-4 mr-2" />
                  New Server
                </Button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── Delete Confirmation ── */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => { if (!open && !deleteLoading) { setDeleteTarget(null); setDeleteError(null); } }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {deleteTarget?.kind === "network" && `Delete Network "${deleteTarget.name}"?`}
              {deleteTarget?.kind === "subnet" && `Delete Subnet "${deleteTarget.subnetCidr}"?`}
              {deleteTarget?.kind === "range" && "Delete Address Range?"}
              {deleteTarget?.kind === "pd" && "Delete Prefix Delegation?"}
              {deleteTarget?.kind === "mapping" && `Delete Mapping "${deleteTarget.kind === "mapping" ? deleteTarget.mapping.name : ""}"?`}
            </AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone and will remove the configuration from VyOS.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {deleteError && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
              <AlertCircle className="h-4 w-4 text-destructive flex-shrink-0" />
              <p className="text-sm text-destructive">{deleteError}</p>
            </div>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); handleDelete(); }}
              disabled={deleteLoading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteLoading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Disable / Enable Confirmation ── */}
      <Dialog
        open={!!disableTarget}
        onOpenChange={(open) => { if (!open && !disableLoading) { setDisableTarget(null); setDisableError(null); } }}
      >
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>
              {disableTarget?.currentlyDisabled ? "Enable" : "Disable"}{" "}
              {disableTarget?.kind === "server"
                ? "DHCPv6 Server"
                : `Network "${disableTarget?.kind === "network" ? disableTarget.name : ""}"`}
            </DialogTitle>
            <DialogDescription>
              {disableTarget?.kind === "server"
                ? disableTarget.currentlyDisabled
                  ? "This will enable the DHCPv6 server globally."
                  : "This will disable the DHCPv6 server globally. No networks will serve requests until re-enabled."
                : disableTarget?.currentlyDisabled
                  ? `Enable network "${disableTarget?.kind === "network" ? disableTarget.name : ""}"? It will resume serving DHCPv6 requests.`
                  : `Disable network "${disableTarget?.kind === "network" ? disableTarget.name : ""}"? It will stop serving DHCPv6 requests.`
              }
            </DialogDescription>
          </DialogHeader>
          {disableError && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
              <AlertCircle className="h-4 w-4 text-destructive flex-shrink-0" />
              <p className="text-sm text-destructive">{disableError}</p>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => { setDisableTarget(null); setDisableError(null); }}
              disabled={disableLoading}
            >
              Cancel
            </Button>
            <Button
              variant={disableTarget?.currentlyDisabled ? "default" : "destructive"}
              onClick={handleDisableToggle}
              disabled={disableLoading}
            >
              {disableLoading
                ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Processing...</>
                : disableTarget?.currentlyDisabled ? "Enable" : "Disable"
              }
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Modals ── */}
      {config && caps && (
        <DHCPv6ServerGlobalModal
          open={globalModalOpen}
          config={config}
          caps={caps}
          onClose={() => setGlobalModalOpen(false)}
          onSuccess={() => { setGlobalModalOpen(false); fetchData(true); }}
        />
      )}

      {caps && (
        <DHCPv6ServerNetworkModal
          open={networkModalOpen}
          network={editingNetwork}
          caps={caps}
          onClose={() => { setNetworkModalOpen(false); setEditingNetwork(null); }}
          onSuccess={(name) => {
            setNetworkModalOpen(false);
            setEditingNetwork(null);
            setSelectedNetwork(name);
            fetchData(true);
          }}
        />
      )}

      {caps && config && (
        <DHCPv6ServerSubnetModal
          open={subnetModalOpen}
          networks={config.shared_networks}
          preselectedNetName={selectedNetwork}
          subnet={editingSubnet}
          caps={caps}
          onClose={() => { setSubnetModalOpen(false); setEditingSubnet(null); }}
          onSuccess={() => { setSubnetModalOpen(false); setEditingSubnet(null); fetchData(true); }}
        />
      )}

      {caps && selectedNetwork && (
        <>
          <DHCPv6ServerAddressRangeModal
            open={rangeModalOpen}
            netName={selectedNetwork}
            subnetCidr={editingRange?.subnet ?? addingRangeSubnet ?? ""}
            availableSubnets={editingRange ? undefined : allSubnetCidrs}
            allSubnets={currentNetwork?.subnets}
            caps={caps}
            range={editingRange?.range ?? null}
            onClose={() => { setRangeModalOpen(false); setEditingRange(null); setAddingRangeSubnet(null); }}
            onSuccess={() => { setRangeModalOpen(false); setEditingRange(null); setAddingRangeSubnet(null); fetchData(true); }}
          />

          <DHCPv6ServerPrefixDelegationModal
            open={pdModalOpen}
            netName={selectedNetwork}
            subnetCidr={editingPD?.subnet ?? addingPDSubnet ?? ""}
            availableSubnets={editingPD ? undefined : allSubnetCidrs}
            caps={caps}
            pd={editingPD?.pd ?? null}
            onClose={() => { setPdModalOpen(false); setEditingPD(null); setAddingPDSubnet(null); }}
            onSuccess={() => { setPdModalOpen(false); setEditingPD(null); setAddingPDSubnet(null); fetchData(true); }}
          />

          <DHCPv6ServerStaticMappingModal
            open={staticModalOpen}
            netName={selectedNetwork}
            subnetCidr={editingMapping?.subnet ?? addingMappingSubnet ?? ""}
            availableSubnets={editingMapping ? undefined : allSubnetCidrs}
            caps={caps}
            mapping={editingMapping?.mapping ?? null}
            onClose={() => { setStaticModalOpen(false); setEditingMapping(null); setAddingMappingSubnet(null); }}
            onSuccess={() => { setStaticModalOpen(false); setEditingMapping(null); setAddingMappingSubnet(null); fetchData(true); }}
          />
        </>
      )}
    </div>
  );
}
