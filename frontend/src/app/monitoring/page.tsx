"use client";

export const dynamic = 'force-dynamic';

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Activity,
  AlertCircle,
  ExternalLink,
  Loader2,
  Play,
  SlidersHorizontal,
  Square,
  X,
} from "lucide-react";
import { monitoringService, MonitoringCommand, MonitoringStatus } from "@/lib/api/monitoring";
import { sessionService, ActiveSession } from "@/lib/api/session";
import { showService, InterfaceName } from "@/lib/api/show";
import { useMonitoringWebSocket } from "@/hooks/useMonitoringWebSocket";
import { MonitoringTerminal } from "@/components/monitoring/MonitoringTerminal";
import { TrafficTable } from "@/components/monitoring/TrafficTable";
import { LogTable } from "@/components/monitoring/LogTable";
import { ConntrackTable } from "@/components/monitoring/ConntrackTable";
import { FilterBuilderModal } from "@/components/monitoring/FilterBuilderModal";
import { cn } from "@/lib/utils";

// Commands that use the parsed table views
const TABLE_COMMANDS = {
  monitor_traffic: "traffic",
  monitor_log: "log",
  show_log_tail: "log",
  monitor_conntrack: "conntrack",
} as const;

type TableView = (typeof TABLE_COMMANDS)[keyof typeof TABLE_COMMANDS];

function getTableView(command: string): TableView | null {
  return TABLE_COMMANDS[command as keyof typeof TABLE_COMMANDS] ?? null;
}

