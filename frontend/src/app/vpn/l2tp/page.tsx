"use client";

export const dynamic = 'force-dynamic';

import { useState, useEffect } from "react";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
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
  Lock,
  Plus,
  RefreshCw,
  Loader2,
  AlertCircle,
  Pencil,
  Trash2,
  Users,
  Server,
  Network,
  Settings,
  Key,
  Shield,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  l2tpService,
  type L2TPConfigResponse,
  type L2TPCapabilities,
  type L2TPLocalUser,
  type L2TPRadiusServer,
  type L2TPClientIPPool,
  type L2TPClientIPv6Pool,
} from "@/lib/api/l2tp";
import { usePermissions } from "@/hooks/usePermissions";
import { FeatureGroup } from "@/lib/api/user-management";
import {
  DeleteConfirmModal,
  GeneralSettingsModal,
  LocalUserModal,
  IPPoolModal,
  IPv6PoolModal,
  IPSecSettingsModal,
  RadiusServerModal,
  RadiusSettingsModal,
  PPPOptionsModal,
  AdvancedSettingsModal,
  AuthSettingsModal,
} from "@/components/vpn/l2tp";

function L2TPPageInner() {
  const searchParams = useSearchParams();
  const { canRead, canWrite } = usePermissions();
  const hasRead = canRead(FeatureGroup.L2TP);
  const hasWrite = canWrite(FeatureGroup.L2TP);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [config, setConfig] = useState<L2TPConfigResponse | null>(null);
  const [capabilities, setCapabilities] = useState<L2TPCapabilities | null>(null);
  const [activeTab, setActiveTab] = useState("overview");

  // Modal state
  const [showGeneralModal, setShowGeneralModal] = useState(false);
  const [showIPSecModal, setShowIPSecModal] = useState(false);
  const [showPPPModal, setShowPPPModal] = useState(false);
  const [showAdvancedModal, setShowAdvancedModal] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showRadiusSettingsModal, setShowRadiusSettingsModal] = useState(false);

  const [showUserModal, setShowUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState<L2TPLocalUser | null>(null);

  const [showRadiusServerModal, setShowRadiusServerModal] = useState(false);
  const [editingRadiusServer, setEditingRadiusServer] = useState<L2TPRadiusServer | null>(null);

  const [showIPPoolModal, setShowIPPoolModal] = useState(false);
  const [editingIPPool, setEditingIPPool] = useState<L2TPClientIPPool | null>(null);

  const [showIPv6PoolModal, setShowIPv6PoolModal] = useState(false);
  const [editingIPv6Pool, setEditingIPv6Pool] = useState<L2TPClientIPv6Pool | null>(null);

  // Delete modal
  const [deleteTarget, setDeleteTarget] = useState<{
    type: string;
    name: string;
    onDelete: () => Promise<import("@/lib/api/l2tp").VyOSResponse>;
    warning?: string;
  } | null>(null);

  const fetchConfig = async (refresh = false) => {
    try {
      setLoading(true);
      setError(null);
      const [configData, capsData] = await Promise.all([
        l2tpService.getConfig(refresh),
        l2tpService.getCapabilities(),
      ]);
      setConfig(configData);
      setCapabilities(capsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load L2TP configuration");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (hasRead) fetchConfig();
  }, [hasRead]);

  useEffect(() => {
    setActiveTab(searchParams.get("tab") ?? "overview");
  }, [searchParams]);

  const onSuccess = () => fetchConfig(true);

  // Loading state
  if (loading && !config) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-[calc(100vh-200px)]">
          <div className="text-center space-y-4">
            <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
            <p className="text-muted-foreground">Loading L2TP configuration...</p>
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
            <p className="text-destructive font-medium">Failed to load configuration</p>
            <p className="text-sm text-muted-foreground">{error}</p>
            <Button onClick={() => fetchConfig(true)}>
              <RefreshCw className="h-4 w-4 mr-2" /> Retry
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
                <Lock className="h-8 w-8 text-primary" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-bold">L2TP Remote Access</h1>
                  {config?.configured ? (
                    <Badge variant="secondary" className="bg-green-500/10 text-green-600">Configured</Badge>
                  ) : (
                    <Badge variant="secondary">Not Configured</Badge>
                  )}
                </div>
                <p className="text-muted-foreground">
                  Manage L2TP/IPSec remote access VPN server
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {hasWrite && config?.configured && (
                <Button variant="outline" size="sm" className="text-destructive hover:bg-destructive/10" onClick={() => setDeleteTarget({
                  type: "L2TP Configuration",
                  name: "entire L2TP config",
                  onDelete: () => l2tpService.deleteL2TP(),
                  warning: "This will remove the entire L2TP configuration including all users, pools, and settings.",
                })}>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete L2TP
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={() => fetchConfig(true)} disabled={loading}>
                <RefreshCw className={cn("h-4 w-4 mr-2", loading && "animate-spin")} />
                Refresh
              </Button>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-4 gap-3 mt-4">
            <Card className="p-3">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-blue-500" />
                <div>
                  <p className="text-xs text-muted-foreground">Local Users</p>
                  <p className="font-semibold">{totals?.local_users ?? 0}</p>
                </div>
              </div>
            </Card>
            <Card className="p-3">
              <div className="flex items-center gap-2">
                <Server className="h-4 w-4 text-purple-500" />
                <div>
                  <p className="text-xs text-muted-foreground">RADIUS Servers</p>
                  <p className="font-semibold">{totals?.radius_servers ?? 0}</p>
                </div>
              </div>
            </Card>
            <Card className="p-3">
              <div className="flex items-center gap-2">
                <Network className="h-4 w-4 text-green-500" />
                <div>
                  <p className="text-xs text-muted-foreground">IP Pools</p>
                  <p className="font-semibold">{totals?.client_ip_pools ?? 0}</p>
                </div>
              </div>
            </Card>
            <Card className="p-3">
              <div className="flex items-center gap-2">
                <Network className="h-4 w-4 text-cyan-500" />
                <div>
                  <p className="text-xs text-muted-foreground">IPv6 Pools</p>
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
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="users">Local Users</TabsTrigger>
                <TabsTrigger value="radius">RADIUS</TabsTrigger>
                <TabsTrigger value="pools">IP Pools</TabsTrigger>
                <TabsTrigger value="ipv6pools">IPv6 Pools</TabsTrigger>
                <TabsTrigger value="auth">Authentication</TabsTrigger>
              </TabsList>
            </div>

            <div className="flex-1 overflow-auto">
              <div className="p-6">
                {/* Overview Tab */}
                <TabsContent value="overview" className="mt-0">
                  <div className="grid grid-cols-2 gap-6">
                    {/* General Settings Card */}
                    <Card className="p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-medium">General Settings</h4>
                        {hasWrite && (
                          <Button variant="ghost" size="sm" onClick={() => setShowGeneralModal(true)}>
                            <Pencil className="h-3 w-3 mr-1" /> Edit
                          </Button>
                        )}
                      </div>
                      <div className="space-y-2 text-sm">
                        <InfoRow label="Description" value={config?.description} />
                        <InfoRow label="Outside Address" value={config?.outside_address} />
                        <InfoRow label="Gateway Address" value={config?.gateway_address} />
                        <InfoRow label="MTU" value={config?.mtu} />
                        <InfoRow label="DNS Servers" value={(config?.name_servers || []).join(", ")} />
                        <InfoRow label="WINS Servers" value={(config?.wins_servers || []).join(", ")} />
                        <InfoRow label="Default Pool" value={config?.default_pool} />
                        <InfoRow label="Default IPv6 Pool" value={config?.default_ipv6_pool} />
                        <InfoRow label="Max Sessions" value={config?.max_concurrent_sessions} />
                        <InfoRow label="Threads" value={config?.thread_count} />
                      </div>
                    </Card>

                    {/* IPSec Settings Card */}
                    <Card className="p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-medium">IPSec Settings</h4>
                        {hasWrite && (
                          <Button variant="ghost" size="sm" onClick={() => setShowIPSecModal(true)}>
                            <Pencil className="h-3 w-3 mr-1" /> Edit
                          </Button>
                        )}
                      </div>
                      <div className="space-y-2 text-sm">
                        <InfoRow label="Auth Mode" value={config?.ipsec_settings?.auth_mode} />
                        <InfoRow label="IKE Group" value={config?.ipsec_settings?.ike_group} />
                        <InfoRow label="ESP Group" value={config?.ipsec_settings?.esp_group} />
                        <InfoRow label="IKE Lifetime" value={config?.ipsec_settings?.ike_lifetime} />
                        <InfoRow label="ESP Lifetime" value={config?.ipsec_settings?.lifetime} />
                        {config?.ipsec_settings?.auth_mode === "x509" && (
                          <>
                            <InfoRow label="CA Cert" value={config?.ipsec_settings?.x509_ca_certificate} />
                            <InfoRow label="Certificate" value={config?.ipsec_settings?.x509_certificate} />
                          </>
                        )}
                      </div>
                    </Card>

                    {/* PPP Options Card */}
                    <Card className="p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-medium">PPP Options</h4>
                        {hasWrite && (
                          <Button variant="ghost" size="sm" onClick={() => setShowPPPModal(true)}>
                            <Pencil className="h-3 w-3 mr-1" /> Edit
                          </Button>
                        )}
                      </div>
                      <div className="space-y-2 text-sm">
                        <InfoRow label="IPv4" value={config?.ppp_options?.ipv4} />
                        <InfoRow label="IPv6" value={config?.ppp_options?.ipv6} />
                        <InfoRow label="MPPE" value={config?.ppp_options?.mppe} />
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Disable CCP</span>
                          <Badge variant={config?.ppp_options?.disable_ccp ? "default" : "secondary"}>
                            {config?.ppp_options?.disable_ccp ? "Yes" : "No"}
                          </Badge>
                        </div>
                        <InfoRow label="LCP Echo Interval" value={config?.ppp_options?.lcp_echo_interval} />
                        <InfoRow label="Min MTU" value={config?.ppp_options?.min_mtu} />
                        <InfoRow label="MRU" value={config?.ppp_options?.mru} />
                      </div>
                    </Card>

                    {/* Advanced Settings Card */}
                    <Card className="p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-medium">Advanced Settings</h4>
                        {hasWrite && (
                          <Button variant="ghost" size="sm" onClick={() => setShowAdvancedModal(true)}>
                            <Pencil className="h-3 w-3 mr-1" /> Edit
                          </Button>
                        )}
                      </div>
                      <div className="space-y-2 text-sm">
                        <InfoRow label="LNS Host Name" value={config?.lns?.host_name} />
                        <InfoRow label="LNS Shared Secret" value={config?.lns?.shared_secret ? "***" : undefined} />
                        <InfoRow label="Conn. Limit" value={config?.limits?.connection_limit} />
                        <InfoRow label="Burst" value={config?.limits?.burst} />
                        <InfoRow label="Timeout" value={config?.limits?.timeout} />
                        <InfoRow label="Log Level" value={config?.log?.level} />
                        <InfoRow label="Shaper FWMark" value={config?.shaper?.fwmark} />
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">SNMP Agent</span>
                          <Badge variant={config?.snmp?.master_agent ? "default" : "secondary"}>
                            {config?.snmp?.master_agent ? "Yes" : "No"}
                          </Badge>
                        </div>
                      </div>
                    </Card>
                  </div>
                </TabsContent>

                {/* Local Users Tab */}
                <TabsContent value="users" className="mt-0">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold">Local Users</h3>
                    {hasWrite && (
                      <Button size="sm" onClick={() => { setEditingUser(null); setShowUserModal(true); }}>
                        <Plus className="h-4 w-4 mr-1" /> Add User
                      </Button>
                    )}
                  </div>
                  {(config?.authentication.local_users.length ?? 0) === 0 ? (
                    <EmptyState icon={Users} label="No local users configured" />
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Username</TableHead>
                          <TableHead>Static IP</TableHead>
                          <TableHead>Rate Down</TableHead>
                          <TableHead>Rate Up</TableHead>
                          <TableHead>Status</TableHead>
                          {hasWrite && <TableHead className="text-right">Actions</TableHead>}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {config?.authentication.local_users.map((user) => (
                          <TableRow key={user.username} className="group">
                            <TableCell className="font-medium">{user.username}</TableCell>
                            <TableCell>
                              {user.static_ip ? (
                                <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{user.static_ip}</code>
                              ) : "-"}
                            </TableCell>
                            <TableCell>{user.rate_limit_download || "-"}</TableCell>
                            <TableCell>{user.rate_limit_upload || "-"}</TableCell>
                            <TableCell>
                              {user.disabled ? (
                                <Badge variant="secondary" className="bg-red-500/10 text-red-600">Disabled</Badge>
                              ) : (
                                <Badge variant="secondary" className="bg-green-500/10 text-green-600">Enabled</Badge>
                              )}
                            </TableCell>
                            {hasWrite && (
                              <TableCell className="text-right">
                                <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditingUser(user); setShowUserModal(true); }}>
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                  <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-destructive/10" onClick={() => setDeleteTarget({
                                    type: "Local User",
                                    name: user.username,
                                    onDelete: () => l2tpService.deleteLocalUser(user.username),
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

                {/* RADIUS Tab */}
                <TabsContent value="radius" className="mt-0">
                  {/* RADIUS Global Settings */}
                  <div className="mb-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-semibold">RADIUS Settings</h3>
                      {hasWrite && (
                        <Button variant="outline" size="sm" onClick={() => setShowRadiusSettingsModal(true)}>
                          <Pencil className="h-3 w-3 mr-1" /> Edit Settings
                        </Button>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-6">
                      <Card className="p-4 space-y-2 text-sm">
                        <h4 className="text-sm font-medium mb-2">General</h4>
                        <InfoRow label="Source Address" value={config?.authentication.radius.source_address} />
                        <InfoRow label="Timeout" value={config?.authentication.radius.timeout} />
                        <InfoRow label="Max Try" value={config?.authentication.radius.max_try} />
                        <InfoRow label="NAS Identifier" value={config?.authentication.radius.nas_identifier} />
                        <InfoRow label="NAS IP" value={config?.authentication.radius.nas_ip_address} />
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Preallocate VIF</span>
                          <Badge variant={config?.authentication.radius.preallocate_vif ? "default" : "secondary"}>
                            {config?.authentication.radius.preallocate_vif ? "Yes" : "No"}
                          </Badge>
                        </div>
                      </Card>
                      <Card className="p-4 space-y-2 text-sm">
                        <h4 className="text-sm font-medium mb-2">DAE & Rate Limit</h4>
                        <InfoRow label="DAE Server" value={config?.authentication.radius.dynamic_author?.server} />
                        <InfoRow label="DAE Port" value={config?.authentication.radius.dynamic_author?.port} />
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Rate Limit</span>
                          <Badge variant={config?.authentication.radius.rate_limit?.enable ? "default" : "secondary"}>
                            {config?.authentication.radius.rate_limit?.enable ? "Enabled" : "Disabled"}
                          </Badge>
                        </div>
                        <InfoRow label="Acct Interval" value={config?.authentication.radius.accounting_interim_interval} />
                      </Card>
                    </div>
                  </div>

                  {/* RADIUS Servers */}
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold">RADIUS Servers</h3>
                    {hasWrite && (
                      <Button size="sm" onClick={() => { setEditingRadiusServer(null); setShowRadiusServerModal(true); }}>
                        <Plus className="h-4 w-4 mr-1" /> Add Server
                      </Button>
                    )}
                  </div>
                  {(config?.authentication.radius.servers.length ?? 0) === 0 ? (
                    <EmptyState icon={Server} label="No RADIUS servers configured" />
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Address</TableHead>
                          <TableHead>Port</TableHead>
                          <TableHead>Acct Port</TableHead>
                          <TableHead>Priority</TableHead>
                          <TableHead>Status</TableHead>
                          {hasWrite && <TableHead className="text-right">Actions</TableHead>}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {config?.authentication.radius.servers.map((srv) => (
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
                                  <Badge variant="secondary" className="bg-red-500/10 text-red-600">Disabled</Badge>
                                ) : (
                                  <Badge variant="secondary" className="bg-green-500/10 text-green-600">Active</Badge>
                                )}
                                {srv.backup && <Badge variant="outline">Backup</Badge>}
                              </div>
                            </TableCell>
                            {hasWrite && (
                              <TableCell className="text-right">
                                <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditingRadiusServer(srv); setShowRadiusServerModal(true); }}>
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                  <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-destructive/10" onClick={() => setDeleteTarget({
                                    type: "RADIUS Server",
                                    name: srv.address,
                                    onDelete: () => l2tpService.deleteRadiusServer(srv.address),
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
                    <h3 className="font-semibold">IPv4 Client IP Pools</h3>
                    {hasWrite && (
                      <Button size="sm" onClick={() => { setEditingIPPool(null); setShowIPPoolModal(true); }}>
                        <Plus className="h-4 w-4 mr-1" /> Add Pool
                      </Button>
                    )}
                  </div>
                  {(config?.client_ip_pools.length ?? 0) === 0 ? (
                    <EmptyState icon={Network} label="No IPv4 pools configured" />
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Range</TableHead>
                          <TableHead>Next Pool</TableHead>
                          {hasWrite && <TableHead className="text-right">Actions</TableHead>}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {config?.client_ip_pools.map((pool) => (
                          <TableRow key={pool.name} className="group">
                            <TableCell className="font-medium">{pool.name}</TableCell>
                            <TableCell>
                              <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{pool.range || "-"}</code>
                            </TableCell>
                            <TableCell>{pool.next_pool || "-"}</TableCell>
                            {hasWrite && (
                              <TableCell className="text-right">
                                <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditingIPPool(pool); setShowIPPoolModal(true); }}>
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                  <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-destructive/10" onClick={() => setDeleteTarget({
                                    type: "IP Pool",
                                    name: pool.name,
                                    onDelete: () => l2tpService.deleteIPPool(pool.name),
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
                    <h3 className="font-semibold">IPv6 Client Pools</h3>
                    {hasWrite && (
                      <Button size="sm" onClick={() => { setEditingIPv6Pool(null); setShowIPv6PoolModal(true); }}>
                        <Plus className="h-4 w-4 mr-1" /> Add Pool
                      </Button>
                    )}
                  </div>
                  {(config?.client_ipv6_pools.length ?? 0) === 0 ? (
                    <EmptyState icon={Network} label="No IPv6 pools configured" />
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Prefixes</TableHead>
                          <TableHead>Delegates</TableHead>
                          {hasWrite && <TableHead className="text-right">Actions</TableHead>}
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
                                    type: "IPv6 Pool",
                                    name: pool.name,
                                    onDelete: () => l2tpService.deleteIPv6Pool(pool.name),
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
                    <h3 className="font-semibold">Authentication Settings</h3>
                    {hasWrite && (
                      <Button size="sm" onClick={() => setShowAuthModal(true)}>
                        <Pencil className="h-4 w-4 mr-1" /> Edit
                      </Button>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-6">
                    <Card className="p-4 space-y-3">
                      <h4 className="text-sm font-medium">Mode</h4>
                      <div className="flex items-center gap-2">
                        <Key className="h-4 w-4 text-muted-foreground" />
                        <Badge variant="outline" className="text-sm">
                          {config?.authentication.mode || "Not set"}
                        </Badge>
                      </div>
                    </Card>
                    <Card className="p-4 space-y-3">
                      <h4 className="text-sm font-medium">Protocols</h4>
                      <div className="flex flex-wrap gap-2">
                        {(config?.authentication.protocols || []).length > 0 ? (
                          config?.authentication.protocols?.map((p) => (
                            <Badge key={p} variant="outline" className="font-mono">{p}</Badge>
                          ))
                        ) : (
                          <span className="text-sm text-muted-foreground">No protocols configured</span>
                        )}
                      </div>
                    </Card>
                  </div>
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
          <IPSecSettingsModal
            open={showIPSecModal}
            onOpenChange={setShowIPSecModal}
            onSuccess={onSuccess}
            currentSettings={config.ipsec_settings || {}}
          />
          <PPPOptionsModal
            open={showPPPModal}
            onOpenChange={setShowPPPModal}
            onSuccess={onSuccess}
            currentOptions={config.ppp_options || {}}
            capabilities={capabilities}
          />
          <AdvancedSettingsModal
            open={showAdvancedModal}
            onOpenChange={setShowAdvancedModal}
            onSuccess={onSuccess}
            config={config}
            capabilities={capabilities}
          />
          <AuthSettingsModal
            open={showAuthModal}
            onOpenChange={setShowAuthModal}
            onSuccess={onSuccess}
            currentAuth={config.authentication}
            capabilities={capabilities}
          />
          <RadiusSettingsModal
            open={showRadiusSettingsModal}
            onOpenChange={setShowRadiusSettingsModal}
            onSuccess={onSuccess}
            currentSettings={config.authentication.radius}
          />
        </>
      )}

      <LocalUserModal
        open={showUserModal}
        onOpenChange={(open) => { setShowUserModal(open); if (!open) setEditingUser(null); }}
        onSuccess={onSuccess}
        existingUser={editingUser}
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

export default function L2TPPage() {
  return (
    <Suspense>
      <L2TPPageInner />
    </Suspense>
  );
}
