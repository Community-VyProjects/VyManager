"use client";

export const dynamic = "force-dynamic";

import { useState, useEffect, Suspense } from "react";
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
  Server,
  Network,
  Shield,
  Key,
  User,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  pppoeServerService,
  type PPPoEConfigResponse,
  type PPPoECapabilities,
  type PPPoEInterface,
  type PPPoELocalUser,
  type PPPoERadiusServer,
  type PPPoEIPv4Pool,
  type PPPoEIPv6Pool,
} from "@/lib/api/pppoe-server";
import { usePermissions } from "@/hooks/usePermissions";
import { FeatureGroup } from "@/lib/api/user-management";
import {
  DeleteConfirmModal,
  GeneralSettingsModal,
  AuthSettingsModal,
  LocalUserModal,
  RadiusServerModal,
  RadiusSettingsModal,
  IPPoolModal,
  IPv6PoolModal,
  InterfaceModal,
  PPPOptionsModal,
  AdvancedSettingsModal,
} from "@/components/pppoe-server";

function PPPoEPageInner() {
  const searchParams = useSearchParams();
  const { canRead, canWrite } = usePermissions();
  const hasRead = canRead(FeatureGroup.PPPOE);
  const hasWrite = canWrite(FeatureGroup.PPPOE);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [config, setConfig] = useState<PPPoEConfigResponse | null>(null);
  const [capabilities, setCapabilities] = useState<PPPoECapabilities | null>(null);
  const [activeTab, setActiveTab] = useState("overview");

  // Modal state
  const [showGeneralModal, setShowGeneralModal] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showPPPOptionsModal, setShowPPPOptionsModal] = useState(false);
  const [showAdvancedModal, setShowAdvancedModal] = useState(false);
  const [showRadiusSettingsModal, setShowRadiusSettingsModal] = useState(false);

  const [showLocalUserModal, setShowLocalUserModal] = useState(false);
  const [editingLocalUser, setEditingLocalUser] = useState<PPPoELocalUser | null>(null);

  const [showRadiusServerModal, setShowRadiusServerModal] = useState(false);
  const [editingRadiusServer, setEditingRadiusServer] = useState<PPPoERadiusServer | null>(null);

  const [showIPPoolModal, setShowIPPoolModal] = useState(false);
  const [editingIPPool, setEditingIPPool] = useState<PPPoEIPv4Pool | null>(null);

  const [showIPv6PoolModal, setShowIPv6PoolModal] = useState(false);
  const [editingIPv6Pool, setEditingIPv6Pool] = useState<PPPoEIPv6Pool | null>(null);

  const [showInterfaceModal, setShowInterfaceModal] = useState(false);
  const [editingInterface, setEditingInterface] = useState<PPPoEInterface | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<{
    type: string;
    name: string;
    onDelete: () => Promise<import("@/lib/api/pppoe-server").VyOSResponse>;
    warning?: string;
  } | null>(null);

  const fetchConfig = async (refresh = false) => {
    try {
      setLoading(true);
      setError(null);
      const [configData, capsData] = await Promise.all([
        pppoeServerService.getConfig(refresh),
        pppoeServerService.getCapabilities(),
      ]);
      setConfig(configData);
      setCapabilities(capsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load PPPoE configuration");
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

  const authMode = config?.authentication.mode;
  const isLocalAuth = authMode === "local";
  const totals = config?.totals;

  if (loading && !config) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-[calc(100vh-200px)]">
          <div className="text-center space-y-4">
            <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
            <p className="text-muted-foreground">Loading PPPoE configuration...</p>
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
                  <h1 className="text-2xl font-bold">PPPoE Server</h1>
                  {config?.configured ? (
                    <Badge variant="secondary" className="bg-green-500/10 text-green-600">Configured</Badge>
                  ) : (
                    <Badge variant="secondary">Not Configured</Badge>
                  )}
                </div>
                <p className="text-muted-foreground">Manage Point-to-Point over Ethernet broadband access server</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {hasWrite && config?.configured && (
                <Button
                  variant="outline"
                  size="sm"
                  className="text-destructive hover:bg-destructive/10"
                  onClick={() => setDeleteTarget({
                    type: "PPPoE Server",
                    name: "entire PPPoE configuration",
                    onDelete: () => pppoeServerService.deletePPPoEServer(),
                    warning: "This will remove the entire PPPoE server configuration including all users, pools, and settings.",
                  })}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete PPPoE Server
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
                {isLocalAuth ? (
                  <User className="h-4 w-4 text-orange-500" />
                ) : (
                  <Server className="h-4 w-4 text-purple-500" />
                )}
                <div>
                  <p className="text-xs text-muted-foreground">{isLocalAuth ? "Local Users" : "RADIUS Servers"}</p>
                  <p className="font-semibold">{isLocalAuth ? (totals?.local_users ?? 0) : (totals?.radius_servers ?? 0)}</p>
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
            <Card className="p-3">
              <div className="flex items-center gap-2">
                <Network className="h-4 w-4 text-blue-500" />
                <div>
                  <p className="text-xs text-muted-foreground">Interfaces</p>
                  <p className="font-semibold">{totals?.interfaces ?? 0}</p>
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
                <TabsTrigger value="interfaces">Interfaces</TabsTrigger>
                <TabsTrigger value="auth">Authentication</TabsTrigger>
                <TabsTrigger value="pools">IP Pools</TabsTrigger>
                <TabsTrigger value="ipv6pools">IPv6 Pools</TabsTrigger>
                <TabsTrigger value="ppp-options">PPP Options</TabsTrigger>
                <TabsTrigger value="advanced">Advanced</TabsTrigger>
              </TabsList>
            </div>

            <div className="flex-1 overflow-auto">
              <div className="p-6">

                {/* Overview Tab */}
                <TabsContent value="overview" className="mt-0">
                  <div className="grid grid-cols-2 gap-6">
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
                        <InfoRow label="Access Concentrator" value={config?.access_concentrator} />
                        <InfoRow label="Service Name" value={config?.service_name} />
                        <InfoRow label="Gateway Addresses" value={(config?.gateway_addresses || []).join(", ")} />
                        <InfoRow label="Name Servers" value={(config?.name_servers || []).join(", ")} />
                        <InfoRow label="WINS Servers" value={(config?.wins_servers || []).join(", ")} />
                        <InfoRow label="MTU" value={config?.mtu} />
                        <InfoRow label="Max Sessions" value={config?.max_concurrent_sessions} />
                        <InfoRow label="Threads" value={config?.thread_count} />
                        <InfoRow label="Default Pool" value={config?.default_pool} />
                        <InfoRow label="Default IPv6 Pool" value={config?.default_ipv6_pool} />
                        <InfoRow label="Session Control" value={config?.session_control} />
                      </div>
                    </Card>

                    <Card className="p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-medium">PPP Options</h4>
                        {hasWrite && (
                          <Button variant="ghost" size="sm" onClick={() => setShowPPPOptionsModal(true)}>
                            <Pencil className="h-3 w-3 mr-1" /> Edit
                          </Button>
                        )}
                      </div>
                      <div className="space-y-2 text-sm">
                        <InfoRow label="IPv4" value={config?.ppp_options.ipv4} />
                        <InfoRow label="IPv6" value={config?.ppp_options.ipv6} />
                        <InfoRow label="MPPE" value={config?.ppp_options.mppe} />
                        <InfoRow label="Min MTU" value={config?.ppp_options.min_mtu} />
                        <InfoRow label="MRU" value={config?.ppp_options.mru} />
                        <InfoRow label="LCP Failure" value={config?.ppp_options.lcp_echo_failure} />
                        <InfoRow label="LCP Interval" value={config?.ppp_options.lcp_echo_interval} />
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Disable CCP</span>
                          <Badge variant={config?.ppp_options.disable_ccp ? "default" : "secondary"}>
                            {config?.ppp_options.disable_ccp ? "Yes" : "No"}
                          </Badge>
                        </div>
                      </div>
                    </Card>
                  </div>
                </TabsContent>

                {/* Interfaces Tab */}
                <TabsContent value="interfaces" className="mt-0">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold">Server Interfaces</h3>
                    {hasWrite && (
                      <Button size="sm" onClick={() => { setEditingInterface(null); setShowInterfaceModal(true); }}>
                        <Plus className="h-4 w-4 mr-1" /> Add Interface
                      </Button>
                    )}
                  </div>
                  {(config?.interfaces.length ?? 0) === 0 ? (
                    <EmptyState icon={Network} label="No interfaces configured" />
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Interface</TableHead>
                          <TableHead>VLANs</TableHead>
                          <TableHead>VLAN Mon</TableHead>
                          <TableHead>Combined</TableHead>
                          {hasWrite && <TableHead className="text-right">Actions</TableHead>}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {config?.interfaces.map((iface) => (
                          <TableRow key={iface.interface} className="group">
                            <TableCell className="font-medium font-mono">{iface.interface}</TableCell>
                            <TableCell>
                              <div className="flex flex-wrap gap-1">
                                {(iface.vlans || []).slice(0, 4).map((v) => (
                                  <Badge key={v} variant="secondary" className="text-xs font-mono">{v}</Badge>
                                ))}
                                {(iface.vlans || []).length > 4 && (
                                  <Badge variant="secondary" className="text-xs">+{(iface.vlans || []).length - 4}</Badge>
                                )}
                                {(iface.vlans || []).length === 0 && "-"}
                              </div>
                            </TableCell>
                            <TableCell>
                              {iface.vlan_mon ? (
                                <Badge variant="secondary" className="bg-green-500/10 text-green-600">Yes</Badge>
                              ) : "-"}
                            </TableCell>
                            <TableCell>{iface.combined || "-"}</TableCell>
                            {hasWrite && (
                              <TableCell className="text-right">
                                <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditingInterface(iface); setShowInterfaceModal(true); }}>
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                  <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-destructive/10" onClick={() => setDeleteTarget({
                                    type: "Interface",
                                    name: iface.interface,
                                    onDelete: () => pppoeServerService.deleteInterface(iface.interface),
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
                  <div className="mb-6">
                    <Card className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-sm font-medium">Authentication Mode</h4>
                        {hasWrite && (
                          <Button variant="ghost" size="sm" onClick={() => setShowAuthModal(true)}>
                            <Pencil className="h-3 w-3 mr-1" /> Edit
                          </Button>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        <Key className="h-4 w-4 text-muted-foreground" />
                        <Badge variant="outline" className="text-sm">
                          {config?.authentication.mode || "Not set"}
                        </Badge>
                        {(config?.authentication.protocols || []).length > 0 && (
                          <div className="flex gap-1">
                            {(config?.authentication.protocols || []).map((p) => (
                              <Badge key={p} variant="secondary" className="font-mono text-xs">{p}</Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    </Card>
                  </div>

                  {isLocalAuth ? (
                    <>
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="font-semibold">Local Users</h3>
                        {hasWrite && (
                          <Button size="sm" onClick={() => { setEditingLocalUser(null); setShowLocalUserModal(true); }}>
                            <Plus className="h-4 w-4 mr-1" /> Add User
                          </Button>
                        )}
                      </div>
                      {(config?.authentication.local_users.length ?? 0) === 0 ? (
                        <EmptyState icon={User} label="No local users configured" />
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
                                <TableCell className="font-medium font-mono">{user.username}</TableCell>
                                <TableCell>
                                  {user.static_ip ? (
                                    <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{user.static_ip}</code>
                                  ) : "-"}
                                </TableCell>
                                <TableCell>{user.rate_limit?.download || "-"}</TableCell>
                                <TableCell>{user.rate_limit?.upload || "-"}</TableCell>
                                <TableCell>
                                  {user.disabled ? (
                                    <Badge variant="secondary" className="bg-red-500/10 text-red-600">Disabled</Badge>
                                  ) : (
                                    <Badge variant="secondary" className="bg-green-500/10 text-green-600">Active</Badge>
                                  )}
                                </TableCell>
                                {hasWrite && (
                                  <TableCell className="text-right">
                                    <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditingLocalUser(user); setShowLocalUserModal(true); }}>
                                        <Pencil className="h-4 w-4" />
                                      </Button>
                                      <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-destructive/10" onClick={() => setDeleteTarget({
                                        type: "Local User",
                                        name: user.username,
                                        onDelete: () => pppoeServerService.deleteLocalUser(user.username),
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
                  ) : (
                    <>
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
                            <InfoRow label="Source Address" value={config?.authentication.radius?.source_address} />
                            <InfoRow label="Timeout" value={config?.authentication.radius?.timeout} />
                            <InfoRow label="Max Try" value={config?.authentication.radius?.max_try} />
                            <InfoRow label="NAS Identifier" value={config?.authentication.radius?.nas_identifier} />
                            <InfoRow label="NAS IP" value={config?.authentication.radius?.nas_ip_address} />
                            <InfoRow label="Called SID Format" value={config?.authentication.radius?.called_sid_format} />
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Preallocate VIF</span>
                              <Badge variant={config?.authentication.radius?.preallocate_vif ? "default" : "secondary"}>
                                {config?.authentication.radius?.preallocate_vif ? "Yes" : "No"}
                              </Badge>
                            </div>
                          </Card>
                          <Card className="p-4 space-y-2 text-sm">
                            <h4 className="text-sm font-medium mb-2">DAE & Rate Limit</h4>
                            <InfoRow label="DAE Server" value={config?.authentication.radius?.dynamic_author?.server} />
                            <InfoRow label="DAE Port" value={config?.authentication.radius?.dynamic_author?.port} />
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Rate Limit</span>
                              <Badge variant={config?.authentication.radius?.rate_limit?.enable ? "default" : "secondary"}>
                                {config?.authentication.radius?.rate_limit?.enable ? "Enabled" : "Disabled"}
                              </Badge>
                            </div>
                            <InfoRow label="Attribute" value={config?.authentication.radius?.rate_limit?.attribute} />
                            <InfoRow label="Multiplier" value={config?.authentication.radius?.rate_limit?.multiplier} />
                          </Card>
                        </div>
                      </div>

                      <div className="flex items-center justify-between mb-4">
                        <h3 className="font-semibold">RADIUS Servers</h3>
                        {hasWrite && (
                          <Button size="sm" onClick={() => { setEditingRadiusServer(null); setShowRadiusServerModal(true); }}>
                            <Plus className="h-4 w-4 mr-1" /> Add Server
                          </Button>
                        )}
                      </div>
                      {(config?.authentication.radius?.servers?.length ?? 0) === 0 ? (
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
                                        onDelete: () => pppoeServerService.deleteRadiusServer(srv.address),
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
                          <TableHead>Ranges</TableHead>
                          <TableHead>Next Pool</TableHead>
                          {hasWrite && <TableHead className="text-right">Actions</TableHead>}
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
                                    type: "IP Pool",
                                    name: pool.name,
                                    onDelete: () => pppoeServerService.deleteIPPool(pool.name),
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
                                    onDelete: () => pppoeServerService.deleteIPv6Pool(pool.name),
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

                {/* PPP Options Tab */}
                <TabsContent value="ppp-options" className="mt-0">
                  <Card className="p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-medium">PPP Options</h4>
                      {hasWrite && (
                        <Button variant="ghost" size="sm" onClick={() => setShowPPPOptionsModal(true)}>
                          <Pencil className="h-3 w-3 mr-1" /> Edit
                        </Button>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-6 text-sm">
                      <div className="space-y-2">
                        <h5 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">IP Negotiation</h5>
                        <InfoRow label="IPv4" value={config?.ppp_options.ipv4} />
                        <InfoRow label="IPv6" value={config?.ppp_options.ipv6} />
                        <h5 className="text-xs font-medium text-muted-foreground uppercase tracking-wide pt-2">Encryption</h5>
                        <InfoRow label="MPPE" value={config?.ppp_options.mppe} />
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Disable CCP</span>
                          <Badge variant={config?.ppp_options.disable_ccp ? "default" : "secondary"}>
                            {config?.ppp_options.disable_ccp ? "Yes" : "No"}
                          </Badge>
                        </div>
                        <h5 className="text-xs font-medium text-muted-foreground uppercase tracking-wide pt-2">MTU/MRU</h5>
                        <InfoRow label="Min MTU" value={config?.ppp_options.min_mtu} />
                        <InfoRow label="MRU" value={config?.ppp_options.mru} />
                        <InfoRow label="Interface Cache" value={config?.ppp_options.interface_cache} />
                      </div>
                      <div className="space-y-2">
                        <h5 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">LCP Echo</h5>
                        <InfoRow label="Failure" value={config?.ppp_options.lcp_echo_failure} />
                        <InfoRow label="Interval" value={config?.ppp_options.lcp_echo_interval} />
                        <InfoRow label="Timeout" value={config?.ppp_options.lcp_echo_timeout} />
                        <h5 className="text-xs font-medium text-muted-foreground uppercase tracking-wide pt-2">IPv6 Interface IDs</h5>
                        <InfoRow label="Interface ID" value={config?.ppp_options.ipv6_interface_id} />
                        <InfoRow label="Peer Interface ID" value={config?.ppp_options.ipv6_peer_interface_id} />
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Accept Peer ID</span>
                          <Badge variant={config?.ppp_options.ipv6_accept_peer_interface_id ? "default" : "secondary"}>
                            {config?.ppp_options.ipv6_accept_peer_interface_id ? "Yes" : "No"}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </Card>
                </TabsContent>

                {/* Advanced Tab */}
                <TabsContent value="advanced" className="mt-0">
                  <Card className="p-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-medium">Advanced Settings</h4>
                      {hasWrite && (
                        <Button variant="ghost" size="sm" onClick={() => setShowAdvancedModal(true)}>
                          <Pencil className="h-3 w-3 mr-1" /> Edit
                        </Button>
                      )}
                    </div>

                    {/* PADO Delays */}
                    <div className="space-y-2">
                      <h5 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">PADO Delays</h5>
                      {(config?.pado_delays || []).length === 0 ? (
                        <p className="text-sm text-muted-foreground">No PADO delays configured</p>
                      ) : (
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Delay</TableHead>
                              <TableHead>Sessions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {(config?.pado_delays || []).map((d) => (
                              <TableRow key={d.delay}>
                                <TableCell className="font-mono text-sm">{d.delay}</TableCell>
                                <TableCell>{d.sessions || "-"}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-6 text-sm">
                      <div className="space-y-2">
                        <h5 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Limits</h5>
                        <InfoRow label="Burst" value={config?.limits?.burst} />
                        <InfoRow label="Conn. Limit" value={config?.limits?.connection_limit} />
                        <InfoRow label="Timeout" value={config?.limits?.timeout} />
                        <h5 className="text-xs font-medium text-muted-foreground uppercase tracking-wide pt-2">Log & Shaper</h5>
                        <InfoRow label="Log Level" value={config?.log?.level} />
                        <InfoRow label="Shaper FWMark" value={config?.shaper?.fwmark} />
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">SNMP Master Agent</span>
                          <Badge variant={config?.snmp?.master_agent ? "default" : "secondary"}>
                            {config?.snmp?.master_agent ? "Yes" : "No"}
                          </Badge>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <h5 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Extended Scripts</h5>
                        <InfoRow label="On Change" value={config?.extended_scripts?.on_change} />
                        <InfoRow label="On Down" value={config?.extended_scripts?.on_down} />
                        <InfoRow label="On Pre-Up" value={config?.extended_scripts?.on_pre_up} />
                        <InfoRow label="On Up" value={config?.extended_scripts?.on_up} />
                      </div>
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
            currentAuth={config.authentication}
          />
          <PPPOptionsModal
            open={showPPPOptionsModal}
            onOpenChange={setShowPPPOptionsModal}
            onSuccess={onSuccess}
            config={config}
          />
          <AdvancedSettingsModal
            open={showAdvancedModal}
            onOpenChange={setShowAdvancedModal}
            onSuccess={onSuccess}
            config={config}
          />
          <RadiusSettingsModal
            open={showRadiusSettingsModal}
            onOpenChange={setShowRadiusSettingsModal}
            onSuccess={onSuccess}
            currentSettings={config.authentication.radius ?? { servers: [] }}
          />
        </>
      )}

      <LocalUserModal
        open={showLocalUserModal}
        onOpenChange={(open) => { setShowLocalUserModal(open); if (!open) setEditingLocalUser(null); }}
        onSuccess={onSuccess}
        existingUser={editingLocalUser}
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
      <InterfaceModal
        open={showInterfaceModal}
        onOpenChange={(open) => { setShowInterfaceModal(open); if (!open) setEditingInterface(null); }}
        onSuccess={onSuccess}
        existingInterface={editingInterface}
        capabilities={capabilities}
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

export default function PPPoEServerPage() {
  return (
    <Suspense>
      <PPPoEPageInner />
    </Suspense>
  );
}
