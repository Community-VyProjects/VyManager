"use client";

import { useState } from "react";
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Code, Globe, Users, Network } from "lucide-react";
import {
  VrfInstance,
  VrfCapabilities,
} from "@/lib/api/vrf";

interface VrfBgpTabProps {
  vrf: VrfInstance;
  capabilities: VrfCapabilities;
  canWrite: boolean;
  onRefresh: () => void;
}

export function VrfBgpTab({ vrf, capabilities, canWrite, onRefresh }: VrfBgpTabProps) {
  const [rawConfigOpen, setRawConfigOpen] = useState(false);
  const bgp = vrf.bgp;

  if (!bgp || !bgp.configured) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <Network className="h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold mb-2">BGP</h3>
        <p className="text-sm text-muted-foreground">Coming soon</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-5 gap-4">
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
      </div>

      {bgp.neighbors.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-4 w-4" />
              Neighbors
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {bgp.neighbors.map((n) => (
                <Badge key={n} variant="outline" className="font-mono">{n}</Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {bgp.peer_groups.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Peer Groups</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {bgp.peer_groups.map((pg) => (
                <Badge key={pg} variant="secondary">{pg}</Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {bgp.address_families.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Address Families</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {bgp.address_families.map((af) => (
                <Badge key={af} variant="secondary" className="font-mono">{af}</Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {bgp.raw_config && (
        <div className="flex justify-end">
          <Button variant="outline" size="sm" onClick={() => setRawConfigOpen(true)}>
            <Code className="h-3.5 w-3.5 mr-1.5" />
            View Raw Config
          </Button>
        </div>
      )}

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
