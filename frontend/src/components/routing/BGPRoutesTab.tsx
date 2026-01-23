"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  Route,
  Star,
  Check,
  Search,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { bgpService, type BGPRoute, type BGPRoutesResponse } from "@/lib/api/bgp";
import { useToast } from "@/hooks/useToast";

interface BGPRoutesTabProps {
  pageSize?: number;
}

const ORIGIN_LABELS: Record<string, string> = {
  i: "IGP",
  e: "EGP",
  "?": "Incomplete",
};

const ORIGIN_COLORS: Record<string, string> = {
  i: "bg-green-100 text-green-800",
  e: "bg-blue-100 text-blue-800",
  "?": "bg-gray-100 text-gray-800",
};

export function BGPRoutesTab({ pageSize = 25 }: BGPRoutesTabProps) {
  const [routes, setRoutes] = useState<BGPRoutesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [family, setFamily] = useState<"ipv4" | "ipv6">("ipv4");
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(0);
  const { toast } = useToast();

  const loadRoutes = useCallback(async () => {
    try {
      setError(null);
      setLoading(true);
      const data = await bgpService.getRoutes(family);
      setRoutes(data);
      setPage(0);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load BGP routes");
    } finally {
      setLoading(false);
    }
  }, [family]);

  useEffect(() => {
    loadRoutes();
  }, [loadRoutes]);

  const handleRefresh = async () => {
    await loadRoutes();
    toast.success("Refreshed", "BGP routes updated");
  };

  // Filter routes by search term
  const filteredRoutes = routes?.routes?.filter((route) => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      route.network.toLowerCase().includes(search) ||
      route.next_hop.toLowerCase().includes(search) ||
      route.as_path.toLowerCase().includes(search)
    );
  }) || [];

  // Pagination
  const totalPages = Math.ceil(filteredRoutes.length / pageSize);
  const paginatedRoutes = filteredRoutes.slice(page * pageSize, (page + 1) * pageSize);

  if (loading && !routes) {
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

  if (error && !routes) {
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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Route className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Routes</p>
                <p className="text-xl font-bold">{routes?.total_routes || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <Star className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Best Routes</p>
                <p className="text-xl font-bold text-green-600">{routes?.best_routes || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Check className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Valid Routes</p>
                <p className="text-xl font-bold">
                  {routes?.routes?.filter((r) => r.valid).length || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Routes Table */}
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <CardTitle className="flex items-center gap-2">
              <Route className="h-5 w-5" />
              BGP Routing Table
            </CardTitle>
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search routes..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setPage(0);
                  }}
                  className="pl-8 w-[200px]"
                />
              </div>

              <Select value={family} onValueChange={(v) => setFamily(v as "ipv4" | "ipv6")}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ipv4">IPv4</SelectItem>
                  <SelectItem value="ipv6">IPv6</SelectItem>
                </SelectContent>
              </Select>

              <Button variant="outline" size="sm" onClick={handleRefresh} disabled={loading}>
                <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredRoutes.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Route className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>{searchTerm ? "No routes match your search" : "No BGP routes in table"}</p>
            </div>
          ) : (
            <>
              <div className="border rounded-lg overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[50px]">Status</TableHead>
                      <TableHead>Network</TableHead>
                      <TableHead>Next Hop</TableHead>
                      <TableHead className="text-right">Metric</TableHead>
                      <TableHead className="text-right">Local Pref</TableHead>
                      <TableHead className="text-right">Weight</TableHead>
                      <TableHead>AS Path</TableHead>
                      <TableHead>Origin</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedRoutes.map((route, idx) => (
                      <RouteRow key={`${route.network}-${route.next_hop}-${idx}`} route={route} />
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <div className="text-sm text-muted-foreground">
                    Showing {page * pageSize + 1}-
                    {Math.min((page + 1) * pageSize, filteredRoutes.length)} of{" "}
                    {filteredRoutes.length} routes
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(page - 1)}
                      disabled={page === 0}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-sm">
                      Page {page + 1} of {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(page + 1)}
                      disabled={page >= totalPages - 1}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function RouteRow({ route }: { route: BGPRoute }) {
  const originLabel = ORIGIN_LABELS[route.origin] || route.origin;
  const originColor = ORIGIN_COLORS[route.origin] || "bg-gray-100 text-gray-800";

  return (
    <TableRow className={route.best ? "bg-green-50/50" : ""}>
      <TableCell>
        <div className="flex items-center gap-1">
          {route.valid && (
            <Badge variant="outline" className="bg-blue-50 text-blue-700 text-xs px-1">
              *
            </Badge>
          )}
          {route.best && (
            <Badge variant="outline" className="bg-green-50 text-green-700 text-xs px-1">
              &gt;
            </Badge>
          )}
        </div>
      </TableCell>
      <TableCell className="font-mono font-medium">{route.network}</TableCell>
      <TableCell className="font-mono">{route.next_hop}</TableCell>
      <TableCell className="text-right font-mono text-muted-foreground">
        {route.metric || "-"}
      </TableCell>
      <TableCell className="text-right font-mono text-muted-foreground">
        {route.local_pref || "-"}
      </TableCell>
      <TableCell className="text-right font-mono text-muted-foreground">
        {route.weight || "-"}
      </TableCell>
      <TableCell className="font-mono text-sm max-w-[200px] truncate">
        {route.as_path || "(local)"}
      </TableCell>
      <TableCell>
        <Badge variant="outline" className={originColor}>
          {originLabel}
        </Badge>
      </TableCell>
    </TableRow>
  );
}
