"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { MapPin, Plus, Trash2 } from "lucide-react";
import {
  systemSettingsService,
  type SystemConfig,
} from "@/lib/api/system-settings";
import { useToast } from "@/hooks/useToast";
import { HostMappingModal } from "./HostMappingModal";

interface Props {
  config: SystemConfig;
  isReadOnly: boolean;
  onRefresh: () => void;
}

export function HostMappingPanel({ config, isReadOnly, onRefresh }: Props) {
  const t = useTranslations("systemGeneral");
  const tc = useTranslations("common");
  const { toast } = useToast();
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const result = await systemSettingsService.deleteStaticHost(deleteTarget);
      if (!result.success) {
        toast.error(t("hostMap.deleteFailed"), result.error ?? t("hostMap.deleteFailedDetail"));
      } else {
        toast.success(t("hostMap.removed"));
        onRefresh();
      }
    } catch {
      toast.error(t("hostMap.deleteFailed"), t("unexpectedError"));
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              {t("hostMap.title")}
            </CardTitle>
            <CardDescription>
              {t("hostMap.description")}
            </CardDescription>
          </div>
          {!isReadOnly && (
            <Button size="sm" onClick={() => setModalOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              {t("hostMap.addMapping")}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("general.hostname")}</TableHead>
              <TableHead>{t("hostMap.ipAddress")}</TableHead>
              <TableHead>{t("hostMap.aliases")}</TableHead>
              {!isReadOnly && <TableHead className="text-right">{tc("actions")}</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {config.static_host_mapping.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={isReadOnly ? 3 : 4}
                  className="text-center text-muted-foreground py-6"
                >
                  {t("hostMap.empty")}
                </TableCell>
              </TableRow>
            ) : (
              config.static_host_mapping.map((entry) => (
                <TableRow key={entry.hostname}>
                  <TableCell className="font-mono">{entry.hostname}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {entry.inet.length > 0 ? entry.inet.map((ip) => (
                        <Badge key={ip} variant="outline" className="font-mono text-xs">
                          {ip}
                        </Badge>
                      )) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {entry.aliases.map((a) => (
                        <Badge key={a} variant="outline" className="font-mono text-xs">
                          {a}
                        </Badge>
                      ))}
                      {entry.aliases.length === 0 && (
                        <span className="text-muted-foreground text-xs">{tc("none")}</span>
                      )}
                    </div>
                  </TableCell>
                  {!isReadOnly && (
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        onClick={() => setDeleteTarget(entry.hostname)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>

      <HostMappingModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        onSuccess={onRefresh}
      />

      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(o: boolean) => { if (!o) setDeleteTarget(null); }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("hostMap.removeTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t.rich("hostMap.removeConfirm", { name: deleteTarget ?? "", strong: (chunks) => <strong>{chunks}</strong> })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>{tc("cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? t("hostMap.removing") : t("hostMap.remove")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
