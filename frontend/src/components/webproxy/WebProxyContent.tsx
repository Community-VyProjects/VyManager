"use client";

import { useState, useEffect, useCallback, type ReactNode } from "react";
import { useTranslations } from "next-intl";
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
  const t = useTranslations("webproxy");
  const tc = useTranslations("common");
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
      setError(err instanceof Error ? err.message : t("content.loadFailed"));
    } finally {
      setLoading(false);
    }
  }, [t]);

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
      setError(err instanceof Error ? err.message : tc("operationFailed"));
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
        <Button variant="outline" onClick={() => loadData()}>{tc("retry")}</Button>
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
                  <h1 className="text-2xl font-bold text-foreground">{t("content.title")}</h1>
                  {!hasWritePermission && <Badge variant="secondary">{tc("readOnly")}</Badge>}
                  <Badge variant={isConfigured ? "default" : "secondary"} className={isConfigured ? "bg-green-500/10 text-green-600 border-green-500/20" : ""}>
                    {isConfigured ? t("content.configured") : t("content.unconfigured")}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {t("content.subtitle")}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {hasWritePermission && (
                <Button variant="outline" size="sm" onClick={() => setSettingsOpen(true)}>
                  <Settings2 className="h-4 w-4 mr-2" />
                  {t("content.editSettings")}
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={() => loadData(true)}>
                <RefreshCw className="h-4 w-4 mr-2" />
                {tc("refresh")}
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
                    <p className="text-xs text-muted-foreground">{t("content.defaultPort")}</p>
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
                    <p className="text-xs text-muted-foreground">{t("content.listenAddresses")}</p>
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
                    <p className="text-xs text-muted-foreground">{t("content.cachePeers")}</p>
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
                    <p className="text-xs text-muted-foreground">{t("content.filterRules")}</p>
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
              <TabsTrigger value="general">{t("content.tabs.general")}</TabsTrigger>
              <TabsTrigger value="authentication">{t("content.tabs.authentication")}</TabsTrigger>
              <TabsTrigger value="cache-peers">{t("content.cachePeers")}</TabsTrigger>
              <TabsTrigger value="listen">{t("content.listenAddresses")}</TabsTrigger>
              <TabsTrigger value="url-filtering">{t("content.tabs.urlFiltering")}</TabsTrigger>
            </TabsList>

            {/* General Tab */}
            <TabsContent value="general" className="space-y-4 mt-4">
              <Card>
                <div className="flex items-center justify-between p-4 border-b">
                  <h3 className="font-semibold">{t("content.proxySettings")}</h3>
                  {hasWritePermission && (
                    <Button size="sm" variant="outline" onClick={() => setSettingsOpen(true)}>
                      <Settings2 className="h-4 w-4 mr-2" />{tc("edit")}
                    </Button>
                  )}
                </div>
                <CardContent className="pt-4">
                  <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
                    <Row label={t("content.defaultPort")} value={config?.default_port ?? t("content.withDefault", { value: "3128" })} />
                    <Row label={t("content.diskCacheSize")} value={config?.cache_size != null ? `${config.cache_size} MB` : t("content.withDefault", { value: "100 MB" })} />
                    <Row label={t("content.memCacheSize")} value={config?.mem_cache_size != null ? `${config.mem_cache_size} MB` : t("content.withDefault", { value: "20 MB" })} />
                    <Row label={t("content.maxObjectSize")} value={config?.maximum_object_size != null ? `${config.maximum_object_size} KB` : "—"} />
                    <Row label={t("content.minObjectSize")} value={config?.minimum_object_size != null ? `${config.minimum_object_size} KB` : "—"} />
                    <Row label={t("content.replyBodyMaxSize")} value={config?.reply_body_max_size != null ? `${config.reply_body_max_size} KB` : "—"} />
                    <Row label={t("content.outgoingAddress")} value={config?.outgoing_address ?? "—"} />
                    <Row label={t("content.appendDomain")} value={config?.append_domain ?? "—"} />
                    <Row label={t("content.accessLogging")} value={config?.disable_access_log ? tc("disabled") : tc("enabled")} />
                  </div>
                </CardContent>
              </Card>

              <div className="grid grid-cols-2 gap-4">
                <ChipCard title={t("content.safePorts")} items={config?.safe_ports ?? []} />
                <ChipCard title={t("content.sslSafePorts")} items={config?.ssl_safe_ports ?? []} />
                <ChipCard title={t("content.blockedDomains")} items={config?.domain_block ?? []} />
                <ChipCard title={t("content.noncachedDomains")} items={config?.domain_noncache ?? []} />
                <ChipCard title={t("content.blockedMimeTypes")} items={config?.reply_block_mime ?? []} />
              </div>
            </TabsContent>

            {/* Authentication Tab */}
            <TabsContent value="authentication" className="mt-4">
              <Card>
                <div className="flex items-center justify-between p-4 border-b">
                  <h3 className="font-semibold">{t("content.proxyAuthentication")}</h3>
                  <div className="flex items-center gap-2">
                    {authConfigured && hasWritePermission && (
                      <Button size="sm" variant="outline" className="text-destructive hover:text-destructive" onClick={() => withAction(async () => { await webProxyService.clearAuthentication(); })}>
                        <Trash2 className="h-4 w-4 mr-2" />{t("content.clear")}
                      </Button>
                    )}
                    {hasWritePermission && (
                      <Button size="sm" variant="outline" onClick={() => setAuthOpen(true)}>
                        <KeyRound className="h-4 w-4 mr-2" />{authConfigured ? tc("edit") : t("content.configure")}
                      </Button>
                    )}
                  </div>
                </div>
                {!authConfigured ? (
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <KeyRound className="h-12 w-12 text-muted-foreground/30 mb-4" />
                    <p className="text-sm text-muted-foreground">{t("content.authNotConfigured")}</p>
                    <p className="text-xs text-muted-foreground">{t("content.authNotConfiguredHelp")}</p>
                  </CardContent>
                ) : (
                  <CardContent className="pt-4">
                    <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
                      <Row label={t("content.method")} value={config?.authentication.method ?? "—"} />
                      <Row label={t("content.realm")} value={config?.authentication.realm ?? "—"} />
                      <Row label={t("content.helperProcesses")} value={config?.authentication.children ?? t("content.withDefault", { value: "5" })} />
                      <Row label={t("content.credentialsTtl")} value={config?.authentication.credentials_ttl != null ? t("content.minutes", { value: String(config.authentication.credentials_ttl) }) : t("content.withDefault", { value: t("content.minutes", { value: "60" }) })} />
                      <Row label={t("content.ldapServer")} value={config?.authentication.ldap.server ?? "—"} />
                      <Row label={t("content.ldapPort")} value={config?.authentication.ldap.port ?? t("content.withDefault", { value: "389" })} />
                      <Row label={t("content.ldapVersion")} value={config?.authentication.ldap.version ?? t("content.withDefault", { value: "3" })} />
                      {/* eslint-disable-next-line vymanager/no-untranslated-text -- LDAP terms */}
                      <Row label="Base DN" value={config?.authentication.ldap.base_dn ?? "—"} />
                      {/* eslint-disable-next-line vymanager/no-untranslated-text -- LDAP terms */}
                      <Row label="Bind DN" value={config?.authentication.ldap.bind_dn ?? "—"} />
                      <Row label={t("content.useSslTls")} value={config?.authentication.ldap.use_ssl ? t("content.yes") : t("content.no")} />
                      <Row label={t("content.persistentConnection")} value={config?.authentication.ldap.persistent_connection ? t("content.yes") : t("content.no")} />
                    </div>
                  </CardContent>
                )}
              </Card>
            </TabsContent>

            {/* Cache Peers Tab */}
            <TabsContent value="cache-peers" className="mt-4">
              <Card>
                <div className="flex items-center justify-between p-4 border-b">
                  <h3 className="font-semibold">{t("content.cachePeers")}</h3>
                  {hasWritePermission && (
                    <Button size="sm" variant="outline" onClick={() => { setEditingPeer(null); setPeerOpen(true); }}>
                      <Plus className="h-4 w-4 mr-2" />{t("content.addPeer")}
                    </Button>
                  )}
                </div>
                {peerCount === 0 ? (
                  <CardContent className="flex items-center justify-center py-8 text-sm text-muted-foreground">
                    {t("content.noCachePeers")}
                  </CardContent>
                ) : (
                  <ScrollArea>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>{tc("name")}</TableHead>
                          <TableHead>{t("content.address")}</TableHead>
                          <TableHead>{t("content.type")}</TableHead>
                          <TableHead>{t("content.httpPort")}</TableHead>
                          <TableHead>{t("content.icpPort")}</TableHead>
                          <TableHead>{t("content.options")}</TableHead>
                          {hasWritePermission && <TableHead className="text-right">{tc("actions")}</TableHead>}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {config?.cache_peers.map((p) => (
                          <TableRow key={p.name}>
                            <TableCell className="font-mono">{p.name}</TableCell>
                            <TableCell className="font-mono">{p.address ?? "—"}</TableCell>
                            <TableCell>{p.type ?? tc("shown.parent")}</TableCell>
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
                  <h3 className="font-semibold">{t("content.listenAddresses")}</h3>
                  {hasWritePermission && (
                    <Button size="sm" variant="outline" onClick={() => { setEditingListen(null); setListenOpen(true); }}>
                      <Plus className="h-4 w-4 mr-2" />{t("content.addAddress")}
                    </Button>
                  )}
                </div>
                {listenCount === 0 ? (
                  <CardContent className="flex items-center justify-center py-8 text-sm text-muted-foreground">
                    {t("content.noListenAddresses")}
                  </CardContent>
                ) : (
                  <ScrollArea>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>{t("content.address")}</TableHead>
                          <TableHead>{t("content.port")}</TableHead>
                          <TableHead>{t("content.transparentMode")}</TableHead>
                          {hasWritePermission && <TableHead className="text-right">{tc("actions")}</TableHead>}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {config?.listen_addresses.map((a) => (
                          <TableRow key={a.address}>
                            <TableCell className="font-mono">{a.address}</TableCell>
                            <TableCell className="font-mono">{a.port ?? t("content.defaultLower")}</TableCell>
                            <TableCell>{a.disable_transparent ? <Badge variant="secondary">{tc("disabled")}</Badge> : <Badge variant="secondary" className="bg-green-500/10 text-green-600">{tc("enabled")}</Badge>}</TableCell>
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
                    {config?.url_filtering.disable && <Badge variant="secondary" className="bg-muted text-muted-foreground">{tc("disabled")}</Badge>}
                  </div>
                  <div className="flex items-center gap-2">
                    {hasWritePermission && (
                      <Button size="sm" variant="outline" onClick={() => withAction(async () => { await webProxyService.setUrlFilteringDisabled(!config?.url_filtering.disable); })}>
                        {config?.url_filtering.disable ? t("content.enable") : t("content.disable")}
                      </Button>
                    )}
                    {hasWritePermission && (
                      <Button size="sm" variant="outline" onClick={() => setSquidguardOpen(true)}>
                        <Settings2 className="h-4 w-4 mr-2" />{t("content.editFiltering")}
                      </Button>
                    )}
                  </div>
                </div>
                <CardContent className="pt-4">
                  <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
                    <Row label={t("content.defaultAction")} value={sg?.default_action ?? t("content.withDefault", { value: "allow" })} />
                    <Row label={t("content.redirectUrl")} value={sg?.redirect_url ?? t("content.withDefault", { value: "block.vyos.net" })} />
                    <Row label={t("content.autoUpdateHour")} value={sg?.auto_update_hour ?? "—"} />
                    <Row label={t("content.safeSearch")} value={sg?.enable_safe_search ? tc("enabled") : tc("disabled")} />
                    <Row label={t("content.allowIpaddrUrl")} value={sg?.allow_ipaddr_url ? t("content.yes") : t("content.no")} />
                  </div>
                  <div className="grid grid-cols-2 gap-4 mt-4">
                    <ChipCard title={t("content.allowCategories")} items={sg?.allow_categories ?? []} />
                    <ChipCard title={t("content.blockCategories")} items={sg?.block_categories ?? []} />
                    <ChipCard title={t("content.localBlock")} items={sg?.local_block ?? []} />
                    <ChipCard title={t("content.localAllow")} items={sg?.local_ok ?? []} />
                  </div>
                </CardContent>
              </Card>

              {/* Source Groups */}
              <Card>
                <div className="flex items-center justify-between p-4 border-b">
                  <h3 className="font-semibold">{t("content.sourceGroups")}</h3>
                  {hasWritePermission && (
                    <Button size="sm" variant="outline" onClick={() => { setEditingGroup(null); setGroupOpen(true); }}>
                      <Plus className="h-4 w-4 mr-2" />{t("content.addGroup")}
                    </Button>
                  )}
                </div>
                {(sg?.source_groups.length ?? 0) === 0 ? (
                  <CardContent className="flex items-center justify-center py-8 text-sm text-muted-foreground">{t("content.noSourceGroups")}</CardContent>
                ) : (
                  <ScrollArea>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>{tc("name")}</TableHead>
                          <TableHead>{t("content.addresses")}</TableHead>
                          <TableHead>{t("content.domains")}</TableHead>
                          <TableHead>{tc("description")}</TableHead>
                          {hasWritePermission && <TableHead className="text-right">{tc("actions")}</TableHead>}
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
                  <h3 className="font-semibold">{t("content.timePeriods")}</h3>
                  {hasWritePermission && (
                    <Button size="sm" variant="outline" onClick={() => { setEditingPeriod(null); setPeriodOpen(true); }}>
                      <Plus className="h-4 w-4 mr-2" />{t("content.addPeriod")}
                    </Button>
                  )}
                </div>
                {(sg?.time_periods.length ?? 0) === 0 ? (
                  <CardContent className="flex items-center justify-center py-8 text-sm text-muted-foreground">{t("content.noTimePeriods")}</CardContent>
                ) : (
                  <ScrollArea>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>{tc("name")}</TableHead>
                          <TableHead>{t("content.days")}</TableHead>
                          <TableHead>{tc("description")}</TableHead>
                          {hasWritePermission && <TableHead className="text-right">{tc("actions")}</TableHead>}
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
                  <h3 className="font-semibold">{t("content.filterRules")}</h3>
                  {hasWritePermission && (
                    <Button size="sm" variant="outline" onClick={() => { setEditingRule(null); setRuleOpen(true); }}>
                      <Plus className="h-4 w-4 mr-2" />{t("content.addRule")}
                    </Button>
                  )}
                </div>
                {ruleCount === 0 ? (
                  <CardContent className="flex items-center justify-center py-8 text-sm text-muted-foreground">{t("content.noFilterRules")}</CardContent>
                ) : (
                  <ScrollArea>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>{t("content.rule")}</TableHead>
                          <TableHead>{t("content.sourceGroup")}</TableHead>
                          <TableHead>{t("content.timePeriod")}</TableHead>
                          <TableHead>{t("content.defaultAction")}</TableHead>
                          <TableHead>{t("content.blockCategories")}</TableHead>
                          {hasWritePermission && <TableHead className="text-right">{tc("actions")}</TableHead>}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {sg?.rules.map((r) => (
                          <TableRow key={r.number}>
                            <TableCell className="font-mono">{r.number}</TableCell>
                            <TableCell className="font-mono">{r.source_group ?? tc("shown.any")}</TableCell>
                            <TableCell className="font-mono">{r.time_period ?? tc("shown.always")}</TableCell>
                            <TableCell>{r.default_action ?? tc("shown.allow")}</TableCell>
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
        title={t("content.deleteCachePeer")}
        name={deletingPeer}
        actionLoading={actionLoading}
        onCancel={() => setDeletingPeer(null)}
        onConfirm={() => withAction(async () => { await webProxyService.deleteCachePeer(deletingPeer!); setDeletingPeer(null); })}
      />
      <DeleteDialog
        open={!!deletingListen}
        title={t("content.deleteListenAddress")}
        name={deletingListen}
        actionLoading={actionLoading}
        onCancel={() => setDeletingListen(null)}
        onConfirm={() => withAction(async () => { await webProxyService.deleteListenAddress(deletingListen!); setDeletingListen(null); })}
      />
      <DeleteDialog
        open={!!deletingRule}
        title={t("content.deleteFilterRule")}
        name={deletingRule}
        actionLoading={actionLoading}
        onCancel={() => setDeletingRule(null)}
        onConfirm={() => withAction(async () => { await webProxyService.deleteRule(deletingRule!); setDeletingRule(null); })}
      />
      <DeleteDialog
        open={!!deletingGroup}
        title={t("content.deleteSourceGroup")}
        name={deletingGroup}
        actionLoading={actionLoading}
        onCancel={() => setDeletingGroup(null)}
        onConfirm={() => withAction(async () => { await webProxyService.deleteSourceGroup(deletingGroup!); setDeletingGroup(null); })}
      />
      <DeleteDialog
        open={!!deletingPeriod}
        title={t("content.deleteTimePeriod")}
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
  const t = useTranslations("webproxy");
  const tc = useTranslations("common");
  return (
    <AlertDialog open={open} onOpenChange={(o) => { if (!o) onCancel(); }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{t.rich("content.deleteConfirm", { name: name ?? "", code: (chunks) => <span className="font-mono">{chunks}</span> })}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{tc("cancel")}</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>
            {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : tc("delete")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
