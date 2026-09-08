"use client";

import { useEffect, useRef, useState } from "react";
import { Activity, Pause, Play, RefreshCw, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CardSizeMenu } from "@/components/dashboard/CardSizeMenu";
import { pppoeServerService } from "@/lib/api/pppoe-server";
import { PPPoEStatsChart, type PPPoEStatsPoint } from "@/components/pppoe-server/PPPoEStatsChart";

interface PppoeStatsCardProps {
  onRemove?: () => void;
  span?: number;
  onSpanChange?: (newSpan: number) => void;
  height?: number;
  onHeightChange?: (newHeight: number) => void;
}

interface PreviousCounters {
  rxBytes: number;
  txBytes: number;
  rxPackets: number;
  txPackets: number;
  timestamp: number;
}

export function PppoeStatsCard({ onRemove, span = 1, onSpanChange, height, onHeightChange }: PppoeStatsCardProps) {
  const [points, setPoints] = useState<PPPoEStatsPoint[]>([]);
  const [sessionCount, setSessionCount] = useState(0);
  const [paused, setPaused] = useState(false);
  const [loading, setLoading] = useState(false);
  const previous = useRef<PreviousCounters | null>(null);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const response = await pppoeServerService.getSessions();
      const now = Date.now();
      const totals = response.sessions.reduce(
        (sum, session) => ({
          rxBytes: sum.rxBytes + session.rx_bytes,
          txBytes: sum.txBytes + session.tx_bytes,
          rxPackets: sum.rxPackets + session.rx_packets,
          txPackets: sum.txPackets + session.tx_packets,
        }),
        { rxBytes: 0, txBytes: 0, rxPackets: 0, txPackets: 0 },
      );
      const prior = previous.current;
      const elapsed = prior ? (now - prior.timestamp) / 1000 : 0;
      const point: PPPoEStatsPoint = {
        timestamp: now,
        rxRate: prior && elapsed > 0 ? Math.max(0, (totals.rxBytes - prior.rxBytes) * 8 / elapsed) : 0,
        txRate: prior && elapsed > 0 ? Math.max(0, (totals.txBytes - prior.txBytes) * 8 / elapsed) : 0,
        rxPps: prior && elapsed > 0 ? Math.max(0, (totals.rxPackets - prior.rxPackets) / elapsed) : 0,
        txPps: prior && elapsed > 0 ? Math.max(0, (totals.txPackets - prior.txPackets) / elapsed) : 0,
        rxBytes: totals.rxBytes,
        txBytes: totals.txBytes,
      };
      previous.current = { ...totals, timestamp: now };
      setSessionCount(response.total);
      setPoints((current) => [...current, point].filter((item) => item.timestamp >= now - 120_000).slice(-120));
    } catch {
      // Dashboard cards remain available while a device is temporarily unreachable.
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchStats();
    if (paused) return;
    const timer = window.setInterval(() => void fetchStats(), 5000);
    return () => window.clearInterval(timer);
  }, [paused]);

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
        <PPPoEStatsChart points={points} height={240} />
      </CardContent>
    </Card>
  );
}
