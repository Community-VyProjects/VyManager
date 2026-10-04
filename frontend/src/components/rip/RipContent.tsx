"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  ArrowLeftRight,
  Filter,
  Save,
  Loader2,
  X,
  Globe,
  Lock,
} from "lucide-react";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import {
  ripService,
  RipConfig,
  RipCapabilities,
  RipInterface,
  RipRedistribute,
  RipNetworkDistance,
  RipDistributeListGlobal,
  RipDistributeListInterface,
  RipTimers,
} from "@/lib/api/rip";
import { routeMapService } from "@/lib/api/route-map";
import { accessListService } from "@/lib/api/access-list";
import { prefixListService } from "@/lib/api/prefix-list";
import { showService } from "@/lib/api/show";
import { RipInterfaceModal } from "./RipInterfaceModal";
import { RipRedistributeModal } from "./RipRedistributeModal";
import { RipNetworkDistanceModal } from "./RipNetworkDistanceModal";
import { RipDistributeListInterfaceModal } from "./RipDistributeListInterfaceModal";
import { DeleteRipModal } from "./DeleteRipModal";
import { usePermissions } from "@/hooks/usePermissions";
import { FeatureGroup } from "@/lib/api/user-management";

export function RipContent() {
  const t = useTranslations("rip");
  const tc = useTranslations("common");
  const { canWrite } = usePermissions();
  const hasWritePermission = canWrite(FeatureGroup.RIP);

  const [config, setConfig] = useState<RipConfig | null>(null);
  const [, setCapabilities] = useState<RipCapabilities | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("overview");

  const [routeMapNames, setRouteMapNames] = useState<string[]>([]);
  const [accessListNames, setAccessListNames] = useState<string[]>([]);
  const [prefixListNames, setPrefixListNames] = useState<string[]>([]);
  const [systemInterfaces, setSystemInterfaces] = useState<string[]>([]);

  // ============================================================
  // Overview / Timers editing
  // ============================================================
  const [overviewEditing, setOverviewEditing] = useState(false);
  const [overviewSaving, setOverviewSaving] = useState(false);
  const [overviewError, setOverviewError] = useState<string | null>(null);
  const [ovVersion, setOvVersion] = useState("");
  const [ovDefaultDistance, setOvDefaultDistance] = useState("");
  const [ovDefaultMetric, setOvDefaultMetric] = useState("");
  const [ovRouteMap, setOvRouteMap] = useState("");
  const [ovOriginate, setOvOriginate] = useState(false);
  const [ovTimerUpdate, setOvTimerUpdate] = useState("");
  const [ovTimerTimeout, setOvTimerTimeout] = useState("");
  const [ovTimerGc, setOvTimerGc] = useState("");

  // ============================================================
  // Networks tab: inline add/remove state
  // ============================================================
  const [newNetwork, setNewNetwork] = useState("");
  const [networksError, setNetworksError] = useState<string | null>(null);
  const [newNeighbor, setNewNeighbor] = useState("");
  const [neighborsError, setNeighborsError] = useState<string | null>(null);
  const [newRoute, setNewRoute] = useState("");
  const [routesError, setRoutesError] = useState<string | null>(null);
  const [newPassiveIface, setNewPassiveIface] = useState("");
  const [passiveIfaceError, setPassiveIfaceError] = useState<string | null>(null);

  // ============================================================
  // Interface modal state
  // ============================================================
  const [ifaceModalOpen, setIfaceModalOpen] = useState(false);
  const [editingIface, setEditingIface] = useState<RipInterface | null>(null);
  const [deletingIface, setDeletingIface] = useState<RipInterface | null>(null);

  // ============================================================
  // Redistribute modal state
  // ============================================================
  const [redistModalOpen, setRedistModalOpen] = useState(false);
  const [editingRedist, setEditingRedist] = useState<RipRedistribute | null>(null);
  const [deletingRedist, setDeletingRedist] = useState<RipRedistribute | null>(null);

  // ============================================================
  // Network distance modal state
  // ============================================================
  const [ndModalOpen, setNdModalOpen] = useState(false);
  const [editingNd, setEditingNd] = useState<RipNetworkDistance | null>(null);
  const [deletingNd, setDeletingNd] = useState<RipNetworkDistance | null>(null);

  // ============================================================
  // Distribute list global editing
  // ============================================================
  const [dlGlobalEditing, setDlGlobalEditing] = useState(false);
  const [dlGlobalSaving, setDlGlobalSaving] = useState(false);
  const [dlGlobalError, setDlGlobalError] = useState<string | null>(null);
  const [dlGlobalDraft, setDlGlobalDraft] = useState<RipDistributeListGlobal>({});

  // ============================================================
  // Distribute list interface modal state
  // ============================================================
  const [dlIfaceModalOpen, setDlIfaceModalOpen] = useState(false);
  const [editingDlIface, setEditingDlIface] = useState<RipDistributeListInterface | null>(null);
  const [deletingDlIface, setDeletingDlIface] = useState<RipDistributeListInterface | null>(null);

  // ============================================================
  // Load
  // ============================================================

  const loadData = useCallback(async (refresh = false) => {
    try {
      setLoading(true);
      setError(null);
      const [configData, capData, routeMaps, accessLists, prefixLists, interfaces] =
        await Promise.all([
          ripService.getConfig(refresh),
          ripService.getCapabilities(),
          routeMapService.getConfig().then((c) => c.route_maps.map((rm) => rm.name)).catch(() => [] as string[]),
          accessListService.getConfig().then((c) => c.ipv4_lists.map((al) => al.number)).catch(() => [] as string[]),
          prefixListService.getConfig().then((c) => c.ipv4_lists.map((pl) => pl.name)).catch(() => [] as string[]),
          showService.getAllInterfaces().then((r) => r.interfaces.map((i) => i.name)).catch(() => [] as string[]),
        ]);
      setConfig(configData);
      setCapabilities(capData);
      setRouteMapNames(routeMaps);
      setAccessListNames(accessLists);
      setPrefixListNames(prefixLists);
      setSystemInterfaces(interfaces);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("errors.loadFailed"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ============================================================
  // Overview handlers
  // ============================================================

  const startEditOverview = () => {
    if (!config) return;
    setOvVersion(config.version || "");
    setOvDefaultDistance(config.default_distance != null ? String(config.default_distance) : "");
    setOvDefaultMetric(config.default_metric != null ? String(config.default_metric) : "");
    setOvRouteMap(config.route_map || "");
    setOvOriginate(config.default_information_originate);
    setOvTimerUpdate(config.timers.update != null ? String(config.timers.update) : "");
    setOvTimerTimeout(config.timers.timeout != null ? String(config.timers.timeout) : "");
    setOvTimerGc(config.timers.garbage_collection != null ? String(config.timers.garbage_collection) : "");
    setOverviewError(null);
    setOverviewEditing(true);
  };

  const cancelEditOverview = () => {
    setOverviewEditing(false);
    setOverviewError(null);
  };

  const saveOverview = async () => {
    if (!config) return;
    try {
      setOverviewSaving(true);
      setOverviewError(null);

      const updatedConfig: Partial<RipConfig> = {
        version: ovVersion || null,
        default_distance: ovDefaultDistance.trim() ? parseInt(ovDefaultDistance.trim(), 10) : null,
        default_metric: ovDefaultMetric.trim() ? parseInt(ovDefaultMetric.trim(), 10) : null,
        route_map: ovRouteMap || null,
        default_information_originate: ovOriginate,
      };

      const updatedTimers: RipTimers = {
        update: ovTimerUpdate.trim() ? parseInt(ovTimerUpdate.trim(), 10) : null,
        timeout: ovTimerTimeout.trim() ? parseInt(ovTimerTimeout.trim(), 10) : null,
        garbage_collection: ovTimerGc.trim() ? parseInt(ovTimerGc.trim(), 10) : null,
      };

      await ripService.updateGlobalSettings(config, updatedConfig);
      await ripService.updateTimers(config.timers, updatedTimers);
      await loadData(true);
      setOverviewEditing(false);
    } catch (err) {
      setOverviewError(err instanceof Error ? err.message : t("errors.saveSettingsFailed"));
    } finally {
      setOverviewSaving(false);
    }
  };

  // ============================================================
  // Networks tab handlers
  // ============================================================

  const handleAddNetwork = async () => {
    if (!newNetwork.trim()) return;
    try {
      setNetworksError(null);
      await ripService.addNetwork(newNetwork.trim());
      setNewNetwork("");
      await loadData(true);
    } catch (err) {
      setNetworksError(err instanceof Error ? err.message : t("errors.addNetworkFailed"));
    }
  };

  const handleRemoveNetwork = async (network: string) => {
    try {
      setNetworksError(null);
      await ripService.removeNetwork(network);
      await loadData(true);
    } catch (err) {
      setNetworksError(err instanceof Error ? err.message : t("errors.removeNetworkFailed"));
    }
  };

  const handleAddNeighbor = async () => {
    if (!newNeighbor.trim()) return;
    try {
      setNeighborsError(null);
      await ripService.addNeighbor(newNeighbor.trim());
      setNewNeighbor("");
      await loadData(true);
    } catch (err) {
      setNeighborsError(err instanceof Error ? err.message : t("errors.addNeighborFailed"));
    }
  };

  const handleRemoveNeighbor = async (address: string) => {
    try {
      setNeighborsError(null);
      await ripService.removeNeighbor(address);
      await loadData(true);
    } catch (err) {
      setNeighborsError(err instanceof Error ? err.message : t("errors.removeNeighborFailed"));
    }
  };

  const handleAddRoute = async () => {
    if (!newRoute.trim()) return;
    try {
      setRoutesError(null);
      await ripService.addRoute(newRoute.trim());
      setNewRoute("");
      await loadData(true);
    } catch (err) {
      setRoutesError(err instanceof Error ? err.message : t("errors.addRouteFailed"));
    }
  };

  const handleRemoveRoute = async (prefix: string) => {
    try {
      setRoutesError(null);
      await ripService.removeRoute(prefix);
      await loadData(true);
    } catch (err) {
      setRoutesError(err instanceof Error ? err.message : t("errors.removeRouteFailed"));
    }
  };

  const handleAddPassiveIface = async () => {
    if (!newPassiveIface.trim()) return;
    try {
      setPassiveIfaceError(null);
      await ripService.addPassiveInterface(newPassiveIface.trim());
      setNewPassiveIface("");
      await loadData(true);
    } catch (err) {
      setPassiveIfaceError(err instanceof Error ? err.message : t("errors.addPassiveIfaceFailed"));
    }
  };

  const handleRemovePassiveIface = async (iface: string) => {
    try {
      setPassiveIfaceError(null);
      await ripService.removePassiveInterface(iface);
      await loadData(true);
    } catch (err) {
      setPassiveIfaceError(err instanceof Error ? err.message : t("errors.removePassiveIfaceFailed"));
    }
  };

  // ============================================================
  // Interface handlers
  // ============================================================

  const handleCreateIface = async (iface: RipInterface) => {
    await ripService.createInterface(iface);
    await loadData(true);
  };

  const handleUpdateIface = async (iface: RipInterface) => {
    if (!editingIface) return;
    await ripService.updateInterface(editingIface, iface);
    await loadData(true);
  };

  const handleDeleteIface = async () => {
    if (!deletingIface) return;
    await ripService.deleteInterface(deletingIface.name);
    setDeletingIface(null);
    await loadData(true);
  };

  // ============================================================
  // Redistribute handlers
  // ============================================================

  const handleCreateRedist = async (entry: RipRedistribute) => {
    await ripService.createRedistribute(entry);
    await loadData(true);
  };

  const handleUpdateRedist = async (entry: RipRedistribute) => {
    if (!editingRedist) return;
    await ripService.updateRedistribute(editingRedist, entry);
    await loadData(true);
  };

  const handleDeleteRedist = async () => {
    if (!deletingRedist) return;
    await ripService.deleteRedistribute(deletingRedist.protocol);
    setDeletingRedist(null);
    await loadData(true);
  };

  // ============================================================
  // Network Distance handlers
  // ============================================================

  const handleCreateNd = async (entry: RipNetworkDistance) => {
    await ripService.createNetworkDistance(entry);
    await loadData(true);
  };

  const handleUpdateNd = async (entry: RipNetworkDistance) => {
    if (!editingNd) return;
    await ripService.updateNetworkDistance(editingNd, entry);
    await loadData(true);
  };

  const handleDeleteNd = async () => {
    if (!deletingNd) return;
    await ripService.deleteNetworkDistance(deletingNd.prefix);
    setDeletingNd(null);
    await loadData(true);
  };

  // ============================================================
  // Distribute List Global handlers
  // ============================================================

  const startEditDlGlobal = () => {
    if (!config) return;
    setDlGlobalDraft({ ...config.distribute_list.global_filters });
    setDlGlobalError(null);
    setDlGlobalEditing(true);
  };

  const cancelEditDlGlobal = () => {
    setDlGlobalEditing(false);
    setDlGlobalError(null);
  };

  const saveDlGlobal = async () => {
    if (!config) return;
    try {
      setDlGlobalSaving(true);
      setDlGlobalError(null);
      await ripService.updateDistributeListGlobal(
        config.distribute_list.global_filters,
        dlGlobalDraft
      );
      await loadData(true);
      setDlGlobalEditing(false);
    } catch (err) {
      setDlGlobalError(err instanceof Error ? err.message : t("errors.saveFiltersFailed"));
    } finally {
      setDlGlobalSaving(false);
    }
  };

  // ============================================================
  // Distribute List Interface handlers
  // ============================================================

  const handleCreateDlIface = async (entry: RipDistributeListInterface) => {
    await ripService.createDistributeListInterface(entry);
    await loadData(true);
  };

  const handleUpdateDlIface = async (entry: RipDistributeListInterface) => {
    if (!editingDlIface) return;
    await ripService.updateDistributeListInterface(editingDlIface, entry);
    await loadData(true);
  };

  const handleDeleteDlIface = async () => {
    if (!deletingDlIface) return;
    await ripService.deleteDistributeListInterface(deletingDlIface.interface);
    setDeletingDlIface(null);
    await loadData(true);
  };

  // ============================================================
  // Derived values
  // ============================================================

  const networkCount = config?.networks.length ?? 0;
  const ifaceCount = config?.interfaces.length ?? 0;
  const redistCount = config?.redistribute.length ?? 0;

  const versionBadge = config?.version ? `v${config.version}` : "—";

  // ============================================================
  // Render helpers
  // ============================================================

  const renderListSection = (
    title: string,
    items: string[],
    inputValue: string,
    onInputChange: (v: string) => void,
    onAdd: () => Promise<void>,
    onRemove: (item: string) => Promise<void>,
    err: string | null,
    inputPlaceholder: string,
    isDropdown?: boolean,
    dropdownOptions?: string[]
  ) => (
    <Card>
      <CardContent className="p-4">
        <h3 className="font-semibold mb-3 text-sm">{title}</h3>
        {hasWritePermission && (
          <div className="flex gap-2 mb-3">
            {isDropdown && dropdownOptions ? (
              <Select value={inputValue} onValueChange={onInputChange}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder={inputPlaceholder} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="default">{tc("shown.default")}</SelectItem>
                  {dropdownOptions.map((o) => (
                    <SelectItem key={o} value={o}>{o}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Input
                placeholder={inputPlaceholder}
                value={inputValue}
                onChange={(e) => onInputChange(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") onAdd(); }}
                className="flex-1 font-mono text-sm"
              />
            )}
            <Button size="sm" onClick={onAdd} disabled={!inputValue.trim()}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        )}
        {err && (
          <p className="text-sm text-destructive mb-2">{err}</p>
        )}
        {items.length === 0 ? (
          <p className="text-xs text-muted-foreground">{t("networks.noneConfigured")}</p>
        ) : (
          <div className="space-y-1">
            {items.map((item) => (
              <div key={item} className="flex items-center justify-between rounded-md px-2 py-1 bg-muted/50">
                <span className="font-mono text-sm">{item}</span>
                {hasWritePermission && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-muted-foreground hover:text-destructive"
                    onClick={() => onRemove(item)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );

  // ============================================================
  // Loading / Error states
  // ============================================================

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
        <Button variant="outline" onClick={() => loadData()}>{tc("retry")}</Button>
      </div>
    );
  }

  // ============================================================
  // Render
  // ============================================================

  return (
    <>
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="p-6 pb-4 border-b border-border">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-foreground">{t("header.title")}</h1>
                {!hasWritePermission && (
                  <Badge variant="secondary" className="flex items-center gap-1">
                    <Lock className="h-3 w-3" />
                    {t("header.readOnly")}
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                {t("header.subtitle")}
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={() => loadData(true)}>
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
                    <Globe className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{versionBadge}</p>
                    <p className="text-xs text-muted-foreground">{t("stats.version")}</p>
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
                    <p className="text-2xl font-bold">{networkCount}</p>
                    <p className="text-xs text-muted-foreground">{t("stats.networks")}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-md p-2 bg-green-500/10">
                    <Filter className="h-4 w-4 text-green-500" />
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
                  <div className="rounded-md p-2 bg-orange-500/10">
                    <ArrowLeftRight className="h-4 w-4 text-orange-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{redistCount}</p>
                    <p className="text-xs text-muted-foreground">{t("stats.redistribute")}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex-1 p-6 pt-4 overflow-auto">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-4">
              <TabsTrigger value="overview">{t("tabs.overview")}</TabsTrigger>
              <TabsTrigger value="networks">
                {t("tabs.networks")}
                {(config?.networks.length ?? 0) > 0 && (
                  <Badge variant="secondary" className="ml-2">{config?.networks.length}</Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="interfaces">
                {t("tabs.interfaces")}
                {ifaceCount > 0 && <Badge variant="secondary" className="ml-2">{ifaceCount}</Badge>}
              </TabsTrigger>
              <TabsTrigger value="redistribute">
                {t("tabs.redistribute")}
                {redistCount > 0 && <Badge variant="secondary" className="ml-2">{redistCount}</Badge>}
              </TabsTrigger>
              <TabsTrigger value="filters">{t("tabs.filters")}</TabsTrigger>
            </TabsList>

            {/* ============================================================ */}
            {/* Overview Tab */}
            {/* ============================================================ */}
            <TabsContent value="overview">
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm text-muted-foreground">{t("overview.description")}</p>
                {hasWritePermission && (
                  !overviewEditing ? (
                    <Button size="sm" variant="outline" onClick={startEditOverview}>
                      <Pencil className="h-4 w-4 mr-2" />
                      {tc("edit")}
                    </Button>
                  ) : (
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={cancelEditOverview}>{tc("cancel")}</Button>
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
                  <pre className="whitespace-pre-wrap">{overviewError}</pre>
                </div>
              )}

              <div className="grid grid-cols-2 gap-6">
                <Card>
                  <CardContent className="p-6">
                    <h3 className="font-semibold mb-4">{t("overview.globalSettings")}</h3>
                    <div className="space-y-4">
                      {/* Version */}
                      <div className="space-y-2">
                        <Label>{t("overview.version")}</Label>
                        <Select
                          value={overviewEditing ? (ovVersion || "unset") : (config?.version || "unset")}
                          onValueChange={(v) => setOvVersion(v === "unset" ? "" : v)}
                          disabled={!overviewEditing}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder={tc("default")} />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="unset">{tc("default")}</SelectItem>
                            <SelectItem value="1">v1</SelectItem>
                            <SelectItem value="2">v2</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Default Distance */}
                      <div className="space-y-2">
                        <Label>{t("overview.defaultDistance")}</Label>
                        <p className="text-xs text-muted-foreground">{t("overview.defaultDistanceHelp")}</p>
                        <Input
                          type="number"
                          min={1}
                          max={255}
                          placeholder="120"
                          value={overviewEditing ? ovDefaultDistance : (config?.default_distance ?? "")}
                          disabled={!overviewEditing}
                          onChange={(e) => setOvDefaultDistance(e.target.value)}
                        />
                      </div>

                      {/* Default Metric */}
                      <div className="space-y-2">
                        <Label>{t("overview.defaultMetric")}</Label>
                        <p className="text-xs text-muted-foreground">{t("overview.defaultMetricHelp")}</p>
                        <Input
                          type="number"
                          min={1}
                          max={16}
                          placeholder="1"
                          value={overviewEditing ? ovDefaultMetric : (config?.default_metric ?? "")}
                          disabled={!overviewEditing}
                          onChange={(e) => setOvDefaultMetric(e.target.value)}
                        />
                      </div>

                      {/* Route Map */}
                      <div className="space-y-2">
                        <Label>{t("overview.routeMap")}</Label>
                        {overviewEditing ? (
                          <Select value={ovRouteMap || "none"} onValueChange={(v) => setOvRouteMap(v === "none" ? "" : v)}>
                            <SelectTrigger>
                              <SelectValue placeholder={tc("none")} />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">{tc("none")}</SelectItem>
                              {routeMapNames.map((rm) => (
                                <SelectItem key={rm} value={rm} className="font-mono">{rm}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <Input
                            value={config?.route_map ?? ""}
                            disabled
                            placeholder={tc("none")}
                            className="font-mono"
                          />
                        )}
                      </div>

                      {/* Default Information Originate */}
                      <div className="flex items-center gap-3 rounded-lg border p-3">
                        <Checkbox
                          id="rip-originate"
                          checked={overviewEditing ? ovOriginate : config?.default_information_originate}
                          disabled={!overviewEditing}
                          onCheckedChange={(checked) => setOvOriginate(!!checked)}
                        />
                        <Label htmlFor="rip-originate" className="cursor-pointer">
                          {t("overview.originate")}
                        </Label>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <h3 className="font-semibold mb-4">{t("overview.timers")}</h3>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label>{t("overview.updateInterval")}</Label>
                        <p className="text-xs text-muted-foreground">{t("overview.updateHelp")}</p>
                        <Input
                          type="number"
                          min={5}
                          max={2147483647}
                          placeholder="30"
                          value={overviewEditing ? ovTimerUpdate : (config?.timers.update ?? "")}
                          disabled={!overviewEditing}
                          onChange={(e) => setOvTimerUpdate(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>{t("overview.timeoutInterval")}</Label>
                        <p className="text-xs text-muted-foreground">{t("overview.timeoutHelp")}</p>
                        <Input
                          type="number"
                          min={5}
                          max={2147483647}
                          placeholder="180"
                          value={overviewEditing ? ovTimerTimeout : (config?.timers.timeout ?? "")}
                          disabled={!overviewEditing}
                          onChange={(e) => setOvTimerTimeout(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>{t("overview.garbageCollection")}</Label>
                        <p className="text-xs text-muted-foreground">{t("overview.gcHelp")}</p>
                        <Input
                          type="number"
                          min={5}
                          max={2147483647}
                          placeholder="120"
                          value={overviewEditing ? ovTimerGc : (config?.timers.garbage_collection ?? "")}
                          disabled={!overviewEditing}
                          onChange={(e) => setOvTimerGc(e.target.value)}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* ============================================================ */}
            {/* Networks Tab */}
            {/* ============================================================ */}
            <TabsContent value="networks">
              <p className="text-sm text-muted-foreground mb-4">
                {t("networks.description")}
              </p>
              <div className="grid grid-cols-2 gap-4">
                {renderListSection(
                  t("networks.ripNetworks"),
                  config?.networks ?? [],
                  newNetwork,
                  setNewNetwork,
                  handleAddNetwork,
                  handleRemoveNetwork,
                  networksError,
                  t("example", { value: "10.0.0.0/8" })
                )}
                {renderListSection(
                  t("networks.neighbors"),
                  config?.neighbors ?? [],
                  newNeighbor,
                  setNewNeighbor,
                  handleAddNeighbor,
                  handleRemoveNeighbor,
                  neighborsError,
                  t("example", { value: "192.168.1.1" })
                )}
                {renderListSection(
                  t("networks.staticRoutes"),
                  config?.routes ?? [],
                  newRoute,
                  setNewRoute,
                  handleAddRoute,
                  handleRemoveRoute,
                  routesError,
                  t("example", { value: "10.0.0.0/8" })
                )}
                {renderListSection(
                  t("networks.passiveInterfaces"),
                  config?.passive_interfaces ?? [],
                  newPassiveIface,
                  setNewPassiveIface,
                  handleAddPassiveIface,
                  handleRemovePassiveIface,
                  passiveIfaceError,
                  t("networks.selectOrTypeInterface"),
                  true,
                  systemInterfaces
                )}
              </div>
            </TabsContent>

            {/* ============================================================ */}
            {/* Interfaces Tab */}
            {/* ============================================================ */}
            <TabsContent value="interfaces">
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm text-muted-foreground">
                  {t("interfaces.description")}
                </p>
                {hasWritePermission && (
                  <Button size="sm" onClick={() => { setEditingIface(null); setIfaceModalOpen(true); }}>
                    <Plus className="h-4 w-4 mr-2" />
                    {t("interfaces.addInterface")}
                  </Button>
                )}
              </div>

              {ifaceCount === 0 ? (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <Network className="h-12 w-12 text-muted-foreground/30 mb-4" />
                    <p className="text-sm text-muted-foreground mb-2">{t("interfaces.empty")}</p>
                    <p className="text-xs text-muted-foreground mb-4">
                      {t("interfaces.emptyHint")}
                    </p>
                    {hasWritePermission && (
                      <Button size="sm" onClick={() => { setEditingIface(null); setIfaceModalOpen(true); }}>
                        <Plus className="h-4 w-4 mr-2" />
                        {t("interfaces.addInterface")}
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
                          <TableHead>{t("interfaces.interface")}</TableHead>
                          <TableHead>{t("interfaces.authType")}</TableHead>
                          <TableHead>{t("interfaces.sendVersion")}</TableHead>
                          <TableHead>{t("interfaces.recvVersion")}</TableHead>
                          <TableHead>{t("interfaces.splitHorizon")}</TableHead>
                          <TableHead className="text-right">{tc("actions")}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {config?.interfaces.map((iface) => (
                          <TableRow key={iface.name}>
                            <TableCell className="font-medium font-mono">{iface.name}</TableCell>
                            <TableCell>
                              {iface.authentication_type ? (
                                <Badge variant="outline">{iface.authentication_type}</Badge>
                              ) : (
                                <span className="text-muted-foreground">—</span>
                              )}
                            </TableCell>
                            <TableCell>
                              {iface.send_version ? (
                                <Badge variant="secondary">v{iface.send_version}</Badge>
                              ) : (
                                <span className="text-muted-foreground">{t("interfaces.default")}</span>
                              )}
                            </TableCell>
                            <TableCell>
                              {iface.receive_version ? (
                                <Badge variant="secondary">v{iface.receive_version}</Badge>
                              ) : (
                                <span className="text-muted-foreground">{t("interfaces.default")}</span>
                              )}
                            </TableCell>
                            <TableCell>
                              {iface.split_horizon ? (
                                <Badge variant="outline">{iface.split_horizon}</Badge>
                              ) : (
                                <span className="text-muted-foreground">{t("interfaces.default")}</span>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              {hasWritePermission && (
                                <div className="flex items-center justify-end gap-1">
                                  <Button
                                    variant="ghost" size="icon" className="h-8 w-8"
                                    onClick={() => { setEditingIface(iface); setIfaceModalOpen(true); }}
                                  >
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive"
                                    onClick={() => setDeletingIface(iface)}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
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
            {/* Redistribute Tab */}
            {/* ============================================================ */}
            <TabsContent value="redistribute">
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm text-muted-foreground">
                  {t("redistribute.description")}
                </p>
                {hasWritePermission && (
                  <Button size="sm" onClick={() => { setEditingRedist(null); setRedistModalOpen(true); }}>
                    <Plus className="h-4 w-4 mr-2" />
                    {tc("add")}
                  </Button>
                )}
              </div>

              {redistCount === 0 ? (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <ArrowLeftRight className="h-12 w-12 text-muted-foreground/30 mb-4" />
                    <p className="text-sm text-muted-foreground mb-2">{t("redistribute.empty")}</p>
                    {hasWritePermission && (
                      <Button size="sm" onClick={() => { setEditingRedist(null); setRedistModalOpen(true); }}>
                        <Plus className="h-4 w-4 mr-2" />
                        {tc("add")}
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
                          <TableHead>{t("redistribute.protocol")}</TableHead>
                          <TableHead>{t("redistribute.metric")}</TableHead>
                          <TableHead>{t("redistribute.routeMap")}</TableHead>
                          <TableHead className="text-right">{tc("actions")}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {config?.redistribute.map((r) => (
                          <TableRow key={r.protocol}>
                            <TableCell className="font-medium font-mono">{r.protocol}</TableCell>
                            <TableCell>
                              {r.metric != null ? r.metric : <span className="text-muted-foreground">—</span>}
                            </TableCell>
                            <TableCell>
                              {r.route_map ? (
                                <span className="font-mono text-sm">{r.route_map}</span>
                              ) : (
                                <span className="text-muted-foreground">—</span>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              {hasWritePermission && (
                                <div className="flex items-center justify-end gap-1">
                                  <Button
                                    variant="ghost" size="icon" className="h-8 w-8"
                                    onClick={() => { setEditingRedist(r); setRedistModalOpen(true); }}
                                  >
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive"
                                    onClick={() => setDeletingRedist(r)}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
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
            {/* Filters Tab */}
            {/* ============================================================ */}
            <TabsContent value="filters">
              <div className="space-y-6">
                {/* Distribute Lists Section */}
                <div>
                  <h2 className="text-base font-semibold mb-3">{t("filters.distributeLists")}</h2>

                  {/* Global Filters */}
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm font-medium text-muted-foreground">{t("filters.globalFilters")}</h3>
                      {hasWritePermission && (
                        !dlGlobalEditing ? (
                          <Button size="sm" variant="outline" onClick={startEditDlGlobal}>
                            <Pencil className="h-4 w-4 mr-2" />
                            {tc("edit")}
                          </Button>
                        ) : (
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline" onClick={cancelEditDlGlobal}>{tc("cancel")}</Button>
                            <Button size="sm" onClick={saveDlGlobal} disabled={dlGlobalSaving}>
                              {dlGlobalSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                              {tc("save")}
                            </Button>
                          </div>
                        )
                      )}
                    </div>

                    {dlGlobalError && (
                      <div className="mb-3 p-3 rounded-md bg-destructive/10 text-destructive text-sm">
                        <pre className="whitespace-pre-wrap">{dlGlobalError}</pre>
                      </div>
                    )}

                    <Card>
                      <CardContent className="p-4">
                        <div className="grid grid-cols-2 gap-4">
                          {(["access_list_in", "access_list_out", "prefix_list_in", "prefix_list_out"] as const).map((field) => {
                            const label = field === "access_list_in" ? t("filters.accessListIn")
                              : field === "access_list_out" ? t("filters.accessListOut")
                              : field === "prefix_list_in" ? t("filters.prefixListIn")
                              : t("filters.prefixListOut");
                            const isAcl = field.startsWith("access");
                            const names = isAcl ? accessListNames : prefixListNames;
                            const currentVal = dlGlobalEditing
                              ? (dlGlobalDraft[field] ?? "")
                              : (config?.distribute_list.global_filters[field] ?? "");

                            return (
                              <div key={field} className="space-y-2">
                                <Label>{label}</Label>
                                {dlGlobalEditing ? (
                                  <Select
                                    value={(dlGlobalDraft[field] ?? "") || "none"}
                                    onValueChange={(v) => setDlGlobalDraft({ ...dlGlobalDraft, [field]: v === "none" ? null : v })}
                                  >
                                    <SelectTrigger>
                                      <SelectValue placeholder={tc("none")} />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="none">{tc("none")}</SelectItem>
                                      {names.map((n) => (
                                        <SelectItem key={n} value={n} className="font-mono">{n}</SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                ) : (
                                  <Input
                                    value={currentVal}
                                    disabled
                                    placeholder={tc("none")}
                                    className="font-mono"
                                  />
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Per-Interface Filters */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm font-medium text-muted-foreground">{t("filters.perInterfaceFilters")}</h3>
                      {hasWritePermission && (
                        <Button size="sm" onClick={() => { setEditingDlIface(null); setDlIfaceModalOpen(true); }}>
                          <Plus className="h-4 w-4 mr-2" />
                          {tc("add")}
                        </Button>
                      )}
                    </div>

                    {(config?.distribute_list.interface_filters.length ?? 0) === 0 ? (
                      <Card>
                        <CardContent className="flex flex-col items-center justify-center py-8">
                          <p className="text-sm text-muted-foreground">{t("filters.perInterfaceEmpty")}</p>
                        </CardContent>
                      </Card>
                    ) : (
                      <Card>
                        <ScrollArea>
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>{t("interfaces.interface")}</TableHead>
                                <TableHead>{t("filters.aclIn")}</TableHead>
                                <TableHead>{t("filters.aclOut")}</TableHead>
                                <TableHead>{t("filters.plIn")}</TableHead>
                                <TableHead>{t("filters.plOut")}</TableHead>
                                <TableHead className="text-right">{tc("actions")}</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {config?.distribute_list.interface_filters.map((f) => (
                                <TableRow key={f.interface}>
                                  <TableCell className="font-mono font-medium">{f.interface}</TableCell>
                                  <TableCell>{f.access_list_in ?? <span className="text-muted-foreground">—</span>}</TableCell>
                                  <TableCell>{f.access_list_out ?? <span className="text-muted-foreground">—</span>}</TableCell>
                                  <TableCell>{f.prefix_list_in ?? <span className="text-muted-foreground">—</span>}</TableCell>
                                  <TableCell>{f.prefix_list_out ?? <span className="text-muted-foreground">—</span>}</TableCell>
                                  <TableCell className="text-right">
                                    {hasWritePermission && (
                                      <div className="flex items-center justify-end gap-1">
                                        <Button
                                          variant="ghost" size="icon" className="h-8 w-8"
                                          onClick={() => { setEditingDlIface(f); setDlIfaceModalOpen(true); }}
                                        >
                                          <Pencil className="h-4 w-4" />
                                        </Button>
                                        <Button
                                          variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive"
                                          onClick={() => setDeletingDlIface(f)}
                                        >
                                          <Trash2 className="h-4 w-4" />
                                        </Button>
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
                  </div>
                </div>

                {/* Network Distance Section */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h2 className="text-base font-semibold">{t("filters.networkDistance")}</h2>
                    {hasWritePermission && (
                      <Button size="sm" onClick={() => { setEditingNd(null); setNdModalOpen(true); }}>
                        <Plus className="h-4 w-4 mr-2" />
                        {tc("add")}
                      </Button>
                    )}
                  </div>

                  {(config?.network_distances.length ?? 0) === 0 ? (
                    <Card>
                      <CardContent className="flex flex-col items-center justify-center py-8">
                        <p className="text-sm text-muted-foreground">{t("filters.networkDistanceEmpty")}</p>
                        {hasWritePermission && (
                          <Button size="sm" className="mt-3" onClick={() => { setEditingNd(null); setNdModalOpen(true); }}>
                            <Plus className="h-4 w-4 mr-2" />
                            {tc("add")}
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
                              <TableHead>{t("filters.networkPrefix")}</TableHead>
                              <TableHead>{t("filters.distance")}</TableHead>
                              <TableHead>{t("filters.accessList")}</TableHead>
                              <TableHead className="text-right">{tc("actions")}</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {config?.network_distances.map((nd) => (
                              <TableRow key={nd.prefix}>
                                <TableCell className="font-mono font-medium">{nd.prefix}</TableCell>
                                <TableCell>{nd.distance ?? <span className="text-muted-foreground">—</span>}</TableCell>
                                <TableCell>
                                  {nd.access_list ? (
                                    <span className="font-mono text-sm">{nd.access_list}</span>
                                  ) : (
                                    <span className="text-muted-foreground">—</span>
                                  )}
                                </TableCell>
                                <TableCell className="text-right">
                                  {hasWritePermission && (
                                    <div className="flex items-center justify-end gap-1">
                                      <Button
                                        variant="ghost" size="icon" className="h-8 w-8"
                                        onClick={() => { setEditingNd(nd); setNdModalOpen(true); }}
                                      >
                                        <Pencil className="h-4 w-4" />
                                      </Button>
                                      <Button
                                        variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive"
                                        onClick={() => setDeletingNd(nd)}
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
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
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Modals */}
      <RipInterfaceModal
        open={ifaceModalOpen}
        onOpenChange={(open) => {
          setIfaceModalOpen(open);
          if (!open) setEditingIface(null);
        }}
        existingInterface={editingIface}
        onSubmit={editingIface ? handleUpdateIface : handleCreateIface}
      />

      <DeleteRipModal
        open={!!deletingIface}
        onOpenChange={(open) => { if (!open) setDeletingIface(null); }}
        itemType="interface"
        itemName={deletingIface?.name ?? ""}
        onConfirm={handleDeleteIface}
      />

      <RipRedistributeModal
        open={redistModalOpen}
        onOpenChange={(open) => {
          setRedistModalOpen(open);
          if (!open) setEditingRedist(null);
        }}
        existingEntry={editingRedist}
        existingProtocols={config?.redistribute.map((r) => r.protocol) ?? []}
        routeMapNames={routeMapNames}
        onSubmit={editingRedist ? handleUpdateRedist : handleCreateRedist}
      />

      <DeleteRipModal
        open={!!deletingRedist}
        onOpenChange={(open) => { if (!open) setDeletingRedist(null); }}
        itemType="redistribution"
        itemName={deletingRedist?.protocol ?? ""}
        onConfirm={handleDeleteRedist}
      />

      <RipNetworkDistanceModal
        open={ndModalOpen}
        onOpenChange={(open) => {
          setNdModalOpen(open);
          if (!open) setEditingNd(null);
        }}
        existingEntry={editingNd}
        existingPrefixes={config?.network_distances.map((nd) => nd.prefix) ?? []}
        accessListNames={accessListNames}
        onSubmit={editingNd ? handleUpdateNd : handleCreateNd}
      />

      <DeleteRipModal
        open={!!deletingNd}
        onOpenChange={(open) => { if (!open) setDeletingNd(null); }}
        itemType="networkDistance"
        itemName={deletingNd?.prefix ?? ""}
        onConfirm={handleDeleteNd}
      />

      <RipDistributeListInterfaceModal
        open={dlIfaceModalOpen}
        onOpenChange={(open) => {
          setDlIfaceModalOpen(open);
          if (!open) setEditingDlIface(null);
        }}
        existingEntry={editingDlIface}
        existingInterfaces={config?.distribute_list.interface_filters.map((f) => f.interface) ?? []}
        availableInterfaces={systemInterfaces}
        accessListNames={accessListNames}
        prefixListNames={prefixListNames}
        onSubmit={editingDlIface ? handleUpdateDlIface : handleCreateDlIface}
      />

      <DeleteRipModal
        open={!!deletingDlIface}
        onOpenChange={(open) => { if (!open) setDeletingDlIface(null); }}
        itemType="interfaceFilter"
        itemName={deletingDlIface?.interface ?? ""}
        onConfirm={handleDeleteDlIface}
      />
    </>
  );
}
