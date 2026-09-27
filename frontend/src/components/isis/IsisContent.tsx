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
  Network,
  Plus,
  RefreshCw,
  Pencil,
  Trash2,
  ArrowLeftRight,
  Save,
  Loader2,
  Search,
  X,
  AlertCircle,
  Settings2,
  Shield,
  Zap,
} from "lucide-react";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { isisService, IsisConfig, IsisCapabilities, IsisInterface, IsisRedistributeEntry, IsisDefaultInfoEntry } from "@/lib/api/isis";
import {
  isisLspRefreshMinSeconds,
  isisSrv6Supported,
  isisTeExportSupported,
} from "@/lib/isis-feature-flags";
import { routeMapService } from "@/lib/api/route-map";
import { IsisInterfaceModal } from "./IsisInterfaceModal";
import { IsisRedistributeModal } from "./IsisRedistributeModal";
import { IsisDefaultInfoModal } from "./IsisDefaultInfoModal";
import { usePermissions } from "@/hooks/usePermissions";
import { FeatureGroup } from "@/lib/api/user-management";
import { useTranslations } from "next-intl";

// ============================================================================
// Helpers
// ============================================================================

function levelBadge(level: string | null, autoLabel: string) {
  if (!level) return <span className="text-muted-foreground text-sm">{autoLabel}</span>;
  const map: Record<string, string> = {
    "level-1": "L1",
    "level-2": "L2",
    "level-1-2": "L1-2",
  };
  return <Badge variant="outline">{map[level] ?? level}</Badge>;
}

// ============================================================================
// Main Component
// ============================================================================

