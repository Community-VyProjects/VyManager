"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import {
  Network,
  Plus,
  RefreshCw,
  Pencil,
  Trash2,
  Settings2,
  ArrowLeftRight,
  Filter,
  Save,
  Loader2,
} from "lucide-react";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import {
  babelService,
  BabelConfig,
  BabelCapabilities,
  BabelInterface,
  BabelParameters,
  BabelRedistribute,
  DistributeListFilter,
} from "@/lib/api/babel";
import { BabelInterfaceModal } from "./BabelInterfaceModal";
import { DeleteBabelInterfaceModal } from "./DeleteBabelInterfaceModal";

export function BabelContent() {
  const [config, setConfig] = useState<BabelConfig | null>(null);
  const [capabilities, setCapabilities] = useState<BabelCapabilities | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("interfaces");

  // Interface modal state
  const [interfaceModalOpen, setInterfaceModalOpen] = useState(false);
  const [editingInterface, setEditingInterface] = useState<BabelInterface | null>(null);
  const [deletingInterface, setDeletingInterface] = useState<string | null>(null);

  // Parameters editing state
  const [editingParams, setEditingParams] = useState(false);
  const [paramsDraft, setParamsDraft] = useState<BabelParameters | null>(null);
  const [savingParams, setSavingParams] = useState(false);

  // Redistribute editing state
  const [editingRedist, setEditingRedist] = useState(false);
  const [redistDraft, setRedistDraft] = useState<BabelRedistribute | null>(null);
  const [savingRedist, setSavingRedist] = useState(false);

  // Distribute-list editing state
  const [editingDistList, setEditingDistList] = useState(false);
  const [distListIpv4Draft, setDistListIpv4Draft] = useState<DistributeListFilter | null>(null);
  const [distListIpv6Draft, setDistListIpv6Draft] = useState<DistributeListFilter | null>(null);
  const [savingDistList, setSavingDistList] = useState(false);

  const loadData = useCallback(async (refresh = false) => {
    try {
      setLoading(true);
      setError(null);
      const [configData, capData] = await Promise.all([
        babelService.getConfig(refresh),
        babelService.getCapabilities(),
      ]);
      setConfig(configData);
      setCapabilities(capData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load Babel configuration");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Stats
  const interfaceCount = config?.interfaces.length ?? 0;
  const redistCount = (config?.redistribute.ipv4.length ?? 0) + (config?.redistribute.ipv6.length ?? 0);
  const hasDistList =
    config?.distribute_list.ipv4.access_list_in ||
    config?.distribute_list.ipv4.access_list_out ||
    config?.distribute_list.ipv4.prefix_list_in ||
    config?.distribute_list.ipv4.prefix_list_out ||
    config?.distribute_list.ipv6.access_list_in ||
    config?.distribute_list.ipv6.access_list_out ||
    config?.distribute_list.ipv6.prefix_list_in ||
    config?.distribute_list.ipv6.prefix_list_out ||
    (config?.distribute_list.ipv4_interfaces.length ?? 0) > 0 ||
    (config?.distribute_list.ipv6_interfaces.length ?? 0) > 0;

  // ==========================================================================
  // Interface handlers
  // ==========================================================================

  const handleCreateInterface = async (iface: BabelInterface) => {
    await babelService.createInterface(iface);
    await loadData(true);
  };

  const handleUpdateInterface = async (iface: BabelInterface) => {
    if (!editingInterface) return;
    await babelService.updateInterface(editingInterface, iface);
    setEditingInterface(null);
    await loadData(true);
  };

  const handleDeleteInterface = async () => {
    if (!deletingInterface) return;
    await babelService.deleteInterface(deletingInterface);
    setDeletingInterface(null);
    await loadData(true);
  };

  // ==========================================================================
  // Parameters handlers
  // ==========================================================================

  const startEditParams = () => {
    if (!config) return;
    setParamsDraft({ ...config.parameters });
    setEditingParams(true);
  };

  const cancelEditParams = () => {
    setEditingParams(false);
    setParamsDraft(null);
  };

  const saveParams = async () => {
    if (!config || !paramsDraft) return;
    try {
      setSavingParams(true);
      await babelService.updateParameters(config.parameters, paramsDraft);
      await loadData(true);
      setEditingParams(false);
      setParamsDraft(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save parameters");
    } finally {
      setSavingParams(false);
    }
  };

  // ==========================================================================
  // Redistribute handlers
  // ==========================================================================

  const startEditRedist = () => {
    if (!config) return;
    setRedistDraft({
      ipv4: [...config.redistribute.ipv4],
      ipv6: [...config.redistribute.ipv6],
    });
    setEditingRedist(true);
  };

  const cancelEditRedist = () => {
    setEditingRedist(false);
    setRedistDraft(null);
  };

  const saveRedist = async () => {
    if (!config || !redistDraft) return;
    try {
      setSavingRedist(true);
      await babelService.updateRedistribute(config.redistribute, redistDraft);
      await loadData(true);
      setEditingRedist(false);
      setRedistDraft(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save redistribution");
    } finally {
      setSavingRedist(false);
    }
  };

  const toggleRedist = (af: "ipv4" | "ipv6", proto: string) => {
    if (!redistDraft) return;
    const list = [...redistDraft[af]];
    const idx = list.indexOf(proto);
    if (idx >= 0) {
      list.splice(idx, 1);
    } else {
      list.push(proto);
    }
    setRedistDraft({ ...redistDraft, [af]: list });
  };

  // ==========================================================================
  // Distribute-list handlers
  // ==========================================================================

  const startEditDistList = () => {
    if (!config) return;
    setDistListIpv4Draft({ ...config.distribute_list.ipv4 });
    setDistListIpv6Draft({ ...config.distribute_list.ipv6 });
    setEditingDistList(true);
  };

  const cancelEditDistList = () => {
    setEditingDistList(false);
    setDistListIpv4Draft(null);
    setDistListIpv6Draft(null);
  };

  const saveDistList = async () => {
    if (!config || !distListIpv4Draft || !distListIpv6Draft) return;
    try {
      setSavingDistList(true);
      await babelService.updateDistributeListGlobal("ipv4", config.distribute_list.ipv4, distListIpv4Draft);
      await babelService.updateDistributeListGlobal("ipv6", config.distribute_list.ipv6, distListIpv6Draft);
      await loadData(true);
      setEditingDistList(false);
      setDistListIpv4Draft(null);
      setDistListIpv6Draft(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save distribute list");
    } finally {
      setSavingDistList(false);
    }
  };

  // ==========================================================================
  // Render
  // ==========================================================================

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
              <h1 className="text-2xl font-bold text-foreground">Babel Protocol</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Distance-vector routing protocol for mesh networks
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => loadData(true)}
            >
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
                    <Network className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{interfaceCount}</p>
                    <p className="text-xs text-muted-foreground">Interfaces</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-md p-2 bg-blue-500/10">
                    <Settings2 className="h-4 w-4 text-blue-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">
                      {config?.parameters.diversity ? "On" : "Off"}
                    </p>
                    <p className="text-xs text-muted-foreground">Diversity</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-md p-2 bg-green-500/10">
                    <ArrowLeftRight className="h-4 w-4 text-green-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{redistCount}</p>
                    <p className="text-xs text-muted-foreground">Redistributed</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-md p-2 bg-orange-500/10">
                    <Filter className="h-4 w-4 text-orange-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{hasDistList ? "Active" : "None"}</p>
                    <p className="text-xs text-muted-foreground">Filters</p>
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
              <TabsTrigger value="interfaces">
                Interfaces
                {interfaceCount > 0 && (
                  <Badge variant="secondary" className="ml-2">{interfaceCount}</Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="parameters">Parameters</TabsTrigger>
              <TabsTrigger value="redistribute">
                Redistribute
                {redistCount > 0 && (
                  <Badge variant="secondary" className="ml-2">{redistCount}</Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="distribute-list">Distribute List</TabsTrigger>
            </TabsList>

            {/* ============================================================ */}
            {/* Interfaces Tab */}
            {/* ============================================================ */}
            <TabsContent value="interfaces">
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm text-muted-foreground">
                  Configure Babel on network interfaces
                </p>
                <Button size="sm" onClick={() => { setEditingInterface(null); setInterfaceModalOpen(true); }}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Interface
                </Button>
              </div>

              {interfaceCount === 0 ? (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <Network className="h-12 w-12 text-muted-foreground/30 mb-4" />
                    <p className="text-sm text-muted-foreground mb-2">No Babel interfaces configured</p>
                    <p className="text-xs text-muted-foreground mb-4">
                      Add an interface to start using Babel routing
                    </p>
                    <Button size="sm" onClick={() => { setEditingInterface(null); setInterfaceModalOpen(true); }}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Interface
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <ScrollArea>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Interface</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Channel</TableHead>
                          <TableHead>Hello Int.</TableHead>
                          <TableHead>Update Int.</TableHead>
                          <TableHead>RX Cost</TableHead>
                          <TableHead>Split Horizon</TableHead>
                          <TableHead>Timestamps</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {config?.interfaces.map((iface) => (
                          <TableRow key={iface.name}>
                            <TableCell className="font-medium font-mono">{iface.name}</TableCell>
                            <TableCell>
                              {iface.type ? (
                                <Badge variant="outline">{iface.type}</Badge>
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </TableCell>
                            <TableCell>
                              {iface.channel ?? <span className="text-muted-foreground">-</span>}
                            </TableCell>
                            <TableCell>
                              {iface.hello_interval ? `${iface.hello_interval}ms` : <span className="text-muted-foreground">default</span>}
                            </TableCell>
                            <TableCell>
                              {iface.update_interval ? `${iface.update_interval}ms` : <span className="text-muted-foreground">default</span>}
                            </TableCell>
                            <TableCell>
                              {iface.rxcost ?? <span className="text-muted-foreground">default</span>}
                            </TableCell>
                            <TableCell>
                              {iface.split_horizon ? (
                                <Badge variant="outline">{iface.split_horizon}</Badge>
                              ) : (
                                <span className="text-muted-foreground">default</span>
                              )}
                            </TableCell>
                            <TableCell>
                              {iface.enable_timestamps ? (
                                <Badge variant="secondary">Enabled</Badge>
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() => {
                                    setEditingInterface(iface);
                                    setInterfaceModalOpen(true);
                                  }}
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-destructive hover:text-destructive"
                                  onClick={() => setDeletingInterface(iface.name)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
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
            {/* Parameters Tab */}
            {/* ============================================================ */}
            <TabsContent value="parameters">
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm text-muted-foreground">
                  Global Babel protocol parameters
                </p>
                {!editingParams ? (
                  <Button size="sm" variant="outline" onClick={startEditParams}>
                    <Pencil className="h-4 w-4 mr-2" />
                    Edit Parameters
                  </Button>
                ) : (
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={cancelEditParams}>
                      Cancel
                    </Button>
                    <Button size="sm" onClick={saveParams} disabled={savingParams}>
                      {savingParams ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                      Save
                    </Button>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-6">
                <Card>
                  <CardContent className="p-6">
                    <h3 className="font-semibold mb-4">Diversity Routing</h3>
                    <div className="space-y-4">
                      <div className="flex items-center gap-3">
                        <Checkbox
                          id="diversity"
                          checked={editingParams ? paramsDraft?.diversity : config?.parameters.diversity}
                          disabled={!editingParams}
                          onCheckedChange={(checked) =>
                            paramsDraft && setParamsDraft({ ...paramsDraft, diversity: !!checked })
                          }
                        />
                        <Label htmlFor="diversity">Enable diversity-aware routing</Label>
                      </div>
                      <div>
                        <Label className="text-sm">Diversity Factor</Label>
                        <p className="text-xs text-muted-foreground mb-1">Multiplicative factor (1-256, default: 256)</p>
                        <Input
                          type="number"
                          min={1}
                          max={256}
                          placeholder="256"
                          value={editingParams ? (paramsDraft?.diversity_factor ?? "") : (config?.parameters.diversity_factor ?? "")}
                          disabled={!editingParams}
                          onChange={(e) =>
                            paramsDraft && setParamsDraft({
                              ...paramsDraft,
                              diversity_factor: e.target.value ? parseInt(e.target.value) : null,
                            })
                          }
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <h3 className="font-semibold mb-4">Timing</h3>
                    <div className="space-y-4">
                      <div>
                        <Label className="text-sm">Resend Delay</Label>
                        <p className="text-xs text-muted-foreground mb-1">Time before resending (20-655340 ms, default: 2000)</p>
                        <Input
                          type="number"
                          min={20}
                          max={655340}
                          placeholder="2000"
                          value={editingParams ? (paramsDraft?.resend_delay ?? "") : (config?.parameters.resend_delay ?? "")}
                          disabled={!editingParams}
                          onChange={(e) =>
                            paramsDraft && setParamsDraft({
                              ...paramsDraft,
                              resend_delay: e.target.value ? parseInt(e.target.value) : null,
                            })
                          }
                        />
                      </div>
                      <div>
                        <Label className="text-sm">Smoothing Half-life</Label>
                        <p className="text-xs text-muted-foreground mb-1">Smoothing half-life (0-65534 seconds, default: 4)</p>
                        <Input
                          type="number"
                          min={0}
                          max={65534}
                          placeholder="4"
                          value={editingParams ? (paramsDraft?.smoothing_half_life ?? "") : (config?.parameters.smoothing_half_life ?? "")}
                          disabled={!editingParams}
                          onChange={(e) =>
                            paramsDraft && setParamsDraft({
                              ...paramsDraft,
                              smoothing_half_life: e.target.value ? parseInt(e.target.value) : null,
                            })
                          }
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* ============================================================ */}
            {/* Redistribute Tab */}
            {/* ============================================================ */}
            <TabsContent value="redistribute">
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm text-muted-foreground">
                  Select which protocols to redistribute into Babel
                </p>
                {!editingRedist ? (
                  <Button size="sm" variant="outline" onClick={startEditRedist}>
                    <Pencil className="h-4 w-4 mr-2" />
                    Edit
                  </Button>
                ) : (
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={cancelEditRedist}>
                      Cancel
                    </Button>
                    <Button size="sm" onClick={saveRedist} disabled={savingRedist}>
                      {savingRedist ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                      Save
                    </Button>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-6">
                <Card>
                  <CardContent className="p-6">
                    <h3 className="font-semibold mb-4">IPv4 Protocols</h3>
                    <div className="space-y-3">
                      {(capabilities?.redistribute_protocols.ipv4 ?? []).map((proto) => (
                        <div key={proto} className="flex items-center gap-3">
                          <Checkbox
                            id={`redist-ipv4-${proto}`}
                            checked={
                              editingRedist
                                ? redistDraft?.ipv4.includes(proto)
                                : config?.redistribute.ipv4.includes(proto)
                            }
                            disabled={!editingRedist}
                            onCheckedChange={() => toggleRedist("ipv4", proto)}
                          />
                          <Label htmlFor={`redist-ipv4-${proto}`} className="font-mono text-sm">
                            {proto}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <h3 className="font-semibold mb-4">IPv6 Protocols</h3>
                    <div className="space-y-3">
                      {(capabilities?.redistribute_protocols.ipv6 ?? []).map((proto) => (
                        <div key={proto} className="flex items-center gap-3">
                          <Checkbox
                            id={`redist-ipv6-${proto}`}
                            checked={
                              editingRedist
                                ? redistDraft?.ipv6.includes(proto)
                                : config?.redistribute.ipv6.includes(proto)
                            }
                            disabled={!editingRedist}
                            onCheckedChange={() => toggleRedist("ipv6", proto)}
                          />
                          <Label htmlFor={`redist-ipv6-${proto}`} className="font-mono text-sm">
                            {proto}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* ============================================================ */}
            {/* Distribute List Tab */}
            {/* ============================================================ */}
            <TabsContent value="distribute-list">
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm text-muted-foreground">
                  Configure route filtering with access lists and prefix lists
                </p>
                {!editingDistList ? (
                  <Button size="sm" variant="outline" onClick={startEditDistList}>
                    <Pencil className="h-4 w-4 mr-2" />
                    Edit
                  </Button>
                ) : (
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={cancelEditDistList}>
                      Cancel
                    </Button>
                    <Button size="sm" onClick={saveDistList} disabled={savingDistList}>
                      {savingDistList ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                      Save
                    </Button>
                  </div>
                )}
              </div>

              <div className="space-y-6">
                {/* IPv4 Global */}
                <Card>
                  <CardContent className="p-6">
                    <h3 className="font-semibold mb-4">IPv4 Global Filters</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-sm">Access List In</Label>
                        <Input
                          placeholder="Not set"
                          value={
                            editingDistList
                              ? (distListIpv4Draft?.access_list_in ?? "")
                              : (config?.distribute_list.ipv4.access_list_in ?? "")
                          }
                          disabled={!editingDistList}
                          onChange={(e) =>
                            distListIpv4Draft &&
                            setDistListIpv4Draft({ ...distListIpv4Draft, access_list_in: e.target.value || null })
                          }
                        />
                      </div>
                      <div>
                        <Label className="text-sm">Access List Out</Label>
                        <Input
                          placeholder="Not set"
                          value={
                            editingDistList
                              ? (distListIpv4Draft?.access_list_out ?? "")
                              : (config?.distribute_list.ipv4.access_list_out ?? "")
                          }
                          disabled={!editingDistList}
                          onChange={(e) =>
                            distListIpv4Draft &&
                            setDistListIpv4Draft({ ...distListIpv4Draft, access_list_out: e.target.value || null })
                          }
                        />
                      </div>
                      <div>
                        <Label className="text-sm">Prefix List In</Label>
                        <Input
                          placeholder="Not set"
                          value={
                            editingDistList
                              ? (distListIpv4Draft?.prefix_list_in ?? "")
                              : (config?.distribute_list.ipv4.prefix_list_in ?? "")
                          }
                          disabled={!editingDistList}
                          onChange={(e) =>
                            distListIpv4Draft &&
                            setDistListIpv4Draft({ ...distListIpv4Draft, prefix_list_in: e.target.value || null })
                          }
                        />
                      </div>
                      <div>
                        <Label className="text-sm">Prefix List Out</Label>
                        <Input
                          placeholder="Not set"
                          value={
                            editingDistList
                              ? (distListIpv4Draft?.prefix_list_out ?? "")
                              : (config?.distribute_list.ipv4.prefix_list_out ?? "")
                          }
                          disabled={!editingDistList}
                          onChange={(e) =>
                            distListIpv4Draft &&
                            setDistListIpv4Draft({ ...distListIpv4Draft, prefix_list_out: e.target.value || null })
                          }
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* IPv6 Global */}
                <Card>
                  <CardContent className="p-6">
                    <h3 className="font-semibold mb-4">IPv6 Global Filters</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-sm">Access List In</Label>
                        <Input
                          placeholder="Not set"
                          value={
                            editingDistList
                              ? (distListIpv6Draft?.access_list_in ?? "")
                              : (config?.distribute_list.ipv6.access_list_in ?? "")
                          }
                          disabled={!editingDistList}
                          onChange={(e) =>
                            distListIpv6Draft &&
                            setDistListIpv6Draft({ ...distListIpv6Draft, access_list_in: e.target.value || null })
                          }
                        />
                      </div>
                      <div>
                        <Label className="text-sm">Access List Out</Label>
                        <Input
                          placeholder="Not set"
                          value={
                            editingDistList
                              ? (distListIpv6Draft?.access_list_out ?? "")
                              : (config?.distribute_list.ipv6.access_list_out ?? "")
                          }
                          disabled={!editingDistList}
                          onChange={(e) =>
                            distListIpv6Draft &&
                            setDistListIpv6Draft({ ...distListIpv6Draft, access_list_out: e.target.value || null })
                          }
                        />
                      </div>
                      <div>
                        <Label className="text-sm">Prefix List In</Label>
                        <Input
                          placeholder="Not set"
                          value={
                            editingDistList
                              ? (distListIpv6Draft?.prefix_list_in ?? "")
                              : (config?.distribute_list.ipv6.prefix_list_in ?? "")
                          }
                          disabled={!editingDistList}
                          onChange={(e) =>
                            distListIpv6Draft &&
                            setDistListIpv6Draft({ ...distListIpv6Draft, prefix_list_in: e.target.value || null })
                          }
                        />
                      </div>
                      <div>
                        <Label className="text-sm">Prefix List Out</Label>
                        <Input
                          placeholder="Not set"
                          value={
                            editingDistList
                              ? (distListIpv6Draft?.prefix_list_out ?? "")
                              : (config?.distribute_list.ipv6.prefix_list_out ?? "")
                          }
                          disabled={!editingDistList}
                          onChange={(e) =>
                            distListIpv6Draft &&
                            setDistListIpv6Draft({ ...distListIpv6Draft, prefix_list_out: e.target.value || null })
                          }
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Per-interface filters (read-only display) */}
                {((config?.distribute_list.ipv4_interfaces.length ?? 0) > 0 ||
                  (config?.distribute_list.ipv6_interfaces.length ?? 0) > 0) && (
                  <Card>
                    <CardContent className="p-6">
                      <h3 className="font-semibold mb-4">Per-Interface Filters</h3>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Address Family</TableHead>
                            <TableHead>Interface</TableHead>
                            <TableHead>ACL In</TableHead>
                            <TableHead>ACL Out</TableHead>
                            <TableHead>Prefix In</TableHead>
                            <TableHead>Prefix Out</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {config?.distribute_list.ipv4_interfaces.map((f) => (
                            <TableRow key={`ipv4-${f.interface}`}>
                              <TableCell><Badge variant="outline">IPv4</Badge></TableCell>
                              <TableCell className="font-mono">{f.interface}</TableCell>
                              <TableCell>{f.access_list_in ?? "-"}</TableCell>
                              <TableCell>{f.access_list_out ?? "-"}</TableCell>
                              <TableCell>{f.prefix_list_in ?? "-"}</TableCell>
                              <TableCell>{f.prefix_list_out ?? "-"}</TableCell>
                            </TableRow>
                          ))}
                          {config?.distribute_list.ipv6_interfaces.map((f) => (
                            <TableRow key={`ipv6-${f.interface}`}>
                              <TableCell><Badge variant="outline">IPv6</Badge></TableCell>
                              <TableCell className="font-mono">{f.interface}</TableCell>
                              <TableCell>{f.access_list_in ?? "-"}</TableCell>
                              <TableCell>{f.access_list_out ?? "-"}</TableCell>
                              <TableCell>{f.prefix_list_in ?? "-"}</TableCell>
                              <TableCell>{f.prefix_list_out ?? "-"}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Modals */}
      <BabelInterfaceModal
        open={interfaceModalOpen}
        onOpenChange={(open) => {
          setInterfaceModalOpen(open);
          if (!open) setEditingInterface(null);
        }}
        existingInterface={editingInterface}
        capabilities={capabilities}
        onSubmit={editingInterface ? handleUpdateInterface : handleCreateInterface}
      />

      <DeleteBabelInterfaceModal
        open={!!deletingInterface}
        onOpenChange={(open) => { if (!open) setDeletingInterface(null); }}
        interfaceName={deletingInterface ?? ""}
        onConfirm={handleDeleteInterface}
      />
    </>
  );
}
