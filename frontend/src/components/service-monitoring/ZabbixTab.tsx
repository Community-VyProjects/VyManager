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
import { Monitor, Pencil, Plus, Trash2 } from "lucide-react";
import {
  ZabbixConfig,
  ServiceMonitoringCapabilities,
  serviceMonitoringService,
} from "@/lib/api/service-monitoring";
import { ZabbixModal } from "./ZabbixModal";

interface ZabbixTabProps {
  config: ZabbixConfig | null;
  caps: ServiceMonitoringCapabilities;
  hasWrite: boolean;
  onSuccess: () => void;
}

export function ZabbixTab({ config, caps, hasWrite, onSuccess }: ZabbixTabProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await serviceMonitoringService.deleteZabbix();
      setDeleteOpen(false);
      onSuccess();
    } catch {
      // ignore
    } finally {
      setDeleting(false);
    }
  };

  if (!config) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="rounded-full p-4 bg-muted mb-4">
          <Monitor className="h-8 w-8 text-muted-foreground/50" />
        </div>
        <p className="text-sm font-medium mb-1">Zabbix Agent not configured</p>
        <p className="text-xs text-muted-foreground mb-4">
          Configure the Zabbix monitoring agent for this router
        </p>
        {hasWrite && (
          <Button onClick={() => setModalOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Configure Zabbix Agent
          </Button>
        )}
        {modalOpen && (
          <ZabbixModal
            open={modalOpen}
            onOpenChange={setModalOpen}
            original={null}
            caps={caps}
            onSuccess={() => { setModalOpen(false); onSuccess(); }}
          />
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2 pt-4 px-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
              <Monitor className="h-4 w-4" />
              Zabbix Agent Configuration
            </CardTitle>
            {hasWrite && (
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => setModalOpen(true)}>
                  <Pencil className="h-4 w-4 mr-1" />
                  Edit Configuration
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-destructive hover:text-destructive"
                  onClick={() => setDeleteOpen(true)}
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  Remove
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="px-4 pb-4 space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
            {config.host_name && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">Host Name</p>
                <p className="font-mono">{config.host_name}</p>
              </div>
            )}
            {config.port && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">Port</p>
                <p className="font-mono">{config.port}</p>
              </div>
            )}
            {config.timeout && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">Timeout</p>
                <p className="font-mono">{config.timeout}s</p>
              </div>
            )}
            {config.directory && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">Directory</p>
                <p className="font-mono">{config.directory}</p>
              </div>
            )}
            {config.authentication.mode && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">Auth Mode</p>
                <Badge variant="secondary">{config.authentication.mode}</Badge>
              </div>
            )}
            {config.log.debug_level && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">Log Level</p>
                <Badge variant="secondary">{config.log.debug_level}</Badge>
              </div>
            )}
          </div>

          {config.listen_addresses.length > 0 && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2">Listen Addresses</p>
              <div className="flex flex-wrap gap-2">
                {config.listen_addresses.map((a) => (
                  <Badge key={a} variant="secondary" className="font-mono">{a}</Badge>
                ))}
              </div>
            </div>
          )}

          {config.servers.length > 0 && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2">Passive Servers</p>
              <div className="flex flex-wrap gap-2">
                {config.servers.map((s) => (
                  <Badge key={s} variant="secondary" className="font-mono">{s}</Badge>
                ))}
              </div>
            </div>
          )}

          {config.servers_active.length > 0 && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2">Active Servers</p>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Address</TableHead>
                    <TableHead>Port</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {config.servers_active.map((s) => (
                    <TableRow key={s.address}>
                      <TableCell className="font-mono">{s.address}</TableCell>
                      <TableCell className="font-mono">{s.port ?? "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          <div className="flex gap-4 text-sm">
            {config.limits.buffer_flush_interval && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">Buffer Flush</p>
                <p className="font-mono">{config.limits.buffer_flush_interval}s</p>
              </div>
            )}
            {config.limits.buffer_size && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">Buffer Size</p>
                <p className="font-mono">{config.limits.buffer_size}</p>
              </div>
            )}
            {config.log.size && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">Log Size</p>
                <p className="font-mono">{config.log.size} MB</p>
              </div>
            )}
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">Remote Commands</p>
              <Badge variant="secondary" className={config.log.remote_commands ? "bg-amber-500/10 text-amber-600" : ""}>
                {config.log.remote_commands ? "Enabled" : "Disabled"}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {modalOpen && (
        <ZabbixModal
          open={modalOpen}
          onOpenChange={setModalOpen}
          original={config}
          caps={caps}
          onSuccess={() => { setModalOpen(false); onSuccess(); }}
        />
      )}

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Zabbix Agent?</AlertDialogTitle>
            <AlertDialogDescription>
              This will delete the entire Zabbix agent configuration. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
