"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Bell,
  Plus,
  MoreVertical,
  Pencil,
  Trash2,
  RefreshCw,
  AlertTriangle,
} from "lucide-react";
import {
  monitoringService,
  type AlertRule,
  type AlertType,
  type AlertSeverity,
} from "@/lib/api/monitoring";
import { useToast } from "@/hooks/useToast";
import { AlertRuleModal } from "./AlertRuleModal";
import { TableSkeleton } from "@/components/skeletons";

const ALERT_TYPE_LABELS: Record<AlertType, string> = {
  INTERFACE_DOWN: "Interface Down",
  HIGH_CPU: "High CPU",
  HIGH_MEMORY: "High Memory",
  HIGH_DISK: "High Disk",
  CONNECTION_THRESHOLD: "Connection Threshold",
  INTERFACE_ERRORS: "Interface Errors",
  BGP_NEIGHBOR_DOWN: "BGP Neighbor Down",
  IPSEC_TUNNEL_DOWN: "IPsec Tunnel Down",
  OPENVPN_TUNNEL_DOWN: "OpenVPN Tunnel Down",
  WIREGUARD_PEER_DOWN: "WireGuard Peer Down",
  VRRP_STATE_CHANGE: "VRRP State Change",
  VRRP_FAILOVER: "VRRP Failover",
};

const SEVERITY_COLORS: Record<AlertSeverity, string> = {
  INFO: "bg-blue-100 text-blue-800 border-blue-200",
  WARNING: "bg-yellow-100 text-yellow-800 border-yellow-200",
  CRITICAL: "bg-red-100 text-red-800 border-red-200",
};

export function AlertRulesPanel() {
  const [rules, setRules] = useState<AlertRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<AlertRule | null>(null);
  const { toast } = useToast();

  const loadRules = async () => {
    try {
      setError(null);
      const data = await monitoringService.getAlertRules();
      setRules(data.rules);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load alert rules");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRules();
  }, []);

  const handleToggleEnabled = async (rule: AlertRule) => {
    try {
      await monitoringService.updateAlertRule(rule.id, { enabled: !rule.enabled });
      setRules(rules.map(r => r.id === rule.id ? { ...r, enabled: !r.enabled } : r));
      toast.success("Rule Updated", `Rule "${rule.name}" ${!rule.enabled ? "enabled" : "disabled"}`);
    } catch (err) {
      toast.error("Error", err instanceof Error ? err.message : "Failed to update rule");
    }
  };

  const handleDelete = async (rule: AlertRule) => {
    if (!confirm(`Are you sure you want to delete the rule "${rule.name}"?`)) {
      return;
    }

    try {
      await monitoringService.deleteAlertRule(rule.id);
      setRules(rules.filter(r => r.id !== rule.id));
      toast.success("Rule Deleted", `Rule "${rule.name}" has been deleted`);
    } catch (err) {
      toast.error("Error", err instanceof Error ? err.message : "Failed to delete rule");
    }
  };

  const handleEdit = (rule: AlertRule) => {
    setEditingRule(rule);
    setModalOpen(true);
  };

  const handleCreate = () => {
    setEditingRule(null);
    setModalOpen(true);
  };

  const handleModalSuccess = () => {
    loadRules();
    setModalOpen(false);
    setEditingRule(null);
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Alert Rules
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <TableSkeleton rows={3} columns={6} />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
            <AlertTriangle className="h-8 w-8 mb-2 text-destructive" />
            <p>{error}</p>
            <Button variant="outline" size="sm" onClick={loadRules} className="mt-4">
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Alert Rules
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={loadRules}>
                <RefreshCw className="h-4 w-4" />
              </Button>
              <Button size="sm" onClick={handleCreate}>
                <Plus className="h-4 w-4 mr-1" />
                Create Rule
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {rules.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Bell className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No alert rules configured</p>
              <p className="text-sm mt-1">Create a rule to get notified of system events</p>
              <Button size="sm" onClick={handleCreate} className="mt-4">
                <Plus className="h-4 w-4 mr-1" />
                Create First Rule
              </Button>
            </div>
          ) : (
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Enabled</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Severity</TableHead>
                    <TableHead>Conditions</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rules.map((rule) => (
                    <TableRow key={rule.id}>
                      <TableCell>
                        <Switch
                          checked={rule.enabled}
                          onCheckedChange={() => handleToggleEnabled(rule)}
                        />
                      </TableCell>
                      <TableCell className="font-medium">{rule.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {ALERT_TYPE_LABELS[rule.type]}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={SEVERITY_COLORS[rule.severity]}
                        >
                          {rule.severity}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground max-w-[200px] truncate">
                        {JSON.stringify(rule.conditions)}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleEdit(rule)}>
                              <Pencil className="h-4 w-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleDelete(rule)}
                              className="text-destructive"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <AlertRuleModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        rule={editingRule}
        onSuccess={handleModalSuccess}
      />
    </>
  );
}
