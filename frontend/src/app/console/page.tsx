"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, Loader2, RefreshCw, Terminal, TriangleAlert } from "lucide-react";
import { consoleService, type ConsoleStatus } from "@/lib/api/console";
import { ConsoleTerminal } from "@/components/console/ConsoleTerminal";
import type { ConsoleStatus as WsStatus } from "@/hooks/useConsoleWebSocket";
import { cn } from "@/lib/utils";

const STATUS_COLORS: Record<WsStatus, string> = {
  disconnected: "bg-gray-400",
  connecting: "bg-yellow-400 animate-pulse",
  connected: "bg-green-400",
  error: "bg-red-400",
};

const STATUS_LABELS: Record<WsStatus, string> = {
  disconnected: "Disconnected",
  connecting: "Connecting...",
  connected: "Connected",
  error: "Error",
};

export default function ConsolePage() {
  const [sshStatus, setSshStatus] = useState<ConsoleStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [wsStatus, setWsStatus] = useState<WsStatus>("disconnected");
  const [wsError, setWsError] = useState<string | null>(null);

  // Refs to trigger connect/disconnect from the page without re-mounting the terminal
  const connectRef = useRef<(() => void) | null>(null);
  const disconnectRef = useRef<(() => void) | null>(null);

  const handleReconnect = useCallback(() => {
    setWsError(null);
    connectRef.current?.();
  }, []);

  const handleDisconnect = useCallback(() => {
    disconnectRef.current?.();
  }, []);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setLoadError(null);
        const data = await consoleService.getStatus();
        setSshStatus(data);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Failed to load console status";
        setLoadError(msg);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  return (
    <AppLayout>
      <div className="flex flex-col h-full p-6 gap-4">
        {/* Header */}
        <div className="flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Terminal className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-semibold">SSH Console</h1>
              <p className="text-sm text-muted-foreground">
                Interactive shell session on the active VyOS device
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Connection status indicator */}
            {!loading && sshStatus?.configured && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span
                  className={cn("h-2 w-2 rounded-full", STATUS_COLORS[wsStatus])}
                />
                <span>{STATUS_LABELS[wsStatus]}</span>
              </div>
            )}

            {/* Reconnect / Disconnect buttons */}
            {!loading && sshStatus?.configured && (
              wsStatus === "disconnected" || wsStatus === "error" ? (
                <Button size="sm" onClick={handleReconnect} variant="outline">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  {wsStatus === "error" ? "Retry" : "Connect"}
                </Button>
              ) : (
                <Button
                  size="sm"
                  onClick={handleDisconnect}
                  variant="outline"
                  disabled={wsStatus === "connecting"}
                >
                  Disconnect
                </Button>
              )
            )}
          </div>
        </div>

        {/* Body */}
        {loading ? (
          <div className="flex items-center justify-center flex-1">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : loadError ? (
          <Card>
            <CardContent className="flex items-center gap-3 p-6 text-destructive">
              <AlertCircle className="h-5 w-5 flex-shrink-0" />
              <span className="text-sm">{loadError}</span>
            </CardContent>
          </Card>
        ) : !sshStatus?.configured ? (
          <Card>
            <CardContent className="flex items-start gap-3 p-6">
              <TriangleAlert className="h-5 w-5 text-yellow-500 flex-shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="text-sm font-medium">SSH not configured</p>
                <p className="text-sm text-muted-foreground">
                  An SSH key must be generated and added to the VyOS device before
                  using the console. Go to{" "}
                  <span className="font-medium">Sites &gt; Edit Instance &gt; SSH / Monitoring</span>{" "}
                  to set it up.
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* WebSocket error banner — only when not currently connected */}
            {wsError && wsStatus !== "connected" && (
              <Card className="border-destructive/50 bg-destructive/5 flex-shrink-0">
                <CardContent className="flex items-center gap-3 p-4 text-destructive">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  <span className="text-sm">{wsError}</span>
                </CardContent>
              </Card>
            )}

            {/* Terminal — fills remaining vertical space */}
            <div className="flex-1 min-h-0 rounded-lg overflow-hidden border border-border">
              <ConsoleTerminal
                onStatusChange={setWsStatus}
                onErrorChange={setWsError}
                connectRef={connectRef}
                disconnectRef={disconnectRef}
              />
            </div>
          </>
        )}
      </div>
    </AppLayout>
  );
}
