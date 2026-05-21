"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import {
  RefreshCw,
  Pencil,
  Trash2,
  ArrowLeftRight,
  Network,
  Layers,
  ShieldCheck,
  Settings2,
  AlertCircle,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import {
  conntrackSyncService,
  ConntrackSyncConfig,
} from "@/lib/api/conntrack-sync";
import { ConntrackSyncModal } from "./ConntrackSyncModal";
import { usePermissions } from "@/hooks/usePermissions";
import { FeatureGroup } from "@/lib/api/user-management";
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
import { Loader2 } from "lucide-react";

const EMPTY_CONFIG: ConntrackSyncConfig = {
  accept_protocols: [],
  disable_external_cache: false,
  disable_syslog: false,
  event_listen_queue_size: null,
  expect_sync: [],
  failover_mechanism: null,
  ignore_addresses: [],
  interfaces: [],
  listen_addresses: [],
  mcast_group: null,
  startup_resync: false,
  sync_queue_size: null,
};

function isConfigured(config: ConntrackSyncConfig): boolean {
  return (
    config.interfaces.length > 0 ||
    config.accept_protocols.length > 0 ||
    config.expect_sync.length > 0 ||
    !!config.failover_mechanism?.vrrp?.sync_group ||
    config.disable_external_cache ||
    config.disable_syslog ||
    config.startup_resync ||
    config.event_listen_queue_size != null ||
    config.sync_queue_size != null ||
    !!config.mcast_group ||
    config.listen_addresses.length > 0 ||
    config.ignore_addresses.length > 0
  );
}

