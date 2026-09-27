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
  ospfService,
  OspfConfig,
  OspfCapabilities,
  OspfArea,
  OspfInterface,
  OspfRedistribute,
} from "@/lib/api/ospf";
import { routeMapService } from "@/lib/api/route-map";
import { accessListService } from "@/lib/api/access-list";
import { OspfAreaModal } from "./OspfAreaModal";
import { OspfInterfaceModal } from "./OspfInterfaceModal";
import { OspfRedistributeModal } from "./OspfRedistributeModal";
import { DeleteOspfModal } from "./DeleteOspfModal";
import { usePermissions } from "@/hooks/usePermissions";
import { FeatureGroup } from "@/lib/api/user-management";
import { useTranslations } from "next-intl";

export function OspfContent() {
  const t = useTranslations("ospf");
  const tc = useTranslations("common");
  const { canWrite } = usePermissions();
  const hasWritePermission = canWrite(FeatureGroup.OSPF);

  const [config, setConfig] = useState<OspfConfig | null>(null);
  const [capabilities, setCapabilities] = useState<OspfCapabilities | null>(null);
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
  const [editingArea, setEditingArea] = useState<OspfArea | null>(null);
  const [deletingArea, setDeletingArea] = useState<string | null>(null);

  // Interface modal state
  const [ifaceModalOpen, setIfaceModalOpen] = useState(false);
  const [editingIface, setEditingIface] = useState<OspfInterface | null>(null);
  const [deletingIface, setDeletingIface] = useState<string | null>(null);

  // Redistribute modal state
  const [redistModalOpen, setRedistModalOpen] = useState(false);
  const [deletingRedist, setDeletingRedist] = useState<OspfRedistribute | null>(null);

  // Overview edit state
  const [overviewEditing, setOverviewEditing] = useState(false);
  const [overviewSaving, setOverviewSaving] = useState(false);
  const [overviewError, setOverviewError] = useState<string | null>(null);
  const [routerId, setRouterId] = useState("");
  const [abrType, setAbrType] = useState("");
  const [passiveDefault, setPassiveDefault] = useState(false);
  const [logAdjChanges, setLogAdjChanges] = useState(false);
  const [logAdjDetail, setLogAdjDetail] = useState(false);
  const [maxPaths, setMaxPaths] = useState("");
  const [refBandwidth, setRefBandwidth] = useState("");
  const [opaqueLsa, setOpaqueLsa] = useState(false);
  const [rfc1583, setRfc1583] = useState(false);

  // Advanced edit state
  const [advancedEditing, setAdvancedEditing] = useState(false);
  const [advancedSaving, setAdvancedSaving] = useState(false);
  const [advancedError, setAdvancedError] = useState<string | null>(null);
  const [spfDelay, setSpfDelay] = useState("");
  const [spfInitial, setSpfInitial] = useState("");
  const [spfMax, setSpfMax] = useState("");
  const [distGlobal, setDistGlobal] = useState("");
  const [distExternal, setDistExternal] = useState("");
  const [distInterArea, setDistInterArea] = useState("");
  const [distIntraArea, setDistIntraArea] = useState("");
  const [maxMetricAdmin, setMaxMetricAdmin] = useState(false);
  const [maxMetricShutdown, setMaxMetricShutdown] = useState("");
  const [maxMetricStartup, setMaxMetricStartup] = useState("");
  const [grEnabled, setGrEnabled] = useState(false);
  const [grPeriod, setGrPeriod] = useState("");
  const [grHelperEnable, setGrHelperEnable] = useState(false);
  const [grHelperRouterIds, setGrHelperRouterIds] = useState<string[]>([]);
  const [grHelperRouterIdDraft, setGrHelperRouterIdDraft] = useState("");
  const [ldpSyncHolddown, setLdpSyncHolddown] = useState("");
  const [refreshTimers, setRefreshTimers] = useState("");
  const [aggregationTimer, setAggregationTimer] = useState("");
  const [capabilityOpaque, setCapabilityOpaque] = useState(false);

  // Default information edit state
  const [diEditing, setDiEditing] = useState(false);
  const [diSaving, setDiSaving] = useState(false);
  const [diEnabled, setDiEnabled] = useState(false);
  const [diAlways, setDiAlways] = useState(false);
  const [diMetric, setDiMetric] = useState("");
  const [diMetricType, setDiMetricType] = useState("");
  const [diRouteMap, setDiRouteMap] = useState("");

  const loadData = useCallback(async (refresh = false) => {
    try {
      setLoading(true);
      setError(null);
      const [configData, capData] = await Promise.all([
        ospfService.getConfig(refresh),
        ospfService.getCapabilities(),
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
      setError(err instanceof Error ? err.message : t("page.loadFailed"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Stats
  const areaCount = config?.areas.length ?? 0;
  const ifaceCount = config?.interfaces.length ?? 0;
  const redistCount = config?.redistribute.length ?? 0;

  // Filtered lists
  const filteredAreas = config?.areas.filter((a) =>
    !areaSearch || a.area_id.includes(areaSearch) || a.networks.some((n) => n.includes(areaSearch))
  ) ?? [];

  const filteredIfaces = config?.interfaces.filter((i) =>
    !ifaceSearch || i.name.toLowerCase().includes(ifaceSearch.toLowerCase())
  ) ?? [];

  // ==========================================================================
  // Area handlers
  // ==========================================================================

  const handleCreateArea = async (area: OspfArea) => {
    await ospfService.createArea(area);
    await loadData(true);
  };

  const handleUpdateArea = async (area: OspfArea) => {
    if (!editingArea) return;
    await ospfService.updateArea(editingArea, area);
    setEditingArea(null);
    await loadData(true);
  };

  const handleDeleteArea = async () => {
    if (!deletingArea) return;
    await ospfService.deleteArea(deletingArea);
    setDeletingArea(null);
    await loadData(true);
  };

  // ==========================================================================
  // Interface handlers
  // ==========================================================================

  const handleCreateInterface = async (iface: OspfInterface) => {
    await ospfService.createInterface(iface);
    await loadData(true);
  };

  const handleUpdateInterface = async (iface: OspfInterface) => {
    if (!editingIface) return;
    await ospfService.updateInterface(editingIface, iface);
    setEditingIface(null);
    await loadData(true);
  };

  const handleDeleteInterface = async () => {
    if (!deletingIface) return;
    await ospfService.deleteInterface(deletingIface);
    setDeletingIface(null);
    await loadData(true);
  };

  // ==========================================================================
  // Redistribute handlers
  // ==========================================================================

  const handleAddRedistribute = async (entry: OspfRedistribute) => {
    await ospfService.addRedistribute(entry);
    await loadData(true);
  };

  const handleDeleteRedistribute = async () => {
    if (!deletingRedist) return;
    await ospfService.removeRedistribute(deletingRedist);
    setDeletingRedist(null);
    await loadData(true);
  };

  // ==========================================================================
  // Overview save
  // ==========================================================================

  const startEditOverview = () => {
    if (!config) return;
    setRouterId(config.parameters.router_id || "");
    setAbrType(config.parameters.abr_type || "");
    setPassiveDefault(config.passive_interface_default);
    setLogAdjChanges(config.log_adjacency_changes === true);
    setLogAdjDetail(config.log_adjacency_changes_detail);
    setMaxPaths(config.maximum_paths != null ? String(config.maximum_paths) : "");
    setRefBandwidth(config.auto_cost_reference_bandwidth != null ? String(config.auto_cost_reference_bandwidth) : "");
    setOpaqueLsa(config.parameters.opaque_lsa);
    setRfc1583(config.parameters.rfc1583_compatibility);
    setOverviewEditing(true);
    setOverviewError(null);
  };

  const saveOverview = async () => {
    if (!config) return;
    try {
      setOverviewSaving(true);
      setOverviewError(null);
      await ospfService.updateParameters(config, {
        router_id: routerId.trim() || null,
        abr_type: abrType || null,
        opaque_lsa: opaqueLsa,
        rfc1583_compatibility: rfc1583,
        passive_interface_default: passiveDefault,
        log_adjacency_changes: logAdjChanges,
        log_adjacency_changes_detail: logAdjDetail,
        maximum_paths: maxPaths.trim() ? parseInt(maxPaths.trim(), 10) : null,
        auto_cost_reference_bandwidth: refBandwidth.trim() ? parseInt(refBandwidth.trim(), 10) : null,
      });
      await loadData(true);
      setOverviewEditing(false);
    } catch (err) {
      setOverviewError(err instanceof Error ? err.message : t("page.saveParametersFailed"));
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
  };

  const saveDI = async () => {
    if (!config) return;
    try {
      setDiSaving(true);
      await ospfService.updateDefaultInformation(config.default_information, {
        enabled: diEnabled,
        always: diAlways,
        metric: diMetric.trim() ? parseInt(diMetric.trim(), 10) : null,
        metric_type: diMetricType ? parseInt(diMetricType, 10) : null,
        route_map: diRouteMap.trim() || null,
      });
      await loadData(true);
      setDiEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("page.saveDefaultInfoFailed"));
    } finally {
      setDiSaving(false);
    }
  };

  // ==========================================================================
  // Advanced save
  // ==========================================================================

  const startEditAdvanced = () => {
    if (!config) return;
    setSpfDelay(config.timers_throttle_spf.delay != null ? String(config.timers_throttle_spf.delay) : "");
    setSpfInitial(config.timers_throttle_spf.initial_holdtime != null ? String(config.timers_throttle_spf.initial_holdtime) : "");
    setSpfMax(config.timers_throttle_spf.max_holdtime != null ? String(config.timers_throttle_spf.max_holdtime) : "");
    setDistGlobal(config.distance.global_value != null ? String(config.distance.global_value) : "");
    setDistExternal(config.distance.ospf.external != null ? String(config.distance.ospf.external) : "");
    setDistInterArea(config.distance.ospf.inter_area != null ? String(config.distance.ospf.inter_area) : "");
    setDistIntraArea(config.distance.ospf.intra_area != null ? String(config.distance.ospf.intra_area) : "");
    setMaxMetricAdmin(config.max_metric_router_lsa.administrative);
    setMaxMetricShutdown(config.max_metric_router_lsa.on_shutdown != null ? String(config.max_metric_router_lsa.on_shutdown) : "");
    setMaxMetricStartup(config.max_metric_router_lsa.on_startup != null ? String(config.max_metric_router_lsa.on_startup) : "");
    setGrEnabled(config.graceful_restart.enabled);
    setGrPeriod(config.graceful_restart.grace_period != null ? String(config.graceful_restart.grace_period) : "");
    setGrHelperEnable(config.graceful_restart.helper.enable);
    setGrHelperRouterIds([...(config.graceful_restart.helper.router_ids || [])]);
    setGrHelperRouterIdDraft("");
    setLdpSyncHolddown(config.ldp_sync_holddown != null ? String(config.ldp_sync_holddown) : "");
    setRefreshTimers(config.refresh_timers != null ? String(config.refresh_timers) : "");
    setAggregationTimer(config.aggregation_timer != null ? String(config.aggregation_timer) : "");
    setCapabilityOpaque(config.capability_opaque);
    setAdvancedEditing(true);
    setAdvancedError(null);
  };

  const saveAdvanced = async () => {
    if (!config) return;
    try {
      setAdvancedSaving(true);
      setAdvancedError(null);

      // Save timers
      await ospfService.updateTimers(config.timers_throttle_spf, {
        delay: spfDelay.trim() ? parseInt(spfDelay.trim(), 10) : null,
        initial_holdtime: spfInitial.trim() ? parseInt(spfInitial.trim(), 10) : null,
        max_holdtime: spfMax.trim() ? parseInt(spfMax.trim(), 10) : null,
      });

      // Save distance
      await ospfService.updateDistance(config.distance, {
        global_value: distGlobal.trim() ? parseInt(distGlobal.trim(), 10) : null,
        ospf: {
          external: distExternal.trim() ? parseInt(distExternal.trim(), 10) : null,
          inter_area: distInterArea.trim() ? parseInt(distInterArea.trim(), 10) : null,
          intra_area: distIntraArea.trim() ? parseInt(distIntraArea.trim(), 10) : null,
        },
      });

      // Save max metric
      await ospfService.updateMaxMetric(config.max_metric_router_lsa, {
        administrative: maxMetricAdmin,
        on_shutdown: maxMetricShutdown.trim() ? parseInt(maxMetricShutdown.trim(), 10) : null,
        on_startup: maxMetricStartup.trim() ? parseInt(maxMetricStartup.trim(), 10) : null,
      });

      // Save graceful restart
      await ospfService.updateGracefulRestart(config.graceful_restart, {
        enabled: grEnabled,
        grace_period: grPeriod.trim() ? parseInt(grPeriod.trim(), 10) : null,
        helper: {
          enable: grHelperEnable,
          router_ids: grHelperRouterIds,
          no_strict_lsa_checking: config.graceful_restart.helper.no_strict_lsa_checking,
          planned_only: config.graceful_restart.helper.planned_only,
          supported_grace_time: config.graceful_restart.helper.supported_grace_time,
        },
      });

      // Save misc advanced
      await ospfService.updateMiscAdvanced(config, {
        ldp_sync_holddown: ldpSyncHolddown.trim() ? parseInt(ldpSyncHolddown.trim(), 10) : null,
        refresh_timers: refreshTimers.trim() ? parseInt(refreshTimers.trim(), 10) : null,
        aggregation_timer: aggregationTimer.trim() ? parseInt(aggregationTimer.trim(), 10) : null,
        capability_opaque: capabilityOpaque,
      });

      await loadData(true);
      setAdvancedEditing(false);
    } catch (err) {
      setAdvancedError(err instanceof Error ? err.message : t("page.saveAdvancedFailed"));
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
              <h1 className="text-2xl font-bold text-foreground">{t("page.title")}</h1>
              <p className="text-sm text-muted-foreground mt-1">
                {t("page.subtitle")}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {!hasWritePermission && (
                <Badge variant="secondary">{t("page.readOnly")}</Badge>
              )}
              <Button variant="outline" size="sm" onClick={() => loadData(true)}>
                <RefreshCw className="h-4 w-4 mr-2" />
                {tc("refresh")}
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
                    <p className="text-xs text-muted-foreground">{t("stats.areas")}</p>
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
                    <p className="text-xs text-muted-foreground">{t("stats.interfaces")}</p>
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
                    <p className="text-xs text-muted-foreground">{t("stats.redistributed")}</p>
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
                      {config?.parameters.router_id || t("stats.auto")}
                    </p>
                    <p className="text-xs text-muted-foreground">{t("fields.routerId")}</p>
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
              <TabsTrigger value="overview">{t("tabs.overview")}</TabsTrigger>
              <TabsTrigger value="areas">
                {t("tabs.areas")}
                {areaCount > 0 && (
                  <Badge variant="secondary" className="ml-2">{areaCount}</Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="interfaces">
                {t("tabs.interfaces")}
                {ifaceCount > 0 && (
                  <Badge variant="secondary" className="ml-2">{ifaceCount}</Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="redistribute">
                {t("tabs.redistribute")}
                {redistCount > 0 && (
                  <Badge variant="secondary" className="ml-2">{redistCount}</Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="advanced">{t("tabs.advanced")}</TabsTrigger>
            </TabsList>

            {/* ============================================================ */}
            {/* Overview Tab */}
            {/* ============================================================ */}
            <TabsContent value="overview">
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm text-muted-foreground">
                  {t("overview.description")}
                </p>
                {hasWritePermission && (
                  !overviewEditing ? (
                    <Button size="sm" variant="outline" onClick={startEditOverview}>
                      <Pencil className="h-4 w-4 mr-2" />
                      {t("overview.editParameters")}
                    </Button>
                  ) : (
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => setOverviewEditing(false)}>
                        {tc("cancel")}
                      </Button>
                      <Button size="sm" onClick={saveOverview} disabled={overviewSaving}>
                        {overviewSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                        {tc("save")}
                      </Button>
                    </div>
                  )
                )}
              </div>

              {overviewError && (
                <div className="mb-4 p-3 rounded-md bg-destructive/10 text-destructive text-sm">
                  {overviewError}
                </div>
              )}

              <div className="grid grid-cols-2 gap-6">
                {/* Parameters Card */}
                <Card>
                  <CardContent className="p-6">
                    <h3 className="font-semibold mb-4">{t("overview.parameters")}</h3>
                    <div className="space-y-4">
                      <div>
                        <Label className="text-sm">{t("fields.routerId")}</Label>
                        <Input
                          value={overviewEditing ? routerId : (config?.parameters.router_id ?? "")}
                          disabled={!overviewEditing}
                          onChange={(e) => setRouterId(e.target.value)}
                          placeholder={t("overview.routerIdPlaceholder")}
                        />
                      </div>
                      <div>
                        <Label className="text-sm">{t("overview.abrType")}</Label>
                        <Select
                          value={overviewEditing ? abrType : (config?.parameters.abr_type ?? "")}
                          onValueChange={setAbrType}
                          disabled={!overviewEditing}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder={t("overview.abrTypePlaceholder")} />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="cisco">Cisco</SelectItem>
                            <SelectItem value="ibm">IBM</SelectItem>
                            <SelectItem value="shortcut">Shortcut</SelectItem>
                            <SelectItem value="standard">Standard</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-sm">{t("overview.maximumPaths")}</Label>
                        <Input
                          type="number"
                          value={overviewEditing ? maxPaths : (config?.maximum_paths != null ? String(config.maximum_paths) : "")}
                          disabled={!overviewEditing}
                          onChange={(e) => setMaxPaths(e.target.value)}
                          placeholder={tc("default")}
                          min={1}
                        />
                      </div>
                      <div>
                        <Label className="text-sm">{t("overview.referenceBandwidth")}</Label>
                        <Input
                          type="number"
                          value={overviewEditing ? refBandwidth : (config?.auto_cost_reference_bandwidth != null ? String(config.auto_cost_reference_bandwidth) : "")}
                          disabled={!overviewEditing}
                          onChange={(e) => setRefBandwidth(e.target.value)}
                          placeholder={t("overview.referenceBandwidthPlaceholder")}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Options Card */}
                <Card>
                  <CardContent className="p-6">
                    <h3 className="font-semibold mb-4">{t("fields.options")}</h3>
                    <div className="space-y-4">
                      <div className="flex items-center gap-3">
                        <Checkbox
                          id="passive-default"
                          checked={overviewEditing ? passiveDefault : config?.passive_interface_default}
                          disabled={!overviewEditing}
                          onCheckedChange={(checked) => setPassiveDefault(!!checked)}
                        />
                        <Label htmlFor="passive-default">{t("overview.passiveInterfaceDefault")}</Label>
                      </div>
                      <div className="flex items-center gap-3">
                        <Checkbox
                          id="log-adj"
                          checked={overviewEditing ? logAdjChanges : config?.log_adjacency_changes === true}
                          disabled={!overviewEditing}
                          onCheckedChange={(checked) => setLogAdjChanges(!!checked)}
                        />
                        <Label htmlFor="log-adj">{t("overview.logAdjacencyChanges")}</Label>
                      </div>
                      <div className="flex items-center gap-3">
                        <Checkbox
                          id="log-adj-detail"
                          checked={overviewEditing ? logAdjDetail : config?.log_adjacency_changes_detail}
                          disabled={!overviewEditing}
                          onCheckedChange={(checked) => setLogAdjDetail(!!checked)}
                        />
                        <Label htmlFor="log-adj-detail">{t("overview.logAdjacencyChangesDetail")}</Label>
                      </div>
                      <div className="flex items-center gap-3">
                        <Checkbox
                          id="opaque-lsa"
                          checked={overviewEditing ? opaqueLsa : config?.parameters.opaque_lsa}
                          disabled={!overviewEditing}
                          onCheckedChange={(checked) => setOpaqueLsa(!!checked)}
                        />
                        <Label htmlFor="opaque-lsa">{t("overview.opaqueLsa")}</Label>
                      </div>
                      <div className="flex items-center gap-3">
                        <Checkbox
                          id="rfc1583"
                          checked={overviewEditing ? rfc1583 : config?.parameters.rfc1583_compatibility}
                          disabled={!overviewEditing}
                          onCheckedChange={(checked) => setRfc1583(!!checked)}
                        />
                        <Label htmlFor="rfc1583">{t("overview.rfc1583")}</Label>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Default Information Card */}
                <Card className="col-span-2">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-semibold">{t("overview.defaultInformation")}</h3>
                      {hasWritePermission && (
                        !diEditing ? (
                          <Button size="sm" variant="outline" onClick={startEditDI}>
                            <Pencil className="h-4 w-4 mr-2" />
                            {tc("edit")}
                          </Button>
                        ) : (
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline" onClick={() => setDiEditing(false)}>
                              {tc("cancel")}
                            </Button>
                            <Button size="sm" onClick={saveDI} disabled={diSaving}>
                              {diSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                              {tc("save")}
                            </Button>
                          </div>
                        )
                      )}
                    </div>
                    <div className="grid grid-cols-5 gap-4 items-end">
                      <div className="flex items-center gap-3">
                        <Checkbox
                          id="di-enabled"
                          checked={diEditing ? diEnabled : config?.default_information.enabled}
                          disabled={!diEditing}
                          onCheckedChange={(checked) => setDiEnabled(!!checked)}
                        />
                        <Label htmlFor="di-enabled">{tc("enabled")}</Label>
                      </div>
                      <div className="flex items-center gap-3">
                        <Checkbox
                          id="di-always"
                          checked={diEditing ? diAlways : config?.default_information.always}
                          disabled={!diEditing}
                          onCheckedChange={(checked) => setDiAlways(!!checked)}
                        />
                        <Label htmlFor="di-always">{t("overview.always")}</Label>
                      </div>
                      <div>
                        <Label className="text-sm">{t("fields.metric")}</Label>
                        <Input
                          type="number"
                          value={diEditing ? diMetric : (config?.default_information.metric != null ? String(config.default_information.metric) : "")}
                          disabled={!diEditing}
                          onChange={(e) => setDiMetric(e.target.value)}
                          placeholder={tc("default")}
                        />
                      </div>
                      <div>
                        <Label className="text-sm">{t("fields.metricType")}</Label>
                        <Select
                          value={diEditing ? diMetricType : (config?.default_information.metric_type != null ? String(config.default_information.metric_type) : "")}
                          onValueChange={setDiMetricType}
                          disabled={!diEditing}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder={tc("default")} />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="1">{t("fields.type1")}</SelectItem>
                            <SelectItem value="2">{t("fields.type2")}</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-sm">{t("fields.routeMap")}</Label>
                        <Select
                          value={diEditing ? diRouteMap : (config?.default_information.route_map ?? "")}
                          onValueChange={(v) => setDiRouteMap(v === "__none__" ? "" : v)}
                          disabled={!diEditing}
                        >
                          <SelectTrigger>
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
                    {t("areas.description")}
                  </p>
                  {areaCount > 3 && (
                    <div className="relative">
                      <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        value={areaSearch}
                        onChange={(e) => setAreaSearch(e.target.value)}
                        placeholder={t("areas.filterPlaceholder")}
                        className="pl-8 h-9 w-48"
                      />
                    </div>
                  )}
                </div>
                {hasWritePermission && (
                  <Button size="sm" onClick={() => { setEditingArea(null); setAreaModalOpen(true); }}>
                    <Plus className="h-4 w-4 mr-2" />
                    {t("fields.addArea")}
                  </Button>
                )}
              </div>

              {areaCount === 0 ? (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <Globe className="h-12 w-12 text-muted-foreground/30 mb-4" />
                    <p className="text-sm text-muted-foreground mb-2">{t("areas.emptyTitle")}</p>
                    <p className="text-xs text-muted-foreground mb-4">
                      {t("areas.emptyHint")}
                    </p>
                    {hasWritePermission && (
                      <Button size="sm" onClick={() => { setEditingArea(null); setAreaModalOpen(true); }}>
                        <Plus className="h-4 w-4 mr-2" />
                        {t("fields.addArea")}
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
                          <TableHead>{t("fields.areaId")}</TableHead>
                          <TableHead>{t("areas.type")}</TableHead>
                          <TableHead>{t("fields.networks")}</TableHead>
                          <TableHead>{t("areas.ranges")}</TableHead>
                          <TableHead>{t("fields.authentication")}</TableHead>
                          {hasWritePermission && <TableHead className="text-right">{tc("actions")}</TableHead>}
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
                              <div className="flex flex-wrap gap-1">
                                {area.networks.length > 0 ? (
                                  area.networks.map((n) => (
                                    <Badge key={n} variant="secondary" className="font-mono text-xs">{n}</Badge>
                                  ))
                                ) : (
                                  <span className="text-muted-foreground">-</span>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              {area.ranges.length > 0 ? (
                                <Badge variant="secondary">{area.ranges.length}</Badge>
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </TableCell>
                            <TableCell>
                              {area.authentication ? (
                                <Badge variant="outline">{area.authentication}</Badge>
                              ) : (
                                <span className="text-muted-foreground">{t("values.none")}</span>
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
                    {t("interfaces.description")}
                  </p>
                  {ifaceCount > 3 && (
                    <div className="relative">
                      <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        value={ifaceSearch}
                        onChange={(e) => setIfaceSearch(e.target.value)}
                        placeholder={t("interfaces.filterPlaceholder")}
                        className="pl-8 h-9 w-48"
                      />
                    </div>
                  )}
                </div>
                {hasWritePermission && (
                  <Button size="sm" onClick={() => { setEditingIface(null); setIfaceModalOpen(true); }}>
                    <Plus className="h-4 w-4 mr-2" />
                    {t("fields.addInterface")}
                  </Button>
                )}
              </div>

              {ifaceCount === 0 ? (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <Network className="h-12 w-12 text-muted-foreground/30 mb-4" />
                    <p className="text-sm text-muted-foreground mb-2">{t("interfaces.emptyTitle")}</p>
                    <p className="text-xs text-muted-foreground mb-4">
                      {t("interfaces.emptyHint")}
                    </p>
                    {hasWritePermission && (
                      <Button size="sm" onClick={() => { setEditingIface(null); setIfaceModalOpen(true); }}>
                        <Plus className="h-4 w-4 mr-2" />
                        {t("fields.addInterface")}
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
                          <TableHead>{t("fields.interface")}</TableHead>
                          <TableHead>{t("fields.area")}</TableHead>
                          <TableHead>{t("fields.cost")}</TableHead>
                          <TableHead>{t("fields.priority")}</TableHead>
                          <TableHead>{t("fields.networkType")}</TableHead>
                          <TableHead>{t("fields.passive")}</TableHead>
                          <TableHead>BFD</TableHead>
                          <TableHead>{t("interfaces.auth")}</TableHead>
                          {hasWritePermission && <TableHead className="text-right">{tc("actions")}</TableHead>}
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
                              {iface.cost != null ? iface.cost : <span className="text-muted-foreground">{t("values.auto")}</span>}
                            </TableCell>
                            <TableCell>
                              {iface.priority != null ? iface.priority : <span className="text-muted-foreground">{t("values.default")}</span>}
                            </TableCell>
                            <TableCell>
                              {iface.network ? (
                                <Badge variant="outline">{iface.network}</Badge>
                              ) : (
                                <span className="text-muted-foreground">{t("values.default")}</span>
                              )}
                            </TableCell>
                            <TableCell>
                              {iface.passive ? (
                                <Badge variant="secondary">{t("values.yes")}</Badge>
                              ) : (
                                <span className="text-muted-foreground">{t("values.no")}</span>
                              )}
                            </TableCell>
                            <TableCell>
                              {iface.bfd ? (
                                <Badge variant="secondary">{t("values.yes")}</Badge>
                              ) : (
                                <span className="text-muted-foreground">{t("values.no")}</span>
                              )}
                            </TableCell>
                            <TableCell>
                              {Object.keys(iface.authentication.md5_key_ids).length > 0 ? (
                                <Badge variant="outline">MD5</Badge>
                              ) : iface.authentication.plaintext_password ? (
                                <Badge variant="outline">{t("values.plain")}</Badge>
                              ) : (
                                <span className="text-muted-foreground">{t("values.none")}</span>
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
                  {t("redistribute.description")}
                </p>
                {hasWritePermission && (
                  <Button size="sm" onClick={() => setRedistModalOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    {t("fields.addRedistribute")}
                  </Button>
                )}
              </div>

              {redistCount === 0 ? (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <ArrowLeftRight className="h-12 w-12 text-muted-foreground/30 mb-4" />
                    <p className="text-sm text-muted-foreground mb-2">{t("redistribute.emptyTitle")}</p>
                    <p className="text-xs text-muted-foreground mb-4">
                      {t("redistribute.emptyHint")}
                    </p>
                    {hasWritePermission && (
                      <Button size="sm" onClick={() => setRedistModalOpen(true)}>
                        <Plus className="h-4 w-4 mr-2" />
                        {t("fields.addRedistribute")}
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
                          <TableHead>{t("fields.protocol")}</TableHead>
                          <TableHead>{t("fields.metric")}</TableHead>
                          <TableHead>{t("fields.metricType")}</TableHead>
                          <TableHead>{t("fields.routeMap")}</TableHead>
                          <TableHead>{t("redistribute.table")}</TableHead>
                          {hasWritePermission && <TableHead className="text-right">{tc("actions")}</TableHead>}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {config?.redistribute.map((entry, idx) => (
                          <TableRow key={`${entry.protocol}-${entry.table || idx}`}>
                            <TableCell className="font-medium">{entry.protocol}</TableCell>
                            <TableCell>
                              {entry.metric ?? <span className="text-muted-foreground">{t("values.default")}</span>}
                            </TableCell>
                            <TableCell>
                              {entry.metric_type ? (
                                <Badge variant="outline">{t("values.type", { type: String(entry.metric_type) })}</Badge>
                              ) : (
                                <span className="text-muted-foreground">{t("values.default")}</span>
                              )}
                            </TableCell>
                            <TableCell>
                              {entry.route_map ? (
                                <Badge variant="secondary">{entry.route_map}</Badge>
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </TableCell>
                            <TableCell>
                              {entry.table ?? <span className="text-muted-foreground">-</span>}
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
                  {t("advanced.description")}
                </p>
                {hasWritePermission && (
                  !advancedEditing ? (
                    <Button size="sm" variant="outline" onClick={startEditAdvanced}>
                      <Pencil className="h-4 w-4 mr-2" />
                      {t("advanced.editAdvanced")}
                    </Button>
                  ) : (
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => setAdvancedEditing(false)}>
                        {tc("cancel")}
                      </Button>
                      <Button size="sm" onClick={saveAdvanced} disabled={advancedSaving}>
                        {advancedSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                        {tc("save")}
                      </Button>
                    </div>
                  )
                )}
              </div>

              {advancedError && (
                <div className="mb-4 p-3 rounded-md bg-destructive/10 text-destructive text-sm">
                  {advancedError}
                </div>
              )}

              <div className="grid grid-cols-2 gap-6">
                {/* SPF Timers */}
                <Card>
                  <CardContent className="p-6">
                    <h3 className="font-semibold mb-4">{t("advanced.spfThrottleTimers")}</h3>
                    <div className="space-y-4">
                      <div>
                        <Label className="text-sm">{t("advanced.delayMs")}</Label>
                        <Input
                          type="number"
                          value={advancedEditing ? spfDelay : (config?.timers_throttle_spf.delay != null ? String(config.timers_throttle_spf.delay) : "")}
                          disabled={!advancedEditing}
                          onChange={(e) => setSpfDelay(e.target.value)}
                          placeholder={tc("default")}
                        />
                      </div>
                      <div>
                        <Label className="text-sm">{t("advanced.initialHoldtimeMs")}</Label>
                        <Input
                          type="number"
                          value={advancedEditing ? spfInitial : (config?.timers_throttle_spf.initial_holdtime != null ? String(config.timers_throttle_spf.initial_holdtime) : "")}
                          disabled={!advancedEditing}
                          onChange={(e) => setSpfInitial(e.target.value)}
                          placeholder={tc("default")}
                        />
                      </div>
                      <div>
                        <Label className="text-sm">{t("advanced.maxHoldtimeMs")}</Label>
                        <Input
                          type="number"
                          value={advancedEditing ? spfMax : (config?.timers_throttle_spf.max_holdtime != null ? String(config.timers_throttle_spf.max_holdtime) : "")}
                          disabled={!advancedEditing}
                          onChange={(e) => setSpfMax(e.target.value)}
                          placeholder={tc("default")}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Distance */}
                <Card>
                  <CardContent className="p-6">
                    <h3 className="font-semibold mb-4">{t("advanced.administrativeDistance")}</h3>
                    <div className="space-y-4">
                      <div>
                        <Label className="text-sm">{t("advanced.globalDistance")}</Label>
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
                        <Label className="text-sm">{t("advanced.external")}</Label>
                        <Input
                          type="number"
                          value={advancedEditing ? distExternal : (config?.distance.ospf.external != null ? String(config.distance.ospf.external) : "")}
                          disabled={!advancedEditing}
                          onChange={(e) => setDistExternal(e.target.value)}
                          placeholder={tc("default")}
                          min={1}
                          max={255}
                        />
                      </div>
                      <div>
                        <Label className="text-sm">{t("advanced.interArea")}</Label>
                        <Input
                          type="number"
                          value={advancedEditing ? distInterArea : (config?.distance.ospf.inter_area != null ? String(config.distance.ospf.inter_area) : "")}
                          disabled={!advancedEditing}
                          onChange={(e) => setDistInterArea(e.target.value)}
                          placeholder={tc("default")}
                          min={1}
                          max={255}
                        />
                      </div>
                      <div>
                        <Label className="text-sm">{t("advanced.intraArea")}</Label>
                        <Input
                          type="number"
                          value={advancedEditing ? distIntraArea : (config?.distance.ospf.intra_area != null ? String(config.distance.ospf.intra_area) : "")}
                          disabled={!advancedEditing}
                          onChange={(e) => setDistIntraArea(e.target.value)}
                          placeholder={tc("default")}
                          min={1}
                          max={255}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Max Metric */}
                <Card>
                  <CardContent className="p-6">
                    <h3 className="font-semibold mb-4">{t("advanced.maxMetricRouterLsa")}</h3>
                    <div className="space-y-4">
                      <div className="flex items-center gap-3">
                        <Checkbox
                          id="max-metric-admin"
                          checked={advancedEditing ? maxMetricAdmin : config?.max_metric_router_lsa.administrative}
                          disabled={!advancedEditing}
                          onCheckedChange={(checked) => setMaxMetricAdmin(!!checked)}
                        />
                        <Label htmlFor="max-metric-admin">{t("advanced.administrative")}</Label>
                      </div>
                      <div>
                        <Label className="text-sm">{t("advanced.onShutdown")}</Label>
                        <Input
                          type="number"
                          value={advancedEditing ? maxMetricShutdown : (config?.max_metric_router_lsa.on_shutdown != null ? String(config.max_metric_router_lsa.on_shutdown) : "")}
                          disabled={!advancedEditing}
                          onChange={(e) => setMaxMetricShutdown(e.target.value)}
                          placeholder={tc("disabled")}
                        />
                      </div>
                      <div>
                        <Label className="text-sm">{t("advanced.onStartup")}</Label>
                        <Input
                          type="number"
                          value={advancedEditing ? maxMetricStartup : (config?.max_metric_router_lsa.on_startup != null ? String(config.max_metric_router_lsa.on_startup) : "")}
                          disabled={!advancedEditing}
                          onChange={(e) => setMaxMetricStartup(e.target.value)}
                          placeholder={tc("disabled")}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Graceful Restart */}
                <Card>
                  <CardContent className="p-6">
                    <h3 className="font-semibold mb-4">{t("advanced.gracefulRestart")}</h3>
                    <div className="space-y-4">
                      <div className="flex items-center gap-3">
                        <Checkbox
                          id="gr-enabled"
                          checked={advancedEditing ? grEnabled : config?.graceful_restart.enabled}
                          disabled={!advancedEditing}
                          onCheckedChange={(checked) => setGrEnabled(!!checked)}
                        />
                        <Label htmlFor="gr-enabled">{t("advanced.enableGracefulRestart")}</Label>
                      </div>
                      <div>
                        <Label className="text-sm">{t("advanced.gracePeriod")}</Label>
                        <Input
                          type="number"
                          value={advancedEditing ? grPeriod : (config?.graceful_restart.grace_period != null ? String(config.graceful_restart.grace_period) : "")}
                          disabled={!advancedEditing}
                          onChange={(e) => setGrPeriod(e.target.value)}
                          placeholder={t("advanced.gracePeriodPlaceholder")}
                        />
                      </div>
                      <div className="flex items-center gap-3">
                        <Checkbox
                          id="gr-helper"
                          checked={advancedEditing ? grHelperEnable : config?.graceful_restart.helper.enable}
                          disabled={!advancedEditing}
                          onCheckedChange={(checked) => setGrHelperEnable(!!checked)}
                        />
                        <Label htmlFor="gr-helper">{t("advanced.enableHelper")}</Label>
                      </div>
                      <div>
                        <Label className="text-sm">{t("advanced.helperRouterIds")}</Label>
                        <div className="space-y-2 mt-1">
                          {(advancedEditing ? grHelperRouterIds : (config?.graceful_restart.helper.router_ids || [])).map((id) => (
                            <div key={id} className="flex items-center gap-2">
                              <span className="text-sm font-mono">{id}</span>
                              {advancedEditing && (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setGrHelperRouterIds((ids) => ids.filter((x) => x !== id))}
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              )}
                            </div>
                          ))}
                          {advancedEditing && (
                            <div className="flex items-center gap-2">
                              <Input
                                id="ospf-gr-helper-router-id"
                                value={grHelperRouterIdDraft}
                                onChange={(e) => setGrHelperRouterIdDraft(e.target.value)}
                                placeholder="192.0.2.1"
                              />
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  const id = grHelperRouterIdDraft.trim();
                                  const parts = id.split(".");
                                  const valid = parts.length === 4 && parts.every((p) => /^\d{1,3}$/.test(p) && Number(p) <= 255);
                                  if (!valid || grHelperRouterIds.includes(id)) return;
                                  setGrHelperRouterIds([...grHelperRouterIds, id]);
                                  setGrHelperRouterIdDraft("");
                                }}
                              >
                                <Plus className="h-3 w-3" />
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Misc Advanced */}
                <Card className="col-span-2">
                  <CardContent className="p-6">
                    <h3 className="font-semibold mb-4">{t("advanced.miscellaneous")}</h3>
                    <div className="grid grid-cols-4 gap-4">
                      <div>
                        <Label className="text-sm">{t("advanced.ldpSyncHolddown")}</Label>
                        <Input
                          type="number"
                          value={advancedEditing ? ldpSyncHolddown : (config?.ldp_sync_holddown != null ? String(config.ldp_sync_holddown) : "")}
                          disabled={!advancedEditing}
                          onChange={(e) => setLdpSyncHolddown(e.target.value)}
                          placeholder={tc("disabled")}
                        />
                      </div>
                      <div>
                        <Label className="text-sm">{t("advanced.refreshTimers")}</Label>
                        <Input
                          type="number"
                          value={advancedEditing ? refreshTimers : (config?.refresh_timers != null ? String(config.refresh_timers) : "")}
                          disabled={!advancedEditing}
                          onChange={(e) => setRefreshTimers(e.target.value)}
                          placeholder={tc("default")}
                        />
                      </div>
                      <div>
                        <Label className="text-sm">{t("advanced.aggregationTimer")}</Label>
                        <Input
                          type="number"
                          value={advancedEditing ? aggregationTimer : (config?.aggregation_timer != null ? String(config.aggregation_timer) : "")}
                          disabled={!advancedEditing}
                          onChange={(e) => setAggregationTimer(e.target.value)}
                          placeholder={tc("default")}
                        />
                      </div>
                      <div className="flex items-end pb-1">
                        <div className="flex items-center gap-3">
                          <Checkbox
                            id="cap-opaque"
                            checked={advancedEditing ? capabilityOpaque : config?.capability_opaque}
                            disabled={!advancedEditing}
                            onCheckedChange={(checked) => setCapabilityOpaque(!!checked)}
                          />
                          <Label htmlFor="cap-opaque">{t("advanced.capabilityOpaque")}</Label>
                        </div>
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
      <OspfAreaModal
        open={areaModalOpen}
        onOpenChange={setAreaModalOpen}
        onSubmit={editingArea ? handleUpdateArea : handleCreateArea}
        existingArea={editingArea}
        accessListNames={accessListNames}
      />

      <OspfInterfaceModal
        open={ifaceModalOpen}
        onOpenChange={setIfaceModalOpen}
        onSubmit={editingIface ? handleUpdateInterface : handleCreateInterface}
        existingInterface={editingIface}
        capabilities={capabilities}
      />

      <OspfRedistributeModal
        open={redistModalOpen}
        onOpenChange={setRedistModalOpen}
        onSubmit={handleAddRedistribute}
        capabilities={capabilities}
        existingProtocols={config?.redistribute.map((r) => r.protocol) ?? []}
        routeMapNames={routeMapNames}
      />

      {deletingArea && (
        <DeleteOspfModal
          open={!!deletingArea}
          onOpenChange={(open) => !open && setDeletingArea(null)}
          itemType={t("delete.itemArea")}
          itemName={deletingArea}
          onConfirm={handleDeleteArea}
        />
      )}

      {deletingIface && (
        <DeleteOspfModal
          open={!!deletingIface}
          onOpenChange={(open) => !open && setDeletingIface(null)}
          itemType={t("delete.itemInterface")}
          itemName={deletingIface}
          onConfirm={handleDeleteInterface}
        />
      )}

      {deletingRedist && (
        <DeleteOspfModal
          open={!!deletingRedist}
          onOpenChange={(open) => !open && setDeletingRedist(null)}
          itemType={t("delete.itemRedistribute")}
          itemName={deletingRedist.protocol + (deletingRedist.table ? t("delete.tableSuffix", { table: String(deletingRedist.table) }) : "")}
          onConfirm={handleDeleteRedistribute}
        />
      )}
    </>
  );
}
