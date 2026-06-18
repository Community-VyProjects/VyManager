"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Tabs, TabsContent, TabsList, TabsTrigger,
} from "@/components/ui/tabs";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertCircle, Database, Globe, Info, Loader2, Pencil, Plus,
  RefreshCw, Search, Server, Shield, Trash2, Zap,
} from "lucide-react";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import {
  lbService, LBConfig, LBCapabilities, LBBackend, LBService,
} from "@/lib/api/load-balancing";
import { usePermissions } from "@/hooks/usePermissions";
import { FeatureGroup } from "@/lib/api/user-management";
import { HAProxyBackendModal } from "./HAProxyBackendModal";
import { HAProxyServiceModal } from "./HAProxyServiceModal";
import { HAProxyQuickSetupModal } from "./HAProxyQuickSetupModal";

// ============================================================================
// Delete Dialog
// ============================================================================

function DeleteDialog({
  open, onOpenChange, title, description, onConfirm,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  title: string;
  description: string;
  onConfirm: () => Promise<void>;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { if (open) setError(null); }, [open]);

  const handleConfirm = async () => {
    setLoading(true);
    setError(null);
    try {
      await onConfirm();
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        {error && (
          <div className="flex gap-2 rounded-md bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <pre className="whitespace-pre-wrap font-sans">{error}</pre>
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>Cancel</Button>
          <Button variant="destructive" onClick={handleConfirm} disabled={loading}>
            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================================
// Main content
// ============================================================================

export function HAProxyContent() {
  const { canWrite } = usePermissions();
  const canEdit = canWrite(FeatureGroup.LOAD_BALANCING);

  const [config, setConfig] = useState<LBConfig | null>(null);
  const [capabilities, setCapabilities] = useState<LBCapabilities | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const [backendSearch, setBackendSearch] = useState("");
  const [serviceSearch, setServiceSearch] = useState("");

  // Create modals (edit is handled on the detail page)
  const [backendModalOpen, setBackendModalOpen] = useState(false);
  const [serviceModalOpen, setServiceModalOpen] = useState(false);
  const [quickSetupOpen, setQuickSetupOpen] = useState(false);

  // Delete modals
  const [deleteBackendTarget, setDeleteBackendTarget] = useState<LBBackend | null>(null);
  const [deleteServiceTarget, setDeleteServiceTarget] = useState<LBService | null>(null);

  const loadData = useCallback(async (refresh = false) => {
    try {
      const [cap, cfg] = await Promise.all([
        lbService.getCapabilities(),
        lbService.getConfig(refresh),
      ]);
      setCapabilities(cap);
      setConfig(cfg);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load configuration");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData(true);
    setRefreshing(false);
  };

  const backends = config?.reverse_proxy.backends ?? [];
  const services = config?.reverse_proxy.services ?? [];

  const filteredBackends = backends.filter(
    (b) =>
      b.name.toLowerCase().includes(backendSearch.toLowerCase()) ||
      b.description?.toLowerCase().includes(backendSearch.toLowerCase())
  );

  const filteredServices = services.filter(
    (s) =>
      s.name.toLowerCase().includes(serviceSearch.toLowerCase()) ||
      s.description?.toLowerCase().includes(serviceSearch.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">HAProxy</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Reverse proxy and load balancing with HAProxy
            {capabilities && (
              <span className="ml-2">
                <Badge variant="outline" className="text-xs">{capabilities.rp_key}</Badge>
              </span>
            )}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={handleRefresh} disabled={refreshing}>
          <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {error && (
        <div className="flex gap-2 rounded-md bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          {error}
        </div>
      )}

      {/* VyOS constraint: both backend + service must exist together */}
      {config && backends.length === 0 && services.length === 0 && (
        <div className="flex items-start gap-3 rounded-lg border border-blue-500/30 bg-blue-500/5 p-4">
          <Info className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-blue-700 dark:text-blue-400">Getting started with HAProxy</p>
            <p className="text-xs text-blue-600/80 dark:text-blue-400/80 mt-0.5">
              VyOS requires a <strong>backend</strong> and a <strong>service</strong> to be configured
              at the same time. Use Quick Setup to create both in one step.
            </p>
          </div>
          {canEdit && (
            <Button size="sm" onClick={() => setQuickSetupOpen(true)} className="shrink-0">
              <Zap className="h-3.5 w-3.5 mr-1.5" />
              Quick Setup
            </Button>
          )}
        </div>
      )}

      {/* Imbalance warning */}
      {config && ((backends.length > 0 && services.length === 0) || (backends.length === 0 && services.length > 0)) && (
        <div className="flex items-start gap-3 rounded-lg border border-yellow-500/30 bg-yellow-500/5 p-4">
          <AlertCircle className="h-4 w-4 text-yellow-600 dark:text-yellow-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-yellow-700 dark:text-yellow-400">Incomplete configuration</p>
            <p className="text-xs text-yellow-600/80 dark:text-yellow-400/80 mt-0.5">
              {backends.length === 0
                ? "You have services but no backends. VyOS will reject commits until at least one backend is added."
                : "You have backends but no services. VyOS will reject commits until at least one service is added."}
            </p>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-500/10">
                <Database className="h-4 w-4 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{backends.length}</p>
                <p className="text-xs text-muted-foreground">Backends</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-green-500/10">
                <Globe className="h-4 w-4 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{services.length}</p>
                <p className="text-xs text-muted-foreground">Services</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-purple-500/10">
                <Server className="h-4 w-4 text-purple-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {backends.reduce((sum, b) => sum + b.servers.length, 0)}
                </p>
                <p className="text-xs text-muted-foreground">Total Servers</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="backends">
        <TabsList>
          <TabsTrigger value="backends">
            Backends
            <Badge variant="secondary" className="ml-2 text-xs">{backends.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="services">
            Services
            <Badge variant="secondary" className="ml-2 text-xs">{services.length}</Badge>
          </TabsTrigger>
        </TabsList>

        {/* ------------------------------------------------------------------ */}
        {/* Backends tab                                                        */}
        {/* ------------------------------------------------------------------ */}
        <TabsContent value="backends" className="mt-4">
          <div className="rounded-lg border border-border bg-card">
            <div className="flex items-center justify-between p-4 border-b border-border">
              <div className="relative w-72">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  className="pl-9 h-8 text-sm"
                  placeholder="Search backends…"
                  value={backendSearch}
                  onChange={(e) => setBackendSearch(e.target.value)}
                />
              </div>
              {canEdit && (
                <Button size="sm" onClick={() => setBackendModalOpen(true)}>
                  <Plus className="h-3.5 w-3.5 mr-1" /> Add Backend
                </Button>
              )}
            </div>

            {filteredBackends.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-14 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted mb-3">
                  <Database className="h-5 w-5 text-muted-foreground" />
                </div>
                <p className="text-sm font-medium">No backends configured</p>
                <p className="text-xs text-muted-foreground mt-1 mb-4">
                  {services.length === 0
                    ? "Use Quick Setup to create a backend and service together (required by VyOS)."
                    : "Backends define server pools for load balancing."}
                </p>
                {canEdit && (
                  <div className="flex gap-2">
                    {services.length === 0 && (
                      <Button size="sm" onClick={() => setQuickSetupOpen(true)}>
                        <Zap className="h-3.5 w-3.5 mr-1" /> Quick Setup
                      </Button>
                    )}
                    <Button size="sm" variant="outline" onClick={() => setBackendModalOpen(true)}>
                      <Plus className="h-3.5 w-3.5 mr-1" />
                      {services.length === 0 ? "Backend Only" : "Add First Backend"}
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              <ScrollArea>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Mode</TableHead>
                      <TableHead>Balance</TableHead>
                      <TableHead>Servers</TableHead>
                      <TableHead>Health</TableHead>
                      <TableHead>SSL</TableHead>
                      <TableHead>Rules</TableHead>
                      <TableHead className="w-20" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredBackends.map((backend) => (
                      <TableRow key={backend.name} className="group">
                        <TableCell>
                          <Link
                            href={`/load-balancing/haproxy/backend/${encodeURIComponent(backend.name)}`}
                            className="font-medium text-sm hover:underline hover:text-primary"
                          >
                            {backend.name}
                          </Link>
                          {backend.description && (
                            <p className="text-xs text-muted-foreground">{backend.description}</p>
                          )}
                        </TableCell>
                        <TableCell>
                          {backend.mode && (
                            <Badge variant="outline" className="text-xs uppercase">{backend.mode}</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-muted-foreground">{backend.balance ?? "—"}</span>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5">
                            <Server className="h-3.5 w-3.5 text-muted-foreground" />
                            <span className="text-sm">{backend.servers.length}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {backend.health_check ? (
                            <Badge variant="secondary" className="text-xs">{backend.health_check}</Badge>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {backend.ssl
                            ? <Shield className="h-3.5 w-3.5 text-green-500" />
                            : <span className="text-xs text-muted-foreground">—</span>
                          }
                        </TableCell>
                        <TableCell>
                          {backend.rules.length > 0 ? (
                            <Link href={`/load-balancing/haproxy/backend/${encodeURIComponent(backend.name)}#rules`}>
                              <Badge variant="secondary" className="text-xs cursor-pointer hover:bg-secondary/80">
                                {backend.rules.length} rule{backend.rules.length !== 1 ? "s" : ""}
                              </Badge>
                            </Link>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Link href={`/load-balancing/haproxy/backend/${encodeURIComponent(backend.name)}`}>
                              <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                            </Link>
                            <Button
                              variant="ghost" size="sm"
                              className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                              onClick={() => setDeleteBackendTarget(backend)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            )}
          </div>
        </TabsContent>

        {/* ------------------------------------------------------------------ */}
        {/* Services tab                                                        */}
        {/* ------------------------------------------------------------------ */}
        <TabsContent value="services" className="mt-4">
          <div className="rounded-lg border border-border bg-card">
            <div className="flex items-center justify-between p-4 border-b border-border">
              <div className="relative w-72">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  className="pl-9 h-8 text-sm"
                  placeholder="Search services…"
                  value={serviceSearch}
                  onChange={(e) => setServiceSearch(e.target.value)}
                />
              </div>
              {canEdit && (
                <Button size="sm" onClick={() => setServiceModalOpen(true)}>
                  <Plus className="h-3.5 w-3.5 mr-1" /> Add Service
                </Button>
              )}
            </div>

            {filteredServices.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-14 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted mb-3">
                  <Globe className="h-5 w-5 text-muted-foreground" />
                </div>
                <p className="text-sm font-medium">No services configured</p>
                <p className="text-xs text-muted-foreground mt-1 mb-4">
                  {backends.length === 0
                    ? "Use Quick Setup to create a backend and service together (required by VyOS)."
                    : "Services are the frontends that accept incoming traffic."}
                </p>
                {canEdit && (
                  <div className="flex gap-2">
                    {backends.length === 0 && (
                      <Button size="sm" onClick={() => setQuickSetupOpen(true)}>
                        <Zap className="h-3.5 w-3.5 mr-1" /> Quick Setup
                      </Button>
                    )}
                    <Button size="sm" variant="outline" onClick={() => setServiceModalOpen(true)}>
                      <Plus className="h-3.5 w-3.5 mr-1" />
                      {backends.length === 0 ? "Service Only" : "Add First Service"}
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              <ScrollArea>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Mode</TableHead>
                      <TableHead>Port</TableHead>
                      <TableHead>Backends</TableHead>
                      <TableHead>SSL</TableHead>
                      <TableHead>Rules</TableHead>
                      <TableHead className="w-20" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredServices.map((svc) => (
                      <TableRow key={svc.name} className="group">
                        <TableCell>
                          <Link
                            href={`/load-balancing/haproxy/service/${encodeURIComponent(svc.name)}`}
                            className="font-medium text-sm hover:underline hover:text-primary"
                          >
                            {svc.name}
                          </Link>
                          {svc.description && (
                            <p className="text-xs text-muted-foreground">{svc.description}</p>
                          )}
                        </TableCell>
                        <TableCell>
                          {svc.mode && (
                            <Badge variant="outline" className="text-xs uppercase">{svc.mode}</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <span className="text-sm font-mono">{svc.port ?? "—"}</span>
                        </TableCell>
                        <TableCell>
                          {svc.backends.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {svc.backends.slice(0, 2).map((be) => (
                                <Badge key={be} variant="outline" className="text-xs">{be}</Badge>
                              ))}
                              {svc.backends.length > 2 && (
                                <Badge variant="outline" className="text-xs">+{svc.backends.length - 2}</Badge>
                              )}
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {svc.ssl ? (
                            <div className="flex items-center gap-1">
                              <Shield className="h-3.5 w-3.5 text-green-500" />
                              {svc.redirect_http_to_https && (
                                <Badge variant="outline" className="text-xs">redirect</Badge>
                              )}
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {svc.rules.length > 0 ? (
                            <Link href={`/load-balancing/haproxy/service/${encodeURIComponent(svc.name)}#rules`}>
                              <Badge variant="secondary" className="text-xs cursor-pointer hover:bg-secondary/80">
                                {svc.rules.length} rule{svc.rules.length !== 1 ? "s" : ""}
                              </Badge>
                            </Link>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Link href={`/load-balancing/haproxy/service/${encodeURIComponent(svc.name)}`}>
                              <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                            </Link>
                            <Button
                              variant="ghost" size="sm"
                              className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                              onClick={() => setDeleteServiceTarget(svc)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Modals */}
      <HAProxyQuickSetupModal
        open={quickSetupOpen}
        onOpenChange={setQuickSetupOpen}
        onSuccess={() => loadData(true)}
      />

      <HAProxyBackendModal
        open={backendModalOpen}
        onOpenChange={setBackendModalOpen}
        backend={null}
        capabilities={capabilities}
        onSuccess={() => loadData(true)}
      />

      <HAProxyServiceModal
        open={serviceModalOpen}
        onOpenChange={setServiceModalOpen}
        service={null}
        backends={backends}
        capabilities={capabilities}
        onSuccess={() => loadData(true)}
      />

      <DeleteDialog
        open={!!deleteBackendTarget}
        onOpenChange={(o) => !o && setDeleteBackendTarget(null)}
        title={`Delete backend "${deleteBackendTarget?.name}"?`}
        description={
          backends.length === 1 && services.length > 0
            ? "Warning: this is your last backend. VyOS will reject any subsequent changes until you add a new backend alongside the existing service."
            : "This will remove the backend and all its server and rule configurations. This action cannot be undone."
        }
        onConfirm={async () => {
          await lbService.deleteBackend(deleteBackendTarget!.name);
          setDeleteBackendTarget(null);
          await loadData(true);
        }}
      />

      <DeleteDialog
        open={!!deleteServiceTarget}
        onOpenChange={(o) => !o && setDeleteServiceTarget(null)}
        title={`Delete service "${deleteServiceTarget?.name}"?`}
        description={
          services.length === 1 && backends.length > 0
            ? "Warning: this is your last service. VyOS will reject any subsequent changes until you add a new service alongside the existing backend."
            : "This will remove the service and all its routing rules. This action cannot be undone."
        }
        onConfirm={async () => {
          await lbService.deleteService(deleteServiceTarget!.name);
          setDeleteServiceTarget(null);
          await loadData(true);
        }}
      />
    </div>
  );
}
