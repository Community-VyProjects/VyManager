"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2, Loader2, Code } from "lucide-react";
import {
  VrfInstance,
  VrfCapabilities,
  vrfService,
} from "@/lib/api/vrf";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FailoverRouteModal } from "./FailoverRouteModal";

interface VrfFailoverTabProps {
  vrf: VrfInstance;
  capabilities: VrfCapabilities;
  canWrite: boolean;
  onRefresh: () => void;
}

type Raw = Record<string, unknown>;

export function VrfFailoverTab({ vrf, canWrite, onRefresh }: VrfFailoverTabProps) {
  const failover = vrf.failover;
  const routes = failover?.routes ?? [];
  const routeRawMap = (failover?.raw_config?.route ?? {}) as Raw;

  const [modalOpen, setModalOpen] = useState(false);
  const [editDest, setEditDest] = useState<string | null>(null);
  const [rawOpen, setRawOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const openAdd = () => {
    setEditDest(null);
    setModalOpen(true);
  };
  const openEdit = (dest: string) => {
    setEditDest(dest);
    setModalOpen(true);
  };

  const handleDelete = async (dest: string) => {
    setBusy(true);
    setError(null);
    try {
      const r = await vrfService.batchConfigure([
        { op: "delete_vrf_failover_route", value: `${vrf.name},${dest}` },
      ]);
      if (!r.success) setError(r.error || "Delete failed");
      else onRefresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <CardTitle className="text-base">
            Failover Routes {routes.length > 0 && <Badge variant="secondary" className="ml-1">{routes.length}</Badge>}
          </CardTitle>
          {canWrite && (
            <Button size="sm" variant="outline" onClick={openAdd} disabled={busy}>
              <Plus className="h-3.5 w-3.5 mr-1" />
              Add Route
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {error && (
            <pre className="mb-3 whitespace-pre-wrap break-words rounded-md border border-destructive/50 bg-destructive/10 p-2 text-xs text-destructive">
              {error}
            </pre>
          )}
          {routes.length === 0 ? (
            <p className="text-sm text-muted-foreground py-2">No failover routes configured.</p>
          ) : (
            <div className="space-y-1.5">
              {routes.map((route) => (
                <div key={route.destination} className="flex items-center justify-between rounded-md border px-3 py-2">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-sm">{route.destination}</span>
                    <span className="text-xs text-muted-foreground">
                      {route.next_hops.length} next-hop{route.next_hops.length !== 1 ? "s" : ""}
                      {route.dhcp_interfaces.length > 0 && `, ${route.dhcp_interfaces.length} dhcp-iface`}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button size="sm" variant="ghost" onClick={() => openEdit(route.destination)} disabled={busy}>
                      <Pencil className="h-3.5 w-3.5 mr-1" />
                      Edit
                    </Button>
                    {canWrite && (
                      <Button size="sm" variant="ghost" className="text-destructive" onClick={() => handleDelete(route.destination)} disabled={busy}>
                        {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {failover?.raw_config && (
        <div className="flex justify-end">
          <Button variant="outline" size="sm" onClick={() => setRawOpen(true)}>
            <Code className="h-3.5 w-3.5 mr-1.5" />
            View Raw Config
          </Button>
        </div>
      )}

      <FailoverRouteModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        vrfName={vrf.name}
        destination={editDest}
        routeRaw={editDest ? ((routeRawMap[editDest] as Raw) ?? null) : null}
        canWrite={canWrite}
        onSaved={onRefresh}
      />

      <Dialog open={rawOpen} onOpenChange={setRawOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Failover Raw Configuration — {vrf.name}</DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh]">
            <pre className="text-xs font-mono bg-muted p-4 rounded-lg overflow-x-auto">
              {JSON.stringify(failover?.raw_config ?? {}, null, 2)}
            </pre>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}
