"use client";

import { useState, useEffect, useCallback } from "react";
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
  Globe,
  Settings2,
  ArrowLeftRight,
  Save,
  Loader2,
  Search,
} from "lucide-react";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import {
  ospfv3Service,
  Ospfv3Config,
  Ospfv3Capabilities,
  Ospfv3Area,
  Ospfv3Interface,
  Ospfv3Redistribute,
} from "@/lib/api/ospfv3";
import { routeMapService } from "@/lib/api/route-map";
import { accessListService } from "@/lib/api/access-list";
import { Ospfv3AreaModal } from "./Ospfv3AreaModal";
import { Ospfv3InterfaceModal } from "./Ospfv3InterfaceModal";
import { Ospfv3RedistributeModal } from "./Ospfv3RedistributeModal";
import { DeleteOspfv3Modal } from "./DeleteOspfv3Modal";
import { usePermissions } from "@/hooks/usePermissions";
import { FeatureGroup } from "@/lib/api/user-management";

export function Ospfv3Content() {
  const { canWrite } = usePermissions();
  const hasWritePermission = canWrite(FeatureGroup.OSPFV3);

  const [config, setConfig] = useState<Ospfv3Config | null>(null);
  const [capabilities, setCapabilities] = useState<Ospfv3Capabilities | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("overview");

  // Policy names for dropdowns
  const [routeMapNames, setRouteMapNames] = useState<string[]>([]);
  const [accessListNames, setAccessListNames] = useState<string[]>([]);

  // Search filters
  const [areaSearch, setAreaSearch] = useState("");
  const [ifaceSearch, setIfaceSearch] = useState("");

  // Area modal state
  const [areaModalOpen, setAreaModalOpen] = useState(false);
  const [editingArea, setEditingArea] = useState<Ospfv3Area | null>(null);
  const [deletingArea, setDeletingArea] = useState<string | null>(null);

  // Interface modal state
  const [ifaceModalOpen, setIfaceModalOpen] = useState(false);
  const [editingIface, setEditingIface] = useState<Ospfv3Interface | null>(null);
  const [deletingIface, setDeletingIface] = useState<string | null>(null);

  // Redistribute modal state
  const [redistModalOpen, setRedistModalOpen] = useState(false);
  const [deletingRedist, setDeletingRedist] = useState<Ospfv3Redistribute | null>(null);

  // Overview edit state
  const [overviewEditing, setOverviewEditing] = useState(false);
  const [overviewSaving, setOverviewSaving] = useState(false);
  const [overviewError, setOverviewError] = useState<string | null>(null);
  const [routerId, setRouterId] = useState("");
  const [logAdjChanges, setLogAdjChanges] = useState(false);
  const [logAdjDetail, setLogAdjDetail] = useState(false);
  const [refBandwidth, setRefBandwidth] = useState("");

  // Default information edit state
  const [diEditing, setDiEditing] = useState(false);
  const [diSaving, setDiSaving] = useState(false);
  const [diError, setDiError] = useState<string | null>(null);
  const [diEnabled, setDiEnabled] = useState(false);
  const [diAlways, setDiAlways] = useState(false);
  const [diMetric, setDiMetric] = useState("");
  const [diMetricType, setDiMetricType] = useState("");
  const [diRouteMap, setDiRouteMap] = useState("");

  // Advanced edit state
  const [advancedEditing, setAdvancedEditing] = useState(false);
  const [advancedSaving, setAdvancedSaving] = useState(false);
  const [advancedError, setAdvancedError] = useState<string | null>(null);
  const [distGlobal, setDistGlobal] = useState("");
  const [distExternal, setDistExternal] = useState("");
  const [distInterArea, setDistInterArea] = useState("");
  const [distIntraArea, setDistIntraArea] = useState("");
  const [grEnabled, setGrEnabled] = useState(false);
  const [grPeriod, setGrPeriod] = useState("");
  const [grHelperEnable, setGrHelperEnable] = useState(false);
  const [grHelperLsaCheck, setGrHelperLsaCheck] = useState(false);
  const [grHelperPlannedOnly, setGrHelperPlannedOnly] = useState(false);
  const [grHelperGraceTime, setGrHelperGraceTime] = useState("");

  const loadData = useCallback(async (refresh = false) => {
    try {
      setLoading(true);
      setError(null);
      const [configData, capData] = await Promise.all([
        ospfv3Service.getConfig(refresh),
        ospfv3Service.getCapabilities(),
      ]);
      setConfig(configData);
      setCapabilities(capData);

      // Load policy names for dropdowns - these require separate permissions
      // so we catch errors silently and default to empty arrays
      const [rmNames, aclNames] = await Promise.all([
        routeMapService.getConfig().then((c) => c.route_maps.map((rm) => rm.name)).catch(() => []),
        accessListService.getConfig().then((c) => c.ipv4_lists.map((al) => al.number)).catch(() => []),
      ]);
      setRouteMapNames(rmNames);
      setAccessListNames(aclNames);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load OSPFv3 configuration");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Stats
  const areaCount = config?.areas.length ?? 0;
  const ifaceCount = config?.interfaces.length ?? 0;
  const redistCount = config?.redistribute.length ?? 0;

  // Filtered lists
  const filteredAreas = config?.areas.filter((a) =>
    !areaSearch || a.area_id.includes(areaSearch)
  ) ?? [];

  const filteredIfaces = config?.interfaces.filter((i) =>
    !ifaceSearch || i.name.toLowerCase().includes(ifaceSearch.toLowerCase())
  ) ?? [];

  // ==========================================================================
  // Area handlers
  // ==========================================================================

  const handleCreateArea = async (area: Ospfv3Area) => {
    await ospfv3Service.createArea(area);
    await loadData(true);
  };

  const handleUpdateArea = async (area: Ospfv3Area) => {
    if (!editingArea) return;
    await ospfv3Service.updateArea(editingArea, area);
    setEditingArea(null);
    await loadData(true);
  };

  const handleDeleteArea = async () => {
    if (!deletingArea) return;
    await ospfv3Service.deleteArea(deletingArea);
    setDeletingArea(null);
    await loadData(true);
  };

  // ==========================================================================
  // Interface handlers
  // ==========================================================================

  const handleCreateInterface = async (iface: Ospfv3Interface) => {
    await ospfv3Service.createInterface(iface);
    await loadData(true);
  };

  const handleUpdateInterface = async (iface: Ospfv3Interface) => {
    if (!editingIface) return;
    await ospfv3Service.updateInterface(editingIface, iface);
    setEditingIface(null);
    await loadData(true);
  };

  const handleDeleteInterface = async () => {
    if (!deletingIface) return;
    await ospfv3Service.deleteInterface(deletingIface);
    setDeletingIface(null);
    await loadData(true);
  };

  // ==========================================================================
  // Redistribute handlers
  // ==========================================================================

  const handleAddRedistribute = async (entry: Ospfv3Redistribute) => {
    await ospfv3Service.addRedistribute(entry);
    await loadData(true);
  };

  const handleDeleteRedistribute = async () => {
    if (!deletingRedist) return;
    await ospfv3Service.removeRedistribute(deletingRedist.protocol);
    setDeletingRedist(null);
    await loadData(true);
  };

  // ==========================================================================
  // Overview save
  // ==========================================================================

  const startEditOverview = () => {
    if (!config) return;
    setRouterId(config.parameters.router_id || "");
    setLogAdjChanges(config.log_adjacency_changes === true);
    setLogAdjDetail(config.log_adjacency_changes_detail);
    setRefBandwidth(config.auto_cost_reference_bandwidth != null ? String(config.auto_cost_reference_bandwidth) : "");
    setOverviewEditing(true);
    setOverviewError(null);
  };

  const saveOverview = async () => {
    if (!config) return;
    try {
      setOverviewSaving(true);
      setOverviewError(null);
      await ospfv3Service.updateParameters(config, {
        router_id: routerId.trim() || null,
        log_adjacency_changes: logAdjChanges,
        log_adjacency_changes_detail: logAdjDetail,
        auto_cost_reference_bandwidth: refBandwidth.trim() ? parseInt(refBandwidth.trim(), 10) : null,
      });
      await loadData(true);
      setOverviewEditing(false);
    } catch (err) {
      setOverviewError(err instanceof Error ? err.message : "Failed to save parameters");
    } finally {
      setOverviewSaving(false);
    }
  };

  // ==========================================================================
  // Default Information save
  // ==========================================================================

  const startEditDI = () => {
    if (!config) return;
    setDiEnabled(config.default_information.enabled);
    setDiAlways(config.default_information.always);
    setDiMetric(config.default_information.metric != null ? String(config.default_information.metric) : "");
    setDiMetricType(config.default_information.metric_type != null ? String(config.default_information.metric_type) : "");
    setDiRouteMap(config.default_information.route_map || "");
    setDiEditing(true);
    setDiError(null);
  };

  const saveDI = async () => {
    if (!config) return;
    try {
      setDiSaving(true);
      setDiError(null);
      await ospfv3Service.updateDefaultInformation(config.default_information, {
        enabled: diEnabled,
        always: diAlways,
        metric: diMetric.trim() ? parseInt(diMetric.trim(), 10) : null,
        metric_type: diMetricType ? parseInt(diMetricType, 10) : null,
        route_map: diRouteMap.trim() || null,
      });
      await loadData(true);
      setDiEditing(false);
    } catch (err) {
      setDiError(err instanceof Error ? err.message : "Failed to save default information");
    } finally {
      setDiSaving(false);
    }
  };

  // ==========================================================================
  // Advanced save
  // ==========================================================================

  const startEditAdvanced = () => {
    if (!config) return;
    setDistGlobal(config.distance.global_value != null ? String(config.distance.global_value) : "");
    setDistExternal(config.distance.ospfv3.external != null ? String(config.distance.ospfv3.external) : "");
    setDistInterArea(config.distance.ospfv3.inter_area != null ? String(config.distance.ospfv3.inter_area) : "");
    setDistIntraArea(config.distance.ospfv3.intra_area != null ? String(config.distance.ospfv3.intra_area) : "");
    setGrEnabled(config.graceful_restart.enabled);
    setGrPeriod(config.graceful_restart.grace_period != null ? String(config.graceful_restart.grace_period) : "");
    setGrHelperEnable(config.graceful_restart.helper.enable);
    setGrHelperLsaCheck(config.graceful_restart.helper.lsa_check_disable);
    setGrHelperPlannedOnly(config.graceful_restart.helper.planned_only);
    setGrHelperGraceTime(config.graceful_restart.helper.supported_grace_time != null ? String(config.graceful_restart.helper.supported_grace_time) : "");
    setAdvancedEditing(true);
    setAdvancedError(null);
  };

  const saveAdvanced = async () => {
    if (!config) return;
    try {
      setAdvancedSaving(true);
      setAdvancedError(null);

      // Save distance
      await ospfv3Service.updateDistance(config.distance, {
        global_value: distGlobal.trim() ? parseInt(distGlobal.trim(), 10) : null,
        ospfv3: {
          external: distExternal.trim() ? parseInt(distExternal.trim(), 10) : null,
          inter_area: distInterArea.trim() ? parseInt(distInterArea.trim(), 10) : null,
          intra_area: distIntraArea.trim() ? parseInt(distIntraArea.trim(), 10) : null,
        },
      });

      // Save graceful restart
      await ospfv3Service.updateGracefulRestart(config.graceful_restart, {
        enabled: grEnabled,
        grace_period: grPeriod.trim() ? parseInt(grPeriod.trim(), 10) : null,
        helper: {
          enable: grHelperEnable,
          router_ids: config.graceful_restart.helper.router_ids,
          lsa_check_disable: grHelperLsaCheck,
          planned_only: grHelperPlannedOnly,
          supported_grace_time: grHelperGraceTime.trim() ? parseInt(grHelperGraceTime.trim(), 10) : null,
        },
      });

      await loadData(true);
      setAdvancedEditing(false);
    } catch (err) {
      setAdvancedError(err instanceof Error ? err.message : "Failed to save advanced settings");
    } finally {
      setAdvancedSaving(false);
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
              <h1 className="text-2xl font-bold text-foreground">OSPFv3 Configuration</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Open Shortest Path First v3 for IPv6 routing
              </p>
            </div>
            <div className="flex items-center gap-2">
              {!hasWritePermission && (
                <Badge variant="secondary">Read Only</Badge>
              )}
              <Button variant="outline" size="sm" onClick={() => loadData(true)}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>
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
                    <Globe className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{areaCount}</p>
                    <p className="text-xs text-muted-foreground">Areas</p>
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
                    <p className="text-2xl font-bold">{ifaceCount}</p>
                    <p className="text-xs text-muted-foreground">Interfaces</p>
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
                    <Settings2 className="h-4 w-4 text-orange-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold font-mono text-base">
                      {config?.parameters.router_id || "Auto"}
                    </p>
                    <p className="text-xs text-muted-foreground">Router ID</p>
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
              <TabsTrigger value="areas">
                Areas
                {areaCount > 0 && (
                  <Badge variant="secondary" className="ml-2">{areaCount}</Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="interfaces">
                Interfaces
                {ifaceCount > 0 && (
                  <Badge variant="secondary" className="ml-2">{ifaceCount}</Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="redistribute">
                Redistribute
                {redistCount > 0 && (
                  <Badge variant="secondary" className="ml-2">{redistCount}</Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="advanced">Advanced</TabsTrigger>
            </TabsList>

            {/* ============================================================ */}
            {/* Overview Tab */}
            {/* ============================================================ */}
            <TabsContent value="overview">
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm text-muted-foreground">
                  OSPFv3 global parameters and settings
                </p>
                {hasWritePermission && (
                  !overviewEditing ? (
                    <Button size="sm" variant="outline" onClick={startEditOverview}>
                      <Pencil className="h-4 w-4 mr-2" />
                      Edit Parameters
                    </Button>
                  ) : (
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => setOverviewEditing(false)}>
                        Cancel
                      </Button>
                      <Button size="sm" onClick={saveOverview} disabled={overviewSaving}>
                        {overviewSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                        Save
                      </Button>
                    </div>
                  )
                )}
              </div>

              {overviewError && (
                <div className="mb-4 p-3 rounded-md bg-destructive/10 text-destructive text-sm whitespace-pre-wrap">
                  {overviewError}
                </div>
              )}

              <div className="grid grid-cols-2 gap-6">
                {/* Parameters Card */}
                <Card>
                  <CardContent className="p-6">
                    <h3 className="font-semibold mb-4">Parameters</h3>
                    <div className="space-y-4">
                      <div>
                        <Label className="text-sm">Router ID</Label>
                        <Input
                          value={overviewEditing ? routerId : (config?.parameters.router_id ?? "")}
                          disabled={!overviewEditing}
                          onChange={(e) => setRouterId(e.target.value)}
                          placeholder="Auto-detected"
                        />
                      </div>
                      <div>
                        <Label className="text-sm">Reference Bandwidth</Label>
                        <Input
                          type="number"
                          value={overviewEditing ? refBandwidth : (config?.auto_cost_reference_bandwidth != null ? String(config.auto_cost_reference_bandwidth) : "")}
                          disabled={!overviewEditing}
                          onChange={(e) => setRefBandwidth(e.target.value)}
                          placeholder="Default (100 Mbps)"
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Options Card */}
                <Card>
                  <CardContent className="p-6">
                    <h3 className="font-semibold mb-4">Options</h3>
                    <div className="space-y-4">
                      <div className="flex items-center gap-3">
                        <Checkbox
                          id="ospfv3-log-adj"
                          checked={overviewEditing ? logAdjChanges : config?.log_adjacency_changes === true}
                          disabled={!overviewEditing}
                          onCheckedChange={(checked) => setLogAdjChanges(!!checked)}
                        />
                        <Label htmlFor="ospfv3-log-adj">Log Adjacency Changes</Label>
                      </div>
                      <div className="flex items-center gap-3">
                        <Checkbox
                          id="ospfv3-log-adj-detail"
                          checked={overviewEditing ? logAdjDetail : config?.log_adjacency_changes_detail}
                          disabled={!overviewEditing}
                          onCheckedChange={(checked) => setLogAdjDetail(!!checked)}
                        />
                        <Label htmlFor="ospfv3-log-adj-detail">Log Adjacency Changes (Detail)</Label>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Default Information Card */}
                <Card className="col-span-2">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-semibold">Default Information Originate</h3>
                      {hasWritePermission && (
                        !diEditing ? (
                          <Button size="sm" variant="outline" onClick={startEditDI}>
                            <Pencil className="h-4 w-4 mr-2" />
                            Edit
                          </Button>
                        ) : (
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline" onClick={() => setDiEditing(false)}>
                              Cancel
                            </Button>
                            <Button size="sm" onClick={saveDI} disabled={diSaving}>
                              {diSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                              Save
                            </Button>
                          </div>
                        )
                      )}
                    </div>

                    {diError && (
                      <div className="mb-4 p-3 rounded-md bg-destructive/10 text-destructive text-sm whitespace-pre-wrap">
                        {diError}
                      </div>
                    )}

                    <div className="grid grid-cols-5 gap-4 items-end">
                      <div className="flex items-center gap-3">
                        <Checkbox
                          id="ospfv3-di-enabled"
                          checked={diEditing ? diEnabled : config?.default_information.enabled}
                          disabled={!diEditing}
                          onCheckedChange={(checked) => setDiEnabled(!!checked)}
                        />
                        <Label htmlFor="ospfv3-di-enabled">Enabled</Label>
                      </div>
                      <div className="flex items-center gap-3">
                        <Checkbox
                          id="ospfv3-di-always"
                          checked={diEditing ? diAlways : config?.default_information.always}
                          disabled={!diEditing}
                          onCheckedChange={(checked) => setDiAlways(!!checked)}
                        />
                        <Label htmlFor="ospfv3-di-always">Always</Label>
                      </div>
                      <div>
                        <Label className="text-sm">Metric</Label>
                        <Input
                          type="number"
                          value={diEditing ? diMetric : (config?.default_information.metric != null ? String(config.default_information.metric) : "")}
                          disabled={!diEditing}
                          onChange={(e) => setDiMetric(e.target.value)}
                          placeholder="Default"
                        />
                      </div>
                      <div>
                        <Label className="text-sm">Metric Type</Label>
                        <Select
                          value={diEditing ? diMetricType : (config?.default_information.metric_type != null ? String(config.default_information.metric_type) : "")}
                          onValueChange={setDiMetricType}
                          disabled={!diEditing}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Default" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="1">Type 1</SelectItem>
                            <SelectItem value="2">Type 2</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-sm">Route Map</Label>
                        <Select
                          value={diEditing ? diRouteMap : (config?.default_information.route_map ?? "")}
                          onValueChange={(v) => setDiRouteMap(v === "__none__" ? "" : v)}
                          disabled={!diEditing}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="None" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__none__">None</SelectItem>
                            {routeMapNames.map((name) => (
                              <SelectItem key={name} value={name}>{name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* ============================================================ */}
            {/* Areas Tab */}
            {/* ============================================================ */}
            <TabsContent value="areas">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <p className="text-sm text-muted-foreground">
                    OSPFv3 area configuration
                  </p>
                  {areaCount > 3 && (
                    <div className="relative">
                      <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        value={areaSearch}
                        onChange={(e) => setAreaSearch(e.target.value)}
                        placeholder="Filter areas..."
                        className="pl-8 h-9 w-48"
                      />
                    </div>
                  )}
                </div>
                {hasWritePermission && (
                  <Button size="sm" onClick={() => { setEditingArea(null); setAreaModalOpen(true); }}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Area
                  </Button>
                )}
              </div>

              {areaCount === 0 ? (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <Globe className="h-12 w-12 text-muted-foreground/30 mb-4" />
                    <p className="text-sm text-muted-foreground mb-2">No OSPFv3 areas configured</p>
                    <p className="text-xs text-muted-foreground mb-4">
                      Add an area to start configuring OSPFv3 IPv6 routing
                    </p>
                    {hasWritePermission && (
                      <Button size="sm" onClick={() => { setEditingArea(null); setAreaModalOpen(true); }}>
                        <Plus className="h-4 w-4 mr-2" />
                        Add Area
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
                          <TableHead>Area ID</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Ranges</TableHead>
                          <TableHead>Export List</TableHead>
                          <TableHead>Import List</TableHead>
                          {hasWritePermission && <TableHead className="text-right">Actions</TableHead>}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredAreas.map((area) => (
                          <TableRow key={area.area_id}>
                            <TableCell className="font-medium font-mono">{area.area_id}</TableCell>
                            <TableCell>
                              {area.area_type ? (
                                <Badge variant="outline">
                                  {area.area_type}
                                  {area.area_type_no_summary && " (no-summary)"}
                                </Badge>
                              ) : (
                                <span className="text-muted-foreground">normal</span>
                              )}
                            </TableCell>
                            <TableCell>
                              {area.ranges.length > 0 ? (
                                <div className="flex flex-wrap gap-1">
                                  {area.ranges.map((r) => (
                                    <Badge key={r.prefix} variant="secondary" className="font-mono text-xs">
                                      {r.prefix}
                                    </Badge>
                                  ))}
                                </div>
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </TableCell>
                            <TableCell>
                              {area.export_list ? (
                                <Badge variant="secondary">{area.export_list}</Badge>
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </TableCell>
                            <TableCell>
                              {area.import_list ? (
                                <Badge variant="secondary">{area.import_list}</Badge>
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </TableCell>
                            {hasWritePermission && (
                              <TableCell className="text-right">
                                <div className="flex items-center justify-end gap-1">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8"
                                    onClick={() => {
                                      setEditingArea(area);
                                      setAreaModalOpen(true);
                                    }}
                                  >
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-destructive hover:text-destructive"
                                    onClick={() => setDeletingArea(area.area_id)}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </TableCell>
                            )}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                </Card>
              )}
            </TabsContent>

            {/* ============================================================ */}
            {/* Interfaces Tab */}
            {/* ============================================================ */}
            <TabsContent value="interfaces">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <p className="text-sm text-muted-foreground">
                    OSPFv3 interface settings
                  </p>
                  {ifaceCount > 3 && (
                    <div className="relative">
                      <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        value={ifaceSearch}
                        onChange={(e) => setIfaceSearch(e.target.value)}
                        placeholder="Filter interfaces..."
                        className="pl-8 h-9 w-48"
                      />
                    </div>
                  )}
                </div>
                {hasWritePermission && (
                  <Button size="sm" onClick={() => { setEditingIface(null); setIfaceModalOpen(true); }}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Interface
                  </Button>
                )}
              </div>

              {ifaceCount === 0 ? (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <Network className="h-12 w-12 text-muted-foreground/30 mb-4" />
                    <p className="text-sm text-muted-foreground mb-2">No OSPFv3 interfaces configured</p>
                    <p className="text-xs text-muted-foreground mb-4">
                      Add an interface to enable OSPFv3 IPv6 routing on it
                    </p>
                    {hasWritePermission && (
                      <Button size="sm" onClick={() => { setEditingIface(null); setIfaceModalOpen(true); }}>
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
                          <TableHead>Area</TableHead>
                          <TableHead>Cost</TableHead>
                          <TableHead>Priority</TableHead>
                          <TableHead>Network Type</TableHead>
                          <TableHead>Passive</TableHead>
                          <TableHead>BFD</TableHead>
                          <TableHead>Instance ID</TableHead>
                          {hasWritePermission && <TableHead className="text-right">Actions</TableHead>}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredIfaces.map((iface) => (
                          <TableRow key={iface.name}>
                            <TableCell className="font-medium font-mono">{iface.name}</TableCell>
                            <TableCell>
                              {iface.area ? (
                                <Badge variant="secondary" className="font-mono">{iface.area}</Badge>
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </TableCell>
                            <TableCell>
                              {iface.cost != null ? iface.cost : <span className="text-muted-foreground">auto</span>}
                            </TableCell>
                            <TableCell>
                              {iface.priority != null ? iface.priority : <span className="text-muted-foreground">default</span>}
                            </TableCell>
                            <TableCell>
                              {iface.network ? (
                                <Badge variant="outline">{iface.network}</Badge>
                              ) : (
                                <span className="text-muted-foreground">default</span>
                              )}
                            </TableCell>
                            <TableCell>
                              {iface.passive ? (
                                <Badge variant="secondary">Yes</Badge>
                              ) : (
                                <span className="text-muted-foreground">No</span>
                              )}
                            </TableCell>
                            <TableCell>
                              {iface.bfd ? (
                                <Badge variant="secondary">
                                  {iface.bfd_profile ? iface.bfd_profile : "Yes"}
                                </Badge>
                              ) : (
                                <span className="text-muted-foreground">No</span>
                              )}
                            </TableCell>
                            <TableCell>
                              {iface.instance_id != null ? iface.instance_id : <span className="text-muted-foreground">-</span>}
                            </TableCell>
                            {hasWritePermission && (
                              <TableCell className="text-right">
                                <div className="flex items-center justify-end gap-1">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8"
                                    onClick={() => {
                                      setEditingIface(iface);
                                      setIfaceModalOpen(true);
                                    }}
                                  >
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-destructive hover:text-destructive"
                                    onClick={() => setDeletingIface(iface.name)}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </TableCell>
                            )}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                </Card>
              )}
            </TabsContent>

            {/* ============================================================ */}
            {/* Redistribute Tab */}
            {/* ============================================================ */}
            <TabsContent value="redistribute">
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm text-muted-foreground">
                  Route redistribution into OSPFv3
                </p>
                {hasWritePermission && (
                  <Button size="sm" onClick={() => setRedistModalOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Redistribute
                  </Button>
                )}
              </div>

              {redistCount === 0 ? (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <ArrowLeftRight className="h-12 w-12 text-muted-foreground/30 mb-4" />
                    <p className="text-sm text-muted-foreground mb-2">No route redistribution configured</p>
                    <p className="text-xs text-muted-foreground mb-4">
                      Add redistribution to import routes from other protocols into OSPFv3
                    </p>
                    {hasWritePermission && (
                      <Button size="sm" onClick={() => setRedistModalOpen(true)}>
                        <Plus className="h-4 w-4 mr-2" />
                        Add Redistribute
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
                          <TableHead>Protocol</TableHead>
                          <TableHead>Metric</TableHead>
                          <TableHead>Metric Type</TableHead>
                          <TableHead>Route Map</TableHead>
                          {hasWritePermission && <TableHead className="text-right">Actions</TableHead>}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {config?.redistribute.map((entry) => (
                          <TableRow key={entry.protocol}>
                            <TableCell className="font-medium">{entry.protocol}</TableCell>
                            <TableCell>
                              {entry.metric ?? <span className="text-muted-foreground">default</span>}
                            </TableCell>
                            <TableCell>
                              {entry.metric_type ? (
                                <Badge variant="outline">Type {entry.metric_type}</Badge>
                              ) : (
                                <span className="text-muted-foreground">default</span>
                              )}
                            </TableCell>
                            <TableCell>
                              {entry.route_map ? (
                                <Badge variant="secondary">{entry.route_map}</Badge>
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </TableCell>
                            {hasWritePermission && (
                              <TableCell className="text-right">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-destructive hover:text-destructive"
                                  onClick={() => setDeletingRedist(entry)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </TableCell>
                            )}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                </Card>
              )}
            </TabsContent>

            {/* ============================================================ */}
            {/* Advanced Tab */}
            {/* ============================================================ */}
            <TabsContent value="advanced">
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm text-muted-foreground">
                  Advanced OSPFv3 protocol settings
                </p>
                {hasWritePermission && (
                  !advancedEditing ? (
                    <Button size="sm" variant="outline" onClick={startEditAdvanced}>
                      <Pencil className="h-4 w-4 mr-2" />
                      Edit Advanced
                    </Button>
                  ) : (
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => setAdvancedEditing(false)}>
                        Cancel
                      </Button>
                      <Button size="sm" onClick={saveAdvanced} disabled={advancedSaving}>
                        {advancedSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                        Save
                      </Button>
                    </div>
                  )
                )}
              </div>

              {advancedError && (
                <div className="mb-4 p-3 rounded-md bg-destructive/10 text-destructive text-sm whitespace-pre-wrap">
                  {advancedError}
                </div>
              )}

              <div className="grid grid-cols-2 gap-6">
                {/* Distance */}
                <Card>
                  <CardContent className="p-6">
                    <h3 className="font-semibold mb-4">Administrative Distance</h3>
                    <div className="space-y-4">
                      <div>
                        <Label className="text-sm">Global Distance</Label>
                        <Input
                          type="number"
                          value={advancedEditing ? distGlobal : (config?.distance.global_value != null ? String(config.distance.global_value) : "")}
                          disabled={!advancedEditing}
                          onChange={(e) => setDistGlobal(e.target.value)}
                          placeholder="110"
                          min={1}
                          max={255}
                        />
                      </div>
                      <div>
                        <Label className="text-sm">External</Label>
                        <Input
                          type="number"
                          value={advancedEditing ? distExternal : (config?.distance.ospfv3.external != null ? String(config.distance.ospfv3.external) : "")}
                          disabled={!advancedEditing}
                          onChange={(e) => setDistExternal(e.target.value)}
                          placeholder="Default"
                          min={1}
                          max={255}
                        />
                      </div>
                      <div>
                        <Label className="text-sm">Inter-Area</Label>
                        <Input
                          type="number"
                          value={advancedEditing ? distInterArea : (config?.distance.ospfv3.inter_area != null ? String(config.distance.ospfv3.inter_area) : "")}
                          disabled={!advancedEditing}
                          onChange={(e) => setDistInterArea(e.target.value)}
                          placeholder="Default"
                          min={1}
                          max={255}
                        />
                      </div>
                      <div>
                        <Label className="text-sm">Intra-Area</Label>
                        <Input
                          type="number"
                          value={advancedEditing ? distIntraArea : (config?.distance.ospfv3.intra_area != null ? String(config.distance.ospfv3.intra_area) : "")}
                          disabled={!advancedEditing}
                          onChange={(e) => setDistIntraArea(e.target.value)}
                          placeholder="Default"
                          min={1}
                          max={255}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Graceful Restart */}
                <Card>
                  <CardContent className="p-6">
                    <h3 className="font-semibold mb-4">Graceful Restart</h3>
                    <div className="space-y-4">
                      <div className="flex items-center gap-3">
                        <Checkbox
                          id="ospfv3-gr-enabled"
                          checked={advancedEditing ? grEnabled : config?.graceful_restart.enabled}
                          disabled={!advancedEditing}
                          onCheckedChange={(checked) => setGrEnabled(!!checked)}
                        />
                        <Label htmlFor="ospfv3-gr-enabled">Enable Graceful Restart</Label>
                      </div>
                      <div>
                        <Label className="text-sm">Grace Period (seconds)</Label>
                        <Input
                          type="number"
                          value={advancedEditing ? grPeriod : (config?.graceful_restart.grace_period != null ? String(config.graceful_restart.grace_period) : "")}
                          disabled={!advancedEditing}
                          onChange={(e) => setGrPeriod(e.target.value)}
                          placeholder="Default (120)"
                        />
                      </div>
                      <div className="flex items-center gap-3">
                        <Checkbox
                          id="ospfv3-gr-helper"
                          checked={advancedEditing ? grHelperEnable : config?.graceful_restart.helper.enable}
                          disabled={!advancedEditing}
                          onCheckedChange={(checked) => setGrHelperEnable(!!checked)}
                        />
                        <Label htmlFor="ospfv3-gr-helper">Enable Helper</Label>
                      </div>
                      <div className="flex items-center gap-3">
                        <Checkbox
                          id="ospfv3-gr-lsa-check"
                          checked={advancedEditing ? grHelperLsaCheck : config?.graceful_restart.helper.lsa_check_disable}
                          disabled={!advancedEditing}
                          onCheckedChange={(checked) => setGrHelperLsaCheck(!!checked)}
                        />
                        <Label htmlFor="ospfv3-gr-lsa-check">Disable LSA Check</Label>
                      </div>
                      <div className="flex items-center gap-3">
                        <Checkbox
                          id="ospfv3-gr-planned"
                          checked={advancedEditing ? grHelperPlannedOnly : config?.graceful_restart.helper.planned_only}
                          disabled={!advancedEditing}
                          onCheckedChange={(checked) => setGrHelperPlannedOnly(!!checked)}
                        />
                        <Label htmlFor="ospfv3-gr-planned">Planned Only</Label>
                      </div>
                      <div>
                        <Label className="text-sm">Supported Grace Time (seconds)</Label>
                        <Input
                          type="number"
                          value={advancedEditing ? grHelperGraceTime : (config?.graceful_restart.helper.supported_grace_time != null ? String(config.graceful_restart.helper.supported_grace_time) : "")}
                          disabled={!advancedEditing}
                          onChange={(e) => setGrHelperGraceTime(e.target.value)}
                          placeholder="Default"
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Modals */}
      <Ospfv3AreaModal
        open={areaModalOpen}
        onOpenChange={setAreaModalOpen}
        onSubmit={editingArea ? handleUpdateArea : handleCreateArea}
        existingArea={editingArea}
        accessListNames={accessListNames}
      />

      <Ospfv3InterfaceModal
        open={ifaceModalOpen}
        onOpenChange={setIfaceModalOpen}
        onSubmit={editingIface ? handleUpdateInterface : handleCreateInterface}
        existingInterface={editingIface}
        capabilities={capabilities}
      />

      <Ospfv3RedistributeModal
        open={redistModalOpen}
        onOpenChange={setRedistModalOpen}
        onSubmit={handleAddRedistribute}
        capabilities={capabilities}
        existingProtocols={config?.redistribute.map((r) => r.protocol) ?? []}
        routeMapNames={routeMapNames}
      />

      {deletingArea && (
        <DeleteOspfv3Modal
          open={!!deletingArea}
          onOpenChange={(open) => !open && setDeletingArea(null)}
          itemType="Area"
          itemName={deletingArea}
          onConfirm={handleDeleteArea}
        />
      )}

      {deletingIface && (
        <DeleteOspfv3Modal
          open={!!deletingIface}
          onOpenChange={(open) => !open && setDeletingIface(null)}
          itemType="Interface"
          itemName={deletingIface}
          onConfirm={handleDeleteInterface}
        />
      )}

      {deletingRedist && (
        <DeleteOspfv3Modal
          open={!!deletingRedist}
          onOpenChange={(open) => !open && setDeletingRedist(null)}
          itemType="Redistribute"
          itemName={deletingRedist.protocol}
          onConfirm={handleDeleteRedistribute}
        />
      )}
    </>
  );
}
