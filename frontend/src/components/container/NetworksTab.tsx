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
import { Network, Pencil, Plus, Trash2 } from "lucide-react";
import {
  containerService,
  type ContainerCapabilities,
  type ContainerConfig,
  type ContainerNetworkConfig,
} from "@/lib/api/container";
import { isProtectedStackNetwork } from "@/lib/appliance";
import { useSessionStore } from "@/store/session-store";
import { NetworkModal } from "./NetworkModal";
import { DeleteNetworkModal } from "./DeleteNetworkModal";

interface Props {
  config: ContainerConfig;
  capabilities: ContainerCapabilities;
  hasWritePermission: boolean;
  /** A post-save reload is running; the config shown may be stale. */
  refreshing: boolean;
  onReload: () => Promise<void>;
}

export function NetworksTab({ config, capabilities, hasWritePermission, refreshing, onReload }: Props) {
  const t = useTranslations("containerResources");
  const tc = useTranslations("common");
  const appliance = useSessionStore((s) => s.appliance);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalKey, setModalKey] = useState(0);
  const [editingNetwork, setEditingNetwork] = useState<ContainerNetworkConfig | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletingNetwork, setDeletingNetwork] = useState<ContainerNetworkConfig | null>(null);

  const networks = config.networks;

  const openModal = (network: ContainerNetworkConfig | null) => {
    setEditingNetwork(network);
    setModalKey((k) => k + 1);
    setModalOpen(true);
  };

  const openDelete = (network: ContainerNetworkConfig) => {
    setDeletingNetwork(network);
    setDeleteOpen(true);
  };

  const handleSubmit = async (draft: ContainerNetworkConfig) => {
    await containerService.saveNetwork(editingNetwork, draft, capabilities.features);
    void onReload();
  };

  const handleDelete = async () => {
    if (!deletingNetwork || isProtectedStackNetwork(appliance, deletingNetwork.name)) return;
    await containerService.deleteNetwork(deletingNetwork.name);
    void onReload();
  };

  return (
    <>
      {networks.length > 0 && hasWritePermission && (
        <div className="flex justify-end mb-4">
          <Button size="sm" disabled={refreshing} onClick={() => openModal(null)}>
            <Plus className="h-4 w-4 mr-2" />{t("networks.addNetwork")}
          </Button>
        </div>
      )}

      {networks.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Network className="h-12 w-12 text-muted-foreground/30 mb-4" />
            <p className="text-sm text-muted-foreground mb-4">{t("networks.noNetworks")}</p>
            {hasWritePermission && (
              <Button size="sm" disabled={refreshing} onClick={() => openModal(null)}>
                <Plus className="h-4 w-4 mr-2" />{t("networks.addNetwork")}
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
                  <TableHead>{tc("name")}</TableHead>
                  {capabilities.features.network_type && <TableHead>{t("networks.type")}</TableHead>}
                  <TableHead>{t("networks.prefixes")}</TableHead>
                  {capabilities.features.network_gateway && <TableHead>{t("networks.gateways")}</TableHead>}
                  {capabilities.features.network_mtu && <TableHead>MTU</TableHead>}
                  <TableHead>{tc("description")}</TableHead>
                  {hasWritePermission && <TableHead className="text-right">{tc("actions")}</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {networks.map((net) => (
                  <TableRow key={net.name}>
                    <TableCell>
                      <Badge variant="outline" className="font-mono">{net.name}</Badge>
                    </TableCell>
                    {capabilities.features.network_type && (
                      <TableCell>
                        {net.network_type
                          ? <Badge variant="secondary" className="font-mono text-xs">{net.network_type}</Badge>
                          : <span className="text-muted-foreground">—</span>}
                      </TableCell>
                    )}
                    <TableCell>
                      {net.prefixes.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {net.prefixes.map((p) => (
                            <Badge key={p} variant="secondary" className="font-mono text-xs">{p}</Badge>
                          ))}
                        </div>
                      ) : <span className="text-muted-foreground">—</span>}
                    </TableCell>
                    {capabilities.features.network_gateway && (
                      <TableCell>
                        {net.gateways.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {net.gateways.map((g) => (
                              <span key={g} className="font-mono text-xs">{g}</span>
                            ))}
                          </div>
                        ) : <span className="text-muted-foreground">—</span>}
                      </TableCell>
                    )}
                    {capabilities.features.network_mtu && (
                      <TableCell>
                        {net.mtu
                          ? <span className="font-mono text-sm">{net.mtu}</span>
                          : <span className="text-muted-foreground">—</span>}
                      </TableCell>
                    )}
                    <TableCell>
                      {net.description
                        ? <span className="text-sm">{net.description}</span>
                        : <span className="text-muted-foreground">—</span>}
                    </TableCell>
                    {hasWritePermission && (
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          {!isProtectedStackNetwork(appliance, net.name) && (
                            <>
                              <Button variant="ghost" size="icon" className="h-8 w-8" title={tc("edit")} aria-label={tc("edit")} disabled={refreshing} onClick={() => openModal(net)}>
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" title={tc("delete")} aria-label={tc("delete")} disabled={refreshing} onClick={() => openDelete(net)}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </>
                          )}
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
        key={modalKey}
        open={modalOpen}
        onOpenChange={setModalOpen}
        network={editingNetwork}
        capabilities={capabilities}
        existingNames={networks.map((n) => n.name)}
        onSubmit={handleSubmit}
      />

      <DeleteNetworkModal
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        network={deletingNetwork}
        onConfirm={handleDelete}
      />
    </>
  );
}
