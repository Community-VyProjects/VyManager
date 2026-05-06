"use client";

import { useState, useEffect, useCallback } from "react";
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
} from "lucide-react";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import {
  broadcastRelayService,
  BroadcastRelayConfig,
  BroadcastRelayInstance,
} from "@/lib/api/broadcast-relay";
import { BroadcastRelayInstanceModal } from "./BroadcastRelayInstanceModal";
import { DeleteBroadcastRelayInstanceModal } from "./DeleteBroadcastRelayInstanceModal";
import { usePermissions } from "@/hooks/usePermissions";
import { FeatureGroup } from "@/lib/api/user-management";

export function BroadcastRelayContent() {
  const { canWrite } = usePermissions();
  const hasWritePermission = canWrite(FeatureGroup.BROADCAST_RELAY);

  const [config, setConfig] = useState<BroadcastRelayConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [globalDisableLoading, setGlobalDisableLoading] = useState(false);

  const [instanceModalOpen, setInstanceModalOpen] = useState(false);
  const [editingInstance, setEditingInstance] = useState<BroadcastRelayInstance | null>(null);
  const [deletingInstance, setDeletingInstance] = useState<BroadcastRelayInstance | null>(null);

  const loadData = useCallback(async (refresh = false) => {
    try {
      setLoading(true);
      setError(null);
      const configData = await broadcastRelayService.getConfig(refresh);
      setConfig(configData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load broadcast relay configuration");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const totalInstances = config?.instances.length ?? 0;
  const activeInstances = config?.instances.filter((i) => !i.disabled).length ?? 0;
  const disabledInstances = config?.instances.filter((i) => i.disabled).length ?? 0;

  const handleToggleGlobalDisable = async () => {
    if (!config || !hasWritePermission) return;
    setGlobalDisableLoading(true);
    try {
      if (config.globally_disabled) {
        await broadcastRelayService.deleteGlobalDisable();
      } else {
        await broadcastRelayService.setGlobalDisable();
      }
      await loadData(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update service status");
    } finally {
      setGlobalDisableLoading(false);
    }
  };

  const handleCreateInstance = async (data: Partial<BroadcastRelayInstance> & { id: string }) => {
    await broadcastRelayService.createInstance(data);
    await loadData(true);
  };

  const handleUpdateInstance = async (data: Partial<BroadcastRelayInstance> & { id: string }) => {
    if (!editingInstance) return;
    await broadcastRelayService.updateInstance(editingInstance, data);
    await loadData(true);
  };

  const handleDeleteInstance = async () => {
    if (!deletingInstance) return;
    await broadcastRelayService.deleteInstance(deletingInstance.id);
    setDeletingInstance(null);
    await loadData(true);
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
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="rounded-md p-2 bg-primary/10">
                <Radio className="h-5 w-5 text-primary" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-bold text-foreground">Broadcast Relay</h1>
                  {!hasWritePermission && (
                    <Badge variant="secondary">Read Only</Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground mt-0.5">
                  UDP broadcast relay between interfaces
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {hasWritePermission && (
                <Button
                  variant={config?.globally_disabled ? "default" : "outline"}
                  size="sm"
                  onClick={handleToggleGlobalDisable}
                  disabled={globalDisableLoading}
                >
                  {globalDisableLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : null}
                  {config?.globally_disabled ? "Enable Service" : "Disable Service"}
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={() => loadData(true)}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>
          </div>

          {/* Global disable warning */}
          {config?.globally_disabled && (
            <div className="mb-4 flex items-center gap-3 p-3 rounded-md bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span className="text-sm font-medium">
                Broadcast relay service is globally disabled. All instances are inactive.
              </span>
              {hasWritePermission && (
                <Button
                  variant="outline"
                  size="sm"
                  className="ml-auto border-amber-500/30 hover:bg-amber-500/10"
                  onClick={handleToggleGlobalDisable}
                  disabled={globalDisableLoading}
                >
                  Re-enable
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
                    <p className="text-xs text-muted-foreground">Total Instances</p>
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
                    <p className="text-xs text-muted-foreground">Active Instances</p>
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
                    <p className="text-xs text-muted-foreground">Disabled Instances</p>
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
              <Button
                size="sm"
                onClick={() => {
                  setEditingInstance(null);
                  setInstanceModalOpen(true);
                }}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Instance
              </Button>
            </div>
          )}

          {totalInstances === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Radio className="h-12 w-12 text-muted-foreground/30 mb-4" />
                <p className="text-sm text-muted-foreground mb-4">No relay instances configured</p>
                {hasWritePermission && (
                  <Button
                    size="sm"
                    onClick={() => {
                      setEditingInstance(null);
                      setInstanceModalOpen(true);
                    }}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Instance
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
                      <TableHead>ID</TableHead>
                      <TableHead>Port</TableHead>
                      <TableHead>Interfaces</TableHead>
                      <TableHead>Source Address</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Status</TableHead>
                      {hasWritePermission && (
                        <TableHead className="text-right">Actions</TableHead>
                      )}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {config?.instances.map((inst) => (
                      <TableRow key={inst.id}>
                        <TableCell>
                          <Badge variant="outline" className="font-mono">
                            #{inst.id}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {inst.port != null ? (
                            <span className="font-mono text-sm">UDP/{inst.port}</span>
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
                          {inst.disabled ? (
                            <Badge variant="secondary" className="bg-muted text-muted-foreground">
                              Disabled
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="bg-green-500/10 text-green-600">
                              Active
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
                                onClick={() => {
                                  setEditingInstance(inst);
                                  setInstanceModalOpen(true);
                                }}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive hover:text-destructive"
                                onClick={() => setDeletingInstance(inst)}
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
        open={instanceModalOpen}
        onOpenChange={(open) => {
          setInstanceModalOpen(open);
          if (!open) setEditingInstance(null);
        }}
        instance={editingInstance}
        onSuccess={() => {}}
        onSubmit={editingInstance ? handleUpdateInstance : handleCreateInstance}
      />

      <DeleteBroadcastRelayInstanceModal
        open={!!deletingInstance}
        onOpenChange={(open) => {
          if (!open) setDeletingInstance(null);
        }}
        instance={deletingInstance}
        onConfirm={handleDeleteInstance}
      />
    </>
  );
}
