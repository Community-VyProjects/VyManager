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
  ArrowLeftRight,
  Save,
  Loader2,
  Search,
  X,
  AlertCircle,
  Settings2,
  Shield,
} from "lucide-react";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import {
  isisService,
  type IsisCapabilities,
  type IsisConfig,
  type IsisDefaultInfoEntry,
  type IsisInterface,
  type IsisRedistributeEntry,
} from "@/lib/api/isis";
import {
  ISIS_GENERAL_FLAGS,
  ISIS_LEVELS,
  ISIS_METRIC_STYLES,
  ISIS_TOPOLOGIES,
  isisGeneralForm,
  isisGeneralProblem,
  isisDeleteInterfaceProblem,
  isisSetupProblem,
  isisPasswordForMode,
  isisPasswordModes,
  type IsisDefaultInfoForm,
  type IsisFamily,
  type IsisGeneralForm,
  type IsisInterfaceForm,
  type IsisPasswordDraft,
  type IsisPasswordMode,
  type IsisRedistributeForm,
} from "@/lib/api/isis-save-ops";
import { isisInterfaceFastRerouteSupported } from "@/lib/isis-feature-flags";
import { NONE_SENTINEL } from "@/lib/named-list-select-options";
import { routeMapService } from "@/lib/api/route-map";
import { bfdService } from "@/lib/api/bfd";
import { prefixListService } from "@/lib/api/prefix-list";
import { showService, type InterfaceName } from "@/lib/api/show";
import type { ApiError } from "@/lib/types/api";
import { IsisInterfaceModal } from "./IsisInterfaceModal";
import { IsisRedistributeModal } from "./IsisRedistributeModal";
import { IsisDefaultInfoModal } from "./IsisDefaultInfoModal";
import { IsisConfirmDialog, type IsisConfirm } from "./IsisConfirmDialog";
import { IsisTimersCard, IsisSpfDelayCard } from "./IsisTimersCards";
import { IsisSegmentRoutingCard, IsisTrafficEngineeringCard } from "./IsisAdvancedCards";
import { IsisFrrCard } from "./IsisFrrCard";
import { useIsisSection } from "./useIsisSection";
import { useIsisProblemText } from "./useIsisProblemText";
import { usePermissions } from "@/hooks/usePermissions";
import { FeatureGroup } from "@/lib/api/user-management";
import { useTranslations } from "next-intl";

// ============================================================================
// Helpers
// ============================================================================

function levelBadge(level: string | null, autoLabel: string) {
  if (!level) return <span className="text-muted-foreground text-sm">{autoLabel}</span>;
  return <Badge variant="outline">{level}</Badge>;
}

type Modal<T> = { key: number; existing: T | null } | null;

