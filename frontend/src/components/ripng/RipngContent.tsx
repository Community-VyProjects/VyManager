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
  GitMerge,
  Lock,
} from "lucide-react";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import {
  ripNgService,
  RipNgConfig,
  RipNgCapabilities,
  RipNgInterface,
  RipNgRedistribute,
  RipNgDistributeListGlobal,
  RipNgDistributeListInterface,
} from "@/lib/api/ripng";
import {
  ripngListWithDraft,
  ripngProblemArgs,
  ripngRange,
  ripngSettingsProblem,
  type RipNgListKind,
} from "@/lib/api/ripng-save-ops";
import { routeMapService } from "@/lib/api/route-map";
import { accessListService } from "@/lib/api/access-list";
import { prefixListService } from "@/lib/api/prefix-list";
import type { ApiError } from "@/lib/types/api";
import { RipngInterfaceModal } from "./RipngInterfaceModal";
import { RipngRedistributeModal } from "./RipngRedistributeModal";
import { RipngDistributeListInterfaceModal } from "./RipngDistributeListInterfaceModal";
import { DeleteRipngModal, type RipNgDeleteKind } from "./DeleteRipngModal";
import { usePermissions } from "@/hooks/usePermissions";
import { FeatureGroup } from "@/lib/api/user-management";

const LIST_KINDS: readonly RipNgListKind[] = ["network", "aggregateAddress", "route", "passiveInterface"];
const isListKind = (kind: RipNgDeleteKind): kind is RipNgListKind =>
  (LIST_KINDS as readonly string[]).includes(kind);

/** The commit each delete dialog runs, by the kind of object it removes. */
const DELETE_ACTIONS: Record<RipNgDeleteKind, (name: string) => Promise<unknown>> = {
  interface: (name) => ripNgService.deleteInterface(name),
  redistribution: (name) => ripNgService.deleteRedistribute(name),
  interfaceFilter: (name) => ripNgService.deleteDistributeListInterface(name),
  network: (name) => ripNgService.removeListItem("network", name),
  aggregateAddress: (name) => ripNgService.removeListItem("aggregateAddress", name),
  route: (name) => ripNgService.removeListItem("route", name),
  passiveInterface: (name) => ripNgService.removeListItem("passiveInterface", name),
  ripng: () => ripNgService.deleteRipng(),
};

