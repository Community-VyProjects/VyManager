"use client";

import { useState, useEffect, useCallback } from "react";
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
      setError(err instanceof Error ? err.message : "Failed to load DNS forwarding configuration");
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
                  <h1 className="text-2xl font-bold text-foreground">DNS Forwarding</h1>
                  {!hasWritePermission && <Badge variant="secondary">Read Only</Badge>}
                  <Badge variant={isConfigured ? "default" : "secondary"} className={isConfigured ? "bg-green-500/10 text-green-600 border-green-500/20" : ""}>
                    {isConfigured ? "Configured" : "Unconfigured"}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground mt-0.5">
                  PowerDNS Recursor — forwarding, local zones, and zone cache
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
                  <div className="rounded-md p-2 bg-primary/10">
                    <Network className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{config?.listen_addresses.length ?? 0}</p>
                    <p className="text-xs text-muted-foreground">Listen Addresses</p>
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
                    <p className="text-xs text-muted-foreground">Name Servers</p>
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
                    <p className="text-xs text-muted-foreground">Domain Forwarders</p>
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
                    <p className="text-xs text-muted-foreground">Cache Size</p>
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
              <TabsTrigger value="forwarding">Forwarding</TabsTrigger>
              <TabsTrigger value="local-dns">Local DNS</TabsTrigger>
              {caps?.features.zone_cache.supported && (
                <TabsTrigger value="zone-cache">Zone Cache</TabsTrigger>
              )}
              <TabsTrigger value="advanced">Advanced</TabsTrigger>
            </TabsList>

            {/* Forwarding Tab */}
            <TabsContent value="forwarding" className="space-y-4 mt-4">
              {/* Name Servers */}
              <Card>
                <div className="flex items-center justify-between p-4 border-b">
                  <h3 className="font-semibold">Name Servers</h3>
                  {hasWritePermission && (
                    <Button size="sm" variant="outline" onClick={() => setNsModalOpen(true)}>
                      <Plus className="h-4 w-4 mr-2" />Add Name Server
                    </Button>
                  )}
                </div>
                {(config?.name_servers.length ?? 0) === 0 ? (
                  <CardContent className="flex items-center justify-center py-8 text-sm text-muted-foreground">
                    No upstream name servers configured
                  </CardContent>
                ) : (
                  <ScrollArea>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>IP Address</TableHead>
                          <TableHead>Port</TableHead>
                          {hasWritePermission && <TableHead className="text-right">Actions</TableHead>}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {config?.name_servers.map((ns) => (
                          <TableRow key={ns.ip}>
                            <TableCell className="font-mono">{ns.ip}</TableCell>
                            <TableCell>{ns.port ?? <span className="text-muted-foreground">53 (default)</span>}</TableCell>
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
                  <h3 className="font-semibold">Domain Forwarders</h3>
                  {hasWritePermission && (
                    <Button size="sm" variant="outline" onClick={() => { setEditingDomain(null); setDomainModalOpen(true); }}>
                      <Plus className="h-4 w-4 mr-2" />Add Domain
                    </Button>
                  )}
                </div>
                {(config?.domain_forwarders.length ?? 0) === 0 ? (
                  <CardContent className="flex items-center justify-center py-8 text-sm text-muted-foreground">
                    No domain forwarders configured
                  </CardContent>
                ) : (
                  <ScrollArea>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Domain</TableHead>
                          <TableHead>Name Servers</TableHead>
                          <TableHead>Flags</TableHead>
                          {hasWritePermission && <TableHead className="text-right">Actions</TableHead>}
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
                  <h3 className="font-semibold">Resolver Settings</h3>
                </div>
                <CardContent className="pt-4">
                  <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">DNSSEC</span>
                      <span className="font-mono">{config?.dnssec ?? "not set"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Port</span>
                      <span className="font-mono">{config?.port ?? "53 (default)"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">System NS</span>
                      <span>{config?.system ? "Yes" : "No"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Ignore Hosts</span>
                      <span>{config?.ignore_hosts_file ? "Yes" : "No"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">No RFC1918</span>
                      <span>{config?.no_serve_rfc1918 ? "Yes" : "No"}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Local DNS Tab */}
            <TabsContent value="local-dns" className="mt-4">
              <Card>
                <div className="flex items-center justify-between p-4 border-b">
                  <h3 className="font-semibold">Authoritative Zones</h3>
                  {hasWritePermission && (
                    <Button size="sm" variant="outline" onClick={() => { setEditingAuthDomain(null); setAuthDomainModalOpen(true); }}>
                      <Plus className="h-4 w-4 mr-2" />Add Zone
                    </Button>
                  )}
                </div>
                {(config?.authoritative_domains.length ?? 0) === 0 ? (
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <Globe className="h-12 w-12 text-muted-foreground/30 mb-4" />
                    <p className="text-sm text-muted-foreground mb-2">No authoritative zones configured</p>
                    <p className="text-xs text-muted-foreground">Local DNS zones allow this router to answer queries authoritatively.</p>
                    {hasWritePermission && (
                      <Button size="sm" className="mt-4" onClick={() => { setEditingAuthDomain(null); setAuthDomainModalOpen(true); }}>
                        <Plus className="h-4 w-4 mr-2" />Add Zone
                      </Button>
                    )}
                  </CardContent>
                ) : (
                  <ScrollArea>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Zone</TableHead>
                          <TableHead># Records</TableHead>
                          <TableHead>Status</TableHead>
                          {hasWritePermission && <TableHead className="text-right">Actions</TableHead>}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {config?.authoritative_domains.map((ad) => {
                          const total = ad.records.a.length + ad.records.aaaa.length + ad.records.cname.length + ad.records.mx.length + ad.records.txt.length + ad.records.ns.length + ad.records.ptr.length;
                          return (
                            <TableRow key={ad.domain}>
                              <TableCell className="font-mono">{ad.domain}</TableCell>
                              <TableCell>{total}</TableCell>
                              <TableCell>
                                {ad.disabled ? (
                                  <Badge variant="secondary" className="bg-muted text-muted-foreground">Disabled</Badge>
                                ) : (
                                  <Badge variant="secondary" className="bg-green-500/10 text-green-600">Active</Badge>
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
                    <h3 className="font-semibold">Zone Cache</h3>
                    {hasWritePermission && (
                      <Button size="sm" variant="outline" onClick={() => { setEditingZoneCache(null); setZoneCacheModalOpen(true); }}>
                        <Plus className="h-4 w-4 mr-2" />Add Zone Cache
                      </Button>
                    )}
                  </div>
                  {zoneCount === 0 ? (
                    <CardContent className="flex items-center justify-center py-8 text-sm text-muted-foreground">
                      No zone caches configured
                    </CardContent>
                  ) : (
                    <ScrollArea>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Zone</TableHead>
                            <TableHead>Source Type</TableHead>
                            <TableHead>Source</TableHead>
                            <TableHead>DNSSEC</TableHead>
                            {hasWritePermission && <TableHead className="text-right">Actions</TableHead>}
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
                  <div className="p-4 border-b"><h3 className="font-semibold text-sm">Timeouts</h3></div>
                  <CardContent className="pt-4 space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Timeout</span>
                      <span className="font-mono">{config?.timeout != null ? `${config.timeout} ms` : "1500 ms (default)"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Negative TTL</span>
                      <span className="font-mono">{config?.negative_ttl != null ? `${config.negative_ttl} s` : "3600 s (default)"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Serve Stale Extension</span>
                      <span className="font-mono">{config?.serve_stale_extension != null ? String(config.serve_stale_extension) : "0 (default)"}</span>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <div className="p-4 border-b"><h3 className="font-semibold text-sm">Routing</h3></div>
                  <CardContent className="pt-4 space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">DNS64 Prefix</span>
                      <span className="font-mono">{config?.dns64_prefix ?? "—"}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block mb-1">Source Addresses</span>
                      {(config?.source_addresses.length ?? 0) === 0 ? (
                        <span className="text-muted-foreground">—</span>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {config?.source_addresses.map((a) => <Badge key={a} variant="secondary" className="font-mono text-xs">{a}</Badge>)}
                        </div>
                      )}
                    </div>
                    <div>
                      <span className="text-muted-foreground block mb-1">DHCP Interfaces</span>
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
                  <div className="p-4 border-b"><h3 className="font-semibold text-sm">Throttle Exclusions</h3></div>
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
                    <div className="p-4 border-b"><h3 className="font-semibold text-sm">ECS Options</h3></div>
                    <CardContent className="pt-4 space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">IPv4 Bits</span>
                        <span className="font-mono">{config?.ecs_options.ecs_ipv4_bits ?? "—"}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block mb-1">ECS Add For</span>
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
                    <Settings2 className="h-4 w-4 mr-2" />Edit Advanced Settings
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
            <AlertDialogTitle>Delete Name Server</AlertDialogTitle>
            <AlertDialogDescription>Remove name server <span className="font-mono">{deletingNs}</span>?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => withAction(async () => { await dnsForwardingService.deleteNameServer(deletingNs!); setDeletingNs(null); })}>
              {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!deletingDomain} onOpenChange={(open) => { if (!open) setDeletingDomain(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Domain Forwarder</AlertDialogTitle>
            <AlertDialogDescription>Remove domain forwarder <span className="font-mono">{deletingDomain}</span>?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => withAction(async () => { await dnsForwardingService.deleteDomainForwarder(deletingDomain!); setDeletingDomain(null); })}>
              {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!deletingAuthDomain} onOpenChange={(open) => { if (!open) setDeletingAuthDomain(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Authoritative Zone</AlertDialogTitle>
            <AlertDialogDescription>Remove zone <span className="font-mono">{deletingAuthDomain}</span> and all its records?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => withAction(async () => { await dnsForwardingService.deleteAuthDomain(deletingAuthDomain!); setDeletingAuthDomain(null); })}>
              {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!deletingZoneCache} onOpenChange={(open) => { if (!open) setDeletingZoneCache(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Zone Cache</AlertDialogTitle>
            <AlertDialogDescription>Remove zone cache <span className="font-mono">{deletingZoneCache}</span>?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => withAction(async () => { await dnsForwardingService.deleteZoneCache(deletingZoneCache!); setDeletingZoneCache(null); })}>
              {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
