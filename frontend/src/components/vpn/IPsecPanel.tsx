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
  Shield,
  Plus,
  Trash2,
  Settings,
  RefreshCw,
  AlertCircle,
  MoreVertical,
  Key,
  Lock,
  Network,
  Server,
  CheckCircle2,
  XCircle,
  Power,
  PowerOff,
  Zap,
} from "lucide-react";
import {
  ipsecService,
  type IPsecConfig,
  type IKEGroup,
  type ESPGroup,
  type SiteToSitePeer,
} from "@/lib/api/ipsec";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/useToast";
import { IPsecAddIKEGroupModal } from "./IPsecAddIKEGroupModal";
import { IPsecAddESPGroupModal } from "./IPsecAddESPGroupModal";
import { IPsecAddPeerModal } from "./IPsecAddPeerModal";
import { IPsecAddTunnelModal } from "./IPsecAddTunnelModal";
import { IPsecDeleteConfirmModal } from "./IPsecDeleteConfirmModal";
import { IPsecQuickSetupModal } from "./IPsecQuickSetupModal";

interface IPsecPanelProps {
  onUpdate?: () => void;
}

export function IPsecPanel({ onUpdate }: IPsecPanelProps) {
  const { toast } = useToast();
  const [config, setConfig] = useState<IPsecConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal states
  const [addIKEGroupModalOpen, setAddIKEGroupModalOpen] = useState(false);
  const [addESPGroupModalOpen, setAddESPGroupModalOpen] = useState(false);
  const [addPeerModalOpen, setAddPeerModalOpen] = useState(false);
  const [addTunnelModalOpen, setAddTunnelModalOpen] = useState(false);
  const [quickSetupModalOpen, setQuickSetupModalOpen] = useState(false);
  const [selectedPeerForTunnel, setSelectedPeerForTunnel] = useState<string | null>(null);

  // Delete modal state
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{
    type: "ike-group" | "esp-group" | "peer" | "tunnel";
    name: string;
    additionalInfo?: { peer?: string; tunnel?: string };
  } | null>(null);

  const fetchConfig = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await ipsecService.getConfig();
      setConfig(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load IPsec configuration");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConfig();
  }, []);

  const handleRefresh = () => {
    fetchConfig();
    onUpdate?.();
  };

  const handleDeleteIKEGroup = (name: string) => {
    setDeleteTarget({ type: "ike-group", name });
    setDeleteModalOpen(true);
  };

  const handleDeleteESPGroup = (name: string) => {
    setDeleteTarget({ type: "esp-group", name });
    setDeleteModalOpen(true);
  };

  const handleDeletePeer = (address: string) => {
    setDeleteTarget({ type: "peer", name: address });
    setDeleteModalOpen(true);
  };

  const handleDeleteTunnel = (peer: string, tunnelId: string) => {
    setDeleteTarget({
      type: "tunnel",
      name: tunnelId,
      additionalInfo: { peer, tunnel: tunnelId },
    });
    setDeleteModalOpen(true);
  };

  const handleAddTunnel = (peerAddress: string) => {
    setSelectedPeerForTunnel(peerAddress);
    setAddTunnelModalOpen(true);
  };

  const handleTogglePeer = async (peer: SiteToSitePeer) => {
    try {
      const response = peer.disable
        ? await ipsecService.enablePeer(peer.address)
        : await ipsecService.disablePeer(peer.address);

      if (response.success) {
        toast.success(
          peer.disable ? "Peer Enabled" : "Peer Disabled",
          `IPsec peer ${peer.address} has been ${peer.disable ? "enabled" : "disabled"}`
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex items-center gap-2 text-muted-foreground">
          <RefreshCw className="h-5 w-5 animate-spin" />
          <span>Loading IPsec configuration...</span>
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

  const hasConfig = config.ike_groups.length > 0 || config.esp_groups.length > 0 || config.peers.length > 0;

  return (
    <ScrollArea className="h-full">
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-500/10">
              <Shield className="h-6 w-6 text-blue-500" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-foreground">IPsec VPN</h2>
              <p className="text-sm text-muted-foreground">Site-to-site VPN tunnels</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleRefresh}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <Button variant="outline" size="sm" onClick={() => setQuickSetupModalOpen(true)}>
              <Zap className="h-4 w-4 mr-2" />
              Quick Setup
            </Button>
          </div>
        </div>

        {!hasConfig ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Shield className="h-12 w-12 mb-4 text-muted-foreground opacity-30" />
              <p className="text-muted-foreground mb-4">No IPsec VPN configured</p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setQuickSetupModalOpen(true)}>
                  <Zap className="h-4 w-4 mr-2" />
                  Quick Setup
                </Button>
                <Button variant="outline" size="sm" onClick={() => setAddIKEGroupModalOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Manual Setup
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {/* Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground">IKE Groups</p>
                      <p className="text-2xl font-bold">{config.ike_groups.length}</p>
                    </div>
                    <div className="h-10 w-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                      <Key className="h-5 w-5 text-purple-500" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground">ESP Groups</p>
                      <p className="text-2xl font-bold">{config.esp_groups.length}</p>
                    </div>
                    <div className="h-10 w-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                      <Lock className="h-5 w-5 text-green-500" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground">Peers</p>
                      <p className="text-2xl font-bold">{config.peers.length}</p>
                    </div>
                    <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                      <Server className="h-5 w-5 text-blue-500" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground">Tunnels</p>
                      <p className="text-2xl font-bold">
                        {config.peers.reduce((acc, p) => acc + p.tunnels.length, 0)}
                      </p>
                    </div>
                    <div className="h-10 w-10 rounded-lg bg-orange-500/10 flex items-center justify-center">
                      <Network className="h-5 w-5 text-orange-500" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Tabs */}
            <Tabs defaultValue="peers" className="space-y-4">
              <TabsList>
                <TabsTrigger value="peers" className="gap-2">
                  <Server className="h-4 w-4" />
                  Peers ({config.peers.length})
                </TabsTrigger>
                <TabsTrigger value="ike-groups" className="gap-2">
                  <Key className="h-4 w-4" />
                  IKE Groups ({config.ike_groups.length})
                </TabsTrigger>
                <TabsTrigger value="esp-groups" className="gap-2">
                  <Lock className="h-4 w-4" />
                  ESP Groups ({config.esp_groups.length})
                </TabsTrigger>
                <TabsTrigger value="options" className="gap-2">
                  <Settings className="h-4 w-4" />
                  Options
                </TabsTrigger>
              </TabsList>

              {/* Peers Tab */}
              <TabsContent value="peers" className="space-y-4">
                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-base">Site-to-Site Peers</CardTitle>
                        <CardDescription>Configured IPsec VPN peers</CardDescription>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setAddPeerModalOpen(true)}
                        disabled={config.ike_groups.length === 0}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Peer
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {config.peers.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <Server className="h-8 w-8 mx-auto mb-2 opacity-30" />
                        <p>No IPsec peers configured</p>
                        {config.ike_groups.length === 0 && (
                          <p className="text-xs mt-1">Create an IKE group first</p>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {config.peers.map((peer, idx) => (
                          <PeerCard
                            key={idx}
                            peer={peer}
                            onDelete={() => handleDeletePeer(peer.address)}
                            onToggle={() => handleTogglePeer(peer)}
                            onAddTunnel={() => handleAddTunnel(peer.address)}
                            onDeleteTunnel={(tunnelId) =>
                              handleDeleteTunnel(peer.address, tunnelId)
                            }
                          />
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* IKE Groups Tab */}
              <TabsContent value="ike-groups" className="space-y-4">
                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-base">IKE Groups</CardTitle>
                        <CardDescription>Phase 1 encryption proposals</CardDescription>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setAddIKEGroupModalOpen(true)}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add IKE Group
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {config.ike_groups.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <Key className="h-8 w-8 mx-auto mb-2 opacity-30" />
                        <p>No IKE groups configured</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {config.ike_groups.map((group, idx) => (
                          <IKEGroupCard
                            key={idx}
                            group={group}
                            onDelete={() => handleDeleteIKEGroup(group.name)}
                          />
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* ESP Groups Tab */}
              <TabsContent value="esp-groups" className="space-y-4">
                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-base">ESP Groups</CardTitle>
                        <CardDescription>Phase 2 encryption proposals</CardDescription>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setAddESPGroupModalOpen(true)}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add ESP Group
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {config.esp_groups.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <Lock className="h-8 w-8 mx-auto mb-2 opacity-30" />
                        <p>No ESP groups configured</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {config.esp_groups.map((group, idx) => (
                          <ESPGroupCard
                            key={idx}
                            group={group}
                            onDelete={() => handleDeleteESPGroup(group.name)}
                          />
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Options Tab */}
              <TabsContent value="options" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">IPsec Options</CardTitle>
                    <CardDescription>Global IPsec settings</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      <div className="p-4 rounded-lg bg-accent/50">
                        <p className="text-xs text-muted-foreground mb-1">Route Auto-install</p>
                        <Badge
                          variant={
                            config.options?.disable_route_autoinstall ? "secondary" : "default"
                          }
                        >
                          {config.options?.disable_route_autoinstall ? "Disabled" : "Enabled"}
                        </Badge>
                      </div>
                      <div className="p-4 rounded-lg bg-accent/50">
                        <p className="text-xs text-muted-foreground mb-1">FlexVPN</p>
                        <Badge variant={config.options?.flexvpn ? "default" : "secondary"}>
                          {config.options?.flexvpn ? "Enabled" : "Disabled"}
                        </Badge>
                      </div>
                      <div className="p-4 rounded-lg bg-accent/50">
                        <p className="text-xs text-muted-foreground mb-1">Interfaces</p>
                        <Badge variant="outline">
                          {config.interfaces.length > 0
                            ? config.interfaces.join(", ")
                            : "None"}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        )}

        {/* Modals */}
        <IPsecAddIKEGroupModal
          open={addIKEGroupModalOpen}
          onOpenChange={setAddIKEGroupModalOpen}
          onSuccess={handleRefresh}
        />
        <IPsecAddESPGroupModal
          open={addESPGroupModalOpen}
          onOpenChange={setAddESPGroupModalOpen}
          onSuccess={handleRefresh}
        />
        <IPsecAddPeerModal
          open={addPeerModalOpen}
          onOpenChange={setAddPeerModalOpen}
          onSuccess={handleRefresh}
          ikeGroups={config.ike_groups}
          espGroups={config.esp_groups}
        />
        <IPsecAddTunnelModal
          open={addTunnelModalOpen}
          onOpenChange={setAddTunnelModalOpen}
          onSuccess={handleRefresh}
          peerAddress={selectedPeerForTunnel || ""}
          espGroups={config.esp_groups}
        />
        <IPsecQuickSetupModal
          open={quickSetupModalOpen}
          onOpenChange={setQuickSetupModalOpen}
          onSuccess={handleRefresh}
        />
        {deleteTarget && (
          <IPsecDeleteConfirmModal
            open={deleteModalOpen}
            onOpenChange={setDeleteModalOpen}
            onSuccess={handleRefresh}
            deleteType={deleteTarget.type}
            targetName={deleteTarget.name}
            additionalInfo={deleteTarget.additionalInfo}
          />
        )}
      </div>
    </ScrollArea>
  );
}

// IKE Group Card Component
function IKEGroupCard({
  group,
  onDelete,
}: {
  group: IKEGroup;
  onDelete: () => void;
}) {
  return (
    <div className="p-4 rounded-lg bg-accent/50 group">
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <code className="text-lg font-mono font-medium">{group.name}</code>
            {group.key_exchange && (
              <Badge variant="outline" className="uppercase">
                {group.key_exchange}
              </Badge>
            )}
          </div>
          <div className="flex gap-2 flex-wrap">
            {group.lifetime && (
              <Badge variant="secondary" className="text-xs">
                Lifetime: {group.lifetime}s
              </Badge>
            )}
            {group.mode && (
              <Badge variant="secondary" className="text-xs">
                Mode: {group.mode}
              </Badge>
            )}
            {group.dead_peer_detection && (
              <Badge variant="secondary" className="text-xs">
                DPD: {group.dead_peer_detection.action}
              </Badge>
            )}
          </div>
          {group.proposals.length > 0 && (
            <div className="mt-2">
              <p className="text-xs text-muted-foreground mb-1">Proposals:</p>
              <div className="flex gap-2 flex-wrap">
                {group.proposals.map((prop) => (
                  <Badge key={prop.id} variant="outline" className="text-xs font-mono">
                    {prop.encryption}/{prop.hash}/DH{prop.dh_group}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive"
          onClick={onDelete}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

// ESP Group Card Component
function ESPGroupCard({
  group,
  onDelete,
}: {
  group: ESPGroup;
  onDelete: () => void;
}) {
  return (
    <div className="p-4 rounded-lg bg-accent/50 group">
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <code className="text-lg font-mono font-medium">{group.name}</code>
            <Badge variant="outline">{group.mode}</Badge>
          </div>
          <div className="flex gap-2 flex-wrap">
            {group.lifetime && (
              <Badge variant="secondary" className="text-xs">
                Lifetime: {group.lifetime}s
              </Badge>
            )}
            {group.pfs && (
              <Badge variant="secondary" className="text-xs">
                PFS: {group.pfs}
              </Badge>
            )}
            {group.compression && (
              <Badge variant="secondary" className="text-xs">
                Compression
              </Badge>
            )}
          </div>
          {group.proposals.length > 0 && (
            <div className="mt-2">
              <p className="text-xs text-muted-foreground mb-1">Proposals:</p>
              <div className="flex gap-2 flex-wrap">
                {group.proposals.map((prop) => (
                  <Badge key={prop.id} variant="outline" className="text-xs font-mono">
                    {prop.encryption}/{prop.hash}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive"
          onClick={onDelete}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

// Peer Card Component
function PeerCard({
  peer,
  onDelete,
  onToggle,
  onAddTunnel,
  onDeleteTunnel,
}: {
  peer: SiteToSitePeer;
  onDelete: () => void;
  onToggle: () => void;
  onAddTunnel: () => void;
  onDeleteTunnel: (tunnelId: string) => void;
}) {
  return (
    <div className="p-4 rounded-lg bg-accent/50 group">
      <div className="flex items-start justify-between">
        <div className="space-y-3 flex-1">
          {/* Header */}
          <div className="flex items-center gap-3">
            <code className="text-lg font-mono font-medium">{peer.address}</code>
            <Badge
              variant={peer.disable ? "destructive" : "default"}
              className={cn(
                !peer.disable && "bg-green-500/10 text-green-500 border-green-500/20"
              )}
            >
              {peer.disable ? (
                <>
                  <XCircle className="h-3 w-3 mr-1" />
                  Disabled
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  Active
                </>
              )}
            </Badge>
          </div>

          {/* Description */}
          {peer.description && (
            <p className="text-sm text-muted-foreground">{peer.description}</p>
          )}

          {/* Details */}
          <div className="flex gap-2 flex-wrap">
            {peer.local_address && (
              <Badge variant="secondary" className="text-xs">
                Local: {peer.local_address}
              </Badge>
            )}
            {peer.ike_group && (
              <Badge variant="secondary" className="text-xs">
                IKE: {peer.ike_group}
              </Badge>
            )}
            {peer.authentication?.mode && (
              <Badge variant="secondary" className="text-xs">
                Auth: {peer.authentication.mode}
              </Badge>
            )}
            {peer.connection_type && (
              <Badge variant="secondary" className="text-xs capitalize">
                {peer.connection_type}
              </Badge>
            )}
          </div>

          {/* Tunnels */}
          {peer.tunnels.length > 0 && (
            <div className="mt-3 pt-3 border-t border-border/50">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-muted-foreground font-medium">
                  Tunnels ({peer.tunnels.length})
                </p>
                <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={onAddTunnel}>
                  <Plus className="h-3 w-3 mr-1" />
                  Add
                </Button>
              </div>
              <div className="space-y-2">
                {peer.tunnels.map((tunnel) => (
                  <div
                    key={tunnel.id}
                    className="flex items-center justify-between p-2 rounded bg-background/50"
                  >
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="font-mono text-xs">
                        #{tunnel.id}
                      </Badge>
                      <span className="text-xs font-mono">
                        {tunnel.local_prefix} → {tunnel.remote_prefix}
                      </span>
                      {tunnel.esp_group && (
                        <Badge variant="secondary" className="text-xs">
                          ESP: {tunnel.esp_group}
                        </Badge>
                      )}
                      {tunnel.disable && (
                        <Badge variant="destructive" className="text-xs">
                          Disabled
                        </Badge>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                      onClick={() => onDeleteTunnel(tunnel.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {peer.tunnels.length === 0 && (
            <Button variant="outline" size="sm" className="mt-2" onClick={onAddTunnel}>
              <Plus className="h-4 w-4 mr-2" />
              Add Tunnel
            </Button>
          )}
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onToggle}>
              {peer.disable ? (
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
            <DropdownMenuItem onClick={onDelete} className="text-destructive focus:text-destructive">
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
