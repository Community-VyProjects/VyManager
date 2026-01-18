"use client";

import { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import {
  Shield,
  Plus,
  RefreshCw,
  Loader2,
  AlertCircle,
  Network,
  Key,
  Users,
  Globe,
  Trash2,
  Pencil,
  Copy,
  Check,
  QrCode,
  Wand2,
  Clock,
} from "lucide-react";
import {
  wireguardService,
  type WireGuardInterface,
  type WireGuardPeer,
  type WireGuardCapabilities,
  type WireGuardConfigResponse,
} from "@/lib/api/wireguard";

// Import modals
import { CreateInterfaceModal } from "@/components/vpn/CreateInterfaceModal";
import { EditInterfaceModal } from "@/components/vpn/EditInterfaceModal";
import { DeleteInterfaceModal } from "@/components/vpn/DeleteInterfaceModal";
import { CreatePeerModal } from "@/components/vpn/CreatePeerModal";
import { EditPeerModal } from "@/components/vpn/EditPeerModal";
import { DeletePeerModal } from "@/components/vpn/DeletePeerModal";
import { GenerateClientConfigModal } from "@/components/vpn/GenerateClientConfigModal";
import { QuickSetupWizard } from "@/components/vpn/QuickSetupWizard";

export default function WireGuardPage() {
  // State
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [config, setConfig] = useState<WireGuardConfigResponse | null>(null);
  const [capabilities, setCapabilities] = useState<WireGuardCapabilities | null>(null);

  // Selection
  const [selectedInterface, setSelectedInterface] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Modal states
  const [showCreateInterface, setShowCreateInterface] = useState(false);
  const [editingInterface, setEditingInterface] = useState<WireGuardInterface | null>(null);
  const [deletingInterface, setDeletingInterface] = useState<WireGuardInterface | null>(null);
  const [showCreatePeer, setShowCreatePeer] = useState(false);
  const [editingPeer, setEditingPeer] = useState<WireGuardPeer | null>(null);
  const [deletingPeer, setDeletingPeer] = useState<WireGuardPeer | null>(null);
  const [showClientConfig, setShowClientConfig] = useState(false);
  const [showQuickSetup, setShowQuickSetup] = useState(false);

  // Copy state
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const fetchConfig = async (refresh: boolean = false) => {
    try {
      setLoading(true);
      setError(null);
      const [configData, capsData] = await Promise.all([
        wireguardService.getConfig(refresh),
        wireguardService.getCapabilities(),
      ]);
      setConfig(configData);
      setCapabilities(capsData);

      // Auto-select first interface if none selected
      if (!selectedInterface && configData.interfaces.length > 0) {
        setSelectedInterface(configData.interfaces[0].name);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load WireGuard configuration");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConfig();
  }, []);

  // Get currently selected interface
  const currentInterface = config?.interfaces.find(
    (iface) => iface.name === selectedInterface
  ) || null;

  // Filter peers based on search
  const filteredPeers = currentInterface?.peers.filter(
    (peer) =>
      searchQuery === "" ||
      peer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      peer.public_key?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      peer.allowed_ips.some((ip) => ip.includes(searchQuery))
  ) || [];

  // Copy to clipboard helper
  const copyToClipboard = async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  // Render loading state
  if (loading && !config) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-[calc(100vh-200px)]">
          <div className="text-center space-y-4">
            <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
            <p className="text-muted-foreground">Loading WireGuard configuration...</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  // Render error state
  if (error && !config) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-[calc(100vh-200px)]">
          <div className="text-center space-y-4">
            <AlertCircle className="h-12 w-12 text-destructive mx-auto" />
            <p className="text-destructive font-medium">Failed to load configuration</p>
            <p className="text-sm text-muted-foreground">{error}</p>
            <Button onClick={() => fetchConfig(true)}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="flex h-full overflow-hidden">
        {/* Left Sidebar - Interface List */}
        <div className="w-72 border-r border-border bg-card/50 flex flex-col">
          {/* Header */}
          <div className="p-4 border-b border-border">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-primary" />
                <h2 className="font-semibold">WireGuard</h2>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => fetchConfig(true)}
                disabled={loading}
              >
                <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
              </Button>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                className="flex-1"
                onClick={() => setShowCreateInterface(true)}
              >
                <Plus className="h-4 w-4 mr-1" />
                New Tunnel
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowQuickSetup(true)}
                title="Quick Setup Wizard"
              >
                <Wand2 className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Interface List */}
          <ScrollArea className="flex-1">
            <div className="p-2">
              {!config?.interfaces.length ? (
                <div className="text-center py-8 px-4">
                  <Shield className="h-10 w-10 text-muted-foreground/50 mx-auto mb-3" />
                  <p className="text-sm font-medium text-foreground mb-1">No Tunnels</p>
                  <p className="text-xs text-muted-foreground mb-4">
                    Create your first WireGuard tunnel
                  </p>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setShowQuickSetup(true)}
                  >
                    <Wand2 className="h-4 w-4 mr-2" />
                    Quick Setup
                  </Button>
                </div>
              ) : (
                <div className="space-y-1">
                  {config.interfaces.map((iface) => {
                    const isSelected = selectedInterface === iface.name;

                    return (
                      <div
                        key={iface.name}
                        className={cn(
                          "group w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all cursor-pointer",
                          isSelected
                            ? "bg-accent text-accent-foreground shadow-sm"
                            : "hover:bg-accent/50 text-foreground"
                        )}
                        onClick={() => setSelectedInterface(iface.name)}
                      >
                        <div className="p-1.5 rounded-md bg-primary/10 flex-shrink-0">
                          <Shield className="h-4 w-4 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium truncate">{iface.name}</div>
                          <div className="text-xs text-muted-foreground mt-0.5">
                            {iface.peer_count} peer{iface.peer_count !== 1 ? "s" : ""}
                            {iface.port && ` | Port ${iface.port}`}
                          </div>
                        </div>
                        <button
                          className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-destructive/10 transition-opacity"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeletingInterface(iface);
                          }}
                          title="Delete tunnel"
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </ScrollArea>

          {/* Sidebar Stats */}
          <div className="p-4 border-t border-border bg-card/30">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-primary" />
                <span className="text-muted-foreground">Tunnels:</span>
                <span className="font-medium">{config?.interfaces.length || 0}</span>
              </div>
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-purple-500" />
                <span className="text-muted-foreground">Peers:</span>
                <span className="font-medium">
                  {config?.interfaces.reduce((sum, i) => sum + i.peer_count, 0) || 0}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {!currentInterface ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <Shield className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
                <p className="text-lg font-medium text-foreground mb-2">
                  {config?.interfaces.length
                    ? "Select a Tunnel"
                    : "No WireGuard Tunnels"}
                </p>
                <p className="text-sm text-muted-foreground mb-4">
                  {config?.interfaces.length
                    ? "Choose a tunnel from the sidebar to view details"
                    : "Create your first WireGuard VPN tunnel to get started"}
                </p>
                {!config?.interfaces.length && (
                  <Button onClick={() => setShowQuickSetup(true)}>
                    <Wand2 className="h-4 w-4 mr-2" />
                    Quick Setup Wizard
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <>
              {/* Interface Header */}
              <div className="p-6 border-b bg-background">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-xl bg-primary/10">
                      <Shield className="h-8 w-8 text-primary" />
                    </div>
                    <div>
                      <h1 className="text-2xl font-bold text-foreground">
                        {currentInterface.name}
                      </h1>
                      <p className="text-muted-foreground mt-1">
                        {currentInterface.description || "WireGuard VPN Tunnel"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowClientConfig(true)}
                    >
                      <QrCode className="h-4 w-4 mr-2" />
                      Generate Client
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setEditingInterface(currentInterface)}
                    >
                      <Pencil className="h-4 w-4 mr-2" />
                      Edit
                    </Button>
                  </div>
                </div>

                {/* Interface Info Cards */}
                <div className="grid grid-cols-4 gap-4 mt-6">
                  {/* Listen Port */}
                  <Card className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-blue-500/10">
                        <Globe className="h-5 w-5 text-blue-500" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Listen Port</p>
                        <p className="font-semibold">{currentInterface.port || "Auto"}</p>
                      </div>
                    </div>
                  </Card>

                  {/* Addresses */}
                  <Card className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-green-500/10">
                        <Network className="h-5 w-5 text-green-500" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs text-muted-foreground">Addresses</p>
                        <p className="font-semibold font-mono text-sm truncate">
                          {currentInterface.addresses.length > 0
                            ? currentInterface.addresses[0]
                            : "Not set"}
                        </p>
                      </div>
                    </div>
                  </Card>

                  {/* Peers */}
                  <Card className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-purple-500/10">
                        <Users className="h-5 w-5 text-purple-500" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Peers</p>
                        <p className="font-semibold">{currentInterface.peer_count}</p>
                      </div>
                    </div>
                  </Card>

                  {/* Private Key Status */}
                  <Card className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-amber-500/10">
                        <Key className="h-5 w-5 text-amber-500" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Private Key</p>
                        <p className="font-semibold">
                          {currentInterface.private_key ? (
                            <Badge variant="secondary" className="bg-green-500/10 text-green-600">
                              Configured
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="bg-red-500/10 text-red-600">
                              Not Set
                            </Badge>
                          )}
                        </p>
                      </div>
                    </div>
                  </Card>
                </div>
              </div>

              {/* Peers Section */}
              <div className="flex-1 overflow-hidden flex flex-col">
                <div className="p-4 border-b flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <h3 className="font-semibold">Peers</h3>
                    <Input
                      placeholder="Search peers..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-64"
                    />
                  </div>
                  <Button size="sm" onClick={() => setShowCreatePeer(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Peer
                  </Button>
                </div>

                <ScrollArea className="flex-1">
                  <div className="p-4">
                    {filteredPeers.length === 0 ? (
                      <div className="text-center py-12">
                        <Users className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
                        <p className="text-lg font-medium text-foreground mb-2">No Peers</p>
                        <p className="text-sm text-muted-foreground mb-4">
                          Add peers to connect devices to this tunnel
                        </p>
                        <Button onClick={() => setShowCreatePeer(true)}>
                          <Plus className="h-4 w-4 mr-2" />
                          Add First Peer
                        </Button>
                      </div>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Peer Name</TableHead>
                            <TableHead>Public Key</TableHead>
                            <TableHead>Allowed IPs</TableHead>
                            <TableHead>Endpoint</TableHead>
                            <TableHead>Keepalive</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredPeers.map((peer) => (
                            <TableRow key={peer.name} className="group">
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <div className="p-1.5 rounded bg-primary/10">
                                    <Users className="h-3.5 w-3.5 text-primary" />
                                  </div>
                                  <span className="font-medium">{peer.name}</span>
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <code className="text-xs bg-muted px-2 py-1 rounded font-mono max-w-[200px] truncate">
                                    {peer.public_key || "Not set"}
                                  </code>
                                  {peer.public_key && (
                                    <button
                                      onClick={() => copyToClipboard(peer.public_key!, `pk-${peer.name}`)}
                                      className="text-muted-foreground hover:text-foreground"
                                    >
                                      {copiedKey === `pk-${peer.name}` ? (
                                        <Check className="h-4 w-4 text-green-500" />
                                      ) : (
                                        <Copy className="h-4 w-4" />
                                      )}
                                    </button>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="flex flex-wrap gap-1">
                                  {peer.allowed_ips.slice(0, 2).map((ip, idx) => (
                                    <Badge key={idx} variant="outline" className="font-mono text-xs">
                                      {ip}
                                    </Badge>
                                  ))}
                                  {peer.allowed_ips.length > 2 && (
                                    <Badge variant="secondary" className="text-xs">
                                      +{peer.allowed_ips.length - 2} more
                                    </Badge>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell>
                                {peer.address ? (
                                  <span className="font-mono text-sm">
                                    {peer.address}
                                    {peer.port && `:${peer.port}`}
                                  </span>
                                ) : (
                                  <span className="text-muted-foreground">-</span>
                                )}
                              </TableCell>
                              <TableCell>
                                {peer.persistent_keepalive ? (
                                  <div className="flex items-center gap-1 text-sm">
                                    <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                                    {peer.persistent_keepalive}s
                                  </div>
                                ) : (
                                  <span className="text-muted-foreground">-</span>
                                )}
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8"
                                    onClick={() => setEditingPeer(peer)}
                                  >
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 hover:bg-destructive/10"
                                    onClick={() => setDeletingPeer(peer)}
                                  >
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </div>
                </ScrollArea>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Modals */}
      <CreateInterfaceModal
        open={showCreateInterface}
        onOpenChange={setShowCreateInterface}
        onSuccess={() => fetchConfig(true)}
        capabilities={capabilities}
        existingInterfaces={config?.interfaces.map((i) => i.name) || []}
      />

      {editingInterface && (
        <EditInterfaceModal
          open={!!editingInterface}
          onOpenChange={(open) => !open && setEditingInterface(null)}
          interfaceData={editingInterface}
          onSuccess={() => fetchConfig(true)}
          capabilities={capabilities}
        />
      )}

      {deletingInterface && (
        <DeleteInterfaceModal
          open={!!deletingInterface}
          onOpenChange={(open) => !open && setDeletingInterface(null)}
          interfaceData={deletingInterface}
          onSuccess={() => {
            if (selectedInterface === deletingInterface.name) {
              setSelectedInterface(null);
            }
            fetchConfig(true);
          }}
        />
      )}

      {currentInterface && (
        <>
          <CreatePeerModal
            open={showCreatePeer}
            onOpenChange={setShowCreatePeer}
            interfaceData={currentInterface}
            onSuccess={() => fetchConfig(true)}
          />

          {editingPeer && (
            <EditPeerModal
              open={!!editingPeer}
              onOpenChange={(open) => !open && setEditingPeer(null)}
              interfaceName={currentInterface.name}
              peerData={editingPeer}
              onSuccess={() => fetchConfig(true)}
            />
          )}

          {deletingPeer && (
            <DeletePeerModal
              open={!!deletingPeer}
              onOpenChange={(open) => !open && setDeletingPeer(null)}
              interfaceName={currentInterface.name}
              peerData={deletingPeer}
              onSuccess={() => fetchConfig(true)}
            />
          )}

          <GenerateClientConfigModal
            open={showClientConfig}
            onOpenChange={setShowClientConfig}
            interfaceData={currentInterface}
            onSuccess={() => fetchConfig(true)}
          />
        </>
      )}

      <QuickSetupWizard
        open={showQuickSetup}
        onOpenChange={setShowQuickSetup}
        onSuccess={() => fetchConfig(true)}
        capabilities={capabilities}
        existingInterfaces={config?.interfaces.map((i) => i.name) || []}
        existingPorts={config?.interfaces.map((i) => i.port).filter((p): p is string => !!p) || []}
      />
    </AppLayout>
  );
}
