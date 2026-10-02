"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
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
  Waypoints,
} from "lucide-react";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import {
  bfdService,
  BfdConfig,
  BfdCapabilities,
  BfdPeer,
  BfdProfile,
  BfdPeerStatus,
} from "@/lib/api/bfd";
import { BfdPeerModal } from "./BfdPeerModal";
import { DeleteBfdPeerModal } from "./DeleteBfdPeerModal";
import { BfdProfileModal } from "./BfdProfileModal";
import { DeleteBfdProfileModal } from "./DeleteBfdProfileModal";

export function BfdContent() {
  const t = useTranslations("bfd");
  const tc = useTranslations("common");
  const [config, setConfig] = useState<BfdConfig | null>(null);
  const [capabilities, setCapabilities] = useState<BfdCapabilities | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("peers");

  // Live (operational) BFD sessions — includes dynamic peers from routing protocols
  const [liveSessions, setLiveSessions] = useState<BfdPeerStatus[]>([]);
  const [liveLoading, setLiveLoading] = useState(false);
  const [liveError, setLiveError] = useState<string | null>(null);

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
      setError(err instanceof Error ? err.message : t("content.loadConfigFailed"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  const loadLiveSessions = useCallback(async () => {
    try {
      setLiveLoading(true);
      setLiveError(null);
      const status = await bfdService.getStatus();
      setLiveSessions(status.peers);
    } catch (err) {
      setLiveError(err instanceof Error ? err.message : t("content.loadLiveFailed"));
    } finally {
      setLiveLoading(false);
    }
  }, [t]);

  useEffect(() => {
    loadData();
    loadLiveSessions();
  }, [loadData, loadLiveSessions]);

  // Stats
  const peerCount = config?.peers.length ?? 0;
  const profileCount = config?.profiles.length ?? 0;
  const liveCount = liveSessions.length;
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
              <h1 className="text-2xl font-bold text-foreground">BFD</h1>
              <p className="text-sm text-muted-foreground mt-1">
                {t("content.subtitle")}
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => { loadData(true); loadLiveSessions(); }}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              {tc("refresh")}
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
                    <p className="text-xs text-muted-foreground">{t("content.peers")}</p>
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
                    <p className="text-xs text-muted-foreground">{t("content.active")}</p>
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
                    <p className="text-xs text-muted-foreground">{t("content.profiles")}</p>
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
                    <p className="text-xs text-muted-foreground">{t("content.multihop")}</p>
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
                {t("content.peers")}
                {peerCount > 0 && (
                  <Badge variant="secondary" className="ml-2">{peerCount}</Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="live">
                {t("content.liveSessions")}
                {liveCount > 0 && (
                  <Badge variant="secondary" className="ml-2">{liveCount}</Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="profiles">
                {t("content.profiles")}
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
                  {t("content.peersDescription")}
                </p>
                <Button size="sm" onClick={() => { setEditingPeer(null); setPeerModalOpen(true); }}>
                  <Plus className="h-4 w-4 mr-2" />
                  {t("content.addPeer")}
                </Button>
              </div>

              {peerCount === 0 ? (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <Radio className="h-12 w-12 text-muted-foreground/30 mb-4" />
                    <p className="text-sm text-muted-foreground mb-2">{t("content.noPeers")}</p>
                    <p className="text-xs text-muted-foreground mb-4">
                      {t("content.noPeersHint")}
                    </p>
                    <Button size="sm" onClick={() => { setEditingPeer(null); setPeerModalOpen(true); }}>
                      <Plus className="h-4 w-4 mr-2" />
                      {t("content.addPeer")}
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <ScrollArea>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>{t("content.peerAddress")}</TableHead>
                          <TableHead>{tc("status")}</TableHead>
                          <TableHead>{t("content.mode")}</TableHead>
                          <TableHead>{t("content.txRx")}</TableHead>
                          <TableHead>{t("content.multiplier")}</TableHead>
                          <TableHead>{t("content.profile")}</TableHead>
                          <TableHead>{t("content.source")}</TableHead>
                          <TableHead className="text-right">{tc("actions")}</TableHead>
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
                                  {t("content.shutdown")}
                                </Badge>
                              ) : (
                                <Badge variant="secondary" className="bg-green-500/10 text-green-600">
                                  {t("content.active")}
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-wrap gap-1">
                                {peer.multihop && (
                                  <Badge variant="outline" className="text-xs">{t("content.multihop")}</Badge>
                                )}
                                {peer.echo_mode && (
                                  <Badge variant="outline" className="text-xs">{t("content.echo")}</Badge>
                                )}
                                {peer.passive && (
                                  <Badge variant="outline" className="text-xs">{t("content.passive")}</Badge>
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
            {/* Live Sessions Tab (operational, includes dynamic peers) */}
            {/* ============================================================ */}
            <TabsContent value="live">
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm text-muted-foreground">
                  {t("content.liveDescription")}
                </p>
                <Button variant="outline" size="sm" onClick={loadLiveSessions} disabled={liveLoading}>
                  <RefreshCw className={`h-4 w-4 mr-2 ${liveLoading ? "animate-spin" : ""}`} />
                  {tc("refresh")}
                </Button>
              </div>

              {liveError && (
                <div className="mb-4 p-3 rounded-md bg-destructive/10 text-destructive text-sm">
                  {liveError}
                </div>
              )}

              {liveCount === 0 ? (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <Waypoints className="h-12 w-12 text-muted-foreground/30 mb-4" />
                    <p className="text-sm text-muted-foreground mb-2">{t("content.noLiveSessions")}</p>
                    <p className="text-xs text-muted-foreground">
                      {t("content.noLiveSessionsHint")}
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <ScrollArea>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>{t("content.peer")}</TableHead>
                          <TableHead>{t("content.type")}</TableHead>
                          <TableHead>{tc("status")}</TableHead>
                          <TableHead>{t("content.interface")}</TableHead>
                          <TableHead>VRF</TableHead>
                          <TableHead>{t("content.uptime")}</TableHead>
                          <TableHead>{t("content.txRx")}</TableHead>
                          <TableHead>{t("content.multiplier")}</TableHead>
                          <TableHead>{t("content.diagnostic")}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {liveSessions.map((s, idx) => (
                          <TableRow key={`${s.peer}-${s.vrf ?? ""}-${s.interface ?? ""}-${idx}`}>
                            <TableCell className="font-medium font-mono">
                              {s.peer}
                              {s.multihop && (
                                <Badge variant="outline" className="ml-2 text-xs">{t("content.multihop")}</Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              <Badge variant={s.peer_type === "dynamic" ? "secondary" : "outline"}>
                                {s.peer_type ?? t("content.unknown")}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {s.status === "up" ? (
                                <Badge variant="secondary" className="bg-green-500/10 text-green-600">{t("content.sessionUp")}</Badge>
                              ) : (
                                <Badge variant="secondary" className="bg-red-500/10 text-red-600">
                                  {s.status ? s.status.charAt(0).toUpperCase() + s.status.slice(1) : t("content.sessionDown")}
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell className="font-mono text-sm">
                              {s.interface || <span className="text-muted-foreground">-</span>}
                            </TableCell>
                            <TableCell className="font-mono text-sm">
                              {s.vrf || <span className="text-muted-foreground">-</span>}
                            </TableCell>
                            <TableCell className="text-sm">
                              {s.status === "up"
                                ? (s.uptime || <span className="text-muted-foreground">-</span>)
                                : <span className="text-muted-foreground">{s.downtime || "-"}</span>}
                            </TableCell>
                            <TableCell className="font-mono text-sm">
                              {s.transmit_interval != null ? `${s.transmit_interval}ms` : "300ms"} / {s.receive_interval != null ? `${s.receive_interval}ms` : "300ms"}
                            </TableCell>
                            <TableCell>
                              {s.detect_multiplier ?? <span className="text-muted-foreground">3</span>}
                            </TableCell>
                            <TableCell className="text-sm">
                              {s.diagnostic || <span className="text-muted-foreground">-</span>}
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
                  {t("content.profilesDescription")}
                </p>
                <Button size="sm" onClick={() => { setEditingProfile(null); setProfileModalOpen(true); }}>
                  <Plus className="h-4 w-4 mr-2" />
                  {t("content.addProfile")}
                </Button>
              </div>

              {profileCount === 0 ? (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <FileSliders className="h-12 w-12 text-muted-foreground/30 mb-4" />
                    <p className="text-sm text-muted-foreground mb-2">{t("content.noProfiles")}</p>
                    <p className="text-xs text-muted-foreground mb-4">
                      {t("content.noProfilesHint")}
                    </p>
                    <Button size="sm" onClick={() => { setEditingProfile(null); setProfileModalOpen(true); }}>
                      <Plus className="h-4 w-4 mr-2" />
                      {t("content.addProfile")}
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <ScrollArea>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>{t("content.profileName")}</TableHead>
                          <TableHead>{tc("status")}</TableHead>
                          <TableHead>{t("content.mode")}</TableHead>
                          <TableHead>{t("content.txRx")}</TableHead>
                          <TableHead>{t("content.multiplier")}</TableHead>
                          <TableHead>{t("content.minTtl")}</TableHead>
                          <TableHead>{t("content.usedBy")}</TableHead>
                          <TableHead className="text-right">{tc("actions")}</TableHead>
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
                                    {t("content.shutdown")}
                                  </Badge>
                                ) : (
                                  <Badge variant="secondary" className="bg-green-500/10 text-green-600">
                                    {t("content.active")}
                                  </Badge>
                                )}
                              </TableCell>
                              <TableCell>
                                <div className="flex flex-wrap gap-1">
                                  {profile.echo_mode && (
                                    <Badge variant="outline" className="text-xs">{t("content.echo")}</Badge>
                                  )}
                                  {profile.passive && (
                                    <Badge variant="outline" className="text-xs">{t("content.passive")}</Badge>
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
                                    {t("content.peerCount", { count: usedByCount })}
                                  </Badge>
                                ) : (
                                  <span className="text-muted-foreground">{tc("none")}</span>
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
