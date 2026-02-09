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

interface VrfIsisTabProps {
  vrf: VrfInstance;
  capabilities: VrfCapabilities;
  canWrite: boolean;
  onRefresh: () => void;
}

export function VrfIsisTab({ vrf, capabilities, canWrite, onRefresh }: VrfIsisTabProps) {
  const [rawConfigOpen, setRawConfigOpen] = useState(false);
  const isis = vrf.isis;

  if (!isis || !isis.configured) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <Globe className="h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold mb-2">IS-IS Not Configured</h3>
        <p className="text-sm text-muted-foreground text-center max-w-md">
          IS-IS is not configured in VRF {vrf.name}. Configure it via the VyOS CLI
          or use the batch API to add IS-IS settings.
        </p>
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

      {isis.interfaces.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Interfaces</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {isis.interfaces.map((iface) => (
                <Badge key={iface} variant="outline" className="font-mono">{iface}</Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {(isis.redistribute_ipv4.length > 0 || isis.redistribute_ipv6.length > 0) && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Redistribution</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {isis.redistribute_ipv4.length > 0 && (
              <div>
                <p className="text-xs text-muted-foreground mb-1.5">IPv4</p>
                <div className="flex flex-wrap gap-2">
                  {isis.redistribute_ipv4.map((proto) => (
                    <Badge key={proto} variant="secondary">{proto}</Badge>
                  ))}
                </div>
              </div>
            )}
            {isis.redistribute_ipv6.length > 0 && (
              <div>
                <p className="text-xs text-muted-foreground mb-1.5">IPv6</p>
                <div className="flex flex-wrap gap-2">
                  {isis.redistribute_ipv6.map((proto) => (
                    <Badge key={proto} variant="secondary">{proto}</Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {isis.raw_config && (
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
