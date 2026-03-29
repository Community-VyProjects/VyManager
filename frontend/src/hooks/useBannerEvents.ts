"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import type { ConfigDiff, CommitConfirmStatus } from "@/lib/api/config";
import type { PowerStatusResponse } from "@/lib/api/power";
import { configService } from "@/lib/api/config";
import { powerService } from "@/lib/api/power";

// ============================================================================
// Types
// ============================================================================

export type BannerSSEStatus = "disconnected" | "connecting" | "connected" | "error";

export interface BannerState {
  configDiff: ConfigDiff | null;
  commitConfirm: CommitConfirmStatus | null;
  powerStatus: PowerStatusResponse | null;
}

export interface BannerSSEState {
  status: BannerSSEStatus;
  data: BannerState;
}

interface SSEEvent {
  type: string;
  data: {
    config_diff?: ConfigDiff | null;
    commit_confirm?: CommitConfirmStatus | null;
    power_status?: PowerStatusResponse | null;
  } | null;
}

// ============================================================================
// Hook
// ============================================================================

const RECONNECT_DELAY_MS = 3000;

export function useBannerEvents(): BannerSSEState {
  const [status, setStatus] = useState<BannerSSEStatus>("disconnected");
  const [data, setData] = useState<BannerState>({
    configDiff: null,
    commitConfirm: null,
    powerStatus: null,
  });
  const esRef = useRef<EventSource | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Fetch individual pieces of state on demand (when mutation signals arrive
  // with null data, meaning "something changed, go re-fetch")
  const refreshConfigDiff = useCallback(async () => {
    try {
      const diff = await configService.getDiff();
      setData((prev) => ({ ...prev, configDiff: diff }));
    } catch {
      // Ignore — next SSE push or poll will catch up
    }
  }, []);

  const refreshCommitConfirm = useCallback(async () => {
    try {
      const cc = await configService.getCommitConfirmStatus();
      setData((prev) => ({ ...prev, commitConfirm: cc }));
    } catch {
      // Ignore
    }
  }, []);

  const refreshPowerStatus = useCallback(async () => {
    try {
      const ps = await powerService.getStatus();
      setData((prev) => ({ ...prev, powerStatus: ps }));
    } catch {
      // Ignore
    }
  }, []);

  useEffect(() => {
    let disposed = false;

    const connect = () => {
      if (disposed) return;

      setStatus("connecting");

      const es = new EventSource("/api/vyos/events/banners");
      esRef.current = es;

      es.onopen = () => {
        if (!disposed) {
          setStatus("connected");
        }
      };

      es.onmessage = (event: MessageEvent) => {
        if (disposed) return;

        try {
          const parsed = JSON.parse(event.data) as SSEEvent;

          switch (parsed.type) {
            case "banner_state": {
              // Full state push (initial connect or poller detected change)
              const d = parsed.data;
              if (d) {
                setData({
                  configDiff: d.config_diff ?? null,
                  commitConfirm: d.commit_confirm ?? null,
                  powerStatus: d.power_status ?? null,
                });
              }
              break;
            }
            case "config_diff": {
              // Mutation signal — data may be null (re-fetch) or contain actual state
              if (parsed.data === null) {
                refreshConfigDiff();
              } else {
                const d = parsed.data;
                if (d.config_diff) {
                  setData((prev) => ({ ...prev, configDiff: d.config_diff ?? null }));
                }
              }
              break;
            }
            case "commit_confirm": {
              if (parsed.data === null) {
                refreshCommitConfirm();
              } else {
                const d = parsed.data;
                if (d.commit_confirm) {
                  setData((prev) => ({ ...prev, commitConfirm: d.commit_confirm ?? null }));
                }
              }
              break;
            }
            case "power_status": {
              if (parsed.data === null) {
                refreshPowerStatus();
              } else {
                const d = parsed.data;
                if (d.power_status) {
                  setData((prev) => ({ ...prev, powerStatus: d.power_status ?? null }));
                }
              }
              break;
            }
          }
        } catch {
          // Ignore malformed payloads
        }
      };

      es.onerror = () => {
        if (disposed) return;

        setStatus("error");
        es.close();
        esRef.current = null;

        // Reconnect after delay
        reconnectTimerRef.current = setTimeout(connect, RECONNECT_DELAY_MS);
      };
    };

    connect();

    return () => {
      disposed = true;
      if (esRef.current) {
        esRef.current.close();
        esRef.current = null;
      }
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
      setStatus("disconnected");
    };
  }, [refreshConfigDiff, refreshCommitConfirm, refreshPowerStatus]);

  return { status, data };
}
