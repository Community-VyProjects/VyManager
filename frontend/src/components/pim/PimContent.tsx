"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { NamedListSelect } from "@/components/ui/named-list-select";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, RefreshCw, Pencil, Trash2, Save, Loader2, Search, X, AlertCircle, Network, MapPin, Zap } from "lucide-react";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import {
  pimService,
  type PimConfig,
  type PimCapabilities,
  type PimInterface,
  type PimRangeKey,
  type PimRpAddress,
} from "@/lib/api/pim";
import {
  pimGlobalDraft,
  pimGlobalProblem,
  pimInterfaceDeleteProblem,
  pimProblemArgs,
  pimRange,
  pimRpTimerProblem,
  pimText,
  type PimGlobalDraft,
  type PimInterfaceDraft,
  type PimProblem,
} from "@/lib/api/pim-save-ops";
import { prefixListService } from "@/lib/api/prefix-list";
import { bfdService } from "@/lib/api/bfd";
import type { ApiError } from "@/lib/types/api";
import { PimInterfaceModal } from "./PimInterfaceModal";
import { PimRpAddressModal } from "./PimRpAddressModal";
import { DeletePimItemModal, type PimDeleteKind } from "./DeletePimItemModal";
import { usePermissions } from "@/hooks/usePermissions";
import { FeatureGroup } from "@/lib/api/user-management";

const DELETE_ACTIONS: Record<PimDeleteKind, (name: string, config: PimConfig) => Promise<unknown>> = {
  interface: (name, config) => pimService.deleteInterface(config, name),
  rpAddress: (name, config) => pimService.deleteRpAddress(config, name),
  pim: () => pimService.deletePim(),
};

// ============================================================================
// Main Component
// ============================================================================

