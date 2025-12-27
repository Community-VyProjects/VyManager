"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  X,
  Network,
  RefreshCw,
  Settings,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import { showService, InterfaceCounter } from "@/lib/api/show";
import { interfacesService } from "@/lib/api/interfaces";
import { getInterfaceType } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from "recharts";
import { ethernetService } from "@/lib/api/ethernet";

interface InterfaceWithType extends InterfaceCounter {
  type: string;
  description?: string;
}

const INTERFACE_TYPE_COLORS: Record<string, string> = {
  "Physical (Ethernet)": "bg-blue-100 text-blue-800 border-blue-200",
  Wireless: "bg-purple-100 text-purple-800 border-purple-200",
  Loopback: "bg-gray-100 text-gray-800 border-gray-200",
  "VPN (WireGuard)": "bg-green-100 text-green-800 border-green-200",
  "VPN (Virtual Tunnel)": "bg-emerald-100 text-emerald-800 border-emerald-200",
  "VPN (Tunnel)": "bg-teal-100 text-teal-800 border-teal-200",
  "VLAN (Virtual)": "bg-orange-100 text-orange-800 border-orange-200",
  "VLAN (Subinterface)": "bg-yellow-100 text-yellow-800 border-yellow-200",
  Bridge: "bg-cyan-100 text-cyan-800 border-cyan-200",
  PPPoE: "bg-pink-100 text-pink-800 border-pink-200",
  Bonding: "bg-indigo-100 text-indigo-800 border-indigo-200",
  Dummy: "bg-stone-100 text-stone-800 border-stone-200",
  "GRE Tunnel": "bg-lime-100 text-lime-800 border-lime-200",
  "IPIP Tunnel": "bg-amber-100 text-amber-800 border-amber-200",
  "SIT Tunnel": "bg-rose-100 text-rose-800 border-rose-200",
  Other: "bg-slate-100 text-slate-800 border-slate-200",
};

const PIE_CHART_COLORS = [
  "#0088FE",
  "#00C49F",
  "#FFBB28",
  "#FF8042",
  "#8884D8",
  "#82CA9D",
  "#FFC658",
  "#FF7C7C",
  "#8DD1E1",
  "#D084D0",
];

interface InterfaceStatisticsCardProps {
  onRemove?: () => void;
  span?: number;
  onSpanChange?: (newSpan: number) => void;
  config?: {
    interfaces?: string[];
  };
  onConfigChange?: (config: any) => void;
}