export function RipngContent() {
  const t = useTranslations("ripng");
  const tc = useTranslations("common");
  const { canWrite } = usePermissions();
  const hasWritePermission = canWrite(FeatureGroup.RIPNG);

  const [config, setConfig] = useState<RipNgConfig | null>(null);
  const [capabilities, setCapabilities] = useState<RipNgCapabilities | null>(null);
  const [loading, setLoading] = useState(true);
  // A re-read after a save; the page stays mounted and every write control waits.
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Picker lists that failed to load (a 403 stays silent: the user may not read that feature).
  const [listErrors, setListErrors] = useState<string[]>([]);
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
  const [ovDefaultMetric, setOvDefaultMetric] = useState("");
  const [ovRouteMap, setOvRouteMap] = useState("");
  const [ovOriginate, setOvOriginate] = useState(false);
  const [ovTimerUpdate, setOvTimerUpdate] = useState("");
  const [ovTimerTimeout, setOvTimerTimeout] = useState("");
  const [ovTimerGc, setOvTimerGc] = useState("");

  // ============================================================
  // Networks tab: inline add state, keyed by list kind
  // ============================================================
  const [listDrafts, setListDrafts] = useState<Record<RipNgListKind, string>>({
    network: "",
    aggregateAddress: "",
    route: "",
    passiveInterface: "",
  });
  const [listErrorsByKind, setListErrorsByKind] = useState<Partial<Record<RipNgListKind, string>>>({});
  // Kind of the list section whose add commit is running.
  const [listBusy, setListBusy] = useState<RipNgListKind | null>(null);

  // ============================================================
  // Modal state. The subject stays set after close so the dialog keeps its
  // text while it animates out; modalKey remounts the modal on every open.
  // ============================================================
  const [modalKey, setModalKey] = useState(0);
  const [ifaceModalOpen, setIfaceModalOpen] = useState(false);
  const [editingIface, setEditingIface] = useState<RipNgInterface | null>(null);
  const [redistModalOpen, setRedistModalOpen] = useState(false);
  const [editingRedist, setEditingRedist] = useState<RipNgRedistribute | null>(null);
  const [dlIfaceModalOpen, setDlIfaceModalOpen] = useState(false);
  const [editingDlIface, setEditingDlIface] = useState<RipNgDistributeListInterface | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ kind: RipNgDeleteKind; name: string } | null>(null);

  // ============================================================
  // Distribute list global editing
  // ============================================================
  const [dlGlobalEditing, setDlGlobalEditing] = useState(false);
  const [dlGlobalSaving, setDlGlobalSaving] = useState(false);
  const [dlGlobalError, setDlGlobalError] = useState<string | null>(null);
  const [dlGlobalDraft, setDlGlobalDraft] = useState<RipNgDistributeListGlobal>({});

  // ============================================================
  // Load
  // ============================================================

  const fetchData = useCallback(async (refresh: boolean) => {
    const [configData, capData] = await Promise.all([
      ripNgService.getConfig(refresh),
      ripNgService.getCapabilities(),
    ]);
    // Picker names come from features with their own permissions. A 403
    // leaves the picker empty without a message; any other failure says so.
    const failed: string[] = [];
    const names = (load: Promise<string[]>, message: string) =>
      load.catch((err: unknown) => {
        if ((err as ApiError).status !== 403) failed.push(message);
        return [] as string[];
      });
    const [routeMaps, accessLists, prefixLists] = await Promise.all([
      names(routeMapService.getConfig().then((c) => c.route_maps.map((rm) => rm.name)), t("errors.loadRouteMapsFailed")),
      names(accessListService.getConfig().then((c) => c.ipv6_lists.map((al) => al.number)), t("errors.loadAccessListsFailed")),
      names(prefixListService.getConfig().then((c) => c.ipv6_lists.map((pl) => pl.name)), t("errors.loadPrefixListsFailed")),
    ]);
    setConfig(configData);
    setCapabilities(capData);
    setRouteMapNames(routeMaps);
    setAccessListNames(accessLists);
    setPrefixListNames(prefixLists);
    setListErrors(failed);
    setError(null);
  }, [t]);

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
    const draft = {
      default_metric: ovDefaultMetric,
      route_map: ovRouteMap,
      default_information_originate: ovOriginate,
      timers: { update: ovTimerUpdate, timeout: ovTimerTimeout, garbage_collection: ovTimerGc },
    };
    const problem = ripngSettingsProblem(draft, capabilities);
    if (problem) {
      setOverviewError(t(`validation.${problem.key}`, ripngProblemArgs(problem)));
      return;
    }
    try {
      setOverviewSaving(true);
      setOverviewError(null);
      // Global settings and timers go to the router as one commit.
      await ripNgService.updateSettings(config, draft);
      await reload();
      setOverviewEditing(false);
    } catch (err) {
      setOverviewError((err as ApiError).message || t("errors.saveSettingsFailed"));
    } finally {
      setOverviewSaving(false);
    }
  };

  // ============================================================
  // Networks tab handlers
  // ============================================================

  const LIST_ADD_FAILED: Record<RipNgListKind, string> = {
    network: t("errors.addNetworkFailed"),
    aggregateAddress: t("errors.addAggregateFailed"),
    route: t("errors.addRouteFailed"),
    passiveInterface: t("errors.addPassiveIfaceFailed"),
  };

  const setListError = (kind: RipNgListKind, message: string | null) =>
    setListErrorsByKind((prev) => ({ ...prev, [kind]: message ?? undefined }));

  const addListItem = async (kind: RipNgListKind, items: string[]) => {
    // The typed value is checked and folded in the same way a save would.
    const { items: next, problem } = ripngListWithDraft(kind, items, listDrafts[kind]);
    if (problem) {
      setListError(kind, t(`validation.${problem.key}`, ripngProblemArgs(problem)));
      return;
    }
    try {
      setListError(kind, null);
      await ripNgService.updateList(kind, items, next);
      setListDrafts((prev) => ({ ...prev, [kind]: "" }));
      await reload();
    } catch (err) {
      setListError(kind, (err as ApiError).message || LIST_ADD_FAILED[kind]);
    }
  };

  // ============================================================
  // Modal and delete handlers
  // ============================================================

  const openIfaceModal = (iface: RipNgInterface | null) => {
    setEditingIface(iface);
    setModalKey((k) => k + 1);
    setIfaceModalOpen(true);
  };

  const submitIface = async (iface: RipNgInterface) => {
    if (editingIface) await ripNgService.updateInterface(editingIface, iface);
    else await ripNgService.createInterface(iface);
    await reload();
  };

  const openRedistModal = (entry: RipNgRedistribute | null) => {
    setEditingRedist(entry);
    setModalKey((k) => k + 1);
    setRedistModalOpen(true);
  };

  const submitRedist = async (entry: RipNgRedistribute) => {
    if (editingRedist) await ripNgService.updateRedistribute(editingRedist, entry);
    else await ripNgService.createRedistribute(entry);
    await reload();
  };

  const openDlIfaceModal = (entry: RipNgDistributeListInterface | null) => {
    setEditingDlIface(entry);
    setModalKey((k) => k + 1);
    setDlIfaceModalOpen(true);
  };

  const submitDlIface = async (entry: RipNgDistributeListInterface) => {
    if (editingDlIface) await ripNgService.updateDistributeListInterface(editingDlIface, entry);
    else await ripNgService.createDistributeListInterface(entry);
    await reload();
  };

  const openDelete = (kind: RipNgDeleteKind, name: string) => {
    setDeleteTarget({ kind, name });
    setModalKey((k) => k + 1);
    setDeleteOpen(true);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    await DELETE_ACTIONS[deleteTarget.kind](deleteTarget.name);
    if (isListKind(deleteTarget.kind)) setListError(deleteTarget.kind, null);
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
      await ripNgService.updateDistributeListGlobal(
        config.distribute_list.global_filters,
        dlGlobalDraft
      );
      await reload();
      setDlGlobalEditing(false);
    } catch (err) {
      setDlGlobalError((err as ApiError).message || t("errors.saveFiltersFailed"));
    } finally {
      setDlGlobalSaving(false);
    }
  };

  // ============================================================
  // Derived values
  // ============================================================

  // Every write control waits for any running commit (list, overview, global filter) and the re-read after it.
  const writeBusy = refreshing || listBusy !== null || overviewSaving || dlGlobalSaving;

  const networkCount = config?.networks.length ?? 0;
  const aggregateCount = config?.aggregate_addresses.length ?? 0;
  const ifaceCount = config?.interfaces.length ?? 0;
  const redistCount = config?.redistribute.length ?? 0;

  const metricRange = ripngRange(capabilities, "metric");
  const timerRange = ripngRange(capabilities, "timer");

  const splitHorizonLabel = (mode: string) =>
    mode === "disable" ? t("interfaceModal.disable") : t("interfaceModal.poisonReverse");

  // ============================================================
  // Render helpers
  // ============================================================

  const runListAction = async (kind: RipNgListKind, action: () => Promise<void>) => {
    if (listBusy) return;
    setListBusy(kind);
    try {
      await action();
    } finally {
      setListBusy(null);
    }
  };

  const renderListSection = (
    title: string,
    kind: RipNgListKind,
    items: string[],
    inputPlaceholder: string,
    isDropdown?: boolean,
  ) => {
    const inputId = `ripng-list-${kind}`;
    const inputValue = listDrafts[kind];
    const onInputChange = (v: string) => {
      setListDrafts((prev) => ({ ...prev, [kind]: v }));
      setListError(kind, null);
    };
    const err = listErrorsByKind[kind] ?? null;
    // Every section waits while any commit or the re-read after it runs; only the running one spins.
    const busy = writeBusy;
    const running = listBusy === kind;
    const add = () => {
      if (inputValue.trim() && !busy) runListAction(kind, () => addListItem(kind, items));
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
                noneOption={items.includes("default") ? undefined : { label: tc("shown.default"), value: "default" }}
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
                  onClick={() => openDelete("ripng", "")}
                  disabled={writeBusy}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  {t("header.deleteRipng")}
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

          {listErrors.length > 0 && (
            <div className="mb-4 p-3 rounded-md bg-destructive/10 text-destructive text-sm">
              {listErrors.map((message) => (
                <p key={message}>{message}</p>
              ))}
            </div>
          )}

          {/* Stats */}
          <div className="grid grid-cols-4 gap-4">
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
                  <div className="rounded-md p-2 bg-purple-500/10">
                    <GitMerge className="h-4 w-4 text-purple-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{aggregateCount}</p>
                    <p className="text-xs text-muted-foreground">{t("stats.aggregateAddresses")}</p>
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
                {networkCount > 0 && (
                  <Badge variant="secondary" className="ml-2">{networkCount}</Badge>
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
                    <Button size="sm" variant="outline" onClick={startEditOverview} disabled={writeBusy}>
                      <Pencil className="h-4 w-4 mr-2" />
                      {tc("edit")}
                    </Button>
                  ) : (
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={cancelEditOverview} disabled={overviewSaving}>{tc("cancel")}</Button>
                      <Button size="sm" onClick={saveOverview} disabled={overviewSaving || writeBusy}>
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
                      {/* Default Metric */}
                      <div className="space-y-2">
                        <Label htmlFor="ripng-default-metric">{t("overview.defaultMetric")}</Label>
                        <Input
                          id="ripng-default-metric"
                          type="number"
                          min={metricRange?.min}
                          max={metricRange?.max}
                          placeholder={metricRange ? `${metricRange.min}–${metricRange.max}` : ""}
                          value={overviewEditing ? ovDefaultMetric : (config?.default_metric ?? "")}
                          disabled={!overviewEditing || overviewSaving}
                          onChange={(e) => setOvDefaultMetric(e.target.value)}
                        />
                      </div>

                      {/* Route Map */}
                      <div className="space-y-2">
                        <Label htmlFor="ripng-route-map">{t("overview.routeMap")}</Label>
                        <NamedListSelect
                          id="ripng-route-map"
                          value={overviewEditing ? ovRouteMap : (config?.route_map ?? "")}
                          names={routeMapNames}
                          disabled={!overviewEditing || overviewSaving}
                          onValueChange={setOvRouteMap}
                        />
                      </div>

                      {/* Default Information Originate */}
                      <div className="flex items-center gap-3 rounded-lg border p-3">
                        <Checkbox
                          id="ripng-originate"
                          checked={overviewEditing ? ovOriginate : config?.default_information_originate}
                          disabled={!overviewEditing || overviewSaving}
                          onCheckedChange={(checked) => setOvOriginate(!!checked)}
                        />
                        <Label htmlFor="ripng-originate" className="cursor-pointer">
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
                        <Label htmlFor="ripng-update-interval">{t("overview.updateInterval")}</Label>
                        <Input
                          id="ripng-update-interval"
                          type="number"
                          min={timerRange?.min}
                          max={timerRange?.max}
                          placeholder="30"
                          value={overviewEditing ? ovTimerUpdate : (config?.timers.update ?? "")}
                          disabled={!overviewEditing || overviewSaving}
                          onChange={(e) => setOvTimerUpdate(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="ripng-timeout-interval">{t("overview.timeoutInterval")}</Label>
                        <Input
                          id="ripng-timeout-interval"
                          type="number"
                          min={timerRange?.min}
                          max={timerRange?.max}
                          placeholder="180"
                          value={overviewEditing ? ovTimerTimeout : (config?.timers.timeout ?? "")}
                          disabled={!overviewEditing || overviewSaving}
                          onChange={(e) => setOvTimerTimeout(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="ripng-gc-interval">{t("overview.garbageCollection")}</Label>
                        <Input
                          id="ripng-gc-interval"
                          type="number"
                          min={timerRange?.min}
                          max={timerRange?.max}
                          placeholder="120"
                          value={overviewEditing ? ovTimerGc : (config?.timers.garbage_collection ?? "")}
                          disabled={!overviewEditing || overviewSaving}
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
                  t("networks.ripngNetworks"),
                  "network",
                  config?.networks ?? [],
                  "2001:db8::/32"
                )}
                {renderListSection(
                  t("networks.aggregateAddresses"),
                  "aggregateAddress",
                  config?.aggregate_addresses ?? [],
                  "2001:db8::/48"
                )}
                {renderListSection(
                  t("networks.staticRoutes"),
                  "route",
                  config?.routes ?? [],
                  "2001:db8::/32"
                )}
                {renderListSection(
                  t("networks.passiveInterfaces"),
                  "passiveInterface",
                  config?.passive_interfaces ?? [],
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
                  <Button size="sm" onClick={() => openIfaceModal(null)} disabled={writeBusy}>
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
                      <Button size="sm" onClick={() => openIfaceModal(null)} disabled={writeBusy}>
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
                          <TableHead>{t("interfaces.splitHorizon")}</TableHead>
                          <TableHead className="text-right">{tc("actions")}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {config?.interfaces.map((iface) => (
                          <TableRow key={iface.name}>
                            <TableCell className="font-medium font-mono">{iface.name}</TableCell>
                            <TableCell>
                              {iface.split_horizon ? (
                                <Badge variant="outline">{splitHorizonLabel(iface.split_horizon)}</Badge>
                              ) : (
                                <span className="text-muted-foreground">—</span>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              {hasWritePermission && (
                                <div className="flex items-center justify-end gap-1">
                                  <Button
                                    variant="ghost" size="icon" className="h-8 w-8" aria-label={tc("edit")}
                                    disabled={writeBusy}
                                    onClick={() => openIfaceModal(iface)}
                                  >
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" aria-label={tc("delete")}
                                    disabled={writeBusy}
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
                  <Button size="sm" onClick={() => openRedistModal(null)} disabled={writeBusy}>
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
                      <Button size="sm" onClick={() => openRedistModal(null)} disabled={writeBusy}>
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
                                    disabled={writeBusy}
                                    onClick={() => openRedistModal(r)}
                                  >
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" aria-label={tc("delete")}
                                    disabled={writeBusy}
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
                <div>
                  <h2 className="text-base font-semibold mb-3">{t("filters.distributeLists")}</h2>

                  {/* Global Filters */}
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm font-medium text-muted-foreground">{t("filters.globalFilters")}</h3>
                      {hasWritePermission && (
                        !dlGlobalEditing ? (
                          <Button size="sm" variant="outline" onClick={startEditDlGlobal} disabled={writeBusy}>
                            <Pencil className="h-4 w-4 mr-2" />
                            {tc("edit")}
                          </Button>
                        ) : (
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline" onClick={cancelEditDlGlobal} disabled={dlGlobalSaving}>{tc("cancel")}</Button>
                            <Button size="sm" onClick={saveDlGlobal} disabled={dlGlobalSaving || writeBusy}>
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
                                <Label htmlFor={`ripng-dl-${field}`}>{label}</Label>
                                <NamedListSelect
                                  id={`ripng-dl-${field}`}
                                  value={currentVal}
                                  names={names}
                                  disabled={!dlGlobalEditing || dlGlobalSaving}
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
                        <Button size="sm" onClick={() => openDlIfaceModal(null)} disabled={writeBusy}>
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
                                          disabled={writeBusy}
                                          onClick={() => openDlIfaceModal(f)}
                                        >
                                          <Pencil className="h-4 w-4" />
                                        </Button>
                                        <Button
                                          variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" aria-label={tc("delete")}
                                          disabled={writeBusy}
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
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Modals */}
      <RipngInterfaceModal
        key={`iface-${modalKey}`}
        open={ifaceModalOpen}
        onOpenChange={setIfaceModalOpen}
        existingInterface={editingIface}
        configuredInterfaces={config?.interfaces.map((i) => i.name) ?? []}
        onSubmit={submitIface}
      />

      <RipngRedistributeModal
        key={`redist-${modalKey}`}
        open={redistModalOpen}
        onOpenChange={setRedistModalOpen}
        existingEntry={editingRedist}
        existingProtocols={config?.redistribute.map((r) => r.protocol) ?? []}
        routeMapNames={routeMapNames}
        protocols={capabilities?.features.redistribute.protocols || []}
        capabilities={capabilities}
        onSubmit={submitRedist}
      />

      <RipngDistributeListInterfaceModal
        key={`dl-${modalKey}`}
        open={dlIfaceModalOpen}
        onOpenChange={setDlIfaceModalOpen}
        existingEntry={editingDlIface}
        existingInterfaces={config?.distribute_list.interface_filters.map((f) => f.interface) ?? []}
        accessListNames={accessListNames}
        prefixListNames={prefixListNames}
        onSubmit={submitDlIface}
      />

      <DeleteRipngModal
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