export function IsisContent() {
  const t = useTranslations("isis");
  const tc = useTranslations("common");
  const { canWrite } = usePermissions();
  const hasWritePermission = canWrite(FeatureGroup.ISIS);

  const [config, setConfig] = useState<IsisConfig | null>(null);
  const [capabilities, setCapabilities] = useState<IsisCapabilities | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("overview");

  const [routeMapNames, setRouteMapNames] = useState<string[]>([]);
  const [ifaceSearch, setIfaceSearch] = useState("");

  // Interface modal
  const [ifaceModalOpen, setIfaceModalOpen] = useState(false);
  const [editingIface, setEditingIface] = useState<IsisInterface | null>(null);
  const [deletingIface, setDeletingIface] = useState<IsisInterface | null>(null);

  // Redistribute modal
  const [redistModalOpen, setRedistModalOpen] = useState(false);
  const [deletingRedist, setDeletingRedist] = useState<IsisRedistributeEntry | null>(null);
  const [defaultInfoModalOpen, setDefaultInfoModalOpen] = useState(false);
  const [deletingDefaultInfo, setDeletingDefaultInfo] = useState<IsisDefaultInfoEntry | null>(null);
  const [tbType, setTbType] = useState("downstream");
  const [tbIndex, setTbIndex] = useState("1");
  const [tbLevel, setTbLevel] = useState("level-1");
  const [plName, setPlName] = useState("");
  const [plLevel, setPlLevel] = useState("level-1");

  // Overview editing state
  const [overviewEditing, setOverviewEditing] = useState(false);
  const [overviewSaving, setOverviewSaving] = useState(false);
  const [overviewError, setOverviewError] = useState<string | null>(null);
  // Overview form fields
  const [nets, setNets] = useState<string[]>([]);
  const [netInput, setNetInput] = useState("");
  const [level, setLevel] = useState("");
  const [metricStyle, setMetricStyle] = useState("");
  const [dynamicHostname, setDynamicHostname] = useState(false);
  const [purgeOriginator, setPurgeOriginator] = useState(false);
  const [advertisePassiveOnly, setAdvertisePassiveOnly] = useState(false);
  const [advertiseHighMetrics, setAdvertiseHighMetrics] = useState(false);
  const [setAttachedBit, setSetAttachedBit] = useState(false);
  const [setOverloadBit, setSetOverloadBit] = useState(false);
  const [logAdjChanges, setLogAdjChanges] = useState(false);

  // Advanced timers editing
  const [advancedEditing, setAdvancedEditing] = useState(false);
  const [advancedSaving, setAdvancedSaving] = useState(false);
  const [advancedError, setAdvancedError] = useState<string | null>(null);
  const [lspMtu, setLspMtu] = useState("");
  const [lspGenInterval, setLspGenInterval] = useState("");
  const [lspRefreshInterval, setLspRefreshInterval] = useState("");
  const [maxLspLifetime, setMaxLspLifetime] = useState("");
  const [spfInterval, setSpfInterval] = useState("");
  const [ldpSyncHolddown, setLdpSyncHolddown] = useState("");

  // SPF delay IETF editing
  const [spfDelayEditing, setSpfDelayEditing] = useState(false);
  const [spfDelaySaving, setSpfDelaySaving] = useState(false);
  const [spfDelayError, setSpfDelayError] = useState<string | null>(null);
  const [spfInitDelay, setSpfInitDelay] = useState("");
  const [spfShortDelay, setSpfShortDelay] = useState("");
  const [spfLongDelay, setSpfLongDelay] = useState("");
  const [spfHolddown, setSpfHolddown] = useState("");
  const [spfTimeToLearn, setSpfTimeToLearn] = useState("");

  // -------------------------------------------------------------------------
  // Load data
  // -------------------------------------------------------------------------

  const loadData = useCallback(async (refresh = false) => {
    try {
      setLoading(true);
      setError(null);
      const [configData, capsData] = await Promise.all([
        isisService.getConfig(refresh),
        isisService.getCapabilities(),
      ]);
      setConfig(configData);
      setCapabilities(capsData);
      const rmNames = await routeMapService
        .getConfig()
        .then((c) => c.route_maps.map((rm) => rm.name))
        .catch(() => []);
      setRouteMapNames(rmNames);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("page.loadFailed"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // -------------------------------------------------------------------------
  // Overview edit handlers
  // -------------------------------------------------------------------------

  const startEditOverview = () => {
    if (!config) return;
    const g = config.global_config;
    setNets([...g.net]);
    setNetInput("");
    setLevel(g.level || "");
    setMetricStyle(g.metric_style || "");
    setDynamicHostname(g.dynamic_hostname);
    setPurgeOriginator(g.purge_originator);
    setAdvertisePassiveOnly(g.advertise_passive_only);
    setAdvertiseHighMetrics(g.advertise_high_metrics);
    setSetAttachedBit(g.set_attached_bit);
    setSetOverloadBit(g.set_overload_bit);
    setLogAdjChanges(g.log_adjacency_changes);
    setOverviewEditing(true);
    setOverviewError(null);
  };

  const cancelEditOverview = () => {
    setOverviewEditing(false);
    setOverviewError(null);
  };

  const addNet = () => {
    const v = netInput.trim();
    if (!v || nets.includes(v)) return;
    setNets([...nets, v]);
    setNetInput("");
  };

  const removeNet = (net: string) => {
    setNets(nets.filter((n) => n !== net));
  };

  const saveOverview = async () => {
    if (!config) return;
    try {
      setOverviewSaving(true);
      setOverviewError(null);
      await isisService.updateGlobalConfig(config.global_config, {
        net: nets,
        level: level || null,
        metric_style: metricStyle || null,
        dynamic_hostname: dynamicHostname,
        purge_originator: purgeOriginator,
        advertise_passive_only: advertisePassiveOnly,
        advertise_high_metrics: advertiseHighMetrics,
        set_attached_bit: setAttachedBit,
        set_overload_bit: setOverloadBit,
        log_adjacency_changes: logAdjChanges,
        lsp_mtu: "",
        lsp_gen_interval: "",
        lsp_refresh_interval: "",
        max_lsp_lifetime: "",
        spf_interval: "",
        ldp_sync_holddown: "",
      });
      await loadData(true);
      setOverviewEditing(false);
    } catch (err) {
      setOverviewError(err instanceof Error ? err.message : t("page.saveConfigFailed"));
    } finally {
      setOverviewSaving(false);
    }
  };

  // -------------------------------------------------------------------------
  // Advanced timers handlers
  // -------------------------------------------------------------------------

  const startEditAdvanced = () => {
    if (!config) return;
    const g = config.global_config;
    setLspMtu(g.lsp_mtu != null ? String(g.lsp_mtu) : "");
    setLspGenInterval(g.lsp_gen_interval != null ? String(g.lsp_gen_interval) : "");
    setLspRefreshInterval(g.lsp_refresh_interval != null ? String(g.lsp_refresh_interval) : "");
    setMaxLspLifetime(g.max_lsp_lifetime != null ? String(g.max_lsp_lifetime) : "");
    setSpfInterval(g.spf_interval != null ? String(g.spf_interval) : "");
    setLdpSyncHolddown(g.ldp_sync_holddown != null ? String(g.ldp_sync_holddown) : "");
    setAdvancedEditing(true);
    setAdvancedError(null);
  };

  const saveAdvanced = async () => {
    if (!config) return;
    try {
      setAdvancedSaving(true);
      setAdvancedError(null);
      await isisService.updateGlobalConfig(config.global_config, {
        net: config.global_config.net,
        level: config.global_config.level,
        metric_style: config.global_config.metric_style,
        dynamic_hostname: config.global_config.dynamic_hostname,
        purge_originator: config.global_config.purge_originator,
        advertise_passive_only: config.global_config.advertise_passive_only,
        advertise_high_metrics: config.global_config.advertise_high_metrics,
        set_attached_bit: config.global_config.set_attached_bit,
        set_overload_bit: config.global_config.set_overload_bit,
        log_adjacency_changes: config.global_config.log_adjacency_changes,
        lsp_mtu: lspMtu,
        lsp_gen_interval: lspGenInterval,
        lsp_refresh_interval: lspRefreshInterval,
        max_lsp_lifetime: maxLspLifetime,
        spf_interval: spfInterval,
        ldp_sync_holddown: ldpSyncHolddown,
      });
      await loadData(true);
      setAdvancedEditing(false);
    } catch (err) {
      setAdvancedError(err instanceof Error ? err.message : t("page.saveTimersFailed"));
    } finally {
      setAdvancedSaving(false);
    }
  };

  // -------------------------------------------------------------------------
  // SPF Delay IETF handlers
  // -------------------------------------------------------------------------

  const startEditSpfDelay = () => {
    if (!config) return;
    const d = config.global_config.spf_delay_ietf;
    setSpfInitDelay(d.init_delay != null ? String(d.init_delay) : "");
    setSpfShortDelay(d.short_delay != null ? String(d.short_delay) : "");
    setSpfLongDelay(d.long_delay != null ? String(d.long_delay) : "");
    setSpfHolddown(d.holddown != null ? String(d.holddown) : "");
    setSpfTimeToLearn(d.time_to_learn != null ? String(d.time_to_learn) : "");
    setSpfDelayEditing(true);
    setSpfDelayError(null);
  };

  const saveSpfDelay = async () => {
    if (!config) return;
    try {
      setSpfDelaySaving(true);
      setSpfDelayError(null);
      await isisService.updateSpfDelayIetf(config.global_config.spf_delay_ietf, {
        init_delay: spfInitDelay,
        short_delay: spfShortDelay,
        long_delay: spfLongDelay,
        holddown: spfHolddown,
        time_to_learn: spfTimeToLearn,
      });
      await loadData(true);
      setSpfDelayEditing(false);
    } catch (err) {
      setSpfDelayError(err instanceof Error ? err.message : t("page.saveSpfDelayFailed"));
    } finally {
      setSpfDelaySaving(false);
    }
  };

  // -------------------------------------------------------------------------
  // Interface handlers
  // -------------------------------------------------------------------------

  const handleCreateInterface = async (iface: IsisInterface) => {
    await isisService.createInterface(iface);
    await loadData(true);
  };

  const handleUpdateInterface = async (iface: IsisInterface) => {
    if (!editingIface) return;
    await isisService.updateInterface(editingIface, iface);
    setEditingIface(null);
    await loadData(true);
  };

  const handleDeleteInterface = async () => {
    if (!deletingIface) return;
    await isisService.deleteInterface(deletingIface.name);
    setDeletingIface(null);
    await loadData(true);
  };

  // -------------------------------------------------------------------------
  // Redistribute handlers
  // -------------------------------------------------------------------------

  const handleAddRedistribute = async (entry: IsisRedistributeEntry) => {
    await isisService.addRedistribute(entry);
    await loadData(true);
  };

  const handleDeleteRedistribute = async () => {
    if (!deletingRedist) return;
    await isisService.deleteRedistribute(deletingRedist);
    setDeletingRedist(null);
    await loadData(true);
  };

  const handleAddDefaultInfo = async (entry: IsisDefaultInfoEntry) => {
    await isisService.addDefaultInfo(entry);
    await loadData(true);
  };

  const handleDeleteDefaultInfo = async () => {
    if (!deletingDefaultInfo) return;
    await isisService.deleteDefaultInfo(deletingDefaultInfo);
    setDeletingDefaultInfo(null);
    await loadData(true);
  };

  // -------------------------------------------------------------------------
  // Derived data
  // -------------------------------------------------------------------------

  const filteredIfaces =
    config?.interfaces.filter(
      (i) => !ifaceSearch || i.name.toLowerCase().includes(ifaceSearch.toLowerCase())
    ) ?? [];

  const existingRedistKeys = [
    ...(config?.redistribute_ipv4 ?? []).map((r) => `ipv4|${r.protocol}|${r.level}`),
    ...(config?.redistribute_ipv6 ?? []).map((r) => `ipv6|${r.protocol}|${r.level}`),
  ];
  const existingDefaultInfoKeys = [
    ...(config?.default_info_ipv4 ?? []).map((e) => `ipv4|${e.level}`),
    ...(config?.default_info_ipv6 ?? []).map((e) => `ipv6|${e.level}`),
  ];
  const allRedist = [
    ...(config?.redistribute_ipv4 ?? []).map((r) => ({ ...r, family: "ipv4" as const })),
    ...(config?.redistribute_ipv6 ?? []).map((r) => ({ ...r, family: "ipv6" as const })),
  ];
  const allDefaultInfo = [
    ...(config?.default_info_ipv4 ?? []).map((e) => ({ ...e, family: "ipv4" as const })),
    ...(config?.default_info_ipv6 ?? []).map((e) => ({ ...e, family: "ipv6" as const })),
  ];

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

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

  const g = config?.global_config;
  const ifaceCount = config?.interfaces.length ?? 0;
  const redistCount = allRedist.length;
  const netCount = g?.net.length ?? 0;

  return (
    <>
      <div className="flex flex-col h-full">
        {/* ================================================================ */}
        {/* Header                                                           */}
        {/* ================================================================ */}
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
            <div className="mb-4 p-3 rounded-md bg-destructive/10 text-destructive text-sm flex items-start gap-2">
              <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
              {error}
            </div>
          )}

          {/* Stats */}
          <div className="grid grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-md p-2 bg-primary/10">
                    <Settings2 className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">{t("fields.level")}</p>
                    <div className="mt-0.5">{levelBadge(g?.level ?? null, t("values.auto"))}</div>
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
                    <Shield className="h-4 w-4 text-orange-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{netCount}</p>
                    <p className="text-xs text-muted-foreground">{t("stats.nets", { count: netCount })}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* ================================================================ */}
        {/* Tabs                                                             */}
        {/* ================================================================ */}
        <div className="flex-1 p-6 pt-4 overflow-auto">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-4">
              <TabsTrigger value="overview">{t("tabs.overview")}</TabsTrigger>
              <TabsTrigger value="interfaces">
                {t("tabs.interfaces")}
                {ifaceCount > 0 && <Badge variant="secondary" className="ml-2">{ifaceCount}</Badge>}
              </TabsTrigger>
              <TabsTrigger value="redistribute">
                {t("tabs.redistribute")}
                {redistCount > 0 && <Badge variant="secondary" className="ml-2">{redistCount}</Badge>}
              </TabsTrigger>
              <TabsTrigger value="advanced">{t("tabs.advanced")}</TabsTrigger>
            </TabsList>

            {/* ============================================================ */}
            {/* Overview Tab                                                  */}
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
                      {t("overview.editSettings")}
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
                <div className="mb-4 p-3 rounded-md bg-destructive/10 text-destructive text-sm flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <pre className="whitespace-pre-wrap font-sans">{overviewError}</pre>
                </div>
              )}

              <div className="grid grid-cols-2 gap-6">
                {/* Global Settings Card */}
                <Card>
                  <CardContent className="p-6">
                    <h3 className="font-semibold mb-4">{t("overview.globalSettings")}</h3>
                    <div className="space-y-4">
                      {/* NET Addresses */}
                      <div className="space-y-2">
                        <Label className="text-sm">{t("overview.netAddresses")}</Label>
                        <div className="flex flex-wrap gap-1 min-h-[36px] p-2 rounded-md border border-input bg-background">
                          {(overviewEditing ? nets : (g?.net ?? [])).map((net) => (
                            <span
                              key={net}
                              className="flex items-center gap-1 bg-accent text-accent-foreground text-xs px-2 py-0.5 rounded-md font-mono"
                            >
                              {net}
                              {overviewEditing && (
                                <button
                                  onClick={() => removeNet(net)}
                                  className="hover:text-destructive ml-1"
                                >
                                  <X className="h-3 w-3" />
                                </button>
                              )}
                            </span>
                          ))}
                          {(overviewEditing ? nets : (g?.net ?? [])).length === 0 && (
                            <span className="text-muted-foreground text-xs">{t("overview.noNet")}</span>
                          )}
                        </div>
                        {overviewEditing && (
                          <div className="flex gap-2">
                            <Input
                              value={netInput}
                              onChange={(e) => setNetInput(e.target.value)}
                              onKeyDown={(e) => e.key === "Enter" && addNet()}
                              placeholder={t("overview.netPlaceholder")}
                              className="font-mono text-sm h-8"
                            />
                            <Button size="sm" variant="outline" onClick={addNet}>
                              <Plus className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        )}
                      </div>

                      {/* Level */}
                      <div className="space-y-2">
                        <Label className="text-sm">{t("fields.isisLevel")}</Label>
                        {overviewEditing ? (
                          <Select value={level} onValueChange={setLevel}>
                            <SelectTrigger>
                              <SelectValue placeholder={t("overview.levelPlaceholder")} />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="level-1">{t("fields.level1Only")}</SelectItem>
                              <SelectItem value="level-2">{t("fields.level2Only")}</SelectItem>
                              <SelectItem value="level-1-2">{t("fields.level1And2")}</SelectItem>
                            </SelectContent>
                          </Select>
                        ) : (
                          <div className="h-9 flex items-center">
                            {levelBadge(g?.level ?? null, t("values.auto"))}
                          </div>
                        )}
                      </div>

                      {/* Metric Style */}
                      <div className="space-y-2">
                        <Label className="text-sm">{t("overview.metricStyle")}</Label>
                        {overviewEditing ? (
                          <Select value={metricStyle} onValueChange={setMetricStyle}>
                            <SelectTrigger>
                              <SelectValue placeholder={t("overview.metricStylePlaceholder")} />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="narrow">{t("overview.narrow")}</SelectItem>
                              <SelectItem value="transition">{t("overview.transition")}</SelectItem>
                              <SelectItem value="wide">{t("overview.wide")}</SelectItem>
                            </SelectContent>
                          </Select>
                        ) : (
                          <div className="h-9 flex items-center">
                            {g?.metric_style ? (
                              <Badge variant="outline">{g.metric_style}</Badge>
                            ) : (
                              <span className="text-sm text-muted-foreground">{t("overview.narrowDefault")}</span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Options Card */}
                <Card>
                  <CardContent className="p-6">
                    <h3 className="font-semibold mb-4">{t("overview.options")}</h3>
                    <div className="space-y-3">
                      {[
                        { id: "dynamic-hostname", label: t("overview.dynamicHostname"), field: "dynamic_hostname" as const, value: dynamicHostname, setter: setDynamicHostname },
                        { id: "log-adj", label: t("overview.logAdjacencyChanges"), field: "log_adjacency_changes" as const, value: logAdjChanges, setter: setLogAdjChanges },
                        { id: "purge-orig", label: t("overview.purgeOriginator"), field: "purge_originator" as const, value: purgeOriginator, setter: setPurgeOriginator },
                        { id: "adv-passive", label: t("overview.advertisePassiveOnly"), field: "advertise_passive_only" as const, value: advertisePassiveOnly, setter: setAdvertisePassiveOnly },
                        { id: "adv-high-metrics", label: t("overview.advertiseHighMetrics"), field: "advertise_high_metrics" as const, value: advertiseHighMetrics, setter: setAdvertiseHighMetrics },
                        { id: "attached-bit", label: t("overview.setAttachedBit"), field: "set_attached_bit" as const, value: setAttachedBit, setter: setSetAttachedBit },
                        { id: "overload-bit", label: t("overview.setOverloadBit"), field: "set_overload_bit" as const, value: setOverloadBit, setter: setSetOverloadBit },
                      ].map(({ id, label, field, value, setter }) => (
                        <div key={id} className="flex items-center gap-3">
                          <Checkbox
                            id={id}
                            checked={overviewEditing ? value : (g?.[field] ?? false)}
                            disabled={!overviewEditing}
                            onCheckedChange={(c) => setter(!!c)}
                          />
                          <Label htmlFor={id} className="text-sm font-normal">{label}</Label>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Default Information Card */}
                <Card className="col-span-2">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-semibold">{t("overview.defaultInformation")}</h3>
                      {hasWritePermission && (
                        <Button size="sm" variant="outline" onClick={() => setDefaultInfoModalOpen(true)}>
                          <Plus className="h-4 w-4 mr-2" />
                          {tc("add")}
                        </Button>
                      )}
                    </div>
                    {allDefaultInfo.length === 0 ? (
                      <p className="text-sm text-muted-foreground">{t("overview.noneConfigured")}</p>
                    ) : (
                      <div className="space-y-2">
                        {allDefaultInfo.map((entry) => (
                          <div
                            key={`${entry.family}-${entry.level}`}
                            className="flex items-center gap-3 p-2 rounded-md bg-muted/50 text-sm"
                          >
                            <Badge variant="outline">{entry.family}</Badge>
                            <Badge variant="outline">{entry.level}</Badge>
                            {entry.always && <Badge variant="secondary">always</Badge>}
                            {entry.metric != null && (
                              <span className="text-muted-foreground">{t("values.metric", { metric: String(entry.metric) })}</span>
                            )}
                            {entry.route_map && (
                              <span className="text-muted-foreground">{t("values.routeMap", { name: entry.route_map })}</span>
                            )}
                            {hasWritePermission && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 ml-auto text-destructive hover:text-destructive"
                                onClick={() => setDeletingDefaultInfo(entry)}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* ============================================================ */}
            {/* Interfaces Tab                                               */}
            {/* ============================================================ */}
            <TabsContent value="interfaces">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <p className="text-sm text-muted-foreground">{t("interfaces.description")}</p>
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
                          <TableHead>{t("fields.circuitType")}</TableHead>
                          <TableHead>{t("fields.metric")}</TableHead>
                          <TableHead>{t("interfaces.flags")}</TableHead>
                          <TableHead>BFD</TableHead>
                          <TableHead>LFA</TableHead>
                          {hasWritePermission && <TableHead className="text-right">{tc("actions")}</TableHead>}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredIfaces.map((iface) => (
                          <TableRow key={iface.name}>
                            <TableCell className="font-medium font-mono">{iface.name}</TableCell>
                            <TableCell>
                              {iface.circuit_type ? (
                                <Badge variant="outline">{iface.circuit_type}</Badge>
                              ) : (
                                <span className="text-muted-foreground text-sm">{t("values.inherit")}</span>
                              )}
                            </TableCell>
                            <TableCell>
                              {iface.metric != null ? (
                                <span className="font-mono text-sm">{iface.metric}</span>
                              ) : (
                                <span className="text-muted-foreground text-sm">{t("values.default")}</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-wrap gap-1">
                                {iface.passive && <Badge variant="secondary" className="text-xs">passive</Badge>}
                                {iface.point_to_point && <Badge variant="secondary" className="text-xs">p2p</Badge>}
                                {!iface.passive && !iface.point_to_point && (
                                  <span className="text-muted-foreground text-sm">—</span>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              {iface.bfd ? (
                                <Badge variant="secondary" className="text-xs">{t("values.yes")}</Badge>
                              ) : (
                                <span className="text-muted-foreground text-sm">{t("values.no")}</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-1">
                                {(iface.lfa.level1_enabled || iface.lfa.level2_enabled) && (
                                  <Badge variant="outline" className="text-xs">LFA</Badge>
                                )}
                                {(iface.ti_lfa.level1_enabled || iface.ti_lfa.level2_enabled) && (
                                  <Badge variant="outline" className="text-xs text-primary border-primary/30">TI-LFA</Badge>
                                )}
                                {!(iface.lfa.level1_enabled || iface.lfa.level2_enabled || iface.ti_lfa.level1_enabled || iface.ti_lfa.level2_enabled) && (
                                  <span className="text-muted-foreground text-sm">—</span>
                                )}
                              </div>
                            </TableCell>
                            {hasWritePermission && (
                              <TableCell className="text-right">
                                <div className="flex items-center justify-end gap-1">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8"
                                    onClick={() => { setEditingIface(iface); setIfaceModalOpen(true); }}
                                  >
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-destructive hover:text-destructive"
                                    onClick={() => setDeletingIface(iface)}
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
            {/* Redistribute Tab                                             */}
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
                          <TableHead>{t("redistribute.family")}</TableHead>
                          <TableHead>{t("fields.protocol")}</TableHead>
                          <TableHead>{t("fields.level")}</TableHead>
                          <TableHead>{t("fields.metric")}</TableHead>
                          <TableHead>{t("fields.routeMap")}</TableHead>
                          {hasWritePermission && <TableHead className="text-right">{tc("actions")}</TableHead>}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {allRedist.map((entry) => (
                          <TableRow key={`${entry.family}-${entry.protocol}-${entry.level}`}>
                            <TableCell>
                              <Badge variant="outline">{entry.family}</Badge>
                            </TableCell>
                            <TableCell className="font-medium">{entry.protocol}</TableCell>
                            <TableCell>
                              <Badge variant="outline">{entry.level}</Badge>
                            </TableCell>
                            <TableCell>
                              {entry.metric != null ? (
                                <span className="font-mono text-sm">{entry.metric}</span>
                              ) : (
                                <span className="text-muted-foreground text-sm">{t("values.default")}</span>
                              )}
                            </TableCell>
                            <TableCell>
                              {entry.route_map ? (
                                <Badge variant="secondary">{entry.route_map}</Badge>
                              ) : (
                                <span className="text-muted-foreground text-sm">—</span>
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
            {/* Advanced Tab                                                 */}
            {/* ============================================================ */}
            <TabsContent value="advanced">
              <p className="text-sm text-muted-foreground mb-4">
                {t("advanced.description")}
              </p>

              <div className="grid grid-cols-2 gap-6">
                {/* LSP Timers */}
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-semibold">{t("advanced.lspTimers")}</h3>
                      {hasWritePermission && (
                        !advancedEditing ? (
                          <Button size="sm" variant="ghost" className="h-7 px-2" onClick={startEditAdvanced}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                        ) : (
                          <div className="flex gap-1">
                            <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => { setAdvancedEditing(false); setAdvancedError(null); }}>
                              <X className="h-3.5 w-3.5" />
                            </Button>
                            <Button size="sm" className="h-7 px-2" onClick={saveAdvanced} disabled={advancedSaving}>
                              {advancedSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                            </Button>
                          </div>
                        )
                      )}
                    </div>

                    {advancedError && (
                      <div className="mb-3 p-2 rounded-md bg-destructive/10 text-destructive text-xs flex items-start gap-2">
                        <AlertCircle className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
                        <pre className="whitespace-pre-wrap font-sans">{advancedError}</pre>
                      </div>
                    )}

                    <div className="space-y-4">
                      {[
                        { label: t("advanced.lspMtu"), key: "lsp_mtu" as const, value: lspMtu, setter: setLspMtu, placeholder: t("fields.defaultValue", { value: "1497" }), min: 128, max: 4352, cur: g?.lsp_mtu },
                        { label: t("advanced.lspGenInterval"), key: "lsp_gen_interval" as const, value: lspGenInterval, setter: setLspGenInterval, placeholder: tc("default"), min: 1, max: 120, cur: g?.lsp_gen_interval },
                        { label: t("advanced.lspRefreshInterval"), key: "lsp_refresh_interval" as const, value: lspRefreshInterval, setter: setLspRefreshInterval, placeholder: t("fields.defaultValue", { value: "900" }), min: isisLspRefreshMinSeconds(capabilities?.features), max: 65235, cur: g?.lsp_refresh_interval },
                        { label: t("advanced.maxLspLifetime"), key: "max_lsp_lifetime" as const, value: maxLspLifetime, setter: setMaxLspLifetime, placeholder: t("fields.defaultValue", { value: "1200" }), min: 350, max: 65535, cur: g?.max_lsp_lifetime },
                        { label: t("advanced.spfInterval"), key: "spf_interval" as const, value: spfInterval, setter: setSpfInterval, placeholder: tc("default"), min: 1, max: 120000, cur: g?.spf_interval },
                        { label: t("fields.ldpSyncHolddown"), key: "ldp_sync_holddown" as const, value: ldpSyncHolddown, setter: setLdpSyncHolddown, placeholder: tc("disabled"), min: 1, max: 10000, cur: g?.ldp_sync_holddown },
                      ].map(({ label, value, setter, placeholder, min, max, cur }) => (
                        <div key={label} className="space-y-1">
                          <Label className="text-sm">{label}</Label>
                          <Input
                            type="number"
                            value={advancedEditing ? value : (cur != null ? String(cur) : "")}
                            disabled={!advancedEditing}
                            onChange={(e) => setter(e.target.value)}
                            placeholder={placeholder}
                            min={min}
                            max={max}
                          />
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* SPF Delay IETF */}
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">{t("advanced.spfDelayIetf")}</h3>
                        <Zap className="h-4 w-4 text-muted-foreground" />
                      </div>
                      {hasWritePermission && (
                        !spfDelayEditing ? (
                          <Button size="sm" variant="ghost" className="h-7 px-2" onClick={startEditSpfDelay}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                        ) : (
                          <div className="flex gap-1">
                            <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => setSpfDelayEditing(false)}>
                              <X className="h-3.5 w-3.5" />
                            </Button>
                            <Button size="sm" className="h-7 px-2" onClick={saveSpfDelay} disabled={spfDelaySaving}>
                              {spfDelaySaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                            </Button>
                          </div>
                        )
                      )}
                    </div>

                    {spfDelayError && (
                      <div className="mb-3 p-2 rounded-md bg-destructive/10 text-destructive text-xs">
                        {spfDelayError}
                      </div>
                    )}

                    <div className="space-y-3">
                      {[
                        { label: t("advanced.initDelay"), value: spfInitDelay, setter: setSpfInitDelay, cur: g?.spf_delay_ietf.init_delay },
                        { label: t("advanced.shortDelay"), value: spfShortDelay, setter: setSpfShortDelay, cur: g?.spf_delay_ietf.short_delay },
                        { label: t("advanced.longDelay"), value: spfLongDelay, setter: setSpfLongDelay, cur: g?.spf_delay_ietf.long_delay },
                        { label: t("advanced.holddown"), value: spfHolddown, setter: setSpfHolddown, cur: g?.spf_delay_ietf.holddown },
                        { label: t("advanced.timeToLearn"), value: spfTimeToLearn, setter: setSpfTimeToLearn, cur: g?.spf_delay_ietf.time_to_learn },
                      ].map(({ label, value, setter, cur }) => (
                        <div key={label} className="space-y-1">
                          <Label className="text-xs text-muted-foreground">{label}</Label>
                          <Input
                            type="number"
                            value={spfDelayEditing ? value : (cur != null ? String(cur) : "")}
                            disabled={!spfDelayEditing}
                            onChange={(e) => setter(e.target.value)}
                            placeholder={tc("notSet")}
                            min={0}
                            className="h-8 text-sm"
                          />
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Segment Routing */}
                {capabilities?.features.segment_routing.supported && (
                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center gap-2 mb-4">
                        <h3 className="font-semibold">{t("advanced.segmentRouting")}</h3>
                      </div>
                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-3 text-sm">
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">{t("advanced.srgbLow")}</p>
                            <p className="font-mono">{config?.segment_routing.global_block_low ?? <span className="text-muted-foreground">{t("values.default")}</span>}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">{t("advanced.srgbHigh")}</p>
                            <p className="font-mono">{config?.segment_routing.global_block_high ?? <span className="text-muted-foreground">{t("values.default")}</span>}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">{t("advanced.srlbLow")}</p>
                            <p className="font-mono">{config?.segment_routing.local_block_low ?? <span className="text-muted-foreground">{t("values.default")}</span>}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">{t("advanced.srlbHigh")}</p>
                            <p className="font-mono">{config?.segment_routing.local_block_high ?? <span className="text-muted-foreground">{t("values.default")}</span>}</p>
                          </div>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">{t("advanced.prefixSids")}</p>
                          <p className="text-sm">{t("advanced.prefixSidsConfigured", { count: String(config?.segment_routing.prefixes.length ?? 0) })}</p>
                        </div>
                        {isisSrv6Supported(capabilities?.features) && config?.segment_routing.srv6_locator && (
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">{t("advanced.srv6Locator")}</p>
                            <Badge variant="secondary" className="font-mono">{config.segment_routing.srv6_locator}</Badge>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Fast Reroute LFA */}
                {capabilities?.features.lfa_priority_limit?.supported && (
                  <Card className="col-span-2">
                    <CardContent className="p-6 space-y-4">
                      <h3 className="font-semibold">{t("advanced.fastRerouteLfa")}</h3>
                      <div className="flex flex-wrap gap-4">
                        <div className="flex items-center gap-2">
                          <Checkbox
                            id="lfa-ls-l1"
                            checked={!!config?.fast_reroute.lfa_load_sharing_disable_level1}
                            disabled={!hasWritePermission}
                            onCheckedChange={async (v) => {
                              await isisService.setFrrLoadSharingDisable("level-1", !!v);
                              await loadData(true);
                            }}
                          />
                          <Label htmlFor="lfa-ls-l1">{t("advanced.disableLoadSharingL1")}</Label>
                        </div>
                        <div className="flex items-center gap-2">
                          <Checkbox
                            id="lfa-ls-l2"
                            checked={!!config?.fast_reroute.lfa_load_sharing_disable_level2}
                            disabled={!hasWritePermission}
                            onCheckedChange={async (v) => {
                              await isisService.setFrrLoadSharingDisable("level-2", !!v);
                              await loadData(true);
                            }}
                          />
                          <Label htmlFor="lfa-ls-l2">{t("advanced.disableLoadSharingL2")}</Label>
                        </div>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-2">{t("advanced.priorityLimit")}</p>
                        <div className="flex flex-wrap gap-1 mb-2">
                          {(config?.fast_reroute.lfa_priority_limit ?? []).map((e) => (
                            <Badge
                              key={`${e.priority}-${e.level}`}
                              variant="secondary"
                              className="cursor-pointer"
                              onClick={() => hasWritePermission && isisService.deleteFrrPriorityLimit(e.priority, e.level).then(() => loadData(true))}
                            >
                              {e.priority} {e.level} ×
                            </Badge>
                          ))}
                        </div>
                        {hasWritePermission && (
                          <div className="flex gap-2">
                            {(capabilities.features.lfa_priority_limit.values ?? ["critical", "high", "medium"]).map((p) => (
                              <Button
                                key={p}
                                size="sm"
                                variant="outline"
                                onClick={() => isisService.addFrrPriorityLimit(p, "level-1").then(() => loadData(true))}
                              >
                                {p} L1
                              </Button>
                            ))}
                            {(capabilities.features.lfa_priority_limit.values ?? ["critical", "high", "medium"]).map((p) => (
                              <Button
                                key={`${p}-l2`}
                                size="sm"
                                variant="outline"
                                onClick={() => isisService.addFrrPriorityLimit(p, "level-2").then(() => loadData(true))}
                              >
                                {p} L2
                              </Button>
                            ))}
                          </div>
                        )}
                      </div>
                      {capabilities.features.lfa_tiebreaker?.supported && (
                        <div>
                          <p className="text-xs text-muted-foreground mb-2">{t("advanced.tiebreaker")}</p>
                          <div className="flex flex-wrap gap-1 mb-2">
                            {(config?.fast_reroute.lfa_tiebreaker ?? []).map((e) => (
                              <Badge
                                key={`${e.tb_type}-${e.index}-${e.level}`}
                                variant="secondary"
                                className="cursor-pointer"
                                onClick={() => hasWritePermission && isisService.deleteFrrTiebreaker(e.tb_type, e.index, e.level).then(() => loadData(true))}
                              >
                                {e.tb_type} {e.index} {e.level} ×
                              </Badge>
                            ))}
                          </div>
                          {hasWritePermission && (
                            <div className="flex flex-wrap gap-2 items-end">
                              <div className="space-y-1">
                                <Label className="text-xs">{t("advanced.type")}</Label>
                                <Select value={tbType} onValueChange={setTbType}>
                                  <SelectTrigger className="h-8 w-48">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {(capabilities.features.lfa_tiebreaker.values ?? ["downstream", "lowest-backup-metric", "node-protecting"]).map((t) => (
                                      <SelectItem key={t} value={t}>{t}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="space-y-1">
                                <Label className="text-xs">{t("advanced.index")}</Label>
                                <Input className="h-8 w-20" value={tbIndex} onChange={(e) => setTbIndex(e.target.value)} />
                              </div>
                              <div className="space-y-1">
                                <Label className="text-xs">{t("fields.level")}</Label>
                                <Select value={tbLevel} onValueChange={setTbLevel}>
                                  <SelectTrigger className="h-8 w-28">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="level-1">level-1</SelectItem>
                                    <SelectItem value="level-2">level-2</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={!tbIndex.trim()}
                                onClick={() => isisService.addFrrTiebreaker(tbType, tbIndex.trim(), tbLevel).then(() => loadData(true))}
                              >
                                {tc("add")}
                              </Button>
                            </div>
                          )}
                        </div>
                      )}
                      {capabilities.features.lfa_remote_prefix_list?.supported && (
                        <div>
                          <p className="text-xs text-muted-foreground mb-2">{t("advanced.remotePrefixList")}</p>
                          <div className="flex flex-wrap gap-1 mb-2">
                            {(config?.fast_reroute.lfa_remote_prefix_list ?? []).map((e) => (
                              <Badge
                                key={`${e.prefix_list}-${e.level}`}
                                variant="secondary"
                                className="cursor-pointer"
                                onClick={() => hasWritePermission && isisService.deleteFrrRemotePrefixList(e.prefix_list, e.level).then(() => loadData(true))}
                              >
                                {e.prefix_list} {e.level} ×
                              </Badge>
                            ))}
                          </div>
                          {hasWritePermission && (
                            <div className="flex flex-wrap gap-2 items-end">
                              <div className="space-y-1">
                                <Label className="text-xs">{t("advanced.prefixList")}</Label>
                                <Input className="h-8 w-40" value={plName} onChange={(e) => setPlName(e.target.value)} />
                              </div>
                              <div className="space-y-1">
                                <Label className="text-xs">{t("fields.level")}</Label>
                                <Select value={plLevel} onValueChange={setPlLevel}>
                                  <SelectTrigger className="h-8 w-28">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="level-1">level-1</SelectItem>
                                    <SelectItem value="level-2">level-2</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={!plName.trim()}
                                onClick={() => isisService.addFrrRemotePrefixList(plName.trim(), plLevel).then(() => { setPlName(""); return loadData(true); })}
                              >
                                {tc("add")}
                              </Button>
                            </div>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}

                {/* Traffic Engineering */}
                <Card>
                  <CardContent className="p-6">
                    <h3 className="font-semibold mb-4">{t("advanced.trafficEngineering")}</h3>
                    <div className="space-y-3 text-sm">
                      <div className="flex items-center gap-3">
                        <div className={`h-2 w-2 rounded-full ${config?.traffic_engineering.enabled ? "bg-green-500" : "bg-muted-foreground/30"}`} />
                        <span>{config?.traffic_engineering.enabled ? tc("enabled") : tc("disabled")}</span>
                      </div>
                      {config?.traffic_engineering.address && (
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">{t("advanced.teRouterAddress")}</p>
                          <p className="font-mono">{config.traffic_engineering.address}</p>
                        </div>
                      )}
                      {isisTeExportSupported(capabilities?.features) && (
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground">{t("advanced.tedExport")}</span>
                          <span>{config?.traffic_engineering.export ? t("values.yes") : t("values.no")}</span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* ================================================================== */}
      {/* Modals                                                             */}
      {/* ================================================================== */}

      <IsisInterfaceModal
        open={ifaceModalOpen}
        onOpenChange={setIfaceModalOpen}
        onSubmit={editingIface ? handleUpdateInterface : handleCreateInterface}
        existingInterface={editingIface}
        capabilities={capabilities}
      />

      <IsisRedistributeModal
        open={redistModalOpen}
        onOpenChange={setRedistModalOpen}
        onSubmit={handleAddRedistribute}
        existingProtocols={existingRedistKeys}
        routeMapNames={routeMapNames}
        capabilities={capabilities}
      />

      <IsisDefaultInfoModal
        open={defaultInfoModalOpen}
        onOpenChange={setDefaultInfoModalOpen}
        onSubmit={handleAddDefaultInfo}
        existingKeys={existingDefaultInfoKeys}
        routeMapNames={routeMapNames}
        capabilities={capabilities}
      />

      {/* Delete interface dialog */}
      <AlertDialog open={!!deletingIface} onOpenChange={(open: boolean) => !open && setDeletingIface(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("delete.interfaceTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t.rich("delete.interfaceDescription", {
                name: deletingIface?.name ?? "",
                mono: (chunks) => <strong className="font-mono">{chunks}</strong>,
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{tc("cancel")}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDeleteInterface}
            >
              {t("delete.remove")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete redistribute dialog */}
      <AlertDialog open={!!deletingRedist} onOpenChange={(open: boolean) => !open && setDeletingRedist(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("delete.redistributeTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t.rich("delete.redistributeDescription", {
                protocol: deletingRedist?.protocol ?? "",
                level: deletingRedist?.level ?? "",
                proto: (chunks) => <strong className="capitalize">{chunks}</strong>,
                b: (chunks) => <strong>{chunks}</strong>,
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{tc("cancel")}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDeleteRedistribute}
            >
              {t("delete.remove")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!deletingDefaultInfo} onOpenChange={(open: boolean) => !open && setDeletingDefaultInfo(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("delete.defaultInfoTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("delete.defaultInfoDescription", { family: deletingDefaultInfo?.family ?? "", level: deletingDefaultInfo?.level ?? "" })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{tc("cancel")}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDeleteDefaultInfo}
            >
              {t("delete.remove")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
