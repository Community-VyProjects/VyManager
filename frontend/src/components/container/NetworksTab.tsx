"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { Network, Pencil, Plus, Trash2 } from "lucide-react";
import {
  containerService,
  type ContainerNetworkConfig,
  type ContainerConfig,
  type ContainerCapabilities,
} from "@/lib/api/container";
import { NetworkModal } from "./NetworkModal";
import { DeleteNetworkModal } from "./DeleteNetworkModal";

interface Props {
  config: ContainerConfig;
  capabilities: ContainerCapabilities | null;
  hasWritePermission: boolean;
  onReload: () => Promise<void>;
}

export function NetworksTab({ config, capabilities, hasWritePermission, onReload }: Props) {
  const [modalOpen, setModalOpen] = useState(false);
  const [editingNetwork, setEditingNetwork] = useState<ContainerNetworkConfig | null>(null);
  const [deletingNetwork, setDeletingNetwork] = useState<ContainerNetworkConfig | null>(null);

  const networks = config.networks;

  const handleSubmit = async (data: ContainerNetworkConfig) => {
    if (editingNetwork) {
      await containerService.updateNetwork(editingNetwork, data);
    } else {
      await containerService.createNetwork(data);
    }
    await onReload();
  };

  const handleDelete = async () => {
    if (!deletingNetwork) return;
    await containerService.deleteNetwork(deletingNetwork.name);
    setDeletingNetwork(null);
    await onReload();
  };

  return (
    <>
      {networks.length > 0 && hasWritePermission && (
        <div className="flex justify-end mb-4">
          <Button size="sm" onClick={() => { setEditingNetwork(null); setModalOpen(true); }}>
            <Plus className="h-4 w-4 mr-2" />Add Network
          </Button>
        </div>
      )}

      {networks.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Network className="h-12 w-12 text-muted-foreground/30 mb-4" />
            <p className="text-sm text-muted-foreground mb-4">No container networks configured</p>
            {hasWritePermission && (
              <Button size="sm" onClick={() => { setEditingNetwork(null); setModalOpen(true); }}>
                <Plus className="h-4 w-4 mr-2" />Add Network
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <ScrollArea>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Prefixes</TableHead>
                  <TableHead>Gateways</TableHead>
                  <TableHead>MTU</TableHead>
                  <TableHead>Description</TableHead>
                  {hasWritePermission && <TableHead className="text-right">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {networks.map(net => (
                  <TableRow key={net.name}>
                    <TableCell>
                      <Badge variant="outline" className="font-mono">{net.name}</Badge>
                    </TableCell>
                    <TableCell>
                      {net.network_type
                        ? <Badge variant="secondary" className="font-mono text-xs">{net.network_type}</Badge>
                        : <span className="text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell>
                      {net.prefixes.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {net.prefixes.slice(0, 2).map(p => (
                            <Badge key={p} variant="secondary" className="font-mono text-xs">{p}</Badge>
                          ))}
                          {net.prefixes.length > 2 && (
                            <Badge variant="outline" className="text-xs text-muted-foreground">+{net.prefixes.length - 2}</Badge>
                          )}
                        </div>
                      ) : <span className="text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell>
                      {net.gateways.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {net.gateways.slice(0, 2).map(g => (
                            <span key={g} className="font-mono text-xs">{g}</span>
                          ))}
                          {net.gateways.length > 2 && (
                            <Badge variant="outline" className="text-xs text-muted-foreground">+{net.gateways.length - 2}</Badge>
                          )}
                        </div>
                      ) : <span className="text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell>
                      {net.mtu
                        ? <span className="font-mono text-sm">{net.mtu}</span>
                        : <span className="text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell>
                      {net.description
                        ? <span className="text-sm">{net.description}</span>
                        : <span className="text-muted-foreground">—</span>}
                    </TableCell>
                    {hasWritePermission && (
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditingNetwork(net); setModalOpen(true); }}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setDeletingNetwork(net)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        </Card>
      )}

      <NetworkModal
        open={modalOpen}
        onOpenChange={open => { setModalOpen(open); if (!open) setEditingNetwork(null); }}
        network={editingNetwork}
        capabilities={capabilities}
        onSubmit={handleSubmit}
      />

      <DeleteNetworkModal
        open={!!deletingNetwork}
        onOpenChange={open => { if (!open) setDeletingNetwork(null); }}
        network={deletingNetwork}
        onConfirm={handleDelete}
      />
    </>
  );
}
