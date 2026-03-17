"use client";

import { useState } from "react";
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
        toast.error("Delete failed", result.error ?? "Failed to delete host mapping");
      } else {
        toast.success("Host mapping removed");
        onRefresh();
      }
    } catch {
      toast.error("Delete failed", "An unexpected error occurred");
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
              Static Host Mapping
            </CardTitle>
            <CardDescription>
              Map hostnames to static IP addresses for local DNS resolution.
            </CardDescription>
          </div>
          {!isReadOnly && (
            <Button size="sm" onClick={() => setModalOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Mapping
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Hostname</TableHead>
              <TableHead>IP Address</TableHead>
              <TableHead>Aliases</TableHead>
              {!isReadOnly && <TableHead className="text-right">Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {config.static_host_mapping.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={isReadOnly ? 3 : 4}
                  className="text-center text-muted-foreground py-6"
                >
                  No host mappings configured
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
                        <span className="text-muted-foreground text-xs">None</span>
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
            <AlertDialogTitle>Remove Host Mapping</AlertDialogTitle>
            <AlertDialogDescription>
              Remove the static mapping for <strong>{deleteTarget}</strong>?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? "Removing…" : "Remove"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
