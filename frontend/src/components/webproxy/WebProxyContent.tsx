"use client";

import { useState, useEffect, useCallback, type ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Globe,
  RefreshCw,
  Plus,
  Pencil,
  Trash2,
  Settings2,
  Loader2,
  Server,
  Network,
  ShieldCheck,
  KeyRound,
} from "lucide-react";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import {
  webProxyService,
  WebProxyConfig,
  WebProxyCapabilities,
  CachePeer,
  ListenAddress,
  SquidGuardRule,
  SquidGuardSourceGroup,
  SquidGuardTimePeriod,
} from "@/lib/api/webproxy";
import { WebProxySettingsModal } from "./WebProxySettingsModal";
import { WebProxyAuthModal } from "./WebProxyAuthModal";
import { WebProxyCachePeerModal } from "./WebProxyCachePeerModal";
import { WebProxyListenAddressModal } from "./WebProxyListenAddressModal";
import { WebProxySquidGuardModal } from "./WebProxySquidGuardModal";
import { WebProxyRuleModal } from "./WebProxyRuleModal";
import { WebProxySourceGroupModal } from "./WebProxySourceGroupModal";
import { WebProxyTimePeriodModal } from "./WebProxyTimePeriodModal";
import { usePermissions } from "@/hooks/usePermissions";
import { FeatureGroup } from "@/lib/api/user-management";

