"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { Network, Pencil, Plus, Trash2 } from "lucide-react";
import {
  NetworkEventConfig,
  ServiceMonitoringCapabilities,
  serviceMonitoringService,
} from "@/lib/api/service-monitoring";
import { NetworkEventModal } from "./NetworkEventModal";

interface NetworkEventTabProps {
  config: NetworkEventConfig | null;
  caps: ServiceMonitoringCapabilities;
  hasWrite: boolean;
  onSuccess: () => void;
}

const EVENT_LABELS: Record<string, string> = {
  addr: "Address",
  link: "Link",
  neigh: "Neighbor",
  route: "Route",
  rule: "Policy Rule",
};

export function NetworkEventTab({ config, caps, hasWrite, onSuccess }: NetworkEventTabProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await serviceMonitoringService.deleteNetworkEvent();
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
          <Network className="h-8 w-8 text-muted-foreground/50" />
        </div>
        <p className="text-sm font-medium mb-1">Network Event logging not configured</p>
        <p className="text-xs text-muted-foreground mb-4">
          Log kernel netlink events for network changes
        </p>
        {hasWrite && (
          <Button onClick={() => setModalOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Configure Network Events
          </Button>
        )}
        {modalOpen && (
          <NetworkEventModal
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
              <Network className="h-4 w-4" />
              Network Event Configuration
            </CardTitle>
            {hasWrite && (
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => setModalOpen(true)}>
                  <Pencil className="h-4 w-4 mr-1" />
                  Edit
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
          <div className="flex gap-6 text-sm">
            {config.log_level && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">Log Level</p>
                <Badge variant="secondary">{config.log_level}</Badge>
              </div>
            )}
            {config.queue_size && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">Queue Size</p>
                <p className="font-mono">{config.queue_size}</p>
              </div>
            )}
          </div>

          {config.events.length > 0 && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2">Event Types</p>
              <div className="flex flex-wrap gap-2">
                {config.events.map((e) => (
                  <Badge key={e} variant="secondary" className="bg-blue-500/10 text-blue-600 dark:text-blue-400">
                    {EVENT_LABELS[e] ?? e}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {modalOpen && (
        <NetworkEventModal
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
            <AlertDialogTitle>Remove Network Event logging?</AlertDialogTitle>
            <AlertDialogDescription>
              This will delete the network event configuration. This action cannot be undone.
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
