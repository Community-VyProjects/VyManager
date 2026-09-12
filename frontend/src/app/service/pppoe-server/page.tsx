"use client";

export const dynamic = "force-dynamic";

import { useState, useEffect, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Lock,
  Plus,
  RefreshCw,
  Loader2,
  AlertCircle,
  Pencil,
  Trash2,
  Server,
  Network,
  Key,
  User,
  Activity,
  RotateCcw,
  Cable,
  ChevronLeft,
  ChevronRight,
  Pause,
  Play,
  Search,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  pppoeServerService,
  type PPPoEConfigResponse,
  type PPPoECapabilities,
  type PPPoEInterface,
  type PPPoELocalUser,
  type PPPoERadiusServer,
  type PPPoEIPv4Pool,
  type PPPoEIPv6Pool,
  type PPPoESession,
} from "@/lib/api/pppoe-server";
import { usePermissions } from "@/hooks/usePermissions";
import { useDashboardSSE } from "@/hooks/useDashboardSSE";
import { FeatureGroup } from "@/lib/api/user-management";
import {
  DeleteConfirmModal,
  GeneralSettingsModal,
  AuthSettingsModal,
  LocalUserModal,
  RadiusServerModal,
  RadiusSettingsModal,
  IPPoolModal,
  IPv6PoolModal,
  InterfaceModal,
  PPPOptionsModal,
  AdvancedSettingsModal,
  PPPoEStatsChart,
} from "@/components/pppoe-server";
import type { PPPoEStatsPoint } from "@/components/pppoe-server/PPPoEStatsChart";

