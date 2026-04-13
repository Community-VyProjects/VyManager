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
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus,
  Search,
  RefreshCw,
  AlertCircle,
  Server,
  Network,
  Clock,
  Pencil,
  Trash2,
  MapPin,
  Activity,
  Wifi,
  Monitor,
  Globe,
  Settings2,
  Link2,
  Loader2,
} from "lucide-react";
import { useEffect, useState } from "react";
import {
  dhcpService,
  type DHCPConfigResponse,
  type DHCPSharedNetwork,
  type DHCPSubnet,
  type DHCPCapabilitiesResponse,
  type DHCPLease,
  type DHCPStaticMapping,
  type DHCPRange,
} from "@/lib/api/dhcp";
import { cn } from "@/lib/utils";
import { LoadingState } from "@/components/ui/loading-state";
import { ErrorState } from "@/components/ui/error-state";
import { ClickableSubnet } from "@/components/ui/clickable-items";
import { CreateDHCPServerModal } from "@/components/services/CreateDHCPServerModal";
import { EditDHCPServerModal } from "@/components/services/EditDHCPServerModal";
import { DeleteDHCPModal } from "@/components/services/DeleteDHCPModal";
import { EditStaticMappingModal } from "@/components/services/EditStaticMappingModal";
import { DeleteStaticMappingModal } from "@/components/services/DeleteStaticMappingModal";
import { AddLeaseToStaticMappingModal } from "@/components/services/AddLeaseToStaticMappingModal";
import { AddRangeModal } from "@/components/services/AddRangeModal";
import { AddStaticMappingModal } from "@/components/services/AddStaticMappingModal";
import { EditRangeModal } from "@/components/services/EditRangeModal";
import { ChevronRight } from "lucide-react";

function formatLease(seconds: string): string {
  const secs = parseInt(seconds);
  const hours = Math.floor(secs / 3600);
  const days = Math.floor(hours / 24);
  if (days > 0) return `${days}d`;
  if (hours > 0) return `${hours}h`;
  return `${Math.floor(secs / 60)}m`;
}

// Helper function to check if an IP address is within a CIDR subnet
function isIpInSubnet(ip: string, cidr: string): boolean {
  const [subnetIp, maskBits] = cidr.split("/");
  const mask = parseInt(maskBits);

  const ipParts = ip.split(".").map(Number);
  const subnetParts = subnetIp.split(".").map(Number);

  // Convert to 32-bit integers
  const ipInt = (ipParts[0] << 24) | (ipParts[1] << 16) | (ipParts[2] << 8) | ipParts[3];
  const subnetInt = (subnetParts[0] << 24) | (subnetParts[1] << 16) | (subnetParts[2] << 8) | subnetParts[3];

  // Create mask
  const maskInt = mask === 0 ? 0 : (~0 << (32 - mask)) >>> 0;

  // Check if IP is in subnet
  return ((ipInt >>> 0) & maskInt) === ((subnetInt >>> 0) & maskInt);
}

