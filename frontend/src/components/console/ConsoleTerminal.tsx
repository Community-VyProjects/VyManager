"use client";

import "@xterm/xterm/css/xterm.css";

import { useEffect, useRef } from "react";
import type { Terminal } from "@xterm/xterm";
import { useConsoleWebSocket, type ConsoleStatus } from "@/hooks/useConsoleWebSocket";

interface ConsoleTerminalProps {
  onStatusChange?: (status: ConsoleStatus) => void;
  onErrorChange?: (error: string | null) => void;
  connectRef?: React.MutableRefObject<(() => void) | null>;
  disconnectRef?: React.MutableRefObject<(() => void) | null>;
}

export function ConsoleTerminal({
  onStatusChange,
  onErrorChange,
  connectRef,
  disconnectRef,
}: ConsoleTerminalProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const terminalRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<import("@xterm/addon-fit").FitAddon | null>(null);
  const { status, error, connect, disconnect } = useConsoleWebSocket();

  useEffect(() => {
    onStatusChange?.(status);
    // Auto-focus the terminal when the SSH session is ready so the user can type immediately
    if (status === "connected" && terminalRef.current) {
      terminalRef.current.focus();
    }
    // Clear stale output when the session ends
    if (status === "disconnected" && terminalRef.current) {
      terminalRef.current.reset();
    }
  }, [status, onStatusChange]);

  useEffect(() => {
    onErrorChange?.(error);
  }, [error, onErrorChange]);

  useEffect(() => {
    if (connectRef) {
      connectRef.current = () => {
        if (terminalRef.current) connect(terminalRef.current);
      };
    }
    if (disconnectRef) {
      disconnectRef.current = disconnect;
    }
  }, [connect, disconnect, connectRef, disconnectRef]);

  // Initialize xterm.js terminal (client-side only)
  useEffect(() => {
    if (!containerRef.current) return;

    let cancelled = false;
    let terminal: Terminal | null = null;
    let fitAddon: import("@xterm/addon-fit").FitAddon | null = null;
    let resizeObserver: ResizeObserver | null = null;

    const init = async () => {
      const { Terminal: XTerm } = await import("@xterm/xterm");
      const { FitAddon } = await import("@xterm/addon-fit");

      // If React Strict Mode (dev) unmounted us during the dynamic import,
      // do not proceed — otherwise we leak a terminal + WebSocket.
      if (cancelled || !containerRef.current) return;

      terminal = new XTerm({
        cursorBlink: true,
        fontSize: 14,
        fontFamily: '"Cascadia Code", "Fira Code", "JetBrains Mono", "Courier New", monospace',
        theme: {
          background: "#0d0d0d",
          foreground: "#e2e8f0",
          cursor: "#e2e8f0",
          selectionBackground: "#334155",
          black: "#1e293b",
          red: "#f87171",
          green: "#4ade80",
          yellow: "#facc15",
          blue: "#60a5fa",
          magenta: "#c084fc",
          cyan: "#22d3ee",
          white: "#e2e8f0",
          brightBlack: "#475569",
          brightRed: "#fca5a5",
          brightGreen: "#86efac",
          brightYellow: "#fde047",
          brightBlue: "#93c5fd",
          brightMagenta: "#d8b4fe",
          brightCyan: "#67e8f9",
          brightWhite: "#f1f5f9",
        },
        allowTransparency: false,
        scrollback: 5000,
      });

      fitAddon = new FitAddon();
      terminal.loadAddon(fitAddon);
      terminal.open(containerRef.current);
      fitAddon.fit();

      terminalRef.current = terminal;
      fitAddonRef.current = fitAddon;

      connect(terminal);

      resizeObserver = new ResizeObserver(() => {
        try {
          fitAddon?.fit();
        } catch {
          // ignore if terminal is disposed
        }
      });
      resizeObserver.observe(containerRef.current);
    };

    init();

    return () => {
      cancelled = true;
      resizeObserver?.disconnect();
      disconnect();
      terminalRef.current?.dispose();
      terminalRef.current = null;
      fitAddonRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      ref={containerRef}
      className="w-full h-full"
      style={{ background: "#0d0d0d" }}
    />
  );
}
