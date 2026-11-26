"use client";

import { useState, useEffect, useCallback } from "react";
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
import type { ApiError } from "@/lib/types/api";
import {
  trafficEngineeringService,
  type TrafficEngineeringConfig,
  type TrafficEngineeringCapabilities,
  type AdminGroup,
  type TeInterface,
} from "@/lib/api/traffic-engineering";
import type { AdminGroupFields, TeInterfaceFields } from "@/lib/api/traffic-engineering-save-ops";
import { AdminGroupModal } from "./AdminGroupModal";
import { TeInterfaceModal } from "./TeInterfaceModal";
import { DeleteTeItemModal, type TeDeleteKind } from "./DeleteTeItemModal";
import { usePermissions } from "@/hooks/usePermissions";
import { FeatureGroup } from "@/lib/api/user-management";

export function TrafficEngineeringContent() {
  const t = useTranslations("trafficEngineering");
  const tc = useTranslations("common");
  const { canWrite } = usePermissions();
  const hasWritePermission = canWrite(FeatureGroup.TRAFFIC_ENGINEERING);

  const [config, setConfig] = useState<TrafficEngineeringConfig | null>(null);
  const [capabilities, setCapabilities] = useState<TrafficEngineeringCapabilities | null>(null);
  const [loading, setLoading] = useState(true);
  // A re-read after a save; the page stays mounted and every write control waits.
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"admin-groups" | "interfaces">("admin-groups");

  // Modal state. The subject stays set after close so the dialog keeps its
  // text while it animates out; modalKey remounts the modal on every open.
  const [modalKey, setModalKey] = useState(0);
  const [groupModalOpen, setGroupModalOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<AdminGroup | null>(null);
  const [ifaceModalOpen, setIfaceModalOpen] = useState(false);
  const [editingIface, setEditingIface] = useState<TeInterface | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ kind: TeDeleteKind; name: string }>({
    kind: "group",
    name: "",
  });

  // ============================================================================
  // Data Loading
  // ============================================================================

  const fetchData = useCallback(async (refresh: boolean) => {
    const [configData, capData] = await Promise.all([
      trafficEngineeringService.getConfig(refresh),
      trafficEngineeringService.getCapabilities(),
    ]);
    setConfig(configData);
    setCapabilities(capData);
    setError(null);
  }, []);

  /** Full-page load: the spinner shows until the first read settles. */
  const load = useCallback((refresh: boolean) => {
    return fetchData(refresh)
      .catch((err) => setError((err as ApiError).message || t("errors.loadConfig")))
      .finally(() => setLoading(false));
  }, [fetchData, t]);

  useEffect(() => {
    void load(false);
  }, [load]);

  const retry = () => {
    setLoading(true);
    void load(true);
  };

  const reload = async () => {
    setRefreshing(true);
    try {
      await fetchData(true);
    } catch (err) {
      setError((err as ApiError).message || t("errors.loadConfig"));
    } finally {
      setRefreshing(false);
    }
  };

  // ============================================================================
  // Derived data
  // ============================================================================

  const adminGroups = config?.admin_groups ?? [];
  const interfaces = config?.interfaces ?? [];
  const ifacesWithGroups = interfaces.filter((i) => i.admin_groups.length > 0).length;
  const ifacesWithMetric = interfaces.filter((i) => i.metric != null).length;

  // ============================================================================
  // CRUD Handlers
  // ============================================================================

  const openGroup = (group: AdminGroup | null) => {
    setEditingGroup(group);
    setModalKey((k) => k + 1);
    setGroupModalOpen(true);
  };

  const submitGroup = async (fields: AdminGroupFields) => {
    if (editingGroup) await trafficEngineeringService.updateAdminGroup(editingGroup, fields);
    else await trafficEngineeringService.createAdminGroup(fields);
    await reload();
  };

  const openIface = (iface: TeInterface | null) => {
    setEditingIface(iface);
    setModalKey((k) => k + 1);
    setIfaceModalOpen(true);
  };

  const submitIface = async (fields: TeInterfaceFields) => {
    if (editingIface) await trafficEngineeringService.updateInterface(editingIface, fields);
    else await trafficEngineeringService.createInterface(fields);
    await reload();
  };

  const openDelete = (kind: TeDeleteKind, name: string) => {
    setDeleteTarget({ kind, name });
    setModalKey((k) => k + 1);
    setDeleteOpen(true);
  };

  const confirmDelete = async () => {
    if (deleteTarget.kind === "all") await trafficEngineeringService.deleteTrafficEngineering();
    else if (deleteTarget.kind === "group") {
      await trafficEngineeringService.deleteAdminGroup(deleteTarget.name, interfaces);
    } else await trafficEngineeringService.deleteInterface(deleteTarget.name);
    // The commit runs before the close, so a failed commit leaves the dialog open.
    setDeleteOpen(false);
    void reload();
  };

  // ============================================================================
  // Render
  // ============================================================================

  if (loading && !config) {
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
        <Button variant="outline" onClick={retry}>
          {tc("retry")}
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
                <h1 className="text-2xl font-bold text-foreground">{t("header.title")}</h1>
                {!hasWritePermission && (
                  <Badge variant="secondary" className="text-xs">
                    {tc("readOnly")}
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                {t("header.subtitle")}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {hasWritePermission && config?.configured && (
                <Button
                  variant="outline"
                  size="sm"
                  className="text-destructive hover:text-destructive"
                  onClick={() => openDelete("all", "")}
                  disabled={refreshing}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  {t("deleteAll.title")}
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={() => void reload()} disabled={refreshing}>
                <RefreshCw className={`h-4 w-4 mr-2${refreshing ? " animate-spin" : ""}`} />
                {tc("refresh")}
              </Button>
            </div>
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
                    <p className="text-2xl font-bold">{adminGroups.length}</p>
                    <p className="text-xs text-muted-foreground">{t("adminGroups")}</p>
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
                    <p className="text-2xl font-bold">{interfaces.length}</p>
                    <p className="text-xs text-muted-foreground">{t("stats.configuredInterfaces")}</p>
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
                    <p className="text-xs text-muted-foreground">{t("stats.withAdminGroups")}</p>
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
                    <p className="text-xs text-muted-foreground">{t("stats.customMetrics")}</p>
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
            {t("adminGroups")}
          </button>
          <button
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "interfaces"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
            onClick={() => setActiveTab("interfaces")}
          >
            {t("tabs.interfaces")}
          </button>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-auto p-6">
          {activeTab === "admin-groups" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  {t("groups.description")}
                </p>
                {hasWritePermission && (
                  <Button size="sm" onClick={() => openGroup(null)} disabled={refreshing}>
                    <Plus className="h-4 w-4 mr-2" />
                    {t("groups.add")}
                  </Button>
                )}
              </div>

              {adminGroups.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                  <FolderTree className="h-12 w-12 mb-4 opacity-50" />
                  <p className="text-lg font-medium">{t("groups.empty")}</p>
                  <p className="text-sm mt-1">
                    {t("groups.emptyHint")}
                  </p>
                  {hasWritePermission && (
                    <Button className="mt-4" onClick={() => openGroup(null)} disabled={refreshing}>
                      <Plus className="h-4 w-4 mr-2" />
                      {t("groups.add")}
                    </Button>
                  )}
                </div>
              ) : (
                <Card>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{tc("name")}</TableHead>
                        <TableHead>{t("groups.bitPosition")}</TableHead>
                        {hasWritePermission && <TableHead className="w-20" />}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {adminGroups.map((group) => (
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
                                  onClick={() => openGroup(group)}
                                  disabled={refreshing}
                                >
                                  <Pencil className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-destructive hover:text-destructive"
                                  onClick={() => openDelete("group", group.name)}
                                  disabled={refreshing}
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
                  {t("interfaces.description")}
                </p>
                {hasWritePermission && (
                  <Button size="sm" onClick={() => openIface(null)} disabled={refreshing}>
                    <Plus className="h-4 w-4 mr-2" />
                    {tc("addInterface")}
                  </Button>
                )}
              </div>

              {interfaces.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                  <Network className="h-12 w-12 mb-4 opacity-50" />
                  <p className="text-lg font-medium">{t("interfaces.empty")}</p>
                  <p className="text-sm mt-1">
                    {t("interfaces.emptyHint")}
                  </p>
                  {hasWritePermission && (
                    <Button className="mt-4" onClick={() => openIface(null)} disabled={refreshing}>
                      <Plus className="h-4 w-4 mr-2" />
                      {tc("addInterface")}
                    </Button>
                  )}
                </div>
              ) : (
                <Card>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t("interfaces.interface")}</TableHead>
                        <TableHead>{t("adminGroups")}</TableHead>
                        <TableHead>{t("interfaces.maxBw")}</TableHead>
                        <TableHead>{t("interfaces.maxReservBw")}</TableHead>
                        <TableHead>{t("interfaces.metric")}</TableHead>
                        {hasWritePermission && <TableHead className="w-20" />}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {interfaces.map((iface) => (
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
                                  onClick={() => openIface(iface)}
                                  disabled={refreshing}
                                >
                                  <Pencil className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-destructive hover:text-destructive"
                                  onClick={() => openDelete("interface", iface.name)}
                                  disabled={refreshing}
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

      {/* Modals */}
      <AdminGroupModal
        key={`group-${modalKey}`}
        open={groupModalOpen}
        onOpenChange={setGroupModalOpen}
        onSubmit={submitGroup}
        existingGroup={editingGroup}
        groups={adminGroups}
        capabilities={capabilities}
      />

      <TeInterfaceModal
        key={`iface-${modalKey}`}
        open={ifaceModalOpen}
        onOpenChange={setIfaceModalOpen}
        onSubmit={submitIface}
        existingInterface={editingIface}
        interfaces={interfaces}
        adminGroups={adminGroups}
        capabilities={capabilities}
      />

      <DeleteTeItemModal
        key={`delete-${modalKey}`}
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        kind={deleteTarget.kind}
        name={deleteTarget.name}
        onConfirm={confirmDelete}
      />
    </>
  );
}
