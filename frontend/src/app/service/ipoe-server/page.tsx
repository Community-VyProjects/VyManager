"use client";

export const dynamic = "force-dynamic";

import { useState, useEffect } from "react";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  Wifi,
  Plus,
  RefreshCw,
  Loader2,
  AlertCircle,
  Pencil,
  Trash2,
  Server,
  Network,
  Shield,
  Key,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ipoeServerService, type IPoEConfigResponse, type IPoECapabilities, type IPoEInterface, type IPoEAuthMac, type IPoERadiusServer, type IPoEClientIPPool, type IPoEClientIPv6Pool } from "@/lib/api/ipoe-server";
import { usePermissions } from "@/hooks/usePermissions";
import { FeatureGroup } from "@/lib/api/user-management";
import {
  DeleteConfirmModal,
  GeneralSettingsModal,
  AuthSettingsModal,
  InterfaceModal,
  AuthMacModal,
  RadiusServerModal,
  RadiusSettingsModal,
  IPPoolModal,
  IPv6PoolModal,
  AdvancedSettingsModal,
} from "@/components/ipoe-server";

function IPoEPageInner() {
  const t = useTranslations("ipoeServer");
  const tc = useTranslations("common");
  const searchParams = useSearchParams();
  const { canRead, canWrite } = usePermissions();
  const hasRead = canRead(FeatureGroup.IPOE_SERVER);
  const hasWrite = canWrite(FeatureGroup.IPOE_SERVER);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [config, setConfig] = useState<IPoEConfigResponse | null>(null);
  const [capabilities, setCapabilities] = useState<IPoECapabilities | null>(null);
  const [activeTab, setActiveTab] = useState("overview");

  // Local auth: currently viewed interface
  const [selectedAuthIface, setSelectedAuthIface] = useState("");

  // Modal state
  const [showGeneralModal, setShowGeneralModal] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showAdvancedModal, setShowAdvancedModal] = useState(false);
  const [showRadiusSettingsModal, setShowRadiusSettingsModal] = useState(false);

  const [showInterfaceModal, setShowInterfaceModal] = useState(false);
  const [editingInterface, setEditingInterface] = useState<IPoEInterface | null>(null);

  const [showMacModal, setShowMacModal] = useState(false);
  const [editingMac, setEditingMac] = useState<IPoEAuthMac | null>(null);

  const [showRadiusServerModal, setShowRadiusServerModal] = useState(false);
  const [editingRadiusServer, setEditingRadiusServer] = useState<IPoERadiusServer | null>(null);

  const [showIPPoolModal, setShowIPPoolModal] = useState(false);
  const [editingIPPool, setEditingIPPool] = useState<IPoEClientIPPool | null>(null);

  const [showIPv6PoolModal, setShowIPv6PoolModal] = useState(false);
  const [editingIPv6Pool, setEditingIPv6Pool] = useState<IPoEClientIPv6Pool | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<{
    type: string;
    name: string;
    onDelete: () => Promise<import("@/lib/api/ipoe-server").VyOSResponse>;
    warning?: string;
  } | null>(null);

  const fetchConfig = async (refresh = false) => {
    try {
      setLoading(true);
      setError(null);
      const [configData, capsData] = await Promise.all([
        ipoeServerService.getConfig(refresh),
        ipoeServerService.getCapabilities(),
      ]);
      setConfig(configData);
      setCapabilities(capsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("errors.loadIpoeConfig"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (hasRead) fetchConfig();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- load once when read access is known; a language switch re-renders via router.refresh()
  }, [hasRead]);

  useEffect(() => {
    setActiveTab(searchParams.get("tab") ?? "overview");
  }, [searchParams]);

  // Keep selected auth interface valid
  useEffect(() => {
    if (config && (config.authentication.interfaces?.length ?? 0) > 0) {
      const names = (config.authentication.interfaces ?? []).map((ai) => ai.interface);
      if (!selectedAuthIface || !names.includes(selectedAuthIface)) {
        setSelectedAuthIface(names[0]);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps -- auto-select a valid interface once the config loads
  }, [config]);

  const onSuccess = () => fetchConfig(true);

  const selectedAuthIfaceData = config?.authentication.interfaces?.find(
    (ai) => ai.interface === selectedAuthIface
  );

  if (loading && !config) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-[calc(100vh-200px)]">
          <div className="text-center space-y-4">
            <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
            <p className="text-muted-foreground">{t("loadingConfig")}</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (error && !config) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-[calc(100vh-200px)]">
          <div className="text-center space-y-4">
            <AlertCircle className="h-12 w-12 text-destructive mx-auto" />
            <p className="text-destructive font-medium">{t("errors.loadConfig")}</p>
            <p className="text-sm text-muted-foreground">{error}</p>
            <Button onClick={() => fetchConfig(true)}>
              <RefreshCw className="h-4 w-4 mr-2" /> {tc("retry")}
            </Button>
          </div>
        </div>
      </AppLayout>
    );
  }

  const totals = config?.totals;

  return (
    <AppLayout>
      <div className="flex flex-col h-full overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b bg-background">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-primary/10">
                <Wifi className="h-8 w-8 text-primary" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-bold">{t("title")}</h1>
                  {config?.configured ? (
                    <Badge variant="secondary" className="bg-green-500/10 text-green-600">{t("configured")}</Badge>
                  ) : (
                    <Badge variant="secondary">{t("notConfigured")}</Badge>
                  )}
                </div>
                <p className="text-muted-foreground">{t("subtitle")}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {hasWrite && config?.configured && (
                <Button
                  variant="outline"
                  size="sm"
                  className="text-destructive hover:bg-destructive/10"
                  onClick={() => setDeleteTarget({
                    type: t("deleteTypes.ipoeServer"),
                    name: t("deleteServer.name"),
                    onDelete: () => ipoeServerService.deleteIPoEServer(),
                    warning: t("deleteServer.warning"),
                  })}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  {t("deleteServer.button")}
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={() => fetchConfig(true)} disabled={loading}>
                <RefreshCw className={cn("h-4 w-4 mr-2", loading && "animate-spin")} />
                {tc("refresh")}
              </Button>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-5 gap-3 mt-4">
            <Card className="p-3">
              <div className="flex items-center gap-2">
                <Network className="h-4 w-4 text-blue-500" />
                <div>
                  <p className="text-xs text-muted-foreground">{t("stats.interfaces")}</p>
                  <p className="font-semibold">{totals?.interfaces ?? 0}</p>
                </div>
              </div>
            </Card>
            <Card className="p-3">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-orange-500" />
                <div>
                  <p className="text-xs text-muted-foreground">{t("stats.authInterfaces")}</p>
                  <p className="font-semibold">{totals?.auth_interfaces ?? 0}</p>
                </div>
              </div>
            </Card>
            <Card className="p-3">
              <div className="flex items-center gap-2">
                <Server className="h-4 w-4 text-purple-500" />
                <div>
                  <p className="text-xs text-muted-foreground">{t("stats.radiusServers")}</p>
                  <p className="font-semibold">{totals?.radius_servers ?? 0}</p>
                </div>
              </div>
            </Card>
            <Card className="p-3">
              <div className="flex items-center gap-2">
                <Network className="h-4 w-4 text-green-500" />
                <div>
                  <p className="text-xs text-muted-foreground">{t("stats.ipPools")}</p>
                  <p className="font-semibold">{totals?.client_ip_pools ?? 0}</p>
                </div>
              </div>
            </Card>
            <Card className="p-3">
              <div className="flex items-center gap-2">
                <Network className="h-4 w-4 text-cyan-500" />
                <div>
                  <p className="text-xs text-muted-foreground">{t("stats.ipv6Pools")}</p>
                  <p className="font-semibold">{totals?.client_ipv6_pools ?? 0}</p>
                </div>
              </div>
            </Card>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex-1 overflow-hidden">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col h-full">
            <div className="px-6 pt-4 border-b">
              <TabsList>
                <TabsTrigger value="overview">{t("tabs.overview")}</TabsTrigger>
                <TabsTrigger value="interfaces">{t("tabs.interfaces")}</TabsTrigger>
                <TabsTrigger value="local-auth">{t("tabs.localAuth")}</TabsTrigger>
                <TabsTrigger value="radius">RADIUS</TabsTrigger>
                <TabsTrigger value="pools">{t("tabs.ipPools")}</TabsTrigger>
                <TabsTrigger value="ipv6pools">{t("tabs.ipv6Pools")}</TabsTrigger>
                <TabsTrigger value="advanced">{t("tabs.advanced")}</TabsTrigger>
              </TabsList>
            </div>

            <div className="flex-1 overflow-auto">
              <div className="p-6">

                {/* Overview Tab */}
                <TabsContent value="overview" className="mt-0">
                  <div className="grid grid-cols-2 gap-6">
                    <Card className="p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-medium">{t("overview.generalSettings")}</h4>
                        {hasWrite && (
                          <Button variant="ghost" size="sm" onClick={() => setShowGeneralModal(true)}>
                            <Pencil className="h-3 w-3 mr-1" /> {tc("edit")}
                          </Button>
                        )}
                      </div>
                      <div className="space-y-2 text-sm">
                        <InfoRow label={tc("description")} value={config?.description} />
                        <InfoRow label={t("overview.defaultPool")} value={config?.default_pool} />
                        <InfoRow label={t("overview.defaultIpv6Pool")} value={config?.default_ipv6_pool} />
                        <InfoRow label={t("overview.gatewayAddresses")} value={(config?.gateway_addresses || []).join(", ")} />
                        <InfoRow label={t("overview.nameServers")} value={(config?.name_servers || []).join(", ")} />
                        <InfoRow label={t("overview.maxSessions")} value={config?.max_concurrent_sessions} />
                        <InfoRow label={t("overview.threads")} value={config?.thread_count} />
                        <InfoRow label={t("overview.luaFile")} value={config?.lua_file} />
                      </div>
                    </Card>

                    <Card className="p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-medium">{t("overview.authSettings")}</h4>
                        {hasWrite && (
                          <Button variant="ghost" size="sm" onClick={() => setShowAuthModal(true)}>
                            <Pencil className="h-3 w-3 mr-1" /> {tc("edit")}
                          </Button>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        <Key className="h-4 w-4 text-muted-foreground" />
                        <Badge variant="outline" className="text-sm">
                          {config?.authentication.mode || tc("notSet")}
                        </Badge>
                      </div>
                    </Card>
                  </div>
                </TabsContent>

                {/* Interfaces Tab */}
                <TabsContent value="interfaces" className="mt-0">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold">{t("interfaces.title")}</h3>
                    {hasWrite && (
                      <Button size="sm" onClick={() => { setEditingInterface(null); setShowInterfaceModal(true); }}>
                        <Plus className="h-4 w-4 mr-1" /> {t("interfaces.add")}
                      </Button>
                    )}
                  </div>
                  {(config?.interfaces.length ?? 0) === 0 ? (
                    <EmptyState icon={Network} label={t("interfaces.empty")} />
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>{t("interfaces.interface")}</TableHead>
                          <TableHead>{t("interfaces.mode")}</TableHead>
                          <TableHead>{t("interfaces.network")}</TableHead>
                          <TableHead>{t("interfaces.startSession")}</TableHead>
                          <TableHead>{t("interfaces.clientSubnet")}</TableHead>
                          <TableHead>VLANs</TableHead>
                          {hasWrite && <TableHead className="text-right">{tc("actions")}</TableHead>}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {config?.interfaces.map((iface) => (
                          <TableRow key={iface.interface} className="group">
                            <TableCell className="font-medium font-mono">{iface.interface}</TableCell>
                            <TableCell><Badge variant="outline">{iface.mode || "-"}</Badge></TableCell>
                            <TableCell>{iface.network || "-"}</TableCell>
                            <TableCell>{iface.start_session || "-"}</TableCell>
                            <TableCell>
                              {iface.client_subnet ? (
                                <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{iface.client_subnet}</code>
                              ) : "-"}
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-wrap gap-1">
                                {(iface.vlans || []).slice(0, 3).map((v) => (
                                  <Badge key={v} variant="secondary" className="text-xs font-mono">{v}</Badge>
                                ))}
                                {(iface.vlans || []).length > 3 && (
                                  <Badge variant="secondary" className="text-xs">+{(iface.vlans || []).length - 3}</Badge>
                                )}
                                {(iface.vlans || []).length === 0 && "-"}
                              </div>
                            </TableCell>
                            {hasWrite && (
                              <TableCell className="text-right">
                                <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditingInterface(iface); setShowInterfaceModal(true); }}>
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                  <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-destructive/10" onClick={() => setDeleteTarget({
                                    type: t("deleteTypes.interface"),
                                    name: iface.interface,
                                    onDelete: () => ipoeServerService.deleteInterface(iface.interface),
                                  })}>
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                  </Button>
                                </div>
                              </TableCell>
                            )}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </TabsContent>

                {/* Local Auth Tab */}
                <TabsContent value="local-auth" className="mt-0">
                  {config?.authentication.mode !== "local" ? (
                    <Card className="p-6 text-center">
                      <Shield className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
                      <p className="font-medium">{t("localAuth.inactive")}</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        {t("localAuth.inactiveHelp")}{" "}
                        {t("localAuth.currentMode")} <Badge variant="outline">{config?.authentication.mode || t("localAuth.notSet")}</Badge>
                      </p>
                    </Card>
                  ) : (
                    <>
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <h3 className="font-semibold">{t("localAuth.title")}</h3>
                          {(config.authentication.interfaces?.length ?? 0) > 0 && (
                            <Select value={selectedAuthIface} onValueChange={setSelectedAuthIface}>
                              <SelectTrigger className="w-36 h-8 text-sm">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {(config.authentication.interfaces ?? []).map((ai) => (
                                  <SelectItem key={ai.interface} value={ai.interface}>{ai.interface}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                        </div>
                        {hasWrite && (
                          <Button size="sm" onClick={() => { setEditingMac(null); setShowMacModal(true); }}>
                            <Plus className="h-4 w-4 mr-1" /> {t("localAuth.addMac")}
                          </Button>
                        )}
                      </div>

                      {(config.authentication.interfaces?.length ?? 0) === 0 ? (
                        <EmptyState icon={Shield} label={t("localAuth.noInterfaces")} />
                      ) : !selectedAuthIfaceData || selectedAuthIfaceData.macs.length === 0 ? (
                        <EmptyState icon={Shield} label={t("localAuth.noMacs")} />
                      ) : (
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>{t("localAuth.macAddress")}</TableHead>
                              <TableHead>{t("localAuth.ipAddress")}</TableHead>
                              <TableHead>VLAN</TableHead>
                              <TableHead>{t("localAuth.rateDown")}</TableHead>
                              <TableHead>{t("localAuth.rateUp")}</TableHead>
                              {hasWrite && <TableHead className="text-right">{tc("actions")}</TableHead>}
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {selectedAuthIfaceData.macs.map((mac) => (
                              <TableRow key={mac.mac} className="group">
                                <TableCell className="font-mono">{mac.mac}</TableCell>
                                <TableCell>
                                  {mac.ip_address ? (
                                    <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{mac.ip_address}</code>
                                  ) : "-"}
                                </TableCell>
                                <TableCell>{mac.vlan || "-"}</TableCell>
                                <TableCell>{mac.rate_limit?.download || "-"}</TableCell>
                                <TableCell>{mac.rate_limit?.upload || "-"}</TableCell>
                                {hasWrite && (
                                  <TableCell className="text-right">
                                    <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditingMac(mac); setShowMacModal(true); }}>
                                        <Pencil className="h-4 w-4" />
                                      </Button>
                                      <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-destructive/10" onClick={() => setDeleteTarget({
                                        type: t("deleteTypes.macEntry"),
                                        name: mac.mac,
                                        onDelete: () => ipoeServerService.deleteAuthMac(selectedAuthIface, mac.mac),
                                      })}>
                                        <Trash2 className="h-4 w-4 text-destructive" />
                                      </Button>
                                    </div>
                                  </TableCell>
                                )}
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      )}
                    </>
                  )}
                </TabsContent>

                {/* RADIUS Tab */}
                <TabsContent value="radius" className="mt-0">
                  <div className="mb-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-semibold">{t("radius.settingsTitle")}</h3>
                      {hasWrite && (
                        <Button variant="outline" size="sm" onClick={() => setShowRadiusSettingsModal(true)}>
                          <Pencil className="h-3 w-3 mr-1" /> {t("radius.editSettings")}
                        </Button>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-6">
                      <Card className="p-4 space-y-2 text-sm">
                        <h4 className="text-sm font-medium mb-2">{t("radius.general")}</h4>
                        <InfoRow label={t("radius.sourceAddress")} value={config?.authentication.radius?.source_address} />
                        <InfoRow label={t("radius.timeout")} value={config?.authentication.radius?.timeout} />
                        <InfoRow label={t("radius.maxTry")} value={config?.authentication.radius?.max_try} />
                        <InfoRow label={t("radius.nasIdentifier")} value={config?.authentication.radius?.nas_identifier} />
                        <InfoRow label="NAS IP" value={config?.authentication.radius?.nas_ip_address} />
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">{t("radius.preallocateVif")}</span>
                          <Badge variant={config?.authentication.radius?.preallocate_vif ? "default" : "secondary"}>
                            {config?.authentication.radius?.preallocate_vif ? t("yes") : t("no")}
                          </Badge>
                        </div>
                        <InfoRow label={t("radius.acctInterval")} value={config?.authentication.radius?.accounting_interim_interval} />
                      </Card>
                      <Card className="p-4 space-y-2 text-sm">
                        <h4 className="text-sm font-medium mb-2">{t("radius.daeRateLimit")}</h4>
                        <InfoRow label={t("radius.daeServer")} value={config?.authentication.radius?.dynamic_author?.server} />
                        <InfoRow label={t("radius.daePort")} value={config?.authentication.radius?.dynamic_author?.port} />
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">{t("radius.rateLimit")}</span>
                          <Badge variant={config?.authentication.radius?.rate_limit?.enable ? "default" : "secondary"}>
                            {config?.authentication.radius?.rate_limit?.enable ? tc("enabled") : tc("disabled")}
                          </Badge>
                        </div>
                        <InfoRow label={t("radius.attribute")} value={config?.authentication.radius?.rate_limit?.attribute} />
                        <InfoRow label={t("radius.multiplier")} value={config?.authentication.radius?.rate_limit?.multiplier} />
                      </Card>
                    </div>
                  </div>

                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold">{t("radius.serversTitle")}</h3>
                    {hasWrite && (
                      <Button size="sm" onClick={() => { setEditingRadiusServer(null); setShowRadiusServerModal(true); }}>
                        <Plus className="h-4 w-4 mr-1" /> {t("radius.addServer")}
                      </Button>
                    )}
                  </div>
                  {(config?.authentication.radius?.servers?.length ?? 0) === 0 ? (
                    <EmptyState icon={Server} label={t("radius.noServers")} />
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>{t("radius.address")}</TableHead>
                          <TableHead>{t("radius.port")}</TableHead>
                          <TableHead>{t("radius.acctPort")}</TableHead>
                          <TableHead>{t("radius.priority")}</TableHead>
                          <TableHead>{tc("status")}</TableHead>
                          {hasWrite && <TableHead className="text-right">{tc("actions")}</TableHead>}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(config?.authentication.radius?.servers ?? []).map((srv) => (
                          <TableRow key={srv.address} className="group">
                            <TableCell>
                              <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{srv.address}</code>
                            </TableCell>
                            <TableCell>{srv.port || "1812"}</TableCell>
                            <TableCell>{srv.acct_port || "1813"}</TableCell>
                            <TableCell>{srv.priority || "-"}</TableCell>
                            <TableCell>
                              <div className="flex gap-1">
                                {srv.disabled ? (
                                  <Badge variant="secondary" className="bg-red-500/10 text-red-600">{tc("disabled")}</Badge>
                                ) : (
                                  <Badge variant="secondary" className="bg-green-500/10 text-green-600">{t("radius.active")}</Badge>
                                )}
                                {srv.backup && <Badge variant="outline">{t("radius.backup")}</Badge>}
                              </div>
                            </TableCell>
                            {hasWrite && (
                              <TableCell className="text-right">
                                <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditingRadiusServer(srv); setShowRadiusServerModal(true); }}>
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                  <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-destructive/10" onClick={() => setDeleteTarget({
                                    type: t("deleteTypes.radiusServer"),
                                    name: srv.address,
                                    onDelete: () => ipoeServerService.deleteRadiusServer(srv.address),
                                  })}>
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                  </Button>
                                </div>
                              </TableCell>
                            )}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </TabsContent>

                {/* IP Pools Tab */}
                <TabsContent value="pools" className="mt-0">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold">{t("pools.ipv4Title")}</h3>
                    {hasWrite && (
                      <Button size="sm" onClick={() => { setEditingIPPool(null); setShowIPPoolModal(true); }}>
                        <Plus className="h-4 w-4 mr-1" /> {t("pools.addPool")}
                      </Button>
                    )}
                  </div>
                  {(config?.client_ip_pools.length ?? 0) === 0 ? (
                    <EmptyState icon={Network} label={t("pools.noIpv4Pools")} />
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>{tc("name")}</TableHead>
                          <TableHead>{t("pools.ranges")}</TableHead>
                          <TableHead>{t("pools.nextPool")}</TableHead>
                          {hasWrite && <TableHead className="text-right">{tc("actions")}</TableHead>}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {config?.client_ip_pools.map((pool) => (
                          <TableRow key={pool.name} className="group">
                            <TableCell className="font-medium">{pool.name}</TableCell>
                            <TableCell>
                              <div className="flex flex-wrap gap-1">
                                {(pool.ranges || []).map((r) => (
                                  <Badge key={r} variant="secondary" className="font-mono text-xs">{r}</Badge>
                                ))}
                                {(pool.ranges || []).length === 0 && "-"}
                              </div>
                            </TableCell>
                            <TableCell>{pool.next_pool || "-"}</TableCell>
                            {hasWrite && (
                              <TableCell className="text-right">
                                <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditingIPPool(pool); setShowIPPoolModal(true); }}>
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                  <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-destructive/10" onClick={() => setDeleteTarget({
                                    type: t("deleteTypes.ipPool"),
                                    name: pool.name,
                                    onDelete: () => ipoeServerService.deleteIPPool(pool.name),
                                  })}>
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                  </Button>
                                </div>
                              </TableCell>
                            )}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </TabsContent>

                {/* IPv6 Pools Tab */}
                <TabsContent value="ipv6pools" className="mt-0">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold">{t("pools.ipv6Title")}</h3>
                    {hasWrite && (
                      <Button size="sm" onClick={() => { setEditingIPv6Pool(null); setShowIPv6PoolModal(true); }}>
                        <Plus className="h-4 w-4 mr-1" /> {t("pools.addPool")}
                      </Button>
                    )}
                  </div>
                  {(config?.client_ipv6_pools.length ?? 0) === 0 ? (
                    <EmptyState icon={Network} label={t("pools.noIpv6Pools")} />
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>{tc("name")}</TableHead>
                          <TableHead>{t("pools.prefixes")}</TableHead>
                          <TableHead>{t("pools.delegates")}</TableHead>
                          {hasWrite && <TableHead className="text-right">{tc("actions")}</TableHead>}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {config?.client_ipv6_pools.map((pool) => (
                          <TableRow key={pool.name} className="group">
                            <TableCell className="font-medium">{pool.name}</TableCell>
                            <TableCell>
                              <div className="flex flex-wrap gap-1">
                                {(pool.prefixes || []).map((p, i) => (
                                  <Badge key={i} variant="outline" className="text-xs font-mono">
                                    {p.prefix}{p.mask ? ` /${p.mask}` : ""}
                                  </Badge>
                                ))}
                                {(!pool.prefixes || pool.prefixes.length === 0) && "-"}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-wrap gap-1">
                                {(pool.delegates || []).map((d, i) => (
                                  <Badge key={i} variant="outline" className="text-xs font-mono">
                                    {d.prefix}{d.delegation_prefix ? ` /${d.delegation_prefix}` : ""}
                                  </Badge>
                                ))}
                                {(!pool.delegates || pool.delegates.length === 0) && "-"}
                              </div>
                            </TableCell>
                            {hasWrite && (
                              <TableCell className="text-right">
                                <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditingIPv6Pool(pool); setShowIPv6PoolModal(true); }}>
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                  <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-destructive/10" onClick={() => setDeleteTarget({
                                    type: t("deleteTypes.ipv6Pool"),
                                    name: pool.name,
                                    onDelete: () => ipoeServerService.deleteIPv6Pool(pool.name),
                                  })}>
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                  </Button>
                                </div>
                              </TableCell>
                            )}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </TabsContent>

                {/* Advanced Tab */}
                <TabsContent value="advanced" className="mt-0">
                  <Card className="p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-medium">{t("advanced.title")}</h4>
                      {hasWrite && (
                        <Button variant="ghost" size="sm" onClick={() => setShowAdvancedModal(true)}>
                          <Pencil className="h-3 w-3 mr-1" /> {tc("edit")}
                        </Button>
                      )}
                    </div>
                    <div className="space-y-2 text-sm">
                      <InfoRow label={t("advanced.logLevel")} value={config?.log?.level} />
                      <InfoRow label={t("advanced.shaperFwmark")} value={config?.shaper?.fwmark} />
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">{t("advanced.snmpMasterAgent")}</span>
                        <Badge variant={config?.snmp?.master_agent ? "default" : "secondary"}>
                          {config?.snmp?.master_agent ? t("yes") : t("no")}
                        </Badge>
                      </div>
                      <InfoRow label={t("advanced.limitsBurst")} value={config?.limits?.burst} />
                      <InfoRow label={t("advanced.connLimit")} value={config?.limits?.connection_limit} />
                      <InfoRow label={t("advanced.limitsTimeout")} value={config?.limits?.timeout} />
                      <InfoRow label={t("advanced.scriptOnChange")} value={config?.extended_scripts?.on_change} />
                      <InfoRow label={t("advanced.scriptOnDown")} value={config?.extended_scripts?.on_down} />
                      <InfoRow label={t("advanced.scriptOnPreUp")} value={config?.extended_scripts?.on_pre_up} />
                      <InfoRow label={t("advanced.scriptOnUp")} value={config?.extended_scripts?.on_up} />
                    </div>
                  </Card>
                </TabsContent>

              </div>
            </div>
          </Tabs>
        </div>
      </div>

      {/* Modals */}
      {config && (
        <>
          <GeneralSettingsModal
            open={showGeneralModal}
            onOpenChange={setShowGeneralModal}
            onSuccess={onSuccess}
            config={config}
          />
          <AuthSettingsModal
            open={showAuthModal}
            onOpenChange={setShowAuthModal}
            onSuccess={onSuccess}
            currentMode={config.authentication.mode}
          />
          <RadiusSettingsModal
            open={showRadiusSettingsModal}
            onOpenChange={setShowRadiusSettingsModal}
            onSuccess={onSuccess}
            currentSettings={config.authentication.radius ?? { servers: [] }}
          />
          <AdvancedSettingsModal
            open={showAdvancedModal}
            onOpenChange={setShowAdvancedModal}
            onSuccess={onSuccess}
            config={config}
          />
        </>
      )}

      <InterfaceModal
        open={showInterfaceModal}
        onOpenChange={(open) => { setShowInterfaceModal(open); if (!open) setEditingInterface(null); }}
        onSuccess={onSuccess}
        existingInterface={editingInterface}
        capabilities={capabilities}
      />
      <AuthMacModal
        open={showMacModal}
        onOpenChange={(open) => { setShowMacModal(open); if (!open) setEditingMac(null); }}
        onSuccess={onSuccess}
        existingMac={editingMac}
        preselectedInterface={selectedAuthIface}
        authInterfaces={config?.authentication.interfaces ?? []}
      />
      <RadiusServerModal
        open={showRadiusServerModal}
        onOpenChange={(open) => { setShowRadiusServerModal(open); if (!open) setEditingRadiusServer(null); }}
        onSuccess={onSuccess}
        existingServer={editingRadiusServer}
      />
      <IPPoolModal
        open={showIPPoolModal}
        onOpenChange={(open) => { setShowIPPoolModal(open); if (!open) setEditingIPPool(null); }}
        onSuccess={onSuccess}
        existingPool={editingIPPool}
      />
      <IPv6PoolModal
        open={showIPv6PoolModal}
        onOpenChange={(open) => { setShowIPv6PoolModal(open); if (!open) setEditingIPv6Pool(null); }}
        onSuccess={onSuccess}
        existingPool={editingIPv6Pool}
      />
      {deleteTarget && (
        <DeleteConfirmModal
          open={!!deleteTarget}
          onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}
          onSuccess={onSuccess}
          itemType={deleteTarget.type}
          itemName={deleteTarget.name}
          onDelete={deleteTarget.onDelete}
          warning={deleteTarget.warning}
        />
      )}
    </AppLayout>
  );
}

function InfoRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span>{value || "-"}</span>
    </div>
  );
}

function EmptyState({ icon: Icon, label }: { icon: React.ComponentType<{ className?: string }>; label: string }) {
  return (
    <div className="text-center py-12">
      <Icon className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
      <p className="text-muted-foreground">{label}</p>
    </div>
  );
}

export default function IPoEServerPage() {
  return (
    <Suspense>
      <IPoEPageInner />
    </Suspense>
  );
}
