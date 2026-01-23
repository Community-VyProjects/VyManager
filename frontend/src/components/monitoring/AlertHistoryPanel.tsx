"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  History,
  RefreshCw,
  AlertTriangle,
  Check,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import {
  monitoringService,
  type AlertHistory,
  type AlertSeverity,
} from "@/lib/api/monitoring";
import { useToast } from "@/hooks/useToast";
import { formatDistanceToNow } from "date-fns";
import { TableSkeleton } from "@/components/skeletons";

const SEVERITY_COLORS: Record<AlertSeverity, string> = {
  INFO: "bg-blue-100 text-blue-800 border-blue-200",
  WARNING: "bg-yellow-100 text-yellow-800 border-yellow-200",
  CRITICAL: "bg-red-100 text-red-800 border-red-200",
};

export function AlertHistoryPanel() {
  const [alerts, setAlerts] = useState<AlertHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [unacknowledgedCount, setUnacknowledgedCount] = useState(0);

  // Pagination
  const [page, setPage] = useState(0);
  const pageSize = 20;

  // Filters
  const [acknowledgedFilter, setAcknowledgedFilter] = useState<string>("__all__");
  const [severityFilter, setSeverityFilter] = useState<string>("__all__");

  const { toast } = useToast();

  const loadHistory = async () => {
    try {
      setError(null);
      const params: {
        limit: number;
        offset: number;
        acknowledged?: boolean;
        severity?: AlertSeverity;
      } = {
        limit: pageSize,
        offset: page * pageSize,
      };

      if (acknowledgedFilter !== "__all__") {
        params.acknowledged = acknowledgedFilter === "true";
      }

      if (severityFilter !== "__all__") {
        params.severity = severityFilter as AlertSeverity;
      }

      const data = await monitoringService.getAlertHistory(params);
      setAlerts(data.alerts);
      setTotal(data.total);
      setUnacknowledgedCount(data.unacknowledgedCount);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load alert history");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHistory();
  }, [page, acknowledgedFilter, severityFilter]);

  // Reset page when filters change
  useEffect(() => {
    setPage(0);
  }, [acknowledgedFilter, severityFilter]);

  const handleAcknowledge = async (alert: AlertHistory) => {
    try {
      await monitoringService.acknowledgeAlert(alert.id);
      setAlerts(
        alerts.map((a) =>
          a.id === alert.id ? { ...a, acknowledged: true } : a
        )
      );
      setUnacknowledgedCount(Math.max(0, unacknowledgedCount - 1));
      toast.success("Alert Acknowledged", "The alert has been acknowledged");
    } catch (err) {
      toast.error("Error", err instanceof Error ? err.message : "Failed to acknowledge alert");
    }
  };

  const totalPages = Math.ceil(total / pageSize);

  if (loading && alerts.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Alert History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <TableSkeleton rows={5} columns={6} />
        </CardContent>
      </Card>
    );
  }

  if (error && alerts.length === 0) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
            <AlertTriangle className="h-8 w-8 mb-2 text-destructive" />
            <p>{error}</p>
            <Button variant="outline" size="sm" onClick={loadHistory} className="mt-4">
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <CardTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Alert History
            </CardTitle>
            {unacknowledgedCount > 0 && (
              <Badge variant="destructive">
                {unacknowledgedCount} unacknowledged
              </Badge>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Select value={acknowledgedFilter} onValueChange={setAcknowledgedFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All Status</SelectItem>
                <SelectItem value="false">Unacknowledged</SelectItem>
                <SelectItem value="true">Acknowledged</SelectItem>
              </SelectContent>
            </Select>

            <Select value={severityFilter} onValueChange={setSeverityFilter}>
              <SelectTrigger className="w-[120px]">
                <SelectValue placeholder="Severity" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All Severity</SelectItem>
                <SelectItem value="CRITICAL">Critical</SelectItem>
                <SelectItem value="WARNING">Warning</SelectItem>
                <SelectItem value="INFO">Info</SelectItem>
              </SelectContent>
            </Select>

            <Button variant="outline" size="sm" onClick={loadHistory}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {alerts.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <History className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No alerts in history</p>
            <p className="text-sm mt-1">
              Alerts will appear here when triggered
            </p>
          </div>
        ) : (
          <>
            <div className="border rounded-lg overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Severity</TableHead>
                    <TableHead>Rule</TableHead>
                    <TableHead>Message</TableHead>
                    <TableHead>Time</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {alerts.map((alert) => (
                    <TableRow key={alert.id}>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={SEVERITY_COLORS[alert.severity]}
                        >
                          {alert.severity}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium">
                        {alert.ruleName ?? "Unknown Rule"}
                      </TableCell>
                      <TableCell className="max-w-[300px] truncate">
                        {alert.message}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {formatDistanceToNow(new Date(alert.triggeredAt), {
                          addSuffix: true,
                        })}
                      </TableCell>
                      <TableCell>
                        {alert.acknowledged ? (
                          <Badge variant="outline" className="text-green-600 border-green-200">
                            <Check className="h-3 w-3 mr-1" />
                            Acknowledged
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-orange-600 border-orange-200">
                            Pending
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {!alert.acknowledged && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleAcknowledge(alert)}
                          >
                            <Check className="h-4 w-4 mr-1" />
                            Acknowledge
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-4">
                <div className="text-sm text-muted-foreground">
                  Showing {page * pageSize + 1}-
                  {Math.min((page + 1) * pageSize, total)} of {total} alerts
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(page - 1)}
                    disabled={page === 0}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-sm">
                    Page {page + 1} of {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(page + 1)}
                    disabled={page >= totalPages - 1}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
