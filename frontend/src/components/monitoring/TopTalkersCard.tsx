"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  RefreshCw,
  AlertTriangle,
  Users,
  Server,
  HardDrive,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  Cell,
} from "recharts";
import {
  monitoringService,
  type TopTalker,
  type TopTalkersResponse,
} from "@/lib/api/monitoring";
import { formatBytes, formatNumber } from "@/lib/utils";
import { Skeleton } from "@/components/skeletons";

const CHART_COLORS = [
  "#3b82f6", // blue
  "#22c55e", // green
  "#f59e0b", // amber
  "#ef4444", // red
  "#8b5cf6", // purple
  "#ec4899", // pink
  "#14b8a6", // teal
  "#f97316", // orange
  "#6366f1", // indigo
  "#84cc16", // lime
];

// Well-known port names
const PORT_NAMES: Record<string, string> = {
  "22/tcp": "SSH",
  "23/tcp": "Telnet",
  "25/tcp": "SMTP",
  "53/udp": "DNS",
  "53/tcp": "DNS",
  "80/tcp": "HTTP",
  "110/tcp": "POP3",
  "143/tcp": "IMAP",
  "443/tcp": "HTTPS",
  "465/tcp": "SMTPS",
  "587/tcp": "Submission",
  "993/tcp": "IMAPS",
  "995/tcp": "POP3S",
  "3306/tcp": "MySQL",
  "5432/tcp": "PostgreSQL",
  "6379/tcp": "Redis",
  "8080/tcp": "HTTP-Alt",
  "8443/tcp": "HTTPS-Alt",
};

interface TopTalkersCardProps {
  autoRefresh?: boolean;
  refreshInterval?: number;
  limit?: number;
}

export function TopTalkersCard({
  autoRefresh = false,
  refreshInterval = 15000,
  limit = 10,
}: TopTalkersCardProps) {
  const [data, setData] = useState<TopTalkersResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAutoRefresh, setIsAutoRefresh] = useState(autoRefresh);
  const [activeTab, setActiveTab] = useState("sources");
  const [sortBy, setSortBy] = useState<"connections" | "bytes">("connections");

  const loadData = async () => {
    try {
      setError(null);
      const result = await monitoringService.getTopTalkers(limit);
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load top talkers");
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
  }, [isAutoRefresh, refreshInterval, limit]);

  const getPortLabel = (portKey: string): string => {
    return PORT_NAMES[portKey] || portKey;
  };

  const getCurrentData = (): TopTalker[] => {
    if (!data) return [];

    switch (activeTab) {
      case "sources":
        return sortBy === "bytes" ? data.by_bytes_source : data.by_source_ip;
      case "destinations":
        return sortBy === "bytes" ? data.by_bytes_destination : data.by_destination_ip;
      case "ports":
        return data.by_destination_port;
      default:
        return data.by_source_ip;
    }
  };

  const getChartData = () => {
    return getCurrentData().slice(0, 8).map((item, index) => ({
      name: activeTab === "ports" ? getPortLabel(item.key) : item.key,
      value: sortBy === "bytes" ? item.bytes : item.connections,
      fill: CHART_COLORS[index % CHART_COLORS.length],
    }));
  };

  if (loading && !data) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <Skeleton className="h-6 w-32" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-48 w-full" />
            <div className="space-y-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error && !data) {
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

  const chartData = getChartData();
  const tableData = getCurrentData();

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Top Talkers
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="font-mono">
              {formatNumber(data?.total_connections ?? 0)} connections
            </Badge>
            <Badge variant="outline" className="font-mono">
              {formatBytes(data?.total_bytes ?? 0)} total
            </Badge>
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
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 mb-4">
            <TabsList>
              <TabsTrigger value="sources" className="gap-1">
                <ArrowUp className="h-3 w-3" />
                Sources
              </TabsTrigger>
              <TabsTrigger value="destinations" className="gap-1">
                <ArrowDown className="h-3 w-3" />
                Destinations
              </TabsTrigger>
              <TabsTrigger value="ports" className="gap-1">
                <Server className="h-3 w-3" />
                Ports
              </TabsTrigger>
            </TabsList>

            {activeTab !== "ports" && (
              <div className="flex items-center gap-1">
                <span className="text-sm text-muted-foreground mr-1">Sort by:</span>
                <Button
                  variant={sortBy === "connections" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSortBy("connections")}
                >
                  Connections
                </Button>
                <Button
                  variant={sortBy === "bytes" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSortBy("bytes")}
                >
                  <HardDrive className="h-3 w-3 mr-1" />
                  Bytes
                </Button>
              </div>
            )}
          </div>

          {/* Chart */}
          <div className="h-48 mb-4">
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={chartData}
                  layout="vertical"
                  margin={{ top: 5, right: 30, left: 80, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    type="number"
                    tickFormatter={(value) =>
                      sortBy === "bytes" ? formatBytes(value) : formatNumber(value)
                    }
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    tick={{ fontSize: 12 }}
                    width={75}
                  />
                  <Tooltip
                    formatter={(value) => [
                      sortBy === "bytes"
                        ? formatBytes(value as number)
                        : formatNumber(value as number),
                      sortBy === "bytes" ? "Bytes" : "Connections",
                    ]}
                  />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                No data available
              </div>
            )}
          </div>

          {/* Table */}
          <div className="border rounded-lg overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">#</TableHead>
                  <TableHead>
                    {activeTab === "ports" ? "Port/Protocol" : "IP Address"}
                  </TableHead>
                  <TableHead className="text-right">Connections</TableHead>
                  <TableHead className="text-right">Packets</TableHead>
                  <TableHead className="text-right">Bytes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tableData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground">
                      No data available
                    </TableCell>
                  </TableRow>
                ) : (
                  tableData.map((item, index) => (
                    <TableRow key={item.key}>
                      <TableCell className="font-medium text-muted-foreground">
                        {index + 1}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div
                            className="w-2 h-2 rounded-full"
                            style={{
                              backgroundColor: CHART_COLORS[index % CHART_COLORS.length],
                            }}
                          />
                          <span className="font-mono">
                            {activeTab === "ports" ? getPortLabel(item.key) : item.key}
                          </span>
                          {activeTab === "ports" && PORT_NAMES[item.key] && (
                            <Badge variant="secondary" className="text-xs">
                              {item.key}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {formatNumber(item.connections)}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {formatNumber(item.packets)}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {formatBytes(item.bytes)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </Tabs>
      </CardContent>
    </Card>
  );
}
