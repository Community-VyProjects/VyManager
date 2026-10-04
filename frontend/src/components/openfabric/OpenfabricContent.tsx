"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  openfabricService,
  OpenfabricConfig,
  OpenfabricCapabilities,
  OpenfabricDomainConfig,
  OpenfabricInterfaceConfig,
} from "@/lib/api/openfabric";
import { OpenfabricDomainModal } from "./OpenfabricDomainModal";
import { OpenfabricInterfaceModal } from "./OpenfabricInterfaceModal";
import { usePermissions } from "@/hooks/usePermissions";
import { FeatureGroup } from "@/lib/api/user-management";

// ============================================================================
// Main Component
// ============================================================================

export function OpenfabricContent() {
  const t = useTranslations("openfabric");
  const tc = useTranslations("common");
  const { canWrite } = usePermissions();
  const hasWritePermission = canWrite(FeatureGroup.OPENFABRIC);

  const [config, setConfig] = useState<OpenfabricConfig | null>(null);
  const [capabilities, setCapabilities] = useState<OpenfabricCapabilities | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("overview");

  // Domain modal
  const [domainModalOpen, setDomainModalOpen] = useState(false);
  const [editingDomain, setEditingDomain] = useState<OpenfabricDomainConfig | null>(null);
  const [deletingDomain, setDeletingDomain] = useState<OpenfabricDomainConfig | null>(null);
  const [domainSearch, setDomainSearch] = useState("");

  // Interface modal
  const [ifaceModalOpen, setIfaceModalOpen] = useState(false);
  const [editingIface, setEditingIface] = useState<OpenfabricInterfaceConfig | null>(null);
  const [deletingIface, setDeletingIface] = useState<{ domain: string; iface: OpenfabricInterfaceConfig } | null>(null);
  const [selectedDomain, setSelectedDomain] = useState<string>("");

  // NET editing
  const [netEditing, setNetEditing] = useState(false);
  const [netValue, setNetValue] = useState("");
  const [netSaving, setNetSaving] = useState(false);
  const [netError, setNetError] = useState<string | null>(null);

  // -------------------------------------------------------------------------
  // Load data
  // -------------------------------------------------------------------------

  const loadData = useCallback(async (refresh = false) => {
    try {
      setLoading(true);
      setError(null);
      const [configData, capsData] = await Promise.all([
        openfabricService.getConfig(refresh),
        openfabricService.getCapabilities(),
      ]);
      setConfig(configData);
      setCapabilities(capsData);
      // Auto-select first domain if none selected
      if (!selectedDomain && configData.domains.length > 0) {
        setSelectedDomain(configData.domains[0].name);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t("content.loadFailed"));
    } finally {
      setLoading(false);
    }
  }, [selectedDomain, t]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // -------------------------------------------------------------------------
  // NET handlers
  // -------------------------------------------------------------------------

  const startEditNet = () => {
    setNetValue(config?.net || "");
    setNetEditing(true);
    setNetError(null);
  };

  const saveNet = async () => {
    try {
      setNetSaving(true);
      setNetError(null);
      const newNet = netValue.trim();
      const oldNet = config?.net;

      if (oldNet && oldNet !== newNet) {
        await openfabricService.deleteNet(oldNet);
      }
      if (newNet) {
        await openfabricService.setNet(newNet);
      }

      await loadData(true);
      setNetEditing(false);
    } catch (err) {
      setNetError(err instanceof Error ? err.message : t("content.saveNetFailed"));
    } finally {
      setNetSaving(false);
    }
  };

  // -------------------------------------------------------------------------
  // Domain handlers
  // -------------------------------------------------------------------------

  const handleCreateDomain = async (domain: OpenfabricDomainConfig) => {
    await openfabricService.createDomain(domain);
    await loadData(true);
  };

  const handleUpdateDomain = async (domain: OpenfabricDomainConfig) => {
    if (!editingDomain) return;
    await openfabricService.updateDomain(editingDomain, domain);
    setEditingDomain(null);
    await loadData(true);
  };

  const handleDeleteDomain = async () => {
    if (!deletingDomain) return;
    await openfabricService.deleteDomain(deletingDomain.name);
    setDeletingDomain(null);
    if (selectedDomain === deletingDomain.name) {
      setSelectedDomain("");
    }
    await loadData(true);
  };

  // -------------------------------------------------------------------------
  // Interface handlers
  // -------------------------------------------------------------------------

  const handleCreateInterface = async (iface: OpenfabricInterfaceConfig) => {
    if (!selectedDomain) return;
    await openfabricService.createInterface(selectedDomain, iface);
    await loadData(true);
  };

  const handleUpdateInterface = async (iface: OpenfabricInterfaceConfig) => {
    if (!editingIface || !selectedDomain) return;
    await openfabricService.updateInterface(selectedDomain, editingIface.name, iface);
    setEditingIface(null);
    await loadData(true);
  };

  const handleDeleteInterface = async () => {
    if (!deletingIface) return;
    await openfabricService.deleteInterface(deletingIface.domain, deletingIface.iface.name);
    setDeletingIface(null);
    await loadData(true);
  };

  // -------------------------------------------------------------------------
  // Derived data
  // -------------------------------------------------------------------------

  const totalInterfaces = config?.domains.reduce((sum, d) => sum + d.interfaces.length, 0) ?? 0;
  const domainCount = config?.domains.length ?? 0;

  const filteredDomains =
    config?.domains.filter(
      (d) => !domainSearch || d.name.toLowerCase().includes(domainSearch.toLowerCase())
    ) ?? [];

  const currentDomain = config?.domains.find((d) => d.name === selectedDomain);

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

  // Version guard
  if (capabilities && !capabilities.features.openfabric.supported) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">{t("content.notAvailable")}</p>
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
              <h1 className="text-2xl font-bold text-foreground">{t("content.title")}</h1>
              <p className="text-sm text-muted-foreground mt-1">
                {t("content.subtitle")}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {!hasWritePermission && (
                <Badge variant="secondary">{tc("readOnly")}</Badge>
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
          <div className="grid grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-md p-2 bg-primary/10">
                    <Shield className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">NET</p>
                    <p className="text-xs text-muted-foreground font-mono mt-0.5">
                      {config?.net || tc("notSet")}
                    </p>
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
                    <p className="text-2xl font-bold">{domainCount}</p>
                    <p className="text-xs text-muted-foreground">{t("content.domainsStat", { count: domainCount })}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-md p-2 bg-green-500/10">
                    <Network className="h-4 w-4 text-green-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{totalInterfaces}</p>
                    <p className="text-xs text-muted-foreground">{t("content.interfacesStat", { count: totalInterfaces })}</p>
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
              <TabsTrigger value="overview">{t("content.overviewTab")}</TabsTrigger>
              <TabsTrigger value="domains">
                {t("content.domains")}
                {domainCount > 0 && <Badge variant="secondary" className="ml-2">{domainCount}</Badge>}
              </TabsTrigger>
              <TabsTrigger value="interfaces">
                {t("content.interfaces")}
                {totalInterfaces > 0 && <Badge variant="secondary" className="ml-2">{totalInterfaces}</Badge>}
              </TabsTrigger>
            </TabsList>

            {/* ============================================================ */}
            {/* Overview Tab                                                  */}
            {/* ============================================================ */}
            <TabsContent value="overview">
              {/* NET Section */}
              <Card className="mb-6">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold">{t("content.netAddress")}</h3>
                    {hasWritePermission && !netEditing && (
                      <Button size="sm" variant="outline" onClick={startEditNet}>
                        <Pencil className="h-4 w-4 mr-2" />
                        {tc("edit")}
                      </Button>
                    )}
                    {netEditing && (
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => { setNetEditing(false); setNetError(null); }}>
                          {tc("cancel")}
                        </Button>
                        <Button size="sm" onClick={saveNet} disabled={netSaving}>
                          {netSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                          {tc("save")}
                        </Button>
                      </div>
                    )}
                  </div>
                  {netError && (
                    <div className="mb-3 p-3 rounded-md bg-destructive/10 text-destructive text-sm flex items-start gap-2">
                      <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                      <pre className="whitespace-pre-wrap font-sans">{netError}</pre>
                    </div>
                  )}
                  {netEditing ? (
                    <Input
                      value={netValue}
                      onChange={(e) => setNetValue(e.target.value)}
                      placeholder={t("eg", { value: "49.0001.1921.6800.1001.00" })}
                      className="font-mono text-sm"
                    />
                  ) : (
                    <p className="font-mono text-sm text-muted-foreground">
                      {config?.net || t("content.noNet")}
                    </p>
                  )}
                </CardContent>
              </Card>

              {/* Domain Summary Cards */}
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold">{t("content.domains")}</h3>
                {hasWritePermission && (
                  <Button
                    size="sm"
                    onClick={() => { setEditingDomain(null); setDomainModalOpen(true); }}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    {t("content.addDomain")}
                  </Button>
                )}
              </div>

              {domainCount === 0 ? (
                <p className="text-sm text-muted-foreground">{t("content.noDomainsSummary")}</p>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  {config?.domains.map((domain) => (
                    <Card key={domain.name}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <p className="font-medium">{domain.name}</p>
                            <div className="flex items-center gap-2 mt-1">
                              {domain.fabric_tier != null && (
                                <Badge variant="outline">{t("content.tier", { tier: String(domain.fabric_tier) })}</Badge>
                              )}
                              <span className="text-xs text-muted-foreground">
                                {t("content.interfaceCount", { count: domain.interfaces.length })}
                              </span>
                            </div>
                          </div>
                          {hasWritePermission && (
                            <div className="flex gap-1">
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8"
                                onClick={() => { setEditingDomain(domain); setDomainModalOpen(true); }}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8 text-destructive hover:text-destructive"
                                onClick={() => setDeletingDomain(domain)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-1 mt-2">
                          {domain.log_adjacency_changes && <Badge variant="secondary" className="text-xs">{t("content.logAdj")}</Badge>}
                          {domain.purge_originator && <Badge variant="secondary" className="text-xs">{t("content.purgeOrig")}</Badge>}
                          {domain.set_overload_bit && <Badge variant="secondary" className="text-xs">{t("content.overload")}</Badge>}
                          {domain.domain_password_type && (
                            <Badge variant="secondary" className="text-xs">{t("content.auth", { type: domain.domain_password_type })}</Badge>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* ============================================================ */}
            {/* Domains Tab                                                   */}
            {/* ============================================================ */}
            <TabsContent value="domains">
              <div className="flex items-center justify-between mb-4">
                <div className="relative w-64">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder={t("content.searchDomains")}
                    value={domainSearch}
                    onChange={(e) => setDomainSearch(e.target.value)}
                    className="pl-8"
                  />
                  {domainSearch && (
                    <button
                      onClick={() => setDomainSearch("")}
                      className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
                {hasWritePermission && (
                  <Button size="sm" onClick={() => { setEditingDomain(null); setDomainModalOpen(true); }}>
                    <Plus className="h-4 w-4 mr-2" />
                    {t("content.addDomain")}
                  </Button>
                )}
              </div>

              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{tc("name")}</TableHead>
                      <TableHead>{t("content.fabricTier")}</TableHead>
                      <TableHead>{t("content.interfaces")}</TableHead>
                      <TableHead>{t("content.flags")}</TableHead>
                      <TableHead>{t("content.password")}</TableHead>
                      {hasWritePermission && <TableHead className="w-[100px]">{tc("actions")}</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredDomains.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={hasWritePermission ? 6 : 5} className="text-center text-muted-foreground">
                          {domainSearch ? t("content.noMatchingDomains") : t("content.noDomains")}
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredDomains.map((domain) => (
                        <TableRow key={domain.name}>
                          <TableCell className="font-medium">{domain.name}</TableCell>
                          <TableCell>
                            {domain.fabric_tier != null ? (
                              <Badge variant="outline">{t("content.tier", { tier: String(domain.fabric_tier) })}</Badge>
                            ) : (
                              <span className="text-muted-foreground text-sm">{t("content.auto")}</span>
                            )}
                          </TableCell>
                          <TableCell>{domain.interfaces.length}</TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {domain.log_adjacency_changes && <Badge variant="secondary" className="text-xs">{t("content.logAdj")}</Badge>}
                              {domain.purge_originator && <Badge variant="secondary" className="text-xs">{t("content.purgeOrig")}</Badge>}
                              {domain.set_overload_bit && <Badge variant="secondary" className="text-xs">{t("content.overload")}</Badge>}
                              {!domain.log_adjacency_changes && !domain.purge_originator && !domain.set_overload_bit && (
                                <span className="text-muted-foreground text-sm">{tc("none")}</span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            {domain.domain_password_type ? (
                              <Badge variant="outline" className="text-xs">{domain.domain_password_type}</Badge>
                            ) : (
                              <span className="text-muted-foreground text-sm">{tc("none")}</span>
                            )}
                          </TableCell>
                          {hasWritePermission && (
                            <TableCell>
                              <div className="flex gap-1">
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-8 w-8"
                                  onClick={() => { setEditingDomain(domain); setDomainModalOpen(true); }}
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-8 w-8 text-destructive hover:text-destructive"
                                  onClick={() => setDeletingDomain(domain)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          )}
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>

            {/* ============================================================ */}
            {/* Interfaces Tab                                                */}
            {/* ============================================================ */}
            <TabsContent value="interfaces">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-4">
                  <div className="w-64">
                    <Select value={selectedDomain} onValueChange={setSelectedDomain}>
                      <SelectTrigger>
                        <SelectValue placeholder={t("content.selectDomain")} />
                      </SelectTrigger>
                      <SelectContent>
                        {config?.domains.map((d) => (
                          <SelectItem key={d.name} value={d.name}>
                            {d.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                {hasWritePermission && selectedDomain && (
                  <Button
                    size="sm"
                    onClick={() => { setEditingIface(null); setIfaceModalOpen(true); }}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    {tc("addInterface")}
                  </Button>
                )}
              </div>

              {!selectedDomain ? (
                <p className="text-sm text-muted-foreground">{t("content.selectDomainHint")}</p>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{tc("name")}</TableHead>
                        <TableHead>{t("content.addressFamily")}</TableHead>
                        <TableHead>{t("content.metric")}</TableHead>
                        <TableHead>{t("content.passive")}</TableHead>
                        <TableHead>{t("content.helloInterval")}</TableHead>
                        <TableHead>{t("content.password")}</TableHead>
                        {hasWritePermission && <TableHead className="w-[100px]">{tc("actions")}</TableHead>}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(!currentDomain || currentDomain.interfaces.length === 0) ? (
                        <TableRow>
                          <TableCell colSpan={hasWritePermission ? 7 : 6} className="text-center text-muted-foreground">
                            {t("content.noInterfaces")}
                          </TableCell>
                        </TableRow>
                      ) : (
                        currentDomain.interfaces.map((iface) => (
                          <TableRow key={iface.name}>
                            <TableCell className="font-mono font-medium">{iface.name}</TableCell>
                            <TableCell>
                              <div className="flex gap-1">
                                {iface.address_family_ipv4 && <Badge variant="secondary" className="text-xs">IPv4</Badge>}
                                {iface.address_family_ipv6 && <Badge variant="secondary" className="text-xs">IPv6</Badge>}
                                {!iface.address_family_ipv4 && !iface.address_family_ipv6 && (
                                  <span className="text-muted-foreground text-sm">{tc("none")}</span>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              {iface.metric != null ? iface.metric : <span className="text-muted-foreground text-sm">{tc("default")}</span>}
                            </TableCell>
                            <TableCell>
                              {iface.passive ? (
                                <Badge variant="secondary" className="text-xs">{t("content.yes")}</Badge>
                              ) : (
                                <span className="text-muted-foreground text-sm">{t("content.no")}</span>
                              )}
                            </TableCell>
                            <TableCell>
                              {iface.hello_interval != null ? `${iface.hello_interval}s` : <span className="text-muted-foreground text-sm">{tc("default")}</span>}
                            </TableCell>
                            <TableCell>
                              {iface.password_type ? (
                                <Badge variant="outline" className="text-xs">{iface.password_type}</Badge>
                              ) : (
                                <span className="text-muted-foreground text-sm">{tc("none")}</span>
                              )}
                            </TableCell>
                            {hasWritePermission && (
                              <TableCell>
                                <div className="flex gap-1">
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-8 w-8"
                                    onClick={() => { setEditingIface(iface); setIfaceModalOpen(true); }}
                                  >
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-8 w-8 text-destructive hover:text-destructive"
                                    onClick={() => setDeletingIface({ domain: selectedDomain, iface })}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </TableCell>
                            )}
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Domain Modal */}
      <OpenfabricDomainModal
        open={domainModalOpen}
        onOpenChange={(open) => {
          setDomainModalOpen(open);
          if (!open) setEditingDomain(null);
        }}
        onSubmit={editingDomain ? handleUpdateDomain : handleCreateDomain}
        existingDomain={editingDomain}
        capabilities={capabilities}
      />

      {/* Interface Modal */}
      <OpenfabricInterfaceModal
        open={ifaceModalOpen}
        onOpenChange={(open) => {
          setIfaceModalOpen(open);
          if (!open) setEditingIface(null);
        }}
        onSubmit={editingIface ? handleUpdateInterface : handleCreateInterface}
        existingInterface={editingIface}
        capabilities={capabilities}
      />

      {/* Delete Domain Confirmation */}
      <AlertDialog open={!!deletingDomain} onOpenChange={(open) => !open && setDeletingDomain(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("content.deleteDomainTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("content.deleteDomainDescription", { name: deletingDomain?.name ?? "" })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{tc("cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteDomain}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {tc("delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Interface Confirmation */}
      <AlertDialog open={!!deletingIface} onOpenChange={(open) => !open && setDeletingIface(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{tc("deleteInterface")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("content.deleteInterfaceDescription", { name: deletingIface?.iface.name ?? "", domain: deletingIface?.domain ?? "" })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{tc("cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteInterface}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {tc("delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
