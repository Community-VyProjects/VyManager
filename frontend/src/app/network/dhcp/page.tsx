"use client";

import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Plus,
  Search,
  RefreshCw,
  AlertCircle,
  Server,
  Network,
  Users,
  Clock,
  ChevronDown,
  ChevronRight,
  Pencil,
  Trash2,
  MapPin,
  Activity,
  Wifi,
  Monitor,
} from "lucide-react";
import { useEffect, useState } from "react";
import {
  dhcpService,
  type DHCPConfigResponse,
  type DHCPSharedNetwork,
  type DHCPSubnet,
  type DHCPCapabilitiesResponse,
} from "@/lib/api/dhcp";
import { cn } from "@/lib/utils";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { CreateDHCPServerModal } from "@/components/services/CreateDHCPServerModal";
import { EditDHCPServerModal } from "@/components/services/EditDHCPServerModal";
import { DeleteDHCPModal } from "@/components/services/DeleteDHCPModal";

function formatLease(seconds: string): string {
  const secs = parseInt(seconds);
  const hours = Math.floor(secs / 3600);
  const days = Math.floor(hours / 24);
  if (days > 0) return `${days}d`;
  if (hours > 0) return `${hours}h`;
  return `${Math.floor(secs / 60)}m`;
}

// Mock lease interface - will be replaced with actual backend interface
interface DHCPLease {
  ip_address: string;
  mac_address: string;
  hostname: string;
  network: string;
  subnet: string;
  state: "active" | "expired" | "released";
  lease_start: string;
  lease_end: string;
  remaining: string;
}

