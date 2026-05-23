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
  RefreshCw,
  Plus,
  Pencil,
  Trash2,
  Settings2,
  Loader2,
  Globe,
} from "lucide-react";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import {
  dnsDynamicService,
  DNSDynamicConfig,
  DynamicNameEntry,
} from "@/lib/api/dns-dynamic";
import { DNSDynamicGlobalModal } from "./DNSDynamicGlobalModal";
import { DNSDynamicEntryModal } from "./DNSDynamicEntryModal";
import { usePermissions } from "@/hooks/usePermissions";
import { FeatureGroup } from "@/lib/api/user-management";

export function DNSDynamicContent() {
  const { canWrite } = usePermissions();
  const hasWritePermission = canWrite(FeatureGroup.DNS_DYNAMIC);

  const [config, setConfig] = useState<DNSDynamicConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [globalModalOpen, setGlobalModalOpen] = useState(false);
  const [entryModalOpen, setEntryModalOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<DynamicNameEntry | null>(null);
  const [deletingEntry, setDeletingEntry] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const loadData = useCallback(async (refresh = false) => {
    try {
      setLoading(true);
      setError(null);
      const data = await dnsDynamicService.getConfig(refresh);
      setConfig(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load DNS dynamic configuration");
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

  const entries = config?.entries ?? [];
  const isConfigured = entries.length > 0;

  return (
    <>
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="p-6 pb-4 border-b border-border">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="rounded-md p-2 bg-primary/10">
                <RefreshCw className="h-5 w-5 text-primary" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-bold text-foreground">Dynamic DNS</h1>
                  {!hasWritePermission && <Badge variant="secondary">Read Only</Badge>}
                  <Badge variant={isConfigured ? "default" : "secondary"} className={isConfigured ? "bg-green-500/10 text-green-600 border-green-500/20" : ""}>
                    {isConfigured ? "Configured" : "Unconfigured"}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground mt-0.5">
                  ddclient — automatic DNS record updates
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {hasWritePermission && (
                <>
                  <Button variant="outline" size="sm" onClick={() => setGlobalModalOpen(true)}>
                    <Settings2 className="h-4 w-4 mr-2" />
                    Global Settings
                  </Button>
                  <Button size="sm" onClick={() => { setEditingEntry(null); setEntryModalOpen(true); }}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Entry
                  </Button>
                </>
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

          {/* Global settings card */}
          {(config?.interval != null || config?.vrf) && (
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-6 text-sm">
                  <div>
                    <span className="text-muted-foreground">Check Interval: </span>
                    <span className="font-mono">{config.interval ? `${config.interval}s` : "300s (default)"}</span>
                  </div>
                  {config?.vrf && (
                    <div>
                      <span className="text-muted-foreground">VRF: </span>
                      <span className="font-mono">{config.vrf}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Entries */}
        <div className="flex-1 p-6 pt-4 overflow-auto">
          {entries.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Globe className="h-12 w-12 text-muted-foreground/30 mb-4" />
                <p className="text-sm text-muted-foreground mb-2">No Dynamic DNS entries configured</p>
                <p className="text-xs text-muted-foreground mb-4">Add an entry to start updating DNS records automatically.</p>
                {hasWritePermission && (
                  <Button size="sm" onClick={() => { setEditingEntry(null); setEntryModalOpen(true); }}>
                    <Plus className="h-4 w-4 mr-2" />Add Entry
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
                      <TableHead>Name</TableHead>
                      <TableHead>Protocol</TableHead>
                      <TableHead>Server</TableHead>
                      <TableHead>Hostnames</TableHead>
                      <TableHead>IP Version</TableHead>
                      {hasWritePermission && <TableHead className="text-right">Actions</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {entries.map((e) => (
                      <TableRow key={e.name}>
                        <TableCell className="font-mono font-medium">{e.name}</TableCell>
                        <TableCell className="font-mono">{e.protocol ?? <span className="text-muted-foreground">—</span>}</TableCell>
                        <TableCell className="font-mono">{e.server ?? <span className="text-muted-foreground">—</span>}</TableCell>
                        <TableCell>
                          {e.hostnames.length === 0 ? (
                            <span className="text-muted-foreground">—</span>
                          ) : (
                            <div className="flex flex-wrap gap-1">
                              {e.hostnames.slice(0, 2).map((h) => (
                                <Badge key={h} variant="secondary" className="font-mono text-xs">{h}</Badge>
                              ))}
                              {e.hostnames.length > 2 && (
                                <Badge variant="outline" className="text-xs text-muted-foreground">+{e.hostnames.length - 2}</Badge>
                              )}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          {e.ip_version ? (
                            <Badge variant="outline" className="text-xs">{e.ip_version}</Badge>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        {hasWritePermission && (
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => { setEditingEntry(e); setEntryModalOpen(true); }}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive hover:text-destructive"
                                onClick={() => setDeletingEntry(e.name)}
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

      {/* Modals */}
      <DNSDynamicGlobalModal
        open={globalModalOpen}
        onOpenChange={setGlobalModalOpen}
        interval={config?.interval ?? null}
        vrf={config?.vrf ?? null}
        onSubmit={async (interval, vrf) => {
          await dnsDynamicService.saveGlobalSettings(interval, vrf);
          await loadData(true);
        }}
      />

      <DNSDynamicEntryModal
        open={entryModalOpen}
        onOpenChange={(open) => { setEntryModalOpen(open); if (!open) setEditingEntry(null); }}
        entry={editingEntry}
        onSubmit={async (name, fields) => {
          await dnsDynamicService.saveEntry(name, fields);
          await loadData(true);
        }}
      />

      <AlertDialog open={!!deletingEntry} onOpenChange={(open) => { if (!open) setDeletingEntry(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete DDNS Entry</AlertDialogTitle>
            <AlertDialogDescription>
              Remove DDNS entry <span className="font-mono">{deletingEntry}</span>?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => withAction(async () => {
                await dnsDynamicService.deleteEntry(deletingEntry!);
                setDeletingEntry(null);
              })}
            >
              {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
