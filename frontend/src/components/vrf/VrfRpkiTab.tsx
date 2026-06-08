"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Code, Settings2, Shield } from "lucide-react";
import {
  VrfInstance,
  VrfCapabilities,
} from "@/lib/api/vrf";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { RpkiModal } from "./RpkiModal";

interface VrfRpkiTabProps {
  vrf: VrfInstance;
  capabilities: VrfCapabilities;
  canWrite: boolean;
  onRefresh: () => void;
}

export function VrfRpkiTab({ vrf, canWrite, onRefresh }: VrfRpkiTabProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [rawOpen, setRawOpen] = useState(false);
  const rpki = vrf.rpki;
  const caches = rpki?.caches ?? [];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-4 gap-4">
        <Card className="border-0 shadow-none bg-muted/50">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground mb-1">Caches</p>
            <p className="text-lg font-semibold">{caches.length}</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-none bg-muted/50">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground mb-1">Expire Interval</p>
            <p className="text-sm font-mono">{rpki?.expire_interval ?? "default"}</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-none bg-muted/50">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground mb-1">Polling Period</p>
            <p className="text-sm font-mono">{rpki?.polling_period ?? "default"}</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-none bg-muted/50">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground mb-1">Retry Interval</p>
            <p className="text-sm font-mono">{rpki?.retry_interval ?? "default"}</p>
          </CardContent>
        </Card>
      </div>

      {caches.length === 0 && (
        <div className="flex flex-col items-center justify-center py-10 text-center">
          <Shield className="h-10 w-10 text-muted-foreground mb-3" />
          <p className="text-sm text-muted-foreground mb-4">No RPKI caches configured.</p>
        </div>
      )}

      {caches.length > 0 && (
        <Card>
          <CardContent className="p-3 space-y-1.5">
            {caches.map((c) => (
              <div key={c.name} className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
                <span className="font-mono">{c.name}</span>
                <span className="text-xs text-muted-foreground font-mono">
                  {c.source_address ? `${c.source_address}:` : ""}{c.port ?? "—"}
                  {c.ssh ? " · ssh" : ""}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <div className="flex justify-end gap-2">
        {canWrite && (
          <Button variant="outline" size="sm" onClick={() => setModalOpen(true)}>
            <Settings2 className="h-3.5 w-3.5 mr-1.5" />
            Configure RPKI
          </Button>
        )}
        {rpki?.raw_config && (
          <Button variant="outline" size="sm" onClick={() => setRawOpen(true)}>
            <Code className="h-3.5 w-3.5 mr-1.5" />
            View Raw Config
          </Button>
        )}
      </div>

      <RpkiModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        vrfName={vrf.name}
        rpkiRaw={rpki?.raw_config}
        canWrite={canWrite}
        onSaved={onRefresh}
      />

      <Dialog open={rawOpen} onOpenChange={setRawOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>RPKI Raw Configuration — {vrf.name}</DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh]">
            <pre className="text-xs font-mono bg-muted p-4 rounded-lg overflow-x-auto">
              {JSON.stringify(rpki?.raw_config ?? {}, null, 2)}
            </pre>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}
