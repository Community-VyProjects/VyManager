"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
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
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  Shield,
  Globe,
  Lock,
} from "lucide-react";
import { ipsecService } from "@/lib/api/ipsec";
import { openvpnService, type OpenVPNConfig } from "@/lib/api/openvpn";
import { wireguardService, type WireGuardConfigResponse, type InterfaceStatusResponse, getConnectionStatus } from "@/lib/api/wireguard";
import { useToast } from "@/hooks/useToast";

interface VPNStatusTabProps {
  autoRefresh?: boolean;
  refreshInterval?: number;
}

interface IPsecTunnelStatus {
  peer: string;
  state: string;
  uptime?: string;
  bytesIn?: number;
  bytesOut?: number;
  tunnels: {
    id: string;
    localNetwork: string;
    remoteNetwork: string;
    state: string;
  }[];
}

interface OpenVPNStatus {
  interface: string;
  mode: string;
  state: string;
  connectedClients?: number;
  localAddress?: string;
  remoteAddress?: string;
}

interface WireGuardStatus {
  interface: string;
  peers: {
    name: string;
    publicKey: string;
    status: "connected" | "idle" | "never";
    lastHandshake: string | null;
    transferRx: string | null;
    transferTx: string | null;
    endpoint: string | null;
  }[];
}

