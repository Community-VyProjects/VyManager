"use client";

import { useState, useEffect, useCallback, type MouseEvent } from "react";
import { useTranslations } from "next-intl";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  Radio,
  RefreshCw,
  Plus,
  Pencil,
  Trash2,
  CheckCircle2,
  Ban,
  Loader2,
  AlertTriangle,
  AlertCircle,
} from "lucide-react";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import {
  broadcastRelayService,
  BroadcastRelayConfig,
  BroadcastRelayInstance,
} from "@/lib/api/broadcast-relay";
import {
  broadcastRelayCanDisable,
  broadcastRelayInstanceActive,
  broadcastRelayRanges,
  type BroadcastRelayRanges,
} from "@/lib/api/broadcast-relay-save-ops";
import type { ApiError } from "@/lib/types/api";
import { BroadcastRelayInstanceModal } from "./BroadcastRelayInstanceModal";
import { DeleteBroadcastRelayInstanceModal } from "./DeleteBroadcastRelayInstanceModal";
import { usePermissions } from "@/hooks/usePermissions";
import { FeatureGroup } from "@/lib/api/user-management";

/** A page-level change that commits at once, so it is confirmed first. */
type PageAction = "disable" | "enable" | "deleteService";

export function BroadcastRelayContent() {
  const t = useTranslations("broadcastRelay");
  const tc = useTranslations("common");
  const { canWrite } = usePermissions();
  const hasWritePermission = canWrite(FeatureGroup.BROADCAST_RELAY);

  const [config, setConfig] = useState<BroadcastRelayConfig | null>(null);
  const [ranges, setRanges] = useState<BroadcastRelayRanges | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [instanceModalOpen, setInstanceModalOpen] = useState(false);
  const [instanceModalKey, setInstanceModalKey] = useState(0);
  const [editingInstance, setEditingInstance] = useState<BroadcastRelayInstance | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletingInstance, setDeletingInstance] = useState<BroadcastRelayInstance | null>(null);

  // The action outlives close so the dialog text does not flip while it animates out.
  const [pendingAction, setPendingAction] = useState<PageAction>("disable");
  const [actionOpen, setActionOpen] = useState(false);
  const [actionSaving, setActionSaving] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const loadData = useCallback(
    async (refresh: boolean) => {
      try {
        const [configData, capabilities] = await Promise.all([
          broadcastRelayService.getConfig(refresh),
          broadcastRelayService.getCapabilities(),
        ]);
        const loadedRanges = broadcastRelayRanges(capabilities);
        if (!loadedRanges) {
          setError(t("content.loadFailed"));
          return;
        }
        setConfig(configData);
        setRanges(loadedRanges);
        setError(null);
      } catch (err) {
        setError((err as ApiError).message || t("content.loadFailed"));
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [t],
  );

  useEffect(() => {
    void loadData(false);
  }, [loadData]);

  const reload = () => {
    setRefreshing(true);
    return loadData(true);
  };

  const retry = () => {
    setLoading(true);
    void loadData(false);
  };

  const writeBusy = refreshing || actionSaving;
  const totalInstances = config?.instances.length ?? 0;
  const activeInstances = config
    ? config.instances.filter((inst) => broadcastRelayInstanceActive(config, inst)).length
    : 0;
  const disabledInstances = totalInstances - activeInstances;

  const openAction = (action: PageAction) => {
    setPendingAction(action);
    setActionError(null);
    setActionOpen(true);
  };

  const handleActionOpenChange = (next: boolean) => {
    if (!next && actionSaving) return;
    setActionOpen(next);
  };

  const handleApplyAction = async (event: MouseEvent) => {
    event.preventDefault();
    if (!hasWritePermission) return;
    setActionSaving(true);
    setActionError(null);
    try {
      if (pendingAction === "enable") await broadcastRelayService.deleteGlobalDisable();
      else if (pendingAction === "disable") await broadcastRelayService.setGlobalDisable();
      else await broadcastRelayService.deleteService();
      setActionOpen(false);
      void reload();
    } catch (err) {
      const fallback =
        pendingAction === "deleteService" ? t("content.deleteServiceFailed") : t("content.updateStatusFailed");
      setActionError((err as ApiError).message || fallback);
    } finally {
      setActionSaving(false);
    }
  };

  const openInstanceModal = (instance: BroadcastRelayInstance | null) => {
    setEditingInstance(instance);
    setInstanceModalKey((key) => key + 1);
    setInstanceModalOpen(true);
  };

  const handleSubmitInstance = async (instance: BroadcastRelayInstance) => {
    if (editingInstance) await broadcastRelayService.updateInstance(editingInstance, instance);
    else await broadcastRelayService.createInstance(instance);
    void reload();
  };

  const handleDeleteInstance = async () => {
    if (!deletingInstance || !config) return;
    await broadcastRelayService.deleteInstance(config, deletingInstance.id);
    void reload();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <LoadingSpinner />
      </div>
    );
  }

  if (!config || !ranges) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <p className="text-destructive whitespace-pre-wrap">{error ?? t("content.loadFailed")}</p>
        <Button variant="outline" onClick={retry}>
          {tc("retry")}
        </Button>
      </div>
    );
  }

  const actionText: Record<PageAction, { title: string; description: string }> = {
    disable: { title: t("content.confirm.disableTitle"), description: t("content.confirm.disableDescription") },
    enable: { title: t("content.confirm.enableTitle"), description: t("content.confirm.enableDescription") },
    deleteService: { title: t("content.confirm.deleteTitle"), description: t("content.confirm.deleteDescription") },
  };

  return (
    <>
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="p-6 pb-4 border-b border-border">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="rounded-md p-2 bg-primary/10">
                <Radio className="h-5 w-5 text-primary" />
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
              {hasWritePermission && (config.globally_disabled || broadcastRelayCanDisable(config)) && (
                <Button
                  variant={config.globally_disabled ? "default" : "outline"}
                  size="sm"
                  onClick={() => openAction(config.globally_disabled ? "enable" : "disable")}
                  disabled={writeBusy}
                >
                  {config.globally_disabled ? t("content.enableService") : t("content.disableService")}
                </Button>
              )}
              {hasWritePermission && config.configured && (
                <Button
                  variant="outline"
                  size="sm"
                  className="text-destructive hover:text-destructive"
                  onClick={() => openAction("deleteService")}
                  disabled={writeBusy}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  {t("content.deleteService")}
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={() => void reload()} disabled={writeBusy}>
                <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? "animate-spin" : ""}`} />
                {tc("refresh")}
              </Button>
            </div>
          </div>

          {/* Global disable warning */}
          {config.globally_disabled && (
            <div className="mb-4 flex items-center gap-3 p-3 rounded-md bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span className="text-sm font-medium">
                {t("content.globallyDisabled")}
              </span>
              {hasWritePermission && (
                <Button
                  variant="outline"
                  size="sm"
                  className="ml-auto border-amber-500/30 hover:bg-amber-500/10"
                  onClick={() => openAction("enable")}
                  disabled={writeBusy}
                >
                  {t("content.reEnable")}
                </Button>
              )}
            </div>
          )}

          {error && (
            <div className="mb-4 p-3 rounded-md bg-destructive/10 text-destructive text-sm whitespace-pre-wrap">
              {error}
            </div>
          )}

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-md p-2 bg-primary/10">
                    <Radio className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{totalInstances}</p>
                    <p className="text-xs text-muted-foreground">{t("content.totalInstances")}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-md p-2 bg-green-500/10">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{activeInstances}</p>
                    <p className="text-xs text-muted-foreground">{t("content.activeInstances")}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-md p-2 bg-muted">
                    <Ban className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{disabledInstances}</p>
                    <p className="text-xs text-muted-foreground">{t("content.disabledInstances")}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Instance list */}
        <div className="flex-1 p-6 pt-4 overflow-auto">
          {totalInstances > 0 && hasWritePermission && (
            <div className="flex justify-end mb-4">
              <Button size="sm" onClick={() => openInstanceModal(null)} disabled={writeBusy}>
                <Plus className="h-4 w-4 mr-2" />
                {t("content.addInstance")}
              </Button>
            </div>
          )}

          {totalInstances === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Radio className="h-12 w-12 text-muted-foreground/30 mb-4" />
                <p className="text-sm text-muted-foreground mb-4">{t("content.empty")}</p>
                {hasWritePermission && (
                  <Button size="sm" onClick={() => openInstanceModal(null)} disabled={writeBusy}>
                    <Plus className="h-4 w-4 mr-2" />
                    {t("content.addInstance")}
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card>
              <ScrollArea>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("content.colId")}</TableHead>
                      <TableHead>{t("content.colPort")}</TableHead>
                      <TableHead>{t("content.colInterfaces")}</TableHead>
                      <TableHead>{t("content.colSourceAddress")}</TableHead>
                      <TableHead>{tc("description")}</TableHead>
                      <TableHead>{tc("status")}</TableHead>
                      {hasWritePermission && (
                        <TableHead className="text-right">{tc("actions")}</TableHead>
                      )}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {config.instances.map((inst) => (
                      <TableRow key={inst.id}>
                        <TableCell>
                          <Badge variant="outline" className="font-mono">
                            #{inst.id}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {inst.port != null ? (
                            <span className="font-mono text-sm">
                              {t("content.udpPortValue", { port: String(inst.port) })}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {inst.interfaces.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {inst.interfaces.slice(0, 3).map((iface) => (
                                <Badge key={iface} variant="secondary" className="font-mono text-xs">
                                  {iface}
                                </Badge>
                              ))}
                              {inst.interfaces.length > 3 && (
                                <Badge variant="outline" className="text-xs text-muted-foreground">
                                  +{inst.interfaces.length - 3}
                                </Badge>
                              )}
                            </div>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {inst.address ? (
                            <span className="font-mono text-sm">{inst.address}</span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {inst.description ? (
                            <span className="text-sm">{inst.description}</span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {broadcastRelayInstanceActive(config, inst) ? (
                            <Badge variant="secondary" className="bg-green-500/10 text-green-600">
                              {t("content.active")}
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="bg-muted text-muted-foreground">
                              {tc("disabled")}
                            </Badge>
                          )}
                        </TableCell>
                        {hasWritePermission && (
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                aria-label={tc("edit")}
                                onClick={() => openInstanceModal(inst)}
                                disabled={writeBusy}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive hover:text-destructive"
                                aria-label={tc("delete")}
                                onClick={() => {
                                  setDeletingInstance(inst);
                                  setDeleteOpen(true);
                                }}
                                disabled={writeBusy}
                              >
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
            </Card>
          )}
        </div>
      </div>

      <BroadcastRelayInstanceModal
        key={instanceModalKey}
        open={instanceModalOpen}
        onOpenChange={setInstanceModalOpen}
        instance={editingInstance}
        ranges={ranges}
        existingIds={config.instances.map((inst) => inst.id)}
        onSubmit={handleSubmitInstance}
      />

      <DeleteBroadcastRelayInstanceModal
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        instance={deletingInstance}
        onConfirm={handleDeleteInstance}
      />

      <AlertDialog open={actionOpen} onOpenChange={handleActionOpenChange}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{actionText[pendingAction].title}</AlertDialogTitle>
            <AlertDialogDescription>{actionText[pendingAction].description}</AlertDialogDescription>
          </AlertDialogHeader>

          {actionError && (
            <div className="flex items-start gap-2 rounded-lg bg-destructive/10 border border-destructive/20 p-3">
              <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
              <p className="text-sm text-destructive whitespace-pre-wrap">{actionError}</p>
            </div>
          )}

          <AlertDialogFooter>
            <AlertDialogCancel disabled={actionSaving}>{tc("cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleApplyAction}
              disabled={actionSaving}
              className={
                pendingAction === "enable"
                  ? undefined
                  : "bg-destructive text-destructive-foreground hover:bg-destructive/90"
              }
            >
              {actionSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t("content.confirm.apply")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
