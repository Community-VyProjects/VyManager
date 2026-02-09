"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Code, Globe } from "lucide-react";
import {
  VrfInstance,
  VrfCapabilities,
} from "@/lib/api/vrf";

interface VrfOspfv3TabProps {
  vrf: VrfInstance;
  capabilities: VrfCapabilities;
  canWrite: boolean;
  onRefresh: () => void;
}

export function VrfOspfv3Tab({ vrf, capabilities, canWrite, onRefresh }: VrfOspfv3TabProps) {
  const [rawConfigOpen, setRawConfigOpen] = useState(false);
  const ospfv3 = vrf.ospfv3;

  if (!ospfv3 || !ospfv3.configured) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <Globe className="h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold mb-2">OSPFv3 Not Configured</h3>
        <p className="text-sm text-muted-foreground text-center max-w-md">
          OSPFv3 is not configured in VRF {vrf.name}. Configure it via the VyOS CLI
          or use the batch API to add OSPFv3 settings.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-4 gap-4">
        <Card className="border-0 shadow-none bg-muted/50">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground mb-1">Router ID</p>
            <p className="text-sm font-mono font-medium">{ospfv3.router_id || "auto"}</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-none bg-muted/50">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground mb-1">Areas</p>
            <p className="text-lg font-semibold">{ospfv3.areas.length}</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-none bg-muted/50">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground mb-1">Interfaces</p>
            <p className="text-lg font-semibold">{ospfv3.interfaces.length}</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-none bg-muted/50">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground mb-1">Redistribute</p>
            <p className="text-lg font-semibold">{ospfv3.redistribute.length}</p>
          </CardContent>
        </Card>
      </div>

      {ospfv3.areas.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Areas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {ospfv3.areas.map((area) => (
                <Badge key={area} variant="secondary" className="font-mono">{area}</Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {ospfv3.interfaces.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Interfaces</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {ospfv3.interfaces.map((iface) => (
                <Badge key={iface} variant="outline" className="font-mono">{iface}</Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {ospfv3.redistribute.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Redistribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {ospfv3.redistribute.map((proto) => (
                <Badge key={proto} variant="secondary">{proto}</Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {ospfv3.raw_config && (
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
            <DialogTitle>OSPFv3 Raw Configuration — {vrf.name}</DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh]">
            <pre className="text-xs font-mono bg-muted p-4 rounded-lg overflow-x-auto">
              {JSON.stringify(ospfv3.raw_config, null, 2)}
            </pre>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}
