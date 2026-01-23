"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Network,
  RefreshCw,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Search,
} from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from "recharts";
import {
  monitoringService,
  type Connection,
  type ConntrackSummary,
} from "@/lib/api/monitoring";
import { formatBytes, formatNumber } from "@/lib/utils";
import { Skeleton, CardSkeleton, TableSkeleton } from "@/components/skeletons";

const PROTOCOL_COLORS: Record<string, string> = {
  tcp: "#3b82f6",
  udp: "#22c55e",
  icmp: "#f59e0b",
  other: "#8b5cf6",
};

interface ConntrackTableProps {
  autoRefresh?: boolean;
  refreshInterval?: number;
  pageSize?: number;
}

export function ConntrackTable({
  autoRefresh = false,
  refreshInterval = 10000,
  pageSize = 50,
}: ConntrackTableProps) {
  const [connections, setConnections] = useState<Connection[]>([]);
  const [summary, setSummary] = useState<ConntrackSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAutoRefresh, setIsAutoRefresh] = useState(autoRefresh);

  // Pagination and filtering
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const [protocolFilter, setProtocolFilter] = useState<string>("__all__");
  const [stateFilter, setStateFilter] = useState<string>("__all__");
  const [searchFilter, setSearchFilter] = useState("");

  const loadData = async () => {
    try {
      setError(null);

      // Load summary
      const summaryData = await monitoringService.getConntrackSummary();
      setSummary(summaryData);

      // Load connections with filters
      const params: { limit: number; offset: number; protocol?: string; state?: string } = {
        limit: pageSize,
        offset: page * pageSize,
      };

      if (protocolFilter && protocolFilter !== "__all__") {
        params.protocol = protocolFilter;
      }
      if (stateFilter && stateFilter !== "__all__") {
        params.state = stateFilter;
      }

      const connData = await monitoringService.getConntrackTable(params);
      setConnections(connData.connections);
      setTotal(connData.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load connections");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    if (isAutoRefresh) {
      const interval = setInterval(loadData, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [isAutoRefresh, refreshInterval, page, protocolFilter, stateFilter]);

  // Reset page when filters change
  useEffect(() => {
    setPage(0);
  }, [protocolFilter, stateFilter]);

  // Filter connections by search
  const filteredConnections = searchFilter
    ? connections.filter(
        (conn) =>
          conn.src_ip.includes(searchFilter) ||
          conn.dst_ip.includes(searchFilter) ||
          conn.protocol.includes(searchFilter)
      )
    : connections;

  // Prepare pie chart data
  const protocolChartData = summary
    ? Object.entries(summary.by_protocol).map(([name, value]) => ({
        name: name.toUpperCase(),
        value,
        color: PROTOCOL_COLORS[name] || PROTOCOL_COLORS.other,
      }))
    : [];

  const totalPages = Math.ceil(total / pageSize);

  if (loading && connections.length === 0) {
    return (
      <div className="space-y-4">
        {/* Summary Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <Skeleton className="h-5 w-32" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-48 w-full" />
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <Skeleton className="h-5 w-32" />
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div key={i} className="flex items-center justify-between">
                    <Skeleton className="h-5 w-24" />
                    <Skeleton className="h-5 w-16" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Table Skeleton */}
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-40" />
          </CardHeader>
          <CardContent>
            <TableSkeleton rows={8} columns={7} />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error && connections.length === 0) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
            <AlertTriangle className="h-8 w-8 mb-2 text-destructive" />
            <p>{error}</p>
            <Button variant="outline" size="sm" onClick={loadData} className="mt-4">
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
      {/* Summary Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Protocol Distribution */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Protocol Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-48">
              {protocolChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={protocolChartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={70}
                      dataKey="value"
                      label={({ name, percent }) =>
                        `${name} ${((percent ?? 0) * 100).toFixed(0)}%`
                      }
                      labelLine={false}
                    >
                      {protocolChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value) => [formatNumber(value as number), "Connections"]}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  No data
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* State Distribution */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Connection States</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {summary?.by_state &&
                Object.entries(summary.by_state)
                  .sort((a, b) => b[1] - a[1])
                  .slice(0, 6)
                  .map(([state, count]) => (
                    <div
                      key={state}
                      className="flex items-center justify-between text-sm"
                    >
                      <Badge variant="outline">{state}</Badge>
                      <span className="font-mono">{formatNumber(count)}</span>
                    </div>
                  ))}
              <div className="pt-2 border-t">
                <div className="flex items-center justify-between text-sm font-medium">
                  <span>Total Connections</span>
                  <span className="font-mono">
                    {formatNumber(summary?.total_connections ?? 0)}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Connections Table */}
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <CardTitle className="flex items-center gap-2">
              <Network className="h-5 w-5" />
              Active Connections
            </CardTitle>
            <div className="flex flex-wrap items-center gap-2">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search IP..."
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  className="pl-8 w-[150px]"
                />
              </div>

              {/* Protocol Filter */}
              <Select value={protocolFilter} onValueChange={setProtocolFilter}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue placeholder="Protocol" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">All Protocols</SelectItem>
                  <SelectItem value="tcp">TCP</SelectItem>
                  <SelectItem value="udp">UDP</SelectItem>
                  <SelectItem value="icmp">ICMP</SelectItem>
                </SelectContent>
              </Select>

              {/* State Filter */}
              <Select value={stateFilter} onValueChange={setStateFilter}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="State" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">All States</SelectItem>
                  <SelectItem value="ESTABLISHED">ESTABLISHED</SelectItem>
                  <SelectItem value="TIME_WAIT">TIME_WAIT</SelectItem>
                  <SelectItem value="SYN_SENT">SYN_SENT</SelectItem>
                  <SelectItem value="SYN_RECV">SYN_RECV</SelectItem>
                  <SelectItem value="FIN_WAIT">FIN_WAIT</SelectItem>
                  <SelectItem value="CLOSE_WAIT">CLOSE_WAIT</SelectItem>
                </SelectContent>
              </Select>

              <Button
                variant={isAutoRefresh ? "default" : "outline"}
                size="sm"
                onClick={() => setIsAutoRefresh(!isAutoRefresh)}
              >
                <RefreshCw
                  className={`h-4 w-4 mr-1 ${isAutoRefresh ? "animate-spin" : ""}`}
                />
                Auto
              </Button>

              <Button variant="outline" size="sm" onClick={loadData}>
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Protocol</TableHead>
                  <TableHead>State</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Destination</TableHead>
                  <TableHead className="text-right">Packets</TableHead>
                  <TableHead className="text-right">Bytes</TableHead>
                  <TableHead className="text-right">Timeout</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredConnections.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground">
                      No connections found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredConnections.map((conn, index) => (
                    <TableRow key={index}>
                      <TableCell>
                        <Badge
                          variant="outline"
                          style={{
                            borderColor:
                              PROTOCOL_COLORS[conn.protocol] || PROTOCOL_COLORS.other,
                            color:
                              PROTOCOL_COLORS[conn.protocol] || PROTOCOL_COLORS.other,
                          }}
                        >
                          {conn.protocol.toUpperCase()}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {conn.state ? (
                          <Badge variant="secondary">{conn.state}</Badge>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {conn.src_ip}
                        {conn.src_port && `:${conn.src_port}`}
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {conn.dst_ip}
                        {conn.dst_port && `:${conn.dst_port}`}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {formatNumber(conn.packets)}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {formatBytes(conn.bytes)}
                      </TableCell>
                      <TableCell className="text-right font-mono text-muted-foreground">
                        {conn.timeout ? `${conn.timeout}s` : "-"}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <div className="text-sm text-muted-foreground">
                Showing {page * pageSize + 1}-{Math.min((page + 1) * pageSize, total)} of{" "}
                {total} connections
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
        </CardContent>
      </Card>
    </div>
  );
}
