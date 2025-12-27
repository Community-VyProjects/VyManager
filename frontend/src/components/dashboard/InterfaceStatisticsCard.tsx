"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X, Network, RefreshCw, Settings } from "lucide-react";
import { showService, InterfaceCounter } from "@/lib/api/show";
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
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";

interface InterfaceWithType extends InterfaceCounter {
  type: string;
}

const INTERFACE_TYPE_COLORS: Record<string, string> = {
  'Physical (Ethernet)': 'bg-blue-100 text-blue-800 border-blue-200',
  'Wireless': 'bg-purple-100 text-purple-800 border-purple-200',
  'Loopback': 'bg-gray-100 text-gray-800 border-gray-200',
  'VPN (WireGuard)': 'bg-green-100 text-green-800 border-green-200',
  'VPN (Virtual Tunnel)': 'bg-emerald-100 text-emerald-800 border-emerald-200',
  'VPN (Tunnel)': 'bg-teal-100 text-teal-800 border-teal-200',
  'VLAN': 'bg-orange-100 text-orange-800 border-orange-200',
  'Bridge': 'bg-cyan-100 text-cyan-800 border-cyan-200',
  'PPPoE': 'bg-pink-100 text-pink-800 border-pink-200',
  'Bonding': 'bg-indigo-100 text-indigo-800 border-indigo-200',
  'Dummy': 'bg-stone-100 text-stone-800 border-stone-200',
  'GRE Tunnel': 'bg-lime-100 text-lime-800 border-lime-200',
  'IPIP Tunnel': 'bg-amber-100 text-amber-800 border-amber-200',
  'SIT Tunnel': 'bg-rose-100 text-rose-800 border-rose-200',
  'Other': 'bg-slate-100 text-slate-800 border-slate-200',
};

const PIE_CHART_COLORS = [
  '#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8',
  '#82CA9D', '#FFC658', '#FF7C7C', '#8DD1E1', '#D084D0'
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
      const interfacesWithType = data.interfaces.map((iface) => ({
        ...iface,
        type: getInterfaceType(iface.interface),
      }));
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

  // Filter interfaces based on search
  const filteredInterfaces = interfaces.filter((iface) =>
    iface.interface.toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <div className="flex items-center gap-2">
          <Network className="h-5 w-5 text-primary" />
          <CardTitle className="text-lg font-medium">Interface Statistics</CardTitle>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={autoRefresh ? "default" : "outline"}
            size="sm"
            onClick={() => setAutoRefresh(!autoRefresh)}
          >
            <RefreshCw className={`h-4 w-4 mr-1 ${autoRefresh ? "animate-spin" : ""}`} />
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
          <div className="text-center text-muted-foreground py-4">Loading...</div>
        ) : (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              {/* Traffic Overview Pie Chart */}
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-muted-foreground">Traffic Distribution by Type</h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={preparePieChartData(filteredInterfaces)}
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        dataKey="value"
                        label={({ name, formattedValue }) => `${name}: ${formattedValue}`}
                      >
                        {preparePieChartData(filteredInterfaces).map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={PIE_CHART_COLORS[index % PIE_CHART_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip 
                        formatter={(value: number) => [formatBytes(value), 'Total Traffic']}
                        labelFormatter={(label) => `Type: ${label}`}
                      />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Interface Filter */}
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-muted-foreground">Filter Interfaces</h3>
                <Input
                  placeholder="Filter interfaces..."
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  className="max-w-sm"
                />
                <div className="text-xs text-muted-foreground">
                  Showing {filteredInterfaces.length} of {interfaces.length} interfaces
                </div>
              </div>
            </div>

            <div className="border rounded-lg overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="sticky left-0 z-10 bg-background w-[120px] border-r">Interface</TableHead>
                    <TableHead className="w-[140px]">Type</TableHead>
                    <TableHead className="text-right">RX Packets</TableHead>
                    <TableHead className="text-right">RX Bytes</TableHead>
                    <TableHead className="text-right">TX Packets</TableHead>
                    <TableHead className="text-right">TX Bytes</TableHead>
                    <TableHead className="text-right">RX Dropped</TableHead>
                    <TableHead className="text-right">TX Dropped</TableHead>
                    <TableHead className="text-right">RX Errors</TableHead>
                    <TableHead className="text-right">TX Errors</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredInterfaces.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={10} className="text-center text-muted-foreground">
                        No interfaces found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredInterfaces.map((iface) => (
                      <TableRow key={iface.interface}>
                        <TableCell className="sticky left-0 z-10 bg-background font-medium border-r">{iface.interface}</TableCell>
                        <TableCell>
                          <Badge 
                            variant="outline" 
                            className={`text-xs ${INTERFACE_TYPE_COLORS[iface.type] || 'bg-slate-100 text-slate-800 border-slate-200'}`}
                          >
                            {iface.type}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">{formatNumber(iface.rx_packets)}</TableCell>
                        <TableCell className="text-right">{formatBytes(iface.rx_bytes)}</TableCell>
                        <TableCell className="text-right">{formatNumber(iface.tx_packets)}</TableCell>
                        <TableCell className="text-right">{formatBytes(iface.tx_bytes)}</TableCell>
                        <TableCell className="text-right">{formatNumber(iface.rx_dropped)}</TableCell>
                        <TableCell className="text-right">{formatNumber(iface.tx_dropped)}</TableCell>
                        <TableCell className="text-right">{formatNumber(iface.rx_errors)}</TableCell>
                        <TableCell className="text-right">{formatNumber(iface.tx_errors)}</TableCell>
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
