"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Box,
  Plus,
  RefreshCw,
  Pencil,
  Trash2,
  X,
  Network,
  Users,
  Target,
  Filter,
  Settings2,
  AlertCircle,
} from "lucide-react";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import {
  mplsService,
  MplsConfig,
  MplsCapabilities,
  MplsLdpInterface,
  MplsLdpNeighbor,
  MplsLdpConfig,
  MplsParameters,
} from "@/lib/api/mpls";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MplsLdpInterfaceModal } from "./MplsLdpInterfaceModal";
import { MplsLdpNeighborModal } from "./MplsLdpNeighborModal";
import { MplsLdpTargetedModal } from "./MplsLdpTargetedModal";
import { usePermissions } from "@/hooks/usePermissions";
import { FeatureGroup } from "@/lib/api/user-management";
import { showService } from "@/lib/api/show";

// ============================================================================
// Default empty LDP config used when ldp is null
// ============================================================================

const emptyLdp: MplsLdpConfig = {
  router_id: null,
  interfaces: [],
  neighbors: [],
  discovery: {
    hello_ipv4_holdtime: null,
    hello_ipv4_interval: null,
    hello_ipv6_holdtime: null,
    hello_ipv6_interval: null,
    session_ipv4_holdtime: null,
    session_ipv6_holdtime: null,
    transport_ipv4_address: null,
    transport_ipv6_address: null,
  },
  allocation: { ipv4_access_list: null, ipv6_access_list: null },
  export: {
    ipv4_explicit_null: false,
    ipv4_export_filter: { filter_access_list: null, neighbor_access_list: null },
    ipv6_explicit_null: false,
    ipv6_export_filter: { filter_access_list: null, neighbor_access_list: null },
  },
  ldp_import: {
    ipv4_import_filter: { filter_access_list: null, neighbor_access_list: null },
    ipv6_import_filter: { filter_access_list: null, neighbor_access_list: null },
  },
  targeted_neighbor_ipv4: { enable: false, addresses: [], hello_holdtime: null, hello_interval: null },
  targeted_neighbor_ipv6: { enable: false, addresses: [], hello_holdtime: null, hello_interval: null },
  parameters: { cisco_interop_tlv: false, ordered_control: false, transport_prefer_ipv4: false },
};

// ============================================================================
// Main Component
// ============================================================================