export function ConntrackSyncContent() {
  const { canWrite } = usePermissions();
  const hasWritePermission = canWrite(FeatureGroup.CONNTRACK_SYNC);

  const [config, setConfig] = useState<ConntrackSyncConfig>(EMPTY_CONFIG);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const loadData = useCallback(async (refresh = false) => {
    try {
      setLoading(true);
      setError(null);
      const data = await conntrackSyncService.getConfig(refresh);
      setConfig(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load conntrack-sync configuration");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSave = async (updated: ConntrackSyncConfig) => {
    await conntrackSyncService.saveConfig(config, updated);
    setModalOpen(false);
    await loadData(true);
  };

  async function handleDelete() {
    setDeleteLoading(true);
    setDeleteError(null);
    try {
      await conntrackSyncService.deleteConntrackSync();
      setDeleteDialogOpen(false);
      await loadData(true);
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : "Failed to delete configuration.");
    } finally {
      setDeleteLoading(false);
    }
  }

  const configured = isConfigured(config);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <LoadingSpinner />
      </div>
    );
  }

  if (error && !configured) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <p className="text-destructive">{error}</p>
        <Button variant="outline" onClick={() => loadData()}>
          Retry
        </Button>
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="p-6 pb-4 border-b border-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="rounded-md p-2 bg-primary/10">
                <ArrowLeftRight className="h-5 w-5 text-primary" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-bold text-foreground">Conntrack Sync</h1>
                  {!hasWritePermission && (
                    <Badge variant="secondary">Read Only</Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Connection tracking synchronization between firewall nodes
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => loadData(true)}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
              {hasWritePermission && (
                <>
                  <Button size="sm" onClick={() => setModalOpen(true)}>
                    <Pencil className="h-4 w-4 mr-2" />
                    {configured ? "Edit Configuration" : "Configure"}
                  </Button>
                  {configured && (
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => setDeleteDialogOpen(true)}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Remove
                    </Button>
                  )}
                </>
              )}
            </div>
          </div>

          {error && (
            <div className="mt-4 p-3 rounded-md bg-destructive/10 text-destructive text-sm whitespace-pre-wrap">
              {error}
            </div>
          )}
        </div>

        {/* Body */}
        <div className="flex-1 p-6 overflow-auto">
          {!configured ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <ArrowLeftRight className="h-12 w-12 text-muted-foreground/30 mb-4" />
                <p className="text-sm text-muted-foreground mb-4">
                  Conntrack Sync is not configured
                </p>
                {hasWritePermission && (
                  <Button size="sm" onClick={() => setModalOpen(true)}>
                    Configure
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              {/* Interfaces card */}
              <Card>
                <CardContent className="p-5 space-y-3">
                  <div className="flex items-center gap-2">
                    <Network className="h-4 w-4 text-primary" />
                    <p className="text-sm font-semibold">Sync Interfaces</p>
                  </div>
                  {config.interfaces.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No interfaces configured.</p>
                  ) : (
                    <div className="space-y-2">
                      {config.interfaces.map((iface) => (
                        <div
                          key={iface.name}
                          className="flex items-start justify-between text-sm border rounded-md px-3 py-2"
                        >
                          <div>
                            <span className="font-mono font-medium">{iface.name}</span>
                            {iface.peer ? (
                              <div className="text-xs text-muted-foreground mt-0.5">
                                Peer: <span className="font-mono">{iface.peer}</span>
                              </div>
                            ) : (
                              <div className="text-xs text-muted-foreground mt-0.5">
                                Multicast mode
                              </div>
                            )}
                          </div>
                          {iface.port != null && (
                            <Badge variant="secondary" className="font-mono text-xs">
                              :{iface.port}
                            </Badge>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Protocols card */}
              <Card>
                <CardContent className="p-5 space-y-3">
                  <div className="flex items-center gap-2">
                    <Layers className="h-4 w-4 text-primary" />
                    <p className="text-sm font-semibold">Protocols</p>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="text-muted-foreground text-xs">Accept Protocols</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {config.accept_protocols.length > 0 ? (
                          config.accept_protocols.map((p) => (
                            <Badge key={p} variant="secondary" className="font-mono text-xs">
                              {p}
                            </Badge>
                          ))
                        ) : (
                          <span className="text-xs text-muted-foreground">All (default)</span>
                        )}
                      </div>
                    </div>
                    <div>
                      <span className="text-muted-foreground text-xs">Expect Sync</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {config.expect_sync.length > 0 ? (
                          config.expect_sync.map((p) => (
                            <Badge key={p} variant="secondary" className="font-mono text-xs">
                              {p}
                            </Badge>
                          ))
                        ) : (
                          <span className="text-xs text-muted-foreground">None</span>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Failover card */}
              <Card>
                <CardContent className="p-5 space-y-3">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-primary" />
                    <p className="text-sm font-semibold">Failover Mechanism</p>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground w-28 shrink-0">VRRP Sync Group</span>
                      {config.failover_mechanism?.vrrp?.sync_group ? (
                        <Badge variant="outline" className="font-mono">
                          {config.failover_mechanism.vrrp.sync_group}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground w-28 shrink-0">Startup Resync</span>
                      {config.startup_resync ? (
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                      ) : (
                        <XCircle className="h-4 w-4 text-muted-foreground/40" />
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Advanced card */}
              <Card>
                <CardContent className="p-5 space-y-3">
                  <div className="flex items-center gap-2">
                    <Settings2 className="h-4 w-4 text-primary" />
                    <p className="text-sm font-semibold">Advanced</p>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground w-28 shrink-0">Multicast Group</span>
                      <span className="font-mono text-xs">{config.mcast_group ?? "225.0.0.50"}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground w-28 shrink-0">Event Queue</span>
                      <span className="font-mono text-xs">
                        {config.event_listen_queue_size != null
                          ? `${config.event_listen_queue_size} MB`
                          : "8 MB (default)"}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground w-28 shrink-0">Sync Queue</span>
                      <span className="font-mono text-xs">
                        {config.sync_queue_size != null
                          ? `${config.sync_queue_size} MB`
                          : "1 MB (default)"}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground w-28 shrink-0">Ext. Cache</span>
                      {config.disable_external_cache ? (
                        <Badge variant="secondary" className="text-xs">Disabled</Badge>
                      ) : (
                        <span className="text-muted-foreground text-xs">Enabled</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground w-28 shrink-0">Syslog</span>
                      {config.disable_syslog ? (
                        <Badge variant="secondary" className="text-xs">Disabled</Badge>
                      ) : (
                        <span className="text-muted-foreground text-xs">Enabled</span>
                      )}
                    </div>
                    {config.listen_addresses.length > 0 && (
                      <div>
                        <span className="text-muted-foreground text-xs">Listen Addresses</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {config.listen_addresses.map((a) => (
                            <Badge key={a} variant="secondary" className="font-mono text-xs">
                              {a}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                    {config.ignore_addresses.length > 0 && (
                      <div>
                        <span className="text-muted-foreground text-xs">Ignore Addresses</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {config.ignore_addresses.map((a) => (
                            <Badge key={a} variant="outline" className="font-mono text-xs">
                              {a}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>

      <ConntrackSyncModal
        open={modalOpen}
        config={config}
        onClose={() => setModalOpen(false)}
        onSubmit={handleSave}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Conntrack Sync Configuration</AlertDialogTitle>
            <AlertDialogDescription>
              This will delete the entire conntrack-sync configuration. Connection tracking
              synchronization will stop immediately. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {deleteError && (
            <div className="flex items-start gap-2 rounded-lg bg-destructive/10 border border-destructive/20 p-3">
              <AlertCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
              <p className="text-xs text-destructive whitespace-pre-wrap font-mono">{deleteError}</p>
            </div>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleDelete();
              }}
              disabled={deleteLoading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
