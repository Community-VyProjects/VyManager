"use client";

import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Search,
  RefreshCw,
  AlertCircle,
  FileText,
  Clock,
  Server,
  Terminal,
  Download,
  Power,
} from "lucide-react";
import { useEffect, useState, useMemo } from "react";
import { logsService, type LogEntry } from "@/lib/api/logs";
import { cn } from "@/lib/utils";
import { LoadingSpinner } from "@/components/ui/loading-spinner";

export default function SystemLogsPage() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [bootLogs, setBootLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [bootLoading, setBootLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedProcess, setSelectedProcess] = useState<string>("all");
  const [processes, setProcesses] = useState<string[]>([]);
  const [linesCount, setLinesCount] = useState<number>(100);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [activeTab, setActiveTab] = useState("system");

  const fetchLogs = async () => {
    try {
      setLoading(true);
      setError(null);
      const [logsData, processesData] = await Promise.all([
        logsService.getLogs({ lines: linesCount }),
        logsService.getLogProcesses(),
      ]);
      setLogs(logsData.entries);
      setProcesses(processesData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load logs");
      console.error("Error fetching logs:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchBootLogs = async () => {
    try {
      setBootLoading(true);
      const data = await logsService.getBootLogs(200);
      setBootLogs(data.entries);
    } catch (err) {
      console.error("Error fetching boot logs:", err);
    } finally {
      setBootLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      fetchLogs();
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const data = await logsService.searchLogs({
        query: searchQuery,
        lines: 500,
      });
      setLogs(data.entries);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to search logs");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [linesCount]);

  useEffect(() => {
    if (activeTab === "boot" && bootLogs.length === 0) {
      fetchBootLogs();
    }
  }, [activeTab]);

  // Auto-refresh
  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(fetchLogs, 5000);
      return () => clearInterval(interval);
    }
  }, [autoRefresh, linesCount]);

  // Filter logs by process
  const filteredLogs = useMemo(() => {
    if (selectedProcess === "all") return logs;
    return logs.filter(
      (log) => log.process && log.process.includes(selectedProcess)
    );
  }, [logs, selectedProcess]);

  // Get severity badge color
  const getSeverityBadge = (entry: LogEntry) => {
    const message = entry.message.toLowerCase();
    if (
      message.includes("error") ||
      message.includes("fail") ||
      message.includes("critical")
    ) {
      return (
        <Badge
          variant="outline"
          className="bg-red-500/10 text-red-500 border-red-500/20 text-xs"
        >
          Error
        </Badge>
      );
    }
    if (message.includes("warn")) {
      return (
        <Badge
          variant="outline"
          className="bg-orange-500/10 text-orange-500 border-orange-500/20 text-xs"
        >
          Warning
        </Badge>
      );
    }
    if (
      message.includes("success") ||
      message.includes("started") ||
      message.includes("loaded")
    ) {
      return (
        <Badge
          variant="outline"
          className="bg-green-500/10 text-green-500 border-green-500/20 text-xs"
        >
          Info
        </Badge>
      );
    }
    return null;
  };

  const handleExport = () => {
    const content = (activeTab === "system" ? filteredLogs : bootLogs)
      .map((log) => log.raw)
      .join("\n");
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `vyos-${activeTab}-logs-${new Date().toISOString().split("T")[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <AppLayout>
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="p-6 pb-4 border-b border-border">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-foreground">System Logs</h1>
              <p className="text-muted-foreground mt-2">
                View and search VyOS system logs
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant={autoRefresh ? "default" : "outline"}
                size="sm"
                onClick={() => setAutoRefresh(!autoRefresh)}
              >
                <RefreshCw
                  className={cn("h-4 w-4 mr-2", autoRefresh && "animate-spin")}
                />
                {autoRefresh ? "Auto-refresh On" : "Auto-refresh Off"}
              </Button>
              <Button variant="outline" size="sm" onClick={handleExport}>
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
              <Button onClick={fetchLogs} variant="outline" size="sm">
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-4 gap-4">
            <Card className="bg-card/50">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Entries</p>
                    <p className="text-2xl font-bold text-foreground mt-1">
                      {filteredLogs.length}
                    </p>
                  </div>
                  <FileText className="h-8 w-8 text-blue-500" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card/50">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Errors</p>
                    <p className="text-2xl font-bold text-foreground mt-1">
                      {
                        filteredLogs.filter(
                          (l) =>
                            l.message.toLowerCase().includes("error") ||
                            l.message.toLowerCase().includes("fail")
                        ).length
                      }
                    </p>
                  </div>
                  <AlertCircle className="h-8 w-8 text-red-500" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card/50">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Warnings</p>
                    <p className="text-2xl font-bold text-foreground mt-1">
                      {
                        filteredLogs.filter((l) =>
                          l.message.toLowerCase().includes("warn")
                        ).length
                      }
                    </p>
                  </div>
                  <Clock className="h-8 w-8 text-orange-500" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card/50">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Processes</p>
                    <p className="text-2xl font-bold text-foreground mt-1">
                      {processes.length}
                    </p>
                  </div>
                  <Terminal className="h-8 w-8 text-green-500" />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 p-6 pt-4 overflow-hidden">
          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className="h-full flex flex-col"
          >
            <div className="flex items-center justify-between mb-4">
              <TabsList>
                <TabsTrigger value="system" className="gap-2">
                  <Server className="h-4 w-4" />
                  System Logs
                </TabsTrigger>
                <TabsTrigger value="boot" className="gap-2">
                  <Power className="h-4 w-4" />
                  Boot Logs
                </TabsTrigger>
              </TabsList>

              {activeTab === "system" && (
                <div className="flex items-center gap-3">
                  <Select
                    value={linesCount.toString()}
                    onValueChange={(v) => setLinesCount(parseInt(v))}
                  >
                    <SelectTrigger className="w-[120px]">
                      <SelectValue placeholder="Lines" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="50">50 lines</SelectItem>
                      <SelectItem value="100">100 lines</SelectItem>
                      <SelectItem value="200">200 lines</SelectItem>
                      <SelectItem value="500">500 lines</SelectItem>
                      <SelectItem value="1000">1000 lines</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select
                    value={selectedProcess}
                    onValueChange={setSelectedProcess}
                  >
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Filter by process" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All processes</SelectItem>
                      {processes.map((process) => (
                        <SelectItem key={process} value={process}>
                          {process}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <div className="relative w-80">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search logs..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                      className="pl-10"
                    />
                  </div>
                  <Button onClick={handleSearch} size="sm">
                    Search
                  </Button>
                </div>
              )}
            </div>

            <TabsContent value="system" className="flex-1 mt-0">
              {loading ? (
                <div className="flex items-center justify-center h-64">
                  <LoadingSpinner />
                </div>
              ) : error ? (
                <div className="flex flex-col items-center justify-center h-64">
                  <AlertCircle className="h-12 w-12 text-destructive mb-4" />
                  <h2 className="text-xl font-semibold text-foreground mb-2">
                    Error Loading Logs
                  </h2>
                  <p className="text-muted-foreground mb-4">{error}</p>
                  <Button onClick={fetchLogs} variant="outline">
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Retry
                  </Button>
                </div>
              ) : filteredLogs.length === 0 ? (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold text-foreground mb-2">
                      No Logs Found
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {searchQuery
                        ? "No logs match your search criteria"
                        : "No system logs available"}
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <Card className="flex-1 overflow-hidden">
                  <ScrollArea className="h-[calc(100vh-450px)]">
                    <div className="p-4 font-mono text-sm space-y-1">
                      {filteredLogs.map((entry, index) => (
                        <div
                          key={index}
                          className={cn(
                            "flex items-start gap-3 py-2 px-3 rounded-md hover:bg-muted/50 transition-colors",
                            entry.message.toLowerCase().includes("error") &&
                              "bg-red-500/5",
                            entry.message.toLowerCase().includes("warn") &&
                              "bg-orange-500/5"
                          )}
                        >
                          <div className="flex-shrink-0 w-36 text-muted-foreground text-xs">
                            {entry.timestamp || "—"}
                          </div>
                          {entry.process && (
                            <Badge
                              variant="secondary"
                              className="flex-shrink-0 text-xs font-mono"
                            >
                              {entry.process}
                            </Badge>
                          )}
                          {getSeverityBadge(entry)}
                          <div className="flex-1 text-foreground break-all">
                            {entry.message}
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="boot" className="flex-1 mt-0">
              {bootLoading ? (
                <div className="flex items-center justify-center h-64">
                  <LoadingSpinner />
                </div>
              ) : bootLogs.length === 0 ? (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <Power className="h-12 w-12 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold text-foreground mb-2">
                      No Boot Logs
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Boot logs are not available
                    </p>
                    <Button
                      onClick={fetchBootLogs}
                      variant="outline"
                      className="mt-4"
                    >
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Retry
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <Card className="flex-1 overflow-hidden">
                  <ScrollArea className="h-[calc(100vh-450px)]">
                    <div className="p-4 font-mono text-sm space-y-1">
                      {bootLogs.map((entry, index) => (
                        <div
                          key={index}
                          className={cn(
                            "flex items-start gap-3 py-2 px-3 rounded-md hover:bg-muted/50 transition-colors",
                            entry.message.toLowerCase().includes("error") &&
                              "bg-red-500/5",
                            entry.message.toLowerCase().includes("warn") &&
                              "bg-orange-500/5"
                          )}
                        >
                          <div className="flex-shrink-0 w-36 text-muted-foreground text-xs">
                            {entry.timestamp || "—"}
                          </div>
                          {entry.process && (
                            <Badge
                              variant="secondary"
                              className="flex-shrink-0 text-xs font-mono"
                            >
                              {entry.process}
                            </Badge>
                          )}
                          {getSeverityBadge(entry)}
                          <div className="flex-1 text-foreground break-all">
                            {entry.message}
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </AppLayout>
  );
}
