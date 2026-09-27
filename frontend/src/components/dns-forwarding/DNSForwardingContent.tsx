"use client";

import { useState, useEffect, useCallback } from "react";
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
  Database,
} from "lucide-react";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import {
  dnsForwardingService,
  DNSForwardingConfig,
  DNSForwardingCapabilities,
  DomainForwarder,
  AuthoritativeDomain,
  ZoneCache,
} from "@/lib/api/dns-forwarding";
import { DNSForwardingSettingsModal } from "./DNSForwardingSettingsModal";
import { DNSForwardingNameServerModal } from "./DNSForwardingNameServerModal";
import { DNSForwardingDomainModal } from "./DNSForwardingDomainModal";
import { DNSForwardingAuthDomainModal } from "./DNSForwardingAuthDomainModal";
import { DNSForwardingZoneCacheModal } from "./DNSForwardingZoneCacheModal";
import { usePermissions } from "@/hooks/usePermissions";
import { FeatureGroup } from "@/lib/api/user-management";

export function DNSForwardingContent() {
  const t = useTranslations("dnsForwarding");
  const tc = useTranslations("common");
  const { canWrite } = usePermissions();
  const hasWritePermission = canWrite(FeatureGroup.DNS_FORWARDING);

  const [config, setConfig] = useState<DNSForwardingConfig | null>(null);
  const [caps, setCaps] = useState<DNSForwardingCapabilities | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal state
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [nsModalOpen, setNsModalOpen] = useState(false);
  const [domainModalOpen, setDomainModalOpen] = useState(false);
  const [authDomainModalOpen, setAuthDomainModalOpen] = useState(false);
  const [zoneCacheModalOpen, setZoneCacheModalOpen] = useState(false);

  const [editingDomain, setEditingDomain] = useState<DomainForwarder | null>(null);
  const [editingAuthDomain, setEditingAuthDomain] = useState<AuthoritativeDomain | null>(null);
  const [editingZoneCache, setEditingZoneCache] = useState<ZoneCache | null>(null);

  // Delete confirm
  const [deletingNs, setDeletingNs] = useState<string | null>(null);
  const [deletingDomain, setDeletingDomain] = useState<string | null>(null);
  const [deletingAuthDomain, setDeletingAuthDomain] = useState<string | null>(null);
  const [deletingZoneCache, setDeletingZoneCache] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const loadData = useCallback(async (refresh = false) => {
    try {
      setLoading(true);
      setError(null);
      const [configData, capsData] = await Promise.all([
        dnsForwardingService.getConfig(refresh),
        dnsForwardingService.getCapabilities(),
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

  const isConfigured = (config?.listen_addresses.length ?? 0) > 0 || (config?.name_servers.length ?? 0) > 0;
  const zoneCount = config?.zone_caches.length ?? 0;

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
                  {!hasWritePermission && <Badge variant="secondary">{t("content.readOnly")}</Badge>}
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
                  <div className="rounded-md p-2 bg-primary/10">
                    <Network className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{config?.listen_addresses.length ?? 0}</p>
                    <p className="text-xs text-muted-foreground">{t("content.listenAddresses")}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-md p-2 bg-primary/10">
                    <Server className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{config?.name_servers.length ?? 0}</p>
                    <p className="text-xs text-muted-foreground">{t("content.nameServers")}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-md p-2 bg-primary/10">
                    <Globe className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{config?.domain_forwarders.length ?? 0}</p>
                    <p className="text-xs text-muted-foreground">{t("content.domainForwarders")}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-md p-2 bg-primary/10">
                    <Database className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{config?.cache_size ?? "—"}</p>
                    <p className="text-xs text-muted-foreground">{t("content.cacheSize")}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex-1 p-6 pt-4 overflow-auto">
          <Tabs defaultValue="forwarding">
            <TabsList>
              <TabsTrigger value="forwarding">{t("content.tabForwarding")}</TabsTrigger>
              <TabsTrigger value="local-dns">{t("content.tabLocalDns")}</TabsTrigger>
              {caps?.features.zone_cache.supported && (
                <TabsTrigger value="zone-cache">{t("content.tabZoneCache")}</TabsTrigger>
              )}
              <TabsTrigger value="advanced">{t("content.tabAdvanced")}</TabsTrigger>
            </TabsList>

            {/* Forwarding Tab */}
            <TabsContent value="forwarding" className="space-y-4 mt-4">
              {/* Name Servers */}
              <Card>
                <div className="flex items-center justify-between p-4 border-b">
                  <h3 className="font-semibold">{t("content.nameServers")}</h3>
                  {hasWritePermission && (
                    <Button size="sm" variant="outline" onClick={() => setNsModalOpen(true)}>
                      <Plus className="h-4 w-4 mr-2" />{t("content.addNameServer")}
                    </Button>
                  )}
                </div>
                {(config?.name_servers.length ?? 0) === 0 ? (
                  <CardContent className="flex items-center justify-center py-8 text-sm text-muted-foreground">
                    {t("content.noNameServers")}
                  </CardContent>
                ) : (
                  <ScrollArea>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>{t("content.ipAddress")}</TableHead>
                          <TableHead>{t("content.port")}</TableHead>
                          {hasWritePermission && <TableHead className="text-right">{tc("actions")}</TableHead>}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {config?.name_servers.map((ns) => (
                          <TableRow key={ns.ip}>
                            <TableCell className="font-mono">{ns.ip}</TableCell>
                            <TableCell>{ns.port ?? <span className="text-muted-foreground">{t("defaultValue", { value: "53" })}</span>}</TableCell>
                            {hasWritePermission && (
                              <TableCell className="text-right">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-destructive hover:text-destructive"
                                  onClick={() => setDeletingNs(ns.ip)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </TableCell>
                            )}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                )}
              </Card>

              {/* Domain Forwarders */}
              <Card>
                <div className="flex items-center justify-between p-4 border-b">
                  <h3 className="font-semibold">{t("content.domainForwarders")}</h3>
                  {hasWritePermission && (
                    <Button size="sm" variant="outline" onClick={() => { setEditingDomain(null); setDomainModalOpen(true); }}>
                      <Plus className="h-4 w-4 mr-2" />{t("content.addDomain")}
                    </Button>
                  )}
                </div>
                {(config?.domain_forwarders.length ?? 0) === 0 ? (
                  <CardContent className="flex items-center justify-center py-8 text-sm text-muted-foreground">
                    {t("content.noDomainForwarders")}
                  </CardContent>
                ) : (
                  <ScrollArea>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>{t("content.domain")}</TableHead>
                          <TableHead>{t("content.nameServers")}</TableHead>
                          <TableHead>{t("content.flags")}</TableHead>
                          {hasWritePermission && <TableHead className="text-right">{tc("actions")}</TableHead>}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {config?.domain_forwarders.map((df) => (
                          <TableRow key={df.domain}>
                            <TableCell className="font-mono">{df.domain}</TableCell>
                            <TableCell>
                              <div className="flex flex-wrap gap-1">
                                {df.name_servers.map((ns) => (
                                  <Badge key={ns.ip} variant="secondary" className="font-mono text-xs">
                                    {ns.ip}{ns.port ? `:${ns.port}` : ""}
                                  </Badge>
                                ))}
                                {df.name_servers.length === 0 && <span className="text-muted-foreground">—</span>}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-1">
                                {df.addnta && <Badge variant="outline" className="text-xs">NTA</Badge>}
                                {df.recursion_desired && <Badge variant="outline" className="text-xs">RD</Badge>}
                                {!df.addnta && !df.recursion_desired && <span className="text-muted-foreground">—</span>}
                              </div>
                            </TableCell>
                            {hasWritePermission && (
                              <TableCell className="text-right">
                                <div className="flex items-center justify-end gap-1">
                                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditingDomain(df); setDomainModalOpen(true); }}>
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setDeletingDomain(df.domain)}>
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
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

              {/* Settings Summary */}
              <Card>
                <div className="p-4 border-b">
                  <h3 className="font-semibold">{t("content.resolverSettings")}</h3>
                </div>
                <CardContent className="pt-4">
                  <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">DNSSEC</span>
                      <span className="font-mono">{config?.dnssec ?? t("content.notSet")}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{t("content.port")}</span>
                      <span className="font-mono">{config?.port ?? t("defaultValue", { value: "53" })}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{t("content.systemNs")}</span>
                      <span>{config?.system ? t("yes") : t("no")}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{t("content.ignoreHosts")}</span>
                      <span>{config?.ignore_hosts_file ? t("yes") : t("no")}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{t("content.noRfc1918")}</span>
                      <span>{config?.no_serve_rfc1918 ? t("yes") : t("no")}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Local DNS Tab */}
            <TabsContent value="local-dns" className="mt-4">
              <Card>
                <div className="flex items-center justify-between p-4 border-b">
                  <h3 className="font-semibold">{t("content.authoritativeZones")}</h3>
                  {hasWritePermission && (
                    <Button size="sm" variant="outline" onClick={() => { setEditingAuthDomain(null); setAuthDomainModalOpen(true); }}>
                      <Plus className="h-4 w-4 mr-2" />{t("content.addZone")}
                    </Button>
                  )}
                </div>
                {(config?.authoritative_domains.length ?? 0) === 0 ? (
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <Globe className="h-12 w-12 text-muted-foreground/30 mb-4" />
                    <p className="text-sm text-muted-foreground mb-2">{t("content.noAuthoritativeZones")}</p>
                    <p className="text-xs text-muted-foreground">{t("content.localZonesHelp")}</p>
                    {hasWritePermission && (
                      <Button size="sm" className="mt-4" onClick={() => { setEditingAuthDomain(null); setAuthDomainModalOpen(true); }}>
                        <Plus className="h-4 w-4 mr-2" />{t("content.addZone")}
                      </Button>
                    )}
                  </CardContent>
                ) : (
                  <ScrollArea>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>{t("content.zone")}</TableHead>
                          <TableHead>{t("content.recordCount")}</TableHead>
                          <TableHead>{tc("status")}</TableHead>
                          {hasWritePermission && <TableHead className="text-right">{tc("actions")}</TableHead>}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {config?.authoritative_domains.map((ad) => {
                          const total = ad.records.a.length + ad.records.aaaa.length + ad.records.cname.length + ad.records.mx.length + ad.records.txt.length + ad.records.ns.length + ad.records.ptr.length + (ad.records.naptr?.length ?? 0) + (ad.records.spf?.length ?? 0) + (ad.records.srv?.length ?? 0);
                          return (
                            <TableRow key={ad.domain}>
                              <TableCell className="font-mono">{ad.domain}</TableCell>
                              <TableCell>{total}</TableCell>
                              <TableCell>
                                {ad.disabled ? (
                                  <Badge variant="secondary" className="bg-muted text-muted-foreground">{tc("disabled")}</Badge>
                                ) : (
                                  <Badge variant="secondary" className="bg-green-500/10 text-green-600">{t("content.active")}</Badge>
                                )}
                              </TableCell>
                              {hasWritePermission && (
                                <TableCell className="text-right">
                                  <div className="flex items-center justify-end gap-1">
                                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditingAuthDomain(ad); setAuthDomainModalOpen(true); }}>
                                      <Pencil className="h-4 w-4" />
                                    </Button>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setDeletingAuthDomain(ad.domain)}>
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </TableCell>
                              )}
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                )}
              </Card>
            </TabsContent>

            {/* Zone Cache Tab (1.5 only) */}
            {caps?.features.zone_cache.supported && (
              <TabsContent value="zone-cache" className="mt-4">
                <Card>
                  <div className="flex items-center justify-between p-4 border-b">
                    <h3 className="font-semibold">{t("content.tabZoneCache")}</h3>
                    {hasWritePermission && (
                      <Button size="sm" variant="outline" onClick={() => { setEditingZoneCache(null); setZoneCacheModalOpen(true); }}>
                        <Plus className="h-4 w-4 mr-2" />{t("content.addZoneCache")}
                      </Button>
                    )}
                  </div>
                  {zoneCount === 0 ? (
                    <CardContent className="flex items-center justify-center py-8 text-sm text-muted-foreground">
                      {t("content.noZoneCaches")}
                    </CardContent>
                  ) : (
                    <ScrollArea>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>{t("content.zone")}</TableHead>
                            <TableHead>{t("content.sourceType")}</TableHead>
                            <TableHead>{t("content.source")}</TableHead>
                            <TableHead>DNSSEC</TableHead>
                            {hasWritePermission && <TableHead className="text-right">{tc("actions")}</TableHead>}
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {config?.zone_caches.map((zc) => (
                            <TableRow key={zc.zone}>
                              <TableCell className="font-mono">{zc.zone}</TableCell>
                              <TableCell>
                                <Badge variant="outline" className="text-xs">
                                  {zc.source_axfr ? "AXFR" : "URL"}
                                </Badge>
                              </TableCell>
                              <TableCell className="font-mono text-sm">
                                {zc.source_url ?? zc.source_axfr ?? "—"}
                              </TableCell>
                              <TableCell>{zc.options.dnssec ?? "—"}</TableCell>
                              {hasWritePermission && (
                                <TableCell className="text-right">
                                  <div className="flex items-center justify-end gap-1">
                                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditingZoneCache(zc); setZoneCacheModalOpen(true); }}>
                                      <Pencil className="h-4 w-4" />
                                    </Button>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setDeletingZoneCache(zc.zone)}>
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
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
            )}

            {/* Advanced Tab */}
            <TabsContent value="advanced" className="mt-4">
              <div className="grid grid-cols-2 gap-4">
                <Card>
                  <div className="p-4 border-b"><h3 className="font-semibold text-sm">{t("content.timeouts")}</h3></div>
                  <CardContent className="pt-4 space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{t("content.timeout")}</span>
                      <span className="font-mono">{config?.timeout != null ? `${config.timeout} ms` : t("defaultValue", { value: "1500 ms" })}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{t("content.negativeTtl")}</span>
                      <span className="font-mono">{config?.negative_ttl != null ? `${config.negative_ttl} s` : t("defaultValue", { value: "3600 s" })}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{t("content.serveStaleExtension")}</span>
                      <span className="font-mono">{config?.serve_stale_extension != null ? String(config.serve_stale_extension) : t("defaultValue", { value: "0" })}</span>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <div className="p-4 border-b"><h3 className="font-semibold text-sm">{t("content.routing")}</h3></div>
                  <CardContent className="pt-4 space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{t("content.dns64Prefix")}</span>
                      <span className="font-mono">{config?.dns64_prefix ?? "—"}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block mb-1">{t("content.sourceAddresses")}</span>
                      {(config?.source_addresses.length ?? 0) === 0 ? (
                        <span className="text-muted-foreground">—</span>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {config?.source_addresses.map((a) => <Badge key={a} variant="secondary" className="font-mono text-xs">{a}</Badge>)}
                        </div>
                      )}
                    </div>
                    <div>
                      <span className="text-muted-foreground block mb-1">{t("content.dhcpInterfaces")}</span>
                      {(config?.dhcp_interfaces.length ?? 0) === 0 ? (
                        <span className="text-muted-foreground">—</span>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {config?.dhcp_interfaces.map((i) => <Badge key={i} variant="secondary" className="font-mono text-xs">{i}</Badge>)}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <div className="p-4 border-b"><h3 className="font-semibold text-sm">{t("content.throttleExclusions")}</h3></div>
                  <CardContent className="pt-4 text-sm">
                    {(config?.exclude_throttle_addresses.length ?? 0) === 0 ? (
                      <span className="text-muted-foreground">—</span>
                    ) : (
                      <div className="flex flex-wrap gap-1">
                        {config?.exclude_throttle_addresses.map((a) => <Badge key={a} variant="secondary" className="font-mono text-xs">{a}</Badge>)}
                      </div>
                    )}
                  </CardContent>
                </Card>
                {caps?.features.options_ecs.supported && (
                  <Card>
                    <div className="p-4 border-b"><h3 className="font-semibold text-sm">{t("content.ecsOptions")}</h3></div>
                    <CardContent className="pt-4 space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">{t("content.ipv4Bits")}</span>
                        <span className="font-mono">{config?.ecs_options.ecs_ipv4_bits ?? "—"}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block mb-1">{t("content.ecsAddFor")}</span>
                        {(config?.ecs_options.ecs_add_for.length ?? 0) === 0 ? (
                          <span className="text-muted-foreground">—</span>
                        ) : (
                          <div className="flex flex-wrap gap-1">
                            {config?.ecs_options.ecs_add_for.map((a) => <Badge key={a} variant="secondary" className="font-mono text-xs">{a}</Badge>)}
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
              {hasWritePermission && (
                <div className="mt-4">
                  <Button variant="outline" size="sm" onClick={() => setSettingsOpen(true)}>
                    <Settings2 className="h-4 w-4 mr-2" />{t("content.editAdvancedSettings")}
                  </Button>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Modals */}
      <DNSForwardingSettingsModal
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        config={config}
        caps={caps}
        onSubmit={async (newConfig) => {
          await dnsForwardingService.saveSettings(newConfig, caps!);
          await loadData(true);
        }}
      />

      <DNSForwardingNameServerModal
        open={nsModalOpen}
        onOpenChange={setNsModalOpen}
        onSubmit={async (ip, port) => {
          await dnsForwardingService.addNameServer(ip, port);
          await loadData(true);
        }}
      />

      <DNSForwardingDomainModal
        open={domainModalOpen}
        onOpenChange={(open) => { setDomainModalOpen(open); if (!open) setEditingDomain(null); }}
        domain={editingDomain}
        onSubmit={async (domain, nameServers, addnta, recursionDesired) => {
          if (editingDomain) {
            await dnsForwardingService.updateDomainForwarder(editingDomain, nameServers, addnta, recursionDesired);
          } else {
            await dnsForwardingService.addDomainForwarder(domain, nameServers, addnta, recursionDesired);
          }
          await loadData(true);
        }}
      />

      <DNSForwardingAuthDomainModal
        open={authDomainModalOpen}
        onOpenChange={(open) => { setAuthDomainModalOpen(open); if (!open) setEditingAuthDomain(null); }}
        authDomain={editingAuthDomain}
        capabilities={caps}
        onSubmit={async (domain, disabled, records) => {
          await dnsForwardingService.saveAuthDomain(domain, disabled, records);
          await loadData(true);
        }}
      />

      {caps?.features.zone_cache.supported && (
        <DNSForwardingZoneCacheModal
          open={zoneCacheModalOpen}
          onOpenChange={(open) => { setZoneCacheModalOpen(open); if (!open) setEditingZoneCache(null); }}
          zoneCache={editingZoneCache}
          onSubmit={async (zone, sourceUrl, sourceAxfr, options) => {
            await dnsForwardingService.saveZoneCache(zone, sourceUrl, sourceAxfr, options);
            await loadData(true);
          }}
        />
      )}

      {/* Delete confirmations */}
      <AlertDialog open={!!deletingNs} onOpenChange={(open) => { if (!open) setDeletingNs(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("content.deleteNsTitle")}</AlertDialogTitle>
            <AlertDialogDescription>{t.rich("content.deleteNsConfirm", { name: deletingNs ?? "", mono: (chunks) => <span className="font-mono">{chunks}</span> })}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{tc("cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={() => withAction(async () => { await dnsForwardingService.deleteNameServer(deletingNs!); setDeletingNs(null); })}>
              {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : tc("delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!deletingDomain} onOpenChange={(open) => { if (!open) setDeletingDomain(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("content.deleteDomainTitle")}</AlertDialogTitle>
            <AlertDialogDescription>{t.rich("content.deleteDomainConfirm", { name: deletingDomain ?? "", mono: (chunks) => <span className="font-mono">{chunks}</span> })}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{tc("cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={() => withAction(async () => { await dnsForwardingService.deleteDomainForwarder(deletingDomain!); setDeletingDomain(null); })}>
              {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : tc("delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!deletingAuthDomain} onOpenChange={(open) => { if (!open) setDeletingAuthDomain(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("content.deleteZoneTitle")}</AlertDialogTitle>
            <AlertDialogDescription>{t.rich("content.deleteZoneConfirm", { name: deletingAuthDomain ?? "", mono: (chunks) => <span className="font-mono">{chunks}</span> })}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{tc("cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={() => withAction(async () => { await dnsForwardingService.deleteAuthDomain(deletingAuthDomain!); setDeletingAuthDomain(null); })}>
              {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : tc("delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!deletingZoneCache} onOpenChange={(open) => { if (!open) setDeletingZoneCache(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("content.deleteZoneCacheTitle")}</AlertDialogTitle>
            <AlertDialogDescription>{t.rich("content.deleteZoneCacheConfirm", { name: deletingZoneCache ?? "", mono: (chunks) => <span className="font-mono">{chunks}</span> })}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{tc("cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={() => withAction(async () => { await dnsForwardingService.deleteZoneCache(deletingZoneCache!); setDeletingZoneCache(null); })}>
              {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : tc("delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
