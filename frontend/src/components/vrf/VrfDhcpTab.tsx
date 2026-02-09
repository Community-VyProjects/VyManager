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
import { Code, Radio, Server } from "lucide-react";
import {
  VrfInstance,
  VrfCapabilities,
} from "@/lib/api/vrf";

interface VrfDhcpTabProps {
  vrf: VrfInstance;
  capabilities: VrfCapabilities;
  canWrite: boolean;
  onRefresh: () => void;
}

export function VrfDhcpTab({ vrf, capabilities, canWrite, onRefresh }: VrfDhcpTabProps) {
  const [rawConfigOpen, setRawConfigOpen] = useState(false);
  const dhcp = vrf.dhcp;

  if (!dhcp || !dhcp.configured) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <Server className="h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold mb-2">DHCP Server Not Configured</h3>
        <p className="text-sm text-muted-foreground text-center max-w-md">
          DHCP server is not configured in VRF {vrf.name}.
          This feature is available on VyOS 1.5+.
        </p>
      </div>
    );
  }

  const totalSubnets = dhcp.shared_networks.reduce(
    (sum, n) => sum + n.subnets.length,
    0
  );
  const totalRanges = dhcp.shared_networks.reduce(
    (sum, n) => sum + n.subnets.reduce((s, sub) => s + sub.ranges, 0),
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

      {/* Shared Networks */}
      {dhcp.shared_networks.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Shared Networks</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Name</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Subnets</TableHead>
                  <TableHead>Ranges</TableHead>
                  <TableHead>Static Mappings</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dhcp.shared_networks.map((net) => (
                  <TableRow key={net.name}>
                    <TableCell className="font-medium">{net.name}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {net.description || "—"}
                    </TableCell>
                    <TableCell>
                      <Badge variant={net.disabled ? "outline" : "secondary"} className="text-[10px]">
                        {net.disabled ? "disabled" : "active"}
                      </Badge>
                    </TableCell>
                    <TableCell>{net.subnets.length}</TableCell>
                    <TableCell>
                      {net.subnets.reduce((s, sub) => s + sub.ranges, 0)}
                    </TableCell>
                    <TableCell>
                      {net.subnets.reduce((s, sub) => s + sub.static_mappings, 0)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Subnets Detail */}
      {dhcp.shared_networks.some((n) => n.subnets.length > 0) && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Subnets</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Network</TableHead>
                  <TableHead>Prefix</TableHead>
                  <TableHead>Default Router</TableHead>
                  <TableHead>Ranges</TableHead>
                  <TableHead>Static Mappings</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dhcp.shared_networks.flatMap((net) =>
                  net.subnets.map((sub) => (
                    <TableRow key={`${net.name}-${sub.prefix}`}>
                      <TableCell className="text-sm text-muted-foreground">
                        {net.name}
                      </TableCell>
                      <TableCell className="font-mono font-medium">
                        {sub.prefix}
                      </TableCell>
                      <TableCell className="font-mono">
                        {sub.default_router || "—"}
                      </TableCell>
                      <TableCell>{sub.ranges}</TableCell>
                      <TableCell>{sub.static_mappings}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Raw Config */}
      {dhcp.raw_config && (
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