export function VPNStatusTab({
  autoRefresh: initialAutoRefresh = true,
  refreshInterval = 10000,
}: VPNStatusTabProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(initialAutoRefresh);
  const { toast } = useToast();

  // VPN states
  const [ipsecStatus, setIpsecStatus] = useState<IPsecTunnelStatus[]>([]);
  const [openvpnStatus, setOpenvpnStatus] = useState<OpenVPNStatus[]>([]);
  const [wireguardStatus, setWireguardStatus] = useState<WireGuardStatus[]>([]);

  const loadStatus = useCallback(async () => {
    try {
      setError(null);

      // Load all VPN statuses in parallel
      const [ipsecResult, openvpnResult, wireguardResult] = await Promise.allSettled([
        loadIpsecStatus(),
        loadOpenvpnStatus(),
        loadWireguardStatus(),
      ]);

      // Handle results
      if (ipsecResult.status === "fulfilled") {
        setIpsecStatus(ipsecResult.value);
      }
      if (openvpnResult.status === "fulfilled") {
        setOpenvpnStatus(openvpnResult.value);
      }
      if (wireguardResult.status === "fulfilled") {
        setWireguardStatus(wireguardResult.value);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load VPN status");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadIpsecStatus = async (): Promise<IPsecTunnelStatus[]> => {
    try {
      const [configResult, statusResult] = await Promise.all([
        ipsecService.getConfig(),
        ipsecService.getStatus(),
      ]);

      if (!configResult.configured || configResult.peers.length === 0) {
        return [];
      }

      // Parse status data
      const statusData = statusResult.data || {};
      const tunnels: IPsecTunnelStatus[] = [];

      for (const peer of configResult.peers) {
        // Try to find status for this peer
        const peerStatus = (statusData as Record<string, unknown>)[peer.address] || {};

        tunnels.push({
          peer: peer.address,
          state: peer.disable ? "Disabled" : (peerStatus as Record<string, unknown>).state as string || "Unknown",
          uptime: (peerStatus as Record<string, unknown>).uptime as string,
          bytesIn: (peerStatus as Record<string, unknown>).bytes_in as number,
          bytesOut: (peerStatus as Record<string, unknown>).bytes_out as number,
          tunnels: peer.tunnels.map(t => ({
            id: t.id,
            localNetwork: t.local_prefix || "-",
            remoteNetwork: t.remote_prefix || "-",
            state: t.disable ? "Disabled" : "Active",
          })),
        });
      }

      return tunnels;
    } catch {
      return [];
    }
  };

  const loadOpenvpnStatus = async (): Promise<OpenVPNStatus[]> => {
    try {
      const config: OpenVPNConfig = await openvpnService.getConfig();

      if (!config.configured || config.interfaces.length === 0) {
        return [];
      }

      const statuses: OpenVPNStatus[] = [];

      for (const iface of config.interfaces) {
        let state = "Unknown";
        let connectedClients = 0;

        if (iface.disable) {
          state = "Disabled";
        } else {
          // Try to get interface status
          try {
            const statusResult = await openvpnService.getInterfaceStatus(iface.name);
            if (statusResult.success) {
              state = "Connected";
              // Count connected clients for server mode
              if (statusResult.data && Array.isArray((statusResult.data as Record<string, unknown>).clients)) {
                connectedClients = ((statusResult.data as Record<string, unknown>).clients as unknown[]).length;
              }
            }
          } catch {
            state = "Down";
          }
        }

        statuses.push({
          interface: iface.name,
          mode: iface.mode || "Unknown",
          state,
          connectedClients: iface.mode === "server" ? connectedClients : undefined,
          localAddress: iface.local_address,
          remoteAddress: iface.remote_address,
        });
      }

      return statuses;
    } catch {
      return [];
    }
  };

  const loadWireguardStatus = async (): Promise<WireGuardStatus[]> => {
    try {
      const config: WireGuardConfigResponse = await wireguardService.getConfig();

      if (config.interfaces.length === 0) {
        return [];
      }

      const statuses: WireGuardStatus[] = [];

      for (const iface of config.interfaces) {
        // Get interface status for peer handshake times
        let interfaceStatus: InterfaceStatusResponse | null = null;
        try {
          interfaceStatus = await wireguardService.getInterfaceStatus(iface.name);
        } catch {
          // Ignore errors
        }

        const peers = iface.peers.map(peer => {
          // Find peer status by public key
          let peerStatus = null;
          if (interfaceStatus && peer.public_key) {
            peerStatus = interfaceStatus.peers[peer.public_key];
          }

          return {
            name: peer.name,
            publicKey: peer.public_key || "Not configured",
            status: peerStatus
              ? getConnectionStatus(peerStatus.latest_handshake_seconds)
              : "never" as const,
            lastHandshake: peerStatus?.latest_handshake || null,
            transferRx: peerStatus?.transfer_rx || null,
            transferTx: peerStatus?.transfer_tx || null,
            endpoint: peerStatus?.endpoint || peer.address || null,
          };
        });

        statuses.push({
          interface: iface.name,
          peers,
        });
      }

      return statuses;
    } catch {
      return [];
    }
  };

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(loadStatus, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [autoRefresh, refreshInterval, loadStatus]);

  const handleRefresh = async () => {
    setLoading(true);
    await loadStatus();
    toast.success("Refreshed", "VPN status updated");
  };

  // Count summary
  const ipsecCount = ipsecStatus.length;
  const openvpnCount = openvpnStatus.length;
  const wireguardCount = wireguardStatus.reduce((acc, iface) => acc + iface.peers.length, 0);
  const totalTunnels = ipsecCount + openvpnCount + wireguardCount;

  const ipsecUp = ipsecStatus.filter(t => t.state !== "Disabled" && t.state !== "Unknown").length;
  const openvpnUp = openvpnStatus.filter(t => t.state === "Connected").length;
  const wireguardUp = wireguardStatus.reduce(
    (acc, iface) => acc + iface.peers.filter(p => p.status === "connected").length,
    0
  );

  if (loading && totalTunnels === 0) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center h-32">
            <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error && totalTunnels === 0) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
            <AlertTriangle className="h-8 w-8 mb-2 text-destructive" />
            <p>{error}</p>
            <Button variant="outline" size="sm" onClick={handleRefresh} className="mt-4">
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Shield className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Tunnels</p>
                <p className="text-xl font-bold">{totalTunnels}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 rounded-lg">
                <Lock className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">IPsec</p>
                <p className="text-xl font-bold">
                  <span className="text-green-600">{ipsecUp}</span>
                  <span className="text-muted-foreground"> / {ipsecCount}</span>
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <Globe className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">OpenVPN</p>
                <p className="text-xl font-bold">
                  <span className="text-green-600">{openvpnUp}</span>
                  <span className="text-muted-foreground"> / {openvpnCount}</span>
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Shield className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">WireGuard</p>
                <p className="text-xl font-bold">
                  <span className="text-green-600">{wireguardUp}</span>
                  <span className="text-muted-foreground"> / {wireguardCount}</span>
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* VPN Details */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              VPN Tunnel Status
            </CardTitle>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Switch
                  id="auto-refresh-vpn"
                  checked={autoRefresh}
                  onCheckedChange={setAutoRefresh}
                />
                <Label htmlFor="auto-refresh-vpn" className="text-sm">
                  Auto-refresh ({refreshInterval / 1000}s)
                </Label>
              </div>
              <Button variant="outline" size="sm" onClick={handleRefresh} disabled={loading}>
                <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {totalTunnels === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Shield className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No VPN tunnels configured</p>
            </div>
          ) : (
            <Tabs defaultValue="ipsec" className="space-y-4">
              <TabsList>
                <TabsTrigger value="ipsec" className="gap-2">
                  <Lock className="h-4 w-4" />
                  IPsec ({ipsecCount})
                </TabsTrigger>
                <TabsTrigger value="openvpn" className="gap-2">
                  <Globe className="h-4 w-4" />
                  OpenVPN ({openvpnCount})
                </TabsTrigger>
                <TabsTrigger value="wireguard" className="gap-2">
                  <Shield className="h-4 w-4" />
                  WireGuard ({wireguardCount})
                </TabsTrigger>
              </TabsList>

              {/* IPsec Tab */}
              <TabsContent value="ipsec">
                {ipsecStatus.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>No IPsec tunnels configured</p>
                  </div>
                ) : (
                  <div className="border rounded-lg overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Peer</TableHead>
                          <TableHead>State</TableHead>
                          <TableHead>Tunnels</TableHead>
                          <TableHead>Networks</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {ipsecStatus.map((tunnel) => (
                          <TableRow key={tunnel.peer}>
                            <TableCell className="font-mono font-medium">
                              {tunnel.peer}
                            </TableCell>
                            <TableCell>
                              <StatusBadge state={tunnel.state} />
                            </TableCell>
                            <TableCell>{tunnel.tunnels.length}</TableCell>
                            <TableCell className="font-mono text-sm">
                              {tunnel.tunnels.map((t, i) => (
                                <div key={t.id} className={i > 0 ? "mt-1" : ""}>
                                  {t.localNetwork} ↔ {t.remoteNetwork}
                                </div>
                              ))}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </TabsContent>

              {/* OpenVPN Tab */}
              <TabsContent value="openvpn">
                {openvpnStatus.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>No OpenVPN interfaces configured</p>
                  </div>
                ) : (
                  <div className="border rounded-lg overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Interface</TableHead>
                          <TableHead>Mode</TableHead>
                          <TableHead>State</TableHead>
                          <TableHead>Details</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {openvpnStatus.map((tunnel) => (
                          <TableRow key={tunnel.interface}>
                            <TableCell className="font-mono font-medium">
                              {tunnel.interface}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">{tunnel.mode}</Badge>
                            </TableCell>
                            <TableCell>
                              <StatusBadge state={tunnel.state} />
                            </TableCell>
                            <TableCell className="font-mono text-sm text-muted-foreground">
                              {tunnel.mode === "server" && tunnel.connectedClients !== undefined
                                ? `${tunnel.connectedClients} client(s)`
                                : tunnel.remoteAddress
                                ? `Remote: ${tunnel.remoteAddress}`
                                : "-"}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </TabsContent>

              {/* WireGuard Tab */}
              <TabsContent value="wireguard">
                {wireguardStatus.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>No WireGuard interfaces configured</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {wireguardStatus.map((iface) => (
                      <div key={iface.interface} className="border rounded-lg">
                        <div className="p-3 bg-muted/30 border-b">
                          <span className="font-mono font-medium">{iface.interface}</span>
                          <span className="text-muted-foreground ml-2">
                            ({iface.peers.length} peer{iface.peers.length !== 1 ? "s" : ""})
                          </span>
                        </div>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Peer</TableHead>
                              <TableHead>Status</TableHead>
                              <TableHead>Last Handshake</TableHead>
                              <TableHead>Transfer</TableHead>
                              <TableHead>Endpoint</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {iface.peers.map((peer) => (
                              <TableRow key={peer.name}>
                                <TableCell className="font-medium">{peer.name}</TableCell>
                                <TableCell>
                                  <WireGuardStatusBadge status={peer.status} />
                                </TableCell>
                                <TableCell className="text-sm text-muted-foreground">
                                  {peer.lastHandshake || "Never"}
                                </TableCell>
                                <TableCell className="font-mono text-sm">
                                  {peer.transferRx && peer.transferTx
                                    ? `↓${peer.transferRx} ↑${peer.transferTx}`
                                    : "-"}
                                </TableCell>
                                <TableCell className="font-mono text-sm text-muted-foreground">
                                  {peer.endpoint || "-"}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StatusBadge({ state }: { state: string }) {
  const normalizedState = state.toLowerCase();

  if (normalizedState === "disabled") {
    return (
      <Badge variant="outline" className="bg-gray-100 text-gray-800 border-gray-200 gap-1">
        <XCircle className="h-3 w-3" />
        Disabled
      </Badge>
    );
  }

  if (normalizedState === "connected" || normalizedState === "established" || normalizedState === "up" || normalizedState === "active") {
    return (
      <Badge variant="outline" className="bg-green-100 text-green-800 border-green-200 gap-1">
        <CheckCircle className="h-3 w-3" />
        {state}
      </Badge>
    );
  }

  if (normalizedState === "connecting" || normalizedState === "negotiating") {
    return (
      <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-200 gap-1">
        <Clock className="h-3 w-3" />
        {state}
      </Badge>
    );
  }

  return (
    <Badge variant="outline" className="bg-red-100 text-red-800 border-red-200 gap-1">
      <XCircle className="h-3 w-3" />
      {state}
    </Badge>
  );
}

function WireGuardStatusBadge({ status }: { status: "connected" | "idle" | "never" }) {
  switch (status) {
    case "connected":
      return (
        <Badge variant="outline" className="bg-green-100 text-green-800 border-green-200 gap-1">
          <CheckCircle className="h-3 w-3" />
          Connected
        </Badge>
      );
    case "idle":
      return (
        <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-200 gap-1">
          <Clock className="h-3 w-3" />
          Idle
        </Badge>
      );
    case "never":
      return (
        <Badge variant="outline" className="bg-gray-100 text-gray-800 border-gray-200 gap-1">
          <XCircle className="h-3 w-3" />
          Never connected
        </Badge>
      );
  }
}
