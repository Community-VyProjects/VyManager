"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Code, Server, Settings2 } from "lucide-react";
import {
  VrfInstance,
  VrfCapabilities,
} from "@/lib/api/vrf";
import { SchemaEditor } from "./schema/SchemaEditor";
import { DHCP_SCHEMA } from "./schema/schemas";
import { EntityListEditor } from "./schema/EntityListEditor";
import { DHCP_SHARED_NETWORK_GROUP, DHCP_CLIENT_CLASS_GROUP } from "./schema/dhcpEntities";

interface VrfDhcpTabProps {
  vrf: VrfInstance;
  capabilities: VrfCapabilities;
  canWrite: boolean;
  onRefresh: () => void;
}

export function VrfDhcpTab({ vrf, capabilities, canWrite, onRefresh }: VrfDhcpTabProps) {
  const [rawConfigOpen, setRawConfigOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const dhcp = vrf.dhcp;

  const editor = (
    <SchemaEditor
      open={editOpen}
      onOpenChange={setEditOpen}
      title={`DHCP Server Settings — ${vrf.name}`}
      vrfName={vrf.name}
      sections={DHCP_SCHEMA}
      rawConfig={dhcp?.raw_config}
      capabilities={capabilities}
      canWrite={canWrite}
      onSaved={onRefresh}
    />
  );

  if (!dhcp || !dhcp.configured) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <Server className="h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold mb-2">DHCP Server</h3>
        <p className="text-sm text-muted-foreground mb-4">Not configured</p>
        {canWrite && (
          <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
            <Settings2 className="h-3.5 w-3.5 mr-1.5" />
            Configure DHCP
          </Button>
        )}
        {editor}
      </div>
    );
  }

  const totalSubnets = dhcp.shared_networks.reduce(
    (sum, n) => sum + n.subnets.length,
    0
  );
  const totalMappings = dhcp.shared_networks.reduce(
    (sum, n) => sum + n.subnets.reduce((s, sub) => s + sub.static_mappings, 0),
    0
  );

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4">
        <Card className="border-0 shadow-none bg-muted/50">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground mb-1">Status</p>
            <Badge variant={dhcp.disabled ? "outline" : "secondary"}>
              {dhcp.disabled ? "Disabled" : "Active"}
            </Badge>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-none bg-muted/50">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground mb-1">Shared Networks</p>
            <p className="text-lg font-semibold">{dhcp.shared_networks.length}</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-none bg-muted/50">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground mb-1">Subnets</p>
            <p className="text-lg font-semibold">{totalSubnets}</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-none bg-muted/50">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground mb-1">Static Mappings</p>
            <p className="text-lg font-semibold">{totalMappings}</p>
          </CardContent>
        </Card>
      </div>

      {[DHCP_SHARED_NETWORK_GROUP, DHCP_CLIENT_CLASS_GROUP].map((group) => (
        <EntityListEditor
          key={group.label}
          vrfName={vrf.name}
          group={group}
          rawParent={dhcp.raw_config}
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
        {dhcp.raw_config && (
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
            <DialogTitle>DHCP Server Raw Configuration — {vrf.name}</DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh]">
            <pre className="text-xs font-mono bg-muted p-4 rounded-lg overflow-x-auto">
              {JSON.stringify(dhcp.raw_config, null, 2)}
            </pre>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}
