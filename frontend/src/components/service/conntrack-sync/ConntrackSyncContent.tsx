"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
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
  const t = useTranslations("conntrackSync");
  const tc = useTranslations("common");
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
      setError(err instanceof Error ? err.message : t("content.loadFailed"));
    } finally {
      setLoading(false);
    }
  }, [t]);

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
      setDeleteError(err instanceof Error ? err.message : t("content.deleteFailed"));
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
          {tc("retry")}
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
                  <h1 className="text-2xl font-bold text-foreground">{t("content.title")}</h1>
                  {!hasWritePermission && (
                    <Badge variant="secondary">{tc("readOnly")}</Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {t("content.subtitle")}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => loadData(true)}>
                <RefreshCw className="h-4 w-4 mr-2" />
                {tc("refresh")}
              </Button>
              {hasWritePermission && (
                <>
                  <Button size="sm" onClick={() => setModalOpen(true)}>
                    <Pencil className="h-4 w-4 mr-2" />
                    {configured ? t("content.editConfiguration") : t("content.configure")}
                  </Button>
                  {configured && (
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => setDeleteDialogOpen(true)}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      {t("content.remove")}
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
                  {t("content.notConfigured")}
                </p>
                {hasWritePermission && (
                  <Button size="sm" onClick={() => setModalOpen(true)}>
                    {t("content.configure")}
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
                    <p className="text-sm font-semibold">{t("content.syncInterfaces")}</p>
                  </div>
                  {config.interfaces.length === 0 ? (
                    <p className="text-sm text-muted-foreground">{t("content.noInterfaces")}</p>
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
                                {t.rich("content.peer", {
                                  peer: iface.peer,
                                  mono: (chunks) => <span className="font-mono">{chunks}</span>,
                                })}
                              </div>
                            ) : (
                              <div className="text-xs text-muted-foreground mt-0.5">
                                {t("content.multicastMode")}
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
                    <p className="text-sm font-semibold">{t("content.protocols")}</p>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="text-muted-foreground text-xs">{t("content.acceptProtocols")}</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {config.accept_protocols.length > 0 ? (
                          config.accept_protocols.map((p) => (
                            <Badge key={p} variant="secondary" className="font-mono text-xs">
                              {p}
                            </Badge>
                          ))
                        ) : (
                          <span className="text-xs text-muted-foreground">{t("content.allDefault")}</span>
                        )}
                      </div>
                    </div>
                    <div>
                      <span className="text-muted-foreground text-xs">{t("content.expectSync")}</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {config.expect_sync.length > 0 ? (
                          config.expect_sync.map((p) => (
                            <Badge key={p} variant="secondary" className="font-mono text-xs">
                              {p}
                            </Badge>
                          ))
                        ) : (
                          <span className="text-xs text-muted-foreground">{tc("none")}</span>
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
                    <p className="text-sm font-semibold">{t("content.failoverMechanism")}</p>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground w-28 shrink-0">{t("content.vrrpSyncGroup")}</span>
                      {config.failover_mechanism?.vrrp?.sync_group ? (
                        <Badge variant="outline" className="font-mono">
                          {config.failover_mechanism.vrrp.sync_group}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground w-28 shrink-0">{t("content.startupResync")}</span>
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
                    <p className="text-sm font-semibold">{t("content.advanced")}</p>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground w-28 shrink-0">{t("content.multicastGroup")}</span>
                      <span className="font-mono text-xs">{config.mcast_group ?? "225.0.0.50"}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground w-28 shrink-0">{t("content.eventQueue")}</span>
                      <span className="font-mono text-xs">
                        {config.event_listen_queue_size != null
                          ? `${config.event_listen_queue_size} MB`
                          : t("content.defaultMb", { value: "8" })}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground w-28 shrink-0">{t("content.syncQueue")}</span>
                      <span className="font-mono text-xs">
                        {config.sync_queue_size != null
                          ? `${config.sync_queue_size} MB`
                          : t("content.defaultMb", { value: "1" })}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground w-28 shrink-0">{t("content.extCache")}</span>
                      {config.disable_external_cache ? (
                        <Badge variant="secondary" className="text-xs">{tc("disabled")}</Badge>
                      ) : (
                        <span className="text-muted-foreground text-xs">{tc("enabled")}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground w-28 shrink-0">Syslog</span>
                      {config.disable_syslog ? (
                        <Badge variant="secondary" className="text-xs">{tc("disabled")}</Badge>
                      ) : (
                        <span className="text-muted-foreground text-xs">{tc("enabled")}</span>
                      )}
                    </div>
                    {config.listen_addresses.length > 0 && (
                      <div>
                        <span className="text-muted-foreground text-xs">{t("content.listenAddresses")}</span>
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
                        <span className="text-muted-foreground text-xs">{t("content.ignoreAddresses")}</span>
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
            <AlertDialogTitle>{t("delete.title")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("delete.description")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {deleteError && (
            <div className="flex items-start gap-2 rounded-lg bg-destructive/10 border border-destructive/20 p-3">
              <AlertCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
              <p className="text-xs text-destructive whitespace-pre-wrap font-mono">{deleteError}</p>
            </div>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteLoading}>{tc("cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleDelete();
              }}
              disabled={deleteLoading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {t("content.remove")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
