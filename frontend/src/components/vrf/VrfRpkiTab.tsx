"use client";

import { useState } from "react";
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
import { Shield } from "lucide-react";
import {
  VrfInstance,
  VrfCapabilities,
} from "@/lib/api/vrf";

interface VrfRpkiTabProps {
  vrf: VrfInstance;
  capabilities: VrfCapabilities;
  canWrite: boolean;
  onRefresh: () => void;
}

export function VrfRpkiTab({ vrf, capabilities, canWrite, onRefresh }: VrfRpkiTabProps) {
  const rpki = vrf.rpki;

  if (!rpki || rpki.caches.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <Shield className="h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold mb-2">RPKI Not Configured</h3>
        <p className="text-sm text-muted-foreground text-center max-w-md">
          RPKI (Resource Public Key Infrastructure) is not configured in VRF {vrf.name}.
          Configure it via the VyOS CLI or use the batch API.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4">
        <Card className="border-0 shadow-none bg-muted/50">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground mb-1">Caches</p>
            <p className="text-lg font-semibold">{rpki.caches.length}</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-none bg-muted/50">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground mb-1">Expire Interval</p>
            <p className="text-sm font-mono">{rpki.expire_interval ?? "default"}</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-none bg-muted/50">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground mb-1">Polling Period</p>
            <p className="text-sm font-mono">{rpki.polling_period ?? "default"}</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-none bg-muted/50">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground mb-1">Retry Interval</p>
            <p className="text-sm font-mono">{rpki.retry_interval ?? "default"}</p>
          </CardContent>
        </Card>
      </div>

      {/* Caches Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">RPKI Caches</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Name</TableHead>
                <TableHead>Port</TableHead>
                <TableHead>Preference</TableHead>
                <TableHead>Source Address</TableHead>
                <TableHead>SSH</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rpki.caches.map((cache) => (
                <TableRow key={cache.name}>
                  <TableCell className="font-mono font-medium">{cache.name}</TableCell>
                  <TableCell className="font-mono">{cache.port ?? "—"}</TableCell>
                  <TableCell>{cache.preference ?? "—"}</TableCell>
                  <TableCell className="font-mono">{cache.source_address ?? "—"}</TableCell>
                  <TableCell>
                    {cache.ssh ? (
                      <Badge variant="secondary" className="text-[10px]">
                        {cache.ssh.username || "configured"}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
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
