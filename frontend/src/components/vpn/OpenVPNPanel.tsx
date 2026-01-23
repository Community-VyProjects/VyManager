"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  RefreshCw,
  Plus,
  Server,
  Network,
  User,
  Pencil,
  Trash2,
  Power,
  PowerOff,
  Shield,
  Users,
  Globe,
  AlertCircle,
} from "lucide-react";
import {
  openvpnService,
  type OpenVPNConfig,
  type OpenVPNInterface,
  type OpenVPNCapabilities,
} from "@/lib/api/openvpn";
import { useToast } from "@/hooks/useToast";
import { OpenVPNServerModal } from "./OpenVPNServerModal";
import { OpenVPNSiteToSiteModal } from "./OpenVPNSiteToSiteModal";
import { OpenVPNClientModal } from "./OpenVPNClientModal";
import { OpenVPNDeleteConfirmModal } from "./OpenVPNDeleteConfirmModal";
import { OpenVPNClientConfigModal } from "./OpenVPNClientConfigModal";

export function OpenVPNPanel() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [config, setConfig] = useState<OpenVPNConfig | null>(null);
  const [capabilities, setCapabilities] = useState<OpenVPNCapabilities | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Modal states
  const [serverModalOpen, setServerModalOpen] = useState(false);
  const [siteToSiteModalOpen, setSiteToSiteModalOpen] = useState(false);
  const [clientModalOpen, setClientModalOpen] = useState(false);
  const [editingInterface, setEditingInterface] = useState<OpenVPNInterface | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<OpenVPNInterface | null>(null);
  const [clientConfigTarget, setClientConfigTarget] = useState<OpenVPNInterface | null>(null);

  const loadData = async () => {
    try {
      setError(null);
      setRefreshing(true);

      const [configResult, capsResult] = await Promise.allSettled([
        openvpnService.getConfig(),
        openvpnService.getCapabilities(),
      ]);

      if (configResult.status === "fulfilled") {
        setConfig(configResult.value);
      } else {
        throw new Error("Failed to load OpenVPN config");
      }

      if (capsResult.status === "fulfilled") {
        setCapabilities(capsResult.value);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load OpenVPN data";
      setError(message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleToggleInterface = async (iface: OpenVPNInterface) => {
    try {
      const action = iface.disable ? "enable" : "disable";
      const response = iface.disable
        ? await openvpnService.enableInterface(iface.name)
        : await openvpnService.disableInterface(iface.name);

      if (response.success) {
        toast.success("Success", `Interface ${iface.name} ${action}d`);
        loadData();
      } else {
        toast.error("Failed", response.error || `Failed to ${action} interface`);
      }
    } catch (error) {
      toast.error("Error", error instanceof Error ? error.message : "Operation failed");
    }
  };

  // Categorize interfaces by mode
  const serverInterfaces = config?.interfaces.filter((i) => i.mode === "server") || [];
  const siteToSiteInterfaces = config?.interfaces.filter((i) => i.mode === "site-to-site") || [];
  const clientInterfaces = config?.interfaces.filter((i) => i.mode === "client") || [];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-destructive/50">
        <CardContent className="p-6">
          <div className="flex items-center gap-3">
            <AlertCircle className="h-6 w-6 text-destructive" />
            <div>
              <h3 className="font-semibold text-destructive">Failed to load OpenVPN</h3>
              <p className="text-sm text-muted-foreground">{error}</p>
              <Button variant="outline" size="sm" onClick={loadData} className="mt-2">
                <RefreshCw className="h-4 w-4 mr-2" />
                Retry
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">OpenVPN</h2>
          <p className="text-muted-foreground">
            Configure OpenVPN servers, site-to-site tunnels, and clients
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={loadData} disabled={refreshing}>
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <Shield className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{config?.total || 0}</p>
                <p className="text-xs text-muted-foreground">Total Interfaces</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10">
                <Server className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{serverInterfaces.length}</p>
                <p className="text-xs text-muted-foreground">Servers</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-500/10">
                <Network className="h-5 w-5 text-orange-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{siteToSiteInterfaces.length}</p>
                <p className="text-xs text-muted-foreground">Site-to-Site</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-500/10">
                <User className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{clientInterfaces.length}</p>
                <p className="text-xs text-muted-foreground">Clients</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="servers" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="servers" className="flex items-center gap-2">
            <Server className="h-4 w-4" />
            Servers ({serverInterfaces.length})
          </TabsTrigger>
          <TabsTrigger value="site-to-site" className="flex items-center gap-2">
            <Network className="h-4 w-4" />
            Site-to-Site ({siteToSiteInterfaces.length})
          </TabsTrigger>
          <TabsTrigger value="clients" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            Clients ({clientInterfaces.length})
          </TabsTrigger>
        </TabsList>

        {/* Servers Tab */}
        <TabsContent value="servers" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => setServerModalOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Server
            </Button>
          </div>

          {serverInterfaces.length === 0 ? (
            <Card>
              <CardContent className="py-12">
                <div className="flex flex-col items-center gap-2 text-center">
                  <Server className="h-12 w-12 text-muted-foreground/30" />
                  <p className="text-muted-foreground">No OpenVPN servers configured</p>
                  <Button variant="outline" onClick={() => setServerModalOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Server
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {serverInterfaces.map((iface) => (
                <InterfaceCard
                  key={iface.name}
                  interface={iface}
                  onEdit={() => {
                    setEditingInterface(iface);
                    setServerModalOpen(true);
                  }}
                  onDelete={() => setDeleteTarget(iface)}
                  onToggle={() => handleToggleInterface(iface)}
                  onManageClients={() => setClientConfigTarget(iface)}
                />
              ))}
            </div>
          )}
        </TabsContent>

        {/* Site-to-Site Tab */}
        <TabsContent value="site-to-site" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => setSiteToSiteModalOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Site-to-Site Tunnel
            </Button>
          </div>

          {siteToSiteInterfaces.length === 0 ? (
            <Card>
              <CardContent className="py-12">
                <div className="flex flex-col items-center gap-2 text-center">
                  <Network className="h-12 w-12 text-muted-foreground/30" />
                  <p className="text-muted-foreground">No site-to-site tunnels configured</p>
                  <Button variant="outline" onClick={() => setSiteToSiteModalOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Tunnel
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {siteToSiteInterfaces.map((iface) => (
                <InterfaceCard
                  key={iface.name}
                  interface={iface}
                  onEdit={() => {
                    setEditingInterface(iface);
                    setSiteToSiteModalOpen(true);
                  }}
                  onDelete={() => setDeleteTarget(iface)}
                  onToggle={() => handleToggleInterface(iface)}
                />
              ))}
            </div>
          )}
        </TabsContent>

        {/* Clients Tab */}
        <TabsContent value="clients" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => setClientModalOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Client
            </Button>
          </div>

          {clientInterfaces.length === 0 ? (
            <Card>
              <CardContent className="py-12">
                <div className="flex flex-col items-center gap-2 text-center">
                  <User className="h-12 w-12 text-muted-foreground/30" />
                  <p className="text-muted-foreground">No OpenVPN clients configured</p>
                  <Button variant="outline" onClick={() => setClientModalOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Client
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {clientInterfaces.map((iface) => (
                <InterfaceCard
                  key={iface.name}
                  interface={iface}
                  onEdit={() => {
                    setEditingInterface(iface);
                    setClientModalOpen(true);
                  }}
                  onDelete={() => setDeleteTarget(iface)}
                  onToggle={() => handleToggleInterface(iface)}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Modals */}
      <OpenVPNServerModal
        open={serverModalOpen}
        onOpenChange={(open) => {
          setServerModalOpen(open);
          if (!open) setEditingInterface(null);
        }}
        onSuccess={loadData}
        capabilities={capabilities}
        existingInterface={editingInterface?.mode === "server" ? editingInterface : undefined}
      />

      <OpenVPNSiteToSiteModal
        open={siteToSiteModalOpen}
        onOpenChange={(open) => {
          setSiteToSiteModalOpen(open);
          if (!open) setEditingInterface(null);
        }}
        onSuccess={loadData}
        capabilities={capabilities}
        existingInterface={editingInterface?.mode === "site-to-site" ? editingInterface : undefined}
      />

      <OpenVPNClientModal
        open={clientModalOpen}
        onOpenChange={(open) => {
          setClientModalOpen(open);
          if (!open) setEditingInterface(null);
        }}
        onSuccess={loadData}
        capabilities={capabilities}
        existingInterface={editingInterface?.mode === "client" ? editingInterface : undefined}
      />

      {deleteTarget && (
        <OpenVPNDeleteConfirmModal
          open={!!deleteTarget}
          onOpenChange={(open) => !open && setDeleteTarget(null)}
          onSuccess={() => {
            setDeleteTarget(null);
            loadData();
          }}
          interface={deleteTarget}
        />
      )}

      {clientConfigTarget && (
        <OpenVPNClientConfigModal
          open={!!clientConfigTarget}
          onOpenChange={(open) => !open && setClientConfigTarget(null)}
          onSuccess={loadData}
          interface={clientConfigTarget}
        />
      )}
    </div>
  );
}

// Interface Card Component
interface InterfaceCardProps {
  interface: OpenVPNInterface;
  onEdit: () => void;
  onDelete: () => void;
  onToggle: () => void;
  onManageClients?: () => void;
}

function InterfaceCard({ interface: iface, onEdit, onDelete, onToggle, onManageClients }: InterfaceCardProps) {
  const getModeIcon = () => {
    switch (iface.mode) {
      case "server":
        return <Server className="h-5 w-5 text-blue-500" />;
      case "site-to-site":
        return <Network className="h-5 w-5 text-orange-500" />;
      case "client":
        return <User className="h-5 w-5 text-green-500" />;
      default:
        return <Shield className="h-5 w-5 text-gray-500" />;
    }
  };

  const getModeColor = () => {
    switch (iface.mode) {
      case "server":
        return "bg-blue-500/10 border-blue-500/20";
      case "site-to-site":
        return "bg-orange-500/10 border-orange-500/20";
      case "client":
        return "bg-green-500/10 border-green-500/20";
      default:
        return "bg-gray-500/10 border-gray-500/20";
    }
  };

  return (
    <Card className={`border ${iface.disable ? "opacity-60" : ""}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${getModeColor()}`}>
              {getModeIcon()}
            </div>
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <code className="font-mono">{iface.name}</code>
                {iface.disable ? (
                  <Badge variant="outline" className="bg-red-500/10 text-red-500 border-red-500/20">
                    Disabled
                  </Badge>
                ) : (
                  <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20">
                    Enabled
                  </Badge>
                )}
              </CardTitle>
              {iface.description && (
                <CardDescription>{iface.description}</CardDescription>
              )}
            </div>
          </div>
          <div className="flex gap-1">
            {iface.mode === "server" && onManageClients && (
              <Button variant="ghost" size="sm" onClick={onManageClients}>
                <Users className="h-4 w-4" />
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={onToggle}>
              {iface.disable ? (
                <Power className="h-4 w-4 text-green-500" />
              ) : (
                <PowerOff className="h-4 w-4 text-red-500" />
              )}
            </Button>
            <Button variant="ghost" size="sm" onClick={onEdit}>
              <Pencil className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={onDelete}>
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          {iface.mode === "server" && (
            <>
              <div>
                <p className="text-muted-foreground">Subnet</p>
                <p className="font-mono">{iface.server?.subnet || "-"}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Clients</p>
                <p>{iface.server?.clients?.length || 0}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Port</p>
                <p className="font-mono">{iface.local_port || "1194"}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Protocol</p>
                <p>{iface.protocol?.toUpperCase() || "UDP"}</p>
              </div>
            </>
          )}

          {iface.mode === "site-to-site" && (
            <>
              <div>
                <p className="text-muted-foreground">Local Address</p>
                <p className="font-mono">{iface.local_address || "-"}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Remote Address</p>
                <p className="font-mono">{iface.remote_address || "-"}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Remote Host</p>
                <p className="font-mono">{iface.remote_hosts?.[0] || "-"}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Protocol</p>
                <p>{iface.protocol?.toUpperCase() || "UDP"}</p>
              </div>
            </>
          )}

          {iface.mode === "client" && (
            <>
              <div>
                <p className="text-muted-foreground">Remote Host</p>
                <p className="font-mono">{iface.remote_hosts?.[0] || "-"}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Remote Port</p>
                <p className="font-mono">{iface.remote_port || "1194"}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Protocol</p>
                <p>{iface.protocol?.toUpperCase() || "UDP"}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Authentication</p>
                <p>{iface.authentication?.username ? "Username/Password" : "Certificate"}</p>
              </div>
            </>
          )}
        </div>

        {/* Additional info badges */}
        <div className="flex flex-wrap gap-2 mt-4">
          {iface.encryption && (
            <Badge variant="secondary">
              {iface.encryption.toUpperCase()}
            </Badge>
          )}
          {iface.hash && (
            <Badge variant="secondary">
              {iface.hash.toUpperCase()}
            </Badge>
          )}
          {iface.tls && (
            <Badge variant="outline" className="bg-blue-500/10 text-blue-500 border-blue-500/20">
              TLS
            </Badge>
          )}
          {iface.persistent_tunnel && (
            <Badge variant="outline">Persistent</Badge>
          )}
          {iface.mode === "server" && iface.server?.redirect_gateway && (
            <Badge variant="outline" className="bg-orange-500/10 text-orange-500 border-orange-500/20">
              <Globe className="h-3 w-3 mr-1" />
              Redirect Gateway
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
