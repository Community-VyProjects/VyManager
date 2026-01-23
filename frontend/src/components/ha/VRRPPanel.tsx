"use client";

import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Shield,
  Plus,
  Trash2,
  Settings,
  RefreshCw,
  AlertCircle,
  MoreVertical,
  Server,
  Network,
  Activity,
  Power,
  PowerOff,
  Layers,
  Globe,
  CheckCircle2,
  XCircle,
  Clock,
  Users,
} from "lucide-react";
import {
  vrrpService,
  type VRRPConfig,
  type VRRPGroup,
  type VRRPSyncGroup,
  type VirtualServer,
  type VRRPStatusGroup,
} from "@/lib/api/vrrp";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/useToast";
import { VRRPGroupModal } from "./VRRPGroupModal";
import { VRRPSyncGroupModal } from "./VRRPSyncGroupModal";
import { VRRPVirtualServerModal } from "./VRRPVirtualServerModal";
import { VRRPDeleteConfirmModal } from "./VRRPDeleteConfirmModal";
import { VRRPGlobalSettingsModal } from "./VRRPGlobalSettingsModal";

interface VRRPPanelProps {
  onUpdate?: () => void;
}

export function VRRPPanel({ onUpdate }: VRRPPanelProps) {
  const { toast } = useToast();
  const [config, setConfig] = useState<VRRPConfig | null>(null);
  const [status, setStatus] = useState<VRRPStatusGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusLoading, setStatusLoading] = useState(false);

  // Modal states
  const [addGroupModalOpen, setAddGroupModalOpen] = useState(false);
  const [editGroupData, setEditGroupData] = useState<VRRPGroup | null>(null);
  const [addSyncGroupModalOpen, setAddSyncGroupModalOpen] = useState(false);
  const [editSyncGroupData, setEditSyncGroupData] = useState<VRRPSyncGroup | null>(null);
  const [addVirtualServerModalOpen, setAddVirtualServerModalOpen] = useState(false);
  const [editVirtualServerData, setEditVirtualServerData] = useState<VirtualServer | null>(null);
  const [globalSettingsModalOpen, setGlobalSettingsModalOpen] = useState(false);

  // Delete modal state
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{
    type: "vrrp-group" | "sync-group" | "virtual-server";
    name: string;
  } | null>(null);

  const fetchConfig = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await vrrpService.getConfig();
      setConfig(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load VRRP configuration");
    } finally {
      setLoading(false);
    }
  };

  const fetchStatus = async () => {
    try {
      setStatusLoading(true);
      const data = await vrrpService.getStatus();
      if (data.success) {
        setStatus(data.groups);
      }
    } catch (err) {
      console.error("Failed to fetch VRRP status:", err);
    } finally {
      setStatusLoading(false);
    }
  };

  useEffect(() => {
    fetchConfig();
    fetchStatus();
  }, []);

  // Auto-refresh status every 10 seconds
  useEffect(() => {
    const interval = setInterval(fetchStatus, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleRefresh = () => {
    fetchConfig();
    fetchStatus();
    onUpdate?.();
  };

  const handleDeleteGroup = (name: string) => {
    setDeleteTarget({ type: "vrrp-group", name });
    setDeleteModalOpen(true);
  };

  const handleDeleteSyncGroup = (name: string) => {
    setDeleteTarget({ type: "sync-group", name });
    setDeleteModalOpen(true);
  };

  const handleDeleteVirtualServer = (address: string) => {
    setDeleteTarget({ type: "virtual-server", name: address });
    setDeleteModalOpen(true);
  };

  const handleEditGroup = (group: VRRPGroup) => {
    setEditGroupData(group);
    setAddGroupModalOpen(true);
  };

  const handleEditSyncGroup = (syncGroup: VRRPSyncGroup) => {
    setEditSyncGroupData(syncGroup);
    setAddSyncGroupModalOpen(true);
  };

  const handleEditVirtualServer = (vs: VirtualServer) => {
    setEditVirtualServerData(vs);
    setAddVirtualServerModalOpen(true);
  };

  const handleToggleGroup = async (group: VRRPGroup) => {
    try {
      const response = group.disable
        ? await vrrpService.enableVRRPGroup(group.name)
        : await vrrpService.disableVRRPGroup(group.name);

      if (response.success) {
        toast.success(
          group.disable ? "Group Enabled" : "Group Disabled",
          `VRRP group ${group.name} has been ${group.disable ? "enabled" : "disabled"}`
        );
        handleRefresh();
      } else {
        toast.error("Failed", response.error || "Unknown error");
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      toast.error("Error", errorMessage);
    }
  };

  const getGroupStatus = (groupName: string): VRRPStatusGroup | undefined => {
    return status.find((s) => s.name === groupName);
  };

  const getStateColor = (state: string) => {
    switch (state?.toUpperCase()) {
      case "MASTER":
        return "bg-green-500";
      case "BACKUP":
        return "bg-yellow-500";
      case "FAULT":
        return "bg-red-500";
      default:
        return "bg-gray-500";
    }
  };

  const getStateBadge = (state: string) => {
    const colorClass = getStateColor(state);
    return (
      <Badge variant="outline" className={cn("gap-1")}>
        <span className={cn("h-2 w-2 rounded-full", colorClass)} />
        {state || "Unknown"}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex items-center gap-2 text-muted-foreground">
          <RefreshCw className="h-5 w-5 animate-spin" />
          <span>Loading VRRP configuration...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <AlertCircle className="h-12 w-12 text-destructive" />
        <p className="text-destructive">{error}</p>
        <Button variant="outline" onClick={handleRefresh}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Retry
        </Button>
      </div>
    );
  }

  if (!config) {
    return null;
  }

  const hasConfig = config.groups.length > 0 || config.sync_groups.length > 0 || config.virtual_servers.length > 0;

  return (
    <ScrollArea className="h-full">
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-purple-500/10">
              <Shield className="h-6 w-6 text-purple-500" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-foreground">High Availability</h2>
              <p className="text-sm text-muted-foreground">VRRP groups, sync groups, and virtual servers</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleRefresh}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <Button variant="outline" size="sm" onClick={() => setGlobalSettingsModalOpen(true)}>
              <Settings className="h-4 w-4 mr-2" />
              Global Settings
            </Button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="flex items-center gap-4 p-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-500/10">
                <Network className="h-5 w-5 text-purple-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{config.groups.length}</p>
                <p className="text-sm text-muted-foreground">VRRP Groups</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-4 p-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-500/10">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {status.filter((s) => s.state?.toUpperCase() === "MASTER").length}
                </p>
                <p className="text-sm text-muted-foreground">Master</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-4 p-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-yellow-500/10">
                <Clock className="h-5 w-5 text-yellow-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {status.filter((s) => s.state?.toUpperCase() === "BACKUP").length}
                </p>
                <p className="text-sm text-muted-foreground">Backup</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-4 p-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10">
                <Layers className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{config.sync_groups.length}</p>
                <p className="text-sm text-muted-foreground">Sync Groups</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="groups" className="space-y-4">
          <TabsList>
            <TabsTrigger value="groups" className="gap-2">
              <Network className="h-4 w-4" />
              VRRP Groups
            </TabsTrigger>
            <TabsTrigger value="sync-groups" className="gap-2">
              <Layers className="h-4 w-4" />
              Sync Groups
            </TabsTrigger>
            <TabsTrigger value="virtual-servers" className="gap-2">
              <Globe className="h-4 w-4" />
              Virtual Servers
            </TabsTrigger>
            <TabsTrigger value="status" className="gap-2">
              <Activity className="h-4 w-4" />
              Live Status
            </TabsTrigger>
          </TabsList>

          {/* VRRP Groups Tab */}
          <TabsContent value="groups" className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-medium">VRRP Groups</h3>
              <Button size="sm" onClick={() => {
                setEditGroupData(null);
                setAddGroupModalOpen(true);
              }}>
                <Plus className="h-4 w-4 mr-2" />
                Add Group
              </Button>
            </div>

            {config.groups.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Network className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground mb-4">No VRRP groups configured</p>
                  <Button onClick={() => {
                    setEditGroupData(null);
                    setAddGroupModalOpen(true);
                  }}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create First Group
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {config.groups.map((group) => {
                  const groupStatus = getGroupStatus(group.name);
                  return (
                    <Card key={group.name}>
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <CardTitle className="text-lg">{group.name}</CardTitle>
                            {group.disable ? (
                              <Badge variant="secondary">Disabled</Badge>
                            ) : groupStatus ? (
                              getStateBadge(groupStatus.state)
                            ) : (
                              <Badge variant="outline">Unknown</Badge>
                            )}
                          </div>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleEditGroup(group)}>
                                <Settings className="h-4 w-4 mr-2" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleToggleGroup(group)}>
                                {group.disable ? (
                                  <>
                                    <Power className="h-4 w-4 mr-2" />
                                    Enable
                                  </>
                                ) : (
                                  <>
                                    <PowerOff className="h-4 w-4 mr-2" />
                                    Disable
                                  </>
                                )}
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={() => handleDeleteGroup(group.name)}
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                        {group.description && (
                          <CardDescription>{group.description}</CardDescription>
                        )}
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <span className="text-muted-foreground">VRID:</span>
                            <span className="ml-2 font-medium">{group.vrid || "-"}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Interface:</span>
                            <span className="ml-2 font-medium">{group.interface || "-"}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Priority:</span>
                            <span className="ml-2 font-medium">{group.priority}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Preempt:</span>
                            <span className="ml-2 font-medium">
                              {group.no_preempt ? "No" : "Yes"}
                              {group.preempt_delay && ` (delay: ${group.preempt_delay}s)`}
                            </span>
                          </div>
                        </div>
                        {group.addresses.length > 0 && (
                          <div className="mt-3">
                            <span className="text-sm text-muted-foreground">Virtual Addresses:</span>
                            <div className="flex flex-wrap gap-2 mt-1">
                              {group.addresses.map((addr) => (
                                <Badge key={addr} variant="secondary">
                                  {addr}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                        {groupStatus && groupStatus.master_ip && (
                          <div className="mt-3 text-sm">
                            <span className="text-muted-foreground">Current Master:</span>
                            <span className="ml-2 font-medium">{groupStatus.master_ip}</span>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* Sync Groups Tab */}
          <TabsContent value="sync-groups" className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-medium">Sync Groups</h3>
              <Button size="sm" onClick={() => {
                setEditSyncGroupData(null);
                setAddSyncGroupModalOpen(true);
              }}>
                <Plus className="h-4 w-4 mr-2" />
                Add Sync Group
              </Button>
            </div>

            {config.sync_groups.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Layers className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground mb-4">No sync groups configured</p>
                  <p className="text-sm text-muted-foreground mb-4">
                    Sync groups allow VRRP groups to transition together
                  </p>
                  <Button onClick={() => {
                    setEditSyncGroupData(null);
                    setAddSyncGroupModalOpen(true);
                  }}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Sync Group
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {config.sync_groups.map((sg) => (
                  <Card key={sg.name}>
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">{sg.name}</CardTitle>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleEditSyncGroup(sg)}>
                              <Settings className="h-4 w-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => handleDeleteSyncGroup(sg.name)}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div>
                          <span className="text-sm text-muted-foreground">Members:</span>
                          <div className="flex flex-wrap gap-2 mt-1">
                            {sg.members.length > 0 ? (
                              sg.members.map((member) => (
                                <Badge key={member} variant="outline">
                                  {member}
                                </Badge>
                              ))
                            ) : (
                              <span className="text-sm text-muted-foreground">No members</span>
                            )}
                          </div>
                        </div>
                        {sg.transition_scripts && (
                          <div className="text-sm">
                            <span className="text-muted-foreground">Transition Scripts:</span>
                            <div className="mt-1 space-y-1">
                              {sg.transition_scripts.master && (
                                <div>Master: <code className="text-xs bg-muted px-1 rounded">{sg.transition_scripts.master}</code></div>
                              )}
                              {sg.transition_scripts.backup && (
                                <div>Backup: <code className="text-xs bg-muted px-1 rounded">{sg.transition_scripts.backup}</code></div>
                              )}
                              {sg.transition_scripts.fault && (
                                <div>Fault: <code className="text-xs bg-muted px-1 rounded">{sg.transition_scripts.fault}</code></div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Virtual Servers Tab */}
          <TabsContent value="virtual-servers" className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-medium">Virtual Servers (Load Balancing)</h3>
              <Button size="sm" onClick={() => {
                setEditVirtualServerData(null);
                setAddVirtualServerModalOpen(true);
              }}>
                <Plus className="h-4 w-4 mr-2" />
                Add Virtual Server
              </Button>
            </div>

            {config.virtual_servers.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Globe className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground mb-4">No virtual servers configured</p>
                  <p className="text-sm text-muted-foreground mb-4">
                    Virtual servers provide load balancing across real servers
                  </p>
                  <Button onClick={() => {
                    setEditVirtualServerData(null);
                    setAddVirtualServerModalOpen(true);
                  }}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Virtual Server
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {config.virtual_servers.map((vs) => (
                  <Card key={vs.address}>
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <CardTitle className="text-lg">{vs.address}</CardTitle>
                          {vs.port && <Badge variant="secondary">:{vs.port}</Badge>}
                          {vs.protocol && <Badge variant="outline">{vs.protocol.toUpperCase()}</Badge>}
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleEditVirtualServer(vs)}>
                              <Settings className="h-4 w-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => handleDeleteVirtualServer(vs.address)}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-3">
                        <div>
                          <span className="text-muted-foreground">Algorithm:</span>
                          <span className="ml-2 font-medium">{vs.algorithm || "rr"}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Forward Method:</span>
                          <span className="ml-2 font-medium">{vs.forward_method || "nat"}</span>
                        </div>
                        {vs.persistence_timeout && (
                          <div>
                            <span className="text-muted-foreground">Persistence:</span>
                            <span className="ml-2 font-medium">{vs.persistence_timeout}s</span>
                          </div>
                        )}
                        {vs.delay_loop && (
                          <div>
                            <span className="text-muted-foreground">Delay Loop:</span>
                            <span className="ml-2 font-medium">{vs.delay_loop}</span>
                          </div>
                        )}
                      </div>
                      {vs.real_servers.length > 0 && (
                        <div>
                          <span className="text-sm text-muted-foreground">Real Servers:</span>
                          <div className="flex flex-wrap gap-2 mt-1">
                            {vs.real_servers.map((rs) => (
                              <Badge key={rs.address} variant="secondary" className="gap-1">
                                <Server className="h-3 w-3" />
                                {rs.address}
                                {rs.port && <span>:{rs.port}</span>}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Live Status Tab */}
          <TabsContent value="status" className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-medium">Live VRRP Status</h3>
              <Button
                variant="outline"
                size="sm"
                onClick={fetchStatus}
                disabled={statusLoading}
              >
                <RefreshCw className={cn("h-4 w-4 mr-2", statusLoading && "animate-spin")} />
                Refresh Status
              </Button>
            </div>

            {status.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Activity className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No VRRP status available</p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Status will appear here once VRRP groups are configured and running
                  </p>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Group</TableHead>
                      <TableHead>Interface</TableHead>
                      <TableHead>VRID</TableHead>
                      <TableHead>State</TableHead>
                      <TableHead>Priority</TableHead>
                      <TableHead>Effective Priority</TableHead>
                      <TableHead>Master IP</TableHead>
                      <TableHead>Last Transition</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {status.map((s) => (
                      <TableRow key={s.name}>
                        <TableCell className="font-medium">{s.name}</TableCell>
                        <TableCell>{s.interface || "-"}</TableCell>
                        <TableCell>{s.vrid || "-"}</TableCell>
                        <TableCell>{getStateBadge(s.state)}</TableCell>
                        <TableCell>{s.priority || "-"}</TableCell>
                        <TableCell>{s.effective_priority || "-"}</TableCell>
                        <TableCell>{s.master_ip || "-"}</TableCell>
                        <TableCell>{s.last_transition || "-"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Modals */}
      <VRRPGroupModal
        open={addGroupModalOpen}
        onOpenChange={(open) => {
          setAddGroupModalOpen(open);
          if (!open) setEditGroupData(null);
        }}
        existingGroups={config.groups}
        editData={editGroupData}
        onSuccess={handleRefresh}
      />

      <VRRPSyncGroupModal
        open={addSyncGroupModalOpen}
        onOpenChange={(open) => {
          setAddSyncGroupModalOpen(open);
          if (!open) setEditSyncGroupData(null);
        }}
        vrrpGroups={config.groups}
        editData={editSyncGroupData}
        onSuccess={handleRefresh}
      />

      <VRRPVirtualServerModal
        open={addVirtualServerModalOpen}
        onOpenChange={(open) => {
          setAddVirtualServerModalOpen(open);
          if (!open) setEditVirtualServerData(null);
        }}
        editData={editVirtualServerData}
        onSuccess={handleRefresh}
      />

      <VRRPGlobalSettingsModal
        open={globalSettingsModalOpen}
        onOpenChange={setGlobalSettingsModalOpen}
        currentSettings={config.global_parameters}
        onSuccess={handleRefresh}
      />

      <VRRPDeleteConfirmModal
        open={deleteModalOpen}
        onOpenChange={setDeleteModalOpen}
        target={deleteTarget}
        onSuccess={handleRefresh}
      />
    </ScrollArea>
  );
}
