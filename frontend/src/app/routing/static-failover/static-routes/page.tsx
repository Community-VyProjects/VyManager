"use client";

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
  Plus,
  Search,
  RefreshCw,
  AlertCircle,
  Route,
  Pencil,
  Trash2,
  Network,
  Shield,
  ArrowRight,
  Radio,
  Users,
  Cable,
} from "lucide-react";
import { useEffect, useState } from "react";
import {
  staticRoutesService,
  type StaticRoute,
  type StaticRoutesConfig,
  type StaticRoutesCapabilities,
  type ArpEntry,
  type MulticastRoute,
  type NeighborProxyArp,
  type NeighborProxyNd,
} from "@/lib/api/static-routes";
import { cn } from "@/lib/utils";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { CreateStaticRouteModal } from "@/components/routing/CreateStaticRouteModal";
import { EditStaticRouteModal } from "@/components/routing/EditStaticRouteModal";
import { DeleteStaticRouteModal } from "@/components/routing/DeleteStaticRouteModal";
import { CreateArpEntryModal } from "@/components/routing/CreateArpEntryModal";
import { EditArpEntryModal } from "@/components/routing/EditArpEntryModal";
import { DeleteArpEntryModal } from "@/components/routing/DeleteArpEntryModal";
import { CreateMrouteModal } from "@/components/routing/CreateMrouteModal";
import { DeleteMrouteModal } from "@/components/routing/DeleteMrouteModal";
import { CreateNeighborProxyModal } from "@/components/routing/CreateNeighborProxyModal";
import { DeleteNeighborProxyModal } from "@/components/routing/DeleteNeighborProxyModal";
import { CreateRoutingTableModal } from "@/components/routing/CreateRoutingTableModal";
import { RoutingTablesAccordion } from "@/components/routing/RoutingTablesAccordion";

