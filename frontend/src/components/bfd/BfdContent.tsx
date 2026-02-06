"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Activity,
  Plus,
  RefreshCw,
  Pencil,
  Trash2,
  Radio,
  FileSliders,
} from "lucide-react";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import {
  bfdService,
  BfdConfig,
  BfdCapabilities,
  BfdPeer,
  BfdProfile,
} from "@/lib/api/bfd";
import { BfdPeerModal } from "./BfdPeerModal";
import { DeleteBfdPeerModal } from "./DeleteBfdPeerModal";
import { BfdProfileModal } from "./BfdProfileModal";
import { DeleteBfdProfileModal } from "./DeleteBfdProfileModal";

export function BfdContent() {
  const [config, setConfig] = useState<BfdConfig | null>(null);
  const [capabilities, setCapabilities] = useState<BfdCapabilities | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("peers");

  // Peer modal state
  const [peerModalOpen, setPeerModalOpen] = useState(false);
  const [editingPeer, setEditingPeer] = useState<BfdPeer | null>(null);
  const [deletingPeer, setDeletingPeer] = useState<string | null>(null);

  // Profile modal state
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [editingProfile, setEditingProfile] = useState<BfdProfile | null>(null);
  const [deletingProfile, setDeletingProfile] = useState<string | null>(null);

  const loadData = useCallback(async (refresh = false) => {
    try {
      setLoading(true);
      setError(null);
      const [configData, capData] = await Promise.all([
        bfdService.getConfig(refresh),
        bfdService.getCapabilities(),
      ]);
      setConfig(configData);
      setCapabilities(capData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load BFD configuration");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Stats
  const peerCount = config?.peers.length ?? 0;
  const profileCount = config?.profiles.length ?? 0;
  const activePeers = config?.peers.filter((p) => !p.shutdown).length ?? 0;
  const multihopPeers = config?.peers.filter((p) => p.multihop).length ?? 0;

  // ==========================================================================
  // Peer handlers
  // ==========================================================================

  const handleCreatePeer = async (peer: BfdPeer) => {
    await bfdService.createPeer(peer);
    await loadData(true);
  };

  const handleUpdatePeer = async (peer: BfdPeer) => {
    if (!editingPeer) return;
    await bfdService.updatePeer(editingPeer, peer);
    setEditingPeer(null);
    await loadData(true);
  };

  const handleDeletePeer = async () => {
    if (!deletingPeer) return;
    await bfdService.deletePeer(deletingPeer);
    setDeletingPeer(null);
    await loadData(true);
  };

  // ==========================================================================
  // Profile handlers
  // ==========================================================================

  const handleCreateProfile = async (profile: BfdProfile) => {
    await bfdService.createProfile(profile);
    await loadData(true);
  };

  const handleUpdateProfile = async (profile: BfdProfile) => {
    if (!editingProfile) return;
    await bfdService.updateProfile(editingProfile, profile);
    setEditingProfile(null);
    await loadData(true);
  };

  const handleDeleteProfile = async () => {
    if (!deletingProfile) return;
    await bfdService.deleteProfile(deletingProfile);
    setDeletingProfile(null);
    await loadData(true);
  };

  // ==========================================================================
  // Helper: format interval display
  // ==========================================================================

  const formatMs = (val: number | null, defaultVal: string) => {
    if (val == null) return defaultVal;
    return `${val}ms`;
  };

  // ==========================================================================
  // Render
  // ==========================================================================

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
              <h1 className="text-2xl font-bold text-foreground">BFD</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Bidirectional Forwarding Detection for rapid failure detection
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => loadData(true)}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-md bg-destructive/10 text-destructive text-sm">
              {error}
            </div>
          )}

          {/* Stats */}
          <div className="grid grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-md p-2 bg-primary/10">
                    <Radio className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{peerCount}</p>
                    <p className="text-xs text-muted-foreground">Peers</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-md p-2 bg-green-500/10">
                    <Activity className="h-4 w-4 text-green-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{activePeers}</p>
                    <p className="text-xs text-muted-foreground">Active</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-md p-2 bg-blue-500/10">
                    <FileSliders className="h-4 w-4 text-blue-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{profileCount}</p>
                    <p className="text-xs text-muted-foreground">Profiles</p>
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
                    <p className="text-2xl font-bold">{multihopPeers}</p>
                    <p className="text-xs text-muted-foreground">Multihop</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Tabs Content */}
        <div className="flex-1 p-6 pt-4 overflow-auto">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-4">
              <TabsTrigger value="peers">
                Peers
                {peerCount > 0 && (
                  <Badge variant="secondary" className="ml-2">{peerCount}</Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="profiles">
                Profiles
                {profileCount > 0 && (
                  <Badge variant="secondary" className="ml-2">{profileCount}</Badge>
                )}
              </TabsTrigger>
            </TabsList>

            {/* ============================================================ */}
            {/* Peers Tab */}
            {/* ============================================================ */}
            <TabsContent value="peers">
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm text-muted-foreground">
                  Configure BFD sessions with remote peers for failure detection
                </p>
                <Button size="sm" onClick={() => { setEditingPeer(null); setPeerModalOpen(true); }}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Peer
                </Button>
              </div>

              {peerCount === 0 ? (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <Radio className="h-12 w-12 text-muted-foreground/30 mb-4" />
                    <p className="text-sm text-muted-foreground mb-2">No BFD peers configured</p>
                    <p className="text-xs text-muted-foreground mb-4">
                      Add a peer to start monitoring forwarding path health
                    </p>
                    <Button size="sm" onClick={() => { setEditingPeer(null); setPeerModalOpen(true); }}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Peer
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <ScrollArea>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Peer Address</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Mode</TableHead>
                          <TableHead>Tx / Rx</TableHead>
                          <TableHead>Multiplier</TableHead>
                          <TableHead>Profile</TableHead>
                          <TableHead>Source</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {config?.peers.map((peer) => (
                          <TableRow key={peer.address}>
                            <TableCell className="font-medium font-mono">
                              {peer.address}
                              {peer.vrf && (
                                <Badge variant="outline" className="ml-2 text-xs">
                                  VRF: {peer.vrf}
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              {peer.shutdown ? (
                                <Badge variant="secondary" className="bg-red-500/10 text-red-600">
                                  Shutdown
                                </Badge>
                              ) : (
                                <Badge variant="secondary" className="bg-green-500/10 text-green-600">
                                  Active
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-wrap gap-1">
                                {peer.multihop && (
                                  <Badge variant="outline" className="text-xs">Multihop</Badge>
                                )}
                                {peer.echo_mode && (
                                  <Badge variant="outline" className="text-xs">Echo</Badge>
                                )}
                                {peer.passive && (
                                  <Badge variant="outline" className="text-xs">Passive</Badge>
                                )}
                                {!peer.multihop && !peer.echo_mode && !peer.passive && (
                                  <span className="text-muted-foreground">-</span>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="font-mono text-sm">
                              {formatMs(peer.interval.transmit, "300")} / {formatMs(peer.interval.receive, "300")}
                            </TableCell>
                            <TableCell>
                              {peer.interval.multiplier ?? <span className="text-muted-foreground">3</span>}
                            </TableCell>
                            <TableCell>
                              {peer.profile ? (
                                <Badge variant="secondary">{peer.profile}</Badge>
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </TableCell>
                            <TableCell className="font-mono text-sm">
                              {peer.source.address || peer.source.interface || (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() => {
                                    setEditingPeer(peer);
                                    setPeerModalOpen(true);
                                  }}
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-destructive hover:text-destructive"
                                  onClick={() => setDeletingPeer(peer.address)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                </Card>
              )}
            </TabsContent>

            {/* ============================================================ */}
            {/* Profiles Tab */}
            {/* ============================================================ */}
            <TabsContent value="profiles">
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm text-muted-foreground">
                  Reusable timer templates that can be assigned to peers
                </p>
                <Button size="sm" onClick={() => { setEditingProfile(null); setProfileModalOpen(true); }}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Profile
                </Button>
              </div>

              {profileCount === 0 ? (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <FileSliders className="h-12 w-12 text-muted-foreground/30 mb-4" />
                    <p className="text-sm text-muted-foreground mb-2">No BFD profiles configured</p>
                    <p className="text-xs text-muted-foreground mb-4">
                      Create a profile to define reusable timer settings for peers
                    </p>
                    <Button size="sm" onClick={() => { setEditingProfile(null); setProfileModalOpen(true); }}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Profile
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <ScrollArea>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Profile Name</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Mode</TableHead>
                          <TableHead>Tx / Rx</TableHead>
                          <TableHead>Multiplier</TableHead>
                          <TableHead>Min TTL</TableHead>
                          <TableHead>Used By</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {config?.profiles.map((profile) => {
                          const usedByCount = config.peers.filter(
                            (p) => p.profile === profile.name
                          ).length;

                          return (
                            <TableRow key={profile.name}>
                              <TableCell className="font-medium font-mono">
                                {profile.name}
                              </TableCell>
                              <TableCell>
                                {profile.shutdown ? (
                                  <Badge variant="secondary" className="bg-red-500/10 text-red-600">
                                    Shutdown
                                  </Badge>
                                ) : (
                                  <Badge variant="secondary" className="bg-green-500/10 text-green-600">
                                    Active
                                  </Badge>
                                )}
                              </TableCell>
                              <TableCell>
                                <div className="flex flex-wrap gap-1">
                                  {profile.echo_mode && (
                                    <Badge variant="outline" className="text-xs">Echo</Badge>
                                  )}
                                  {profile.passive && (
                                    <Badge variant="outline" className="text-xs">Passive</Badge>
                                  )}
                                  {!profile.echo_mode && !profile.passive && (
                                    <span className="text-muted-foreground">-</span>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell className="font-mono text-sm">
                                {formatMs(profile.interval.transmit, "300")} / {formatMs(profile.interval.receive, "300")}
                              </TableCell>
                              <TableCell>
                                {profile.interval.multiplier ?? <span className="text-muted-foreground">3</span>}
                              </TableCell>
                              <TableCell>
                                {profile.minimum_ttl ?? <span className="text-muted-foreground">-</span>}
                              </TableCell>
                              <TableCell>
                                {usedByCount > 0 ? (
                                  <Badge variant="secondary">
                                    {usedByCount} peer{usedByCount !== 1 ? "s" : ""}
                                  </Badge>
                                ) : (
                                  <span className="text-muted-foreground">None</span>
                                )}
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex items-center justify-end gap-1">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8"
                                    onClick={() => {
                                      setEditingProfile(profile);
                                      setProfileModalOpen(true);
                                    }}
                                  >
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-destructive hover:text-destructive"
                                    onClick={() => setDeletingProfile(profile.name)}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Modals */}
      <BfdPeerModal
        open={peerModalOpen}
        onOpenChange={(open) => {
          setPeerModalOpen(open);
          if (!open) setEditingPeer(null);
        }}
        existingPeer={editingPeer}
        profiles={config?.profiles.map((p) => p.name) ?? []}
        capabilities={capabilities}
        onSubmit={editingPeer ? handleUpdatePeer : handleCreatePeer}
      />

      <DeleteBfdPeerModal
        open={!!deletingPeer}
        onOpenChange={(open) => { if (!open) setDeletingPeer(null); }}
        peerAddress={deletingPeer ?? ""}
        onConfirm={handleDeletePeer}
      />

      <BfdProfileModal
        open={profileModalOpen}
        onOpenChange={(open) => {
          setProfileModalOpen(open);
          if (!open) setEditingProfile(null);
        }}
        existingProfile={editingProfile}
        onSubmit={editingProfile ? handleUpdateProfile : handleCreateProfile}
      />

      <DeleteBfdProfileModal
        open={!!deletingProfile}
        onOpenChange={(open) => { if (!open) setDeletingProfile(null); }}
        profileName={deletingProfile ?? ""}
        onConfirm={handleDeleteProfile}
      />
    </>
  );
}
