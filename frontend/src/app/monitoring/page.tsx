"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Activity, AlertCircle, Loader2, Play, Square } from "lucide-react";
import { monitoringService, MonitoringCommand, SSHKeyStatus } from "@/lib/api/monitoring";
import { useMonitoringWebSocket } from "@/hooks/useMonitoringWebSocket";
import { MonitoringTerminal } from "@/components/monitoring/MonitoringTerminal";
import { SSHKeySetup } from "@/components/monitoring/SSHKeySetup";

export default function MonitoringPage() {
  const [sshStatus, setSSHStatus] = useState<SSHKeyStatus | null>(null);
  const [commands, setCommands] = useState<MonitoringCommand[]>([]);
  const [selectedCommand, setSelectedCommand] = useState<string>("");
  const [params, setParams] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const { status, output, statusMessage, error, start, stop, clear } =
    useMonitoringWebSocket();

  const loadData = async () => {
    try {
      setLoading(true);
      setLoadError(null);
      const [statusData, commandsData] = await Promise.all([
        monitoringService.getSSHKeyStatus(),
        monitoringService.getCommands(),
      ]);
      setSSHStatus(statusData);
      setCommands(commandsData.commands);
      if (commandsData.commands.length > 0 && !selectedCommand) {
        setSelectedCommand(commandsData.commands[0].name);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to load monitoring data";
      setLoadError(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const currentCommand = commands.find((c) => c.name === selectedCommand);

  const handleCommandChange = (value: string) => {
    setSelectedCommand(value);
    setParams({});
  };

  const handleStart = () => {
    if (!selectedCommand) return;
    start(selectedCommand, params);
  };

  const isRunning = status === "running" || status === "connecting" || status === "ready" || status === "stopping";

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="p-6">
        <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-4">
          <div className="flex items-start gap-2">
            <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-destructive">Error</p>
              <p className="text-sm text-destructive/80">{loadError}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
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
      </div>

      <Tabs defaultValue={sshStatus?.configured ? "monitor" : "setup"}>
        <TabsList>
          <TabsTrigger value="monitor">Monitor</TabsTrigger>
          <TabsTrigger value="setup">SSH Setup</TabsTrigger>
        </TabsList>

        <TabsContent value="setup" className="mt-4">
          <div className="max-w-xl">
            <SSHKeySetup onConfigured={loadData} />
          </div>
        </TabsContent>

        <TabsContent value="monitor" className="mt-4 space-y-4">
          {!sshStatus?.configured ? (
            <Card>
              <CardContent className="py-8 text-center space-y-3">
                <AlertCircle className="h-8 w-8 text-muted-foreground mx-auto" />
                <p className="text-sm text-muted-foreground">
                  SSH key not configured. Switch to the SSH Setup tab to
                  configure your SSH key before monitoring.
                </p>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Command Selection */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Command</CardTitle>
                  <CardDescription>
                    Select a monitoring command and configure parameters
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex gap-3 items-end flex-wrap">
                    <div className="space-y-2 flex-1 min-w-[200px]">
                      <Label>Command</Label>
                      <Select
                        value={selectedCommand}
                        onValueChange={handleCommandChange}
                        disabled={isRunning}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select command..." />
                        </SelectTrigger>
                        <SelectContent>
                          {commands.map((cmd) => (
                            <SelectItem key={cmd.name} value={cmd.name}>
                              {cmd.description}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Dynamic parameters */}
                    {currentCommand &&
                      Object.entries(currentCommand.params).map(
                        ([paramName, paramDef]) => (
                          <div
                            key={paramName}
                            className="space-y-2 min-w-[150px]"
                          >
                            <Label>
                              {paramName}
                              {paramDef.required && (
                                <span className="text-destructive ml-1">*</span>
                              )}
                            </Label>
                            <Input
                              value={params[paramName] || ""}
                              onChange={(e) =>
                                setParams((prev) => ({
                                  ...prev,
                                  [paramName]: e.target.value,
                                }))
                              }
                              placeholder={
                                paramDef.default || paramDef.description
                              }
                              disabled={isRunning}
                            />
                          </div>
                        )
                      )}

                    {/* Start/Stop buttons */}
                    <div className="flex gap-2">
                      {!isRunning ? (
                        <Button onClick={handleStart} disabled={!selectedCommand}>
                          <Play className="h-4 w-4 mr-2" />
                          Start
                        </Button>
                      ) : (
                        <Button
                          variant="destructive"
                          onClick={stop}
                          disabled={status === "stopping"}
                        >
                          <Square className="h-4 w-4 mr-2" />
                          Stop
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Status bar */}
                  <div className="flex items-center gap-2 text-xs">
                    <div
                      className={`h-2 w-2 rounded-full ${
                        isRunning
                          ? "bg-green-500 animate-pulse"
                          : "bg-gray-400"
                      }`}
                    />
                    <span className="text-muted-foreground">
                      {status === "connecting"
                        ? "Connecting..."
                        : status === "ready"
                          ? "Connected, starting command..."
                          : status === "running"
                            ? "Streaming output"
                            : status === "stopping"
                              ? "Stopping..."
                              : "Disconnected"}
                    </span>
                    {statusMessage && (
                      <span className="text-muted-foreground">
                        - {statusMessage}
                      </span>
                    )}
                    {error && (
                      <span className="text-destructive">
                        - {error}
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Terminal Output */}
              <Card className="overflow-hidden">
                <MonitoringTerminal output={output} onClear={clear} />
              </Card>
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
