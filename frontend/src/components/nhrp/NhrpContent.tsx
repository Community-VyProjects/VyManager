"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Globe,
  Plus,
  RefreshCw,
  Pencil,
  Trash2,
  X,
  ChevronDown,
  ChevronRight,
  Map,
  Server,
  Radio,
  AlertCircle,
} from "lucide-react";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import {
  nhrpService,
  NhrpConfig,
  NhrpCapabilities,
  NhrpTunnel,
  NhrpMapEntry,
  NhrpNhsEntry,
  NhrpDynamicMap,
  NhrpShortcutTarget,
} from "@/lib/api/nhrp";
import { NhrpTunnelModal } from "./NhrpTunnelModal";
import { NhrpMapModal } from "./NhrpMapModal";
import { NhrpNhsModal } from "./NhrpNhsModal";
import { NhrpDynamicMapModal } from "./NhrpDynamicMapModal";
import { NhrpShortcutTargetModal } from "./NhrpShortcutTargetModal";
import { DeleteNhrpTunnelModal } from "./DeleteNhrpTunnelModal";
import { usePermissions } from "@/hooks/usePermissions";
import { FeatureGroup } from "@/lib/api/user-management";

// ============================================================================
// Main Component
// ============================================================================

export function NhrpContent() {
  const { canWrite } = usePermissions();
  const hasWritePermission = canWrite(FeatureGroup.NHRP);

  const [config, setConfig] = useState<NhrpConfig | null>(null);
  const [capabilities, setCapabilities] = useState<NhrpCapabilities | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Expanded tunnels
  const [expandedTunnels, setExpandedTunnels] = useState<Set<string>>(new Set());

  // Tunnel modal state
  const [tunnelModalOpen, setTunnelModalOpen] = useState(false);
  const [editingTunnel, setEditingTunnel] = useState<NhrpTunnel | null>(null);
  const [deletingTunnel, setDeletingTunnel] = useState<string | null>(null);

  // Map modal state
  const [mapModalOpen, setMapModalOpen] = useState(false);
  const [mapModalTunnel, setMapModalTunnel] = useState<string>("");
  const [editingMap, setEditingMap] = useState<NhrpMapEntry | null>(null);

  // NHS modal state
  const [nhsModalOpen, setNhsModalOpen] = useState(false);
  const [nhsModalTunnel, setNhsModalTunnel] = useState<string>("");
  const [editingNhs, setEditingNhs] = useState<NhrpNhsEntry | null>(null);

  // Dynamic map modal state
  const [dynMapModalOpen, setDynMapModalOpen] = useState(false);
  const [dynMapModalTunnel, setDynMapModalTunnel] = useState<string>("");
  const [editingDynMap, setEditingDynMap] = useState<NhrpDynamicMap | null>(null);

  // Shortcut target modal state
  const [scTargetModalOpen, setScTargetModalOpen] = useState(false);
  const [scTargetModalTunnel, setScTargetModalTunnel] = useState<string>("");
  const [editingScTarget, setEditingScTarget] = useState<NhrpShortcutTarget | null>(null);

  // Multicast inline add
  const [multicastInput, setMulticastInput] = useState<Record<string, string>>({});

  // ============================================================================
  // Data Loading
  // ============================================================================

  const loadData = useCallback(async (refresh = false) => {
    try {
      setLoading(true);
      setError(null);
      const [configData, capData] = await Promise.all([
        nhrpService.getConfig(refresh),
        nhrpService.getCapabilities(),
      ]);
      setConfig(configData);
      setCapabilities(capData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load NHRP configuration");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ============================================================================
  // Stats
  // ============================================================================

  const tunnelCount = config?.tunnels.length ?? 0;
  const mapCount = config?.tunnels.reduce((sum, t) => sum + t.maps.length, 0) ?? 0;
  const nhsDynCount = config?.tunnels.reduce(
    (sum, t) => sum + t.nhs_entries.length + t.dynamic_maps.length,
    0
  ) ?? 0;
  const multicastCount = config?.tunnels.reduce((sum, t) => sum + t.multicast.length, 0) ?? 0;

  // ============================================================================
  // Toggle expand
  // ============================================================================

  const toggleTunnel = (name: string) => {
    setExpandedTunnels((prev) => {
      const next = new Set(prev);
      if (next.has(name)) {
        next.delete(name);
      } else {
        next.add(name);
      }
      return next;
    });
  };

  // ============================================================================
  // Tunnel Handlers
  // ============================================================================

  const handleCreateTunnel = async (form: {
    name: string;
    authentication: string;
    holding_time: string;
    mtu: string;
    network_id: string;
    redirect: boolean;
    shortcut: boolean;
    non_caching: boolean;
    shortcut_destination: boolean;
    registration_no_unique: boolean;
  }) => {
    await nhrpService.createTunnel(form.name.trim(), {
      authentication: form.authentication || undefined,
      holding_time: form.holding_time || undefined,
      mtu: form.mtu || undefined,
      network_id: form.network_id || undefined,
      redirect: form.redirect || undefined,
      shortcut: form.shortcut || undefined,
      non_caching: form.non_caching || undefined,
      shortcut_destination: form.shortcut_destination || undefined,
      registration_no_unique: form.registration_no_unique || undefined,
    });
    await loadData(true);
  };

  const handleUpdateTunnel = async (form: {
    name: string;
    authentication: string;
    holding_time: string;
    mtu: string;
    network_id: string;
    redirect: boolean;
    shortcut: boolean;
    non_caching: boolean;
    shortcut_destination: boolean;
    registration_no_unique: boolean;
  }) => {
    if (!editingTunnel) return;
    await nhrpService.updateTunnelSettings(editingTunnel.name, editingTunnel, {
      authentication: form.authentication || undefined,
      holding_time: form.holding_time || undefined,
      mtu: form.mtu || undefined,
      network_id: form.network_id || undefined,
      redirect: form.redirect,
      shortcut: form.shortcut,
      non_caching: form.non_caching,
      shortcut_destination: form.shortcut_destination,
      registration_no_unique: form.registration_no_unique,
    });
    setEditingTunnel(null);
    await loadData(true);
  };

  const handleDeleteTunnel = async () => {
    if (!deletingTunnel) return;
    try {
      await nhrpService.deleteTunnel(deletingTunnel);
      setDeletingTunnel(null);
      await loadData(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to delete tunnel");
    }
  };

  // ============================================================================
  // Map Handlers
  // ============================================================================

  const handleCreateMap = async (tunnelIp: string, nbma: string, cisco: boolean, register: boolean) => {
    await nhrpService.createMap(mapModalTunnel, tunnelIp, nbma || undefined, cisco || undefined, register || undefined);
    await loadData(true);
  };

  const handleUpdateMap = async (tunnelIp: string, nbma: string, cisco: boolean, register: boolean) => {
    if (!editingMap) return;
    await nhrpService.updateMap(mapModalTunnel, tunnelIp, editingMap, {
      nbma: nbma || undefined,
      cisco,
      register,
    });
    setEditingMap(null);
    await loadData(true);
  };

  const handleDeleteMap = async (tunnel: string, tunnelIp: string) => {
    try {
      await nhrpService.deleteMap(tunnel, tunnelIp);
      await loadData(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to delete map");
    }
  };

  // ============================================================================
  // NHS Handlers
  // ============================================================================

  const handleCreateNhs = async (tunnelIp: string, nbmaAddresses: string[]) => {
    await nhrpService.createNhs(nhsModalTunnel, tunnelIp, nbmaAddresses);
    await loadData(true);
  };

  const handleUpdateNhs = async (tunnelIp: string, nbmaAddresses: string[]) => {
    if (!editingNhs) return;
    await nhrpService.updateNhs(nhsModalTunnel, tunnelIp, editingNhs.nbma_addresses, nbmaAddresses);
    setEditingNhs(null);
    await loadData(true);
  };

  const handleDeleteNhs = async (tunnel: string, tunnelIp: string) => {
    try {
      await nhrpService.deleteNhs(tunnel, tunnelIp);
      await loadData(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to delete NHS entry");
    }
  };

  // ============================================================================
  // Dynamic Map Handlers
  // ============================================================================

  const handleCreateDynMap = async (network: string, nbmaDomainName: string) => {
    await nhrpService.createDynamicMap(dynMapModalTunnel, network, nbmaDomainName || undefined);
    await loadData(true);
  };

  const handleUpdateDynMap = async (network: string, nbmaDomainName: string) => {
    if (!editingDynMap) return;
    await nhrpService.updateDynamicMap(
      dynMapModalTunnel,
      network,
      editingDynMap.nbma_domain_name,
      nbmaDomainName || null
    );
    setEditingDynMap(null);
    await loadData(true);
  };

  const handleDeleteDynMap = async (tunnel: string, network: string) => {
    try {
      await nhrpService.deleteDynamicMap(tunnel, network);
      await loadData(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to delete dynamic map");
    }
  };

  // ============================================================================
  // Shortcut Target Handlers
  // ============================================================================

  const handleCreateScTarget = async (target: string, holdingTime: string) => {
    await nhrpService.createShortcutTarget(scTargetModalTunnel, target, holdingTime || undefined);
    await loadData(true);
  };

  const handleUpdateScTarget = async (target: string, holdingTime: string) => {
    if (!editingScTarget) return;
    await nhrpService.updateShortcutTarget(
      scTargetModalTunnel,
      target,
      editingScTarget.holding_time,
      holdingTime || null
    );
    setEditingScTarget(null);
    await loadData(true);
  };

  const handleDeleteScTarget = async (tunnel: string, target: string) => {
    try {
      await nhrpService.deleteShortcutTarget(tunnel, target);
      await loadData(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to delete shortcut target");
    }
  };

  // ============================================================================
  // Multicast Handlers
  // ============================================================================

  const handleAddMulticast = async (tunnel: string) => {
    const val = (multicastInput[tunnel] || "").trim();
    if (!val) return;
    try {
      await nhrpService.addMulticast(tunnel, val);
      setMulticastInput((prev) => ({ ...prev, [tunnel]: "" }));
      await loadData(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to add multicast");
    }
  };

  const handleDeleteMulticast = async (tunnel: string, value: string) => {
    try {
      await nhrpService.deleteMulticast(tunnel, value);
      await loadData(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to delete multicast");
    }
  };

  // ============================================================================
  // Render
  // ============================================================================

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
                <Globe className="h-6 w-6 text-primary" />
                <h1 className="text-2xl font-bold text-foreground">NHRP</h1>
                {!hasWritePermission && (
                  <Badge variant="secondary" className="text-xs">Read Only</Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                Next Hop Resolution Protocol
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => loadData(true)}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
              {hasWritePermission && capabilities && (
                <Button
                  size="sm"
                  onClick={() => {
                    setEditingTunnel(null);
                    setTunnelModalOpen(true);
                  }}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Tunnel
                </Button>
              )}
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
                    <Globe className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{tunnelCount}</p>
                    <p className="text-xs text-muted-foreground">Tunnels</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-md p-2 bg-blue-500/10">
                    <Map className="h-4 w-4 text-blue-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{mapCount}</p>
                    <p className="text-xs text-muted-foreground">Static Maps</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-md p-2 bg-green-500/10">
                    <Server className="h-4 w-4 text-green-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{nhsDynCount}</p>
                    <p className="text-xs text-muted-foreground">
                      {capabilities?.features.nhs.supported ? "NHS Entries" : "Dynamic Maps"}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-md p-2 bg-orange-500/10">
                    <Radio className="h-4 w-4 text-orange-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{multicastCount}</p>
                    <p className="text-xs text-muted-foreground">Multicast</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Tunnel Table */}
        <div className="flex-1 overflow-auto p-6">
          {tunnelCount === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Globe className="h-12 w-12 mb-4 opacity-50" />
              <p className="text-lg font-medium">No NHRP tunnels configured</p>
              <p className="text-sm mt-1">Add a tunnel to get started</p>
            </div>
          ) : (
            <div className="space-y-3">
              {config?.tunnels.map((tunnel) => {
                const isExpanded = expandedTunnels.has(tunnel.name);
                return (
                  <Card key={tunnel.name}>
                    {/* Tunnel Row */}
                    <div
                      className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-accent/50 rounded-t-lg"
                      onClick={() => toggleTunnel(tunnel.name)}
                    >
                      <div className="flex items-center gap-3">
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        )}
                        <span className="font-mono font-semibold">{tunnel.name}</span>
                        <div className="flex gap-1.5">
                          {tunnel.redirect && <Badge variant="outline" className="text-xs">redirect</Badge>}
                          {tunnel.shortcut && <Badge variant="outline" className="text-xs">shortcut</Badge>}
                          {tunnel.non_caching && <Badge variant="outline" className="text-xs">non-caching</Badge>}
                          {tunnel.shortcut_destination && <Badge variant="outline" className="text-xs">shortcut-dest</Badge>}
                          {tunnel.registration_no_unique && <Badge variant="outline" className="text-xs">reg-no-unique</Badge>}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span>{tunnel.maps.length} maps</span>
                        {tunnel.authentication && (
                          <Badge variant="secondary" className="text-xs">auth</Badge>
                        )}
                        {hasWritePermission && (
                          <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => {
                                setEditingTunnel(tunnel);
                                setTunnelModalOpen(true);
                              }}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-destructive hover:text-destructive"
                              onClick={() => setDeletingTunnel(tunnel.name)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Expanded Detail */}
                    {isExpanded && (
                      <div className="px-4 pb-4 space-y-4 border-t border-border pt-4">
                        {/* General Settings */}
                        <Card>
                          <CardHeader className="py-3 px-4">
                            <CardTitle className="text-sm">General Settings</CardTitle>
                          </CardHeader>
                          <CardContent className="px-4 pb-3">
                            <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Authentication</span>
                                <span className="font-mono">{tunnel.authentication || "—"}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Holding Time</span>
                                <span className="font-mono">{tunnel.holding_time ? `${tunnel.holding_time}s` : "—"}</span>
                              </div>
                              {capabilities?.features.mtu.supported && (
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">MTU</span>
                                  <span className="font-mono">{tunnel.mtu || "—"}</span>
                                </div>
                              )}
                              {capabilities?.features.network_id.supported && (
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Network ID</span>
                                  <span className="font-mono">{tunnel.network_id || "—"}</span>
                                </div>
                              )}
                            </div>
                          </CardContent>
                        </Card>

                        {/* Static Maps */}
                        <Card>
                          <CardHeader className="py-3 px-4 flex flex-row items-center justify-between">
                            <CardTitle className="text-sm">Static Maps</CardTitle>
                            {hasWritePermission && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-7 text-xs"
                                onClick={() => {
                                  setMapModalTunnel(tunnel.name);
                                  setEditingMap(null);
                                  setMapModalOpen(true);
                                }}
                              >
                                <Plus className="h-3 w-3 mr-1" />
                                Add
                              </Button>
                            )}
                          </CardHeader>
                          <CardContent className="px-4 pb-3">
                            {tunnel.maps.length === 0 ? (
                              <p className="text-sm text-muted-foreground">No static maps configured</p>
                            ) : (
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead>Tunnel IP</TableHead>
                                    <TableHead>NBMA Address</TableHead>
                                    {capabilities?.features.map_cisco.supported && <TableHead>Cisco</TableHead>}
                                    {capabilities?.features.map_register.supported && <TableHead>Register</TableHead>}
                                    {hasWritePermission && <TableHead className="w-20" />}
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {tunnel.maps.map((m) => (
                                    <TableRow key={m.tunnel_ip}>
                                      <TableCell className="font-mono">{m.tunnel_ip}</TableCell>
                                      <TableCell className="font-mono">{m.nbma_address || "—"}</TableCell>
                                      {capabilities?.features.map_cisco.supported && (
                                        <TableCell>{m.cisco ? "Yes" : "No"}</TableCell>
                                      )}
                                      {capabilities?.features.map_register.supported && (
                                        <TableCell>{m.register ? "Yes" : "No"}</TableCell>
                                      )}
                                      {hasWritePermission && (
                                        <TableCell>
                                          <div className="flex gap-1">
                                            <Button
                                              variant="ghost"
                                              size="icon"
                                              className="h-7 w-7"
                                              onClick={() => {
                                                setMapModalTunnel(tunnel.name);
                                                setEditingMap(m);
                                                setMapModalOpen(true);
                                              }}
                                            >
                                              <Pencil className="h-3.5 w-3.5" />
                                            </Button>
                                            <Button
                                              variant="ghost"
                                              size="icon"
                                              className="h-7 w-7 text-destructive hover:text-destructive"
                                              onClick={() => handleDeleteMap(tunnel.name, m.tunnel_ip)}
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
                            )}
                          </CardContent>
                        </Card>

                        {/* NHS Entries — VyOS 1.5 only */}
                        {capabilities?.features.nhs.supported && (
                          <Card>
                            <CardHeader className="py-3 px-4 flex flex-row items-center justify-between">
                              <CardTitle className="text-sm">NHS Entries</CardTitle>
                              {hasWritePermission && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-7 text-xs"
                                  onClick={() => {
                                    setNhsModalTunnel(tunnel.name);
                                    setEditingNhs(null);
                                    setNhsModalOpen(true);
                                  }}
                                >
                                  <Plus className="h-3 w-3 mr-1" />
                                  Add
                                </Button>
                              )}
                            </CardHeader>
                            <CardContent className="px-4 pb-3">
                              {tunnel.nhs_entries.length === 0 ? (
                                <p className="text-sm text-muted-foreground">No NHS entries configured</p>
                              ) : (
                                <Table>
                                  <TableHeader>
                                    <TableRow>
                                      <TableHead>Tunnel IP</TableHead>
                                      <TableHead>NBMA Addresses</TableHead>
                                      {hasWritePermission && <TableHead className="w-20" />}
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {tunnel.nhs_entries.map((nhs) => (
                                      <TableRow key={nhs.tunnel_ip}>
                                        <TableCell className="font-mono">{nhs.tunnel_ip}</TableCell>
                                        <TableCell>
                                          <div className="flex flex-wrap gap-1">
                                            {nhs.nbma_addresses.map((addr) => (
                                              <Badge key={addr} variant="secondary" className="font-mono text-xs">
                                                {addr}
                                              </Badge>
                                            ))}
                                            {nhs.nbma_addresses.length === 0 && <span className="text-muted-foreground">—</span>}
                                          </div>
                                        </TableCell>
                                        {hasWritePermission && (
                                          <TableCell>
                                            <div className="flex gap-1">
                                              <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-7 w-7"
                                                onClick={() => {
                                                  setNhsModalTunnel(tunnel.name);
                                                  setEditingNhs(nhs);
                                                  setNhsModalOpen(true);
                                                }}
                                              >
                                                <Pencil className="h-3.5 w-3.5" />
                                              </Button>
                                              <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-7 w-7 text-destructive hover:text-destructive"
                                                onClick={() => handleDeleteNhs(tunnel.name, nhs.tunnel_ip)}
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
                              )}
                            </CardContent>
                          </Card>
                        )}

                        {/* Dynamic Maps — VyOS 1.4 only */}
                        {capabilities?.features.dynamic_map.supported && (
                          <Card>
                            <CardHeader className="py-3 px-4 flex flex-row items-center justify-between">
                              <CardTitle className="text-sm">Dynamic Maps</CardTitle>
                              {hasWritePermission && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-7 text-xs"
                                  onClick={() => {
                                    setDynMapModalTunnel(tunnel.name);
                                    setEditingDynMap(null);
                                    setDynMapModalOpen(true);
                                  }}
                                >
                                  <Plus className="h-3 w-3 mr-1" />
                                  Add
                                </Button>
                              )}
                            </CardHeader>
                            <CardContent className="px-4 pb-3">
                              {tunnel.dynamic_maps.length === 0 ? (
                                <p className="text-sm text-muted-foreground">No dynamic maps configured</p>
                              ) : (
                                <Table>
                                  <TableHeader>
                                    <TableRow>
                                      <TableHead>Network</TableHead>
                                      <TableHead>NBMA Domain Name</TableHead>
                                      {hasWritePermission && <TableHead className="w-20" />}
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {tunnel.dynamic_maps.map((dm) => (
                                      <TableRow key={dm.network}>
                                        <TableCell className="font-mono">{dm.network}</TableCell>
                                        <TableCell className="font-mono">{dm.nbma_domain_name || "—"}</TableCell>
                                        {hasWritePermission && (
                                          <TableCell>
                                            <div className="flex gap-1">
                                              <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-7 w-7"
                                                onClick={() => {
                                                  setDynMapModalTunnel(tunnel.name);
                                                  setEditingDynMap(dm);
                                                  setDynMapModalOpen(true);
                                                }}
                                              >
                                                <Pencil className="h-3.5 w-3.5" />
                                              </Button>
                                              <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-7 w-7 text-destructive hover:text-destructive"
                                                onClick={() => handleDeleteDynMap(tunnel.name, dm.network)}
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
                              )}
                            </CardContent>
                          </Card>
                        )}

                        {/* Shortcut Targets — VyOS 1.4 only */}
                        {capabilities?.features.shortcut_target.supported && (
                          <Card>
                            <CardHeader className="py-3 px-4 flex flex-row items-center justify-between">
                              <CardTitle className="text-sm">Shortcut Targets</CardTitle>
                              {hasWritePermission && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-7 text-xs"
                                  onClick={() => {
                                    setScTargetModalTunnel(tunnel.name);
                                    setEditingScTarget(null);
                                    setScTargetModalOpen(true);
                                  }}
                                >
                                  <Plus className="h-3 w-3 mr-1" />
                                  Add
                                </Button>
                              )}
                            </CardHeader>
                            <CardContent className="px-4 pb-3">
                              {tunnel.shortcut_targets.length === 0 ? (
                                <p className="text-sm text-muted-foreground">No shortcut targets configured</p>
                              ) : (
                                <Table>
                                  <TableHeader>
                                    <TableRow>
                                      <TableHead>Target</TableHead>
                                      <TableHead>Holding Time</TableHead>
                                      {hasWritePermission && <TableHead className="w-20" />}
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {tunnel.shortcut_targets.map((st) => (
                                      <TableRow key={st.target}>
                                        <TableCell className="font-mono">{st.target}</TableCell>
                                        <TableCell className="font-mono">{st.holding_time ? `${st.holding_time}s` : "—"}</TableCell>
                                        {hasWritePermission && (
                                          <TableCell>
                                            <div className="flex gap-1">
                                              <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-7 w-7"
                                                onClick={() => {
                                                  setScTargetModalTunnel(tunnel.name);
                                                  setEditingScTarget(st);
                                                  setScTargetModalOpen(true);
                                                }}
                                              >
                                                <Pencil className="h-3.5 w-3.5" />
                                              </Button>
                                              <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-7 w-7 text-destructive hover:text-destructive"
                                                onClick={() => handleDeleteScTarget(tunnel.name, st.target)}
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
                              )}
                            </CardContent>
                          </Card>
                        )}

                        {/* Multicast */}
                        <Card>
                          <CardHeader className="py-3 px-4">
                            <CardTitle className="text-sm">Multicast</CardTitle>
                          </CardHeader>
                          <CardContent className="px-4 pb-3">
                            <div className="flex flex-wrap gap-2">
                              {tunnel.multicast.map((mc) => (
                                <Badge key={mc} variant="secondary" className="gap-1 pr-1">
                                  <span className="font-mono text-xs">{mc}</span>
                                  {hasWritePermission && (
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteMulticast(tunnel.name, mc)}
                                      className="ml-1 rounded-full p-0.5 hover:bg-muted-foreground/20"
                                    >
                                      <X className="h-3 w-3" />
                                    </button>
                                  )}
                                </Badge>
                              ))}
                              {tunnel.multicast.length === 0 && (
                                <span className="text-sm text-muted-foreground">None configured</span>
                              )}
                            </div>
                            {hasWritePermission && (
                              <div className="flex gap-2 mt-3">
                                <Input
                                  value={multicastInput[tunnel.name] || ""}
                                  onChange={(e) =>
                                    setMulticastInput((prev) => ({ ...prev, [tunnel.name]: e.target.value }))
                                  }
                                  placeholder="e.g. dynamic or NBMA address"
                                  className="h-8 text-sm"
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                      e.preventDefault();
                                      handleAddMulticast(tunnel.name);
                                    }
                                  }}
                                />
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-8"
                                  onClick={() => handleAddMulticast(tunnel.name)}
                                  disabled={!(multicastInput[tunnel.name] || "").trim()}
                                >
                                  <Plus className="h-3 w-3 mr-1" />
                                  Add
                                </Button>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      {capabilities && (
        <>
          <NhrpTunnelModal
            open={tunnelModalOpen}
            onOpenChange={setTunnelModalOpen}
            onSubmit={editingTunnel ? handleUpdateTunnel : handleCreateTunnel}
            existingTunnel={editingTunnel}
            capabilities={capabilities}
          />

          <NhrpMapModal
            open={mapModalOpen}
            onOpenChange={setMapModalOpen}
            onSubmit={editingMap ? handleUpdateMap : handleCreateMap}
            existingMap={editingMap}
            capabilities={capabilities}
          />

          <NhrpNhsModal
            open={nhsModalOpen}
            onOpenChange={setNhsModalOpen}
            onSubmit={editingNhs ? handleUpdateNhs : handleCreateNhs}
            existingNhs={editingNhs}
          />

          <NhrpDynamicMapModal
            open={dynMapModalOpen}
            onOpenChange={setDynMapModalOpen}
            onSubmit={editingDynMap ? handleUpdateDynMap : handleCreateDynMap}
            existingDynamicMap={editingDynMap}
          />

          <NhrpShortcutTargetModal
            open={scTargetModalOpen}
            onOpenChange={setScTargetModalOpen}
            onSubmit={editingScTarget ? handleUpdateScTarget : handleCreateScTarget}
            existingTarget={editingScTarget}
          />
        </>
      )}

      <DeleteNhrpTunnelModal
        open={deletingTunnel !== null}
        onOpenChange={(open) => { if (!open) setDeletingTunnel(null); }}
        tunnelName={deletingTunnel ?? ""}
        onConfirm={handleDeleteTunnel}
      />
    </>
  );
}
