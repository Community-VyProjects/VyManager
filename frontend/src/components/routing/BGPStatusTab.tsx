"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  Activity,
  Users,
} from "lucide-react";
import { bgpService, type BGPNeighborStatus, type BGPStatusResponse } from "@/lib/api/bgp";
import { useToast } from "@/hooks/useToast";

interface BGPStatusTabProps {
  autoRefresh?: boolean;
  refreshInterval?: number;
}

const STATE_COLORS: Record<string, string> = {
  Established: "bg-green-100 text-green-800 border-green-200",
  Active: "bg-yellow-100 text-yellow-800 border-yellow-200",
  Idle: "bg-gray-100 text-gray-800 border-gray-200",
  Connect: "bg-blue-100 text-blue-800 border-blue-200",
  OpenSent: "bg-blue-100 text-blue-800 border-blue-200",
  OpenConfirm: "bg-blue-100 text-blue-800 border-blue-200",
};

const STATE_ICONS: Record<string, React.ReactNode> = {
  Established: <CheckCircle className="h-4 w-4 text-green-600" />,
  Active: <Clock className="h-4 w-4 text-yellow-600" />,
  Idle: <XCircle className="h-4 w-4 text-gray-600" />,
  Connect: <Activity className="h-4 w-4 text-blue-600" />,
  OpenSent: <Activity className="h-4 w-4 text-blue-600" />,
  OpenConfirm: <Activity className="h-4 w-4 text-blue-600" />,
};

export function BGPStatusTab({
  autoRefresh: initialAutoRefresh = true,
  refreshInterval = 10000,
}: BGPStatusTabProps) {
  const [status, setStatus] = useState<BGPStatusResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(initialAutoRefresh);
  const { toast } = useToast();

  const loadStatus = useCallback(async () => {
    try {
      setError(null);
      const data = await bgpService.getStatus();
      setStatus(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load BGP status");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(loadStatus, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [autoRefresh, refreshInterval, loadStatus]);

  const handleRefresh = async () => {
    setLoading(true);
    await loadStatus();
    toast.success("Refreshed", "BGP status updated");
  };

  if (loading && !status) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center h-32">
            <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error && !status) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
            <AlertTriangle className="h-8 w-8 mb-2 text-destructive" />
            <p>{error}</p>
            <Button variant="outline" size="sm" onClick={handleRefresh} className="mt-4">
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Activity className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Local AS</p>
                <p className="text-xl font-bold">{status?.local_as || "N/A"}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Activity className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Router ID</p>
                <p className="text-xl font-bold font-mono">{status?.router_id || "N/A"}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gray-100 rounded-lg">
                <Users className="h-5 w-5 text-gray-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Neighbors</p>
                <p className="text-xl font-bold">{status?.total_neighbors || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Established</p>
                <p className="text-xl font-bold text-green-600">
                  {status?.established_count || 0} / {status?.total_neighbors || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Neighbor Status Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Neighbor Sessions
            </CardTitle>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Switch
                  id="auto-refresh"
                  checked={autoRefresh}
                  onCheckedChange={setAutoRefresh}
                />
                <Label htmlFor="auto-refresh" className="text-sm">
                  Auto-refresh ({refreshInterval / 1000}s)
                </Label>
              </div>
              <Button variant="outline" size="sm" onClick={handleRefresh} disabled={loading}>
                <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {!status?.neighbors?.length ? (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No BGP neighbors configured</p>
            </div>
          ) : (
            <div className="border rounded-lg overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Neighbor</TableHead>
                    <TableHead>Remote AS</TableHead>
                    <TableHead>State</TableHead>
                    <TableHead className="text-right">Msg Rcvd</TableHead>
                    <TableHead className="text-right">Msg Sent</TableHead>
                    <TableHead>Up/Down</TableHead>
                    <TableHead className="text-right">Prefixes</TableHead>
                    <TableHead>Description</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {status.neighbors.map((neighbor) => (
                    <NeighborRow key={neighbor.neighbor} neighbor={neighbor} />
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function NeighborRow({ neighbor }: { neighbor: BGPNeighborStatus }) {
  const stateColor = STATE_COLORS[neighbor.state] || "bg-gray-100 text-gray-800 border-gray-200";
  const stateIcon = STATE_ICONS[neighbor.state] || <XCircle className="h-4 w-4 text-gray-600" />;

  return (
    <TableRow>
      <TableCell className="font-mono font-medium">{neighbor.neighbor}</TableCell>
      <TableCell className="font-mono">{neighbor.remote_as}</TableCell>
      <TableCell>
        <Badge variant="outline" className={`${stateColor} gap-1`}>
          {stateIcon}
          {neighbor.state}
        </Badge>
      </TableCell>
      <TableCell className="text-right font-mono">
        {neighbor.msg_rcvd.toLocaleString()}
      </TableCell>
      <TableCell className="text-right font-mono">
        {neighbor.msg_sent.toLocaleString()}
      </TableCell>
      <TableCell className="font-mono text-sm">
        {neighbor.up_down}
      </TableCell>
      <TableCell className="text-right">
        {neighbor.state === "Established" ? (
          <Badge variant="outline" className="bg-green-50 text-green-700">
            {neighbor.pfx_rcvd.toLocaleString()}
          </Badge>
        ) : (
          <span className="text-muted-foreground">-</span>
        )}
      </TableCell>
      <TableCell className="text-muted-foreground truncate max-w-[200px]">
        {neighbor.description || "-"}
      </TableCell>
    </TableRow>
  );
}
