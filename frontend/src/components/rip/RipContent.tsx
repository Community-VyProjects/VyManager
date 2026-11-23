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
import { NamedListSelect } from "@/components/ui/named-list-select";
import { InterfaceSelect } from "@/components/ui/interface-select";
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
} from "@/lib/api/rip";
import { routeMapService } from "@/lib/api/route-map";
import { accessListService } from "@/lib/api/access-list";
import { prefixListService } from "@/lib/api/prefix-list";
import { NONE_SENTINEL } from "@/lib/named-list-select-options";
import { RipInterfaceModal } from "./RipInterfaceModal";
import { RipRedistributeModal } from "./RipRedistributeModal";
import { RipNetworkDistanceModal } from "./RipNetworkDistanceModal";
import { RipDistributeListInterfaceModal } from "./RipDistributeListInterfaceModal";
import { DeleteRipModal, type RipDeleteKind } from "./DeleteRipModal";
import { usePermissions } from "@/hooks/usePermissions";
import { FeatureGroup } from "@/lib/api/user-management";
import type { ApiError } from "@/lib/types/api";
import {
  DISTANCE_RANGE,
  METRIC_RANGE,
  TIMER_RANGE,
  overviewProblem,
} from "@/lib/api/rip-ranges";

const VERSIONS = ["1", "2"];

const PROBLEM_RANGE = {
  distanceRange: DISTANCE_RANGE,
  metricRange: METRIC_RANGE,
  timerRange: TIMER_RANGE,
};

/** The commit each delete dialog runs, by the kind of object it removes. */
const DELETE_ACTIONS: Record<RipDeleteKind, (name: string) => Promise<unknown>> = {
  interface: (name) => ripService.deleteInterface(name),
  redistribution: (name) => ripService.deleteRedistribute(name),
  networkDistance: (name) => ripService.deleteNetworkDistance(name),
  interfaceFilter: (name) => ripService.deleteDistributeListInterface(name),
  network: (name) => ripService.removeNetwork(name),
  neighbor: (name) => ripService.removeNeighbor(name),
  route: (name) => ripService.removeRoute(name),
  passiveInterface: (name) => ripService.removePassiveInterface(name),
  rip: () => ripService.deleteRip(),
};

