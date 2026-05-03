"use client";

import { useState, useEffect, useCallback } from "react";
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
import {
  GitBranch,
  FolderTree,
  Network,
  Tag,
  Gauge,
  Plus,
  RefreshCw,
  Pencil,
  Trash2,
  AlertCircle,
} from "lucide-react";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import {
  trafficEngineeringService,
  TrafficEngineeringConfig,
  TrafficEngineeringCapabilities,
  AdminGroup,
  TeInterface,
} from "@/lib/api/traffic-engineering";
import { AdminGroupModal } from "./AdminGroupModal";
import { DeleteAdminGroupModal } from "./DeleteAdminGroupModal";
import { TeInterfaceModal } from "./TeInterfaceModal";
import { DeleteTeInterfaceModal } from "./DeleteTeInterfaceModal";
import { usePermissions } from "@/hooks/usePermissions";
import { FeatureGroup } from "@/lib/api/user-management";

export function TrafficEngineeringContent() {
  const { canWrite } = usePermissions();
  const hasWritePermission = canWrite(FeatureGroup.TRAFFIC_ENGINEERING);

  const [config, setConfig] = useState<TrafficEngineeringConfig | null>(null);
  const [, setCapabilities] = useState<TrafficEngineeringCapabilities | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"admin-groups" | "interfaces">("admin-groups");

  // Admin group modals
  const [agModalOpen, setAgModalOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<AdminGroup | null>(null);
  const [deletingGroup, setDeletingGroup] = useState<string | null>(null);

  // Interface modals
  const [ifaceModalOpen, setIfaceModalOpen] = useState(false);
  const [editingIface, setEditingIface] = useState<TeInterface | null>(null);
  const [deletingIface, setDeletingIface] = useState<string | null>(null);

  const loadData = useCallback(async (refresh = false) => {
    try {
      setLoading(true);
      setError(null);
      const [configData, capData] = await Promise.all([
        trafficEngineeringService.getConfig(refresh),
        trafficEngineeringService.getCapabilities(),
      ]);
      setConfig(configData);
      setCapabilities(capData);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load Traffic Engineering configuration"
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Stats
  const adminGroupCount = config?.admin_groups.length ?? 0;
  const interfaceCount = config?.interfaces.length ?? 0;
  const ifacesWithGroups = config?.interfaces.filter((i) => i.admin_groups.length > 0).length ?? 0;
  const ifacesWithMetric = config?.interfaces.filter((i) => i.metric != null).length ?? 0;

  // Admin group handlers
  const handleCreateGroup = async (group: AdminGroup) => {
    await trafficEngineeringService.createAdminGroup(group.name, group.bit_position);
    await loadData(true);
  };

  const handleUpdateGroup = async (group: AdminGroup) => {
    await trafficEngineeringService.updateAdminGroup(
      editingGroup!.name,
      group.name,
      group.bit_position
    );
    setEditingGroup(null);
    await loadData(true);
  };

  const handleDeleteGroup = async () => {
    await trafficEngineeringService.deleteAdminGroup(deletingGroup!);
    setDeletingGroup(null);
    await loadData(true);
  };

  // Interface handlers
  const handleCreateIface = async (iface: TeInterface) => {
    await trafficEngineeringService.createInterface(iface);
    await loadData(true);
  };

  const handleUpdateIface = async (iface: TeInterface) => {
    await trafficEngineeringService.updateInterface(editingIface!.name, iface);
    setEditingIface(null);
    await loadData(true);
  };

  const handleDeleteIface = async () => {
    await trafficEngineeringService.deleteInterface(deletingIface!);
    setDeletingIface(null);
    await loadData(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <LoadingSpinner />
      </div>
    );
  }

  if (error && !config) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <p className="text-destructive">{error}</p>
        <Button variant="outline" onClick={() => loadData()}>
          Retry
        </Button>
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="p-6 pb-4 border-b border-border">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="flex items-center gap-2">
                <GitBranch className="h-6 w-6 text-primary" />
                <h1 className="text-2xl font-bold text-foreground">Traffic Engineering</h1>
                {!hasWritePermission && (
                  <Badge variant="secondary" className="text-xs">
                    Read Only
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                MPLS-TE link parameter configuration
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={() => loadData(true)}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>

          {error && (
            <div className="mb-4 flex items-start gap-2 rounded-md bg-destructive/10 p-3">
              <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          {/* Stats */}
          <div className="grid grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-md p-2 bg-primary/10">
                    <FolderTree className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{adminGroupCount}</p>
                    <p className="text-xs text-muted-foreground">Admin Groups</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-md p-2 bg-blue-500/10">
                    <Network className="h-4 w-4 text-blue-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{interfaceCount}</p>
                    <p className="text-xs text-muted-foreground">Configured Interfaces</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-md p-2 bg-green-500/10">
                    <Tag className="h-4 w-4 text-green-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{ifacesWithGroups}</p>
                    <p className="text-xs text-muted-foreground">With Admin Groups</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-md p-2 bg-orange-500/10">
                    <Gauge className="h-4 w-4 text-orange-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{ifacesWithMetric}</p>
                    <p className="text-xs text-muted-foreground">Custom Metrics</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border px-6">
          <button
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "admin-groups"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
            onClick={() => setActiveTab("admin-groups")}
          >
            Admin Groups
          </button>
          <button
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "interfaces"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
            onClick={() => setActiveTab("interfaces")}
          >
            Interfaces
          </button>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-auto p-6">
          {activeTab === "admin-groups" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  Define admin groups to classify TE links by administrative category.
                </p>
                {hasWritePermission && (
                  <Button
                    size="sm"
                    onClick={() => {
                      setEditingGroup(null);
                      setAgModalOpen(true);
                    }}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Admin Group
                  </Button>
                )}
              </div>

              {adminGroupCount === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                  <FolderTree className="h-12 w-12 mb-4 opacity-50" />
                  <p className="text-lg font-medium">No admin groups configured</p>
                  <p className="text-sm mt-1">
                    Add an admin group to classify TE links
                  </p>
                  {hasWritePermission && (
                    <Button
                      className="mt-4"
                      onClick={() => {
                        setEditingGroup(null);
                        setAgModalOpen(true);
                      }}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Admin Group
                    </Button>
                  )}
                </div>
              ) : (
                <Card>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Bit Position</TableHead>
                        {hasWritePermission && <TableHead className="w-20" />}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {config?.admin_groups.map((group) => (
                        <TableRow key={group.name}>
                          <TableCell className="font-mono">{group.name}</TableCell>
                          <TableCell>
                            {group.bit_position != null ? group.bit_position : "—"}
                          </TableCell>
                          {hasWritePermission && (
                            <TableCell>
                              <div className="flex gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7"
                                  onClick={() => {
                                    setEditingGroup(group);
                                    setAgModalOpen(true);
                                  }}
                                >
                                  <Pencil className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-destructive hover:text-destructive"
                                  onClick={() => setDeletingGroup(group.name)}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </TableCell>
                          )}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </Card>
              )}
            </div>
          )}

          {activeTab === "interfaces" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  Configure Traffic Engineering parameters per interface.
                </p>
                {hasWritePermission && (
                  <Button
                    size="sm"
                    onClick={() => {
                      setEditingIface(null);
                      setIfaceModalOpen(true);
                    }}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Interface
                  </Button>
                )}
              </div>

              {interfaceCount === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                  <Network className="h-12 w-12 mb-4 opacity-50" />
                  <p className="text-lg font-medium">No interfaces configured</p>
                  <p className="text-sm mt-1">
                    Add an interface to configure TE parameters
                  </p>
                  {hasWritePermission && (
                    <Button
                      className="mt-4"
                      onClick={() => {
                        setEditingIface(null);
                        setIfaceModalOpen(true);
                      }}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Interface
                    </Button>
                  )}
                </div>
              ) : (
                <Card>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Interface</TableHead>
                        <TableHead>Admin Groups</TableHead>
                        <TableHead>Max BW (Mbps)</TableHead>
                        <TableHead>Max Reserv. BW (Mbps)</TableHead>
                        <TableHead>Metric</TableHead>
                        {hasWritePermission && <TableHead className="w-20" />}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {config?.interfaces.map((iface) => (
                        <TableRow key={iface.name}>
                          <TableCell className="font-mono">{iface.name}</TableCell>
                          <TableCell>
                            {iface.admin_groups.length > 0 ? (
                              <div className="flex flex-wrap gap-1">
                                {iface.admin_groups.map((g) => (
                                  <Badge key={g} variant="secondary" className="font-mono text-xs">
                                    {g}
                                  </Badge>
                                ))}
                              </div>
                            ) : (
                              "—"
                            )}
                          </TableCell>
                          <TableCell>{iface.max_bandwidth ?? "—"}</TableCell>
                          <TableCell>{iface.max_reservable_bandwidth ?? "—"}</TableCell>
                          <TableCell>{iface.metric ?? "—"}</TableCell>
                          {hasWritePermission && (
                            <TableCell>
                              <div className="flex gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7"
                                  onClick={() => {
                                    setEditingIface(iface);
                                    setIfaceModalOpen(true);
                                  }}
                                >
                                  <Pencil className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-destructive hover:text-destructive"
                                  onClick={() => setDeletingIface(iface.name)}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </TableCell>
                          )}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </Card>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Admin Group Modals */}
      <AdminGroupModal
        open={agModalOpen}
        onOpenChange={(open) => {
          setAgModalOpen(open);
          if (!open) setEditingGroup(null);
        }}
        onSubmit={editingGroup ? handleUpdateGroup : handleCreateGroup}
        existingGroup={editingGroup}
      />

      <DeleteAdminGroupModal
        open={deletingGroup !== null}
        onOpenChange={(open) => {
          if (!open) setDeletingGroup(null);
        }}
        groupName={deletingGroup ?? ""}
        onConfirm={handleDeleteGroup}
      />

      {/* Interface Modals */}
      <TeInterfaceModal
        open={ifaceModalOpen}
        onOpenChange={(open) => {
          setIfaceModalOpen(open);
          if (!open) setEditingIface(null);
        }}
        onSubmit={editingIface ? handleUpdateIface : handleCreateIface}
        existingInterface={editingIface}
        adminGroups={config?.admin_groups ?? []}
      />

      <DeleteTeInterfaceModal
        open={deletingIface !== null}
        onOpenChange={(open) => {
          if (!open) setDeletingIface(null);
        }}
        interfaceName={deletingIface ?? ""}
        onConfirm={handleDeleteIface}
      />
    </>
  );
}