export default function DHCPPage() {
  const [config, setConfig] = useState<DHCPConfigResponse | null>(null);
  const [capabilities, setCapabilities] = useState<DHCPCapabilitiesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedNetworks, setExpandedNetworks] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState("servers");

  // Lease states (will be populated when backend endpoint is ready)
  const [leases, setLeases] = useState<DHCPLease[]>([]);
  const [leasesLoading, setLeasesLoading] = useState(false);
  const [leaseSearchQuery, setLeaseSearchQuery] = useState("");
  const [selectedSubnetLeases, setSelectedSubnetLeases] = useState<{
    network: string;
    subnet: string;
    leases: DHCPLease[];
  } | null>(null);

  // Modal states
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editingSubnet, setEditingSubnet] = useState<{
    network: string;
    subnet: DHCPSubnet;
  } | null>(null);
  const [deletingSubnet, setDeletingSubnet] = useState<{
    network: string;
    subnet: DHCPSubnet;
  } | null>(null);

  const fetchConfig = async (refresh: boolean = false) => {
    try {
      setLoading(true);
      setError(null);
      const [configData, capsData] = await Promise.all([
        dhcpService.getConfig(refresh),
        dhcpService.getCapabilities(),
      ]);
      setConfig(configData);
      setCapabilities(capsData);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load DHCP configuration"
      );
      console.error("Error fetching DHCP config:", err);
    } finally {
      setLoading(false);
    }
  };

  // TODO: Replace with actual API call when backend endpoint is ready
  const fetchLeases = async () => {
    try {
      setLeasesLoading(true);
      // const leasesData = await dhcpService.getLeases();
      // setLeases(leasesData);

      // Mock data for now
      setLeases([]);
    } catch (err) {
      console.error("Error fetching leases:", err);
    } finally {
      setLeasesLoading(false);
    }
  };

  useEffect(() => {
    fetchConfig();
    fetchLeases();
  }, []);

  const toggleNetwork = (networkName: string) => {
    setExpandedNetworks((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(networkName)) {
        newSet.delete(networkName);
      } else {
        newSet.add(networkName);
      }
      return newSet;
    });
  };

  const handleViewSubnetLeases = (network: string, subnet: string) => {
    // TODO: Filter actual leases when data is available
    const subnetLeases = leases.filter(
      (l) => l.network === network && l.subnet === subnet
    );
    setSelectedSubnetLeases({ network, subnet, leases: subnetLeases });
  };

  // Get lease count for a subnet (will work when data is available)
  const getSubnetLeaseCount = (network: string, subnet: string): number => {
    return leases.filter(
      (l) => l.network === network && l.subnet === subnet && l.state === "active"
    ).length;
  };

  // Filter shared networks based on search
  const filteredNetworks =
    config?.shared_networks.filter(
      (network) =>
        network.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        network.subnets.some((subnet) =>
          subnet.subnet.toLowerCase().includes(searchQuery.toLowerCase())
        )
    ) || [];

  // Filter leases based on search
  const filteredLeases = leases.filter(
    (lease) =>
      lease.ip_address.toLowerCase().includes(leaseSearchQuery.toLowerCase()) ||
      lease.mac_address.toLowerCase().includes(leaseSearchQuery.toLowerCase()) ||
      lease.hostname.toLowerCase().includes(leaseSearchQuery.toLowerCase()) ||
      lease.network.toLowerCase().includes(leaseSearchQuery.toLowerCase())
  );

  const totalSubnets = config?.total_subnets || 0;
  const totalStatic = config?.total_static_mappings || 0;
  const totalNetworks = config?.shared_networks.length || 0;
  const totalActiveLeases = leases.filter((l) => l.state === "active").length;

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-full">
          <LoadingSpinner />
        </div>
      </AppLayout>
    );
  }

  if (error) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-full">
          <div className="text-center space-y-4">
            <AlertCircle className="h-12 w-12 text-destructive mx-auto" />
            <h2 className="text-xl font-semibold text-foreground">Error Loading DHCP</h2>
            <p className="text-muted-foreground max-w-md">{error}</p>
            <Button onClick={() => fetchConfig(true)} variant="outline">
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
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="p-6 pb-4 border-b border-border">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-foreground">DHCP Server</h1>
              <p className="text-muted-foreground mt-2">
                Manage DHCP server configuration and active leases
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Button onClick={() => fetchConfig(true)} variant="outline" size="sm">
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
              <Button onClick={() => setCreateModalOpen(true)} size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Create DHCP Server
              </Button>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-4 gap-4">
            <Card className="bg-card/50">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Shared Networks</p>
                    <p className="text-2xl font-bold text-foreground mt-1">
                      {totalNetworks}
                    </p>
                  </div>
                  <Server className="h-8 w-8 text-blue-500" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card/50">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Subnets</p>
                    <p className="text-2xl font-bold text-foreground mt-1">
                      {totalSubnets}
                    </p>
                  </div>
                  <Network className="h-8 w-8 text-green-500" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card/50">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Active Leases</p>
                    <p className="text-2xl font-bold text-foreground mt-1">
                      {totalActiveLeases}
                    </p>
                  </div>
                  <Activity className="h-8 w-8 text-emerald-500" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card/50">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Static Mappings</p>
                    <p className="text-2xl font-bold text-foreground mt-1">
                      {totalStatic}
                    </p>
                  </div>
                  <MapPin className="h-8 w-8 text-purple-500" />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
          <div className="border-b border-border px-6">
            <TabsList className="bg-transparent h-12">
              <TabsTrigger value="servers" className="data-[state=active]:bg-accent">
                <Server className="h-4 w-4 mr-2" />
                Servers
              </TabsTrigger>
              <TabsTrigger value="leases" className="data-[state=active]:bg-accent">
                <Activity className="h-4 w-4 mr-2" />
                Active Leases
                {totalActiveLeases > 0 && (
                  <Badge variant="secondary" className="ml-2">
                    {totalActiveLeases}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Servers Tab */}
          <TabsContent value="servers" className="flex-1 mt-0">
            <div className="p-6 pt-4">
              {/* Search */}
              <div className="mb-4 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search networks or subnets..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* DHCP Servers List */}
              <ScrollArea className="h-[calc(100vh-400px)]">
                {filteredNetworks.length === 0 ? (
                  <Card className="border-dashed">
                    <CardContent className="flex flex-col items-center justify-center py-12">
                      <Server className="h-12 w-12 text-muted-foreground mb-4" />
                      <h3 className="text-lg font-semibold text-foreground mb-2">
                        No DHCP Servers
                      </h3>
                      <p className="text-sm text-muted-foreground mb-4 text-center max-w-sm">
                        {searchQuery
                          ? "No DHCP servers match your search criteria"
                          : "Get started by creating your first DHCP server"}
                      </p>
                      {!searchQuery && (
                        <Button onClick={() => setCreateModalOpen(true)}>
                          <Plus className="h-4 w-4 mr-2" />
                          Create DHCP Server
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-4">
                    {filteredNetworks.map((network) => {
                      const isExpanded = expandedNetworks.has(network.name);

                      return (
                        <Card key={network.name} className="overflow-hidden">
                          {/* Network Header */}
                          <div
                            className="p-4 bg-card hover:bg-accent/5 cursor-pointer transition-colors border-b border-border"
                            onClick={() => toggleNetwork(network.name)}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-4 flex-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 p-0"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleNetwork(network.name);
                                  }}
                                >
                                  {isExpanded ? (
                                    <ChevronDown className="h-4 w-4" />
                                  ) : (
                                    <ChevronRight className="h-4 w-4" />
                                  )}
                                </Button>

                                <div className="flex items-center gap-3">
                                  <Server className="h-5 w-5 text-blue-500" />
                                  <div>
                                    <h3 className="font-semibold text-foreground">
                                      {network.name}
                                    </h3>
                                    <div className="flex items-center gap-4 mt-1">
                                      <span className="text-sm text-muted-foreground">
                                        {network.subnets.length} subnet
                                        {network.subnets.length !== 1 ? "s" : ""}
                                      </span>
                                      {network.authoritative && (
                                        <Badge variant="outline" className="text-xs">
                                          Authoritative
                                        </Badge>
                                      )}
                                      {network.domain_name && (
                                        <span className="text-sm text-muted-foreground">
                                          Domain: {network.domain_name}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center gap-2">
                                <Badge variant="secondary">
                                  {network.subnets.reduce(
                                    (sum, s) => sum + s.static_mappings.length,
                                    0
                                  )}{" "}
                                  static
                                </Badge>
                              </div>
                            </div>
                          </div>

                          {/* Subnets Table */}
                          {isExpanded && network.subnets.length > 0 && (
                            <div className="bg-card/50">
                              <Table>
                                <TableHeader>
                                  <TableRow className="hover:bg-transparent border-border">
                                    <TableHead>Subnet</TableHead>
                                    <TableHead>Gateway</TableHead>
                                    <TableHead>DNS Servers</TableHead>
                                    <TableHead>Lease Time</TableHead>
                                    <TableHead>Ranges</TableHead>
                                    <TableHead>Active</TableHead>
                                    <TableHead>Static</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {network.subnets.map((subnet) => {
                                    const activeCount = getSubnetLeaseCount(
                                      network.name,
                                      subnet.subnet
                                    );

                                    return (
                                      <TableRow
                                        key={subnet.subnet}
                                        className="group border-border"
                                      >
                                        <TableCell className="font-medium">
                                          <div className="flex items-center gap-2">
                                            <Network className="h-4 w-4 text-muted-foreground" />
                                            {subnet.subnet}
                                            {capabilities?.has_subnet_id &&
                                              subnet.subnet_id && (
                                                <Badge
                                                  variant="outline"
                                                  className="text-xs ml-2"
                                                >
                                                  ID: {subnet.subnet_id}
                                                </Badge>
                                              )}
                                          </div>
                                        </TableCell>
                                        <TableCell>
                                          {subnet.default_router || (
                                            <span className="text-muted-foreground">—</span>
                                          )}
                                        </TableCell>
                                        <TableCell>
                                          {subnet.name_servers.length > 0 ? (
                                            <div className="flex flex-wrap gap-1">
                                              {subnet.name_servers.slice(0, 2).map((ns) => (
                                                <Badge
                                                  key={ns}
                                                  variant="secondary"
                                                  className="text-xs"
                                                >
                                                  {ns}
                                                </Badge>
                                              ))}
                                              {subnet.name_servers.length > 2 && (
                                                <Badge variant="secondary" className="text-xs">
                                                  +{subnet.name_servers.length - 2}
                                                </Badge>
                                              )}
                                            </div>
                                          ) : (
                                            <span className="text-muted-foreground">—</span>
                                          )}
                                        </TableCell>
                                        <TableCell>
                                          {subnet.lease ? (
                                            formatLease(subnet.lease)
                                          ) : (
                                            <span className="text-muted-foreground">—</span>
                                          )}
                                        </TableCell>
                                        <TableCell>
                                          <Badge variant="outline">
                                            {subnet.ranges.length}
                                          </Badge>
                                        </TableCell>
                                        <TableCell>
                                          <Badge
                                            variant="outline"
                                            className={cn(
                                              "cursor-pointer hover:bg-accent",
                                              activeCount > 0 && "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                                            )}
                                            onClick={() =>
                                              handleViewSubnetLeases(
                                                network.name,
                                                subnet.subnet
                                              )
                                            }
                                          >
                                            <Wifi className="h-3 w-3 mr-1" />
                                            {activeCount}
                                          </Badge>
                                        </TableCell>
                                        <TableCell>
                                          <Badge variant="outline">
                                            {subnet.static_mappings.length}
                                          </Badge>
                                        </TableCell>
                                        <TableCell className="text-right">
                                          <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Button
                                              variant="ghost"
                                              size="sm"
                                              onClick={() =>
                                                setEditingSubnet({
                                                  network: network.name,
                                                  subnet,
                                                })
                                              }
                                            >
                                              <Pencil className="h-4 w-4" />
                                            </Button>
                                            <Button
                                              variant="ghost"
                                              size="sm"
                                              onClick={() =>
                                                setDeletingSubnet({
                                                  network: network.name,
                                                  subnet,
                                                })
                                              }
                                            >
                                              <Trash2 className="h-4 w-4 text-destructive" />
                                            </Button>
                                          </div>
                                        </TableCell>
                                      </TableRow>
                                    );
                                  })}
                                </TableBody>
                              </Table>
                            </div>
                          )}

                          {/* Empty state for expanded network with no subnets */}
                          {isExpanded && network.subnets.length === 0 && (
                            <div className="p-8 text-center bg-card/50">
                              <p className="text-sm text-muted-foreground">
                                No subnets configured for this network
                              </p>
                            </div>
                          )}
                        </Card>
                      );
                    })}
                  </div>
                )}
              </ScrollArea>
            </div>
          </TabsContent>

          {/* Active Leases Tab */}
          <TabsContent value="leases" className="flex-1 mt-0">
            <div className="p-6 pt-4">
              {/* Search */}
              <div className="mb-4 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by IP, MAC, hostname, or network..."
                  value={leaseSearchQuery}
                  onChange={(e) => setLeaseSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Leases Table */}
              <Card>
                <ScrollArea className="h-[calc(100vh-400px)]">
                  {leasesLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <LoadingSpinner />
                    </div>
                  ) : filteredLeases.length === 0 ? (
                    <CardContent className="flex flex-col items-center justify-center py-12">
                      <Wifi className="h-12 w-12 text-muted-foreground mb-4" />
                      <h3 className="text-lg font-semibold text-foreground mb-2">
                        No Active Leases
                      </h3>
                      <p className="text-sm text-muted-foreground mb-4 text-center max-w-sm">
                        {leaseSearchQuery
                          ? "No leases match your search criteria"
                          : "No active DHCP leases found. Leases will appear here once devices request IP addresses."}
                      </p>
                      <p className="text-xs text-muted-foreground/60 mt-2">
                        Backend endpoint for leases pending implementation
                      </p>
                    </CardContent>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow className="hover:bg-transparent">
                          <TableHead>IP Address</TableHead>
                          <TableHead>MAC Address</TableHead>
                          <TableHead>Hostname</TableHead>
                          <TableHead>Network</TableHead>
                          <TableHead>Subnet</TableHead>
                          <TableHead>State</TableHead>
                          <TableHead>Expires</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredLeases.map((lease) => (
                          <TableRow key={`${lease.ip_address}-${lease.mac_address}`}>
                            <TableCell className="font-mono">
                              {lease.ip_address}
                            </TableCell>
                            <TableCell className="font-mono text-sm">
                              {lease.mac_address}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Monitor className="h-4 w-4 text-muted-foreground" />
                                {lease.hostname || (
                                  <span className="text-muted-foreground">Unknown</span>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>{lease.network}</TableCell>
                            <TableCell className="font-mono text-sm">
                              {lease.subnet}
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant={
                                  lease.state === "active"
                                    ? "default"
                                    : lease.state === "expired"
                                    ? "destructive"
                                    : "secondary"
                                }
                              >
                                {lease.state}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Clock className="h-4 w-4 text-muted-foreground" />
                                {lease.remaining}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </ScrollArea>
              </Card>
            </div>
          </TabsContent>
        </Tabs>

        {/* Subnet Leases Modal */}
        <Dialog
          open={!!selectedSubnetLeases}
          onOpenChange={(open) => !open && setSelectedSubnetLeases(null)}
        >
          <DialogContent className="max-w-4xl max-h-[80vh]">
            <DialogHeader>
              <DialogTitle>Active Leases</DialogTitle>
              <DialogDescription>
                {selectedSubnetLeases && (
                  <>
                    Network: {selectedSubnetLeases.network} | Subnet:{" "}
                    {selectedSubnetLeases.subnet}
                  </>
                )}
              </DialogDescription>
            </DialogHeader>
            <ScrollArea className="max-h-[60vh]">
              {selectedSubnetLeases?.leases.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <Wifi className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-sm text-muted-foreground">
                    No active leases for this subnet
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>IP Address</TableHead>
                      <TableHead>MAC Address</TableHead>
                      <TableHead>Hostname</TableHead>
                      <TableHead>Expires</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedSubnetLeases?.leases.map((lease) => (
                      <TableRow key={`${lease.ip_address}-${lease.mac_address}`}>
                        <TableCell className="font-mono">{lease.ip_address}</TableCell>
                        <TableCell className="font-mono text-sm">
                          {lease.mac_address}
                        </TableCell>
                        <TableCell>
                          {lease.hostname || (
                            <span className="text-muted-foreground">Unknown</span>
                          )}
                        </TableCell>
                        <TableCell>{lease.remaining}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </ScrollArea>
          </DialogContent>
        </Dialog>

        {/* Modals */}
        <CreateDHCPServerModal
          open={createModalOpen}
          onOpenChange={setCreateModalOpen}
          onSuccess={() => fetchConfig(true)}
          capabilities={capabilities}
        />

        {editingSubnet && (
          <EditDHCPServerModal
            open={!!editingSubnet}
            onOpenChange={(open) => !open && setEditingSubnet(null)}
            networkName={editingSubnet.network}
            subnet={editingSubnet.subnet}
            onSuccess={() => fetchConfig(true)}
            capabilities={capabilities}
          />
        )}

        {deletingSubnet && (
          <DeleteDHCPModal
            open={!!deletingSubnet}
            onOpenChange={(open) => !open && setDeletingSubnet(null)}
            networkName={deletingSubnet.network}
            subnet={deletingSubnet.subnet.subnet}
            onSuccess={() => fetchConfig(true)}
          />
        )}
      </div>
    </AppLayout>
  );
}