export function MplsContent() {
  const { canWrite } = usePermissions();
  const hasWritePermission = canWrite(FeatureGroup.MPLS);

  const [config, setConfig] = useState<MplsConfig | null>(null);
  const [capabilities, setCapabilities] = useState<MplsCapabilities | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("overview");

  // LDP Interface modal state
  const [ldpIfaceModalOpen, setLdpIfaceModalOpen] = useState(false);
  const [editingLdpIface, setEditingLdpIface] = useState<MplsLdpInterface | null>(null);
  const [deletingLdpIface, setDeletingLdpIface] = useState<string | null>(null);

  // Neighbor modal state
  const [neighborModalOpen, setNeighborModalOpen] = useState(false);
  const [editingNeighbor, setEditingNeighbor] = useState<MplsLdpNeighbor | null>(null);
  const [deletingNeighbor, setDeletingNeighbor] = useState<string | null>(null);

  // Targeted modal state
  const [targetedModalOpen, setTargetedModalOpen] = useState(false);

  // Overview — global interface inline add
  const [availableInterfaces, setAvailableInterfaces] = useState<string[]>([]);
  const [globalIfaceError, setGlobalIfaceError] = useState<string | null>(null);

  // Overview — parameters inline edit
  const [paramsEditing, setParamsEditing] = useState(false);
  const [paramsForm, setParamsForm] = useState<MplsParameters>({ maximum_ttl: null, no_propagate_ttl: false });
  const [paramsSaving, setParamsSaving] = useState(false);
  const [paramsError, setParamsError] = useState<string | null>(null);

  // LDP General inline edit
  const [ldpGeneralEditing, setLdpGeneralEditing] = useState(false);
  const [ldpGeneralForm, setLdpGeneralForm] = useState<MplsLdpConfig>(emptyLdp);
  const [ldpGeneralSaving, setLdpGeneralSaving] = useState(false);
  const [ldpGeneralError, setLdpGeneralError] = useState<string | null>(null);

  // Filters inline edit
  const [filtersEditing, setFiltersEditing] = useState(false);
  const [filtersForm, setFiltersForm] = useState<MplsLdpConfig>(emptyLdp);
  const [filtersSaving, setFiltersSaving] = useState(false);
  const [filtersError, setFiltersError] = useState<string | null>(null);

  // ============================================================================
  // Data Loading
  // ============================================================================

  const loadData = useCallback(async (refresh = false) => {
    try {
      setLoading(true);
      setError(null);
      const [configData, capData] = await Promise.all([
        mplsService.getConfig(refresh),
        mplsService.getCapabilities(),
      ]);
      setConfig(configData);
      setCapabilities(capData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load MPLS configuration");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Load available system interfaces once on mount
  useEffect(() => {
    showService.getAllInterfaces().then((res) => {
      setAvailableInterfaces(res.interfaces.map((i) => i.name).sort());
    }).catch(() => {
      // Non-fatal — dropdown will just be empty
    });
  }, []);

  // Sync form state when config changes
  useEffect(() => {
    if (config) {
      setParamsForm({ ...config.parameters });
      const ldp = config.ldp ?? emptyLdp;
      setLdpGeneralForm({ ...ldp });
      setFiltersForm({ ...ldp });
    }
  }, [config]);

  // ============================================================================
  // Stats
  // ============================================================================

  const globalIfaceCount = config?.interfaces.length ?? 0;
  const ldpIfaceCount = config?.ldp?.interfaces.length ?? 0;
  const neighborCount = config?.ldp?.neighbors.length ?? 0;
  const targetedCount =
    (config?.ldp?.targeted_neighbor_ipv4.addresses.length ?? 0) +
    (config?.ldp?.targeted_neighbor_ipv6.addresses.length ?? 0);

  const ldp = config?.ldp ?? emptyLdp;

  // ============================================================================
  // Global Interface Handlers
  // ============================================================================

  const handleAddGlobalIface = async (iface: string) => {
    setGlobalIfaceError(null);
    try {
      await mplsService.setGlobalInterface(iface);
      await loadData(true);
    } catch (err: unknown) {
      setGlobalIfaceError(err instanceof Error ? err.message : "Failed to add interface");
    }
  };

  const handleDeleteGlobalIface = async (iface: string) => {
    try {
      await mplsService.deleteGlobalInterface(iface);
      await loadData(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to remove interface");
    }
  };

  // ============================================================================
  // Parameters Handlers
  // ============================================================================

  const handleSaveParams = async () => {
    if (!config) return;
    setParamsSaving(true);
    setParamsError(null);
    try {
      await mplsService.updateParameters(config.parameters, paramsForm);
      setParamsEditing(false);
      await loadData(true);
    } catch (err: unknown) {
      setParamsError(err instanceof Error ? err.message : "Failed to save parameters");
    } finally {
      setParamsSaving(false);
    }
  };

  // ============================================================================
  // LDP Interface Handlers
  // ============================================================================

  const handleCreateLdpIface = async (iface: MplsLdpInterface) => {
    await mplsService.createLdpInterface(iface);
    await loadData(true);
  };

  const handleUpdateLdpIface = async (iface: MplsLdpInterface) => {
    if (!editingLdpIface) return;
    await mplsService.updateLdpInterface(editingLdpIface, iface);
    setEditingLdpIface(null);
    await loadData(true);
  };

  const handleDeleteLdpIface = async (name: string) => {
    try {
      await mplsService.deleteLdpInterface(name);
      setDeletingLdpIface(null);
      await loadData(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to delete LDP interface");
    }
  };

  // ============================================================================
  // Neighbor Handlers
  // ============================================================================

  const handleCreateNeighbor = async (neighbor: MplsLdpNeighbor) => {
    await mplsService.createLdpNeighbor(neighbor);
    await loadData(true);
  };

  const handleUpdateNeighbor = async (neighbor: MplsLdpNeighbor) => {
    if (!editingNeighbor) return;
    await mplsService.updateLdpNeighbor(editingNeighbor, neighbor);
    setEditingNeighbor(null);
    await loadData(true);
  };

  const handleDeleteNeighbor = async (address: string) => {
    try {
      await mplsService.deleteLdpNeighbor(address);
      setDeletingNeighbor(null);
      await loadData(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to delete LDP neighbor");
    }
  };

  // ============================================================================
  // LDP General Handlers
  // ============================================================================

  const handleSaveLdpGeneral = async () => {
    setLdpGeneralSaving(true);
    setLdpGeneralError(null);
    try {
      await mplsService.updateLdpGeneral(ldp, ldpGeneralForm);
      setLdpGeneralEditing(false);
      await loadData(true);
    } catch (err: unknown) {
      setLdpGeneralError(err instanceof Error ? err.message : "Failed to save LDP general settings");
    } finally {
      setLdpGeneralSaving(false);
    }
  };

  // ============================================================================
  // Filters Handlers
  // ============================================================================

  const handleSaveFilters = async () => {
    setFiltersSaving(true);
    setFiltersError(null);
    try {
      await mplsService.updateLdpFilters(ldp, filtersForm);
      setFiltersEditing(false);
      await loadData(true);
    } catch (err: unknown) {
      setFiltersError(err instanceof Error ? err.message : "Failed to save LDP filters");
    } finally {
      setFiltersSaving(false);
    }
  };

  // ============================================================================
  // Targeted Neighbor Handlers
  // ============================================================================

  const handleSaveTargeted = async (
    updated: Pick<MplsLdpConfig, "targeted_neighbor_ipv4" | "targeted_neighbor_ipv6">
  ) => {
    const nextLdp = { ...ldp, ...updated };
    await mplsService.updateTargetedNeighbors(ldp, nextLdp);
    await loadData(true);
  };

  // ============================================================================
  // Render
  // ============================================================================

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <LoadingSpinner />
      </div>
    );
  }

  if (error && !config) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <p className="text-destructive">{error}</p>
        <Button variant="outline" onClick={() => loadData()}>
          Retry
        </Button>
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="p-6 pb-4 border-b border-border">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold text-foreground">MPLS</h1>
                {!hasWritePermission && (
                  <Badge variant="secondary" className="text-xs">Read Only</Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                Multiprotocol Label Switching and Label Distribution Protocol
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={() => loadData(true)}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-md bg-destructive/10 text-destructive text-sm">
              {error}
            </div>
          )}

          {/* Stats */}
          <div className="grid grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-md p-2 bg-primary/10">
                    <Box className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{globalIfaceCount}</p>
                    <p className="text-xs text-muted-foreground">MPLS Interfaces</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-md p-2 bg-blue-500/10">
                    <Network className="h-4 w-4 text-blue-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{ldpIfaceCount}</p>
                    <p className="text-xs text-muted-foreground">LDP Interfaces</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-md p-2 bg-green-500/10">
                    <Users className="h-4 w-4 text-green-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{neighborCount}</p>
                    <p className="text-xs text-muted-foreground">LDP Neighbors</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-md p-2 bg-orange-500/10">
                    <Target className="h-4 w-4 text-orange-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{targetedCount}</p>
                    <p className="text-xs text-muted-foreground">Targeted Sessions</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Tabs Content */}
        <div className="flex-1 p-6 pt-4 overflow-auto">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-4">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="ldp-interfaces">
                LDP Interfaces
                {ldpIfaceCount > 0 && (
                  <Badge variant="secondary" className="ml-2">{ldpIfaceCount}</Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="neighbors">
                Neighbors
                {neighborCount > 0 && (
                  <Badge variant="secondary" className="ml-2">{neighborCount}</Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="ldp-general">LDP General</TabsTrigger>
              <TabsTrigger value="filters">Filters</TabsTrigger>
              <TabsTrigger value="targeted">
                Targeted
                {targetedCount > 0 && (
                  <Badge variant="secondary" className="ml-2">{targetedCount}</Badge>
                )}
              </TabsTrigger>
            </TabsList>

            {/* ============================================================ */}
            {/* Overview Tab */}
            {/* ============================================================ */}
            <TabsContent value="overview" className="space-y-4">
              {/* Global MPLS Interfaces */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">MPLS-Enabled Interfaces</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex flex-wrap gap-2 min-h-[36px]">
                    {config?.interfaces.map((iface) => (
                      <Badge key={iface} variant="secondary" className="gap-1 font-mono text-sm">
                        {iface}
                        {hasWritePermission && (
                          <button
                            onClick={() => handleDeleteGlobalIface(iface)}
                            className="ml-1 hover:text-destructive transition-colors"
                            aria-label={`Remove ${iface}`}
                          >
                            <X className="h-3 w-3" />
                          </button>
                        )}
                      </Badge>
                    ))}
                    {globalIfaceCount === 0 && (
                      <span className="text-sm text-muted-foreground">No MPLS interfaces configured</span>
                    )}
                  </div>

                  {hasWritePermission && (() => {
                    const unenabledInterfaces = availableInterfaces.filter(
                      (i) => !config?.interfaces.includes(i)
                    );
                    return unenabledInterfaces.length > 0 ? (
                      <Select onValueChange={handleAddGlobalIface}>
                        <SelectTrigger className="max-w-xs">
                          <SelectValue placeholder="Add interface..." />
                        </SelectTrigger>
                        <SelectContent>
                          {unenabledInterfaces.map((iface) => (
                            <SelectItem key={iface} value={iface}>
                              {iface}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : availableInterfaces.length > 0 ? (
                      <p className="text-xs text-muted-foreground">All available interfaces are already enabled</p>
                    ) : null;
                  })()}
                  {globalIfaceError && (
                    <p className="text-sm text-destructive">{globalIfaceError}</p>
                  )}
                </CardContent>
              </Card>

              {/* Parameters */}
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">MPLS Parameters</CardTitle>
                    {hasWritePermission && !paramsEditing && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setParamsForm({ ...config!.parameters });
                          setParamsEditing(true);
                        }}
                      >
                        <Pencil className="h-4 w-4 mr-1" />
                        Edit
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  {paramsEditing ? (
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="params-max-ttl">Maximum TTL</Label>
                        <Input
                          id="params-max-ttl"
                          type="number"
                          min={1}
                          max={255}
                          value={paramsForm.maximum_ttl ?? ""}
                          onChange={(e) =>
                            setParamsForm({
                              ...paramsForm,
                              maximum_ttl: e.target.value ? parseInt(e.target.value, 10) : null,
                            })
                          }
                          placeholder="Default (255)"
                          className="max-w-xs"
                        />
                      </div>

                      <div className="flex items-center gap-3">
                        <Checkbox
                          id="params-no-prop-ttl"
                          checked={paramsForm.no_propagate_ttl}
                          onCheckedChange={(checked) =>
                            setParamsForm({ ...paramsForm, no_propagate_ttl: checked === true })
                          }
                        />
                        <Label htmlFor="params-no-prop-ttl" className="cursor-pointer">
                          No Propagate TTL
                        </Label>
                      </div>

                      {paramsError && (
                        <div className="flex items-start gap-2 rounded-lg bg-destructive/10 border border-destructive/20 p-3">
                          <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                          <p className="text-sm text-destructive whitespace-pre-wrap">{paramsError}</p>
                        </div>
                      )}

                      <div className="flex gap-2">
                        <Button size="sm" onClick={handleSaveParams} disabled={paramsSaving}>
                          {paramsSaving ? "Saving..." : "Save"}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => { setParamsEditing(false); setParamsError(null); }}
                          disabled={paramsSaving}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <dl className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
                      <dt className="text-muted-foreground">Maximum TTL</dt>
                      <dd className="font-medium">
                        {config?.parameters.maximum_ttl ?? <span className="text-muted-foreground">Default (255)</span>}
                      </dd>
                      <dt className="text-muted-foreground">No Propagate TTL</dt>
                      <dd className="font-medium">
                        {config?.parameters.no_propagate_ttl ? (
                          <Badge variant="secondary">Enabled</Badge>
                        ) : (
                          <span className="text-muted-foreground">Disabled</span>
                        )}
                      </dd>
                    </dl>
                  )}
                </CardContent>
              </Card>

              {/* LDP Summary */}
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">LDP Summary</CardTitle>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setActiveTab("ldp-general")}
                    >
                      Configure LDP
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {config?.ldp ? (
                    <dl className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
                      <dt className="text-muted-foreground">Router ID</dt>
                      <dd className="font-mono font-medium">
                        {ldp.router_id ?? <span className="text-muted-foreground font-sans font-normal">Not set</span>}
                      </dd>
                      <dt className="text-muted-foreground">Transport IPv4</dt>
                      <dd className="font-mono font-medium">
                        {ldp.discovery.transport_ipv4_address ?? <span className="text-muted-foreground font-sans font-normal">Not set</span>}
                      </dd>
                      <dt className="text-muted-foreground">Transport IPv6</dt>
                      <dd className="font-mono font-medium">
                        {ldp.discovery.transport_ipv6_address ?? <span className="text-muted-foreground font-sans font-normal">Not set</span>}
                      </dd>
                      <dt className="text-muted-foreground">Cisco Interop TLV</dt>
                      <dd>{ldp.parameters.cisco_interop_tlv ? <Badge variant="secondary">On</Badge> : <span className="text-muted-foreground">Off</span>}</dd>
                      <dt className="text-muted-foreground">Ordered Control</dt>
                      <dd>{ldp.parameters.ordered_control ? <Badge variant="secondary">On</Badge> : <span className="text-muted-foreground">Off</span>}</dd>
                      <dt className="text-muted-foreground">Transport Prefer IPv4</dt>
                      <dd>{ldp.parameters.transport_prefer_ipv4 ? <Badge variant="secondary">On</Badge> : <span className="text-muted-foreground">Off</span>}</dd>
                    </dl>
                  ) : (
                    <p className="text-sm text-muted-foreground">LDP is not configured. Add an LDP interface to get started.</p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* ============================================================ */}
            {/* LDP Interfaces Tab */}
            {/* ============================================================ */}
            <TabsContent value="ldp-interfaces">
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm text-muted-foreground">
                  Interfaces participating in LDP neighbor discovery
                </p>
                {hasWritePermission && (
                  <Button size="sm" onClick={() => { setEditingLdpIface(null); setLdpIfaceModalOpen(true); }}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Interface
                  </Button>
                )}
              </div>

              {ldpIfaceCount === 0 ? (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <Network className="h-12 w-12 text-muted-foreground/30 mb-4" />
                    <p className="text-sm text-muted-foreground mb-2">No LDP interfaces configured</p>
                    <p className="text-xs text-muted-foreground mb-4">
                      Add an interface to enable LDP neighbor discovery
                    </p>
                    {hasWritePermission && (
                      <Button size="sm" onClick={() => { setEditingLdpIface(null); setLdpIfaceModalOpen(true); }}>
                        <Plus className="h-4 w-4 mr-2" />
                        Add Interface
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <ScrollArea>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Interface</TableHead>
                          <TableHead>Disable Hello</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {ldp.interfaces.map((iface) => (
                          <TableRow key={iface.name}>
                            <TableCell className="font-mono font-medium">{iface.name}</TableCell>
                            <TableCell>
                              {iface.disable_establish_hello ? (
                                <Badge variant="secondary" className="bg-yellow-500/10 text-yellow-600">
                                  Disabled
                                </Badge>
                              ) : (
                                <span className="text-muted-foreground text-sm">Enabled</span>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              {hasWritePermission && (
                                <div className="flex items-center justify-end gap-1">
                                  {deletingLdpIface === iface.name ? (
                                    <>
                                      <Button
                                        variant="destructive"
                                        size="sm"
                                        onClick={() => handleDeleteLdpIface(iface.name)}
                                      >
                                        Confirm Delete
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => setDeletingLdpIface(null)}
                                      >
                                        Cancel
                                      </Button>
                                    </>
                                  ) : (
                                    <>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8"
                                        onClick={() => {
                                          setEditingLdpIface(iface);
                                          setLdpIfaceModalOpen(true);
                                        }}
                                      >
                                        <Pencil className="h-4 w-4" />
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 text-destructive hover:text-destructive"
                                        onClick={() => setDeletingLdpIface(iface.name)}
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </>
                                  )}
                                </div>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                </Card>
              )}
            </TabsContent>

            {/* ============================================================ */}
            {/* Neighbors Tab */}
            {/* ============================================================ */}
            <TabsContent value="neighbors">
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm text-muted-foreground">
                  Per-neighbor LDP session settings
                </p>
                {hasWritePermission && (
                  <Button size="sm" onClick={() => { setEditingNeighbor(null); setNeighborModalOpen(true); }}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Neighbor
                  </Button>
                )}
              </div>

              {neighborCount === 0 ? (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <Users className="h-12 w-12 text-muted-foreground/30 mb-4" />
                    <p className="text-sm text-muted-foreground mb-2">No LDP neighbors configured</p>
                    <p className="text-xs text-muted-foreground mb-4">
                      Configure neighbor-specific settings like passwords and holdtimes
                    </p>
                    {hasWritePermission && (
                      <Button size="sm" onClick={() => { setEditingNeighbor(null); setNeighborModalOpen(true); }}>
                        <Plus className="h-4 w-4 mr-2" />
                        Add Neighbor
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <ScrollArea>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Peer Address</TableHead>
                          <TableHead>Session Holdtime</TableHead>
                          <TableHead>TTL Security</TableHead>
                          <TableHead>Password</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {ldp.neighbors.map((neighbor) => (
                          <TableRow key={neighbor.address}>
                            <TableCell className="font-mono font-medium">{neighbor.address}</TableCell>
                            <TableCell>
                              {neighbor.session_holdtime != null ? (
                                <span className="font-mono text-sm">{neighbor.session_holdtime}s</span>
                              ) : (
                                <span className="text-muted-foreground text-sm">Default</span>
                              )}
                            </TableCell>
                            <TableCell>
                              {neighbor.ttl_security ? (
                                <Badge variant="outline" className="font-mono text-xs">
                                  {neighbor.ttl_security}
                                </Badge>
                              ) : (
                                <span className="text-muted-foreground text-sm">-</span>
                              )}
                            </TableCell>
                            <TableCell>
                              {neighbor.password ? (
                                <span className="text-sm">••••••••</span>
                              ) : (
                                <span className="text-muted-foreground text-sm">None</span>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              {hasWritePermission && (
                                <div className="flex items-center justify-end gap-1">
                                  {deletingNeighbor === neighbor.address ? (
                                    <>
                                      <Button
                                        variant="destructive"
                                        size="sm"
                                        onClick={() => handleDeleteNeighbor(neighbor.address)}
                                      >
                                        Confirm Delete
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => setDeletingNeighbor(null)}
                                      >
                                        Cancel
                                      </Button>
                                    </>
                                  ) : (
                                    <>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8"
                                        onClick={() => {
                                          setEditingNeighbor(neighbor);
                                          setNeighborModalOpen(true);
                                        }}
                                      >
                                        <Pencil className="h-4 w-4" />
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 text-destructive hover:text-destructive"
                                        onClick={() => setDeletingNeighbor(neighbor.address)}
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </>
                                  )}
                                </div>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                </Card>
              )}
            </TabsContent>

            {/* ============================================================ */}
            {/* LDP General Tab */}
            {/* ============================================================ */}
            <TabsContent value="ldp-general">
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm text-muted-foreground">
                  LDP router ID, discovery timers, transport addresses, and protocol parameters
                </p>
                {hasWritePermission && !ldpGeneralEditing && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setLdpGeneralForm({ ...ldp });
                      setLdpGeneralEditing(true);
                    }}
                  >
                    <Pencil className="h-4 w-4 mr-2" />
                    Edit
                  </Button>
                )}
              </div>

              <div className="space-y-4">
                {/* Router ID */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                      Router ID
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {ldpGeneralEditing ? (
                      <div className="space-y-2">
                        <Label htmlFor="ldp-router-id">Router ID</Label>
                        <Input
                          id="ldp-router-id"
                          value={ldpGeneralForm.router_id ?? ""}
                          onChange={(e) =>
                            setLdpGeneralForm({
                              ...ldpGeneralForm,
                              router_id: e.target.value || null,
                            })
                          }
                          placeholder="e.g. 10.0.0.1"
                          className="max-w-xs font-mono"
                        />
                      </div>
                    ) : (
                      <p className="font-mono text-sm">
                        {ldp.router_id ?? <span className="text-muted-foreground font-sans">Not configured</span>}
                      </p>
                    )}
                  </CardContent>
                </Card>

                {/* Discovery */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                      Discovery Timers &amp; Transport Addresses
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {ldpGeneralEditing ? (
                      <div className="grid grid-cols-2 gap-4">
                        {[
                          { label: "Hello IPv4 Holdtime (s)", key: "hello_ipv4_holdtime" as const },
                          { label: "Hello IPv4 Interval (s)", key: "hello_ipv4_interval" as const },
                          { label: "Hello IPv6 Holdtime (s)", key: "hello_ipv6_holdtime" as const },
                          { label: "Hello IPv6 Interval (s)", key: "hello_ipv6_interval" as const },
                          { label: "Session IPv4 Holdtime (s)", key: "session_ipv4_holdtime" as const },
                          { label: "Session IPv6 Holdtime (s)", key: "session_ipv6_holdtime" as const },
                        ].map(({ label, key }) => (
                          <div key={key} className="space-y-1">
                            <Label className="text-xs">{label}</Label>
                            <Input
                              type="number"
                              min={0}
                              value={ldpGeneralForm.discovery[key] ?? ""}
                              onChange={(e) =>
                                setLdpGeneralForm({
                                  ...ldpGeneralForm,
                                  discovery: {
                                    ...ldpGeneralForm.discovery,
                                    [key]: e.target.value ? parseInt(e.target.value, 10) : null,
                                  },
                                })
                              }
                              placeholder="Default"
                            />
                          </div>
                        ))}
                        <div className="space-y-1">
                          <Label className="text-xs">Transport IPv4 Address</Label>
                          <Input
                            value={ldpGeneralForm.discovery.transport_ipv4_address ?? ""}
                            onChange={(e) =>
                              setLdpGeneralForm({
                                ...ldpGeneralForm,
                                discovery: {
                                  ...ldpGeneralForm.discovery,
                                  transport_ipv4_address: e.target.value || null,
                                },
                              })
                            }
                            placeholder="e.g. 10.0.0.1"
                            className="font-mono"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Transport IPv6 Address</Label>
                          <Input
                            value={ldpGeneralForm.discovery.transport_ipv6_address ?? ""}
                            onChange={(e) =>
                              setLdpGeneralForm({
                                ...ldpGeneralForm,
                                discovery: {
                                  ...ldpGeneralForm.discovery,
                                  transport_ipv6_address: e.target.value || null,
                                },
                              })
                            }
                            placeholder="e.g. 2001:db8::1"
                            className="font-mono"
                          />
                        </div>
                      </div>
                    ) : (
                      <dl className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
                        {[
                          ["Hello IPv4 Holdtime", ldp.discovery.hello_ipv4_holdtime, "s"],
                          ["Hello IPv4 Interval", ldp.discovery.hello_ipv4_interval, "s"],
                          ["Hello IPv6 Holdtime", ldp.discovery.hello_ipv6_holdtime, "s"],
                          ["Hello IPv6 Interval", ldp.discovery.hello_ipv6_interval, "s"],
                          ["Session IPv4 Holdtime", ldp.discovery.session_ipv4_holdtime, "s"],
                          ["Session IPv6 Holdtime", ldp.discovery.session_ipv6_holdtime, "s"],
                          ["Transport IPv4", ldp.discovery.transport_ipv4_address, ""],
                          ["Transport IPv6", ldp.discovery.transport_ipv6_address, ""],
                        ].map(([label, val, unit]) => (
                          <>
                            <dt key={`dt-${label}`} className="text-muted-foreground">{label}</dt>
                            <dd key={`dd-${label}`} className="font-medium font-mono">
                              {val != null ? `${val}${unit}` : <span className="font-sans font-normal text-muted-foreground">Default</span>}
                            </dd>
                          </>
                        ))}
                      </dl>
                    )}
                  </CardContent>
                </Card>

                {/* LDP Parameters */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                      LDP Parameters
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {ldpGeneralEditing ? (
                      <div className="space-y-3">
                        {[
                          { key: "cisco_interop_tlv" as const, label: "Cisco Interop TLV", desc: "Enable Cisco-specific LDP interoperability TLV" },
                          { key: "ordered_control" as const, label: "Ordered Control", desc: "Use ordered label distribution control" },
                          { key: "transport_prefer_ipv4" as const, label: "Transport Prefer IPv4", desc: "Prefer IPv4 transport over IPv6" },
                        ].map(({ key, label, desc }) => (
                          <div key={key} className="flex items-center gap-3">
                            <Checkbox
                              id={`ldp-param-${key}`}
                              checked={ldpGeneralForm.parameters[key]}
                              onCheckedChange={(checked) =>
                                setLdpGeneralForm({
                                  ...ldpGeneralForm,
                                  parameters: {
                                    ...ldpGeneralForm.parameters,
                                    [key]: checked === true,
                                  },
                                })
                              }
                            />
                            <div className="space-y-0.5">
                              <Label htmlFor={`ldp-param-${key}`} className="cursor-pointer">{label}</Label>
                              <p className="text-xs text-muted-foreground">{desc}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <dl className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
                        <dt className="text-muted-foreground">Cisco Interop TLV</dt>
                        <dd>{ldp.parameters.cisco_interop_tlv ? <Badge variant="secondary">Enabled</Badge> : <span className="text-muted-foreground">Disabled</span>}</dd>
                        <dt className="text-muted-foreground">Ordered Control</dt>
                        <dd>{ldp.parameters.ordered_control ? <Badge variant="secondary">Enabled</Badge> : <span className="text-muted-foreground">Disabled</span>}</dd>
                        <dt className="text-muted-foreground">Transport Prefer IPv4</dt>
                        <dd>{ldp.parameters.transport_prefer_ipv4 ? <Badge variant="secondary">Enabled</Badge> : <span className="text-muted-foreground">Disabled</span>}</dd>
                      </dl>
                    )}
                  </CardContent>
                </Card>

                {ldpGeneralEditing && (
                  <>
                    {ldpGeneralError && (
                      <div className="flex items-start gap-2 rounded-lg bg-destructive/10 border border-destructive/20 p-3">
                        <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                        <p className="text-sm text-destructive whitespace-pre-wrap">{ldpGeneralError}</p>
                      </div>
                    )}
                    <div className="flex gap-2">
                      <Button onClick={handleSaveLdpGeneral} disabled={ldpGeneralSaving}>
                        {ldpGeneralSaving ? "Saving..." : "Save Changes"}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => { setLdpGeneralEditing(false); setLdpGeneralError(null); }}
                        disabled={ldpGeneralSaving}
                      >
                        Cancel
                      </Button>
                    </div>
                  </>
                )}
              </div>
            </TabsContent>

            {/* ============================================================ */}
            {/* Filters Tab */}
            {/* ============================================================ */}
            <TabsContent value="filters">
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm text-muted-foreground">
                  LDP FEC allocation, export, and import filtering via access-lists
                </p>
                {hasWritePermission && !filtersEditing && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setFiltersForm({ ...ldp });
                      setFiltersEditing(true);
                    }}
                  >
                    <Pencil className="h-4 w-4 mr-2" />
                    Edit
                  </Button>
                )}
              </div>

              <div className="space-y-4">
                {/* Allocation */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                      <Filter className="h-4 w-4" />
                      Allocation
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {filtersEditing ? (
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <Label className="text-xs">IPv4 Access List</Label>
                          <Input
                            value={filtersForm.allocation.ipv4_access_list ?? ""}
                            onChange={(e) =>
                              setFiltersForm({
                                ...filtersForm,
                                allocation: { ...filtersForm.allocation, ipv4_access_list: e.target.value || null },
                              })
                            }
                            placeholder="ACL name or number"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">IPv6 Access List</Label>
                          <Input
                            value={filtersForm.allocation.ipv6_access_list ?? ""}
                            onChange={(e) =>
                              setFiltersForm({
                                ...filtersForm,
                                allocation: { ...filtersForm.allocation, ipv6_access_list: e.target.value || null },
                              })
                            }
                            placeholder="ACL name or number"
                          />
                        </div>
                      </div>
                    ) : (
                      <dl className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
                        <dt className="text-muted-foreground">IPv4 Access List</dt>
                        <dd className="font-mono font-medium">{ldp.allocation.ipv4_access_list ?? <span className="font-sans font-normal text-muted-foreground">None</span>}</dd>
                        <dt className="text-muted-foreground">IPv6 Access List</dt>
                        <dd className="font-mono font-medium">{ldp.allocation.ipv6_access_list ?? <span className="font-sans font-normal text-muted-foreground">None</span>}</dd>
                      </dl>
                    )}
                  </CardContent>
                </Card>

                {/* Export */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                      <Filter className="h-4 w-4" />
                      Export
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {filtersEditing ? (
                      <div className="space-y-4">
                        <div className="space-y-3">
                          <p className="text-xs font-semibold text-muted-foreground">IPv4</p>
                          <div className="flex items-center gap-3">
                            <Checkbox
                              id="export-ipv4-explicit-null"
                              checked={filtersForm.export.ipv4_explicit_null}
                              onCheckedChange={(checked) =>
                                setFiltersForm({
                                  ...filtersForm,
                                  export: { ...filtersForm.export, ipv4_explicit_null: checked === true },
                                })
                              }
                            />
                            <Label htmlFor="export-ipv4-explicit-null" className="cursor-pointer">IPv4 Explicit Null</Label>
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                              <Label className="text-xs">Filter Access List</Label>
                              <Input
                                value={filtersForm.export.ipv4_export_filter.filter_access_list ?? ""}
                                onChange={(e) =>
                                  setFiltersForm({
                                    ...filtersForm,
                                    export: {
                                      ...filtersForm.export,
                                      ipv4_export_filter: {
                                        ...filtersForm.export.ipv4_export_filter,
                                        filter_access_list: e.target.value || null,
                                      },
                                    },
                                  })
                                }
                                placeholder="ACL name"
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">Neighbor Access List</Label>
                              <Input
                                value={filtersForm.export.ipv4_export_filter.neighbor_access_list ?? ""}
                                onChange={(e) =>
                                  setFiltersForm({
                                    ...filtersForm,
                                    export: {
                                      ...filtersForm.export,
                                      ipv4_export_filter: {
                                        ...filtersForm.export.ipv4_export_filter,
                                        neighbor_access_list: e.target.value || null,
                                      },
                                    },
                                  })
                                }
                                placeholder="ACL name"
                              />
                            </div>
                          </div>
                        </div>

                        <div className="space-y-3">
                          <p className="text-xs font-semibold text-muted-foreground">IPv6</p>
                          <div className="flex items-center gap-3">
                            <Checkbox
                              id="export-ipv6-explicit-null"
                              checked={filtersForm.export.ipv6_explicit_null}
                              onCheckedChange={(checked) =>
                                setFiltersForm({
                                  ...filtersForm,
                                  export: { ...filtersForm.export, ipv6_explicit_null: checked === true },
                                })
                              }
                            />
                            <Label htmlFor="export-ipv6-explicit-null" className="cursor-pointer">IPv6 Explicit Null</Label>
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                              <Label className="text-xs">Filter Access List</Label>
                              <Input
                                value={filtersForm.export.ipv6_export_filter.filter_access_list ?? ""}
                                onChange={(e) =>
                                  setFiltersForm({
                                    ...filtersForm,
                                    export: {
                                      ...filtersForm.export,
                                      ipv6_export_filter: {
                                        ...filtersForm.export.ipv6_export_filter,
                                        filter_access_list: e.target.value || null,
                                      },
                                    },
                                  })
                                }
                                placeholder="ACL name"
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">Neighbor Access List</Label>
                              <Input
                                value={filtersForm.export.ipv6_export_filter.neighbor_access_list ?? ""}
                                onChange={(e) =>
                                  setFiltersForm({
                                    ...filtersForm,
                                    export: {
                                      ...filtersForm.export,
                                      ipv6_export_filter: {
                                        ...filtersForm.export.ipv6_export_filter,
                                        neighbor_access_list: e.target.value || null,
                                      },
                                    },
                                  })
                                }
                                placeholder="ACL name"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <dl className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
                        <dt className="text-muted-foreground">IPv4 Explicit Null</dt>
                        <dd>{ldp.export.ipv4_explicit_null ? <Badge variant="secondary">Enabled</Badge> : <span className="text-muted-foreground">Disabled</span>}</dd>
                        <dt className="text-muted-foreground">IPv4 Filter ACL</dt>
                        <dd className="font-mono font-medium">{ldp.export.ipv4_export_filter.filter_access_list ?? <span className="font-sans font-normal text-muted-foreground">None</span>}</dd>
                        <dt className="text-muted-foreground">IPv4 Neighbor ACL</dt>
                        <dd className="font-mono font-medium">{ldp.export.ipv4_export_filter.neighbor_access_list ?? <span className="font-sans font-normal text-muted-foreground">None</span>}</dd>
                        <dt className="text-muted-foreground">IPv6 Explicit Null</dt>
                        <dd>{ldp.export.ipv6_explicit_null ? <Badge variant="secondary">Enabled</Badge> : <span className="text-muted-foreground">Disabled</span>}</dd>
                        <dt className="text-muted-foreground">IPv6 Filter ACL</dt>
                        <dd className="font-mono font-medium">{ldp.export.ipv6_export_filter.filter_access_list ?? <span className="font-sans font-normal text-muted-foreground">None</span>}</dd>
                        <dt className="text-muted-foreground">IPv6 Neighbor ACL</dt>
                        <dd className="font-mono font-medium">{ldp.export.ipv6_export_filter.neighbor_access_list ?? <span className="font-sans font-normal text-muted-foreground">None</span>}</dd>
                      </dl>
                    )}
                  </CardContent>
                </Card>

                {/* Import */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                      <Filter className="h-4 w-4" />
                      Import
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {filtersEditing ? (
                      <div className="space-y-4">
                        <div className="space-y-3">
                          <p className="text-xs font-semibold text-muted-foreground">IPv4</p>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                              <Label className="text-xs">Filter Access List</Label>
                              <Input
                                value={filtersForm.ldp_import.ipv4_import_filter.filter_access_list ?? ""}
                                onChange={(e) =>
                                  setFiltersForm({
                                    ...filtersForm,
                                    ldp_import: {
                                      ...filtersForm.ldp_import,
                                      ipv4_import_filter: {
                                        ...filtersForm.ldp_import.ipv4_import_filter,
                                        filter_access_list: e.target.value || null,
                                      },
                                    },
                                  })
                                }
                                placeholder="ACL name"
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">Neighbor Access List</Label>
                              <Input
                                value={filtersForm.ldp_import.ipv4_import_filter.neighbor_access_list ?? ""}
                                onChange={(e) =>
                                  setFiltersForm({
                                    ...filtersForm,
                                    ldp_import: {
                                      ...filtersForm.ldp_import,
                                      ipv4_import_filter: {
                                        ...filtersForm.ldp_import.ipv4_import_filter,
                                        neighbor_access_list: e.target.value || null,
                                      },
                                    },
                                  })
                                }
                                placeholder="ACL name"
                              />
                            </div>
                          </div>
                        </div>

                        <div className="space-y-3">
                          <p className="text-xs font-semibold text-muted-foreground">IPv6</p>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                              <Label className="text-xs">Filter Access List</Label>
                              <Input
                                value={filtersForm.ldp_import.ipv6_import_filter.filter_access_list ?? ""}
                                onChange={(e) =>
                                  setFiltersForm({
                                    ...filtersForm,
                                    ldp_import: {
                                      ...filtersForm.ldp_import,
                                      ipv6_import_filter: {
                                        ...filtersForm.ldp_import.ipv6_import_filter,
                                        filter_access_list: e.target.value || null,
                                      },
                                    },
                                  })
                                }
                                placeholder="ACL name"
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">Neighbor Access List</Label>
                              <Input
                                value={filtersForm.ldp_import.ipv6_import_filter.neighbor_access_list ?? ""}
                                onChange={(e) =>
                                  setFiltersForm({
                                    ...filtersForm,
                                    ldp_import: {
                                      ...filtersForm.ldp_import,
                                      ipv6_import_filter: {
                                        ...filtersForm.ldp_import.ipv6_import_filter,
                                        neighbor_access_list: e.target.value || null,
                                      },
                                    },
                                  })
                                }
                                placeholder="ACL name"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <dl className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
                        <dt className="text-muted-foreground">IPv4 Filter ACL</dt>
                        <dd className="font-mono font-medium">{ldp.ldp_import.ipv4_import_filter.filter_access_list ?? <span className="font-sans font-normal text-muted-foreground">None</span>}</dd>
                        <dt className="text-muted-foreground">IPv4 Neighbor ACL</dt>
                        <dd className="font-mono font-medium">{ldp.ldp_import.ipv4_import_filter.neighbor_access_list ?? <span className="font-sans font-normal text-muted-foreground">None</span>}</dd>
                        <dt className="text-muted-foreground">IPv6 Filter ACL</dt>
                        <dd className="font-mono font-medium">{ldp.ldp_import.ipv6_import_filter.filter_access_list ?? <span className="font-sans font-normal text-muted-foreground">None</span>}</dd>
                        <dt className="text-muted-foreground">IPv6 Neighbor ACL</dt>
                        <dd className="font-mono font-medium">{ldp.ldp_import.ipv6_import_filter.neighbor_access_list ?? <span className="font-sans font-normal text-muted-foreground">None</span>}</dd>
                      </dl>
                    )}
                  </CardContent>
                </Card>

                {filtersEditing && (
                  <>
                    {filtersError && (
                      <div className="flex items-start gap-2 rounded-lg bg-destructive/10 border border-destructive/20 p-3">
                        <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                        <p className="text-sm text-destructive whitespace-pre-wrap">{filtersError}</p>
                      </div>
                    )}
                    <div className="flex gap-2">
                      <Button onClick={handleSaveFilters} disabled={filtersSaving}>
                        {filtersSaving ? "Saving..." : "Save Changes"}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => { setFiltersEditing(false); setFiltersError(null); }}
                        disabled={filtersSaving}
                      >
                        Cancel
                      </Button>
                    </div>
                  </>
                )}
              </div>
            </TabsContent>

            {/* ============================================================ */}
            {/* Targeted Tab */}
            {/* ============================================================ */}
            <TabsContent value="targeted">
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm text-muted-foreground">
                  Targeted LDP sessions for LDP-over-TE and RSVP scenarios
                </p>
                {hasWritePermission && (
                  <Button size="sm" variant="outline" onClick={() => setTargetedModalOpen(true)}>
                    <Settings2 className="h-4 w-4 mr-2" />
                    Configure
                  </Button>
                )}
              </div>

              <div className="space-y-4">
                {/* IPv4 Targeted */}
                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">IPv4 Targeted Neighbors</CardTitle>
                      {ldp.targeted_neighbor_ipv4.enable ? (
                        <Badge variant="secondary" className="bg-green-500/10 text-green-600">Enabled</Badge>
                      ) : (
                        <Badge variant="secondary">Disabled</Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {ldp.targeted_neighbor_ipv4.addresses.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {ldp.targeted_neighbor_ipv4.addresses.map((addr) => (
                          <Badge key={addr} variant="outline" className="font-mono text-xs">{addr}</Badge>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">No IPv4 targeted neighbor addresses</p>
                    )}
                    <dl className="grid grid-cols-2 gap-x-8 gap-y-1 text-sm">
                      <dt className="text-muted-foreground">Hello Holdtime</dt>
                      <dd className="font-mono">{ldp.targeted_neighbor_ipv4.hello_holdtime != null ? `${ldp.targeted_neighbor_ipv4.hello_holdtime}s` : <span className="font-sans text-muted-foreground">Default</span>}</dd>
                      <dt className="text-muted-foreground">Hello Interval</dt>
                      <dd className="font-mono">{ldp.targeted_neighbor_ipv4.hello_interval != null ? `${ldp.targeted_neighbor_ipv4.hello_interval}s` : <span className="font-sans text-muted-foreground">Default</span>}</dd>
                    </dl>
                  </CardContent>
                </Card>

                {/* IPv6 Targeted */}
                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">IPv6 Targeted Neighbors</CardTitle>
                      {ldp.targeted_neighbor_ipv6.enable ? (
                        <Badge variant="secondary" className="bg-green-500/10 text-green-600">Enabled</Badge>
                      ) : (
                        <Badge variant="secondary">Disabled</Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {ldp.targeted_neighbor_ipv6.addresses.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {ldp.targeted_neighbor_ipv6.addresses.map((addr) => (
                          <Badge key={addr} variant="outline" className="font-mono text-xs">{addr}</Badge>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">No IPv6 targeted neighbor addresses</p>
                    )}
                    <dl className="grid grid-cols-2 gap-x-8 gap-y-1 text-sm">
                      <dt className="text-muted-foreground">Hello Holdtime</dt>
                      <dd className="font-mono">{ldp.targeted_neighbor_ipv6.hello_holdtime != null ? `${ldp.targeted_neighbor_ipv6.hello_holdtime}s` : <span className="font-sans text-muted-foreground">Default</span>}</dd>
                      <dt className="text-muted-foreground">Hello Interval</dt>
                      <dd className="font-mono">{ldp.targeted_neighbor_ipv6.hello_interval != null ? `${ldp.targeted_neighbor_ipv6.hello_interval}s` : <span className="font-sans text-muted-foreground">Default</span>}</dd>
                    </dl>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Modals */}
      <MplsLdpInterfaceModal
        open={ldpIfaceModalOpen}
        onOpenChange={(open) => {
          setLdpIfaceModalOpen(open);
          if (!open) setEditingLdpIface(null);
        }}
        existingInterface={editingLdpIface}
        onSubmit={editingLdpIface ? handleUpdateLdpIface : handleCreateLdpIface}
      />

      <MplsLdpNeighborModal
        open={neighborModalOpen}
        onOpenChange={(open) => {
          setNeighborModalOpen(open);
          if (!open) setEditingNeighbor(null);
        }}
        existingNeighbor={editingNeighbor}
        onSubmit={editingNeighbor ? handleUpdateNeighbor : handleCreateNeighbor}
      />

      <MplsLdpTargetedModal
        open={targetedModalOpen}
        onOpenChange={setTargetedModalOpen}
        current={{
          targeted_neighbor_ipv4: ldp.targeted_neighbor_ipv4,
          targeted_neighbor_ipv6: ldp.targeted_neighbor_ipv6,
        }}
        onSubmit={handleSaveTargeted}
      />
    </>
  );
}
