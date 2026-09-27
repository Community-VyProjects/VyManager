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
  const t = useTranslations("serviceMonitoring");
  const tc = useTranslations("common");
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
        <p className="text-sm font-medium mb-1">{t("zabbix.notConfigured")}</p>
        <p className="text-xs text-muted-foreground mb-4">
          {t("zabbix.emptyDescription")}
        </p>
        {hasWrite && (
          <Button onClick={() => setModalOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            {t("zabbix.configureTitle")}
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
              {t("zabbix.cardTitle")}
            </CardTitle>
            {hasWrite && (
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => setModalOpen(true)}>
                  <Pencil className="h-4 w-4 mr-1" />
                  {t("zabbix.editConfiguration")}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-destructive hover:text-destructive"
                  onClick={() => setDeleteOpen(true)}
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  {t("common.remove")}
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="px-4 pb-4 space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
            {config.host_name && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">{t("zabbix.hostName")}</p>
                <p className="font-mono">{config.host_name}</p>
              </div>
            )}
            {config.port && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">{t("common.port")}</p>
                <p className="font-mono">{config.port}</p>
              </div>
            )}
            {config.timeout && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">{t("prometheus.timeout")}</p>
                <p className="font-mono">{t("common.secondsValue", { value: String(config.timeout) })}</p>
              </div>
            )}
            {config.directory && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">{t("zabbix.directory")}</p>
                <p className="font-mono">{config.directory}</p>
              </div>
            )}
            {config.authentication.mode && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">{t("zabbix.authMode")}</p>
                <Badge variant="secondary">{config.authentication.mode}</Badge>
              </div>
            )}
            {config.log.debug_level && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">{t("networkEvent.logLevel")}</p>
                <Badge variant="secondary">{config.log.debug_level}</Badge>
              </div>
            )}
          </div>

          {config.listen_addresses.length > 0 && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2">{t("common.listenAddresses")}</p>
              <div className="flex flex-wrap gap-2">
                {config.listen_addresses.map((a) => (
                  <Badge key={a} variant="secondary" className="font-mono">{a}</Badge>
                ))}
              </div>
            </div>
          )}

          {config.servers.length > 0 && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2">{t("zabbix.passiveServers")}</p>
              <div className="flex flex-wrap gap-2">
                {config.servers.map((s) => (
                  <Badge key={s} variant="secondary" className="font-mono">{s}</Badge>
                ))}
              </div>
            </div>
          )}

          {config.servers_active.length > 0 && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2">{t("zabbix.activeServers")}</p>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("zabbix.address")}</TableHead>
                    <TableHead>{t("common.port")}</TableHead>
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
                <p className="text-xs font-medium text-muted-foreground mb-1">{t("zabbix.bufferFlush")}</p>
                <p className="font-mono">{t("common.secondsValue", { value: String(config.limits.buffer_flush_interval) })}</p>
              </div>
            )}
            {config.limits.buffer_size && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">{t("zabbix.bufferSize")}</p>
                <p className="font-mono">{config.limits.buffer_size}</p>
              </div>
            )}
            {config.log.size && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">{t("zabbix.logSize")}</p>
                <p className="font-mono">{config.log.size} MB</p>
              </div>
            )}
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">{t("zabbix.remoteCommands")}</p>
              <Badge variant="secondary" className={config.log.remote_commands ? "bg-amber-500/10 text-amber-600" : ""}>
                {config.log.remote_commands ? tc("enabled") : tc("disabled")}
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
            <AlertDialogTitle>{t("zabbix.removeTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("zabbix.removeDescription")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>{tc("cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t("common.remove")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
