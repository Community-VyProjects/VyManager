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
import {
  ArrowRight,
  Box,
  Download,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  RotateCw,
  ScrollText,
  Trash2,
} from "lucide-react";
import {
  containerService,
  type ContainerInstance,
  type ContainerConfig,
  type ContainerCapabilities,
} from "@/lib/api/container";
import { ContainerModal } from "./ContainerModal";
import { DeleteContainerModal } from "./DeleteContainerModal";
import { SshOutputModal } from "./SshOutputModal";

interface Props {
  config: ContainerConfig;
  capabilities: ContainerCapabilities | null;
  hasWritePermission: boolean;
  onReload: () => Promise<void>;
}

interface SshState {
  open: boolean;
  title: string;
  loading: boolean;
  success: boolean | null;
  output?: string | null;
  error?: string | null;
}

export function ContainersTab({ config, capabilities, hasWritePermission, onReload }: Props) {
  const [modalOpen, setModalOpen] = useState(false);
  const [editingContainer, setEditingContainer] = useState<ContainerInstance | null>(null);
  const [deletingContainer, setDeletingContainer] = useState<ContainerInstance | null>(null);
  const [ssh, setSsh] = useState<SshState>({ open: false, title: "", loading: false, success: null });

  const containers = config.containers;
  const [pulledImages, setPulledImages] = useState<string[]>([]);
  const [imagesLoading, setImagesLoading] = useState(false);

  const openModal = async (container: ContainerInstance | null) => {
    setEditingContainer(container);
    setModalOpen(true);
    setImagesLoading(true);
    try {
      const imgs = await containerService.getImages();
      setPulledImages(imgs);
    } catch {
      setPulledImages([]);
    } finally {
      setImagesLoading(false);
    }
  };

  const handleSubmit = async (data: ContainerInstance) => {
    if (editingContainer) {
      await containerService.updateContainer(editingContainer, data);
    } else {
      await containerService.createContainer(data);
    }
    await onReload();
  };

  const handleDelete = async () => {
    if (!deletingContainer) return;
    await containerService.deleteContainer(deletingContainer.name);
    // Best-effort: clean up the container directory tree after a successful commit
    try {
      await containerService.removeContainerDir(`/config/containers/${deletingContainer.name}`);
    } catch { /* ignore — VyOS config is already saved */ }
    setDeletingContainer(null);
    await onReload();
  };

  const runSsh = async (title: string, fn: () => Promise<{ success: boolean; output?: string | null; error?: string | null }>) => {
    setSsh({ open: true, title, loading: true, success: null });
    try {
      const result = await fn();
      setSsh({ open: true, title, loading: false, success: result.success, output: result.output, error: result.error });
    } catch (err: unknown) {
      setSsh({ open: true, title, loading: false, success: false, error: err instanceof Error ? err.message : "Command failed" });
    }
  };

  return (
    <>
      {containers.length > 0 && hasWritePermission && (
        <div className="flex justify-end mb-4">
          <Button size="sm" onClick={() => openModal(null)}>
            <Plus className="h-4 w-4 mr-2" />Add Container
          </Button>
        </div>
      )}

      {containers.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Box className="h-12 w-12 text-muted-foreground/30 mb-4" />
            <p className="text-sm text-muted-foreground mb-4">No containers configured</p>
            {hasWritePermission && (
              <Button size="sm" onClick={() => openModal(null)}>
                <Plus className="h-4 w-4 mr-2" />Add Container
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
                  <TableHead>Image</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Networks</TableHead>
                  <TableHead>Ports</TableHead>
                  {hasWritePermission && <TableHead className="text-right">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {containers.map(c => (
                  <TableRow key={c.name}>
                    <TableCell>
                      <Badge variant="outline" className="font-mono">{c.name}</Badge>
                    </TableCell>
                    <TableCell>
                      {c.image
                        ? <span className="font-mono text-xs">{c.image}</span>
                        : <span className="text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell>
                      {c.disabled
                        ? <Badge variant="secondary" className="bg-muted text-muted-foreground">Disabled</Badge>
                        : <Badge variant="secondary" className="bg-green-500/10 text-green-600">Active</Badge>}
                    </TableCell>
                    <TableCell>
                      {c.networks.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {c.networks.slice(0, 2).map(n => (
                            <Badge key={n.name} variant="secondary" className="font-mono text-xs">{n.name}</Badge>
                          ))}
                          {c.networks.length > 2 && (
                            <Badge variant="outline" className="text-xs text-muted-foreground">+{c.networks.length - 2}</Badge>
                          )}
                        </div>
                      ) : <span className="text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell>
                      {c.ports.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          <span className="font-mono text-xs flex items-center gap-1">
                            {c.ports[0].source}
                            <ArrowRight className="h-3 w-3 text-muted-foreground shrink-0" />
                            {c.ports[0].destination}{c.ports[0].protocol ? `/${c.ports[0].protocol}` : ""}
                          </span>
                          {c.ports.length > 1 && (
                            <Badge variant="outline" className="text-xs text-muted-foreground">+{c.ports.length - 1}</Badge>
                          )}
                        </div>
                      ) : <span className="text-muted-foreground">—</span>}
                    </TableCell>
                    {hasWritePermission && (
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8" title="Edit" onClick={() => openModal(c)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8" title="Pull image" onClick={() => runSsh(`Pull Image — ${c.name}`, () => containerService.addImage(c.name))}>
                            <Download className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8" title="Update image" onClick={() => runSsh(`Update Image — ${c.name}`, () => containerService.updateImage(c.name))}>
                            <RefreshCw className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8" title="Restart" onClick={() => runSsh(`Restart Container — ${c.name}`, () => containerService.restartContainer(c.name))}>
                            <RotateCw className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8" title="View Logs" onClick={() => runSsh(`Logs — ${c.name}`, () => containerService.getContainerLog(c.name))}>
                            <ScrollText className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" title="Delete" onClick={() => setDeletingContainer(c)}>
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

      <ContainerModal
        open={modalOpen}
        onOpenChange={open => { setModalOpen(open); if (!open) setEditingContainer(null); }}
        container={editingContainer}
        capabilities={capabilities}
        availableNetworks={config.networks}
        availableImages={pulledImages}
        imagesLoading={imagesLoading}
        onSubmit={handleSubmit}
      />

      <DeleteContainerModal
        open={!!deletingContainer}
        onOpenChange={open => { if (!open) setDeletingContainer(null); }}
        container={deletingContainer}
        onConfirm={handleDelete}
      />

      <SshOutputModal
        open={ssh.open}
        onOpenChange={open => { if (!open) setSsh(s => ({ ...s, open: false })); }}
        title={ssh.title}
        loading={ssh.loading}
        success={ssh.success}
        output={ssh.output}
        error={ssh.error}
      />

      {ssh.loading && (
        <div className="fixed bottom-4 right-4 flex items-center gap-2 rounded-lg bg-background border shadow-lg px-4 py-2 text-sm z-50">
          <Loader2 className="h-4 w-4 animate-spin" />
          {ssh.title}…
        </div>
      )}
    </>
  );
}
