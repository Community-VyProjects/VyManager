"use client";

import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Network,
  RefreshCw,
  AlertTriangle,
  ArrowDown,
  ArrowUp,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { monitoringService, type InterfaceTraffic } from "@/lib/api/monitoring";
import { formatBytes } from "@/lib/utils";
import { Skeleton } from "@/components/skeletons";

interface DataPoint {
  timestamp: number;
  rx_rate: number;
  tx_rate: number;
}

interface InterfaceTrafficChartProps {
  autoRefresh?: boolean;
  refreshInterval?: number;
  maxDataPoints?: number;
}

export function InterfaceTrafficChart({
  autoRefresh = true,
  refreshInterval = 5000,
  maxDataPoints = 60,
}: InterfaceTrafficChartProps) {
  const [interfaces, setInterfaces] = useState<InterfaceTraffic[]>([]);
  const [selectedInterface, setSelectedInterface] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAutoRefresh, setIsAutoRefresh] = useState(autoRefresh);
  const [dataHistory, setDataHistory] = useState<Map<string, DataPoint[]>>(new Map());

  const loadTraffic = async () => {
    try {
      setError(null);
      const data = await monitoringService.getInterfaceTraffic();
      setInterfaces(data.interfaces);

      // Auto-select first interface if none selected
      if (!selectedInterface && data.interfaces.length > 0) {
        // Prefer eth0 or first physical interface
        const eth0 = data.interfaces.find(i => i.name === "eth0");
        setSelectedInterface(eth0?.name ?? data.interfaces[0].name);
      }

      // Update history for all interfaces
      const now = Date.now();
      setDataHistory(prev => {
        const newHistory = new Map(prev);

        for (const iface of data.interfaces) {
          const history = newHistory.get(iface.name) ?? [];
          const newPoint: DataPoint = {
            timestamp: now,
            rx_rate: iface.rx_rate ?? 0,
            tx_rate: iface.tx_rate ?? 0,
          };

          // Add new point and keep only last maxDataPoints
          const updated = [...history, newPoint].slice(-maxDataPoints);
          newHistory.set(iface.name, updated);
        }

        return newHistory;
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load traffic");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTraffic();

    if (isAutoRefresh) {
      const interval = setInterval(loadTraffic, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [isAutoRefresh, refreshInterval]);

  const currentInterface = interfaces.find(i => i.name === selectedInterface);
  const chartData = dataHistory.get(selectedInterface) ?? [];

  // Format rate for display
  const formatRate = (rate: number) => {
    if (rate === 0) return "0 B/s";
    return `${formatBytes(rate)}/s`;
  };

  // Custom tooltip formatter
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || payload.length === 0) return null;

    return (
      <div className="bg-background border rounded-lg shadow-lg p-3">
        <p className="text-xs text-muted-foreground mb-2">
          {new Date(label).toLocaleTimeString()}
        </p>
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <ArrowDown className="h-3 w-3 text-green-500" />
            <span className="text-sm">RX: {formatRate(payload[0]?.value ?? 0)}</span>
          </div>
          <div className="flex items-center gap-2">
            <ArrowUp className="h-3 w-3 text-blue-500" />
            <span className="text-sm">TX: {formatRate(payload[1]?.value ?? 0)}</span>
          </div>
        </div>
      </div>
    );
  };

  if (loading && interfaces.length === 0) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <Skeleton className="h-6 w-36" />
            <div className="flex items-center gap-2">
              <Skeleton className="h-9 w-44" />
              <Skeleton className="h-9 w-20" />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 mb-4">
            <Skeleton className="h-6 w-28" />
            <Skeleton className="h-6 w-28" />
            <Skeleton className="h-4 w-40 ml-auto" />
          </div>
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (error && interfaces.length === 0) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
            <AlertTriangle className="h-8 w-8 mb-2 text-destructive" />
            <p>{error}</p>
            <Button variant="outline" size="sm" onClick={loadTraffic} className="mt-4">
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Network className="h-5 w-5" />
            Interface Traffic
          </CardTitle>
          <div className="flex items-center gap-2">
            <Select value={selectedInterface} onValueChange={setSelectedInterface}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Select interface" />
              </SelectTrigger>
              <SelectContent>
                {interfaces.map((iface) => (
                  <SelectItem key={iface.name} value={iface.name}>
                    {iface.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant={isAutoRefresh ? "default" : "outline"}
              size="sm"
              onClick={() => setIsAutoRefresh(!isAutoRefresh)}
            >
              <RefreshCw className={`h-4 w-4 mr-1 ${isAutoRefresh ? "animate-spin" : ""}`} />
              Auto
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Current rates display */}
        {currentInterface && (
          <div className="flex items-center gap-4 mb-4">
            <Badge variant="outline" className="text-green-500 border-green-500">
              <ArrowDown className="h-3 w-3 mr-1" />
              RX: {formatRate(currentInterface.rx_rate ?? 0)}
            </Badge>
            <Badge variant="outline" className="text-blue-500 border-blue-500">
              <ArrowUp className="h-3 w-3 mr-1" />
              TX: {formatRate(currentInterface.tx_rate ?? 0)}
            </Badge>
            <span className="text-xs text-muted-foreground ml-auto">
              Total: RX {formatBytes(currentInterface.rx_bytes)} / TX {formatBytes(currentInterface.tx_bytes)}
            </span>
          </div>
        )}

        {/* Chart */}
        <div className="h-64">
          {chartData.length < 2 ? (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              <p>Collecting data... ({chartData.length}/{maxDataPoints} points)</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="rxGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="txGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis
                  dataKey="timestamp"
                  tickFormatter={(ts) => new Date(ts).toLocaleTimeString([], { minute: '2-digit', second: '2-digit' })}
                  className="text-xs"
                  tick={{ fill: 'currentColor' }}
                />
                <YAxis
                  tickFormatter={(value) => formatBytes(value)}
                  className="text-xs"
                  tick={{ fill: 'currentColor' }}
                  width={60}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Area
                  type="monotone"
                  dataKey="rx_rate"
                  name="RX"
                  stroke="#22c55e"
                  fill="url(#rxGradient)"
                  strokeWidth={2}
                />
                <Area
                  type="monotone"
                  dataKey="tx_rate"
                  name="TX"
                  stroke="#3b82f6"
                  fill="url(#txGradient)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