export default function DHCPPage() {
  const [config, setConfig] = useState<DHCPConfigResponse | null>(null);
  const [capabilities, setCapabilities] = useState<DHCPCapabilitiesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Selected network state
  const [selectedNetwork, setSelectedNetwork] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("subnets");

  // Search states
  const [searchQuery, setSearchQuery] = useState("");
  const [rangeSubnetFilter, setRangeSubnetFilter] = useState<string>("all");
  const [staticSubnetFilter, setStaticSubnetFilter] = useState<string>("all");
  const [leaseStateFilter, setLeaseStateFilter] = useState<string>("all");
  const [leaseSubnetFilter, setLeaseSubnetFilter] = useState<string>("all");

  // Lease states
  const [leases, setLeases] = useState<DHCPLease[]>([]);
  const [leasesLoading, setLeasesLoading] = useState(false);

  // Modal states
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [addingSubnetToNetwork, setAddingSubnetToNetwork] = useState<string | null>(null);
  const [editingSubnet, setEditingSubnet] = useState<{
    network: string;
    subnet: DHCPSubnet;
  } | null>(null);
  const [deletingSubnet, setDeletingSubnet] = useState<{
    network: string;
    subnet: DHCPSubnet;
  } | null>(null);
  const [deletingNetwork, setDeletingNetwork] = useState<string | null>(null);

  // Static mapping modal states
  const [editingStaticMapping, setEditingStaticMapping] = useState<{
    network: string;
    subnet: string;
    mapping: DHCPStaticMapping;
  } | null>(null);
  const [deletingStaticMapping, setDeletingStaticMapping] = useState<{
    network: string;
    subnet: string;
    mapping: DHCPStaticMapping;
  } | null>(null);

  // Lease to static mapping modal state
  const [addingLeaseToStatic, setAddingLeaseToStatic] = useState<DHCPLease | null>(null);

  // Range modal state
  const [addingRange, setAddingRange] = useState(false);
  const [editingRange, setEditingRange] = useState<{
    subnet: string;
    range: DHCPRange;
  } | null>(null);

  // Static mapping modal state
  const [addingStaticMapping, setAddingStaticMapping] = useState(false);

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

      // Auto-select first network if none selected
      if (!selectedNetwork && configData.shared_networks.length > 0) {
        setSelectedNetwork(configData.shared_networks[0].name);
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load DHCP configuration"
      );
      console.error("Error fetching DHCP config:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchLeases = async () => {
    try {
      setLeasesLoading(true);
      const leasesData = await dhcpService.getLeases();
      setLeases(leasesData.leases);
    } catch (err) {
      console.error("Error fetching leases:", err);
      setLeases([]);
    } finally {
      setLeasesLoading(false);
    }
  };

  const handleDeleteRange = async (subnet: string, rangeId: string) => {
    if (!currentNetwork) return;
    try {
      await dhcpService.deleteRange(currentNetwork.name, subnet, rangeId);
      fetchConfig(true);
    } catch (err) {
      console.error("Error deleting range:", err);
    }
  };

  useEffect(() => {
    fetchConfig();
    fetchLeases();
  }, []);

  // Get currently selected network data
  const currentNetwork = config?.shared_networks.find(n => n.name === selectedNetwork) || null;

  // Get lease count for a subnet by checking if lease IP falls within subnet CIDR
  const getSubnetLeaseCount = (subnet: string): number => {
    return leases.filter((l) => l.state === "active" && isIpInSubnet(l.ip_address, subnet)).length;
  };

  // Get total active leases for a network
  const getNetworkLeaseCount = (network: DHCPSharedNetwork): number => {
    return network.subnets.reduce((sum, s) => sum + getSubnetLeaseCount(s.subnet), 0);
  };

  // Get all static mappings for current network
  const getAllStaticMappings = (): Array<DHCPStaticMapping & { subnet: string }> => {
    if (!currentNetwork) return [];
    const mappings: Array<DHCPStaticMapping & { subnet: string }> = [];
    currentNetwork.subnets.forEach(subnet => {
      subnet.static_mappings.forEach(mapping => {
        mappings.push({ ...mapping, subnet: subnet.subnet });
      });
    });
    return mappings;
  };

  // Get all ranges for current network
  const getAllRanges = (): Array<DHCPRange & { subnet: string }> => {
    if (!currentNetwork) return [];
    const ranges: Array<DHCPRange & { subnet: string }> = [];
    currentNetwork.subnets.forEach(subnet => {
      subnet.ranges.forEach(range => {
        ranges.push({ ...range, subnet: subnet.subnet });
      });
    });
    return ranges;
  };

  // Check if a MAC address has a static mapping in the current network
  const hasStaticMapping = (macAddress: string): boolean => {
    if (!currentNetwork) return false;
    const normalizedMac = macAddress.toLowerCase();
    return currentNetwork.subnets.some(subnet =>
      subnet.static_mappings.some(mapping =>
        mapping.mac_address?.toLowerCase() === normalizedMac
      )
    );
  };

  // Filter subnets based on search
  const filteredSubnets = currentNetwork?.subnets.filter(subnet =>
    subnet.subnet.toLowerCase().includes(searchQuery.toLowerCase()) ||
    subnet.default_router?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    subnet.domain_name?.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  // Filter ranges based on subnet filter
  const filteredRanges = getAllRanges().filter(range =>
    rangeSubnetFilter === "all" || range.subnet === rangeSubnetFilter
  );

  // Filter static mappings based on search and subnet filter
  const filteredStaticMappings = getAllStaticMappings().filter(mapping => {
    const matchesSubnet = staticSubnetFilter === "all" || mapping.subnet === staticSubnetFilter;
    const matchesSearch = searchQuery === "" ||
      mapping.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      mapping.ip_address?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      mapping.mac_address?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSubnet && matchesSearch;
  });

  // Filter leases for current network
  // VyOS pool field can be either the shared network name OR the subnet CIDR
  const networkLeases = leases.filter(lease =>
    currentNetwork?.name === lease.pool ||
    currentNetwork?.subnets.some(s => s.subnet === lease.pool)
  );

  const filteredLeases = networkLeases.filter(lease => {
    const matchesState = leaseStateFilter === "all" || lease.state === leaseStateFilter;
    const matchesSubnet = leaseSubnetFilter === "all" || lease.pool === leaseSubnetFilter;
    const matchesSearch = searchQuery === "" ||
      lease.ip_address.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lease.mac_address.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lease.hostname?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesState && matchesSubnet && matchesSearch;
  });

  const totalSubnets = config?.total_subnets || 0;
  const totalStatic = config?.total_static_mappings || 0;
  const totalNetworks = config?.shared_networks.length || 0;
  const totalActiveLeases = leases.filter((l) => l.state === "active").length;

  if (loading) {
    return (
      <AppLayout>
        <LoadingState message="Loading DHCP configuration..." fullPage />
      </AppLayout>
    );
  }

  if (error) {
    return (
      <AppLayout>
        <ErrorState
          title="Error Loading DHCP"
          message={error}
          onRetry={() => fetchConfig(true)}
        />
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="flex h-full overflow-hidden">
        {/* Sidebar */}
        <div className="w-72 border-r border-border bg-card/50 flex flex-col">
          {/* Sidebar Header */}
          <div className="p-4 border-b border-border">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold text-foreground">DHCP Servers</h2>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  fetchConfig(true);
                  fetchLeases();
                }}
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
            <Button
              className="w-full"
              size="sm"
              onClick={() => setCreateModalOpen(true)}
            >
              <Plus className="h-4 w-4 mr-2" />
              New Server
            </Button>
          </div>

          {/* Network List */}
          <ScrollArea className="flex-1">
            <div className="p-2">
              {config?.shared_networks.length === 0 ? (
                <div className="px-3 py-8 text-center">
                  <Server className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No DHCP servers</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Click "New Server" to create one
                  </p>
                </div>
              ) : (
                <div className="space-y-1">
                  {config?.shared_networks.map((network) => {
                    const isSelected = selectedNetwork === network.name;

                    return (
                      <div
                        key={network.name}
                        className={cn(
                          "group w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all cursor-pointer",
                          isSelected
                            ? "bg-accent text-accent-foreground shadow-sm"
                            : "hover:bg-accent/50 text-foreground"
                        )}
                        onClick={() => setSelectedNetwork(network.name)}
                      >
                        <div className="p-1.5 rounded-md bg-blue-500/10 flex-shrink-0">
                          <Server className="h-4 w-4 text-blue-500" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium truncate">{network.name}</div>
                        </div>
                        <button
                          className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-destructive/10 transition-opacity"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeletingNetwork(network.name);
                          }}
                          title="Delete network"
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
                <Server className="h-4 w-4 text-blue-500" />
                <span className="text-muted-foreground">Networks:</span>
                <span className="font-medium">{totalNetworks}</span>
              </div>
              <div className="flex items-center gap-2">
                <Network className="h-4 w-4 text-green-500" />
                <span className="text-muted-foreground">Subnets:</span>
                <span className="font-medium">{totalSubnets}</span>
              </div>
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-emerald-500" />
                <span className="text-muted-foreground">Leases:</span>
                <span className="font-medium">{totalActiveLeases}</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-purple-500" />
                <span className="text-muted-foreground">Static:</span>
                <span className="font-medium">{totalStatic}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {currentNetwork ? (
            <>
              {/* Network Header */}
              <div className="border-b border-border bg-card/50 px-6 py-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                      <span>DHCP</span>
                      <ChevronRight className="h-4 w-4" />
                      <span className="text-foreground font-medium">{currentNetwork.name}</span>
                      {currentNetwork.authoritative && (
                        <Badge variant="outline" className="ml-2 bg-blue-500/5 border-blue-500/20 text-blue-500">
                          Authoritative
                        </Badge>
                      )}
                    </div>
                    <h2 className="text-2xl font-bold text-foreground">{currentNetwork.name}</h2>
                    {currentNetwork.domain_name && (
                      <div className="flex items-center gap-1.5 mt-1 text-sm text-muted-foreground">
                        <Globe className="h-3.5 w-3.5" />
                        {currentNetwork.domain_name}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Tabs */}
              <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
                <div className="border-b border-border px-6">
                  <TabsList className="bg-transparent h-12">
                    <TabsTrigger value="subnets" className="data-[state=active]:bg-accent">
                      <Network className="h-4 w-4 mr-2" />
                      Subnets
                      <Badge variant="secondary" className="ml-2">
                        {currentNetwork.subnets.length}
                      </Badge>
                    </TabsTrigger>
                    <TabsTrigger value="ranges" className="data-[state=active]:bg-accent">
                      <Settings2 className="h-4 w-4 mr-2" />
                      Ranges
                      <Badge variant="secondary" className="ml-2">
                        {getAllRanges().length}
                      </Badge>
                    </TabsTrigger>
                    <TabsTrigger value="static" className="data-[state=active]:bg-accent">
                      <MapPin className="h-4 w-4 mr-2" />
                      Static Mappings
                      <Badge variant="secondary" className="ml-2">
                        {getAllStaticMappings().length}
                      </Badge>
                    </TabsTrigger>
                    <TabsTrigger value="leases" className="data-[state=active]:bg-accent">
                      <Activity className="h-4 w-4 mr-2" />
                      Leases
                      {networkLeases.filter(l => l.state === "active").length > 0 && (
                        <Badge variant="secondary" className="ml-2 bg-emerald-500/10 text-emerald-500">
                          {networkLeases.filter(l => l.state === "active").length}
                        </Badge>
                      )}
                    </TabsTrigger>
                  </TabsList>
                </div>

                {/* Subnets Tab */}
                <TabsContent value="subnets" className="flex-1 mt-0 overflow-hidden">
                  <div className="p-6 h-full flex flex-col">
                    {/* Search and Add Button */}
                    <div className="flex items-center gap-4 mb-4">
                      <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="Search subnets..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="pl-10"
                        />
                      </div>
                      <Button
                        size="sm"
                        onClick={() => setAddingSubnetToNetwork(currentNetwork.name)}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Subnet
                      </Button>
                      <div className="text-sm text-muted-foreground ml-auto">
                        {filteredSubnets.length} subnet{filteredSubnets.length !== 1 ? "s" : ""}
                      </div>
                    </div>

                    {/* Subnets Table */}
                    <Card className="flex-1 overflow-hidden">
                      <ScrollArea className="h-full">
                        {filteredSubnets.length === 0 ? (
                          <div className="flex flex-col items-center justify-center py-12">
                            <Network className="h-12 w-12 text-muted-foreground mb-4" />
                            <h3 className="text-lg font-semibold text-foreground mb-2">
                              No Subnets
                            </h3>
                            <p className="text-sm text-muted-foreground mb-4">
                              {searchQuery ? "No subnets match your search" : "Add a subnet to this network"}
                            </p>
                            {!searchQuery && (
                              <Button onClick={() => setAddingSubnetToNetwork(currentNetwork.name)}>
                                <Plus className="h-4 w-4 mr-2" />
                                Add Subnet
                              </Button>
                            )}
                          </div>
                        ) : (
                          <Table>
                            <TableHeader>
                              <TableRow className="hover:bg-transparent">
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
                              {filteredSubnets.map((subnet) => {
                                const activeCount = getSubnetLeaseCount(subnet.subnet);

                                return (
                                  <TableRow key={subnet.subnet} className="group">
                                    <TableCell className="font-medium">
                                      <div className="flex items-center gap-2">
                                        <Network className="h-4 w-4 text-muted-foreground" />
                                        <ClickableSubnet
                                          subnet={subnet.subnet}
                                          networkName={currentNetwork.name}
                                          data={{ network: currentNetwork, subnet }}
                                          variant="link"
                                          size="sm"
                                          showIcon={false}
                                        >
                                          {subnet.subnet}
                                        </ClickableSubnet>
                                        {capabilities?.has_subnet_id && subnet.subnet_id && (
                                          <Badge variant="outline" className="text-xs ml-1">
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
                                            <Badge key={ns} variant="secondary" className="text-xs">
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
                                      {subnet.lease ? formatLease(subnet.lease) : (
                                        <span className="text-muted-foreground">—</span>
                                      )}
                                    </TableCell>
                                    <TableCell>
                                      <Badge variant="outline">{subnet.ranges.length}</Badge>
                                    </TableCell>
                                    <TableCell>
                                      <Badge
                                        variant="outline"
                                        className={cn(
                                          activeCount > 0 && "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                                        )}
                                      >
                                        {activeCount}
                                      </Badge>
                                    </TableCell>
                                    <TableCell>
                                      <Badge variant="outline">
                                        {subnet.static_mappings.length}
                                      </Badge>
                                    </TableCell>
                                    <TableCell className="text-right">
                                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className="h-8 w-8"
                                          onClick={() => setEditingSubnet({
                                            network: currentNetwork.name,
                                            subnet,
                                          })}
                                        >
                                          <Pencil className="h-4 w-4" />
                                        </Button>
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className="h-8 w-8 hover:bg-destructive/10"
                                          onClick={() => setDeletingSubnet({
                                            network: currentNetwork.name,
                                            subnet,
                                          })}
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
                        )}
                      </ScrollArea>
                    </Card>
                  </div>
                </TabsContent>

                {/* Ranges Tab */}
                <TabsContent value="ranges" className="flex-1 mt-0 overflow-hidden">
                  <div className="p-6 h-full flex flex-col">
                    {/* Filters and Add Button */}
                    <div className="flex items-center gap-4 mb-4">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">Subnet:</span>
                        <Select value={rangeSubnetFilter} onValueChange={setRangeSubnetFilter}>
                          <SelectTrigger className="w-[200px]">
                            <SelectValue placeholder="All Subnets" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Subnets</SelectItem>
                            {currentNetwork.subnets.map((subnet) => (
                              <SelectItem key={subnet.subnet} value={subnet.subnet}>
                                {subnet.subnet}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => setAddingRange(true)}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Range
                      </Button>
                      <div className="text-sm text-muted-foreground ml-auto">
                        {filteredRanges.length} range{filteredRanges.length !== 1 ? "s" : ""}
                      </div>
                    </div>

                    {/* Ranges Table */}
                    <Card className="flex-1 overflow-hidden">
                      <ScrollArea className="h-full">
                        {filteredRanges.length === 0 ? (
                          <div className="flex flex-col items-center justify-center py-12">
                            <Settings2 className="h-12 w-12 text-muted-foreground mb-4" />
                            <h3 className="text-lg font-semibold text-foreground mb-2">
                              No Ranges
                            </h3>
                            <p className="text-sm text-muted-foreground">
                              No DHCP ranges configured for this network
                            </p>
                          </div>
                        ) : (
                          <Table>
                            <TableHeader>
                              <TableRow className="hover:bg-transparent">
                                <TableHead>Subnet</TableHead>
                                <TableHead>Range ID</TableHead>
                                <TableHead>Start IP</TableHead>
                                <TableHead>Stop IP</TableHead>
                                <TableHead>Pool Size</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {filteredRanges.map((range, idx) => {
                                // Calculate pool size
                                let poolSize = "—";
                                if (range.start && range.stop) {
                                  const startParts = range.start.split(".").map(Number);
                                  const stopParts = range.stop.split(".").map(Number);
                                  const startNum = (startParts[0] << 24) + (startParts[1] << 16) + (startParts[2] << 8) + startParts[3];
                                  const stopNum = (stopParts[0] << 24) + (stopParts[1] << 16) + (stopParts[2] << 8) + stopParts[3];
                                  poolSize = String((stopNum - startNum + 1) >>> 0);
                                }

                                return (
                                  <TableRow key={`${range.subnet}-${range.range_id}-${idx}`} className="group">
                                    <TableCell>
                                      <Badge variant="outline">{range.subnet}</Badge>
                                    </TableCell>
                                    <TableCell className="font-mono">{range.range_id}</TableCell>
                                    <TableCell className="font-mono">{range.start || "—"}</TableCell>
                                    <TableCell className="font-mono">{range.stop || "—"}</TableCell>
                                    <TableCell>
                                      <Badge variant="secondary">{poolSize} IPs</Badge>
                                    </TableCell>
                                    <TableCell className="text-right">
                                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className="h-8 w-8"
                                          onClick={() => setEditingRange({
                                            subnet: range.subnet,
                                            range: {
                                              range_id: range.range_id,
                                              start: range.start,
                                              stop: range.stop,
                                            },
                                          })}
                                        >
                                          <Pencil className="h-4 w-4" />
                                        </Button>
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className="h-8 w-8 hover:bg-destructive/10"
                                          onClick={() => handleDeleteRange(range.subnet, range.range_id)}
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
                        )}
                      </ScrollArea>
                    </Card>

                    {/* Excluded Addresses Section */}
                    {currentNetwork.subnets.some(s => s.excludes.length > 0) && (
                      <div className="mt-4">
                        <h4 className="text-sm font-medium text-foreground mb-2">Excluded Addresses</h4>
                        <div className="flex flex-wrap gap-2">
                          {currentNetwork.subnets.flatMap(subnet =>
                            subnet.excludes.map(ip => (
                              <Badge key={`${subnet.subnet}-${ip}`} variant="outline" className="font-mono">
                                {ip}
                                <span className="text-muted-foreground ml-1 text-xs">({subnet.subnet})</span>
                              </Badge>
                            ))
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </TabsContent>

                {/* Static Mappings Tab */}
                <TabsContent value="static" className="flex-1 mt-0 overflow-hidden">
                  <div className="p-6 h-full flex flex-col">
                    {/* Search and Filters */}
                    <div className="flex items-center gap-4 mb-4">
                      <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="Search by name, IP, or MAC..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="pl-10"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">Subnet:</span>
                        <Select value={staticSubnetFilter} onValueChange={setStaticSubnetFilter}>
                          <SelectTrigger className="w-[200px]">
                            <SelectValue placeholder="All Subnets" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Subnets</SelectItem>
                            {currentNetwork.subnets.map((subnet) => (
                              <SelectItem key={subnet.subnet} value={subnet.subnet}>
                                {subnet.subnet}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => setAddingStaticMapping(true)}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Static Mapping
                      </Button>
                      <div className="text-sm text-muted-foreground ml-auto">
                        {filteredStaticMappings.length} mapping{filteredStaticMappings.length !== 1 ? "s" : ""}
                      </div>
                    </div>

                    {/* Static Mappings Table */}
                    <Card className="flex-1 overflow-hidden">
                      <ScrollArea className="h-full">
                        {filteredStaticMappings.length === 0 ? (
                          <div className="flex flex-col items-center justify-center py-12">
                            <MapPin className="h-12 w-12 text-muted-foreground mb-4" />
                            <h3 className="text-lg font-semibold text-foreground mb-2">
                              No Static Mappings
                            </h3>
                            <p className="text-sm text-muted-foreground">
                              {searchQuery ? "No mappings match your search" : "No static MAC to IP mappings configured"}
                            </p>
                          </div>
                        ) : (
                          <Table>
                            <TableHeader>
                              <TableRow className="hover:bg-transparent">
                                <TableHead>Name</TableHead>
                                <TableHead>MAC Address</TableHead>
                                <TableHead>IP Address</TableHead>
                                <TableHead>Subnet</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {filteredStaticMappings.map((mapping) => (
                                <TableRow key={`${mapping.subnet}-${mapping.name}`} className="group">
                                  <TableCell className="font-medium">
                                    <div className="flex items-center gap-2">
                                      <Monitor className="h-4 w-4 text-muted-foreground" />
                                      {mapping.name}
                                    </div>
                                  </TableCell>
                                  <TableCell className="font-mono text-sm">
                                    {mapping.mac_address || <span className="text-muted-foreground">—</span>}
                                  </TableCell>
                                  <TableCell className="font-mono">
                                    {mapping.ip_address || <span className="text-muted-foreground">—</span>}
                                  </TableCell>
                                  <TableCell>
                                    <Badge variant="outline">{mapping.subnet}</Badge>
                                  </TableCell>
                                  <TableCell>
                                    <Badge
                                      variant="outline"
                                      className={cn(
                                        mapping.disable
                                          ? "bg-red-500/10 text-red-500 border-red-500/20"
                                          : "bg-green-500/10 text-green-500 border-green-500/20"
                                      )}
                                    >
                                      {mapping.disable ? "Disabled" : "Enabled"}
                                    </Badge>
                                  </TableCell>
                                  <TableCell className="text-right">
                                    <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8"
                                        onClick={() => {
                                          setEditingStaticMapping({
                                            network: currentNetwork.name,
                                            subnet: mapping.subnet,
                                            mapping: {
                                              name: mapping.name,
                                              ip_address: mapping.ip_address,
                                              mac_address: mapping.mac_address,
                                              disable: mapping.disable,
                                            },
                                          });
                                        }}
                                      >
                                        <Pencil className="h-4 w-4" />
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 hover:bg-destructive/10"
                                        onClick={() => {
                                          setDeletingStaticMapping({
                                            network: currentNetwork.name,
                                            subnet: mapping.subnet,
                                            mapping: {
                                              name: mapping.name,
                                              ip_address: mapping.ip_address,
                                              mac_address: mapping.mac_address,
                                              disable: mapping.disable,
                                            },
                                          });
                                        }}
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
                      </ScrollArea>
                    </Card>
                  </div>
                </TabsContent>

                {/* Leases Tab */}
                <TabsContent value="leases" className="flex-1 mt-0 overflow-hidden">
                  <div className="p-6 h-full flex flex-col">
                    {/* Search and Filters */}
                    <div className="flex items-center gap-4 mb-4">
                      <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="Search by IP, MAC, or hostname..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="pl-10"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">State:</span>
                        <Select value={leaseStateFilter} onValueChange={setLeaseStateFilter}>
                          <SelectTrigger className="w-[120px]">
                            <SelectValue placeholder="All" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All</SelectItem>
                            <SelectItem value="active">Active</SelectItem>
                            <SelectItem value="expired">Expired</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">Subnet:</span>
                        <Select value={leaseSubnetFilter} onValueChange={setLeaseSubnetFilter}>
                          <SelectTrigger className="w-[200px]">
                            <SelectValue placeholder="All Subnets" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Subnets</SelectItem>
                            {currentNetwork.subnets.map((subnet) => (
                              <SelectItem key={subnet.subnet} value={subnet.subnet}>
                                {subnet.subnet}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={fetchLeases}
                        disabled={leasesLoading}
                      >
                        <RefreshCw className={cn("h-4 w-4 mr-2", leasesLoading && "animate-spin")} />
                        Refresh
                      </Button>
                      <div className="text-sm text-muted-foreground ml-auto">
                        {filteredLeases.length} lease{filteredLeases.length !== 1 ? "s" : ""}
                      </div>
                    </div>

                    {/* Leases Table */}
                    <Card className="flex-1 overflow-hidden">
                      <ScrollArea className="h-full">
                        {leasesLoading ? (
                          <div className="flex items-center justify-center py-12">
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Loader2 className="h-4 w-4 animate-spin" />
                              Loading leases...
                            </div>
                          </div>
                        ) : filteredLeases.length === 0 ? (
                          <div className="flex flex-col items-center justify-center py-12">
                            <Wifi className="h-12 w-12 text-muted-foreground mb-4" />
                            <h3 className="text-lg font-semibold text-foreground mb-2">
                              No Leases
                            </h3>
                            <p className="text-sm text-muted-foreground">
                              {searchQuery ? "No leases match your search" : "No DHCP leases for this network"}
                            </p>
                          </div>
                        ) : (
                          <Table>
                            <TableHeader>
                              <TableRow className="hover:bg-transparent">
                                <TableHead>IP Address</TableHead>
                                <TableHead>MAC Address</TableHead>
                                <TableHead>Hostname</TableHead>
                                <TableHead>Subnet</TableHead>
                                <TableHead>State</TableHead>
                                <TableHead>Expires</TableHead>
                                <TableHead className="w-[100px]">Actions</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {filteredLeases.map((lease) => (
                                <TableRow key={`${lease.ip_address}-${lease.mac_address}`}>
                                  <TableCell className="font-mono">{lease.ip_address}</TableCell>
                                  <TableCell className="font-mono text-sm">{lease.mac_address}</TableCell>
                                  <TableCell>
                                    <div className="flex items-center gap-2">
                                      <Monitor className="h-4 w-4 text-muted-foreground" />
                                      {lease.hostname || <span className="text-muted-foreground">Unknown</span>}
                                    </div>
                                  </TableCell>
                                  <TableCell>
                                    <Badge variant="outline">{lease.pool}</Badge>
                                  </TableCell>
                                  <TableCell>
                                    <Badge
                                      variant="outline"
                                      className={cn(
                                        lease.state === "active" && "bg-green-500/10 text-green-500 border-green-500/20",
                                        lease.state === "expired" && "bg-red-500/10 text-red-500 border-red-500/20"
                                      )}
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
                                  <TableCell>
                                    {hasStaticMapping(lease.mac_address) ? (
                                      <Badge
                                        variant="outline"
                                        className="bg-green-500/10 text-green-500 border-green-500/20"
                                      >
                                        Static Assigned
                                      </Badge>
                                    ) : (
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => setAddingLeaseToStatic(lease)}
                                        title="Add to Static Mapping"
                                      >
                                        <Plus className="h-4 w-4 mr-1" />
                                        Add Static
                                      </Button>
                                    )}
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
            </>
          ) : (
            /* No Network Selected State */
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center space-y-4">
                <Server className="h-16 w-16 text-muted-foreground mx-auto" />
                <h2 className="text-xl font-semibold text-foreground">No DHCP Servers</h2>
                <p className="text-muted-foreground max-w-md">
                  Get started by creating your first DHCP server to manage IP address allocation.
                </p>
                <Button onClick={() => setCreateModalOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create DHCP Server
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Modals */}
        <CreateDHCPServerModal
          open={createModalOpen || !!addingSubnetToNetwork}
          onOpenChange={(open) => {
            if (!open) {
              setCreateModalOpen(false);
              setAddingSubnetToNetwork(null);
            }
          }}
          onSuccess={() => {
            fetchConfig(true);
            fetchLeases();
          }}
          capabilities={capabilities}
          existingNetwork={addingSubnetToNetwork || undefined}
        />

        {editingSubnet && (
          <EditDHCPServerModal
            open={!!editingSubnet}
            onOpenChange={(open) => !open && setEditingSubnet(null)}
            networkName={editingSubnet.network}
            subnet={editingSubnet.subnet}
            onSuccess={() => {
              fetchConfig(true);
              fetchLeases();
            }}
            capabilities={capabilities}
          />
        )}

        {deletingSubnet && (
          <DeleteDHCPModal
            open={!!deletingSubnet}
            onOpenChange={(open) => !open && setDeletingSubnet(null)}
            networkName={deletingSubnet.network}
            subnet={deletingSubnet.subnet.subnet}
            onSuccess={() => {
              fetchConfig(true);
              fetchLeases();
            }}
          />
        )}

        {deletingNetwork && (
          <DeleteDHCPModal
            open={!!deletingNetwork}
            onOpenChange={(open) => !open && setDeletingNetwork(null)}
            networkName={deletingNetwork}
            deleteEntireNetwork={true}
            onSuccess={() => {
              setSelectedNetwork(null);
              fetchConfig(true);
              fetchLeases();
            }}
          />
        )}

        {/* Static Mapping Modals */}
        {editingStaticMapping && (
          <EditStaticMappingModal
            open={!!editingStaticMapping}
            onOpenChange={(open) => !open && setEditingStaticMapping(null)}
            networkName={editingStaticMapping.network}
            subnet={editingStaticMapping.subnet}
            mapping={editingStaticMapping.mapping}
            onSuccess={() => {
              fetchConfig(true);
              fetchLeases();
            }}
          />
        )}

        {deletingStaticMapping && (
          <DeleteStaticMappingModal
            open={!!deletingStaticMapping}
            onOpenChange={(open) => !open && setDeletingStaticMapping(null)}
            networkName={deletingStaticMapping.network}
            subnet={deletingStaticMapping.subnet}
            mapping={deletingStaticMapping.mapping}
            onSuccess={() => {
              fetchConfig(true);
              fetchLeases();
            }}
          />
        )}

        {/* Lease to Static Mapping Modal */}
        {addingLeaseToStatic && currentNetwork && (
          <AddLeaseToStaticMappingModal
            open={!!addingLeaseToStatic}
            onOpenChange={(open) => !open && setAddingLeaseToStatic(null)}
            lease={addingLeaseToStatic}
            network={currentNetwork}
            onSuccess={() => {
              fetchConfig(true);
              fetchLeases();
              // Switch to Static Mappings tab to show the new mapping
              setActiveTab("static");
            }}
          />
        )}

        {/* Add Range Modal */}
        {currentNetwork && (
          <AddRangeModal
            open={addingRange}
            onOpenChange={setAddingRange}
            network={currentNetwork}
            onSuccess={() => {
              fetchConfig(true);
            }}
          />
        )}

        {/* Edit Range Modal */}
        {editingRange && currentNetwork && (
          <EditRangeModal
            open={!!editingRange}
            onOpenChange={(open) => !open && setEditingRange(null)}
            networkName={currentNetwork.name}
            subnet={editingRange.subnet}
            range={editingRange.range}
            onSuccess={() => {
              fetchConfig(true);
            }}
          />
        )}

        {/* Add Static Mapping Modal */}
        {currentNetwork && (
          <AddStaticMappingModal
            open={addingStaticMapping}
            onOpenChange={setAddingStaticMapping}
            network={currentNetwork}
            onSuccess={() => {
              fetchConfig(true);
              // Switch to Static Mappings tab to show the new mapping
              setActiveTab("static");
            }}
          />
        )}
      </div>
    </AppLayout>
  );
}
