"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  History,
  RefreshCw,
  AlertTriangle,
  Cpu,
  HardDrive,
  Network,
  Cable,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from "recharts";
import {
  monitoringService,
  type MetricType,
  type MetricsHistoryResponse,
  type MetricsSeries,
} from "@/lib/api/monitoring";
import { formatBytes, formatNumber } from "@/lib/utils";
import { Skeleton } from "@/components/skeletons";

const METRIC_CONFIGS: Record<MetricType, {
  label: string;
  icon: React.ElementType;
  color: string;
  formatter: (v: number) => string;
  unit: string;
}> = {
  CPU: {
    label: "CPU Usage",
    icon: Cpu,
    color: "#3b82f6",
    formatter: (v) => `${v.toFixed(1)}%`,
    unit: "%",
  },
  MEMORY: {
    label: "Memory Usage",
    icon: HardDrive,
    color: "#22c55e",
    formatter: (v) => `${v.toFixed(1)}%`,
    unit: "%",
  },
  DISK: {
    label: "Disk Usage",
    icon: HardDrive,
    color: "#f59e0b",
    formatter: (v) => `${v.toFixed(1)}%`,
    unit: "%",
  },
  INTERFACE_RX: {
    label: "Interface RX",
    icon: Network,
    color: "#22c55e",
    formatter: formatBytes,
    unit: "bytes",
  },
  INTERFACE_TX: {
    label: "Interface TX",
    icon: Network,
    color: "#3b82f6",
    formatter: formatBytes,
    unit: "bytes",
  },
  CONNTRACK: {
    label: "Connections",
    icon: Cable,
    color: "#8b5cf6",
    formatter: formatNumber,
    unit: "",
  },
};

const TIME_RANGES = [
  { value: "1", label: "1 hour" },
  { value: "6", label: "6 hours" },
  { value: "24", label: "24 hours" },
  { value: "48", label: "2 days" },
  { value: "168", label: "7 days" },
];

interface MetricsHistoryChartProps {
  defaultMetricType?: MetricType;
  defaultHours?: number;
}

export function MetricsHistoryChart({
  defaultMetricType = "CPU",
  defaultHours = 24,
}: MetricsHistoryChartProps) {
  const [metricType, setMetricType] = useState<MetricType>(defaultMetricType);
  const [hours, setHours] = useState(String(defaultHours));
  const [data, setData] = useState<MetricsHistoryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setError(null);
      setLoading(true);
      const result = await monitoringService.getMetricsHistory({
        metric_type: metricType,
        hours: parseInt(hours, 10),
      });
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load metrics history");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [metricType, hours]);

  const config = METRIC_CONFIGS[metricType];
  const Icon = config.icon;

  // Transform data for Recharts
  const chartData = data?.series?.[0]?.data?.map((point) => ({
    timestamp: new Date(point.timestamp).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    }),
    fullTimestamp: new Date(point.timestamp).toLocaleString(),
    value: point.value,
    name: point.name,
  })) || [];

  if (loading && !data) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <Skeleton className="h-6 w-40" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Metrics History
          </CardTitle>
          <div className="flex items-center gap-2">
            <Select value={metricType} onValueChange={(v) => setMetricType(v as MetricType)}>
              <SelectTrigger className="w-[160px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(METRIC_CONFIGS).map(([type, cfg]) => {
                  const TypeIcon = cfg.icon;
                  return (
                    <SelectItem key={type} value={type}>
                      <div className="flex items-center gap-2">
                        <TypeIcon className="h-4 w-4" style={{ color: cfg.color }} />
                        {cfg.label}
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>

            <Select value={hours} onValueChange={setHours}>
              <SelectTrigger className="w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TIME_RANGES.map((range) => (
                  <SelectItem key={range.value} value={range.value}>
                    {range.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button variant="outline" size="sm" onClick={loadData} disabled={loading}>
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {error ? (
          <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
            <AlertTriangle className="h-8 w-8 mb-2 text-destructive" />
            <p>{error}</p>
            <Button variant="outline" size="sm" onClick={loadData} className="mt-4">
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </div>
        ) : chartData.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
            <History className="h-8 w-8 mb-2 opacity-50" />
            <p>No historical data available</p>
            <p className="text-sm mt-1">
              Metrics will be collected over time
            </p>
          </div>
        ) : (
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id={`gradient-${metricType}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={config.color} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={config.color} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis
                  dataKey="timestamp"
                  tick={{ fontSize: 12 }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  tickFormatter={config.formatter}
                  tick={{ fontSize: 12 }}
                  tickLine={false}
                  axisLine={false}
                  width={60}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                  }}
                  formatter={(value) => [config.formatter(value as number), config.label]}
                  labelFormatter={(label, payload) =>
                    (payload?.[0]?.payload as { fullTimestamp?: string })?.fullTimestamp || String(label)
                  }
                />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke={config.color}
                  strokeWidth={2}
                  fill={`url(#gradient-${metricType})`}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Summary stats */}
        {data?.series?.[0]?.data && data.series[0].data.length > 0 && (
          <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t">
            <div className="text-center">
              <p className="text-xs text-muted-foreground">Min</p>
              <p className="font-mono font-medium">
                {config.formatter(
                  Math.min(...data.series[0].data.map((d) => d.value))
                )}
              </p>
            </div>
            <div className="text-center">
              <p className="text-xs text-muted-foreground">Average</p>
              <p className="font-mono font-medium">
                {config.formatter(
                  data.series[0].data.reduce((a, b) => a + b.value, 0) /
                    data.series[0].data.length
                )}
              </p>
            </div>
            <div className="text-center">
              <p className="text-xs text-muted-foreground">Max</p>
              <p className="font-mono font-medium">
                {config.formatter(
                  Math.max(...data.series[0].data.map((d) => d.value))
                )}
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
