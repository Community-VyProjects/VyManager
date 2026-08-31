"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Code, Network, Settings2 } from "lucide-react";
import {
  VrfInstance,
  VrfCapabilities,
} from "@/lib/api/vrf";
import { SchemaEditor } from "./schema/SchemaEditor";
import { BGP_SCHEMA } from "./schema/schemas";
import { EntityListEditor } from "./schema/EntityListEditor";
import { BGP_NEIGHBOR_GROUP, BGP_PEER_GROUP_GROUP, BGP_AF_GROUP } from "./schema/bgpEntities";

interface VrfBgpTabProps {
  vrf: VrfInstance;
  capabilities: VrfCapabilities;
  canWrite: boolean;
  onRefresh: () => void;
}

export function VrfBgpTab({ vrf, capabilities, canWrite, onRefresh }: VrfBgpTabProps) {
  const [rawConfigOpen, setRawConfigOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const bgp = vrf.bgp;

  const editor = (
    <SchemaEditor
      open={editOpen}
      onOpenChange={setEditOpen}
      title={`BGP Settings — ${vrf.name}`}
      vrfName={vrf.name}
      sections={BGP_SCHEMA}
      rawConfig={bgp?.raw_config}
      capabilities={capabilities}
      canWrite={canWrite}
      onSaved={onRefresh}
    />
  );

  if (!bgp || !bgp.configured) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <Network className="h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold mb-2">BGP</h3>
        <p className="text-sm text-muted-foreground mb-4">Not configured</p>
        {canWrite && (
          <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
            <Settings2 className="h-3.5 w-3.5 mr-1.5" />
            Configure BGP
          </Button>
        )}
        {editor}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-6 gap-4">
        <Card className="border-0 shadow-none bg-muted/50">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground mb-1">System AS</p>
            <p className="text-sm font-mono font-medium">{bgp.system_as ?? "—"}</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-none bg-muted/50">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground mb-1">Router ID</p>
            <p className="text-sm font-mono font-medium">{bgp.router_id || "auto"}</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-none bg-muted/50">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground mb-1">Neighbors</p>
            <p className="text-lg font-semibold">{bgp.neighbors.length}</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-none bg-muted/50">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground mb-1">Peer Groups</p>
            <p className="text-lg font-semibold">{bgp.peer_groups.length}</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-none bg-muted/50">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground mb-1">Address Families</p>
            <p className="text-lg font-semibold">{bgp.address_families.length}</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-none bg-muted/50">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground mb-1">Networks</p>
            <p className="text-lg font-semibold">
              {bgp.address_families.reduce((sum, af) => sum + af.networks.length, 0)}
            </p>
          </CardContent>
        </Card>
      </div>

      <EntityListEditor
        vrfName={vrf.name}
        group={BGP_NEIGHBOR_GROUP}
        rawParent={bgp.raw_config}
        capabilities={capabilities}
        canWrite={canWrite}
        onRefresh={onRefresh}
      />

      <EntityListEditor
        vrfName={vrf.name}
        group={BGP_PEER_GROUP_GROUP}
        rawParent={bgp.raw_config}
        capabilities={capabilities}
        canWrite={canWrite}
        onRefresh={onRefresh}
      />

      <EntityListEditor
        vrfName={vrf.name}
        group={BGP_AF_GROUP}
        rawParent={bgp.raw_config}
        capabilities={capabilities}
        canWrite={canWrite}
        onRefresh={onRefresh}
      />

      <div className="flex justify-end gap-2">
        {canWrite && (
          <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
            <Settings2 className="h-3.5 w-3.5 mr-1.5" />
            Edit Settings
          </Button>
        )}
        {bgp.raw_config && (
          <Button variant="outline" size="sm" onClick={() => setRawConfigOpen(true)}>
            <Code className="h-3.5 w-3.5 mr-1.5" />
            View Raw Config
          </Button>
        )}
      </div>
      {editor}

      <Dialog open={rawConfigOpen} onOpenChange={setRawConfigOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>BGP Raw Configuration — {vrf.name}</DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh]">
            <pre className="text-xs font-mono bg-muted p-4 rounded-lg overflow-x-auto">
              {JSON.stringify(bgp.raw_config, null, 2)}
            </pre>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}