export function PimContent() {
  const t = useTranslations("pim");
  const tc = useTranslations("common");
  const { canWrite } = usePermissions();
  const hasWritePermission = canWrite(FeatureGroup.PIM);

  const [config, setConfig] = useState<PimConfig | null>(null);
  const [capabilities, setCapabilities] = useState<PimCapabilities | null>(null);
  const [loading, setLoading] = useState(true);
  // A re-read after a save; the page stays mounted and every write control waits.
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Picker lists that failed to load (a 403 stays silent: the user may not read that feature).
  const [listErrors, setListErrors] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState("general");

  const [prefixListNames, setPrefixListNames] = useState<string[]>([]);
  const [bfdProfileNames, setBfdProfileNames] = useState<string[]>([]);

  // Interface search
  const [ifaceSearch, setIfaceSearch] = useState("");

  // Modal state. The subject stays set after close so the dialog keeps its
  // text while it animates out; modalKey remounts the modal on every open.
  const [modalKey, setModalKey] = useState(0);
  const [ifaceModalOpen, setIfaceModalOpen] = useState(false);
  const [editingIface, setEditingIface] = useState<PimInterface | null>(null);
  const [rpModalOpen, setRpModalOpen] = useState(false);
  const [editingRp, setEditingRp] = useState<PimRpAddress | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ kind: PimDeleteKind; name: string } | null>(null);

  // General tab inline edit
  const [generalEditing, setGeneralEditing] = useState(false);
  const [generalSaving, setGeneralSaving] = useState(false);
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [draft, setDraft] = useState<PimGlobalDraft | null>(null);

  // RP keep-alive timer inline edit
  const [rpTimerEditing, setRpTimerEditing] = useState(false);
  const [rpTimerSaving, setRpTimerSaving] = useState(false);
  const [rpTimerError, setRpTimerError] = useState<string | null>(null);
  const [rpKeepAliveTimer, setRpKeepAliveTimer] = useState("");

  // -------------------------------------------------------------------------
  // Load data
  // -------------------------------------------------------------------------

  const fetchData = useCallback(async (refresh: boolean) => {
    const [configData, capsData] = await Promise.all([
      pimService.getConfig(refresh),
      pimService.getCapabilities(),
    ]);
    // Picker names come from features with their own permissions. A 403
    // leaves the picker empty without a message; any other failure says so.
    const failed: string[] = [];
    const names = (load: Promise<string[]>, message: string) =>
      load.catch((err: unknown) => {
        if ((err as ApiError).status !== 403) failed.push(message);
        return [] as string[];
      });
    const [prefixLists, bfdProfiles] = await Promise.all([
      names(prefixListService.getConfig().then((c) => c.ipv4_lists.map((pl) => pl.name)), t("errors.loadPrefixListsFailed")),
      names(bfdService.getConfig().then((c) => c.profiles.map((p) => p.name)), t("errors.loadBfdProfilesFailed")),
    ]);
    setConfig(configData);
    setCapabilities(capsData);
    setPrefixListNames(prefixLists);
    setBfdProfileNames(bfdProfiles);
    setListErrors(failed);
    setError(null);
  }, [t]);

  useEffect(() => {
    fetchData(false)
      .catch((err) => setError((err as ApiError).message || t("content.loadFailed")))
      .finally(() => setLoading(false));
  }, [fetchData, t]);

  const retry = () => {
    setLoading(true);
    fetchData(true)
      .catch((err) => setError((err as ApiError).message || t("content.loadFailed")))
      .finally(() => setLoading(false));
  };

  const reload = async () => {
    setRefreshing(true);
    try {
      await fetchData(true);
    } catch (err) {
      setError((err as ApiError).message || t("content.loadFailed"));
    } finally {
      setRefreshing(false);
    }
  };

  const problemText = (problem: PimProblem) => t(`validation.${problem.key}`, pimProblemArgs(problem));

  // -------------------------------------------------------------------------
  // General tab edit handlers
  // -------------------------------------------------------------------------

  const startEditGeneral = () => {
    if (!config) return;
    setDraft(pimGlobalDraft(config));
    setGeneralEditing(true);
    setGeneralError(null);
  };

  const cancelEditGeneral = () => {
    setGeneralEditing(false);
    setGeneralError(null);
  };

  const patchDraft = (patch: Partial<PimGlobalDraft>) => setDraft((prev) => (prev ? { ...prev, ...patch } : prev));

  const saveGeneral = async () => {
    if (!config || !draft) return;
    const problem = pimGlobalProblem(draft, capabilities, config);
    if (problem) {
      setGeneralError(problemText(problem));
      return;
    }
    try {
      setGeneralSaving(true);
      setGeneralError(null);
      await pimService.updateGlobalSettings(config, draft);
      await reload();
      setGeneralEditing(false);
    } catch (err) {
      setGeneralError((err as ApiError).message || t("content.saveFailed"));
    } finally {
      setGeneralSaving(false);
    }
  };

  // -------------------------------------------------------------------------
  // RP timer inline edit handlers
  // -------------------------------------------------------------------------

  const startEditRpTimer = () => {
    if (!config) return;
    setRpKeepAliveTimer(pimText(config.rp?.keep_alive_timer));
    setRpTimerEditing(true);
    setRpTimerError(null);
  };

  const saveRpTimer = async () => {
    if (!config) return;
    const problem = pimRpTimerProblem(rpKeepAliveTimer, capabilities, config);
    if (problem) {
      setRpTimerError(problemText(problem));
      return;
    }
    try {
      setRpTimerSaving(true);
      setRpTimerError(null);
      await pimService.updateRpKeepAliveTimer(config, rpKeepAliveTimer);
      await reload();
      setRpTimerEditing(false);
    } catch (err) {
      setRpTimerError((err as ApiError).message || t("content.saveRpTimerFailed"));
    } finally {
      setRpTimerSaving(false);
    }
  };

  // -------------------------------------------------------------------------
  // Modal handlers
  // -------------------------------------------------------------------------

  const openIface = (iface: PimInterface | null) => {
    setEditingIface(iface);
    setModalKey((k) => k + 1);
    setIfaceModalOpen(true);
  };

  const submitIface = async (iface: PimInterfaceDraft) => {
    if (editingIface) await pimService.updateInterface(editingIface, iface);
    else await pimService.createInterface(iface);
    await reload();
  };

  const openRp = (rp: PimRpAddress | null) => {
    setEditingRp(rp);
    setModalKey((k) => k + 1);
    setRpModalOpen(true);
  };

  const submitRp = async (rp: PimRpAddress) => {
    if (editingRp) await pimService.updateRpAddress(editingRp, rp);
    else await pimService.createRpAddress(rp);
    await reload();
  };

  const openDelete = (kind: PimDeleteKind, name: string) => {
    setDeleteTarget({ kind, name });
    setModalKey((k) => k + 1);
    setDeleteOpen(true);
  };

  const confirmDelete = async () => {
    if (!deleteTarget || !config) return;
    // The last interface cannot go while other PIM config remains; the dialog shows why.
    const problem = deleteTarget.kind === "interface" ? pimInterfaceDeleteProblem(config, deleteTarget.name) : null;
    if (problem) throw { message: problemText(problem) } satisfies ApiError;
    await DELETE_ACTIONS[deleteTarget.kind](deleteTarget.name, config);
    // The commit runs before the close, so a failed commit leaves the dialog open.
    setDeleteOpen(false);
    void reload();
  };

  // -------------------------------------------------------------------------
  // Derived data
  // -------------------------------------------------------------------------

  // Every write control waits for any running commit and the re-read after it.
  const writeBusy = refreshing || generalSaving || rpTimerSaving;

  const filteredIfaces =
    config?.interfaces.filter(
      (i) => !ifaceSearch || i.name.toLowerCase().includes(ifaceSearch.toLowerCase())
    ) ?? [];

  const ifaceCount = config?.interfaces.length ?? 0;
  // The last RP address deletes the whole `rp` node, keep-alive timer included.
  const lastRpWithTimer = (config?.rp?.addresses.length ?? 0) === 1 && config?.rp?.keep_alive_timer != null;
  const rpCount = config?.rp?.addresses.length ?? 0;
  const shown = generalEditing && draft ? draft : config ? pimGlobalDraft(config) : null;
  const generalDisabled = !generalEditing || generalSaving;

  const rangeText = (key: PimRangeKey) => {
    const range = pimRange(capabilities, key);
    return range ? `${range.min}-${range.max}` : tc("default");
  };

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
        <Button variant="outline" onClick={retry}>
          {tc("retry")}
        </Button>
      </div>
    );
  }

  const numberField = (id: string, label: string, field: keyof PimGlobalDraft, key: PimRangeKey, className?: string) => (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        inputMode="numeric"
        value={pimText(shown?.[field] as string | null | undefined)}
        onChange={(e) => patchDraft({ [field]: e.target.value } as Partial<PimGlobalDraft>)}
        disabled={generalDisabled}
        placeholder={rangeText(key)}
        className={className}
      />
    </div>
  );

  return (
    <>
      <div className="flex flex-col h-full">
        {/* ================================================================ */}
        {/* Header                                                           */}
        {/* ================================================================ */}
        <div className="p-6 pb-4 border-b border-border">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-foreground">{t("content.title")}</h1>
              <p className="text-sm text-muted-foreground mt-1">
                {t("content.subtitle")}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {!hasWritePermission && (
                <Badge variant="secondary">{tc("readOnly")}</Badge>
              )}
              {hasWritePermission && config?.configured && (
                <Button
                  variant="outline"
                  size="sm"
                  className="text-destructive hover:text-destructive"
                  onClick={() => openDelete("pim", "")}
                  disabled={writeBusy}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  {t("deleteModal.pim.title")}
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={() => void reload()} disabled={refreshing}>
                <RefreshCw className={`h-4 w-4 mr-2${refreshing ? " animate-spin" : ""}`} />
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

          {listErrors.length > 0 && (
            <div className="mb-4 p-3 rounded-md bg-destructive/10 text-destructive text-sm">
              {listErrors.map((message) => (
                <p key={message}>{message}</p>
              ))}
            </div>
          )}

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-md p-2 bg-blue-500/10">
                    <Network className="h-4 w-4 text-blue-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{ifaceCount}</p>
                    <p className="text-xs text-muted-foreground">{t("content.statInterfaces")}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-md p-2 bg-green-500/10">
                    <MapPin className="h-4 w-4 text-green-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{rpCount}</p>
                    <p className="text-xs text-muted-foreground">{t("content.rpAddresses")}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-md p-2 bg-purple-500/10">
                    <Zap className="h-4 w-4 text-purple-500" />
                  </div>
                  <div>
                    <div className="mt-0.5">
                      <Badge variant={config?.ecmp ? "default" : "secondary"}>
                        {config?.ecmp ? tc("enabled") : tc("disabled")}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">ECMP</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* ================================================================ */}
        {/* Tabs                                                             */}
        {/* ================================================================ */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col flex-1 min-h-0">
          <div className="px-6 pt-4 pb-2 border-b border-border">
            <TabsList>
              <TabsTrigger value="general">{t("content.tabGeneral")}</TabsTrigger>
              <TabsTrigger value="interfaces">{t("content.tabInterfaces")}</TabsTrigger>
              <TabsTrigger value="rp">{t("content.tabRp")}</TabsTrigger>
            </TabsList>
          </div>
          <div className="flex-1 overflow-auto p-6">
              {/* ============================================================ */}
              {/* General Tab                                                   */}
              {/* ============================================================ */}
              <TabsContent value="general" className="space-y-6 mt-0">
                {hasWritePermission && (
                  <div className="flex items-center gap-2">
                    {generalEditing ? (
                      <>
                        <Button size="sm" onClick={saveGeneral} disabled={generalSaving || writeBusy}>
                          {generalSaving ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : (
                            <Save className="mr-2 h-4 w-4" />
                          )}
                          {tc("save")}
                        </Button>
                        <Button size="sm" variant="outline" onClick={cancelEditGeneral} disabled={generalSaving}>
                          {tc("cancel")}
                        </Button>
                      </>
                    ) : (
                      <Button size="sm" variant="outline" onClick={startEditGeneral} disabled={writeBusy}>
                        <Pencil className="mr-2 h-4 w-4" />
                        {tc("edit")}
                      </Button>
                    )}
                  </div>
                )}

                {generalError && (
                  <div className="p-3 rounded-md bg-destructive/10 text-destructive text-sm flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                    <span className="whitespace-pre-wrap">{generalError}</span>
                  </div>
                )}

                {/* Multicast Settings */}
                <Card>
                  <CardContent className="p-5 space-y-4">
                    <h3 className="text-sm font-semibold">{t("content.multicastSettings")}</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="pim-ecmp"
                          checked={shown?.ecmp ?? false}
                          onCheckedChange={(c) => patchDraft({ ecmp: !!c })}
                          disabled={generalDisabled}
                        />
                        <Label htmlFor="pim-ecmp">ECMP</Label>
                      </div>
                      {shown?.ecmp && (
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="pim-ecmp-rebalance"
                            checked={shown.ecmp_rebalance}
                            onCheckedChange={(c) => patchDraft({ ecmp_rebalance: !!c })}
                            disabled={generalDisabled}
                          />
                          <Label htmlFor="pim-ecmp-rebalance">{t("content.ecmpRebalance")}</Label>
                        </div>
                      )}
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="pim-no-v6"
                          checked={shown?.no_v6_secondary ?? false}
                          onCheckedChange={(c) => patchDraft({ no_v6_secondary: !!c })}
                          disabled={generalDisabled}
                        />
                        <Label htmlFor="pim-no-v6">{t("content.noV6Secondary")}</Label>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Timers */}
                <Card>
                  <CardContent className="p-5 space-y-4">
                    <h3 className="text-sm font-semibold">{t("content.timers")}</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {numberField("pim-join-prune", t("content.joinPruneInterval"), "join_prune_interval", "timer")}
                      {numberField("pim-keepalive", t("content.keepAliveTimer"), "keep_alive_timer", "timer")}
                      {numberField("pim-reg-suppress", t("content.registerSuppressTime"), "register_suppress_time", "timer")}
                      {numberField("pim-packets", t("content.packets"), "packets", "packets")}
                    </div>
                  </CardContent>
                </Card>

                {/* IGMP */}
                <Card>
                  <CardContent className="p-5 space-y-4">
                    <h3 className="text-sm font-semibold">IGMP</h3>
                    {numberField("pim-igmp-watermark", t("content.watermarkWarning"), "igmp_watermark_warning",
                      "watermark_warning", "max-w-xs")}
                  </CardContent>
                </Card>

                {/* Prefix Lists */}
                <Card>
                  <CardContent className="p-5 space-y-4">
                    <h3 className="text-sm font-semibold">{t("content.prefixLists")}</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="pim-reg-accept">{t("content.registerAcceptList")}</Label>
                        <NamedListSelect
                          id="pim-reg-accept"
                          value={pimText(shown?.register_accept_list_prefix_list)}
                          names={prefixListNames}
                          disabled={generalDisabled}
                          onValueChange={(v) => patchDraft({ register_accept_list_prefix_list: v })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="pim-ssm">{t("content.ssmPrefixList")}</Label>
                        <NamedListSelect
                          id="pim-ssm"
                          value={pimText(shown?.ssm_prefix_list)}
                          names={prefixListNames}
                          disabled={generalDisabled}
                          onValueChange={(v) => patchDraft({ ssm_prefix_list: v })}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* SPT Switchover */}
                <Card>
                  <CardContent className="p-5 space-y-4">
                    <h3 className="text-sm font-semibold">{t("content.sptSwitchover")}</h3>
                    <div className="space-y-3">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="pim-spt-infinity"
                          checked={shown?.spt_infinity_and_beyond ?? false}
                          onCheckedChange={(c) => patchDraft({ spt_infinity_and_beyond: !!c })}
                          disabled={generalDisabled}
                        />
                        <Label htmlFor="pim-spt-infinity">{t("content.infinityAndBeyond")}</Label>
                      </div>
                      {shown?.spt_infinity_and_beyond && (
                        <div className="ml-6 space-y-2 max-w-xs">
                          <Label htmlFor="pim-spt-prefix">{t("content.prefixList")}</Label>
                          <NamedListSelect
                            id="pim-spt-prefix"
                            value={pimText(shown.spt_prefix_list)}
                            names={prefixListNames}
                            disabled={generalDisabled}
                            onValueChange={(v) => patchDraft({ spt_prefix_list: v })}
                          />
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* ============================================================ */}
              {/* Interfaces Tab                                                */}
              {/* ============================================================ */}
              <TabsContent value="interfaces" className="mt-0">
                <div className="flex items-center justify-between mb-4">
                  <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      value={ifaceSearch}
                      onChange={(e) => setIfaceSearch(e.target.value)}
                      placeholder={t("content.searchInterfaces")}
                      className="pl-9"
                    />
                    {ifaceSearch && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                        aria-label={tc("clear")}
                        onClick={() => setIfaceSearch("")}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  {hasWritePermission && (
                    <Button size="sm" onClick={() => openIface(null)} disabled={writeBusy}>
                      <Plus className="h-4 w-4 mr-2" />
                      {tc("addInterface")}
                    </Button>
                  )}
                </div>

                {filteredIfaces.length === 0 ? (
                  <Card>
                    <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                      <Network className="h-10 w-10 mb-3 opacity-50" />
                      <p className="text-sm font-medium">{t("content.noInterfaces")}</p>
                      <p className="text-xs mt-1">{t("content.noInterfacesHint")}</p>
                      {hasWritePermission && (
                        <Button variant="outline" size="sm" className="mt-4" onClick={() => openIface(null)} disabled={writeBusy}>
                          <Plus className="h-4 w-4 mr-2" />
                          {tc("addInterface")}
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                ) : (
                  <Card>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>{t("content.colInterface")}</TableHead>
                          <TableHead>BFD</TableHead>
                          <TableHead>{t("content.colDrPriority")}</TableHead>
                          <TableHead>{t("content.colHello")}</TableHead>
                          <TableHead>{t("content.colFlags")}</TableHead>
                          <TableHead>IGMP</TableHead>
                          {hasWritePermission && <TableHead className="text-right">{tc("actions")}</TableHead>}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredIfaces.map((iface) => (
                          <TableRow key={iface.name}>
                            <TableCell className="font-mono font-medium">{iface.name}</TableCell>
                            <TableCell>
                              {iface.bfd ? (
                                <Badge variant="default" className="text-xs">
                                  {iface.bfd_profile ? `BFD (${iface.bfd_profile})` : "BFD"}
                                </Badge>
                              ) : (
                                <span className="text-muted-foreground text-sm">{t("content.off")}</span>
                              )}
                            </TableCell>
                            <TableCell>
                              {iface.dr_priority != null ? (
                                <span className="font-mono text-sm">{iface.dr_priority}</span>
                              ) : (
                                <span className="text-muted-foreground text-sm">-</span>
                              )}
                            </TableCell>
                            <TableCell>
                              {iface.hello != null ? (
                                <span className="font-mono text-sm">{t("content.seconds", { value: String(iface.hello) })}</span>
                              ) : (
                                <span className="text-muted-foreground text-sm">-</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-wrap gap-1">
                                {iface.passive && <Badge variant="outline" className="text-xs">{t("content.flagPassive")}</Badge>}
                                {iface.no_bsm && <Badge variant="outline" className="text-xs">{t("content.flagNoBsm")}</Badge>}
                                {iface.no_unicast_bsm && <Badge variant="outline" className="text-xs">{t("content.flagNoUbsm")}</Badge>}
                                {!iface.passive && !iface.no_bsm && !iface.no_unicast_bsm && (
                                  <span className="text-muted-foreground text-sm">-</span>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              {iface.igmp ? (
                                <Badge variant={iface.igmp.disabled ? "secondary" : "default"} className="text-xs">
                                  {iface.igmp.disabled ? tc("disabled") : iface.igmp.joins.length > 0 ? t("content.igmpActiveJoins", { count: iface.igmp.joins.length }) : t("content.igmpActive")}
                                </Badge>
                              ) : (
                                <span className="text-muted-foreground text-sm">-</span>
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
                                    disabled={writeBusy}
                                    onClick={() => openIface(iface)}
                                  >
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-destructive hover:text-destructive"
                                    aria-label={tc("delete")}
                                    disabled={writeBusy}
                                    onClick={() => openDelete("interface", iface.name)}
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
                  </Card>
                )}
              </TabsContent>

              {/* ============================================================ */}
              {/* Rendezvous Points Tab                                         */}
              {/* ============================================================ */}
              <TabsContent value="rp" className="space-y-6 mt-0">
                {/* RP Keep Alive Timer */}
                <Card>
                  <CardContent className="p-5">
                    <div className="flex items-center justify-between">
                      <div className="space-y-2 flex-1 max-w-xs">
                        <Label htmlFor="rp-keep-alive">{t("content.rpKeepAliveTimer")}</Label>
                        {rpTimerEditing ? (
                          <Input
                            id="rp-keep-alive"
                            inputMode="numeric"
                            value={rpKeepAliveTimer}
                            onChange={(e) => setRpKeepAliveTimer(e.target.value)}
                            disabled={rpTimerSaving}
                            placeholder={rangeText("timer")}
                          />
                        ) : (
                          <p className="text-sm font-mono">
                            {config?.rp?.keep_alive_timer != null ? t("content.seconds", { value: String(config.rp.keep_alive_timer) }) : tc("default")}
                          </p>
                        )}
                      </div>
                      {hasWritePermission && (
                        <div className="flex items-center gap-2">
                          {rpTimerEditing ? (
                            <>
                              <Button size="sm" onClick={saveRpTimer} disabled={rpTimerSaving || writeBusy}>
                                {rpTimerSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                                {tc("save")}
                              </Button>
                              <Button size="sm" variant="outline" onClick={() => { setRpTimerEditing(false); setRpTimerError(null); }} disabled={rpTimerSaving}>
                                {tc("cancel")}
                              </Button>
                            </>
                          ) : (
                            <Button size="sm" variant="outline" onClick={startEditRpTimer} disabled={writeBusy}>
                              <Pencil className="mr-2 h-4 w-4" />
                              {tc("edit")}
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                    {rpTimerError && (
                      <div className="mt-3 p-3 rounded-md bg-destructive/10 text-destructive text-sm flex items-start gap-2">
                        <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                        <span className="whitespace-pre-wrap">{rpTimerError}</span>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* RP Addresses Table */}
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold">{t("content.rpAddresses")}</h3>
                  {hasWritePermission && (
                    <Button size="sm" onClick={() => openRp(null)} disabled={writeBusy}>
                      <Plus className="h-4 w-4 mr-2" />
                      {t("addRpAddress")}
                    </Button>
                  )}
                </div>

                {(config?.rp?.addresses.length ?? 0) === 0 ? (
                  <Card>
                    <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                      <MapPin className="h-10 w-10 mb-3 opacity-50" />
                      <p className="text-sm font-medium">{t("content.noRpAddresses")}</p>
                      <p className="text-xs mt-1">{t("content.noRpAddressesHint")}</p>
                      {hasWritePermission && (
                        <Button variant="outline" size="sm" className="mt-4" onClick={() => openRp(null)} disabled={writeBusy}>
                          <Plus className="h-4 w-4 mr-2" />
                          {t("addRpAddress")}
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                ) : (
                  <Card>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>{t("content.colAddress")}</TableHead>
                          <TableHead>{t("content.colGroups")}</TableHead>
                          {hasWritePermission && <TableHead className="text-right">{tc("actions")}</TableHead>}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {config?.rp?.addresses.map((rp) => (
                          <TableRow key={rp.address}>
                            <TableCell className="font-mono font-medium">{rp.address}</TableCell>
                            <TableCell>
                              <div className="flex flex-wrap gap-1">
                                {rp.groups.length > 0 ? (
                                  rp.groups.map((g) => (
                                    <Badge key={g} variant="outline" className="text-xs font-mono">
                                      {g}
                                    </Badge>
                                  ))
                                ) : (
                                  <span className="text-muted-foreground text-sm">-</span>
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
                                    aria-label={tc("edit")}
                                    disabled={writeBusy}
                                    onClick={() => openRp(rp)}
                                  >
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-destructive hover:text-destructive"
                                    aria-label={tc("delete")}
                                    disabled={writeBusy}
                                    onClick={() => openDelete("rpAddress", rp.address)}
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
                  </Card>
                )}
              </TabsContent>
          </div>
        </Tabs>
      </div>

      {/* ================================================================ */}
      {/* Modals                                                           */}
      {/* ================================================================ */}

      <PimInterfaceModal
        key={`iface-${modalKey}`}
        open={ifaceModalOpen}
        onOpenChange={setIfaceModalOpen}
        onSubmit={submitIface}
        existingInterface={editingIface}
        configuredInterfaces={config?.interfaces.map((i) => i.name) ?? []}
        bfdProfileNames={bfdProfileNames}
        capabilities={capabilities}
      />

      <PimRpAddressModal
        key={`rp-${modalKey}`}
        open={rpModalOpen}
        onOpenChange={setRpModalOpen}
        onSubmit={submitRp}
        existingRp={editingRp}
        configuredRps={config?.rp?.addresses ?? []}
        configuredInterfaces={config?.interfaces.map((i) => i.name) ?? []}
      />

      <DeletePimItemModal
        key={`delete-${modalKey}`}
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        itemType={deleteTarget?.kind ?? "interface"}
        itemName={deleteTarget?.name ?? ""}
        clearsRpTimer={deleteTarget?.kind === "rpAddress" && lastRpWithTimer}
        onConfirm={confirmDelete}
      />
    </>
  );
}
