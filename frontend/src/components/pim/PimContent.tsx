"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";

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
  PimConfig,
  PimCapabilities,
  PimInterface,
  PimRpAddress,
  PimGlobalSettings,
} from "@/lib/api/pim";
import { PimInterfaceModal } from "./PimInterfaceModal";
import { PimRpAddressModal } from "./PimRpAddressModal";
import { DeletePimItemModal } from "./DeletePimItemModal";
import { usePermissions } from "@/hooks/usePermissions";
import { FeatureGroup } from "@/lib/api/user-management";

// ============================================================================
// Helpers
// ============================================================================

function configToGlobalSettings(config: PimConfig): PimGlobalSettings {
  return {
    ecmp: config.ecmp,
    ecmp_rebalance: config.ecmp_rebalance,
    igmp_watermark_warning: config.igmp_watermark_warning != null ? String(config.igmp_watermark_warning) : "",
    join_prune_interval: config.join_prune_interval != null ? String(config.join_prune_interval) : "",
    keep_alive_timer: config.keep_alive_timer != null ? String(config.keep_alive_timer) : "",
    no_v6_secondary: config.no_v6_secondary,
    packets: config.packets != null ? String(config.packets) : "",
    register_accept_list_prefix_list: config.register_accept_list_prefix_list || "",
    register_suppress_time: config.register_suppress_time != null ? String(config.register_suppress_time) : "",
    spt_infinity_and_beyond: config.spt_switchover?.infinity_and_beyond ?? false,
    spt_prefix_list: config.spt_switchover?.prefix_list || "",
    ssm_prefix_list: config.ssm_prefix_list || "",
  };
}

// ============================================================================
// Main Component
// ============================================================================

