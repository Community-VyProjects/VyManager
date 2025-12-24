"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X, Network, RefreshCw, Settings } from "lucide-react";
import { showService, InterfaceCounter } from "@/lib/api/show";
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
  const [interfaces, setInterfaces] = useState<InterfaceCounter[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState("");
  const [autoRefresh, setAutoRefresh] = useState(true);

  const loadData = async () => {
    try {
      setError(null);
      const data = await showService.getInterfaceCounters();
      setInterfaces(data.interfaces);
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
            <div className="mb-4">
              <Input
                placeholder="Filter interfaces..."
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="max-w-sm"
              />
            </div>

            <div className="border rounded-lg overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="sticky left-0 z-10 bg-background w-[120px] border-r">Interface</TableHead>
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
                      <TableCell colSpan={9} className="text-center text-muted-foreground">
                        No interfaces found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredInterfaces.map((iface) => (
                      <TableRow key={iface.interface}>
                        <TableCell className="sticky left-0 z-10 bg-background font-medium border-r">{iface.interface}</TableCell>
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

            <div className="mt-2 text-xs text-muted-foreground text-right">
              Showing {filteredInterfaces.length} of {interfaces.length} interfaces
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
