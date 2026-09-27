"use client";

import { useState, useEffect, useCallback } from "react";
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
  const t = useTranslations("dnsDynamic");
  const tc = useTranslations("common");
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
                <>
                  <Button variant="outline" size="sm" onClick={() => setGlobalModalOpen(true)}>
                    <Settings2 className="h-4 w-4 mr-2" />
                    {t("content.globalSettings")}
                  </Button>
                  <Button size="sm" onClick={() => { setEditingEntry(null); setEntryModalOpen(true); }}>
                    <Plus className="h-4 w-4 mr-2" />
                    {t("addEntry")}
                  </Button>
                </>
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

          {/* Global settings card */}
          {(config?.interval != null || config?.vrf) && (
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-6 text-sm">
                  <div>
                    <span className="text-muted-foreground">{t("content.checkInterval")}</span>
                    <span className="font-mono">{config.interval ? `${config.interval}s` : t("defaultValue", { value: "300s" })}</span>
                  </div>
                  {config?.vrf && (
                    <div>
                      <span className="text-muted-foreground">{t("content.vrf")}</span>
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
                <p className="text-sm text-muted-foreground mb-2">{t("content.empty")}</p>
                <p className="text-xs text-muted-foreground mb-4">{t("content.emptyHelp")}</p>
                {hasWritePermission && (
                  <Button size="sm" onClick={() => { setEditingEntry(null); setEntryModalOpen(true); }}>
                    <Plus className="h-4 w-4 mr-2" />{t("addEntry")}
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
                      <TableHead>{tc("name")}</TableHead>
                      <TableHead>{t("protocol")}</TableHead>
                      <TableHead>{t("content.server")}</TableHead>
                      <TableHead>{t("hostnames")}</TableHead>
                      <TableHead>{t("ipVersion")}</TableHead>
                      {hasWritePermission && <TableHead className="text-right">{tc("actions")}</TableHead>}
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
            <AlertDialogTitle>{t("content.deleteTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t.rich("content.deleteConfirm", { name: deletingEntry ?? "", mono: (chunks) => <span className="font-mono">{chunks}</span> })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{tc("cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => withAction(async () => {
                await dnsDynamicService.deleteEntry(deletingEntry!);
                setDeletingEntry(null);
              })}
            >
              {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : tc("delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
