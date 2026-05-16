"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Terminal } from "@xterm/xterm";
import { consoleService } from "@/lib/api/console";

export type ConsoleStatus =
  | "disconnected"
  | "connecting"
  | "connected"
  | "error";

interface UseConsoleWebSocketResult {
  status: ConsoleStatus;
  error: string | null;
  connect: (terminal: Terminal) => void;
  disconnect: () => void;
}

export function useConsoleWebSocket(): UseConsoleWebSocketResult {
  const [status, setStatus] = useState<ConsoleStatus>("disconnected");
  const [error, setError] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const disposeHandlersRef = useRef<(() => void)[]>([]);

  const disconnect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    for (const dispose of disposeHandlersRef.current) {
      dispose();
    }
    disposeHandlersRef.current = [];
    setStatus("disconnected");
  }, []);

  const connect = useCallback(
    (terminal: Terminal) => {
      disconnect();
      setError(null);
      setStatus("connecting");

      const ws = consoleService.createConsoleSocket();
      wsRef.current = ws;

      ws.onopen = () => {
        // status stays "connecting" until server sends {"type":"connected"}
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data as string);
          switch (msg.type) {
            case "connected":
              setStatus("connected");
              break;
            case "output":
              terminal.write(msg.data as string);
              break;
            case "error":
              setError(msg.message as string);
              setStatus("error");
              break;
            case "disconnected":
              setStatus("disconnected");
              if (msg.reason) {
                terminal.writeln(`\r\n\x1b[33m[${msg.reason}]\x1b[0m`);
              }
              break;
          }
        } catch {
          // non-JSON frame — ignore
        }
      };

      ws.onerror = () => {
        setError("WebSocket connection failed");
        setStatus("error");
      };

      ws.onclose = () => {
        wsRef.current = null;
        setStatus((prev) =>
          prev === "connected" || prev === "connecting" ? "disconnected" : prev
        );
      };

      // Forward keystrokes from xterm to SSH stdin
      const dataDispose = terminal.onData((data) => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: "input", data }));
        }
      });

      // Forward terminal resize to SSH PTY
      const resizeDispose = terminal.onResize(({ cols, rows }) => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: "resize", cols, rows }));
        }
      });

      disposeHandlersRef.current = [
        () => dataDispose.dispose(),
        () => resizeDispose.dispose(),
      ];
    },
    [disconnect]
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return { status, error, connect, disconnect };
}
