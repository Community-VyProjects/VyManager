"use client";

import { useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export interface PPPoEStatsPoint {
  timestamp: number;
  rxRate: number;
  txRate: number;
  rxPps: number;
  txPps: number;
  rxBytes: number;
  txBytes: number;
}

interface PPPoEStatsChartProps {
  points: PPPoEStatsPoint[];
  height?: number;
  emptyLabel?: string;
}

type ChartMetric = "rate" | "pps" | "traffic";

function formatValue(value: number, metric: ChartMetric): string {
  if (metric === "pps") return `${Math.round(value)} pps`;
  if (metric === "traffic") {
    if (value >= 1024 ** 3) return `${(value / 1024 ** 3).toFixed(1)} GiB`;
    if (value >= 1024 ** 2) return `${(value / 1024 ** 2).toFixed(1)} MiB`;
    return `${(value / 1024).toFixed(1)} KiB`;
  }
  if (value >= 1e9) return `${(value / 1e9).toFixed(1)} Gbit/s`;
  if (value >= 1e6) return `${(value / 1e6).toFixed(1)} Mbit/s`;
  if (value >= 1e3) return `${(value / 1e3).toFixed(1)} kbit/s`;
  return `${Math.round(value)} bit/s`;
}

function metricKeys(metric: ChartMetric): { rx: string; tx: string } {
  if (metric === "pps") return { rx: "rxPps", tx: "txPps" };
  if (metric === "traffic") return { rx: "rxBytes", tx: "txBytes" };
  return { rx: "rxRate", tx: "txRate" };
}

export function PPPoEStatsChart({ points, height = 260, emptyLabel = "Waiting for PPPoE samples..." }: PPPoEStatsChartProps) {
  const [metric, setMetric] = useState<ChartMetric>("rate");
  const keys = metricKeys(metric);
  const chartData = points.map((point) => ({
    ...point,
    label: new Date(point.timestamp).toLocaleTimeString([], { minute: "2-digit", second: "2-digit" }),
  }));

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-cyan-500" /> RX</span>
          <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-orange-500" /> TX</span>
        </div>
        <select
          value={metric}
          onChange={(event) => setMetric(event.target.value as ChartMetric)}
          className="h-8 rounded-md border bg-background px-2 text-xs"
          aria-label="PPPoE chart metric"
        >
          <option value="rate">Current rate</option>
          <option value="pps">Packets per second</option>
          <option value="traffic">Total traffic</option>
        </select>
      </div>
      {chartData.length === 0 ? (
        <div className="flex items-center justify-center text-sm text-muted-foreground" style={{ height }}>
          {emptyLabel}
        </div>
      ) : (
        <div style={{ height }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="pppoe-rx-fill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.28} />
                  <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.02} />
                </linearGradient>
                <linearGradient id="pppoe-tx-fill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f97316" stopOpacity={0.24} />
                  <stop offset="95%" stopColor="#f97316" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="label" tick={{ fontSize: 10 }} minTickGap={24} />
              <YAxis tick={{ fontSize: 10 }} tickFormatter={(value) => formatValue(Number(value), metric)} width={64} />
              <Tooltip formatter={(value) => formatValue(Number(value), metric)} />
              <Area type="monotone" dataKey={keys.rx} name="RX" stroke="#06b6d4" fill="url(#pppoe-rx-fill)" strokeWidth={2} isAnimationActive={false} />
              <Area type="monotone" dataKey={keys.tx} name="TX" stroke="#f97316" fill="url(#pppoe-tx-fill)" strokeWidth={2} isAnimationActive={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
