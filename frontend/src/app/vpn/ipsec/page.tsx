"use client";

export const dynamic = 'force-dynamic';

import { useState, useEffect } from "react";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
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
  Shield,
  Plus,
  RefreshCw,
  Loader2,
  AlertCircle,
  Pencil,
  Trash2,
  Network,
  Key,
  Wifi,
  Database,
  Settings,
  Lock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  ipsecService,
  type IPSecConfigResponse,
  type IPSecCapabilities,
  type IKEGroup,
  type ESPGroup,
  type SiteToSitePeer,
  type RAConnection,
  type RAPool,
  type AuthPSK,
  type IPSecStatus,
} from "@/lib/api/ipsec";
import { usePermissions } from "@/hooks/usePermissions";
import { FeatureGroup } from "@/lib/api/user-management";
import {
  IKEGroupModal,
  ESPGroupModal,
  SiteToSiteModal,
  RemoteAccessModal,
  PoolModal,
  AuthPSKModal,
  DeleteConfirmModal,
  SettingsModal,
} from "@/components/vpn/ipsec";

function IPSecPageInner() {
  const t = useTranslations("ipsec");
  const tc = useTranslations("common");
  const searchParams = useSearchParams();
  const { canRead, canWrite } = usePermissions();
  const hasRead = canRead(FeatureGroup.IPSEC);
  const hasWrite = canWrite(FeatureGroup.IPSEC);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [config, setConfig] = useState<IPSecConfigResponse | null>(null);
  const [capabilities, setCapabilities] = useState<IPSecCapabilities | null>(null);
  const [activeTab, setActiveTab] = useState("s2s");

  // Modal state
  const [showIKEModal, setShowIKEModal] = useState(false);
  const [editingIKE, setEditingIKE] = useState<IKEGroup | null>(null);
  const [showESPModal, setShowESPModal] = useState(false);
  const [editingESP, setEditingESP] = useState<ESPGroup | null>(null);
  const [showS2SModal, setShowS2SModal] = useState(false);
  const [editingS2S, setEditingS2S] = useState<SiteToSitePeer | null>(null);
  const [showRAModal, setShowRAModal] = useState(false);
  const [editingRA, setEditingRA] = useState<RAConnection | null>(null);
  const [showPoolModal, setShowPoolModal] = useState(false);
  const [editingPool, setEditingPool] = useState<RAPool | null>(null);
  const [showPSKModal, setShowPSKModal] = useState(false);
  const [editingPSK, setEditingPSK] = useState<AuthPSK | null>(null);
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  // Delete modal
  const [deleteTarget, setDeleteTarget] = useState<{
    type: string;
    name: string;
    onDelete: () => Promise<import("@/lib/api/ipsec").VyOSResponse>;
    warning?: string;
  } | null>(null);

  const fetchConfig = async (refresh = false) => {
    try {
      setLoading(true);
      setError(null);
      const [configData, capsData] = await Promise.all([
        ipsecService.getConfig(refresh),
        ipsecService.getCapabilities(),
      ]);
      setConfig(configData);
      setCapabilities(capsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("page.loadConfigFailed"));
    } finally {
      setLoading(false);
    }
  };

  // ---- Live tunnel status (operational, separate from config) ----
  const [tunnelStatus, setTunnelStatus] = useState<IPSecStatus | null>(null);
  const [statusLoading, setStatusLoading] = useState(false);
  const [bouncing, setBouncing] = useState<string | null>(null);
  const [statusMsg, setStatusMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const refreshStatus = async () => {
    try {
      setStatusLoading(true);
      setTunnelStatus(await ipsecService.getStatus());
    } catch {
      // Status is best-effort; leave the last snapshot in place on failure.
    } finally {
      setStatusLoading(false);
    }
  };

  /** Live tunnels belonging to a peer (names look like "<peer>-tunnel-<n>"). */
  const peerTunnels = (peerName: string) =>
    (tunnelStatus?.tunnels ?? []).filter((t) => (t.name ?? "").startsWith(`${peerName}-tunnel-`));

  const bouncePeer = async (peerName: string) => {
    setBouncing(peerName);
    setStatusMsg(null);
    try {
      await ipsecService.resetPeer(peerName);
      setStatusMsg({ type: "ok", text: t("page.bouncedPeer", { name: peerName }) });
      // Give strongSwan a moment to re-establish before re-reading state.
      await new Promise((r) => setTimeout(r, 2000));
      await refreshStatus();
    } catch (err) {
      setStatusMsg({ type: "err", text: err instanceof Error ? err.message : t("page.bouncePeerFailed") });
    } finally {
      setBouncing(null);
    }
  };

  const resetAllPeers = async () => {
    setBouncing("__all__");
    setStatusMsg(null);
    try {
      await ipsecService.resetAllPeers();
      setStatusMsg({ type: "ok", text: t("page.bouncedAll") });
      await new Promise((r) => setTimeout(r, 2000));
      await refreshStatus();
    } catch (err) {
      setStatusMsg({ type: "err", text: err instanceof Error ? err.message : t("page.bouncePeersFailed") });
    } finally {
      setBouncing(null);
    }
  };

  const resetRemoteAccess = async () => {
    setBouncing("__ra__");
    setStatusMsg(null);
    try {
      await ipsecService.resetRemoteAccess();
      setStatusMsg({ type: "ok", text: t("page.resetRaDone") });
    } catch (err) {
      setStatusMsg({ type: "err", text: err instanceof Error ? err.message : t("page.resetSessionsFailed") });
    } finally {
      setBouncing(null);
    }
  };

  useEffect(() => {
    if (hasRead) {
      fetchConfig();
      refreshStatus();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps -- load once on mount; a language switch re-renders via router.refresh()
  }, [hasRead]);

  useEffect(() => {
    setActiveTab(searchParams.get("tab") ?? "s2s");
  }, [searchParams]);

  const onSuccess = () => fetchConfig(true);

  // Loading state
  if (loading && !config) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-[calc(100vh-200px)]">
          <div className="text-center space-y-4">
            <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
            <p className="text-muted-foreground">{t("page.loadingConfig")}</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  // Error state
  if (error && !config) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-[calc(100vh-200px)]">
          <div className="text-center space-y-4">
            <AlertCircle className="h-12 w-12 text-destructive mx-auto" />
            <p className="text-destructive font-medium">{t("page.loadFailed")}</p>
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
                <Shield className="h-8 w-8 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">IPSec VPN</h1>
                <p className="text-muted-foreground">
                  {t("page.subtitle")}
                </p>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={() => fetchConfig(true)} disabled={loading}>
              <RefreshCw className={cn("h-4 w-4 mr-2", loading && "animate-spin")} />
              {tc("refresh")}
            </Button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-6 gap-3 mt-4">
            <Card className="p-3">
              <div className="flex items-center gap-2">
                <Network className="h-4 w-4 text-blue-500" />
                <div>
                  <p className="text-xs text-muted-foreground">{t("page.stats.s2sPeers")}</p>
                  <p className="font-semibold">{totals?.site_to_site_peers ?? 0}</p>
                </div>
              </div>
            </Card>
            <Card className="p-3">
              <div className="flex items-center gap-2">
                <Wifi className="h-4 w-4 text-green-500" />
                <div>
                  <p className="text-xs text-muted-foreground">{t("page.stats.raConns")}</p>
                  <p className="font-semibold">{totals?.remote_access_connections ?? 0}</p>
                </div>
              </div>
            </Card>
            <Card className="p-3">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-purple-500" />
                <div>
                  <p className="text-xs text-muted-foreground">{t("page.ikeGroups")}</p>
                  <p className="font-semibold">{totals?.ike_groups ?? 0}</p>
                </div>
              </div>
            </Card>
            <Card className="p-3">
              <div className="flex items-center gap-2">
                <Lock className="h-4 w-4 text-amber-500" />
                <div>
                  <p className="text-xs text-muted-foreground">{t("page.espGroups")}</p>
                  <p className="font-semibold">{totals?.esp_groups ?? 0}</p>
                </div>
              </div>
            </Card>
            <Card className="p-3">
              <div className="flex items-center gap-2">
                <Database className="h-4 w-4 text-cyan-500" />
                <div>
                  <p className="text-xs text-muted-foreground">{t("page.pools")}</p>
                  <p className="font-semibold">{totals?.remote_access_pools ?? 0}</p>
                </div>
              </div>
            </Card>
            <Card className="p-3">
              <div className="flex items-center gap-2">
                <Settings className="h-4 w-4 text-gray-500" />
                <div>
                  <p className="text-xs text-muted-foreground">{t("page.profiles")}</p>
                  <p className="font-semibold">{totals?.profiles ?? 0}</p>
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
                <TabsTrigger value="s2s">{t("page.tabs.siteToSite")}</TabsTrigger>
                <TabsTrigger value="ra">{t("page.tabs.remoteAccess")}</TabsTrigger>
                <TabsTrigger value="ike">{t("page.ikeGroups")}</TabsTrigger>
                <TabsTrigger value="esp">{t("page.espGroups")}</TabsTrigger>
                <TabsTrigger value="auth">{t("page.tabs.authentication")}</TabsTrigger>
                <TabsTrigger value="pools">{t("page.pools")}</TabsTrigger>
                <TabsTrigger value="settings">{t("page.tabs.settings")}</TabsTrigger>
              </TabsList>
            </div>

            <ScrollArea className="flex-1 min-h-0">
              <div className="p-6">
                {/* Site-to-Site Tab */}
                <TabsContent value="s2s" className="mt-0">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold">{t("page.s2s.title")}</h3>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" onClick={refreshStatus} disabled={statusLoading}>
                        <RefreshCw className={cn("h-4 w-4 mr-1", statusLoading && "animate-spin")} /> {t("page.s2s.refreshStatus")}
                      </Button>
                      {hasWrite && (config?.site_to_site_peers.length ?? 0) > 0 && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={resetAllPeers}
                          disabled={bouncing !== null}
                          title={t("page.s2s.resetAllTitle")}
                        >
                          {bouncing === "__all__" ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Lock className="h-4 w-4 mr-1" />}
                          {t("page.s2s.resetAll")}
                        </Button>
                      )}
                      {hasWrite && (
                        <Button size="sm" onClick={() => { setEditingS2S(null); setShowS2SModal(true); }}>
                          <Plus className="h-4 w-4 mr-1" /> {t("page.s2s.addPeer")}
                        </Button>
                      )}
                    </div>
                  </div>
                  {statusMsg && (
                    <div className={cn(
                      "mb-4 rounded-md border px-3 py-2 text-sm",
                      statusMsg.type === "ok"
                        ? "border-green-500/30 bg-green-500/10 text-green-700 dark:text-green-400"
                        : "border-destructive/30 bg-destructive/10 text-destructive",
                    )}>
                      {statusMsg.text}
                    </div>
                  )}
                  {(config?.site_to_site_peers.length ?? 0) === 0 ? (
                    <EmptyState icon={Network} label={t("page.s2s.empty")} />
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>{t("page.s2s.peer")}</TableHead>
                          <TableHead>{t("page.s2s.remoteAddress")}</TableHead>
                          <TableHead>{t("page.ikeGroup")}</TableHead>
                          <TableHead>{t("page.espGroup")}</TableHead>
                          <TableHead>VTI</TableHead>
                          <TableHead>{t("page.s2s.tunnels")}</TableHead>
                          <TableHead>{tc("status")}</TableHead>
                          {hasWrite && <TableHead className="text-right">{tc("actions")}</TableHead>}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {config?.site_to_site_peers.map((peer) => (
                          <TableRow key={peer.name} className="group">
                            <TableCell>
                              <div>
                                <span className="font-medium">{peer.name}</span>
                                {peer.description && <p className="text-xs text-muted-foreground">{peer.description}</p>}
                              </div>
                            </TableCell>
                            <TableCell>
                              <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
                                {(peer.remote_address || []).join(", ") || t("page.na")}
                              </code>
                            </TableCell>
                            <TableCell>{peer.ike_group || "-"}</TableCell>
                            <TableCell>{peer.default_esp_group || "-"}</TableCell>
                            <TableCell>
                              {peer.vti?.bind ? (
                                <Badge variant="secondary" className="font-mono text-xs">{peer.vti.bind}</Badge>
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </TableCell>
                            <TableCell><Badge variant="outline">{peer.tunnels.length}</Badge></TableCell>
                            <TableCell>
                              <div className="flex flex-col gap-1">
                                {peer.disabled ? (
                                  <Badge variant="secondary" className="bg-red-500/10 text-red-600 w-fit">{tc("disabled")}</Badge>
                                ) : (
                                  <Badge variant="secondary" className="bg-green-500/10 text-green-600 w-fit">{tc("enabled")}</Badge>
                                )}
                                {(() => {
                                  const lts = peerTunnels(peer.name);
                                  if (lts.length === 0) return null;
                                  const up = lts.filter((t) => (t.state ?? "").toLowerCase() === "up").length;
                                  const allUp = up === lts.length;
                                  return (
                                    <Badge
                                      variant="outline"
                                      className={cn(
                                        "text-xs w-fit gap-1",
                                        allUp ? "border-green-500/30 text-green-600" : "border-amber-500/30 text-amber-600",
                                      )}
                                      title={t("page.s2s.liveStatus")}
                                    >
                                      <span className={cn("inline-block h-1.5 w-1.5 rounded-full", allUp ? "bg-green-500" : "bg-amber-500")} />
                                      {t("page.s2s.tunnelsUp", { up, total: lts.length })}
                                    </Badge>
                                  );
                                })()}
                              </div>
                            </TableCell>
                            {hasWrite && (
                              <TableCell className="text-right">
                                <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8"
                                    disabled={bouncing !== null}
                                    onClick={() => bouncePeer(peer.name)}
                                    title={t("page.s2s.bounceTitle")}
                                  >
                                    {bouncing === peer.name ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                                  </Button>
                                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditingS2S(peer); setShowS2SModal(true); }}>
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                  <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-destructive/10" onClick={() => setDeleteTarget({
                                    type: t("page.types.s2sPeer"),
                                    name: peer.name,
                                    onDelete: () => ipsecService.deleteS2SPeer(peer.name),
                                    warning: peer.tunnels.length > 0 ? t("page.s2s.deleteWarning", { count: peer.tunnels.length }) : undefined,
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

                {/* Remote Access Tab */}
                <TabsContent value="ra" className="mt-0">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold">{t("page.ra.title")}</h3>
                    <div className="flex items-center gap-2">
                      {hasWrite && (config?.remote_access.connections.length ?? 0) > 0 && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={resetRemoteAccess}
                          disabled={bouncing !== null}
                          title={t("page.ra.resetSessionsTitle")}
                        >
                          {bouncing === "__ra__" ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-1" />}
                          {t("page.ra.resetSessions")}
                        </Button>
                      )}
                      {hasWrite && (
                        <Button size="sm" onClick={() => { setEditingRA(null); setShowRAModal(true); }}>
                          <Plus className="h-4 w-4 mr-1" /> {t("page.ra.addConnection")}
                        </Button>
                      )}
                    </div>
                  </div>
                  {statusMsg && activeTab === "ra" && (
                    <div className={cn(
                      "mb-4 rounded-md border px-3 py-2 text-sm",
                      statusMsg.type === "ok"
                        ? "border-green-500/30 bg-green-500/10 text-green-700 dark:text-green-400"
                        : "border-destructive/30 bg-destructive/10 text-destructive",
                    )}>
                      {statusMsg.text}
                    </div>
                  )}
                  {(config?.remote_access.connections.length ?? 0) === 0 ? (
                    <EmptyState icon={Wifi} label={t("page.ra.empty")} />
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>{t("page.types.connection")}</TableHead>
                          <TableHead>{t("page.ra.localAddress")}</TableHead>
                          <TableHead>{t("page.ikeGroup")}</TableHead>
                          <TableHead>{t("page.espGroup")}</TableHead>
                          <TableHead>{t("page.pools")}</TableHead>
                          <TableHead>{t("page.ra.auth")}</TableHead>
                          {hasWrite && <TableHead className="text-right">{tc("actions")}</TableHead>}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {config?.remote_access.connections.map((conn) => (
                          <TableRow key={conn.name} className="group">
                            <TableCell>
                              <div>
                                <span className="font-medium">{conn.name}</span>
                                {conn.description && <p className="text-xs text-muted-foreground">{conn.description}</p>}
                              </div>
                            </TableCell>
                            <TableCell><code className="text-xs bg-muted px-1.5 py-0.5 rounded">{conn.local_address || "any"}</code></TableCell>
                            <TableCell>{conn.ike_group || "-"}</TableCell>
                            <TableCell>{conn.esp_group || "-"}</TableCell>
                            <TableCell>{(conn.pools || []).join(", ") || "-"}</TableCell>
                            <TableCell><Badge variant="outline" className="text-xs">{conn.auth_server_mode || "psk"}</Badge></TableCell>
                            {hasWrite && (
                              <TableCell className="text-right">
                                <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditingRA(conn); setShowRAModal(true); }}>
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                  <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-destructive/10" onClick={() => setDeleteTarget({
                                    type: t("page.types.connection"), name: conn.name,
                                    onDelete: () => ipsecService.deleteRAConnection(conn.name),
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

                {/* IKE Groups Tab */}
                <TabsContent value="ike" className="mt-0">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold">{t("page.ikeGroups")}</h3>
                    {hasWrite && (
                      <Button size="sm" onClick={() => { setEditingIKE(null); setShowIKEModal(true); }}>
                        <Plus className="h-4 w-4 mr-1" /> {t("page.ike.add")}
                      </Button>
                    )}
                  </div>
                  {(config?.ike_groups.length ?? 0) === 0 ? (
                    <EmptyState icon={Shield} label={t("page.ike.empty")} />
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>{tc("name")}</TableHead>
                          <TableHead>{t("page.ike.keyExchange")}</TableHead>
                          <TableHead>{t("page.lifetime")}</TableHead>
                          <TableHead>DPD</TableHead>
                          <TableHead>{t("page.proposals")}</TableHead>
                          {hasWrite && <TableHead className="text-right">{tc("actions")}</TableHead>}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {config?.ike_groups.map((g) => (
                          <TableRow key={g.name} className="group">
                            <TableCell className="font-medium">{g.name}</TableCell>
                            <TableCell><Badge variant="outline">{g.key_exchange || "ikev2"}</Badge></TableCell>
                            <TableCell>{g.lifetime ? `${g.lifetime}s` : "-"}</TableCell>
                            <TableCell>{g.dpd_action || "none"}</TableCell>
                            <TableCell>{g.proposals.length}</TableCell>
                            {hasWrite && (
                              <TableCell className="text-right">
                                <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditingIKE(g); setShowIKEModal(true); }}>
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                  <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-destructive/10" onClick={() => setDeleteTarget({
                                    type: t("page.ikeGroup"), name: g.name,
                                    onDelete: () => ipsecService.deleteIKEGroup(g.name),
                                    warning: t("page.ike.deleteWarning"),
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

                {/* ESP Groups Tab */}
                <TabsContent value="esp" className="mt-0">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold">{t("page.espGroups")}</h3>
                    {hasWrite && (
                      <Button size="sm" onClick={() => { setEditingESP(null); setShowESPModal(true); }}>
                        <Plus className="h-4 w-4 mr-1" /> {t("page.esp.add")}
                      </Button>
                    )}
                  </div>
                  {(config?.esp_groups.length ?? 0) === 0 ? (
                    <EmptyState icon={Lock} label={t("page.esp.empty")} />
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>{tc("name")}</TableHead>
                          <TableHead>{t("page.esp.mode")}</TableHead>
                          <TableHead>PFS</TableHead>
                          <TableHead>{t("page.lifetime")}</TableHead>
                          <TableHead>{t("page.proposals")}</TableHead>
                          {hasWrite && <TableHead className="text-right">{tc("actions")}</TableHead>}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {config?.esp_groups.map((g) => (
                          <TableRow key={g.name} className="group">
                            <TableCell className="font-medium">{g.name}</TableCell>
                            <TableCell>{g.mode || "tunnel"}</TableCell>
                            <TableCell>{g.pfs || "-"}</TableCell>
                            <TableCell>{g.lifetime ? `${g.lifetime}s` : "-"}</TableCell>
                            <TableCell>{g.proposals.length}</TableCell>
                            {hasWrite && (
                              <TableCell className="text-right">
                                <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditingESP(g); setShowESPModal(true); }}>
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                  <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-destructive/10" onClick={() => setDeleteTarget({
                                    type: t("page.espGroup"), name: g.name,
                                    onDelete: () => ipsecService.deleteESPGroup(g.name),
                                    warning: t("page.esp.deleteWarning"),
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

                {/* Authentication Tab */}
                <TabsContent value="auth" className="mt-0">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold">{t("page.psk.title")}</h3>
                    {hasWrite && (
                      <Button size="sm" onClick={() => { setEditingPSK(null); setShowPSKModal(true); }}>
                        <Plus className="h-4 w-4 mr-1" /> {t("page.psk.add")}
                      </Button>
                    )}
                  </div>
                  {(config?.authentication.psk.length ?? 0) === 0 ? (
                    <EmptyState icon={Key} label={t("page.psk.empty")} />
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>{tc("name")}</TableHead>
                          <TableHead>{t("page.psk.identities")}</TableHead>
                          <TableHead>{t("page.psk.secret")}</TableHead>
                          <TableHead>{t("page.psk.type")}</TableHead>
                          {hasWrite && <TableHead className="text-right">{tc("actions")}</TableHead>}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {config?.authentication.psk.map((psk) => (
                          <TableRow key={psk.name} className="group">
                            <TableCell className="font-medium">{psk.name}</TableCell>
                            <TableCell>
                              <div className="flex flex-wrap gap-1">
                                {(psk.identities || []).slice(0, 3).map((id, i) => (
                                  <Badge key={i} variant="outline" className="text-xs font-mono">{id}</Badge>
                                ))}
                                {(psk.identities || []).length > 3 && (
                                  <Badge variant="secondary" className="text-xs">+{(psk.identities || []).length - 3}</Badge>
                                )}
                              </div>
                            </TableCell>
                            <TableCell><span className="text-muted-foreground">***</span></TableCell>
                            <TableCell>{psk.secret_type || "default"}</TableCell>
                            {hasWrite && (
                              <TableCell className="text-right">
                                <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditingPSK(psk); setShowPSKModal(true); }}>
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                  <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-destructive/10" onClick={() => setDeleteTarget({
                                    type: "PSK", name: psk.name,
                                    onDelete: () => ipsecService.deleteAuthPSK(psk.name),
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

                {/* Pools Tab */}
                <TabsContent value="pools" className="mt-0">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold">{t("page.pool.title")}</h3>
                    {hasWrite && (
                      <Button size="sm" onClick={() => { setEditingPool(null); setShowPoolModal(true); }}>
                        <Plus className="h-4 w-4 mr-1" /> {t("page.pool.add")}
                      </Button>
                    )}
                  </div>
                  {(config?.remote_access.pools.length ?? 0) === 0 ? (
                    <EmptyState icon={Database} label={t("page.pool.empty")} />
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>{tc("name")}</TableHead>
                          <TableHead>{t("page.pool.prefix")}</TableHead>
                          <TableHead>{t("page.pool.dnsServers")}</TableHead>
                          <TableHead>{t("page.pool.exclude")}</TableHead>
                          {capabilities?.features.pool_range.supported && <TableHead>{t("page.pool.range")}</TableHead>}
                          {hasWrite && <TableHead className="text-right">{tc("actions")}</TableHead>}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {config?.remote_access.pools.map((pool) => (
                          <TableRow key={pool.name} className="group">
                            <TableCell className="font-medium">{pool.name}</TableCell>
                            <TableCell>
                              <div className="flex flex-wrap gap-1">
                                {(pool.prefix || []).map((p, i) => (
                                  <Badge key={i} variant="outline" className="text-xs font-mono">{p}</Badge>
                                ))}
                              </div>
                            </TableCell>
                            <TableCell>{(pool.name_servers || []).join(", ") || "-"}</TableCell>
                            <TableCell>{(pool.exclude || []).join(", ") || "-"}</TableCell>
                            {capabilities?.features.pool_range.supported && (
                              <TableCell>
                                {pool.range_start && pool.range_stop
                                  ? `${pool.range_start} - ${pool.range_stop}`
                                  : "-"}
                              </TableCell>
                            )}
                            {hasWrite && (
                              <TableCell className="text-right">
                                <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditingPool(pool); setShowPoolModal(true); }}>
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                  <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-destructive/10" onClick={() => setDeleteTarget({
                                    type: t("page.types.pool"), name: pool.name,
                                    onDelete: () => ipsecService.deleteRAPool(pool.name),
                                    warning: t("page.pool.deleteWarning"),
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

                {/* Settings Tab */}
                <TabsContent value="settings" className="mt-0">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold">{t("page.settings.title")}</h3>
                    {hasWrite && (
                      <Button size="sm" onClick={() => setShowSettingsModal(true)}>
                        <Pencil className="h-4 w-4 mr-1" /> {t("page.settings.edit")}
                      </Button>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-6">
                    <Card className="p-4 space-y-3">
                      <h4 className="text-sm font-medium">{t("page.settings.options")}</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">{t("page.settings.disableRouteAutoinstall")}</span>
                          <Badge variant={config?.options.disable_route_autoinstall ? "default" : "secondary"}>
                            {config?.options.disable_route_autoinstall ? t("page.settings.yes") : t("page.settings.no")}
                          </Badge>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">FlexVPN</span>
                          <Badge variant={config?.options.flexvpn ? "default" : "secondary"}>
                            {config?.options.flexvpn ? tc("enabled") : tc("disabled")}
                          </Badge>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">{t("page.settings.virtualIp")}</span>
                          <Badge variant={config?.options.virtual_ip ? "default" : "secondary"}>
                            {config?.options.virtual_ip ? tc("enabled") : tc("disabled")}
                          </Badge>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">{t("page.settings.disableUniqReqIds")}</span>
                          <Badge variant={config?.disable_uniqreqids ? "default" : "secondary"}>
                            {config?.disable_uniqreqids ? t("page.settings.yes") : t("page.settings.no")}
                          </Badge>
                        </div>
                      </div>
                    </Card>
                    <Card className="p-4 space-y-3">
                      <h4 className="text-sm font-medium">{t("page.settings.logging")}</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">{t("page.settings.level")}</span>
                          <span>{config?.log.level || "default"}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">{t("page.settings.subsystems")}</span>
                          <span>{(config?.log.subsystems || []).join(", ") || "none"}</span>
                        </div>
                      </div>
                      {capabilities?.features.retransmission_options.supported && (
                        <>
                          <h4 className="text-sm font-medium pt-2">{t("page.settings.retransmission")}</h4>
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">{t("page.settings.attempts")}</span>
                              <span>{config?.options.retransmission_attempts || "default"}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">{t("page.settings.base")}</span>
                              <span>{config?.options.retransmission_base || "default"}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">{t("page.settings.timeout")}</span>
                              <span>{config?.options.retransmission_timeout || "default"}</span>
                            </div>
                          </div>
                        </>
                      )}
                    </Card>
                    <Card className="p-4 space-y-3">
                      <h4 className="text-sm font-medium">{t("page.settings.interfaces")}</h4>
                      {config?.interfaces && config.interfaces.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {config.interfaces.map((iface) => (
                            <Badge key={iface} variant="outline" className="font-mono">{iface}</Badge>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">{t("page.settings.noInterfaces")}</p>
                      )}
                    </Card>
                    {(config?.profiles.length ?? 0) > 0 && (
                      <Card className="p-4 space-y-3">
                        <h4 className="text-sm font-medium">{t("page.profiles")}</h4>
                        <div className="space-y-2 text-sm">
                          {config?.profiles.map((p) => (
                            <div key={p.name} className="flex justify-between">
                              <span className="font-medium">{p.name}</span>
                              <div className="flex gap-2">
                                {p.ike_group && <Badge variant="outline" className="text-xs">IKE: {p.ike_group}</Badge>}
                                {p.esp_group && <Badge variant="outline" className="text-xs">ESP: {p.esp_group}</Badge>}
                                {p.disabled && <Badge variant="secondary" className="text-xs bg-red-500/10 text-red-600">{tc("disabled")}</Badge>}
                              </div>
                            </div>
                          ))}
                        </div>
                      </Card>
                    )}
                  </div>
                </TabsContent>
              </div>
            </ScrollArea>
          </Tabs>
        </div>
      </div>

      {/* Modals */}
      <IKEGroupModal
        open={showIKEModal}
        onOpenChange={(open) => { setShowIKEModal(open); if (!open) setEditingIKE(null); }}
        onSuccess={onSuccess}
        capabilities={capabilities}
        existingGroup={editingIKE}
      />
      <ESPGroupModal
        open={showESPModal}
        onOpenChange={(open) => { setShowESPModal(open); if (!open) setEditingESP(null); }}
        onSuccess={onSuccess}
        capabilities={capabilities}
        existingGroup={editingESP}
      />
      <SiteToSiteModal
        open={showS2SModal}
        onOpenChange={(open) => { setShowS2SModal(open); if (!open) setEditingS2S(null); }}
        onSuccess={onSuccess}
        capabilities={capabilities}
        ikeGroups={config?.ike_groups || []}
        espGroups={config?.esp_groups || []}
        existingPeer={editingS2S}
      />
      <RemoteAccessModal
        open={showRAModal}
        onOpenChange={(open) => { setShowRAModal(open); if (!open) setEditingRA(null); }}
        onSuccess={onSuccess}
        capabilities={capabilities}
        ikeGroups={config?.ike_groups || []}
        espGroups={config?.esp_groups || []}
        pools={config?.remote_access.pools || []}
        existingConnection={editingRA}
      />
      <PoolModal
        open={showPoolModal}
        onOpenChange={(open) => { setShowPoolModal(open); if (!open) setEditingPool(null); }}
        onSuccess={onSuccess}
        capabilities={capabilities}
        existingPool={editingPool}
      />
      <AuthPSKModal
        open={showPSKModal}
        onOpenChange={(open) => { setShowPSKModal(open); if (!open) setEditingPSK(null); }}
        onSuccess={onSuccess}
        existingPSK={editingPSK}
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
      <SettingsModal
        open={showSettingsModal}
        onOpenChange={setShowSettingsModal}
        onSuccess={onSuccess}
        capabilities={capabilities}
        currentOptions={config?.options || {}}
        currentLog={config?.log || {}}
        currentInterfaces={config?.interfaces || []}
        disableUniqreqids={config?.disable_uniqreqids || false}
      />
    </AppLayout>
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

export default function IPSecPage() {
  return (
    <Suspense>
      <IPSecPageInner />
    </Suspense>
  );
}