export function RipContent() {
  const t = useTranslations("rip");
  const tc = useTranslations("common");
  const { canWrite } = usePermissions();
  const hasWritePermission = canWrite(FeatureGroup.RIP);

  const [config, setConfig] = useState<RipConfig | null>(null);
  const [capabilities, setCapabilities] = useState<RipCapabilities | null>(null);
  const [loading, setLoading] = useState(true);
  // A re-read after a save; the page stays mounted and every write control waits.
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("overview");

  const [routeMapNames, setRouteMapNames] = useState<string[]>([]);
  const [accessListNames, setAccessListNames] = useState<string[]>([]);
  const [prefixListNames, setPrefixListNames] = useState<string[]>([]);

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
  // Networks tab: inline add state
  // ============================================================
  const [newNetwork, setNewNetwork] = useState("");
  const [networksError, setNetworksError] = useState<string | null>(null);
  const [newNeighbor, setNewNeighbor] = useState("");
  const [neighborsError, setNeighborsError] = useState<string | null>(null);
  const [newRoute, setNewRoute] = useState("");
  const [routesError, setRoutesError] = useState<string | null>(null);
  const [newPassiveIface, setNewPassiveIface] = useState("");
  const [passiveIfaceError, setPassiveIfaceError] = useState<string | null>(null);
  // Id of the list section whose add commit is running.
  const [listBusy, setListBusy] = useState<string | null>(null);

  // ============================================================
  // Modal state. The subject stays set after close so the dialog keeps its
  // text while it animates out; modalKey remounts the modal on every open.
  // ============================================================
  const [modalKey, setModalKey] = useState(0);
  const [ifaceModalOpen, setIfaceModalOpen] = useState(false);
  const [editingIface, setEditingIface] = useState<RipInterface | null>(null);
  const [redistModalOpen, setRedistModalOpen] = useState(false);
  const [editingRedist, setEditingRedist] = useState<RipRedistribute | null>(null);
  const [ndModalOpen, setNdModalOpen] = useState(false);
  const [editingNd, setEditingNd] = useState<RipNetworkDistance | null>(null);
  const [dlIfaceModalOpen, setDlIfaceModalOpen] = useState(false);
  const [editingDlIface, setEditingDlIface] = useState<RipDistributeListInterface | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ kind: RipDeleteKind; name: string } | null>(null);

  // ============================================================
  // Distribute list global editing
  // ============================================================
  const [dlGlobalEditing, setDlGlobalEditing] = useState(false);
  const [dlGlobalSaving, setDlGlobalSaving] = useState(false);
  const [dlGlobalError, setDlGlobalError] = useState<string | null>(null);
  const [dlGlobalDraft, setDlGlobalDraft] = useState<RipDistributeListGlobal>({});

  // ============================================================
  // Load
  // ============================================================

  const fetchData = useCallback(async (refresh: boolean) => {
    const [configData, capData, routeMaps, accessLists, prefixLists] =
      await Promise.all([
        ripService.getConfig(refresh),
        ripService.getCapabilities(),
        routeMapService.getConfig().then((c) => c.route_maps.map((rm) => rm.name)).catch(() => [] as string[]),
        accessListService.getConfig().then((c) => c.ipv4_lists.map((al) => al.number)).catch(() => [] as string[]),
        prefixListService.getConfig().then((c) => c.ipv4_lists.map((pl) => pl.name)).catch(() => [] as string[]),
      ]);
    setConfig(configData);
    setCapabilities(capData);
    setRouteMapNames(routeMaps);
    setAccessListNames(accessLists);
    setPrefixListNames(prefixLists);
    setError(null);
  }, []);

  useEffect(() => {
    fetchData(false)
      .catch((err) => setError((err as ApiError).message || t("errors.loadFailed")))
      .finally(() => setLoading(false));
  }, [fetchData, t]);

  const retry = () => {
    setLoading(true);
    fetchData(true)
      .catch((err) => setError((err as ApiError).message || t("errors.loadFailed")))
      .finally(() => setLoading(false));
  };

  const reload = async () => {
    setRefreshing(true);
    try {
      await fetchData(true);
    } catch (err) {
      setError((err as ApiError).message || t("errors.loadFailed"));
    } finally {
      setRefreshing(false);
    }
  };

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
    const problem = overviewProblem(
      ovDefaultDistance,
      ovDefaultMetric,
      [ovTimerUpdate, ovTimerTimeout, ovTimerGc],
    );
    if (problem) {
      setOverviewError(t(`validation.${problem}`, PROBLEM_RANGE[problem]));
      return;
    }
    try {
      setOverviewSaving(true);
      setOverviewError(null);
      // Global settings and timers go to the router as one commit.
      await ripService.updateSettings(config, {
        version: ovVersion,
        default_distance: ovDefaultDistance,
        default_metric: ovDefaultMetric,
        route_map: ovRouteMap,
        default_information_originate: ovOriginate,
        timers: { update: ovTimerUpdate, timeout: ovTimerTimeout, garbage_collection: ovTimerGc },
      });
      setOverviewEditing(false);
      void reload();
    } catch (err) {
      setOverviewError((err as ApiError).message || t("errors.saveSettingsFailed"));
    } finally {
      setOverviewSaving(false);
    }
  };

  // ============================================================
  // Networks tab handlers
  // ============================================================

  const handleAddNetwork = async () => {
    try {
      setNetworksError(null);
      await ripService.addNetwork(newNetwork.trim());
      setNewNetwork("");
      void reload();
    } catch (err) {
      setNetworksError((err as ApiError).message || t("errors.addNetworkFailed"));
    }
  };

  const handleAddNeighbor = async () => {
    try {
      setNeighborsError(null);
      await ripService.addNeighbor(newNeighbor.trim());
      setNewNeighbor("");
      void reload();
    } catch (err) {
      setNeighborsError((err as ApiError).message || t("errors.addNeighborFailed"));
    }
  };

  const handleAddRoute = async () => {
    try {
      setRoutesError(null);
      await ripService.addRoute(newRoute.trim());
      setNewRoute("");
      void reload();
    } catch (err) {
      setRoutesError((err as ApiError).message || t("errors.addRouteFailed"));
    }
  };

  const handleAddPassiveIface = async () => {
    try {
      setPassiveIfaceError(null);
      await ripService.addPassiveInterface(newPassiveIface.trim());
      setNewPassiveIface("");
      void reload();
    } catch (err) {
      setPassiveIfaceError((err as ApiError).message || t("errors.addPassiveIfaceFailed"));
    }
  };

  // ============================================================
  // Modal and delete handlers
  // ============================================================

  const openIfaceModal = (iface: RipInterface | null) => {
    setEditingIface(iface);
    setModalKey((k) => k + 1);
    setIfaceModalOpen(true);
  };

  const submitIface = async (iface: RipInterface) => {
    if (editingIface) await ripService.updateInterface(editingIface, iface);
    else await ripService.createInterface(iface);
    void reload();
  };

  const openRedistModal = (entry: RipRedistribute | null) => {
    setEditingRedist(entry);
    setModalKey((k) => k + 1);
    setRedistModalOpen(true);
  };

  const submitRedist = async (entry: RipRedistribute) => {
    if (editingRedist) await ripService.updateRedistribute(editingRedist, entry);
    else await ripService.createRedistribute(entry);
    void reload();
  };

  const openNdModal = (entry: RipNetworkDistance | null) => {
    setEditingNd(entry);
    setModalKey((k) => k + 1);
    setNdModalOpen(true);
  };

  const submitNd = async (entry: RipNetworkDistance) => {
    if (editingNd) await ripService.updateNetworkDistance(editingNd, entry);
    else await ripService.createNetworkDistance(entry);
    void reload();
  };

  const openDlIfaceModal = (entry: RipDistributeListInterface | null) => {
    setEditingDlIface(entry);
    setModalKey((k) => k + 1);
    setDlIfaceModalOpen(true);
  };

  const submitDlIface = async (entry: RipDistributeListInterface) => {
    if (editingDlIface) await ripService.updateDistributeListInterface(editingDlIface, entry);
    else await ripService.createDistributeListInterface(entry);
    void reload();
  };

  const openDelete = (kind: RipDeleteKind, name: string) => {
    setDeleteTarget({ kind, name });
    setModalKey((k) => k + 1);
    setDeleteOpen(true);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    await DELETE_ACTIONS[deleteTarget.kind](deleteTarget.name);
    setDeleteOpen(false);
    void reload();
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
      setDlGlobalEditing(false);
      void reload();
    } catch (err) {
      setDlGlobalError((err as ApiError).message || t("errors.saveFiltersFailed"));
    } finally {
      setDlGlobalSaving(false);
    }
  };

  // ============================================================
  // Derived values
  // ============================================================

  const networkCount = config?.networks.length ?? 0;
  const ifaceCount = config?.interfaces.length ?? 0;
  const redistCount = config?.redistribute.length ?? 0;

  const versionBadge = config?.version ? t("versionOption", { value: config.version }) : "—";

  const authLabel = (mode: string) =>
    mode === "md5" ? t("interfaceModal.md5") : t("interfaceModal.plaintext");
  const splitHorizonLabel = (mode: string) =>
    mode === "disable" ? t("interfaceModal.disable") : t("interfaceModal.poisonReverse");

  // ============================================================
  // Render helpers
  // ============================================================

  const runListAction = async (sectionId: string, action: () => Promise<void>) => {
    if (listBusy) return;
    setListBusy(sectionId);
    try {
      await action();
    } finally {
      setListBusy(null);
    }
  };

  const renderListSection = (
    title: string,
    inputId: string,
    kind: RipDeleteKind,
    items: string[],
    inputValue: string,
    onInputChange: (v: string) => void,
    onAdd: () => Promise<void>,
    err: string | null,
    inputPlaceholder: string,
    isDropdown?: boolean,
  ) => {
    // Every section waits while any list commit or the re-read after it runs; only the running one spins.
    const busy = listBusy !== null || refreshing;
    const running = listBusy === inputId;
    const add = () => {
      if (inputValue.trim() && !busy) runListAction(inputId, onAdd);
    };
    return (
    <Card>
      <CardContent className="p-4">
        <h3 className="font-semibold mb-3 text-sm">
          {hasWritePermission ? (
            <Label htmlFor={inputId} className="font-semibold text-sm">{title}</Label>
          ) : (
            title
          )}
        </h3>
        {hasWritePermission && (
          <div className="flex gap-2 mb-3">
            {isDropdown ? (
              <InterfaceSelect
                id={inputId}
                value={inputValue}
                onValueChange={onInputChange}
                disabled={busy}
                placeholder={inputPlaceholder}
                className="flex-1"
                filter={(item) => !items.includes(item.name)}
                noneOption={items.includes("default") ? undefined : { label: "default", value: "default" }}
              />
            ) : (
              <Input
                id={inputId}
                placeholder={inputPlaceholder}
                value={inputValue}
                disabled={busy}
                onChange={(e) => onInputChange(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") add(); }}
                className="flex-1 font-mono text-sm"
              />
            )}
            <Button size="sm" onClick={add} disabled={busy || !inputValue.trim()} aria-label={tc("add")}>
              {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            </Button>
          </div>
        )}
        {err && (
          <p className="text-sm text-destructive mb-2 whitespace-pre-wrap">{err}</p>
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
                    aria-label={tc("delete")}
                    disabled={busy}
                    onClick={() => openDelete(kind, item)}
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
  };

  // ============================================================
  // Loading / Error states
  // ============================================================

  if (loading && !config) {
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
        <Button variant="outline" onClick={retry}>{tc("retry")}</Button>
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
                    {tc("readOnly")}
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                {t("header.subtitle")}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {hasWritePermission && config?.configured && (
                <Button
                  variant="outline"
                  size="sm"
                  className="text-destructive hover:text-destructive"
                  onClick={() => openDelete("rip", "")}
                  disabled={refreshing}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  {t("header.deleteRip")}
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={() => void reload()} disabled={refreshing}>
                <RefreshCw className={`h-4 w-4 mr-2${refreshing ? " animate-spin" : ""}`} />
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
                    <Button size="sm" variant="outline" onClick={startEditOverview} disabled={refreshing}>
                      <Pencil className="h-4 w-4 mr-2" />
                      {tc("edit")}
                    </Button>
                  ) : (
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={cancelEditOverview} disabled={overviewSaving}>{tc("cancel")}</Button>
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
                        <Label htmlFor="rip-version">{t("overview.version")}</Label>
                        <Select
                          value={(overviewEditing ? ovVersion : config?.version) || NONE_SENTINEL}
                          onValueChange={(v) => setOvVersion(v === NONE_SENTINEL ? "" : v)}
                          disabled={!overviewEditing}
                        >
                          <SelectTrigger id="rip-version">
                            <SelectValue placeholder={tc("default")} />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value={NONE_SENTINEL}>{tc("default")}</SelectItem>
                            {VERSIONS.map((v) => (
                              <SelectItem key={v} value={v}>{t("versionOption", { value: v })}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Default Distance */}
                      <div className="space-y-2">
                        <Label htmlFor="rip-default-distance">{t("overview.defaultDistance")}</Label>
                        <Input
                          id="rip-default-distance"
                          type="number"
                          min={DISTANCE_RANGE.min}
                          max={DISTANCE_RANGE.max}
                          placeholder="120"
                          value={overviewEditing ? ovDefaultDistance : (config?.default_distance ?? "")}
                          disabled={!overviewEditing}
                          onChange={(e) => setOvDefaultDistance(e.target.value)}
                        />
                      </div>

                      {/* Default Metric */}
                      <div className="space-y-2">
                        <Label htmlFor="rip-default-metric">{t("overview.defaultMetric")}</Label>
                        <Input
                          id="rip-default-metric"
                          type="number"
                          min={METRIC_RANGE.min}
                          max={METRIC_RANGE.max}
                          placeholder="1"
                          value={overviewEditing ? ovDefaultMetric : (config?.default_metric ?? "")}
                          disabled={!overviewEditing}
                          onChange={(e) => setOvDefaultMetric(e.target.value)}
                        />
                      </div>

                      {/* Route Map */}
                      <div className="space-y-2">
                        <Label htmlFor="rip-route-map">{t("overview.routeMap")}</Label>
                        <NamedListSelect
                          id="rip-route-map"
                          value={overviewEditing ? ovRouteMap : (config?.route_map ?? "")}
                          names={routeMapNames}
                          disabled={!overviewEditing}
                          onValueChange={setOvRouteMap}
                        />
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
                        <Label htmlFor="rip-update-interval">{t("overview.updateInterval")}</Label>
                        <Input
                          id="rip-update-interval"
                          type="number"
                          min={TIMER_RANGE.min}
                          max={TIMER_RANGE.max}
                          placeholder="30"
                          value={overviewEditing ? ovTimerUpdate : (config?.timers.update ?? "")}
                          disabled={!overviewEditing}
                          onChange={(e) => setOvTimerUpdate(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="rip-timeout-interval">{t("overview.timeoutInterval")}</Label>
                        <Input
                          id="rip-timeout-interval"
                          type="number"
                          min={TIMER_RANGE.min}
                          max={TIMER_RANGE.max}
                          placeholder="180"
                          value={overviewEditing ? ovTimerTimeout : (config?.timers.timeout ?? "")}
                          disabled={!overviewEditing}
                          onChange={(e) => setOvTimerTimeout(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="rip-gc-interval">{t("overview.garbageCollection")}</Label>
                        <Input
                          id="rip-gc-interval"
                          type="number"
                          min={TIMER_RANGE.min}
                          max={TIMER_RANGE.max}
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
                  "rip-list-ripNetworks",
                  "network",
                  config?.networks ?? [],
                  newNetwork,
                  setNewNetwork,
                  handleAddNetwork,
                  networksError,
                  t("example", { value: "10.0.0.0/8" })
                )}
                {renderListSection(
                  t("networks.neighbors"),
                  "rip-list-neighbors",
                  "neighbor",
                  config?.neighbors ?? [],
                  newNeighbor,
                  setNewNeighbor,
                  handleAddNeighbor,
                  neighborsError,
                  t("example", { value: "192.168.1.1" })
                )}
                {renderListSection(
                  t("networks.staticRoutes"),
                  "rip-list-staticRoutes",
                  "route",
                  config?.routes ?? [],
                  newRoute,
                  setNewRoute,
                  handleAddRoute,
                  routesError,
                  t("example", { value: "10.0.0.0/8" })
                )}
                {renderListSection(
                  t("networks.passiveInterfaces"),
                  "rip-list-passiveInterfaces",
                  "passiveInterface",
                  config?.passive_interfaces ?? [],
                  newPassiveIface,
                  setNewPassiveIface,
                  handleAddPassiveIface,
                  passiveIfaceError,
                  tc("selectInterface"),
                  true,
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
                  <Button size="sm" onClick={() => openIfaceModal(null)} disabled={refreshing}>
                    <Plus className="h-4 w-4 mr-2" />
                    {tc("addInterface")}
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
                      <Button size="sm" onClick={() => openIfaceModal(null)} disabled={refreshing}>
                        <Plus className="h-4 w-4 mr-2" />
                        {tc("addInterface")}
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
                                <Badge variant="outline">{authLabel(iface.authentication_type)}</Badge>
                              ) : (
                                <span className="text-muted-foreground">—</span>
                              )}
                            </TableCell>
                            <TableCell>
                              {iface.send_version ? (
                                <Badge variant="secondary">{t("versionOption", { value: iface.send_version })}</Badge>
                              ) : (
                                <span className="text-muted-foreground">{t("interfaces.default")}</span>
                              )}
                            </TableCell>
                            <TableCell>
                              {iface.receive_version ? (
                                <Badge variant="secondary">{t("versionOption", { value: iface.receive_version })}</Badge>
                              ) : (
                                <span className="text-muted-foreground">{t("interfaces.default")}</span>
                              )}
                            </TableCell>
                            <TableCell>
                              {iface.split_horizon ? (
                                <Badge variant="outline">{splitHorizonLabel(iface.split_horizon)}</Badge>
                              ) : (
                                <span className="text-muted-foreground">{t("interfaces.default")}</span>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              {hasWritePermission && (
                                <div className="flex items-center justify-end gap-1">
                                  <Button
                                    variant="ghost" size="icon" className="h-8 w-8" aria-label={tc("edit")}
                                    disabled={refreshing}
                                    onClick={() => openIfaceModal(iface)}
                                  >
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" aria-label={tc("delete")}
                                    disabled={refreshing}
                                    onClick={() => openDelete("interface", iface.name)}
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
                  <Button size="sm" onClick={() => openRedistModal(null)} disabled={refreshing}>
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
                      <Button size="sm" onClick={() => openRedistModal(null)} disabled={refreshing}>
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
                                    variant="ghost" size="icon" className="h-8 w-8" aria-label={tc("edit")}
                                    disabled={refreshing}
                                    onClick={() => openRedistModal(r)}
                                  >
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" aria-label={tc("delete")}
                                    disabled={refreshing}
                                    onClick={() => openDelete("redistribution", r.protocol)}
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
                          <Button size="sm" variant="outline" onClick={startEditDlGlobal} disabled={refreshing}>
                            <Pencil className="h-4 w-4 mr-2" />
                            {tc("edit")}
                          </Button>
                        ) : (
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline" onClick={cancelEditDlGlobal} disabled={dlGlobalSaving}>{tc("cancel")}</Button>
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
                                <Label htmlFor={`rip-dl-${field}`}>{label}</Label>
                                <NamedListSelect
                                  id={`rip-dl-${field}`}
                                  value={currentVal}
                                  names={names}
                                  disabled={!dlGlobalEditing}
                                  onValueChange={(v) => setDlGlobalDraft({ ...dlGlobalDraft, [field]: v || null })}
                                />
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
                        <Button size="sm" onClick={() => openDlIfaceModal(null)} disabled={refreshing}>
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
                                          variant="ghost" size="icon" className="h-8 w-8" aria-label={tc("edit")}
                                          disabled={refreshing}
                                          onClick={() => openDlIfaceModal(f)}
                                        >
                                          <Pencil className="h-4 w-4" />
                                        </Button>
                                        <Button
                                          variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" aria-label={tc("delete")}
                                          disabled={refreshing}
                                          onClick={() => openDelete("interfaceFilter", f.interface)}
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
                      <Button size="sm" onClick={() => openNdModal(null)} disabled={refreshing}>
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
                          <Button size="sm" className="mt-3" onClick={() => openNdModal(null)} disabled={refreshing}>
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
                                        variant="ghost" size="icon" className="h-8 w-8" aria-label={tc("edit")}
                                        disabled={refreshing}
                                        onClick={() => openNdModal(nd)}
                                      >
                                        <Pencil className="h-4 w-4" />
                                      </Button>
                                      <Button
                                        variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" aria-label={tc("delete")}
                                        disabled={refreshing}
                                        onClick={() => openDelete("networkDistance", nd.prefix)}
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
        key={`iface-${modalKey}`}
        open={ifaceModalOpen}
        onOpenChange={setIfaceModalOpen}
        existingInterface={editingIface}
        configuredInterfaces={config?.interfaces.map((i) => i.name) ?? []}
        onSubmit={submitIface}
      />

      <RipRedistributeModal
        key={`redist-${modalKey}`}
        open={redistModalOpen}
        onOpenChange={setRedistModalOpen}
        existingEntry={editingRedist}
        existingProtocols={config?.redistribute.map((r) => r.protocol) ?? []}
        routeMapNames={routeMapNames}
        protocols={capabilities?.features.redistribute.protocols || []}
        onSubmit={submitRedist}
      />

      <RipNetworkDistanceModal
        key={`nd-${modalKey}`}
        open={ndModalOpen}
        onOpenChange={setNdModalOpen}
        existingEntry={editingNd}
        existingPrefixes={config?.network_distances.map((nd) => nd.prefix) ?? []}
        accessListNames={accessListNames}
        onSubmit={submitNd}
      />

      <RipDistributeListInterfaceModal
        key={`dl-${modalKey}`}
        open={dlIfaceModalOpen}
        onOpenChange={setDlIfaceModalOpen}
        existingEntry={editingDlIface}
        existingInterfaces={config?.distribute_list.interface_filters.map((f) => f.interface) ?? []}
        accessListNames={accessListNames}
        prefixListNames={prefixListNames}
        onSubmit={submitDlIface}
      />

      <DeleteRipModal
        key={`delete-${modalKey}`}
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        itemType={deleteTarget?.kind ?? "interface"}
        itemName={deleteTarget?.name ?? ""}
        onConfirm={confirmDelete}
      />
    </>
  );
}
