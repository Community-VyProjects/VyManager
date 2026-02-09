"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Activity } from "lucide-react";
import {
  VrfInstance,
  VrfCapabilities,
  VrfFailoverRoute,
} from "@/lib/api/vrf";

interface VrfFailoverTabProps {
  vrf: VrfInstance;
  capabilities: VrfCapabilities;
  canWrite: boolean;
  onRefresh: () => void;
}

export function VrfFailoverTab({ vrf, capabilities, canWrite, onRefresh }: VrfFailoverTabProps) {
  const failover = vrf.failover;

  if (!failover || failover.routes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <Activity className="h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold mb-2">Failover Not Configured</h3>
        <p className="text-sm text-muted-foreground text-center max-w-md">
          Failover routes are not configured in VRF {vrf.name}.
          Configure them via the VyOS CLI or use the batch API.
        </p>
      </div>
    );
  }

  const getTargets = (route: VrfFailoverRoute): string => {
    const parts: string[] = [];
    for (const nh of route.next_hops) {
      let s = nh.address;
      if (nh.interface) s += ` via ${nh.interface}`;
      if (nh.check?.type) s += ` (${nh.check.type})`;
      parts.push(s);
    }
    for (const di of route.dhcp_interfaces) {
      let s = `dhcp:${di.name}`;
      if (di.check?.type) s += ` (${di.check.type})`;
      parts.push(s);
    }
    return parts.join("; ") || "—";
  };

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="border-0 shadow-none bg-muted/50">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground mb-1">Failover Routes</p>
            <p className="text-lg font-semibold">{failover.routes.length}</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-none bg-muted/50">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground mb-1">Total Next-hops</p>
            <p className="text-lg font-semibold">
              {failover.routes.reduce((sum, r) => sum + r.next_hops.length, 0)}
            </p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-none bg-muted/50">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground mb-1">DHCP Interfaces</p>
            <p className="text-lg font-semibold">
              {failover.routes.reduce((sum, r) => sum + r.dhcp_interfaces.length, 0)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Routes Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Failover Routes</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Destination</TableHead>
                <TableHead>Next-hops</TableHead>
                <TableHead>DHCP Interfaces</TableHead>
                <TableHead>Targets</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {failover.routes.map((route) => (
                <TableRow key={route.destination}>
                  <TableCell className="font-mono font-medium">
                    {route.destination}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="text-[10px]">
                      {route.next_hops.length}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-[10px]">
                      {route.dhcp_interfaces.length}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm font-mono max-w-[400px] truncate">
                    {getTargets(route)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