export function InterfaceStatisticsCard({
  onRemove,
  span = 1,
  onSpanChange,
  config = {},
  onConfigChange,
}: InterfaceStatisticsCardProps) {
  const [interfaces, setInterfaces] = useState<InterfaceWithType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState("");
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [sortColumn, setSortColumn] = useState<string>("interface");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }
  };

  const getSortIcon = (column: string) => {
    if (sortColumn !== column) return <ArrowUpDown className="h-4 w-4" />;
    return sortDirection === "asc" ? (
      <ArrowUp className="h-4 w-4" />
    ) : (
      <ArrowDown className="h-4 w-4" />
    );
  };

  // Calculate max values for bar chart scaling
  const maxRxBytes = Math.max(...interfaces.map((iface) => iface.rx_bytes), 1);
  const maxTxBytes = Math.max(...interfaces.map((iface) => iface.tx_bytes), 1);
  const maxRxPackets = Math.max(
    ...interfaces.map((iface) => iface.rx_packets),
    1
  );
  const maxTxPackets = Math.max(
    ...interfaces.map((iface) => iface.tx_packets),
    1
  );

  const renderBar = (
    value: number,
    maxValue: number,
    color: string = "bg-blue-500"
  ) => {
    const percentage = (value / maxValue) * 100;
    return (
      <div className="flex items-center gap-2">
        <div className="flex-1 bg-gray-200 rounded-full h-2 min-w-[60px]">
          <div
            className={`h-2 rounded-full ${color}`}
            style={{ width: `${Math.max(percentage, 2)}%` }}
          />
        </div>
        <span className="text-xs text-muted-foreground min-w-[40px] text-right">
          {percentage.toFixed(1)}%
        </span>
      </div>
    );
  };

  const preparePieChartData = (interfaces: InterfaceWithType[]) => {
    const typeTotals = interfaces.reduce((acc, iface) => {
      const totalBytes = iface.rx_bytes + iface.tx_bytes;
      if (!acc[iface.type]) {
        acc[iface.type] = 0;
      }
      acc[iface.type] += totalBytes;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(typeTotals)
      .filter(([_, bytes]) => bytes > 0) // Only include types with traffic
      .map(([type, bytes]) => ({
        name: type,
        value: bytes,
        formattedValue: formatBytes(bytes),
      }))
      .sort((a, b) => b.value - a.value);
  };

  const loadData = async () => {
    try {
      setError(null);
      const data = await showService.getInterfaceCounters();

      const interfacesWithType = await Promise.all(
        data.interfaces.map(async (iface) => {
          const config = await ethernetService.getConfig();

          let description: string | undefined;

          // 1. First match
          const directInterface = config?.interfaces?.find(
            (i) => i.name === iface.interface
          );

          if (directInterface) {
            description = directInterface.description ?? undefined;
          } else {
            // 2. Check VIF
            const [parentName, vlanId] = iface.interface.split(".");

            if (parentName && vlanId) {
              const parentInterface = config?.interfaces?.find(
                (i) => i.name === parentName
              );

              const vif = parentInterface?.vif?.find(
                (v) => v.vlan_id === vlanId
              );

              description = vif?.description ?? undefined;
            }
          }

          return {
            ...iface,
            type: getInterfaceType(iface.interface),
            description,
          };
        })
      );

      setInterfaces(interfacesWithType);
    } catch (err: any) {
      setError(err.message || "Failed to load interface statistics");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    if (autoRefresh) {
      const interval = setInterval(loadData, 5000); // Refresh every 5 seconds
      return () => clearInterval(interval);
    }
  }, [autoRefresh]);

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
  };

  const formatNumber = (num: number) => {
    return num.toLocaleString();
  };

  // Filter and sort interfaces
  const filteredAndSortedInterfaces = interfaces
    .filter((iface) =>
      iface.interface.toLowerCase().includes(filter.toLowerCase())
    )
    .sort((a, b) => {
      let aValue: any = a[sortColumn as keyof InterfaceWithType];
      let bValue: any = b[sortColumn as keyof InterfaceWithType];

      // Handle description field which can be undefined
      if (sortColumn === "description") {
        aValue = aValue || "";
        bValue = bValue || "";
      }

      // Handle string sorting
      if (typeof aValue === "string") {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }

      if (aValue < bValue) return sortDirection === "asc" ? -1 : 1;
      if (aValue > bValue) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });

  // Prepare pie chart data
  const pieChartData = preparePieChartData(filteredAndSortedInterfaces);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <div className="flex items-center gap-2">
          <Network className="h-5 w-5 text-primary" />
          <CardTitle className="text-lg font-medium">
            Interface Statistics
          </CardTitle>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={autoRefresh ? "default" : "outline"}
            size="sm"
            onClick={() => setAutoRefresh(!autoRefresh)}
          >
            <RefreshCw
              className={`h-4 w-4 mr-1 ${autoRefresh ? "animate-spin" : ""}`}
            />
            Auto-refresh
          </Button>
          {onSpanChange && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm">
                  <Settings className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Card Width</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => onSpanChange(1)}>
                  <div className="flex items-center justify-between w-full">
                    <span>Small (1 column)</span>
                    {span === 1 && <span className="ml-2 text-primary">✓</span>}
                  </div>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onSpanChange(2)}>
                  <div className="flex items-center justify-between w-full">
                    <span>Medium (2 columns)</span>
                    {span === 2 && <span className="ml-2 text-primary">✓</span>}
                  </div>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onSpanChange(3)}>
                  <div className="flex items-center justify-between w-full">
                    <span>Large (3 columns)</span>
                    {span === 3 && <span className="ml-2 text-primary">✓</span>}
                  </div>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          {onRemove && (
            <Button variant="ghost" size="sm" onClick={onRemove}>
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {error ? (
          <div className="text-destructive text-sm">{error}</div>
        ) : loading ? (
          <div className="text-center text-muted-foreground py-4">
            Loading...
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              {/* Traffic Overview Pie Chart */}
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-muted-foreground">
                  Traffic Distribution by Type
                </h3>
                <div className="h-64">
                  {pieChartData.length === 0 ? (
                    <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                      No traffic data available
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={pieChartData}
                          cx="50%"
                          cy="50%"
                          outerRadius={80}
                          dataKey="value"
                        >
                          {pieChartData.map((entry, index) => (
                            <Cell
                              key={`cell-${index}`}
                              fill={
                                PIE_CHART_COLORS[
                                  index % PIE_CHART_COLORS.length
                                ]
                              }
                            />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(value: number, name: string) => [
                            formatBytes(value),
                            name,
                          ]}
                          labelFormatter={() => ""}
                        />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>

              {/* Interface Filter */}
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-muted-foreground">
                  Filter Interfaces
                </h3>
                <Input
                  placeholder="Filter interfaces..."
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  className="max-w-sm"
                />
                <div className="text-xs text-muted-foreground">
                  Showing {filteredAndSortedInterfaces.length} of{" "}
                  {interfaces.length} interfaces
                </div>
              </div>
            </div>

            <div className="border rounded-lg overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="sticky left-0 z-10 bg-background w-[120px] border-r">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-auto p-0 font-medium"
                        onClick={() => handleSort("interface")}
                      >
                        Interface {getSortIcon("interface")}
                      </Button>
                    </TableHead>
                    <TableHead className="w-[140px]">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-auto p-0 font-medium"
                        onClick={() => handleSort("type")}
                      >
                        Type {getSortIcon("type")}
                      </Button>
                    </TableHead>
                    <TableHead className="w-[150px]">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-auto p-0 font-medium"
                        onClick={() => handleSort("description")}
                      >
                        Description {getSortIcon("description")}
                      </Button>
                    </TableHead>
                    <TableHead className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-auto p-0 font-medium"
                        onClick={() => handleSort("rx_packets")}
                      >
                        RX Packets {getSortIcon("rx_packets")}
                      </Button>
                    </TableHead>
                    <TableHead className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-auto p-0 font-medium"
                        onClick={() => handleSort("rx_bytes")}
                      >
                        RX Bytes {getSortIcon("rx_bytes")}
                      </Button>
                    </TableHead>
                    <TableHead className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-auto p-0 font-medium"
                        onClick={() => handleSort("tx_packets")}
                      >
                        TX Packets {getSortIcon("tx_packets")}
                      </Button>
                    </TableHead>
                    <TableHead className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-auto p-0 font-medium"
                        onClick={() => handleSort("tx_bytes")}
                      >
                        TX Bytes {getSortIcon("tx_bytes")}
                      </Button>
                    </TableHead>
                    <TableHead className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-auto p-0 font-medium"
                        onClick={() => handleSort("rx_dropped")}
                      >
                        RX Dropped {getSortIcon("rx_dropped")}
                      </Button>
                    </TableHead>
                    <TableHead className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-auto p-0 font-medium"
                        onClick={() => handleSort("tx_dropped")}
                      >
                        TX Dropped {getSortIcon("tx_dropped")}
                      </Button>
                    </TableHead>
                    <TableHead className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-auto p-0 font-medium"
                        onClick={() => handleSort("rx_errors")}
                      >
                        RX Errors {getSortIcon("rx_errors")}
                      </Button>
                    </TableHead>
                    <TableHead className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-auto p-0 font-medium"
                        onClick={() => handleSort("tx_errors")}
                      >
                        TX Errors {getSortIcon("tx_errors")}
                      </Button>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAndSortedInterfaces.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={11}
                        className="text-center text-muted-foreground"
                      >
                        No interfaces found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredAndSortedInterfaces.map((iface) => (
                      <TableRow key={iface.interface}>
                        <TableCell className="sticky left-0 z-10 bg-background font-medium border-r">
                          {iface.interface}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={`text-xs ${
                              INTERFACE_TYPE_COLORS[iface.type] ||
                              "bg-slate-100 text-slate-800 border-slate-200"
                            }`}
                          >
                            {iface.type}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground max-w-[150px] truncate">
                          {iface.description ? (
                            <span title={iface.description}>
                              {iface.description}
                            </span>
                          ) : (
                            <span className="italic text-muted-foreground">
                              —
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="space-y-1">
                            <div className="text-sm">
                              {formatNumber(iface.rx_packets)}
                            </div>
                            {renderBar(
                              iface.rx_packets,
                              maxRxPackets,
                              "bg-green-500"
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="space-y-1">
                            <div className="text-sm">
                              {formatBytes(iface.rx_bytes)}
                            </div>
                            {renderBar(
                              iface.rx_bytes,
                              maxRxBytes,
                              "bg-blue-500"
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="space-y-1">
                            <div className="text-sm">
                              {formatNumber(iface.tx_packets)}
                            </div>
                            {renderBar(
                              iface.tx_packets,
                              maxTxPackets,
                              "bg-orange-500"
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="space-y-1">
                            <div className="text-sm">
                              {formatBytes(iface.tx_bytes)}
                            </div>
                            {renderBar(
                              iface.tx_bytes,
                              maxTxBytes,
                              "bg-purple-500"
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          {formatNumber(iface.rx_dropped)}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatNumber(iface.tx_dropped)}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatNumber(iface.rx_errors)}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatNumber(iface.tx_errors)}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
