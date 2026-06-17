"use client";

import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Network,
  Database,
  Shield,
  Route,
  Lock,
  Activity,
  Settings,
  Users,
  Clock,
  Wifi,
  Globe,
  Server,
  ExternalLink
} from "lucide-react";
import { useRouter } from "next/navigation";

interface UnifiedViewProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'subnet' | 'client' | 'peer';
  data: any;
}

export function UnifiedView({ isOpen, onClose, type, data }: UnifiedViewProps) {
  const router = useRouter();
  const [relatedData, setRelatedData] = useState<any>({});

  useEffect(() => {
    if (isOpen && data) {
      // Load related data based on type
      loadRelatedData();
    }
  }, [isOpen, data]);

  const loadRelatedData = async () => {
    // This would load related information from various APIs
    // For now, we'll simulate with the data we have
    setRelatedData({
      firewallRules: [],
      routes: [],
      natRules: [],
      monitoring: {},
      logs: [],
    });
  };

  const renderSubnetView = () => {
    const { network, subnet } = data;

    return (
      <div className="space-y-6">
        {/* Basic Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Network className="h-5 w-5" />
              Subnet: {subnet.subnet}
            </CardTitle>
            <CardDescription>
              DHCP subnet in shared network &quot;{network.name}&quot;
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Default Router</label>
                <p className="text-sm text-muted-foreground">{subnet.default_router || 'Not set'}</p>
              </div>
              <div>
                <label className="text-sm font-medium">Lease Time</label>
                <p className="text-sm text-muted-foreground">{subnet.lease || 'Default'}</p>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">DNS Servers</label>
              <div className="flex flex-wrap gap-1 mt-1">
                {subnet.name_servers.map((server: string, index: number) => (
                  <Badge key={index} variant="secondary">{server}</Badge>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="clients" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="clients">Clients</TabsTrigger>
            <TabsTrigger value="firewall">Firewall</TabsTrigger>
            <TabsTrigger value="routing">Routing</TabsTrigger>
            <TabsTrigger value="monitoring">Monitoring</TabsTrigger>
          </TabsList>

          <TabsContent value="clients" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  DHCP Clients ({subnet.static_mappings.length} static)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-64">
                  <div className="space-y-2">
                    {subnet.static_mappings.map((mapping: any) => (
                      <div key={mapping.name} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <p className="font-medium">{mapping.name}</p>
                          <p className="text-sm text-muted-foreground">
                            IP: {mapping.ip_address} | MAC: {mapping.mac_address}
                          </p>
                        </div>
                        <Badge variant={mapping.disable ? "destructive" : "default"}>
                          {mapping.disable ? "Disabled" : "Enabled"}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="firewall" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Firewall Rules
                </CardTitle>
                <CardDescription>
                  Firewall rules that may affect this subnet
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-muted-foreground">
                  <Shield className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No specific firewall rules found for this subnet</p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-2"
                    onClick={() => router.push('/firewall/policies')}
                  >
                    <ExternalLink className="h-3 w-3 mr-1" />
                    View Firewall Policies
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="routing" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Route className="h-5 w-5" />
                  Routing Configuration
                </CardTitle>
                <CardDescription>
                  Routes and NAT rules affecting this subnet
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-muted-foreground">
                  <Route className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No specific routing rules found for this subnet</p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-2"
                    onClick={() => router.push('/routing/static-failover')}
                  >
                    <ExternalLink className="h-3 w-3 mr-1" />
                    View Routing Configuration
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="monitoring" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Monitoring & Logs
                </CardTitle>
                <CardDescription>
                  Recent activity and logs for this subnet
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-muted-foreground">
                  <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No monitoring data available</p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-2"
                    onClick={() => router.push('/monitoring')}
                  >
                    <ExternalLink className="h-3 w-3 mr-1" />
                    View System Monitoring
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    );
  };

  const renderClientView = () => {
    const { interface: wgInterface, peer } = data;

    return (
      <div className="space-y-6">
        {/* Basic Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              WireGuard Peer: {peer.name}
            </CardTitle>
            <CardDescription>
              Peer on interface {wgInterface.name}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Public Key</label>
                <p className="text-sm text-muted-foreground font-mono break-all">
                  {peer.public_key || 'Not set'}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium">Endpoint</label>
                <p className="text-sm text-muted-foreground">
                  {peer.address && peer.port ? `${peer.address}:${peer.port}` : 'Not set'}
                </p>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Allowed IPs</label>
              <div className="flex flex-wrap gap-1 mt-1">
                {peer.allowed_ips.map((ip: string, index: number) => (
                  <Badge key={index} variant="secondary">{ip}</Badge>
                ))}
              </div>
            </div>
            {peer.description && (
              <div>
                <label className="text-sm font-medium">Description</label>
                <p className="text-sm text-muted-foreground">{peer.description}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Tabs defaultValue="connection" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="connection">Connection</TabsTrigger>
            <TabsTrigger value="firewall">Firewall</TabsTrigger>
            <TabsTrigger value="routing">Routing</TabsTrigger>
            <TabsTrigger value="logs">Logs</TabsTrigger>
          </TabsList>

          <TabsContent value="connection" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Wifi className="h-5 w-5" />
                  Connection Status
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-muted-foreground">
                  <Wifi className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>Connection status monitoring not available</p>
                  <p className="text-xs mt-1">Check WireGuard interface status for details</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="firewall" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Firewall Rules
                </CardTitle>
                <CardDescription>
                  Firewall rules that may affect this client
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-muted-foreground">
                  <Shield className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No specific firewall rules found for this client</p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-2"
                    onClick={() => router.push('/firewall/policies')}
                  >
                    <ExternalLink className="h-3 w-3 mr-1" />
                    View Firewall Policies
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="routing" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Route className="h-5 w-5" />
                  Routing Configuration
                </CardTitle>
                <CardDescription>
                  Routes affecting this client&apos;s traffic
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-muted-foreground">
                  <Route className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No specific routing rules found for this client</p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-2"
                    onClick={() => router.push('/routing/static-failover')}
                  >
                    <ExternalLink className="h-3 w-3 mr-1" />
                    View Routing Configuration
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="logs" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Connection Logs
                </CardTitle>
                <CardDescription>
                  Recent connection attempts and activity
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-muted-foreground">
                  <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No logs available for this client</p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-2"
                    onClick={() => router.push('/monitoring')}
                  >
                    <ExternalLink className="h-3 w-3 mr-1" />
                    View System Logs
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle>
            {type === 'subnet' ? 'Subnet Overview' : 'Client Overview'}
          </DialogTitle>
        </DialogHeader>
        <ScrollArea className="flex-1 pr-6">
          {type === 'subnet' ? renderSubnetView() : renderClientView()}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}