const FLAG_LABELS = {
  dynamic_hostname: "overview.dynamicHostname",
  log_adjacency_changes: "overview.logAdjacencyChanges",
  purge_originator: "overview.purgeOriginator",
  advertise_passive_only: "overview.advertisePassiveOnly",
  advertise_high_metrics: "overview.advertiseHighMetrics",
  set_attached_bit: "overview.setAttachedBit",
  set_overload_bit: "overview.setOverloadBit",
} as const satisfies Record<(typeof ISIS_GENERAL_FLAGS)[number][0], string>;

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
  const [bfdProfileNames, setBfdProfileNames] = useState<string[]>([]);
  const [prefixListNames, setPrefixListNames] = useState<string[]>([]);
  const [interfaces, setInterfaces] = useState<InterfaceName[]>([]);
  const [ifaceSearch, setIfaceSearch] = useState("");

  const [modalSeq, setModalSeq] = useState(0);
  const [ifaceModal, setIfaceModal] = useState<Modal<IsisInterface>>(null);
  const [redistModal, setRedistModal] = useState<Modal<{ family: IsisFamily; entry: IsisRedistributeEntry }>>(null);
  const [defaultInfoModal, setDefaultInfoModal] = useState<Modal<{ family: IsisFamily; entry: IsisDefaultInfoEntry }>>(null);
  const [confirm, setConfirm] = useState<IsisConfirm | null>(null);

  const general = useIsisSection<IsisGeneralForm>(t("page.saveConfigFailed"));
  /** A page action the lab would reject (shown above the tabs). */
  const [actionError, setActionError] = useState<string | null>(null);
  const problemText = useIsisProblemText();
  /** No interface yet: only Add Interface (which also sets the NET) can commit. */
  const setupProblem = config ? isisSetupProblem(config.interfaces.length) : null;
  const canChange = hasWritePermission && !setupProblem;

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
      // Pick lists need their own permissions; a failure leaves the list empty.
      const [rmNames, bfdNames, plNames, ifaces] = await Promise.all([
        routeMapService.getConfig().then((c) => c.route_maps.map((rm) => rm.name)).catch(() => []),
        bfdService.getConfig().then((c) => c.profiles.map((p) => p.name)).catch(() => []),
        prefixListService.getConfig().then((c) => c.ipv4_lists.map((pl) => pl.name)).catch(() => []),
        showService
          .getAllInterfaces()
          .then((res) => [...res.interfaces].sort((a, b) => a.name.localeCompare(b.name)))
          .catch(() => [] as InterfaceName[]),
      ]);
      setRouteMapNames(rmNames);
      setBfdProfileNames(bfdNames);
      setPrefixListNames(plNames);
      setInterfaces(ifaces);
    } catch (err) {
      setError((err as ApiError).message || t("page.loadFailed"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const reload = () => loadData(true);
  const nextKey = () => {
    const key = modalSeq + 1;
    setModalSeq(key);
    return key;
  };

  // -------------------------------------------------------------------------
  // Overview (general settings)
  // -------------------------------------------------------------------------

  const startEditGeneral = () => {
    if (!config) return;
    general.start(isisGeneralForm(config.global_config));
  };

  const saveGeneral = () => {
    if (!config || !general.form) return;
    const form = general.form;
    const original = config.global_config;
    const problem = isisGeneralProblem(original, form, {
      interfaceCount: config.interfaces.length,
      redistribute: [...config.redistribute_ipv4, ...config.redistribute_ipv6],
    });
    void general.save(problem, async () => {
      await isisService.updateGeneral(original, form);
      await reload();
    });
  };

  // -------------------------------------------------------------------------
  // Modal submit handlers (the modal shows a rejected commit and stays open)
  // -------------------------------------------------------------------------

  const fastReroute = isisInterfaceFastRerouteSupported(capabilities?.features);

  const submitInterface = async (form: IsisInterfaceForm, net: string | null) => {
    const existing = ifaceModal?.existing ?? null;
    if (existing) await isisService.updateInterface(existing, form, { fastReroute });
    else await isisService.createInterface(form, { fastReroute }, net);
    await reload();
  };

  const submitRedistribute = async (family: IsisFamily, original: IsisRedistributeEntry | null, form: IsisRedistributeForm) => {
    await isisService.saveRedistribute(family, original, form);
    await reload();
  };

  const submitDefaultInfo = async (family: IsisFamily, original: IsisDefaultInfoEntry | null, form: IsisDefaultInfoForm) => {
    await isisService.saveDefaultInfo(family, original, form);
    await reload();
  };

  // -------------------------------------------------------------------------
  // Page-level deletes (each behind a confirm dialog)
  // -------------------------------------------------------------------------

  const confirmDeleteInterface = (iface: IsisInterface) => {
    // verify needs an interface while IS-IS exists; "Delete IS-IS" removes the whole protocol.
    const problem = isisDeleteInterfaceProblem(config?.interfaces.length ?? 0);
    if (problem) {
      setActionError(problemText(problem));
      return;
    }
    setActionError(null);
    setConfirm({
      title: t("delete.interfaceTitle"),
      description: t.rich("delete.interfaceDescription", {
        name: iface.name,
        mono: (chunks) => <strong className="font-mono">{chunks}</strong>,
      }),
      confirmLabel: t("delete.remove"),
      destructive: true,
      run: async () => {
        await isisService.deleteInterface(iface.name);
        await reload();
      },
    });
  };

  const confirmDeleteRedistribute = (family: IsisFamily, entry: IsisRedistributeEntry) =>
    setConfirm({
      title: t("delete.redistributeTitle"),
      description: t.rich("delete.redistributeDescription", {
        protocol: entry.protocol,
        level: entry.level,
        proto: (chunks) => <strong>{chunks}</strong>,
        b: (chunks) => <strong>{chunks}</strong>,
      }),
      confirmLabel: t("delete.remove"),
      destructive: true,
      run: async () => {
        await isisService.deleteRedistribute(family, entry);
        await reload();
      },
    });

  const confirmDeleteDefaultInfo = (family: IsisFamily, entry: IsisDefaultInfoEntry) =>
    setConfirm({
      title: t("delete.defaultInfoTitle"),
      description: t("delete.defaultInfoDescription", { family, level: entry.level }),
      confirmLabel: t("delete.remove"),
      destructive: true,
      run: async () => {
        await isisService.deleteDefaultInfo(family, entry);
        await reload();
      },
    });

  const confirmDeleteIsis = () =>
    setConfirm({
      title: t("delete.isisTitle"),
      description: t("delete.isisDescription"),
      confirmLabel: t("delete.isisTitle"),
      destructive: true,
      run: async () => {
        await isisService.deleteIsis();
        await reload();
      },
    });

  // -------------------------------------------------------------------------
  // Derived data
  // -------------------------------------------------------------------------

  const filteredIfaces =
    config?.interfaces.filter(
      (i) => !ifaceSearch || i.name.toLowerCase().includes(ifaceSearch.toLowerCase())
    ) ?? [];

  const redistEntries: Record<IsisFamily, IsisRedistributeEntry[]> = {
    ipv4: config?.redistribute_ipv4 ?? [],
    ipv6: config?.redistribute_ipv6 ?? [],
  };
  const defaultInfoEntries: Record<IsisFamily, IsisDefaultInfoEntry[]> = {
    ipv4: config?.default_info_ipv4 ?? [],
    ipv6: config?.default_info_ipv6 ?? [],
  };
  const allRedist = (["ipv4", "ipv6"] as const).flatMap((family) => redistEntries[family].map((entry) => ({ family, entry })));
  const allDefaultInfo = (["ipv4", "ipv6"] as const).flatMap((family) =>
    defaultInfoEntries[family].map((entry) => ({ family, entry })));

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

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
        <Button variant="outline" onClick={() => loadData()}>
          {tc("retry")}
        </Button>
      </div>
    );
  }

  const g = config?.global_config;
  const ifaceCount = config?.interfaces.length ?? 0;
  const redistCount = allRedist.length;
  const netValue = g?.net ?? null;
  const shownGeneral = general.form ?? (g ? isisGeneralForm(g) : null);
  const generalOff = !general.editing;

  const passwordFields = (
    id: string,
    label: string,
    draft: IsisPasswordDraft,
    modes: string[],
    md5: string | null | undefined,
    plain: string | null | undefined,
    onChange: (draft: IsisPasswordDraft) => void,
  ) => (
    <div className="grid grid-cols-2 gap-3">
      <div className="space-y-2">
        <Label htmlFor={`${id}-mode`} className="text-sm">{label}</Label>
        <Select
          value={draft.mode || NONE_SENTINEL}
          disabled={generalOff}
          onValueChange={(v) => onChange(isisPasswordForMode(md5, plain, (v === NONE_SENTINEL ? "" : v) as IsisPasswordMode))}
        >
          <SelectTrigger id={`${id}-mode`}>
            <SelectValue placeholder={tc("none")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NONE_SENTINEL}>{tc("none")}</SelectItem>
            {isisPasswordModes(modes, md5, plain).map((mode) => (
              <SelectItem key={mode} value={mode}>{mode}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor={`${id}-value`} className="text-sm">{t("password.value")}</Label>
        <Input
          id={`${id}-value`}
          type="password"
          autoComplete="new-password"
          value={draft.password}
          disabled={generalOff || !draft.mode}
          onChange={(e) => onChange({ ...draft, password: e.target.value })}
        />
      </div>
    </div>
  );

  const optionalSelect = (
    id: string,
    label: string,
    value: string,
    options: readonly string[],
    noneLabel: string,
    onChange: (v: string) => void,
  ) => (
    <div className="space-y-2">
      <Label htmlFor={id} className="text-sm">{label}</Label>
      <Select value={value || NONE_SENTINEL} disabled={generalOff} onValueChange={(v) => onChange(v === NONE_SENTINEL ? "" : v)}>
        <SelectTrigger id={id}>
          <SelectValue placeholder={noneLabel} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={NONE_SENTINEL}>{noneLabel}</SelectItem>
          {(value && !options.includes(value) ? [value, ...options] : options).map((o) => (
            <SelectItem key={o} value={o}>{o}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );

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
                <Badge variant="secondary">{tc("readOnly")}</Badge>
              )}
              {hasWritePermission && config?.enabled && (
                <Button variant="outline" size="sm" className="text-destructive hover:text-destructive" onClick={confirmDeleteIsis}>
                  <Trash2 className="h-4 w-4 mr-2" />
                  {t("delete.isisTitle")}
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={() => loadData(true)} disabled={loading}>
                <RefreshCw className="h-4 w-4 mr-2" />
                {tc("refresh")}
              </Button>
            </div>
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-md bg-destructive/10 text-destructive text-sm flex items-start gap-2">
              <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <pre className="whitespace-pre-wrap font-sans">{error}</pre>
            </div>
          )}

          {actionError && (
            <div className="mb-4 p-3 rounded-md bg-destructive/10 text-destructive text-sm flex items-start gap-2">
              <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <pre className="whitespace-pre-wrap font-sans flex-1">{actionError}</pre>
              <button type="button" aria-label={tc("close")} onClick={() => setActionError(null)}>
                <X className="h-4 w-4" />
              </button>
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
                  <div className="min-w-0">
                    <p className="text-sm font-mono font-semibold truncate">{netValue ?? "—"}</p>
                    <p className="text-xs text-muted-foreground">{t("stats.net")}</p>
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

            {/* Overview Tab */}
            <TabsContent value="overview">
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm text-muted-foreground">
                  {t("overview.description")}
                </p>
                {canChange && g && (
                  !general.editing ? (
                    <Button size="sm" variant="outline" onClick={startEditGeneral}>
                      <Pencil className="h-4 w-4 mr-2" />
                      {t("overview.editSettings")}
                    </Button>
                  ) : (
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={general.cancel} disabled={general.saving}>{tc("cancel")}</Button>
                      <Button size="sm" onClick={saveGeneral} disabled={general.saving}>
                        {general.saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                        {tc("save")}
                      </Button>
                    </div>
                  )
                )}
              </div>

              {general.error && (
                <div className="mb-4 p-3 rounded-md bg-destructive/10 text-destructive text-sm flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <pre className="whitespace-pre-wrap font-sans">{general.error}</pre>
                </div>
              )}

              {shownGeneral && g && (
                <div className="grid grid-cols-2 gap-6">
                  <Card>
                    <CardContent className="p-6">
                      <h3 className="font-semibold mb-4">{t("overview.globalSettings")}</h3>
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="isis-net" className="text-sm">{t("overview.net")}</Label>
                          <Input
                            id="isis-net"
                            value={shownGeneral.net}
                            disabled={generalOff}
                            onChange={(e) => general.update({ net: e.target.value })}
                            placeholder={generalOff ? t("overview.noNet") : t("overview.netPlaceholder")}
                            className="font-mono"
                          />
                        </div>

                        {optionalSelect("isis-level", t("fields.isisLevel"), shownGeneral.level, ISIS_LEVELS,
                          t("overview.levelPlaceholder"), (v) => general.update({ level: v }))}
                        {optionalSelect("isis-metric-style", t("overview.metricStyle"), shownGeneral.metric_style,
                          ISIS_METRIC_STYLES, t("overview.metricStylePlaceholder"), (v) => general.update({ metric_style: v }))}
                        {optionalSelect("isis-topology", t("overview.topology"), shownGeneral.topology, ISIS_TOPOLOGIES,
                          tc("none"), (v) => general.update({ topology: v }))}

                        {passwordFields("isis-area-pw", t("password.area"), shownGeneral.area_password,
                          capabilities?.area_password_modes ?? [], g.area_password_md5, g.area_password_plaintext,
                          (draft) => general.update({ area_password: draft }))}
                        {passwordFields("isis-domain-pw", t("password.domain"), shownGeneral.domain_password,
                          capabilities?.domain_password_modes ?? [], g.domain_password_md5, g.domain_password_plaintext,
                          (draft) => general.update({ domain_password: draft }))}
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-6">
                      <h3 className="font-semibold mb-4">{t("overview.options")}</h3>
                      <div className="space-y-3">
                        {ISIS_GENERAL_FLAGS.map(([field]) => (
                          <div key={field} className="flex items-center gap-3">
                            <Checkbox
                              id={`isis-flag-${field}`}
                              checked={shownGeneral[field]}
                              disabled={generalOff}
                              onCheckedChange={(c) => general.update({ [field]: c === true } as Partial<IsisGeneralForm>)}
                            />
                            <Label htmlFor={`isis-flag-${field}`} className="text-sm font-normal">{t(FLAG_LABELS[field])}</Label>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="col-span-2">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="font-semibold">{t("overview.defaultInformation")}</h3>
                        {canChange && (
                          <Button size="sm" variant="outline" onClick={() => setDefaultInfoModal({ key: nextKey(), existing: null })}>
                            <Plus className="h-4 w-4 mr-2" />
                            {tc("add")}
                          </Button>
                        )}
                      </div>
                      {allDefaultInfo.length === 0 ? (
                        <p className="text-sm text-muted-foreground">{t("overview.noneConfigured")}</p>
                      ) : (
                        <div className="space-y-2">
                          {allDefaultInfo.map(({ family, entry }) => (
                            <div key={`${family}|${entry.level}`} className="flex items-center gap-3 p-2 rounded-md bg-muted/50 text-sm">
                              <Badge variant="outline">{family}</Badge>
                              <Badge variant="outline">{entry.level}</Badge>
                              {entry.always && <Badge variant="secondary">{tc("shown.always")}</Badge>}
                              {entry.metric != null && (
                                <span className="text-muted-foreground">{t("values.metric", { metric: String(entry.metric) })}</span>
                              )}
                              {entry.route_map && (
                                <span className="text-muted-foreground">{t("values.routeMap", { name: entry.route_map })}</span>
                              )}
                              {hasWritePermission && (
                                <div className="ml-auto flex gap-1">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7"
                                    aria-label={tc("edit")}
                                    onClick={() => setDefaultInfoModal({ key: nextKey(), existing: { family, entry } })}
                                  >
                                    <Pencil className="h-3.5 w-3.5" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 text-destructive hover:text-destructive"
                                    aria-label={tc("delete")}
                                    onClick={() => confirmDeleteDefaultInfo(family, entry)}
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              )}
            </TabsContent>

            {/* Interfaces Tab */}
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
                  <Button size="sm" onClick={() => setIfaceModal({ key: nextKey(), existing: null })}>
                    <Plus className="h-4 w-4 mr-2" />
                    {tc("addInterface")}
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
                      <Button size="sm" onClick={() => setIfaceModal({ key: nextKey(), existing: null })}>
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
                          <TableHead>{t("fields.interface")}</TableHead>
                          <TableHead>{t("fields.circuitType")}</TableHead>
                          <TableHead>{t("fields.metric")}</TableHead>
                          <TableHead>{t("interfaces.flags")}</TableHead>
                          <TableHead>{t("interfaceModal.bfd")}</TableHead>
                          {fastReroute && <TableHead>{t("interfaces.lfa")}</TableHead>}
                          {hasWritePermission && <TableHead className="text-right">{tc("actions")}</TableHead>}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredIfaces.map((iface) => {
                          const lfa = iface.lfa.level1_enabled || iface.lfa.level2_enabled;
                          const tiLfa = iface.ti_lfa.enabled || iface.ti_lfa.level1_enabled || iface.ti_lfa.level2_enabled;
                          return (
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
                                  {iface.passive && <Badge variant="secondary" className="text-xs">{tc("shown.passive")}</Badge>}
                                  {iface.point_to_point && <Badge variant="secondary" className="text-xs">{t("interfaceModal.pointToPoint")}</Badge>}
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
                              {fastReroute && (
                                <TableCell>
                                  <div className="flex gap-1">
                                    {lfa && <Badge variant="outline" className="text-xs">{t("interfaces.lfa")}</Badge>}
                                    {tiLfa && (
                                      <Badge variant="outline" className="text-xs text-primary border-primary/30">{t("interfaces.tiLfa")}</Badge>
                                    )}
                                    {!lfa && !tiLfa && <span className="text-muted-foreground text-sm">—</span>}
                                  </div>
                                </TableCell>
                              )}
                              {hasWritePermission && (
                                <TableCell className="text-right">
                                  <div className="flex items-center justify-end gap-1">
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8"
                                      aria-label={tc("edit")}
                                      onClick={() => setIfaceModal({ key: nextKey(), existing: iface })}
                                    >
                                      <Pencil className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8 text-destructive hover:text-destructive"
                                      aria-label={tc("delete")}
                                      onClick={() => confirmDeleteInterface(iface)}
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </TableCell>
                              )}
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                </Card>
              )}
            </TabsContent>

            {/* Redistribute Tab */}
            <TabsContent value="redistribute">
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm text-muted-foreground">
                  {t("redistribute.description")}
                </p>
                {canChange && (
                  <Button size="sm" onClick={() => setRedistModal({ key: nextKey(), existing: null })}>
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
                    {canChange && (
                      <Button size="sm" onClick={() => setRedistModal({ key: nextKey(), existing: null })}>
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
                        {allRedist.map(({ family, entry }) => (
                          <TableRow key={`${family}|${entry.protocol}|${entry.level}`}>
                            <TableCell>
                              <Badge variant="outline">{family}</Badge>
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
                                <div className="flex items-center justify-end gap-1">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8"
                                    aria-label={tc("edit")}
                                    onClick={() => setRedistModal({ key: nextKey(), existing: { family, entry } })}
                                  >
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-destructive hover:text-destructive"
                                    aria-label={tc("delete")}
                                    onClick={() => confirmDeleteRedistribute(family, entry)}
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

            {/* Advanced Tab */}
            <TabsContent value="advanced">
              <p className="text-sm text-muted-foreground mb-4">
                {t("advanced.description")}
              </p>

              {config && (
                <div className="grid grid-cols-2 gap-6">
                  <IsisTimersCard
                    global={config.global_config}
                    capabilities={capabilities}
                    canEdit={canChange}
                    setupProblem={setupProblem}
                    onSaved={reload}
                  />
                  <IsisSpfDelayCard
                    spfDelay={config.global_config.spf_delay_ietf}
                    canEdit={canChange}
                    setupProblem={setupProblem}
                    onSaved={reload}
                  />
                  <IsisSegmentRoutingCard
                    config={config}
                    capabilities={capabilities}
                    interfaces={interfaces}
                    canEdit={canChange}
                    setupProblem={setupProblem}
                    onSaved={reload}
                  />
                  {capabilities && (
                    <IsisFrrCard
                      frr={config.fast_reroute}
                      capabilities={capabilities}
                      prefixListNames={prefixListNames}
                      canEdit={canChange}
                      setupProblem={setupProblem}
                      onConfirm={setConfirm}
                      reload={reload}
                    />
                  )}
                  <IsisTrafficEngineeringCard
                    te={config.traffic_engineering}
                    capabilities={capabilities}
                    canEdit={canChange}
                    setupProblem={setupProblem}
                    onSaved={reload}
                  />
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Modals (remounted per open so each reads its entry once) */}
      {ifaceModal && (
        <IsisInterfaceModal
          key={ifaceModal.key}
          open
          onOpenChange={(open) => { if (!open) setIfaceModal(null); }}
          onSubmit={submitInterface}
          existingInterface={ifaceModal.existing}
          capabilities={capabilities}
          interfaces={interfaces}
          configuredInterfaces={config?.interfaces.map((i) => i.name) ?? []}
          bfdProfileNames={bfdProfileNames}
          needsNet={!config?.global_config.net}
        />
      )}

      {redistModal && (
        <IsisRedistributeModal
          key={redistModal.key}
          open
          onOpenChange={(open) => { if (!open) setRedistModal(null); }}
          onSubmit={submitRedistribute}
          existing={redistModal.existing}
          entries={redistEntries}
          routeMapNames={routeMapNames}
          capabilities={capabilities}
          globalLevel={config?.global_config.level ?? null}
          setupProblem={setupProblem}
        />
      )}

      {defaultInfoModal && (
        <IsisDefaultInfoModal
          key={defaultInfoModal.key}
          open
          onOpenChange={(open) => { if (!open) setDefaultInfoModal(null); }}
          onSubmit={submitDefaultInfo}
          existing={defaultInfoModal.existing}
          entries={defaultInfoEntries}
          routeMapNames={routeMapNames}
          setupProblem={setupProblem}
        />
      )}

      <IsisConfirmDialog confirm={confirm} onClose={() => setConfirm(null)} />
    </>
  );
}
