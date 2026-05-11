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
import { CheckCircle2, Database, Pencil, Plus, Trash2 } from "lucide-react";
import {
  containerService,
  type ContainerRegistry,
  type ContainerConfig,
  type ContainerCapabilities,
} from "@/lib/api/container";
import { RegistryModal } from "./RegistryModal";
import { DeleteRegistryModal } from "./DeleteRegistryModal";

interface Props {
  config: ContainerConfig;
  capabilities: ContainerCapabilities | null;
  hasWritePermission: boolean;
  onReload: () => Promise<void>;
}

export function RegistriesTab({ config, capabilities, hasWritePermission, onReload }: Props) {
  const [modalOpen, setModalOpen] = useState(false);
  const [editingRegistry, setEditingRegistry] = useState<ContainerRegistry | null>(null);
  const [deletingRegistry, setDeletingRegistry] = useState<ContainerRegistry | null>(null);

  const registries = config.registries;

  const handleSubmit = async (data: ContainerRegistry) => {
    if (editingRegistry) {
      await containerService.updateRegistry(editingRegistry, data);
    } else {
      await containerService.createRegistry(data);
    }
    await onReload();
  };

  const handleDelete = async () => {
    if (!deletingRegistry) return;
    await containerService.deleteRegistry(deletingRegistry.name);
    setDeletingRegistry(null);
    await onReload();
  };

  return (
    <>
      {registries.length > 0 && hasWritePermission && (
        <div className="flex justify-end mb-4">
          <Button size="sm" onClick={() => { setEditingRegistry(null); setModalOpen(true); }}>
            <Plus className="h-4 w-4 mr-2" />Add Registry
          </Button>
        </div>
      )}

      {registries.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Database className="h-12 w-12 text-muted-foreground/30 mb-4" />
            <p className="text-sm text-muted-foreground mb-4">No registries configured</p>
            {hasWritePermission && (
              <Button size="sm" onClick={() => { setEditingRegistry(null); setModalOpen(true); }}>
                <Plus className="h-4 w-4 mr-2" />Add Registry
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
                  <TableHead>Registry</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Insecure</TableHead>
                  <TableHead>Auth</TableHead>
                  <TableHead>Mirror</TableHead>
                  {hasWritePermission && <TableHead className="text-right">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {registries.map(reg => (
                  <TableRow key={reg.name}>
                    <TableCell>
                      <Badge variant="outline" className="font-mono">{reg.name}</Badge>
                    </TableCell>
                    <TableCell>
                      {reg.disabled
                        ? <Badge variant="secondary" className="bg-muted text-muted-foreground">Disabled</Badge>
                        : <Badge variant="secondary" className="bg-green-500/10 text-green-600">Enabled</Badge>}
                    </TableCell>
                    <TableCell>
                      {reg.insecure
                        ? <Badge variant="secondary" className="bg-amber-500/10 text-amber-600">Insecure</Badge>
                        : <span className="text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell>
                      {reg.authentication?.username
                        ? <span className="flex items-center gap-1 text-sm"><CheckCircle2 className="h-4 w-4 text-green-500" /><span className="font-mono text-xs">{reg.authentication.username}</span></span>
                        : <span className="text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell>
                      {reg.mirror?.address || reg.mirror?.host_name
                        ? <span className="font-mono text-xs">{reg.mirror.address || reg.mirror.host_name}</span>
                        : <span className="text-muted-foreground">—</span>}
                    </TableCell>
                    {hasWritePermission && (
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditingRegistry(reg); setModalOpen(true); }}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setDeletingRegistry(reg)}>
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

      <RegistryModal
        open={modalOpen}
        onOpenChange={open => { setModalOpen(open); if (!open) setEditingRegistry(null); }}
        registry={editingRegistry}
        capabilities={capabilities}
        onSubmit={handleSubmit}
      />

      <DeleteRegistryModal
        open={!!deletingRegistry}
        onOpenChange={open => { if (!open) setDeletingRegistry(null); }}
        registry={deletingRegistry}
        onConfirm={handleDelete}
      />
    </>
  );
}
