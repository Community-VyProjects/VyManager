"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
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
  type ContainerCapabilities,
  type ContainerConfig,
  type ContainerRegistry,
} from "@/lib/api/container";
import { RegistryModal } from "./RegistryModal";
import { DeleteRegistryModal } from "./DeleteRegistryModal";

interface Props {
  config: ContainerConfig;
  capabilities: ContainerCapabilities;
  hasWritePermission: boolean;
  /** A post-save reload is running; the config shown may be stale. */
  refreshing: boolean;
  onReload: () => Promise<void>;
}

export function RegistriesTab({ config, capabilities, hasWritePermission, refreshing, onReload }: Props) {
  const t = useTranslations("containerResources");
  const tc = useTranslations("common");
  const [modalOpen, setModalOpen] = useState(false);
  const [modalKey, setModalKey] = useState(0);
  const [editingRegistry, setEditingRegistry] = useState<ContainerRegistry | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletingRegistry, setDeletingRegistry] = useState<ContainerRegistry | null>(null);

  const registries = config.registries;
  const { features } = capabilities;

  const openModal = (registry: ContainerRegistry | null) => {
    setEditingRegistry(registry);
    setModalKey((k) => k + 1);
    setModalOpen(true);
  };

  const openDelete = (registry: ContainerRegistry) => {
    setDeletingRegistry(registry);
    setDeleteOpen(true);
  };

  const handleSubmit = async (draft: ContainerRegistry) => {
    await containerService.saveRegistry(editingRegistry, draft, features);
    void onReload();
  };

  const handleDelete = async () => {
    if (!deletingRegistry) return;
    await containerService.deleteRegistry(deletingRegistry.name);
    void onReload();
  };

  return (
    <>
      {registries.length > 0 && hasWritePermission && (
        <div className="flex justify-end mb-4">
          <Button size="sm" disabled={refreshing} onClick={() => openModal(null)}>
            <Plus className="h-4 w-4 mr-2" />{t("registries.addRegistry")}
          </Button>
        </div>
      )}

      {registries.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Database className="h-12 w-12 text-muted-foreground/30 mb-4" />
            <p className="text-sm text-muted-foreground mb-4">{t("registries.noRegistries")}</p>
            {hasWritePermission && (
              <Button size="sm" disabled={refreshing} onClick={() => openModal(null)}>
                <Plus className="h-4 w-4 mr-2" />{t("registries.addRegistry")}
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
                  <TableHead>{t("registries.registry")}</TableHead>
                  <TableHead>{tc("status")}</TableHead>
                  {features.registry_insecure && <TableHead>{t("registries.insecure")}</TableHead>}
                  <TableHead>{t("registries.auth")}</TableHead>
                  {features.registry_mirror && <TableHead>{t("registries.mirror")}</TableHead>}
                  {hasWritePermission && <TableHead className="text-right">{tc("actions")}</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {registries.map((reg) => (
                  <TableRow key={reg.name}>
                    <TableCell>
                      <Badge variant="outline" className="font-mono">{reg.name}</Badge>
                    </TableCell>
                    <TableCell>
                      {reg.disabled
                        ? <Badge variant="secondary" className="bg-muted text-muted-foreground">{tc("disabled")}</Badge>
                        : <Badge variant="secondary" className="bg-green-500/10 text-green-600">{tc("enabled")}</Badge>}
                    </TableCell>
                    {features.registry_insecure && (
                      <TableCell>
                        {reg.insecure
                          ? <Badge variant="secondary" className="bg-amber-500/10 text-amber-600">{t("registries.insecure")}</Badge>
                          : <span className="text-muted-foreground">—</span>}
                      </TableCell>
                    )}
                    <TableCell>
                      {reg.authentication?.username
                        ? <span className="flex items-center gap-1 text-sm"><CheckCircle2 className="h-4 w-4 text-green-500" /><span className="font-mono text-xs">{reg.authentication.username}</span></span>
                        : <span className="text-muted-foreground">—</span>}
                    </TableCell>
                    {features.registry_mirror && (
                      <TableCell>
                        {reg.mirror?.address || reg.mirror?.host_name
                          ? <span className="font-mono text-xs">{reg.mirror.address || reg.mirror.host_name}</span>
                          : <span className="text-muted-foreground">—</span>}
                      </TableCell>
                    )}
                    {hasWritePermission && (
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8" title={tc("edit")} aria-label={tc("edit")} disabled={refreshing} onClick={() => openModal(reg)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" title={tc("delete")} aria-label={tc("delete")} disabled={refreshing} onClick={() => openDelete(reg)}>
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
        key={modalKey}
        open={modalOpen}
        onOpenChange={setModalOpen}
        registry={editingRegistry}
        capabilities={capabilities}
        existingNames={registries.map((r) => r.name)}
        onSubmit={handleSubmit}
      />

      <DeleteRegistryModal
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        registry={deletingRegistry}
        onConfirm={handleDelete}
      />
    </>
  );
}
