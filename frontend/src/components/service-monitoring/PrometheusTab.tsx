"use client";

import { useState } from "react";
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
import { BarChart3, Pencil, Plus, Trash2 } from "lucide-react";
import {
  PrometheusConfig,
  PrometheusBlackboxICMPModule,
  PrometheusBlackboxDNSModule,
  ServiceMonitoringCapabilities,
  serviceMonitoringService,
} from "@/lib/api/service-monitoring";
import { PrometheusExporterModal } from "./PrometheusExporterModal";
import { BlackboxModuleModal } from "./BlackboxModuleModal";

interface PrometheusTabProps {
  config: PrometheusConfig | null;
  caps: ServiceMonitoringCapabilities;
  hasWrite: boolean;
  onSuccess: () => void;
}

export function PrometheusTab({ config, caps, hasWrite, onSuccess }: PrometheusTabProps) {
  const [nodeOpen, setNodeOpen] = useState(false);
  const [frrOpen, setFrrOpen] = useState(false);
  const [blackboxOpen, setBlackboxOpen] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<"node" | "frr" | "blackbox" | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [moduleModal, setModuleModal] = useState<{
    type: "icmp" | "dns";
    original: PrometheusBlackboxICMPModule | PrometheusBlackboxDNSModule | null;
  } | null>(null);
  const [deleteModule, setDeleteModule] = useState<{
    type: "icmp" | "dns";
    name: string;
  } | null>(null);

  const handleDeleteExporter = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      switch (deleteTarget) {
        case "node": await serviceMonitoringService.deletePrometheusNodeExporter(); break;
        case "frr": await serviceMonitoringService.deletePrometheusFrrExporter(); break;
        case "blackbox": await serviceMonitoringService.deletePrometheusBlackboxExporter(); break;
      }
      setDeleteTarget(null);
      onSuccess();
    } catch {
      // ignore
    } finally {
      setDeleting(false);
    }
  };

  const handleDeleteModule = async () => {
    if (!deleteModule) return;
    setDeleting(true);
    try {
      if (deleteModule.type === "icmp") {
        await serviceMonitoringService.deleteBlackboxICMPModule(deleteModule.name);
      } else {
        await serviceMonitoringService.deleteBlackboxDNSModule(deleteModule.name);
      }
      setDeleteModule(null);
      onSuccess();
    } catch {
      // ignore
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Node Exporter */}
      <ExporterCard
        title="Node Exporter"
        description="Hardware and OS metrics"
        defaultPort={caps.features.prometheus.exporters.node_exporter.default_port}
        port={config?.node_exporter?.port}
        listenAddresses={config?.node_exporter?.listen_addresses ?? []}
        vrf={config?.node_exporter?.vrf}
        extraBadges={config?.node_exporter?.textfile_collector ? ["Textfile Collector"] : []}
        hasWrite={hasWrite}
        onEdit={() => setNodeOpen(true)}
        onRemove={() => setDeleteTarget("node")}
        configured={!!config?.node_exporter}
      />

      {/* FRR Exporter */}
      <ExporterCard
        title="FRR Exporter"
        description="FRR routing daemon metrics"
        defaultPort={caps.features.prometheus.exporters.frr_exporter.default_port}
        port={config?.frr_exporter?.port}
        listenAddresses={config?.frr_exporter?.listen_addresses ?? []}
        vrf={config?.frr_exporter?.vrf}
        hasWrite={hasWrite}
        onEdit={() => setFrrOpen(true)}
        onRemove={() => setDeleteTarget("frr")}
        configured={!!config?.frr_exporter}
      />

      {/* Blackbox Exporter */}
      <Card>
        <CardHeader className="pb-2 pt-4 px-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
              <BarChart3 className="h-4 w-4" />
              Blackbox Exporter
              <span className="text-xs font-normal">— ICMP and DNS probe results</span>
              {config?.blackbox_exporter ? (
                <Badge variant="secondary" className="bg-green-500/10 text-green-600 dark:text-green-500 text-xs">Active</Badge>
              ) : (
                <Badge variant="secondary" className="text-xs">Not configured</Badge>
              )}
            </CardTitle>
            {hasWrite && (
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => setBlackboxOpen(true)}>
                  {config?.blackbox_exporter ? <><Pencil className="h-3.5 w-3.5 mr-1" />Edit</> : <><Plus className="h-3.5 w-3.5 mr-1" />Configure</>}
                </Button>
                {config?.blackbox_exporter && (
                  <Button size="sm" variant="outline" className="text-destructive hover:text-destructive" onClick={() => setDeleteTarget("blackbox")}>
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
                  <p className="text-xs font-medium text-muted-foreground mb-1">Port</p>
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
                <p className="text-xs font-medium text-muted-foreground">ICMP Modules</p>
                {hasWrite && (
                  <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setModuleModal({ type: "icmp", original: null })}>
                    <Plus className="h-3 w-3 mr-1" />Add
                  </Button>
                )}
              </div>
              {config.blackbox_exporter.icmp_modules.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>IP Protocol</TableHead>
                      <TableHead>Timeout</TableHead>
                      {hasWrite && <TableHead className="w-[60px]" />}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {config.blackbox_exporter.icmp_modules.map((m) => (
                      <TableRow key={m.name}>
                        <TableCell className="font-mono font-medium">{m.name}</TableCell>
                        <TableCell>{m.preferred_ip_protocol ?? "—"}</TableCell>
                        <TableCell>{m.timeout ? `${m.timeout}s` : "—"}</TableCell>
                        {hasWrite && (
                          <TableCell>
                            <div className="flex gap-1">
                              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setModuleModal({ type: "icmp", original: m })}>
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => setDeleteModule({ type: "icmp", name: m.name })}>
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
                <p className="text-sm text-muted-foreground">No ICMP modules</p>
              )}
            </div>

            {/* DNS Modules */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-medium text-muted-foreground">DNS Modules</p>
                {hasWrite && (
                  <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setModuleModal({ type: "dns", original: null })}>
                    <Plus className="h-3 w-3 mr-1" />Add
                  </Button>
                )}
              </div>
              {config.blackbox_exporter.dns_modules.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Query Name</TableHead>
                      <TableHead>Type</TableHead>
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
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => setDeleteModule({ type: "dns", name: m.name })}>
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
                <p className="text-sm text-muted-foreground">No DNS modules</p>
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

      {/* Delete Exporter Dialog */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove exporter?</AlertDialogTitle>
            <AlertDialogDescription>
              This will delete the exporter configuration. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteExporter} disabled={deleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Module Dialog */}
      <AlertDialog open={!!deleteModule} onOpenChange={(open) => { if (!open) setDeleteModule(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove module?</AlertDialogTitle>
            <AlertDialogDescription>
              This will delete the {deleteModule?.type.toUpperCase()} module &quot;{deleteModule?.name}&quot;.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteModule} disabled={deleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Remove
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
  return (
    <Card>
      <CardHeader className="pb-2 pt-4 px-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
            <BarChart3 className="h-4 w-4" />
            {title}
            <span className="text-xs font-normal">— {description}</span>
            {configured ? (
              <Badge variant="secondary" className="bg-green-500/10 text-green-600 dark:text-green-500 text-xs">Active</Badge>
            ) : (
              <Badge variant="secondary" className="text-xs">Not configured</Badge>
            )}
          </CardTitle>
          {hasWrite && (
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={onEdit}>
                {configured ? <><Pencil className="h-3.5 w-3.5 mr-1" />Edit</> : <><Plus className="h-3.5 w-3.5 mr-1" />Configure</>}
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
                <p className="text-xs font-medium text-muted-foreground mb-1">Port</p>
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
                <p className="text-xs font-medium text-muted-foreground mb-1">Listen Addresses</p>
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
