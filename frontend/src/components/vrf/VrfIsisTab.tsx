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
import { Code, Globe, Settings2 } from "lucide-react";
import {
  VrfInstance,
  VrfCapabilities,
} from "@/lib/api/vrf";
import { SchemaEditor } from "./schema/SchemaEditor";
import { ISIS_SCHEMA } from "./schema/schemas";
import { EntityListEditor } from "./schema/EntityListEditor";
import {
  ISIS_INTERFACE_GROUP,
  ISIS_REDIST_IPV4_GROUP,
  ISIS_REDIST_IPV6_GROUP,
  ISIS_DEFAULT_INFO_IPV4_GROUP,
  ISIS_DEFAULT_INFO_IPV6_GROUP,
  ISIS_SR_PREFIX_GROUP,
} from "./schema/isisEntities";

interface VrfIsisTabProps {
  vrf: VrfInstance;
  capabilities: VrfCapabilities;
  canWrite: boolean;
  onRefresh: () => void;
}

export function VrfIsisTab({ vrf, capabilities, canWrite, onRefresh }: VrfIsisTabProps) {
  const [rawConfigOpen, setRawConfigOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const isis = vrf.isis;

  const editor = (
    <SchemaEditor
      open={editOpen}
      onOpenChange={setEditOpen}
      title={`IS-IS Settings — ${vrf.name}`}
      vrfName={vrf.name}
      sections={ISIS_SCHEMA}
      rawConfig={isis?.raw_config}
      capabilities={capabilities}
      canWrite={canWrite}
      onSaved={onRefresh}
    />
  );

  if (!isis || !isis.configured) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <Globe className="h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold mb-2">IS-IS</h3>
        <p className="text-sm text-muted-foreground mb-4">Not configured</p>
        {canWrite && (
          <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
            <Settings2 className="h-3.5 w-3.5 mr-1.5" />
            Configure IS-IS
          </Button>
        )}
        {editor}
      </div>
    );
  }

  const totalRedistribute = isis.redistribute_ipv4.length + isis.redistribute_ipv6.length;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-4 gap-4">
        <Card className="border-0 shadow-none bg-muted/50">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground mb-1">NET</p>
            <p className="text-sm font-mono font-medium truncate">{isis.net || "—"}</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-none bg-muted/50">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground mb-1">Interfaces</p>
            <p className="text-lg font-semibold">{isis.interfaces.length}</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-none bg-muted/50">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground mb-1">IPv4 Redistribute</p>
            <p className="text-lg font-semibold">{isis.redistribute_ipv4.length}</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-none bg-muted/50">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground mb-1">IPv6 Redistribute</p>
            <p className="text-lg font-semibold">{isis.redistribute_ipv6.length}</p>
          </CardContent>
        </Card>
      </div>

      {[
        ISIS_INTERFACE_GROUP,
        ISIS_REDIST_IPV4_GROUP,
        ISIS_REDIST_IPV6_GROUP,
        ISIS_DEFAULT_INFO_IPV4_GROUP,
        ISIS_DEFAULT_INFO_IPV6_GROUP,
        ISIS_SR_PREFIX_GROUP,
      ].map((group) => (
        <EntityListEditor
          key={group.label}
          vrfName={vrf.name}
          group={group}
          rawParent={isis.raw_config}
          capabilities={capabilities}
          canWrite={canWrite}
          onRefresh={onRefresh}
        />
      ))}

      <div className="flex justify-end gap-2">
        {canWrite && (
          <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
            <Settings2 className="h-3.5 w-3.5 mr-1.5" />
            Edit Settings
          </Button>
        )}
        {isis.raw_config && (
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
            <DialogTitle>IS-IS Raw Configuration — {vrf.name}</DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh]">
            <pre className="text-xs font-mono bg-muted p-4 rounded-lg overflow-x-auto">
              {JSON.stringify(isis.raw_config, null, 2)}
            </pre>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}
