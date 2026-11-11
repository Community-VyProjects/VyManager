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
import { accessListService } from "@/lib/api/access-list";
import { prefixListService } from "@/lib/api/prefix-list";
import { BabelInterfaceModal } from "./BabelInterfaceModal";
import { DeleteBabelInterfaceModal } from "./DeleteBabelInterfaceModal";
import {
  BabelDistributeListInterfaceModal,
  type BabelDistributeListInterfaceDraft,
} from "./BabelDistributeListInterfaceModal";
import { BabelListSelect } from "./BabelListSelect";
import { usePermissions } from "@/hooks/usePermissions";
import { FeatureGroup } from "@/lib/api/user-management";
import { useTranslations } from "next-intl";

export function BabelContent() {
  const t = useTranslations("babel");
  const tc = useTranslations("common");
  const { canWrite } = usePermissions();
  const hasWritePermission = canWrite(FeatureGroup.BABEL);
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
  const [accessListNames, setAccessListNames] = useState<{ ipv4: string[]; ipv6: string[] }>({ ipv4: [], ipv6: [] });
  const [prefixListNames, setPrefixListNames] = useState<{ ipv4: string[]; ipv6: string[] }>({ ipv4: [], ipv6: [] });
  const [dlIfaceModalOpen, setDlIfaceModalOpen] = useState(false);
  const [editingDlIface, setEditingDlIface] = useState<BabelDistributeListInterfaceDraft | null>(null);
  const [deletingDlIface, setDeletingDlIface] = useState<BabelDistributeListInterfaceDraft | null>(null);

  const loadData = useCallback(async (refresh = false) => {
    try {
      setLoading(true);
      setError(null);
      const [configData, capData, accessLists, prefixLists] = await Promise.all([
        babelService.getConfig(refresh),
        babelService.getCapabilities(),
        accessListService.getConfig().then((c) => ({
          ipv4: c.ipv4_lists.map((al) => al.number),
          ipv6: c.ipv6_lists.map((al) => al.number),
        })).catch(() => ({ ipv4: [] as string[], ipv6: [] as string[] })),
        prefixListService.getConfig().then((c) => ({
          ipv4: c.ipv4_lists.map((pl) => pl.name),
          ipv6: c.ipv6_lists.map((pl) => pl.name),
        })).catch(() => ({ ipv4: [] as string[], ipv6: [] as string[] })),
      ]);
      setConfig(configData);
      setCapabilities(capData);
      setAccessListNames(accessLists);
      setPrefixListNames(prefixLists);
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
      setError(err instanceof Error ? err.message : t("page.saveParametersFailed"));
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
      setError(err instanceof Error ? err.message : t("page.saveRedistributionFailed"));
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
      await babelService.updateDistributeListGlobals(
        { original: config.distribute_list.ipv4, updated: distListIpv4Draft },
        { original: config.distribute_list.ipv6, updated: distListIpv6Draft },
      );
      await loadData(true);
      setEditingDistList(false);
      setDistListIpv4Draft(null);
      setDistListIpv6Draft(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("page.saveDistributeListFailed"));
    } finally {
      setSavingDistList(false);
    }
  };

  const handleCreateDlIface = async (entry: BabelDistributeListInterfaceDraft) => {
    await babelService.createDistributeListInterface(entry.addressFamily, entry);
    await loadData(true);
  };

  const handleUpdateDlIface = async (entry: BabelDistributeListInterfaceDraft) => {
    if (!editingDlIface) return;
    await babelService.updateDistributeListInterface(
      editingDlIface.addressFamily,
      editingDlIface.interface,
      editingDlIface,
      entry,
    );
    setEditingDlIface(null);
    await loadData(true);
  };

  const handleDeleteDlIface = async () => {
    if (!deletingDlIface) return;
    await babelService.deleteDistributeListInterface(deletingDlIface.addressFamily, deletingDlIface);
    setDeletingDlIface(null);
    await loadData(true);
  };

  const renderGlobalFilter = (
    label: string,
    field: keyof DistributeListFilter,
    draft: DistributeListFilter | null,
    saved: DistributeListFilter | undefined,
    names: string[],
    setDraft: (next: DistributeListFilter) => void,
  ) => {
    const value = (editingDistList ? draft?.[field] : saved?.[field]) ?? "";
    return (
      <div>
        <Label className="text-sm">{label}</Label>
        <BabelListSelect
          value={value}
          names={names}
          disabled={!editingDistList || !draft}
          onChange={(next) => {
            if (draft) setDraft({ ...draft, [field]: next || null });
          }}
        />
      </div>
    );
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
                    <Network className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{interfaceCount}</p>
                    <p className="text-xs text-muted-foreground">{t("stats.interfaces")}</p>
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
                      {config?.parameters.diversity ? t("values.on") : t("values.off")}
                    </p>
                    <p className="text-xs text-muted-foreground">{t("stats.diversity")}</p>
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
                    <Filter className="h-4 w-4 text-orange-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{hasDistList ? t("values.active") : tc("none")}</p>
                    <p className="text-xs text-muted-foreground">{t("stats.filters")}</p>
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
                {t("tabs.interfaces")}
                {interfaceCount > 0 && (
                  <Badge variant="secondary" className="ml-2">{interfaceCount}</Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="parameters">{t("tabs.parameters")}</TabsTrigger>
              <TabsTrigger value="redistribute">
                {t("tabs.redistribute")}
                {redistCount > 0 && (
                  <Badge variant="secondary" className="ml-2">{redistCount}</Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="distribute-list">{t("tabs.distributeList")}</TabsTrigger>
            </TabsList>

            {/* ============================================================ */}
            {/* Interfaces Tab */}
            {/* ============================================================ */}
            <TabsContent value="interfaces">
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm text-muted-foreground">
                  {t("interfaces.description")}
                </p>
                {hasWritePermission && (
                  <Button size="sm" onClick={() => { setEditingInterface(null); setInterfaceModalOpen(true); }}>
                    <Plus className="h-4 w-4 mr-2" />
                    {tc("addInterface")}
                  </Button>
                )}
              </div>

              {interfaceCount === 0 ? (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <Network className="h-12 w-12 text-muted-foreground/30 mb-4" />
                    <p className="text-sm text-muted-foreground mb-2">{t("interfaces.emptyTitle")}</p>
                    {hasWritePermission && (
                      <Button size="sm" onClick={() => { setEditingInterface(null); setInterfaceModalOpen(true); }}>
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
                          <TableHead>{t("fields.type")}</TableHead>
                          <TableHead>{t("fields.channel")}</TableHead>
                          <TableHead>{t("interfaces.helloInt")}</TableHead>
                          <TableHead>{t("interfaces.updateInt")}</TableHead>
                          <TableHead>{t("interfaces.rxCost")}</TableHead>
                          <TableHead>{t("fields.splitHorizon")}</TableHead>
                          <TableHead>{t("interfaces.timestamps")}</TableHead>
                          <TableHead className="text-right">{tc("actions")}</TableHead>
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
                              {iface.hello_interval ? `${iface.hello_interval}ms` : <span className="text-muted-foreground">{t("values.default")}</span>}
                            </TableCell>
                            <TableCell>
                              {iface.update_interval ? `${iface.update_interval}ms` : <span className="text-muted-foreground">{t("values.default")}</span>}
                            </TableCell>
                            <TableCell>
                              {iface.rxcost ?? <span className="text-muted-foreground">{t("values.default")}</span>}
                            </TableCell>
                            <TableCell>
                              {iface.split_horizon ? (
                                <Badge variant="outline">{iface.split_horizon}</Badge>
                              ) : (
                                <span className="text-muted-foreground">{t("values.default")}</span>
                              )}
                            </TableCell>
                            <TableCell>
                              {iface.enable_timestamps ? (
                                <Badge variant="secondary">{tc("enabled")}</Badge>
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              {hasWritePermission && (
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
            {/* Parameters Tab */}
            {/* ============================================================ */}
            <TabsContent value="parameters">
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm text-muted-foreground">
                  {t("parameters.description")}
                </p>
                {hasWritePermission && (
                  !editingParams ? (
                    <Button size="sm" variant="outline" onClick={startEditParams}>
                      <Pencil className="h-4 w-4 mr-2" />
                      {t("fields.editParameters")}
                    </Button>
                  ) : (
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={cancelEditParams}>
                        {tc("cancel")}
                      </Button>
                      <Button size="sm" onClick={saveParams} disabled={savingParams}>
                        {savingParams ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                        {tc("save")}
                      </Button>
                    </div>
                  )
                )}
              </div>

              <div className="grid grid-cols-2 gap-6">
                <Card>
                  <CardContent className="p-6">
                    <h3 className="font-semibold mb-4">{t("parameters.diversityRouting")}</h3>
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
                        <Label htmlFor="diversity">{t("parameters.enableDiversity")}</Label>
                      </div>
                      <div>
                        <Label className="text-sm">{t("parameters.diversityFactor")}</Label>
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
                    <h3 className="font-semibold mb-4">{t("parameters.timing")}</h3>
                    <div className="space-y-4">
                      <div>
                        <Label className="text-sm">{t("parameters.resendDelay")}</Label>
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
                        <Label className="text-sm">{t("parameters.smoothingHalfLife")}</Label>
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
                  {t("redistribute.description")}
                </p>
                {hasWritePermission && (
                  !editingRedist ? (
                    <Button size="sm" variant="outline" onClick={startEditRedist}>
                      <Pencil className="h-4 w-4 mr-2" />
                      {tc("edit")}
                    </Button>
                  ) : (
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={cancelEditRedist}>
                        {tc("cancel")}
                      </Button>
                      <Button size="sm" onClick={saveRedist} disabled={savingRedist}>
                        {savingRedist ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                        {tc("save")}
                      </Button>
                    </div>
                  )
                )}
              </div>

              <div className="grid grid-cols-2 gap-6">
                <Card>
                  <CardContent className="p-6">
                    <h3 className="font-semibold mb-4">{t("redistribute.ipv4Protocols")}</h3>
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
                    <h3 className="font-semibold mb-4">{t("redistribute.ipv6Protocols")}</h3>
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
                  {t("distributeList.description")}
                </p>
                {hasWritePermission && (
                  !editingDistList ? (
                    <Button size="sm" variant="outline" onClick={startEditDistList}>
                      <Pencil className="h-4 w-4 mr-2" />
                      {tc("edit")}
                    </Button>
                  ) : (
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={cancelEditDistList}>
                        {tc("cancel")}
                      </Button>
                      <Button size="sm" onClick={saveDistList} disabled={savingDistList}>
                        {savingDistList ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                        {tc("save")}
                      </Button>
                    </div>
                  )
                )}
              </div>

              <div className="space-y-6">
                <Card>
                  <CardContent className="p-6">
                    <h3 className="font-semibold mb-4">{t("distributeList.ipv4Global")}</h3>
                    <div className="grid grid-cols-2 gap-4">
                      {renderGlobalFilter(t("distributeList.accessListIn"), "access_list_in", distListIpv4Draft, config?.distribute_list.ipv4, accessListNames.ipv4, setDistListIpv4Draft)}
                      {renderGlobalFilter(t("distributeList.accessListOut"), "access_list_out", distListIpv4Draft, config?.distribute_list.ipv4, accessListNames.ipv4, setDistListIpv4Draft)}
                      {renderGlobalFilter(t("distributeList.prefixListIn"), "prefix_list_in", distListIpv4Draft, config?.distribute_list.ipv4, prefixListNames.ipv4, setDistListIpv4Draft)}
                      {renderGlobalFilter(t("distributeList.prefixListOut"), "prefix_list_out", distListIpv4Draft, config?.distribute_list.ipv4, prefixListNames.ipv4, setDistListIpv4Draft)}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <h3 className="font-semibold mb-4">{t("distributeList.ipv6Global")}</h3>
                    <div className="grid grid-cols-2 gap-4">
                      {renderGlobalFilter(t("distributeList.accessListIn"), "access_list_in", distListIpv6Draft, config?.distribute_list.ipv6, accessListNames.ipv6, setDistListIpv6Draft)}
                      {renderGlobalFilter(t("distributeList.accessListOut"), "access_list_out", distListIpv6Draft, config?.distribute_list.ipv6, accessListNames.ipv6, setDistListIpv6Draft)}
                      {renderGlobalFilter(t("distributeList.prefixListIn"), "prefix_list_in", distListIpv6Draft, config?.distribute_list.ipv6, prefixListNames.ipv6, setDistListIpv6Draft)}
                      {renderGlobalFilter(t("distributeList.prefixListOut"), "prefix_list_out", distListIpv6Draft, config?.distribute_list.ipv6, prefixListNames.ipv6, setDistListIpv6Draft)}
                    </div>
                  </CardContent>
                </Card>

                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold">{t("distributeList.perInterface")}</h3>
                    {hasWritePermission && (
                      <Button size="sm" onClick={() => { setEditingDlIface(null); setDlIfaceModalOpen(true); }}>
                        <Plus className="h-4 w-4 mr-2" />
                        {tc("add")}
                      </Button>
                    )}
                  </div>
                  {((config?.distribute_list.ipv4_interfaces.length ?? 0) + (config?.distribute_list.ipv6_interfaces.length ?? 0)) === 0 ? (
                    <Card>
                      <CardContent className="flex flex-col items-center justify-center py-8">
                        <p className="text-sm text-muted-foreground">{t("distributeList.perInterfaceEmpty")}</p>
                      </CardContent>
                    </Card>
                  ) : (
                    <Card>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>{t("distributeList.addressFamily")}</TableHead>
                            <TableHead>{t("fields.interface")}</TableHead>
                            <TableHead>{t("distributeList.aclIn")}</TableHead>
                            <TableHead>{t("distributeList.aclOut")}</TableHead>
                            <TableHead>{t("distributeList.prefixIn")}</TableHead>
                            <TableHead>{t("distributeList.prefixOut")}</TableHead>
                            <TableHead className="text-right">{tc("actions")}</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {[
                            ...(config?.distribute_list.ipv4_interfaces ?? []).map((f) => ({ ...f, addressFamily: "ipv4" as const })),
                            ...(config?.distribute_list.ipv6_interfaces ?? []).map((f) => ({ ...f, addressFamily: "ipv6" as const })),
                          ].map((f) => (
                            <TableRow key={`${f.addressFamily}-${f.interface}`}>
                              <TableCell><Badge variant="outline">{f.addressFamily === "ipv4" ? t("dlModal.ipv4") : t("dlModal.ipv6")}</Badge></TableCell>
                              <TableCell className="font-mono">{f.interface}</TableCell>
                              <TableCell>{f.access_list_in ?? "—"}</TableCell>
                              <TableCell>{f.access_list_out ?? "—"}</TableCell>
                              <TableCell>{f.prefix_list_in ?? "—"}</TableCell>
                              <TableCell>{f.prefix_list_out ?? "—"}</TableCell>
                              <TableCell className="text-right">
                                {hasWritePermission && (
                                  <div className="flex items-center justify-end gap-1">
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8"
                                      onClick={() => { setEditingDlIface(f); setDlIfaceModalOpen(true); }}
                                    >
                                      <Pencil className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8 text-destructive hover:text-destructive"
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
                    </Card>
                  )}
                </div>
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

      <BabelDistributeListInterfaceModal
        open={dlIfaceModalOpen}
        onOpenChange={(open) => {
          setDlIfaceModalOpen(open);
          if (!open) setEditingDlIface(null);
        }}
        existingEntry={editingDlIface}
        existingIpv4={config?.distribute_list.ipv4_interfaces.map((f) => f.interface) ?? []}
        existingIpv6={config?.distribute_list.ipv6_interfaces.map((f) => f.interface) ?? []}
        accessListNames={accessListNames}
        prefixListNames={prefixListNames}
        onSubmit={editingDlIface ? handleUpdateDlIface : handleCreateDlIface}
      />

      <DeleteBabelInterfaceModal
        open={!!deletingDlIface}
        onOpenChange={(open) => { if (!open) setDeletingDlIface(null); }}
        interfaceName={deletingDlIface ? `${deletingDlIface.addressFamily === "ipv4" ? t("dlModal.ipv4") : t("dlModal.ipv6")} ${deletingDlIface.interface}` : ""}
        onConfirm={handleDeleteDlIface}
        variant="filter"
      />
    </>
  );
}
