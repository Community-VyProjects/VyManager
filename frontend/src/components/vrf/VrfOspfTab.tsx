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
import { OSPF_SCHEMA } from "./schema/schemas";
import { EntityListEditor } from "./schema/EntityListEditor";
import {
  OSPF_AREA_GROUP,
  OSPF_INTERFACE_GROUP,
  OSPF_REDISTRIBUTE_GROUP,
  OSPF_SUMMARY_ADDRESS_GROUP,
  OSPF_NEIGHBOR_GROUP,
} from "./schema/ospfEntities";

interface VrfOspfTabProps {
  vrf: VrfInstance;
  capabilities: VrfCapabilities;
  canWrite: boolean;
  onRefresh: () => void;
}

export function VrfOspfTab({ vrf, capabilities, canWrite, onRefresh }: VrfOspfTabProps) {
  const [rawConfigOpen, setRawConfigOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const ospf = vrf.ospf;

  const editor = (
    <SchemaEditor
      open={editOpen}
      onOpenChange={setEditOpen}
      title={`OSPF Settings — ${vrf.name}`}
      vrfName={vrf.name}
      sections={OSPF_SCHEMA}
      rawConfig={ospf?.raw_config}
      capabilities={capabilities}
      canWrite={canWrite}
      onSaved={onRefresh}
    />
  );

  if (!ospf || !ospf.configured) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <Globe className="h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold mb-2">OSPF</h3>
        <p className="text-sm text-muted-foreground mb-4">Not configured</p>
        {canWrite && (
          <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
            <Settings2 className="h-3.5 w-3.5 mr-1.5" />
            Configure OSPF
          </Button>
        )}
        {editor}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4">
        <Card className="border-0 shadow-none bg-muted/50">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground mb-1">Router ID</p>
            <p className="text-sm font-mono font-medium">{ospf.router_id || "auto"}</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-none bg-muted/50">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground mb-1">Areas</p>
            <p className="text-lg font-semibold">{ospf.areas.length}</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-none bg-muted/50">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground mb-1">Interfaces</p>
            <p className="text-lg font-semibold">{ospf.interfaces.length}</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-none bg-muted/50">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground mb-1">Redistribute</p>
            <p className="text-lg font-semibold">{ospf.redistribute.length}</p>
          </CardContent>
        </Card>
      </div>

      {([
        OSPF_AREA_GROUP,
        OSPF_INTERFACE_GROUP,
        OSPF_REDISTRIBUTE_GROUP,
        OSPF_SUMMARY_ADDRESS_GROUP,
        OSPF_NEIGHBOR_GROUP,
      ] as const).map((group) => (
        <EntityListEditor
          key={group.label}
          vrfName={vrf.name}
          group={group}
          rawParent={ospf.raw_config}
          capabilities={capabilities}
          canWrite={canWrite}
          onRefresh={onRefresh}
        />
      ))}

      {/* Action Buttons */}
      <div className="flex justify-end gap-2">
        {canWrite && (
          <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
            <Settings2 className="h-3.5 w-3.5 mr-1.5" />
            Edit Settings
          </Button>
        )}
        {ospf.raw_config && (
          <Button variant="outline" size="sm" onClick={() => setRawConfigOpen(true)}>
            <Code className="h-3.5 w-3.5 mr-1.5" />
            View Raw Config
          </Button>
        )}
      </div>
      {editor}

      {/* Raw Config Dialog */}
      <Dialog open={rawConfigOpen} onOpenChange={setRawConfigOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>OSPF Raw Configuration — {vrf.name}</DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh]">
            <pre className="text-xs font-mono bg-muted p-4 rounded-lg overflow-x-auto">
              {JSON.stringify(ospf.raw_config, null, 2)}
            </pre>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}