function PPPoEPageInner() {
  const searchParams = useSearchParams();
  const { canRead, canWrite } = usePermissions();
  const hasRead = canRead(FeatureGroup.PPPOE);
  const hasWrite = canWrite(FeatureGroup.PPPOE);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [config, setConfig] = useState<PPPoEConfigResponse | null>(null);
  const [capabilities, setCapabilities] = useState<PPPoECapabilities | null>(null);
  const [sessions, setSessions] = useState<SessionWithRates[]>([]);
  const [sessionTotal, setSessionTotal] = useState(0);
  const [sessionLoading, setSessionLoading] = useState(false);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const previousSessionBytes = useRef<Record<string, { rx: number; tx: number; at: number }>>({});
  const [statsHistory, setStatsHistory] = useState<Record<string, PPPoEStatsPoint[]>>({});
  const [selectedStatsKey, setSelectedStatsKey] = useState<string | null>(null);
  const [sessionPaused, setSessionPaused] = useState(false);
  const [sessionSearch, setSessionSearch] = useState("");
  const [minPps, setMinPps] = useState("");
  const [maxPps, setMaxPps] = useState("");
  const [ipv6Filter, setIpv6Filter] = useState<"all" | "yes" | "no">("all");
  const [vlanFilter, setVlanFilter] = useState("");
  const [mtuFilter, setMtuFilter] = useState("");
  const [sessionPage, setSessionPage] = useState(1);
  const sessionPageSize = 50;
  const [connectionDialog, setConnectionDialog] = useState<{
    username: string;
    interfaceName: string;
    ip: string;
  } | null>(null);
  const [connections, setConnections] = useState<string[]>([]);
  const [connectionsLoading, setConnectionsLoading] = useState(false);
  const [connectionsError, setConnectionsError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("overview");

  // Modal state
  const [showGeneralModal, setShowGeneralModal] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showPPPOptionsModal, setShowPPPOptionsModal] = useState(false);
  const [showAdvancedModal, setShowAdvancedModal] = useState(false);
  const [showRadiusSettingsModal, setShowRadiusSettingsModal] = useState(false);

  const [showLocalUserModal, setShowLocalUserModal] = useState(false);
  const [editingLocalUser, setEditingLocalUser] = useState<PPPoELocalUser | null>(null);

  const [showRadiusServerModal, setShowRadiusServerModal] = useState(false);
  const [editingRadiusServer, setEditingRadiusServer] = useState<PPPoERadiusServer | null>(null);

  const [showIPPoolModal, setShowIPPoolModal] = useState(false);
  const [editingIPPool, setEditingIPPool] = useState<PPPoEIPv4Pool | null>(null);

  const [showIPv6PoolModal, setShowIPv6PoolModal] = useState(false);
  const [editingIPv6Pool, setEditingIPv6Pool] = useState<PPPoEIPv6Pool | null>(null);

  const [showInterfaceModal, setShowInterfaceModal] = useState(false);
  const [editingInterface, setEditingInterface] = useState<PPPoEInterface | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<{
    type: string;
    name: string;
    onDelete: () => Promise<import("@/lib/api/pppoe-server").VyOSResponse>;
    warning?: string;
    actionLabel?: string;
    actionVerb?: string;
  } | null>(null);

  const fetchConfig = async (refresh = false) => {
    try {
      setLoading(true);
      setError(null);
      const [configData, capsData] = await Promise.all([
        pppoeServerService.getConfig(refresh),
        pppoeServerService.getCapabilities(),
      ]);
      setConfig(configData);
      setCapabilities(capsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load PPPoE configuration");
    } finally {
      setLoading(false);
    }
  };

  const applySessions = (response: { sessions: PPPoESession[]; total: number }) => {
    const now = Date.now();
    const nextSessions = response.sessions.map((session) => {
      const key = `${session.interface}:${session.username}:${session.calling_sid ?? ""}`;
      const previous = previousSessionBytes.current[key];
      const elapsed = previous ? (now - previous.at) / 1000 : 0;
      const result: SessionWithRates = { ...session };
      if (previous && elapsed > 0) {
        result.rxRate = Math.max(0, (session.rx_bytes - previous.rx) * 8 / elapsed);
        result.txRate = Math.max(0, (session.tx_bytes - previous.tx) * 8 / elapsed);
      }
      result.rxPps = session.rx_pps ?? undefined;
      result.txPps = session.tx_pps ?? undefined;
      previousSessionBytes.current[key] = { rx: session.rx_bytes, tx: session.tx_bytes, at: now };
      return result;
    });
    setSessions(nextSessions);
    setSessionTotal(response.total);
    setStatsHistory((previous) => {
      const next = { ...previous };
      for (const session of nextSessions) {
        const key = `${session.interface}:${session.username}:${session.calling_sid ?? ""}`;
        const point: PPPoEStatsPoint = {
          timestamp: now,
          rxRate: session.rxRate ?? 0,
          txRate: session.txRate ?? 0,
          rxPps: session.rxPps ?? 0,
          txPps: session.txPps ?? 0,
          rxBytes: session.rx_bytes,
          txBytes: session.tx_bytes,
        };
        next[key] = [...(next[key] ?? []), point]
          .filter((item) => item.timestamp >= now - 120_000)
          .slice(-120);
      }
      return next;
    });
    setSessionPage((page) => Math.min(page, Math.max(1, Math.ceil(nextSessions.length / sessionPageSize))));
  };

  const fetchSessions = async () => {
    try {
      setSessionLoading(true);
      setSessionError(null);
      const response = await pppoeServerService.getSessions(500);
      applySessions(response);
    } catch (err) {
      setSessionError(err instanceof Error ? err.message : "Failed to load active sessions");
    } finally {
      setSessionLoading(false);
    }
  };

  const liveSessions = hasRead && !sessionPaused;
  const { data: sessionStream, error: sessionStreamError } = useDashboardSSE({
    interests: ["pppoe-sessions"],
    enabled: liveSessions,
  });

  useEffect(() => {
    if (hasRead) fetchConfig();
  }, [hasRead]);

  useEffect(() => {
    setActiveTab(searchParams.get("tab") ?? "overview");
  }, [searchParams]);

  useEffect(() => {
    if (liveSessions) {
      setSessionLoading(true);
    }
  }, [liveSessions]);

  useEffect(() => {
    if (!sessionStream.pppoeSessions) return;
    setSessionError(null);
    applySessions(sessionStream.pppoeSessions);
    setSessionLoading(false);
  }, [sessionStream.pppoeSessions]);

  useEffect(() => {
    if (!sessionStreamError || !sessionStreamError.startsWith("pppoe-sessions:")) return;
    setSessionError(sessionStreamError.replace(/^pppoe-sessions:\s*/, "") || "Failed to load active sessions");
    setSessionLoading(false);
  }, [sessionStreamError]);

  const onSuccess = () => fetchConfig(true);
  const onSessionReset = () => { void fetchSessions(); };
  const sessionKey = (session: SessionWithRates) => `${session.interface}:${session.username}:${session.calling_sid ?? ""}`;

  const inspectConnections = async (session: SessionWithRates) => {
    if (!session.ip) return;
    setConnectionDialog({ username: session.username, interfaceName: session.interface, ip: session.ip });
    setConnections([]);
    setConnectionsError(null);
    setConnectionsLoading(true);
    try {
      const result = await pppoeServerService.getSessionConnections(session.interface, session.ip);
      setConnections(result.connections);
    } catch (err) {
      setConnectionsError(err instanceof Error ? err.message : "Failed to load connections");
    } finally {
      setConnectionsLoading(false);
    }
  };

  const filteredSessions = sessions.filter((session) => {
    const search = sessionSearch.trim().toLowerCase();
    const haystack = `${session.username} ${session.interface} ${session.ip ?? ""} ${session.ipv6 ?? ""} ${session.calling_sid ?? ""}`.toLowerCase();
    const pps = Math.max(session.rxPps ?? 0, session.txPps ?? 0);
    const minimum = minPps === "" ? null : Number(minPps);
    const maximum = maxPps === "" ? null : Number(maxPps);
    if (search && !haystack.includes(search)) return false;
    if (minimum !== null && (!Number.isFinite(minimum) || pps < minimum)) return false;
    if (maximum !== null && (!Number.isFinite(maximum) || pps > maximum)) return false;
    if (ipv6Filter === "yes" && !session.ipv6) return false;
    if (ipv6Filter === "no" && session.ipv6) return false;
    if (vlanFilter && !(session.vlan ?? "").toLowerCase().includes(vlanFilter.toLowerCase())) return false;
    if (mtuFilter && String(session.mtu ?? "") !== mtuFilter.trim()) return false;
    return true;
  });
  const filteredPageCount = Math.max(1, Math.ceil(filteredSessions.length / sessionPageSize));

  const authMode = config?.authentication.mode;
  const isLocalAuth = authMode === "local";
  const totals = config?.totals;

  if (loading && !config) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-[calc(100vh-200px)]">
          <div className="text-center space-y-4">
            <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
            <p className="text-muted-foreground">Loading PPPoE configuration...</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (error && !config) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-[calc(100vh-200px)]">
          <div className="text-center space-y-4">
            <AlertCircle className="h-12 w-12 text-destructive mx-auto" />
            <p className="text-destructive font-medium">Failed to load configuration</p>
            <p className="text-sm text-muted-foreground">{error}</p>
            <Button onClick={() => fetchConfig(true)}>
              <RefreshCw className="h-4 w-4 mr-2" /> Retry
            </Button>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="flex flex-col h-full overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b bg-background">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-primary/10">
                <Lock className="h-8 w-8 text-primary" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-bold">PPPoE Server</h1>
                  {config?.configured ? (
                    <Badge variant="secondary" className="bg-green-500/10 text-green-600">Configured</Badge>
                  ) : (
                    <Badge variant="secondary">Not Configured</Badge>
                  )}
                </div>
                <p className="text-muted-foreground">Manage Point-to-Point over Ethernet broadband access server</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {hasWrite && config?.configured && (
                <Button
                  variant="outline"
                  size="sm"
                  className="text-destructive hover:bg-destructive/10"
                  onClick={() => setDeleteTarget({
                    type: "PPPoE Server",
                    name: "entire PPPoE configuration",
                    onDelete: () => pppoeServerService.deletePPPoEServer(),
                    warning: "This will remove the entire PPPoE server configuration including all users, pools, and settings.",
                  })}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete PPPoE Server
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={() => fetchConfig(true)} disabled={loading}>
                <RefreshCw className={cn("h-4 w-4 mr-2", loading && "animate-spin")} />
                Refresh
              </Button>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mt-4">
            <Card className="p-3">
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-emerald-500" />
                <div>
                  <p className="text-xs text-muted-foreground">Connected Clients</p>
                  <p className="font-semibold">{sessionTotal}</p>
                </div>
              </div>
            </Card>
            <Card className="p-3">
              <div className="flex items-center gap-2">
                {isLocalAuth ? (
                  <User className="h-4 w-4 text-orange-500" />
                ) : (
                  <Server className="h-4 w-4 text-purple-500" />
                )}
                <div>
                  <p className="text-xs text-muted-foreground">{isLocalAuth ? "Local Users" : "RADIUS Servers"}</p>
                  <p className="font-semibold">{isLocalAuth ? (totals?.local_users ?? 0) : (totals?.radius_servers ?? 0)}</p>
                </div>
              </div>
            </Card>
            <Card className="p-3">
              <div className="flex items-center gap-2">
                <Network className="h-4 w-4 text-green-500" />
                <div>
                  <p className="text-xs text-muted-foreground">IP Pools</p>
                  <p className="font-semibold">{totals?.client_ip_pools ?? 0}</p>
                </div>
              </div>
            </Card>
            <Card className="p-3">
              <div className="flex items-center gap-2">
                <Network className="h-4 w-4 text-cyan-500" />
                <div>
                  <p className="text-xs text-muted-foreground">IPv6 Pools</p>
                  <p className="font-semibold">{totals?.client_ipv6_pools ?? 0}</p>
                </div>
              </div>
            </Card>
            <Card className="p-3">
              <div className="flex items-center gap-2">
                <Network className="h-4 w-4 text-blue-500" />
                <div>
                  <p className="text-xs text-muted-foreground">Interfaces</p>
                  <p className="font-semibold">{totals?.interfaces ?? 0}</p>
                </div>
              </div>
            </Card>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex-1 overflow-hidden">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col h-full">
            <div className="px-6 pt-4 border-b">
              <TabsList>
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="sessions">Sessions</TabsTrigger>
                <TabsTrigger value="interfaces">Interfaces</TabsTrigger>
                <TabsTrigger value="auth">Authentication</TabsTrigger>
                <TabsTrigger value="pools">IP Pools</TabsTrigger>
                <TabsTrigger value="ipv6pools">IPv6 Pools</TabsTrigger>
                <TabsTrigger value="ppp-options">PPP Options</TabsTrigger>
                <TabsTrigger value="advanced">Advanced</TabsTrigger>
              </TabsList>
            </div>

            <div className="flex-1 overflow-auto">
              <div className="p-6">

                {/* Overview Tab */}
                <TabsContent value="overview" className="mt-0">
                  <div className="grid grid-cols-2 gap-6">
                    <Card className="p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-medium">General Settings</h4>
                        {hasWrite && (
                          <Button variant="ghost" size="sm" onClick={() => setShowGeneralModal(true)}>
                            <Pencil className="h-3 w-3 mr-1" /> Edit
                          </Button>
                        )}
                      </div>
                      <div className="space-y-2 text-sm">
                        <InfoRow label="Description" value={config?.description} />
                        <InfoRow label="Access Concentrator" value={config?.access_concentrator} />
                        <InfoRow label="Service Name" value={config?.service_name} />
                        <InfoRow label="Gateway Addresses" value={(config?.gateway_addresses || []).join(", ")} />
                        <InfoRow label="Name Servers" value={(config?.name_servers || []).join(", ")} />
                        <InfoRow label="WINS Servers" value={(config?.wins_servers || []).join(", ")} />
                        <InfoRow label="MTU" value={config?.mtu} />
                        <InfoRow label="Max Sessions" value={config?.max_concurrent_sessions} />
                        <InfoRow label="Threads" value={config?.thread_count} />
                        <InfoRow label="Default Pool" value={config?.default_pool} />
                        <InfoRow label="Default IPv6 Pool" value={config?.default_ipv6_pool} />
                        <InfoRow label="Session Control" value={config?.session_control} />
                      </div>
                    </Card>

                    <Card className="p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-medium">PPP Options</h4>
                        {hasWrite && (
                          <Button variant="ghost" size="sm" onClick={() => setShowPPPOptionsModal(true)}>
                            <Pencil className="h-3 w-3 mr-1" /> Edit
                          </Button>
                        )}
                      </div>
                      <div className="space-y-2 text-sm">
                        <InfoRow label="IPv4" value={config?.ppp_options.ipv4} />
                        <InfoRow label="IPv6" value={config?.ppp_options.ipv6} />
                        <InfoRow label="MPPE" value={config?.ppp_options.mppe} />
                        <InfoRow label="Min MTU" value={config?.ppp_options.min_mtu} />
                        <InfoRow label="MRU" value={config?.ppp_options.mru} />
                        <InfoRow label="LCP Failure" value={config?.ppp_options.lcp_echo_failure} />
                        <InfoRow label="LCP Interval" value={config?.ppp_options.lcp_echo_interval} />
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Disable CCP</span>
                          <Badge variant={config?.ppp_options.disable_ccp ? "default" : "secondary"}>
                            {config?.ppp_options.disable_ccp ? "Yes" : "No"}
                          </Badge>
                        </div>
                      </div>
                    </Card>
                  </div>
                </TabsContent>

                <TabsContent value="sessions" className="mt-0">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="font-semibold">Active PPPoE Sessions</h3>
                      <p className="text-sm text-muted-foreground">
                        {sessionPaused ? "Updates paused." : "Live counters arrive with the dashboard stream."}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">{sessionTotal} sessions</span>
                      <Button variant="outline" size="sm" onClick={() => setSessionPaused((paused) => !paused)}>
                        {sessionPaused ? <Play className="h-4 w-4 mr-2" /> : <Pause className="h-4 w-4 mr-2" />}
                        {sessionPaused ? "Resume" : "Pause"}
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => void fetchSessions()} disabled={sessionLoading}>
                        <RefreshCw className={cn("h-4 w-4 mr-2", sessionLoading && "animate-spin")} />
                        Refresh
                      </Button>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 mb-4 rounded-md border bg-muted/20 p-3">
                    <div className="relative">
                      <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                      <Input value={sessionSearch} onChange={(event) => setSessionSearch(event.target.value)} placeholder="Search user, IP, interface" className="h-8 w-52 pl-8 text-xs" />
                    </div>
                    <Input value={minPps} onChange={(event) => setMinPps(event.target.value)} inputMode="numeric" placeholder="Min PPS" className="h-8 w-24 text-xs" />
                    <Input value={maxPps} onChange={(event) => setMaxPps(event.target.value)} inputMode="numeric" placeholder="Max PPS" className="h-8 w-24 text-xs" />
                    <select value={ipv6Filter} onChange={(event) => setIpv6Filter(event.target.value as "all" | "yes" | "no")} className="h-8 rounded-md border bg-background px-2 text-xs">
                      <option value="all">IPv6: All</option>
                      <option value="yes">IPv6: Present</option>
                      <option value="no">IPv6: Absent</option>
                    </select>
                    <Input value={vlanFilter} onChange={(event) => setVlanFilter(event.target.value)} placeholder="VLAN" className="h-8 w-20 text-xs" />
                    <Input value={mtuFilter} onChange={(event) => setMtuFilter(event.target.value)} inputMode="numeric" placeholder="MTU" className="h-8 w-20 text-xs" />
                    {(sessionSearch || minPps || maxPps || ipv6Filter !== "all" || vlanFilter || mtuFilter) && (
                      <Button variant="ghost" size="sm" className="h-8 px-2" onClick={() => { setSessionSearch(""); setMinPps(""); setMaxPps(""); setIpv6Filter("all"); setVlanFilter(""); setMtuFilter(""); }}>
                        <X className="h-3.5 w-3.5 mr-1" /> Clear
                      </Button>
                    )}
                    <span className="ml-auto text-xs text-muted-foreground">{filteredSessions.length} matching</span>
                  </div>
                  {sessionError ? (
                    <div className="rounded-md border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
                      {sessionError}
                    </div>
                  ) : sessions.length === 0 ? (
                    <EmptyState icon={Activity} label={sessionLoading ? "Loading active sessions..." : "No active PPPoE sessions"} />
                  ) : filteredSessions.length === 0 ? (
                    <EmptyState icon={Search} label="No sessions match the current filters" />
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>User</TableHead>
                          <TableHead>Interface</TableHead>
                          <TableHead>IP address</TableHead>
                          <TableHead>VLAN</TableHead>
                          <TableHead>MTU</TableHead>
                          <TableHead>Calling SID</TableHead>
                          <TableHead>Uptime</TableHead>
                          <TableHead>RX rate</TableHead>
                          <TableHead>TX rate</TableHead>
                          <TableHead className="text-right">Traffic total</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredSessions.slice((sessionPage - 1) * sessionPageSize, sessionPage * sessionPageSize).map((session) => (
                          <TableRow key={`${session.interface}:${session.username}:${session.calling_sid ?? ""}`}>
                            <TableCell className="font-medium">{session.username}</TableCell>
                            <TableCell className="font-mono">{session.interface}</TableCell>
                            <TableCell className="font-mono">
                              <div>{session.ip || "-"}</div>
                              {session.ipv6 && <div className="text-xs text-muted-foreground">{session.ipv6}</div>}
                              {session.ipv6_delegated && <div className="text-xs text-muted-foreground">PD: {session.ipv6_delegated}</div>}
                            </TableCell>
                            <TableCell>{session.vlan || "-"}</TableCell>
                            <TableCell>{session.mtu || "-"}</TableCell>
                            <TableCell className="font-mono text-xs">{session.calling_sid || "-"}</TableCell>
                            <TableCell>{session.uptime || "-"}</TableCell>
                            <TableCell>{formatRate(session.rxRate)} <span className="text-xs text-muted-foreground">/ {formatPps(session.rxPps)}</span></TableCell>
                            <TableCell>{formatRate(session.txRate)} <span className="text-xs text-muted-foreground">/ {formatPps(session.txPps)}</span></TableCell>
                            <TableCell className="text-right whitespace-nowrap">
                              {formatBytes(session.rx_bytes)} / {formatBytes(session.tx_bytes)}
                            </TableCell>
                            <TableCell className="text-right whitespace-nowrap">
                              <Button variant="ghost" size="icon" className="h-8 w-8" title={`Graph statistics for ${session.username}`} onClick={() => setSelectedStatsKey(sessionKey(session))}>
                                <Activity className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                title={`Inspect connections for ${session.username}`}
                                onClick={() => void inspectConnections(session)}
                                disabled={!session.ip}
                              >
                                <Cable className="h-4 w-4" />
                              </Button>
                            {hasWrite && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 hover:bg-destructive/10"
                                  title={`Reset sessions for ${session.username}`}
                                  onClick={() => setDeleteTarget({
                                    type: "PPPoE session",
                                    name: session.username,
                                    onDelete: () => pppoeServerService.resetSession(session.username),
                                    actionLabel: "Reset",
                                    actionVerb: "reset",
                                    warning: "This will terminate all active PPPoE sessions for this username and force the client to reconnect.",
                                  })}
                                >
                                  <RotateCcw className="h-4 w-4 text-destructive" />
                                </Button>
                            )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                  {selectedStatsKey && statsHistory[selectedStatsKey] && (
                    <Card className="mt-4 p-4">
                      <div className="mb-3 flex items-center justify-between">
                        <div>
                          <h4 className="font-medium">Session traffic history</h4>
                          <p className="text-xs text-muted-foreground">Select rate, PPS, or total traffic from the graph.</p>
                        </div>
                        <Button variant="ghost" size="sm" onClick={() => setSelectedStatsKey(null)}>Close</Button>
                      </div>
                      <PPPoEStatsChart points={statsHistory[selectedStatsKey]} />
                    </Card>
                  )}
                  {filteredSessions.length > sessionPageSize && (
                    <div className="flex items-center justify-between border-t mt-3 pt-3">
                      <span className="text-xs text-muted-foreground">
                        Page {sessionPage} of {Math.max(1, Math.ceil(filteredSessions.length / sessionPageSize))}
                      </span>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => setSessionPage((page) => Math.max(1, page - 1))}
                          disabled={sessionPage === 1}
                          title="Previous page"
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => setSessionPage((page) => Math.min(filteredPageCount, page + 1))}
                          disabled={sessionPage === filteredPageCount}
                          title="Next page"
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </TabsContent>

                {/* Interfaces Tab */}
                <TabsContent value="interfaces" className="mt-0">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold">Server Interfaces</h3>
                    {hasWrite && (
                      <Button size="sm" onClick={() => { setEditingInterface(null); setShowInterfaceModal(true); }}>
                        <Plus className="h-4 w-4 mr-1" /> Add Interface
                      </Button>
                    )}
                  </div>
                  {(config?.interfaces.length ?? 0) === 0 ? (
                    <EmptyState icon={Network} label="No interfaces configured" />
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Interface</TableHead>
                          <TableHead>VLANs</TableHead>
                          <TableHead>VLAN Mon</TableHead>
                          <TableHead>Combined</TableHead>
                          {hasWrite && <TableHead className="text-right">Actions</TableHead>}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {config?.interfaces.map((iface) => (
                          <TableRow key={iface.interface} className="group">
                            <TableCell className="font-medium font-mono">{iface.interface}</TableCell>
                            <TableCell>
                              <div className="flex flex-wrap gap-1">
                                {(iface.vlans || []).slice(0, 4).map((v) => (
                                  <Badge key={v} variant="secondary" className="text-xs font-mono">{v}</Badge>
                                ))}
                                {(iface.vlans || []).length > 4 && (
                                  <Badge variant="secondary" className="text-xs">+{(iface.vlans || []).length - 4}</Badge>
                                )}
                                {(iface.vlans || []).length === 0 && "-"}
                              </div>
                            </TableCell>
                            <TableCell>
                              {iface.vlan_mon ? (
                                <Badge variant="secondary" className="bg-green-500/10 text-green-600">Yes</Badge>
                              ) : "-"}
                            </TableCell>
                            <TableCell>{iface.combined || "-"}</TableCell>
                            {hasWrite && (
                              <TableCell className="text-right">
                                <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditingInterface(iface); setShowInterfaceModal(true); }}>
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                  <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-destructive/10" onClick={() => setDeleteTarget({
                                    type: "Interface",
                                    name: iface.interface,
                                    onDelete: () => pppoeServerService.deleteInterface(iface.interface),
                                  })}>
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                  </Button>
                                </div>
                              </TableCell>
                            )}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </TabsContent>

                {/* Authentication Tab */}
                <TabsContent value="auth" className="mt-0">
                  <div className="mb-6">
                    <Card className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-sm font-medium">Authentication Mode</h4>
                        {hasWrite && (
                          <Button variant="ghost" size="sm" onClick={() => setShowAuthModal(true)}>
                            <Pencil className="h-3 w-3 mr-1" /> Edit
                          </Button>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        <Key className="h-4 w-4 text-muted-foreground" />
                        <Badge variant="outline" className="text-sm">
                          {config?.authentication.mode || "Not set"}
                        </Badge>
                        {(config?.authentication.protocols || []).length > 0 && (
                          <div className="flex gap-1">
                            {(config?.authentication.protocols || []).map((p) => (
                              <Badge key={p} variant="secondary" className="font-mono text-xs">{p}</Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    </Card>
                  </div>

                  {isLocalAuth ? (
                    <>
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="font-semibold">Local Users</h3>
                        {hasWrite && (
                          <Button size="sm" onClick={() => { setEditingLocalUser(null); setShowLocalUserModal(true); }}>
                            <Plus className="h-4 w-4 mr-1" /> Add User
                          </Button>
                        )}
                      </div>
                      {(config?.authentication.local_users.length ?? 0) === 0 ? (
                        <EmptyState icon={User} label="No local users configured" />
                      ) : (
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Username</TableHead>
                              <TableHead>Static IP</TableHead>
                              <TableHead>Rate Down</TableHead>
                              <TableHead>Rate Up</TableHead>
                              <TableHead>Status</TableHead>
                              {hasWrite && <TableHead className="text-right">Actions</TableHead>}
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {config?.authentication.local_users.map((user) => (
                              <TableRow key={user.username} className="group">
                                <TableCell className="font-medium font-mono">{user.username}</TableCell>
                                <TableCell>
                                  {user.static_ip ? (
                                    <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{user.static_ip}</code>
                                  ) : "-"}
                                </TableCell>
                                <TableCell>{user.rate_limit?.download || "-"}</TableCell>
                                <TableCell>{user.rate_limit?.upload || "-"}</TableCell>
                                <TableCell>
                                  {user.disabled ? (
                                    <Badge variant="secondary" className="bg-red-500/10 text-red-600">Disabled</Badge>
                                  ) : (
                                    <Badge variant="secondary" className="bg-green-500/10 text-green-600">Active</Badge>
                                  )}
                                </TableCell>
                                {hasWrite && (
                                  <TableCell className="text-right">
                                    <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditingLocalUser(user); setShowLocalUserModal(true); }}>
                                        <Pencil className="h-4 w-4" />
                                      </Button>
                                      <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-destructive/10" onClick={() => setDeleteTarget({
                                        type: "Local User",
                                        name: user.username,
                                        onDelete: () => pppoeServerService.deleteLocalUser(user.username),
                                      })}>
                                        <Trash2 className="h-4 w-4 text-destructive" />
                                      </Button>
                                    </div>
                                  </TableCell>
                                )}
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      )}
                    </>
                  ) : (
                    <>
                      <div className="mb-6">
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="font-semibold">RADIUS Settings</h3>
                          {hasWrite && (
                            <Button variant="outline" size="sm" onClick={() => setShowRadiusSettingsModal(true)}>
                              <Pencil className="h-3 w-3 mr-1" /> Edit Settings
                            </Button>
                          )}
                        </div>
                        <div className="grid grid-cols-2 gap-6">
                          <Card className="p-4 space-y-2 text-sm">
                            <h4 className="text-sm font-medium mb-2">General</h4>
                            <InfoRow label="Source Address" value={config?.authentication.radius?.source_address} />
                            <InfoRow label="Timeout" value={config?.authentication.radius?.timeout} />
                            <InfoRow label="Max Try" value={config?.authentication.radius?.max_try} />
                            <InfoRow label="NAS Identifier" value={config?.authentication.radius?.nas_identifier} />
                            <InfoRow label="NAS IP" value={config?.authentication.radius?.nas_ip_address} />
                            <InfoRow label="Called SID Format" value={config?.authentication.radius?.called_sid_format} />
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Preallocate VIF</span>
                              <Badge variant={config?.authentication.radius?.preallocate_vif ? "default" : "secondary"}>
                                {config?.authentication.radius?.preallocate_vif ? "Yes" : "No"}
                              </Badge>
                            </div>
                          </Card>
                          <Card className="p-4 space-y-2 text-sm">
                            <h4 className="text-sm font-medium mb-2">DAE & Rate Limit</h4>
                            <InfoRow label="DAE Server" value={config?.authentication.radius?.dynamic_author?.server} />
                            <InfoRow label="DAE Port" value={config?.authentication.radius?.dynamic_author?.port} />
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Rate Limit</span>
                              <Badge variant={config?.authentication.radius?.rate_limit?.enable ? "default" : "secondary"}>
                                {config?.authentication.radius?.rate_limit?.enable ? "Enabled" : "Disabled"}
                              </Badge>
                            </div>
                            <InfoRow label="Attribute" value={config?.authentication.radius?.rate_limit?.attribute} />
                            <InfoRow label="Multiplier" value={config?.authentication.radius?.rate_limit?.multiplier} />
                          </Card>
                        </div>
                      </div>

                      <div className="flex items-center justify-between mb-4">
                        <h3 className="font-semibold">RADIUS Servers</h3>
                        {hasWrite && (
                          <Button size="sm" onClick={() => { setEditingRadiusServer(null); setShowRadiusServerModal(true); }}>
                            <Plus className="h-4 w-4 mr-1" /> Add Server
                          </Button>
                        )}
                      </div>
                      {(config?.authentication.radius?.servers?.length ?? 0) === 0 ? (
                        <EmptyState icon={Server} label="No RADIUS servers configured" />
                      ) : (
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Address</TableHead>
                              <TableHead>Port</TableHead>
                              <TableHead>Acct Port</TableHead>
                              <TableHead>Priority</TableHead>
                              <TableHead>Status</TableHead>
                              {hasWrite && <TableHead className="text-right">Actions</TableHead>}
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {(config?.authentication.radius?.servers ?? []).map((srv) => (
                              <TableRow key={srv.address} className="group">
                                <TableCell>
                                  <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{srv.address}</code>
                                </TableCell>
                                <TableCell>{srv.port || "1812"}</TableCell>
                                <TableCell>{srv.acct_port || "1813"}</TableCell>
                                <TableCell>{srv.priority || "-"}</TableCell>
                                <TableCell>
                                  <div className="flex gap-1">
                                    {srv.disabled ? (
                                      <Badge variant="secondary" className="bg-red-500/10 text-red-600">Disabled</Badge>
                                    ) : (
                                      <Badge variant="secondary" className="bg-green-500/10 text-green-600">Active</Badge>
                                    )}
                                    {srv.backup && <Badge variant="outline">Backup</Badge>}
                                  </div>
                                </TableCell>
                                {hasWrite && (
                                  <TableCell className="text-right">
                                    <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditingRadiusServer(srv); setShowRadiusServerModal(true); }}>
                                        <Pencil className="h-4 w-4" />
                                      </Button>
                                      <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-destructive/10" onClick={() => setDeleteTarget({
                                        type: "RADIUS Server",
                                        name: srv.address,
                                        onDelete: () => pppoeServerService.deleteRadiusServer(srv.address),
                                      })}>
                                        <Trash2 className="h-4 w-4 text-destructive" />
                                      </Button>
                                    </div>
                                  </TableCell>
                                )}
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      )}
                    </>
                  )}
                </TabsContent>

                {/* IP Pools Tab */}
                <TabsContent value="pools" className="mt-0">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold">IPv4 Client IP Pools</h3>
                    {hasWrite && (
                      <Button size="sm" onClick={() => { setEditingIPPool(null); setShowIPPoolModal(true); }}>
                        <Plus className="h-4 w-4 mr-1" /> Add Pool
                      </Button>
                    )}
                  </div>
                  {(config?.client_ip_pools.length ?? 0) === 0 ? (
                    <EmptyState icon={Network} label="No IPv4 pools configured" />
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Ranges</TableHead>
                          <TableHead>Next Pool</TableHead>
                          {hasWrite && <TableHead className="text-right">Actions</TableHead>}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {config?.client_ip_pools.map((pool) => (
                          <TableRow key={pool.name} className="group">
                            <TableCell className="font-medium">{pool.name}</TableCell>
                            <TableCell>
                              <div className="flex flex-wrap gap-1">
                                {(pool.ranges || []).map((r) => (
                                  <Badge key={r} variant="secondary" className="font-mono text-xs">{r}</Badge>
                                ))}
                                {(pool.ranges || []).length === 0 && "-"}
                              </div>
                            </TableCell>
                            <TableCell>{pool.next_pool || "-"}</TableCell>
                            {hasWrite && (
                              <TableCell className="text-right">
                                <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditingIPPool(pool); setShowIPPoolModal(true); }}>
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                  <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-destructive/10" onClick={() => setDeleteTarget({
                                    type: "IP Pool",
                                    name: pool.name,
                                    onDelete: () => pppoeServerService.deleteIPPool(pool.name),
                                  })}>
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                  </Button>
                                </div>
                              </TableCell>
                            )}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </TabsContent>

                {/* IPv6 Pools Tab */}
                <TabsContent value="ipv6pools" className="mt-0">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold">IPv6 Client Pools</h3>
                    {hasWrite && (
                      <Button size="sm" onClick={() => { setEditingIPv6Pool(null); setShowIPv6PoolModal(true); }}>
                        <Plus className="h-4 w-4 mr-1" /> Add Pool
                      </Button>
                    )}
                  </div>
                  {(config?.client_ipv6_pools.length ?? 0) === 0 ? (
                    <EmptyState icon={Network} label="No IPv6 pools configured" />
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Prefixes</TableHead>
                          <TableHead>Delegates</TableHead>
                          {hasWrite && <TableHead className="text-right">Actions</TableHead>}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {config?.client_ipv6_pools.map((pool) => (
                          <TableRow key={pool.name} className="group">
                            <TableCell className="font-medium">{pool.name}</TableCell>
                            <TableCell>
                              <div className="flex flex-wrap gap-1">
                                {(pool.prefixes || []).map((p, i) => (
                                  <Badge key={i} variant="outline" className="text-xs font-mono">
                                    {p.prefix}{p.mask ? ` /${p.mask}` : ""}
                                  </Badge>
                                ))}
                                {(!pool.prefixes || pool.prefixes.length === 0) && "-"}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-wrap gap-1">
                                {(pool.delegates || []).map((d, i) => (
                                  <Badge key={i} variant="outline" className="text-xs font-mono">
                                    {d.prefix}{d.delegation_prefix ? ` /${d.delegation_prefix}` : ""}
                                  </Badge>
                                ))}
                                {(!pool.delegates || pool.delegates.length === 0) && "-"}
                              </div>
                            </TableCell>
                            {hasWrite && (
                              <TableCell className="text-right">
                                <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditingIPv6Pool(pool); setShowIPv6PoolModal(true); }}>
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                  <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-destructive/10" onClick={() => setDeleteTarget({
                                    type: "IPv6 Pool",
                                    name: pool.name,
                                    onDelete: () => pppoeServerService.deleteIPv6Pool(pool.name),
                                  })}>
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                  </Button>
                                </div>
                              </TableCell>
                            )}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </TabsContent>

                {/* PPP Options Tab */}
                <TabsContent value="ppp-options" className="mt-0">
                  <Card className="p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-medium">PPP Options</h4>
                      {hasWrite && (
                        <Button variant="ghost" size="sm" onClick={() => setShowPPPOptionsModal(true)}>
                          <Pencil className="h-3 w-3 mr-1" /> Edit
                        </Button>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-6 text-sm">
                      <div className="space-y-2">
                        <h5 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">IP Negotiation</h5>
                        <InfoRow label="IPv4" value={config?.ppp_options.ipv4} />
                        <InfoRow label="IPv6" value={config?.ppp_options.ipv6} />
                        <h5 className="text-xs font-medium text-muted-foreground uppercase tracking-wide pt-2">Encryption</h5>
                        <InfoRow label="MPPE" value={config?.ppp_options.mppe} />
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Disable CCP</span>
                          <Badge variant={config?.ppp_options.disable_ccp ? "default" : "secondary"}>
                            {config?.ppp_options.disable_ccp ? "Yes" : "No"}
                          </Badge>
                        </div>
                        <h5 className="text-xs font-medium text-muted-foreground uppercase tracking-wide pt-2">MTU/MRU</h5>
                        <InfoRow label="Min MTU" value={config?.ppp_options.min_mtu} />
                        <InfoRow label="MRU" value={config?.ppp_options.mru} />
                        <InfoRow label="Interface Cache" value={config?.ppp_options.interface_cache} />
                      </div>
                      <div className="space-y-2">
                        <h5 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">LCP Echo</h5>
                        <InfoRow label="Failure" value={config?.ppp_options.lcp_echo_failure} />
                        <InfoRow label="Interval" value={config?.ppp_options.lcp_echo_interval} />
                        <InfoRow label="Timeout" value={config?.ppp_options.lcp_echo_timeout} />
                        <h5 className="text-xs font-medium text-muted-foreground uppercase tracking-wide pt-2">IPv6 Interface IDs</h5>
                        <InfoRow label="Interface ID" value={config?.ppp_options.ipv6_interface_id} />
                        <InfoRow label="Peer Interface ID" value={config?.ppp_options.ipv6_peer_interface_id} />
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Accept Peer ID</span>
                          <Badge variant={config?.ppp_options.ipv6_accept_peer_interface_id ? "default" : "secondary"}>
                            {config?.ppp_options.ipv6_accept_peer_interface_id ? "Yes" : "No"}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </Card>
                </TabsContent>

                {/* Advanced Tab */}
                <TabsContent value="advanced" className="mt-0">
                  <Card className="p-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-medium">Advanced Settings</h4>
                      {hasWrite && (
                        <Button variant="ghost" size="sm" onClick={() => setShowAdvancedModal(true)}>
                          <Pencil className="h-3 w-3 mr-1" /> Edit
                        </Button>
                      )}
                    </div>

                    {/* PADO Delays */}
                    <div className="space-y-2">
                      <h5 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">PADO Delays</h5>
                      {(config?.pado_delays || []).length === 0 ? (
                        <p className="text-sm text-muted-foreground">No PADO delays configured</p>
                      ) : (
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Delay</TableHead>
                              <TableHead>Sessions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {(config?.pado_delays || []).map((d) => (
                              <TableRow key={d.delay}>
                                <TableCell className="font-mono text-sm">{d.delay}</TableCell>
                                <TableCell>{d.sessions || "-"}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-6 text-sm">
                      <div className="space-y-2">
                        <h5 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Limits</h5>
                        <InfoRow label="Burst" value={config?.limits?.burst} />
                        <InfoRow label="Conn. Limit" value={config?.limits?.connection_limit} />
                        <InfoRow label="Timeout" value={config?.limits?.timeout} />
                        <h5 className="text-xs font-medium text-muted-foreground uppercase tracking-wide pt-2">Log & Shaper</h5>
                        <InfoRow label="Log Level" value={config?.log?.level} />
                        <InfoRow label="Shaper FWMark" value={config?.shaper?.fwmark} />
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">SNMP Master Agent</span>
                          <Badge variant={config?.snmp?.master_agent ? "default" : "secondary"}>
                            {config?.snmp?.master_agent ? "Yes" : "No"}
                          </Badge>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <h5 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Extended Scripts</h5>
                        <InfoRow label="On Change" value={config?.extended_scripts?.on_change} />
                        <InfoRow label="On Down" value={config?.extended_scripts?.on_down} />
                        <InfoRow label="On Pre-Up" value={config?.extended_scripts?.on_pre_up} />
                        <InfoRow label="On Up" value={config?.extended_scripts?.on_up} />
                      </div>
                    </div>
                  </Card>
                </TabsContent>

              </div>
            </div>
          </Tabs>
        </div>
      </div>

      <Dialog open={!!connectionDialog} onOpenChange={(open) => { if (!open) setConnectionDialog(null); }}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Connections for {connectionDialog?.username}</DialogTitle>
            <DialogDescription>
              Conntrack entries matching {connectionDialog?.ip} on {connectionDialog?.interfaceName}.
            </DialogDescription>
          </DialogHeader>
          {connectionsLoading ? (
            <div className="py-8 text-center text-sm text-muted-foreground">Loading connections...</div>
          ) : connectionsError ? (
            <div className="rounded-md border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">{connectionsError}</div>
          ) : connections.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">No tracked connections found.</div>
          ) : (
            <pre className="max-h-[60vh] overflow-auto rounded-md bg-muted p-4 text-xs leading-5 whitespace-pre-wrap">{connections.join("\n")}</pre>
          )}
        </DialogContent>
      </Dialog>

      {/* Modals */}
      {config && (
        <>
          <GeneralSettingsModal
            open={showGeneralModal}
            onOpenChange={setShowGeneralModal}
            onSuccess={onSuccess}
            config={config}
          />
          <AuthSettingsModal
            open={showAuthModal}
            onOpenChange={setShowAuthModal}
            onSuccess={onSuccess}
            currentAuth={config.authentication}
          />
          <PPPOptionsModal
            open={showPPPOptionsModal}
            onOpenChange={setShowPPPOptionsModal}
            onSuccess={onSuccess}
            config={config}
          />
          <AdvancedSettingsModal
            open={showAdvancedModal}
            onOpenChange={setShowAdvancedModal}
            onSuccess={onSuccess}
            config={config}
          />
          <RadiusSettingsModal
            open={showRadiusSettingsModal}
            onOpenChange={setShowRadiusSettingsModal}
            onSuccess={onSuccess}
            currentSettings={config.authentication.radius ?? { servers: [] }}
          />
        </>
      )}

      <LocalUserModal
        open={showLocalUserModal}
        onOpenChange={(open) => { setShowLocalUserModal(open); if (!open) setEditingLocalUser(null); }}
        onSuccess={onSuccess}
        existingUser={editingLocalUser}
      />
      <RadiusServerModal
        open={showRadiusServerModal}
        onOpenChange={(open) => { setShowRadiusServerModal(open); if (!open) setEditingRadiusServer(null); }}
        onSuccess={onSuccess}
        existingServer={editingRadiusServer}
      />
      <IPPoolModal
        open={showIPPoolModal}
        onOpenChange={(open) => { setShowIPPoolModal(open); if (!open) setEditingIPPool(null); }}
        onSuccess={onSuccess}
        existingPool={editingIPPool}
      />
      <IPv6PoolModal
        open={showIPv6PoolModal}
        onOpenChange={(open) => { setShowIPv6PoolModal(open); if (!open) setEditingIPv6Pool(null); }}
        onSuccess={onSuccess}
        existingPool={editingIPv6Pool}
      />
      <InterfaceModal
        open={showInterfaceModal}
        onOpenChange={(open) => { setShowInterfaceModal(open); if (!open) setEditingInterface(null); }}
        onSuccess={onSuccess}
        existingInterface={editingInterface}
        capabilities={capabilities}
      />
      {deleteTarget && (
        <DeleteConfirmModal
          open={!!deleteTarget}
          onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}
          onSuccess={deleteTarget.actionLabel === "Reset" ? onSessionReset : onSuccess}
          itemType={deleteTarget.type}
          itemName={deleteTarget.name}
          onDelete={deleteTarget.onDelete}
          warning={deleteTarget.warning}
          actionLabel={deleteTarget.actionLabel}
          actionVerb={deleteTarget.actionVerb}
        />
      )}
    </AppLayout>
  );
}

function InfoRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span>{value || "-"}</span>
    </div>
  );
}

type SessionWithRates = PPPoESession & {
  rxRate?: number;
  txRate?: number;
  rxPps?: number;
  txPps?: number;
};

function formatBytes(value: number): string {
  if (value >= 1024 ** 3) return `${(value / 1024 ** 3).toFixed(1)} GiB`;
  if (value >= 1024 ** 2) return `${(value / 1024 ** 2).toFixed(1)} MiB`;
  if (value >= 1024) return `${(value / 1024).toFixed(1)} KiB`;
  return `${value} B`;
}

function formatRate(value?: number): string {
  if (value === undefined) return "-";
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)} Mbit/s`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)} kbit/s`;
  return `${Math.round(value)} bit/s`;
}

function formatPps(value?: number): string {
  return value === undefined ? "-" : `${Math.round(value)} pps`;
}

function EmptyState({ icon: Icon, label }: { icon: React.ComponentType<{ className?: string }>; label: string }) {
  return (
    <div className="text-center py-12">
      <Icon className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
      <p className="text-muted-foreground">{label}</p>
    </div>
  );
}

export default function PPPoEServerPage() {
  return (
    <Suspense>
      <PPPoEPageInner />
    </Suspense>
  );
}
