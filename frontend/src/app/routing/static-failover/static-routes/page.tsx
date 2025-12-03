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
import {
  Plus,
  Search,
  RefreshCw,
  AlertCircle,
  Route,
  Pencil,
  Trash2,
  MapPin,
  Network,
  Shield,
  ArrowRight,
} from "lucide-react";
import { useEffect, useState } from "react";
import {
  staticRoutesService,
  type StaticRoute,
  type StaticRoutesConfig,
  type StaticRoutesCapabilities,
} from "@/lib/api/static-routes";
import { cn } from "@/lib/utils";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { CreateStaticRouteModal } from "@/components/routing/CreateStaticRouteModal";
import { EditStaticRouteModal } from "@/components/routing/EditStaticRouteModal";
import { DeleteStaticRouteModal } from "@/components/routing/DeleteStaticRouteModal";

export default function StaticRoutesPage() {
  const [config, setConfig] = useState<StaticRoutesConfig | null>(null);
  const [capabilities, setCapabilities] = useState<StaticRoutesCapabilities | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState<"ipv4" | "ipv6">("ipv4");

  // Modal states
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editingRoute, setEditingRoute] = useState<StaticRoute | null>(null);
  const [deletingRoute, setDeletingRoute] = useState<StaticRoute | null>(null);

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

  const totalIPv4Routes = config?.ipv4_routes.length || 0;
  const totalIPv6Routes = config?.ipv6_routes.length || 0;
  const totalRoutes = totalIPv4Routes + totalIPv6Routes;
  const totalTables = config?.routing_tables.length || 0;

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
                Manage IPv4 and IPv6 static routes
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Button onClick={() => fetchConfig(true)} variant="outline" size="sm">
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
              <Button onClick={() => { setSelectedType(selectedType); setCreateModalOpen(true); }} size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Create {selectedType.toUpperCase()} Route
              </Button>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-4 gap-4">
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
                    <p className="text-sm text-muted-foreground">Routing Tables</p>
                    <p className="text-2xl font-bold text-foreground mt-1">
                      {totalTables}
                    </p>
                  </div>
                  <MapPin className="h-8 w-8 text-orange-500" />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 p-6 pt-4">
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
          </div>

          {/* Routes Table */}
          <Card>
            <ScrollArea className="h-[calc(100vh-450px)]">
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
        </div>
      </div>

      {/* Modals */}
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
    </>
  );
}