export default function StaticRoutesPage() {
  const [config, setConfig] = useState<StaticRoutesConfig | null>(null);
  const [capabilities, setCapabilities] = useState<StaticRoutesCapabilities | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState<"ipv4" | "ipv6">("ipv4");
  const [activeTab, setActiveTab] = useState("routes");

  // Modal states for routes
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editingRoute, setEditingRoute] = useState<StaticRoute | null>(null);
  const [deletingRoute, setDeletingRoute] = useState<StaticRoute | null>(null);

  // Modal states for ARP
  const [createArpModalOpen, setCreateArpModalOpen] = useState(false);
  const [editingArpEntry, setEditingArpEntry] = useState<{ entry: ArpEntry; interface: string } | null>(null);
  const [deletingArpEntry, setDeletingArpEntry] = useState<{ entry: ArpEntry; interface: string } | null>(null);

  // Modal states for Multicast Routes
  const [createMrouteModalOpen, setCreateMrouteModalOpen] = useState(false);
  const [deletingMroute, setDeletingMroute] = useState<MulticastRoute | null>(null);

  // Modal states for Neighbor Proxy
  const [createNeighborProxyModalOpen, setCreateNeighborProxyModalOpen] = useState(false);
  const [deletingNeighborProxy, setDeletingNeighborProxy] = useState<{
    entry: NeighborProxyArp | NeighborProxyNd;
    type: "arp" | "nd";
  } | null>(null);

  // Modal states for Routing Tables
  const [createTableModalOpen, setCreateTableModalOpen] = useState(false);

  const fetchConfig = async (refresh: boolean = false) => {
    try {
      setLoading(true);
      setError(null);
      const [configData, capsData] = await Promise.all([
        staticRoutesService.getConfig(refresh),
        staticRoutesService.getCapabilities(),
      ]);
      setConfig(configData);
      setCapabilities(capsData);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load static routes configuration"
      );
      console.error("Error fetching static routes config:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConfig();
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tab = params.get("tab");
    if (tab === "routes" || tab === "arp" || tab === "mroute" || tab === "neighbor-proxy" || tab === "tables") {
      setActiveTab(tab);
    }
  }, []);

  // Get current routes based on selected type
  const currentRoutes = selectedType === "ipv4"
    ? (config?.ipv4_routes || [])
    : (config?.ipv6_routes || []);

  // Filter routes based on search
  const filteredRoutes = currentRoutes.filter((route) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();

    return (
      route.destination.toLowerCase().includes(query) ||
      route.description?.toLowerCase().includes(query) ||
      route.next_hops.some((nh) => nh.address.toLowerCase().includes(query)) ||
      route.interfaces.some((iface) => iface.interface.toLowerCase().includes(query))
    );
  });

  // Calculate stats
  const totalIPv4Routes = config?.ipv4_routes.length || 0;
  const totalIPv6Routes = config?.ipv6_routes.length || 0;
  const totalRoutes = totalIPv4Routes + totalIPv6Routes;
  const totalTables = config?.routing_tables.length || 0;
  const totalArpEntries = config?.arp_interfaces?.reduce((sum, iface) => sum + iface.entries.length, 0) || 0;
  const totalMroutes = config?.multicast_routes?.length || 0;
  const totalNeighborProxies = (config?.neighbor_proxy?.arp_entries?.length || 0) + (config?.neighbor_proxy?.nd_entries?.length || 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center space-y-4">
          <AlertCircle className="h-12 w-12 text-destructive mx-auto" />
          <h2 className="text-xl font-semibold text-foreground">Error Loading Static Routes</h2>
          <p className="text-muted-foreground max-w-md">{error}</p>
          <Button onClick={() => fetchConfig(true)} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="p-6 pb-4 border-b border-border">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Static Routes</h1>
              <p className="text-muted-foreground mt-2">
                Manage static routes, ARP entries, multicast routes, and neighbor proxies
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Button onClick={() => fetchConfig(true)} variant="outline" size="sm">
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-6 gap-4">
            <Card className="bg-card/50">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Routes</p>
                    <p className="text-2xl font-bold text-foreground mt-1">
                      {totalRoutes}
                    </p>
                  </div>
                  <Route className="h-8 w-8 text-blue-500" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card/50">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">IPv4 Routes</p>
                    <p className="text-2xl font-bold text-foreground mt-1">
                      {totalIPv4Routes}
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
                    <p className="text-sm text-muted-foreground">IPv6 Routes</p>
                    <p className="text-2xl font-bold text-foreground mt-1">
                      {totalIPv6Routes}
                    </p>
                  </div>
                  <Network className="h-8 w-8 text-purple-500" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card/50">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">ARP Entries</p>
                    <p className="text-2xl font-bold text-foreground mt-1">
                      {totalArpEntries}
                    </p>
                  </div>
                  <Cable className="h-8 w-8 text-orange-500" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card/50">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Multicast</p>
                    <p className="text-2xl font-bold text-foreground mt-1">
                      {totalMroutes}
                    </p>
                  </div>
                  <Radio className="h-8 w-8 text-pink-500" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card/50">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Neighbor Proxy</p>
                    <p className="text-2xl font-bold text-foreground mt-1">
                      {totalNeighborProxies}
                    </p>
                  </div>
                  <Users className="h-8 w-8 text-cyan-500" />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Main Content with Tabs */}
        <div className="flex-1 p-6 pt-4">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-4">
              <TabsTrigger value="routes">
                Static Routes
                {totalRoutes > 0 && (
                  <Badge variant="secondary" className="ml-2">{totalRoutes}</Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="arp">
                Static ARP
                {totalArpEntries > 0 && (
                  <Badge variant="secondary" className="ml-2">{totalArpEntries}</Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="mroute">
                Multicast Routes
                {totalMroutes > 0 && (
                  <Badge variant="secondary" className="ml-2">{totalMroutes}</Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="neighbor-proxy">
                Neighbor Proxy
                {totalNeighborProxies > 0 && (
                  <Badge variant="secondary" className="ml-2">{totalNeighborProxies}</Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="tables">
                Routing Tables
                {totalTables > 0 && (
                  <Badge variant="secondary" className="ml-2">{totalTables}</Badge>
                )}
              </TabsTrigger>
            </TabsList>

            {/* Static Routes Tab */}
            <TabsContent value="routes">
              {/* Type Selector and Search */}
              <div className="flex items-center gap-4 mb-4">
                <div className="flex items-center gap-2">
                  <Button
                    variant={selectedType === "ipv4" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedType("ipv4")}
                  >
                    IPv4
                    {totalIPv4Routes > 0 && (
                      <Badge variant="secondary" className="ml-2">
                        {totalIPv4Routes}
                      </Badge>
                    )}
                  </Button>
                  <Button
                    variant={selectedType === "ipv6" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedType("ipv6")}
                  >
                    IPv6
                    {totalIPv6Routes > 0 && (
                      <Badge variant="secondary" className="ml-2">
                        {totalIPv6Routes}
                      </Badge>
                    )}
                  </Button>
                </div>

                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search routes..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>

                <Button onClick={() => { setSelectedType(selectedType); setCreateModalOpen(true); }} size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Create {selectedType.toUpperCase()} Route
                </Button>
              </div>

              {/* Routes Table */}
              <Card>
                <ScrollArea className="h-[calc(100vh-500px)]">
                  {filteredRoutes.length === 0 ? (
                    <CardContent className="flex flex-col items-center justify-center py-12">
                      <Route className="h-12 w-12 text-muted-foreground mb-4" />
                      <h3 className="text-lg font-semibold text-foreground mb-2">
                        No Routes Found
                      </h3>
                      <p className="text-sm text-muted-foreground mb-4 text-center max-w-sm">
                        {searchQuery
                          ? "No routes match your search criteria"
                          : `No ${selectedType.toUpperCase()} static routes configured`}
                      </p>
                      {!searchQuery && (
                        <Button onClick={() => { setSelectedType(selectedType); setCreateModalOpen(true); }}>
                          <Plus className="h-4 w-4 mr-2" />
                          Create {selectedType.toUpperCase()} Route
                        </Button>
                      )}
                    </CardContent>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow className="hover:bg-transparent">
                          <TableHead>Destination</TableHead>
                          <TableHead>Description</TableHead>
                          <TableHead>Next Hops</TableHead>
                          <TableHead>Interfaces</TableHead>
                          <TableHead>Distance</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredRoutes.map((route) => {
                          const hasNextHops = route.next_hops.length > 0;
                          const hasInterfaces = route.interfaces.length > 0;
                          const isBlackhole = route.blackhole;

                          return (
                            <TableRow key={route.destination} className="group">
                              <TableCell className="font-medium font-mono text-sm">
                                <div className="flex items-center gap-2">
                                  <Network className="h-4 w-4 text-muted-foreground" />
                                  {route.destination}
                                </div>
                              </TableCell>
                              <TableCell>
                                {route.description || (
                                  <span className="text-muted-foreground">—</span>
                                )}
                              </TableCell>
                              <TableCell>
                                {isBlackhole ? (
                                  <Badge variant="outline" className="bg-red-500/10 text-red-500 border-red-500/20">
                                    <Shield className="h-3 w-3 mr-1" />
                                    Blackhole
                                  </Badge>
                                ) : hasNextHops ? (
                                  <div className="flex flex-wrap gap-1">
                                    {route.next_hops.slice(0, 2).map((nh, idx) => (
                                      <Badge
                                        key={idx}
                                        variant="secondary"
                                        className={cn(
                                          "text-xs font-mono",
                                          nh.disable && "bg-orange-500/10 text-orange-500 border-orange-500/20"
                                        )}
                                      >
                                        <ArrowRight className="h-3 w-3 mr-1" />
                                        {nh.address}
                                        {nh.disable && " (disabled)"}
                                      </Badge>
                                    ))}
                                    {route.next_hops.length > 2 && (
                                      <Badge variant="secondary" className="text-xs">
                                        +{route.next_hops.length - 2}
                                      </Badge>
                                    )}
                                  </div>
                                ) : (
                                  <span className="text-muted-foreground text-sm">—</span>
                                )}
                              </TableCell>
                              <TableCell>
                                {hasInterfaces ? (
                                  <div className="flex flex-wrap gap-1">
                                    {route.interfaces.slice(0, 2).map((iface, idx) => (
                                      <Badge
                                        key={idx}
                                        variant="outline"
                                        className={cn(
                                          "text-xs",
                                          iface.disable && "bg-orange-500/10 text-orange-500 border-orange-500/20"
                                        )}
                                      >
                                        {iface.interface}
                                        {iface.disable && " (disabled)"}
                                      </Badge>
                                    ))}
                                    {route.interfaces.length > 2 && (
                                      <Badge variant="outline" className="text-xs">
                                        +{route.interfaces.length - 2}
                                      </Badge>
                                    )}
                                  </div>
                                ) : (
                                  <span className="text-muted-foreground text-sm">—</span>
                                )}
                              </TableCell>
                              <TableCell>
                                {isBlackhole && route.blackhole_distance ? (
                                  <Badge variant="outline">{route.blackhole_distance}</Badge>
                                ) : hasNextHops ? (
                                  route.next_hops[0]?.distance ? (
                                    <Badge variant="outline">{route.next_hops[0].distance}</Badge>
                                  ) : (
                                    <span className="text-muted-foreground">Default</span>
                                  )
                                ) : hasInterfaces && route.interfaces[0]?.distance ? (
                                  <Badge variant="outline">{route.interfaces[0].distance}</Badge>
                                ) : (
                                  <span className="text-muted-foreground">—</span>
                                )}
                              </TableCell>
                              <TableCell>
                                <Badge
                                  variant="outline"
                                  className={cn(
                                    route.route_type === "ipv4"
                                      ? "bg-green-500/10 text-green-500 border-green-500/20"
                                      : "bg-purple-500/10 text-purple-500 border-purple-500/20"
                                  )}
                                >
                                  {route.route_type.toUpperCase()}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <Badge
                                  variant="outline"
                                  className="bg-green-500/10 text-green-500 border-green-500/20"
                                >
                                  Active
                                </Badge>
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setEditingRoute(route)}
                                  >
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setDeletingRoute(route)}
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
            </TabsContent>

            {/* Static ARP Tab */}
            <TabsContent value="arp">
              <div className="flex items-center justify-between mb-4">
                <div className="flex-1 relative max-w-md">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search ARP entries..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Button onClick={() => setCreateArpModalOpen(true)} size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Create ARP Entry
                </Button>
              </div>

              <Card>
                <ScrollArea className="h-[calc(100vh-500px)]">
                  {(!config?.arp_interfaces || config.arp_interfaces.length === 0) ? (
                    <CardContent className="flex flex-col items-center justify-center py-12">
                      <Cable className="h-12 w-12 text-muted-foreground mb-4" />
                      <h3 className="text-lg font-semibold text-foreground mb-2">
                        No Static ARP Entries
                      </h3>
                      <p className="text-sm text-muted-foreground mb-4 text-center max-w-sm">
                        No static ARP entries configured
                      </p>
                      <Button onClick={() => setCreateArpModalOpen(true)}>
                        <Plus className="h-4 w-4 mr-2" />
                        Create ARP Entry
                      </Button>
                    </CardContent>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow className="hover:bg-transparent">
                          <TableHead>Interface</TableHead>
                          <TableHead>IP Address</TableHead>
                          <TableHead>MAC Address</TableHead>
                          <TableHead>Description</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {config.arp_interfaces.flatMap((iface) =>
                          iface.entries.map((entry, idx) => (
                            <TableRow key={`${iface.interface}-${entry.ip_address}`} className="group">
                              <TableCell>
                                <Badge variant="outline">{iface.interface}</Badge>
                              </TableCell>
                              <TableCell className="font-mono text-sm">
                                {entry.ip_address}
                              </TableCell>
                              <TableCell className="font-mono text-sm">
                                {entry.mac_address}
                              </TableCell>
                              <TableCell>
                                {entry.description || (
                                  <span className="text-muted-foreground">—</span>
                                )}
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setEditingArpEntry({ entry, interface: iface.interface })}
                                  >
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setDeletingArpEntry({ entry, interface: iface.interface })}
                                  >
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  )}
                </ScrollArea>
              </Card>
            </TabsContent>

            {/* Multicast Routes Tab */}
            <TabsContent value="mroute">
              <div className="flex items-center justify-between mb-4">
                <div className="flex-1 relative max-w-md">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search multicast routes..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Button onClick={() => setCreateMrouteModalOpen(true)} size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Multicast Route
                </Button>
              </div>

              <Card>
                <ScrollArea className="h-[calc(100vh-500px)]">
                  {(!config?.multicast_routes || config.multicast_routes.length === 0) ? (
                    <CardContent className="flex flex-col items-center justify-center py-12">
                      <Radio className="h-12 w-12 text-muted-foreground mb-4" />
                      <h3 className="text-lg font-semibold text-foreground mb-2">
                        No Multicast Routes
                      </h3>
                      <p className="text-sm text-muted-foreground mb-4 text-center max-w-sm">
                        No static multicast routes configured
                      </p>
                      <Button onClick={() => setCreateMrouteModalOpen(true)}>
                        <Plus className="h-4 w-4 mr-2" />
                        Create Multicast Route
                      </Button>
                    </CardContent>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow className="hover:bg-transparent">
                          <TableHead>Prefix</TableHead>
                          <TableHead>Next Hops</TableHead>
                          <TableHead>Interfaces</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {config.multicast_routes.map((route) => (
                          <TableRow key={route.prefix} className="group">
                            <TableCell className="font-mono text-sm">
                              <div className="flex items-center gap-2">
                                <Radio className="h-4 w-4 text-muted-foreground" />
                                {route.prefix}
                              </div>
                            </TableCell>
                            <TableCell>
                              {route.next_hops.length > 0 ? (
                                <div className="flex flex-wrap gap-1">
                                  {route.next_hops.slice(0, 3).map((nh, idx) => (
                                    <Badge
                                      key={idx}
                                      variant="secondary"
                                      className={cn(
                                        "text-xs font-mono",
                                        nh.disable && "bg-orange-500/10 text-orange-500"
                                      )}
                                    >
                                      {nh.address}
                                      {nh.distance && ` (d:${nh.distance})`}
                                    </Badge>
                                  ))}
                                  {route.next_hops.length > 3 && (
                                    <Badge variant="secondary" className="text-xs">
                                      +{route.next_hops.length - 3}
                                    </Badge>
                                  )}
                                </div>
                              ) : (
                                <span className="text-muted-foreground">—</span>
                              )}
                            </TableCell>
                            <TableCell>
                              {route.interfaces.length > 0 ? (
                                <div className="flex flex-wrap gap-1">
                                  {route.interfaces.slice(0, 3).map((iface, idx) => (
                                    <Badge
                                      key={idx}
                                      variant="outline"
                                      className={cn(
                                        "text-xs",
                                        iface.disable && "bg-orange-500/10 text-orange-500"
                                      )}
                                    >
                                      {iface.interface}
                                      {iface.distance && ` (d:${iface.distance})`}
                                    </Badge>
                                  ))}
                                  {route.interfaces.length > 3 && (
                                    <Badge variant="outline" className="text-xs">
                                      +{route.interfaces.length - 3}
                                    </Badge>
                                  )}
                                </div>
                              ) : (
                                <span className="text-muted-foreground">—</span>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setDeletingMroute(route)}
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
            </TabsContent>

            {/* Neighbor Proxy Tab */}
            <TabsContent value="neighbor-proxy">
              <div className="flex items-center justify-between mb-4">
                <div className="flex-1 relative max-w-md">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search neighbor proxy entries..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Button onClick={() => setCreateNeighborProxyModalOpen(true)} size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Neighbor Proxy
                </Button>
              </div>

              <Card>
                <ScrollArea className="h-[calc(100vh-500px)]">
                  {((!config?.neighbor_proxy?.arp_entries || config.neighbor_proxy.arp_entries.length === 0) &&
                    (!config?.neighbor_proxy?.nd_entries || config.neighbor_proxy.nd_entries.length === 0)) ? (
                    <CardContent className="flex flex-col items-center justify-center py-12">
                      <Users className="h-12 w-12 text-muted-foreground mb-4" />
                      <h3 className="text-lg font-semibold text-foreground mb-2">
                        No Neighbor Proxy Entries
                      </h3>
                      <p className="text-sm text-muted-foreground mb-4 text-center max-w-sm">
                        No neighbor proxy entries configured (ARP or ND)
                      </p>
                      <Button onClick={() => setCreateNeighborProxyModalOpen(true)}>
                        <Plus className="h-4 w-4 mr-2" />
                        Create Neighbor Proxy
                      </Button>
                    </CardContent>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow className="hover:bg-transparent">
                          <TableHead>Type</TableHead>
                          <TableHead>IP Address</TableHead>
                          <TableHead>Interface</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {/* ARP Proxy entries */}
                        {config?.neighbor_proxy?.arp_entries?.map((entry) => (
                          <TableRow key={`arp-${entry.ip_address}`} className="group">
                            <TableCell>
                              <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20">
                                ARP (IPv4)
                              </Badge>
                            </TableCell>
                            <TableCell className="font-mono text-sm">
                              {entry.ip_address}
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-wrap gap-1">
                                {entry.interfaces.map((iface, idx) => (
                                  <Badge key={idx} variant="outline">{iface}</Badge>
                                ))}
                              </div>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setDeletingNeighborProxy({ entry, type: "arp" })}
                                >
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                        {/* ND Proxy entries */}
                        {config?.neighbor_proxy?.nd_entries?.map((entry) => (
                          <TableRow key={`nd-${entry.ipv6_address}`} className="group">
                            <TableCell>
                              <Badge variant="outline" className="bg-purple-500/10 text-purple-500 border-purple-500/20">
                                ND (IPv6)
                              </Badge>
                            </TableCell>
                            <TableCell className="font-mono text-sm">
                              {entry.ipv6_address}
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-wrap gap-1">
                                {entry.interfaces.map((iface, idx) => (
                                  <Badge key={idx} variant="outline">{iface}</Badge>
                                ))}
                              </div>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setDeletingNeighborProxy({ entry, type: "nd" })}
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
            </TabsContent>

            {/* Routing Tables Tab */}
            <TabsContent value="tables">
              <div className="flex items-center justify-end mb-4">
                <Button onClick={() => setCreateTableModalOpen(true)} size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Routing Table
                </Button>
              </div>

              <RoutingTablesAccordion
                tables={config?.routing_tables || []}
                onRefresh={() => fetchConfig(true)}
              />
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Modals for Static Routes */}
      <CreateStaticRouteModal
        open={createModalOpen}
        onOpenChange={setCreateModalOpen}
        onSuccess={() => fetchConfig(true)}
        routeType={selectedType}
      />

      <EditStaticRouteModal
        open={editingRoute !== null}
        onOpenChange={(open) => !open && setEditingRoute(null)}
        onSuccess={() => fetchConfig(true)}
        route={editingRoute}
      />

      <DeleteStaticRouteModal
        open={deletingRoute !== null}
        onOpenChange={(open) => !open && setDeletingRoute(null)}
        onSuccess={() => fetchConfig(true)}
        route={deletingRoute}
      />

      {/* Modals for Static ARP */}
      <CreateArpEntryModal
        open={createArpModalOpen}
        onOpenChange={setCreateArpModalOpen}
        onSuccess={() => fetchConfig(true)}
      />

      <EditArpEntryModal
        open={editingArpEntry !== null}
        onOpenChange={(open) => !open && setEditingArpEntry(null)}
        onSuccess={() => fetchConfig(true)}
        interfaceName={editingArpEntry?.interface || ""}
        entry={editingArpEntry?.entry || null}
      />

      <DeleteArpEntryModal
        open={deletingArpEntry !== null}
        onOpenChange={(open) => !open && setDeletingArpEntry(null)}
        onSuccess={() => fetchConfig(true)}
        interfaceName={deletingArpEntry?.interface || ""}
        entry={deletingArpEntry?.entry || null}
      />

      {/* Modals for Multicast Routes */}
      <CreateMrouteModal
        open={createMrouteModalOpen}
        onOpenChange={setCreateMrouteModalOpen}
        onSuccess={() => fetchConfig(true)}
      />

      <DeleteMrouteModal
        open={deletingMroute !== null}
        onOpenChange={(open) => !open && setDeletingMroute(null)}
        onSuccess={() => fetchConfig(true)}
        route={deletingMroute}
      />

      {/* Modals for Neighbor Proxy */}
      <CreateNeighborProxyModal
        open={createNeighborProxyModalOpen}
        onOpenChange={setCreateNeighborProxyModalOpen}
        onSuccess={() => fetchConfig(true)}
      />

      <DeleteNeighborProxyModal
        open={deletingNeighborProxy !== null}
        onOpenChange={(open) => !open && setDeletingNeighborProxy(null)}
        onSuccess={() => fetchConfig(true)}
        entry={deletingNeighborProxy?.entry || null}
        proxyType={deletingNeighborProxy?.type || "arp"}
      />

      {/* Modals for Routing Tables */}
      <CreateRoutingTableModal
        open={createTableModalOpen}
        onOpenChange={setCreateTableModalOpen}
        onSuccess={() => fetchConfig(true)}
      />
    </>
  );
}