export function WebProxyContent() {
  const { canWrite } = usePermissions();
  const hasWritePermission = canWrite(FeatureGroup.WEBPROXY);

  const [config, setConfig] = useState<WebProxyConfig | null>(null);
  const [caps, setCaps] = useState<WebProxyCapabilities | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Modal state
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [squidguardOpen, setSquidguardOpen] = useState(false);
  const [peerOpen, setPeerOpen] = useState(false);
  const [editingPeer, setEditingPeer] = useState<CachePeer | null>(null);
  const [listenOpen, setListenOpen] = useState(false);
  const [editingListen, setEditingListen] = useState<ListenAddress | null>(null);
  const [ruleOpen, setRuleOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<SquidGuardRule | null>(null);
  const [groupOpen, setGroupOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<SquidGuardSourceGroup | null>(null);
  const [periodOpen, setPeriodOpen] = useState(false);
  const [editingPeriod, setEditingPeriod] = useState<SquidGuardTimePeriod | null>(null);

  // Delete confirmations
  const [deletingPeer, setDeletingPeer] = useState<string | null>(null);
  const [deletingListen, setDeletingListen] = useState<string | null>(null);
  const [deletingRule, setDeletingRule] = useState<string | null>(null);
  const [deletingGroup, setDeletingGroup] = useState<string | null>(null);
  const [deletingPeriod, setDeletingPeriod] = useState<string | null>(null);

  const loadData = useCallback(async (refresh = false) => {
    try {
      setLoading(true);
      setError(null);
      const [configData, capsData] = await Promise.all([
        webProxyService.getConfig(refresh),
        webProxyService.getCapabilities(),
      ]);
      setConfig(configData);
      setCaps(capsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load web proxy configuration");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const withAction = async (fn: () => Promise<void>) => {
    setActionLoading(true);
    setError(null);
    try {
      await fn();
      await loadData(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Operation failed");
    } finally {
      setActionLoading(false);
    }
  };

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
        <Button variant="outline" onClick={() => loadData()}>Retry</Button>
      </div>
    );
  }

  const sg = config?.url_filtering.squidguard;
  const listenCount = config?.listen_addresses.length ?? 0;
  const peerCount = config?.cache_peers.length ?? 0;
  const ruleCount = sg?.rules.length ?? 0;
  const sourceGroupNames = sg?.source_groups.map((g) => g.name) ?? [];
  const timePeriodNames = sg?.time_periods.map((t) => t.name) ?? [];
  const authConfigured = !!(config?.authentication.method || config?.authentication.ldap.server);
  const isConfigured = listenCount > 0 || (config?.default_port != null);

  return (
    <>
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="p-6 pb-4 border-b border-border">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="rounded-md p-2 bg-primary/10">
                <Globe className="h-5 w-5 text-primary" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-bold text-foreground">Web Proxy</h1>
                  {!hasWritePermission && <Badge variant="secondary">Read Only</Badge>}
                  <Badge variant={isConfigured ? "default" : "secondary"} className={isConfigured ? "bg-green-500/10 text-green-600 border-green-500/20" : ""}>
                    {isConfigured ? "Configured" : "Unconfigured"}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Squid caching proxy with squidGuard URL filtering
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {hasWritePermission && (
                <Button variant="outline" size="sm" onClick={() => setSettingsOpen(true)}>
                  <Settings2 className="h-4 w-4 mr-2" />
                  Edit Settings
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={() => loadData(true)}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-md bg-destructive/10 text-destructive text-sm whitespace-pre-wrap">
              {error}
            </div>
          )}

          {/* Stats */}
          <div className="grid grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-md p-2 bg-primary/10"><Network className="h-4 w-4 text-primary" /></div>
                  <div>
                    <p className="text-2xl font-bold">{config?.default_port ?? "3128"}</p>
                    <p className="text-xs text-muted-foreground">Default Port</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-md p-2 bg-primary/10"><Server className="h-4 w-4 text-primary" /></div>
                  <div>
                    <p className="text-2xl font-bold">{listenCount}</p>
                    <p className="text-xs text-muted-foreground">Listen Addresses</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-md p-2 bg-primary/10"><Globe className="h-4 w-4 text-primary" /></div>
                  <div>
                    <p className="text-2xl font-bold">{peerCount}</p>
                    <p className="text-xs text-muted-foreground">Cache Peers</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-md p-2 bg-primary/10"><ShieldCheck className="h-4 w-4 text-primary" /></div>
                  <div>
                    <p className="text-2xl font-bold">{ruleCount}</p>
                    <p className="text-xs text-muted-foreground">Filter Rules</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex-1 p-6 pt-4 overflow-auto">
          <Tabs defaultValue="general">
            <TabsList>
              <TabsTrigger value="general">General</TabsTrigger>
              <TabsTrigger value="authentication">Authentication</TabsTrigger>
              <TabsTrigger value="cache-peers">Cache Peers</TabsTrigger>
              <TabsTrigger value="listen">Listen Addresses</TabsTrigger>
              <TabsTrigger value="url-filtering">URL Filtering</TabsTrigger>
            </TabsList>

            {/* General Tab */}
            <TabsContent value="general" className="space-y-4 mt-4">
              <Card>
                <div className="flex items-center justify-between p-4 border-b">
                  <h3 className="font-semibold">Proxy Settings</h3>
                  {hasWritePermission && (
                    <Button size="sm" variant="outline" onClick={() => setSettingsOpen(true)}>
                      <Settings2 className="h-4 w-4 mr-2" />Edit
                    </Button>
                  )}
                </div>
                <CardContent className="pt-4">
                  <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
                    <Row label="Default Port" value={config?.default_port ?? "3128 (default)"} />
                    <Row label="Disk Cache Size" value={config?.cache_size != null ? `${config.cache_size} MB` : "100 MB (default)"} />
                    <Row label="Memory Cache Size" value={config?.mem_cache_size != null ? `${config.mem_cache_size} MB` : "20 MB (default)"} />
                    <Row label="Max Object Size" value={config?.maximum_object_size != null ? `${config.maximum_object_size} KB` : "—"} />
                    <Row label="Min Object Size" value={config?.minimum_object_size != null ? `${config.minimum_object_size} KB` : "—"} />
                    <Row label="Reply Body Max Size" value={config?.reply_body_max_size != null ? `${config.reply_body_max_size} KB` : "—"} />
                    <Row label="Outgoing Address" value={config?.outgoing_address ?? "—"} />
                    <Row label="Append Domain" value={config?.append_domain ?? "—"} />
                    <Row label="Access Logging" value={config?.disable_access_log ? "Disabled" : "Enabled"} />
                  </div>
                </CardContent>
              </Card>

              <div className="grid grid-cols-2 gap-4">
                <ChipCard title="Safe Ports" items={config?.safe_ports ?? []} />
                <ChipCard title="SSL Safe Ports" items={config?.ssl_safe_ports ?? []} />
                <ChipCard title="Blocked Domains" items={config?.domain_block ?? []} />
                <ChipCard title="Non-cached Domains" items={config?.domain_noncache ?? []} />
                <ChipCard title="Blocked MIME Types" items={config?.reply_block_mime ?? []} />
              </div>
            </TabsContent>

            {/* Authentication Tab */}
            <TabsContent value="authentication" className="mt-4">
              <Card>
                <div className="flex items-center justify-between p-4 border-b">
                  <h3 className="font-semibold">Proxy Authentication</h3>
                  <div className="flex items-center gap-2">
                    {authConfigured && hasWritePermission && (
                      <Button size="sm" variant="outline" className="text-destructive hover:text-destructive" onClick={() => withAction(async () => { await webProxyService.clearAuthentication(); })}>
                        <Trash2 className="h-4 w-4 mr-2" />Clear
                      </Button>
                    )}
                    {hasWritePermission && (
                      <Button size="sm" variant="outline" onClick={() => setAuthOpen(true)}>
                        <KeyRound className="h-4 w-4 mr-2" />{authConfigured ? "Edit" : "Configure"}
                      </Button>
                    )}
                  </div>
                </div>
                {!authConfigured ? (
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <KeyRound className="h-12 w-12 text-muted-foreground/30 mb-4" />
                    <p className="text-sm text-muted-foreground">Authentication is not configured</p>
                    <p className="text-xs text-muted-foreground">Require LDAP login before clients can use the proxy.</p>
                  </CardContent>
                ) : (
                  <CardContent className="pt-4">
                    <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
                      <Row label="Method" value={config?.authentication.method ?? "—"} />
                      <Row label="Realm" value={config?.authentication.realm ?? "—"} />
                      <Row label="Helper Processes" value={config?.authentication.children ?? "5 (default)"} />
                      <Row label="Credentials TTL" value={config?.authentication.credentials_ttl != null ? `${config.authentication.credentials_ttl} min` : "60 min (default)"} />
                      <Row label="LDAP Server" value={config?.authentication.ldap.server ?? "—"} />
                      <Row label="LDAP Port" value={config?.authentication.ldap.port ?? "389 (default)"} />
                      <Row label="LDAP Version" value={config?.authentication.ldap.version ?? "3 (default)"} />
                      <Row label="Base DN" value={config?.authentication.ldap.base_dn ?? "—"} />
                      <Row label="Bind DN" value={config?.authentication.ldap.bind_dn ?? "—"} />
                      <Row label="Use SSL/TLS" value={config?.authentication.ldap.use_ssl ? "Yes" : "No"} />
                      <Row label="Persistent Connection" value={config?.authentication.ldap.persistent_connection ? "Yes" : "No"} />
                    </div>
                  </CardContent>
                )}
              </Card>
            </TabsContent>

            {/* Cache Peers Tab */}
            <TabsContent value="cache-peers" className="mt-4">
              <Card>
                <div className="flex items-center justify-between p-4 border-b">
                  <h3 className="font-semibold">Cache Peers</h3>
                  {hasWritePermission && (
                    <Button size="sm" variant="outline" onClick={() => { setEditingPeer(null); setPeerOpen(true); }}>
                      <Plus className="h-4 w-4 mr-2" />Add Peer
                    </Button>
                  )}
                </div>
                {peerCount === 0 ? (
                  <CardContent className="flex items-center justify-center py-8 text-sm text-muted-foreground">
                    No cache peers configured
                  </CardContent>
                ) : (
                  <ScrollArea>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Address</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>HTTP Port</TableHead>
                          <TableHead>ICP Port</TableHead>
                          <TableHead>Options</TableHead>
                          {hasWritePermission && <TableHead className="text-right">Actions</TableHead>}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {config?.cache_peers.map((p) => (
                          <TableRow key={p.name}>
                            <TableCell className="font-mono">{p.name}</TableCell>
                            <TableCell className="font-mono">{p.address ?? "—"}</TableCell>
                            <TableCell>{p.type ?? "parent"}</TableCell>
                            <TableCell className="font-mono">{p.http_port ?? "3128"}</TableCell>
                            <TableCell className="font-mono">{p.icp_port ?? "0"}</TableCell>
                            <TableCell className="font-mono text-xs">{p.options ?? "—"}</TableCell>
                            {hasWritePermission && (
                              <TableCell className="text-right">
                                <div className="flex items-center justify-end gap-1">
                                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditingPeer(p); setPeerOpen(true); }}><Pencil className="h-4 w-4" /></Button>
                                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setDeletingPeer(p.name)}><Trash2 className="h-4 w-4" /></Button>
                                </div>
                              </TableCell>
                            )}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                )}
              </Card>
            </TabsContent>

            {/* Listen Addresses Tab */}
            <TabsContent value="listen" className="mt-4">
              <Card>
                <div className="flex items-center justify-between p-4 border-b">
                  <h3 className="font-semibold">Listen Addresses</h3>
                  {hasWritePermission && (
                    <Button size="sm" variant="outline" onClick={() => { setEditingListen(null); setListenOpen(true); }}>
                      <Plus className="h-4 w-4 mr-2" />Add Address
                    </Button>
                  )}
                </div>
                {listenCount === 0 ? (
                  <CardContent className="flex items-center justify-center py-8 text-sm text-muted-foreground">
                    No listen addresses configured
                  </CardContent>
                ) : (
                  <ScrollArea>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Address</TableHead>
                          <TableHead>Port</TableHead>
                          <TableHead>Transparent Mode</TableHead>
                          {hasWritePermission && <TableHead className="text-right">Actions</TableHead>}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {config?.listen_addresses.map((a) => (
                          <TableRow key={a.address}>
                            <TableCell className="font-mono">{a.address}</TableCell>
                            <TableCell className="font-mono">{a.port ?? "default"}</TableCell>
                            <TableCell>{a.disable_transparent ? <Badge variant="secondary">Disabled</Badge> : <Badge variant="secondary" className="bg-green-500/10 text-green-600">Enabled</Badge>}</TableCell>
                            {hasWritePermission && (
                              <TableCell className="text-right">
                                <div className="flex items-center justify-end gap-1">
                                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditingListen(a); setListenOpen(true); }}><Pencil className="h-4 w-4" /></Button>
                                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setDeletingListen(a.address)}><Trash2 className="h-4 w-4" /></Button>
                                </div>
                              </TableCell>
                            )}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                )}
              </Card>
            </TabsContent>

            {/* URL Filtering Tab */}
            <TabsContent value="url-filtering" className="space-y-4 mt-4">
              <Card>
                <div className="flex items-center justify-between p-4 border-b">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold">squidGuard</h3>
                    {config?.url_filtering.disable && <Badge variant="secondary" className="bg-muted text-muted-foreground">Disabled</Badge>}
                  </div>
                  <div className="flex items-center gap-2">
                    {hasWritePermission && (
                      <Button size="sm" variant="outline" onClick={() => withAction(async () => { await webProxyService.setUrlFilteringDisabled(!config?.url_filtering.disable); })}>
                        {config?.url_filtering.disable ? "Enable" : "Disable"}
                      </Button>
                    )}
                    {hasWritePermission && (
                      <Button size="sm" variant="outline" onClick={() => setSquidguardOpen(true)}>
                        <Settings2 className="h-4 w-4 mr-2" />Edit Filtering
                      </Button>
                    )}
                  </div>
                </div>
                <CardContent className="pt-4">
                  <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
                    <Row label="Default Action" value={sg?.default_action ?? "allow (default)"} />
                    <Row label="Redirect URL" value={sg?.redirect_url ?? "block.vyos.net (default)"} />
                    <Row label="Auto-update Hour" value={sg?.auto_update_hour ?? "—"} />
                    <Row label="Safe Search" value={sg?.enable_safe_search ? "Enabled" : "Disabled"} />
                    <Row label="Allow IP-address URLs" value={sg?.allow_ipaddr_url ? "Yes" : "No"} />
                  </div>
                  <div className="grid grid-cols-2 gap-4 mt-4">
                    <ChipCard title="Allow Categories" items={sg?.allow_categories ?? []} />
                    <ChipCard title="Block Categories" items={sg?.block_categories ?? []} />
                    <ChipCard title="Local Block" items={sg?.local_block ?? []} />
                    <ChipCard title="Local Allow" items={sg?.local_ok ?? []} />
                  </div>
                </CardContent>
              </Card>

              {/* Source Groups */}
              <Card>
                <div className="flex items-center justify-between p-4 border-b">
                  <h3 className="font-semibold">Source Groups</h3>
                  {hasWritePermission && (
                    <Button size="sm" variant="outline" onClick={() => { setEditingGroup(null); setGroupOpen(true); }}>
                      <Plus className="h-4 w-4 mr-2" />Add Group
                    </Button>
                  )}
                </div>
                {(sg?.source_groups.length ?? 0) === 0 ? (
                  <CardContent className="flex items-center justify-center py-8 text-sm text-muted-foreground">No source groups configured</CardContent>
                ) : (
                  <ScrollArea>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Addresses</TableHead>
                          <TableHead>Domains</TableHead>
                          <TableHead>Description</TableHead>
                          {hasWritePermission && <TableHead className="text-right">Actions</TableHead>}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {sg?.source_groups.map((g) => (
                          <TableRow key={g.name}>
                            <TableCell className="font-mono">{g.name}</TableCell>
                            <TableCell><CellChips items={g.address} /></TableCell>
                            <TableCell><CellChips items={g.domain} /></TableCell>
                            <TableCell className="text-sm">{g.description ?? "—"}</TableCell>
                            {hasWritePermission && (
                              <TableCell className="text-right">
                                <div className="flex items-center justify-end gap-1">
                                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditingGroup(g); setGroupOpen(true); }}><Pencil className="h-4 w-4" /></Button>
                                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setDeletingGroup(g.name)}><Trash2 className="h-4 w-4" /></Button>
                                </div>
                              </TableCell>
                            )}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                )}
              </Card>

              {/* Time Periods */}
              <Card>
                <div className="flex items-center justify-between p-4 border-b">
                  <h3 className="font-semibold">Time Periods</h3>
                  {hasWritePermission && (
                    <Button size="sm" variant="outline" onClick={() => { setEditingPeriod(null); setPeriodOpen(true); }}>
                      <Plus className="h-4 w-4 mr-2" />Add Period
                    </Button>
                  )}
                </div>
                {(sg?.time_periods.length ?? 0) === 0 ? (
                  <CardContent className="flex items-center justify-center py-8 text-sm text-muted-foreground">No time periods configured</CardContent>
                ) : (
                  <ScrollArea>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Days</TableHead>
                          <TableHead>Description</TableHead>
                          {hasWritePermission && <TableHead className="text-right">Actions</TableHead>}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {sg?.time_periods.map((t) => (
                          <TableRow key={t.name}>
                            <TableCell className="font-mono">{t.name}</TableCell>
                            <TableCell>
                              <CellChips items={t.days.map((d) => `${d.day}${d.time ? ` ${d.time}` : ""}`)} />
                            </TableCell>
                            <TableCell className="text-sm">{t.description ?? "—"}</TableCell>
                            {hasWritePermission && (
                              <TableCell className="text-right">
                                <div className="flex items-center justify-end gap-1">
                                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditingPeriod(t); setPeriodOpen(true); }}><Pencil className="h-4 w-4" /></Button>
                                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setDeletingPeriod(t.name)}><Trash2 className="h-4 w-4" /></Button>
                                </div>
                              </TableCell>
                            )}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                )}
              </Card>

              {/* Rules */}
              <Card>
                <div className="flex items-center justify-between p-4 border-b">
                  <h3 className="font-semibold">Filter Rules</h3>
                  {hasWritePermission && (
                    <Button size="sm" variant="outline" onClick={() => { setEditingRule(null); setRuleOpen(true); }}>
                      <Plus className="h-4 w-4 mr-2" />Add Rule
                    </Button>
                  )}
                </div>
                {ruleCount === 0 ? (
                  <CardContent className="flex items-center justify-center py-8 text-sm text-muted-foreground">No filter rules configured</CardContent>
                ) : (
                  <ScrollArea>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Rule</TableHead>
                          <TableHead>Source Group</TableHead>
                          <TableHead>Time Period</TableHead>
                          <TableHead>Default Action</TableHead>
                          <TableHead>Block Categories</TableHead>
                          {hasWritePermission && <TableHead className="text-right">Actions</TableHead>}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {sg?.rules.map((r) => (
                          <TableRow key={r.number}>
                            <TableCell className="font-mono">{r.number}</TableCell>
                            <TableCell className="font-mono">{r.source_group ?? "any"}</TableCell>
                            <TableCell className="font-mono">{r.time_period ?? "always"}</TableCell>
                            <TableCell>{r.default_action ?? "allow"}</TableCell>
                            <TableCell><CellChips items={r.block_categories} /></TableCell>
                            {hasWritePermission && (
                              <TableCell className="text-right">
                                <div className="flex items-center justify-end gap-1">
                                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditingRule(r); setRuleOpen(true); }}><Pencil className="h-4 w-4" /></Button>
                                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setDeletingRule(r.number)}><Trash2 className="h-4 w-4" /></Button>
                                </div>
                              </TableCell>
                            )}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                )}
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Modals */}
      <WebProxySettingsModal
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        config={config}
        caps={caps}
        onSubmit={async (newConfig) => {
          await webProxyService.saveSettings(newConfig);
          await loadData(true);
        }}
      />

      <WebProxyAuthModal
        open={authOpen}
        onOpenChange={setAuthOpen}
        auth={config?.authentication ?? null}
        caps={caps}
        onSubmit={async (auth) => {
          await webProxyService.saveAuthentication(auth);
          await loadData(true);
        }}
      />

      <WebProxyCachePeerModal
        open={peerOpen}
        onOpenChange={(o) => { setPeerOpen(o); if (!o) setEditingPeer(null); }}
        peer={editingPeer}
        caps={caps}
        onSubmit={async (peer, isEdit) => {
          await webProxyService.saveCachePeer(peer, isEdit);
          await loadData(true);
        }}
      />

      <WebProxyListenAddressModal
        open={listenOpen}
        onOpenChange={(o) => { setListenOpen(o); if (!o) setEditingListen(null); }}
        listenAddress={editingListen}
        onSubmit={async (addr, isEdit) => {
          await webProxyService.saveListenAddress(addr, isEdit);
          await loadData(true);
        }}
      />

      {sg && (
        <WebProxySquidGuardModal
          open={squidguardOpen}
          onOpenChange={setSquidguardOpen}
          squidguard={sg}
          caps={caps}
          onSubmit={async (newSg) => {
            await webProxyService.saveSquidGuardGlobal(newSg);
            await loadData(true);
          }}
        />
      )}

      <WebProxyRuleModal
        open={ruleOpen}
        onOpenChange={(o) => { setRuleOpen(o); if (!o) setEditingRule(null); }}
        rule={editingRule}
        caps={caps}
        sourceGroups={sourceGroupNames}
        timePeriods={timePeriodNames}
        existingNumbers={sg?.rules.map((r) => r.number) ?? []}
        onSubmit={async (rule, isEdit) => {
          await webProxyService.saveRule(rule, isEdit);
          await loadData(true);
        }}
      />

      <WebProxySourceGroupModal
        open={groupOpen}
        onOpenChange={(o) => { setGroupOpen(o); if (!o) setEditingGroup(null); }}
        sourceGroup={editingGroup}
        existingNames={sourceGroupNames}
        onSubmit={async (group, isEdit) => {
          await webProxyService.saveSourceGroup(group, isEdit);
          await loadData(true);
        }}
      />

      <WebProxyTimePeriodModal
        open={periodOpen}
        onOpenChange={(o) => { setPeriodOpen(o); if (!o) setEditingPeriod(null); }}
        timePeriod={editingPeriod}
        caps={caps}
        existingNames={timePeriodNames}
        onSubmit={async (period, isEdit) => {
          await webProxyService.saveTimePeriod(period, isEdit);
          await loadData(true);
        }}
      />

      {/* Delete confirmations */}
      <DeleteDialog
        open={!!deletingPeer}
        title="Delete Cache Peer"
        name={deletingPeer}
        actionLoading={actionLoading}
        onCancel={() => setDeletingPeer(null)}
        onConfirm={() => withAction(async () => { await webProxyService.deleteCachePeer(deletingPeer!); setDeletingPeer(null); })}
      />
      <DeleteDialog
        open={!!deletingListen}
        title="Delete Listen Address"
        name={deletingListen}
        actionLoading={actionLoading}
        onCancel={() => setDeletingListen(null)}
        onConfirm={() => withAction(async () => { await webProxyService.deleteListenAddress(deletingListen!); setDeletingListen(null); })}
      />
      <DeleteDialog
        open={!!deletingRule}
        title="Delete Filter Rule"
        name={deletingRule}
        actionLoading={actionLoading}
        onCancel={() => setDeletingRule(null)}
        onConfirm={() => withAction(async () => { await webProxyService.deleteRule(deletingRule!); setDeletingRule(null); })}
      />
      <DeleteDialog
        open={!!deletingGroup}
        title="Delete Source Group"
        name={deletingGroup}
        actionLoading={actionLoading}
        onCancel={() => setDeletingGroup(null)}
        onConfirm={() => withAction(async () => { await webProxyService.deleteSourceGroup(deletingGroup!); setDeletingGroup(null); })}
      />
      <DeleteDialog
        open={!!deletingPeriod}
        title="Delete Time Period"
        name={deletingPeriod}
        actionLoading={actionLoading}
        onCancel={() => setDeletingPeriod(null)}
        onConfirm={() => withAction(async () => { await webProxyService.deleteTimePeriod(deletingPeriod!); setDeletingPeriod(null); })}
      />
    </>
  );
}

function Row({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-mono">{value}</span>
    </div>
  );
}

function ChipCard({ title, items }: { title: string; items: string[] }) {
  return (
    <Card>
      <div className="p-3 border-b"><h4 className="font-semibold text-sm">{title}</h4></div>
      <CardContent className="pt-3">
        {items.length === 0 ? (
          <span className="text-sm text-muted-foreground">—</span>
        ) : (
          <div className="flex flex-wrap gap-1">
            {items.map((i) => <Badge key={i} variant="secondary" className="font-mono text-xs">{i}</Badge>)}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function CellChips({ items }: { items: string[] }) {
  if (items.length === 0) return <span className="text-muted-foreground">—</span>;
  return (
    <div className="flex flex-wrap gap-1">
      {items.map((i) => <Badge key={i} variant="secondary" className="font-mono text-xs">{i}</Badge>)}
    </div>
  );
}

function DeleteDialog({
  open,
  title,
  name,
  actionLoading,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  title: string;
  name: string | null;
  actionLoading: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <AlertDialog open={open} onOpenChange={(o) => { if (!o) onCancel(); }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>Remove <span className="font-mono">{name}</span>? This cannot be undone.</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>
            {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Delete"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
