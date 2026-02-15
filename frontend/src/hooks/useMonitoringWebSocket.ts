"use client";

import { useCallback, useRef, useState } from "react";
import { monitoringService, MonitoringMessage } from "@/lib/api/monitoring";

export type MonitoringStatus = "disconnected" | "connecting" | "ready" | "running" | "stopping";

interface UseMonitoringWebSocketReturn {
  status: MonitoringStatus;
  output: string[];
  statusMessage: string | null;
  error: string | null;
  start: (command: string, params: Record<string, string>) => void;
  stop: () => void;
  clear: () => void;
}

const MAX_LINES = 5000;

export function useMonitoringWebSocket(): UseMonitoringWebSocketReturn {
  const [status, setStatus] = useState<MonitoringStatus>("disconnected");
  const [output, setOutput] = useState<string[]>([]);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  const cleanup = useCallback(() => {
    if (wsRef.current) {
      try {
        wsRef.current.close();
      } catch {
        // ignore
      }
      wsRef.current = null;
    }
  }, []);

  const start = useCallback(
    (command: string, params: Record<string, string>) => {
      cleanup();
      setError(null);
      setStatusMessage(null);
      setStatus("connecting");

      const ws = monitoringService.createMonitoringSocket();
      wsRef.current = ws;

      ws.onopen = () => {
        // Wait for "ready" message before sending command
      };

      ws.onmessage = (event: MessageEvent) => {
        try {
          const msg: MonitoringMessage = JSON.parse(event.data);

          switch (msg.type) {
            case "ready":
              setStatus("ready");
              // Send command
              ws.send(JSON.stringify({ command, params }));
              setStatus("running");
              break;

            case "output":
              if (msg.data) {
                // Split by newlines and append
                const lines = msg.data.split("\n");
                setOutput((prev) => {
                  const updated = [...prev, ...lines];
                  // Cap at MAX_LINES
                  if (updated.length > MAX_LINES) {
                    return updated.slice(updated.length - MAX_LINES);
                  }
                  return updated;
                });
              }
              break;

            case "status":
              setStatusMessage(msg.data || null);
              break;

            case "error":
              setError(msg.data || "Unknown error");
              setStatus("disconnected");
              cleanup();
              break;

            case "stopped":
              setStatus("disconnected");
              setStatusMessage("Session ended");
              cleanup();
              break;
          }
        } catch {
          // Non-JSON message, treat as raw output
          setOutput((prev) => {
            const updated = [...prev, event.data];
            if (updated.length > MAX_LINES) {
              return updated.slice(updated.length - MAX_LINES);
            }
            return updated;
          });
        }
      };

      ws.onerror = () => {
        setError("WebSocket connection error");
        setStatus("disconnected");
        cleanup();
      };

      ws.onclose = () => {
        setStatus("disconnected");
        wsRef.current = null;
      };
    },
    [cleanup]
  );

  const stop = useCallback(() => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      setStatus("stopping");
      wsRef.current.send(JSON.stringify({ type: "stop" }));
    }
  }, []);

  const clear = useCallback(() => {
    setOutput([]);
    setError(null);
    setStatusMessage(null);
  }, []);

  return { status, output, statusMessage, error, start, stop, clear };
}
