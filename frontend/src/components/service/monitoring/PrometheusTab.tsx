"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { AlertCircle, BarChart3, Pencil, Plus, Trash2 } from "lucide-react";
import {
  PrometheusConfig,
  PrometheusBlackboxICMPModule,
  PrometheusBlackboxDNSModule,
  ServiceMonitoringCapabilities,
  serviceMonitoringService,
} from "@/lib/api/service-monitoring";
import type { ApiError } from "@/lib/types/api";
import { PrometheusExporterModal } from "./PrometheusExporterModal";
import { BlackboxModuleModal } from "./BlackboxModuleModal";

interface PrometheusTabProps {
  config: PrometheusConfig | null;
  caps: ServiceMonitoringCapabilities;
  hasWrite: boolean;
  onSuccess: () => void;
}

type DeleteSubject =
  | { kind: "all" }
  | { kind: "node" }
  | { kind: "frr" }
  | { kind: "blackbox" }
  | { kind: "module"; type: "icmp" | "dns"; name: string };

export function PrometheusTab({ config, caps, hasWrite, onSuccess }: PrometheusTabProps) {
  const t = useTranslations("serviceMonitoring");
  const tc = useTranslations("common");
  const [nodeOpen, setNodeOpen] = useState(false);
  const [frrOpen, setFrrOpen] = useState(false);
  const [blackboxOpen, setBlackboxOpen] = useState(false);

  const [moduleModal, setModuleModal] = useState<{
    type: "icmp" | "dns";
    original: PrometheusBlackboxICMPModule | PrometheusBlackboxDNSModule | null;
  } | null>(null);

  // The subject stays set while the dialog closes, so its text does not flip.
  const [deleteSubject, setDeleteSubject] = useState<DeleteSubject | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const openDelete = (subject: DeleteSubject) => {
    setDeleteError(null);
    setDeleteSubject(subject);
    setDeleteOpen(true);
  };

  const handleDelete = async (e: React.MouseEvent) => {
    // AlertDialogAction closes on click; stay open until the commit succeeds.
    e.preventDefault();
    if (!deleteSubject) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      switch (deleteSubject.kind) {
        case "all": await serviceMonitoringService.deletePrometheus(); break;
        case "node": await serviceMonitoringService.deletePrometheusNodeExporter(); break;
        case "frr": await serviceMonitoringService.deletePrometheusFrrExporter(); break;
        case "blackbox": await serviceMonitoringService.deletePrometheusBlackboxExporter(); break;
        case "module":
          if (deleteSubject.type === "icmp") {
            await serviceMonitoringService.deleteBlackboxICMPModule(deleteSubject.name);
          } else {
            await serviceMonitoringService.deleteBlackboxDNSModule(deleteSubject.name);
          }
          break;
      }
      setDeleteOpen(false);
      onSuccess();
    } catch (err) {
      setDeleteError((err as ApiError).message || tc("operationFailed"));
    } finally {
      setDeleting(false);
    }
  };

  const deleteTitle = (() => {
    switch (deleteSubject?.kind) {
      case "all": return t("prometheus.removeAllTitle");
      case "module": return t("prometheus.removeModuleTitle");
      default: return t("prometheus.removeExporterTitle");
    }
  })();
  const deleteDescription = (() => {
    switch (deleteSubject?.kind) {
      case "all": return t("prometheus.removeAllDescription");
      case "module":
        return t("prometheus.removeModuleDescription", {
          type: deleteSubject.type.toUpperCase(),
          name: deleteSubject.name,
        });
      default: return t("prometheus.removeExporterDescription");
    }
  })();

  return (
    <div className="space-y-6">
      {hasWrite && config && (
        <div className="flex justify-end">
          <Button
            size="sm"
            variant="outline"
            className="text-destructive hover:text-destructive"
            onClick={() => openDelete({ kind: "all" })}
          >
            <Trash2 className="h-4 w-4 mr-1" />
            {t("prometheus.removeAll")}
          </Button>
        </div>
      )}

      {/* Node Exporter */}
      <ExporterCard
        // eslint-disable-next-line vymanager/no-untranslated-text -- product name
        title="Node Exporter"
        description={t("prometheus.nodeExporterDescription")}
        defaultPort={caps.features.prometheus.exporters.node_exporter.default_port}
        port={config?.node_exporter?.port}
        listenAddresses={config?.node_exporter?.listen_addresses ?? []}
        vrf={config?.node_exporter?.vrf}
        extraBadges={config?.node_exporter?.textfile_collector ? [t("prometheus.textfileCollector")] : []}
        hasWrite={hasWrite}
        onEdit={() => setNodeOpen(true)}
        onRemove={() => openDelete({ kind: "node" })}
        configured={!!config?.node_exporter}
      />

      {/* FRR Exporter */}
      <ExporterCard
        // eslint-disable-next-line vymanager/no-untranslated-text -- product name
        title="FRR Exporter"
        description={t("prometheus.frrExporterDescription")}
        defaultPort={caps.features.prometheus.exporters.frr_exporter.default_port}
        port={config?.frr_exporter?.port}
        listenAddresses={config?.frr_exporter?.listen_addresses ?? []}
        vrf={config?.frr_exporter?.vrf}
        hasWrite={hasWrite}
        onEdit={() => setFrrOpen(true)}
        onRemove={() => openDelete({ kind: "frr" })}
        configured={!!config?.frr_exporter}
      />

      {/* Blackbox Exporter */}
      <Card>
        <CardHeader className="pb-2 pt-4 px-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
              {/* eslint-disable-next-line vymanager/no-untranslated-text -- product name */}
              <BarChart3 className="h-4 w-4" />
              Blackbox Exporter
              <span className="text-xs font-normal">— {t("prometheus.blackboxDescription")}</span>
              {config?.blackbox_exporter ? (
                <Badge variant="secondary" className="bg-green-500/10 text-green-600 dark:text-green-500 text-xs">{t("common.active")}</Badge>
              ) : (
                <Badge variant="secondary" className="text-xs">{t("common.notConfigured")}</Badge>
              )}
            </CardTitle>
            {hasWrite && (
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => setBlackboxOpen(true)}>
                  {config?.blackbox_exporter ? <><Pencil className="h-3.5 w-3.5 mr-1" />{tc("edit")}</> : <><Plus className="h-3.5 w-3.5 mr-1" />{t("common.configure")}</>}
                </Button>
                {config?.blackbox_exporter && (
                  <Button size="sm" variant="outline" className="text-destructive hover:text-destructive" onClick={() => openDelete({ kind: "blackbox" })}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            )}
          </div>
        </CardHeader>
        {config?.blackbox_exporter && (
          <CardContent className="px-4 pb-4 space-y-4">
            <div className="flex gap-4 text-sm">
              {config.blackbox_exporter.port && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">{t("common.port")}</p>
                  <p className="font-mono">{config.blackbox_exporter.port}</p>
                </div>
              )}
              {config.blackbox_exporter.vrf && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">VRF</p>
                  <Badge variant="secondary" className="font-mono">{config.blackbox_exporter.vrf}</Badge>
                </div>
              )}
            </div>

            {/* ICMP Modules */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-medium text-muted-foreground">{t("prometheus.icmpModules")}</p>
                {hasWrite && (
                  <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setModuleModal({ type: "icmp", original: null })}>
                    <Plus className="h-3 w-3 mr-1" />{tc("add")}
                  </Button>
                )}
              </div>
              {config.blackbox_exporter.icmp_modules.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{tc("name")}</TableHead>
                      <TableHead>{t("prometheus.ipProtocol")}</TableHead>
                      <TableHead>{t("prometheus.timeout")}</TableHead>
                      {hasWrite && <TableHead className="w-[60px]" />}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {config.blackbox_exporter.icmp_modules.map((m) => (
                      <TableRow key={m.name}>
                        <TableCell className="font-mono font-medium">{m.name}</TableCell>
                        <TableCell>{m.preferred_ip_protocol ?? "—"}</TableCell>
                        <TableCell>{m.timeout ? t("common.secondsValue", { value: String(m.timeout) }) : "—"}</TableCell>
                        {hasWrite && (
                          <TableCell>
                            <div className="flex gap-1">
                              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setModuleModal({ type: "icmp", original: m })}>
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => openDelete({ kind: "module", type: "icmp", name: m.name })}>
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-sm text-muted-foreground">{t("prometheus.noIcmpModules")}</p>
              )}
            </div>

            {/* DNS Modules */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-medium text-muted-foreground">{t("prometheus.dnsModules")}</p>
                {hasWrite && (
                  <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setModuleModal({ type: "dns", original: null })}>
                    <Plus className="h-3 w-3 mr-1" />{tc("add")}
                  </Button>
                )}
              </div>
              {config.blackbox_exporter.dns_modules.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{tc("name")}</TableHead>
                      <TableHead>{t("prometheus.queryName")}</TableHead>
                      <TableHead>{t("prometheus.type")}</TableHead>
                      {hasWrite && <TableHead className="w-[60px]" />}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {config.blackbox_exporter.dns_modules.map((m) => (
                      <TableRow key={m.name}>
                        <TableCell className="font-mono font-medium">{m.name}</TableCell>
                        <TableCell className="font-mono">{m.query_name ?? "—"}</TableCell>
                        <TableCell>{m.query_type ?? "—"}</TableCell>
                        {hasWrite && (
                          <TableCell>
                            <div className="flex gap-1">
                              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setModuleModal({ type: "dns", original: m })}>
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => openDelete({ kind: "module", type: "dns", name: m.name })}>
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-sm text-muted-foreground">{t("prometheus.noDnsModules")}</p>
              )}
            </div>
          </CardContent>
        )}
      </Card>

      {/* Exporter Modals */}
      {nodeOpen && (
        <PrometheusExporterModal
          open={nodeOpen}
          onOpenChange={setNodeOpen}
          type="node"
          original={config?.node_exporter ?? null}
          caps={caps}
          onSuccess={() => { setNodeOpen(false); onSuccess(); }}
        />
      )}
      {frrOpen && (
        <PrometheusExporterModal
          open={frrOpen}
          onOpenChange={setFrrOpen}
          type="frr"
          original={config?.frr_exporter ?? null}
          caps={caps}
          onSuccess={() => { setFrrOpen(false); onSuccess(); }}
        />
      )}
      {blackboxOpen && (
        <PrometheusExporterModal
          open={blackboxOpen}
          onOpenChange={setBlackboxOpen}
          type="blackbox"
          original={config?.blackbox_exporter ?? null}
          caps={caps}
          onSuccess={() => { setBlackboxOpen(false); onSuccess(); }}
        />
      )}

      {/* Module Modal */}
      {moduleModal && (
        <BlackboxModuleModal
          open={!!moduleModal}
          onOpenChange={(open) => { if (!open) setModuleModal(null); }}
          moduleType={moduleModal.type}
          original={moduleModal.original}
          existingNames={
            moduleModal.type === "icmp"
              ? (config?.blackbox_exporter?.icmp_modules ?? []).map((m) => m.name)
              : (config?.blackbox_exporter?.dns_modules ?? []).map((m) => m.name)
          }
          caps={caps}
          onSuccess={() => { setModuleModal(null); onSuccess(); }}
        />
      )}

      <AlertDialog
        open={deleteOpen}
        onOpenChange={(open) => { if (!open && !deleting) setDeleteOpen(false); }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{deleteTitle}</AlertDialogTitle>
            <AlertDialogDescription>{deleteDescription}</AlertDialogDescription>
          </AlertDialogHeader>
          {deleteError && (
            <div className="flex items-start gap-2 rounded-md border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
              <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
              <span className="whitespace-pre-wrap">{deleteError}</span>
            </div>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>{tc("cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {t("common.remove")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

interface ExporterCardProps {
  title: string;
  description: string;
  defaultPort: number;
  port?: number | null;
  listenAddresses: string[];
  vrf?: string | null;
  extraBadges?: string[];
  configured: boolean;
  hasWrite: boolean;
  onEdit: () => void;
  onRemove: () => void;
}

function ExporterCard({ title, description, port, listenAddresses, vrf, extraBadges = [], configured, hasWrite, onEdit, onRemove }: ExporterCardProps) {
  const t = useTranslations("serviceMonitoring");
  const tc = useTranslations("common");
  return (
    <Card>
      <CardHeader className="pb-2 pt-4 px-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
            <BarChart3 className="h-4 w-4" />
            {title}
            <span className="text-xs font-normal">— {description}</span>
            {configured ? (
              <Badge variant="secondary" className="bg-green-500/10 text-green-600 dark:text-green-500 text-xs">{t("common.active")}</Badge>
            ) : (
              <Badge variant="secondary" className="text-xs">{t("common.notConfigured")}</Badge>
            )}
          </CardTitle>
          {hasWrite && (
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={onEdit}>
                {configured ? <><Pencil className="h-3.5 w-3.5 mr-1" />{tc("edit")}</> : <><Plus className="h-3.5 w-3.5 mr-1" />{t("common.configure")}</>}
              </Button>
              {configured && (
                <Button size="sm" variant="outline" className="text-destructive hover:text-destructive" onClick={onRemove}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          )}
        </div>
      </CardHeader>
      {configured && (
        <CardContent className="px-4 pb-4">
          <div className="flex flex-wrap gap-4 text-sm">
            {port && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">{t("common.port")}</p>
                <p className="font-mono">{port}</p>
              </div>
            )}
            {vrf && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">VRF</p>
                <Badge variant="secondary" className="font-mono">{vrf}</Badge>
              </div>
            )}
            {listenAddresses.length > 0 && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">{t("common.listenAddresses")}</p>
                <div className="flex flex-wrap gap-1">
                  {listenAddresses.map((a) => (
                    <Badge key={a} variant="secondary" className="font-mono text-xs">{a}</Badge>
                  ))}
                </div>
              </div>
            )}
            {extraBadges.map((b) => (
              <div key={b}>
                <Badge variant="secondary" className="bg-blue-500/10 text-blue-600 dark:text-blue-400">{b}</Badge>
              </div>
            ))}
          </div>
        </CardContent>
      )}
    </Card>
  );
}
