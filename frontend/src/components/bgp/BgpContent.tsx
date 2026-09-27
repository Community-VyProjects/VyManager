"use client";

import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { bgpTabFromSearch } from "@/lib/query-tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  Users,
  Globe,
  Save,
  X,
  Loader2,
} from "lucide-react";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import {
  bgpService,
  BgpConfig,
  BgpCapabilities,
  BgpNeighbor,
  BgpPeerGroup,
  BgpAddressFamily,
  BgpParameters,
} from "@/lib/api/bgp";
import { routeMapService } from "@/lib/api/route-map";
import { bfdService } from "@/lib/api/bfd";
import { BgpNeighborModal } from "./BgpNeighborModal";
import { BgpPeerGroupModal } from "./BgpPeerGroupModal";
import { DeleteBgpNeighborModal } from "./DeleteBgpNeighborModal";
import { DeleteBgpPeerGroupModal } from "./DeleteBgpPeerGroupModal";

export function BgpContent() {
  const t = useTranslations("bgp");
  const tc = useTranslations("common");
  const [config, setConfig] = useState<BgpConfig | null>(null);
  const [capabilities, setCapabilities] = useState<BgpCapabilities | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("overview");
  const searchParams = useSearchParams();

  // Neighbor modal state
  const [neighborModalOpen, setNeighborModalOpen] = useState(false);
  const [editingNeighbor, setEditingNeighbor] = useState<BgpNeighbor | null>(null);
  const [deletingNeighbor, setDeletingNeighbor] = useState<string | null>(null);

  // Peer group modal state
  const [peerGroupModalOpen, setPeerGroupModalOpen] = useState(false);
  const [editingPeerGroup, setEditingPeerGroup] = useState<BgpPeerGroup | null>(null);
  const [deletingPeerGroup, setDeletingPeerGroup] = useState<{ name: string; members: number } | null>(null);

  // Overview edit state
  const [overviewEditing, setOverviewEditing] = useState(false);
  const [overviewSaving, setOverviewSaving] = useState(false);
  const [systemAs, setSystemAs] = useState("");
  const [routerId, setRouterId] = useState("");
  const [keepalive, setKeepalive] = useState("");
  const [holdtime, setHoldtime] = useState("");
  const [overviewError, setOverviewError] = useState<string | null>(null);

  // Address Family state
  const [selectedAfi, setSelectedAfi] = useState<string>("");
  const [afNetworkPrefix, setAfNetworkPrefix] = useState("");
  const [afNetworkRouteMap, setAfNetworkRouteMap] = useState("");
  const [afRedistProto, setAfRedistProto] = useState("");
  const [afRedistRouteMap, setAfRedistRouteMap] = useState("");
  const [afRedistMetric, setAfRedistMetric] = useState("");
  const [afAggPrefix, setAfAggPrefix] = useState("");
  const [afAggAsSet, setAfAggAsSet] = useState(false);
  const [afAggSummaryOnly, setAfAggSummaryOnly] = useState(false);
  const [afAggRouteMap, setAfAggRouteMap] = useState("");
  const [afSaving, setAfSaving] = useState(false);
  const [afError, setAfError] = useState<string | null>(null);

  // Route-map and BFD profile names for dropdowns
  const [routeMapNames, setRouteMapNames] = useState<string[]>([]);
  const [bfdProfileNames, setBfdProfileNames] = useState<string[]>([]);

  // Parameters state
  const [paramsEditing, setParamsEditing] = useState(false);
  const [paramsSaving, setParamsSaving] = useState(false);
  const [paramsError, setParamsError] = useState<string | null>(null);
  const [editParams, setEditParams] = useState<BgpParameters | null>(null);

  const loadData = useCallback(async (refresh = false) => {
    try {
      setLoading(true);
      setError(null);
      const [configData, capData] = await Promise.all([
        bgpService.getConfig(refresh),
        bgpService.getCapabilities(),
      ]);
      setConfig(configData);
      setCapabilities(capData);

      // Load auxiliary data for dropdowns - these require separate permissions
      // so we catch errors silently and default to empty arrays
      const [rmNames, bfdNames] = await Promise.all([
        routeMapService.getConfig().then((c) => c.route_maps.map((rm) => rm.name)).catch(() => []),
        bfdService.getConfig().then((c) => c.profiles.map((p) => p.name)).catch(() => []),
      ]);
      setRouteMapNames(rmNames);
      setBfdProfileNames(bfdNames);

      // Initialize overview fields
      setSystemAs(configData.system_as || "");
      setRouterId(configData.parameters.router_id || "");
      setKeepalive(configData.timers.keepalive?.toString() || "");
      setHoldtime(configData.timers.holdtime?.toString() || "");
      // Initialize selected AFI
      if (!selectedAfi && capData.address_family_types.global.length > 0) {
        setSelectedAfi(capData.address_family_types.global[0]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t("content.loadFailed"));
    } finally {
      setLoading(false);
    }
  }, [selectedAfi, t]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    const tab = bgpTabFromSearch((key) => searchParams.get(key));
    if (tab) {
      setActiveTab(tab);
    }
  }, [searchParams]);

  // Stats
  const neighborCount = config?.neighbors.length ?? 0;
  const activeNeighbors = config?.neighbors.filter((n) => !n.shutdown).length ?? 0;
  const peerGroupCount = config?.peer_groups.length ?? 0;
  const afCount = config?.address_families.length ?? 0;

  // ==========================================================================
  // Overview handlers
  // ==========================================================================

  const handleOverviewSave = async () => {
    if (!config) return;
    setOverviewSaving(true);
    setOverviewError(null);
    try {
      const result = await bgpService.saveOverview(config, systemAs, routerId, keepalive, holdtime);
      if (!result.success) throw new Error(result.error || t("content.saveFailed"));
      await loadData(true);
      setOverviewEditing(false);
    } catch (err) {
      setOverviewError(err instanceof Error ? err.message : t("content.saveOverviewFailed"));
    } finally {
      setOverviewSaving(false);
    }
  };

  const handleOverviewCancel = () => {
    if (config) {
      setSystemAs(config.system_as || "");
      setRouterId(config.parameters.router_id || "");
      setKeepalive(config.timers.keepalive?.toString() || "");
      setHoldtime(config.timers.holdtime?.toString() || "");
    }
    setOverviewEditing(false);
    setOverviewError(null);
  };

  // ==========================================================================
  // Neighbor handlers
  // ==========================================================================

  const handleCreateNeighbor = async (neighbor: BgpNeighbor) => {
    await bgpService.createNeighbor(neighbor);
    await loadData(true);
  };

  const handleUpdateNeighbor = async (neighbor: BgpNeighbor) => {
    if (!editingNeighbor) return;
    await bgpService.updateNeighbor(editingNeighbor, neighbor);
    setEditingNeighbor(null);
    await loadData(true);
  };

  const handleDeleteNeighbor = async () => {
    if (!deletingNeighbor) return;
    await bgpService.deleteNeighbor(deletingNeighbor);
    setDeletingNeighbor(null);
    await loadData(true);
  };

  // ==========================================================================
  // Peer Group handlers
  // ==========================================================================

  const handleCreatePeerGroup = async (pg: BgpPeerGroup) => {
    await bgpService.createPeerGroup(pg);
    await loadData(true);
  };

  const handleUpdatePeerGroup = async (pg: BgpPeerGroup) => {
    if (!editingPeerGroup) return;
    await bgpService.updatePeerGroup(editingPeerGroup, pg);
    setEditingPeerGroup(null);
    await loadData(true);
  };

  const handleDeletePeerGroup = async () => {
    if (!deletingPeerGroup) return;
    await bgpService.deletePeerGroup(deletingPeerGroup.name);
    setDeletingPeerGroup(null);
    await loadData(true);
  };

  // ==========================================================================
  // Address Family handlers
  // ==========================================================================

  const currentAf: BgpAddressFamily | undefined = config?.address_families.find(
    (af) => af.afi === selectedAfi
  );
  const isL2vpnEvpn = selectedAfi === "l2vpn-evpn";
  const evpnFlags = capabilities?.features.l2vpn_evpn_control_flags?.flags ?? [];
  const evpnFlagsSupported = Boolean(capabilities?.features.l2vpn_evpn_control_flags?.supported);

  const handleToggleEvpnFlag = async (flag: string, enabled: boolean) => {
    setAfSaving(true);
    setAfError(null);
    try {
      await bgpService.setL2vpnEvpnFlag(flag, enabled);
      await loadData(true);
    } catch (err) {
      setAfError(err instanceof Error ? err.message : t("content.evpnFlagFailed"));
    } finally {
      setAfSaving(false);
    }
  };

  const handleAddNetwork = async () => {
    if (!afNetworkPrefix.trim()) return;
    setAfSaving(true);
    setAfError(null);
    try {
      await bgpService.addNetwork(selectedAfi, afNetworkPrefix.trim(), afNetworkRouteMap.trim() || undefined);
      setAfNetworkPrefix("");
      setAfNetworkRouteMap("");
      await loadData(true);
    } catch (err) {
      setAfError(err instanceof Error ? err.message : t("content.addNetworkFailed"));
    } finally {
      setAfSaving(false);
    }
  };

  const handleDeleteNetwork = async (prefix: string) => {
    setAfSaving(true);
    setAfError(null);
    try {
      await bgpService.deleteNetwork(selectedAfi, prefix);
      await loadData(true);
    } catch (err) {
      setAfError(err instanceof Error ? err.message : t("content.deleteNetworkFailed"));
    } finally {
      setAfSaving(false);
    }
  };

  const handleAddRedistribute = async () => {
    if (!afRedistProto) return;
    setAfSaving(true);
    setAfError(null);
    try {
      await bgpService.addRedistribute(selectedAfi, afRedistProto, afRedistRouteMap.trim() || undefined, afRedistMetric.trim() || undefined);
      setAfRedistProto("");
      setAfRedistRouteMap("");
      setAfRedistMetric("");
      await loadData(true);
    } catch (err) {
      setAfError(err instanceof Error ? err.message : t("content.addRedistributeFailed"));
    } finally {
      setAfSaving(false);
    }
  };

  const handleDeleteRedistribute = async (protocol: string) => {
    setAfSaving(true);
    setAfError(null);
    try {
      await bgpService.deleteRedistribute(selectedAfi, protocol);
      await loadData(true);
    } catch (err) {
      setAfError(err instanceof Error ? err.message : t("content.deleteRedistributeFailed"));
    } finally {
      setAfSaving(false);
    }
  };

  const handleAddAggregate = async () => {
    if (!afAggPrefix.trim()) return;
    setAfSaving(true);
    setAfError(null);
    try {
      await bgpService.addAggregateAddress(selectedAfi, afAggPrefix.trim(), afAggAsSet, afAggSummaryOnly, afAggRouteMap.trim() || undefined);
      setAfAggPrefix("");
      setAfAggAsSet(false);
      setAfAggSummaryOnly(false);
      setAfAggRouteMap("");
      await loadData(true);
    } catch (err) {
      setAfError(err instanceof Error ? err.message : t("content.addAggregateFailed"));
    } finally {
      setAfSaving(false);
    }
  };

  const handleDeleteAggregate = async (prefix: string) => {
    setAfSaving(true);
    setAfError(null);
    try {
      await bgpService.deleteAggregateAddress(selectedAfi, prefix);
      await loadData(true);
    } catch (err) {
      setAfError(err instanceof Error ? err.message : t("content.deleteAggregateFailed"));
    } finally {
      setAfSaving(false);
    }
  };

  // ==========================================================================
  // Parameters handlers
  // ==========================================================================

  const handleParamsEdit = () => {
    if (config) {
      setEditParams(JSON.parse(JSON.stringify(config.parameters)));
      setParamsEditing(true);
      setParamsError(null);
    }
  };

  const handleParamsSave = async () => {
    if (!config || !editParams) return;
    setParamsSaving(true);
    setParamsError(null);
    try {
      const result = await bgpService.saveParameters(config.parameters, editParams);
      if (!result.success) throw new Error(result.error || t("content.saveFailed"));
      await loadData(true);
      setParamsEditing(false);
    } catch (err) {
      setParamsError(err instanceof Error ? err.message : t("content.saveParamsFailed"));
    } finally {
      setParamsSaving(false);
    }
  };

  const handleParamsCancel = () => {
    setParamsEditing(false);
    setEditParams(null);
    setParamsError(null);
  };

  const updateParam = <K extends keyof BgpParameters>(key: K, value: BgpParameters[K]) => {
    if (!editParams) return;
    setEditParams({ ...editParams, [key]: value });
  };

  // ==========================================================================
  // Helpers
  // ==========================================================================

  const getMembersOfPeerGroup = (pgName: string): number => {
    return config?.neighbors.filter((n) => n.peer_group === pgName).length ?? 0;
  };

  const formatAfi = (afi: string): string => {
    return afi.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  };

  const redistributeProtocols = [
    "connected", "kernel", "ospf", "rip", "static", "babel", "isis", "table",
  ];

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
          {tc("retry")}
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
              <h1 className="text-2xl font-bold text-foreground">BGP</h1>
              <p className="text-sm text-muted-foreground mt-1">
                {t("content.subtitle")}
                {config?.system_as && (
                  <span className="ml-2 font-mono text-foreground">AS {config.system_as}</span>
                )}
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => loadData(true)}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              {tc("refresh")}
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
                    <Users className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{neighborCount}</p>
                    <p className="text-xs text-muted-foreground">{t("content.neighbors")}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-md p-2 bg-green-500/10">
                    <Network className="h-4 w-4 text-green-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{activeNeighbors}</p>
                    <p className="text-xs text-muted-foreground">{t("content.active")}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-md p-2 bg-blue-500/10">
                    <Users className="h-4 w-4 text-blue-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{peerGroupCount}</p>
                    <p className="text-xs text-muted-foreground">{t("content.peerGroups")}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-md p-2 bg-orange-500/10">
                    <Globe className="h-4 w-4 text-orange-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{afCount}</p>
                    <p className="text-xs text-muted-foreground">{t("content.addressFamilies")}</p>
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
              <TabsTrigger value="overview">{t("content.overviewTab")}</TabsTrigger>
              <TabsTrigger value="neighbors">
                {t("content.neighbors")}
                {neighborCount > 0 && (
                  <Badge variant="secondary" className="ml-2">{neighborCount}</Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="peer-groups">
                {t("content.peerGroups")}
                {peerGroupCount > 0 && (
                  <Badge variant="secondary" className="ml-2">{peerGroupCount}</Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="address-families">
                {t("content.addressFamilies")}
                {afCount > 0 && (
                  <Badge variant="secondary" className="ml-2">{afCount}</Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="parameters">{t("content.parametersTab")}</TabsTrigger>
            </TabsList>

            {/* ============================================================ */}
            {/* Overview Tab */}
            {/* ============================================================ */}
            <TabsContent value="overview">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    {t("content.overview.description")}
                  </p>
                  {!overviewEditing ? (
                    <Button size="sm" variant="outline" onClick={() => setOverviewEditing(true)}>
                      <Pencil className="h-4 w-4 mr-2" />
                      {tc("edit")}
                    </Button>
                  ) : (
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={handleOverviewCancel} disabled={overviewSaving}>
                        <X className="h-4 w-4 mr-2" />
                        {tc("cancel")}
                      </Button>
                      <Button size="sm" onClick={handleOverviewSave} disabled={overviewSaving}>
                        {overviewSaving ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <Save className="h-4 w-4 mr-2" />
                        )}
                        {tc("save")}
                      </Button>
                    </div>
                  )}
                </div>

                {overviewError && (
                  <div className="p-3 rounded-md bg-destructive/10 text-destructive text-sm">
                    {overviewError}
                  </div>
                )}

                <Card>
                  <CardContent className="p-6">
                    <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label>{t("content.overview.systemAs")}</Label>
                        {overviewEditing ? (
                          <Input
                            value={systemAs}
                            onChange={(e) => setSystemAs(e.target.value)}
                            placeholder={t("eg", { value: "65001" })}
                          />
                        ) : (
                          <p className="text-sm font-mono p-2 bg-muted rounded-md">
                            {config?.system_as || <span className="text-muted-foreground">{t("content.overview.notConfigured")}</span>}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground">
                          {t("content.overview.systemAsHelp")}
                        </p>
                      </div>
                      <div className="space-y-2">
                        <Label>{t("content.overview.routerId")}</Label>
                        {overviewEditing ? (
                          <Input
                            value={routerId}
                            onChange={(e) => setRouterId(e.target.value)}
                            placeholder={t("eg", { value: "10.0.0.1" })}
                          />
                        ) : (
                          <p className="text-sm font-mono p-2 bg-muted rounded-md">
                            {config?.parameters.router_id || <span className="text-muted-foreground">{t("content.overview.autoDetect")}</span>}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground">
                          {t("content.overview.routerIdHelp")}
                        </p>
                      </div>
                      <div className="space-y-2">
                        <Label>{t("content.overview.keepalive")}</Label>
                        {overviewEditing ? (
                          <Input
                            type="number"
                            value={keepalive}
                            onChange={(e) => setKeepalive(e.target.value)}
                            placeholder="60"
                          />
                        ) : (
                          <p className="text-sm font-mono p-2 bg-muted rounded-md">
                            {config?.timers.keepalive ?? <span className="text-muted-foreground">{t("content.defaultValue", { value: "60" })}</span>}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground">
                          {t("content.overview.keepaliveHelp")}
                        </p>
                      </div>
                      <div className="space-y-2">
                        <Label>{t("content.overview.holdTime")}</Label>
                        {overviewEditing ? (
                          <Input
                            type="number"
                            value={holdtime}
                            onChange={(e) => setHoldtime(e.target.value)}
                            placeholder="180"
                          />
                        ) : (
                          <p className="text-sm font-mono p-2 bg-muted rounded-md">
                            {config?.timers.holdtime ?? <span className="text-muted-foreground">{t("content.defaultValue", { value: "180" })}</span>}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground">
                          {t("content.overview.holdTimeHelp")}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Listen Ranges */}
                {config?.listen && (config.listen.limit || config.listen.ranges.length > 0) && (
                  <Card>
                    <CardContent className="p-6">
                      <h3 className="text-sm font-medium mb-4">{t("content.overview.listenTitle")}</h3>
                      {config.listen.limit && (
                        <p className="text-sm text-muted-foreground mb-3">
                          {t("content.overview.connectionLimit")} <span className="font-mono">{config.listen.limit}</span>
                        </p>
                      )}
                      {config.listen.ranges.length > 0 && (
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>{t("content.prefix")}</TableHead>
                              <TableHead>{t("content.peerGroup")}</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {config.listen.ranges.map((r) => (
                              <TableRow key={r.prefix}>
                                <TableCell className="font-mono">{r.prefix}</TableCell>
                                <TableCell>{r.peer_group || "-"}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      )}
                    </CardContent>
                  </Card>
                )}
              </div>
            </TabsContent>

            {/* ============================================================ */}
            {/* Neighbors Tab */}
            {/* ============================================================ */}
            <TabsContent value="neighbors">
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm text-muted-foreground">
                  {t("content.neighborsTab.description")}
                </p>
                <Button size="sm" onClick={() => { setEditingNeighbor(null); setNeighborModalOpen(true); }}>
                  <Plus className="h-4 w-4 mr-2" />
                  {t("content.neighborsTab.add")}
                </Button>
              </div>

              {neighborCount === 0 ? (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <Users className="h-12 w-12 text-muted-foreground/30 mb-4" />
                    <p className="text-sm text-muted-foreground mb-2">{t("content.neighborsTab.empty")}</p>
                    <p className="text-xs text-muted-foreground mb-4">
                      {t("content.neighborsTab.emptyHint")}
                    </p>
                    <Button size="sm" onClick={() => { setEditingNeighbor(null); setNeighborModalOpen(true); }}>
                      <Plus className="h-4 w-4 mr-2" />
                      {t("content.neighborsTab.add")}
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <ScrollArea>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>{t("content.address")}</TableHead>
                          <TableHead>{t("content.remoteAs")}</TableHead>
                          <TableHead>{tc("description")}</TableHead>
                          <TableHead>{tc("status")}</TableHead>
                          <TableHead>{t("content.peerGroup")}</TableHead>
                          <TableHead>BFD</TableHead>
                          <TableHead>{t("content.addressFamilies")}</TableHead>
                          <TableHead className="text-right">{tc("actions")}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {config?.neighbors.map((neighbor) => (
                          <TableRow key={neighbor.address}>
                            <TableCell className="font-medium font-mono">
                              {neighbor.address}
                            </TableCell>
                            <TableCell className="font-mono">
                              {neighbor.remote_as || <span className="text-muted-foreground">-</span>}
                            </TableCell>
                            <TableCell className="max-w-[200px] truncate">
                              {neighbor.description || <span className="text-muted-foreground">-</span>}
                            </TableCell>
                            <TableCell>
                              {neighbor.shutdown ? (
                                <Badge variant="secondary" className="bg-red-500/10 text-red-600">
                                  {t("content.shutdown")}
                                </Badge>
                              ) : (
                                <Badge variant="secondary" className="bg-green-500/10 text-green-600">
                                  {t("content.active")}
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              {neighbor.peer_group ? (
                                <Badge variant="secondary">{neighbor.peer_group}</Badge>
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </TableCell>
                            <TableCell>
                              {neighbor.bfd.enabled ? (
                                <Badge variant="outline" className="text-xs">BFD</Badge>
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-wrap gap-1">
                                {Object.keys(neighbor.address_families).length > 0 ? (
                                  Object.keys(neighbor.address_families).map((afi) => (
                                    <Badge key={afi} variant="outline" className="text-xs">
                                      {afi.replace(/_/g, " ")}
                                    </Badge>
                                  ))
                                ) : (
                                  <span className="text-muted-foreground">-</span>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-1">
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
            {/* Peer Groups Tab */}
            {/* ============================================================ */}
            <TabsContent value="peer-groups">
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm text-muted-foreground">
                  {t("content.peerGroupsTab.description")}
                </p>
                <Button size="sm" onClick={() => { setEditingPeerGroup(null); setPeerGroupModalOpen(true); }}>
                  <Plus className="h-4 w-4 mr-2" />
                  {t("content.peerGroupsTab.add")}
                </Button>
              </div>

              {peerGroupCount === 0 ? (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <Users className="h-12 w-12 text-muted-foreground/30 mb-4" />
                    <p className="text-sm text-muted-foreground mb-2">{t("content.peerGroupsTab.empty")}</p>
                    <p className="text-xs text-muted-foreground mb-4">
                      {t("content.peerGroupsTab.emptyHint")}
                    </p>
                    <Button size="sm" onClick={() => { setEditingPeerGroup(null); setPeerGroupModalOpen(true); }}>
                      <Plus className="h-4 w-4 mr-2" />
                      {t("content.peerGroupsTab.add")}
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <ScrollArea>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>{tc("name")}</TableHead>
                          <TableHead>{t("content.remoteAs")}</TableHead>
                          <TableHead>{tc("description")}</TableHead>
                          <TableHead>{tc("status")}</TableHead>
                          <TableHead>BFD</TableHead>
                          <TableHead>{t("content.peerGroupsTab.members")}</TableHead>
                          <TableHead>{t("content.addressFamilies")}</TableHead>
                          <TableHead className="text-right">{tc("actions")}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {config?.peer_groups.map((pg) => {
                          const memberCount = getMembersOfPeerGroup(pg.name);
                          return (
                            <TableRow key={pg.name}>
                              <TableCell className="font-medium font-mono">{pg.name}</TableCell>
                              <TableCell className="font-mono">
                                {pg.remote_as || <span className="text-muted-foreground">-</span>}
                              </TableCell>
                              <TableCell className="max-w-[200px] truncate">
                                {pg.description || <span className="text-muted-foreground">-</span>}
                              </TableCell>
                              <TableCell>
                                {pg.shutdown ? (
                                  <Badge variant="secondary" className="bg-red-500/10 text-red-600">
                                    {t("content.shutdown")}
                                  </Badge>
                                ) : (
                                  <Badge variant="secondary" className="bg-green-500/10 text-green-600">
                                    {t("content.active")}
                                  </Badge>
                                )}
                              </TableCell>
                              <TableCell>
                                {pg.bfd.enabled ? (
                                  <Badge variant="outline" className="text-xs">BFD</Badge>
                                ) : (
                                  <span className="text-muted-foreground">-</span>
                                )}
                              </TableCell>
                              <TableCell>
                                {memberCount > 0 ? (
                                  <Badge variant="secondary">
                                    {t("content.peerGroupsTab.memberCount", { count: memberCount })}
                                  </Badge>
                                ) : (
                                  <span className="text-muted-foreground">{tc("none")}</span>
                                )}
                              </TableCell>
                              <TableCell>
                                <div className="flex flex-wrap gap-1">
                                  {Object.keys(pg.address_families).length > 0 ? (
                                    Object.keys(pg.address_families).map((afi) => (
                                      <Badge key={afi} variant="outline" className="text-xs">
                                        {afi.replace(/_/g, " ")}
                                      </Badge>
                                    ))
                                  ) : (
                                    <span className="text-muted-foreground">-</span>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex items-center justify-end gap-1">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8"
                                    onClick={() => {
                                      setEditingPeerGroup(pg);
                                      setPeerGroupModalOpen(true);
                                    }}
                                  >
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-destructive hover:text-destructive"
                                    onClick={() => setDeletingPeerGroup({ name: pg.name, members: memberCount })}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                </Card>
              )}
            </TabsContent>

            {/* ============================================================ */}
            {/* Address Families Tab */}
            {/* ============================================================ */}
            <TabsContent value="address-families">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    {t("content.af.description")}
                  </p>
                  <Select value={selectedAfi} onValueChange={setSelectedAfi}>
                    <SelectTrigger className="w-[220px]">
                      <SelectValue placeholder={t("content.af.selectPlaceholder")} />
                    </SelectTrigger>
                    <SelectContent>
                      {capabilities?.address_family_types.global.map((afi) => (
                        <SelectItem key={afi} value={afi}>
                          {formatAfi(afi)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {afError && (
                  <div className="p-3 rounded-md bg-destructive/10 text-destructive text-sm">
                    {afError}
                  </div>
                )}

                {selectedAfi && (
                  <div className="space-y-6">
                    {isL2vpnEvpn && evpnFlagsSupported && (
                      <Card>
                        <CardContent className="p-6">
                          <h3 className="text-sm font-medium mb-4">{t("content.af.evpnTitle")}</h3>
                          <p className="text-xs text-muted-foreground mb-4">
                            {t("content.af.evpnDescription")}
                          </p>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {evpnFlags.map((flag) => {
                              const checked = currentAf?.evpn_flags?.includes(flag) ?? false;
                              return (
                                <div key={flag} className="flex items-center gap-2">
                                  <Checkbox
                                    id={`evpn-flag-${flag}`}
                                    checked={checked}
                                    disabled={afSaving}
                                    onCheckedChange={(c) => handleToggleEvpnFlag(flag, c === true)}
                                  />
                                  <Label htmlFor={`evpn-flag-${flag}`} className="text-sm cursor-pointer">
                                    {flag.replace(/-/g, " ")}
                                  </Label>
                                </div>
                              );
                            })}
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {!isL2vpnEvpn && (
                    <>
                    {/* Networks */}
                    <Card>
                      <CardContent className="p-6">
                        <h3 className="text-sm font-medium mb-4">{t("content.af.networks")}</h3>
                        <p className="text-xs text-muted-foreground mb-4">
                          {t("content.af.networksHelp")}
                        </p>

                        {currentAf && currentAf.networks.length > 0 && (
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>{t("content.prefix")}</TableHead>
                                <TableHead>{t("content.routeMap")}</TableHead>
                                <TableHead className="text-right">{tc("actions")}</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {currentAf.networks.map((net) => (
                                <TableRow key={net.prefix}>
                                  <TableCell className="font-mono">{net.prefix}</TableCell>
                                  <TableCell>{net.route_map || <span className="text-muted-foreground">-</span>}</TableCell>
                                  <TableCell className="text-right">
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8 text-destructive hover:text-destructive"
                                      onClick={() => handleDeleteNetwork(net.prefix)}
                                      disabled={afSaving}
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        )}

                        <div className="flex items-end gap-3 mt-4">
                          <div className="flex-1 space-y-1">
                            <Label className="text-xs">{t("content.prefix")}</Label>
                            <Input
                              value={afNetworkPrefix}
                              onChange={(e) => setAfNetworkPrefix(e.target.value)}
                              placeholder={t("eg", { value: "10.0.0.0/24" })}
                              className="h-9"
                            />
                          </div>
                          <div className="flex-1 space-y-1">
                            <Label className="text-xs">{t("content.routeMapOptional")}</Label>
                            <Select value={afNetworkRouteMap || "__none__"} onValueChange={(v) => setAfNetworkRouteMap(v === "__none__" ? "" : v)}>
                              <SelectTrigger className="h-9">
                                <SelectValue placeholder={tc("none")} />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="__none__">{tc("none")}</SelectItem>
                                {routeMapNames.map((name) => (
                                  <SelectItem key={name} value={name}>{name}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <Button size="sm" onClick={handleAddNetwork} disabled={afSaving || !afNetworkPrefix.trim()}>
                            {afSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4 mr-1" />}
                            {tc("add")}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Redistribute */}
                    <Card>
                      <CardContent className="p-6">
                        <h3 className="text-sm font-medium mb-4">{t("content.af.redistribute")}</h3>
                        <p className="text-xs text-muted-foreground mb-4">
                          {t("content.af.redistributeHelp")}
                        </p>

                        {currentAf && currentAf.redistribute.length > 0 && (
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>{t("content.af.protocol")}</TableHead>
                                <TableHead>{t("content.routeMap")}</TableHead>
                                <TableHead>{t("content.af.metric")}</TableHead>
                                <TableHead className="text-right">{tc("actions")}</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {currentAf.redistribute.map((rd) => (
                                <TableRow key={rd.protocol}>
                                  <TableCell className="font-mono">{rd.protocol}</TableCell>
                                  <TableCell>{rd.route_map || <span className="text-muted-foreground">-</span>}</TableCell>
                                  <TableCell className="font-mono">{rd.metric || <span className="text-muted-foreground">-</span>}</TableCell>
                                  <TableCell className="text-right">
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8 text-destructive hover:text-destructive"
                                      onClick={() => handleDeleteRedistribute(rd.protocol)}
                                      disabled={afSaving}
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        )}

                        <div className="flex items-end gap-3 mt-4">
                          <div className="w-[160px] space-y-1">
                            <Label className="text-xs">{t("content.af.protocol")}</Label>
                            <Select value={afRedistProto} onValueChange={setAfRedistProto}>
                              <SelectTrigger className="h-9">
                                <SelectValue placeholder={t("content.af.selectEllipsis")} />
                              </SelectTrigger>
                              <SelectContent>
                                {redistributeProtocols.map((p) => (
                                  <SelectItem key={p} value={p}>{p}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="flex-1 space-y-1">
                            <Label className="text-xs">{t("content.routeMapOptional")}</Label>
                            <Select value={afRedistRouteMap || "__none__"} onValueChange={(v) => setAfRedistRouteMap(v === "__none__" ? "" : v)}>
                              <SelectTrigger className="h-9">
                                <SelectValue placeholder={tc("none")} />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="__none__">{tc("none")}</SelectItem>
                                {routeMapNames.map((name) => (
                                  <SelectItem key={name} value={name}>{name}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="w-[100px] space-y-1">
                            <Label className="text-xs">{t("content.af.metric")}</Label>
                            <Input
                              value={afRedistMetric}
                              onChange={(e) => setAfRedistMetric(e.target.value)}
                              placeholder={t("eg", { value: "100" })}
                              className="h-9"
                            />
                          </div>
                          <Button size="sm" onClick={handleAddRedistribute} disabled={afSaving || !afRedistProto}>
                            {afSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4 mr-1" />}
                            {tc("add")}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Aggregate Addresses */}
                    <Card>
                      <CardContent className="p-6">
                        <h3 className="text-sm font-medium mb-4">{t("content.af.aggregate")}</h3>
                        <p className="text-xs text-muted-foreground mb-4">
                          {t("content.af.aggregateHelp")}
                        </p>

                        {currentAf && currentAf.aggregate_addresses.length > 0 && (
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>{t("content.prefix")}</TableHead>
                                <TableHead>{t("content.af.asSet")}</TableHead>
                                <TableHead>{t("content.af.summaryOnly")}</TableHead>
                                <TableHead>{t("content.routeMap")}</TableHead>
                                <TableHead className="text-right">{tc("actions")}</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {currentAf.aggregate_addresses.map((agg) => (
                                <TableRow key={agg.prefix}>
                                  <TableCell className="font-mono">{agg.prefix}</TableCell>
                                  <TableCell>{agg.as_set ? t("content.yes") : t("content.no")}</TableCell>
                                  <TableCell>{agg.summary_only ? t("content.yes") : t("content.no")}</TableCell>
                                  <TableCell>{agg.route_map || <span className="text-muted-foreground">-</span>}</TableCell>
                                  <TableCell className="text-right">
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8 text-destructive hover:text-destructive"
                                      onClick={() => handleDeleteAggregate(agg.prefix)}
                                      disabled={afSaving}
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        )}

                        <div className="flex items-end gap-3 mt-4">
                          <div className="flex-1 space-y-1">
                            <Label className="text-xs">{t("content.prefix")}</Label>
                            <Input
                              value={afAggPrefix}
                              onChange={(e) => setAfAggPrefix(e.target.value)}
                              placeholder={t("eg", { value: "10.0.0.0/8" })}
                              className="h-9"
                            />
                          </div>
                          <div className="flex-1 space-y-1">
                            <Label className="text-xs">{t("content.routeMapOptional")}</Label>
                            <Select value={afAggRouteMap || "__none__"} onValueChange={(v) => setAfAggRouteMap(v === "__none__" ? "" : v)}>
                              <SelectTrigger className="h-9">
                                <SelectValue placeholder={tc("none")} />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="__none__">{tc("none")}</SelectItem>
                                {routeMapNames.map((name) => (
                                  <SelectItem key={name} value={name}>{name}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="flex items-center gap-3 pb-0.5">
                            <div className="flex items-center gap-1.5">
                              <Checkbox
                                id="agg-as-set"
                                checked={afAggAsSet}
                                onCheckedChange={(c) => setAfAggAsSet(c === true)}
                              />
                              <Label htmlFor="agg-as-set" className="text-xs cursor-pointer">{t("content.af.asSet")}</Label>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <Checkbox
                                id="agg-summary"
                                checked={afAggSummaryOnly}
                                onCheckedChange={(c) => setAfAggSummaryOnly(c === true)}
                              />
                              <Label htmlFor="agg-summary" className="text-xs cursor-pointer">{t("content.af.summaryOnly")}</Label>
                            </div>
                          </div>
                          <Button size="sm" onClick={handleAddAggregate} disabled={afSaving || !afAggPrefix.trim()}>
                            {afSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4 mr-1" />}
                            {tc("add")}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                    </>
                    )}

                    {/* Maximum Paths */}
                    {currentAf && (currentAf.maximum_paths_ebgp || currentAf.maximum_paths_ibgp) && (
                      <Card>
                        <CardContent className="p-6">
                          <h3 className="text-sm font-medium mb-4">{t("content.af.maximumPaths")}</h3>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <Label className="text-xs text-muted-foreground">eBGP</Label>
                              <p className="font-mono">{currentAf.maximum_paths_ebgp ?? tc("default")}</p>
                            </div>
                            <div>
                              <Label className="text-xs text-muted-foreground">iBGP</Label>
                              <p className="font-mono">{currentAf.maximum_paths_ibgp ?? tc("default")}</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                )}
              </div>
            </TabsContent>

            {/* ============================================================ */}
            {/* Parameters Tab */}
            {/* ============================================================ */}
            <TabsContent value="parameters">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    {t("content.params.description")}
                  </p>
                  {!paramsEditing ? (
                    <Button size="sm" variant="outline" onClick={handleParamsEdit}>
                      <Pencil className="h-4 w-4 mr-2" />
                      {tc("edit")}
                    </Button>
                  ) : (
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={handleParamsCancel} disabled={paramsSaving}>
                        <X className="h-4 w-4 mr-2" />
                        {tc("cancel")}
                      </Button>
                      <Button size="sm" onClick={handleParamsSave} disabled={paramsSaving}>
                        {paramsSaving ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <Save className="h-4 w-4 mr-2" />
                        )}
                        {tc("save")}
                      </Button>
                    </div>
                  )}
                </div>

                {paramsError && (
                  <div className="p-3 rounded-md bg-destructive/10 text-destructive text-sm">
                    {paramsError}
                  </div>
                )}

                {/* General Settings */}
                <Card>
                  <CardContent className="p-6">
                    <h3 className="text-sm font-medium mb-4">{t("content.params.general")}</h3>
                    <div className="grid grid-cols-2 gap-4 mb-6">
                      <div className="space-y-2">
                        <Label className="text-xs">{t("content.params.clusterId")}</Label>
                        {paramsEditing && editParams ? (
                          <Input
                            value={editParams.cluster_id || ""}
                            onChange={(e) => updateParam("cluster_id", e.target.value || null)}
                            placeholder={t("eg", { value: "10.0.0.1" })}
                            className="h-9"
                          />
                        ) : (
                          <p className="text-sm font-mono p-2 bg-muted rounded-md">
                            {config?.parameters.cluster_id || <span className="text-muted-foreground">{tc("notSet")}</span>}
                          </p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs">{t("content.params.defaultLocalPref")}</Label>
                        {paramsEditing && editParams ? (
                          <Input
                            type="number"
                            value={editParams.default_local_pref ?? ""}
                            onChange={(e) => updateParam("default_local_pref", e.target.value ? parseInt(e.target.value, 10) : null)}
                            placeholder="100"
                            className="h-9"
                          />
                        ) : (
                          <p className="text-sm font-mono p-2 bg-muted rounded-md">
                            {config?.parameters.default_local_pref ?? <span className="text-muted-foreground">{t("content.defaultValue", { value: "100" })}</span>}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Boolean flags */}
                    <h4 className="text-xs font-medium text-muted-foreground mb-3">{t("content.params.behaviorFlags")}</h4>
                    <div className="space-y-3 rounded-lg border p-4">
                      {([
                        { key: "log_neighbor_changes" as const },
                        { key: "always_compare_med" as const },
                        { key: "deterministic_med" as const },
                        { key: "ebgp_requires_policy" as const },
                        { key: "graceful_shutdown" as const },
                        { key: "no_client_to_client_reflection" as const },
                        { key: "no_fast_external_failover" as const },
                        { key: "allow_martian_nexthop" as const },
                        { key: "disable_ebgp_connected_route_check" as const },
                        { key: "fast_convergence" as const },
                        { key: "network_import_check" as const },
                        { key: "reject_as_sets" as const },
                        { key: "route_reflector_allow_outbound_policy" as const },
                        { key: "suppress_fib_pending" as const },
                        { key: "no_suppress_duplicates" as const },
                        { key: "no_ipv6_auto_ra" as const },
                        { key: "shutdown" as const, destructive: true },
                      ] as const).map((item) => {
                        const { key } = item;
                        const destructive = "destructive" in item;
                        const params = paramsEditing ? editParams : config?.parameters;
                        const checked = (params?.[key] as boolean) ?? false;
                        return (
                          <div key={key} className="flex items-center space-x-3">
                            <Checkbox
                              id={`param-${key}`}
                              checked={checked}
                              disabled={!paramsEditing}
                              onCheckedChange={(c) => {
                                if (paramsEditing && editParams) {
                                  updateParam(key, c === true);
                                }
                              }}
                            />
                            <div className="flex-1">
                              <Label
                                htmlFor={`param-${key}`}
                                className={`cursor-pointer text-sm ${destructive ? "text-destructive" : ""}`}
                              >
                                {t(`content.params.flags.${key}.label`)}
                              </Label>
                              <p className="text-xs text-muted-foreground">{t(`content.params.flags.${key}.desc`)}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>

                {/* Bestpath Selection */}
                <Card>
                  <CardContent className="p-6">
                    <h3 className="text-sm font-medium mb-4">{t("content.params.bestpathTitle")}</h3>
                    <div className="space-y-3 rounded-lg border p-4">
                      {([
                        { key: "as_path_confed" as const },
                        { key: "as_path_ignore" as const },
                        { key: "as_path_multipath_relax" as const },
                        { key: "compare_routerid" as const },
                        { key: "peer_type_multipath_relax" as const },
                      ] as const).map(({ key }) => {
                        const bp = paramsEditing ? editParams?.bestpath : config?.parameters.bestpath;
                        const checked = bp?.[key] ?? false;
                        return (
                          <div key={key} className="flex items-center space-x-3">
                            <Checkbox
                              id={`bp-${key}`}
                              checked={checked}
                              disabled={!paramsEditing}
                              onCheckedChange={(c) => {
                                if (paramsEditing && editParams) {
                                  setEditParams({
                                    ...editParams,
                                    bestpath: { ...editParams.bestpath, [key]: c === true },
                                  });
                                }
                              }}
                            />
                            <div className="flex-1">
                              <Label htmlFor={`bp-${key}`} className="cursor-pointer text-sm">{t(`content.params.bestpath.${key}.label`)}</Label>
                              <p className="text-xs text-muted-foreground">{t(`content.params.bestpath.${key}.desc`)}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>

                {/* Administrative Distance */}
                <Card>
                  <CardContent className="p-6">
                    <h3 className="text-sm font-medium mb-4">{t("content.params.distanceTitle")}</h3>
                    <div className="grid grid-cols-3 gap-4">
                      {([
                        { key: "external" as const, placeholder: "20" },
                        { key: "internal" as const, placeholder: "200" },
                        { key: "local" as const, placeholder: "200" },
                      ] as const).map(({ key, placeholder }) => {
                        const dg = paramsEditing ? editParams?.distance_global : config?.parameters.distance_global;
                        return (
                          <div key={key} className="space-y-2">
                            <Label className="text-xs">{t(`content.params.distance.${key}`)}</Label>
                            {paramsEditing && editParams ? (
                              <Input
                                type="number"
                                value={dg?.[key] ?? ""}
                                onChange={(e) => {
                                  setEditParams({
                                    ...editParams,
                                    distance_global: {
                                      ...editParams.distance_global,
                                      [key]: e.target.value ? parseInt(e.target.value, 10) : null,
                                    },
                                  });
                                }}
                                placeholder={placeholder}
                                className="h-9"
                              />
                            ) : (
                              <p className="text-sm font-mono p-2 bg-muted rounded-md">
                                {dg?.[key] ?? <span className="text-muted-foreground">{t("content.defaultValue", { value: placeholder })}</span>}
                              </p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Modals */}
      <BgpNeighborModal
        open={neighborModalOpen}
        onOpenChange={(open) => {
          setNeighborModalOpen(open);
          if (!open) setEditingNeighbor(null);
        }}
        existingNeighbor={editingNeighbor}
        peerGroups={config?.peer_groups.map((pg) => pg.name) ?? []}
        capabilities={capabilities}
        routeMapNames={routeMapNames}
        bfdProfileNames={bfdProfileNames}
        onSubmit={editingNeighbor ? handleUpdateNeighbor : handleCreateNeighbor}
      />

      <DeleteBgpNeighborModal
        open={!!deletingNeighbor}
        onOpenChange={(open) => { if (!open) setDeletingNeighbor(null); }}
        neighborAddress={deletingNeighbor ?? ""}
        onConfirm={handleDeleteNeighbor}
      />

      <BgpPeerGroupModal
        open={peerGroupModalOpen}
        onOpenChange={(open) => {
          setPeerGroupModalOpen(open);
          if (!open) setEditingPeerGroup(null);
        }}
        existingPeerGroup={editingPeerGroup}
        capabilities={capabilities}
        routeMapNames={routeMapNames}
        bfdProfileNames={bfdProfileNames}
        onSubmit={editingPeerGroup ? handleUpdatePeerGroup : handleCreatePeerGroup}
      />

      <DeleteBgpPeerGroupModal
        open={!!deletingPeerGroup}
        onOpenChange={(open) => { if (!open) setDeletingPeerGroup(null); }}
        peerGroupName={deletingPeerGroup?.name ?? ""}
        memberCount={deletingPeerGroup?.members ?? 0}
        onConfirm={handleDeletePeerGroup}
      />
    </>
  );
}