export function PimContent() {
  const { canWrite } = usePermissions();
  const hasWritePermission = canWrite(FeatureGroup.PIM);

  const [config, setConfig] = useState<PimConfig | null>(null);
  const [, setCapabilities] = useState<PimCapabilities | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("general");

  // Interface state
  const [ifaceSearch, setIfaceSearch] = useState("");
  const [ifaceModalOpen, setIfaceModalOpen] = useState(false);
  const [editingIface, setEditingIface] = useState<PimInterface | null>(null);
  const [deletingIface, setDeletingIface] = useState<PimInterface | null>(null);

  // RP state
  const [rpModalOpen, setRpModalOpen] = useState(false);
  const [editingRp, setEditingRp] = useState<PimRpAddress | null>(null);
  const [deletingRp, setDeletingRp] = useState<PimRpAddress | null>(null);

  // General tab inline edit
  const [generalEditing, setGeneralEditing] = useState(false);
  const [generalSaving, setGeneralSaving] = useState(false);
  const [generalError, setGeneralError] = useState<string | null>(null);

  // General form fields
  const [ecmp, setEcmp] = useState(false);
  const [ecmpRebalance, setEcmpRebalance] = useState(false);
  const [noV6Secondary, setNoV6Secondary] = useState(false);
  const [joinPruneInterval, setJoinPruneInterval] = useState("");
  const [keepAliveTimer, setKeepAliveTimer] = useState("");
  const [registerSuppressTime, setRegisterSuppressTime] = useState("");
  const [packets, setPackets] = useState("");
  const [igmpWatermarkWarning, setIgmpWatermarkWarning] = useState("");
  const [registerAcceptListPrefixList, setRegisterAcceptListPrefixList] = useState("");
  const [ssmPrefixList, setSsmPrefixList] = useState("");
  const [sptInfinityAndBeyond, setSptInfinityAndBeyond] = useState(false);
  const [sptPrefixList, setSptPrefixList] = useState("");

  // RP keep-alive timer inline edit
  const [rpTimerEditing, setRpTimerEditing] = useState(false);
  const [rpTimerSaving, setRpTimerSaving] = useState(false);
  const [rpTimerError, setRpTimerError] = useState<string | null>(null);
  const [rpKeepAliveTimer, setRpKeepAliveTimer] = useState("");

  // -------------------------------------------------------------------------
  // Load data
  // -------------------------------------------------------------------------

  const loadData = useCallback(async (refresh = false) => {
    try {
      setLoading(true);
      setError(null);
      const [configData, capsData] = await Promise.all([
        pimService.getConfig(refresh),
        pimService.getCapabilities(),
      ]);
      setConfig(configData);
      setCapabilities(capsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load PIM configuration");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // -------------------------------------------------------------------------
  // General tab edit handlers
  // -------------------------------------------------------------------------

  const startEditGeneral = () => {
    if (!config) return;
    const g = configToGlobalSettings(config);
    setEcmp(g.ecmp);
    setEcmpRebalance(g.ecmp_rebalance);
    setNoV6Secondary(g.no_v6_secondary);
    setJoinPruneInterval(g.join_prune_interval);
    setKeepAliveTimer(g.keep_alive_timer);
    setRegisterSuppressTime(g.register_suppress_time);
    setPackets(g.packets);
    setIgmpWatermarkWarning(g.igmp_watermark_warning);
    setRegisterAcceptListPrefixList(g.register_accept_list_prefix_list);
    setSsmPrefixList(g.ssm_prefix_list);
    setSptInfinityAndBeyond(g.spt_infinity_and_beyond);
    setSptPrefixList(g.spt_prefix_list);
    setGeneralEditing(true);
    setGeneralError(null);
  };

  const cancelEditGeneral = () => {
    setGeneralEditing(false);
    setGeneralError(null);
  };

  const saveGeneral = async () => {
    if (!config) return;
    try {
      setGeneralSaving(true);
      setGeneralError(null);
      const current = configToGlobalSettings(config);
      const next: PimGlobalSettings = {
        ecmp,
        ecmp_rebalance: ecmp ? ecmpRebalance : false,
        no_v6_secondary: noV6Secondary,
        join_prune_interval: joinPruneInterval,
        keep_alive_timer: keepAliveTimer,
        register_suppress_time: registerSuppressTime,
        packets,
        igmp_watermark_warning: igmpWatermarkWarning,
        register_accept_list_prefix_list: registerAcceptListPrefixList,
        ssm_prefix_list: ssmPrefixList,
        spt_infinity_and_beyond: sptInfinityAndBeyond,
        spt_prefix_list: sptInfinityAndBeyond ? sptPrefixList : "",
      };
      await pimService.updateGlobalSettings(current, next);
      await loadData(true);
      setGeneralEditing(false);
    } catch (err) {
      setGeneralError(err instanceof Error ? err.message : "Failed to save configuration");
    } finally {
      setGeneralSaving(false);
    }
  };

  // -------------------------------------------------------------------------
  // RP timer inline edit handlers
  // -------------------------------------------------------------------------

  const startEditRpTimer = () => {
    if (!config) return;
    setRpKeepAliveTimer(config.rp?.keep_alive_timer != null ? String(config.rp.keep_alive_timer) : "");
    setRpTimerEditing(true);
    setRpTimerError(null);
  };

  const saveRpTimer = async () => {
    if (!config) return;
    try {
      setRpTimerSaving(true);
      setRpTimerError(null);
      const currentVal = config.rp?.keep_alive_timer != null ? String(config.rp.keep_alive_timer) : "";
      await pimService.updateRpKeepAliveTimer(rpKeepAliveTimer, currentVal);
      await loadData(true);
      setRpTimerEditing(false);
    } catch (err) {
      setRpTimerError(err instanceof Error ? err.message : "Failed to save RP timer");
    } finally {
      setRpTimerSaving(false);
    }
  };

  // -------------------------------------------------------------------------
  // Interface handlers
  // -------------------------------------------------------------------------

  const handleCreateInterface = async (iface: PimInterface) => {
    await pimService.createInterface(iface);
    await loadData(true);
  };

  const handleUpdateInterface = async (iface: PimInterface) => {
    if (!editingIface) return;
    await pimService.updateInterface(editingIface, iface);
    setEditingIface(null);
    await loadData(true);
  };

  const handleDeleteInterface = async () => {
    if (!deletingIface) return;
    await pimService.deleteInterface(deletingIface.name);
    setDeletingIface(null);
    await loadData(true);
  };

  // -------------------------------------------------------------------------
  // RP handlers
  // -------------------------------------------------------------------------

  const handleCreateRp = async (rp: PimRpAddress) => {
    await pimService.createRpAddress(rp);
    await loadData(true);
  };

  const handleUpdateRp = async (rp: PimRpAddress) => {
    if (!editingRp) return;
    await pimService.updateRpAddress(editingRp, rp);
    setEditingRp(null);
    await loadData(true);
  };

  const handleDeleteRp = async () => {
    if (!deletingRp) return;
    await pimService.deleteRpAddress(deletingRp.address);
    setDeletingRp(null);
    await loadData(true);
  };

  // -------------------------------------------------------------------------
  // Derived data
  // -------------------------------------------------------------------------

  const filteredIfaces =
    config?.interfaces.filter(
      (i) => !ifaceSearch || i.name.toLowerCase().includes(ifaceSearch.toLowerCase())
    ) ?? [];

  const ifaceCount = config?.interfaces.length ?? 0;
  const rpCount = config?.rp?.addresses.length ?? 0;

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
          Retry
        </Button>
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-col h-full">
        {/* ================================================================ */}
        {/* Header                                                           */}
        {/* ================================================================ */}
        <div className="p-6 pb-4 border-b border-border">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-foreground">PIM Configuration</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Protocol Independent Multicast routing
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
            <div className="mb-4 p-3 rounded-md bg-destructive/10 text-destructive text-sm flex items-start gap-2">
              <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
              {error}
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
                    <p className="text-xs text-muted-foreground">Interfaces</p>
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
                    <p className="text-xs text-muted-foreground">RP Addresses</p>
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
                        {config?.ecmp ? "Enabled" : "Disabled"}
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
              <TabsTrigger value="general">General</TabsTrigger>
              <TabsTrigger value="interfaces">Interfaces</TabsTrigger>
              <TabsTrigger value="rp">Rendezvous Points</TabsTrigger>
            </TabsList>
          </div>
          <div className="flex-1 overflow-auto p-6">
              {/* ============================================================ */}
              {/* General Tab                                                   */}
              {/* ============================================================ */}
              <TabsContent value="general" className="space-y-6 mt-0">
                {/* Edit/Save/Cancel buttons */}
                {hasWritePermission && (
                  <div className="flex items-center gap-2">
                    {generalEditing ? (
                      <>
                        <Button size="sm" onClick={saveGeneral} disabled={generalSaving}>
                          {generalSaving ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : (
                            <Save className="mr-2 h-4 w-4" />
                          )}
                          Save
                        </Button>
                        <Button size="sm" variant="outline" onClick={cancelEditGeneral} disabled={generalSaving}>
                          Cancel
                        </Button>
                      </>
                    ) : (
                      <Button size="sm" variant="outline" onClick={startEditGeneral}>
                        <Pencil className="mr-2 h-4 w-4" />
                        Edit
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
                    <h3 className="text-sm font-semibold">Multicast Settings</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="pim-ecmp"
                          checked={generalEditing ? ecmp : config?.ecmp ?? false}
                          onCheckedChange={(c) => setEcmp(!!c)}
                          disabled={!generalEditing}
                        />
                        <Label htmlFor="pim-ecmp">ECMP</Label>
                      </div>
                      {(generalEditing ? ecmp : config?.ecmp) && (
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="pim-ecmp-rebalance"
                            checked={generalEditing ? ecmpRebalance : config?.ecmp_rebalance ?? false}
                            onCheckedChange={(c) => setEcmpRebalance(!!c)}
                            disabled={!generalEditing}
                          />
                          <Label htmlFor="pim-ecmp-rebalance">ECMP Rebalance</Label>
                        </div>
                      )}
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="pim-no-v6"
                          checked={generalEditing ? noV6Secondary : config?.no_v6_secondary ?? false}
                          onCheckedChange={(c) => setNoV6Secondary(!!c)}
                          disabled={!generalEditing}
                        />
                        <Label htmlFor="pim-no-v6">No IPv6 Secondary</Label>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Timers */}
                <Card>
                  <CardContent className="p-5 space-y-4">
                    <h3 className="text-sm font-semibold">Timers</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="pim-join-prune">Join/Prune Interval (1-65535s)</Label>
                        <Input
                          id="pim-join-prune"
                          type="number"
                          value={generalEditing ? joinPruneInterval : (config?.join_prune_interval != null ? String(config.join_prune_interval) : "")}
                          onChange={(e) => setJoinPruneInterval(e.target.value)}
                          disabled={!generalEditing}
                          placeholder="Default"
                          min={1}
                          max={65535}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="pim-keepalive">Keep Alive Timer (1-65535s)</Label>
                        <Input
                          id="pim-keepalive"
                          type="number"
                          value={generalEditing ? keepAliveTimer : (config?.keep_alive_timer != null ? String(config.keep_alive_timer) : "")}
                          onChange={(e) => setKeepAliveTimer(e.target.value)}
                          disabled={!generalEditing}
                          placeholder="Default"
                          min={1}
                          max={65535}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="pim-reg-suppress">Register Suppress Time (1-65535s)</Label>
                        <Input
                          id="pim-reg-suppress"
                          type="number"
                          value={generalEditing ? registerSuppressTime : (config?.register_suppress_time != null ? String(config.register_suppress_time) : "")}
                          onChange={(e) => setRegisterSuppressTime(e.target.value)}
                          disabled={!generalEditing}
                          placeholder="Default"
                          min={1}
                          max={65535}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="pim-packets">Packets (1-255)</Label>
                        <Input
                          id="pim-packets"
                          type="number"
                          value={generalEditing ? packets : (config?.packets != null ? String(config.packets) : "")}
                          onChange={(e) => setPackets(e.target.value)}
                          disabled={!generalEditing}
                          placeholder="Default"
                          min={1}
                          max={255}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* IGMP */}
                <Card>
                  <CardContent className="p-5 space-y-4">
                    <h3 className="text-sm font-semibold">IGMP</h3>
                    <div className="space-y-2">
                      <Label htmlFor="pim-igmp-watermark">Watermark Warning (1-65535)</Label>
                      <Input
                        id="pim-igmp-watermark"
                        type="number"
                        value={generalEditing ? igmpWatermarkWarning : (config?.igmp_watermark_warning != null ? String(config.igmp_watermark_warning) : "")}
                        onChange={(e) => setIgmpWatermarkWarning(e.target.value)}
                        disabled={!generalEditing}
                        placeholder="Default"
                        min={1}
                        max={65535}
                        className="max-w-xs"
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* Prefix Lists */}
                <Card>
                  <CardContent className="p-5 space-y-4">
                    <h3 className="text-sm font-semibold">Prefix Lists</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="pim-reg-accept">Register Accept List (prefix-list)</Label>
                        <Input
                          id="pim-reg-accept"
                          value={generalEditing ? registerAcceptListPrefixList : (config?.register_accept_list_prefix_list || "")}
                          onChange={(e) => setRegisterAcceptListPrefixList(e.target.value)}
                          disabled={!generalEditing}
                          placeholder="Prefix list name"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="pim-ssm">SSM Prefix List</Label>
                        <Input
                          id="pim-ssm"
                          value={generalEditing ? ssmPrefixList : (config?.ssm_prefix_list || "")}
                          onChange={(e) => setSsmPrefixList(e.target.value)}
                          disabled={!generalEditing}
                          placeholder="Prefix list name"
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* SPT Switchover */}
                <Card>
                  <CardContent className="p-5 space-y-4">
                    <h3 className="text-sm font-semibold">SPT Switchover</h3>
                    <div className="space-y-3">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="pim-spt-infinity"
                          checked={generalEditing ? sptInfinityAndBeyond : config?.spt_switchover?.infinity_and_beyond ?? false}
                          onCheckedChange={(c) => setSptInfinityAndBeyond(!!c)}
                          disabled={!generalEditing}
                        />
                        <Label htmlFor="pim-spt-infinity">Infinity and Beyond</Label>
                      </div>
                      {(generalEditing ? sptInfinityAndBeyond : config?.spt_switchover?.infinity_and_beyond) && (
                        <div className="ml-6 space-y-2">
                          <Label htmlFor="pim-spt-prefix">Prefix List</Label>
                          <Input
                            id="pim-spt-prefix"
                            value={generalEditing ? sptPrefixList : (config?.spt_switchover?.prefix_list || "")}
                            onChange={(e) => setSptPrefixList(e.target.value)}
                            disabled={!generalEditing}
                            placeholder="Prefix list name"
                            className="max-w-xs"
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
                      placeholder="Search interfaces..."
                      className="pl-9"
                    />
                    {ifaceSearch && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                        onClick={() => setIfaceSearch("")}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  {hasWritePermission && (
                    <Button size="sm" onClick={() => { setEditingIface(null); setIfaceModalOpen(true); }}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Interface
                    </Button>
                  )}
                </div>

                {filteredIfaces.length === 0 ? (
                  <Card>
                    <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                      <Network className="h-10 w-10 mb-3 opacity-50" />
                      <p className="text-sm font-medium">No PIM interfaces configured</p>
                      <p className="text-xs mt-1">Add an interface to enable PIM multicast routing.</p>
                      {hasWritePermission && (
                        <Button variant="outline" size="sm" className="mt-4" onClick={() => { setEditingIface(null); setIfaceModalOpen(true); }}>
                          <Plus className="h-4 w-4 mr-2" />
                          Add Interface
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                ) : (
                  <Card>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Interface</TableHead>
                          <TableHead>BFD</TableHead>
                          <TableHead>DR Priority</TableHead>
                          <TableHead>Hello</TableHead>
                          <TableHead>Flags</TableHead>
                          <TableHead>IGMP</TableHead>
                          {hasWritePermission && <TableHead className="text-right">Actions</TableHead>}
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
                                <span className="text-muted-foreground text-sm">Off</span>
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
                                <span className="font-mono text-sm">{iface.hello}s</span>
                              ) : (
                                <span className="text-muted-foreground text-sm">-</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-wrap gap-1">
                                {iface.passive && <Badge variant="outline" className="text-xs">Passive</Badge>}
                                {iface.no_bsm && <Badge variant="outline" className="text-xs">No BSM</Badge>}
                                {iface.no_unicast_bsm && <Badge variant="outline" className="text-xs">No UBSM</Badge>}
                                {!iface.passive && !iface.no_bsm && !iface.no_unicast_bsm && (
                                  <span className="text-muted-foreground text-sm">-</span>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              {iface.igmp ? (
                                <Badge variant={iface.igmp.disabled ? "secondary" : "default"} className="text-xs">
                                  {iface.igmp.disabled ? "Disabled" : `Active${iface.igmp.joins.length > 0 ? ` (${iface.igmp.joins.length} joins)` : ""}`}
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
                        <Label htmlFor="rp-keep-alive">RP Keep Alive Timer (1-65535s)</Label>
                        {rpTimerEditing ? (
                          <Input
                            id="rp-keep-alive"
                            type="number"
                            value={rpKeepAliveTimer}
                            onChange={(e) => setRpKeepAliveTimer(e.target.value)}
                            placeholder="Default"
                            min={1}
                            max={65535}
                          />
                        ) : (
                          <p className="text-sm font-mono">
                            {config?.rp?.keep_alive_timer != null ? `${config.rp.keep_alive_timer}s` : "Default"}
                          </p>
                        )}
                      </div>
                      {hasWritePermission && (
                        <div className="flex items-center gap-2">
                          {rpTimerEditing ? (
                            <>
                              <Button size="sm" onClick={saveRpTimer} disabled={rpTimerSaving}>
                                {rpTimerSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                                Save
                              </Button>
                              <Button size="sm" variant="outline" onClick={() => { setRpTimerEditing(false); setRpTimerError(null); }} disabled={rpTimerSaving}>
                                Cancel
                              </Button>
                            </>
                          ) : (
                            <Button size="sm" variant="outline" onClick={startEditRpTimer}>
                              <Pencil className="mr-2 h-4 w-4" />
                              Edit
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
                  <h3 className="text-sm font-semibold">RP Addresses</h3>
                  {hasWritePermission && (
                    <Button size="sm" onClick={() => { setEditingRp(null); setRpModalOpen(true); }}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add RP Address
                    </Button>
                  )}
                </div>

                {(config?.rp?.addresses.length ?? 0) === 0 ? (
                  <Card>
                    <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                      <MapPin className="h-10 w-10 mb-3 opacity-50" />
                      <p className="text-sm font-medium">No RP addresses configured</p>
                      <p className="text-xs mt-1">Add a Rendezvous Point address for PIM multicast routing.</p>
                      {hasWritePermission && (
                        <Button variant="outline" size="sm" className="mt-4" onClick={() => { setEditingRp(null); setRpModalOpen(true); }}>
                          <Plus className="h-4 w-4 mr-2" />
                          Add RP Address
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                ) : (
                  <Card>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Address</TableHead>
                          <TableHead>Groups</TableHead>
                          {hasWritePermission && <TableHead className="text-right">Actions</TableHead>}
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
                                  <span className="text-muted-foreground text-sm">All groups</span>
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
                                    onClick={() => { setEditingRp(rp); setRpModalOpen(true); }}
                                  >
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-destructive hover:text-destructive"
                                    onClick={() => setDeletingRp(rp)}
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
        open={ifaceModalOpen}
        onOpenChange={(open) => {
          setIfaceModalOpen(open);
          if (!open) setEditingIface(null);
        }}
        onSubmit={editingIface ? handleUpdateInterface : handleCreateInterface}
        existingInterface={editingIface}
      />

      <PimRpAddressModal
        open={rpModalOpen}
        onOpenChange={(open) => {
          setRpModalOpen(open);
          if (!open) setEditingRp(null);
        }}
        onSubmit={editingRp ? handleUpdateRp : handleCreateRp}
        existingRp={editingRp}
      />

      {deletingIface && (
        <DeletePimItemModal
          open={!!deletingIface}
          onOpenChange={(open) => { if (!open) setDeletingIface(null); }}
          itemType="interface"
          itemName={deletingIface.name}
          onConfirm={handleDeleteInterface}
        />
      )}

      {deletingRp && (
        <DeletePimItemModal
          open={!!deletingRp}
          onOpenChange={(open) => { if (!open) setDeletingRp(null); }}
          itemType="rp-address"
          itemName={deletingRp.address}
          onConfirm={handleDeleteRp}
        />
      )}
    </>
  );
}