export default function MonitoringPage() {
  const searchParams = useSearchParams();
  const [session, setSession] = useState<ActiveSession | null>(null);
  const [sshStatus, setSSHStatus] = useState<MonitoringStatus | null>(null);
  const [commands, setCommands] = useState<MonitoringCommand[]>([]);
  const [interfaces, setInterfaces] = useState<InterfaceName[]>([]);
  const [selectedCommand, setSelectedCommand] = useState<string>("");
  const [logLines, setLogLines] = useState("50");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // monitor_traffic specific capture params
  const [captureIface, setCaptureIface] = useState("");
  const [captureFilter, setCaptureFilter] = useState("");
  const [filterBuilderOpen, setFilterBuilderOpen] = useState(false);
  const [ifaceError, setIfaceError] = useState(false);

  // Session tracking for resetting tables on new capture
  const [sessionKey, setSessionKey] = useState(0);
  const [activeCommand, setActiveCommand] = useState<string | null>(null);
  const [activeParams, setActiveParams] = useState<Record<string, string>>({});

  const { status, output, statusMessage, error, start, stop, clear } =
    useMonitoringWebSocket();

  const isRunning =
    status === "running" ||
    status === "connecting" ||
    status === "ready" ||
    status === "stopping";

  // Load page data
  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setLoadError(null);
        const currentSession = await sessionService.getCurrentSession();
        setSession(currentSession);
        if (!currentSession) return;

        const [statusData, commandsData, ifacesData] = await Promise.all([
          monitoringService.getMonitoringStatus(),
          monitoringService.getCommands(),
          showService.getAllInterfaces().catch(() => ({ interfaces: [], total: 0 })),
        ]);
        setSSHStatus(statusData);
        setCommands(commandsData.commands);
        setInterfaces(ifacesData.interfaces);
        if (commandsData.commands.length > 0) {
          setSelectedCommand(commandsData.commands[0].name);
        }
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : "Failed to load monitoring data";
        setLoadError(message);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const startSession = (command: string, params: Record<string, string>) => {
    setSessionKey((k) => k + 1);
    setActiveCommand(command);
    setActiveParams(params);
    start(command, params);
  };

  const handleStartClick = () => {
    if (!selectedCommand) return;

    if (selectedCommand === "monitor_traffic") {
      if (!captureIface) {
        setIfaceError(true);
        return;
      }
      setIfaceError(false);
      const params: Record<string, string> = { iface: captureIface };
      if (captureFilter.trim()) params.filter = captureFilter.trim();
      startSession("monitor_traffic", params);
    } else if (selectedCommand === "show_log_tail") {
      startSession("show_log_tail", { lines: logLines || "50" });
    } else {
      startSession(selectedCommand, {});
    }
  };

  const handleClear = () => {
    clear();
  };

  const handleStop = () => {
    stop();
  };

  useEffect(() => {
    if (commands.length === 0) return;

    const requestedCommand = searchParams.get("command");
    const requestedIface = searchParams.get("iface");

    if (requestedCommand && commands.some((cmd) => cmd.name === requestedCommand)) {
      setSelectedCommand(requestedCommand);
      if (requestedCommand === "monitor_traffic") {
        setCaptureIface(requestedIface || (interfaces.length > 0 ? "any" : ""));
      }
    }
  }, [commands, interfaces, searchParams]);

  const currentCommandDef = commands.find((c) => c.name === selectedCommand);
  const tableView = activeCommand ? getTableView(activeCommand) : null;
  const isTerminalCommand =
    activeCommand &&
    (activeCommand === "monitor_protocol_bgp" ||
      activeCommand === "monitor_protocol_ospf");

  // Status label
  const statusLabel =
    status === "connecting"
      ? "Connecting…"
      : status === "ready"
      ? "Starting command…"
      : status === "running"
      ? "Live"
      : status === "stopping"
      ? "Stopping…"
      : null;

  const startDisabled =
    !selectedCommand ||
    (selectedCommand === "monitor_traffic" && !captureIface);

  return (
    <AppLayout>
      <div className="p-6 space-y-4">
        {/* Page Header */}
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-primary/10 p-2">
            <Activity className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Monitoring</h1>
            <p className="text-sm text-muted-foreground">
              Real-time monitoring via SSH
            </p>
          </div>
          {session && (
            <Badge variant="outline" className="ml-auto text-xs">
              {session.instance_name}
            </Badge>
          )}
        </div>

        {/* Loading / Error / No Session states */}
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : loadError ? (
          <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-4">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-destructive">Error</p>
                <p className="text-sm text-destructive/80">{loadError}</p>
              </div>
            </div>
          </div>
        ) : !session ? (
          <Card>
            <CardContent className="py-12 text-center space-y-2">
              <AlertCircle className="h-8 w-8 text-muted-foreground mx-auto" />
              <p className="text-sm font-medium">No Active Instance</p>
              <p className="text-sm text-muted-foreground">
                Connect to a VyOS instance to start monitoring.
              </p>
            </CardContent>
          </Card>
        ) : !sshStatus?.configured ? (
          <Card>
            <CardContent className="py-12 text-center space-y-2">
              <AlertCircle className="h-8 w-8 text-muted-foreground mx-auto" />
              <p className="text-sm font-medium">SSH Not Configured</p>
              <p className="text-sm text-muted-foreground">
                SSH key monitoring is not set up for{" "}
                <span className="font-medium">{session.instance_name}</span>.
              </p>
              <p className="text-sm text-muted-foreground flex items-center justify-center gap-1 pt-1">
                Go to{" "}
                <span className="font-medium inline-flex items-center gap-1">
                  Sites &rarr; Edit Instance &rarr; SSH
                  <ExternalLink className="h-3 w-3" />
                </span>{" "}
                to configure.
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Command Controls */}
            <Card>
              <CardContent className="p-4 space-y-3">
                {/* Row 1: Command selector + params + start/stop + status */}
                <div className="flex items-center gap-3 flex-wrap">
                  {/* Command Selector */}
                  <div className="flex items-center gap-2 flex-wrap flex-1 min-w-0">
                    <Select
                      value={selectedCommand}
                      onValueChange={(v) => {
                        setSelectedCommand(v);
                        setIfaceError(false);
                      }}
                      disabled={isRunning}
                    >
                      <SelectTrigger className="w-[320px]">
                        <SelectValue placeholder="Select command…" />
                      </SelectTrigger>
                      <SelectContent>
                        {commands.map((cmd) => (
                          <SelectItem key={cmd.name} value={cmd.name}>
                            {cmd.description}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    {/* Inline param for show_log_tail */}
                    {selectedCommand === "show_log_tail" && !isRunning && (
                      <div className="flex items-center gap-2">
                        <Label className="text-sm text-muted-foreground whitespace-nowrap">
                          Lines:
                        </Label>
                        <Input
                          type="number"
                          value={logLines}
                          onChange={(e) => setLogLines(e.target.value)}
                          className="w-20 h-9"
                          min="1"
                          max="9999"
                        />
                      </div>
                    )}

                    {/* Command description */}
                    {currentCommandDef &&
                      !isRunning &&
                      selectedCommand !== "monitor_traffic" && (
                        <p className="text-xs text-muted-foreground hidden sm:block">
                          {currentCommandDef.description}
                        </p>
                      )}
                  </div>

                  {/* Start / Stop */}
                  {!isRunning ? (
                    <Button
                      onClick={handleStartClick}
                      disabled={startDisabled}
                      className="gap-2"
                    >
                      <Play className="h-4 w-4" />
                      Start
                    </Button>
                  ) : (
                    <Button
                      variant="destructive"
                      onClick={handleStop}
                      disabled={status === "stopping"}
                      className="gap-2"
                    >
                      <Square className="h-4 w-4" />
                      Stop
                    </Button>
                  )}

                  {/* Live status indicator */}
                  {(isRunning || statusLabel) && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <div
                        className={cn(
                          "h-2 w-2 rounded-full",
                          isRunning && status === "running"
                            ? "bg-green-500 animate-pulse"
                            : isRunning
                            ? "bg-yellow-500 animate-pulse"
                            : "bg-gray-400"
                        )}
                      />
                      <span>{statusLabel}</span>
                      {statusMessage && (
                        <span className="text-muted-foreground/70 truncate max-w-[200px]">
                          — {statusMessage}
                        </span>
                      )}
                      {error && (
                        <span className="text-destructive">— {error}</span>
                      )}
                    </div>
                  )}
                </div>

                {/* Row 2: monitor_traffic — interface + filter bar */}
                {selectedCommand === "monitor_traffic" && (
                  <div className="flex items-end gap-3 flex-wrap border-t pt-3">
                    {/* Interface */}
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">
                        Interface{" "}
                        <span className="text-destructive">*</span>
                      </Label>
                      <Select
                        value={captureIface}
                        onValueChange={(v) => {
                          setCaptureIface(v);
                          setIfaceError(false);
                        }}
                        disabled={isRunning}
                      >
                        <SelectTrigger
                          className={cn(
                            "w-36 h-8 text-sm",
                            ifaceError && "border-destructive ring-destructive/20"
                          )}
                        >
                          <SelectValue placeholder="Select…" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="any">any</SelectItem>
                          {interfaces.map((iface) => (
                            <SelectItem key={iface.name} value={iface.name}>
                              {iface.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {ifaceError && (
                        <p className="text-[10px] text-destructive">Required</p>
                      )}
                    </div>

                    {/* Filter bar */}
                    <div className="flex-1 min-w-[200px] space-y-1.5">
                      <Label className="text-xs text-muted-foreground">
                        Filter Expression
                        <span className="ml-1 text-muted-foreground/60 font-normal">
                          (BPF syntax, optional)
                        </span>
                      </Label>
                      <div className="flex items-center gap-1.5">
                        <div className="relative flex-1">
                          <Input
                            value={captureFilter}
                            onChange={(e) => setCaptureFilter(e.target.value)}
                            placeholder="tcp and port 443…"
                            disabled={isRunning}
                            className="h-8 font-mono text-xs pr-7"
                          />
                          {captureFilter && !isRunning && (
                            <button
                              onClick={() => setCaptureFilter("")}
                              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                        {!isRunning && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 px-2.5 gap-1.5 text-xs whitespace-nowrap flex-shrink-0"
                            onClick={() => setFilterBuilderOpen(true)}
                          >
                            <SlidersHorizontal className="h-3.5 w-3.5" />
                            Build Filter
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Data View */}
            {activeCommand ? (
              <>
                {tableView === "traffic" && (
                  <TrafficTable
                    key={sessionKey}
                    output={output}
                    isRunning={isRunning}
                    iface={activeParams.iface ?? ""}
                    filter={activeParams.filter ?? ""}
                    onClear={handleClear}
                  />
                )}
                {tableView === "log" && (
                  <LogTable
                    key={sessionKey}
                    output={output}
                    isRunning={isRunning}
                    onClear={handleClear}
                  />
                )}
                {tableView === "conntrack" && (
                  <ConntrackTable
                    key={sessionKey}
                    output={output}
                    isRunning={isRunning}
                    onClear={handleClear}
                  />
                )}
                {isTerminalCommand && (
                  <Card className="overflow-hidden">
                    <MonitoringTerminal output={output} onClear={handleClear} />
                  </Card>
                )}
              </>
            ) : (
              <Card>
                <CardContent className="py-16 text-center space-y-2">
                  <Activity className="h-10 w-10 text-muted-foreground mx-auto" />
                  <p className="text-sm font-medium text-muted-foreground">
                    Select a command and click Start to begin monitoring
                  </p>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>

      {/* Filter Builder Modal */}
      <FilterBuilderModal
        open={filterBuilderOpen}
        onOpenChange={setFilterBuilderOpen}
        onApply={(bpf) => setCaptureFilter(bpf)}
      />
    </AppLayout>
  );
}
