"use client";

import { useEffect, useState } from "react";
import { Activity, Pause, Play, RefreshCw, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CardSizeMenu } from "@/components/dashboard/CardSizeMenu";
import { pppoeServerService, type PPPoESessionsResponse } from "@/lib/api/pppoe-server";
import { PPPoEStatsChart, type PPPoEStatsPoint } from "@/components/pppoe-server/PPPoEStatsChart";
import { useDashboardData } from "@/contexts/DashboardDataContext";

interface PppoeStatsCardProps {
  onRemove?: () => void;
  span?: number;
  onSpanChange?: (newSpan: number) => void;
  height?: number;
  onHeightChange?: (newHeight: number) => void;
}

function pointFromSessions(response: PPPoESessionsResponse, now: number): PPPoEStatsPoint {
  const totals = response.sessions.reduce(
    (sum, session) => ({
      rxBytes: sum.rxBytes + session.rx_bytes,
      txBytes: sum.txBytes + session.tx_bytes,
      rxPackets: sum.rxPackets + (session.rx_pps ?? 0),
      txPackets: sum.txPackets + (session.tx_pps ?? 0),
    }),
    { rxBytes: 0, txBytes: 0, rxPackets: 0, txPackets: 0 },
  );
  return {
    timestamp: now,
    rxRate: 0,
    txRate: 0,
    rxPps: totals.rxPackets,
    txPps: totals.txPackets,
    rxBytes: totals.rxBytes,
    txBytes: totals.txBytes,
    activeSessions: response.total,
  };
}

export function PppoeStatsCard({ onRemove, span = 1, onSpanChange, height, onHeightChange }: PppoeStatsCardProps) {
  const { data } = useDashboardData();
  const [points, setPoints] = useState<PPPoEStatsPoint[]>([]);
  const [sessionCount, setSessionCount] = useState(0);
  const [paused, setPaused] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (paused) return;
    const response = data.pppoeSessions;
    if (!response) return;
    const now = Date.now();
    setSessionCount(response.total);
    const point = pointFromSessions(response, now);
    setPoints((current) => [...current, point].filter((item) => item.timestamp >= now - 120_000).slice(-120));
  }, [data.pppoeSessions, paused]);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const response = await pppoeServerService.getSessions();
      const now = Date.now();
      setSessionCount(response.total);
      const point = pointFromSessions(response, now);
      setPoints((current) => [...current, point].filter((item) => item.timestamp >= now - 120_000).slice(-120));
    } catch {
      // Dashboard cards remain available while a device is temporarily unreachable.
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="flex h-full flex-col">
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-3">
        <div className="flex items-center gap-2">
          <Activity className="h-5 w-5 text-primary" />
          <div>
            <CardTitle className="text-lg font-medium">PPPoE Statistics</CardTitle>
            <p className="text-xs text-muted-foreground">{sessionCount} active sessions</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setPaused((value) => !value)} title={paused ? "Resume" : "Pause"}>
            {paused ? <Play className="h-3.5 w-3.5" /> : <Pause className="h-3.5 w-3.5" />}
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => void fetchStats()} disabled={loading} title="Refresh">
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          </Button>
          {onSpanChange && (
            <CardSizeMenu span={span} onSpanChange={onSpanChange} height={height} onHeightChange={onHeightChange} />
          )}
          {onRemove && (
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onRemove} title="Remove card">
              <X className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="min-h-0 flex-1 pt-0">
        <PPPoEStatsChart points={points} height={240} sessionsOnly />
      </CardContent>
    </Card>
  );
}
